"""
Decision Engine
Translates Risk Assessments and Hazard Detections into concrete, actionable safety directives.
Generates explainable decisions containing hazard, severity, affected zone, confidence, reason, and recommended actions.
"""

from typing import Dict, List, Optional
import uuid

from app.config.thresholds import SafetyConfig, DEFAULT_SAFETY_CONFIG
from app.models.beach import BeachLayout, BeachZone, ZoneType
from app.models.visitor import Visitor, DistressState
from app.models.response import (
    HazardDetection,
    HazardSeverity,
    ZoneRiskAssessment,
    Decision,
    DecisionActionType,
)


class DecisionEngine:
    def __init__(self, config: Optional[SafetyConfig] = None):
        self.config = config or DEFAULT_SAFETY_CONFIG

    def make_decisions(
        self,
        current_time: float,
        hazards: List[HazardDetection],
        risk_assessments: Dict[str, ZoneRiskAssessment],
        beach: BeachLayout,
        visitors: List[Visitor]
    ) -> List[Decision]:
        """
        Evaluates current risks and hazards to issue actionable decisions.
        """
        decisions: List[Decision] = []

        # 1. Evaluate Swimmer Distress Emergencies (Highest Priority)
        distress_decisions = self._evaluate_distress_emergencies(current_time, visitors, risk_assessments)
        decisions.extend(distress_decisions)

        # 2. Evaluate Zone-by-Zone Operational Risks
        for zone_id, risk_meta in risk_assessments.items():
            zone = next((z for z in beach.zones if z.id == zone_id), None)
            if not zone:
                continue

            zone_hazards = [h for h in hazards if zone_id in h.affected_zones]
            zone_decision = self._evaluate_zone_safety(current_time, zone, risk_meta, zone_hazards)
            if zone_decision:
                decisions.append(zone_decision)

        # 3. Evaluate Sensor Degradation Fallbacks
        sensor_hazards = [h for h in hazards if h.hazard_type == "SENSOR_TELEMETRY_ANOMALY"]
        for sh in sensor_hazards:
            decisions.append(Decision(
                decision_id=f"DEC-SENS-{uuid.uuid4().hex[:6]}",
                hazard_id=sh.id,
                hazard_type="SENSOR_FAULT_DEGRADATION",
                severity=sh.severity,
                affected_zone="ALL_ZONES",
                confidence=1.0,
                reason=f"Telemetry degraded: {sh.reason}. Recommending visual drone sweeps and lifeguard manual lookouts.",
                recommended_actions=[
                    DecisionActionType.FLAG_SENSOR_FAILURE,
                    DecisionActionType.DISPATCH_DRONE_PATROL
                ],
                timestamp=current_time,
                metadata={"failed_sensors": sh.raw_telemetry.get("failed_sensors", [])}
            ))

        return decisions

    def _evaluate_distress_emergencies(
        self,
        current_time: float,
        visitors: List[Visitor],
        risk_assessments: Dict[str, ZoneRiskAssessment]
    ) -> List[Decision]:
        decisions = []
        distressed_visitors = [v for v in visitors if v.distress_state not in [DistressState.NONE, DistressState.RESCUED]]

        for v in distressed_visitors:
            actions = [
                DecisionActionType.DISPATCH_LIFEGUARD_RESCUE,
                DecisionActionType.DISPATCH_DRONE_RESCUE,
                DecisionActionType.BROADCAST_PA_ALERT
            ]
            
            severity = (
                HazardSeverity.CRITICAL 
                if v.distress_state in [DistressState.DROWNING_ACTIVE, DistressState.DROWNING_PASSIVE] 
                else HazardSeverity.HIGH
            )

            decisions.append(Decision(
                decision_id=f"DEC-EMERG-{uuid.uuid4().hex[:6]}",
                hazard_type="SWIMMER_DISTRESS_IN_WATER",
                severity=severity,
                affected_zone=v.current_zone_id,
                confidence=0.99,
                reason=f"Visitor {v.id} in {v.distress_state.value} at position ({v.x:.1f}m, {v.y:.1f}m) in {v.current_zone_id}. Immediate rescue intervention mandated.",
                recommended_actions=actions,
                timestamp=current_time,
                metadata={"visitor_id": v.id, "location_x": v.x, "location_y": v.y, "distress_state": v.distress_state.value}
            ))

        return decisions

    def _evaluate_zone_safety(
        self,
        current_time: float,
        zone: BeachZone,
        risk: ZoneRiskAssessment,
        hazards: List[HazardDetection]
    ) -> Optional[Decision]:
        recommended_actions: List[DecisionActionType] = []
        reasons: List[str] = []
        severity = risk.risk_level

        # Flag State Recommendations
        if risk.recommended_flag == "RED":
            recommended_actions.append(DecisionActionType.SET_FLAG_RED)
            recommended_actions.append(DecisionActionType.UPDATE_WARNING_BOARD)
            if risk.swimmer_count > 0:
                recommended_actions.append(DecisionActionType.BROADCAST_PA_ALERT)
                recommended_actions.append(DecisionActionType.DISPATCH_DRONE_PATROL)
            reasons.append(f"High risk score ({risk.total_risk_score:.2f}) requiring RED flag warning")

        elif risk.recommended_flag == "YELLOW":
            recommended_actions.append(DecisionActionType.SET_FLAG_YELLOW)
            recommended_actions.append(DecisionActionType.UPDATE_WARNING_BOARD)
            reasons.append(f"Moderate risk score ({risk.total_risk_score:.2f}) requiring YELLOW advisory")

        else:
            if zone.flag_status != "GREEN":
                recommended_actions.append(DecisionActionType.MAINTAIN_NORMAL_WATCH)

        # Restricted Zone Violations
        if zone.zone_type == ZoneType.RESTRICTED and risk.visitor_count > 0:
            recommended_actions.append(DecisionActionType.BROADCAST_PA_ALERT)
            recommended_actions.append(DecisionActionType.DISPATCH_DRONE_PATROL)
            reasons.append(f"{risk.visitor_count} visitors entered restricted zone boundary")

        # High Rip Current Channel Specific Actions
        rip_hazard = next((h for h in hazards if h.hazard_type == "RIP_CURRENT_FORMATION"), None)
        if rip_hazard and rip_hazard.severity in [HazardSeverity.HIGH, HazardSeverity.CRITICAL]:
            if DecisionActionType.BROADCAST_PA_ALERT not in recommended_actions:
                recommended_actions.append(DecisionActionType.BROADCAST_PA_ALERT)
            recommended_actions.append(DecisionActionType.EVACUATE_ZONE)
            reasons.append("Intense rip current neck active - immediate channel clearance needed")

        if not recommended_actions:
            return None

        return Decision(
            decision_id=f"DEC-{zone.id}-{uuid.uuid4().hex[:6]}",
            hazard_type=hazards[0].hazard_type if hazards else "GENERAL_SURF_SAFETY",
            severity=severity,
            affected_zone=zone.id,
            confidence=0.95,
            reason="; ".join(reasons) if reasons else "Routine zone safety protocol check",
            recommended_actions=recommended_actions,
            timestamp=current_time,
            metadata={"zone_risk_score": risk.total_risk_score, "swimmers": risk.swimmer_count}
        )


def evaluate_safety_escalation(beach_id: str, current_flag: str, target_flag: str):
    """
    Evaluates flag state transitions and triggers automated multilingual PA broadcasts on critical escalation.
    """
    from app.safety.audio_engine import AudioEngine
    broadcast = None
    if target_flag == "RED" and current_flag != "RED":
        # Automatically trigger multilingual siren broadcast
        broadcast = AudioEngine.generate_broadcast(
            beach_id=beach_id,
            hazard_type="FLAG_ESCALATION_RED",
            severity="CRITICAL"
        )
    return broadcast

