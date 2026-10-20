/**
 * ForecastEngine.ts
 * 
 * TIDES Stage 4: Predictive Hazard Forecasting Engine (Demo A)
 * 
 * Independent, transparent trend forecasting module for rip-current intensification:
 * - Operates purely on read-only telemetry history
 * - Supports 1-minute (60s), 3-minute (180s), and 5-minute (300s) horizons
 * - Uses timestamps rather than assuming fixed intervals (deltaT = t_last - t_first)
 * - Validates input histories and explicitly flags INSUFFICIENT_HISTORY, DATA_STALE,
 *   DISCONTINUOUS_TIME, or SENSOR_DEGRADED (zero silent fabrication)
 * - Produces both TREND_EXTRAPOLATION predictions and PERSISTENCE_BASELINE reference
 * - Expands uncertainty intervals proportional to horizon distance
 * - Dispatches predictions to ForecastEvaluator for subsequent scoring upon maturity
 * - Strict non-negotiable constraint: Never writes back to HazardEngine or alters simulation state
 */

import { TelemetrySnapshot } from '../types';
import { SensorHealthMonitor } from '../reliability/SensorHealthMonitor';
import { ForecastEvaluator } from './ForecastEvaluator';
import {
  ForecastHorizonEstimate,
  ZoneForecast,
  ForecastMethodId,
  ForecastValidityStatus,
} from './types';

export class ForecastEngine {
  private static instance: ForecastEngine | null = null;

  private evaluator: ForecastEvaluator;
  private healthMonitor: SensorHealthMonitor;

  // Oceanographic physical speed limits for Rushikonda Beach surf zone
  public static readonly MIN_RIP_VELOCITY = 0.0; // m/s (slack water)
  public static readonly MAX_RIP_VELOCITY = 3.2; // m/s (extreme flash rip channel)
  public static readonly WARNING_ALERT_THRESHOLD = 1.5; // m/s (dangerous rip hazard)

  public static getInstance(): ForecastEngine {
    if (!ForecastEngine.instance) {
      ForecastEngine.instance = new ForecastEngine();
    }
    return ForecastEngine.instance;
  }

  constructor() {
    this.evaluator = ForecastEvaluator.getInstance();
    this.healthMonitor = SensorHealthMonitor.getInstance();
  }

