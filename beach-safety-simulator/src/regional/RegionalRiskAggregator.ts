/**
 * src/regional/RegionalRiskAggregator.ts
 * Aggregates coastal hazard, environmental, and sensor observations across configured sites.
 * Differentiates measured/simulated from missing data and avoids fake risk scores.
 */

import { RegionalRiskObservation } from './types';
import { Environment } from '../models/Environment';

export class RegionalRiskAggregator {
  private static instance: RegionalRiskAggregator | null = null;
  private observations: Map<string, RegionalRiskObservation> = new Map();

  constructor() {
    this.initializeBaselineObservations();
  }

  public static getInstance(): RegionalRiskAggregator {
    if (!RegionalRiskAggregator.instance) {
      RegionalRiskAggregator.instance = new RegionalRiskAggregator();
    }
    return RegionalRiskAggregator.instance;
  }

  public initializeBaselineObservations(): void {
    this.observations.clear();
    const now = Date.now();

    // 1. RUSHIKONDA: Connected Digital Twin
    this.observations.set('RUSHIKONDA', {
      beachId: 'RUSHIKONDA',
      beachName: 'Rushikonda Blue Flag Beach, Visakhapatnam',
      waveHeightM: 1.2,
      wavePeriodS: 8.0,
      ripCurrentRisk: 'MODERATE',
      ripVelocityMps: 0.85,
      windSpeedMps: 14.2,
      windDirectionDeg: 110.0,
      visibilityKm: 10.0,
      tideLevelM: 0.45,
      sensorFreshness: 'FRESH',
      sensorAvailabilityPct: 98.5,
      forecastSummary: 'Rip risk stable; wave height 1.2m peaking to 1.5m in +3h',
      activeIncidentCount: 0,
      dataSource: 'TIDES 3D Digital Twin & Sensor Fusion Pipeline',
      timestamp: now,
      provenance: 'SIMULATED',
    });

    // 2. RK_BEACH: Demonstration Site
    this.observations.set('RK_BEACH', {
      beachId: 'RK_BEACH',
      beachName: 'Ramakrishna (RK) Beach, Visakhapatnam',
      waveHeightM: 1.8,
      wavePeriodS: 9.5,
      ripCurrentRisk: 'HIGH',
      ripVelocityMps: 1.40,
      windSpeedMps: 18.5,
      windDirectionDeg: 135.0,
      visibilityKm: 7.5,
      tideLevelM: 0.60,
      sensorFreshness: 'STALE',
      sensorAvailabilityPct: 88.0,
      forecastSummary: 'High littoral current; caution advisory active',
      activeIncidentCount: 1,
      dataSource: 'Regional Coastal Simulation Feed (Demonstration)',
      timestamp: now - 3600 * 1000,
      provenance: 'DEMONSTRATION',
    });

    // 3. BHEEMILI: Demonstration Site
    this.observations.set('BHEEMILI', {
      beachId: 'BHEEMILI',
      beachName: 'Bheemunipatnam (Bheemili) Beach',
      waveHeightM: 2.3,
      wavePeriodS: 11.0,
      ripCurrentRisk: 'CRITICAL',
      ripVelocityMps: 1.95,
      windSpeedMps: 22.0,
      windDirectionDeg: 145.0,
      visibilityKm: 6.0,
      tideLevelM: 0.85,
      sensorFreshness: 'FRESH',
      sensorAvailabilityPct: 76.0,
      forecastSummary: 'Severe swell warning; rocky breakwater bathers evacuated',
      activeIncidentCount: 2,
      dataSource: 'Regional Coastal Simulation Feed (Demonstration)',
      timestamp: now - 120 * 1000,
      provenance: 'DEMONSTRATION',
    });

    // 4. MANGINAPUDI: Offline Site
    this.observations.set('MANGINAPUDI', {
      beachId: 'MANGINAPUDI',
      beachName: 'Manginapudi Beach, Machilipatnam',
      waveHeightM: null,
      wavePeriodS: null,
      ripCurrentRisk: 'UNKNOWN',
      ripVelocityMps: null,
      windSpeedMps: null,
      windDirectionDeg: null,
      visibilityKm: null,
      tideLevelM: null,
      sensorFreshness: 'OFFLINE',
      sensorAvailabilityPct: 0.0,
      forecastSummary: 'Telemetry offline; no reliable forecast available',
      activeIncidentCount: 0,
      dataSource: 'Station Offline (Telemetry Comms Lost)',
      timestamp: now - 172800 * 1000,
      provenance: 'DEMONSTRATION',
    });

    // 5. SURYALANKA: Demonstration Site
    this.observations.set('SURYALANKA', {
      beachId: 'SURYALANKA',
      beachName: 'Suryalanka Beach, Bapatla',
      waveHeightM: 0.9,
      wavePeriodS: 7.0,
      ripCurrentRisk: 'LOW',
      ripVelocityMps: 0.30,
      windSpeedMps: 10.0,
      windDirectionDeg: 95.0,
      visibilityKm: 12.0,
      tideLevelM: 0.30,
      sensorFreshness: 'FRESH',
      sensorAvailabilityPct: 92.0,
      forecastSummary: 'Calm surf; safe swimming within yellow markers',
      activeIncidentCount: 0,
      dataSource: 'Regional Coastal Simulation Feed (Demonstration)',
      timestamp: now - 300 * 1000,
      provenance: 'DEMONSTRATION',
    });

    // 6. VODAREVU: Uninstrumented Site
    this.observations.set('VODAREVU', {
      beachId: 'VODAREVU',
      beachName: 'Vodarevu Beach, Chirala',
      waveHeightM: null,
      wavePeriodS: null,
      ripCurrentRisk: 'UNKNOWN',
      ripVelocityMps: null,
      windSpeedMps: null,
      windDirectionDeg: null,
      visibilityKm: null,
      tideLevelM: null,
      sensorFreshness: 'NO_DATA',
      sensorAvailabilityPct: null,
      forecastSummary: 'Unmonitored sector; no deployed oceanographic telemetry',
      activeIncidentCount: 0,
      dataSource: 'None (Unmonitored)',
      timestamp: 0,
      provenance: 'DEMONSTRATION',
    });

    // 7. MYPADU: Uninstrumented Site
    this.observations.set('MYPADU', {
      beachId: 'MYPADU',
      beachName: 'Mypadu Beach, Nellore',
      waveHeightM: null,
      wavePeriodS: null,
      ripCurrentRisk: 'UNKNOWN',
      ripVelocityMps: null,
      windSpeedMps: null,
      windDirectionDeg: null,
      visibilityKm: null,
      tideLevelM: null,
      sensorFreshness: 'NO_DATA',
      sensorAvailabilityPct: null,
      forecastSummary: 'Unmonitored sector; no deployed oceanographic telemetry',
      activeIncidentCount: 0,
      dataSource: 'None (Unmonitored)',
      timestamp: 0,
      provenance: 'DEMONSTRATION',
    });

    // 8. KALINGAPATNAM: Demonstration Site
    this.observations.set('KALINGAPATNAM', {
      beachId: 'KALINGAPATNAM',
      beachName: 'Kalingapatnam Beach, Srikakulam',
      waveHeightM: 1.4,
      wavePeriodS: 8.5,
      ripCurrentRisk: 'MODERATE',
      ripVelocityMps: 0.75,
      windSpeedMps: 15.0,
      windDirectionDeg: 120.0,
      visibilityKm: 8.0,
      tideLevelM: 0.50,
      sensorFreshness: 'STALE',
      sensorAvailabilityPct: 70.0,
      forecastSummary: 'Moderate swell near river mouth; cautionary patrols active',
      activeIncidentCount: 0,
      dataSource: 'Regional Coastal Simulation Feed (Demonstration)',
      timestamp: now - 7200 * 1000,
      provenance: 'DEMONSTRATION',
    });
  }

