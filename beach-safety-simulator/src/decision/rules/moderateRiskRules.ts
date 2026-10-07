import { ResponseAction } from '../models/ResponseAction';
import { ZoneRiskAssessment } from '../../models/Risk';

export function evaluateModerateRiskRules(
  zoneId: string,
  zoneRisk: ZoneRiskAssessment,
  currentTime: number
): ResponseAction[] {
  return [
    {
      id: `ACT-MON-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: 'MONITOR',
      targetZone: zoneId,
      priority: 35,
      status: 'ACTIVE',
      reason: `Elevated observation due to ${zoneRisk.primaryHazard}.`,
      startedAt: currentTime,
    },
    {
      id: `ACT-DISP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: 'ACTIVATE_WARNING_DISPLAY',
      targetZone: zoneId,
      priority: 40,
      status: 'ACTIVE',
      reason: 'Switch electronic matrix flag display to YELLOW (Caution advised for bathers).',
      startedAt: currentTime,
    },
  ];
}
