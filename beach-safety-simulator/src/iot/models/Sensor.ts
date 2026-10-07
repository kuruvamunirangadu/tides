import { GeoPoint } from '../../gis/models/GeoPoint';

export enum SensorType {
  TIDE = 'TIDE',
  WATER_LEVEL = 'WATER_LEVEL',
  WAVE = 'WAVE',
  CURRENT = 'CURRENT',
  WEATHER = 'WEATHER',
  CAMERA = 'CAMERA',
  GPS = 'GPS',
}

export type SensorStatus = 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'STALE' | 'CALIBRATING';

export type SensorCapability =
  | 'TIDE_HEIGHT'
  | 'WAVE_HEIGHT'
  | 'WAVE_PERIOD'
  | 'CURRENT_VELOCITY'
  | 'WIND_VECTOR'
  | 'ATMOSPHERIC_PRESSURE'
  | 'WATER_TEMPERATURE'
  | 'VIDEO_STREAM'
  | 'GEOLOCATION';

export interface SensorMetadata {
  manufacturer: string;
  model: string;
  firmwareVersion: string;
  installationDate: string;
  calibrationDate: string;
  samplingIntervalSeconds: number;
  batteryPowered: boolean;
  communicationProtocol: 'MQTT' | 'HTTP' | 'WEBSOCKET' | 'LORAWAN';
}

export interface SensorHealth {
  sensorId: string;
  status: SensorStatus;
  lastReadingAt: number;
  batteryLevel?: number; // 0 - 100%
  signalStrength?: number; // -120 to -30 dBm or 0 - 100%
  errorRate: number; // 0 - 1
  latencyMs: number;
  uptimeSeconds: number;
  diagnosticsMessage?: string;
}

export interface Sensor {
  id: string;
  name: string;
  type: SensorType;
  location: GeoPoint;
  zoneId: string;
  status: SensorStatus;
  capabilities: SensorCapability[] | readonly SensorCapability[];
  metadata: SensorMetadata;
  sourceMode: 'SIMULATION' | 'REAL_SENSOR';
  start(): Promise<void>;
  stop(): Promise<void>;
  getHealth(): SensorHealth;
}
