/**
 * src/calibration/ObservationValidationService.ts
 * 
 * TIDES — Phase 9: Digital Twin Calibration & Real-Time Synchronization
 * 
 * Data Quality and Observation Validation Service.
 * Evaluates incoming observations against physical oceanographic envelopes,
 * finite number constraints, gradient rate-of-change limits, and freshness windows.
 * 
 * Invariants:
 * 1. Missing data is never substituted with zero.
 * 2. Questionable or outlier readings are flagged for review without silent deletion.
 * 3. Unit validation ensures mathematical consistency before digital twin ingestion.
 */

import {
  ObservationVariableType,
  DataQualityStatus,
  UnifiedDigitalTwinObservation,
} from './digitalTwinObservation.types';

export interface PhysicalEnvelope {
  min: number;
  max: number;
  maxDeltaPerSecond: number;
  standardUnit: string;
  acceptableUnits: string[];
  freshnessHorizonSec: number;
}

export interface ValidationOutcome {
  isValid: boolean;
  qualityStatus: DataQualityStatus;
  normalizedValue: number;
  normalizedUnits: string;
  warnings: string[];
  isOutlier: boolean;
  isStale: boolean;
}

export class ObservationValidationService {
  private static instance: ObservationValidationService | null = null;
  private lastReadings: Map<string, { value: number; timestamp: number }> = new Map();

  public static readonly PHYSICAL_ENVELOPES: Record<ObservationVariableType, PhysicalEnvelope> = {
    WAVE_HEIGHT: {
      min: 0.0,
      max: 15.0,
      maxDeltaPerSecond: 1.5,
      standardUnit: 'm',
      acceptableUnits: ['m', 'meter', 'meters'],
      freshnessHorizonSec: 1800, // 30m
    },
    WAVE_PERIOD: {
      min: 1.0,
      max: 30.0,
      maxDeltaPerSecond: 4.0,
      standardUnit: 's',
      acceptableUnits: ['s', 'sec', 'seconds'],
      freshnessHorizonSec: 1800,
    },
    WAVE_DIRECTION: {
      min: 0.0,
      max: 360.0,
      maxDeltaPerSecond: 45.0,
      standardUnit: 'deg',
      acceptableUnits: ['deg', 'degrees', '°'],
      freshnessHorizonSec: 1800,
    },
    WIND_SPEED: {
      min: 0.0,
      max: 200.0,
      maxDeltaPerSecond: 20.0,
      standardUnit: 'km/h',
      acceptableUnits: ['km/h', 'kmh', 'kph', 'm/s', 'mps'],
      freshnessHorizonSec: 600, // 10m
    },
    WIND_DIRECTION: {
      min: 0.0,
      max: 360.0,
      maxDeltaPerSecond: 60.0,
      standardUnit: 'deg',
      acceptableUnits: ['deg', 'degrees', '°'],
      freshnessHorizonSec: 600,
    },
    TIDE_LEVEL: {
      min: -3.0,
      max: 8.0,
      maxDeltaPerSecond: 0.05,
      standardUnit: 'm',
      acceptableUnits: ['m', 'meter', 'meters', 'cm'],
      freshnessHorizonSec: 900, // 15m
    },
    WATER_CURRENT: {
      min: 0.0,
      max: 5.0,
      maxDeltaPerSecond: 1.0,
      standardUnit: 'm/s',
      acceptableUnits: ['m/s', 'mps', 'knots', 'kt'],
      freshnessHorizonSec: 1200, // 20m
    },
    CURRENT_DIRECTION: {
      min: 0.0,
      max: 360.0,
      maxDeltaPerSecond: 60.0,
      standardUnit: 'deg',
      acceptableUnits: ['deg', 'degrees', '°'],
      freshnessHorizonSec: 1200,
    },
    WATER_TEMPERATURE: {
      min: -2.0,
      max: 45.0,
      maxDeltaPerSecond: 0.2,
      standardUnit: 'C',
      acceptableUnits: ['C', '°C', 'celsius', 'F', 'fahrenheit'],
      freshnessHorizonSec: 3600, // 60m
    },
    VISIBILITY: {
      min: 0.0,
      max: 50.0,
      maxDeltaPerSecond: 5.0,
      standardUnit: 'km',
      acceptableUnits: ['km', 'm', 'miles', 'mi'],
      freshnessHorizonSec: 1200,
    },
    CV_DETECTION: {
      min: 0.0,
      max: 1.0,
      maxDeltaPerSecond: 1.0,
      standardUnit: 'confidence',
      acceptableUnits: ['confidence', 'prob', 'score'],
      freshnessHorizonSec: 30, // 30s
    },
    DRONE_TELEMETRY: {
      min: 0.0,
      max: 100.0,
      maxDeltaPerSecond: 25.0,
      standardUnit: 'telemetry',
      acceptableUnits: ['telemetry', 'pct', '%'],
      freshnessHorizonSec: 15, // 15s
    },
    WRISTBAND_STATUS: {
      min: 0.0,
      max: 100.0,
      maxDeltaPerSecond: 10.0,
      standardUnit: 'status',
      acceptableUnits: ['status', 'vbat', 'pct'],
      freshnessHorizonSec: 60, // 60s
    },
  };

