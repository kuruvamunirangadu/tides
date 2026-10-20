"""
backend/app/perception/types.py
Core type definitions for TIDES Milestone 7 Multi-Camera Computer Vision & Sensor Fusion.
Strictly separates camera tracks, ground truth visitor simulation, sensor telemetry, and candidate alerts.
"""

from enum import Enum
from typing import List, Dict, Any, Optional, Tuple
from pydantic import BaseModel, Field
import time


class DetectionProvenance(str, Enum):
    ACTUAL_INFERENCE = "ACTUAL"
    SIMULATED_FEED = "SIMULATED"


class TrackState(str, Enum):
    TENTATIVE = "TENTATIVE"
    CONFIRMED = "CONFIRMED"
    LOST = "LOST"
    EXPIRED = "EXPIRED"


class AssociationStatus(str, Enum):
    CONFIRMED = "CONFIRMED"
    AMBIGUOUS = "AMBIGUOUS"
    UNASSOCIATED = "UNASSOCIATED"


class SensorFreshness(str, Enum):
    FRESH = "FRESH"
    STALE = "STALE"
    OFFLINE = "OFFLINE"


class CandidateStatus(str, Enum):
    CANDIDATE_UNVERIFIED = "CANDIDATE_UNVERIFIED"
    OPERATOR_CONFIRMED = "OPERATOR_CONFIRMED"
    OPERATOR_DISMISSED = "OPERATOR_DISMISSED"


class BoundingBox(BaseModel):
    x: float = Field(..., description="Top-left x in pixels or normalized [0, 1]")
    y: float = Field(..., description="Top-left y in pixels or normalized [0, 1]")
    width: float = Field(..., gt=0.0, description="Positive bounding box width")
    height: float = Field(..., gt=0.0, description="Positive bounding box height")


class PerceptionDetection(BaseModel):
    id: str
    camera_id: str
    timestamp: float = Field(default_factory=time.time)
    provenance: DetectionProvenance = DetectionProvenance.SIMULATED_FEED
    class_name: str = "PERSON"
    confidence: float = Field(..., ge=0.0, le=1.0)
    bbox: BoundingBox
    estimated_world_x: float
    estimated_world_y: float
    in_water: bool = False
    ground_truth_id: Optional[str] = None  # Retained for evaluation only, distinct from track_id


class TrackPosition(BaseModel):
    x: float
    y: float
    timestamp: float


class CameraTrack(BaseModel):
    track_id: str
    camera_id: str
    state: TrackState = TrackState.TENTATIVE
    provenance: DetectionProvenance = DetectionProvenance.SIMULATED_FEED
    first_seen: float
    last_seen: float
    positions: List[TrackPosition] = Field(default_factory=list)
    latest_bbox: BoundingBox
    velocity: Dict[str, float] = Field(default_factory=lambda: {"vx": 0.0, "vy": 0.0})
    speed_mps: float = 0.0
    direction_deg: float = 0.0
    confidence: float = 0.9
    hits: int = 1
    misses: int = 0
    in_water: bool = False
    ground_truth_id: Optional[str] = None


class CrossCameraLink(BaseModel):
    global_id: str
    camera_tracks: List[Dict[str, str]] = Field(
        ..., description="List of dicts with {'camera_id': ..., 'track_id': ...}"
    )
    spatial_distance_m: float
    time_delta_sec: float
    association_confidence: float = Field(..., ge=0.0, le=1.0)
    status: AssociationStatus = AssociationStatus.CONFIRMED
    notes: Optional[str] = None


class SensorReading(BaseModel):
    source_id: str
    sensor_type: str  # 'ADCP_ACOUSTIC' | 'RADAR_WAVE' | 'WEATHER_STATION' | 'CAMERA_VISION'
    timestamp: float = Field(default_factory=time.time)
    metric_name: str  # 'water_current_mps' | 'wave_height_m' | 'wind_speed_kmh'
    value: float
    unit: str
    confidence: float = Field(default=0.9, ge=0.0, le=1.0)
    freshness: SensorFreshness = SensorFreshness.FRESH


class SensorDisagreement(BaseModel):
    property_name: str
    sensor_a: str
    sensor_b: str
    value_a: float
    value_b: float
    unit: str
    absolute_difference: float
    severity: str = "MILD"  # 'MILD' | 'SEVERE'
    explanation: str
    timestamp: float = Field(default_factory=time.time)


class CameraGeometry(BaseModel):
    id: str
    name: str
    position: Dict[str, float]  # {'x': 140, 'y': 190}
    rotation_deg: float  # 90 = facing seaward down
    field_of_view_deg: float
    range_m: float
    status: str = "ONLINE"  # 'ONLINE' | 'DEGRADED' | 'OFFLINE'
    calibrated: bool = True
    color: str = "#06b6d4"


class BlindSpot(BaseModel):
    id: str
    zone_name: str
    x_min: float
    x_max: float
    y_min: float
    y_max: float
    reason: str  # 'OUT_OF_RANGE' | 'CAMERA_OFFLINE' | 'ANGULAR_OCCLUSION'


class CoverageReport(BaseModel):
    total_coverage_pct: float
    active_cameras_count: int
    offline_cameras_count: int
    overlapping_pairs: List[Dict[str, Any]]
    blind_spots: List[BlindSpot]
    timestamp: float = Field(default_factory=time.time)


class CandidateIncident(BaseModel):
    id: str
    candidate_type: str  # 'POSSIBLE_DISTRESS' | 'RESTRICTED_ZONE_INCURSION' | 'DRIFT_RISK'
    track_ids: List[str]
    camera_ids: List[str]
    location: Dict[str, float]
    confidence: float = Field(..., ge=0.0, le=1.0)
    status: CandidateStatus = CandidateStatus.CANDIDATE_UNVERIFIED
    supporting_evidence: List[str]
    uncertainty_reasons: List[str] = Field(default_factory=list)
    requires_operator_action: bool = True
    auto_dispatched: bool = False  # STRICT SAFETY RULE: Must ALWAYS remain False for unverified CV
    timestamp: float = Field(default_factory=time.time)
    decision_notes: Optional[str] = None

