import {
  ForecastMethodId,
  ForecastValidityStatus,
  PredictionRecord,
} from './ForecastTypes';
import { ForecastEvaluator } from './ForecastEvaluator';

export interface ObservationDataPoint {
  timestamp: number;
  ripVelocity: number; // m/s
  waveHeight: number;  // m
  zoneId: string;
}

/**
 * ForecastEngine.ts
 * 
 * TIDES Milestone 6: Predictive Hazard Forecasting Engine
 * 
 * Generates transparent baseline predictions from historical ocean observations:
 * - Supports Persistence, Moving Average, and Bounded Trend Extrapolation
 * - Evaluates multi-horizon projections: 1 min (60s), 3 min (180s), 5 min (300s)
 * - Rigorously enforces physical boundaries [0.0, 3.2 m/s]
 * - Validates input data freshness and history sufficiency
 * - Strictly non-mutating: advisory predictions only, zero simulation state alteration
 */
export class ForecastEngine {
  private static instance: ForecastEngine | null = null;

  public static readonly MIN_RIP_VELOCITY = 0.0;
  public static readonly MAX_RIP_VELOCITY = 3.2;
  public static readonly HAZARD_ALERT_THRESHOLD = 1.5; // m/s

  private observations: ObservationDataPoint[] = [];
  private readonly MAX_HISTORY_POINTS = 100;
  private evaluator: ForecastEvaluator;

  public static getInstance(): ForecastEngine {
    if (!ForecastEngine.instance) {
      ForecastEngine.instance = new ForecastEngine();
    }
    return ForecastEngine.instance;
  }

  constructor() {
    this.evaluator = ForecastEvaluator.getInstance();
  }

  public clearHistory(): void {
    this.observations = [];
  }

  /**
   * Ingests a new observation data point and forwards to evaluator
   */
  public recordObservation(point: ObservationDataPoint): void {
    // Validate timestamp sanity
    if (point.timestamp < 0 || isNaN(point.ripVelocity) || isNaN(point.waveHeight)) {
      return;
    }

    this.observations.push({ ...point });
    if (this.observations.length > this.MAX_HISTORY_POINTS) {
      this.observations.shift();
    }

    // Ingest into evaluator for scoring any matured forecasts
    this.evaluator.ingestObservation(point);
  }

  public getObservations(): readonly ObservationDataPoint[] {
    return this.observations;
  }

  /**
   * Generates multi-horizon predictions for rip-current hazard using selected method
   */
  public generateForecast(
    method: ForecastMethodId = 'TREND_BASELINE',
    currentTime?: number
  ): PredictionRecord[] {
    if (this.observations.length === 0) {
      return [];
    }

    const latest = this.observations[this.observations.length - 1];
    const now = currentTime ?? latest.timestamp;

    // Freshness & history validation
    let status: ForecastValidityStatus = 'VALID';
    let quality: 'HIGH' | 'MODERATE' | 'DEGRADED' | 'STALE' = 'HIGH';
    let limitations = 'Simulated hydrodynamic estimate subject to coastal wave dispersion.';

    if (this.observations.length < 3 && method === 'TREND_BASELINE') {
      status = 'INSUFFICIENT_HISTORY';
      quality = 'DEGRADED';
      limitations = `Only ${this.observations.length} observation(s) recorded; minimum 3 required for trend calculation.`;
    } else if (now - latest.timestamp > 30) {
      status = 'DATA_STALE';
      quality = 'STALE';
      limitations = `Latest observation is ${(now - latest.timestamp).toFixed(0)}s old; extrapolation paused.`;
    }

    const horizonsMinutes = [1, 3, 5];
    const predictions: PredictionRecord[] = [];

    // Calculate baseline slope or average
    let slope = 0;
    let movingAvg = latest.ripVelocity;

    if (this.observations.length >= 3) {
      const p1 = this.observations[this.observations.length - 3];
      const p3 = this.observations[this.observations.length - 1];
      const dt = Math.max(1, p3.timestamp - p1.timestamp);
      slope = (p3.ripVelocity - p1.ripVelocity) / dt; // m/s per second
    }

    if (this.observations.length >= 2) {
      const windowPoints = this.observations.slice(-5);
      const sum = windowPoints.reduce((acc, p) => acc + p.ripVelocity, 0);
      movingAvg = sum / windowPoints.length;
    }

    for (const hMin of horizonsMinutes) {
      const hSeconds = hMin * 60;
      const targetTime = latest.timestamp + hSeconds;
      let predictedVal = latest.ripVelocity;

      if (status === 'VALID') {
        switch (method) {
          case 'PERSISTENCE_BASELINE':
            predictedVal = latest.ripVelocity;
            break;
          case 'MOVING_AVERAGE':
            predictedVal = movingAvg;
            break;
          case 'TREND_BASELINE':
            // Bounded linear extrapolation
            predictedVal = latest.ripVelocity + slope * hSeconds;
            break;
        }
      }

      // Clamp to physical limits
      predictedVal = Math.max(
        ForecastEngine.MIN_RIP_VELOCITY,
        Math.min(ForecastEngine.MAX_RIP_VELOCITY, Number(predictedVal.toFixed(2)))
      );

      // Uncertainty expands proportionally to forecast horizon: ±(0.12 * sqrt(hMin))
      const uncertaintyDelta = Number((0.12 * Math.sqrt(hMin)).toFixed(2));
      const minBound = Math.max(ForecastEngine.MIN_RIP_VELOCITY, Number((predictedVal - uncertaintyDelta).toFixed(2)));
      const maxBound = Math.min(ForecastEngine.MAX_RIP_VELOCITY, Number((predictedVal + uncertaintyDelta).toFixed(2)));

      const record: PredictionRecord = {
        predictionId: `PRED-${latest.zoneId}-${hMin}M-${Math.floor(latest.timestamp)}`,
        hazardType: 'RIP_CURRENT',
        sourceZoneId: latest.zoneId,
        sourceZoneName: 'Central Surf Zone (SZ-02)',
        observationTimestamp: latest.timestamp,
        forecastIssueTimestamp: now,
        targetTimestamp: targetTime,
        horizonMinutes: hMin,
        observedValue: latest.ripVelocity,
        predictedValue: predictedVal,
        units: 'm/s',
        uncertaintyBand: { min: minBound, max: maxBound },
        method,
        inputQuality: quality,
        status,
        limitations,
        isSimulatedEstimate: true,
        evaluated: false,
      };

      predictions.push(record);

      // Register with evaluator for ground truth tracking
      if (status === 'VALID') {
        this.evaluator.registerPrediction(record);
      }
    }

    return predictions;
  }
}

