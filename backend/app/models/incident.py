"""
Incident and event models for logging, hazard tracking, and latency benchmarks.
"""

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class IncidentType(str, Enum):
    RIP_CURRENT_TRAP = "RIP_CURRENT_TRAP"
    HIGH_WAVE_SWEEP = "HIGH_WAVE_SWEEP"
    SWIMMER_DISTRESS = "SWIMMER_DISTRESS"
    RESTRICTED_ZONE_VIOLATION = "RESTRICTED_ZONE_VIOLATION"
    SUDDEN_STORM_SURGE = "SUDDEN_STORM_SURGE"
    TIDAL_CUTOFF = "TIDAL_CUTOFF"
    SENSOR_ANOMALY = "SENSOR_ANOMALY"


class IncidentSeverity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class IncidentStatus(str, Enum):
    DETECTED = "DETECTED"
    ASSESSING = "ASSESSING"
    DISPATCHED = "DISPATCHED"
    ON_SCENE = "ON_SCENE"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class Incident(BaseModel):
    id: str
    incident_type: IncidentType
    severity: IncidentSeverity = IncidentSeverity.MEDIUM
    status: IncidentStatus = IncidentStatus.DETECTED
    
    zone_id: str
    location_x: float
    location_y: float
    involved_visitor_ids: List[str] = Field(default_factory=list)
    
    # Latency & Timestamps (Simulation clock in seconds)
    start_time: float
    detection_time: Optional[float] = None
    decision_time: Optional[float] = None
    response_dispatch_time: Optional[float] = None
    on_scene_time: Optional[float] = None
    resolution_time: Optional[float] = None
    
    # Latency measurements (seconds)
    detection_latency_s: Optional[float] = None
    decision_latency_s: Optional[float] = None
    response_latency_s: Optional[float] = None
    resolution_duration_s: Optional[float] = None
    
    # Operations
    dispatched_resource_ids: List[str] = Field(default_factory=list)
    description: str = ""
    outcome: Optional[str] = None


class PriorityLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class IncidentCreate(BaseModel):
    beach_id: str = "RUSHIKONDA_VIZAG"
    zone_id: str = "ZONE_AUTO_CV"
    priority: PriorityLevel = PriorityLevel.MEDIUM
    incident_type: str = "CV_DISTRESS_OR_BREACH"
    description: str = ""
    coordinates: dict = Field(default_factory=dict)

