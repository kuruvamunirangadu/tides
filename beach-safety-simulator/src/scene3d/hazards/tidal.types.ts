/**
 * tidal.types.ts
 * 
 * TIDES Phase 1 & Phase 2: Coastal Hydrodynamics & Rip-Current Mapping Types
 * Defines data structures for tidal current vectors, streamlines, fluorescent dye tracer,
 * longshore feeder channels, rip neck corridor, offshore expanding plume, and UI controls.
 */

export type TidalPhase = 'RISING' | 'FALLING' | 'HIGH' | 'LOW';

export type TidalFlowDisplayMode = 'COMPREHENSIVE' | 'VECTORS' | 'DYE_TRACER' | 'FEEDER_CHANNELS' | 'RIP_CORRIDOR';

export interface RipCorridorMetrics {
  corridorX: number;             // X = 12m
  corridorWidth: number;         // 18m
  neckVelocityMps: number;       // e.g. 1.85 m/s
  plumeExpansionMeters: number;  // 45m
  hazardLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
}

export interface TidalFlowState {
  tideLevelMeters: number;       // e.g. 1.4m
  tidePhase: TidalPhase;         // RISING (Flood), FALLING (Ebb), HIGH, LOW (Slack)
  currentSpeedMps: number;       // e.g. 0.85 m/s
  currentDirectionDeg: number;   // 0-360 degrees (0 = North/alongshore, 180 = Offshore seaward)
  flowVector: { x: number; z: number }; // Normalized flow direction vector
  waveHeightMeters: number;      // e.g. 1.2m
  provenance: string;            // 'SIMULATED - AP Coastal Hydrodynamics'
  isDemonstration: boolean;      // true if running illustrative scenario
  ripMetrics?: RipCorridorMetrics;
}

export interface TidalFlowConfig {
  visible: boolean;
  dyeTracerVisible: boolean;
  tideGaugeVisible: boolean;
  feederChannelsVisible: boolean;
  ripCorridorVisible: boolean;
  offshorePlumeVisible: boolean;
  streamlineDensity: 'LOW' | 'MEDIUM' | 'HIGH';
  dyeColor: string;             // '#22c55e' (Chartreuse Fluorescent Green)
  opacity: number;
}


