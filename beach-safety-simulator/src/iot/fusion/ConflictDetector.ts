import { SensorReading } from '../models/SensorReading';

export interface ConflictReport {
  hasConflict: boolean;
  parameter: string;
  readings: Array<{ sensorId: string; value: number; confidence: number }>;
  divergence: number;
  severity: 'NONE' | 'MODERATE' | 'SEVERE';
  message?: string;
}

export class ConflictDetector {
  /**
   * Check for conflicting values between multiple sensors measuring the same physical parameter
   */
  public static detectNumericConflict(
    parameter: string,
    readings: SensorReading<number>[],
    divergenceThreshold: number = 0.4
  ): ConflictReport {
    if (readings.length < 2) {
      return { hasConflict: false, parameter, readings: [], divergence: 0, severity: 'NONE' };
    }

    const values = readings.map((r) => r.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const divergence = Number((maxVal - minVal).toFixed(2));

    const readingData = readings.map((r) => ({
      sensorId: r.sensorId,
      value: r.value,
      confidence: r.confidence,
    }));

    if (divergence >= divergenceThreshold * 2) {
      return {
        hasConflict: true,
        parameter,
        readings: readingData,
        divergence,
        severity: 'SEVERE',
        message: `SEVERE TELEMETRY CONFLICT: ${parameter} sensors diverge by ${divergence} units (> ${divergenceThreshold * 2} threshold). High uncertainty flagged.`,
      };
    } else if (divergence >= divergenceThreshold) {
      return {
        hasConflict: true,
        parameter,
        readings: readingData,
        divergence,
        severity: 'MODERATE',
        message: `MODERATE TELEMETRY DIVERGENCE: ${parameter} sensors diverge by ${divergence} units. Using confidence-weighted fusion.`,
      };
    }

    return { hasConflict: false, parameter, readings: readingData, divergence, severity: 'NONE' };
  }
}
