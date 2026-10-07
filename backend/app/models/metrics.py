"""
Simulation Evaluation, Latency, and Operational Performance Metrics.
"""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class EvaluationMetrics(BaseModel):
    # Latencies in seconds
    avg_detection_latency_s: float = 0.0
    avg_decision_latency_s: float = 0.0
    avg_warning_latency_s: float = 0.0
    avg_dispatch_latency_s: float = 0.0
    avg_resolution_time_s: float = 0.0

    # Detection & Decision Quality counts
    true_positives: int = 0
    false_positives: int = 0
    false_negatives: int = 0
    missed_incidents: int = 0
    total_incidents_logged: int = 0
    resolved_incidents_count: int = 0
    
    # Accuracy percentage
    detection_accuracy_pct: float = 100.0
    false_positive_rate_pct: float = 0.0

    # Exposure & Safety Funnel
    total_unique_visitors: int = 0
    people_exposed_to_hazard: int = 0
    people_warned: int = 0
    people_safely_evacuated: int = 0
    people_rescued: int = 0
    people_remaining_in_danger: int = 0

    # Resource Utilization
    lifeguard_utilization_pct: float = 0.0
    drone_utilization_pct: float = 0.0
    warning_board_active_pct: float = 0.0
    sensor_availability_pct: float = 100.0
    system_uptime_pct: float = 100.0

    # Real-time event counts
    active_incidents_count: int = 0
    active_hazards_count: int = 0
    active_warnings_count: int = 0
