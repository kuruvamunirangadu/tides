"""
backend/app/api/perception.py
FastAPI Router for TIDES Milestone 7 Multi-Camera Computer Vision & Sensor Fusion.
Provides endpoints for detection ingestion, per-camera tracking, cross-camera association,
sensor disagreement analysis, camera coverage maps, and operator review of candidate incidents.
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
import time

from app.perception.types import (
    PerceptionDetection,
    DetectionProvenance,
    CameraTrack,
    CrossCameraLink,
    SensorReading,
    SensorDisagreement,
    CameraGeometry,
    CoverageReport,
    CandidateIncident,
    CandidateStatus,
)
from app.perception.detection_adapter import DetectionAdapter
from app.perception.camera_tracker import CameraTracker
from app.perception.cross_camera_association import CrossCameraAssociator
from app.perception.sensor_fusion import SensorFusionEngine
from app.perception.incident_evidence import IncidentEvidenceCorrelator


router = APIRouter(prefix="/api/perception", tags=["Perception & Sensor Fusion"])

# Global state instances
adapter = DetectionAdapter()
trackers: Dict[str, CameraTracker] = {
    "CAM-01": CameraTracker("CAM-01"),
    "CAM-02": CameraTracker("CAM-02"),
    "CAM-03": CameraTracker("CAM-03"),
    "CAM-04": CameraTracker("CAM-04"),
}
associator = CrossCameraAssociator()
fusion_engine = SensorFusionEngine()
correlator = IncidentEvidenceCorrelator()

# Default camera geometry registry
camera_geometries: Dict[str, CameraGeometry] = {
    "CAM-01": CameraGeometry(
        id="CAM-01",
        name="Tower A Primary PTZ (Zone A)",
        position={"x": 140.0, "y": 190.0},
        rotation_deg=90.0,
        field_of_view_deg=85.0,
        range_m=240.0,
        status="ONLINE",
        calibrated=True,
        color="#06b6d4",
    ),
    "CAM-02": CameraGeometry(
        id="CAM-02",
        name="Tower B Deep Surf Cam (Zone B)",
        position={"x": 420.0, "y": 190.0},
        rotation_deg=90.0,
        field_of_view_deg=90.0,
        range_m=260.0,
        status="ONLINE",
        calibrated=True,
        color="#3b82f6",
    ),
    "CAM-03": CameraGeometry(
        id="CAM-03",
        name="North Cliff Restricted Watch (Zone C)",
        position={"x": 700.0, "y": 190.0},
        rotation_deg=100.0,
        field_of_view_deg=80.0,
        range_m=230.0,
        status="ONLINE",
        calibrated=True,
        color="#ef4444",
    ),
    "CAM-04": CameraGeometry(
        id="CAM-04",
        name="Promenade Beachhead Overview",
        position={"x": 280.0, "y": 80.0},
        rotation_deg=90.0,
        field_of_view_deg=95.0,
        range_m=190.0,
        status="ONLINE",
        calibrated=True,
        color="#a855f7",
    ),
}

latest_readings: List[SensorReading] = [
    SensorReading(
        source_id="ADCP-CORRIDOR-01",
        sensor_type="ADCP_ACOUSTIC",
        metric_name="water_current_mps",
        value=1.45,
        unit="m/s",
        confidence=0.96,
        timestamp=time.time(),
    ),
    SensorReading(
        source_id="WAVE-RADAR-TOWER",
        sensor_type="RADAR_WAVE",
        metric_name="wave_height_m",
        value=1.30,
        unit="m",
        confidence=0.92,
        timestamp=time.time(),
    ),
]


class IngestPayload(BaseModel):
    camera_id: str
    timestamp: Optional[float] = None
    provenance: Optional[DetectionProvenance] = DetectionProvenance.SIMULATED_FEED
    detections: List[Dict[str, Any]]


class CandidateReviewPayload(BaseModel):
    action: str  # 'CONFIRM' or 'DISMISS'
    notes: Optional[str] = None


@router.post("/ingest", status_code=status.HTTP_200_OK)
def ingest_detections(payload: IngestPayload):
    """
    Ingests and validates raw detections, updates per-camera tracking, and recomputes fusion.
    """
    cam_id = payload.camera_id
    if cam_id not in trackers:
        trackers[cam_id] = CameraTracker(cam_id)

    valid_dets, rejections = adapter.validate_and_adapt(
        raw_detections=payload.detections,
        camera_id=cam_id,
        frame_timestamp=payload.timestamp,
        provenance=payload.provenance,
    )

    now = payload.timestamp or time.time()
    active_tracks = trackers[cam_id].update(valid_dets, now)

    # Gather tracks across all cameras for association
    all_tracks_map: Dict[str, List[CameraTrack]] = {
        cid: trk.get_active_tracks() for cid, trk in trackers.items()
    }

    # Cross-camera association
    links = associator.associate_tracks(all_tracks_map, camera_geometries, now)

    # Flatten tracks for sensor fusion and candidate evaluation
    all_tracks: List[CameraTrack] = []
    for trk_list in all_tracks_map.values():
        all_tracks.extend(trk_list)

    # Disagreements
    disagreements = fusion_engine.evaluate_sensor_disagreements(all_tracks, latest_readings, now)

    # Candidate incidents (STRICT RULE: NO AUTO-DISPATCH)
    candidates = correlator.evaluate_candidates(
        tracks=all_tracks,
        readings=latest_readings,
        disagreements=disagreements,
        active_hazards=[],
        sim_time=now,
    )

    return {
        "status": "PROCESSED",
        "camera_id": cam_id,
        "valid_count": len(valid_dets),
        "rejected_count": len(rejections),
        "rejections": rejections,
        "active_tracks_count": len(active_tracks),
        "cross_camera_links_count": len(links),
        "disagreements_count": len(disagreements),
        "candidate_incidents_count": len(candidates),
    }


@router.get("/state")
def get_perception_state():
    """
    Returns full current perception state: active tracks, cross camera links, and sensor disagreements.
    """
    all_tracks_map = {cid: trk.get_active_tracks() for cid, trk in trackers.items()}
    all_tracks = [t for trk_list in all_tracks_map.values() for t in trk_list]
    now = time.time()

    links = associator.associate_tracks(all_tracks_map, camera_geometries, now)
    disagreements = fusion_engine.evaluate_sensor_disagreements(all_tracks, latest_readings, now)

    return {
        "timestamp": now,
        "active_tracks": all_tracks,
        "cross_camera_links": links,
        "sensor_readings": latest_readings,
        "sensor_disagreements": disagreements,
        "fusion_version": fusion_engine.fusion_version,
    }


@router.get("/coverage", response_model=CoverageReport)
def get_coverage_report():
    """
    Computes and returns the camera coverage footprint, overlapping coverage pairs, and blind spots.
    """
    return fusion_engine.compute_coverage_report(list(camera_geometries.values()))


@router.get("/candidates", response_model=List[CandidateIncident])
def get_candidate_incidents():
    """
    Returns active candidate incidents pending human verification.
    """
    return correlator.get_all_candidates()


@router.post("/candidates/{candidate_id}/review", response_model=CandidateIncident)
def review_candidate_incident(candidate_id: str, payload: CandidateReviewPayload):
    """
    Operator action to CONFIRM or DISMISS an unverified candidate alert.
    """
    res = correlator.review_candidate(candidate_id, payload.action, payload.notes)
    if not res:
        raise HTTPException(status_code=404, detail=f"Candidate incident {candidate_id} not found")
    return res


@router.post("/reset")
def reset_perception():
    """
    Resets all trackers, associations, and candidate incidents.
    """
    for trk in trackers.values():
        trk.reset()
    correlator.reset()
    return {"status": "RESET_SUCCESSFUL"}

