"""
Automated unit tests for Hazard Detection Engine.
"""

from app.models.environment import EnvironmentalState, TideDirection, WeatherCondition, SensorHealth, SensorStatus
from app.models.response import HazardSeverity
from app.safety.hazard_engine import HazardEngine


def test_wave_hazard_detection():
    engine = HazardEngine()
    
    # Safe wave state (0.7m)
    safe_env = EnvironmentalState(wave_height_m=0.7, wave_period_s=7.0)
    hazards = engine.evaluate(safe_env)
    assert not any(h.hazard_type == "HIGH_SURF_ENERGY" for h in hazards)
    
    # Dangerous wave state (2.2m)
    dangerous_env = EnvironmentalState(wave_height_m=2.2, wave_period_s=11.0)
    hazards = engine.evaluate(dangerous_env)
    wave_haz = next((h for h in hazards if h.hazard_type == "HIGH_SURF_ENERGY"), None)
    assert wave_haz is not None
    assert wave_haz.severity == HazardSeverity.HIGH


def test_rip_current_hazard_progression():
    engine = HazardEngine()
    
    # Low rip speed (0.15 m/s) -> No hazard
    env_low = EnvironmentalState(rip_current_speed_mps=0.15)
    assert not any(h.hazard_type == "RIP_CURRENT_FORMATION" for h in engine.evaluate(env_low))

    # Moderate rip speed (0.45 m/s) -> Moderate hazard
    env_mod = EnvironmentalState(rip_current_speed_mps=0.45, rip_current_channel_zone="ZONE_B")
    haz_mod = next(h for h in engine.evaluate(env_mod) if h.hazard_type == "RIP_CURRENT_FORMATION")
    assert haz_mod.severity == HazardSeverity.MODERATE
    assert "ZONE_B" in haz_mod.affected_zones

    # Dangerous rip speed (0.70 m/s) -> High hazard
    env_high = EnvironmentalState(rip_current_speed_mps=0.70)
    haz_high = next(h for h in engine.evaluate(env_high) if h.hazard_type == "RIP_CURRENT_FORMATION")
    assert haz_high.severity == HazardSeverity.HIGH


def test_sensor_fault_detection():
    engine = HazardEngine()
    env = EnvironmentalState(
        sensor_statuses={
            "rip_sensor_01": SensorStatus(
                sensor_id="rip_sensor_01",
                sensor_type="adcp",
                status=SensorHealth.FAILED,
                confidence=0.0
            )
        }
    )
    hazards = engine.evaluate(env)
    sensor_haz = next((h for h in hazards if h.hazard_type == "SENSOR_TELEMETRY_ANOMALY"), None)
    assert sensor_haz is not None
    assert "rip_sensor_01" in sensor_haz.reason
