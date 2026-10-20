"""
backend/app/api/regional.py
FastAPI router for TIDES Milestone 10:
Multi-Beach Command Center & Regional Coastal Monitoring.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel

from app.regional.types import (
    RegionalBeachRecord,
    RegionalRiskObservation,
    RegionalIncidentRecord,
    RegionalResourceRecord,
    RegionalSummaryKPIs,
)
from app.regional.beach_registry import get_beach_registry
from app.regional.risk_aggregator import get_risk_aggregator
from app.regional.incident_adapter import get_incident_adapter
from app.regional.resource_registry import get_resource_registry

router = APIRouter(prefix="/regional", tags=["Regional Operations Command"])


class AdvisoryTransferRequest(BaseModel):
    resource_id: str
    target_beach_id: str


@router.get("/beaches", response_model=List[RegionalBeachRecord])
async def get_regional_beaches(
    status: Optional[str] = Query(None, description="Filter by operational status (ACTIVE, CAUTION, RESTRICTED, etc.)"),
    district: Optional[str] = Query(None, description="Filter by AP district"),
    provenance: Optional[str] = Query(None, description="Filter by provenance (SIMULATED, DEMONSTRATION, LIVE)"),
):
    """List all registered Andhra Pradesh coastal beach monitoring locations."""
    registry = get_beach_registry()
    return registry.get_beaches(status=status, district=district, provenance=provenance)


@router.get("/beaches/{beach_id}", response_model=RegionalBeachRecord)
async def get_regional_beach(beach_id: str):
    """Retrieve full metadata for a specific beach monitoring location."""
    registry = get_beach_registry()
    beach = registry.get_beach(beach_id)
    if not beach:
        raise HTTPException(status_code=404, detail=f"Beach site '{beach_id}' not found in regional registry.")
    return beach


@router.get("/summary", response_model=RegionalSummaryKPIs)
async def get_regional_summary():
    """Derive regional operational indicators across all configured beach stations."""
    registry = get_beach_registry()
    return registry.get_summary_kpis()


@router.get("/risk-comparison", response_model=List[RegionalRiskObservation])
async def get_risk_comparison():
    """Retrieve site-by-site oceanographic and hazard risk comparison across Andhra Pradesh."""
    aggregator = get_risk_aggregator()
    return aggregator.get_all_observations()


@router.get("/risk-comparison/{beach_id}", response_model=RegionalRiskObservation)
async def get_beach_risk_observation(beach_id: str):
    """Retrieve oceanographic observation for a single beach site."""
    aggregator = get_risk_aggregator()
    obs = aggregator.get_observation(beach_id)
    if not obs:
        raise HTTPException(status_code=404, detail=f"Risk observation for '{beach_id}' not found.")
    return obs


@router.get("/incidents", response_model=List[RegionalIncidentRecord])
async def get_regional_incidents(
    site_id: Optional[str] = Query(None, description="Filter by site ID"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    status: Optional[str] = Query(None, description="Filter by response status"),
):
    """Retrieve normalized regional incident feed across all configured beach locations."""
    adapter = get_incident_adapter()
    return adapter.get_all_incidents(site_id=site_id, severity=severity, status=status)


@router.get("/incidents/{incident_id}", response_model=RegionalIncidentRecord)
async def get_regional_incident(incident_id: str):
    """Fetch detail for a specific incident record."""
    adapter = get_incident_adapter()
    inc = adapter.get_incident(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found.")
    return inc


@router.get("/resources", response_model=List[RegionalResourceRecord])
async def get_regional_resources(
    beach_id: Optional[str] = Query(None, description="Filter by home or assigned beach ID"),
    resource_type: Optional[str] = Query(None, description="Filter by asset type (RESCUE_BOAT, LIFEGUARD, DRONE)"),
    operational_status: Optional[str] = Query(None, description="Filter by status (AVAILABLE, DISPATCHED, etc.)"),
):
    """Retrieve fleet inventory across all configured coastal stations."""
    registry = get_resource_registry()
    return registry.get_all_resources(
        beach_id=beach_id,
        resource_type=resource_type,
        operational_status=operational_status,
    )


@router.get("/resources/{resource_id}", response_model=RegionalResourceRecord)
async def get_regional_resource(resource_id: str):
    """Fetch detail for a specific emergency rescue asset."""
    registry = get_resource_registry()
    res = registry.get_resource(resource_id)
    if not res:
        raise HTTPException(status_code=404, detail=f"Resource '{resource_id}' not found.")
    return res


@router.post("/resources/advisory-transfer")
async def evaluate_advisory_transfer(request: AdvisoryTransferRequest):
    """
    Evaluate feasibility of cross-beach asset redeployment.
    Strictly advisory: does NOT execute transfers or modify state.
    """
    registry = get_resource_registry()
    return registry.evaluate_cross_beach_transfer_advisory(
        resource_id=request.resource_id,
        target_beach_id=request.target_beach_id,
    )
