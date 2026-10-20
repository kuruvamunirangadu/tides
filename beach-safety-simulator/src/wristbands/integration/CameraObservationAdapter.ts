/**
 * CameraObservationAdapter.ts
 * 
 * TIDES Phase 4: Camera & Drone Integration with the Wristband Safety System
 * 
 * Ingests, validates, and normalizes observation feeds from fixed beach cameras
 * (CCTV, Surveillance Towers, Perimeter Cams):
 * - Schema validation and timestamp freshness calculation (FRESH < 5s, STALE 5-20s, EXPIRED > 20s)
 * - Sliding-window deduplication per tracking ID to avoid flooding
 * - Zero coordinate fabrication: preserves spatial uncertainty if ground coordinates are uncalibrated
 * - Emits CameraObservationReceived event contracts and notifies UI listeners
 */

import {
  CameraObservation,
  CameraSourceType,
  DetectionClass,
  FreshnessStatus,
  Phase4EventContract,
  VerificationState,
} from './integration.types';

export interface IngestCameraObservationInput {
  cameraId: string;
  cameraSourceType?: CameraSourceType;
  eventTimestampMs?: number;
  detectionClass: DetectionClass;
  confidenceScore: number;
  observationPosition?: { x: number; y: number; z?: number };
  coordinateReference?: 'BEACH_CANVAS' | '3D_WORLD' | 'GEODETIC_WGS84';
  trackingId?: string;
  bbox?: { x: number; y: number; width: number; height: number };
  evidenceReference?: string;
  provenance?: 'SIMULATED' | 'HARDWARE_DERIVED';
}

export class CameraObservationAdapter {
  private static instance: CameraObservationAdapter | null = null;

  private observations: Map<string, CameraObservation> = new Map();
  private observationHistory: CameraObservation[] = [];
  private lastIngestedByTrackingId: Map<string, number> = new Map();
  private observationCounter: number = 1000;
  private eventListeners: Set<(event: Phase4EventContract) => void> = new Set();
  private changeListeners: Set<() => void> = new Set();

  // Freshness thresholds in milliseconds
  public readonly FRESH_THRESHOLD_MS = 5000;
  public readonly STALE_THRESHOLD_MS = 20000;
  public readonly DEDUPLICATION_WINDOW_MS = 2000;

  public static getInstance(): CameraObservationAdapter {
    if (!CameraObservationAdapter.instance) {
      CameraObservationAdapter.instance = new CameraObservationAdapter();
    }
    return CameraObservationAdapter.instance;
  }

  public reset(): void {
    this.observations.clear();
    this.observationHistory = [];
    this.lastIngestedByTrackingId.clear();
    this.observationCounter = 1000;
    this.notifyChange();
  }

