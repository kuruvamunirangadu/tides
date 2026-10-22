/**
 * src/scene3d/hazards/shoaling.types.ts
 * 
 * TIDES Phase 3: Wave Shoaling & Breaker Dynamics Type Definitions
 * 
 * Defines data structures, telemetry interfaces, and configuration contracts
 * for physical bathymetric wave transformation, wave steepening, McCowan wave breaking,
 * aerated foam rollers, and the coastal rip gap hazard indicator.
 */

export type BreakerType = 'SPILLING' | 'PLUNGING' | 'SURGING';

export interface WaveShoalingConfig {
  visible: boolean;
  shoalingMeshVisible: boolean;
  breakerLinesVisible: boolean;
  foamRollersVisible: boolean;
  ripGapVisible: boolean;
  breakerDemarcationVisible: boolean;
  opacity: number;
  waveScale: number;
}

export interface RipGapExtent {
  minX: number;
  maxX: number;
  centerX: number;
  centerDepthMeters: number;
  sandbarDepthMeters: number;
  isBreakerSuppressed: boolean;
}

export interface ShoalingHydroMetrics {
  deepWaterWaveHeight: number;      // H_0 in meters (e.g. 1.2m to 2.8m)
  wavePeriod: number;               // T_p in seconds (e.g. 6.0s to 12.0s)
  waveDirectionDeg: number;         // Propagation angle (degrees)
  deepWaterWavelengthMeters: number; // L_0 = (g * T^2) / (2 * PI)
  deepWaterCelerity: number;        // c_0 = sqrt(g * L_0 / 2PI) or g*T/(2PI) in m/s
  averageBeachSlope: number;        // tan(beta) (e.g. 0.035 for Rushikonda sandy beach)
  iribarrenNumber: number;          // Xi = tan(beta) / sqrt(H_0 / L_0)
  breakerType: BreakerType;         // SPILLING (< 0.5), PLUNGING (0.5 to 3.3), SURGING (> 3.3)
  breakerIndexGamma: number;        // gamma_b = H_b / h_b (McCowan criterion = 0.78)
  breakerWaveHeight: number;        // H_b in meters
  breakerDepthMeters: number;       // h_b in meters where wave breaks
  surfZoneWidthMeters: number;      // Distance (m) from breaker line to mean shoreline
  maxShoalingFactor: number;        // K_s = H / H_0 peak amplification
  ripGap: RipGapExtent;             // Visual and hydrodynamic gap in breakers over trench
  timestampMs: number;
}

export interface WaveCrestNode {
  x: number;
  y: number;
  z: number;
  phase: number;
  steepness: number;
  isBreaking: boolean;
  localDepth: number;
  shoalingFactor: number;
}

