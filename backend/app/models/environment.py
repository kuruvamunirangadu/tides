"""
Environmental models representing oceanographic, atmospheric, and sensor states.
"""

from enum import Enum
from typing import Dict, Optional
from pydantic import BaseModel, Field


class TideDirection(str, Enum):
    RISING = "rising"
    FALLING = "falling"
    SLACK = "slack"


class WeatherCondition(str, Enum):
    CLEAR = "clear"
    PARTLY_CLOUDY = "partly_cloudy"
    OVERCAST = "overcast"
    RAIN = "rain"
    SQUALL = "squall"
    THUNDERSTORM = "thunderstorm"


class SensorHealth(str, Enum):
    OPERATIONAL = "operational"
    DEGRADED = "degraded"
    FAILED = "failed"
    PACKET_LOSS = "packet_loss"


class SensorStatus(BaseModel):
    sensor_id: str
    sensor_type: str
    status: SensorHealth = SensorHealth.OPERATIONAL
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    last_reading_timestamp: float = 0.0
    error_message: Optional[str] = None


class EnvironmentalState(BaseModel):
    timestamp: float = Field(default=0.0, description="Simulation timestamp in seconds")
    
    # Tidal dynamics
    tide_level_m: float = Field(default=1.1, description="Current sea level relative to chart datum in meters")
    tide_direction: TideDirection = TideDirection.RISING
    tide_rate_of_change_m_hr: float = Field(default=0.25, description="Rate of tide rise/fall in meters per hour")
    
    # Wave parameters
    wave_height_m: float = Field(default=0.8, description="Significant wave height Hs in meters")
    wave_period_s: float = Field(default=8.5, description="Peak wave period in seconds")
    wave_direction_deg: float = Field(default=115.0, description="Wave approach direction in degrees")
    
    # Atmospheric / Weather
    wind_speed_knots: float = Field(default=12.0, description="Sustained wind speed in knots")
    wind_direction_deg: float = Field(default=130.0, description="Wind direction in degrees")
    weather: WeatherCondition = WeatherCondition.CLEAR
    visibility_m: float = Field(default=10000.0, description="Horizontal visibility in meters")
    temperature_c: float = Field(default=29.5, description="Air temperature in Celsius")
    water_temperature_c: float = Field(default=27.0, description="Sea surface temperature in Celsius")
    
    # Hydrodynamic Currents
    current_speed_mps: float = Field(default=0.15, description="General alongshore current speed in m/s")
    current_direction_deg: float = Field(default=80.0, description="Current direction in degrees")
    rip_current_speed_mps: float = Field(default=0.18, description="Peak seaward rip current velocity in m/s")
    rip_current_active: bool = Field(default=False, description="Whether active rip neck flow is formed")
    rip_current_channel_zone: str = Field(default="ZONE_B", description="Zone ID where rip current channel is localized")

    # Sensor Diagnostics
    sensor_statuses: Dict[str, SensorStatus] = Field(default_factory=dict)
