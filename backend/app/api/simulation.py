"""
Simulation Control and Scenario Management API Endpoints.
"""

from fastapi import APIRouter, HTTPException
from typing import Any, Dict, List, Optional
from pydantic import BaseModel

from app.models.simulation_state import SimulationState
from app.simulation.scenarios import SCENARIOS_CATALOG, ScenarioConfig
from app.simulation.simulator import BeachSimulator

router = APIRouter(prefix="/simulation", tags=["Simulation"])

_simulator_instance: BeachSimulator = None


def set_simulator_instance(sim: BeachSimulator):
    global _simulator_instance
    _simulator_instance = sim


def get_simulator() -> BeachSimulator:
    return _simulator_instance


class ControlRequest(BaseModel):
    action: str # "start", "pause", "resume", "reset", "step"


class SpeedRequest(BaseModel):
    speed: float # 0.5, 1.0, 2.0, 5.0, 10.0


class LoadScenarioRequest(BaseModel):
    scenario_id: str
    seed: Optional[int] = None


class InjectionRequest(BaseModel):
    type: str # "emergency_distress", "rip_current_spike", "sensor_failure", "squall"
    zone_id: Optional[str] = "ZONE_B"
    value: Optional[float] = None
    sensor_id: Optional[str] = None


@router.get("/state", response_model=SimulationState)
async def get_current_state():
    sim = get_simulator()
    return sim.get_state_snapshot()


@router.get("/scenarios")
async def list_scenarios():
    return [
        {
            "id": s.id,
            "name": s.name,
            "category": s.category,
            "description": s.description,
            "initial_visitor_count": s.initial_visitor_count,
            "duration_s": s.duration_s,
            "events_count": len(s.events)
        }
        for s in SCENARIOS_CATALOG.values()
    ]


@router.post("/control")
async def control_simulation(req: ControlRequest):
    sim = get_simulator()
    action = req.action.lower()

    if action == "start":
        sim.is_running = True
        sim.is_paused = False
    elif action == "pause":
        sim.is_paused = True
    elif action == "resume":
        sim.is_paused = False
    elif action == "reset":
        sim.load_scenario(sim.current_scenario_id)
    elif action == "step":
        sim.step(dt=1.0)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown control action: {action}")

    return {"status": "ok", "action": action, "is_running": sim.is_running, "is_paused": sim.is_paused}


@router.post("/set-speed")
async def set_speed(req: SpeedRequest):
    sim = get_simulator()
    sim.speed_multiplier = max(0.1, min(20.0, req.speed))
    return {"status": "ok", "speed_multiplier": sim.speed_multiplier}


@router.post("/load-scenario")
async def load_scenario(req: LoadScenarioRequest):
    sim = get_simulator()
    if req.scenario_id not in SCENARIOS_CATALOG:
        raise HTTPException(status_code=404, detail=f"Scenario '{req.scenario_id}' not found")
    
    sim.load_scenario(req.scenario_id, seed=req.seed)
    return {"status": "ok", "loaded_scenario": sim.active_scenario.name, "scenario_id": req.scenario_id}


@router.post("/inject")
async def inject_event(req: InjectionRequest):
    sim = get_simulator()
    msg = ""

    if req.type == "emergency_distress":
        msg = sim.inject_emergency(zone_id=req.zone_id or "ZONE_B") or "Distress triggered"
    elif req.type == "rip_current_spike":
        val = req.value or 0.75
        sim.inject_rip_spike(val)
        msg = f"Rip current ramped to {val} m/s"
    elif req.type == "sensor_failure":
        sid = req.sensor_id or "wave_sensor_01"
        sim.inject_sensor_fault(sid)
        msg = f"Sensor {sid} fault injected"
    else:
        raise HTTPException(status_code=400, detail=f"Unknown injection type: {req.type}")

    return {"status": "ok", "message": msg}


@router.get("/recordings")
async def get_history_recordings():
    sim = get_simulator()
    return {
        "scenario_id": sim.current_scenario_id,
        "total_snapshots": len(sim.history_buffer),
        "snapshots": sim.history_buffer[-100:]  # Return last 100 snapshots
    }
