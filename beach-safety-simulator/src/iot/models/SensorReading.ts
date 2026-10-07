import { SensorType } from './Sensor';
import { GeoPoint } from '../../gis/models/GeoPoint';

export type ReadingStatus = 'VALID' | 'STALE' | 'MISSING' | 'FAILED' | 'OUT_OF_BOUNDS';

export interface SensorReading<T = any> {
  sensorId: string;
  sensorType: SensorType;
  timestamp: number;
  timeDisplay: string;
  value: T;
  unit: string;
  location: GeoPoint;
  confidence: number; // 0.0 to 1.0
  status: ReadingStatus;
  source: 'SIMULATOR' | 'REAL_SENSOR';
  metadata?: Record<string, unknown>;
}

export interface TideReadingPayload {
  tideHeightM: number;
  rateOfChangeMph: number;
  trend: 'RISING' | 'FALLING' | 'SLACK';
}

export interface WaveReadingPayload {
  waveHeightM: number;
  wavePeriodS: number;
  waveDirectionDeg: number;
  waveEnergyKjM2?: number;
}

export interface CurrentReadingPayload {
  currentSpeedMs: number;
  currentDirectionDeg: number;
  depthM: number;
}

export interface WeatherReadingPayload {
  temperatureC: number;
  humidityPct: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  pressureHpa: number;
  visibilityKm: number;
  rainfallMm: number;
  condition: 'CLEAR' | 'CLOUDY' | 'RAIN' | 'STORM' | 'FOG';
}

export interface WaterLevelReadingPayload {
  waterLevelM: number;
  sensorElevationM: number;
}

export interface GPSReadingPayload {
  deviceId: string;
  latitude: number;
  longitude: number;
  speedMs: number;
  headingDeg: number;
  accuracyM: number;
}
