import { Visitor } from '../../models/Visitor';
import { Environment } from '../../models/Environment';
import { Zone } from '../../models/Zone';

export class DistressTriggers {
  /**
   * Calculates a continuous risk score of a swimmer entering distress [0, 1].
   */
  public static evaluateDistressRisk(
    visitor: Visitor,
    environment: Environment,
    currentZone: Zone | undefined
  ): { risk: number; primaryCause: 'STRONG_CURRENT' | 'HIGH_WAVE' | 'FATIGUE' | 'CRAMP' | 'UNKNOWN' } {
    if (visitor.position.y < 250) {
      return { risk: 0, primaryCause: 'UNKNOWN' };
    }

    let currentScore = 0;
    let waveScore = 0;
    let fatigueScore = visitor.fatigue * 0.4 + (visitor.waterTime / 180) * 0.3;

    const currentSpeed = environment.currentSpeed ?? environment.waterCurrent;
    const ripProb = environment.ripProbability ?? (environment.waterCurrent > 0.8 ? 0.7 : 0.2);

    if (currentSpeed > 1.0 || ripProb > 0.4) {
      currentScore = (currentSpeed / 2.0) * 0.5 + ripProb * 0.5;
    }

    if (environment.waveHeight > 1.5) {
      waveScore = (environment.waveHeight / 3.0) * 0.5;
    }

    if (currentZone && currentZone.type === 'RESTRICTED') {
      currentScore += 0.3;
    }

    const vulnerabilityMultiplier = 1.6 - visitor.swimmingAbility;
    const totalDistressPressure = (currentScore * 0.45 + waveScore * 0.30 + fatigueScore * 0.25) * vulnerabilityMultiplier;

    let primaryCause: 'STRONG_CURRENT' | 'HIGH_WAVE' | 'FATIGUE' | 'CRAMP' | 'UNKNOWN' = 'UNKNOWN';
    if (currentScore >= waveScore && currentScore >= fatigueScore) {
      primaryCause = 'STRONG_CURRENT';
    } else if (waveScore >= currentScore && waveScore >= fatigueScore) {
      primaryCause = 'HIGH_WAVE';
    } else {
      primaryCause = 'FATIGUE';
    }

    return {
      risk: Math.min(1.0, totalDistressPressure),
      primaryCause,
    };
  }
}
