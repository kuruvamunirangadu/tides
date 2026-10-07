"""
Visitor behavioral models representing beachgoers, swimmers, and crowd dynamics.
"""

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class SwimmingStatus(str, Enum):
    ON_BEACH = "ON_BEACH"          # On dry sand
    WADING = "WADING"              # Ankle/knee deep water (y: 0-10m)
    SHALLOW_WATER = "SHALLOW_WATER"# Waist deep water (y: 10-35m)
    DEEP_SWIMMING = "DEEP_SWIMMING"# Beyond breaking waves (y: 35-120m)
    RESTRICTED_OFFSHORE = "RESTRICTED_OFFSHORE" # Dangerously deep offshore


class DistressState(str, Enum):
    NONE = "NONE"                  # Calm, normal recreation
    TIRED = "TIRED"                # Fatigued, struggling against current
    STRUGGLING = "STRUGGLING"      # Actively signaling or fighting rip drift
    DROWNING_ACTIVE = "DROWNING_ACTIVE" # Instinctive drowning response
    DROWNING_PASSIVE = "DROWNING_PASSIVE" # Submerged or unconscious
    RESCUED = "RESCUED"            # Secured by lifeguard/drone flotation


class RiskExposure(str, Enum):
    SAFE = "SAFE"
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AwarenessState(str, Enum):
    UNAWARE = "UNAWARE"
    SUSPICIOUS = "SUSPICIOUS"
    FLEEING = "FLEEING"
    TRAPPED = "TRAPPED"


class SwimmingSkill(str, Enum):
    NON_SWIMMER = "NON_SWIMMER"
    BEGINNER = "BEGINNER"
    INTERMEDIATE = "INTERMEDIATE"
    ADVANCED = "ADVANCED"


class Visitor(BaseModel):
    id: str
    group_id: Optional[str] = None
    skill: SwimmingSkill = SwimmingSkill.BEGINNER
    
    # 2D coordinates in beach space (x: 0-1000m, y: -50m [dry sand] to +200m [offshore])
    x: float
    y: float
    
    # Kinematics
    vx: float = 0.0
    vy: float = 0.0
    target_x: Optional[float] = None
    target_y: Optional[float] = None
    
    # Status
    swimming_status: SwimmingStatus = SwimmingStatus.ON_BEACH
    distress_state: DistressState = DistressState.NONE
    risk_exposure: RiskExposure = RiskExposure.SAFE
    current_zone_id: str = "ZONE_A"

    # Sensory Perception & Autonomous Escape Navigation
    awareness_state: AwarenessState = AwarenessState.UNAWARE
    reaction_delay_seconds: float = 1.2
    reaction_timer: Optional[float] = None
    local_water_depth: float = 0.0
    escape_vector_dx: float = 0.0
    escape_vector_dy: float = -1.0
    tactile_undertow_detected: bool = False
    sudden_surge_detected: bool = False
    
    # Behavior metrics
    time_in_water_seconds: float = 0.0
    stamina: float = Field(default=100.0, ge=0.0, le=100.0)
    panic_level: float = Field(default=0.0, ge=0.0, le=100.0)
    has_lifejacket: bool = False
    
    # Simulation telemetry
    last_action_timestamp: float = 0.0