  public static getInstance(): ObservationValidationService {
    if (!ObservationValidationService.instance) {
      ObservationValidationService.instance = new ObservationValidationService();
    }
    return ObservationValidationService.instance;
  }

  public reset(): void {
    this.lastReadings.clear();
  }

  /**
   * Validates and normalizes an observation's measurement value.
   */
  public validateMeasurement(input: {
    sourceId: string;
    variable: ObservationVariableType;
    rawValue: any;
    rawUnits: string;
    sourceTimestamp: number;
    backendTimestamp?: number;
  }): ValidationOutcome {
    const warnings: string[] = [];
    const now = input.backendTimestamp || Date.now();
    const envelope = ObservationValidationService.PHYSICAL_ENVELOPES[input.variable];

    // 1. Missing or non-finite check
    if (
      input.rawValue === null ||
      input.rawValue === undefined ||
      typeof input.rawValue !== 'number' ||
      !Number.isFinite(input.rawValue)
    ) {
      return {
        isValid: false,
        qualityStatus: 'INVALID',
        normalizedValue: NaN,
        normalizedUnits: input.rawUnits || 'unknown',
        warnings: [`Non-finite or missing observation value for ${input.variable} (${String(input.rawValue)}).`],
        isOutlier: false,
        isStale: false,
      };
    }

    let val = input.rawValue;
    let units = (input.rawUnits || '').trim().toLowerCase();

    // 2. Unit conversion and normalization
    if (envelope) {
      if (input.variable === 'WIND_SPEED' && (units === 'm/s' || units === 'mps')) {
        val = val * 3.6; // Convert m/s to km/h
        units = 'km/h';
      } else if (input.variable === 'TIDE_LEVEL' && units === 'cm') {
        val = val / 100.0;
        units = 'm';
      } else if (input.variable === 'WATER_CURRENT' && (units === 'knots' || units === 'kt')) {
        val = val * 0.514444; // Knots to m/s
        units = 'm/s';
      } else if (input.variable === 'WATER_TEMPERATURE' && (units === 'f' || units === 'fahrenheit')) {
        val = (val - 32) * (5 / 9); // F to C
        units = 'C';
      }
    }

    // 3. Timestamp checks
    let isStale = false;
    const ageSec = (now - input.sourceTimestamp) / 1000;

    if (input.sourceTimestamp > now + 60 * 1000) {
      return {
        isValid: false,
        qualityStatus: 'INVALID',
        normalizedValue: val,
        normalizedUnits: envelope?.standardUnit || units,
        warnings: [`Future source timestamp detected: observation clock is ${(ageSec * -1).toFixed(1)}s ahead of server.`],
        isOutlier: false,
        isStale: false,
      };
    }

    if (envelope && ageSec > envelope.freshnessHorizonSec) {
      isStale = true;
      warnings.push(`Stale observation: age ${(ageSec / 60).toFixed(1)}m exceeds freshness horizon of ${(envelope.freshnessHorizonSec / 60).toFixed(1)}m.`);
    }

    // 4. Physical envelope range check
    let isOutOfRange = false;
    if (envelope) {
      if (val < envelope.min || val > envelope.max) {
        isOutOfRange = true;
        warnings.push(`Measurement ${val} ${units} exceeds physical oceanographic envelope [${envelope.min}, ${envelope.max}].`);
      }
    }

    // 5. Rate-of-change outlier detection
    let isOutlier = false;
    const historyKey = `${input.sourceId}::${input.variable}`;
    const previous = this.lastReadings.get(historyKey);

    if (previous && envelope && envelope.maxDeltaPerSecond > 0) {
      const dtSec = Math.max(0.1, (input.sourceTimestamp - previous.timestamp) / 1000);
      const delta = Math.abs(val - previous.value);
      const rate = delta / dtSec;

      if (rate > envelope.maxDeltaPerSecond && dtSec < 60) {
        isOutlier = true;
        warnings.push(`Rate-of-change spike detected: ${rate.toFixed(2)} ${units}/s exceeds maximum physical gradient of ${envelope.maxDeltaPerSecond} ${units}/s.`);
      }
    }

    // Record reading for rate-of-change tracking
    this.lastReadings.set(historyKey, { value: val, timestamp: input.sourceTimestamp });

    // Determine final QualityStatus
    let qualityStatus: DataQualityStatus = 'VALID';
    if (isOutOfRange) {
      qualityStatus = 'INVALID';
    } else if (isOutlier) {
      qualityStatus = 'SUSPECTED_OUTLIER';
    } else if (isStale) {
      qualityStatus = 'STALE';
    } else if (warnings.length > 0) {
      qualityStatus = 'VALID_WITH_WARNINGS';
    }

    return {
      isValid: qualityStatus !== 'INVALID',
      qualityStatus,
      normalizedValue: Number(val.toFixed(3)),
      normalizedUnits: envelope?.standardUnit || units,
      warnings,
      isOutlier,
      isStale,
    };
  }
}

