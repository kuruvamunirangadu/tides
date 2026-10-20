/**
 * WristbandEventAdapter.ts
 * 
 * TIDES Track B — Wristband Phase 2: Ingestion & Validation Pipeline
 * 
 * Enforces:
 * - Device identity verification against authoritative WristbandRegistry
 * - Event deduplication & idempotency within a rolling time window (15-30s)
 * - Strict timestamp and telemetry validity
 * - ZERO COORDINATE FABRICATION: preserves missing or degraded spatial data without inventing GPS
 */

import { WristbandSOSEvent, WristbandId } from './wristband.types';
import { WristbandRegistry } from './WristbandRegistry';

export interface EventValidationResult {
  isValid: boolean;
  isDuplicate: boolean;
  rejectionReason?: string;
  validatedEvent?: WristbandSOSEvent;
  spatialConfidence: 'HIGH' | 'APPROXIMATE' | 'ZONE_ONLY' | 'UNAVAILABLE';
}

export class WristbandEventAdapter {
  private static instance: WristbandEventAdapter | null = null;
  private deduplicationWindowMs: number = 20000; // 20s deduplication window
  private recentDeduplicationKeys: Map<string, number> = new Map();
  private recentEventIds: Set<string> = new Set();

  private constructor() {}

  public static getInstance(): WristbandEventAdapter {
    if (!WristbandEventAdapter.instance) {
      WristbandEventAdapter.instance = new WristbandEventAdapter();
    }
    return WristbandEventAdapter.instance;
  }

  public setDeduplicationWindowMs(ms: number): void {
    this.deduplicationWindowMs = ms;
  }

  public getDeduplicationWindowMs(): number {
    return this.deduplicationWindowMs;
  }

  /**
   * Ingests and rigorously validates an incoming raw wristband SOS event packet
   */
  public ingestSOSEvent(
    rawEvent: Partial<WristbandSOSEvent>,
    registry: WristbandRegistry = WristbandRegistry.getInstance()
  ): EventValidationResult {
    const now = Date.now();

    // 1. Mandatory Identifier Check
    if (!rawEvent.wristbandId || typeof rawEvent.wristbandId !== 'string') {
      return {
        isValid: false,
        isDuplicate: false,
        rejectionReason: 'MISSING_WRISTBAND_ID',
        spatialConfidence: 'UNAVAILABLE',
      };
    }

    const wristbandId: WristbandId = rawEvent.wristbandId;

    // 2. Device Identity Verification
    const registeredDevice = registry.getWristband(wristbandId);
    if (!registeredDevice) {
      return {
        isValid: false,
        isDuplicate: false,
        rejectionReason: `UNREGISTERED_DEVICE: ${wristbandId} is not in the authorized fleet registry`,
        spatialConfidence: 'UNAVAILABLE',
      };
    }

    // 3. Timestamp Validity Check
    const eventTime = rawEvent.timestampMs ?? now;
    if (isNaN(eventTime) || eventTime > now + 5000) {
      return {
        isValid: false,
        isDuplicate: false,
        rejectionReason: 'INVALID_TIMESTAMP_IN_FUTURE',
        spatialConfidence: 'UNAVAILABLE',
      };
    }
    if (now - eventTime > 300000) {
      // > 5 minutes old
      return {
        isValid: false,
        isDuplicate: false,
        rejectionReason: 'EXPIRED_TELEMETRY_PACKET',
        spatialConfidence: 'UNAVAILABLE',
      };
    }

    // 4. Clean up stale deduplication keys
    this.pruneDeduplicationCache(now);

    // 5. Deduplication & Idempotency Check
    const dedupKey = rawEvent.deduplicationKey || `${wristbandId}-${Math.floor(eventTime / this.deduplicationWindowMs)}`;
    if (rawEvent.eventId && this.recentEventIds.has(rawEvent.eventId)) {
      return {
        isValid: false,
        isDuplicate: true,
        rejectionReason: `DUPLICATE_EVENT_ID: ${rawEvent.eventId} was already ingested`,
        spatialConfidence: 'UNAVAILABLE',
      };
    }

    const lastSeenTime = this.recentDeduplicationKeys.get(dedupKey);
    if (lastSeenTime && now - lastSeenTime < this.deduplicationWindowMs) {
      return {
        isValid: false,
        isDuplicate: true,
        rejectionReason: `DUPLICATE_SUPPRESSED: Retransmission within ${this.deduplicationWindowMs}ms window`,
        spatialConfidence: 'UNAVAILABLE',
      };
    }

    // 6. Zero Coordinate Fabrication Check & Spatial Confidence Evaluation
    let spatialConfidence: 'HIGH' | 'APPROXIMATE' | 'ZONE_ONLY' | 'UNAVAILABLE' = 'UNAVAILABLE';
    let validatedLocation: { x: number; y: number } | undefined = undefined;
    let hasLocation = false;

    if (rawEvent.hasLocation && rawEvent.location) {
      const { x, y } = rawEvent.location;
      if (typeof x === 'number' && typeof y === 'number' && !isNaN(x) && !isNaN(y)) {
        validatedLocation = { x, y };
        hasLocation = true;
        const accuracy = rawEvent.accuracyMeters ?? 10;
        spatialConfidence = accuracy <= 10 ? 'HIGH' : 'APPROXIMATE';
      }
    } else if (rawEvent.zoneId && rawEvent.zoneId.length > 0) {
      // Has zone metadata but no coordinates (e.g. gateway beacon zone only)
      spatialConfidence = 'ZONE_ONLY';
      hasLocation = false;
    } else {
      spatialConfidence = 'UNAVAILABLE';
      hasLocation = false;
    }

    // 7. Battery Range Check
    const battery = rawEvent.batteryPercent ?? registeredDevice.batteryPercent;
    const validatedBattery = Math.max(0, Math.min(100, isNaN(battery) ? 50 : battery));

    // Construct authoritative validated event
    const validatedEvent: WristbandSOSEvent = {
      eventId: rawEvent.eventId || `EVT-SOS-${wristbandId}-${Date.now()}`,
      wristbandId,
      pairedVisitorId: rawEvent.pairedVisitorId || registeredDevice.pairedVisitorId,
      timestampMs: eventTime,
      zoneId: rawEvent.zoneId || registeredDevice.currentZone || 'GENERAL_WATER',
      location: validatedLocation,
      hasLocation,
      accuracyMeters: rawEvent.accuracyMeters,
      batteryPercent: validatedBattery,
      telemetrySequence: rawEvent.telemetrySequence ?? 1,
      deduplicationKey: dedupKey,
      isManualTrigger: rawEvent.isManualTrigger ?? true,
    };

    // Mark as ingested in deduplication tracking
    this.recentDeduplicationKeys.set(dedupKey, now);
    this.recentEventIds.add(validatedEvent.eventId);

    return {
      isValid: true,
      isDuplicate: false,
      validatedEvent,
      spatialConfidence,
    };
  }

  private pruneDeduplicationCache(now: number): void {
    for (const [key, ts] of this.recentDeduplicationKeys.entries()) {
      if (now - ts > this.deduplicationWindowMs * 2) {
        this.recentDeduplicationKeys.delete(key);
      }
    }
    if (this.recentEventIds.size > 1000) {
      this.recentEventIds.clear();
    }
  }

  public clear(): void {
    this.recentDeduplicationKeys.clear();
    this.recentEventIds.clear();
  }
}

