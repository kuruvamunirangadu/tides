import { PersonTrack } from '../models/PersonTrack';
import { BehaviorDetection, MovementPattern } from '../models/BehaviorDetection';
import { CVSafetyEvent } from '../models/CVSafetyEvent';

export class BehaviorAnalyzer {
  public analyzeBehavior(
    tracks: PersonTrack[],
    simTime: number,
    timeDisplay: string
  ): { behaviors: BehaviorDetection[]; safetyEvents: CVSafetyEvent[] } {
    const behaviors: BehaviorDetection[] = [];
    const safetyEvents: CVSafetyEvent[] = [];

    for (const track of tracks) {
      if (!track.active || track.positions.length < 5) continue;

      const latestPos = track.positions[track.positions.length - 1];
      const inWater = latestPos.y >= 260;

      // 1. Calculate trajectory metrics
      const pCount = track.positions.length;
      const startPos = track.positions[0];
      const netDx = latestPos.x - startPos.x;
      const netDy = latestPos.y - startPos.y;
      const netDist = Math.sqrt(netDx * netDx + netDy * netDy);

      let totalPathLength = 0;
      let angleChanges = 0;
      let prevAngle = 0;

      for (let i = 1; i < pCount; i++) {
        const segDx = track.positions[i].x - track.positions[i - 1].x;
        const segDy = track.positions[i].y - track.positions[i - 1].y;
        totalPathLength += Math.sqrt(segDx * segDx + segDy * segDy);

        const currentAngle = (Math.atan2(segDy, segDx) * 180) / Math.PI;
        if (i > 1) {
          let diff = Math.abs(currentAngle - prevAngle);
          if (diff > 180) diff = 360 - diff;
          if (diff > 45) angleChanges += 1;
        }
        prevAngle = currentAngle;
      }

      // Sinuosity / Irregularity: ratio of total distance travelled to net displacement
      const irregularityScore = Math.min(
        1.0,
        totalPathLength > 0 ? (totalPathLength - netDist) / Math.max(1, totalPathLength) : 0
      );

      // Offshore drift rate (y positive goes deeper into the ocean)
      const offshoreVelocity = netDy / Math.max(1, simTime - track.firstSeen);
      const isDriftingSeaward = inWater && offshoreVelocity > 0.45 && latestPos.y > 320;

      let pattern: MovementPattern = 'NORMAL';
      let desc = 'Regular movement pattern';

      if (isDriftingSeaward) {
        pattern = 'DRIFTING';
        desc = `Seaward drift detected at ${offshoreVelocity.toFixed(2)}m/s`;
        if (!track.driftingObserved) {
          track.driftingObserved = true;
          safetyEvents.push({
            id: `CV-EVT-DRIFT-${track.trackId}-${Date.now().toString().slice(-4)}`,
            type: 'DRIFTING_DETECTED',
            trackIds: [track.trackId],
            groundTruthVisitorIds: [track.groundTruthVisitorId],
            cameraId: track.cameraId,
            zoneId: track.currentZoneId,
            confidence: Number((0.82 + track.confidence * 0.15).toFixed(2)),
            timestamp: simTime,
            timeDisplay,
            title: `Offshore Drift Detected: ${track.trackId}`,
            description: `Swimmer swept offshore at ${offshoreVelocity.toFixed(2)}m/s into deep surf`,
            severity: 'HIGH',
            metadata: { offshoreVelocity, position: latestPos },
          });
        }
      } else if (inWater && irregularityScore > 0.65 && angleChanges >= 3) {
        pattern = 'ABNORMAL_MOVEMENT';
        desc = `Erratic high-frequency trajectory changes (irregularity: ${(irregularityScore * 100).toFixed(0)}%)`;
      }

      behaviors.push({
        trackId: track.trackId,
        groundTruthVisitorId: track.groundTruthVisitorId,
        pattern,
        driftSpeed: Number(offshoreVelocity.toFixed(2)),
        deviationAngle: Math.round(track.direction),
        irregularityScore: Number(irregularityScore.toFixed(2)),
        stationaryDurationSec: 0,
        confidence: track.confidence,
        description: desc,
        timestamp: simTime,
      });
    }

    return { behaviors, safetyEvents };
  }
}
