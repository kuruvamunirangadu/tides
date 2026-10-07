import { Position } from '../../models/Incident';

export type SensorStatus = 'VALID' | 'STALE' | 'MISSING' | 'FAILED';

export interface SensorReading<T> {
  value?: T;
  status: SensorStatus;
  confidence: number; // 0.0 - 1.0
  timestamp: number;
  source: string;
}

export interface PositionReading {
  actual?: Position;
  estimated: Position;
  errorRadius: number; // in meters/pixels (e.g. +/-2m, +/-10m, +/-50m)
  confidence: number;
  status: 'VALID' | 'DEGRADED' | 'FAILED';
}

export interface SensorConflict {
  parameter: string;
  sensorIds: string[];
  readings: { source: string; value: number; confidence: number }[];
  disagreementScore: number; // 0.0 - 1.0 (Higher = more severe conflict)
  resolvedValue: number;
  resolutionMethod: 'AVERAGE' | 'WEIGHTED' | 'MOST_CONFIDENT' | 'MANUAL' | 'UNKNOWN';
}
