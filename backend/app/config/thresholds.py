"""
Threshold configuration for Coastal Safety Simulation Platform.
Note: Configurable parameters for rule-based detection, risk thresholds, and response triggers.
Thresholds can be calibrated with real oceanographic and maritime guidelines (e.g. INCOIS, SLS).
"""

from pydantic import BaseModel, Field


class HazardThresholds(BaseModel):
    # Wave thresholds (meters and seconds)
    wave_height_caution_m: float = Field(default=1.2, description="Wave height triggering caution")
    wave_height_danger_m: float = Field(default=2.0, description="Wave height triggering high danger")
    wave_height_critical_m: float = Field(default=2.8, description="Wave height triggering beach closure")
    wave_period_high_energy_s: float = Field(default=12.0, description="Long period swell indicative of powerful waves")

    # Tide thresholds (meters and rate of change)
    tide_high_danger_m: float = Field(default=1.8, description="High water mark threatening dry beach")
    tide_rate_danger_m_per_hr: float = Field(default=0.6, description="Rapidly rising tide causing sandbar isolation")

    # Rip current thresholds (m/s)
    rip_velocity_caution_mps: float = Field(default=0.25, description="Initial rip current drift")
    rip_velocity_warning_mps: float = Field(default=0.40, description="Moderate rip current dangerous for weak swimmers")
    rip_velocity_danger_mps: float = Field(default=0.60, description="Strong rip current hazardous for all swimmers")
    rip_velocity_critical_mps: float = Field(default=0.90, description="Extreme rip current sweep")

    # Wind & Weather thresholds
    wind_speed_caution_knots: float = Field(default=18.0, description="Strong breeze")
    wind_speed_danger_knots: float = Field(default=28.0, description="Near gale, dangerous surf")
    visibility_minimum_m: float = Field(default=500.0, description="Minimum visibility before drone grounding/patrol alert")


class RiskWeights(BaseModel):
    hazard_weight: float = Field(default=0.55, description="Weight of environmental hazard in total operational risk")
    exposure_weight: float = Field(default=0.35, description="Weight of visitor exposure in total operational risk")
    vulnerability_weight: float = Field(default=0.10, description="Weight of vulnerable swimmers / distress state")

    # Categorical boundary scores (0.0 to 1.0)
    risk_yellow_threshold: float = Field(default=0.30)
    risk_orange_threshold: float = Field(default=0.60)
    risk_red_threshold: float = Field(default=0.80)


class ResponseThresholds(BaseModel):
    drone_dispatch_risk_threshold: float = Field(default=0.60, description="Risk level that automatically triggers drone patrol")
    lifeguard_dispatch_risk_threshold: float = Field(default=0.70, description="Risk level triggering lifeguard repositioning")
    pa_broadcast_cooldown_seconds: float = Field(default=30.0, description="Minimum interval between PA broadcast alerts")
    rescue_dispatch_reaction_delay_s: float = Field(default=3.0, description="Simulated operational reaction time")


class SafetyConfig(BaseModel):
    hazards: HazardThresholds = Field(default_factory=HazardThresholds)
    risk: RiskWeights = Field(default_factory=RiskWeights)
    response: ResponseThresholds = Field(default_factory=ResponseThresholds)


# Global default configuration instance
DEFAULT_SAFETY_CONFIG = SafetyConfig()
