import { EmergencyIncident } from '../models/EmergencyIncident';
import { EmergencyResourceManager } from '../resources/ResourceManager';
import { VisitorEngine } from '../../visitors/VisitorEngine';
import { ResponseMetrics } from '../models/ResponseMetrics';

export class RescueManager {
  /**
   * Advances the operational state machine of all active rescues
   */
  public static updateRescueOperations(
    incidents: EmergencyIncident[],
    resourceMgr: EmergencyResourceManager,
    visitorEngine: VisitorEngine,
    currentTime: number,
    onIncidentResolved: (metrics: ResponseMetrics) => void
  ): void {
    const vm = visitorEngine.getVisitorManager();

    incidents.forEach((inc) => {
      if (inc.status === 'RESOLVED' || inc.status === 'ESCALATED') return;

      const assignedResources = inc.assignedResourceIds
        .map((id) => resourceMgr.getById(id))
        .filter(Boolean);

      // Check if primary rescue resources (Lifeguard, Boat, or Drone) are on scene
      const rescueAssetOnScene = assignedResources.some(
        (r) => r?.status === 'ON_SCENE' && (r.type === 'LIFEGUARD' || r.type === 'RESCUE_BOAT' || r.type === 'DRONE')
      );

      // 1. Transition: EN_ROUTE -> ON_SCENE / RESCUE_IN_PROGRESS
      if (
        (inc.status === 'RESOURCES_EN_ROUTE' || inc.status === 'DISPATCHING') &&
        rescueAssetOnScene
      ) {
        inc.status = 'RESCUE_IN_PROGRESS';
        inc.arrivedAt = inc.arrivedAt || currentTime;
        inc.rescueStartedAt = currentTime;
      }

      // 2. Progression during RESCUE_IN_PROGRESS (Ultra-rapid intervention)
      if (inc.status === 'RESCUE_IN_PROGRESS') {
        const rescueDuration = currentTime - (inc.rescueStartedAt || currentTime);

        // Immediate intervention: Secure the person within ~1.2 seconds on scene
        if (rescueDuration > 1.2 && !inc.personSecuredAt) {
          inc.status = 'PERSON_SECURED';
          inc.personSecuredAt = currentTime;

          // Pull victim to dry safe beach sand immediately and clear distress
          inc.affectedVisitorIds.forEach((vId) => {
            const victim = vm.getVisitor(vId);
            if (victim && victim.active) {
              victim.state = 'BEACH';
              victim.position = { x: victim.position.x, y: 180 }; // Safe dry sand
              victim.fatigue = 0.1;
              victim.distressLevel = 0;
              victim.distressState = undefined;
            }
          });
        }
      }

      // 3. Progression: PERSON_SECURED -> MEDICAL_ASSESSMENT -> RESOLVED
      if (inc.status === 'PERSON_SECURED') {
        const securedDuration = currentTime - (inc.personSecuredAt || currentTime);

        if (securedDuration > 1.5) {
          inc.status = 'MEDICAL_ASSESSMENT';

          // If victim is weak or child, request paramedic ambulance support
          if (inc.severity === 'CRITICAL' && !inc.medicalEscalationRequired) {
            inc.medicalEscalationRequired = true;
            const amb = resourceMgr.findBestSuitableResource('medical', { x: 100, y: 220 }, 'AMBULANCE');
            if (amb) {
              resourceMgr.setStatus(amb.id, 'DISPATCHED', inc.id, { x: 120, y: 55 });
              inc.assignedResourceIds.push(amb.id);
            }
          }
        }
      }

      if (inc.status === 'MEDICAL_ASSESSMENT') {
        const medicalDuration = currentTime - (inc.personSecuredAt || currentTime);

        // Rapid resolution achieved after medical check (~2.5s total intervention)
        if (medicalDuration > 2.5) {
          inc.status = 'RESOLVED';
          inc.resolvedAt = currentTime;

          // Release all assigned resources back to RETURNING -> AVAILABLE
          assignedResources.forEach((res) => {
            if (res) {
              res.status = 'RETURNING';
              res.currentIncidentId = undefined;
            }
          });

          // Compile Response Metrics
          const detectionTime = Math.max(1, Math.round(inc.detectedAt - inc.createdAt));
          const decisionTime = Math.max(1, Math.round((inc.dispatchedAt || inc.detectedAt) - inc.detectedAt));
          const dispatchTime = 2;
          const arrivalTime = Math.max(2, Math.round((inc.arrivedAt || currentTime) - (inc.dispatchedAt || inc.detectedAt)));
          const rescueTime = Math.max(3, Math.round((inc.personSecuredAt || currentTime) - (inc.arrivedAt || inc.detectedAt)));
          const resolutionTime = Math.max(2, Math.round(inc.resolvedAt - (inc.personSecuredAt || currentTime)));
          const totalResponseTime = detectionTime + decisionTime + dispatchTime + arrivalTime + rescueTime + resolutionTime;

          const metrics: ResponseMetrics = {
            incidentId: inc.id,
            incidentType: inc.type,
            severity: inc.severity,
            detectionTime,
            decisionTime,
            dispatchTime,
            arrivalTime,
            rescueTime,
            resolutionTime,
            totalResponseTime,
          };

          onIncidentResolved(metrics);
        }
      }
    });
  }
}
