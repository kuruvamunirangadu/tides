/**
 * src/operations/EvidenceReport.ts
 * Reproducible Pilot Evidence Report Generator for TIDES Milestone 11.
 * Formats operational readiness assessments, scenario runs, and latency metrics
 * into standardized JSON and Markdown reports with explicit data provenance.
 */

import { ReadinessEngine } from './ReadinessEngine';
import { ScenarioTestRunner } from './ScenarioTestRunner';
import { EvaluationMetrics } from './EvaluationMetrics';
import { ScenarioRunRecord, EvaluationMetricRecord, OverallReadinessVerdict } from './types';

export interface PilotEvidenceReportJSON {
  report_id: string;
  title: string;
  generation_timestamp: number;
  iso_time: string;
  pilot_site: {
    site_id: string;
    name: string;
    coordinates: { latitude: number; longitude: number };
    operating_mode: string;
    supervisor_role: string;
  };
  overall_readiness: {
    verdict: string;
    summary: string;
    total_checks: number;
    passed_checks: number;
    blocked_checks: string[];
    degraded_checks: string[];
    unknown_checks: string[];
  };
  readiness_checks: any[];
  scenario_evaluation: {
    total_executed: number;
    passed_count: number;
    failed_count: number;
    inconclusive_count: number;
    results: ScenarioRunRecord[];
  };
  evidence_metrics: EvaluationMetricRecord[];
  data_provenance_summary: {
    telemetry_source: string;
    default_provenance: string;
    field_validated_status: string;
    field_validation_note: string;
  };
  limitations_and_safeguards: string[];
}

export class EvidenceReport {
  private static instance: EvidenceReport | null = null;

  private constructor() {}

  public static getInstance(): EvidenceReport {
    if (!EvidenceReport.instance) {
      EvidenceReport.instance = new EvidenceReport();
    }
    return EvidenceReport.instance;
  }

  /**
   * Generate comprehensive JSON report structure.
   */
  public generateJsonReport(): PilotEvidenceReportJSON {
    const engine = ReadinessEngine.getInstance();
    const runner = ScenarioTestRunner.getInstance();
    const metricsEngine = EvaluationMetrics.getInstance();

    const readiness: OverallReadinessVerdict = engine.getOverallReadiness();
    let scenarios = runner.getRunHistory();
    if (scenarios.length === 0) {
      scenarios = runner.runAllScenarios();
    }
    const metrics = metricsEngine.getStandardMetrics();
    const now = Date.now() / 1000;
    const config = engine.getConfig();

    return {
      report_id: `TIDES-EVIDENCE-RUSHIKONDA-${Math.floor(now)}`,
      title: 'TIDES Coastal Safety Digital Twin — Pilot Evidence & Operational Readiness Report',
      generation_timestamp: now,
      iso_time: new Date(now * 1000).toISOString(),
      pilot_site: {
        site_id: config.pilot_site_id,
        name: config.site_name,
        coordinates: { latitude: 17.7815, longitude: 83.3855 },
        operating_mode: engine.getOperatingMode(),
        supervisor_role: config.supervisor_role,
      },
      overall_readiness: {
        verdict: readiness.overall_status,
        summary: readiness.summary,
        total_checks: readiness.total_checks,
        passed_checks: readiness.passed_checks,
        blocked_checks: readiness.blocked_checks,
        degraded_checks: readiness.degraded_checks,
        unknown_checks: readiness.unknown_checks,
      },
      readiness_checks: readiness.checks,
      scenario_evaluation: {
        total_executed: scenarios.length,
        passed_count: scenarios.filter((s) => s.status === 'PASSED').length,
        failed_count: scenarios.filter((s) => s.status === 'FAILED').length,
        inconclusive_count: scenarios.filter((s) => s.status === 'INCONCLUSIVE').length,
        results: scenarios,
      },
      evidence_metrics: metrics,
      data_provenance_summary: {
        telemetry_source: 'TIDES 3D Hydrodynamic & Sensor Fusion Digital Twin',
        default_provenance: 'CONTROLLED_TEST',
        field_validated_status: 'PENDING_PHYSICAL_TRIAL',
        field_validation_note:
          'FIELD_VALIDATED designation requires signed correlation with physical lifeguard tower observation logs during deployed pilot.',
      },
      limitations_and_safeguards: [
        'System is a decision-support advisory digital twin and does NOT replace trained lifeguards or emergency services.',
        'Automated cross-beach craft dispatch is strictly disabled; requires human operations commander sign-off.',
        'Demonstration sites (RK Beach, Bheemili, etc.) are isolated and do not claim live coastal sensor coverage.',
        'Weather and wave forecast evaluation strictly avoids future data leakage.',
      ],
    };
  }

