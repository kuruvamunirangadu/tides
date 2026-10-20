"""
backend/app/perception/incident_evidence.py
Correlates multi-source evidence (vision tracks, hazard zones, telemetry, sensor health) into explainable candidate alerts.
Enforces strict human-in-the-loop oversight:
- Candidate alerts are labeled CANDIDATE_UNVERIFIED.
- Zero automatic rescue dispatch from unverified computer-vision inferences.
- Deduplicates repeated alerts for the same track/subject.
"""

from typing import List, Dict, Optional, Tuple, Any, Set
import math
import time
from app.perception.types import (
    CameraTrack,
    CandidateIncident,
    CandidateStatus,
    SensorReading,
    SensorDisagreement,
)


class IncidentEvidenceCorrelator:
    """
    Correlates perception and sensor observations into explainable candidate safety events.
    Enforces strict safety verification: candidate alerts NEVER auto-dispatch rescues.
    """

    def __init__(self, dedup_cooldown_sec: float = 20.0):
        self.dedup_cooldown_sec = dedup_cooldown_sec
        self.candidate_incidents: Dict[str, CandidateIncident] = {}
        self.recent_alert_signatures: Dict[str, float] = {}  # signature -> timestamp
        self.next_candidate_num: int = 101

    def evaluate_candidates(
        self,
        tracks: List[CameraTrack],
        readings: List[SensorReading],
        disagreements: List[SensorDisagreement],
        active_hazards: List[Dict[str, Any]],
        sim_time: Optional[float] = None,
    ) -> List[CandidateIncident]:
        """
        Evaluates active perception tracks and sensor telemetry to generate or update candidate incidents.
        """
        now = sim_time if sim_time is not None else time.time()
        new_candidates: List[CandidateIncident] = []

        # 1. Swimmer Drift / Hazard Corridor Incursion Candidate
        for track in tracks:
            if not track.positions or track.state.value not in ("CONFIRMED", "TENTATIVE"):
                continue

            pos = track.positions[-1]

            # Rip current corridor check: (X between 360m and 480m, Y >= 280m into water)
            in_rip_corridor = (360.0 <= pos.x <= 480.0) and (pos.y >= 280.0)
            is_fast_drift = track.speed_mps >= 1.2
            is_distress_posture = track.in_water and track.speed_mps < 0.1 and track.hits >= 4

            if in_rip_corridor and (is_fast_drift or is_distress_posture):
                candidate_type = "POSSIBLE_DISTRESS" if is_distress_posture else "DRIFT_RISK"
                dedup_key = f"{candidate_type}:{track.track_id}"

                # Check deduplication window
                last_time = self.recent_alert_signatures.get(dedup_key)
                if last_time and (now - last_time) < self.dedup_cooldown_sec:
                    continue

                self.recent_alert_signatures[dedup_key] = now
                cand_id = f"CAND-INCIDENT-{self.next_candidate_num}"
                self.next_candidate_num += 1

                evidence: List[str] = [
                    f"Camera [{track.camera_id}] tracked kinematic motion for track {track.track_id}",
                    f"Spatial location ({pos.x:.1f}m, {pos.y:.1f}m) inside high-hazard rip corridor (SZ-02)",
                    f"Estimated kinematic velocity: {track.speed_mps:.2f} m/s at heading {track.direction_deg:.0f}°",
                ]

                # Check if telemetry corroborates
                adcp = next((r for r in readings if "adcp" in r.source_id.lower() or "current" in r.metric_name), None)
                if adcp and adcp.value > 1.0:
                    evidence.append(f"ADCP current sensor ({adcp.source_id}) corroborates elevated seaward velocity: {adcp.value:.2f} m/s")

                uncertainties: List[str] = [
                    "AI visual detection alone is not medical confirmation of drowning",
                    "Swimmer may be an experienced bodyboarder or intentional swimmer",
                ]

                # Check for camera or sensor disagreements
                related_disagreements = [d for d in disagreements if d.property_name == "water_current_mps"]
                if related_disagreements:
                    uncertainties.append(f"Sensor disagreement active: {related_disagreements[0].explanation}")

                cand = CandidateIncident(
                    id=cand_id,
                    candidate_type=candidate_type,
                    track_ids=[track.track_id],
                    camera_ids=[track.camera_id],
                    location={"x": pos.x, "y": pos.y},
                    confidence=round(track.confidence * 0.88, 2),
                    status=CandidateStatus.CANDIDATE_UNVERIFIED,
                    supporting_evidence=evidence,
                    uncertainty_reasons=uncertainties,
                    requires_operator_action=True,
                    auto_dispatched=False,  # STRICT SAFETY RULE: Zero automatic dispatch
                    timestamp=now,
                    decision_notes="Candidate awaiting manual lifeguard / operator confirmation before dispatch.",
                )
                self.candidate_incidents[cand_id] = cand
                new_candidates.append(cand)

            # 2. Restricted Zone Incursion (X >= 750m: Zone D Rocky Headland)
            elif pos.x >= 750.0:
                dedup_key = f"RESTRICTED_ZONE_INCURSION:{track.track_id}"
                last_time = self.recent_alert_signatures.get(dedup_key)
                if last_time and (now - last_time) < self.dedup_cooldown_sec:
                    continue

                self.recent_alert_signatures[dedup_key] = now
                cand_id = f"CAND-INCIDENT-{self.next_candidate_num}"
                self.next_candidate_num += 1

                cand = CandidateIncident(
                    id=cand_id,
                    candidate_type="RESTRICTED_ZONE_INCURSION",
                    track_ids=[track.track_id],
                    camera_ids=[track.camera_id],
                    location={"x": pos.x, "y": pos.y},
                    confidence=track.confidence,
                    status=CandidateStatus.CANDIDATE_UNVERIFIED,
                    supporting_evidence=[
                        f"Track {track.track_id} on {track.camera_id} crossed boundary into prohibited headland (RZ-01)",
                        f"Coordinates ({pos.x:.1f}m, {pos.y:.1f}m) violate beach safety ordinance",
                    ],
                    uncertainty_reasons=["Requires visual confirmation by tower operator before dispatching patrol boat."],
                    requires_operator_action=True,
                    auto_dispatched=False,
                    timestamp=now,
                    decision_notes="Restricted zone boundary incursion candidate.",
                )
                self.candidate_incidents[cand_id] = cand
                new_candidates.append(cand)

        return list(self.candidate_incidents.values())

    def review_candidate(
        self, candidate_id: str, action: str, operator_notes: Optional[str] = None
    ) -> Optional[CandidateIncident]:
        """
        Operator action: CONFIRM or DISMISS.
        """
        cand = self.candidate_incidents.get(candidate_id)
        if not cand:
            return None

        if action.upper() == "CONFIRM":
            cand.status = CandidateStatus.OPERATOR_CONFIRMED
            cand.decision_notes = operator_notes or "Operator visually verified candidate alert. Escalated to operations coordinator."
        elif action.upper() == "DISMISS":
            cand.status = CandidateStatus.OPERATOR_DISMISSED
            cand.decision_notes = operator_notes or "Operator dismissed as false alarm / recreational activity."

        return cand

    def get_candidate(self, candidate_id: str) -> Optional[CandidateIncident]:
        return self.candidate_incidents.get(candidate_id)

    def get_all_candidates(self) -> List[CandidateIncident]:
        return list(self.candidate_incidents.values())

    def reset(self) -> None:
        self.candidate_incidents.clear()
        self.recent_alert_signatures.clear()
        self.next_candidate_num = 101

