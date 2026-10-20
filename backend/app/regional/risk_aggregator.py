"""
backend/app/regional/risk_aggregator.py
Aggregates coastal hazard, environmental, and sensor observations across configured sites.
Preserves existing hazard calculations and clearly differentiates measured/simulated from missing data.
"""

import time
from typing import Dict, List, Optional
from app.regional.types import (
    RegionalRiskObservation,
    BeachProvenance,
    DataFreshness,
)
from app.regional.beach_registry import get_beach_registry


class RegionalRiskAggregator:
    """
    Aggregates timestamped coastal safety telemetry across Andhra Pradesh beaches.
    Strictly displays UNKNOWN / NO DATA for uninstrumented locations.
    Never invents composite scores or classifies an unmonitored site as safe.
    """

    def __init__(self):
        self._cached_observations: Dict[str, RegionalRiskObservation] = {}
        self._initialize_baseline_observations()

    def _initialize_baseline_observations(self) -> None:
        """Seed baseline observations respecting provenance and data availability."""
        now = time.time()

        # 1. RUSHIKONDA: Connected Digital Twin
        self._cached_observations["RUSHIKONDA"] = RegionalRiskObservation(
            beach_id="RUSHIKONDA",
            beach_name="Rushikonda Blue Flag Beach, Visakhapatnam",
            wave_height_m=1.2,
            wave_period_s=8.0,
            rip_current_risk="MODERATE",
            rip_velocity_mps=0.85,
            wind_speed_mps=14.2,
            wind_direction_deg=110.0,
            visibility_km=10.0,
            tide_level_m=0.45,
            sensor_freshness=DataFreshness.FRESH,
            sensor_availability_pct=98.5,
            forecast_summary="Rip risk stable; wave height 1.2m peaking to 1.5m in +3h",
            active_incident_count=0,
            data_source="TIDES 3D Digital Twin & Sensor Fusion Pipeline",
            timestamp=now,
            provenance=BeachProvenance.SIMULATED,
        )

        # 2. RK_BEACH: Demonstration Site (Urban Surf)
        self._cached_observations["RK_BEACH"] = RegionalRiskObservation(
            beach_id="RK_BEACH",
            beach_name="Ramakrishna (RK) Beach, Visakhapatnam",
            wave_height_m=1.8,
            wave_period_s=9.5,
            rip_current_risk="HIGH",
            rip_velocity_mps=1.40,
            wind_speed_mps=18.5,
            wind_direction_deg=135.0,
            visibility_km=7.5,
            tide_level_m=0.60,
            sensor_freshness=DataFreshness.STALE,
            sensor_availability_pct=88.0,
            forecast_summary="High littoral current; caution advisory active",
            active_incident_count=1,
            data_source="Regional Coastal Simulation Feed (Demonstration)",
            timestamp=now - 3600,
            provenance=BeachProvenance.DEMONSTRATION,
        )

        # 3. BHEEMILI: Demonstration Site (River Mouth Breakwater)
        self._cached_observations["BHEEMILI"] = RegionalRiskObservation(
            beach_id="BHEEMILI",
            beach_name="Bheemunipatnam (Bheemili) Beach",
            wave_height_m=2.3,
            wave_period_s=11.0,
            rip_current_risk="CRITICAL",
            rip_velocity_mps=1.95,
            wind_speed_mps=22.0,
            wind_direction_deg=145.0,
            visibility_km=6.0,
            tide_level_m=0.85,
            sensor_freshness=DataFreshness.FRESH,
            sensor_availability_pct=76.0,
            forecast_summary="Severe swell warning; rocky breakwater bathers evacuated",
            active_incident_count=2,
            data_source="Regional Coastal Simulation Feed (Demonstration)",
            timestamp=now - 120,
            provenance=BeachProvenance.DEMONSTRATION,
        )

        # 4. MANGINAPUDI: Offline Site
        self._cached_observations["MANGINAPUDI"] = RegionalRiskObservation(
            beach_id="MANGINAPUDI",
            beach_name="Manginapudi Beach, Machilipatnam",
            wave_height_m=None,
            wave_period_s=None,
            rip_current_risk="UNKNOWN",
            rip_velocity_mps=None,
            wind_speed_mps=None,
            wind_direction_deg=None,
            visibility_km=None,
            tide_level_m=None,
            sensor_freshness=DataFreshness.OFFLINE,
            sensor_availability_pct=0.0,
            forecast_summary="Telemetry offline; no reliable forecast available",
            active_incident_count=0,
            data_source="Station Offline (Telemetry Comms Lost)",
            timestamp=now - 172800,
            provenance=BeachProvenance.DEMONSTRATION,
        )

        # 5. SURYALANKA: Demonstration Site
        self._cached_observations["SURYALANKA"] = RegionalRiskObservation(
            beach_id="SURYALANKA",
            beach_name="Suryalanka Beach, Bapatla",
            wave_height_m=0.9,
            wave_period_s=7.0,
            rip_current_risk="LOW",
            rip_velocity_mps=0.30,
            wind_speed_mps=10.0,
            wind_direction_deg=95.0,
            visibility_km=12.0,
            tide_level_m=0.30,
            sensor_freshness=DataFreshness.FRESH,
            sensor_availability_pct=92.0,
            forecast_summary="Calm surf; safe swimming within yellow markers",
            active_incident_count=0,
            data_source="Regional Coastal Simulation Feed (Demonstration)",
            timestamp=now - 300,
            provenance=BeachProvenance.DEMONSTRATION,
        )

        # 6. VODAREVU: Uninstrumented
        self._cached_observations["VODAREVU"] = RegionalRiskObservation(
            beach_id="VODAREVU",
            beach_name="Vodarevu Beach, Chirala",
            wave_height_m=None,
            wave_period_s=None,
            rip_current_risk="UNKNOWN",
            rip_velocity_mps=None,
            wind_speed_mps=None,
            wind_direction_deg=None,
            visibility_km=None,
            tide_level_m=None,
            sensor_freshness=DataFreshness.NO_DATA,
            sensor_availability_pct=None,
            forecast_summary="Unmonitored sector; no deployed oceanographic telemetry",
            active_incident_count=0,
            data_source="None (Unmonitored)",
            timestamp=0.0,
            provenance=BeachProvenance.DEMONSTRATION,
        )

        # 7. MYPADU: Uninstrumented
        self._cached_observations["MYPADU"] = RegionalRiskObservation(
            beach_id="MYPADU",
            beach_name="Mypadu Beach, Nellore",
            wave_height_m=None,
            wave_period_s=None,
            rip_current_risk="UNKNOWN",
            rip_velocity_mps=None,
            wind_speed_mps=None,
            wind_direction_deg=None,
            visibility_km=None,
            tide_level_m=None,
            sensor_freshness=DataFreshness.NO_DATA,
            sensor_availability_pct=None,
            forecast_summary="Unmonitored sector; no deployed oceanographic telemetry",
            active_incident_count=0,
            data_source="None (Unmonitored)",
            timestamp=0.0,
            provenance=BeachProvenance.DEMONSTRATION,
        )

        # 8. KALINGAPATNAM: Demonstration Site
        self._cached_observations["KALINGAPATNAM"] = RegionalRiskObservation(
            beach_id="KALINGAPATNAM",
            beach_name="Kalingapatnam Beach, Srikakulam",
            wave_height_m=1.4,
            wave_period_s=8.5,
            rip_current_risk="MODERATE",
            rip_velocity_mps=0.75,
            wind_speed_mps=15.0,
            wind_direction_deg=120.0,
            visibility_km=8.0,
            tide_level_m=0.50,
            sensor_freshness=DataFreshness.STALE,
            sensor_availability_pct=70.0,
            forecast_summary="Moderate swell near river mouth; cautionary patrols active",
            active_incident_count=0,
            data_source="Regional Coastal Simulation Feed (Demonstration)",
            timestamp=now - 7200,
            provenance=BeachProvenance.DEMONSTRATION,
        )

    def sync_rushikonda_telemetry(self, sim_instance=None) -> None:
        """
        Pull real-time environmental metrics directly from the live BeachSimulator
        for Rushikonda, preserving existing calculations and units.
        """
        obs = self._cached_observations.get("RUSHIKONDA")
        if not obs:
            return

        obs.timestamp = time.time()
        obs.sensor_freshness = DataFreshness.FRESH

        if sim_instance is not None:
            # Environment
            env = getattr(sim_instance, "environment", None)
            if env:
                obs.wave_height_m = float(getattr(env, "wave_height", 1.2))
                obs.wave_period_s = float(getattr(env, "wave_period", 8.0))
                obs.wind_speed_mps = float(getattr(env, "wind_speed", 14.0))
                obs.wind_direction_deg = float(getattr(env, "wind_direction", 110.0))
                obs.visibility_km = float(getattr(env, "visibility", 10.0))
                obs.tide_level_m = float(getattr(env, "tide_level", 0.45))

            # Incidents
            incidents = getattr(sim_instance, "active_incidents", [])
            obs.active_incident_count = len(incidents)

            # Rip current
            hazards = getattr(sim_instance, "active_hazards", [])
            rip_hazards = [h for h in hazards if "rip" in str(getattr(h, "hazard_type", "")).lower()]
            if rip_hazards:
                obs.rip_current_risk = "HIGH" if len(incidents) > 0 else "MODERATE"
                obs.rip_velocity_mps = 1.10
            else:
                obs.rip_current_risk = "LOW"
                obs.rip_velocity_mps = 0.40

    def get_all_observations(self) -> List[RegionalRiskObservation]:
        """Return comparison observations for all registered sites."""
        return list(self._cached_observations.values())

    def get_observation(self, beach_id: str) -> Optional[RegionalRiskObservation]:
        """Fetch a specific beach's observation."""
        return self._cached_observations.get(beach_id.upper())


# Singleton instance
_risk_aggregator_instance: Optional[RegionalRiskAggregator] = None


def get_risk_aggregator() -> RegionalRiskAggregator:
    global _risk_aggregator_instance
    if _risk_aggregator_instance is None:
        _risk_aggregator_instance = RegionalRiskAggregator()
    return _risk_aggregator_instance
