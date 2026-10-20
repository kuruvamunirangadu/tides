/**
 * pilot.types.ts
 * 
 * TIDES Phase 5: Controlled Field Pilot & Real-World Validation Framework
 * 
 * Defines formal contracts for:
 * - Pilot Sessions (Metadata, Type, Lifecycle, Device bindings)
 * - Device Readiness & Preflight Checklists (Wristband, Gateway, Camera, Drone)
 * - Test Scenario Definitions (Prerequisites, Steps, Safety Classifications, Pass/Fail)
 * - End-to-End Event Traceability Chains & Correlation
 * - Performance Metrics (Numerators, Denominators, Sample Sizes, Sim vs Hardware)
 * - Communication & Environmental Validation Records
 * - Fail-Safe Procedures & Safety Disclaimers
 */

export type SessionType =
  | 'SIMULATION'
  | 'BENCH_TEST'
  | 'CONTROLLED_FIELD_DRILL'
  | 'APPROVED_FIELD_EVALUATION';

export type SessionStatus =
  | 'PLANNED'
  | 'READY_FOR_TESTING'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED';

export type DeviceCategory = 'WRISTBAND' | 'GATEWAY' | 'CAMERA' | 'DRONE';

export type CheckStatus = 'PASSED' | 'FAILED' | 'NOT_TESTED' | 'NOT_APPLICABLE';

export type SafetyClassification =
  | 'SAFE_BENCH'
  | 'LOW_RISK_CONTROLLED'
  | 'FAILURE_INJECTION_SYNTHETIC'
  | 'SUPERVISED_FIELD';

export type ScenarioStatus =
  | 'QUEUED'
  | 'IN_PROGRESS'
  | 'PASSED'
  | 'FAILED'
  | 'BLOCKED'
  | 'INCONCLUSIVE';

export type ProvenanceMode = 'SIMULATED' | 'HARDWARE' | 'HYBRID_CONTROLLED';

/**
 * Individual Device Readiness Check Item
 */
export interface DeviceReadinessCheck {
  checkId: string;
  category: DeviceCategory;
  name: string;
  description: string;
  isSafetyCritical: boolean;
  status: CheckStatus;
  assessedAtMs?: number;
  assessedBy?: string;
  notes?: string;
  evidenceReference?: string;
}

/**
 * Device Readiness Checklist Dossier
 */
export interface DeviceReadinessDossier {
  deviceId: string;
  deviceCategory: DeviceCategory;
  modelName: string;
  provenance: 'SIMULATED' | 'HARDWARE';
  overallStatus: 'READY' | 'NOT_READY' | 'BLOCKED';
  checks: DeviceReadinessCheck[];
  lastUpdatedMs: number;
}

/**
 * Test Scenario Definition in the Library
 */
export interface TestScenarioDefinition {
  scenarioId: string;
  code: string; // e.g. "SCN-01"
  name: string;
  description: string;
  safetyClassification: SafetyClassification;
  prerequisites: string[];
  testSteps: string[];
  expectedResult: string;
  passCriteria: string[];
  timeoutSeconds: number;
  allowedProvenance: ProvenanceMode[];
}

/**
 * Executed Test Scenario Run Record
 */
export interface ScenarioExecutionRecord {
  executionId: string;
  scenarioId: string;
  code: string;
  name: string;
  sessionId: string;
  provenance: ProvenanceMode;
  status: ScenarioStatus;
  startedAtMs: number;
  completedAtMs?: number;
  durationMs?: number;
  expectedResult: string;
  actualResult: string;
  evaluationNotes: string[];
  failureReason?: string;
  traceCorrelationId?: string;
  assessedBy: string;
}

/**
 * Traceable Event Chain Stage
 */
export type TraceStage =
  | 'EVENT_GENERATED'
  | 'BACKEND_RECEIVED'
  | 'INCIDENT_ASSOCIATED'
  | 'OPERATOR_VERIFIED'
  | 'WARNING_REQUESTED'
  | 'GATEWAY_QUEUED'
  | 'DEVICE_ACKNOWLEDGED'
  | 'PHYSICAL_RESPONSE_OBSERVED';

