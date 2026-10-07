import { EmergencyResource } from '../models/EmergencyResource';
import { BeachRiskOverview } from '../../models/Risk';

export interface BoardDisplayState {
  boardId: string;
  zoneId: string;
  message: string;
  color: string;
  isFlashing: boolean;
}

export class WarningBoardManager {
  public static updateBoards(
    boards: EmergencyResource[],
    riskOverview: BeachRiskOverview | undefined
  ): BoardDisplayState[] {
    if (!riskOverview) return [];

    return boards.map((board) => {
      let zoneId = 'ZONE_A';
      if (board.id === 'LED-A') zoneId = 'SZ-01';
      else if (board.id === 'LED-B') zoneId = 'BZ-01';
      else if (board.id === 'LED-C') zoneId = 'RZ-01';

      const za = riskOverview.zoneAssessments[zoneId];
      let message = '🟢 SURF CONDITIONS NORMAL — SWIM SAFELY';
      let color = '#22c55e';
      let isFlashing = false;

      if (za) {
        if (za.category === 'CRITICAL') {
          message = '🚨 DANGER: SEVERE RIP CURRENT — EVACUATE WATER';
          color = '#ef4444';
          isFlashing = true;
        } else if (za.category === 'HIGH') {
          message = '⚠️ CAUTION: STRONG WAVES & CURRENT — STAY NEAR SHORE';
          color = '#f97316';
          isFlashing = true;
        } else if (za.category === 'MODERATE') {
          message = '🟡 NOTICE: MODERATE CHOP — SWIM IN DESIGNATED ZONES';
          color = '#eab308';
        }
      }

      return {
        boardId: board.id,
        zoneId,
        message,
        color,
        isFlashing,
      };
    });
  }
}
