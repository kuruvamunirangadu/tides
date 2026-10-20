import { PersonTrack } from '../models/PersonTrack';
import { Camera } from '../models/Camera';

export type AssociationStatus = 'CONFIRMED' | 'AMBIGUOUS' | 'UNASSOCIATED';

export interface CrossCameraAssociation {
  globalEntityId: string;
  cameraTracks: Array<{ cameraId: string; trackId: string }>;
  spatialDistanceMeters: number;
  timeDeltaSeconds: number;
  confidence: number;
  status: AssociationStatus;
  notes: string;
}

export class CrossCameraAssociator {
  private globalEntityCounter: number = 1001;

  public associateAcrossCameras(
    tracks: PersonTrack[],
    cameras: Camera[],
    maxSpatialDelta: number = 22.0,
    maxTimeDelta: number = 1.5
  ): CrossCameraAssociation[] {
    const activeTracks = tracks.filter((t) => t.active && t.state !== 'EXPIRED');
    const associations: CrossCameraAssociation[] = [];

    // Group tracks by camera
    const tracksByCam = new Map<string, PersonTrack[]>();
    for (const track of activeTracks) {
      if (!tracksByCam.has(track.cameraId)) {
        tracksByCam.set(track.cameraId, []);
      }
      tracksByCam.get(track.cameraId)!.push(track);
    }

    const cameraIds = Array.from(tracksByCam.keys());

    for (let i = 0; i < cameraIds.length; i++) {
      const camAId = cameraIds[i];
      const camA = cameras.find((c) => c.id === camAId);
      if (!camA || camA.status === 'OFFLINE') continue;

      const tracksA = tracksByCam.get(camAId) || [];

      for (let j = i + 1; j < cameraIds.length; j++) {
        const camBId = cameraIds[j];
        const camB = cameras.find((c) => c.id === camBId);
        if (!camB || camB.status === 'OFFLINE') continue;

        const tracksB = tracksByCam.get(camBId) || [];

        const candidateMatches: Array<{
          ta: PersonTrack;
          tb: PersonTrack;
          dist: number;
          dt: number;
        }> = [];

        for (const ta of tracksA) {
          const pa = ta.positions[ta.positions.length - 1];
          if (!pa) continue;

          for (const tb of tracksB) {
            const pb = tb.positions[tb.positions.length - 1];
            if (!pb) continue;

            const dt = Math.abs(ta.lastSeen - tb.lastSeen);
            if (dt > maxTimeDelta) continue;

            const dx = pa.x - pb.x;
            const dy = pa.y - pb.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= maxSpatialDelta) {
              candidateMatches.push({ ta, tb, dist, dt });
            }
          }
        }

        // Check for ambiguous collisions
        const aCount = new Map<string, number>();
        const bCount = new Map<string, number>();
        for (const match of candidateMatches) {
          aCount.set(match.ta.trackId, (aCount.get(match.ta.trackId) || 0) + 1);
          bCount.set(match.tb.trackId, (bCount.get(match.tb.trackId) || 0) + 1);
        }

        for (const match of candidateMatches) {
          const isAmbiguous = (aCount.get(match.ta.trackId) || 0) > 1 || (bCount.get(match.tb.trackId) || 0) > 1;
          const status: AssociationStatus = isAmbiguous ? 'AMBIGUOUS' : 'CONFIRMED';

          const spatialScore = Math.max(0.1, 1.0 - match.dist / maxSpatialDelta);
          const temporalScore = Math.max(0.1, 1.0 - match.dt / maxTimeDelta);
          let conf = Math.min(match.ta.confidence, match.tb.confidence) * spatialScore * temporalScore;
          if (isAmbiguous) conf *= 0.55;

          const globalId = `GLOBAL-ENTITY-${this.globalEntityCounter++}`;
          match.ta.globalCrossCameraId = globalId;
          match.tb.globalCrossCameraId = globalId;

          associations.push({
            globalEntityId: globalId,
            cameraTracks: [
              { cameraId: match.ta.cameraId, trackId: match.ta.trackId },
              { cameraId: match.tb.cameraId, trackId: match.tb.trackId },
            ],
            spatialDistanceMeters: Number(match.dist.toFixed(1)),
            timeDeltaSeconds: Number(match.dt.toFixed(2)),
            confidence: Number(Math.max(0.1, Math.min(0.99, conf)).toFixed(2)),
            status,
            notes: isAmbiguous
              ? 'Ambiguous cluster: multiple tracks matched within spatial overlap window'
              : 'Consistent ground-plane projection consensus between calibrated cameras',
          });
        }
      }
    }

    return associations;
  }
}

