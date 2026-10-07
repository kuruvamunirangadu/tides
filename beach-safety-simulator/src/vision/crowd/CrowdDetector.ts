import { CrowdDetection } from '../models/CrowdDetection';
import { PersonTrack } from '../models/PersonTrack';
import { Camera } from '../models/Camera';
import { Zone } from '../../models/Zone';

export class CrowdDetector {
  public analyzeCrowds(
    cameras: Camera[],
    tracks: PersonTrack[],
    zones: Zone[],
    simTime: number
  ): CrowdDetection[] {
    const crowdResults: CrowdDetection[] = [];
    const activeTracks = tracks.filter((t) => t.active);

    for (const camera of cameras) {
      if (camera.status === 'OFFLINE' || !camera.detectionEnabled) continue;

      const cameraTracks = activeTracks.filter((t) => t.cameraId === camera.id);

      for (const zoneId of camera.zoneIds) {
        const zone = zones.find((z) => z.id === zoneId);
        const zoneArea = zone ? Math.max(100, (zone.width * zone.height) / 10) : 500;

        // Tracks in this zone
        const inZoneTracks = cameraTracks.filter((t) => {
          const lastPos = t.positions[t.positions.length - 1];
          if (!zone || !lastPos) return true;
          return (
            lastPos.x >= zone.x &&
            lastPos.x <= zone.x + zone.width &&
            lastPos.y >= zone.y &&
            lastPos.y <= zone.y + zone.height
          );
        });

        const peopleCount = inZoneTracks.length;
        const swimmerCount = inZoneTracks.filter((t) => {
          const p = t.positions[t.positions.length - 1];
          return p && p.y >= 260;
        }).length;

        const density = Number((peopleCount / zoneArea).toFixed(3));

        let level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'LOW';
        if (peopleCount >= 40 || density >= 0.08) {
          level = 'CRITICAL';
        } else if (peopleCount >= 25 || density >= 0.05) {
          level = 'HIGH';
        } else if (peopleCount >= 12 || density >= 0.02) {
          level = 'MODERATE';
        }

        crowdResults.push({
          cameraId: camera.id,
          zoneId,
          peopleCount,
          swimmerCount,
          area: zoneArea,
          density,
          level,
          confidence: Math.max(0.7, camera.status === 'DEGRADED' ? 0.65 : 0.92),
          timestamp: simTime,
        });
      }
    }

    return crowdResults;
  }
}
