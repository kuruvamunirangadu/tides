import { Beach } from '../models/Beach';
import { Environment } from '../models/Environment';
import { BeachRiskOverview, RiskCategory } from '../models/Risk';
import { RiskForecastState, EarlyWarning, RegionalRiskForecast, RiskForecastPoint } from '../models/RiskForecast';

const HORIZONS_SECONDS = [900, 1800, 3600];

export class RiskPropagationModel {
  private acknowledgedWarnings = new Set<string>();

  public forecast(
    beach: Beach,
    environment: Environment,
    riskOverview: BeachRiskOverview,
    simTimeSeconds: number
  ): RiskForecastState {
    const currentImpact = riskOverview.currentImpact;
    if (!currentImpact || currentImpact.stale) {
      return {
        issuedSimTime: simTimeSeconds,
        horizonsSeconds: [...HORIZONS_SECONDS],
        regions: beach.zones.map((zone) => ({
          zoneId: zone.id,
          zoneName: zone.name,
          currentScore: riskOverview.zoneAssessments[zone.id]?.overallScore ?? 0,
          currentCategory: riskOverview.zoneAssessments[zone.id]?.category ?? 'LOW',
          visitorIds: [],
          points: HORIZONS_SECONDS.map((horizonSeconds) => ({
            horizonSeconds,
            targetSimTime: simTimeSeconds + horizonSeconds,
            score: 0,
            category: 'LOW',
            trend: 'UNAVAILABLE',
            status: 'UNAVAILABLE',
            reason: 'Current telemetry is unavailable or stale.',
          })),
          source: 'UNAVAILABLE',
          assumption: 'No projection is rendered without current-field telemetry.',
        })),
        warnings: [],
        status: 'UNAVAILABLE',
        provenance: 'UNAVAILABLE',
        limitation: 'Forecast unavailable because the current-field input is stale or unavailable.',
      };
    }

    const phaseRate = environment.tideStatus === 'RISING'
      ? 0.12
      : environment.tideStatus === 'FALLING'
      ? 0.08
      : 0;
    const speed = currentImpact.currentSpeedMps;
    const warnings: EarlyWarning[] = [];
    const regions: RegionalRiskForecast[] = beach.zones.map((zone) => {
      const assessment = riskOverview.zoneAssessments[zone.id];
      const impact = currentImpact.zoneImpacts[zone.id];
      const currentScore = assessment?.overallScore ?? 0;
      const points: RiskForecastPoint[] = HORIZONS_SECONDS.map((horizonSeconds) => {
        const projectedSpeed = Math.min(3.2, speed * (1 + phaseRate * horizonSeconds / 900));
        const speedDelta = Math.max(0, projectedSpeed - speed);
        const spatialWeight = impact?.influenceScore ? impact.influenceScore / 100 : 0;
        const score = Math.min(100, Math.max(0, Math.round(currentScore + speedDelta * 25 * spatialWeight)));
        const category = this.classify(score);
        const trend = category === (assessment?.category ?? 'LOW')
          ? 'STABLE'
          : this.categoryRank(category) > this.categoryRank(assessment?.category ?? 'LOW') ? 'RISING' : 'FALLING';
        return {
          horizonSeconds,
          targetSimTime: simTimeSeconds + horizonSeconds,
          score,
          category,
          trend,
          status: 'AVAILABLE',
        };
      });

      const region: RegionalRiskForecast = {
        zoneId: zone.id,
        zoneName: zone.name,
        currentScore,
        currentCategory: assessment?.category ?? 'LOW',
        visitorIds: impact?.visitorIds ?? [],
        points,
        source: currentImpact.source,
        assumption: 'Simulated directional current persistence with tide-phase acceleration; not calibrated oceanography.',
      };
      const warningPoint = points.find((point) => point.category === 'HIGH' || point.category === 'CRITICAL');
      if (warningPoint && warningPoint.trend === 'RISING') {
        const id = `FORECAST-${zone.id}-${warningPoint.horizonSeconds}-${warningPoint.category}`;
        warnings.push({
          id,
          zoneId: zone.id,
          horizonSeconds: warningPoint.horizonSeconds,
          severity: warningPoint.category,
          message: `${zone.name} is forecast to reach ${warningPoint.category} risk in ${warningPoint.horizonSeconds / 60} minutes.`,
          acknowledged: this.acknowledgedWarnings.has(id),
          active: true,
          source: currentImpact.source,
        });
      }
      return region;
    });

    return {
      issuedSimTime: simTimeSeconds,
      horizonsSeconds: [...HORIZONS_SECONDS],
      regions,
      warnings,
      status: 'AVAILABLE',
      provenance: currentImpact.source,
      limitation: 'Forecast is a simulated projection from current risk and tide phase, not a calibrated oceanographic warning.',
    };
  }

  public acknowledgeWarning(warningId: string): void {
    this.acknowledgedWarnings.add(warningId);
  }

  public reset(): void {
    this.acknowledgedWarnings.clear();
  }

  private classify(score: number): RiskCategory {
    if (score >= 80) return 'CRITICAL';
    if (score >= 60) return 'HIGH';
    if (score >= 35) return 'MODERATE';
    return 'LOW';
  }

  private categoryRank(category: RiskCategory): number {
    return { LOW: 0, MODERATE: 1, HIGH: 2, CRITICAL: 3 }[category];
  }
}