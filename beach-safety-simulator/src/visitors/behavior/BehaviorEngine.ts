import { Visitor } from '../../models/Visitor';
import { Zone } from '../../models/Zone';
import { Environment } from '../../models/Environment';
import { DecisionModel } from './DecisionModel';
import { BehaviorProbability } from './BehaviorProbability';

export class BehaviorEngine {
  /**
   * Updates the behavioral intent and state machine of each visitor.
   */
  public static updateVisitorBehavior(
    visitor: Visitor,
    deltaTime: number,
    zones: Zone[],
    environment: Environment
  ): void {
    if (!visitor.active) return;

    // Advance fatigue if in water
    if (visitor.state === 'SWIMMING' || visitor.state === 'DRIFTING' || visitor.state === 'STRUGGLING') {
      visitor.waterTime += deltaTime;
      const fatigueRate = 0.005 * (1.5 - visitor.swimmingAbility) * (1.0 + environment.waveHeight / 2.0);
      visitor.fatigue = BehaviorProbability.clamp(visitor.fatigue + fatigueRate * deltaTime, 0.0, 1.0);
    } else {
      // Resting on beach recovers fatigue
      visitor.fatigue = BehaviorProbability.clamp(visitor.fatigue - 0.01 * deltaTime, 0.0, 1.0);
    }

    // State machine updates
    switch (visitor.state) {
      case 'ENTERING': {
        // Find initial destination
        const targetZone = DecisionModel.selectTargetZone(visitor, zones, environment);
        visitor.destinationZone = targetZone.id;
        visitor.targetPosition = {
          x: targetZone.x + targetZone.width * (0.2 + Math.random() * 0.6),
          y: targetZone.y + targetZone.height * (0.2 + Math.random() * 0.6),
        };
        visitor.state = 'WALKING';
        break;
      }

      case 'WALKING': {
        // Handled by movement engine to transition to BEACH or WATER_ENTRY upon arrival
        break;
      }

      case 'BEACH': {
        // Periodically decide whether to enter water or stroll
        if (Math.random() < 0.02 * deltaTime) {
          if (BehaviorProbability.roll(visitor.behavior.swimmingPreference)) {
            const waterZones = zones.filter((z) => z.type === 'SWIMMING' || (z.type === 'RESTRICTED' && visitor.behavior.restrictedEntryProbability > 0.4));
            if (waterZones.length > 0) {
              const target = waterZones[Math.floor(Math.random() * waterZones.length)];
              visitor.destinationZone = target.id;
              visitor.targetPosition = {
                x: target.x + target.width * (0.2 + Math.random() * 0.6),
                y: target.y + target.height * (0.3 + Math.random() * 0.5),
              };
              visitor.state = 'WATER_ENTRY';
            }
          } else {
            // Relocate on beach
            if (visitor.targetPosition) {
              visitor.targetPosition.x += (Math.random() - 0.5) * 60;
              visitor.targetPosition.y += (Math.random() - 0.5) * 40;
            }
          }
        }
        break;
      }

      case 'WATER_ENTRY': {
        // Once crossed shoreline, enters SWIMMING
        break;
      }

      case 'SWIMMING': {
        // Swimmers swim around or get pulled by rip currents
        if (Math.random() < 0.03 * deltaTime && !visitor.targetPosition) {
          visitor.targetPosition = {
            x: visitor.position.x + (Math.random() - 0.5) * 50,
            y: visitor.position.y + (Math.random() - 0.5) * 30,
          };
        }
        break;
      }

      case 'STRUGGLING':
      case 'DRIFTING':
      case 'DISTRESS': {
        // Managed by DistressEngine
        break;
      }

      case 'WARNING_RECEIVED': {
        const reaction = DecisionModel.evaluateWarningReaction(visitor, 0.7);
        if (reaction === 'COMPLY') {
          // Seek safety: Head back to safe beach zone
          const safeBeach = zones.find((z) => z.type === 'BEACH_ZONE') || zones[0];
          visitor.destinationZone = safeBeach.id;
          visitor.targetPosition = {
            x: safeBeach.x + safeBeach.width * 0.5,
            y: safeBeach.y + safeBeach.height * 0.5,
          };
          visitor.state = 'WALKING';
        } else {
          visitor.state = 'IGNORING_WARNING';
        }
        break;
      }

      case 'IGNORING_WARNING': {
        // Continue current course defiant of safety directives
        break;
      }

      default:
        break;
    }
  }
}
