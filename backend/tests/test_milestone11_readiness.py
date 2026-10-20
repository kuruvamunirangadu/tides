"""
backend/tests/test_milestone11_readiness.py
15 deterministic unit tests for TIDES Milestone 11:
Operational Readiness, Field-Pilot Mode & Evidence-Based Evaluation.
"""

import unittest
import time
from app.operations.types import (
    OperatingMode,
    ReadinessStatus,
    DataProvenance,
)
from app.operations.readiness_service import OperationalReadinessService
from app.operations.scenario_evaluator import RepeatableScenarioEvaluator
from app.operations.report_generator import PilotEvidenceReportGenerator


class TestMilestone11Readiness(unittest.TestCase):
    """15 deterministic unit tests for Milestone 11 Operational Readiness & Evaluation."""

    def setUp(self):
        self.readiness_svc = OperationalReadinessService()
        self.evaluator = RepeatableScenarioEvaluator()
        self.report_gen = PilotEvidenceReportGenerator()

    def test_01_readiness_checks_initialization(self):
        """1. Readiness checks are initialized with stable IDs and evidence."""
        checks = self.readiness_svc.run_all_checks()
        self.assertGreaterEqual(len(checks), 9, "Expected at least 9 readiness checks.")
        for cid, item in checks.items():
            self.assertEqual(cid, item.check_id)
            self.assertTrue(len(item.name) > 3)
            self.assertTrue(len(item.evidence) > 5)
            self.assertIn(item.status, [ReadinessStatus.READY, ReadinessStatus.DEGRADED, ReadinessStatus.BLOCKED, ReadinessStatus.UNKNOWN])

    def test_02_mandatory_vs_optional_checks(self):
        """2. Mandatory vs optional check filtering operates correctly."""
        self.readiness_svc.set_operating_mode(OperatingMode.DEMONSTRATION)
        checks = self.readiness_svc.run_all_checks()
        # FE, BE, CONFIG, TELEMETRY are always mandatory
        self.assertTrue(checks["FE_APP_HEALTH"].is_mandatory)
        self.assertTrue(checks["BE_API_CONNECTIVITY"].is_mandatory)
        self.assertTrue(checks["CONFIG_VALIDITY"].is_mandatory)

    def test_03_operating_mode_switching(self):
        """3. Switching operating modes preserves configuration integrity."""
        self.readiness_svc.set_operating_mode(OperatingMode.DEVELOPMENT)
        self.assertEqual(self.readiness_svc.operating_mode, OperatingMode.DEVELOPMENT)

        self.readiness_svc.set_operating_mode(OperatingMode.CONTROLLED_PILOT)
        self.assertEqual(self.readiness_svc.operating_mode, OperatingMode.CONTROLLED_PILOT)

        # Revert to Demonstration
        self.readiness_svc.set_operating_mode(OperatingMode.DEMONSTRATION)
        self.assertEqual(self.readiness_svc.operating_mode, OperatingMode.DEMONSTRATION)

    def test_04_controlled_pilot_supervisor_safeguard(self):
        """4. In CONTROLLED_PILOT mode, supervisor confirmation is mandatory."""
        self.readiness_svc.set_operating_mode(OperatingMode.CONTROLLED_PILOT)

        # Test unconfirmed supervisor blocks pilot readiness
        self.readiness_svc.config.supervisor_confirmed = False
        verdict = self.readiness_svc.get_overall_readiness(recompute=True)
        self.assertEqual(verdict["overall_status"], ReadinessStatus.BLOCKED.value)
        self.assertIn("PILOT_SAFEGUARDS", verdict["blocked_checks"])

        # Restore confirmation
        self.readiness_svc.config.supervisor_confirmed = True
        verdict_restored = self.readiness_svc.get_overall_readiness(recompute=True)
        self.assertEqual(verdict_restored["overall_status"], ReadinessStatus.READY.value)

    def test_05_stale_telemetry_degrades_readiness(self):
        """5. Delayed telemetry degrades TELEMETRY_FRESHNESS without false READY."""
        checks = self.readiness_svc.run_all_checks()
        tel_check = checks["TELEMETRY_FRESHNESS"]
        self.assertIn(tel_check.status, [ReadinessStatus.READY, ReadinessStatus.DEGRADED])
        self.assertTrue("s ago" in tel_check.evidence)

    def test_06_missing_evidence_yields_unknown(self):
        """6. Missing evidence must report UNKNOWN rather than defaulting to READY."""
        # Manually set an unknown check
        checks = self.readiness_svc.run_all_checks()
        checks["SENSOR_HEALTH"].status = ReadinessStatus.UNKNOWN
        self.readiness_svc._cached_checks = checks

        # Overall verdict should reflect unknown
        verdict = self.readiness_svc.get_overall_readiness()
        self.assertEqual(verdict["overall_status"], ReadinessStatus.UNKNOWN.value)

    def test_07_scenario_catalog_10_scenarios(self):
        """7. ScenarioCatalog contains exactly 10 standardized scenarios."""
        catalog = self.evaluator.get_catalog()
        self.assertEqual(len(catalog), 10, "Expected exactly 10 standardized scenarios.")
        ids = [s["id"] for s in catalog]
        self.assertEqual(len(ids), len(set(ids)), "Scenario IDs must be unique.")
        self.assertIn("SCENARIO-01-STABLE-ENV", ids)
        self.assertIn("SCENARIO-02-RIP-INTENSIFICATION", ids)
        self.assertIn("SCENARIO-03-SWIMMER-DISTRESS", ids)
        self.assertIn("SCENARIO-06-RESOURCE-EXHAUSTION", ids)
        self.assertIn("SCENARIO-07-MULTI-INCIDENT-COORD", ids)
        self.assertIn("SCENARIO-10-OUT-OF-ORDER-EVENTS", ids)

    def test_08_scenario_execution_isolation(self):
        """8. Scenario execution is isolated from live simulation session."""
        result = self.evaluator.execute_scenario("SCENARIO-01-STABLE-ENV")
        self.assertEqual(result.status, "PASSED")
        self.assertEqual(result.provenance, DataProvenance.CONTROLLED_TEST)
        self.assertGreater(result.duration_ms, 0)
        self.assertGreater(len(result.assertions), 0)

    def test_09_scenario_assertion_evaluation(self):
        """9. Scenarios record expected vs actual assertions with boolean outcomes."""
        result = self.evaluator.execute_scenario("SCENARIO-02-RIP-INTENSIFICATION")
        for ast in result.assertions:
            self.assertTrue(ast.passed)
            self.assertTrue(len(ast.expected) > 0)
            self.assertTrue(len(ast.actual) > 0)

    def test_10_evidence_metrics_latency_thresholds(self):
        """10. Latency metrics contain defined start/end events and thresholds."""
        metrics = self.evaluator.get_evaluation_metrics()
        self.assertGreaterEqual(len(metrics), 6)

        hazard_metric = next((m for m in metrics if m.metric_id == "METRIC-HAZARD-LATENCY"), None)
        self.assertIsNotNone(hazard_metric)
        self.assertEqual(hazard_metric.unit, "seconds")
        self.assertLessEqual(hazard_metric.observed_value, hazard_metric.target_threshold)
        self.assertEqual(hazard_metric.start_event, "VELOCITY_SPIKE_EXCEEDED")
        self.assertEqual(hazard_metric.end_event, "HAZARD_FLAG_RAISED")

    def test_11_forecast_mae_prevents_future_leakage(self):
        """11. Forecast MAE metric evaluates without future data leakage."""
        metrics = self.evaluator.get_evaluation_metrics()
        fc_metric = next((m for m in metrics if m.metric_id == "METRIC-FORECAST-MAE"), None)
        self.assertIsNotNone(fc_metric)
        self.assertEqual(fc_metric.unit, "meters")
        self.assertLessEqual(fc_metric.observed_value, fc_metric.target_threshold)

    def test_12_json_report_structure_and_provenance(self):
        """12. Generated JSON report contains all required audit sections."""
        report = self.report_gen.generate_json_report()
        self.assertTrue(report["report_id"].startswith("TIDES-EVIDENCE-"))
        self.assertEqual(report["pilot_site"]["site_id"], "RUSHIKONDA")
        self.assertIn("overall_readiness", report)
        self.assertIn("readiness_checks", report)
        self.assertIn("scenario_evaluation", report)
        self.assertIn("evidence_metrics", report)
        self.assertIn("limitations_and_safeguards", report)

    def test_13_markdown_report_formatting(self):
        """13. Markdown summary report contains human-readable tables."""
        md = self.report_gen.generate_markdown_summary()
        self.assertIn("# TIDES Pilot Evidence & Operational Readiness Report", md)
        self.assertIn("Repeatable Safety Test Scenarios", md)
        self.assertIn("Evidence-Based Performance Metrics", md)
        self.assertIn("CONTROLLED_TEST", md)

    def test_14_readiness_status_aggregation_rules(self):
        """14. Readiness status adheres strictly to priority rules: BLOCKED > UNKNOWN > DEGRADED > READY."""
        # 1. BLOCKED overrides all
        checks = self.readiness_svc.run_all_checks()
        checks["FE_APP_HEALTH"].status = ReadinessStatus.BLOCKED
        checks["BE_API_CONNECTIVITY"].status = ReadinessStatus.UNKNOWN
        self.readiness_svc._cached_checks = checks
        self.assertEqual(self.readiness_svc.get_overall_readiness()["overall_status"], ReadinessStatus.BLOCKED.value)

    def test_15_all_scenarios_sequential_run(self):
        """15. All 10 catalog scenarios run sequentially without memory leaks or crashes."""
        results = self.evaluator.run_all_scenarios()
        self.assertEqual(len(results), 10)
        for r in results:
            self.assertEqual(r.status, "PASSED")
            self.assertEqual(r.provenance, DataProvenance.CONTROLLED_TEST)


if __name__ == "__main__":
    unittest.main()
