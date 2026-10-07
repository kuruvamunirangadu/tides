import { Zone } from '../../models/Zone';
import { PersonTrack } from '../models/PersonTrack';
import { CVSafetyEvent } from '../models/CVSafetyEvent';

export class ZoneDetector {
  public evaluateZoneEntries(
    tracks: PersonTrack[],
    zones: Zone[],
    simTime: number,
    timeDisplay: string
  ): { updatedTracks: PersonTrack[]; safetyEvents: CVSafetyEvent[] } {
    const safetyEvents: CVSafetyEvent[] = [];

    for (const track of tracks) {
      if (!track.active || track.positions.length === 0) continue;

      const pos = track.positions[track.positions.length - 1];
      const matchedZone = zones.find(
        (z) =>
          pos.x >= z.x &&
          pos.x <= z.x + z.width &&
          pos.y >= z.y &&
          pos.y <= z.y + z.height
      );

      track.currentZoneId = matchedZone?.id;

      // Check restricted zone violation
      if (matchedZone && matchedZone.type === 'RESTRICTED') {
        if (!track.restrictedEntryObserved) {
          track.restrictedEntryObserved = true;
          safetyEvents.push({
            id: `CV-EVT-RESTRICTED-${track.trackId}-${Date.now().toString().slice(-4)}`,
            type: 'RESTRICTED_ZONE_ENTRY',
            trackIds: [track.trackId],
            groundTruthVisitorIds: [track.groundTruthVisitorId],
            cameraId: track.cameraId,
            zoneId: matchedZone.id,
            confidence: Number(track.confidence.toFixed(2)),
            timestamp: simTime,
            timeDisplay,
            title: `Restricted Zone Intrusion: ${track.trackId}`,
            description: `Track ${track.trackId} entered restricted sector ${matchedZone.name}`,
            severity: 'HIGH',
            metadata: { zoneName: matchedZone.name, position: pos },
          });
        }
      }
    }

    return { updatedTracks: tracks, safetyEvents };
  }
}
