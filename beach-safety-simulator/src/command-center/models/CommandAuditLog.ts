export type AuditEventCategory =
  | 'HAZARD'
  | 'RISK'
  | 'INCIDENT'
  | 'OPERATOR_DECISION'
  | 'RESOURCE_DISPATCH'
  | 'SENSOR_TELEMETRY'
  | 'DRONE_MISSION'
  | 'SYSTEM_FAILSAFE';

export interface CommandAuditEntry {
  id: string;
  timestamp: number;
  timeDisplay: string;
  beachId: string;
  beachName: string;
  category: AuditEventCategory;
  severity: 'INFO' | 'WARNING' | 'ALERT' | 'CRITICAL';
  actor: string; // e.g. "SAFETY_ENGINE", "OPERATOR_01", "CCTV_CV_ENGINE", "UAV_01"
  summary: string;
  causalChain?: string[]; // Step-by-step causal trace leading to this event
  metadata?: Record<string, unknown>;
}
