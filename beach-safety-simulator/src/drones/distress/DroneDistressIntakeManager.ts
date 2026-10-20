/**
 * DroneDistressIntakeManager.ts
 * 
 * TIDES Drone Phase 7: Candidate Observation Intake & Validation Engine
 * 
 * Responsibilities:
 * 1. Validate schema, timestamps, coordinates, and confidence bounds.
 * 2. Distinguish observation timestamp from ingestion receipt timestamp.
 * 3. Reject malformed and corrupted payloads safely without throwing unhandled exceptions.
 * 4. Deduplicate identical observation deliveries using a temporal cache.
 * 5. Safely handle delayed and out-of-order observations.
 * 6. Guarantee non-interference: Operates strictly in-memory without blocking Three.js rendering or drone flight.
 * 7. Prevent untrusted event payloads from directly modifying authoritative incident state.
 */

import {
  ValidatedCandidateObservation,
  ObservationValidationResult,
  DroneVerificationStatus,
  DroneLocationSource,
} from './droneDistress.types';
import { DroneCandidateObservation } from '../vision/droneDetection.types';
import { DroneDistressAuditLogger } from './DroneDistressAuditLogger';

export class DroneDistressIntakeManager {
  private static instance: DroneDistressIntakeManager | null = null;
  private readonly auditLogger: DroneDistressAuditLogger;

  // Deduplication cache: observationId -> receivedTimestampMs
  private receivedEventIds: Map<string, number> = new Map();
  private readonly DEDUP_CACHE_TTL_MS: number = 30000; // 30s TTL

  // Latest observation timestamp per trackId to detect out-of-order events
  private latestTimestampByTrack: Map<string, number> = new Map();

  // Validated queue awaiting correlation
  private validatedQueue: ValidatedCandidateObservation[] = [];
  private readonly MAX_QUEUE_SIZE: number = 100;

  // Counters for telemetry & metrics
  private totalIngested: number = 0;
  private totalValid: number = 0;
  private totalRejected: number = 0;
  private totalDuplicates: number = 0;
  private totalDelayed: number = 0;

  public static getInstance(): DroneDistressIntakeManager {
    if (!DroneDistressIntakeManager.instance) {
      DroneDistressIntakeManager.instance = new DroneDistressIntakeManager();
    }
    return DroneDistressIntakeManager.instance;
  }

  constructor() {
    this.auditLogger = DroneDistressAuditLogger.getInstance();
    this.reset();
  }

  public reset(): void {
    this.receivedEventIds.clear();
    this.latestTimestampByTrack.clear();
    this.validatedQueue = [];
    this.totalIngested = 0;
    this.totalValid = 0;
    this.totalRejected = 0;
    this.totalDuplicates = 0;
    this.totalDelayed = 0;
  }

