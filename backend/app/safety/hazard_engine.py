"""
Hazard Detection Engine
Evaluates raw environmental and sensor telemetry to detect oceanographic, tidal, and meteorological hazards.
Modular and rule-based, designed to be swapped or augmented with ML models later without changing callers.
"""

from typing import Dict, List, Optional
import uuid

from app.config.thresholds import SafetyConfig, DEFAULT_SAFETY_CONFIG
from app.models.environment import EnvironmentalState, SensorHealth
from app.models.response import HazardDetection, HazardSeverity


class HazardEngine:
    def __init__(self, config: Optional[SafetyConfig] = None):
        self.config = config or DEFAULT_SAFETY_CONFIG

    def evaluate(self, env: EnvironmentalState) -> List[HazardDetection]:
        """
        Processes environmental state and returns list of active hazard detections with confidence and reasoning.
        """
        hazards: List[HazardDetection] = []

        # 1. Evaluate Wave & Swell Energy Hazard
        wave_hazard = self._detect_wave_hazard(env)
        if wave_hazard:
            hazards.append(wave_hazard)

        # 2. Evaluate Rip Current Hazard (Hydrodynamic channel flow)
        rip_hazard = self._detect_rip_current_hazard(env)
        if rip_hazard:
            hazards.append(rip_hazard)

        # 3. Evaluate Tidal Hazard (Rapid surge or incoming cut-off)
        tide_hazard = self._detect_tide_hazard(env)
        if tide_hazard:
            hazards.append(tide_hazard)

        # 4. Evaluate Weather & Atmospheric Squall Hazard
        weather_hazard = self._detect_weather_hazard(env)
        if weather_hazard:
            hazards.append(weather_hazard)

        # 5. Evaluate Sensor Faults & Telemetry Degradation
        sensor_hazard = self._detect_sensor_anomaly_hazard(env)
        if sensor_hazard:
            hazards.append(sensor_hazard)

        return hazards

    def _detect_wave_hazard(self, env: EnvironmentalState) -> Optional[HazardDetection]:
        hs = env.wave_height_m
        tp = env.wave_period_s
        cfg = self.config.hazards

        severity = HazardSeverity.NONE
        reasons = []

        if hs >= cfg.wave_height_critical_m:
            severity = HazardSeverity.CRITICAL
            reasons.append(f"Extreme wave height ({hs:.1f}m >= {cfg.wave_height_critical_m}m)")
        elif hs >= cfg.wave_height_danger_m:
            severity = HazardSeverity.HIGH
            reasons.append(f"Dangerous surf wave height ({hs:.1f}m >= {cfg.wave_height_danger_m}m)")
        elif hs >= cfg.wave_height_caution_m:
            severity = HazardSeverity.MODERATE
            reasons.append(f"Elevated wave height ({hs:.1f}m >= {cfg.wave_height_caution_m}m)")
        elif tp >= cfg.wave_period_high_energy_s and hs >= 0.9:
            severity = HazardSeverity.LOW
            reasons.append(f"Long-period swell energy ({tp:.1f}s) producing powerful shore-break")

        if severity != HazardSeverity.NONE:
            # Confidence decreases if wave sensor is degraded
            sensor = env.sensor_statuses.get("wave_sensor_01")
            confidence = sensor.confidence if sensor and sensor.status != SensorHealth.FAILED else 0.95

            return HazardDetection(
                id=f"HAZ-WAVE-{uuid.uuid4().hex[:6]}",
                hazard_type="HIGH_SURF_ENERGY",
                severity=severity,
                affected_zones=["ZONE_A", "ZONE_B", "ZONE_C", "ZONE_D"],
                confidence=confidence,
                reason="; ".join(reasons),
                detected_at=env.timestamp,
                raw_telemetry={"wave_height_m": hs, "wave_period_s": tp, "direction_deg": env.wave_direction_deg}
            )
        return None

    def _detect_rip_current_hazard(self, env: EnvironmentalState) -> Optional[HazardDetection]:
        rip_speed = env.rip_current_speed_mps
        cfg = self.config.hazards

        severity = HazardSeverity.NONE
        reasons = []

        if rip_speed >= cfg.rip_velocity_critical_mps:
            severity = HazardSeverity.CRITICAL
            reasons.append(f"Extreme rip current velocity ({rip_speed:.2f} m/s) capable of sweeping groups offshore")
        elif rip_speed >= cfg.rip_velocity_danger_mps:
            severity = HazardSeverity.HIGH
            reasons.append(f"Strong channelized rip current ({rip_speed:.2f} m/s) overcoming adult swimmers")
        elif rip_speed >= cfg.rip_velocity_warning_mps:
            severity = HazardSeverity.MODERATE
            reasons.append(f"Moderate rip current flow ({rip_speed:.2f} m/s) hazardous for average bathers")
        elif rip_speed >= cfg.rip_velocity_caution_mps:
            severity = HazardSeverity.LOW
            reasons.append(f"Early rip drift detected ({rip_speed:.2f} m/s) near sandbar breach")

        if severity != HazardSeverity.NONE:
            sensor = env.sensor_statuses.get("rip_sensor_01")
            confidence = sensor.confidence if sensor and sensor.status != SensorHealth.FAILED else 0.92

            return HazardDetection(
                id=f"HAZ-RIP-{uuid.uuid4().hex[:6]}",
                hazard_type="RIP_CURRENT_FORMATION",
                severity=severity,
                affected_zones=[env.rip_current_channel_zone, "ZONE_C"],
                confidence=confidence,
                reason="; ".join(reasons),
                detected_at=env.timestamp,
                raw_telemetry={"rip_speed_mps": rip_speed, "channel_zone": env.rip_current_channel_zone}
            )
        return None

    def _detect_tide_hazard(self, env: EnvironmentalState) -> Optional[HazardDetection]:
        tide_lvl = env.tide_level_m
        tide_rate = env.tide_rate_of_change_m_hr
        cfg = self.config.hazards

        severity = HazardSeverity.NONE
        reasons = []

        if tide_lvl >= cfg.tide_high_danger_m and tide_rate >= cfg.tide_rate_danger_m_per_hr:
            severity = HazardSeverity.HIGH
            reasons.append(f"High spring tide ({tide_lvl:.2f}m) surging rapidly at +{tide_rate:.2f} m/hr")
        elif tide_lvl >= cfg.tide_high_danger_m:
            severity = HazardSeverity.MODERATE
            reasons.append(f"High astronomical tide ({tide_lvl:.2f}m) reducing safe dry beach buffer")
        elif tide_rate >= cfg.tide_rate_danger_m_per_hr and env.tide_direction.value == "rising":
            severity = HazardSeverity.LOW
            reasons.append(f"Rapid incoming tidal influx (+{tide_rate:.2f} m/hr) threatening sandbars")

        if severity != HazardSeverity.NONE:
            return HazardDetection(
                id=f"HAZ-TIDE-{uuid.uuid4().hex[:6]}",
                hazard_type="RAPID_TIDAL_SURGE",
                severity=severity,
                affected_zones=["ZONE_A", "ZONE_B", "ZONE_C"],
                confidence=0.98,
                reason="; ".join(reasons),
                detected_at=env.timestamp,
                raw_telemetry={"tide_level_m": tide_lvl, "tide_rate_m_hr": tide_rate, "direction": env.tide_direction.value}
            )
        return None

    def _detect_weather_hazard(self, env: EnvironmentalState) -> Optional[HazardDetection]:
        wind = env.wind_speed_knots
        vis = env.visibility_m
        weather = env.weather.value
        cfg = self.config.hazards

        severity = HazardSeverity.NONE
        reasons = []

        if weather in ["squall", "thunderstorm"] or wind >= cfg.wind_speed_danger_knots:
            severity = HazardSeverity.CRITICAL if wind >= 35 else HazardSeverity.HIGH
            reasons.append(f"Severe meteorological event ({weather.upper()}) with sustained winds {wind:.1f} knots")
        elif wind >= cfg.wind_speed_caution_knots or vis < cfg.visibility_minimum_m:
            severity = HazardSeverity.MODERATE
            reasons.append(f"Adverse weather conditions: Wind {wind:.1f} kts, Visibility {vis:.0f}m")

        if severity != HazardSeverity.NONE:
            return HazardDetection(
                id=f"HAZ-WX-{uuid.uuid4().hex[:6]}",
                hazard_type="METEOROLOGICAL_SQUALL",
                severity=severity,
                affected_zones=["ZONE_A", "ZONE_B", "ZONE_C", "ZONE_D"],
                confidence=0.96,
                reason="; ".join(reasons),
                detected_at=env.timestamp,
                raw_telemetry={"wind_speed_knots": wind, "visibility_m": vis, "weather": weather}
            )
        return None

    def _detect_sensor_anomaly_hazard(self, env: EnvironmentalState) -> Optional[HazardDetection]:
        failed_sensors = [sid for sid, s in env.sensor_statuses.items() if s.status in [SensorHealth.FAILED, SensorHealth.PACKET_LOSS]]
        if failed_sensors:
            return HazardDetection(
                id=f"HAZ-SENSOR-{uuid.uuid4().hex[:6]}",
                hazard_type="SENSOR_TELEMETRY_ANOMALY",
                severity=HazardSeverity.MODERATE,
                affected_zones=["ZONE_A", "ZONE_B", "ZONE_C", "ZONE_D"],
                confidence=1.0,
                reason=f"Degraded telemetry: sensors offline or packet loss on [{', '.join(failed_sensors)}]",
                detected_at=env.timestamp,
                raw_telemetry={"failed_sensors": failed_sensors}
            )
        return None


def calculate_rip_risk_index(hs: float, tp: float, wind_knots: float) -> float:
    """
    Computes instant hydrodynamic rip risk index (0.0 to 1.0) based on wave height, period, and wind.
    """
    wave_energy_factor = (hs * 0.4) + (tp * 0.03)
    wind_factor = (wind_knots / 40.0) * 0.3
    risk = min(1.0, max(0.0, wave_energy_factor + wind_factor))
    return round(risk, 3)

