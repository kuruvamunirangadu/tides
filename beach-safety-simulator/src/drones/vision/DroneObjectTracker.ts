/**
 * DroneObjectTracker.ts
 * 
 * TIDES Drone Phase 6: Multi-Frame Drone Object Tracker
 * 
 * Associates candidate person detections across successive camera frames:
 * - Employs 2D Bounding Box IoU (Intersection-over-Union) & Centroid Proximity matching
 * - Assigns persistent, non-recycled temporary tracking IDs (e.g. TRK-01-101)
 * - Manages track lifecycle: TENTATIVE (1 hit) -> CONFIRMED (>= 2 hits) -> STALE -> EXPIRED
 * - Handles intermittent missed detections gracefully (tolerates up to 5 consecutive misses)
 * - Enforces per-camera track isolation to prevent tracking continuity confusion during camera switches
 * - Strict Principle: Tracking IDs are temporary mathematical handles; they are never treated as real identities.
 */

import {
  DroneDetectionRecord,
  DroneTrackRecord,
  DroneNormalizedBBox,
  DroneTrackState,
} from './droneDetection.types';

export class DroneObjectTracker {
  private static instance: DroneObjectTracker | null = null;

  // Camera ID -> Map<Track ID, DroneTrackRecord>
  private perCameraTracks: Map<string, Map<string, DroneTrackRecord>> = new Map();
  private nextTrackNumericId: number = 101;
  private readonly MAX_CONSECUTIVE_MISSES: number = 5;
  private readonly TRACK_EXPIRATION_TIMEOUT_MS: number = 1800;
  private readonly MIN_IOU_THRESHOLD: number = 0.15;
  private readonly MAX_CENTROID_DISTANCE: number = 0.14;

