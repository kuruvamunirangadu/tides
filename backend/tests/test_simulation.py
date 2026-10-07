"""
End-to-End Simulation integration tests.
"""

from app.simulation.simulator import BeachSimulator
from app.models.beach import FlagStatus


def test_simulation_normal_scenario():
    sim = BeachSimulator(seed=42)
    sim.load_scenario("normal")
    assert sim.current_scenario_id == "normal"
    
    # Run 10 ticks
    for _ in range(10):
        state = sim.step(dt=1.0)
    
    assert state.tick == 10
    assert state.sim_time_seconds == 10.0
    assert len(state.visitors) > 0
    assert state.metrics.detection_accuracy_pct > 90.0


def test_simulation_rip_current_formation_scenario():
    sim = BeachSimulator(seed=42)
    sim.load_scenario("rip_current_formation")
    
    # Initial rip speed is low
    assert sim.env_sim.state.rip_current_speed_mps <= 0.25
    
    # Advance 40 simulation seconds so progressive ramp triggers
    for _ in range(40):
        state = sim.step(dt=1.0)

    # Rip current speed should have ramped up
    assert state.environment.rip_current_speed_mps > 0.40
    # Zone B flag should be updated to RED or have active rip hazard
    zone_b_hazards = [h for h in state.hazards if "ZONE_B" in h.affected_zones]
    assert len(zone_b_hazards) >= 1
