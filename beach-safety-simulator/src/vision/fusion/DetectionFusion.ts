import { CVSafetyEvent } from '../models/CVSafetyEvent';
import { PersonTrack } from '../models/PersonTrack';
import { DistressDetection } from '../models/BehaviorDetection';
import { Visitor } from '../../models/Visitor';
import { Hazard } from '../../models/Hazard';

export interface FusedSafetyDetection {
  id: string;
  source: 'CV_CAMERA' | 'DRONE' | 'BUOY_SENSOR' | 'FUSED_CONSENSUS';
  type: string;
  targetId?: string;
  zoneId?: string;
  confidence: number;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  supportingSources: string[];
  timestamp: number;
}

export class DetectionFusion {
  public fuseDetections(
    cvSafetyEvents: CVSafetyEvent[],
    distressDetections: DistressDetection[],
    activeHazards: Hazard[],
    tracks: PersonTrack[],
    groundTruthVisitors: Visitor[],
    simTime: number
  ): FusedSafetyDetection[] {
    const fusedList: FusedSafetyDetection[] = [];

    // 1. Fuse Distress Events across Cameras and Physical Drift cues
    for (const dist of distressDetections) {
      const matchingEvents = cvSafetyEvents.filter(
        (e) => e.trackIds.includes(dist.trackId) && e.type === 'POSSIBLE_DISTRESS'
      );
      const track = tracks.find((t) => t.trackId === dist.trackId);
      const gt = groundTruthVisitors.find((v) => v.id === dist.groundTruthVisitorId);

      const supporting: string[] = matchingEvents.map((e) => e.cameraId);
      if (track?.driftingObserved) supporting.push('TRAJECTORY_DRIFT_ANALYZER');
      if (gt && gt.state === 'DISTRESS') supporting.push('GROUND_TRUTH_VERIFICATION');

      // Confidence boosts with multi-source consensus
      let boostedConfidence = dist.confidence;
      if (supporting.length >= 2) boostedConfidence = Math.min(0.98, boostedConfidence + 0.08);

      fusedList.push({
        id: `FUSED-DISTRESS-${dist.trackId}-${Date.now().toString().slice(-4)}`,
        source: supporting.length > 1 ? 'FUSED_CONSENSUS' : 'CV_CAMERA',
        type: 'CONFIRMED_DISTRESS',
        targetId: dist.groundTruthVisitorId,
        zoneId: track?.currentZoneId,
        confidence: Number(boostedConfidence.toFixed(2)),
        description: `Multi-source fused alert: Swimmer ${dist.trackId} exhibiting high-confidence in-water distress`,
        severity: 'CRITICAL',
        supportingSources: supporting,
        timestamp: simTime,
      });
    }

    // 2. Fuse Restricted Zone Incursions
    const restrictedEvents = cvSafetyEvents.filter((e) => e.type === 'RESTRICTED_ZONE_ENTRY');
    for (const rev of restrictedEvents) {
      fusedList.push({
        id: `FUSED-ZONE-${rev.id}`,
        source: 'CV_CAMERA',
        type: 'RESTRICTED_ENTRY',
        targetId: rev.groundTruthVisitorIds[0],
        zoneId: rev.zoneId,
        confidence: rev.confidence,
        description: rev.description,
        severity: rev.severity,
        supportingSources: [rev.cameraId, 'POLYGON_ZONE_MAPPER'],
        timestamp: simTime,
      });
    }

    return fusedList;
  }
}
