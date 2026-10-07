import { Beach } from '../../models/Beach';
import { Environment } from '../../models/Environment';
import { CrowdRiskForecast, ForecastHorizon, RiskTrend } from '../models/PredictionTypes';

export class CrowdRiskForecaster {
  /**
   * Predict crowd influx, swimmer density, and bottleneck risk across horizons
   */
  public forecastCrowdRisk(beach: Beach, env: Environment): CrowdRiskForecast[] {
    const horizons: ForecastHorizon[] = ['15m', '30m', '60m'];
    const forecasts: CrowdRiskForecast[] = [];

    // Base environmental attraction coefficient (good weather = high attraction)
    const isGoodWeather = env.weather === 'CLEAR' || env.weather === 'CLOUDY';
    const weatherFactor = isGoodWeather ? 1.2 : env.weather === 'RAIN' ? 0.4 : 0.7;

    beach.zones.forEach((zone) => {
      // Estimated base capacity based on zone dimensions
      const zoneCapacity = Math.round((zone.width * zone.height) / 100);
      const currentVisitors = Math.round(zoneCapacity * 0.4);

      horizons.forEach((horizon) => {
        const horizonHours = horizon === '15m' ? 0.25 : horizon === '30m' ? 0.5 : 1.0;

        // Influx calculation
        const hourlyInfluxRate = Math.round(
          zoneCapacity * 0.25 * weatherFactor
        );

        const predictedVisitors = Math.min(
          zoneCapacity * 1.5,
          Math.max(5, Math.round(currentVisitors + hourlyInfluxRate * horizonHours))
        );

        const swimmerFraction = zone.type === 'SWIMMING' ? 0.65 : 0.15;
        const predictedSwimmers = Math.round(predictedVisitors * swimmerFraction);

        // Density level
        const densityRatio = predictedVisitors / Math.max(1, zoneCapacity);
        let predictedDensity: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME' = 'LOW';
        if (densityRatio >= 0.9) predictedDensity = 'EXTREME';
        else if (densityRatio >= 0.65) predictedDensity = 'HIGH';
        else if (densityRatio >= 0.35) predictedDensity = 'MODERATE';

        // Trend
        let trend: RiskTrend = 'STABLE';
        if (predictedVisitors > currentVisitors * 1.2) trend = 'RISING';
        else if (predictedVisitors < currentVisitors * 0.8) trend = 'FALLING';
        if (predictedDensity === 'EXTREME' && trend === 'RISING') trend = 'CRITICAL_SPIKE';

        forecasts.push({
          zoneId: zone.id,
          horizon,
          predictedTotalVisitors: predictedVisitors,
          predictedSwimmers,
          predictedDensity,
          influxRatePerHour: hourlyInfluxRate,
          trend,
        });
      });
    });

    return forecasts;
  }
}