  /**
   * Generate human-readable Markdown summary report.
   */
  public generateMarkdownSummary(): string {
    const rep = this.generateJsonReport();
    const readiness = rep.overall_readiness;

    let md = `# TIDES Pilot Evidence & Operational Readiness Report\n`;
    md += `**Report ID**: \`${rep.report_id}\`  \n`;
    md += `**Date**: ${rep.iso_time}  \n`;
    md += `**Pilot Site**: ${rep.pilot_site.name} (\`${rep.pilot_site.site_id}\`)  \n`;
    md += `**Operating Mode**: \`${rep.pilot_site.operating_mode}\`  \n\n`;
    md += `---\n\n`;

    md += `### 1. Operational Readiness Verdict\n`;
    md += `- **Overall Verdict**: **\`${readiness.verdict}\`**\n`;
    md += `- **Status Summary**: ${readiness.summary}\n`;
    md += `- **Passed Checks**: ${readiness.passed_checks} / ${readiness.total_checks}\n\n`;
    md += `---\n\n`;

    md += `### 2. Repeatable Safety Test Scenarios\n`;
    md += `- **Total Scenarios Executed**: ${rep.scenario_evaluation.total_executed}\n`;
    md += `- **Pass Rate**: ${rep.scenario_evaluation.passed_count} / ${rep.scenario_evaluation.total_executed} (${(
      (rep.scenario_evaluation.passed_count / Math.max(rep.scenario_evaluation.total_executed, 1)) *
      100
    ).toFixed(1)}%)\n\n`;

    md += `| Scenario ID | Name | Duration | Status | Provenance |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;
    for (const s of rep.scenario_evaluation.results) {
      md += `| \`${s.scenario_id}\` | ${s.scenario_name} | ${s.duration_ms.toFixed(1)} ms | **${s.status}** | \`${s.provenance}\` |\n`;
    }

    md += `\n---\n\n`;
    md += `### 3. Evidence-Based Performance Metrics\n\n`;
    md += `| Metric | Category | Observed | Target | Status | Definition |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    for (const m of rep.evidence_metrics) {
      const statusText = m.passed ? 'PASS' : 'FAIL';
      md += `| **${m.name}** | \`${m.category}\` | ${m.observed_value} ${m.unit} | &le; ${m.target_threshold} ${m.unit} | **${statusText}** | ${m.definition} |\n`;
    }

    md += `\n---\n\n`;
    md += `### 4. Provenance & Operational Safeguards\n`;
    md += `> [!IMPORTANT]\n`;
    md += `> **Advisory Nature**: TIDES operates strictly as a decision-support copilot for certified beach safety authorities. It does not replace physical lifeguards or established emergency protocols.\n\n`;
    md += `- **Data Provenance**: \`CONTROLLED_TEST\`\n`;
    md += `- **Field Validation Status**: \`PENDING_PHYSICAL_TRIAL\`\n`;

    return md;
  }

  /**
   * Helper to download JSON in the browser.
   */
  public downloadJSON(filename = 'tides-pilot-evidence-rushikonda.json'): void {
    if (typeof window === 'undefined') return;
    const jsonStr = JSON.stringify(this.generateJsonReport(), null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Helper to download Markdown in the browser.
   */
  public downloadMarkdown(filename = 'tides-pilot-evidence-rushikonda.md'): void {
    if (typeof window === 'undefined') return;
    const mdStr = this.generateMarkdownSummary();
    const blob = new Blob([mdStr], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

