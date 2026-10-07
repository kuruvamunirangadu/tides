import { Beach } from '../../models/Beach';
import { Environment } from '../../models/Environment';
import { RipCurrentForecast, ForecastHorizon, RiskTrend } from '../models/PredictionTypes';

export class RipCurrentForecaster {
  /**
   * Predict rip-current formation and intensification for all beach zones across horizons
   */
  public forecastRipCurrents(beach: Beach, env: Environment): RipCurrentForecast[] {
    const horizons: ForecastHorizon[] = ['15m', '30m', '60m'];
    const forecasts: RipCurrentForecast[] = [];

    beach.zones.forEach((zone) => {
      horizons.forEach((horizon) => {
        const horizonFactor = horizon === '15m' ? 0.25 : horizon === '30m' ? 0.5 : 1.0;
        
        // Tidal drawdown dynamics (ebb/low tide strongly drives rip channels)
        const isLowOrEbbTide = env.tideLevel < 1.0;
        const tideDrawdownMultiplier = isLowOrEbbTide ? 1.35 : 0.85;

        // Bathymetry factor (Zone B / Deep surf / Rocky points have higher rip susceptibility)
        let bathymetryFactor = 0.5;
        if (zone.id === 'ZONE_B' || zone.name.includes('Surf') || zone.id.includes('SZ-02')) {
          bathymetryFactor = 0.85;
        } else if (zone.type === 'RESTRICTED' || zone.name.includes('Cliff')) {
          bathymetryFactor = 0.95;
        }

        // Project environmental evolution over the horizon
        const currentWaveHeight = env.waveHeight || 1.2;
        const currentSpeed = env.waterCurrent || 0.4;

        const projectedWaveHeight = currentWaveHeight * (1 + 0.1 * horizonFactor);
        const projectedCurrentSpeed = currentSpeed * (1 + (isLowOrEbbTide ? 0.2 * horizonFactor : 0.05 * horizonFactor));

        // Physics-informed Rip Hazard Probability calculation
        let rawProbability = (
          (projectedWaveHeight / 3.0) * 0.35 +
          (projectedCurrentSpeed / 2.0) * 0.35 +
          (bathymetryFactor * 0.30)
        ) * tideDrawdownMultiplier;

        const probability = Math.min(1.0, Math.max(0.05, rawProbability));

        // Risk classification
        let riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'LOW';
        if (probability >= 0.75) riskLevel = 'CRITICAL';
        else if (probability >= 0.55) riskLevel = 'HIGH';
        else if (probability >= 0.30) riskLevel = 'MODERATE';

        // Trend calculation
        let trend: RiskTrend = 'STABLE';
        if (currentWaveHeight > 1.8 && isLowOrEbbTide) trend = 'CRITICAL_SPIKE';
        else if (currentWaveHeight > 1.5 || isLowOrEbbTide) trend = 'RISING';

        // Extract key drivers
        const keyDrivers: string[] = [];
        if (isLowOrEbbTide) keyDrivers.push('Low tide seaward channel drainage');
        if (currentWaveHeight > 1.6) keyDrivers.push(`High wave energy (${currentWaveHeight.toFixed(1)}m)`);
        if (currentSpeed > 0.8) keyDrivers.push(`Strong ambient drift (${currentSpeed.toFixed(1)}m/s)`);
        if (zone.type === 'RESTRICTED') keyDrivers.push('Rocky headland refraction');

        if (keyDrivers.length === 0) keyDrivers.push('Normal ambient hydrodynamics');

        forecasts.push({
          zoneId: zone.id,
          horizon,
          probability: Number(probability.toFixed(2)),
          riskLevel,
          trend,
          keyDrivers,
          estimatedCurrentSpeedMs: Number((projectedCurrentSpeed * (1 + probability * 0.5)).toFixed(2)),
        });
      });
    });

    return forecasts;
  }
}
