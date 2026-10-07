"""
Performance metrics and evaluation statistics API endpoints.
"""

from fastapi import APIRouter
from app.models.metrics import EvaluationMetrics
from app.simulation.simulator import BeachSimulator

router = APIRouter(prefix="/metrics", tags=["Metrics"])

_simulator_instance: BeachSimulator = None


def set_simulator_instance(sim: BeachSimulator):
    global _simulator_instance
    _simulator_instance = sim


def get_simulator() -> BeachSimulator:
    return _simulator_instance


@router.get("/evaluation", response_model=EvaluationMetrics)
async def get_evaluation_metrics():
    sim = get_simulator()
    return sim.get_state_snapshot().metrics
