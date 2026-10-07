"""
Event Scheduler
Triggers scheduled scenario events at specific simulation time offsets.
"""

from typing import List, Optional
from app.simulation.scenarios import ScenarioConfig, ScenarioEvent
from app.simulation.environment import EnvironmentSimulator
from app.simulation.visitors import VisitorSimulator
from app.models.environment import SensorHealth, WeatherCondition
from app.models.visitor import Visitor, SwimmingStatus


class EventScheduler:
    def __init__(self):
        self.pending_events: List[ScenarioEvent] = []
        self.fired_events: List[ScenarioEvent] = []

    def load_scenario(self, scenario: ScenarioConfig):
        self.pending_events = sorted(scenario.events, key=lambda e: e.time_offset_s)
        self.fired_events = []

    def step(
        self,
        current_time: float,
        env_sim: EnvironmentSimulator,
        visitor_sim: VisitorSimulator,
        event_logs: List[str]
    ) -> List[str]:
        """
        Checks for any scenario events whose time_offset_s <= current_time and fires them.
        """
        fired_this_step = []

        to_fire = [e for e in self.pending_events if e.time_offset_s <= current_time]
        for event in to_fire:
            self.pending_events.remove(event)
            self.fired_events.append(event)
            
            log_msg = self._execute_event(event, env_sim, visitor_sim)
            if log_msg:
                fired_this_step.append(log_msg)
                event_logs.append(log_msg)

        return fired_this_step

    def _execute_event(
        self,
        event: ScenarioEvent,
        env_sim: EnvironmentSimulator,
        visitor_sim: VisitorSimulator
    ) -> str:
        etype = event.event_type
        p = event.params

        if etype == "SET_RIP_TARGET":
            target = float(p.get("target_mps", 0.60))
            ramp = float(p.get("ramp_s", 30.0))
            env_sim.set_target_rip_current(target, ramp)
            return f"⚡ Scenario Event: Rip current target ramped to {target:.2f} m/s ({event.description})"

        elif etype == "SET_WAVE_TARGET":
            target = float(p.get("target_height_m", 2.0))
            ramp = float(p.get("ramp_s", 40.0))
            env_sim.set_target_waves(target, ramp)
            return f"⚡ Scenario Event: Wave height target ramped to {target:.1f}m ({event.description})"

        elif etype == "SET_TIDE_SURGE":
            rate = float(p.get("tide_rate_m_hr", 1.0))
            env_sim.state.tide_rate_of_change_m_hr = rate
            return f"⚡ Scenario Event: Tidal influx increased to +{rate:.2f} m/hr"

        elif etype == "SET_WEATHER_SQUALL":
            env_sim.state.wind_speed_knots = float(p.get("wind_knots", 35.0))
            env_sim.state.visibility_m = float(p.get("visibility_m", 400.0))
            env_sim.state.weather = WeatherCondition.SQUALL
            return f"⚡ Scenario Event: Squall warning triggered! Winds {env_sim.state.wind_speed_knots:.1f} kts"

        elif etype == "SENSOR_FAULT":
            sid = p.get("sensor_id", "rip_sensor_01")
            fault = SensorHealth(p.get("fault", "failed"))
            env_sim.inject_sensor_fault(sid, fault)
            return f"⚠️ Scenario Event: Sensor {sid} injected fault ({fault.value})"

        elif etype == "INJECT_DISTRESS":
            zone_id = p.get("zone_id", "ZONE_B")
            v = visitor_sim.inject_distress(zone_id=zone_id)
            if v:
                return f"⚠️ Scenario Event: Swimmer {v.id} in {zone_id} entered distress ({event.description})"
            return f"⚠️ Scenario Event: Injected distress in {zone_id}"

        elif etype == "SPAWN_RESTRICTED_INTRUDERS":
            count = int(p.get("count", 2))
            zone_id = p.get("zone_id", "ZONE_D")
            for i in range(count):
                visitor_sim.visitors.append(Visitor(
                    id=f"VIS-INTRUDER-{len(visitor_sim.visitors)+1}",
                    x=860.0 + i * 20.0,
                    y=15.0,
                    swimming_status=SwimmingStatus.WADING,
                    current_zone_id=zone_id,
                ))
            return f"⚠️ Scenario Event: {count} visitors entered restricted zone {zone_id}"

        return f"⚡ Scenario Event triggered: {event.description}"
