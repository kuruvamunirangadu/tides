import { Beach } from '../../models/Beach';
import { Environment } from '../../models/Environment';
import { DistressForecast, ForecastHorizon } from '../models/PredictionTypes';
import { RipCurrentForecast } from '../models/PredictionTypes';
import { WaveRiskForecast } from '../models/PredictionTypes';
import { CrowdRiskForecast } from '../models/PredictionTypes';

export class DistressForecaster {
  /**
   * Forecast swimmer distress probability and projected incident count across horizons
   */
  public forecastDistress(
    beach: Beach,
    env: Environment,
    ripForecasts: RipCurrentForecast[],
    waveForecasts: WaveRiskForecast[],
    crowdForecasts: CrowdRiskForecast[]
  ): DistressForecast[] {
    const horizons: ForecastHorizon[] = ['15m', '30m', '60m'];
    const forecasts: DistressForecast[] = [];

    beach.zones.forEach((zone) => {
      horizons.forEach((horizon) => {
        const rip = ripForecasts.find((r) => r.zoneId === zone.id && r.horizon === horizon);
        const wave = waveForecasts.find((w) => w.zoneId === zone.id && w.horizon === horizon);
        const crowd = crowdForecasts.find((c) => c.zoneId === zone.id && c.horizon === horizon);

        const ripProb = rip ? rip.probability : 0.2;
        const waveHeight = wave ? wave.predictedWaveHeightM : (env.waveHeight || 1.2);
        const swimmerCount = crowd ? crowd.predictedSwimmers : 20;

        // Swimmer vulnerability base factor (approx 25% weak swimmers / children)
        const vulnerableSwimmers = Math.round(swimmerCount * 0.25);

        // Combined distress risk calculation
        const hazardFactor = (ripProb * 0.5) + (Math.min(3.0, waveHeight) / 3.0 * 0.5);
        const exposureFactor = Math.min(1.0, swimmerCount / 50);

        const distressProbability = Math.min(
          0.98,
          Math.max(0.02, hazardFactor * 0.7 + exposureFactor * 0.3)
        );

        // Estimated incidents projection based on probability and vulnerable crowd
        const estimatedIncidents = Math.max(
          0,
          Math.round(distressProbability * (vulnerableSwimmers * 0.15))
        );

        // High risk cohort identification
        let highRiskCohort: 'CHILDREN' | 'ELDERLY' | 'WEAK_SWIMMERS' | 'GENERAL' = 'WEAK_SWIMMERS';
        if (waveHeight > 2.0) highRiskCohort = 'CHILDREN';
        else if (ripProb > 0.6) highRiskCohort = 'WEAK_SWIMMERS';

        // Contributing factors
        const contributingFactors: string[] = [];
        if (ripProb > 0.5) contributingFactors.push('Offshore rip channel pull');
        if (waveHeight > 1.6) contributingFactors.push('Heavy shorebreak impact');
        if (swimmerCount > 40) contributingFactors.push('High bather density / reduced surveillance');
        if (zone.type === 'RESTRICTED') contributingFactors.push('Unauthorized rocky shelf access');
        if (contributingFactors.length === 0) contributingFactors.push('Normal ambient swimming exposure');

        forecasts.push({
          zoneId: zone.id,
          horizon,
          distressProbability: Number(distressProbability.toFixed(2)),
          estimatedDistressIncidents: estimatedIncidents,
          highRiskCohort,
          contributingFactors,
        });
      });
    });

    return forecasts;
  }
}
