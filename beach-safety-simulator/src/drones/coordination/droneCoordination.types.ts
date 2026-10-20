/**
 * droneCoordination.types.ts
 * 
 * TIDES Drone Phase 11: Multi-Incident & Multi-Drone Coordination Contracts
 * 
 * Defines the core types and interfaces for simultaneous incident management,
 * priority queueing, shared drone resource availability, multi-drone allocation,
 * conflict resolution, and multi-asset lifesaver coordination.
 */

import { DroneWorld3DPosition, DroneRole, DroneOperationalStatus, DroneConnectivity, DronePayloadCapabilities } from '../foundation/drone.types';
import { IncidentType, IncidentSeverity } from '../../models/Incident';

export type CoordinationIncidentStatus =
  | 'QUEUED'          // Awaiting eligible drone resource in priority queue
  | 'ALLOCATED'       // Drone allocated; mission proposed / authorized
  | 'IN_TRANSIT'      // Drone actively en route to incident coordinates
  | 'ASSISTING'       // Drone on site delivering aid / holding visual contact
  | 'RESOLVED'        // Incident closed (swimmer extracted by lifesavers)
  | 'UNASSIGNABLE';   // Cannot be served by current fleet (e.g. no flotation drones available)

export interface CoordinationIncident {
  incidentId: string;
  source: 'INCIDENT_MANAGER' | 'RIP_SIMULATOR' | 'SOS_ALERT' | 'MANUAL_DISPATCH';
  type: IncidentType;
  severity: IncidentSeverity;
  title: string;
  zoneId: string;
  position3D: DroneWorld3DPosition;
  detectedAtMs: number;
  priorityRank: number;                 // 1 (Highest) to 10 (Lowest)
  status: CoordinationIncidentStatus;
  assignedDroneId?: string;
  assignedLifeguardId?: string;
  assignedRescueBoatId?: string;
  assignedMissionId?: string;
  assignedAtMs?: number;
  waitTimeSeconds: number;
  starvationBoostApplied: boolean;
  allocationRationale?: string;
  unassignableReason?: string;
  history: Array<{
    timestampMs: number;
    fromStatus: CoordinationIncidentStatus;
    toStatus: CoordinationIncidentStatus;
    reason: string;
  }>;
}

export interface DroneResourceAvailability {
  droneId: string;
  callsign: string;
  role: DroneRole;
  operationalStatus: DroneOperationalStatus;
  connectivity: DroneConnectivity;
  batteryPercentage: number;
  telemetryAgeSeconds: number;
  position3D: DroneWorld3DPosition;
  currentMissionId?: string;
  assignedIncidentId?: string;
  capabilities: DronePayloadCapabilities;
  isEligibleForRescue: boolean;
  isEligibleForPatrol: boolean;
  isLocked: boolean;
  isPreemptible: boolean;
  lockReason?: string;
}

export interface AllocationCandidateScore {
  droneId: string;
  isEligible: boolean;
  rejectionReasons: string[];
  distanceMeters: number;
  estimatedTransitTimeSeconds: number;
  batteryPercentage: number;
  isCurrentlyPreemptible: boolean;
  overallScore: number;
  scoreBreakdown: {
    proximityScore: number;
    batteryScore: number;
    capabilityScore: number;
    idleBonus: number;
  };
}

export type AllocationDecisionType =
  | 'ALLOCATED'
  | 'PREEMPTED_AND_ALLOCATED'
  | 'QUEUED_NO_RESOURCE'
  | 'BLOCKED_CONFLICT'
  | 'REASSIGNED'
  | 'RESOLVED_EXCLUDED';

export interface AllocationDecision {
  decisionId: string;
  incidentId: string;
  assignedDroneId?: string;
  decisionType: AllocationDecisionType;
  rationale: string;
  evaluatedCandidates: AllocationCandidateScore[];
  timestampMs: number;
}

export type CoordinationConflictType =
  | 'RESOURCE_COMPETITION'            // Multiple incidents competing for 1 drone
  | 'PATROL_PREEMPTION'                // Routine patrol preempted for critical distress
  | 'UNSAFE_REASSIGNMENT_ATTEMPT'     // Attempted reassignment of active rescue drone (rejected)
  | 'TELEMETRY_LOSS_IN_FLIGHT'        // Link degraded during active mission
  | 'INCIDENT_ESCALATION'              // Severity elevated while resources committed
  | 'DUPLICATE_ALLOCATION_ATTEMPT'    // Concurrent race condition blocked
  | 'SURFACE_RESPONDER_COMMITTED';     // Lifeguard or boat committed to another incident

export interface CoordinationConflictRecord {
  conflictId: string;
  conflictType: CoordinationConflictType;
  timestampMs: number;
  incidentIds: string[];
  droneIds: string[];
  resolutionAction: string;
  operatorExplanation: string;
}

export interface CoordinationPolicyConfig {
  starvationThresholdSeconds: number;   // Default: 45s wait triggers priority elevation
  preemptionAllowedForCritical: boolean; // Default: true (routine patrol can yield to distress)
  minBatteryForRescuePercent: number;    // Default: 25% minimum battery
  maxTelemetryAgeSeconds: number;        // Default: 15s max telemetry age
  autoAllocationEnabled: boolean;        // Default: true (preserves automated emergency response)
}

export interface CoordinationSummaryMetrics {
  totalIncidents: number;
  activeIncidentsCount: number;
  queuedIncidentsCount: number;
  allocatedIncidentsCount: number;
  resolvedIncidentsCount: number;
  unassignableIncidentsCount: number;
  totalFleetCount: number;
  availableDronesCount: number;
  assignedDronesCount: number;
  returningDronesCount: number;
  offlineDronesCount: number;
  preemptionsCount: number;
  conflictsResolvedCount: number;
  multiAssetTeamedCount: number;
}

export const COORDINATION_LIFE_SAFETY_POLICY =
  'OPERATIONAL DIRECTIVE: Drone allocation delivers rapid buoyant aid and aerial surveillance. ' +
  'Drone dispatch or payload deployment does NOT mean swimmer recovery is complete. ' +
  'Physical extraction and medical resuscitation are exclusively conducted by surface lifesavers (Lifeguards / Boats).';
