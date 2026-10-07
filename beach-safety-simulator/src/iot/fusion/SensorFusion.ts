import { SensorReading } from '../models/SensorReading';
import { SensorType } from '../models/Sensor';
import { FusedReading, FusedEnvironmentState } from '../models/FusedReading';
import { ConflictDetector } from './ConflictDetector';

export class SensorFusion {
  /**
   * Fuse multi-sensor telemetry readings into a unified FusedEnvironmentState
   */
  public fuse(
    readings: SensorReading[],
    currentTime: number,
    timeDisplay: string
  ): FusedEnvironmentState {
    const fusedParameters: FusedReading[] = [];

    // 1. Fuse Tide Level & Water Level
    const tideReadings = readings.filter(
      (r) => (r.sensorType === SensorType.TIDE || r.sensorType === SensorType.WATER_LEVEL) && typeof r.value === 'number'
    ) as SensorReading<number>[];

    const tideConflict = ConflictDetector.detectNumericConflict('Tide Level', tideReadings, 0.35);
    const fusedTide = this.weightedAverage(tideReadings, 1.4, 'm', 'TIDE', tideConflict.hasConflict, tideConflict.message);
    fusedParameters.push(fusedTide);

    // 2. Fuse Wave Height
    const waveReadings = readings.filter(
      (r) => r.sensorType === SensorType.WAVE && typeof r.value === 'number'
    ) as SensorReading<number>[];

    const waveConflict = ConflictDetector.detectNumericConflict('Wave Height', waveReadings, 0.4);
    const fusedWave = this.weightedAverage(waveReadings, 1.2, 'm', 'WAVE_HEIGHT', waveConflict.hasConflict, waveConflict.message);
    fusedParameters.push(fusedWave);

    // 3. Fuse Water Current Speed
    const currentReadings = readings.filter(
      (r) => r.sensorType === SensorType.CURRENT && typeof r.value === 'number'
    ) as SensorReading<number>[];

    const currentConflict = ConflictDetector.detectNumericConflict('Current Speed', currentReadings, 0.3);
    const fusedCurrent = this.weightedAverage(currentReadings, 0.5, 'm/s', 'CURRENT_SPEED', currentConflict.hasConflict, currentConflict.message);
    fusedParameters.push(fusedCurrent);

    // 4. Fuse Wind Speed & Visibility from Weather Stations
    const weatherReadings = readings.filter((r) => r.sensorType === SensorType.WEATHER);
    let windSpeed = 15;
    let windDirection = 120;
    let visibility = 10;
    let weatherCondition: 'CLEAR' | 'CLOUDY' | 'RAIN' | 'STORM' | 'FOG' = 'CLEAR';

    if (weatherReadings.length > 0 && typeof weatherReadings[0].value === 'object' && weatherReadings[0].value !== null) {
      const w = weatherReadings[0].value as Record<string, any>;
      windSpeed = w.windSpeedKmh || 15;
      windDirection = w.windDirectionDeg || 120;
      visibility = w.visibilityKm || 10;
      weatherCondition = w.condition || 'CLEAR';
    }

    // Overall confidence calculation
    const confValues = fusedParameters.map((p) => p.confidence);
    const overallConfidence = confValues.length > 0
      ? Number((confValues.reduce((a, b) => a + b, 0) / confValues.length).toFixed(2))
      : 0.9;

    return {
      timestamp: currentTime,
      timeDisplay,
      tideLevelM: typeof fusedTide.value === 'number' ? fusedTide.value : 1.4,
      tideChangeRate: 0.05,
      waveHeightM: typeof fusedWave.value === 'number' ? fusedWave.value : 1.2,
      wavePeriodS: 8.5,
      waveDirectionDeg: 110,
      currentSpeedMs: typeof fusedCurrent.value === 'number' ? fusedCurrent.value : 0.5,
      currentDirectionDeg: 180,
      waterLevelM: typeof fusedTide.value === 'number' ? fusedTide.value + 0.1 : 1.5,
      windSpeedKmh: windSpeed,
      windDirectionDeg: windDirection,
      visibilityKm: visibility,
      weatherCondition,
      overallConfidence,
      activeSensorsCount: readings.length,
      onlineSensorsCount: readings.filter((r) => r.status === 'VALID').length,
      fusedParameters,
    };
  }

  private weightedAverage(
    readings: SensorReading<number>[],
    defaultValue: number,
    unit: string,
    parameter: FusedReading['parameter'],
    hasConflict: boolean,
    conflictDetails?: string
  ): FusedReading<number> {
    if (readings.length === 0) {
      return {
        parameter,
        value: defaultValue,
        unit,
        confidence: 0.85,
        contributingSensors: ['SIMULATION_FALLBACK'],
        timestamp: Date.now(),
        quality: 'MEDIUM',
        conflictDetected: false,
      };
    }

    let totalWeight = 0;
    let weightedSum = 0;
    const contributingSensors: string[] = [];

    readings.forEach((r) => {
      // Weight is proportional to sensor confidence (squared)
      const weight = Math.max(0.1, r.confidence ** 2);
      weightedSum += r.value * weight;
      totalWeight += weight;
      contributingSensors.push(r.sensorId);
    });

    const value = Number((weightedSum / totalWeight).toFixed(2));
    // Penalize confidence if a sensor conflict was detected
    const avgConfidence = readings.reduce((sum, r) => sum + r.confidence, 0) / readings.length;
    const confidence = Number((hasConflict ? avgConfidence * 0.7 : avgConfidence).toFixed(2));

    let quality: FusedReading['quality'] = 'HIGH';
    if (confidence < 0.6 || hasConflict) quality = 'DEGRADED';
    else if (confidence < 0.8) quality = 'MEDIUM';

    return {
      parameter,
      value,
      unit,
      confidence,
      contributingSensors,
      timestamp: Date.now(),
      quality,
      conflictDetected: hasConflict,
      conflictDetails,
    };
  }
}
