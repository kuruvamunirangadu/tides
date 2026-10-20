/**
 * commandCenter.types.ts
 * 
 * TIDES — Phase 13: Unified Command Center Dashboard & Mission Replay
 * 
 * Technical contracts and type definitions for:
 * - Unified command center navigation and section tabs
 * - Operational overview KPIs and derived fleet/incident metrics
 * - Chronological event timelines and incident/drone details
 * - Mission recording, historical telemetry samples, and discrete event capture
 * - Isolated mission replay engine, playback state, and timeline controls
 * - Event filtering, search queries, and historical analytics
 */

import { DroneWorld3DPosition, DroneOperationalStatus } from '../../drones/foundation/drone.types';
import { DroneFaultCategory, DroneFaultSeverity } from '../../drones/fault/droneFault.types';
import { IncidentSeverity, IncidentType } from '../../models/Incident';

// ============================================================================
// 1. Unified Navigation Tabs & Layout Sections
// ============================================================================

export type CommandCenterSection =
  | 'OVERVIEW'          // Section 1: High-level KPI strip & fleet operational health
  | 'LIVE_MAP'          // Section 2: 3D coastal map, camera views & tactical overlays
  | 'INCIDENTS'         // Section 3: Authoritative incident queue, triage & timelines
  | 'DRONES_MISSIONS'   // Section 4: Drone status, missions, payloads & flight routes
  | 'WRISTBANDS_WARNINGS' // Section 5: Wristband fleet, LoRa gateway & localized warnings
  | 'REGIONAL_NETWORK'  // Section 6: Multi-beach Andhra Pradesh network & cross-site coordination
  | 'DIGITAL_TWIN_SYNC' // Section 7: Digital twin sensor calibration, real-time sync & discrepancy triage
  | 'PREDICTIVE_INTELLIGENCE' // Section 8: Predictive coastal risk forecasting & uncertainty
  | 'SYSTEM_HEALTH'     // Section 8: Subsystem health & explicit data freshness matrix
  | 'PILOT_VALIDATION'  // Section 9: Controlled field pilot validation & live metrics
  | 'FAULTS_RECOVERY'   // Section 10: Fault diagnostics, active recoveries & retry bounds
  | 'MISSION_REPLAY'    // Section 11: Historical session playback & timeline seeking
  | 'EVENT_TIMELINE';   // Section 12: Chronological operational audit log & search

export type OperationalMode = 'LIVE_OPERATIONS' | 'HISTORICAL_REPLAY';

// ============================================================================
// 2. Operational Overview & Authoritative KPI Metrics
// ============================================================================

export interface OperationalOverviewMetrics {
  // Incident Metrics
  activeIncidentsCount: number;
  incidentsAwaitingAssignmentCount: number;
  incidentsRequiringEscalationCount: number;
  resolvedIncidentsCount: number;
  candidateIncidentsCount?: number;

  // Drone Fleet Metrics (Strictly Non-Overlapping Categorization)
  totalDronesCount: number;
  availableDronesCount: number;          // IDLE, battery > 30%, no faults, not locked
  dronesOnActiveMissionsCount: number;    // PATROLLING, OBSERVING, SEARCHING, DROPPING
  dronesReturningToBaseCount: number;     // RETURNING_TO_BASE, LANDING
  unavailableDronesCount: number;         // OFFLINE, DISCONNECTED, battery <= 20%, CRITICAL fault

  // Mission & Coordination Metrics
  activeMissionsCount: number;
  completedMissionsCount: number;
  preemptedMissionsCount: number;

  // Fault & Recovery Metrics
  activeFaultsCount: number;
  recoveryOperationsCount: number;
  resourcesAwaitingAckCount: number;
  positionUncertainCount: number;

  // Surface Responders
  activeSurfaceRespondersCount: number;   // Lifeguards & Rescue Boats on duty

  // Wristbands & Localized Warnings (Track B Integration)
  totalWristbandsCount?: number;
  activeWristbandSosCount?: number;
  hardwareWristbandsCount?: number;
  activeWarningZonesCount?: number;

  // Gateway & Infrastructure
  gatewayStatus?: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  bufferedGatewayPacketsCount?: number;

  // Controlled Field Pilot (Phase 5 Validation)
  currentPilotSessionId?: string | null;
  pilotReadinessScore?: number;
  beachRiskLevel?: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

  // Timestamp of last metrics refresh
  lastCalculatedTimestampMs: number;
}

export type OverviewMetricFilterKey =
  | 'ALL_INCIDENTS'
  | 'AWAITING_ASSIGNMENT'
  | 'REQUIRING_ESCALATION'
  | 'RESOLVED_INCIDENTS'
  | 'AVAILABLE_DRONES'
  | 'ACTIVE_MISSIONS'
  | 'RETURNING_TO_BASE'
  | 'UNAVAILABLE_DRONES'
  | 'ACTIVE_FAULTS'
  | 'IN_RECOVERY'
  | 'AWAITING_ACK'
  | 'POSITION_UNCERTAIN'
  | 'WRISTBAND_SOS'
  | 'HARDWARE_FLEET'
  | 'WARNING_ZONES'
  | 'CANDIDATE_TRIAGE';

