export interface FusedReading<T = number | Record<string, unknown>> {
  parameter: 'TIDE' | 'WAVE_HEIGHT' | 'WAVE_PERIOD' | 'CURRENT_SPEED' | 'WIND_SPEED' | 'VISIBILITY' | 'WATER_LEVEL';
  value: T;
  unit: string;
  confidence: number; // 0.0 - 1.0
  contributingSensors: string[];
  timestamp: number;
  quality: 'HIGH' | 'MEDIUM' | 'LOW' | 'DEGRADED';
  conflictDetected: boolean;
  conflictDetails?: string;
}

export interface FusedEnvironmentState {
  timestamp: number;
  timeDisplay: string;
  tideLevelM: number;
  tideChangeRate: number;
  waveHeightM: number;
  wavePeriodS: number;
  waveDirectionDeg: number;
  currentSpeedMs: number;
  currentDirectionDeg: number;
  waterLevelM: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  visibilityKm: number;
  weatherCondition: 'CLEAR' | 'CLOUDY' | 'RAIN' | 'STORM' | 'FOG';
  overallConfidence: number;
  activeSensorsCount: number;
  onlineSensorsCount: number;
  fusedParameters: FusedReading[];
}
