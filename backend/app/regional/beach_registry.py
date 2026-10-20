"""
backend/app/regional/beach_registry.py
Independent, typed registry for regional multi-beach monitoring across Andhra Pradesh.
Strictly separates site configuration from local simulation mechanics.
"""

import time
from typing import Dict, List, Optional
from app.regional.types import (
    RegionalBeachRecord,
    BeachOperationalStatus,
    BeachProvenance,
    DataFreshness,
    GeographicCoordinate,
    RegionalSummaryKPIs,
)


class RegionalBeachRegistry:
    """
    Authoritative registry of configured coastal beach monitoring sites in Andhra Pradesh.
    Rushikonda serves as the anchor connected digital twin site.
    All other sites are explicitly marked as demonstration records.
    """

    def __init__(self):
        self._beaches: Dict[str, RegionalBeachRecord] = {}
        self._initialize_registry()

    def _initialize_registry(self) -> None:
        """Initialize verified AP coastal monitoring locations."""
        now = time.time()

        # 1. Primary Connected Site: Rushikonda Blue Flag Beach (Visakhapatnam)
        rushikonda = RegionalBeachRecord(
            beach_id="RUSHIKONDA",
            name="Rushikonda Blue Flag Beach, Visakhapatnam",
            district="Visakhapatnam",
            coast_sector="North AP Coastal Sector",
            location=GeographicCoordinate(latitude=17.7815, longitude=83.3855),
            status=BeachOperationalStatus.ACTIVE,
            provenance=BeachProvenance.SIMULATED,
            data_freshness=DataFreshness.FRESH,
            last_updated=now,
            connected=True,
            has_active_simulator=True,
            active_incidents_count=0,
            active_hazards_count=1,
            available_resources_count=4,
            total_resources_count=4,
            sensor_health_pct=98.5,
            notes="Primary connected digital twin pilot site with 3D environment, multi-sensor telemetry & automated rescue."
        )
        self._beaches["RUSHIKONDA"] = rushikonda

        # 2. Demonstration Site: Ramakrishna (RK) Beach (Visakhapatnam)
        rk_beach = RegionalBeachRecord(
            beach_id="RK_BEACH",
            name="Ramakrishna (RK) Beach, Visakhapatnam",
            district="Visakhapatnam",
            coast_sector="North AP Coastal Sector",
            location=GeographicCoordinate(latitude=17.7125, longitude=83.3180),
            status=BeachOperationalStatus.CAUTION,
            provenance=BeachProvenance.DEMONSTRATION,
            data_freshness=DataFreshness.STALE,
            last_updated=now - 3600,  # 1 hour ago
            connected=False,
            has_active_simulator=False,
            active_incidents_count=1,
            active_hazards_count=2,
            available_resources_count=3,
            total_resources_count=5,
            sensor_health_pct=88.0,
            notes="High bather density urban beach sector with strong longshore currents."
        )
        self._beaches["RK_BEACH"] = rk_beach

        # 3. Demonstration Site: Bheemunipatnam (Bheemili) Beach (Visakhapatnam)
        bheemili = RegionalBeachRecord(
            beach_id="BHEEMILI",
            name="Bheemunipatnam (Bheemili) Beach",
            district="Visakhapatnam",
            coast_sector="North AP Coastal Sector",
            location=GeographicCoordinate(latitude=17.8912, longitude=83.4542),
            status=BeachOperationalStatus.RESTRICTED,
            provenance=BeachProvenance.DEMONSTRATION,
            data_freshness=DataFreshness.FRESH,
            last_updated=now - 120,
            connected=False,
            has_active_simulator=False,
            active_incidents_count=2,
            active_hazards_count=3,
            available_resources_count=1,
            total_resources_count=3,
            sensor_health_pct=76.0,
            notes="River mouth confluence and rocky breakwater sector; rough swell warning."
        )
        self._beaches["BHEEMILI"] = bheemili

        # 4. Demonstration Site: Manginapudi Beach (Machilipatnam, Krishna District)
        manginapudi = RegionalBeachRecord(
            beach_id="MANGINAPUDI",
            name="Manginapudi Beach, Machilipatnam",
            district="Krishna",
            coast_sector="Central AP Coastal Sector",
            location=GeographicCoordinate(latitude=16.2427, longitude=81.2589),
            status=BeachOperationalStatus.OFFLINE,
            provenance=BeachProvenance.DEMONSTRATION,
            data_freshness=DataFreshness.OFFLINE,
            last_updated=now - 172800,  # 48 hours ago
            connected=False,
            has_active_simulator=False,
            active_incidents_count=0,
            active_hazards_count=0,
            available_resources_count=0,
            total_resources_count=2,
            sensor_health_pct=None,
            notes="Remote black-soil beach station; telemetry link offline since 48h."
        )
        self._beaches["MANGINAPUDI"] = manginapudi

        # 5. Demonstration Site: Suryalanka Beach (Bapatla District)
        suryalanka = RegionalBeachRecord(
            beach_id="SURYALANKA",
            name="Suryalanka Beach, Bapatla",
            district="Bapatla",
            coast_sector="South-Central AP Coastal Sector",
            location=GeographicCoordinate(latitude=15.8458, longitude=80.5217),
            status=BeachOperationalStatus.ACTIVE,
            provenance=BeachProvenance.DEMONSTRATION,
            data_freshness=DataFreshness.FRESH,
            last_updated=now - 300,
            connected=False,
            has_active_simulator=False,
            active_incidents_count=0,
            active_hazards_count=0,
            available_resources_count=2,
            total_resources_count=2,
            sensor_health_pct=92.0,
            notes="Gradual slope tourist beach; standard weekend bather surveillance."
        )
        self._beaches["SURYALANKA"] = suryalanka

        # 6. Demonstration Site: Vodarevu Beach (Chirala, Bapatla District)
        vodarevu = RegionalBeachRecord(
            beach_id="VODAREVU",
            name="Vodarevu Beach, Chirala",
            district="Bapatla",
            coast_sector="South-Central AP Coastal Sector",
            location=GeographicCoordinate(latitude=15.7972, longitude=80.3806),
            status=BeachOperationalStatus.UNKNOWN,
            provenance=BeachProvenance.DEMONSTRATION,
            data_freshness=DataFreshness.NO_DATA,
            last_updated=0.0,
            connected=False,
            has_active_simulator=False,
            active_incidents_count=0,
            active_hazards_count=0,
            available_resources_count=0,
            total_resources_count=0,
            sensor_health_pct=None,
            notes="Fishing port & coastal fringe; uninstrumented demonstration site."
        )
        self._beaches["VODAREVU"] = vodarevu

        # 7. Demonstration Site: Mypadu Beach (SPSR Nellore District)
        mypadu = RegionalBeachRecord(
            beach_id="MYPADU",
            name="Mypadu Beach, Nellore",
            district="SPSR Nellore",
            coast_sector="South AP Coastal Sector",
            location=GeographicCoordinate(latitude=14.5083, longitude=80.1792),
            status=BeachOperationalStatus.UNKNOWN,
            provenance=BeachProvenance.DEMONSTRATION,
            data_freshness=DataFreshness.NO_DATA,
            last_updated=0.0,
            connected=False,
            has_active_simulator=False,
            active_incidents_count=0,
            active_hazards_count=0,
            available_resources_count=0,
            total_resources_count=0,
            sensor_health_pct=None,
            notes="Southern littoral zone; no continuous sensor deployment."
        )
        self._beaches["MYPADU"] = mypadu

        # 8. Demonstration Site: Kalingapatnam Beach (Srikakulam District)
        kalingapatnam = RegionalBeachRecord(
            beach_id="KALINGAPATNAM",
            name="Kalingapatnam Beach, Srikakulam",
            district="Srikakulam",
            coast_sector="North AP Coastal Sector",
            location=GeographicCoordinate(latitude=18.3392, longitude=84.1242),
            status=BeachOperationalStatus.CAUTION,
            provenance=BeachProvenance.DEMONSTRATION,
            data_freshness=DataFreshness.STALE,
            last_updated=now - 7200,
            connected=False,
            has_active_simulator=False,
            active_incidents_count=0,
            active_hazards_count=1,
            available_resources_count=1,
            total_resources_count=2,
            sensor_health_pct=70.0,
            notes="Vamsadhara river confluence; historic lighthouse coastal sector."
        )
        self._beaches["KALINGAPATNAM"] = kalingapatnam

    def sync_rushikonda_state(self, sim_instance=None) -> None:
        """
        Synchronize Rushikonda record with the live BeachSimulator instance if available.
        Ensures local simulator state flows to the regional command center without mutation.
        """
        record = self._beaches.get("RUSHIKONDA")
        if not record:
            return

        record.last_updated = time.time()
        record.data_freshness = DataFreshness.FRESH
        record.connected = True
        record.has_active_simulator = True

        if sim_instance is not None:
            # Active incidents from simulator
            incidents = getattr(sim_instance, "active_incidents", [])
            record.active_incidents_count = len(incidents)

            # Hazards
            hazards = getattr(sim_instance, "active_hazards", [])
            record.active_hazards_count = max(len(hazards), 1)

            # Resources (Boats + Lifeguards)
            layout = getattr(sim_instance, "beach_layout", None)
            if layout and hasattr(layout, "lifeguards"):
                total_lg = len(layout.lifeguards)
                avail_lg = len([lg for lg in layout.lifeguards if str(getattr(lg, "status", "")).endswith("AVAILABLE")])
                record.total_resources_count = total_lg + 2 # 2 boats
                record.available_resources_count = avail_lg + 2
            else:
                record.total_resources_count = 4
                record.available_resources_count = 4 if len(incidents) == 0 else 3

            # Status determination
            if len(incidents) >= 2:
                record.status = BeachOperationalStatus.RESTRICTED
            elif len(incidents) == 1:
                record.status = BeachOperationalStatus.CAUTION
            else:
                record.status = BeachOperationalStatus.ACTIVE

    def get_beaches(
        self,
        status: Optional[str] = None,
        district: Optional[str] = None,
        provenance: Optional[str] = None,
    ) -> List[RegionalBeachRecord]:
        """Query beaches with optional status, district, and provenance filters."""
        results = list(self._beaches.values())

        if status:
            results = [b for b in results if b.status.value.upper() == status.upper()]
        if district:
            results = [b for b in results if b.district.lower() == district.lower()]
        if provenance:
            results = [b for b in results if b.provenance.value.upper() == provenance.upper()]

        return results

    def get_beach(self, beach_id: str) -> Optional[RegionalBeachRecord]:
        """Fetch a specific beach record by ID."""
        return self._beaches.get(beach_id.upper())

    def get_summary_kpis(self) -> RegionalSummaryKPIs:
        """
        Derive high-level operational indicators across all configured beaches.
        Never assumes missing data is safe.
        """
        all_beaches = list(self._beaches.values())
        now = time.time()

        fresh_count = 0
        stale_or_missing = 0
        offline_count = 0
        active_incidents = 0
        total_fleet = 0
        available_fleet = 0
        assigned_fleet = 0

        for b in all_beaches:
            if b.status == BeachOperationalStatus.OFFLINE or b.data_freshness == DataFreshness.OFFLINE:
                offline_count += 1
                stale_or_missing += 1
            elif b.data_freshness == DataFreshness.NO_DATA:
                stale_or_missing += 1
            elif b.data_freshness == DataFreshness.STALE or (now - b.last_updated > 1800):
                stale_or_missing += 1
            else:
                fresh_count += 1

            active_incidents += b.active_incidents_count
            total_fleet += b.total_resources_count
            available_fleet += b.available_resources_count
            assigned_fleet += (b.total_resources_count - b.available_resources_count)

        return RegionalSummaryKPIs(
            total_configured_sites=len(all_beaches),
            fresh_data_sites_count=fresh_count,
            stale_or_missing_sites_count=stale_or_missing,
            offline_sites_count=offline_count,
            active_incidents_count=active_incidents,
            total_fleet_resources=total_fleet,
            available_fleet_resources=available_fleet,
            assigned_fleet_resources=assigned_fleet,
            timestamp=now,
        )


# Singleton instance
_beach_registry_instance: Optional[RegionalBeachRegistry] = None


def get_beach_registry() -> RegionalBeachRegistry:
    global _beach_registry_instance
    if _beach_registry_instance is None:
        _beach_registry_instance = RegionalBeachRegistry()
    return _beach_registry_instance
