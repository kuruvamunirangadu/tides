"""
Unified snapshot model for simulation tick state.
"""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field

from app.models.environment import EnvironmentalState
from app.models.beach import BeachLayout, BeachZone, Lifeguard, Drone, WarningBoard, PASystem, CameraStation
from app.models.visitor import Visitor
from app.models.incident import Incident
from app.models.response import HazardDetection, ZoneRiskAssessment, Decision, SafetyResponse
from app.models.metrics import EvaluationMetrics


class SimulationState(BaseModel):
    # Simulation Clock & Telemetry
    tick: int = 0
    sim_time_seconds: float = 0.0
    sim_clock_display: str = "08:00:00 AM"
    is_running: bool = False
    is_paused: bool = False
    speed_multiplier: float = 1.0
    scenario_id: str = "normal"
    scenario_name: str = "Normal Beach"
    seed: int = 42

    # Core subsystem states
    environment: EnvironmentalState
    beach: BeachLayout
    visitors: List[Visitor] = Field(default_factory=list)
    
    # Safety Engine outputs
    hazards: List[HazardDetection] = Field(default_factory=list)
    risk_assessments: Dict[str, ZoneRiskAssessment] = Field(default_factory=dict)
    decisions: List[Decision] = Field(default_factory=list)
    responses: List[SafetyResponse] = Field(default_factory=list)
    
    # Incidents & Outcomes
    active_incidents: List[Incident] = Field(default_factory=list)
    recent_incidents: List[Incident] = Field(default_factory=list)
    
    # Operational & Latency Metrics
    metrics: EvaluationMetrics = Field(default_factory=EvaluationMetrics)
    
    # Event and message feed
    recent_events: List[str] = Field(default_factory=list)
    chaos_mode_active: bool = False
