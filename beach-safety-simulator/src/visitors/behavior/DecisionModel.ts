import { Visitor } from '../../models/Visitor';
import { Zone } from '../../models/Zone';
import { Environment } from '../../models/Environment';
import { BehaviorProbability } from './BehaviorProbability';

export class DecisionModel {
  /**
   * Decides which zone a visitor should target based on their profile and beach state.
   */
  public static selectTargetZone(
    visitor: Visitor,
    zones: Zone[],
    _environment: Environment
  ): Zone {
    const isWaterDesired = BehaviorProbability.roll(
      visitor.behavior.swimmingPreference,
      visitor.swimmingAbility > 0.5 ? 1.2 : 0.8
    );

    // Filter candidate zones
    const candidateZones = zones.filter((z) => {
      if (isWaterDesired) {
        if (z.type === 'RESTRICTED') {
          return BehaviorProbability.roll(visitor.behavior.restrictedEntryProbability);
        }
        return z.type === 'SWIMMING' || z.type === 'WATER_AREA';
      } else {
        return z.type === 'BEACH_ZONE' || z.type === 'SHORELINE';
      }
    });

    if (candidateZones.length === 0) {
      const safeZones = zones.filter((z) => z.type !== 'RESTRICTED');
      return safeZones[Math.floor(Math.random() * safeZones.length)] || zones[0];
    }

    return candidateZones[Math.floor(Math.random() * candidateZones.length)];
  }

  /**
   * Decides whether the visitor complies with a warning or ignores it.
   */
  public static evaluateWarningReaction(
    visitor: Visitor,
    hazardSeverity: number
  ): 'COMPLY' | 'IGNORE' {
    const complianceFactor =
      visitor.warningResponse * 0.5 +
      (1.0 - visitor.riskTolerance) * 0.3 +
      hazardSeverity * 0.2;

    const complies = BehaviorProbability.roll(complianceFactor);
    return complies ? 'COMPLY' : 'IGNORE';
  }
}
