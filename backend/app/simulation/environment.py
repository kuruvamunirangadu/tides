"""
Environmental Simulator
Generates smooth progressive oceanographic dynamics (tides, waves, rip currents, winds, weather).
Supports progressive ramp-ups (e.g., rip current velocity rising from 0.20 m/s -> 0.65 m/s over time)
and sensor fault injections (freezing, packet loss, sensor failure).
"""

import math
import random
from typing import Dict, Optional

from app.models.environment import (
    EnvironmentalState,
    TideDirection,
    WeatherCondition,
    SensorHealth,
    SensorStatus,
)


class EnvironmentSimulator:
    def __init__(self, seed: int = 42):
        self.rng = random.Random(seed)
        self.initial_state = self._build_default_state()
        self.state: EnvironmentalState = self.initial_state.model_copy(deep=True)
        
        # Progressive rate controls
        self.target_rip_speed: Optional[float] = None
        self.rip_ramp_rate: float = 0.005 # m/s per second
        self.target_wave_height: Optional[float] = None
        self.wave_ramp_rate: float = 0.01 # m per second
        self.target_tide_rate: Optional[float] = None
        
        # Fault injection flags
        self.injected_sensor_failures: Dict[str, SensorHealth] = {}

    def _build_default_state(self) -> EnvironmentalState:
        sensors = {
            "wave_sensor_01": SensorStatus(sensor_id="wave_sensor_01", sensor_type="acoustic_wave_gauge"),
            "tide_sensor_01": SensorStatus(sensor_id="tide_sensor_01", sensor_type="radar_tide_gauge"),
            "rip_sensor_01": SensorStatus(sensor_id="rip_sensor_01", sensor_type="adcp_current_profiler"),
            "weather_station_01": SensorStatus(sensor_id="weather_station_01", sensor_type="met_station_anemometer"),
        }
        return EnvironmentalState(
            timestamp=0.0,
            tide_level_m=1.10,
            tide_direction=TideDirection.RISING,
            tide_rate_of_change_m_hr=0.20,
            wave_height_m=0.85,
            wave_period_s=8.0,
            wave_direction_deg=110.0,
            wind_speed_knots=11.5,
            wind_direction_deg=125.0,
            weather=WeatherCondition.CLEAR,
            visibility_m=10000.0,
            current_speed_mps=0.15,
            current_direction_deg=80.0,
            rip_current_speed_mps=0.18,
            rip_current_active=False,
            rip_current_channel_zone="ZONE_B",
            sensor_statuses=sensors,
        )

    def reset(self, seed: Optional[int] = None):
        if seed is not None:
            self.rng = random.Random(seed)
        self.state = self.initial_state.model_copy(deep=True)
        self.target_rip_speed = None
        self.target_wave_height = None
        self.injected_sensor_failures = {}

    def step(self, dt: float = 1.0) -> EnvironmentalState:
        """
        Advances environmental simulation by dt seconds with realistic progressive continuous dynamics.
        """
        self.state.timestamp += dt

        # 1. Progressive Rip Current Evolution
        if self.target_rip_speed is not None:
            if abs(self.state.rip_current_speed_mps - self.target_rip_speed) > 0.01:
                step_amount = self.rip_ramp_rate * dt
                if self.state.rip_current_speed_mps < self.target_rip_speed:
                    self.state.rip_current_speed_mps = min(self.target_rip_speed, self.state.rip_current_speed_mps + step_amount)
                else:
                    self.state.rip_current_speed_mps = max(self.target_rip_speed, self.state.rip_current_speed_mps - step_amount)
            else:
                self.state.rip_current_speed_mps = self.target_rip_speed
            
            self.state.rip_current_active = self.state.rip_current_speed_mps >= 0.35
        else:
            # Mild natural turbulence variation
            jitter = (self.rng.random() - 0.5) * 0.004 * dt
            self.state.rip_current_speed_mps = max(0.10, self.state.rip_current_speed_mps + jitter)

        # 2. Progressive Wave Height Evolution
        if self.target_wave_height is not None:
            if abs(self.state.wave_height_m - self.target_wave_height) > 0.02:
                w_step = self.wave_ramp_rate * dt
                if self.state.wave_height_m < self.target_wave_height:
                    self.state.wave_height_m = min(self.target_wave_height, self.state.wave_height_m + w_step)
                else:
                    self.state.wave_height_m = max(self.target_wave_height, self.state.wave_height_m - w_step)
            else:
                self.state.wave_height_m = self.target_wave_height
        else:
            wave_jitter = (self.rng.random() - 0.5) * 0.01 * dt
            self.state.wave_height_m = max(0.4, self.state.wave_height_m + wave_jitter)

        # 3. Tide Progression (meters per hour -> meters per second)
        tide_rate_mps = (self.state.tide_rate_of_change_m_hr / 3600.0) * dt
        if self.state.tide_direction == TideDirection.RISING:
            self.state.tide_level_m += tide_rate_mps
            if self.state.tide_level_m >= 2.4:
                self.state.tide_direction = TideDirection.SLACK
        elif self.state.tide_direction == TideDirection.FALLING:
            self.state.tide_level_m -= tide_rate_mps
            if self.state.tide_level_m <= 0.4:
                self.state.tide_direction = TideDirection.SLACK

        # 4. Apply Injected Sensor Faults
        for sid, status in self.injected_sensor_failures.items():
            if sid in self.state.sensor_statuses:
                self.state.sensor_statuses[sid].status = status
                if status == SensorHealth.FAILED:
                    self.state.sensor_statuses[sid].confidence = 0.0
                    self.state.sensor_statuses[sid].error_message = "Signal Loss / Timeout"
                elif status == SensorHealth.DEGRADED:
                    self.state.sensor_statuses[sid].confidence = 0.5
                    self.state.sensor_statuses[sid].error_message = "High Measurement Noise"

        return self.state

    def set_target_rip_current(self, target_mps: float, ramp_seconds: float = 30.0):
        self.target_rip_speed = target_mps
        current = self.state.rip_current_speed_mps
        self.rip_ramp_rate = abs(target_mps - current) / max(1.0, ramp_seconds)

    def set_target_waves(self, target_height_m: float, ramp_seconds: float = 40.0):
        self.target_wave_height = target_height_m
        current = self.state.wave_height_m
        self.wave_ramp_rate = abs(target_height_m - current) / max(1.0, ramp_seconds)

    def inject_sensor_fault(self, sensor_id: str, fault_type: SensorHealth):
        self.injected_sensor_failures[sensor_id] = fault_type
