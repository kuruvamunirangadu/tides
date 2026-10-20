/**
 * droneMission.types.ts
 * 
 * TIDES Drone Phase 4: Mission & Patrol Manager Type Definitions
 * 
 * Defines the complete mission lifecycle domain model, state transitions,
 * preflight validation schemas, and audit event logs for the coastal safety fleet.
 */

import {
  DroneWorld3DPosition,
  DroneGeodeticPosition,
  DroneDataProvenance,
} from '../foundation/drone.types';

export type DroneMissionType =
  | 'PATROL'            // Follow a configured coastal patrol route
  | 'WAYPOINT_TRAVEL'    // Travel to a specific configured waypoint
  | 'OBSERVATION'        // Hold and dwell at an observation point for visual monitoring
  | 'RETURN_TO_BASE'     // Navigate to launch pad and land
  | 'RESCUE_ASSISTANCE'; // Reference an approved rescue assignment without replacing RescueCoordinator

export const UNSUPPORTED_MISSION_TYPES = [
  'CARPET_BOMBING',
  'HEAVY_CARGO_TRANSPORT',
  'DEEP_SEA_DIVING',
  'KINETIC_INTERCEPTION',
] as const;

export type DroneMissionStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'VALIDATING'
  | 'ACCEPTED'
  | 'ACTIVE'
  | 'PAUSED'
  | 'RETURNING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED';

export type DroneMissionEventType =
  | 'MISSION_CREATED'
  | 'VALIDATION_PASSED'
  | 'VALIDATION_FAILED'
  | 'MISSION_ACCEPTED'
  | 'MISSION_STARTED'
  | 'WAYPOINT_REACHED'
  | 'OBSERVATION_STARTED'
  | 'OBSERVATION_COMPLETED'
  | 'RETURN_REQUESTED'
  | 'RETURN_COMPLETED'
  | 'LANDED'
  | 'MISSION_PAUSED'
  | 'MISSION_RESUMED'
  | 'MISSION_COMPLETED'
  | 'MISSION_CANCELLED'
  | 'MISSION_FAILED';

export interface DroneMissionEvent {
  eventId: string;
  missionId: string;
  droneId: string;
  eventType: DroneMissionEventType;
  timestampMs: number;
  details?: Record<string, any>;
  provenance: DroneDataProvenance;
}

export interface DroneMissionWaypoint {
  index: number;
  position3D: DroneWorld3DPosition;
  positionGeo?: DroneGeodeticPosition;
  targetAltitudeMeters: number;
  holdDurationSec?: number;
  name?: string;
}

export interface ConfiguredPatrolRoute {
  routeId: string;
  name: string;
  description: string;
  waypoints: DroneMissionWaypoint[];
  defaultAltitudeMeters: number;
  cruiseSpeedMps: number;
  isLoop: boolean;
}

export interface DroneMissionDossier {
  missionId: string;
  type: DroneMissionType;
  droneId: string;
  status: DroneMissionStatus;
  priority: number; // 1 (emergency) to 5 (routine patrol)
  createdAtMs: number;
  updatedAtMs: number;
  startedAtMs?: number;
  completedAtMs?: number;
  routeId?: string;
  waypoints: DroneMissionWaypoint[];
  currentWaypointIndex: number;
  observationDurationSec?: number;
  observationTimerSec?: number;
  linkedIncidentId?: string;
  cancellationReason?: string;
  failureReason?: string;
  notes?: string;
  progressPercent: number; // 0 - 100%
  provenance: DroneDataProvenance;
}

export interface MissionCreationRequest {
  missionId?: string;
  type: DroneMissionType;
  droneId: string;
  priority?: number;
  routeId?: string;
  waypoints?: DroneMissionWaypoint[];
  targetPosition3D?: DroneWorld3DPosition;
  targetAltitudeMeters?: number;
  observationDurationSec?: number;
  linkedIncidentId?: string;
  notes?: string;
  provenance?: DroneDataProvenance;
}

export interface PreflightValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  checkedAtMs: number;
}

export interface MissionTransitionResult {
  success: boolean;
  fromStatus: DroneMissionStatus;
  toStatus: DroneMissionStatus;
  missionId: string;
  errorReason?: string;
}

