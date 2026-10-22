/**
 * DroneObservationPublisher.ts
 * 
 * TIDES Drone Phase 6: Candidate Observation Event Pipeline
 * 
 * Packages candidate person detections and confirmed tracks into structured
 * DroneCandidateObservation events:
 * - Deduplicates repeated frame events (debounces by track ID to avoid event flooding)
 * - Assigns observation categories (PERSON_IN_SURF, PERSON_SHORELINE, PERSON_DEEP_WATER)
 * - Emits structured candidate observation events requiring lifeguard/operator verification
 * - Posts asynchronously to backend FastAPI /api/vision endpoints when available
 * - Graceful non-blocking degradation if backend is offline
 * - Preserves existing incident and rescue coordination pipelines without interference.
 */

import {
  DroneDetectionRecord,
  DroneTrackRecord,
  DroneCandidateObservation,
  DroneObservationCategory,
} from './droneDetection.types';
import { DroneDistressVerificationEngine } from '../distress/DroneDistressVerificationEngine';
import { DroneCoverageTracker } from '../coverage/DroneCoverageTracker';

export class DroneObservationPublisher {
  private static instance: DroneObservationPublisher | null = null;

  private observationHistory: DroneCandidateObservation[] = [];
  private lastEmittedByTrackId: Map<string, number> = new Map();
  private observationCounter: number = 1000;
  private readonly DEBOUNCE_INTERVAL_MS: number = 4000; // Emit max once every 4s per track
  private isBackendAvailable: boolean = true;
  private backendCheckTimestampMs: number = 0;

  public static getInstance(): DroneObservationPublisher {
    if (!DroneObservationPublisher.instance) {
      DroneObservationPublisher.instance = new DroneObservationPublisher();
    }
    return DroneObservationPublisher.instance;
  }

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.observationHistory = [];
    this.lastEmittedByTrackId.clear();
    this.observationCounter = 1000;
  }

  /**
   * Evaluates active tracks and emits structured candidate observation events
   */
  public processTracksForObservations(
    tracks: DroneTrackRecord[],
    timestampMs: number = Date.now()
  ): DroneCandidateObservation[] {
    const newObservations: DroneCandidateObservation[] = [];

    for (const track of tracks) {
      // Only emit for confirmed tracks (>= 2 hits)
      if (track.state !== 'CONFIRMED') continue;

      // Check debounce interval (always emit on first appearance of track)
      if (this.lastEmittedByTrackId.has(track.trackId)) {
        const lastEmitted = this.lastEmittedByTrackId.get(track.trackId)!;
        if (timestampMs - lastEmitted < this.DEBOUNCE_INTERVAL_MS) {
          continue;
        }
      }

      // Determine observation category based on ground position
      let category: DroneObservationCategory = 'PERSON_OBSERVED';
      if (track.groundPositionEstimated) {
        const z = track.groundPositionEstimated.z;
        if (z < -10) {
          category = 'PERSON_DEEP_WATER';
        } else if (z < 15) {
          category = 'PERSON_IN_SURF';
        } else {
          category = 'PERSON_SHORELINE';
        }
      }

      this.observationCounter++;
      const obsId = `OBS-CANDIDATE-${track.droneId}-${this.observationCounter}`;

      const observation: DroneCandidateObservation = {
        observationId: obsId,
        detectionId: `DET-${track.trackId}-${this.observationCounter}`,
        trackId: track.trackId,
        droneId: track.droneId,
        cameraId: track.cameraId,
        timestampMs,
        confidence: track.confidence,
        bbox: { ...track.bbox },
        category,
        observationType: 'CANDIDATE_OBSERVATION',
        requiresVerification: true,
        reviewStatus: 'PENDING_REVIEW',
        operatorNotes: `Automated aerial detection candidate. Visual confirmation required prior to dispatch.`,
        provenance: 'SIMULATED',
      };

      this.lastEmittedByTrackId.set(track.trackId, timestampMs);
      this.observationHistory.unshift(observation);
      if (this.observationHistory.length > 80) {
        this.observationHistory.pop();
      }

      newObservations.push(observation);

      // Phase 7: Route validated candidate observation into Phase 7 distress verification engine
      try {
        DroneDistressVerificationEngine.getInstance().processObservation(
          {
            observationId: observation.observationId,
            cameraId: observation.cameraId,
            droneId: observation.droneId,
            trackingId: observation.trackId,
            timestampMs: observation.timestampMs,
            bbox: observation.bbox,
            className: 'PERSON',
            confidence: observation.confidence,
            scenePosition: track.groundPositionEstimated,
            provenance: observation.provenance,
            associatedEvidence: [`Phase 6 publisher category: ${observation.category}`],
          },
          timestampMs
        );
      } catch (err) {
        console.warn('DroneDistressVerificationEngine intake error:', err);
      }

      // Phase 8: Route observation ground coordinates into Coastal Coverage Tracker
      try {
        if (track.groundPositionEstimated) {
          DroneCoverageTracker.getInstance().recordObservation(
            {
              observationId: observation.observationId,
              cameraId: observation.cameraId,
              droneId: observation.droneId,
              timestampMs: observation.timestampMs,
              scenePosition: track.groundPositionEstimated,
              confidence: observation.confidence,
            },
            timestampMs
          );
        }
      } catch (err) {
        console.warn('DroneCoverageTracker intake error:', err);
      }

      // Asynchronous non-blocking dispatch to backend API
      this.dispatchToBackendAsync(observation);
    }

    return newObservations;
  }

  public getObservationHistory(): DroneCandidateObservation[] {
    return [...this.observationHistory];
  }

  public updateReviewStatus(
    observationId: string,
    status: 'VERIFIED' | 'DISMISSED',
    notes?: string
  ): boolean {
    const obs = this.observationHistory.find((o) => o.observationId === observationId);
    if (!obs) return false;

    obs.reviewStatus = status;
    if (notes) obs.operatorNotes = notes;

    // Phase 7: Synchronize with Distress Verification Engine
    try {
      const engine = DroneDistressVerificationEngine.getInstance();
      const dossier = engine.getCorrelator().getDossierForObservation(observationId);
      if (dossier) {
        if (status === 'VERIFIED') {
          engine.verifyCandidate(dossier.dossierId, 'OP-COMMAND-01', notes || 'Verified from observation feed');
        } else if (status === 'DISMISSED') {
          engine.dismissCandidate(dossier.dossierId, 'OP-COMMAND-01', notes || 'Dismissed from observation feed');
        }
      }
    } catch (err) {
      console.warn('Error synchronizing review status with Phase 7 engine:', err);
    }

    return true;
  }

  /**
   * Non-blocking HTTP dispatch to FastAPI backend (/api/vision/detections)
   */
  private async dispatchToBackendAsync(obs: DroneCandidateObservation): Promise<void> {
    // Only attempt if backend is presumed reachable or after 10s cooldown
    const now = Date.now();
    if (!this.isBackendAvailable && now - this.backendCheckTimestampMs < 10000) {
      return;
    }

    try {
      const payload = [
        {
          x: obs.bbox.xMin,
          y: obs.bbox.yMin,
          width: obs.bbox.width,
          height: obs.bbox.height,
          confidence: obs.confidence,
          class_name: 'swimmer_normal',
          detection_id: obs.detectionId || obs.observationId,
          camera_id: obs.cameraId,
        },
      ];

      const res = await fetch('http://127.0.0.1:8000/api/vision/detections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        this.isBackendAvailable = true;
      }
    } catch {
      // Backend temporarily offline; mark availability and continue smoothly
      this.isBackendAvailable = false;
      this.backendCheckTimestampMs = now;
    }
  }
}
