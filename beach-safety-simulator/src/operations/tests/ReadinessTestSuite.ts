/**
 * src/operations/tests/ReadinessTestSuite.ts
 * Comprehensive deterministic test suite for TIDES Milestone 11:
 * Operational Readiness, Field-Pilot Mode & Evidence-Based Evaluation.
 */

import { ReadinessEngine } from '../ReadinessEngine';
import { ScenarioTestRunner } from '../ScenarioTestRunner';
import { EvaluationMetrics } from '../EvaluationMetrics';
import { EvidenceReport } from '../EvidenceReport';
import { SCENARIO_CATALOG } from '../scenarios/ScenarioCatalog';

export interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

export class ReadinessTestSuite {
  public static runAll(): TestResult[] {
    const results: TestResult[] = [];

    // Test 1: Initial State & DEMONSTRATION Mode
    try {
      const engine = ReadinessEngine.getInstance();
      engine.setOperatingMode('DEMONSTRATION');
      const verdict = engine.getOverallReadiness({ recompute: true });
      const pass =
        verdict.operating_mode === 'DEMONSTRATION' &&
        verdict.total_checks === 10 &&
        verdict.overall_status === 'READY';
      results.push({
        name: '1. Initial State & DEMONSTRATION Mode defaults',
        passed: pass,
        message: pass ? undefined : `Expected READY in DEMONSTRATION mode, got ${verdict.overall_status}`,
      });
    } catch (err: any) {
      results.push({ name: '1. Initial State & DEMONSTRATION Mode defaults', passed: false, message: err.message });
    }

    // Test 2: All 10 mandatory checks present
    try {
      const engine = ReadinessEngine.getInstance();
      const checks = engine.runAllChecks();
      const requiredIds = [
        'FE_APP_HEALTH',
        'BE_API_CONNECTIVITY',
        'CONFIG_VALIDITY',
        'TELEMETRY_FRESHNESS',
        'SENSOR_HEALTH',
        'INCIDENT_RECORDING',
        'RESCUE_RESOURCE_CONSISTENCY',
        'SCENARIO_RUNNER',
        'REGIONAL_ISOLATION',
        'PILOT_SAFEGUARDS',
      ];
      const allFound = requiredIds.every((id) => checks.has(id));
      const hasCategories = Array.from(checks.values()).every((c) => Boolean(c.category) && Boolean(c.evidence));
      const pass = allFound && hasCategories && checks.size === 10;
      results.push({
        name: '2. All 10 standard checks present with metadata',
        passed: pass,
        message: pass ? undefined : `Checks missing or incomplete. Count: ${checks.size}`,
      });
    } catch (err: any) {
      results.push({ name: '2. All 10 standard checks present with metadata', passed: false, message: err.message });
    }

    // Test 3: Operating mode switching updates config without resetting state
    try {
      const engine = ReadinessEngine.getInstance();
      engine.setOperatingMode('DEVELOPMENT');
      const devMode = engine.getOperatingMode() === 'DEVELOPMENT';
      engine.setOperatingMode('DEMONSTRATION');
      const demoMode = engine.getOperatingMode() === 'DEMONSTRATION';
      const pass = devMode && demoMode;
      results.push({
        name: '3. Operating mode transitions preserve configuration integrity',
        passed: pass,
        message: pass ? undefined : 'Failed to transition between modes correctly',
      });
    } catch (err: any) {
      results.push({ name: '3. Operating mode transitions preserve configuration integrity', passed: false, message: err.message });
    }

    // Test 4: CONTROLLED_PILOT mode without supervisor confirmation returns BLOCKED
    try {
      const engine = ReadinessEngine.getInstance();
      engine.setOperatingMode('CONTROLLED_PILOT');
      engine.setSupervisorConfirmation(false, '');
      const verdict = engine.getOverallReadiness({ recompute: true });
      const pilotCheck = verdict.checks.find((c) => c.check_id === 'PILOT_SAFEGUARDS');
      const pass =
        verdict.overall_status === 'BLOCKED' &&
        pilotCheck?.status === 'BLOCKED' &&
        verdict.blocked_checks.includes('PILOT_SAFEGUARDS');
      results.push({
        name: '4. Supervisor confirmation gate: unconfirmed CONTROLLED_PILOT returns BLOCKED',
        passed: pass,
        message: pass ? undefined : `Expected BLOCKED, got ${verdict.overall_status}`,
      });
    } catch (err: any) {
      results.push({ name: '4. Supervisor confirmation gate: unconfirmed CONTROLLED_PILOT returns BLOCKED', passed: false, message: err.message });
    }

    // Test 5: CONTROLLED_PILOT mode with supervisor confirmation returns READY
    try {
      const engine = ReadinessEngine.getInstance();
      engine.setOperatingMode('CONTROLLED_PILOT');
      engine.setSupervisorConfirmation(true, 'CHIEF_LIFEGUARD_OPERATOR');
      const verdict = engine.getOverallReadiness({ recompute: true });
      const pilotCheck = verdict.checks.find((c) => c.check_id === 'PILOT_SAFEGUARDS');
      const pass =
        verdict.overall_status === 'READY' &&
        pilotCheck?.status === 'READY' &&
        verdict.blocked_checks.length === 0;
      results.push({
        name: '5. Supervisor confirmation gate: confirmed CONTROLLED_PILOT returns READY',
        passed: pass,
        message: pass ? undefined : `Expected READY, got ${verdict.overall_status}`,
      });
    } catch (err: any) {
      results.push({ name: '5. Supervisor confirmation gate: confirmed CONTROLLED_PILOT returns READY', passed: false, message: err.message });
    }

    // Test 6: Status aggregation: single BLOCKED check blocks overall status
    try {
      const engine = ReadinessEngine.getInstance();
      engine.setOperatingMode('DEMONSTRATION');
      engine.runAllChecks();
      engine.setCheckOverride('CONFIG_VALIDITY', {
        check_id: 'CONFIG_VALIDITY',
        name: 'Config',
        category: 'SYSTEM',
        status: 'BLOCKED',
        message: 'Manual blocked test override',
        evidence: 'Simulated fault',
        is_mandatory: true,
        last_checked_at: Date.now() / 1000,
      });
      const verdict = engine.getOverallReadiness();
      const pass = verdict.overall_status === 'BLOCKED' && verdict.blocked_checks.includes('CONFIG_VALIDITY');
      engine.clearOverrides();
      results.push({
        name: '6. Overall verdict aggregation: single BLOCKED check blocks overall status',
        passed: pass,
        message: pass ? undefined : `Expected BLOCKED, got ${verdict.overall_status}`,
      });
    } catch (err: any) {
      results.push({ name: '6. Overall verdict aggregation: single BLOCKED check blocks overall status', passed: false, message: err.message });
    }

    // Test 7: Status aggregation: single DEGRADED check degrades overall status
    try {
      const engine = ReadinessEngine.getInstance();
      engine.setOperatingMode('DEMONSTRATION');
      engine.runAllChecks();
      engine.setCheckOverride('BE_API_CONNECTIVITY', {
        check_id: 'BE_API_CONNECTIVITY',
        name: 'Backend',
        category: 'SYSTEM',
        status: 'DEGRADED',
        message: 'Offline fallback',
        evidence: 'Port 8000 offline',
        is_mandatory: true,
        last_checked_at: Date.now() / 1000,
      });
      const verdict = engine.getOverallReadiness();
      const pass = verdict.overall_status === 'DEGRADED' && verdict.degraded_checks.includes('BE_API_CONNECTIVITY');
      engine.clearOverrides();
      results.push({
        name: '7. Overall verdict aggregation: single DEGRADED check yields DEGRADED',
        passed: pass,
        message: pass ? undefined : `Expected DEGRADED, got ${verdict.overall_status}`,
      });
    } catch (err: any) {
      results.push({ name: '7. Overall verdict aggregation: single DEGRADED check yields DEGRADED', passed: false, message: err.message });
    }

    // Test 8: Status aggregation: single UNKNOWN check yields UNKNOWN
    try {
      const engine = ReadinessEngine.getInstance();
      engine.setOperatingMode('DEMONSTRATION');
      engine.runAllChecks();
      engine.setCheckOverride('SENSOR_HEALTH', {
        check_id: 'SENSOR_HEALTH',
        name: 'Sensors',
        category: 'SENSORS',
        status: 'UNKNOWN',
        message: 'Missing sensor audit data',
        evidence: 'No telemetry log',
        is_mandatory: true,
        last_checked_at: Date.now() / 1000,
      });
      const verdict = engine.getOverallReadiness();
      const pass = verdict.overall_status === 'UNKNOWN' && verdict.unknown_checks.includes('SENSOR_HEALTH');
      engine.clearOverrides();
      results.push({
        name: '8. Strict non-masking: UNKNOWN check yields UNKNOWN overall verdict',
        passed: pass,
        message: pass ? undefined : `Expected UNKNOWN, got ${verdict.overall_status}`,
      });
    } catch (err: any) {
      results.push({ name: '8. Strict non-masking: UNKNOWN check yields UNKNOWN overall verdict', passed: false, message: err.message });
    }

    // Test 9: Telemetry freshness check: age > 60s triggers DEGRADED
    try {
      const engine = ReadinessEngine.getInstance();
      const staleChecks = engine.runAllChecks({ telemetryAgeSec: 120.0 });
      const item = staleChecks.get('TELEMETRY_FRESHNESS');
      const pass = item?.status === 'DEGRADED' && Boolean(item.failure_reason);
      engine.clearOverrides();
      results.push({
        name: '9. Stale telemetry detection: age > 60s marks check DEGRADED',
        passed: pass,
        message: pass ? undefined : `Expected DEGRADED for stale telemetry, got ${item?.status}`,
      });
    } catch (err: any) {
      results.push({ name: '9. Stale telemetry detection: age > 60s marks check DEGRADED', passed: false, message: err.message });
    }

    // Test 10: ScenarioCatalog contains 10 standardized scenarios
    try {
      const runner = ScenarioTestRunner.getInstance();
      const catalog = runner.getCatalog();
      const pass =
        catalog.length === 10 &&
        catalog.every((s) => s.id.startsWith('SCENARIO-') && s.version === '1.0' && s.assertionCount >= 2);
      results.push({
        name: '10. ScenarioCatalog contains 10 verified test scenarios',
        passed: pass,
        message: pass ? undefined : `Expected 10 scenarios with version 1.0, got ${catalog.length}`,
      });
    } catch (err: any) {
      results.push({ name: '10. ScenarioCatalog contains 10 verified test scenarios', passed: false, message: err.message });
    }

    // Test 11: ScenarioTestRunner executes isolated test without mutating external state
    try {
      const runner = ScenarioTestRunner.getInstance();
      runner.clearHistory();
      const rec = runner.runScenario('SCENARIO-02-RIP-INTENSIFICATION');
      const pass =
        rec.scenario_id === 'SCENARIO-02-RIP-INTENSIFICATION' &&
        rec.status === 'PASSED' &&
        rec.assertions.length >= 2 &&
        rec.duration_ms > 0 &&
        rec.provenance === 'CONTROLLED_TEST';
      results.push({
        name: '11. ScenarioTestRunner executes isolated test with verified assertions',
        passed: pass,
        message: pass ? undefined : `Scenario run failed: status=${rec.status}`,
      });
    } catch (err: any) {
      results.push({ name: '11. ScenarioTestRunner executes isolated test with verified assertions', passed: false, message: err.message });
    }

    // Test 12: EvaluationMetrics calculates Golden Window and detection latencies
    try {
      const metricsEngine = EvaluationMetrics.getInstance();
      const metrics = metricsEngine.getStandardMetrics();
      const goldenWindow = metrics.find((m) => m.metric_id === 'METRIC-TIME-TO-ASSISTANCE');
      const hazardLat = metrics.find((m) => m.metric_id === 'METRIC-HAZARD-LATENCY');
      const pass =
        metrics.length === 6 &&
        goldenWindow !== undefined &&
        goldenWindow.observed_value! <= 180.0 &&
        goldenWindow.passed &&
        hazardLat !== undefined &&
        hazardLat.observed_value! <= 3.0 &&
        hazardLat.passed;
      results.push({
        name: '12. EvaluationMetrics calculates Golden Window (<180s) and detection latencies',
        passed: pass,
        message: pass ? undefined : 'Metrics missing or Golden Window threshold exceeded',
      });
    } catch (err: any) {
      results.push({ name: '12. EvaluationMetrics calculates Golden Window (<180s) and detection latencies', passed: false, message: err.message });
    }

    // Test 13: Forecast MAE calculation strictly prevents future data leakage
    try {
      const metricsEngine = EvaluationMetrics.getInstance();
      const now = 1000;
      const forecasts = [
        { targetTimestamp: 800, predicted: 1.5 },   // In the past relative to cutoff (valid)
        { targetTimestamp: 900, predicted: 1.6 },   // In the past relative to cutoff (valid)
        { targetTimestamp: 1200, predicted: 2.5 },  // In the future relative to cutoff (MUST BE EXCLUDED)
      ];
      const observations = [
        { timestamp: 800, observed: 1.4 },
        { timestamp: 900, observed: 1.8 },
        { timestamp: 1200, observed: 2.0 },
      ];

      const res = metricsEngine.calculateForecastMAE(forecasts, observations, now);
      // Valid pairs: |1.5 - 1.4| = 0.1, |1.6 - 1.8| = 0.2. MAE = (0.1 + 0.2) / 2 = 0.15, samples = 2
      const pass = res !== null && res.sampleCount === 2 && Math.abs(res.mae - 0.15) < 0.001;
      results.push({
        name: '13. Forecast MAE strictly avoids future data leakage (sampleCount=2, MAE=0.15m)',
        passed: pass,
        message: pass ? undefined : `Expected sampleCount=2, MAE=0.15, got count=${res?.sampleCount}, MAE=${res?.mae}`,
      });
    } catch (err: any) {
      results.push({ name: '13. Forecast MAE strictly avoids future data leakage', passed: false, message: err.message });
    }

    // Test 14: EvidenceReport generates valid JSON report with provenance and safeguards
    try {
      const reportGen = EvidenceReport.getInstance();
      const rep = reportGen.generateJsonReport();
      const pass =
        rep.report_id.startsWith('TIDES-EVIDENCE-RUSHIKONDA-') &&
        rep.pilot_site.site_id === 'RUSHIKONDA' &&
        rep.readiness_checks.length === 10 &&
        rep.data_provenance_summary.default_provenance === 'CONTROLLED_TEST' &&
        rep.limitations_and_safeguards.length >= 4;
      results.push({
        name: '14. EvidenceReport exports valid JSON with provenance and operational safeguards',
        passed: pass,
        message: pass ? undefined : 'JSON report missing required provenance or safeguards fields',
      });
    } catch (err: any) {
      results.push({ name: '14. EvidenceReport exports valid JSON with provenance and operational safeguards', passed: false, message: err.message });
    }

    // Test 15: EvidenceReport generates Markdown summary with tables and alerts
    try {
      const reportGen = EvidenceReport.getInstance();
      const md = reportGen.generateMarkdownSummary();
      const pass =
        md.includes('# TIDES Pilot Evidence & Operational Readiness Report') &&
        md.includes('Operational Readiness Verdict') &&
        md.includes('Repeatable Safety Test Scenarios') &&
        md.includes('Evidence-Based Performance Metrics') &&
        md.includes('> [!IMPORTANT]') &&
        md.includes('CONTROLLED_TEST');
      results.push({
        name: '15. EvidenceReport generates Markdown summary with tables and alert blocks',
        passed: pass,
        message: pass ? undefined : 'Markdown summary missing required headings or alert blocks',
      });
    } catch (err: any) {
      results.push({ name: '15. EvidenceReport generates Markdown summary with tables and alert blocks', passed: false, message: err.message });
    }

    return results;
  }
}

