/**
 * src/calibration/digitalTwinObservation.types.ts
 * 
 * TIDES — Phase 9: Digital Twin Calibration & Real-Time Synchronization
 * 
 * Unified Observation Data Contracts, Sensor Calibration Models,
 * Time Synchronization Schemas, Discrepancy Monitoring Records,
 * and Digital Twin Source Modes.
 */

export type SourceType =
  | 'ENVIRONMENTAL_SENSOR'
  | 'WEATHER_STATION'
  | 'WAVE_BUOY'
  | 'TIDE_GAUGE'
  | 'CV_CAMERA'
  | 'DRONE_TELEMETRY'
  | 'WRISTBAND_GATEWAY'
  | 'SURFACE_VESSEL';

export type ObservationVariableType =
  | 'WAVE_HEIGHT'
  | 'WAVE_PERIOD'
  | 'WAVE_DIRECTION'
  | 'WIND_SPEED'
  | 'WIND_DIRECTION'
  | 'TIDE_LEVEL'
  | 'WATER_CURRENT'
  | 'CURRENT_DIRECTION'
  | 'WATER_TEMPERATURE'
  | 'VISIBILITY'
  | 'CV_DETECTION'
  | 'DRONE_TELEMETRY'
  | 'WRISTBAND_STATUS';

export type DataQualityStatus =
  | 'VALID'
  | 'VALID_WITH_WARNINGS'
  | 'SUSPECTED_OUTLIER'
  | 'INVALID'
  | 'UNCALIBRATED'
  | 'STALE'
  | 'UNKNOWN_QUALITY';

export type ObservationProvenance =
  | 'MEASURED'
  | 'SIMULATED'
  | 'PROVIDER_FORECAST'
  | 'SYNTHETIC'
  | 'DERIVED';

export type TransportType =
  | 'LORA'
  | 'CELLULAR'
  | 'WIFI'
  | 'INTERNAL_BUS'
  | 'SATELLITE';

export type SyncStatus =
  | 'SYNCHRONIZED'
  | 'SYNCHRONIZING'
  | 'DELAYED'
  | 'STALE'
  | 'FAILED'
  | 'UNCALIBRATED'
  | 'UNRESOLVED';

export type DigitalTwinSourceMode =
  | 'SIMULATION_ONLY'           // Strict default: 100% deterministic physics & simulation
  | 'OBSERVED_ONLY'             // Displays validated observations for supported sensors
  | 'SIDE_BY_SIDE_COMPARISON'   // Renders both simulated and observed streams side-by-side
  | 'VALIDATED_SYNCHRONIZED';   // Displays twin overlay calibrated against verified observations

export type CalibrationMethod =
  | 'LINEAR_OFFSET_SCALE'
  | 'POLYNOMIAL_2ND'
  | 'TWO_POINT_REFERENCE'
  | 'LOOKUP_TABLE'
  | 'IDENTITY_UNCALIBRATED';

export type CalibrationValidationStatus =
  | 'CALIBRATED_VALID'
  | 'EXPIRED'
  | 'UNVALIDATED'
  | 'REJECTED';

export interface SensorCalibrationRecord {
  calibrationId: string;
  sensorId: string;
  variableType: ObservationVariableType;
  method: CalibrationMethod;
  coefficients: Record<string, number>; // e.g. { offset: 0.05, scaleFactor: 1.02, a: 0, b: 1, c: 0 }
  rawUnits: string;
  calibratedUnits: string;
  calibrationDate: number;      // Epoch ms
  effectiveStartDate: number;   // Epoch ms
  expiryDate: number;           // Epoch ms
  referenceInstrument: string;
  calibrationVersion: string;
  responsibleOperator: string;
  validationStatus: CalibrationValidationStatus;
  uncertaintyBand: number;      // e.g. ±0.05 meters
  notes?: string;
}

export interface UnifiedDigitalTwinObservation {
  observationId: string;
  sourceId: string;
  sourceType: SourceType;
  siteId: string;
  entityId?: string;
  variable: ObservationVariableType;
  rawValue: number | any;
  rawUnits: string;
  calibratedValue?: number | any;
  calibratedUnits?: string;
  sourceTimestamp: number;      // Epoch ms (source device clock)
  ingestionTimestamp: number;   // Epoch ms (backend arrival clock)
  clockOffsetMs: number;        // sourceTimestamp - ingestionTimestamp
  clockUncertaintyMs: number;   // Clock drift margin of error
  syncLatencyMs: number;        // Latency from source emission to digital twin ingestion
  location?: {
    latitude: number;
    longitude: number;
    altitudeM?: number;
  };
  localCoordinate?: {
    x: number;
    y: number;
    z?: number;
  };
  spatialUncertaintyMeters?: number;
  calibrationRecordId?: string;
  calibrationVersion?: string;
  qualityStatus: DataQualityStatus;
  provenance: ObservationProvenance;
  transportType: TransportType;
  measurementUncertainty: number; // e.g. ±0.15m
  syncStatus: SyncStatus;
  validationWarnings: string[];
}

export type DiscrepancyClassification =
  | 'WITHIN_TOLERANCE'
  | 'EXPECTED_VARIATION'
  | 'POTENTIAL_SENSOR_FAULT'
  | 'STALE_TWIN_STATE'
  | 'UNEXPECTED_DIVERGENCE'
  | 'INSUFFICIENT_EVIDENCE';

export interface DigitalTwinDiscrepancy {
  discrepancyId: string;
  siteId: string;
  entityId: string;
  variable: ObservationVariableType;
  observedValue: number;
  simulatedValue: number;
  units: string;
  absoluteDifference: number;
  relativeDifferencePct: number;
  measurementUncertainty: number;
  applicableTolerance: number;
  classification: DiscrepancyClassification;
  timestamp: number;
  sourceTimestamp: number;
  reviewStatus: 'PENDING_REVIEW' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'RESOLVED';
  reviewedBy?: string;
  reviewNotes?: string;
}

export interface DeviceSyncHealth {
  deviceId: string;
  deviceName: string;
  siteId: string;
  sourceType: SourceType;
  status: SyncStatus;
  lastObservationTimestamp: number;
  lastIngestionTimestamp: number;
  syncLatencyMs: number;
  totalUpdatesReceived: number;
  duplicateCount: number;
  outOfOrderCount: number;
  qualityWarningsCount: number;
  activeDiscrepanciesCount: number;
  calibrationStatus: CalibrationValidationStatus;
  lastKnownValue?: number;
  units?: string;
}

export interface SiteSyncSummary {
  siteId: string;
  siteName: string;
  totalDevices: number;
  synchronizedDevices: number;
  degradedOrStaleDevices: number;
  uncalibratedDevices: number;
  activeDiscrepanciesCount: number;
  averageSyncLatencyMs: number;
  overallHealthPct: number;
}

export interface DigitalTwinAuditEntry {
  auditId: string;
  timestamp: number;
  operatorId: string;
  action: string;
  targetId: string;
  details: string;
}

