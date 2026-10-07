import { GeoPoint } from '../../gis/models/GeoPoint';

export interface DroneTelemetry {
  droneId: string;
  timestamp: number;
  timeDisplay: string;
  position: GeoPoint;
  canvasPosition: { x: number; y: number };
  altitude: number;
  heading: number;
  speed: number;
  batteryLevel: number;
  signalStrength: number; // 0-100%
  gpsAccuracy: number; // meters CEP
  cameraStatus: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  communicationStatus: 'CONNECTED' | 'DEGRADED' | 'DISCONNECTED';
  flightMode: string;
}
