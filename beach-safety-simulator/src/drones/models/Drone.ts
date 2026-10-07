import { GeoPoint } from '../../gis/models/GeoPoint';

export enum DroneType {
  SURVEILLANCE_QUAD = 'SURVEILLANCE_QUAD',
  LONG_RANGE_HEX = 'LONG_RANGE_HEX',
  RAPID_INTERCEPTOR = 'RAPID_INTERCEPTOR',
  HEAVY_LIFTER_RESCUE = 'HEAVY_LIFTER_RESCUE',
}

export type DroneStatus =
  | 'AVAILABLE'
  | 'PATROLLING'
  | 'DISPATCHED'
  | 'SEARCHING'
  | 'TRACKING'
  | 'SUPPORTING'
  | 'RETURNING'
  | 'CHARGING'
  | 'UNAVAILABLE';

export enum DroneCapability {
  SURVEILLANCE = 'SURVEILLANCE',
  PERSON_DETECTION = 'PERSON_DETECTION',
  TRACKING = 'TRACKING',
  DISTRESS_DETECTION = 'DISTRESS_DETECTION',
  CROWD_MONITORING = 'CROWD_MONITORING',
  LIVE_VIDEO = 'LIVE_VIDEO',
  GPS = 'GPS',
  HIGH_RISK_MONITORING = 'HIGH_RISK_MONITORING',
  SEARCH = 'SEARCH',
  RESCUE_ASSISTANCE = 'RESCUE_ASSISTANCE',
}

export interface Drone {
  id: string;
  name: string;
  type: DroneType;
  position: GeoPoint;
  canvasPosition: { x: number; y: number }; // Local simulation coordinates (m)
  altitude: number; // meters AGL (Above Ground Level)
  heading: number; // degrees 0-360
  speed: number; // m/s
  batteryLevel: number; // 0-100%
  status: DroneStatus;
  capabilities: DroneCapability[];
  cameraId?: string;
  currentMissionId?: string;
  homeStationId: string;
  homePosition: { x: number; y: number; geo: GeoPoint };
  payloadDeployed?: boolean;
}
