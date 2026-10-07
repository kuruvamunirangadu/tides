import { Beach } from '../../models/Beach';
import { Environment } from '../../models/Environment';
import { WaveRiskForecast, ForecastHorizon, RiskTrend } from '../models/PredictionTypes';

export class WaveRiskForecaster {
  /**
   * Predict wave hazard progression and shorebreak impact across horizons
   */
  public forecastWaveRisk(beach: Beach, env: Environment): WaveRiskForecast[] {
    const horizons: ForecastHorizon[] = ['15m', '30m', '60m'];
    const forecasts: WaveRiskForecast[] = [];

    beach.zones.forEach((zone) => {
      horizons.forEach((horizon) => {
        const horizonFactor = horizon === '15m' ? 0.25 : horizon === '30m' ? 0.5 : 1.0;
        
        const currentWaveHeight = env.waveHeight || 1.2;
        const currentWavePeriod = env.wavePeriod || 8.0;

        // Projected wave growth based on wind speed
        const windDrivenGrowth = (env.windSpeed || 15) > 25 ? 0.20 : 0.05;
        const projectedWaveHeight = Math.max(0.3, currentWaveHeight * (1 + windDrivenGrowth * horizonFactor));
        
        // Projected period shift
        const periodGrowthRate = currentWavePeriod < 8 ? 0.1 : -0.02;
        const projectedWavePeriod = Math.max(4, currentWavePeriod * (1 + periodGrowthRate * horizonFactor));

        // Shorebreak intensity (steepness = H / L ~ H / (1.56 * T^2))
        const waveSteepness = projectedWaveHeight / (1.56 * (projectedWavePeriod ** 2) + 0.001);
        
        let shorebreakRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE' = 'LOW';
        if (projectedWaveHeight > 2.2 || (projectedWaveHeight > 1.8 && waveSteepness > 0.025)) {
          shorebreakRisk = 'SEVERE';
        } else if (projectedWaveHeight > 1.5 || waveSteepness > 0.018) {
          shorebreakRisk = 'HIGH';
        } else if (projectedWaveHeight > 1.0) {
          shorebreakRisk = 'MODERATE';
        }

        // Trend
        let trend: RiskTrend = 'STABLE';
        if (projectedWaveHeight > currentWaveHeight * 1.15) trend = 'RISING';
        else if (projectedWaveHeight < currentWaveHeight * 0.9) trend = 'FALLING';
        if (projectedWaveHeight > 2.5) trend = 'CRITICAL_SPIKE';

        // Drivers
        const keyDrivers: string[] = [];
        if (projectedWaveHeight > 1.8) keyDrivers.push(`High wave forecast (${projectedWaveHeight.toFixed(1)}m)`);
        if (projectedWavePeriod > 10) keyDrivers.push('Long swell wave energy');
        if (waveSteepness > 0.02) keyDrivers.push('Steep shorebreak dumping on sandbar');
        if (keyDrivers.length === 0) keyDrivers.push('Gentle moderate surf conditions');

        forecasts.push({
          zoneId: zone.id,
          horizon,
          predictedWaveHeightM: Number(projectedWaveHeight.toFixed(2)),
          predictedWavePeriodS: Number(projectedWavePeriod.toFixed(1)),
          shorebreakRisk,
          trend,
          keyDrivers,
        });
      });
    });

    return forecasts;
  }
}
