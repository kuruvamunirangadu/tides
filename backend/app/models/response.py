"""
Decision and Response action models for autonomous safety operations.
"""

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class HazardSeverity(str, Enum):
    NONE = "NONE"
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class HazardDetection(BaseModel):
    id: str
    hazard_type: str  # e.g., "RIP_CURRENT", "HIGH_SURF", "RAPID_TIDE", "SQUALL", "SENSOR_FAULT"
    severity: HazardSeverity
    affected_zones: List[str]
    confidence: float = Field(ge=0.0, le=1.0)
    reason: str
    detected_at: float
    raw_telemetry: Dict[str, Any] = Field(default_factory=dict)


class ZoneRiskAssessment(BaseModel):
    zone_id: str
    hazard_score: float = Field(ge=0.0, le=1.0, description="Environmental hazard severity (0-1)")
    exposure_score: float = Field(ge=0.0, le=1.0, description="Visitor exposure / density (0-1)")
    vulnerability_score: float = Field(ge=0.0, le=1.0, description="Vulnerable/distressed swimmers (0-1)")
    total_risk_score: float = Field(ge=0.0, le=1.0, description="Combined operational risk (0-1)")
    
    risk_level: HazardSeverity = HazardSeverity.LOW
    recommended_flag: str = "GREEN"
    
    visitor_count: int = 0
    swimmer_count: int = 0
    distressed_count: int = 0
    primary_risk_factors: List[str] = Field(default_factory=list)


class DecisionActionType(str, Enum):
    MAINTAIN_NORMAL_WATCH = "MAINTAIN_NORMAL_WATCH"
    SET_FLAG_YELLOW = "SET_FLAG_YELLOW"
    SET_FLAG_RED = "SET_FLAG_RED"
    SET_FLAG_DOUBLE_RED = "SET_FLAG_DOUBLE_RED"
    UPDATE_WARNING_BOARD = "UPDATE_WARNING_BOARD"
    BROADCAST_PA_ALERT = "BROADCAST_PA_ALERT"
    DISPATCH_DRONE_PATROL = "DISPATCH_DRONE_PATROL"
    DISPATCH_DRONE_RESCUE = "DISPATCH_DRONE_RESCUE"
    DISPATCH_LIFEGUARD_RESCUE = "DISPATCH_LIFEGUARD_RESCUE"
    EVACUATE_ZONE = "EVACUATE_ZONE"
    SOUND_EMERGENCY_SIREN = "SOUND_EMERGENCY_SIREN"
    FLAG_SENSOR_FAILURE = "FLAG_SENSOR_FAILURE"


class Decision(BaseModel):
    decision_id: str
    hazard_id: Optional[str] = None
    hazard_type: str
    severity: HazardSeverity
    affected_zone: str
    confidence: float = Field(ge=0.0, le=1.0)
    reason: str
    recommended_actions: List[DecisionActionType]
    timestamp: float
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ResponseStatus(str, Enum):
    PENDING = "PENDING"
    EXECUTING = "EXECUTING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    FALLBACK_TRIGGERED = "FALLBACK_TRIGGERED"


class SafetyResponse(BaseModel):
    response_id: str
    source_decision_id: str
    action_type: DecisionActionType
    target_id: str  # zone_id, visitor_id, board_id, drone_id, etc.
    target_zone: str
    timestamp: float
    status: ResponseStatus = ResponseStatus.PENDING
    details: Dict[str, Any] = Field(default_factory=dict)
    completion_timestamp: Optional[float] = None
    execution_latency_s: Optional[float] = None
