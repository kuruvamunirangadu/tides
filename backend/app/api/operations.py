"""
backend/app/api/operations.py
FastAPI router for TIDES Milestone 11:
Operational Readiness, Field-Pilot Mode & Evidence-Based Evaluation.
"""

from fastapi import APIRouter, HTTPException, Query, Response
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

from app.operations.types import (
    OperatingMode,
    ScenarioRunRecord,
    EvaluationMetricRecord,
)
from app.operations.readiness_service import get_readiness_service
from app.operations.scenario_evaluator import get_scenario_evaluator
from app.operations.report_generator import get_report_generator

router = APIRouter(prefix="/operations", tags=["Operational Readiness & Evaluation"])


class SetModeRequest(BaseModel):
    mode: OperatingMode


class RunScenarioRequest(BaseModel):
    scenario_id: Optional[str] = None


@router.get("/readiness")
async def get_operational_readiness():
    """Retrieve operational readiness checks, evidence, and overall verdict."""
    service = get_readiness_service()
    return service.get_overall_readiness()


@router.post("/mode")
async def set_operating_mode(request: SetModeRequest):
    """Switch operating mode (DEVELOPMENT, DEMONSTRATION, CONTROLLED_PILOT)."""
    service = get_readiness_service()
    service.set_operating_mode(request.mode)
    return service.get_overall_readiness()


@router.get("/scenarios")
async def get_scenario_catalog():
    """List 10 predefined safety test scenarios."""
    evaluator = get_scenario_evaluator()
    return evaluator.get_catalog()


@router.post("/scenarios/run")
async def run_safety_scenarios(request: RunScenarioRequest):
    """Run a specific scenario or execute all 10 repeatable test scenarios."""
    evaluator = get_scenario_evaluator()
    if request.scenario_id:
        result = evaluator.execute_scenario(request.scenario_id)
        return [result]
    else:
        return evaluator.run_all_scenarios()


@router.get("/metrics", response_model=List[EvaluationMetricRecord])
async def get_evaluation_metrics():
    """Retrieve verified detection, alert, and dispatch latency metrics."""
    evaluator = get_scenario_evaluator()
    return evaluator.get_evaluation_metrics()


@router.get("/report/json")
async def get_json_evidence_report():
    """Export complete evidence and audit report as structured JSON."""
    generator = get_report_generator()
    return generator.generate_json_report()


@router.get("/report/markdown")
async def get_markdown_evidence_report():
    """Export human-readable Markdown summary report."""
    generator = get_report_generator()
    md_content = generator.generate_markdown_summary()
    return Response(content=md_content, media_type="text/markdown")
