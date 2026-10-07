"""
Beach geometry, zoning, and physical safety resources models.
"""

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class ZoneType(str, Enum):
    SWIMMING = "SWIMMING"              # Safe patrolled swimming zone
    CAUTION = "CAUTION"                # Shore-break / moderate surf zone
    RESTRICTED = "RESTRICTED"          # Rocky cliffs / strong undercurrents
    RIP_CHANNEL = "RIP_CHANNEL"        # Channelized rip current hazard zone
    DUNE_BUFFER = "DUNE_BUFFER"        # Upper beach / non-bathing zone
    PATROL_STATION = "PATROL_STATION"  # Lifeguard tower & command base


class FlagStatus(str, Enum):
    GREEN = "GREEN"          # Safe conditions, supervised bathing permitted
    YELLOW = "YELLOW"        # Caution advised, moderate hazards
    RED = "RED"              # Danger, rough surf or strong currents, swimming discouraged
    DOUBLE_RED = "DOUBLE_RED"# Extreme hazard, beach & water closed to all visitors


class BeachZone(BaseModel):
    id: str
    name: str
    zone_type: ZoneType
    description: str
    flag_status: FlagStatus = FlagStatus.GREEN
    # 2D Bounding Box coordinates in beach simulation space (X: 0-1000m along shore, Y: 0-300m offshore)
    x_min: float
    x_max: float
    y_min: float  # y=0 is shoreline, positive y is oceanwards
    y_max: float
    current_risk_score: float = Field(default=0.0, ge=0.0, le=1.0)
    swimmer_capacity: int = 150
    active_hazard_ids: List[str] = Field(default_factory=list)


class ResourceStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    DISPATCHED = "DISPATCHED"
    ON_PATROL = "ON_PATROL"
    ON_SCENE = "ON_SCENE"
    RETURNING = "RETURNING"
    UNAVAILABLE = "UNAVAILABLE"
    FAILED = "FAILED"


class Lifeguard(BaseModel):
    id: str
    name: str
    assigned_tower_id: str
    current_x: float
    current_y: float
    status: ResourceStatus = ResourceStatus.AVAILABLE
    target_incident_id: Optional[str] = None
    target_x: Optional[float] = None
    target_y: Optional[float] = None
    speed_mps: float = Field(default=3.5, description="Sprint/paddle rescue speed in m/s")


class Drone(BaseModel):
    id: str
    model: str = "AeroGuard-Apex"
    current_x: float
    current_y: float
    altitude_m: float = 15.0
    status: ResourceStatus = ResourceStatus.AVAILABLE
    battery_pct: float = Field(default=100.0, ge=0.0, le=100.0)
    has_flotation_payload: bool = True
    payload_deployed: bool = False
    target_incident_id: Optional[str] = None
    target_x: Optional[float] = None
    target_y: Optional[float] = None
    speed_mps: float = Field(default=12.0, description="Flight transit speed in m/s")


class WarningBoard(BaseModel):
    id: str
    location_x: float
    location_y: float
    zone_id: str
    is_active: bool = True
    display_text: str = "SAFE SWIMMING - PATROLLED AREA"
    flag_color: FlagStatus = FlagStatus.GREEN
    strobe_active: bool = False


class PASystem(BaseModel):
    id: str
    location_x: float
    location_y: float
    zone_id: str
    is_broadcasting: bool = False
    current_message: Optional[str] = None
    last_broadcast_timestamp: float = 0.0
    volume_db: float = 85.0


class CameraStation(BaseModel):
    id: str
    location_x: float
    location_y: float
    coverage_zone_id: str
    is_operational: bool = True
    ptz_pan_deg: float = 0.0
    is_tracking_target: bool = False
    tracked_visitor_id: Optional[str] = None


class BeachLayout(BaseModel):
    beach_id: str = "AP-VSP-RKBEACH-01"
    beach_name: str = "Visakhapatnam RK Beach Simulation"
    length_meters: float = 1000.0
    width_meters: float = 300.0
    zones: List[BeachZone] = Field(default_factory=list)
    lifeguards: List[Lifeguard] = Field(default_factory=list)
    drones: List[Drone] = Field(default_factory=list)
    warning_boards: List[WarningBoard] = Field(default_factory=list)
    pa_systems: List[PASystem] = Field(default_factory=list)
    cameras: List[CameraStation] = Field(default_factory=list)
