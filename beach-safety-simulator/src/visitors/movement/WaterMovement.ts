import { Visitor } from '../../models/Visitor';

export class WaterMovement {
  /**
   * Modulates swimming propulsion based on swimming ability, fatigue, and distress.
   */
  public static calculateSwimVelocity(
    visitor: Visitor,
    targetVector: { vx: number; vy: number }
  ): { vx: number; vy: number } {
    // Base ability scaling
    let effectiveAbility = visitor.swimmingAbility * (1.0 - visitor.fatigue * 0.7);

    // If distressed or struggling, intentional propulsion is compromised
    if (visitor.state === 'DISTRESS') {
      effectiveAbility *= 0.1; // Virtually no propulsion against currents
    } else if (visitor.state === 'STRUGGLING') {
      effectiveAbility *= 0.4;
    }

    return {
      vx: targetVector.vx * effectiveAbility,
      vy: targetVector.vy * effectiveAbility,
    };
  }
}
