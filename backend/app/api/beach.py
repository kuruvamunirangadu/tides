"""
Beach layout, zones, and resources API endpoints.
"""

from fastapi import APIRouter, Depends
from typing import List

from app.models.beach import BeachLayout, BeachZone, Lifeguard, Drone, WarningBoard
from app.simulation.simulator import BeachSimulator

router = APIRouter(prefix="/beach", tags=["Beach"])

# Reference to shared simulator instance will be injected
_simulator_instance: BeachSimulator = None


def set_simulator_instance(sim: BeachSimulator):
    global _simulator_instance
    _simulator_instance = sim


def get_simulator() -> BeachSimulator:
    return _simulator_instance


@router.get("/layout", response_model=BeachLayout)
async def get_beach_layout():
    sim = get_simulator()
    return sim.beach_layout


@router.get("/zones", response_model=List[BeachZone])
async def get_zones():
    sim = get_simulator()
    return sim.beach_layout.zones


@router.get("/lifeguards", response_model=List[Lifeguard])
async def get_lifeguards():
    sim = get_simulator()
    return sim.beach_layout.lifeguards


@router.get("/drones", response_model=List[Drone])
async def get_drones():
    sim = get_simulator()
    return sim.beach_layout.drones


@router.get("/warning-boards", response_model=List[WarningBoard])
async def get_warning_boards():
    sim = get_simulator()
    return sim.beach_layout.warning_boards
