/**
 * src/resilience/resilience.types.ts
 * 
 * TIDES — Phase 10: Resilience, Fault Tolerance & Disaster Recovery
 * 
 * Technical contracts and type definitions for:
 * - Component health monitoring (6 explicit states)
 * - Failure domain classifications and boundaries
 * - Bounded retries, exponential backoff, and idempotent event processing
 * - Bounded offline event buffering and chronological reconciliation
 * - Explicit degraded modes and non-negotiable safety invariant enforcement
 * - Disaster recovery checkpoints, cryptographic integrity, and isolated restoration
 * - Controlled fault-injection test scenarios and security gating
 */

// ============================================================================
// 1. Health Monitoring & Failure Domains
// ============================================================================

export type ComponentHealthStatus =
  | 'HEALTHY'      // Component operating within nominal latency & error parameters
  | 'DEGRADED'     // Component operational but exhibiting jitter, partial loss, or high latency
  | 'OFFLINE'      // Component unreachable or unconfirmed for longer than timeout horizon
  | 'STALE'        // Telemetry received but older than freshness horizon
  | 'RECOVERING'   // Component reconnected; undergoing hysteresis recovery verification
  | 'UNKNOWN';     // Insufficient observations or uninstrumented (never presumed safe)

export type FailureDomain =
  | 'SENSOR_TELEMETRY'   // Wave buoys, AWS stations, tide gauges, ADCP profilers
  | 'WRISTBAND_GATEWAY'  // LoRa gateways, RF transceivers, swimmer bands
  | 'CAMERA_VISION'      // CV surveillance cameras, optical stream ingest
  | 'DRONE_AERIAL'       // Autonomous UAVs, flight controllers, aerial comms
  | 'SITE_LOCAL'         // Local beach command nodes, local simulation engines
  | 'PREDICTIVE_AI'      // ML forecasting models, hydrodynamic inference engines
  | 'BACKEND_PIPELINE'   // Central ingestion event bus, synchronization pipelines
  | 'PERSISTENCE_STORE'; // Database, checkpoint cache, audit trail stores

export interface HealthCheckRecord {
  componentId: string;
  componentName: string;
  domain: FailureDomain;
  siteId: string;
  status: ComponentHealthStatus;
  lastHeartbeatMs: number;
  latencyMs: number | null;
  failureReason?: string;
  consecutiveFailures: number;
  consecutiveRecoveries: number;
  metrics: {
    packetLossPercent?: number;
    errorRatePercent?: number;
    queueDepth?: number;
    staleAgeSeconds?: number;
    clockDriftMs?: number;
    custom?: Record<string, any>;
  };
  lastStatusChangeMs: number;
}

// ============================================================================
// 2. Reliable Event Processing & Bounded Retries
// ============================================================================

export type ProcessingStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'RETRYING'
  | 'FAILED_PERMANENT'     // Placed into Dead Letter Queue
  | 'DUPLICATE_IGNORED';

export type ErrorSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export type ErrorCategory =
  | 'COMMUNICATION_TIMEOUT'
  | 'PAYLOAD_MALFORMED'
  | 'VALIDATION_OUTLIER'
  | 'PERSISTENCE_FAILURE'
  | 'AUTHENTICATION_REJECTION'
  | 'HARDWARE_DISCONNECT'
  | 'RETRY_EXHAUSTED'
  | 'DANGEROUS_ACTION_BLOCKED';

export interface RetryPolicyConfig {
  maxRetries: number;          // Default 3
  initialBackoffMs: number;    // Default 1000ms
  maxBackoffMs: number;        // Default 10000ms
  backoffMultiplier: number;   // Default 2.0
  jitter: boolean;             // Adds +/- 15% random jitter
}

export interface IdempotentEventRecord<T = any> {
  eventId: string;
  correlationId: string;
  siteId: string;
  domain: FailureDomain;
  eventType: string;
  payload: T;
  sourceTimestamp: number;
  receivedTimestamp: number;
  processedTimestamp?: number;
  processingStatus: ProcessingStatus;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  errorCategory?: ErrorCategory;
  isDangerousExternalAction: boolean; // True for real drone dispatch, siren activation, etc.
  idempotencyKey: string;
}

// ============================================================================
// 3. Offline Event Buffering & Reconnection
// ============================================================================

export interface OfflineBufferRecord<T = any> {
  bufferId: string;
  sourceId: string;
  siteId: string;
  domain: FailureDomain;
  event: IdempotentEventRecord<T>;
  bufferedAtMs: number;
  expiryMs?: number;
  priority: 'CRITICAL_SOS' | 'HIGH_ALERT' | 'NORMAL_TELEMETRY' | 'LOW_AUDIT';
}

export interface ReconnectionFlushResult {
  siteId: string;
  sourceId: string;
  totalBuffered: number;
  flushedCount: number;
  duplicateCount: number;
  outOfOrderCount: number;
  failedCount: number;
  durationMs: number;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
}

