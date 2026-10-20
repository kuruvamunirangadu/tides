import { Visitor } from '../models/Visitor';
import { Beach } from '../models/Beach';
import { PredictionRecord, ExposureForecastResult } from './ForecastTypes';

/**
 * ExposureForecast.ts
 * 
 * TIDES Milestone 6: Future Visitor Exposure Analysis
 * 
 * Estimates potential future bather exposure if a rip current intensifies:
 * - Uses existing visitor positions and spatial zones
 * - Strictly separates CURRENT exposure from PREDICTED exposure
 * - Never infers confirmed drowning or medical distress from predictive exposure
 * - Fully non-mutating observer
 */
export class ExposureForecast {
  /**
   * Analyzes current vs predicted visitor exposure for a given horizon
   */
  public static evaluateExposure(
    visitors: Visitor[],
    beach: Beach,
    forecast: PredictionRecord | null,
    horizonMinutes: number = 3
  ): ExposureForecastResult {
    const shorelineY = beach.shorelineY || 280;
    const targetSimTime = (forecast?.forecastIssueTimestamp ?? 0) + horizonMinutes * 60;

    // 1. Current Exposure: Bathers currently swimming in water past breaker line
    const currentlyExposed = visitors.filter(
      (v) =>
        v.active &&
        (v.state === 'SWIMMING' || v.state === 'STRUGGLING' || v.state === 'DISTRESS') &&
        v.position.y > shorelineY + 15
    );

    // 2. Future Predicted Exposure:
    // If forecast rip current velocity is predicted to intensify (> 1.5 m/s),
    // the seaward suction zone expands laterally (x: 480 to 620) and seaward (y > shorelineY).
    // Bathers currently wading or swimming near the feeder channel are estimated as potentially exposed.
    const isIntensifying = (forecast?.predictedValue ?? 1.2) >= 1.5;
    const expansionWidth = isIntensifying ? 150 : 80;
    const feederCenterX = 550;

    const predictedExposed = visitors.filter((v) => {
      if (!v.active) return false;
      const dx = Math.abs(v.position.x - feederCenterX);
      const dy = v.position.y - shorelineY;

      // In the water or within swash entry zone within expansion corridor
      const inCorridor = dx <= expansionWidth / 2 && dy >= -5;
      const isRecreatingInWater =
        v.state === 'SWIMMING' ||
        v.state === 'WATER_ENTRY' ||
        v.state === 'DRIFTING' ||
        v.state === 'STRUGGLING' ||
        v.state === 'DISTRESS';

      return inCorridor && isRecreatingInWater;
    });

    const atRiskZones = isIntensifying
      ? ['SZ-02 (Central Rip Channel)', 'SZ-03 (North Sandbar)']
      : ['SZ-02 (Central Rip Channel)'];

    return {
      horizonMinutes,
      targetSimTime,
      currentlyExposedVisitorsCount: currentlyExposed.length,
      predictedExposedVisitorsCount: predictedExposed.length,
      exposedVisitorIds: predictedExposed.map((v) => v.id),
      atRiskZoneIds: atRiskZones,
      assumptions: isIntensifying
        ? 'Assumes rip neck channel expands laterally by +35m due to predicted velocity exceeding 1.5 m/s.'
        : 'Assumes current channel dimensions remain stable under sub-critical velocities.',
    };
  }
}

