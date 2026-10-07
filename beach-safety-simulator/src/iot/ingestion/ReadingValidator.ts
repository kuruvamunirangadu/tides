import { SensorReading } from '../models/SensorReading';
import { SensorType } from '../models/Sensor';

export interface ValidationResult {
  isValid: boolean;
  status: 'VALID' | 'OUT_OF_BOUNDS' | 'STALE' | 'INVALID_SCHEMA';
  reasons: string[];
}

export class ReadingValidator {
  /**
   * Validate physical bounds and schema for any sensor reading
   */
  public static validate(reading: SensorReading, currentTime: number): ValidationResult {
    const reasons: string[] = [];

    if (!reading || !reading.sensorId || !reading.sensorType) {
      return { isValid: false, status: 'INVALID_SCHEMA', reasons: ['Missing sensor identity fields'] };
    }

    // Timestamp sanity check (not in future by > 5s, not older than 120s)
    const ageSeconds = currentTime - reading.timestamp;
    if (ageSeconds > 120) {
      reasons.push(`Stale reading: data age ${ageSeconds.toFixed(1)}s exceeds threshold (120s)`);
      return { isValid: false, status: 'STALE', reasons };
    }
    if (ageSeconds < -5) {
      reasons.push('Invalid future timestamp detected');
      return { isValid: false, status: 'INVALID_SCHEMA', reasons };
    }

    // Numeric physical bounds checks based on sensor type
    if (typeof reading.value === 'number') {
      const val = reading.value;
      switch (reading.sensorType) {
        case SensorType.TIDE:
        case SensorType.WATER_LEVEL:
          if (val < -2.0 || val > 6.0) reasons.push(`Tide/Water level ${val}m out of physical bounds (-2.0m to 6.0m)`);
          break;
        case SensorType.WAVE:
          if (val < 0.0 || val > 12.0) reasons.push(`Wave height ${val}m out of physical bounds (0.0m to 12.0m)`);
          break;
        case SensorType.CURRENT:
          if (val < 0.0 || val > 5.0) reasons.push(`Current speed ${val}m/s out of physical bounds (0.0m/s to 5.0m/s)`);
          break;
        case SensorType.WEATHER:
          if (val < 0.0 || val > 200.0) reasons.push(`Wind speed ${val} km/h out of physical bounds (0 to 200 km/h)`);
          break;
      }
    } else if (typeof reading.value === 'object' && reading.value !== null) {
      const payload = reading.value as Record<string, any>;
      if (reading.sensorType === SensorType.WAVE && typeof payload.waveHeightM === 'number') {
        if (payload.waveHeightM < 0 || payload.waveHeightM > 12) reasons.push(`Wave height ${payload.waveHeightM}m out of bounds`);
      }
      if (reading.sensorType === SensorType.CURRENT && typeof payload.currentSpeedMs === 'number') {
        if (payload.currentSpeedMs < 0 || payload.currentSpeedMs > 5) reasons.push(`Current speed ${payload.currentSpeedMs}m/s out of bounds`);
      }
    }

    if (reasons.length > 0) {
      return { isValid: false, status: 'OUT_OF_BOUNDS', reasons };
    }

    return { isValid: true, status: 'VALID', reasons: [] };
  }
}