  /**
   * Pure validation function for candidate observation payloads
   */
  public validatePayload(raw: any, receiptTimeMs: number = Date.now()): ObservationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!raw || typeof raw !== 'object') {
      return { valid: false, errors: ['Payload is null, undefined, or not an object.'], warnings: [] };
    }

    // Required String Identifiers
    if (!raw.observationId || typeof raw.observationId !== 'string' || raw.observationId.trim() === '') {
      errors.push('Missing or invalid observationId.');
    }
    if (!raw.cameraId || typeof raw.cameraId !== 'string' || raw.cameraId.trim() === '') {
      errors.push('Missing or invalid cameraId.');
    }
    if (!raw.droneId || typeof raw.droneId !== 'string' || raw.droneId.trim() === '') {
      errors.push('Missing or invalid droneId.');
    }

    // Target Class Validation (Phase 6/7 strictly 'PERSON')
    if (raw.className !== 'PERSON') {
      errors.push(`Invalid className '${raw.className}'. Phase 7 strictly processes 'PERSON' detections.`);
    }

    // Confidence Score Bounds [0.0, 1.0]
    if (typeof raw.confidence !== 'number' || isNaN(raw.confidence) || raw.confidence < 0.0 || raw.confidence > 1.0) {
      errors.push(`Confidence '${raw.confidence}' out of physical envelope [0.0, 1.0].`);
    }

    // Timestamp Sanity
    const obsTime = raw.timestampMs ?? raw.observationTimestampMs;
    if (typeof obsTime !== 'number' || isNaN(obsTime) || obsTime <= 0) {
      errors.push('Invalid observation timestamp: must be positive numeric epoch milliseconds.');
    } else {
      if (obsTime > receiptTimeMs + 5000) {
        errors.push(`Future observation timestamp rejected: ${obsTime} exceeds receipt time ${receiptTimeMs} + 5000ms.`);
      }
      if (receiptTimeMs - obsTime > 10000) {
        warnings.push(`Delayed observation: age ${receiptTimeMs - obsTime}ms exceeds 10000ms threshold.`);
      }
    }

    // Normalized Bounding Box Bounds [0.0, 1.0]
    if (!raw.bbox || typeof raw.bbox !== 'object') {
      errors.push('Missing bounding box (bbox) object.');
    } else {
      const { xMin, yMin, xMax, yMax } = raw.bbox;
      if (
        typeof xMin !== 'number' || typeof yMin !== 'number' ||
        typeof xMax !== 'number' || typeof yMax !== 'number' ||
        isNaN(xMin) || isNaN(yMin) || isNaN(xMax) || isNaN(yMax)
      ) {
        errors.push('Bounding box coordinates must be non-NaN numbers.');
      } else {
        if (xMin < 0.0 || yMin < 0.0 || xMax > 1.0 || yMax > 1.0 || xMin >= xMax || yMin >= yMax) {
          errors.push(`Bounding box bounds invalid: [${xMin}, ${yMin}, ${xMax}, ${yMax}] outside [0, 1] frame space.`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Ingests, validates, deduplicates, and stages a candidate observation
   */
  public ingestObservation(
    raw: any,
    receiptTimeMs: number = Date.now()
  ): { status: 'ACCEPTED' | 'REJECTED' | 'DUPLICATE' | 'DELAYED'; record?: ValidatedCandidateObservation; message: string } {
    this.totalIngested++;

    // 1. Structural and Type Validation
    const validation = this.validatePayload(raw, receiptTimeMs);
    if (!validation.valid) {
      this.totalRejected++;
      const reason = validation.errors.join('; ');
      this.auditLogger.log(
        'OBSERVATION_REJECTED',
        'DroneDistressIntakeManager',
        raw?.observationId || 'UNKNOWN_ID',
        `Payload validation rejected: ${reason}`,
        { errors: validation.errors }
      );
      return { status: 'REJECTED', message: reason };
    }

    const obsId: string = raw.observationId;
    const obsTimestamp: number = raw.timestampMs ?? raw.observationTimestampMs;

    // 2. Duplicate Delivery Rejection
    const lastSeen = this.receivedEventIds.get(obsId);
    if (lastSeen !== undefined && (receiptTimeMs - lastSeen) < this.DEDUP_CACHE_TTL_MS) {
      this.totalDuplicates++;
      this.auditLogger.log(
        'DUPLICATE_DROPPED',
        'DroneDistressIntakeManager',
        obsId,
        `Duplicate delivery of observation ${obsId} suppressed.`,
        { obsId, lastSeen, receiptTimeMs }
      );
      return { status: 'DUPLICATE', message: `Duplicate observation ${obsId} already ingested.` };
    }

    // 3. Delayed and Out-of-Order Handling
    let isDelayed = false;
    if (validation.warnings.some((w) => w.includes('Delayed observation'))) {
      this.totalDelayed++;
      isDelayed = true;
    }

    if (raw.trackId) {
      const prevTrackTime = this.latestTimestampByTrack.get(raw.trackId);
      if (prevTrackTime !== undefined && obsTimestamp < prevTrackTime) {
        // Out of order: older packet arrived after newer one
        this.auditLogger.log(
          'OBSERVATION_REJECTED',
          'DroneDistressIntakeManager',
          obsId,
          `Out-of-order observation for track ${raw.trackId} rejected (packet time ${obsTimestamp} < latest ${prevTrackTime}).`,
          { trackId: raw.trackId, obsTimestamp, prevTrackTime }
        );
        this.totalRejected++;
        return { status: 'REJECTED', message: `Out-of-order packet for track ${raw.trackId}.` };
      }
      this.latestTimestampByTrack.set(raw.trackId, obsTimestamp);
    }

    // Clean old deduplication entries
    this.pruneDedupCache(receiptTimeMs);
    this.receivedEventIds.set(obsId, receiptTimeMs);

    // 4. Construct Validated Candidate Observation Record
    const locationSource: DroneLocationSource = raw.locationSource || (raw.scenePosition ? 'CAMERA_GROUND_INTERSECTION' : 'UNESTIMATED');
    const locationAge = raw.locationFreshnessMs ?? (receiptTimeMs - obsTimestamp);

    const validatedRecord: ValidatedCandidateObservation = {
      observationId: obsId,
      cameraId: raw.cameraId,
      droneId: raw.droneId,
      missionId: raw.missionId,
      trackingId: raw.trackId ?? raw.trackingId,
      observationTimestampMs: obsTimestamp,
      receiptTimestampMs: receiptTimeMs,
      bbox: { ...raw.bbox },
      frameId: raw.frameId,
      className: 'PERSON',
      confidence: raw.confidence,
      scenePosition: raw.scenePosition ? { ...raw.scenePosition } : undefined,
      geoCoordinates: raw.geoCoordinates ? { ...raw.geoCoordinates } : undefined,
      locationSource,
      locationFreshnessMs: locationAge,
      associatedEvidence: Array.isArray(raw.associatedEvidence) ? [...raw.associatedEvidence] : [],
      provenance: raw.provenance || 'SIMULATED',
      verificationStatus: 'CANDIDATE_RECEIVED',
      processingErrors: validation.warnings,
    };

    this.validatedQueue.unshift(validatedRecord);
    if (this.validatedQueue.length > this.MAX_QUEUE_SIZE) {
      this.validatedQueue.pop();
    }

    this.totalValid++;
    this.auditLogger.log(
      'OBSERVATION_INGESTED',
      'DroneDistressIntakeManager',
      obsId,
      `Candidate observation accepted from camera ${validatedRecord.cameraId} (confidence: ${(validatedRecord.confidence * 100).toFixed(0)}%).`,
      { droneId: validatedRecord.droneId, trackId: validatedRecord.trackingId, isDelayed }
    );

    return {
      status: isDelayed ? 'DELAYED' : 'ACCEPTED',
      record: validatedRecord,
      message: `Observation ${obsId} successfully validated.`,
    };
  }

  /**
   * Helper to convert Phase 6 DroneCandidateObservation to intake payload
   */
  public ingestFromPhase6Publisher(
    obs: DroneCandidateObservation,
    receiptTimeMs: number = Date.now(),
    scenePos?: { x: number; y: number; z: number }
  ) {
    return this.ingestObservation(
      {
        observationId: obs.observationId,
        cameraId: obs.cameraId,
        droneId: obs.droneId,
        trackId: obs.trackId,
        timestampMs: obs.timestampMs,
        bbox: obs.bbox,
        className: 'PERSON',
        confidence: obs.confidence,
        scenePosition: scenePos,
        provenance: obs.provenance,
        associatedEvidence: [`Phase 6 publisher category: ${obs.category}`],
      },
      receiptTimeMs
    );
  }

  public getValidatedQueue(): ValidatedCandidateObservation[] {
    return [...this.validatedQueue];
  }

  public getMetrics() {
    return {
      totalIngested: this.totalIngested,
      totalValid: this.totalValid,
      totalRejected: this.totalRejected,
      totalDuplicates: this.totalDuplicates,
      totalDelayed: this.totalDelayed,
      queueSize: this.validatedQueue.length,
    };
  }

  private pruneDedupCache(now: number): void {
    if (this.receivedEventIds.size > 200) {
      for (const [id, time] of this.receivedEventIds.entries()) {
        if (now - time > this.DEDUP_CACHE_TTL_MS) {
          this.receivedEventIds.delete(id);
        }
      }
    }
  }
}

