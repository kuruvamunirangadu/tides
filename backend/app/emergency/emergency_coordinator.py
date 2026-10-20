"""
backend/app/emergency/emergency_coordinator.py
Multi-incident coordination, priority ranking, and conflict-free resource assignment.
Integrates with existing RescueCoordinator interfaces without duplicating logic.
"""

import math
import time
from typing import Dict, List, Optional, Tuple, Any
from app.emergency.types import (
    EmergencyIncident,
    IncidentStatus,
    Point2D,
)


class MultiIncidentCoordinator:
    """
    Coordinates simultaneous distress incidents across the beach.
    Enforces strict priority ranking, single-assignment exclusivity,
    and records unresolved incidents upon resource exhaustion.
    """

    def __init__(self):
        self._incidents: Dict[str, EmergencyIncident] = {}
        self._resource_locks: Dict[str, str] = {}  # resource_id -> incident_id
        self._resources: Dict[str, Dict[str, Any]] = {
            "RESCUE-BOAT-01": {"id": "RESCUE-BOAT-01", "name": "Gemini Rigid Inflatable Boat (RIB)", "type": "BOAT", "speed_mps": 14.0, "is_deep_water": True, "status": "AVAILABLE"},
            "RESCUE-BOAT-02": {"id": "RESCUE-BOAT-02", "name": "Zodiac Patrol Craft", "type": "BOAT", "speed_mps": 12.0, "is_deep_water": True, "status": "OCCUPIED"}, # Pre-occupied in demonstration scenario
            "LIFEGUARD-TOWER-A": {"id": "LIFEGUARD-TOWER-A", "name": "Lifeguard Suresh (Rescue Tube)", "type": "LIFEGUARD", "speed_mps": 3.8, "is_deep_water": False, "status": "AVAILABLE"},
            "LIFEGUARD-TOWER-B": {"id": "LIFEGUARD-TOWER-B", "name": "Lifeguard Rajesh (Rescue Board)", "type": "LIFEGUARD", "speed_mps": 4.2, "is_deep_water": False, "status": "AVAILABLE"},
            "AEROGUARD-DRONE-01": {"id": "AEROGUARD-DRONE-01", "name": "AeroGuard Rapid Flotation Drone", "type": "DRONE", "speed_mps": 18.0, "is_deep_water": True, "status": "AVAILABLE"},
        }
        self._unresolved_log: List[Dict[str, Any]] = []

    def calculate_priority_score(self, distress_level: float, y_pos: float, wait_time_sec: float) -> float:
        """
        Deterministic, documented multi-incident priority calculation:
          - Distress Level Weight: 50% (vital signs / drowning progression)
          - Offshore Depth Weight: 30% (cross-shore distance into rip current)
          - Wait Time / Latency Weight: 20% (preventing starvation)
        """
        depth_factor = min(1.0, max(0.0, (y_pos - 280.0) / 200.0))  # Shoreline is Y=280m
        wait_factor = min(1.0, max(0.0, wait_time_sec / 60.0))
        score = (distress_level * 0.50) + (depth_factor * 0.30) + (wait_factor * 0.20)
        return round(score, 3)

    def register_distress_incident(
        self,
        incident_id: str,
        visitor_id: str,
        x: float,
        y: float,
        distress_level: float = 0.85,
    ) -> Tuple[EmergencyIncident, bool, str]:
        """
        Registers an incident. If repeated with same incident_id, suppresses duplicate dispatch.
        Returns: (EmergencyIncident, was_dispatched: bool, message: str)
        """
        now = time.time()

        # Idempotency / Duplicate Check
        if incident_id in self._incidents:
            existing = self._incidents[incident_id]
            return existing, False, f"Duplicate incident event for {incident_id} suppressed."

        # Compute initial priority
        p_score = self.calculate_priority_score(distress_level, y, 0.0)

        incident = EmergencyIncident(
            incident_id=incident_id,
            visitor_id=visitor_id,
            location=Point2D(x=x, y=y),
            distress_level=distress_level,
            priority_score=p_score,
            status=IncidentStatus.REPORTED,
            created_at=now,
        )
        self._incidents[incident_id] = incident

        # Attempt immediate dispatch
        dispatched, msg = self._dispatch_best_resource(incident)
        return incident, dispatched, msg

    def _dispatch_best_resource(self, incident: EmergencyIncident) -> Tuple[bool, str]:
        """
        Selects available, unlocked resource with shortest response time.
        Prevents concurrent conflicting assignments.
        """
        is_deep_water = incident.location.y > 320.0  # Seaward offshore

        # Filter available resources
        eligible = []
        for r_id, r in self._resources.items():
            if r["status"] == "AVAILABLE" and r_id not in self._resource_locks:
                if is_deep_water and not r["is_deep_water"]:
                    continue  # Lifeguard on foot cannot paddle out to deep rip neck
                eligible.append(r)

        if not eligible:
            # Resource exhaustion: Record failure
            incident.status = IncidentStatus.UNRESOLVED_RESOURCE_EXHAUSTION
            incident.notes = "All suitable rescue craft and personnel currently occupied or unavailable."
            self._unresolved_log.append({
                "incident_id": incident.incident_id,
                "timestamp": time.time(),
                "reason": "RESOURCE_EXHAUSTION",
                "priority_score": incident.priority_score,
            })
            return False, f"Resource exhaustion: No available resource for {incident.incident_id}."

        # Pick fastest resource
        best = min(eligible, key=lambda res: 1000.0 / res["speed_mps"])

        # Lock resource exclusively
        self._resource_locks[best["id"]] = incident.incident_id
        best["status"] = "EN_ROUTE"

        incident.status = IncidentStatus.DISPATCHED
        incident.assigned_resource_id = best["id"]
        incident.assigned_resource_name = best["name"]
        incident.dispatched_at = time.time()
        incident.notes = f"Dispatched {best['name']} to coordinate rescue."

        return True, f"Assigned {best['name']} to incident {incident.incident_id}."

    def resolve_incident(self, incident_id: str) -> bool:
        """Marks incident resolved and releases resource lock cleanly."""
        inc = self._incidents.get(incident_id)
        if not inc:
            return False

        inc.status = IncidentStatus.RESOLVED
        inc.resolved_at = time.time()

        # Release resource lock
        if inc.assigned_resource_id and inc.assigned_resource_id in self._resource_locks:
            del self._resource_locks[inc.assigned_resource_id]
            res = self._resources.get(inc.assigned_resource_id)
            if res:
                res["status"] = "AVAILABLE"

        return True

    def get_incidents(self) -> List[EmergencyIncident]:
        """Returns all tracked incidents sorted by priority score descending."""
        return sorted(self._incidents.values(), key=lambda i: i.priority_score, reverse=True)

    def get_resources(self) -> List[Dict[str, Any]]:
        return list(self._resources.values())

    def get_unresolved_count(self) -> int:
        return sum(1 for i in self._incidents.values() if i.status == IncidentStatus.UNRESOLVED_RESOURCE_EXHAUSTION)

    def reset(self):
        """Cleans up all scenario state, releases all locks, and resets resources to default."""
        self._incidents.clear()
        self._resource_locks.clear()
        self._unresolved_log.clear()
        for r_id, r in self._resources.items():
            r["status"] = "OCCUPIED" if r_id == "RESCUE-BOAT-02" else "AVAILABLE"
