"""
backend/app/vision/detector.py
Edge video inference processor: transforms vision detections into operational alerts.
Processes CCTV bounding box metadata, maps pixels to GIS coordinates,
and triggers safety alarms for geofence breaches or struggling bathers.
"""

from typing import List, Dict, Any, Optional
import time
from pydantic import BaseModel, Field

from app.models.vision import FrameInferencePayload, SwimmerDetection
from app.simulation.beach_layout import get_beach_preset
from app.models.incident import IncidentCreate, PriorityLevel

# Thresholds for distress classification
DISTRESS_CONFIDENCE_THRESHOLD = 0.70
MOTIONLESS_ALERT_SECONDS = 12.0


class VisionAnalyticsEngine:
    @staticmethod
    def process_frame(payload: FrameInferencePayload) -> Dict[str, Any]:
        preset = get_beach_preset(payload.beach_id)
        active_zones = preset.get("zones", [])
        
        incidents_generated: List[IncidentCreate] = []
        violations_count = 0
        distress_count = 0

        for det in payload.detections:
            # 1. Geofence Boundary Check: Is swimmer beyond seaward safety limit?
            in_safe_sector = False
            for zone in active_zones:
                if zone["x_min"] <= det.estimated_beach_x <= zone["x_max"]:
                    if det.estimated_beach_y <= zone["y_seaward_limit"]:
                        in_safe_sector = True
                        break

            if not in_safe_sector or det.estimated_beach_y > 50.0:
                det.is_outside_safety_rope = True
                violations_count += 1

            # 2. Rip Trench Trap Evaluation
            in_rip_corridor = False
            for corridor in preset.get("bathymetry", {}).get("rip_channel_corridors", []):
                if corridor["x_min"] <= det.estimated_beach_x <= corridor["x_max"]:
                    if det.estimated_beach_y > 15.0:  # In deep rip channel water
                        in_rip_corridor = True
                        break

            # 3. Drowning / Distress Posture Detection
            is_distress = (
                det.class_name in ["struggling_arms", "submerged_head"]
                and det.confidence >= DISTRESS_CONFIDENCE_THRESHOLD
            ) or (det.motionless_seconds >= MOTIONLESS_ALERT_SECONDS)

            if is_distress or (in_rip_corridor and det.is_outside_safety_rope):
                distress_count += 1
                incidents_generated.append(
                    IncidentCreate(
                        beach_id=payload.beach_id,
                        zone_id="ZONE_AUTO_CV",
                        priority=PriorityLevel.CRITICAL if is_distress else PriorityLevel.HIGH,
                        incident_type="CV_DISTRESS_OR_BREACH",
                        description=(
                            f"Camera {payload.camera_id} detected track #{det.track_id}: "
                            f"{det.class_name.upper()} at ({det.estimated_beach_x:.1f}m, {det.estimated_beach_y:.1f}m). "
                            f"Outside safety rope: {det.is_outside_safety_rope}, Rip trap: {in_rip_corridor}"
                        ),
                        coordinates={"x": det.estimated_beach_x, "y": det.estimated_beach_y}
                    )
                )

        return {
            "camera_id": payload.camera_id,
            "total_detected_bathers": len(payload.detections),
            "boundary_violations": violations_count,
            "active_distress_count": distress_count,
            "incidents": incidents_generated
        }


# Bounding box schemas for backward compatibility and unit tests
class DetectionBoundingBox(BaseModel):
    detection_id: str
    camera_id: str
    class_name: str = Field(..., description="'SWIMMER' | 'BATHER_HEAD' | 'STRUGGLING_ARMS' | 'RESTRICTED_INTRUDER'")
    x: float
    y: float
    width: float
    height: float
    confidence: float = Field(default=0.92, ge=0.0, le=1.0)
    dwell_seconds: float = Field(default=0.0, description="Dwell duration in current zone")
    timestamp: float = Field(default_factory=time.time)


class CVInferenceResult(BaseModel):
    total_detected: int
    swimmers_in_water: int
    struggling_detected: int
    geofence_breaches: int
    incidents_raised: List[Dict[str, str]]


class VisionDetector:
    def __init__(self):
        self.active_detections: List[DetectionBoundingBox] = []

    def process_frame_detections(self, detections: List[DetectionBoundingBox]) -> CVInferenceResult:
        """
        Processes bounding box detections from coastal CCTV cameras and evaluates distress/geofence alerts.
        """
        self.active_detections = detections
        swimmers_count = 0
        struggling_count = 0
        breaches_count = 0
        incidents: List[Dict[str, str]] = []

        for det in detections:
            # Check for struggling bather indicators
            if det.class_name in ["STRUGGLING_ARMS", "DISTRESSED"]:
                struggling_count += 1
                incidents.append({
                    "incident_type": "STRUGGLING_SWIMMER_CV",
                    "camera_id": det.camera_id,
                    "confidence": f"{det.confidence * 100:.1f}%",
                    "reason": f"Active distress gestures / struggling arms detected by {det.camera_id} at ({det.x:.1f}, {det.y:.1f})",
                    "severity": "CRITICAL" if det.dwell_seconds > 10 else "HIGH"
                })

            # Check for restricted zone breach (Zone D: X >= 800)
            elif det.x >= 800.0 or det.class_name == "RESTRICTED_INTRUDER":
                breaches_count += 1
                incidents.append({
                    "incident_type": "RESTRICTED_GEOFENCE_BREACH",
                    "camera_id": det.camera_id,
                    "confidence": f"{det.confidence * 100:.1f}%",
                    "reason": f"Visitor entered prohibited rocky headland (Zone D) at ({det.x:.1f}, {det.y:.1f})",
                    "severity": "HIGH"
                })

            # Check for stationary struggling in rip channel (>15s dwell)
            elif (300.0 <= det.x <= 540.0) and det.y > 20.0 and det.dwell_seconds > 15.0:
                struggling_count += 1
                incidents.append({
                    "incident_type": "RIP_CHANNEL_DWELL_DISTRESS",
                    "camera_id": det.camera_id,
                    "confidence": f"{det.confidence * 100:.1f}%",
                    "reason": f"Bather trapped in rip channel trench for {det.dwell_seconds:.1f}s without progress",
                    "severity": "CRITICAL"
                })

            if det.y >= 0:
                swimmers_count += 1

        return CVInferenceResult(
            total_detected=len(detections),
            swimmers_in_water=swimmers_count,
            struggling_detected=struggling_count,
            geofence_breaches=breaches_count,
            incidents_raised=incidents,
        )

    def get_latest_detections(self) -> List[DetectionBoundingBox]:
        return self.active_detections
