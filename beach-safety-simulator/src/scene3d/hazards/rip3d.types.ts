export type RipScenarioState = 'INACTIVE' | 'ACTIVE' | 'DISTRESS_ALERTED' | 'RESOLVED';

export interface RipHazardZone3D {
  id: string;
  centerX: number;
  centerZ: number;
  width: number;
  length: number;
  shoreZ: number;
  flowSpeedMps: number;
  active: boolean;
  severity: 'MODERATE' | 'HIGH' | 'CRITICAL';
}

export type DistressLifecycleStage =
  | 'HAZARD_ACTIVATED'
  | 'ENTRAINED'
  | 'STRUGGLING'
  | 'DISTRESS'
  | 'ALERT_ISSUED'
  | 'RESOLVED';

export interface DistressIncidentEvent {
  incidentId: string;
  visitorId: string;
  visitorName: string;
  hazardId: string;
  hazardType: 'RIP_CURRENT';
  onsetSimTime: number;
  alertSimTime?: number;
  detectionLatencySec?: number;
  timeDisplay: string;
  position3D: { x: number; y: number; z: number };
  position2D: { x: number; y: number };
  stage: DistressLifecycleStage;
  severity: 'CRITICAL';
  description: string;
  resolved: boolean;
}

export interface RipMetrics {
  activeHazardsCount: number;
  swimmersInRipCount: number;
  activeDistressCount: number;
  timeToAlertSeconds: number | null;
  incidentDurationSeconds: number;
}

