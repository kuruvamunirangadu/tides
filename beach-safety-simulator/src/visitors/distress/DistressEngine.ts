import { Visitor } from '../../models/Visitor';
import { Environment } from '../../models/Environment';
import { Zone } from '../../models/Zone';
import { DistressTriggers } from './DistressTriggers';

export class DistressEngine {
  /**
   * Evaluates state machine transitions: SWIMMING -> STRUGGLING -> DISTRESS
   */
  public static updateDistressState(
    visitor: Visitor,
    _deltaTime: number,
    currentTime: number,
    environment: Environment,
    zones: Zone[]
  ): void {
    if (!visitor.active) return;

    const currentZone = zones.find((z) => z.id === visitor.currentZone);
    const { risk, primaryCause } = DistressTriggers.evaluateDistressRisk(visitor, environment, currentZone);

    visitor.distressLevel = risk;

    // State transitions (Early life-safety detection)
    if (visitor.state === 'SWIMMING' || visitor.state === 'DRIFTING') {
      if (risk > 0.58) {
        visitor.state = 'DISTRESS';
        visitor.distressState = {
          level: risk,
          cause: primaryCause,
          startedAt: currentTime,
          location: { ...visitor.position },
          assistanceRequired: true,
        };
      } else if (risk > 0.35) {
        visitor.state = 'STRUGGLING';
      }
    } else if (visitor.state === 'STRUGGLING') {
      if (risk > 0.48) {
        visitor.state = 'DISTRESS';
        visitor.distressState = {
          level: risk,
          cause: primaryCause,
          startedAt: currentTime,
          location: { ...visitor.position },
          assistanceRequired: true,
        };
      } else if (risk < 0.25) {
        visitor.state = 'SWIMMING';
      }
    } else if (visitor.state === 'DISTRESS') {
      if (visitor.distressState) {
        visitor.distressState.level = Math.max(0.7, risk);
        visitor.distressState.location = { ...visitor.position };
      }
      if (visitor.position.y < 240) {
        visitor.state = 'BEACH';
        visitor.distressState = undefined;
      }
    }
  }
}
