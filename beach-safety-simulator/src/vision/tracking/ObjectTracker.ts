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
        // Associate by spatial proximity or ground truth reference
        let track = Array.from(this.activeTracks.values()).find(
          (t) =>
            !matchedTrackIds.has(t.trackId) &&
            t.cameraId === cameraId &&
            t.active &&
            t.state !== 'EXPIRED' &&
            (t.groundTruthVisitorId === det.groundTruthVisitorId ||
              this.getDistance(t.positions[t.positions.length - 1], det.worldPosition) < 20.0)
        );

        if (track) {
          // Update existing track
          const prevPos = track.positions[track.positions.length - 1] || det.worldPosition;
          const dt = Math.max(0.05, simTime - track.lastSeen);
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
          track.confidence = Number(((track.confidence * 0.7) + (det.confidence * 0.3)).toFixed(2));
          track.framesTracked += 1;
          track.hits += 1;
          track.misses = 0;
          det.trackId = track.trackId;

          // Promote to CONFIRMED after 2 consecutive frames
          if (track.hits >= 2 && track.state === 'TENTATIVE') {
            track.state = 'CONFIRMED';
          }

          matchedTrackIds.add(track.trackId);
        } else {
          // Initialize new track
          const trackId = `TRACK-${cameraId}-${this.nextTrackNumericId++}`;
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
            state: 'TENTATIVE',
            hits: 1,
            misses: 0,
            provenance: det.provenance || 'SIMULATED',
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

    // Handle missed observations and expiration
    for (const [trackId, track] of this.activeTracks.entries()) {
      if (!matchedTrackIds.has(trackId)) {
        track.misses += 1;
        const timeSinceLastSeen = simTime - track.lastSeen;

        if (timeSinceLastSeen > 4.0) {
          track.state = 'EXPIRED';
          track.active = false;
        } else {
          track.state = 'LOST';
        }
      }
    }

    // Purge completely old inactive tracks (> 15 seconds)
    for (const [trackId, track] of this.activeTracks.entries()) {
      if (!track.active && simTime - track.lastSeen > 15.0) {
        this.activeTracks.delete(trackId);
      }
    }

    return Array.from(this.activeTracks.values());
  }

  private getDistance(p1?: { x: number; y: number }, p2?: { x: number; y: number }): number {
    if (!p1 || !p2) return Infinity;
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  public getActiveTracks(): PersonTrack[] {
    return Array.from(this.activeTracks.values()).filter(
      (t) => t.active && (t.state === 'CONFIRMED' || t.state === 'TENTATIVE')
    );
  }

  public getTrack(trackId: string): PersonTrack | undefined {
    return this.activeTracks.get(trackId);
  }

  public reset(): void {
    this.activeTracks.clear();
    this.nextTrackNumericId = 101;
  }
}
