import { ResponseAction } from '../models/ResponseAction';
import { ZoneRiskAssessment } from '../../models/Risk';

export function evaluateLowRiskRules(
  zoneId: string,
  _zoneRisk: ZoneRiskAssessment,
  currentTime: number
): ResponseAction[] {
  return [
    {
      id: `ACT-MON-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: 'MONITOR',
      targetZone: zoneId,
      priority: 10,
      status: 'ACTIVE',
      reason: 'Normal baseline surveillance. Environmental surf within safe parameters.',
      startedAt: currentTime,
    },
  ];
}
