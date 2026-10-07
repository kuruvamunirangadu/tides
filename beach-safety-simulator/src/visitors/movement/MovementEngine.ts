import { Visitor } from '../../models/Visitor';
import { Zone } from '../../models/Zone';
import { Environment } from '../../models/Environment';
import { CurrentDrift } from './CurrentDrift';
import { WaterMovement } from './WaterMovement';
import { PathFinder } from './PathFinder';

export class MovementEngine {
  /**
   * Updates the spatial kinematic position of each visitor per tick.
   */
  public static updateVisitorMovement(
    visitor: Visitor,
    deltaTime: number,
    zones: Zone[],
    environment: Environment,
    allVisitorsMap?: Map<string, Visitor>
  ): void {
    if (!visitor.active) return;

    // 1. Follow group leader if member
    if (visitor.groupId && visitor.leaderId && !visitor.isLeader && allVisitorsMap) {
      const leader = allVisitorsMap.get(visitor.leaderId);
      if (leader && leader.active) {
        const dx = leader.position.x - visitor.position.x;
        const dy = leader.position.y - visitor.position.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 35) {
          visitor.targetPosition = {
            x: leader.position.x + (Math.random() - 0.5) * 20,
            y: leader.position.y + (Math.random() - 0.5) * 20,
          };
        }
      }
    }

    // 2. Intentional Movement Calculation
    let targetVx = 0;
    let targetVy = 0;

    if (visitor.targetPosition) {
      const dx = visitor.targetPosition.x - visitor.position.x;
      const dy = visitor.targetPosition.y - visitor.position.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 8) {
        const normX = dx / dist;
        const normY = dy / dist;
        const isFleeing = visitor.awarenessState === 'FLEEING';
        const speedMultiplier = isFleeing ? 1.4 : 1.0;
        const baseSpeed = visitor.speed * 25 * speedMultiplier; // scaled to pixels/sec
        targetVx = normX * baseSpeed;
        targetVy = normY * baseSpeed;
      } else {
        // Arrived at target
        visitor.targetPosition = undefined;
        if (visitor.awarenessState === 'FLEEING') {
          if (visitor.position.y <= 240) {
            visitor.awarenessState = 'UNAWARE';
            visitor.state = 'BEACH';
          }
        } else if (visitor.state === 'ENTERING' || visitor.state === 'WALKING') {
          visitor.state = visitor.position.y > 260 ? 'SWIMMING' : 'BEACH';
        } else if (visitor.state === 'WATER_ENTRY') {
          visitor.state = 'SWIMMING';
        }
      }
    }

    // 3. Modulate Swimming Propulsion if in water
    const inWater = visitor.position.y >= 260;
    let intentionalVelocity = { vx: targetVx, vy: targetVy };

    if (inWater) {
      intentionalVelocity = WaterMovement.calculateSwimVelocity(visitor, intentionalVelocity);
    }

    // 4. Calculate Environmental Drift
    const currentZone = zones.find((z) =>
      visitor.position.x >= z.x &&
      visitor.position.x <= z.x + z.width &&
      visitor.position.y >= z.y &&
      visitor.position.y <= z.y + z.height
    );

    const drift = CurrentDrift.calculateDrift(visitor.position, currentZone, environment);
    visitor.driftVector = drift;

    // 5. Total Superimposed Velocity
    const totalVx = intentionalVelocity.vx + drift.dx;
    const totalVy = intentionalVelocity.vy + drift.dy;

    visitor.velocity = { vx: totalVx, vy: totalVy };

    // 6. Update Position
    visitor.position.x += totalVx * deltaTime;
    visitor.position.y += totalVy * deltaTime;

    // 7. Clamp to beach boundaries
    visitor.position = PathFinder.clampToBounds(visitor.position);

    // 8. Update Zone membership
    if (currentZone) {
      visitor.currentZone = currentZone.id;
      visitor.zone = currentZone.id;

      if (currentZone.type === 'RESTRICTED' && visitor.state !== 'IN_RESTRICTED_ZONE' && visitor.state !== 'DISTRESS') {
        visitor.state = 'IN_RESTRICTED_ZONE';
      }
    }

    // 9. Update state on water transition
    if (visitor.position.y > 270 && (visitor.state === 'BEACH' || visitor.state === 'WALKING')) {
      visitor.state = 'SWIMMING';
    } else if (visitor.position.y < 240 && visitor.state === 'SWIMMING') {
      visitor.state = 'BEACH';
      visitor.waterTime = 0;
    }
  }
}
