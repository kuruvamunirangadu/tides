import { Beach } from '../models/Beach';
import { Environment } from '../models/Environment';
import {
  PredictionState,
  PredictiveAlert,
  RiskTrend,
} from './models/PredictionTypes';
import { RipCurrentForecaster } from './forecasting/RipCurrentForecaster';
import { WaveRiskForecaster } from './forecasting/WaveRiskForecaster';
import { CrowdRiskForecaster } from './forecasting/CrowdRiskForecaster';
import { DistressForecaster } from './forecasting/DistressForecaster';
import { ZoneRiskForecaster } from './forecasting/ZoneRiskForecaster';

export class PredictionEngine {
  private ripForecaster: RipCurrentForecaster;
  private waveForecaster: WaveRiskForecaster;
  private crowdForecaster: CrowdRiskForecaster;
  private distressForecaster: DistressForecaster;
  private zoneForecaster: ZoneRiskForecaster;
  private alertsHistory: PredictiveAlert[] = [];
  private lastEvaluationTime: number = 0;
  private latestState: PredictionState | null = null;

  constructor() {
    this.ripForecaster = new RipCurrentForecaster();
    this.waveForecaster = new WaveRiskForecaster();
    this.crowdForecaster = new CrowdRiskForecaster();
    this.distressForecaster = new DistressForecaster();
    this.zoneForecaster = new ZoneRiskForecaster();
  }

  /**
   * Run prediction cycle
   */
  public update(beach: Beach, env: Environment, currentTime: number): PredictionState {
    this.lastEvaluationTime = currentTime;

    // 1. Generate Sub-Model Forecasts
    const ripForecasts = this.ripForecaster.forecastRipCurrents(beach, env);
    const waveForecasts = this.waveForecaster.forecastWaveRisk(beach, env);
    const crowdForecasts = this.crowdForecaster.forecastCrowdRisk(beach, env);
    const distressForecasts = this.distressForecaster.forecastDistress(
      beach,
      env,
      ripForecasts,
      waveForecasts,
      crowdForecasts
    );
    const zoneForecasts = this.zoneForecaster.forecastZoneRisk(
      beach,
      env,
      ripForecasts,
      waveForecasts,
      crowdForecasts,
      distressForecasts
    );

    // 2. Generate Proactive Predictive Alerts
    const alerts: PredictiveAlert[] = [];
    zoneForecasts.forEach((zf) => {
      if (zf.predictedRisk30m >= 75 || zf.riskTrend === 'CRITICAL_SPIKE') {
        alerts.push({
          id: `PRED-ALERT-${zf.zoneId}-${Math.round(currentTime)}`,
          zoneId: zf.zoneId,
          timestamp: currentTime,
          horizon: '30m',
          severity: 'EMERGENCY_PROJECTION',
          message: `CRITICAL RISK SPIKE projected in ${zf.zoneName} within 30 min (Score: ${zf.predictedRisk30m}/100). Primary Driver: ${zf.primaryThreat}.`,
          leadTimeToSpikeMinutes: 30,
          preventativeMeasures: [
            'Sound Public Address advisory siren',
            'Pre-deploy Rescue Water Craft to zone boundary',
            'Enforce red-flag swimming exclusion zone',
          ],
        });
      } else if (zf.predictedRisk15m >= 55 || zf.riskTrend === 'RISING') {
        alerts.push({
          id: `PRED-ALERT-${zf.zoneId}-${Math.round(currentTime)}`,
          zoneId: zf.zoneId,
          timestamp: currentTime,
          horizon: '15m',
          severity: 'WARNING',
          message: `Elevated hazard trend in ${zf.zoneName}. Expected risk increase within 15 min.`,
          leadTimeToSpikeMinutes: 15,
          preventativeMeasures: [
            'Alert nearest lifeguard tower',
            'Scan zone for vulnerable swimmers (children/seniors)',
          ],
        });
      }
    });

    // 3. Beach Overall Trend
    let overallBeachRiskTrend: RiskTrend = 'STABLE';
    const risingCount = zoneForecasts.filter((z) => z.riskTrend === 'RISING' || z.riskTrend === 'CRITICAL_SPIKE').length;
    if (zoneForecasts.some((z) => z.riskTrend === 'CRITICAL_SPIKE')) {
      overallBeachRiskTrend = 'CRITICAL_SPIKE';
    } else if (risingCount >= 2) {
      overallBeachRiskTrend = 'RISING';
    } else if (zoneForecasts.every((z) => z.riskTrend === 'FALLING')) {
      overallBeachRiskTrend = 'FALLING';
    }

    const state: PredictionState = {
      timestamp: currentTime,
      ripForecasts,
      waveForecasts,
      crowdForecasts,
      distressForecasts,
      zoneForecasts,
      alerts,
      overallBeachRiskTrend,
      modelConfidence: 0.91,
    };

    this.latestState = state;
    return state;
  }

  public getLatestState(): PredictionState | null {
    return this.latestState;
  }
}
