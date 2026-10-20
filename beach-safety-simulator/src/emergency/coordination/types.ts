/**
 * src/emergency/coordination/types.ts
 * Type definitions for TIDES Milestone 9:
 * Intelligent Emergency Coordination & Evacuation.
 */

export type EvacuationZoneState = 'NORMAL' | 'CAUTION' | 'RESTRICTED' | 'EVACUATION' | 'UNAVAILABLE';

export type EmergencyActionType =
  | 'INCREASE_PATROL'
  | 'PUBLIC_WARNING'
  | 'RESTRICT_ZONE'
  | 'PREPARE_RESOURCES'
  | 'EVACUATE_ZONE'
  | 'CLOSE_ROUTE';

export type RecommendationStatus = 'RECOMMENDED' | 'OPERATOR_APPROVED' | 'OPERATOR_REJECTED';

export type EmergencyIncidentStatus =
  | 'REPORTED'
  | 'DISPATCHED'
  | 'ON_SCENE'
  | 'RESOLVED'
  | 'UNRESOLVED_RESOURCE_EXHAUSTION';

export interface Point2D {
  x: number;
  y: number;
}

export interface EvacuationZone {
  zoneId: string;
  name: string;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  state: EvacuationZoneState;
  reason: string;
  hazardRefs: string[];
  stateChangedAt: number;
  isOperatorConfirmed: boolean;
  activeVisitorCount: number;
}

export interface EmergencyIncident {
  incidentId: string;
  visitorId: string;
  location: Point2D;
  distressLevel: number;
  priorityScore: number;
  status: EmergencyIncidentStatus;
  assignedResourceId?: string;
  assignedResourceName?: string;
  createdAt: number;
  dispatchedAt?: number;
  resolvedAt?: number;
  notes?: string;
}

export interface EmergencyRecommendation {
  recommendationId: string;
  targetZoneId?: string;
  targetIncidentId?: string;
  actionType: EmergencyActionType;
  ruleTriggered: string;
  supportingInputs: Record<string, any>;
  uncertaintyNotes?: string;
  status: RecommendationStatus;
  createdAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
}

export interface EvacuationExit {
  exitId: string;
  name: string;
  location: Point2D;
  flowCapacityPerSec: number; // Max visitors per second
  currentQueueCount: number;
  isBlocked: boolean;
  blockedReason?: string;
}

export interface EvacuationRoute {
  routeId: string;
  name: string;
  originZoneId: string;
  exitId: string;
  waypoints: Point2D[];
  isBlocked: boolean;
  bottleneckLocation?: Point2D;
  occupantCount: number;
}

export interface EmergencyPerformanceMetrics {
  evacuationCompletionPct: number | null;
  warningToMovementDelaySec: number | null;
  visitorsRemainingInHazardZones: number;
  routeUtilizationPct: number | null;
  queueLengthAvg: number | null;
  resourceUtilizationPct: number | null;
  unresolvedIncidentsCount: number;
  scenarioDurationSec: number | null;
}

