export type RescueOperationStage =
  | 'IDLE'
  | 'ASSIGNED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'ASSISTING'
  | 'COMPLETED'
  | 'RETURNING'
  | 'RESOLVED';

export type RescueResourceType = 'RESCUE_BOAT' | 'LIFEGUARD';

export interface RescueResourceState3D {
  id: string;
  name: string;
  type: RescueResourceType;
  currentX: number;
  currentY: number;
  currentZ: number;
  rotationY: number;
  standbyX: number;
  standbyY: number;
  standbyZ: number;
  speedMps: number;
  status: 'AVAILABLE' | 'ASSIGNED' | 'EN_ROUTE' | 'ON_SCENE' | 'RETURNING' | 'UNAVAILABLE';
  assignedIncidentId: string | null;
  targetX?: number;
  targetY?: number;
  targetZ?: number;
  color: string;
}

export interface RescueMissionDossier {
  missionId: string;
  incidentId: string;
  visitorId: string;
  assignedResourceId: string;
  assignedResourceName: string;
  resourceType: RescueResourceType;
  assignmentRationale: string;
  stage: RescueOperationStage;
  // Chronological Simulation Timestamps (seconds)
  distressSimTime: number;
  alertSimTime?: number;
  dispatchSimTime?: number;
  departSimTime?: number;
  arrivalSimTime?: number;
  assistanceStartSimTime?: number;
  assistanceEndSimTime?: number;
  resolutionSimTime?: number;
  // Metrics
  alertLatencySec?: number;
  dispatchLatencySec?: number;
  travelTimeSec?: number;
  timeToAssistanceSec?: number;
  assistanceDurationSec?: number;
  totalMissionDurationSec?: number;
  isGoldenWindowMet?: boolean; // <= 180s
}

export interface RescueOperationMetrics {
  activeMissionsCount: number;
  resolvedMissionsCount: number;
  averageTimeToAssistanceSec: number | null;
  goldenWindowComplianceRate: number; // percentage
  availableBoatsCount: number;
  availableLifeguardsCount: number;
}

