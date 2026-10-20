/**
 * droneRescue.types.ts
 * 
 * TIDES Drone Phase 9: Rescue Mission Allocation & Dispatch Contracts
 * 
 * Strict Architectural Guarantees:
 * 1. The existing TIDES incident system (IncidentManager) remains authoritative.
 * 2. Rescue drones, lifeguards, and rescue boats are coordinated collaboratively without
 *    creating a competing dispatch engine or overriding existing emergency-response rules.
 * 3. Drone arrival delivers buoyant flotation aid; it does NOT declare a person safe.
 * 4. Human oversight is preserved with explicit approval states and auditable logs.
 * 5. Incident status, resource operational status, mission status, and assignment status remain distinct.
 */

export type RescueAssignmentStatus =
  | 'PROPOSED'     // Algorithm identified eligible drone; awaiting operator approval or auto-policy
  | 'APPROVED'     // Operator authorized or policy approved; ready for mission dispatch
  | 'DISPATCHED'   // Mission created and accepted by DroneMissionManager
  | 'EN_ROUTE'     // Drone actively cruising toward incident coordinates
  | 'ASSISTING'    // Drone holding over distressed swimmer, executing flotation drop
  | 'RETURNING'    // Flotation aid delivered or recalled, returning to home pad
  | 'COMPLETED'    // Drone landed and recovered; assignment finalized
  | 'REJECTED'     // Assignment rejected by human operator or preflight checks
  | 'FAILED'       // Mission failed (telemetry drop, battery abort, actuator fault)
  | 'CANCELLED';   // Mission aborted by operator or incident resolved beforehand

export interface AssignmentAuthorization {
  authorizedBy: string; // e.g. 'OPERATOR-CHIEF' or 'AUTO_DISPATCH_POLICY'
  authorizedAtMs?: number;
  requiresManualApproval: boolean;
  operatorNotes?: string;
}

export interface PatrolPreemptionRecord {
  preemptedDroneId: string;
  preemptedZoneId?: string;
  preemptedRouteId?: string;
  previousMissionId?: string;
  coverageImpactDescription: string;
  preemptedAtMs: number;
}

export interface CollaborativeResponders {
  lifeguardId?: string;
  rescueBoatId?: string;
  coordinationNotes: string;
}

export interface RescueDroneAssignment {
  /** Stable unique assignment identifier (e.g. ASG-RES-1001) */
  assignmentId: string;
  /** Authoritative Incident ID in IncidentManager (e.g. INC-0420-101) */
  incidentId: string;
  /** Visitor ID in distress, if known */
  visitorId?: string;
  /** Assigned drone identifier (e.g. DRONE-02) */
  assignedResourceId: string;
  /** Fixed resource type */
  resourceType: 'DRONE';
  /** Linked Mission ID in DroneMissionManager (e.g. MSN-RES-101) */
  missionId?: string;
  /** Current assignment lifecycle status */
  status: RescueAssignmentStatus;
  /** Creation timestamp (ms) */
  createdAtMs: number;
  /** Last update timestamp (ms) */
  updatedAtMs: number;
  /** Timestamp when drone departed launch pad / waypoint */
  dispatchedAtMs?: number;
  /** Timestamp when drone arrived within payload drop radius */
  arrivedAtMs?: number;
  /** Timestamp when mission concluded */
  completedAtMs?: number;
  /** Target 3D coordinates in Three.js scene space */
  targetPosition3D: { x: number; y: number; z: number };
  /** Distance from drone to target at time of allocation (meters) */
  distanceMeters: number;
  /** Estimated flight transit time (seconds) */
  estimatedArrivalSec: number;
  /** Rationale for this resource selection */
  rationale: string;
  /** Human authorization metadata */
  authorization: AssignmentAuthorization;
  /** Rejection or failure details, if applicable */
  failureReason?: string;
  /** Patrol preemption and coastal coverage impact audit */
  patrolPreemption?: PatrolPreemptionRecord;
  /** Collaborative multi-asset lifesaver coordination */
  collaborativeResponders: CollaborativeResponders;
  /** Flotation aid payload specification */
  payloadType: 'BUOYANT_REST_RING' | 'INFLATABLE_LIFE_FLOAT';
  /** Operational safety notice */
  safetyNotice: string;
  /** Provenance */
  provenance: 'SIMULATED_SCENE_SPACE';
}

export interface RescueDroneEligibilityCheck {
  droneId: string;
  callsign: string;
  role: string;
  isEligible: boolean;
  checks: {
    roleSupported: boolean;
    hasFlotationPayload: boolean;
    statusAvailable: boolean;
    connectivityActive: boolean;
    telemetryFresh: boolean;
    batterySufficient: boolean;
    noConflictingRescueMission: boolean;
    targetWithinBounds: boolean;
  };
  metrics: {
    batteryPercentage: number;
    telemetryAgeSeconds: number;
    distanceMeters: number;
    estimatedArrivalSec: number;
  };
  rejectionReasons: string[];
  unknownCapabilities: string[];
}

export interface IncidentEligibilityAssessment {
  incidentId: string;
  isEligible: boolean;
  severity: string;
  incidentType: string;
  title: string;
  targetPosition3D?: { x: number; y: number; z: number };
  existingAssignmentId?: string;
  existingResourceId?: string;
  rejectionReasons: string[];
}

export type RescueDispatchAuditEventType =
  | 'ASSIGNMENT_PROPOSED'
  | 'ASSIGNMENT_APPROVED'
  | 'ASSIGNMENT_REJECTED'
  | 'MISSION_DISPATCHED'
  | 'APPROACH_STARTED'
  | 'EN_ROUTE_TRANSIT'
  | 'DESTINATION_REACHED'
  | 'ARRIVED_DROP_ZONE'
  | 'OBSERVATION_OUTCOME'
  | 'ASSISTANCE_INITIATED'
  | 'FLOTATION_AID_DEPLOYED'
  | 'ASSISTANCE_REPORTED'
  | 'RETURN_COMMENCED'
  | 'MISSION_COMPLETED'
  | 'MISSION_FAILED'
  | 'MISSION_CANCELLED'
  | 'PATROL_PREEMPTED'
  | 'RESOURCE_RELEASED';

export interface RescueDispatchAuditEvent {
  eventId: string;
  assignmentId: string;
  incidentId: string;
  droneId: string;
  eventType: RescueDispatchAuditEventType;
  timestampMs: number;
  actor: string;
  details: Record<string, any>;
  provenance: 'SIMULATED_SCENE_SPACE';
}

