/**
 * src/operations/types.ts
 * TypeScript type definitions for TIDES Milestone 11:
 * Operational Readiness, Field-Pilot Mode & Evidence-Based Evaluation.
 */

export type OperatingMode = 'DEVELOPMENT' | 'DEMONSTRATION' | 'CONTROLLED_PILOT';

export type ReadinessStatus = 'READY' | 'DEGRADED' | 'BLOCKED' | 'UNKNOWN';

export type DataProvenance = 'SIMULATION' | 'CONTROLLED_TEST' | 'FIELD_OBSERVATION' | 'FIELD_VALIDATED';

export interface ReadinessCheckItem {
  check_id: string;
  name: string;
  category: 'SYSTEM' | 'TELEMETRY' | 'SENSORS' | 'INCIDENTS' | 'FLEET' | 'SCENARIOS' | 'PILOT_SAFEGUARDS';
  status: ReadinessStatus;
  message: string;
  evidence: string;
  failure_reason?: string | null;
  is_mandatory: boolean;
  last_checked_at: number;
}

export interface ScenarioAssertionResult {
  assertion_id: string;
  description: string;
  expected: string;
  actual: string;
  passed: boolean;
  notes?: string | null;
}

export interface ScenarioRunRecord {
  run_id: string;
  scenario_id: string;
  scenario_name: string;
  scenario_version: string;
  status: 'PASSED' | 'FAILED' | 'BLOCKED' | 'INCONCLUSIVE';
  duration_ms: number;
  started_at: number;
  completed_at: number;
  assertions: ScenarioAssertionResult[];
  evidence_collected: Record<string, any>;
  failure_explanation?: string | null;
  provenance: DataProvenance;
}

export interface EvaluationMetricRecord {
  metric_id: string;
  name: string;
  category: 'LATENCY' | 'ACCURACY' | 'RELIABILITY' | 'COMPLIANCE';
  unit: string;
  observed_value: number | null;
  target_threshold: number;
  passed: boolean;
  definition: string;
  start_event: string;
  end_event: string;
  sample_count: number;
  provenance: DataProvenance;
}

export interface PilotConfiguration {
  config_version: string;
  pilot_site_id: string;
  site_name: string;
  operating_mode: OperatingMode;
  enabled_data_sources: string[];
  sensor_inventory: Array<{
    id: string;
    type: string;
    station: string;
  }>;
  update_intervals_sec: Record<string, number>;
  supervisor_role: string;
  supervisor_confirmed: boolean;
  data_retention_days: number;
  auto_tune_hazards_enabled: boolean;
}

export interface OverallReadinessVerdict {
  operating_mode: OperatingMode;
  overall_status: ReadinessStatus;
  summary: string;
  total_checks: number;
  passed_checks: number;
  blocked_checks: string[];
  degraded_checks: string[];
  unknown_checks: string[];
  checks: ReadinessCheckItem[];
  timestamp: number;
}

