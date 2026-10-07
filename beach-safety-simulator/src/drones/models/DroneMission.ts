import { GeoPoint } from '../../gis/models/GeoPoint';

export type MissionType =
  | 'PATROL'
  | 'INCIDENT_RESPONSE'
  | 'SEARCH'
  | 'TRACK'
  | 'VERIFY_DISTRESS'
  | 'HIGH_RISK_MONITORING'
  | 'CROWD_MONITORING'
  | 'RESCUE_DROP'
  | 'RETURN_TO_BASE';

export type MissionStatus =
  | 'CREATED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'ON_STATION'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED';

export interface DroneMission {
  id: string;
  droneId: string;
  type: MissionType;
  priority: number; // 1 (highest) to 5 (lowest)
  startTime: number;
  timeDisplay: string;
  targetZoneId?: string;
  targetLocation?: GeoPoint;
  targetCanvasPos?: { x: number; y: number };
  targetVisitorId?: string;
  targetIncidentId?: string;
  status: MissionStatus;
  waypoints?: Array<{ x: number; y: number; altitude: number; holdTimeSec?: number }>;
  currentWaypointIndex?: number;
  progressPercent: number;
  notes?: string;
}

export interface PatrolRoute {
  id: string;
  name: string;
  waypoints: Array<{ x: number; y: number; altitude: number }>;
  altitude: number;
  speed: number;
  zones: string[];
  enabled: boolean;
}
