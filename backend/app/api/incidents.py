"""
Incidents and emergency events API endpoints.
"""

from fastapi import APIRouter
from typing import List

from app.models.incident import Incident
from app.simulation.simulator import BeachSimulator

router = APIRouter(prefix="/incidents", tags=["Incidents"])

_simulator_instance: BeachSimulator = None


def set_simulator_instance(sim: BeachSimulator):
    global _simulator_instance
    _simulator_instance = sim


def get_simulator() -> BeachSimulator:
    return _simulator_instance


@router.get("/active", response_model=List[Incident])
async def get_active_incidents():
    sim = get_simulator()
    return sim.active_incidents


@router.get("/recent", response_model=List[Incident])
async def get_recent_incidents():
    sim = get_simulator()
    return sim.recent_incidents
