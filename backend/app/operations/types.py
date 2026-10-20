"""
backend/app/operations/types.py
Data structures and Pydantic models for TIDES Milestone 11:
Operational Readiness, Field-Pilot Mode & Evidence-Based Evaluation.
"""

from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
import time


class OperatingMode(str, Enum):
    """Operational mode controlling system safeguards and readiness criteria."""
    DEVELOPMENT = "DEVELOPMENT"          # Local engineering & feature debugging
    DEMONSTRATION = "DEMONSTRATION"      # Repeatable synthetic scenarios with simulated data
    CONTROLLED_PILOT = "CONTROLLED_PILOT"# Supervised on-site beach safety pilot (Rushikonda)


class ReadinessStatus(str, Enum):
    """Operational readiness verdict."""
    READY = "READY"                      # All mandatory prerequisites validated
    DEGRADED = "DEGRADED"                # Non-critical sensors or secondary telemetry impaired
    BLOCKED = "BLOCKED"                  # Critical safety dependency missing or failed
    UNKNOWN = "UNKNOWN"                  # Prerequisite evidence unavailable or unmonitored


class DataProvenance(str, Enum):
    """Rigorous scientific data provenance taxonomy."""
    SIMULATION = "SIMULATION"            # Generated entirely by synthetic simulator
    CONTROLLED_TEST = "CONTROLLED_TEST"  # Repeatable automated test execution with assertions
    FIELD_OBSERVATION = "FIELD_OBSERVATION" # Real sensor or camera reading from physical beach
    FIELD_VALIDATED = "FIELD_VALIDATED"  # Documented correlation with lifeguard log/ground truth


class ReadinessCheckItem(BaseModel):
    """Specific operational health check item."""
    check_id: str
    name: str
    category: str                        # "SYSTEM", "TELEMETRY", "SENSORS", "INCIDENTS", "FLEET", "SCENARIOS", "PILOT_SAFEGUARDS"
    status: ReadinessStatus
    message: str
    evidence: str
    failure_reason: Optional[str] = None
    is_mandatory: bool = True
    last_checked_at: float = Field(default_factory=time.time)


class ScenarioAssertionResult(BaseModel):
    """Individual assertion outcome within a scenario run."""
    assertion_id: str
    description: str
    expected: str
    actual: str
    passed: bool
    notes: Optional[str] = None


class ScenarioRunRecord(BaseModel):
    """Recorded result of a repeatable safety test scenario execution."""
    run_id: str
    scenario_id: str
    scenario_name: str
    scenario_version: str
    status: str                          # "PASSED", "FAILED", "BLOCKED", "INCONCLUSIVE"
    duration_ms: float
    started_at: float
    completed_at: float
    assertions: List[ScenarioAssertionResult] = Field(default_factory=list)
    evidence_collected: Dict[str, Any] = Field(default_factory=dict)
    failure_explanation: Optional[str] = None
    provenance: DataProvenance = DataProvenance.CONTROLLED_TEST


class EvaluationMetricRecord(BaseModel):
    """Standardized latency, accuracy, or compliance metric derived from event logs."""
    metric_id: str
    name: str
    category: str                        # "LATENCY", "ACCURACY", "RELIABILITY", "COMPLIANCE"
    unit: str
    observed_value: Optional[float] = None
    target_threshold: float
    passed: bool
    definition: str
    start_event: str
    end_event: str
    sample_count: int
    provenance: DataProvenance = DataProvenance.CONTROLLED_TEST


class PilotConfiguration(BaseModel):
    """Configuration governing field-pilot operating parameters and safeguards."""
    config_version: str = "1.0.0"
    pilot_site_id: str = "RUSHIKONDA"
    site_name: str = "Rushikonda Blue Flag Beach, Visakhapatnam"
    operating_mode: OperatingMode = OperatingMode.DEMONSTRATION
    enabled_data_sources: List[str] = Field(
        default_factory=lambda: [
            "3D Hydrodynamic Rip Model",
            "Multi-Camera Optical CV Feed",
            "X-Band Radar Wave Spectrum",
            "Inshore Acoustic Buoy Array",
        ]
    )
    sensor_inventory: List[Dict[str, str]] = Field(
        default_factory=lambda: [
            {"id": "CAM-01", "type": "OPTICAL_PTZ", "station": "North Tower"},
            {"id": "CAM-02", "type": "OPTICAL_FIXED", "station": "Central Pavilion"},
            {"id": "CAM-03", "type": "THERMAL_LONG_RANGE", "station": "South Headland"},
            {"id": "BUOY-01", "type": "SONAR_VELOCITY", "station": "Offshore Rip Channel"},
            {"id": "RADAR-01", "type": "X_BAND_SURF", "station": "Command Base"},
        ]
    )
    update_intervals_sec: Dict[str, int] = Field(
        default_factory=lambda: {
            "telemetry": 1,
            "sensor_fusion": 1,
            "forecast": 300,
            "readiness_audit": 10,
        }
    )
    supervisor_role: str = "CHIEF_LIFEGUARD_OPERATOR"
    supervisor_confirmed: bool = True
    data_retention_days: int = 30
    auto_tune_hazards_enabled: bool = False  # Strictly False: manual operator sign-off required
