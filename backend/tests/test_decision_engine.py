"""
Automated unit tests for Decision and Response Engines.
"""

from app.models.beach import FlagStatus, ResourceStatus
from app.models.visitor import Visitor, DistressState, SwimmingStatus
from app.models.response import DecisionActionType
from app.safety.hazard_engine import HazardEngine
from app.safety.risk_engine import RiskEngine
from app.safety.decision_engine import DecisionEngine
from app.safety.response_engine import ResponseEngine
from app.simulation.beach_layout import create_default_beach_layout
from app.models.environment import EnvironmentalState


def test_decision_and_lifeguard_dispatch_pipeline():
    layout = create_default_beach_layout()
    hazard_eng = HazardEngine()
    risk_eng = RiskEngine()
    dec_eng = DecisionEngine()
    resp_eng = ResponseEngine()

    # Create visitor in distress in Zone B
    victim = Visitor(
        id="VIS-DISTRESS-1",
        x=450.0,
        y=35.0,
        swimming_status=SwimmingStatus.DEEP_SWIMMING,
        distress_state=DistressState.STRUGGLING,
        current_zone_id="ZONE_B"
    )

    env = EnvironmentalState(rip_current_speed_mps=0.45)
    hazards = hazard_eng.evaluate(env)
    risks = risk_eng.assess_risk(layout.zones, hazards, [victim])
    decisions = dec_eng.make_decisions(10.0, hazards, risks, layout, [victim])

    # Assert decision generated
    distress_dec = next((d for d in decisions if d.hazard_type == "SWIMMER_DISTRESS_IN_WATER"), None)
    assert distress_dec is not None
    assert DecisionActionType.DISPATCH_LIFEGUARD_RESCUE in distress_dec.recommended_actions

    # Execute Response
    active_incidents = []
    responses, incidents, logs = resp_eng.execute_decisions(
        10.0, decisions, layout, [victim], active_incidents
    )

    # Lifeguard should be dispatched
    dispatched_lgs = [lg for lg in layout.lifeguards if lg.status == ResourceStatus.DISPATCHED]
    assert len(dispatched_lgs) >= 1
    assert len(incidents) >= 1
    assert incidents[0].detection_time == 10.0
