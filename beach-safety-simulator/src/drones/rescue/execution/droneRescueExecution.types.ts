/**
 * droneRescueExecution.types.ts
 * 
 * TIDES Drone Phase 10: Search, Approach & Rescue Assistance Contracts
 * 
 * Strict Life-Safety Guarantees:
 * 1. Drone arrival does NOT mean the swimmer has been rescued or is safe.
 * 2. Flotation payload delivery provides immediate buoyancy aid; physical
 *    recovery is performed by surface lifesavers (Lifeguards & Rescue Boats).
 * 3. Never claim physical payload release or real drone flight.
 * 4. Mission execution status is kept separate from incident status, drone
 *    operational status, and verified rescue outcome.
 * 5. If destination is missing, stale, or uncertain, do not invent coordinates.
 * 6. Never silently mark an unresolved incident as safe or resolved.
 */

import { DroneWorld3DPosition, DroneDataProvenance } from '../../foundation/drone.types';

export type RescueExecutionStage =
  | 'ASSIGNED'                // Mission assignment created and confirmed
  | 'VALIDATING'              // Pre-approach checks: destination freshness, drone capabilities, battery
  | 'APPROACHING'             // Active transit toward incident coordinates via DroneMovementEngine
  | 'SEARCHING'               // In target vicinity; conducting visual and sensor search sweep
  | 'OBSERVING'               // Holding at observation position; target assessment in progress
  | 'ASSISTANCE_PENDING'      // Flotation delivery authorized; arming simulated payload
  | 'ASSISTANCE_IN_PROGRESS'  // Actuating payload release and simulating drop to water surface
  | 'ASSISTANCE_REPORTED'     // Flotation aid delivered; audit event logged; swimmer recovery pending
  | 'RETURNING'               // Navigating back to home pad via DroneMovementEngine
  | 'COMPLETED'               // Landed on pad; post-flight recovery complete; drone released to fleet
  | 'CANCELLED'               // Operator cancelled or recalled mission
  | 'FAILED';                 // Mission aborted (telemetry drop, battery abort, actuator jam)

export type ObservationOutcome =
  | 'TARGET_OBSERVED'         // Person in distress visually confirmed in camera FOV
  | 'TARGET_NOT_OBSERVED'     // Incident area inspected, no person detected at coordinates
  | 'TARGET_UNCERTAIN';       // Camera degraded, high spray/fog, or visual ambiguity

export type PayloadReadinessState =
  | 'ATTACHED'                // Mounted to ventral release mechanism
  | 'ARMED'                   // Release solenoid energized and safety interlock cleared
  | 'DROPPING'                // Released from airframe; gravity descent to sea surface
  | 'DEPLOYED'                // Floating on sea surface; buoyancy beacon active
  | 'JETTISONED'              // Emergency jettison during transit failure
  | 'FAILED';                 // Release solenoid jam or actuator failure

export type DeliveryAttemptStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'SUCCESS'
  | 'FAILURE'
  | 'ABORTED';

export type DeliveryConfirmationSource =
  | 'CAMERA_CONFIRMATION'     // Verified via downward-facing drone optical camera
  | 'VISUAL_OPERATOR'         // Confirmed by command-center operator
  | 'TELEMETRY_ESTIMATE'      // Inferred from flight telemetry and altitude drop
  | 'NONE';

export interface SimulatedRescuePayload {
  payloadId: string;
  payloadType: 'BUOYANT_FLOTATION_RING' | 'INFLATABLE_RESCUE_TUBE' | 'SELF_INFLATING_BUOY';
  weightKg: number;
  compatibilityStatus: 'COMPATIBLE' | 'INCOMPATIBLE' | 'UNKNOWN';
  readinessState: PayloadReadinessState;
  deliveryAttemptStatus: DeliveryAttemptStatus;
  deliveryConfirmationSource: DeliveryConfirmationSource;
  missionId: string;
  incidentId: string;
  droneId: string;
  dropAltitudeMeters?: number;
  droppedAtPosition3D?: DroneWorld3DPosition;
  timestampMs: number;
  failureReason?: string;
  provenance: DroneDataProvenance;
}

export interface DestinationValidationResult {
  valid: boolean;
  locationSource: 'WEARABLE_GPS' | 'CV_CAMERA_ESTIMATE' | 'BEACH_RADAR' | 'MANUAL_REPORT' | 'UNKNOWN';
  sourceTimestampMs: number;
  freshnessSeconds: number;
  isStale: boolean;
  targetPosition3D?: DroneWorld3DPosition;
  errors: string[];
  warnings: string[];
}

export interface RescueExecutionDossier {
  executionId: string;
  assignmentId: string;
  missionId: string;
  droneId: string;
  incidentId: string;
  stage: RescueExecutionStage;
  targetPosition3D: DroneWorld3DPosition;
  destinationValidation: DestinationValidationResult;
  observationOutcome: ObservationOutcome;
  observationConfidence: number;
  observedPersonId?: string;
  cameraSnapshotId?: string;
  payload?: SimulatedRescuePayload;
  transitDistanceMeters: number;
  groundSpeedMps: number;
  estimatedArrivalSec: number;
  searchHoldTimerSec: number;
  assistanceTimerSec: number;
  returnProgressPercent: number;
  failureReason?: string;
  cancellationReason?: string;
  safetyNotice: string;
  collaborativeResponders?: {
    lifeguardId?: string;
    rescueBoatId?: string;
  };
  createdAtMs: number;
  updatedAtMs: number;
  dispatchedAtMs?: number;
  arrivedAtMs?: number;
  assistedAtMs?: number;
  returnedAtMs?: number;
  completedAtMs?: number;
  provenance: DroneDataProvenance;
}

export const RESCUE_EXECUTION_SAFETY_NOTICE =
  'CRITICAL: Aerial flotation aid provides immediate buoyancy to prevent drowning submersion. ' +
  'It does NOT constitute successful rescue or guarantee swimmer safety. ' +
  'Physical extraction and medical stabilization require surface lifesavers (Lifeguards / Rescue Boats).';