// ============================================================================
// 4. Safe Degraded Operation & Safety Guardrails
// ============================================================================

export interface DegradedModeRecord {
  domain: FailureDomain;
  componentId: string;
  isDegraded: boolean;
  degradationReason: string;
  fallbackAction: string;
  activeSinceMs: number;
  safetyInvariantsPreserved: {
    confirmedSosNeverSuppressed: boolean;
    safetyThresholdsUnlowered: boolean;
    zeroFabricatedCoordinates: boolean;
    zeroAutomatedPhysicalDispatch: boolean;
  };
}

// ============================================================================
// 5. Data Integrity, Backup & Disaster Recovery
// ============================================================================

export interface RecoveryObjectives {
  rpoSeconds: number; // Recovery Point Objective (e.g. 10s)
  rtoSeconds: number; // Recovery Time Objective (e.g. 15s local, 45s regional)
  criticalFunctionsRestorationOrder: string[];
  requiredPreRestorationDependencies: string[];
}

export interface DisasterRecoveryCheckpoint {
  checkpointId: string;
  schemaVersion: string; // e.g. "v1.0.0"
  createdAtMs: number;
  sourceSiteId: string;
  checksum: string;      // Cryptographic hash or CRC32 of serialized data
  recordCounts: {
    incidents: number;
    wristbands: number;
    warnings: number;
    gateways: number;
    calibrationCertificates: number;
    digitalTwinObservations: number;
    auditLogs: number;
  };
  data: {
    incidents: any[];
    wristbands: any[];
    warnings: any[];
    gateways: any[];
    calibrationRecords: any[];
    observations: any[];
    auditLogs: any[];
    configuration: Record<string, any>;
  };
  verified: boolean;
  verificationTimestampMs?: number;
  operatorId: string;
}

export interface RestorationVerificationResult {
  checkpointId: string;
  testedAtMs: number;
  durationMs: number;
  integrityPassed: boolean;
  schemaCompatible: boolean;
  restoredRecordCounts: Record<string, number>;
  expectedRecordCounts: Record<string, number>;
  inconsistenciesDetected: string[];
  isolatedSandboxOnly: boolean; // Guarantees production was not mutated
  outcome: 'RESTORATION_VERIFIED' | 'INTEGRITY_MISMATCH' | 'SCHEMA_INCOMPATIBLE';
}

// ============================================================================
// 6. Controlled Fault Injection Testing
// ============================================================================

export type FaultInjectionScenarioType =
  | 'GATEWAY_DISCONNECT'
  | 'CAMERA_FEED_CUT'
  | 'STALE_DRONE_TELEMETRY'
  | 'DELAYED_EVENT_STREAM'
  | 'DUPLICATE_EVENT_BURST'
  | 'OUT_OF_ORDER_PACKETS'
  | 'BACKEND_TIMEOUT'
  | 'DATABASE_UNAVAILABLE'
  | 'MISSING_WARNING_ACK'
  | 'INTERRUPTED_SYNC'
  | 'MALFORMED_PAYLOAD'
  | 'SERVICE_RESTART'
  | 'RECOVERY_DRILL';

export interface FaultInjectionScenario {
  scenarioId: string;
  type: FaultInjectionScenarioType;
  name: string;
  domain: FailureDomain;
  targetComponentId: string;
  description: string;
  testModeOnly: boolean; // Enforced security guardrail: strictly blocked in production
  active: boolean;
  injectedAtMs?: number;
  preconditions: string[];
  expectedBehavior: string;
  actualBehavior?: string;
  recoveryOutcome?: string;
  dataIntegrityVerified?: boolean;
  durationMs?: number;
  status: 'NOT_RUN' | 'RUNNING' | 'PASSED' | 'FAILED' | 'BLOCKED';
}

// ============================================================================
// 7. Operational Audit & Recovery Timeline
// ============================================================================

export interface ResilienceAuditEntry {
  auditId: string;
  timestamp: number;
  operatorId: string;
  action:
    | 'TRIGGER_HEALTH_CHECK'
    | 'MANUAL_COMPONENT_FAILOVER'
    | 'EXECUTE_BOUNDED_RETRY'
    | 'FLUSH_OFFLINE_BUFFER'
    | 'ENTER_DEGRADED_MODE'
    | 'EXIT_DEGRADED_MODE'
    | 'CREATE_DISASTER_CHECKPOINT'
    | 'VERIFY_CHECKPOINT_INTEGRITY'
    | 'RUN_ISOLATED_RESTORATION_TEST'
    | 'EXECUTE_FAULT_INJECTION_SCENARIO'
    | 'CLEAR_FAULT_INJECTION';
  targetComponentId: string;
  siteId: string;
  details: string;
  outcome: 'SUCCESS' | 'WARNING' | 'FAILURE' | 'REJECTED';
}