  public static getInstance(): DroneObjectTracker {
    if (!DroneObjectTracker.instance) {
      DroneObjectTracker.instance = new DroneObjectTracker();
    }
    return DroneObjectTracker.instance;
  }

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.perCameraTracks.clear();
    this.nextTrackNumericId = 101;
  }

  public resetCameraTracks(cameraId: string): void {
    this.perCameraTracks.delete(cameraId);
  }

  /**
   * Main per-frame tracking update: associates incoming detections with active tracks
   */
  public update(
    cameraId: string,
    droneId: string,
    detections: DroneDetectionRecord[],
    timestampMs: number = Date.now()
  ): DroneTrackRecord[] {
    let tracksMap = this.perCameraTracks.get(cameraId);
    if (!tracksMap) {
      tracksMap = new Map();
      this.perCameraTracks.set(cameraId, tracksMap);
    }

    // 1. Expire stale tracks that exceeded max timeout
    for (const [trackId, track] of tracksMap.entries()) {
      const ageMs = timestampMs - track.lastSeenTimestampMs;
      if (track.misses > this.MAX_CONSECUTIVE_MISSES || ageMs > this.TRACK_EXPIRATION_TIMEOUT_MS) {
        track.state = 'EXPIRED';
        tracksMap.delete(trackId);
      }
    }

    const matchedTrackIds = new Set<string>();
    const matchedDetectionIndices = new Set<number>();

    // 2. Associate detections with active tracks using IoU & Centroid Proximity
    const activeTracks = Array.from(tracksMap.values()).filter((t) => t.state !== 'EXPIRED');

    for (const track of activeTracks) {
      let bestMatchIdx = -1;
      let highestScore = -1;

      for (let i = 0; i < detections.length; i++) {
        if (matchedDetectionIndices.has(i)) continue;

        const det = detections[i];
        const iou = this.calculateIoU(track.bbox, det.bbox);
        const dist = this.calculateCentroidDistance(track.bbox, det.bbox);

        // Combined association score
        if (iou >= this.MIN_IOU_THRESHOLD || dist <= this.MAX_CENTROID_DISTANCE) {
          const score = iou + Math.max(0, 1.0 - dist * 4.0);
          if (score > highestScore) {
            highestScore = score;
            bestMatchIdx = i;
          }
        }
      }

      if (bestMatchIdx >= 0) {
        const matchedDet = detections[bestMatchIdx];
        matchedDetectionIndices.add(bestMatchIdx);
        matchedTrackIds.add(track.trackId);

        // Update matched track state
        track.bbox = { ...matchedDet.bbox };
        track.confidence = parseFloat((track.confidence * 0.65 + matchedDet.confidence * 0.35).toFixed(2));
        track.hits++;
        track.misses = 0;
        track.ageFrames++;
        track.lastSeenTimestampMs = timestampMs;
        track.groundPositionEstimated = matchedDet.groundPositionEstimated;
        track.groundTruthVisitorId = matchedDet.groundTruthVisitorId;

        // State promotion
        if (track.hits >= 2 && track.state === 'TENTATIVE') {
          track.state = 'CONFIRMED';
        } else if (track.state === 'STALE') {
          track.state = 'CONFIRMED';
        }

        // Attach trackId back to detection record
        matchedDet.trackingId = track.trackId;
      } else {
        // Track missed in this frame
        track.misses++;
        track.ageFrames++;
        if (track.misses >= 2 && track.state === 'CONFIRMED') {
          track.state = 'STALE';
        }
      }
    }

    // 3. Initiate new tracks for unmatched detections
    for (let i = 0; i < detections.length; i++) {
      if (matchedDetectionIndices.has(i)) continue;

      const det = detections[i];
      const numericId = this.nextTrackNumericId++;
      const droneSuffix = droneId.replace(/[^0-9]/g, '') || '01';
      const trackId = `TRK-${droneSuffix}-${numericId}`;

      const newTrack: DroneTrackRecord = {
        trackId,
        cameraId,
        droneId,
        bbox: { ...det.bbox },
        confidence: det.confidence,
        ageFrames: 1,
        hits: 1,
        misses: 0,
        firstSeenTimestampMs: timestampMs,
        lastSeenTimestampMs: timestampMs,
        state: 'TENTATIVE',
        groundPositionEstimated: det.groundPositionEstimated,
        groundTruthVisitorId: det.groundTruthVisitorId,
      };

      tracksMap.set(trackId, newTrack);
      det.trackingId = trackId;
    }

    return Array.from(tracksMap.values());
  }

  public getActiveTracks(cameraId: string): DroneTrackRecord[] {
    const tracksMap = this.perCameraTracks.get(cameraId);
    if (!tracksMap) return [];
    return Array.from(tracksMap.values()).filter((t) => t.state !== 'EXPIRED');
  }

  /**
   * Computes 2D Intersection over Union between two normalized bounding boxes
   */
  public calculateIoU(a: DroneNormalizedBBox, b: DroneNormalizedBBox): number {
    const interLeft = Math.max(a.xMin, b.xMin);
    const interTop = Math.max(a.yMin, b.yMin);
    const interRight = Math.min(a.xMax, b.xMax);
    const interBottom = Math.min(a.yMax, b.yMax);

    const interW = Math.max(0, interRight - interLeft);
    const interH = Math.max(0, interBottom - interTop);
    const interArea = interW * interH;

    const areaA = (a.xMax - a.xMin) * (a.yMax - a.yMin);
    const areaB = (b.xMax - b.xMin) * (b.yMax - b.yMin);
    const unionArea = areaA + areaB - interArea;

    if (unionArea <= 0) return 0;
    return parseFloat((interArea / unionArea).toFixed(4));
  }

  /**
   * Computes Euclidean distance between normalized bounding box centroids
   */
  public calculateCentroidDistance(a: DroneNormalizedBBox, b: DroneNormalizedBBox): number {
    const cxA = (a.xMin + a.xMax) / 2;
    const cyA = (a.yMin + a.yMax) / 2;
    const cxB = (b.xMin + b.xMax) / 2;
    const cyB = (b.yMin + b.yMax) / 2;

    const dx = cxA - cxB;
    const dy = cyA - cyB;
    return parseFloat(Math.sqrt(dx * dx + dy * dy).toFixed(4));
  }
}

