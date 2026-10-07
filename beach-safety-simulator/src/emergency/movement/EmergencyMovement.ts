import { EmergencyResource } from '../models/EmergencyResource';

export class EmergencyMovement {
  /**
   * Updates physical spatial movement of all emergency vehicles, drones, and personnel.
   */
  public static updateMovement(
    resources: EmergencyResource[],
    deltaTime: number
  ): void {
    resources.forEach((res) => {
      // 1. Moving to incident location
      if ((res.status === 'DISPATCHED' || res.status === 'EN_ROUTE') && res.targetPosition) {
        res.status = 'EN_ROUTE';
        const dx = res.targetPosition.x - res.position.x;
        const dy = res.targetPosition.y - res.position.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 12) {
          const moveStep = res.speed * deltaTime;
          const step = Math.min(dist, moveStep);
          res.position.x += (dx / dist) * step;
          res.position.y += (dy / dist) * step;
        } else {
          // Arrived on scene
          res.position.x = res.targetPosition.x;
          res.position.y = res.targetPosition.y;
          res.status = 'ON_SCENE';
        }
      }

      // 2. Returning to base station after resolution
      if (res.status === 'RETURNING') {
        const dx = res.basePosition.x - res.position.x;
        const dy = res.basePosition.y - res.position.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 10) {
          const moveStep = res.speed * deltaTime;
          const step = Math.min(dist, moveStep);
          res.position.x += (dx / dist) * step;
          res.position.y += (dy / dist) * step;
        } else {
          // Back at base
          res.position.x = res.basePosition.x;
          res.position.y = res.basePosition.y;
          res.status = 'AVAILABLE';
          res.currentIncidentId = undefined;
          res.targetPosition = undefined;
        }
      }
    });
  }
}
