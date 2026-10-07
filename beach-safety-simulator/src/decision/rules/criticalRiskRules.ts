import { ResponseAction } from '../models/ResponseAction';
import { ZoneRiskAssessment } from '../../models/Risk';
import { Incident } from '../../models/Incident';
import { ResourceManager } from '../resources/ResourceManager';

export function evaluateCriticalRiskRules(
  zoneId: string,
  zoneRisk: ZoneRiskAssessment,
  incident: Incident | undefined,
  resourceMgr: ResourceManager,
  currentTime: number
): { actions: ResponseAction[]; reason: string; resourcesRequired: string[]; resourcesAssigned: string[] } {
  const actions: ResponseAction[] = [];
  const resourcesRequired: string[] = ['LIFEGUARD', 'DRONE', 'PA_SYSTEM', 'WARNING_DISPLAY'];
  const resourcesAssigned: string[] = [];

  const targetLoc = incident ? incident.location : { x: 500, y: 300 };

  // 1. Evacuate Zone Broadcast & Flag Closure
  actions.push({
    id: `ACT-EVAC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type: 'EVACUATE_ZONE',
    targetZone: zoneId,
    priority: 95,
    status: 'ACTIVE',
    reason: `Immediate evacuation order: Critical danger in ${zoneId} (${zoneRisk.reason}).`,
    startedAt: currentTime,
    targetLocation: targetLoc,
  });

  actions.push({
    id: `ACT-CLOSE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type: 'CLOSE_ZONE',
    targetZone: zoneId,
    priority: 90,
    status: 'ACTIVE',
    reason: 'Zone closed to all bathing activities. Double Red flags deployed.',
    startedAt: currentTime,
  });

  // 2. PA Siren Broadcast
  const pa = resourceMgr.getResource('PA-MAIN');
  if (pa && pa.status === 'AVAILABLE') {
    actions.push({
      id: `ACT-PA-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: 'ACTIVATE_PA',
      targetZone: zoneId,
      resourceId: pa.id,
      priority: 92,
      status: 'ACTIVE',
      reason: `Broadcast automated voice siren across ${zoneId}: "Danger! All swimmers exit the water immediately!"`,
      startedAt: currentTime,
    });
    resourcesAssigned.push(pa.id);
  }

  // 3. Electronic Warning Displays
  actions.push({
    id: `ACT-DISP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type: 'ACTIVATE_WARNING_DISPLAY',
    targetZone: zoneId,
    priority: 88,
    status: 'ACTIVE',
    reason: 'Set electronic signboards to FLASHING DOUBLE-RED: SWIMMING PROHIBITED.',
    startedAt: currentTime,
  });

  // 4. Lifeguard Dispatch Check
  const nearestLifeguard = resourceMgr.findNearestAvailable('LIFEGUARD', targetLoc);
  let lifeguardDispatched = false;

  if (nearestLifeguard) {
    actions.push({
      id: `ACT-DISP-LG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: 'DISPATCH_LIFEGUARD',
      targetZone: zoneId,
      resourceId: nearestLifeguard.id,
      targetVisitorId: incident?.visitorIds[0],
      priority: 100,
      status: 'ACTIVE',
      reason: `Dispatch ${nearestLifeguard.name} directly to target coordinate.`,
      startedAt: currentTime,
      targetLocation: targetLoc,
    });
    resourcesAssigned.push(nearestLifeguard.id);
    lifeguardDispatched = true;
  }

  // 5. Autonomous Drone Dispatch Check
  const nearestDrone = resourceMgr.findNearestAvailable('DRONE', targetLoc);
  if (nearestDrone) {
    actions.push({
      id: `ACT-DISP-DRN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: 'DISPATCH_DRONE',
      targetZone: zoneId,
      resourceId: nearestDrone.id,
      targetVisitorId: incident?.visitorIds[0],
      priority: 98,
      status: 'ACTIVE',
      reason: `Launch autonomous UAV ${nearestDrone.name} with auto-drop flotation ring.`,
      startedAt: currentTime,
      targetLocation: targetLoc,
    });
    resourcesAssigned.push(nearestDrone.id);
  }

  // 6. Command Center Notification
  actions.push({
    id: `ACT-CMD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type: 'NOTIFY_COMMAND_CENTER',
    targetZone: zoneId,
    priority: 85,
    status: 'ACTIVE',
    reason: `Automated priority dispatch log transmitted to Coastal Emergency Command Center.`,
    startedAt: currentTime,
  });

  // 7. Resource-Constrained Escalation
  let reason = '';
  if (lifeguardDispatched) {
    reason = `Critical risk & active distress in ${zoneId}. Lifeguard dispatched (${nearestLifeguard?.id}), aerial drone deployed, and zone evacuation broadcasted.`;
  } else {
    // Escalation!
    actions.push({
      id: `ACT-EXT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: 'REQUEST_EXTERNAL_ASSISTANCE',
      targetZone: zoneId,
      priority: 100,
      status: 'ACTIVE',
      reason: `ESCALATION: No beach lifeguards available! Requesting emergency marine rescue / Coast Guard assistance.`,
      startedAt: currentTime,
    });
    reason = `Critical distress detected in ${zoneId}. No lifeguards available within local sector. Autonomous drone launched for immediate visual & flotation support, zone evacuation activated, and emergency external assistance requested.`;
  }

  return {
    actions,
    reason,
    resourcesRequired,
    resourcesAssigned,
  };
}
