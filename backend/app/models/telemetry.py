"""
backend/app/models/telemetry.py
Pydantic schemas for oceanographic buoy and coastal sensor telemetry.
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


class BuoyTelemetryReading(BaseModel):
    sensor_id: str = Field(..., description="Unique hardware identifier (e.g., INCOIS-BUOY-VIZAG-01)")
    beach_id: str = Field(..., description="Target beach preset identifier (e.g., AP-VIZ-01)")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    # Wave Characteristics
    significant_wave_height_m: float = Field(..., ge=0.0, le=15.0, description="Significant wave height Hs in meters")
    peak_wave_period_s: float = Field(..., ge=1.0, le=30.0, description="Dominant wave period Tp in seconds")
    wave_direction_deg: float = Field(default=180.0, ge=0.0, le=360.0, description="Wave approach azimuth")
    
    # Tidal & Water Column
    water_level_m: float = Field(..., description="Tidal water level elevation relative to MSL")
    water_temperature_c: Optional[float] = Field(default=26.5, ge=5.0, le=40.0)
    
    # Surface Meteorology
    wind_speed_knots: float = Field(..., ge=0.0, le=120.0, description="Sustained surface wind velocity")
    wind_gust_knots: Optional[float] = Field(default=0.0, ge=0.0, le=150.0)
    wind_direction_deg: float = Field(default=90.0, ge=0.0, le=360.0)
    
    # Hardware Telemetry Health
    battery_voltage: float = Field(default=12.6, ge=0.0, le=24.0)
    signal_rssi_dbm: float = Field(default=-75.0, ge=-130.0, le=0.0)
    data_quality_flag: Literal["GOOD", "SUSPECT", "FAILED"] = "GOOD"


class TelemetryIngestResponse(BaseModel):
    status: Literal["INGESTED", "FUSED_WITH_WARNING", "REJECTED_QUARANTINED"]
    sensor_id: str
    calculated_rip_risk_index: float
    fallback_mode_active: bool
    message: str

