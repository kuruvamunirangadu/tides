"""
backend/app/api/calibration.py
FastAPI Router for TIDES Milestone 8:
Digital Twin Calibration, Real-Time Data & Field Validation.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.calibration.types import (
    DataProvenance,
    QualityStatus,
    EnvironmentalVariableType,
    EnvironmentalObservation,
    GeoCoordinate,
    LocalCoordinate,
    CalibrationExperiment,
    DatasetManifest,
)
from app.calibration.environmental_provider import (
    EnvironmentalSourceRegistry,
    EnvironmentalDataValidator,
)
from app.calibration.geo_calibration import GeographicCalibrationEngine
from app.calibration.experiment_framework import CalibrationExperimentEngine

router = APIRouter(prefix="/calibration", tags=["Digital Twin Calibration & Validation"])

# Global Singletons for calibration registry & experiment engine
registry = EnvironmentalSourceRegistry()
experiment_engine = CalibrationExperimentEngine()


class TransformRequestWGS84(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    altitude_m: Optional[float] = 0.0


class TransformRequestLocal(BaseModel):
    x: float
    y: float
    z: Optional[float] = 0.0


class RunExperimentRequest(BaseModel):
    experiment_id: str
    candidate_parameters: Dict[str, float]
    manifest_id: Optional[str] = "DS-RUSHIKONDA-2026-CAL"


class ApplyExperimentRequest(BaseModel):
    operator_id: str = "TIDES-COMMAND-OPERATOR"


@router.get("/sources")
def get_registered_sources():
    """Lists all registered physical sensors, forecast providers, and synthetic fixtures."""
    return registry.get_sources()


@router.get("/observations/latest", response_model=List[EnvironmentalObservation])
def get_latest_observations():
    """Returns latest validated observations across all monitored variables."""
    return registry.get_latest_observations()


@router.post("/observations/ingest", response_model=EnvironmentalObservation)
def ingest_observation(payload: Dict[str, Any]):
    """
    Ingests and validates an environmental observation.
    Enforces physical limits, unit normalization, duplicate suppression, and timestamp checks.
    """
    return registry.ingest_observation(payload)


@router.get("/geo/benchmarks")
def get_geographic_benchmarks():
    """
    Returns surveyed physical ground-truth benchmarks for Rushikonda Beach
    and the overall residual RMSE calibration error in meters.
    """
    benchmarks = GeographicCalibrationEngine.get_benchmarks()
    residual_rmse = GeographicCalibrationEngine.calculate_benchmark_residual_rmse()
    return {
        "beach": "Rushikonda Beach, Visakhapatnam",
        "origin": {
            "latitude": GeographicCalibrationEngine.ORIGIN_LAT,
            "longitude": GeographicCalibrationEngine.ORIGIN_LON,
            "heading_deg": GeographicCalibrationEngine.BEACH_HEADING_DEG,
        },
        "bounds": GeographicCalibrationEngine.BOUNDS,
        "residual_rmse_m": residual_rmse,
        "benchmarks": benchmarks,
    }


@router.post("/geo/transform/wgs84-to-local")
def transform_wgs84_to_local(req: TransformRequestWGS84):
    """Transforms WGS84 Geodetic point to 2D simulation canvas and 3D scene coordinates."""
    coord = GeoCoordinate(latitude=req.latitude, longitude=req.longitude, altitude_m=req.altitude_m)
    local, in_bounds, uncertainty_m = GeographicCalibrationEngine.wgs84_to_simulation(coord)
    x3d, y3d, z3d = GeographicCalibrationEngine.simulation_to_scene3d(local)
    return {
        "input_wgs84": coord,
        "local_simulation": local,
        "scene_3d": {"x": x3d, "y": y3d, "z": z3d},
        "is_calibrated": in_bounds,
        "estimated_uncertainty_m": uncertainty_m,
    }


@router.post("/geo/transform/local-to-wgs84")
def transform_local_to_wgs84(req: TransformRequestLocal):
    """Transforms 2D simulation coordinates back to WGS84 Geodetic coordinates."""
    local = LocalCoordinate(x=req.x, y=req.y, z=req.z)
    geo, in_bounds, uncertainty_m = GeographicCalibrationEngine.simulation_to_wgs84(local)
    return {
        "input_local": local,
        "output_wgs84": geo,
        "is_calibrated": in_bounds,
        "estimated_uncertainty_m": uncertainty_m,
    }


@router.get("/manifests", response_model=List[DatasetManifest])
def get_dataset_manifests():
    """Returns metadata provenance manifests for calibration and independent evaluation holdouts."""
    return experiment_engine.get_manifests()


@router.get("/baseline-config")
def get_baseline_config():
    """Returns current baseline simulation parameters."""
    return experiment_engine.get_baseline_config()


@router.post("/experiments/run", response_model=CalibrationExperiment)
def run_calibration_experiment(req: RunExperimentRequest):
    """
    Executes a controlled parameter calibration experiment.
    Evaluates MAE, RMSE, and bias across both calibration split and independent holdout split.
    Preserves baseline configuration.
    """
    return experiment_engine.run_calibration_experiment(
        experiment_id=req.experiment_id,
        candidate_params=req.candidate_parameters,
        manifest_id=req.manifest_id,
    )


@router.get("/experiments", response_model=List[CalibrationExperiment])
def get_experiments():
    """Lists all performed calibration experiments and their before/after results."""
    return experiment_engine.get_experiments()


@router.post("/experiments/{experiment_id}/apply")
def apply_experiment(experiment_id: str, req: ApplyExperimentRequest):
    """
    Applies candidate experiment parameters to baseline only upon explicit operator confirmation.
    """
    success, msg = experiment_engine.apply_experiment_parameters(experiment_id, req.operator_id)
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return {"success": True, "message": msg, "baseline": experiment_engine.get_baseline_config()}


@router.get("/simulation-mapping")
def get_simulation_mapping():
    """
    Returns data-to-simulation mapping status.
    Strict read-only inspection mode: live simulation state is never mutated automatically.
    """
    return registry.get_mapped_simulation_state()

