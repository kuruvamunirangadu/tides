"""
backend/app/regional/types.py
Data structures and Pydantic models for TIDES Milestone 10:
Multi-Beach Command Center & Fleet-Wide Monitoring across Andhra Pradesh.
"""

from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
import time


class BeachProvenance(str, Enum):
    """Data provenance classification for coastal safety sites."""
    LIVE = "LIVE"                    # Real deployed IoT sensor and camera stream
    SIMULATED = "SIMULATED"          # Real-time high-fidelity Digital Twin simulation
    DEMONSTRATION = "DEMONSTRATION"  # Explicit demonstration / regional mock feed


class BeachOperationalStatus(str, Enum):
    """Operational status of a coastal beach site."""
    ACTIVE = "ACTIVE"                # Open for swimming under lifeguard supervision
    CAUTION = "CAUTION"              # Elevated risk / rip currents / advisory active
    RESTRICTED = "RESTRICTED"        # Water access restricted / red flag conditions
    EVACUATION = "EVACUATION"        # Active beach evacuation underway
    OFFLINE = "OFFLINE"              # Station offline / sensor comms blackout
    UNKNOWN = "UNKNOWN"              # Telemetry unavailable / unmonitored


class DataFreshness(str, Enum):
    """Data freshness classification."""
    FRESH = "FRESH"                  # Updated within acceptable window (< 60s)
    STALE = "STALE"                  # Outdated observation (> 60s or historical demo)
    NO_DATA = "NO_DATA"              # No telemetry ever received
    OFFLINE = "OFFLINE"              # Remote sensor station disconnected


class GeographicCoordinate(BaseModel):
    """Verified geographic coordinates."""
    latitude: float
    longitude: float


class RegionalBeachRecord(BaseModel):
    """
    Registry item for a configured Andhra Pradesh coastal beach.
    Separates site configuration from local simulation mechanics.
    """
    beach_id: str = Field(..., description="Stable, unique beach identifier (e.g. RUSHIKONDA)")
    name: str = Field(..., description="Human-readable display name")
    district: str = Field(..., description="Administrative district in Andhra Pradesh")
    coast_sector: str = Field(..., description="Regional coastal zone classification")
    location: Optional[GeographicCoordinate] = None
    status: BeachOperationalStatus = BeachOperationalStatus.UNKNOWN
    provenance: BeachProvenance = BeachProvenance.DEMONSTRATION
    data_freshness: DataFreshness = DataFreshness.NO_DATA
    last_updated: float = Field(default_factory=time.time)
    connected: bool = False
    has_active_simulator: bool = False
    active_incidents_count: int = 0
    active_hazards_count: int = 0
    available_resources_count: int = 0
    total_resources_count: int = 0
    sensor_health_pct: Optional[float] = None
    notes: Optional[str] = None


class RegionalRiskObservation(BaseModel):
    """
    Aggregated coastal hazard & oceanographic observation for regional risk comparison.
    Preserves original units and clearly distinguishes measured/simulated from missing data.
    """
    beach_id: str
    beach_name: str
    wave_height_m: Optional[float] = None
    wave_period_s: Optional[float] = None
    rip_current_risk: Optional[str] = None       # "LOW", "MODERATE", "HIGH", "CRITICAL", "UNKNOWN"
    rip_velocity_mps: Optional[float] = None
    wind_speed_mps: Optional[float] = None
    wind_direction_deg: Optional[float] = None
    visibility_km: Optional[float] = None
    tide_level_m: Optional[float] = None
    sensor_freshness: DataFreshness = DataFreshness.NO_DATA
    sensor_availability_pct: Optional[float] = None
    forecast_summary: Optional[str] = None
    active_incident_count: int = 0
    data_source: str = "TIDES Digital Twin"
    timestamp: float = Field(default_factory=time.time)
    provenance: BeachProvenance = BeachProvenance.DEMONSTRATION


class RegionalIncidentRecord(BaseModel):
    """
    Normalized incident item consumed across all regional beach sectors.
    Read-only presentation model; does not trigger automatic dispatches.
    """
    incident_id: str
    site_id: str
    site_name: str
    created_at: float
    updated_at: float
    severity: str                                # "LOW", "MODERATE", "HIGH", "CRITICAL"
    distress_level: float = Field(default=0.0, ge=0.0, le=1.0)
    status: str                                  # "REPORTED", "DISPATCHED", "ON_SCENE", "RESOLVED"
    acknowledgement_status: str = "ACKNOWLEDGED" # "ACKNOWLEDGED", "PENDING", "ESCALATED"
    assigned_resource_id: Optional[str] = None
    assigned_resource_name: Optional[str] = None
    description: str = ""
    provenance: BeachProvenance = BeachProvenance.DEMONSTRATION


class RegionalResourceRecord(BaseModel):
    """
    Configured emergency rescue asset tracked across coastal stations.
    Cross-beach assignments are strictly advisory.
    """
    resource_id: str
    resource_name: str
    resource_type: str                           # "RESCUE_BOAT", "LIFEGUARD", "DRONE"
    home_beach_id: str
    assigned_beach_id: str
    operational_status: str                      # "AVAILABLE", "DISPATCHED", "ON_SCENE", "MAINTENANCE", "OFFLINE"
    active_incident_id: Optional[str] = None
    last_updated: float = Field(default_factory=time.time)
    provenance: BeachProvenance = BeachProvenance.SIMULATED
    speed_mps: float = 0.0
    is_cross_beach_eligible: bool = False
    advisory_transit_note: Optional[str] = None


class RegionalSummaryKPIs(BaseModel):
    """
    Regional operational indicators derived strictly from registered beach records.
    Never assumes safety when telemetry is absent.
    """
    total_configured_sites: int
    fresh_data_sites_count: int
    stale_or_missing_sites_count: int
    offline_sites_count: int
    active_incidents_count: int
    total_fleet_resources: int
    available_fleet_resources: int
    assigned_fleet_resources: int
    timestamp: float = Field(default_factory=time.time)
