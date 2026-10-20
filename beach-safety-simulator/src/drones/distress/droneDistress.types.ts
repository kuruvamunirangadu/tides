/**
 * droneDistress.types.ts
 * 
 * TIDES Drone Phase 7: Distress Verification & Incident Creation Contracts
 * 
 * Strict Operational Principles:
 * 1. A detected person is NOT automatically a person in distress.
 * 2. Visual candidate observations require operator verification before emergency dispatch.
 * 3. Explicit SOS events follow existing emergency policy immediately without waiting for CV.
 * 4. Zero duplicate incident registries or competing rescue coordinators.
 * 5. Observation identity, person identity, and incident identity are strictly decoupled.
 */

import { DroneNormalizedBBox } from '../vision/droneDetection.types';
import { IncidentSeverity, IncidentType, Position } from '../../models/Incident';

/** Verification lifecycle states */
export type DroneVerificationStatus =
  | 'CANDIDATE_RECEIVED'
  | 'AWAITING_VERIFICATION'
  | 'UNDER_REVIEW'
  | 'VERIFIED_INCIDENT'
  | 'DISMISSED_CANDIDATE'
  | 'DUPLICATE_OBSERVATION'
  | 'INSUFFICIENT_EVIDENCE'
  | 'VERIFICATION_UNAVAILABLE';

/** Location estimation source */
export type DroneLocationSource =
  | 'STEREO_DEPTH'
  | 'TERRAIN_RAYCAST'
  | 'CAMERA_GROUND_INTERSECTION'
  | 'UNESTIMATED';

/**
 * Validated candidate observation ingested from the vision pipeline.
 */
export interface ValidatedCandidateObservation {
  /** Unique observation event ID (e.g. OBS-CANDIDATE-DRONE-01-1001) */
  observationId: string;
  /** Source camera identifier (e.g. CAM-DRONE-01) */
  cameraId: string;
  /** Source drone identifier (e.g. DRONE-01) */
  droneId: string;
  /** Active mission identifier if assigned */
  missionId?: string;
  /** Persistent temporary tracking ID from object tracker (e.g. TRK-01-101) */
  trackingId?: string;
  /** Sensor observation timestamp (epoch ms) */
  observationTimestampMs: number;
  /** Pipeline ingestion timestamp (epoch ms) */
  receiptTimestampMs: number;
  /** Bounding box in normalized source frame coordinates [0, 1] */
  bbox: DroneNormalizedBBox;
  /** Frame reference tag */
  frameId?: string;
  /** Target classification (strictly 'PERSON' in Phase 6/7) */
  className: 'PERSON';
  /** Detection confidence score [0.0, 1.0] */
  confidence: number;
  /** Estimated 3D scene location (meters) */
  scenePosition?: { x: number; y: number; z: number };
  /** Estimated WGS84 GPS geodetic coordinates */
  geoCoordinates?: { latitude: number; longitude: number };
  /** Provenance of location estimation */
  locationSource: DroneLocationSource;
  /** Age of location measurement in milliseconds */
  locationFreshnessMs: number;
  /** Associated evidence tokens or upstream references */
  associatedEvidence: string[];
  /** Data provenance tag */
  provenance: 'SIMULATED' | 'SYNTHETIC' | 'LIVE_EDGE';
  /** Current verification lifecycle status */
  verificationStatus: DroneVerificationStatus;
  /** Linked authoritative incident ID when escalated or merged */
  associatedIncidentId?: string;
  /** Recorded operator verification decision, if completed */
  operatorDecision?: OperatorDecisionRecord;
  /** Processing errors or degradation warnings, if any */
  processingErrors?: string[];
}

/**
 * Operator verification record capturing authorized human decision.
 */
export interface OperatorDecisionRecord {
  /** Identifier of the human operator or supervisor */
  operatorId: string;
  /** Action performed */
  decision: 'VERIFY' | 'DISMISS' | 'MARK_DUPLICATE' | 'LINK_EXISTING';
  /** Operational justification or clinical rationale */
  reason: string;
  /** Timestamp when decision was committed (epoch ms) */
  decisionTimestampMs: number;
  /** Authoritative incident ID created or linked */
  resultingIncidentId?: string;
}

/**
 * Explicit SOS event (e.g. smart wristband, manual SOS pole, lifeguard whistle).
 * Critical Principle: Bypasses CV confirmation; immediately executes emergency response.
 */
export interface ExplicitSOSEvent {
  sosId: string;
  source: 'WRISTBAND' | 'MANUAL_STATION' | 'BEACHGOER_APP';
  visitorId?: string;
  timestampMs: number;
  scenePosition: { x: number; y: number; z: number };
  geoCoordinates?: { latitude: number; longitude: number };
  emergencyType: 'DROWNING_SOS' | 'MEDICAL_SOS' | 'PANIC_SOS';
  severity: 'CRITICAL';
  bypassesCV: true;
}

/**
 * Correlated multi-source evidence dossier prepared for operator triage.
 */
export interface CandidateDistressDossier {
  /** Unique dossier identifier (e.g. DOSSIER-1001) */
  dossierId: string;
  /** Primary candidate observation ID */
  candidateObservationId: string;
  /** Source drone and camera */
  droneId: string;
  cameraId: string;
  /** Temporary tracking token */
  trackingId?: string;
  /** Observation coordinates */
  scenePosition?: { x: number; y: number; z: number };
  /** Hazard zone membership */
  inHazardCorridor: boolean;
  hazardZoneId?: string;
  hazardZoneName?: string;
  /** Existing incident correlation */
  isNearExistingIncident: boolean;
  existingIncidentId?: string;
  distanceToExistingIncidentMeters?: number;
  /** Evidence correlation metrics */
  repeatedHitsCount: number;
  detectionConfidence: number;
  hasCorrelatedSOS: boolean;
  sosId?: string;
  /** Narrative evidence items */
  evidenceSummary: string[];
  /** Documented uncertainty reasons */
  uncertaintyReasons: string[];
  /** Triage recommendation */
  recommendedAction: 'AWAIT_OPERATOR_VERIFICATION' | 'LINK_EXISTING_INCIDENT' | 'DIRECT_EMERGENCY_ESCALATION';
  /** Current verification state */
  verificationStatus: DroneVerificationStatus;
  /** Dossier creation timestamp */
  createdAtMs: number;
  /** Dossier last updated timestamp */
  updatedAtMs: number;
  /** Associated operator decision */
  operatorDecision?: OperatorDecisionRecord;
}

/**
 * Audit event types for accountability and post-incident investigation.
 */
export type DroneDistressAuditEventType =
  | 'OBSERVATION_INGESTED'
  | 'OBSERVATION_REJECTED'
  | 'EVIDENCE_CORRELATED'
  | 'CANDIDATE_QUEUED'
  | 'VERIFICATION_REQUESTED'
  | 'VERIFICATION_DECIDED'
  | 'INCIDENT_LINKED'
  | 'INCIDENT_ESCALATED'
  | 'EXPLICIT_SOS_PROCESSED'
  | 'DUPLICATE_DROPPED'
  | 'PROCESSING_ERROR';

export interface DroneDistressAuditEvent {
  eventId: string;
  timestampMs: number;
  eventType: DroneDistressAuditEventType;
  actor: string;
  sourceReference: string;
  summary: string;
  details?: Record<string, any>;
}

/**
 * Validation result contract
 */
export interface ObservationValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