  public subscribeChange(listener: () => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  public subscribeEvents(listener: (event: Phase4EventContract) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  private notifyChange(): void {
    this.changeListeners.forEach((l) => {
      try {
        l();
      } catch (err) {
        console.error('Error in CameraObservationAdapter change listener:', err);
      }
    });
  }

  private emitEvent(event: Phase4EventContract): void {
    this.eventListeners.forEach((l) => {
      try {
        l(event);
      } catch (err) {
        console.error('Error in CameraObservationAdapter event listener:', err);
      }
    });
  }

  /**
   * Evaluates observation timestamp freshness against current system clock
   */
  public evaluateFreshness(eventTimestampMs: number, clockMs: number = Date.now()): FreshnessStatus {
    const ageMs = Math.max(0, clockMs - eventTimestampMs);
    if (ageMs < this.FRESH_THRESHOLD_MS) {
      return 'FRESH';
    } else if (ageMs <= this.STALE_THRESHOLD_MS) {
      return 'STALE';
    } else {
      return 'EXPIRED';
    }
  }

  /**
   * Ingests and validates a camera detection
   */
  public ingestObservation(
    input: IngestCameraObservationInput,
    clockMs: number = Date.now()
  ): { observation?: CameraObservation; accepted: boolean; reason?: string } {
    // 1. Validation checks
    if (!input.cameraId || input.cameraId.trim().length === 0) {
      return { accepted: false, reason: 'Invalid camera observation: missing cameraId' };
    }

    if (input.confidenceScore < 0.0 || input.confidenceScore > 1.0 || isNaN(input.confidenceScore)) {
      return { accepted: false, reason: 'Invalid camera observation: confidenceScore must be between 0.0 and 1.0' };
    }

    const eventTimestamp = input.eventTimestampMs ?? clockMs;

    // 2. Sliding-window deduplication by trackingId + cameraId
    if (input.trackingId) {
      const dedupKey = `${input.cameraId}_${input.trackingId}`;
      const lastIngested = this.lastIngestedByTrackingId.get(dedupKey);
      if (lastIngested && clockMs - lastIngested < this.DEDUPLICATION_WINDOW_MS) {
        return {
          accepted: false,
          reason: `Deduplication: detection for track ${input.trackingId} was ingested ${clockMs - lastIngested}ms ago (within ${this.DEDUPLICATION_WINDOW_MS}ms window)`,
        };
      }
      this.lastIngestedByTrackingId.set(dedupKey, clockMs);
    }

    // 3. Coordinate validation & Zero coordinate fabrication
    let observationPosition = input.observationPosition ? { ...input.observationPosition } : undefined;
    if (observationPosition) {
      // Validate finite numbers
      if (isNaN(observationPosition.x) || isNaN(observationPosition.y)) {
        observationPosition = undefined;
      }
    }

    const freshnessStatus = this.evaluateFreshness(eventTimestamp, clockMs);
    this.observationCounter++;
    const observationId = `CAM-OBS-${this.observationCounter}`;

    const observation: CameraObservation = {
      observationId,
      cameraId: input.cameraId,
      cameraSourceType: input.cameraSourceType ?? 'CCTV_FIXED',
      eventTimestampMs: eventTimestamp,
      ingestionTimestampMs: clockMs,
      detectionClass: input.detectionClass,
      confidenceScore: Math.round(input.confidenceScore * 100) / 100,
      observationPosition,
      coordinateReference: input.coordinateReference ?? 'BEACH_CANVAS',
      trackingId: input.trackingId,
      bbox: input.bbox,
      evidenceReference: input.evidenceReference ?? `frame_${input.cameraId}_${eventTimestamp}.jpg`,
      freshnessStatus,
      verificationStatus: 'PENDING_REVIEW',
      provenance: input.provenance ?? 'SIMULATED',
    };

    this.observations.set(observationId, observation);
    this.observationHistory.unshift(observation);
    if (this.observationHistory.length > 200) {
      this.observationHistory.pop();
    }

    // Emit event contract
    this.emitEvent({
      eventId: `EVT-CAM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      eventType: 'CameraObservationReceived',
      timestampMs: clockMs,
      sourceId: input.cameraId,
      correlationId: observationId,
      payload: { ...observation },
    });

    this.notifyChange();
    return { accepted: true, observation };
  }

  public getObservation(id: string): CameraObservation | undefined {
    return this.observations.get(id);
  }

  public getAllObservations(): CameraObservation[] {
    return Array.from(this.observations.values());
  }

  public getRecentObservations(limit: number = 50): CameraObservation[] {
    return this.observationHistory.slice(0, limit);
  }

  public updateFreshness(clockMs: number = Date.now()): void {
    let changed = false;
    for (const obs of this.observations.values()) {
      const prev = obs.freshnessStatus;
      obs.freshnessStatus = this.evaluateFreshness(obs.eventTimestampMs, clockMs);
      if (prev !== obs.freshnessStatus) {
        changed = true;
      }
    }
    if (changed) {
      this.notifyChange();
    }
  }
}

