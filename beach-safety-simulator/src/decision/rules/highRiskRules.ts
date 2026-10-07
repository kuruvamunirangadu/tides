import { ResponseAction } from '../models/ResponseAction';
import { ZoneRiskAssessment } from '../../models/Risk';
import { ResourceManager } from '../resources/ResourceManager';

export function evaluateHighRiskRules(
  zoneId: string,
  zoneRisk: ZoneRiskAssessment,
  resourceMgr: ResourceManager,
  currentTime: number
): ResponseAction[] {
  const actions: ResponseAction[] = [
    {
      id: `ACT-ALERT-LG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: 'ALERT_LIFEGUARD',
      targetZone: zoneId,
      priority: 70,
      status: 'ACTIVE',
      reason: `Alert patrol tower on duty: Heavy current & high exposure in ${zoneId}.`,
      startedAt: currentTime,
    },
    {
      id: `ACT-DISP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: 'ACTIVATE_WARNING_DISPLAY',
      targetZone: zoneId,
      priority: 75,
      status: 'ACTIVE',
      reason: 'Switch electronic matrix flag display to RED (Hazardous conditions).',
      startedAt: currentTime,
    },
  ];

  // If drones available, prepare drone standby
  const availDrones = resourceMgr.getAvailableResourcesByType('DRONE');
  if (availDrones.length > 0) {
    actions.push({
      id: `ACT-DRN-STBY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: 'MONITOR',
      targetZone: zoneId,
      resourceId: availDrones[0].id,
      priority: 65,
      status: 'ACTIVE',
      reason: `Pre-arm autonomous drone ${availDrones[0].id} on standby for rapid launch.`,
      startedAt: currentTime,
    });
  }

  return actions;
}
