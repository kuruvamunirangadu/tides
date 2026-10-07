"""
Automated unit tests for Risk Engine (distinguishing Hazard, Exposure, and Risk).
"""

from app.models.beach import BeachZone, ZoneType, FlagStatus
from app.models.visitor import Visitor, SwimmingStatus, DistressState, RiskExposure
from app.models.response import HazardDetection, HazardSeverity
from app.safety.risk_engine import RiskEngine


def test_hazard_vs_exposure_distinction():
    engine = RiskEngine()
    
    zone_a = BeachZone(
        id="ZONE_A",
        name="Zone A",
        zone_type=ZoneType.SWIMMING,
        description="",
        x_min=0, x_max=300, y_min=-20, y_max=100,
        swimmer_capacity=100
    )
    zone_b = BeachZone(
        id="ZONE_B",
        name="Zone B",
        zone_type=ZoneType.RIP_CHANNEL,
        description="",
        x_min=300, x_max=600, y_min=-20, y_max=100,
        swimmer_capacity=100
    )

    # Moderate rip hazard affecting Zone B
    rip_hazard = HazardDetection(
        id="HAZ-1",
        hazard_type="RIP_CURRENT_FORMATION",
        severity=HazardSeverity.HIGH,
        affected_zones=["ZONE_B"],
        confidence=0.9,
        reason="High rip current velocity",
        detected_at=10.0
    )

    # Case 1: High Hazard, ZERO Exposure (empty beach)
    assessments_empty = engine.assess_risk([zone_a, zone_b], [rip_hazard], [])
    risk_b_empty = assessments_empty["ZONE_B"]
    assert risk_b_empty.hazard_score > 0.6
    assert risk_b_empty.exposure_score == 0.0
    assert risk_b_empty.swimmer_count == 0

    # Case 2: High Hazard + HIGH Exposure (30 swimmers in Zone B water)
    swimmers = [
        Visitor(
            id=f"V-{i}",
            x=350.0,
            y=40.0, # deep water
            swimming_status=SwimmingStatus.DEEP_SWIMMING,
            current_zone_id="ZONE_B"
        )
        for i in range(30)
    ]
    assessments_crowded = engine.assess_risk([zone_a, zone_b], [rip_hazard], swimmers)
    risk_b_crowded = assessments_crowded["ZONE_B"]
    
    # Operational risk must significantly increase with exposure
    assert risk_b_crowded.exposure_score > 0.2
    assert risk_b_crowded.total_risk_score > risk_b_empty.total_risk_score
    assert risk_b_crowded.recommended_flag == "RED"


def test_distress_escalates_risk_to_critical():
    engine = RiskEngine()
    zone_a = BeachZone(
        id="ZONE_A", name="Zone A", zone_type=ZoneType.SWIMMING, description="",
        x_min=0, x_max=300, y_min=-20, y_max=100, swimmer_capacity=100
    )

    victim = Visitor(
        id="VIC-1",
        x=100.0,
        y=45.0,
        swimming_status=SwimmingStatus.DEEP_SWIMMING,
        distress_state=DistressState.DROWNING_ACTIVE,
        current_zone_id="ZONE_A"
    )

    assessments = engine.assess_risk([zone_a], [], [victim])
    assert assessments["ZONE_A"].distressed_count == 1
    assert assessments["ZONE_A"].risk_level == HazardSeverity.CRITICAL
    assert assessments["ZONE_A"].recommended_flag == "RED"
