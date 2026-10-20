"""
backend/app/regional/incident_adapter.py
Read-only adapter for multi-beach incident events across Andhra Pradesh coastal sectors.
Deduplicates events, handles out-of-order timestamps, and strictly avoids mutating simulation state.
"""

import time
from typing import Dict, List, Optional
from app.regional.types import (
    RegionalIncidentRecord,
    BeachProvenance,
)


class RegionalIncidentAdapter:
    """
    Consumes and normalizes incidents across configured beach monitoring locations.
    Strictly read-only: Viewing or selecting an incident never triggers dispatch or alters simulation state.
    """

    def __init__(self):
        self._incidents: Dict[str, RegionalIncidentRecord] = {}
        self._initialize_demo_incidents()

    def _initialize_demo_incidents(self) -> None:
        """Seed initial demonstration incidents for demonstration sites."""
        now = time.time()

        # Demonstration incident at RK Beach
        rk_inc = RegionalIncidentRecord(
            incident_id="INC-RK-01",
            site_id="RK_BEACH",
            site_name="Ramakrishna (RK) Beach, Visakhapatnam",
            created_at=now - 2400,
            updated_at=now - 1200,
            severity="HIGH",
            distress_level=0.75,
            status="ON_SCENE",
            acknowledgement_status="ACKNOWLEDGED",
            assigned_resource_id="RK-LG-01",
            assigned_resource_name="RK Lifeguard Tower 01 Squad",
            description="Swimmer caught in longshore tidal drift near Kali Temple sector.",
            provenance=BeachProvenance.DEMONSTRATION,
        )
        self._incidents[rk_inc.incident_id] = rk_inc

        # Demonstration incident 1 at Bheemili Beach
        bheemili_inc1 = RegionalIncidentRecord(
            incident_id="INC-BHM-01",
            site_id="BHEEMILI",
            site_name="Bheemunipatnam (Bheemili) Beach",
            created_at=now - 1800,
            updated_at=now - 900,
            severity="CRITICAL",
            distress_level=0.90,
            status="DISPATCHED",
            acknowledgement_status="ACKNOWLEDGED",
            assigned_resource_id="BHM-RB-01",
            assigned_resource_name="Bheemili Fast Jet Boat",
            description="Two bathers swept beyond rocky breakwater during high spring tide swell.",
            provenance=BeachProvenance.DEMONSTRATION,
        )
        self._incidents[bheemili_inc1.incident_id] = bheemili_inc1

        # Demonstration incident 2 at Bheemili Beach
        bheemili_inc2 = RegionalIncidentRecord(
            incident_id="INC-BHM-02",
            site_id="BHEEMILI",
            site_name="Bheemunipatnam (Bheemili) Beach",
            created_at=now - 600,
            updated_at=now - 150,
            severity="MODERATE",
            distress_level=0.55,
            status="REPORTED",
            acknowledgement_status="PENDING",
            assigned_resource_id=None,
            assigned_resource_name=None,
            description="Distressed child in knee-deep surge near river mouth channel.",
            provenance=BeachProvenance.DEMONSTRATION,
        )
        self._incidents[bheemili_inc2.incident_id] = bheemili_inc2

    def sync_rushikonda_incidents(self, sim_instance=None, emergency_coordinator=None) -> None:
        """
        Ingest authoritative incidents from the live Rushikonda simulation without mutating them.
        Deduplicates by stable incident_id and preserves original event timestamps.
        """
        if sim_instance is None and emergency_coordinator is None:
            return

        now = time.time()

        # Ingest from BeachSimulator active_incidents if available
        if sim_instance is not None:
            active_sim_incidents = getattr(sim_instance, "active_incidents", [])
            for inc in active_sim_incidents:
                inc_id = getattr(inc, "id", None) or getattr(inc, "incident_id", None)
                if not inc_id:
                    continue

                existing = self._incidents.get(inc_id)
                created_at = existing.created_at if existing else now

                self._incidents[inc_id] = RegionalIncidentRecord(
                    incident_id=inc_id,
                    site_id="RUSHIKONDA",
                    site_name="Rushikonda Blue Flag Beach, Visakhapatnam",
                    created_at=created_at,
                    updated_at=now,
                    severity=str(getattr(inc, "severity", "CRITICAL")),
                    distress_level=float(getattr(inc, "distress_level", 0.85)),
                    status=str(getattr(inc, "status", "REPORTED")),
                    acknowledgement_status="ACKNOWLEDGED",
                    assigned_resource_id=getattr(inc, "assigned_resource_id", None),
                    assigned_resource_name=getattr(inc, "assigned_resource_name", None),
                    description=f"Active swimmer distress incident at Rushikonda Beach.",
                    provenance=BeachProvenance.SIMULATED,
                )

        # Ingest from EmergencyCoordinator if available
        if emergency_coordinator is not None:
            emerg_incidents = emergency_coordinator.get_incidents()
            for inc in emerg_incidents:
                inc_id = inc.incident_id
                existing = self._incidents.get(inc_id)
                created_at = inc.created_at if inc.created_at else (existing.created_at if existing else now)

                self._incidents[inc_id] = RegionalIncidentRecord(
                    incident_id=inc_id,
                    site_id="RUSHIKONDA",
                    site_name="Rushikonda Blue Flag Beach, Visakhapatnam",
                    created_at=created_at,
                    updated_at=now,
                    severity="CRITICAL" if inc.distress_level >= 0.75 else "HIGH",
                    distress_level=inc.distress_level,
                    status=inc.status.value if hasattr(inc.status, "value") else str(inc.status),
                    acknowledgement_status="ACKNOWLEDGED",
                    assigned_resource_id=inc.assigned_resource_id,
                    assigned_resource_name=inc.assigned_resource_name,
                    description=inc.notes or "Multi-incident emergency record at Rushikonda Beach.",
                    provenance=BeachProvenance.SIMULATED,
                )

    def ingest_incident(self, record: RegionalIncidentRecord) -> bool:
        """
        Add or update an incident record.
        Deduplicates by incident_id and preserves the earliest creation timestamp.
        """
        existing = self._incidents.get(record.incident_id)
        if existing:
            # Preserve earliest creation timestamp
            record.created_at = min(existing.created_at, record.created_at)
        self._incidents[record.incident_id] = record
        return True

    def get_all_incidents(
        self,
        site_id: Optional[str] = None,
        severity: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[RegionalIncidentRecord]:
        """
        Return incidents sorted deterministically by timestamp descending.
        Handles out-of-order and delayed records seamlessly.
        """
        results = list(self._incidents.values())

        if site_id:
            results = [inc for inc in results if inc.site_id.upper() == site_id.upper()]
        if severity:
            results = [inc for inc in results if inc.severity.upper() == severity.upper()]
        if status:
            results = [inc for inc in results if inc.status.upper() == status.upper()]

        # Deterministic sorting: newest updated/created first
        results.sort(key=lambda x: (x.updated_at, x.created_at), reverse=True)
        return results

    def get_incident(self, incident_id: str) -> Optional[RegionalIncidentRecord]:
        """Fetch a specific incident without side effects."""
        return self._incidents.get(incident_id)


# Singleton instance
_incident_adapter_instance: Optional[RegionalIncidentAdapter] = None


def get_incident_adapter() -> RegionalIncidentAdapter:
    global _incident_adapter_instance
    if _incident_adapter_instance is None:
        _incident_adapter_instance = RegionalIncidentAdapter()
    return _incident_adapter_instance