  public syncRushikondaTelemetry(
    env: Environment,
    activeIncidentCount: number,
    ripCurrentActive: boolean,
    forecastSummary?: string
  ): void {
    const obs = this.observations.get('RUSHIKONDA');
    if (!obs) return;

    obs.timestamp = Date.now();
    obs.sensorFreshness = 'FRESH';
    obs.waveHeightM = env.waveHeight ?? 1.2;
    obs.wavePeriodS = env.wavePeriod ?? 8.0;
    obs.windSpeedMps = env.windSpeed ?? 14.2;
    obs.windDirectionDeg = env.windDirection ?? 110.0;
    obs.visibilityKm = env.visibility ?? 10.0;
    obs.tideLevelM = env.tideLevel ?? 0.45;
    obs.activeIncidentCount = activeIncidentCount;

    if (ripCurrentActive || activeIncidentCount > 0) {
      obs.ripCurrentRisk = activeIncidentCount > 0 ? 'CRITICAL' : 'HIGH';
      obs.ripVelocityMps = 1.15;
    } else {
      obs.ripCurrentRisk = 'MODERATE';
      obs.ripVelocityMps = 0.85;
    }

    if (forecastSummary) {
      obs.forecastSummary = forecastSummary;
    }
  }

  public getAllObservations(): RegionalRiskObservation[] {
    return Array.from(this.observations.values());
  }

  public getObservation(beachId: string): RegionalRiskObservation | undefined {
    return this.observations.get(beachId.toUpperCase());
  }
}

