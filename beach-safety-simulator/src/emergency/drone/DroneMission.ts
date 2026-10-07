import { EmergencyIncident } from '../models/EmergencyIncident';
import { EmergencyResource } from '../models/EmergencyResource';

export class DroneMissionManager {
  public static updateDroneMissions(
    incidents: EmergencyIncident[],
    drones: EmergencyResource[]
  ): void {
    drones.forEach((drone) => {
      if ((drone.status === 'DISPATCHED' || drone.status === 'EN_ROUTE' || drone.status === 'ON_SCENE') && drone.currentIncidentId) {
        const incident = incidents.find((i) => i.id === drone.currentIncidentId);
        if (incident && incident.status !== 'RESOLVED') {
          const dist = Math.hypot(drone.position.x - incident.location.x, drone.position.y - incident.location.y);
          if (dist < 35) {
            // High altitude visual lock established
            incident.targetConfidence = Math.min(0.98, incident.targetConfidence + 0.05);
          }
        }
      }
    });
  }
}
