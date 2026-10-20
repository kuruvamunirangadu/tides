"""
backend/app/regional/resource_registry.py
Cross-beach emergency fleet inventory tracking across Andhra Pradesh coastal stations.
Strictly advisory: cross-beach transfers require human authorization and never automatically reassign assets.
"""

import time
from typing import Dict, List, Optional, Any
from app.regional.types import (
    RegionalResourceRecord,
    BeachProvenance,
)


class RegionalResourceRegistry:
    """
    Fleet-wide inventory of coastal safety assets (Lifeguards, Rescue Boats, Drones).
    Tracks operational status, home station, and active assignments across beaches.
    Advisory only: Automated cross-beach dispatches are strictly disabled.
    """

    def __init__(self):
        self._resources: Dict[str, RegionalResourceRecord] = {}
        self._initialize_fleet()

    def _initialize_fleet(self) -> None:
        """Initialize fleet assets across configured beach stations."""
        now = time.time()

        # --- 1. RUSHIKONDA FLEET (Connected Digital Twin) ---
        self._resources["RB-01"] = RegionalResourceRecord(
            resource_id="RB-01",
            resource_name="Rapid Response Rescue Boat (Sea Patrol)",
            resource_type="RESCUE_BOAT",
            home_beach_id="RUSHIKONDA",
            assigned_beach_id="RUSHIKONDA",
            operational_status="AVAILABLE",
            active_incident_id=None,
            last_updated=now,
            provenance=BeachProvenance.SIMULATED,
            speed_mps=18.5,
            is_cross_beach_eligible=True,
            advisory_transit_note="Deep-draft offshore hull capable of coastal transit to RK Beach or Bheemili under calm seas."
        )

        self._resources["RB-02"] = RegionalResourceRecord(
            resource_id="RB-02",
            resource_name="Reserve Rapid Rescue Boat (Zodiac Patrol)",
            resource_type="RESCUE_BOAT",
            home_beach_id="RUSHIKONDA",
            assigned_beach_id="RUSHIKONDA",
            operational_status="AVAILABLE",
            active_incident_id=None,
            last_updated=now,
            provenance=BeachProvenance.SIMULATED,
            speed_mps=16.0,
            is_cross_beach_eligible=False,
            advisory_transit_note="Inshore shallow craft reserved for local Rushikonda bay defense."
        )

        self._resources["LG-01"] = RegionalResourceRecord(
            resource_id="LG-01",
            resource_name="Lifeguard Rescue Squad 01 (West Station)",
            resource_type="LIFEGUARD",
            home_beach_id="RUSHIKONDA",
            assigned_beach_id="RUSHIKONDA",
            operational_status="AVAILABLE",
            active_incident_id=None,
            last_updated=now,
            provenance=BeachProvenance.SIMULATED,
            speed_mps=7.2,
            is_cross_beach_eligible=False,
            advisory_transit_note="Stationary beach patrol tower; non-transferrable overland asset."
        )

        self._resources["LG-02"] = RegionalResourceRecord(
            resource_id="LG-02",
            resource_name="Lifeguard Rescue Squad 02 (Central Station)",
            resource_type="LIFEGUARD",
            home_beach_id="RUSHIKONDA",
            assigned_beach_id="RUSHIKONDA",
            operational_status="AVAILABLE",
            active_incident_id=None,
            last_updated=now,
            provenance=BeachProvenance.SIMULATED,
            speed_mps=7.2,
            is_cross_beach_eligible=False,
            advisory_transit_note="Stationary beach patrol tower; non-transferrable overland asset."
        )

        self._resources["DRONE-01"] = RegionalResourceRecord(
            resource_id="DRONE-01",
            resource_name="Autonomous Lifesaving UAV (Rushikonda Perch)",
            resource_type="DRONE",
            home_beach_id="RUSHIKONDA",
            assigned_beach_id="RUSHIKONDA",
            operational_status="AVAILABLE",
            active_incident_id=None,
            last_updated=now,
            provenance=BeachProvenance.SIMULATED,
            speed_mps=22.0,
            is_cross_beach_eligible=True,
            advisory_transit_note="Max range 15km; cross-beach verification flights require line-of-sight telemetry authorization."
        )

        # --- 2. RK BEACH FLEET (Demonstration Assets) ---
        self._resources["RK-RB-01"] = RegionalResourceRecord(
            resource_id="RK-RB-01",
            resource_name="RK Coastal Jet Boat 01",
            resource_type="RESCUE_BOAT",
            home_beach_id="RK_BEACH",
            assigned_beach_id="RK_BEACH",
            operational_status="AVAILABLE",
            active_incident_id=None,
            last_updated=now - 1800,
            provenance=BeachProvenance.DEMONSTRATION,
            speed_mps=17.0,
            is_cross_beach_eligible=True,
            advisory_transit_note="Transit to Rushikonda: ~12.5 km (Advisory Only)."
        )

        self._resources["RK-LG-01"] = RegionalResourceRecord(
            resource_id="RK-LG-01",
            resource_name="RK Lifeguard Tower 01 Squad",
            resource_type="LIFEGUARD",
            home_beach_id="RK_BEACH",
            assigned_beach_id="RK_BEACH",
            operational_status="DISPATCHED",
            active_incident_id="INC-RK-01",
            last_updated=now - 1200,
            provenance=BeachProvenance.DEMONSTRATION,
            speed_mps=7.0,
            is_cross_beach_eligible=False,
            advisory_transit_note="Stationary tower; actively handling INC-RK-01."
        )

        self._resources["RK-LG-02"] = RegionalResourceRecord(
            resource_id="RK-LG-02",
            resource_name="RK Lifeguard Tower 02 Squad",
            resource_type="LIFEGUARD",
            home_beach_id="RK_BEACH",
            assigned_beach_id="RK_BEACH",
            operational_status="AVAILABLE",
            active_incident_id=None,
            last_updated=now - 2000,
            provenance=BeachProvenance.DEMONSTRATION,
            speed_mps=7.0,
            is_cross_beach_eligible=False,
            advisory_transit_note="Stationary tower."
        )

        self._resources["RK-DRONE-01"] = RegionalResourceRecord(
            resource_id="RK-DRONE-01",
            resource_name="RK Reconnaissance Drone",
            resource_type="DRONE",
            home_beach_id="RK_BEACH",
            assigned_beach_id="RK_BEACH",
            operational_status="AVAILABLE",
            active_incident_id=None,
            last_updated=now - 1500,
            provenance=BeachProvenance.DEMONSTRATION,
            speed_mps=20.0,
            is_cross_beach_eligible=True,
            advisory_transit_note="Demonstration aerial asset."
        )

        # --- 3. BHEEMILI FLEET (Demonstration Assets) ---
        self._resources["BHM-RB-01"] = RegionalResourceRecord(
            resource_id="BHM-RB-01",
            resource_name="Bheemili Fast Jet Boat",
            resource_type="RESCUE_BOAT",
            home_beach_id="BHEEMILI",
            assigned_beach_id="BHEEMILI",
            operational_status="DISPATCHED",
            active_incident_id="INC-BHM-01",
            last_updated=now - 900,
            provenance=BeachProvenance.DEMONSTRATION,
            speed_mps=19.0,
            is_cross_beach_eligible=True,
            advisory_transit_note="Dispatched to rocky breakwater incident INC-BHM-01."
        )

        self._resources["BHM-LG-01"] = RegionalResourceRecord(
            resource_id="BHM-LG-01",
            resource_name="Bheemili Estuary Lifeguard Squad",
            resource_type="LIFEGUARD",
            home_beach_id="BHEEMILI",
            assigned_beach_id="BHEEMILI",
            operational_status="AVAILABLE",
            active_incident_id=None,
            last_updated=now - 400,
            provenance=BeachProvenance.DEMONSTRATION,
            speed_mps=6.8,
            is_cross_beach_eligible=False,
            advisory_transit_note="Stationary beach unit."
        )

        # --- 4. SURYALANKA FLEET (Demonstration Assets) ---
        self._resources["SL-LG-01"] = RegionalResourceRecord(
            resource_id="SL-LG-01",
            resource_name="Suryalanka Beach Lifeguard Post 01",
            resource_type="LIFEGUARD",
            home_beach_id="SURYALANKA",
            assigned_beach_id="SURYALANKA",
            operational_status="AVAILABLE",
            active_incident_id=None,
            last_updated=now - 300,
            provenance=BeachProvenance.DEMONSTRATION,
            speed_mps=7.0,
            is_cross_beach_eligible=False,
            advisory_transit_note="Local Bapatla beach squad."
        )

        self._resources["SL-RB-01"] = RegionalResourceRecord(
            resource_id="SL-RB-01",
            resource_name="Suryalanka Inshore Inflatable Craft",
            resource_type="RESCUE_BOAT",
            home_beach_id="SURYALANKA",
            assigned_beach_id="SURYALANKA",
            operational_status="AVAILABLE",
            active_incident_id=None,
            last_updated=now - 300,
            provenance=BeachProvenance.DEMONSTRATION,
            speed_mps=14.0,
            is_cross_beach_eligible=False,
            advisory_transit_note="Local inshore craft only."
        )

    def sync_rushikonda_resources(self, rescue_coordinator=None) -> None:
        """
        Synchronize Rushikonda asset statuses from the authoritative RescueCoordinator
        without mutating or modifying local simulation logic.
        """
        if rescue_coordinator is None:
            return

        now = time.time()
        for res_id in ["RB-01", "RB-02", "LG-01", "LG-02"]:
            rec = self._resources.get(res_id)
            if not rec:
                continue

            rec.last_updated = now
            # If coordinator has locked or dispatched the resource
            if hasattr(rescue_coordinator, "is_resource_locked") and rescue_coordinator.is_resource_locked(res_id):
                rec.operational_status = "DISPATCHED"
                rec.active_incident_id = getattr(rescue_coordinator, "get_locked_incident_id", lambda _: "ACTIVE")(res_id)
            elif hasattr(rescue_coordinator, "activeMission") and rescue_coordinator.activeMission:
                mission = rescue_coordinator.activeMission
                if getattr(mission, "assignedResourceId", None) == res_id:
                    rec.operational_status = "DISPATCHED"
                    rec.active_incident_id = getattr(mission, "incidentId", "ACTIVE-MISSION")
                else:
                    rec.operational_status = "AVAILABLE"
                    rec.active_incident_id = None
            else:
                rec.operational_status = "AVAILABLE"
                rec.active_incident_id = None

    def get_all_resources(
        self,
        beach_id: Optional[str] = None,
        resource_type: Optional[str] = None,
        operational_status: Optional[str] = None,
    ) -> List[RegionalResourceRecord]:
        """Fetch fleet inventory with optional beach, type, and status filtering."""
        results = list(self._resources.values())

        if beach_id:
            results = [r for r in results if r.assigned_beach_id.upper() == beach_id.upper() or r.home_beach_id.upper() == beach_id.upper()]
        if resource_type:
            results = [r for r in results if r.resource_type.upper() == resource_type.upper()]
        if operational_status:
            results = [r for r in results if r.operational_status.upper() == operational_status.upper()]

        return results

    def get_resource(self, resource_id: str) -> Optional[RegionalResourceRecord]:
        """Fetch a specific resource record."""
        return self._resources.get(resource_id.upper())

    def evaluate_cross_beach_transfer_advisory(self, resource_id: str, target_beach_id: str) -> Dict[str, Any]:
        """
        Advisory evaluation of a potential cross-beach resource deployment.
        Strictly informative: DOES NOT execute transfer or modify resource state.
        """
        res = self._resources.get(resource_id.upper())
        if not res:
            return {
                "allowed": False,
                "reason": f"Resource {resource_id} not found in fleet registry.",
                "advisory": "Cannot evaluate transfer for unknown asset."
            }

        if not res.is_cross_beach_eligible:
            return {
                "allowed": False,
                "reason": f"Asset {res.resource_name} ({res.resource_type}) is station-bound and not eligible for inter-beach transit.",
                "advisory": "Use mobile offshore boats or UAV assets for regional support."
            }

        if res.operational_status != "AVAILABLE":
            return {
                "allowed": False,
                "reason": f"Asset {res.resource_name} is currently {res.operational_status} and cannot be redeployed.",
                "advisory": "Await incident resolution or mission release before cross-beach assignment."
            }

        return {
            "allowed": True,
            "resource_id": res.resource_id,
            "home_beach_id": res.home_beach_id,
            "target_beach_id": target_beach_id.upper(),
            "transit_feasible": True,
            "notice": "ADVISORY ONLY: Cross-beach dispatch must be explicitly authorized by regional operations commander. Automated cross-dispatch disabled."
        }


# Singleton instance
_resource_registry_instance: Optional[RegionalResourceRegistry] = None


def get_resource_registry() -> RegionalResourceRegistry:
    global _resource_registry_instance
    if _resource_registry_instance is None:
        _resource_registry_instance = RegionalResourceRegistry()
    return _resource_registry_instance
