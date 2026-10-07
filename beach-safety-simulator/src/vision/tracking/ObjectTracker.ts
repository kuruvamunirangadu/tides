import { DetectedPerson } from '../models/Detection';
import { PersonTrack } from '../models/PersonTrack';

export class ObjectTracker {
  private activeTracks: Map<string, PersonTrack> = new Map();
  private nextTrackNumericId: number = 101;

  public updateTracks(
    cameraDetectionsMap: Map<string, DetectedPerson[]>,
    simTime: number,
    deltaTime: number
  ): PersonTrack[] {
    const matchedTrackIds = new Set<string>();

    for (const [cameraId, detections] of cameraDetectionsMap.entries()) {
      for (const det of detections) {
        // Associate by ground truth visitor ID or proximity match
        let track = Array.from(this.activeTracks.values()).find(
          (t) => t.groundTruthVisitorId === det.groundTruthVisitorId && t.active
        );

        if (track) {
          // Update existing track
          const prevPos = track.positions[track.positions.length - 1] || det.worldPosition;
          const dt = Math.max(0.1, simTime - track.lastSeen);
          const vx = (det.worldPosition.x - prevPos.x) / dt;
          const vy = (det.worldPosition.y - prevPos.y) / dt;
          const speed = Math.sqrt(vx * vx + vy * vy);
          let direction = (Math.atan2(vy, vx) * 180) / Math.PI;
          if (direction < 0) direction += 360;

          track.positions.push({ ...det.worldPosition });
          if (track.positions.length > 40) {
            track.positions.shift();
          }

          track.latestBBox = det.bbox;
          track.lastSeen = simTime;
          track.velocity = { x: vx, y: vy };
          track.speed = Number(speed.toFixed(2));
          track.direction = Math.round(direction);
          track.confidence = det.confidence;
          track.framesTracked += 1;
          det.trackId = track.trackId;
          matchedTrackIds.add(track.trackId);
        } else {
          // Initialize new track
          const trackId = `TRACK-${this.nextTrackNumericId++}`;
          const newTrack: PersonTrack = {
            trackId,
            cameraId,
            groundTruthVisitorId: det.groundTruthVisitorId,
            positions: [{ ...det.worldPosition }],
            latestBBox: det.bbox,
            firstSeen: simTime,
            lastSeen: simTime,
            velocity: { x: 0, y: 0 },
            speed: 0,
            direction: 0,
            confidence: det.confidence,
            active: true,
            framesTracked: 1,
            driftingObserved: false,
            distressSuspected: false,
            restrictedEntryObserved: false,
          };

          this.activeTracks.set(trackId, newTrack);
          det.trackId = trackId;
          matchedTrackIds.add(trackId);
        }
      }
    }

    // Deactivate stale tracks not matched in the last 4 seconds
    for (const [trackId, track] of this.activeTracks.entries()) {
      if (!matchedTrackIds.has(trackId)) {
        if (simTime - track.lastSeen > 4.0) {
          track.active = false;
        }
      }
    }

    // Clean up completely old inactive tracks
    for (const [trackId, track] of this.activeTracks.entries()) {
      if (!track.active && simTime - track.lastSeen > 15.0) {
        this.activeTracks.delete(trackId);
      }
    }

    return Array.from(this.activeTracks.values());
  }

  public getActiveTracks(): PersonTrack[] {
    return Array.from(this.activeTracks.values()).filter((t) => t.active);
  }

  public getTrack(trackId: string): PersonTrack | undefined {
    return this.activeTracks.get(trackId);
  }

  public reset(): void {
    this.activeTracks.clear();
    this.nextTrackNumericId = 101;
  }
}
