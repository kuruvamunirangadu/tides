export interface HazardThresholds {
  // Wave thresholds (meters)
  waveCautionM: number;
  waveDangerM: number;
  waveCriticalM: number;

  // Long period swell for heavy shorebreak (seconds)
  swellPeriodWarningS: number;

  // Current speed thresholds (m/s)
  currentCautionMps: number;
  currentDangerMps: number;
  currentCriticalMps: number;

  // Rip current probability velocity (m/s)
  ripThresholdMps: number;

  // Tide change rate thresholds (m/hr)
  tideRateCautionMph: number;

  // Visibility (km)
  visibilityCautionKm: number;
  visibilityCriticalKm: number;

  // Wind speed (km/h)
  windCautionKmh: number;
  windDangerKmh: number;
}

export const DEFAULT_HAZARD_THRESHOLDS: HazardThresholds = {
  waveCautionM: 1.3,
  waveDangerM: 1.8,
  waveCriticalM: 2.4,

  swellPeriodWarningS: 9.5,

  currentCautionMps: 0.45,
  currentDangerMps: 0.70,
  currentCriticalMps: 1.0,

  ripThresholdMps: 0.50,

  tideRateCautionMph: 0.35,

  visibilityCautionKm: 5.0,
  visibilityCriticalKm: 2.0,

  windCautionKmh: 24.0,
  windDangerKmh: 35.0,
};