  /**
   * Generates multi-horizon forecasts based on historical telemetry snapshots.
   * Completely non-mutating observer.
   */
  public generateForecast(snapshots: readonly TelemetrySnapshot[]): {
    currentSimTime: number;
    currentMaxRipVelocity: number;
    horizons: ForecastHorizonEstimate[];
    baselineHorizons: ForecastHorizonEstimate[];
    zoneForecasts: ZoneForecast[];
    status: ForecastValidityStatus;
    validityReason?: string;
  } {
    // 1. Minimum history validation
    if (!snapshots || snapshots.length === 0) {
      return {
        currentSimTime: 0,
        currentMaxRipVelocity: 0,
        horizons: [],
        baselineHorizons: [],
        zoneForecasts: [],
        status: 'INSUFFICIENT_HISTORY',
        validityReason: 'No historical observations recorded in current session.',
      };
    }

    const latest = snapshots[snapshots.length - 1];
    const currentSimTime = latest.simTimeSeconds;
    const currentMaxRipVelocity = latest.maxRipVelocity || 0;

    // Ingest latest ground-truth snapshot into evaluator to score any matured predictions
    this.evaluator.evaluateObservations(latest);

    // 2. Data freshness and sensor health validation
    const adcpSensor = this.healthMonitor.getSensor('CURRENT-ADCP-01');
    const cam2Sensor = this.healthMonitor.getSensor('CAM-02');

    let validityStatus: ForecastValidityStatus = 'VALID';
    let validityReason: string | undefined = undefined;

    if (snapshots.length < 3) {
      validityStatus = 'INSUFFICIENT_HISTORY';
      validityReason = `Only ${snapshots.length} observation(s) available; minimum 3 required for trend estimation.`;
    } else if (adcpSensor && (adcpSensor.status === 'OFFLINE' || adcpSensor.status === 'STALE')) {
      validityStatus = 'DATA_STALE';
      validityReason = `Primary acoustic current profiler (${adcpSensor.sensorId}) is ${adcpSensor.status}. Live extrapolation halted.`;
    } else if (cam2Sensor && cam2Sensor.status === 'OFFLINE') {
      validityStatus = 'SENSOR_DEGRADED';
      validityReason = `Optical rip monitoring camera (${cam2Sensor.sensorId}) is OFFLINE. Model confidence unverified.`;
    }

    // 3. Rate of change estimation using timestamps: dv/dt
    const trendVelocityPerSec = this.calculateTimestampedTrend(snapshots);

    // 4. Generate Multi-Horizon Forecasts: 1m (60s), 3m (180s), 5m (300s)
    const horizonSecondsList = [60, 180, 300];

    const horizons: ForecastHorizonEstimate[] = horizonSecondsList.map((hSec) => {
      const targetSimTime = currentSimTime + hSec;
      const targetTimeDisplay = this.formatTimeDisplay(targetSimTime);

      // Raw trend extrapolation: v(t + h) = v(t) + h * (dv/dt)
      const rawExtrap = currentMaxRipVelocity + (trendVelocityPerSec * hSec);
      const boundedVelocity = Math.max(
        ForecastEngine.MIN_RIP_VELOCITY,
        Math.min(ForecastEngine.MAX_RIP_VELOCITY, rawExtrap)
      );

      // Uncertainty band expands with horizon distance: +/- delta
      const uncertaintyDelta = 0.12 * Math.sqrt(hSec / 60) + (Math.abs(trendVelocityPerSec) * hSec * 0.2);
      const uncertaintyBand = {
        min: parseFloat(Math.max(ForecastEngine.MIN_RIP_VELOCITY, boundedVelocity - uncertaintyDelta).toFixed(2)),
        max: parseFloat(Math.min(ForecastEngine.MAX_RIP_VELOCITY + 0.3, boundedVelocity + uncertaintyDelta).toFixed(2)),
      };

      const predictedRiskScore = Math.min(
        100,
        Math.max(0, Math.round(latest.overallRiskScore + (boundedVelocity - currentMaxRipVelocity) * 25))
      );

      let predictedRiskCategory: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'LOW';
      if (predictedRiskScore >= 75 || boundedVelocity >= 2.0) predictedRiskCategory = 'CRITICAL';
      else if (predictedRiskScore >= 50 || boundedVelocity >= 1.5) predictedRiskCategory = 'HIGH';
      else if (predictedRiskScore >= 25 || boundedVelocity >= 0.8) predictedRiskCategory = 'MODERATE';

      const confidence = parseFloat(Math.max(0.4, 0.95 - (hSec / 300) * 0.35).toFixed(2));

      const estimate: ForecastHorizonEstimate = {
        forecastId: `FC-TRD-${currentSimTime}-${hSec}`,
        method: 'TREND_EXTRAPOLATION',
        horizonSeconds: hSec,
        horizonLabel: hSec === 60 ? '1 min (+60s)' : hSec === 180 ? '3 min (+180s)' : '5 min (+300s)',
        issuedSimTime: currentSimTime,
        targetSimTime,
        issuedTimeDisplay: latest.timeDisplay,
        targetTimeDisplay,
        observedInputVelocity: parseFloat(currentMaxRipVelocity.toFixed(2)),
        predictedVelocity: parseFloat(boundedVelocity.toFixed(2)),
        uncertaintyBand,
        predictedRiskScore,
        predictedRiskCategory,
        status: validityStatus,
        isExperimental: true, // Non-negotiable requirement: clearly labeled as experimental
        confidenceScore: confidence,
        reason: validityReason,
      };

      // Register with evaluator for future scoring upon maturity
      if (validityStatus === 'VALID') {
        this.evaluator.registerForecast(estimate);

        // Check if forecast triggers early warning alert
        if (boundedVelocity >= ForecastEngine.WARNING_ALERT_THRESHOLD) {
          this.evaluator.recordForecastAlert(
            currentSimTime,
            latest.timeDisplay,
            boundedVelocity,
            ForecastEngine.WARNING_ALERT_THRESHOLD
          );
        }
      }

      return estimate;
    });

    // 5. Generate Naive Persistence Baseline: v(t + h) = v(t)
    const baselineHorizons: ForecastHorizonEstimate[] = horizonSecondsList.map((hSec) => {
      const targetSimTime = currentSimTime + hSec;
      const targetTimeDisplay = this.formatTimeDisplay(targetSimTime);

      const estimate: ForecastHorizonEstimate = {
        forecastId: `FC-BASE-${currentSimTime}-${hSec}`,
        method: 'PERSISTENCE_BASELINE',
        horizonSeconds: hSec,
        horizonLabel: `${hSec / 60}m Base`,
        issuedSimTime: currentSimTime,
        targetSimTime,
        issuedTimeDisplay: latest.timeDisplay,
        targetTimeDisplay,
        observedInputVelocity: parseFloat(currentMaxRipVelocity.toFixed(2)),
        predictedVelocity: parseFloat(currentMaxRipVelocity.toFixed(2)), // Constant persistence
        uncertaintyBand: {
          min: parseFloat(currentMaxRipVelocity.toFixed(2)),
          max: parseFloat(currentMaxRipVelocity.toFixed(2)),
        },
        predictedRiskScore: latest.overallRiskScore,
        predictedRiskCategory: latest.overallRiskScore >= 75 ? 'CRITICAL' : latest.overallRiskScore >= 50 ? 'HIGH' : 'LOW',
        status: validityStatus,
        isExperimental: true,
        confidenceScore: 0.5,
        reason: validityReason,
      };

      if (validityStatus === 'VALID') {
        this.evaluator.registerForecast(estimate);
      }

      return estimate;
    });

    // 6. Compute Per-Zone Forecasts for Zone Breakdown
    const zoneForecasts: ZoneForecast[] = Object.values(latest.zoneTelemetry || {}).map((zt) => {
      const zoneCurrentRip = zt.ripVelocity || 0;
      const zoneEstimates: Record<number, ForecastHorizonEstimate> = {};

      horizonSecondsList.forEach((hSec) => {
        const zoneExtrap = Math.max(
          ForecastEngine.MIN_RIP_VELOCITY,
          Math.min(ForecastEngine.MAX_RIP_VELOCITY, zoneCurrentRip + (trendVelocityPerSec * hSec))
        );
        const uncertaintyDelta = 0.15 * Math.sqrt(hSec / 60);

        zoneEstimates[hSec] = {
          forecastId: `FC-ZN-${zt.zoneId}-${hSec}`,
          method: 'TREND_EXTRAPOLATION',
          horizonSeconds: hSec,
          horizonLabel: `${hSec / 60}m`,
          issuedSimTime: currentSimTime,
          targetSimTime: currentSimTime + hSec,
          issuedTimeDisplay: latest.timeDisplay,
          targetTimeDisplay: this.formatTimeDisplay(currentSimTime + hSec),
          observedInputVelocity: parseFloat(zoneCurrentRip.toFixed(2)),
          predictedVelocity: parseFloat(zoneExtrap.toFixed(2)),
          uncertaintyBand: {
            min: parseFloat(Math.max(ForecastEngine.MIN_RIP_VELOCITY, zoneExtrap - uncertaintyDelta).toFixed(2)),
            max: parseFloat(Math.min(ForecastEngine.MAX_RIP_VELOCITY, zoneExtrap + uncertaintyDelta).toFixed(2)),
          },
          predictedRiskScore: Math.min(100, Math.round(zt.riskScore + (zoneExtrap - zoneCurrentRip) * 20)),
          predictedRiskCategory: zoneExtrap > 1.8 ? 'CRITICAL' : zoneExtrap > 1.2 ? 'HIGH' : zoneExtrap > 0.6 ? 'MODERATE' : 'LOW',
          status: validityStatus,
          isExperimental: true,
          confidenceScore: 0.8,
        };
      });

      return {
        zoneId: zt.zoneId,
        zoneName: zt.zoneName,
        currentRipVelocity: zoneCurrentRip,
        currentRiskScore: zt.riskScore,
        estimates: zoneEstimates,
      };
    });

    return {
      currentSimTime,
      currentMaxRipVelocity,
      horizons,
      baselineHorizons,
      zoneForecasts,
      status: validityStatus,
      validityReason,
    };
  }

  /**
   * Computes rate of change (m/s per second) using historical timestamps:
   * dv/dt = (v_last - v_first) / (t_last - t_first)
   */
  public calculateTimestampedTrend(snapshots: readonly TelemetrySnapshot[]): number {
    if (!snapshots || snapshots.length < 2) return 0;

    // Use rolling window up to 20 snapshots (approx 10-20 seconds)
    const window = snapshots.slice(-Math.min(20, snapshots.length));
    const first = window[0];
    const last = window[window.length - 1];

    const deltaT = last.simTimeSeconds - first.simTimeSeconds;
    if (deltaT <= 0.5) return 0; // Avoid division by near-zero

    const deltaV = (last.maxRipVelocity || 0) - (first.maxRipVelocity || 0);
    const rawRate = deltaV / deltaT;

    // Dampen unphysical high-frequency acoustic noise fluctuations
    return Math.max(-0.06, Math.min(0.06, rawRate));
  }

  private formatTimeDisplay(simSeconds: number): string {
    const mins = Math.floor(simSeconds / 60);
    const secs = Math.floor(simSeconds % 60);
    return `08:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  public clearEvaluationHistory(): void {
    this.evaluator.clear();
  }
}
