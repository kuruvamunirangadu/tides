/**
 * src/calibration/types.ts
 * Type definitions for TIDES Milestone 8:
 * Digital Twin Calibration, Real-Time Data & Field Validation.
 */

export type DataProvenance = 'MEASURED' | 'PROVIDER_FORECAST' | 'SYNTHETIC' | 'DERIVED';

export type QualityStatus = 'VALID' | 'STALE' | 'OUT_OF_RANGE' | 'MALFORMED' | 'DUPLICATE' | 'OUTAGE';

export type EnvironmentalVariableType =
  | 'WAVE_HEIGHT'
  | 'WAVE_PERIOD'
  | 'WAVE_DIRECTION'
  | 'WIND_SPEED'
  | 'WIND_DIRECTION'
  | 'TIDE_LEVEL'
  | 'WATER_CURRENT'
  | 'CURRENT_DIRECTION'
  | 'WATER_TEMPERATURE'
  | 'VISIBILITY';

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
  altitudeM?: number;
}

export interface LocalCoordinate {
  x: number;
  y: number;
  z?: number;
}

export interface EnvironmentalObservation {
  id: string;
  sourceId: string;
  sourceName: string;
  variable: EnvironmentalVariableType;
  value: number;
  units: string;
  rawValue?: number;
  rawUnits?: string;
  observationTimestamp: number; // Unix seconds
  ingestionTimestamp: number;   // Unix seconds
  location?: GeoCoordinate;
  provenance: DataProvenance;
  qualityStatus: QualityStatus;
  validationWarnings: string[];
}

export interface CalibrationMetric {
  variable: EnvironmentalVariableType;
  mae: number | null;
  rmse: number | null;
  bias: number | null;
  sampleCount: number;
  unvalidatedReason?: string | null;
}

export type DatasetSplit = 'CALIBRATION' | 'EVALUATION_HOLDOUT';

export interface DatasetManifest {
  datasetId: string;
  name: string;
  source: string;
  collectionMethod: string;
  timeRangeStart: number;
  timeRangeEnd: number;
  geographicBounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
  variables: EnvironmentalVariableType[];
  missingDataRate: number; // e.g. 0.035 = 3.5%
  provenance: DataProvenance;
  split: DatasetSplit;
  checksumSha256: string;
  limitations: string[];
}

export interface GeographicBenchmarkPoint {
  pointId: string;
  name: string;
  wgs84: GeoCoordinate;
  expectedLocal: LocalCoordinate;
  measuredResidualErrorM: number;
  status: 'VERIFIED' | 'PENDING' | 'UNCERTAIN';
}

export interface CalibrationExperiment {
  experimentId: string;
  createdAt: number;
  baselineConfig: Record<string, number>;
  candidateParameters: Record<string, number>;
  calibrationMetrics: Record<string, CalibrationMetric>;
  evaluationMetrics: Record<string, CalibrationMetric>; // Evaluated on independent holdout
  status: 'PROPOSED' | 'APPLIED_BY_OPERATOR' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: number;
  provenanceManifestId: string;
}

// Re-export Phase 9 Digital Twin Synchronization & Calibration Contracts
export * from './digitalTwinObservation.types';

