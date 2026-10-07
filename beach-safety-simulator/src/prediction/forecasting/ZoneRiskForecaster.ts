import { Beach } from '../../models/Beach';
import { Environment } from '../../models/Environment';
import {
  ZoneRiskForecast,
  RiskTrend,
  RipCurrentForecast,
  WaveRiskForecast,
  CrowdRiskForecast,
  DistressForecast,
} from '../models/PredictionTypes';

export class ZoneRiskForecaster {
  /**
   * Aggregate sub-models to forecast the multi-pillar zone risk score across horizons
   */
  public forecastZoneRisk(
    beach: Beach,
    env: Environment,
    ripForecasts: RipCurrentForecast[],
    waveForecasts: WaveRiskForecast[],
    crowdForecasts: CrowdRiskForecast[],
    distressForecasts: DistressForecast[]
  ): ZoneRiskForecast[] {
    return beach.zones.map((zone) => {
      // Calculate current baseline risk score (0 to 100)
      const isRestricted = zone.type === 'RESTRICTED';
      const isClosed = zone.status === 'CLOSED';
      const isCaution = zone.status === 'CAUTION';
      const currentRiskScore = isClosed ? 85 : isRestricted ? 75 : isCaution ? 55 : 25;

      // 15m forecast
      const rip15 = ripForecasts.find((r) => r.zoneId === zone.id && r.horizon === '15m');
      const wave15 = waveForecasts.find((w) => w.zoneId === zone.id && w.horizon === '15m');
      const crowd15 = crowdForecasts.find((c) => c.zoneId === zone.id && c.horizon === '15m');
      const distress15 = distressForecasts.find((d) => d.zoneId === zone.id && d.horizon === '15m');

      // 30m forecast
      const rip30 = ripForecasts.find((r) => r.zoneId === zone.id && r.horizon === '30m');
      const wave30 = waveForecasts.find((w) => w.zoneId === zone.id && w.horizon === '30m');
      const crowd30 = crowdForecasts.find((c) => c.zoneId === zone.id && c.horizon === '30m');
      const distress30 = distressForecasts.find((d) => d.zoneId === zone.id && d.horizon === '30m');

      // 60m forecast
      const rip60 = ripForecasts.find((r) => r.zoneId === zone.id && r.horizon === '60m');
      const wave60 = waveForecasts.find((w) => w.zoneId === zone.id && w.horizon === '60m');
      const crowd60 = crowdForecasts.find((c) => c.zoneId === zone.id && c.horizon === '60m');
      const distress60 = distressForecasts.find((d) => d.zoneId === zone.id && d.horizon === '60m');

      const calcRisk = (
        rip?: RipCurrentForecast,
        wave?: WaveRiskForecast,
        crowd?: CrowdRiskForecast,
        distress?: DistressForecast
      ): number => {
        const h = ((rip?.probability || 0.2) * 40) + ((Math.min(3.0, wave?.predictedWaveHeightM || 1.0) / 3.0) * 30);
        const e = Math.min(20, (crowd?.predictedSwimmers || 10) * 0.4);
        const d = (distress?.distressProbability || 0.1) * 10;
        return Math.min(100, Math.max(5, Math.round(h + e + d)));
      };

      const predictedRisk15m = calcRisk(rip15, wave15, crowd15, distress15);
      const predictedRisk30m = calcRisk(rip30, wave30, crowd30, distress30);
      const predictedRisk60m = calcRisk(rip60, wave60, crowd60, distress60);

      // Determine Trend
      let riskTrend: RiskTrend = 'STABLE';
      const delta = predictedRisk60m - currentRiskScore;
      if (delta >= 25 || predictedRisk60m >= 80) riskTrend = 'CRITICAL_SPIKE';
      else if (delta >= 10) riskTrend = 'RISING';
      else if (delta <= -10) riskTrend = 'FALLING';

      // Primary Threat Identification
      let primaryThreat = 'Low ambient hazard';
      if (rip60 && rip60.probability > 0.6) {
        primaryThreat = `Rip current channel development (${(rip60.probability * 100).toFixed(0)}% prob)`;
      } else if (wave60 && wave60.predictedWaveHeightM > 2.0) {
        primaryThreat = `Severe swell dumping (${wave60.predictedWaveHeightM}m waves)`;
      } else if (crowd60 && crowd60.predictedDensity === 'EXTREME') {
        primaryThreat = `Extreme crowd surge (${crowd60.predictedTotalVisitors} visitors)`;
      } else if (zone.type === 'RESTRICTED') {
        primaryThreat = 'High risk unauthorized cliff intrusion';
      }

      // Actionable Operational Recommendation
      let recommendedAction = 'Maintain standard patrol routines';
      if (predictedRisk30m >= 75 || riskTrend === 'CRITICAL_SPIKE') {
        recommendedAction = 'URGENT: Pre-position Jet Ski / Lifeguard squad and broadcast red-flag warning';
      } else if (predictedRisk30m >= 55 || riskTrend === 'RISING') {
        recommendedAction = 'ADVISORY: Shift patrol focus to deeper perimeter and sound advisory PA';
      } else if (crowd30 && crowd30.predictedDensity === 'HIGH') {
        recommendedAction = 'Pre-deploy crowd marshal to prevent barrier breaches';
      }

      return {
        zoneId: zone.id,
        zoneName: zone.name,
        currentRiskScore,
        predictedRisk15m,
        predictedRisk30m,
        predictedRisk60m,
        riskTrend,
        confidence: 0.88,
        primaryThreat,
        recommendedAction,
      };
    });
  }
}
