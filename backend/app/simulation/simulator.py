"""
Master Coastal Beach Simulator
Integrates Digital Beach physics, visitor kinetics, scheduled scenarios,
and connects directly to the Central Safety Engine pipeline.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional
import collections

from app.config.thresholds import SafetyConfig, DEFAULT_SAFETY_CONFIG
from app.models.beach import BeachLayout
from app.models.incident import Incident
from app.models.response import Decision, HazardDetection, SafetyResponse, ZoneRiskAssessment
from app.models.simulation_state import SimulationState
from app.safety.hazard_engine import HazardEngine
from app.safety.risk_engine import RiskEngine
from app.safety.decision_engine import DecisionEngine
from app.safety.response_engine import ResponseEngine
from app.simulation.beach_layout import create_default_beach_layout
from app.simulation.environment import EnvironmentSimulator
from app.simulation.event_scheduler import EventScheduler
from app.simulation.metrics_engine import MetricsEngine
from app.simulation.scenarios import SCENARIOS_CATALOG, ScenarioConfig
from app.simulation.visitors import VisitorSimulator


class BeachSimulator:
    def __init__(self, seed: int = 42, config: Optional[SafetyConfig] = None):
        self.seed = seed
        self.config = config or DEFAULT_SAFETY_CONFIG
        
        # Subsystems
        self.env_sim = EnvironmentSimulator(seed=seed)
        self.visitor_sim = VisitorSimulator(seed=seed)
        self.beach_layout: BeachLayout = create_default_beach_layout()
        self.scheduler = EventScheduler()
        
        # Central Safety Engine
        self.hazard_engine = HazardEngine(config=self.config)
        self.risk_engine = RiskEngine(config=self.config)
        self.decision_engine = DecisionEngine(config=self.config)
        self.response_engine = ResponseEngine(config=self.config)
        self.metrics_engine = MetricsEngine()

        # Simulation Runtime State
        self.tick: int = 0
        self.sim_time: float = 0.0  # seconds
        self.base_real_time = datetime(2026, 10, 3, 8, 0, 0)
        self.is_running: bool = False
        self.is_paused: bool = False
        self.speed_multiplier: float = 1.0
        self.current_scenario_id: str = "normal"
        self.active_scenario: ScenarioConfig = SCENARIOS_CATALOG["normal"]
        
        # Incident & Event History
        self.active_incidents: List[Incident] = []
        self.recent_incidents: List[Incident] = []
        self.recent_events: collections.deque = collections.deque(maxlen=40)
        
        # Replay & Recording History Buffer (stores last 1000 states)
        self.history_buffer: List[SimulationState] = []
        self.max_history_len: int = 1200

        # Initialize scenario
        self.load_scenario(self.current_scenario_id)

    def load_scenario(self, scenario_id: str, seed: Optional[int] = None):
        if scenario_id not in SCENARIOS_CATALOG:
            scenario_id = "normal"
        
        if seed is not None:
            self.seed = seed

        self.current_scenario_id = scenario_id
        self.active_scenario = SCENARIOS_CATALOG[scenario_id]

        # Reset simulation state
        self.tick = 0
        self.sim_time = 0.0
        self.is_running = True
        self.is_paused = False
        self.history_buffer.clear()
        self.recent_events.clear()
        self.active_incidents.clear()
        self.recent_incidents.clear()

        # Reset Beach & Resources
        self.beach_layout = create_default_beach_layout()
        
        # Reset Environment
        self.env_sim.reset(seed=self.seed)
        for k, v in self.active_scenario.initial_env_overrides.items():
            if hasattr(self.env_sim.state, k):
                setattr(self.env_sim.state, k, v)

        # Reset Visitors
        self.visitor_sim.reset(count=self.active_scenario.initial_visitor_count, seed=self.seed)

        # Load Scenario Events
        self.scheduler.load_scenario(self.active_scenario)

        self.recent_events.append(f"🏖️ Loaded Scenario: {self.active_scenario.name}")
        self.recent_events.append(f"ℹ️ {self.active_scenario.description}")

    def step(self, dt: float = 1.0) -> SimulationState:
        """
        Executes one complete simulation cycle:
        1. Physics / Environment step
        2. Visitor kinetics step
        3. Event schedule check & trigger
        4. Central Safety Engine execution (Hazard -> Risk -> Decision -> Response)
        5. Metrics & latency computation
        6. Snapshot recording
        """
        if self.is_paused:
            return self.get_state_snapshot()

        effective_dt = dt * self.speed_multiplier
        self.sim_time += effective_dt
        self.tick += 1

        # 1. Environment Simulation Step
        env_state = self.env_sim.step(effective_dt)
        env_state.timestamp = self.sim_time

        # 2. Visitor Kinetics & Drift Step
        visitors = self.visitor_sim.step(effective_dt, env_state, self.beach_layout.zones)

        # 3. Scenario Events Step
        new_logs: List[str] = []
        self.scheduler.step(self.sim_time, self.env_sim, self.visitor_sim, new_logs)
        for log in new_logs:
            self.recent_events.append(log)

        # 4. Central Safety Engine Pipeline:
        # A. Hazard Engine
        hazards = self.hazard_engine.evaluate(env_state)
        
        # B. Risk Engine
        risk_assessments = self.risk_engine.assess_risk(
            self.beach_layout.zones, hazards, visitors
        )

        # C. Decision Engine
        decisions = self.decision_engine.make_decisions(
            self.sim_time, hazards, risk_assessments, self.beach_layout, visitors
        )

        # D. Response Engine
        responses, updated_incidents, response_logs = self.response_engine.execute_decisions(
            self.sim_time, decisions, self.beach_layout, visitors, self.active_incidents
        )
        for log in response_logs:
            self.recent_events.append(log)

        # Clean closed incidents
        self.active_incidents = [i for i in self.active_incidents if i.status != "CLOSED"]
        for inc in self.active_incidents:
            if inc not in self.recent_incidents:
                self.recent_incidents.append(inc)

        # 5. Metrics Engine
        metrics = self.metrics_engine.update(
            self.sim_time,
            self.beach_layout,
            visitors,
            hazards,
            decisions,
            responses,
            self.active_incidents,
            self.recent_incidents
        )

        # 6. Assemble State Snapshot
        snapshot = self._build_state_snapshot(
            env_state, visitors, hazards, risk_assessments, decisions, responses, metrics
        )

        # Append to historical buffer for replay
        if len(self.history_buffer) >= self.max_history_len:
            self.history_buffer.pop(0)
        self.history_buffer.append(snapshot)

        return snapshot

    def _build_state_snapshot(
        self,
        env_state,
        visitors,
        hazards,
        risk_assessments,
        decisions,
        responses,
        metrics
    ) -> SimulationState:
        sim_clock = (self.base_real_time + timedelta(seconds=self.sim_time)).strftime("%I:%M:%S %p")

        return SimulationState(
            tick=self.tick,
            sim_time_seconds=round(self.sim_time, 2),
            sim_clock_display=sim_clock,
            is_running=self.is_running,
            is_paused=self.is_paused,
            speed_multiplier=self.speed_multiplier,
            scenario_id=self.current_scenario_id,
            scenario_name=self.active_scenario.name,
            seed=self.seed,
            environment=env_state,
            beach=self.beach_layout,
            visitors=visitors,
            hazards=hazards,
            risk_assessments=risk_assessments,
            decisions=decisions,
            responses=responses,
            active_incidents=self.active_incidents,
            recent_incidents=self.recent_incidents[-10:],
            metrics=metrics,
            recent_events=list(self.recent_events),
            chaos_mode_active=(self.current_scenario_id == "chaos_mode"),
        )

    def get_state_snapshot(self) -> SimulationState:
        hazards = self.hazard_engine.evaluate(self.env_sim.state)
        risk_assessments = self.risk_engine.assess_risk(
            self.beach_layout.zones, hazards, self.visitor_sim.visitors
        )
        decisions = self.decision_engine.make_decisions(
            self.sim_time, hazards, risk_assessments, self.beach_layout, self.visitor_sim.visitors
        )
        metrics = self.metrics_engine.update(
            self.sim_time,
            self.beach_layout,
            self.visitor_sim.visitors,
            hazards,
            decisions,
            [],
            self.active_incidents,
            self.recent_incidents
        )
        return self._build_state_snapshot(
            self.env_sim.state,
            self.visitor_sim.visitors,
            hazards,
            risk_assessments,
            decisions,
            [],
            metrics
        )

    def inject_emergency(self, zone_id: str = "ZONE_B") -> Optional[str]:
        v = self.visitor_sim.inject_distress(zone_id=zone_id)
        if v:
            msg = f"🚨 MANUAL INJECTION: Swimmer {v.id} in {zone_id} placed into active distress"
            self.recent_events.append(msg)
            return msg
        return None

    def inject_rip_spike(self, target_mps: float = 0.75):
        self.env_sim.set_target_rip_current(target_mps, ramp_seconds=15.0)
        msg = f"🌊 MANUAL INJECTION: Rip current surging to {target_mps:.2f} m/s"
        self.recent_events.append(msg)

    def inject_sensor_fault(self, sensor_id: str = "wave_sensor_01"):
        from app.models.environment import SensorHealth
        self.env_sim.inject_sensor_fault(sensor_id, SensorHealth.FAILED)
        msg = f"⚠️ MANUAL INJECTION: Sensor {sensor_id} failed / lost telemetry"
        self.recent_events.append(msg)