// ============================================================================
// 2.5 Phase 6: Subsystem Health, Device Fleet, and Operator Action Contracts
// ============================================================================

export type DataFreshnessStatus =
  | 'HEALTHY'
  | 'DEGRADED'
  | 'OFFLINE'
  | 'STALE_DATA'
  | 'UNKNOWN_UNMEASURED';

export interface SubsystemHealthRecord {
  subsystemId: string;
  name: string;
  category:
    | 'CAMERA_VISION'
    | 'DRONE_AERIAL'
    | 'WRISTBAND_FLEET'
    | 'BEACH_GATEWAY'
    | 'PILOT_FRAMEWORK'
    | 'COORDINATION_ENGINE';
  status: DataFreshnessStatus;
  lastHeartbeatMs: number;
  latencyMs: number | null;
  packetLossPercent: number | null;
  staleDataWarning?: string;
  details: Record<string, any>;
}

export interface WristbandMonitoringRecord {
  wristbandId: string;
  provenance: 'SIMULATED' | 'HARDWARE';
  batteryPercent: number;
  connectivity: 'CONNECTED' | 'DEGRADED' | 'DISCONNECTED';
  gatewayId?: string;
  rssiDbm?: number;
  snrDb?: number;
  pairedVisitorName?: string;
  zone?: string;
  isSosActive: boolean;
  lastWarningStatus?: 'PENDING' | 'DISPATCHED' | 'DELIVERED' | 'ACKNOWLEDGED' | 'FAILED' | 'EXPIRED' | 'NONE';
  deliveryTimeMs?: number;
  locationState: 'CALIBRATED' | 'UNCERTAIN' | 'UNKNOWN';
  position?: { x: number; y: number };
}

export interface LocalizedWarningDeliveryRecord {
  warningId: string;
  incidentId: string;
  targetZoneId: string;
  issuedAtMs: number;
  eligibleCount: number;
  excludedCount: number;
  deliveredCount: number;
  acknowledgedCount: number;
  status: 'ACTIVE' | 'RESOLVED' | 'CANCELLED';
  details: any[];
}

export interface OperatorAuditAction {
  auditId: string;
  timestampMs: number;
  operatorId: string;
  actionType:
    | 'VERIFY_CANDIDATE'
    | 'DISMISS_CANDIDATE'
    | 'REQUEST_DRONE_INSPECTION'
    | 'REASSIGN_INCIDENT'
    | 'TRIGGER_LOCALIZED_WARNING'
    | 'CANCEL_WARNING'
    | 'ACKNOWLEDGE_FAULT'
    | 'ACKNOWLEDGE_ADVISORY'
    | 'PRECAUTIONARY_PATROL_REQUESTED'
    | 'SWITCH_ACTIVE_SITE'
    | 'CREATE_ASSISTANCE_REQUEST'
    | 'ACKNOWLEDGE_ASSISTANCE_REQUEST'
    | 'ACCEPT_ASSISTANCE_REQUEST'
    | 'DECLINE_ASSISTANCE_REQUEST'
    | 'COMPLETE_ASSISTANCE_REQUEST'
    | 'SET_DIGITAL_TWIN_SOURCE_MODE'
    | 'ACKNOWLEDGE_DISCREPANCY'
    | 'RESOLVE_DISCREPANCY'
    | 'REGISTER_CALIBRATION_RECORD'
    | 'CREATE_DISASTER_CHECKPOINT'
    | 'RUN_ISOLATED_RESTORATION_DRILL'
    | 'EXECUTE_FAULT_INJECTION_SCENARIO'
    | 'SET_RESILIENCE_TEST_MODE';
  targetId: string;
  details: string;
  success: boolean;
}

export interface LayerVisibilityState {
  hazards: boolean;
  incidents: boolean;
  cameras: boolean;
  drones: boolean;
  wristbands: boolean;
  warningZones: boolean;
  gateways: boolean;
  uncertaintyCircles: boolean;
}

// ============================================================================
// 3. Chronological Incident & Mission Events
// ============================================================================

