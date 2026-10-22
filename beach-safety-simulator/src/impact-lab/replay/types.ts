/**
 * types.ts
 * 
 * TIDES Stage 3: Incident Replay & Response Analytics Types (Demo C)
 * 
 * Strict specifications:
 * - 8 Canonical Lifecycle Stages
 * - Separate measured facts from estimates
 * - Explicit missing-stage handling (zero synthetic fabrication)
 * - Validation error tracking for out-of-order and duplicate timestamps
 */

export type ReplayLifecycleEventType =
  | 'HAZARD_OBSERVED'
  | 'DISTRESS_DETECTED'
  | 'ALERT_BROADCAST'
  | 'RESPONDER_ASSIGNED'
  | 'RESPONDER_DEPARTED'
  | 'RESPONDER_ARRIVED'
  | 'ASSISTANCE_BEGAN'
  | 'INCIDENT_RESOLVED'
  | 'BEHAVIOR_ANOMALY'
  | 'WRISTBAND_TELEMETRY'
  | 'RISK_WARNING'
  | 'DRONE_PATROL_CREATED'
  | 'OPERATOR_ACTION';

export interface ReplayLifecycleEvent {
  eventId: string;
  incidentId: string;
  simTimeSeconds: number;
  timeDisplay: string;
  wallClockTimestamp: number;
  eventType: ReplayLifecycleEventType;
  sourceComponent:
    | 'HAZARD_ENGINE'
    | 'VISITOR_ENGINE'
    | 'VISION_ENGINE'
    | 'DECISION_ENGINE'
    | 'EMERGENCY_DISPATCH'
    | 'RESCUE_MANAGER'
    | 'DRONE_MANAGER'
    | 'BEHAVIOR_ANALYZER'
    | 'WRISTBAND'
    | 'FORECAST_ENGINE'
    | 'OPERATOR_AUDIT';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  description: string;
  isRecordedFact: boolean;          // TRUE if directly recorded from simulation; FALSE if estimated
  isEstimated?: boolean;
  responderId?: string;
  responderName?: string;
  responderType?: string;
  visitorId?: string;
  zoneId?: string;
  coordinates?: { x: number; y: number };
  metadata?: Record<string, any>;
}

export interface ResponderBreadcrumb {
  simTimeSeconds: number;
  position: { x: number; y: number };
  status?: string;
  speed?: number;
}

export interface ResponderTrackingInfo {
  id: string;
  name: string;
  type: string;
  status: string;
  currentSpeed: number;
  position: { x: number; y: number };
  targetPosition?: { x: number; y: number };
  distanceToTargetMeters?: number;
  trajectory?: ResponderBreadcrumb[];
}

export interface ReplayableIncidentDossier {
  incidentId: string;
  title: string;
  severity: 'MODERATE' | 'HIGH' | 'CRITICAL';
  zoneId: string;
  victimId?: string;
  victimState?: string;
  victimFatigue?: number;
  onsetSimTime: number;
  onsetWallClock: number;
  startTimeDisplay: string;
  endTimeDisplay?: string;
  status:
    | 'DETECTED'
    | 'ASSESSED'
    | 'DISPATCHING'
    | 'RESOURCES_EN_ROUTE'
    | 'ON_SCENE'
    | 'RESCUE_IN_PROGRESS'
    | 'PERSON_SECURED'
    | 'MEDICAL_ASSESSMENT'
    | 'RESOLVED'
    | 'ESCALATED'
    | string;
  events: ReplayLifecycleEvent[];
  assignedResponders: ResponderTrackingInfo[];
  recordedStages: ReplayLifecycleEventType[];
  missingStages: ReplayLifecycleEventType[];
  hasValidationErrors: boolean;
  validationErrorReasons: string[];
}

export interface ResponseMetricsReport {
  incidentId: string;
  detectionLatencySeconds: number | null;     // t_detected - t_onset
  dispatchLatencySeconds: number | null;      // t_dispatched - t_detected
  travelTimeSeconds: number | null;           // t_arrived - t_departed
  timeToAssistanceSeconds: number | null;     // t_assistance - t_onset
  incidentDurationSeconds: number | null;     // t_resolved - t_onset
  responderUtilizationPercent: number | null; // responder busy ratio
  isWithinGoldenWindow: boolean;              // Golden window threshold: 180s
  goldenWindowRemainingSeconds: number | null;
  timingBreakdown: {
    measuredCount: number;
    estimatedCount: number;
    missingCount: number;
  };
  bottlenecks: Array<{
    stage: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    explanation: string;
  }>;
  validationFlags: string[];
}

export interface Stage3TestExecutionRecord {
  testId: string;
  name: string;
  description: string;
  expectedOutcome: string;
  actualOutcome: string;
  passed: boolean;
  metricsComputed: {
    detectionLatency: number | null;
    dispatchLatency: number | null;
    travelTime: number | null;
    timeToAssistance: number | null;
    duration: number | null;
  };
  missingEventsHandledProperly: boolean;
  notes: string;
}
