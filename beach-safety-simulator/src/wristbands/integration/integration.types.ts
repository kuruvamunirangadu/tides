/**
 * integration.types.ts
 * 
 * TIDES Phase 4: Camera & Drone Integration with the Wristband Safety System
 * 
 * Defines core contracts for:
 * - Camera Observation records (CCTV, Tower, Gimbal)
 * - Drone Observation & Telemetry integration
 * - Candidate Distress Incident dossiers & human verification state machine
 * - Localized Wristband warning eligibility records (with explicit inclusion/exclusion reasons)
 * - Event architecture contracts & audit logging
 */

import { WristbandId } from '../wristband.types';
import { IncidentSeverity } from '../../models/Incident';

export type CameraSourceType = 'CCTV_FIXED' | 'SURVEILLANCE_TOWER' | 'DRONE_GIMBAL';

export type DetectionClass =
  | 'SWIMMER'
  | 'PERSON'
  | 'STRUGGLING_SWIMMER'
  | 'SUBMERGED_OBJECT'
  | 'CANDIDATE_DISTRESS';

export type FreshnessStatus = 'FRESH' | 'STALE' | 'EXPIRED';

export type VerificationState =
  | 'PENDING_REVIEW'
  | 'VERIFIED'
  | 'DISMISSED'
  | 'MONITORING';

export type WarningDeliveryLifecycle =
  | 'PENDING'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'ACKNOWLEDGED'
  | 'FAILED'
  | 'EXPIRED';

export type LocationProvenance =
  | 'CAMERA_ESTIMATED'
  | 'DRONE_GIMBAL_ESTIMATED'
  | 'FUSED_ESTIMATED'
  | 'GATEWAY_SECTOR'
  | 'GPS_VERIFIED';

/**
 * Camera Observation Record
 */
export interface CameraObservation {
  observationId: string;
  cameraId: string;
  cameraSourceType: CameraSourceType;
  eventTimestampMs: number;
  ingestionTimestampMs: number;
  detectionClass: DetectionClass;
  confidenceScore: number; // 0.0 - 1.0
  observationPosition?: { x: number; y: number; z?: number };
  coordinateReference: 'BEACH_CANVAS' | '3D_WORLD' | 'GEODETIC_WGS84';
  trackingId?: string;
  bbox?: { x: number; y: number; width: number; height: number };
  evidenceReference?: string;
  freshnessStatus: FreshnessStatus;
  verificationStatus: VerificationState;
  associatedIncidentId?: string;
  provenance: 'SIMULATED' | 'HARDWARE_DERIVED';
}

/**
 * Drone Observation Record
 */
export interface DroneObservationRecord {
  observationId: string;
  droneId: string;
  currentMissionId?: string;
  timestampedDronePosition: { x: number; y: number; z: number };
  telemetryFreshness: FreshnessStatus;
  telemetryTimestampMs: number;
  batteryPercent: number;
  operationalStatus: string;
  missionStatus: string;
  cameraObservationReference?: string;
  estimatedObservationLocation?: { x: number; y: number; z?: number };
  linkStatus: 'CONNECTED' | 'DEGRADED' | 'DISCONNECTED';
  confidenceScore: number;
  trackingId?: string;
  notes?: string;
}

/**
 * Candidate Distress Incident Dossier
 */
export interface CandidateDistressIncident {
  candidateId: string;
  primarySource: 'CAMERA' | 'DRONE' | 'FUSED';
  cameraObservationIds: string[];
  droneObservationIds: string[];
  targetZoneId: string;
  estimatedLocation: { x: number; y: number };
  locationProvenance: LocationProvenance;
  spatialUncertaintyRadiusMeters: number;
  compositeConfidence: number; // 0.0 - 1.0
  severity: IncidentSeverity;
  verificationState: VerificationState;
  operatorDecision?: {
    decision: 'CONFIRM' | 'DISMISS' | 'REQUEST_OBSERVATION';
    operatorId: string;
    timestampMs: number;
    rationale: string;
    assignedDroneId?: string;
  };
  createdIncidentId?: string;
  warningDispatched: boolean;
  firstObservedAtMs: number;
  lastUpdatedAtMs: number;
}

/**
 * Detailed Wristband Target Eligibility Record (Transparency & Auditability)
 */
export interface WristbandEligibilityRecord {
  wristbandId: WristbandId;
  visitorId: string | null;
  visitorName: string | null;
  provenance: 'SIMULATED' | 'HARDWARE';
  eligible: boolean;
  reason: string; // e.g. "Included: within 85m radius in SWIM_ZONE_NORTH" vs "Excluded: distance 450m > 120m"
  distanceMeters?: number;
  zone: string;
  connectivity: string;
  deliveryStatus: WarningDeliveryLifecycle;
  dispatchedAtMs?: number;
  deliveredAtMs?: number;
  acknowledgedAtMs?: number;
  retryCount: number;
}

/**
 * Event Architecture Contracts
 */
export type Phase4EventType =
  | 'CameraObservationReceived'
  | 'DroneObservationReceived'
  | 'CandidateDistressCreated'
  | 'ObservationLinkedToIncident'
  | 'IncidentVerificationChanged'
  | 'WristbandWarningRequested'
  | 'WristbandWarningDeliveryUpdated';

export interface Phase4EventContract {
  eventId: string;
  eventType: Phase4EventType;
  timestampMs: number;
  sourceId: string;
  correlationId: string;
  payload: Record<string, any>;
}

/**
 * Non-Volatile Audit Trail Record
 */
export interface IntegrationAuditRecord {
  auditId: string;
  timestampMs: number;
  action: 'OBSERVATION_INGESTED' | 'CANDIDATE_CREATED' | 'OPERATOR_VERIFIED' | 'OPERATOR_DISMISSED' | 'DRONE_INSPECT_REQUESTED' | 'WARNING_DISPATCHED' | 'WARNING_ACKNOWLEDGED';
  operatorId?: string;
  candidateId?: string;
  incidentId?: string;
  sourceId: string;
  details: string;
  metadata?: Record<string, any>;
}

