import { ResponseAction } from '../models/ResponseAction';
import { ResourceManager } from '../resources/ResourceManager';
import { VisitorEngine } from '../../visitors/VisitorEngine';
import { Zone } from '../../models/Zone';

export class ActionExecutor {
  /**
   * Executes active actions and applies closed-loop behavioral & kinematic feedback to the world.
   */
  public static executeActions(
    actions: ResponseAction[],
    resourceMgr: ResourceManager,
    visitorEngine: VisitorEngine,
    zones: Zone[],
    _currentTime: number
  ): void {
    const vm = visitorEngine.getVisitorManager();

    actions.forEach((action) => {
      if (action.status !== 'ACTIVE') return;

      switch (action.type) {
        case 'DISPATCH_LIFEGUARD': {
          if (!action.resourceId || !action.targetLocation) break;
          const lg = resourceMgr.getResource(action.resourceId);
          if (lg) {
            lg.status = 'DISPATCHED';
            lg.targetPosition = { ...action.targetLocation };

            // Check if lifeguard reached target
            const dist = Math.hypot(lg.position.x - action.targetLocation.x, lg.position.y - action.targetLocation.y);
            if (dist < 25) {
              // Rescue execution: Save the distressed visitor
              if (action.targetVisitorId) {
                const targetVisitor = vm.getVisitor(action.targetVisitorId);
                if (targetVisitor && targetVisitor.active) {
                  targetVisitor.state = 'BEACH';
                  targetVisitor.position = { x: targetVisitor.position.x, y: 220 }; // Pulled to dry sand
                  targetVisitor.distressLevel = 0.1;
                  targetVisitor.fatigue = 0.2;
                  targetVisitor.distressState = undefined;
                }
              }
              action.status = 'COMPLETED';
              lg.status = 'AVAILABLE';
              lg.targetPosition = undefined;
            }
          }
          break;
        }

        case 'DISPATCH_DRONE': {
          if (!action.resourceId || !action.targetLocation) break;
          const drone = resourceMgr.getResource(action.resourceId);
          if (drone) {
            drone.status = 'DISPATCHED';
            drone.targetPosition = { ...action.targetLocation };

            const dist = Math.hypot(drone.position.x - action.targetLocation.x, drone.position.y - action.targetLocation.y);
            if (dist < 20) {
              // Flotation payload drop: stabilizes distressed swimmer
              if (action.targetVisitorId) {
                const targetVisitor = vm.getVisitor(action.targetVisitorId);
                if (targetVisitor && targetVisitor.active) {
                  targetVisitor.fatigue = Math.max(0.1, targetVisitor.fatigue - 0.5);
                  if (targetVisitor.state === 'DISTRESS') {
                    targetVisitor.state = 'STRUGGLING'; // Upgraded from life-threatening distress
                  }
                }
              }
              action.status = 'COMPLETED';
              drone.status = 'AVAILABLE';
              drone.targetPosition = undefined;
            }
          }
          break;
        }

        case 'EVACUATE_ZONE':
        case 'ACTIVATE_PA': {
          if (!action.targetZone) break;
          // Trigger evacuation compliance on visitors in that zone
          const zone = zones.find((z) => z.id === action.targetZone);
          if (zone) {
            const inZoneVisitors = vm.getActiveVisitors().filter(
              (v) => v.currentZone === zone.id || (v.position.x >= zone.x && v.position.x <= zone.x + zone.width && v.position.y >= zone.y && v.position.y <= zone.y + zone.height)
            );

            inZoneVisitors.forEach((v) => {
              // Compliant bathers in water head for the dry beach
              if (v.position.y > 250 && v.behavior.warningResponse > 0.25) {
                v.state = 'WALKING';
                v.targetPosition = {
                  x: v.position.x + (Math.random() - 0.5) * 40,
                  y: 180 + Math.random() * 40, // Dry sand
                };
              }
            });
          }
          break;
        }

        case 'CLOSE_ZONE': {
          if (!action.targetZone) break;
          const zone = zones.find((z) => z.id === action.targetZone);
          if (zone) {
            zone.status = 'CLOSED';
          }
          break;
        }

        case 'ACTIVATE_WARNING_DISPLAY': {
          // Warning lights active
          break;
        }

        default:
          break;
      }
    });
  }
}
