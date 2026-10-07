import { PersonTrack } from '../models/PersonTrack';
import { DistressDetection } from '../models/BehaviorDetection';
import { CVSafetyEvent } from '../models/CVSafetyEvent';
import { Visitor } from '../../models/Visitor';

export class DistressDetector {
  private activeDistressMap: Map<string, DistressDetection> = new Map();

  public evaluateDistress(
    tracks: PersonTrack[],
    groundTruthVisitors: Visitor[],
    simTime: number,
    timeDisplay: string
  ): { detections: DistressDetection[]; safetyEvents: CVSafetyEvent[] } {
    const detections: DistressDetection[] = [];
    const safetyEvents: CVSafetyEvent[] = [];

    for (const track of tracks) {
      if (!track.active || track.positions.length < 4) continue;

      const latestPos = track.positions[track.positions.length - 1];
      const inWater = latestPos.y >= 260;
      if (!inWater) continue;

      // Match ground truth visitor to check actual distress for simulated CV cues
      const gtVisitor = groundTruthVisitors.find((v) => v.id === track.groundTruthVisitorId);
      const isActualDistressed = gtVisitor?.state === 'DISTRESS' || gtVisitor?.state === 'STRUGGLING';

      // 1. Compute multi-cue distress indicators
      const durationTracked = simTime - track.firstSeen;

      // A. Low forward progress with movement
      const pCount = track.positions.length;
      const startPos = track.positions[0];
      const netDist = Math.sqrt(
        Math.pow(latestPos.x - startPos.x, 2) + Math.pow(latestPos.y - startPos.y, 2)
      );
      const netSpeed = netDist / Math.max(1, durationTracked);
      const lowForwardProgress = netSpeed < 0.25 ? 0.85 : Math.max(0, 0.7 - netSpeed * 0.5);

      // B. Directional jitter / irregular movement
      const irregularMovement = isActualDistressed ? 0.92 : track.speed > 0.6 && netSpeed < 0.2 ? 0.75 : 0.2;

      // C. Offshore drift
      const driftOffshore = latestPos.y > 340 ? 0.88 : (latestPos.y - 260) / 150;

      // D. Persistence factor
      const persistence = Math.min(1.0, durationTracked / 3.0);

      // Composite distress score
      const compositeScore =
        irregularMovement * 0.35 +
        lowForwardProgress * 0.25 +
        driftOffshore * 0.20 +
        persistence * 0.20;

      let record = this.activeDistressMap.get(track.trackId);

      if (compositeScore >= 0.65 || (isActualDistressed && durationTracked >= 2.0)) {
        if (!record) {
          record = {
            trackId: track.trackId,
            groundTruthVisitorId: track.groundTruthVisitorId,
            confidence: Number(Math.min(0.96, Math.max(0.68, compositeScore * track.confidence)).toFixed(2)),
            indicators: {
              irregularMovement: Number(irregularMovement.toFixed(2)),
              lowForwardProgress: Number(lowForwardProgress.toFixed(2)),
              abnormalVerticalMotion: Number((isActualDistressed ? 0.88 : 0.3).toFixed(2)),
              driftOffshore: Number(Math.min(1.0, driftOffshore).toFixed(2)),
              persistence: Number(persistence.toFixed(2)),
            },
            durationSec: 0,
            status: 'SUSPECTED',
            firstSuspectedAt: simTime,
            lastEvaluatedAt: simTime,
          };
          this.activeDistressMap.set(track.trackId, record);
        }

        record.durationSec = simTime - record.firstSuspectedAt;
        record.lastEvaluatedAt = simTime;
        record.confidence = Number(Math.min(0.96, Math.max(0.70, compositeScore * track.confidence)).toFixed(2));

        if (!track.distressSuspected && record.durationSec >= 2.0) {
          track.distressSuspected = true;
          safetyEvents.push({
            id: `CV-EVT-DISTRESS-${track.trackId}-${Date.now().toString().slice(-4)}`,
            type: 'POSSIBLE_DISTRESS',
            trackIds: [track.trackId],
            groundTruthVisitorIds: [track.groundTruthVisitorId],
            cameraId: track.cameraId,
            zoneId: track.currentZoneId,
            confidence: record.confidence,
            timestamp: simTime,
            timeDisplay,
            title: `Possible Swimmer Distress: ${track.trackId}`,
            description: `Visual anomaly detected on ${track.cameraId}: irregular struggling pattern & offshore drift (confidence: ${(record.confidence * 100).toFixed(0)}%)`,
            severity: 'CRITICAL',
            metadata: {
              indicators: record.indicators,
              position: latestPos,
              groundTruthState: gtVisitor?.state,
            },
          });
        }

        detections.push({ ...record });
      } else if (record && simTime - record.lastEvaluatedAt > 4.0) {
        this.activeDistressMap.delete(track.trackId);
      }
    }

    return { detections, safetyEvents };
  }

  public reset(): void {
    this.activeDistressMap.clear();
  }
}
