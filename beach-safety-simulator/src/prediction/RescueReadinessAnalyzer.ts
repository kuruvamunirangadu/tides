import { RescueCoordinator } from '../scene3d/rescue/RescueCoordinator';
import { ReadinessRecommendation, PredictionRecord } from './ForecastTypes';

/**
 * RescueReadinessAnalyzer.ts
 * 
 * TIDES Milestone 6: Rescue Readiness & Coverage Gap Analyzer
 * 
 * Evaluates rescue fleet availability against current and predicted hazards:
 * - Checks boat availability (RB-01) and tower lifeguards (LG-01, LG-02)
 * - Identifies coverage shortages and single-point-of-failure risks
 * - Produces ADVISORY recommendations for operator review
 * - STRICT CONSTRAINT: Never automatically dispatches or mutates rescue fleet
 */
export class RescueReadinessAnalyzer {
  public static analyzeReadiness(
    coordinator: RescueCoordinator,
    forecast: PredictionRecord | null
  ): {
    availableBoats: number;
    availableLifeguards: number;
    occupiedCount: number;
    readinessScore: number; // 0 - 100%
    recommendations: ReadinessRecommendation[];
  } {
    const resources = coordinator.registry.getResources();
    const availableBoats = resources.filter((r) => r.type === 'RESCUE_BOAT' && r.status === 'AVAILABLE').length;
    const availableLifeguards = resources.filter((r) => r.type === 'LIFEGUARD' && r.status === 'AVAILABLE').length;
    const occupied = resources.filter((r) => r.status !== 'AVAILABLE').length;

    const recommendations: ReadinessRecommendation[] = [];

    // Readiness Score calculation
    // Ideal: 1 boat available (50 pts) + at least 1 guard available (50 pts)
    const boatPts = availableBoats > 0 ? 50 : 10;
    const lgPts = availableLifeguards >= 2 ? 50 : availableLifeguards === 1 ? 35 : 0;
    const readinessScore = boatPts + lgPts;

    const predictedVel = forecast?.predictedValue ?? 1.2;
    const isHighHazardForecast = predictedVel >= 1.5;

    // Check 1: Boat engaged and high hazard predicted
    if (availableBoats === 0 && isHighHazardForecast) {
      recommendations.push({
        id: 'REC-OFFSHORE-GAP',
        severity: 'CRITICAL',
        title: 'Offshore Rescue Coverage Depleted',
        description:
          'High-speed boat RB-01 is currently dispatched. Developing rip hazard (>1.5 m/s) has zero offshore extraction capability.',
        affectedZoneId: 'SZ-02 (Central Rip Channel)',
        availableBoatsCount: availableBoats,
        availableLifeguardsCount: availableLifeguards,
        occupiedResourcesCount: occupied,
        recommendedAction:
          'Alert Central Tower Lifeguards (LG-02) to prepare water entry with torpedo buoys as primary standby.',
        isDispatched: false,
      });
    }

    // Check 2: Severe rip intensification forecasted ahead
    if (isHighHazardForecast && availableBoats > 0) {
      recommendations.push({
        id: 'REC-PREEMPTIVE-STANDBY',
        severity: 'WARNING',
        title: 'Pre-emptive Rip Watch Advisory',
        description: `Hazard forecast indicates rip velocity reaching ${predictedVel.toFixed(1)} m/s at +${forecast?.horizonMinutes}m.`,
        affectedZoneId: 'SZ-02 (Central Rip Channel)',
        availableBoatsCount: availableBoats,
        availableLifeguardsCount: availableLifeguards,
        occupiedResourcesCount: occupied,
        recommendedAction:
          'Advise sea patrol RB-01 to shift standby position closer to the central outflow plume.',
        isDispatched: false,
      });
    }

    // Check 3: Nominal Readiness
    if (recommendations.length === 0) {
      recommendations.push({
        id: 'REC-NOMINAL',
        severity: 'ADVISORY',
        title: 'Fleet Ready • Coverage Balanced',
        description: 'All marine and tower rescue units are on standby with full zone coverage.',
        affectedZoneId: 'ALL_ZONES',
        availableBoatsCount: availableBoats,
        availableLifeguardsCount: availableLifeguards,
        occupiedResourcesCount: occupied,
        recommendedAction: 'Maintain standard visual surveillance and periodic radio check-in.',
        isDispatched: false,
      });
    }

    return {
      availableBoats,
      availableLifeguards,
      occupiedCount: occupied,
      readinessScore,
      recommendations,
    };
  }
}