export type MissionReplayEventType =
  // Incident Lifecycle
  | 'INCIDENT_DETECTED'
  | 'INCIDENT_VERIFIED'
  | 'INCIDENT_SEVERITY_CHANGED'
  | 'INCIDENT_ESCALATED'
  | 'INCIDENT_RESOLVED'
  // Resource & Dispatch Lifecycle
  | 'RESOURCE_ASSIGNED'
  | 'RESOURCE_REASSIGNED'
  | 'PATROL_PREEMPTED'
  | 'SURFACE_RESPONDER_DISPATCHED'
  // Aerial Drone Mission Execution
  | 'MISSION_CREATED'
  | 'MISSION_STARTED'
  | 'MISSION_WAYPOINT_REACHED'
  | 'DRONE_ARRIVED_ON_SCENE'
  | 'DRONE_SEARCH_BEGAN'
  | 'FLOTATION_DROP_ARMED'
  | 'FLOTATION_DROPPED'
  | 'DRONE_RTB_TRIGGERED'
  | 'DRONE_LANDED'
  | 'MISSION_COMPLETED'
  | 'MISSION_CANCELLED'
  | 'MISSION_FAILED'
  // Fault & Resilience Lifecycle
  | 'FAULT_DETECTED'
  | 'FAULT_ACKNOWLEDGED'
  | 'FAULT_RECOVERY_STARTED'
  | 'FAULT_RETRY_ATTEMPTED'
  | 'FAULT_RESOLVED'
  | 'REPLACEMENT_DRONE_REQUESTED'
  | 'SURFACE_ESCALATION_TRIGGERED'
  // Phase 6 Multi-System & Pilot Lifecycle
  | 'CANDIDATE_DETECTED'
  | 'CANDIDATE_VERIFIED'
  | 'CANDIDATE_DISMISSED'
  | 'WARNING_ZONE_ACTIVATED'
  | 'WRISTBAND_SOS_TRIGGERED'
  | 'GATEWAY_PACKET_RECEIVED'
  | 'PILOT_DRILL_STARTED'
  | 'OPERATOR_ACTION_LOGGED';

export interface MissionReplayEvent {
  eventId: string;
  sessionId: string;
  simTimeSeconds: number;
  wallClockTimestamp: number;
  eventType: MissionReplayEventType;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  description: string;
  incidentId?: string;
  droneId?: string;
  missionId?: string;
  responderId?: string;
  faultCategory?: DroneFaultCategory;
  position3D?: DroneWorld3DPosition;
  isRecordedFact: boolean;      // TRUE if directly recorded; FALSE if derived
  isEstimated?: boolean;
  details?: Record<string, any>;
}

// ============================================================================
// 4. Mission Recording & Discrete Telemetry Samples
// ============================================================================

export interface DroneTelemetrySample {
  sampleId: string;
  sessionId: string;
  droneId: string;
  simTimeSeconds: number;
  timestampMs: number;
  position3D: DroneWorld3DPosition;
  batteryLevel: number;
  status: DroneOperationalStatus;
  headingDegrees?: number;
  currentMissionId?: string;
  isPositionUncertain?: boolean;
}

export interface RecordedSession {
  sessionId: string;
  title: string;
  description: string;
  beachId: string;
  startTimeSimSeconds: number;
  endTimeSimSeconds: number;
  durationSeconds: number;
  recordedAtTimestampMs: number;
  incidentIds: string[];
  droneIds: string[];
  missionIds: string[];
  eventCount: number;
  telemetrySampleCount: number;
  hasCompleteTelemetry: boolean;
  missingTelemetryGaps?: Array<{ startSec: number; endSec: number }>;
  tags: string[];
}

// ============================================================================
// 5. Replay Controller State & Playback Contracts (Isolated from Live State)
// ============================================================================

export type PlaybackSpeed = 0.5 | 1.0 | 2.0 | 5.0;

export interface ReplayPlaybackState {
  isReplayActive: boolean;            // Mandatory isolation flag
  selectedSessionId: string | null;
  selectedSession: RecordedSession | null;
  isPlaying: boolean;
  playbackSpeed: PlaybackSpeed;
  currentSimTime: number;
  minSimTime: number;
  maxSimTime: number;
  progressPercent: number;
  activeEvents: MissionReplayEvent[];
  currentEvent: MissionReplayEvent | null;
  historicalDronePositions: Map<string, DroneTelemetrySample>;
  uncertainDrones: Set<string>;
  activeRouteWaypoints: DroneWorld3DPosition[];
  selectedIncidentId: string | null;
}

// ============================================================================
// 6. Search & Event Filters
// ============================================================================

export interface EventFilterQuery {
  textQuery?: string;
  incidentId?: string;
  droneId?: string;
  missionId?: string;
  faultCategory?: DroneFaultCategory;
  eventType?: MissionReplayEventType;
  severity?: 'INFO' | 'WARNING' | 'CRITICAL';
  startDateSimSec?: number;
  endDateSimSec?: number;
}

// ============================================================================
// 7. Operational Analytics
// ============================================================================

export interface OperationalAnalyticsSummary {
  totalRecordedIncidents: number;
  avgResponseTimeSeconds: number | null; // Detection to first responder arrival
  avgFlotationDeliveryTimeSeconds: number | null; // Detection to flotation drop
  missionSuccessRatePercent: number;
  totalMissionsAnalyzed: number;
  totalFaultsRecorded: number;
  mostFrequentFaultCategory: DroneFaultCategory | 'NONE';
  recoverySuccessRatePercent: number;
  disclaimer: string;
}

export const REPLAY_LIFE_SAFETY_DISCLAIMER =
  'SIMULATION NOTICE: All command center telemetry, mission replays, drone operations, and performance metrics are simulated within the Rushikonda Beach Digital Twin. Physical water rescue, swimmer extraction, and medical resuscitation are exclusively conducted by certified human lifesavers.';