export type TraceStageStatus = 'OBSERVED' | 'UNOBSERVED' | 'SKIPPED' | 'FAILED';

export interface TraceChainStep {
  stage: TraceStage;
  status: TraceStageStatus;
  timestampMs?: number;
  sourceId: string;
  details: string;
  latencyFromPreviousMs?: number;
  rawPayloadSnippet?: string;
}

/**
 * End-to-End Traceable Event Record
 */
export interface TraceableEventChain {
  correlationId: string;
  sessionId: string;
  eventType: 'SOS_TRIGGER' | 'CAMERA_DETECTION' | 'DRONE_SIGHTING' | 'MANUAL_DISPATCH';
  provenance: ProvenanceMode;
  sourceDeviceId: string;
  initiatedAtMs: number;
  completedAtMs?: number;
  totalLatencyMs?: number;
  steps: TraceChainStep[];
  outcome: 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'INCONCLUSIVE';
}

/**
 * Single Performance Metric with Full Transparency
 */
export interface MetricEvaluation {
  metricId: string;
  name: string;
  category: 'LATENCY' | 'RELIABILITY' | 'DELIVERY' | 'COVERAGE' | 'AVAILABILITY';
  provenance: 'SIMULATED' | 'HARDWARE' | 'COMBINED' | 'HYBRID_CONTROLLED';
  measuredValue: number;
  unit: 'ms' | '%' | 'count' | 'ratio';
  numerator?: number;
  denominator?: number;
  sampleSize: number;
  observationWindowMs: number;
  measurementSource: string;
  thresholdAcceptable?: number;
  isAcceptable: boolean;
  notes?: string;
}

/**
 * Environmental and Communication Test Record
 */
export interface EnvironmentalValidationRecord {
  recordId: string;
  testCategory:
    | 'RADIO_RANGE_MEASURED'
    | 'LINE_OF_SIGHT_VS_OBSTRUCTED'
    | 'WET_DEVICE_OPERATION'
    | 'SALTWATER_CORROSION_INSPECTION'
    | 'ENCLOSURE_INGRESS_IP68'
    | 'BATTERY_ENDURANCE_HOURS'
    | 'SIGNAL_LOSS_RECONNECTION'
    | 'GPS_ACCURACY_METERS'
    | 'CLOCK_DRIFT_PPM'
    | 'VIBRATION_LED_VISIBILITY';
  procedureDocumented: string;
  equipmentUsed: string;
  environmentalConditions: {
    ambientTempC: number;
    humidityPercent: number;
    salinityPpt?: number;
    weatherCondition: string;
  };
  measuredValue: number;
  measurementUnit: string;
  resultStatus: 'PASS' | 'FAIL' | 'INCONCLUSIVE';
  evidenceReferences: string[];
  qualifiedAssessor: string;
  testLimitations: string;
  disclaimer: string;
  timestampMs: number;
}

/**
 * Documented Incident Response & Fail-Safe Procedure
 */
export interface FailSafeProcedure {
  failureCode: string;
  title: string;
  triggerCondition: string;
  immediateAction: string;
  escalationProcedure: string;
  backupRescueChannel: string;
  verificationStep: string;
}

/**
 * Authoritative Pilot Session Dossier
 */
export interface PilotSession {
  sessionId: string;
  name: string;
  description: string;
  testLocation: string;
  sessionType: SessionType;
  provenanceMode: ProvenanceMode;
  status: SessionStatus;
  plannedStartTimeMs: number;
  plannedEndTimeMs: number;
  actualStartTimeMs?: number;
  actualEndTimeMs?: number;
  leadOperatorId: string;
  safetySupervisorId: string;
  participatingCameraIds: string[];
  participatingDroneIds: string[];
  participatingWristbandIds: string[];
  participatingGatewayIds: string[];
  scenarioIds: string[];
  executedScenarioIds: string[];
  traceCorrelationIds: string[];
  readinessDossierIds: string[];
  environmentalRecordIds: string[];
  sessionNotes: string[];
  timeline: Array<{
    timestampMs: number;
    action: string;
    operatorId: string;
    details: string;
  }>;
}
