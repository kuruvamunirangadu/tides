"""
backend/tests/test_milestone10_regional.py
Comprehensive deterministic test suite for TIDES Milestone 10:
Multi-Beach Command Center & Fleet-Wide Monitoring.
"""

import unittest
import time
from app.regional.types import (
    BeachProvenance,
    BeachOperationalStatus,
    DataFreshness,
    RegionalBeachRecord,
    RegionalIncidentRecord,
    GeographicCoordinate,
)
from app.regional.beach_registry import RegionalBeachRegistry
from app.regional.risk_aggregator import RegionalRiskAggregator
from app.regional.incident_adapter import RegionalIncidentAdapter
from app.regional.resource_registry import RegionalResourceRegistry


class TestMilestone10Regional(unittest.TestCase):
    """15 deterministic unit tests for Milestone 10 Regional Command Center."""

    def setUp(self):
        self.registry = RegionalBeachRegistry()
        self.risk_aggregator = RegionalRiskAggregator()
        self.incident_adapter = RegionalIncidentAdapter()
        self.resource_registry = RegionalResourceRegistry()

    def test_01_unique_and_stable_beach_ids(self):
        """1. Unique and stable beach IDs across Andhra Pradesh registry."""
        beaches = self.registry.get_beaches()
        self.assertGreaterEqual(len(beaches), 8, "Expected at least 8 AP coastal beach sites.")

        ids = [b.beach_id for b in beaches]
        self.assertEqual(len(ids), len(set(ids)), "Beach IDs must be strictly unique.")

        for b in beaches:
            self.assertTrue(len(b.beach_id) > 2, "Beach ID must be non-empty.")
            self.assertTrue(len(b.name) > 3, "Beach name must be descriptive.")
            self.assertTrue(len(b.district) > 2, "District must be specified.")

    def test_02_rushikonda_connected_provenance(self):
        """2. Rushikonda is the anchor connected site with SIMULATED/LIVE provenance."""
        rushikonda = self.registry.get_beach("RUSHIKONDA")
        self.assertIsNotNone(rushikonda)
        self.assertTrue(rushikonda.connected, "Rushikonda must be connected.")
        self.assertTrue(rushikonda.has_active_simulator, "Rushikonda must have an active simulator.")
        self.assertIn(rushikonda.provenance, [BeachProvenance.SIMULATED, BeachProvenance.LIVE])
        self.assertEqual(rushikonda.data_freshness, DataFreshness.FRESH)
        self.assertAlmostEqual(rushikonda.location.latitude, 17.7815, places=3)
        self.assertAlmostEqual(rushikonda.location.longitude, 83.3855, places=3)

    def test_03_demo_sites_provenance_and_labeling(self):
        """3. Demonstration sites are explicitly labeled DEMONSTRATION and disconnected."""
        demo_site_ids = ["RK_BEACH", "BHEEMILI", "MANGINAPUDI", "SURYALANKA", "VODAREVU", "MYPADU", "KALINGAPATNAM"]
        for site_id in demo_site_ids:
            beach = self.registry.get_beach(site_id)
            self.assertIsNotNone(beach, f"Site {site_id} must be registered.")
            self.assertEqual(beach.provenance, BeachProvenance.DEMONSTRATION, f"{site_id} must be DEMONSTRATION.")
            self.assertFalse(beach.connected, f"{site_id} must not be flagged as connected.")
            self.assertFalse(beach.has_active_simulator, f"{site_id} must not claim active simulator.")

    def test_04_missing_and_stale_data_handling(self):
        """4. Uninstrumented sites return NO_DATA/UNKNOWN without false zeros or false safe status."""
        vodarevu = self.registry.get_beach("VODAREVU")
        self.assertIsNotNone(vodarevu)
        self.assertEqual(vodarevu.status, BeachOperationalStatus.UNKNOWN)
        self.assertEqual(vodarevu.data_freshness, DataFreshness.NO_DATA)

        obs = self.risk_aggregator.get_observation("VODAREVU")
        self.assertIsNotNone(obs)
        self.assertIsNone(obs.wave_height_m, "Uninstrumented wave height must be None/UNKNOWN.")
        self.assertIsNone(obs.wave_period_s, "Uninstrumented wave period must be None.")
        self.assertEqual(obs.rip_current_risk, "UNKNOWN")
        self.assertIsNone(obs.rip_velocity_mps)

    def test_05_offline_site_detection(self):
        """5. Offline stations are flagged with OFFLINE status and comms loss notice."""
        manginapudi = self.registry.get_beach("MANGINAPUDI")
        self.assertIsNotNone(manginapudi)
        self.assertEqual(manginapudi.status, BeachOperationalStatus.OFFLINE)
        self.assertEqual(manginapudi.data_freshness, DataFreshness.OFFLINE)
        self.assertIsNone(manginapudi.sensor_health_pct)

        obs = self.risk_aggregator.get_observation("MANGINAPUDI")
        self.assertEqual(obs.sensor_freshness, DataFreshness.OFFLINE)
        self.assertEqual(obs.sensor_availability_pct, 0.0)

    def test_06_incident_adapter_deduplication(self):
        """6. Incident adapter deduplicates events by incident_id and preserves earliest creation timestamp."""
        now = time.time()
        record1 = RegionalIncidentRecord(
            incident_id="INC-TEST-01",
            site_id="RUSHIKONDA",
            site_name="Rushikonda Beach",
            created_at=now - 500,
            updated_at=now - 400,
            severity="HIGH",
            distress_level=0.8,
            status="REPORTED",
            provenance=BeachProvenance.SIMULATED,
        )
        self.incident_adapter.ingest_incident(record1)

        # Ingest updated duplicate with same ID but newer updated_at
        record2 = RegionalIncidentRecord(
            incident_id="INC-TEST-01",
            site_id="RUSHIKONDA",
            site_name="Rushikonda Beach",
            created_at=now - 300, # Later timestamp from client
            updated_at=now - 100,
            severity="HIGH",
            distress_level=0.85,
            status="DISPATCHED",
            provenance=BeachProvenance.SIMULATED,
        )
        self.incident_adapter.ingest_incident(record2)

        incidents = self.incident_adapter.get_all_incidents(site_id="RUSHIKONDA")
        test_incs = [i for i in incidents if i.incident_id == "INC-TEST-01"]
        self.assertEqual(len(test_incs), 1, "Duplicate incident ID must be collapsed into one.")
        self.assertEqual(test_incs[0].status, "DISPATCHED")
        self.assertAlmostEqual(test_incs[0].created_at, now - 500, places=1, msg="Original created_at must be preserved.")

    def test_07_incident_adapter_sorting(self):
        """7. Out-of-order incidents are deterministically sorted by timestamp descending."""
        incidents = self.incident_adapter.get_all_incidents()
        for i in range(len(incidents) - 1):
            t_curr = (incidents[i].updated_at, incidents[i].created_at)
            t_next = (incidents[i + 1].updated_at, incidents[i + 1].created_at)
            self.assertGreaterEqual(t_curr, t_next, "Incidents must be sorted newest first.")

    def test_08_incident_read_only_isolation(self):
        """8. Querying or fetching incidents does NOT mutate simulation state or trigger dispatch."""
        res_before = self.resource_registry.get_resource("RB-01")
        status_before = res_before.operational_status

        inc = self.incident_adapter.get_incident("INC-BHM-01")
        self.assertIsNotNone(inc)

        # Verify no dispatch side-effects
        res_after = self.resource_registry.get_resource("RB-01")
        self.assertEqual(res_after.operational_status, status_before)

    def test_09_site_isolation(self):
        """9. Multi-beach site isolation: state changes on one beach do not leak to another."""
        rk_beach = self.registry.get_beach("RK_BEACH")
        rushikonda = self.registry.get_beach("RUSHIKONDA")

        self.assertNotEqual(rk_beach.beach_id, rushikonda.beach_id)
        self.assertNotEqual(rk_beach.provenance, rushikonda.provenance)
        self.assertNotEqual(rk_beach.connected, rushikonda.connected)

        # Mutating RK record
        rk_beach.active_incidents_count = 99
        self.assertNotEqual(rushikonda.active_incidents_count, 99)

    def test_10_resource_registry_home_beaches(self):
        """10. Resources are bound to their home beaches and operational status is tracked."""
        rushikonda_resources = self.resource_registry.get_all_resources(beach_id="RUSHIKONDA")
        self.assertGreaterEqual(len(rushikonda_resources), 4)

        for r in rushikonda_resources:
            self.assertEqual(r.home_beach_id, "RUSHIKONDA")
            self.assertIn(r.resource_type, ["RESCUE_BOAT", "LIFEGUARD", "DRONE"])

    def test_11_cross_beach_transfer_advisory_only(self):
        """11. Cross-beach transfers are strictly advisory: station-bound assets rejected, no auto-dispatch."""
        # 1. Lifeguard tower (non-transferrable)
        lg_eval = self.resource_registry.evaluate_cross_beach_transfer_advisory("LG-01", "RK_BEACH")
        self.assertFalse(lg_eval["allowed"])
        self.assertIn("station-bound", lg_eval["reason"])

        # 2. Rescue boat (cross-beach capable)
        rb_eval = self.resource_registry.evaluate_cross_beach_transfer_advisory("RB-01", "BHEEMILI")
        self.assertTrue(rb_eval["allowed"])
        self.assertIn("ADVISORY ONLY", rb_eval["notice"])

        # Ensure no state mutation happened
        rb = self.resource_registry.get_resource("RB-01")
        self.assertEqual(rb.assigned_beach_id, "RUSHIKONDA")

    def test_12_regional_risk_aggregation_units_and_provenance(self):
        """12. Aggregated risk comparison observations preserve units, sources, and provenance."""
        obs = self.risk_aggregator.get_observation("RUSHIKONDA")
        self.assertEqual(obs.provenance, BeachProvenance.SIMULATED)
        self.assertEqual(obs.rip_current_risk, "MODERATE")
        self.assertEqual(obs.wave_height_m, 1.2)
        self.assertEqual(obs.wave_period_s, 8.0)
        self.assertEqual(obs.wind_speed_mps, 14.2)
        self.assertEqual(obs.visibility_km, 10.0)
        self.assertIn("Digital Twin", obs.data_source)

    def test_13_summary_kpi_derived_accuracy(self):
        """13. Summary KPIs match itemized registry counts accurately."""
        summary = self.registry.get_summary_kpis()
        beaches = self.registry.get_beaches()

        self.assertEqual(summary.total_configured_sites, len(beaches))
        self.assertGreater(summary.total_fleet_resources, 0)
        self.assertEqual(summary.total_fleet_resources, summary.available_fleet_resources + summary.assigned_fleet_resources)
        self.assertGreaterEqual(summary.stale_or_missing_sites_count, 1)

    def test_14_partial_failure_and_unknown_beach_query(self):
        """14. Querying non-existent beaches or missing assets returns None/404 gracefully."""
        invalid_beach = self.registry.get_beach("NON_EXISTENT_BEACH")
        self.assertIsNone(invalid_beach)

        invalid_obs = self.risk_aggregator.get_observation("UNKNOWN_SITE")
        self.assertIsNone(invalid_obs)

        invalid_res = self.resource_registry.get_resource("INVALID_RESOURCE_ID")
        self.assertIsNone(invalid_res)

        eval_res = self.resource_registry.evaluate_cross_beach_transfer_advisory("INVALID_ID", "RUSHIKONDA")
        self.assertFalse(eval_res["allowed"])

    def test_15_empty_or_filtered_query_graceful_handling(self):
        """15. Filter queries with zero matches return empty lists without exceptions."""
        filtered_status = self.registry.get_beaches(status="NON_EXISTENT_STATUS")
        self.assertEqual(len(filtered_status), 0)

        filtered_district = self.registry.get_beaches(district="UNKNOWN_DISTRICT")
        self.assertEqual(len(filtered_district), 0)

        filtered_inc = self.incident_adapter.get_all_incidents(site_id="GHOST_SITE")
        self.assertEqual(len(filtered_inc), 0)


if __name__ == "__main__":
    unittest.main()
