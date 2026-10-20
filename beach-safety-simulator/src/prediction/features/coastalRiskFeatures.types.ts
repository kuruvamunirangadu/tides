/**
 * coastalRiskFeatures.types.ts
 * 
 * TIDES — Phase 7: Feature Engineering Contracts
 * 
 * Strict time-aware feature representations for coastal risk forecasting.
 * Guarantees zero future-data leakage through explicit temporal cutoffs.
 */

export interface CoastalZoneFeatureVector {
  zoneId: string;
  featureTimestamp: number; // Cutoff epoch ms

  // Wave Hydrodynamics
  waveHeightCurrent: number;
  waveHeightRollingMean5m: number;
  waveHeightRollingMean15m: number;
  waveHeightRateOfChangePerMin: number; // m/min
  wavePeriodCurrent: number;

  // Water Current & Rip Forcing
  currentSpeedCurrent: number;
  currentSpeedRollingMean5m: number;
  currentSpeedRateOfChangePerMin: number; // (m/s)/min

  // Tide Dynamics
  tideLevelCurrent: number;
  tideRateOfChangeMph: number;
  isEbbTide: boolean; // Falling tide is prime rip condition

  // Meteorological & Wind Coupling
  windSpeedCurrent: number;
  windWaveCouplingIndex: number; // waveHeight * (windSpeed / 50)

  // Crowd & Bathymetry Exposure
  visitorCountInZone: number;
  swimmerCountInZone: number;
  zoneBathymetryHazardFactor: number; // 0.0 - 1.0
  recentIncidentsCountInZone: number; // in past 30m

  // Ingestion Quality & Provenance
  inputQualityScore: number; // 0.0 - 1.0 based on data freshness & validity
  isDataDegradedOrStale: boolean;
  provenance: 'MEASURED' | 'SIMULATED' | 'SYNTHETIC';
}

