"""
backend/app/api/emergency.py
FastAPI Router for TIDES Milestone 9:
Intelligent Emergency Coordination & Evacuation.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.emergency.types import (
    EvacuationZone,
    EvacuationExit,
    EvacuationRoute,
    EmergencyIncident,
    EmergencyRecommendation,
    EmergencyPerformanceMetrics,
)
from app.emergency.emergency_coordinator import MultiIncidentCoordinator
from app.emergency.evacuation_manager import EvacuationManager

router = APIRouter(prefix="/emergency", tags=["Emergency Coordination & Evacuation"])

# Global Singletons
incident_coordinator = MultiIncidentCoordinator()
evacuation_manager = EvacuationManager()


class ReportDistressRequest(BaseModel):
    incident_id: str
    visitor_id: str
    x: float
    y: float
    distress_level: Optional[float] = 0.85


class RouteBlockRequest(BaseModel):
    is_blocked: bool
    reason: Optional[str] = "Obstruction detected"


class EvaluateRulesRequest(BaseModel):
    rip_current_speed_mps: float = 0.65
    affected_visitors_count: int = 12


class ReviewRecommendationRequest(BaseModel):
    approve: bool
    operator_id: str = "TIDES-CHIEF-OPERATOR"


@router.get("/zones", response_model=List[EvacuationZone])
def get_evacuation_zones():
    """Lists dynamic evacuation zones, current states, and reasons."""
    return evacuation_manager.get_zones()


@router.get("/exits", response_model=List[EvacuationExit])
def get_exits():
    """Lists designated exits, clearance capacities, and current queues."""
    return evacuation_manager.get_exits()


@router.get("/routes", response_model=List[EvacuationRoute])
def get_routes():
    """Lists evacuation routes, waypoints, bottlenecks, and blockage states."""
    return evacuation_manager.get_routes()


@router.post("/routes/{route_id}/block")
def block_route(route_id: str, req: RouteBlockRequest):
    """Dynamically sets route blockage status."""
    ok = evacuation_manager.set_route_blocked(route_id, req.is_blocked, req.reason)
    if not ok:
        raise HTTPException(status_code=404, detail=f"Route {route_id} not found.")
    return {"route_id": route_id, "is_blocked": req.is_blocked}


@router.get("/incidents", response_model=List[EmergencyIncident])
def get_incidents():
    """Lists simultaneous incidents sorted by priority score descending."""
    return incident_coordinator.get_incidents()


@router.post("/incidents/report")
def report_distress_incident(req: ReportDistressRequest):
    """
    Registers a distress incident.
    Enforces idempotency (duplicate prevention) and assigns available resources without conflicts.
    """
    incident, dispatched, msg = incident_coordinator.register_distress_incident(
        incident_id=req.incident_id,
        visitor_id=req.visitor_id,
        x=req.x,
        y=req.y,
        distress_level=req.distress_level or 0.85,
    )
    return {"incident": incident, "dispatched": dispatched, "message": msg}


@router.post("/incidents/{incident_id}/resolve")
def resolve_incident(incident_id: str):
    """Marks an incident resolved and cleanly releases assigned resource lock."""
    ok = incident_coordinator.resolve_incident(incident_id)
    if not ok:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found.")
    return {"success": True, "incident_id": incident_id, "status": "RESOLVED"}


@router.get("/recommendations", response_model=List[EmergencyRecommendation])
def get_recommendations():
    """Lists active emergency decision-support recommendations."""
    return evacuation_manager.get_recommendations()


@router.post("/recommendations/evaluate", response_model=List[EmergencyRecommendation])
def evaluate_recommendations(req: EvaluateRulesRequest):
    """
    Evaluates rule-based emergency decision policy considering active incidents,
    rip velocity, and affected crowd density.
    """
    incidents = incident_coordinator.get_incidents()
    active_incidents = [i for i in incidents if i.status.value in ["REPORTED", "DISPATCHED", "UNRESOLVED_RESOURCE_EXHAUSTION"]]
    resources = incident_coordinator.get_resources()
    occupied = sum(1 for r in resources if r["status"] != "AVAILABLE")

    return evacuation_manager.evaluate_emergency_rules(
        active_incidents_count=len(active_incidents),
        rip_current_speed_mps=req.rip_current_speed_mps,
        affected_visitors_count=req.affected_visitors_count,
        occupied_resources_count=occupied,
    )


@router.post("/recommendations/{rec_id}/review")
def review_recommendation(rec_id: str, req: ReviewRecommendationRequest):
    """
    Operator gate: Approves or rejects emergency recommendation.
    Triggers evacuation zone state transitions only on explicit operator confirmation.
    """
    ok, msg = evacuation_manager.review_recommendation(rec_id, req.approve, req.operator_id)
    if not ok:
        raise HTTPException(status_code=404, detail=msg)
    return {"success": True, "message": msg}


@router.get("/metrics", response_model=EmergencyPerformanceMetrics)
def get_performance_metrics():
    """Returns verified emergency performance analytics derived from actual event logs."""
    metrics = evacuation_manager.get_performance_metrics()
    metrics.unresolved_incidents_count = incident_coordinator.get_unresolved_count()
    return metrics


@router.get("/timeline")
def get_timeline():
    """Returns chronological emergency scenario events."""
    return evacuation_manager.get_timeline()


@router.post("/scenario/reset")
def reset_scenario():
    """Resets demonstration scenario without modifying unrelated simulation baseline state."""
    incident_coordinator.reset()
    evacuation_manager.reset()
    return {"success": True, "message": "Emergency coordination scenario reset successfully."}
