/**
 * DroneObservationAdapter.ts
 * 
 * TIDES Phase 4: Camera & Drone Integration with the Wristband Safety System
 * 
 * Connects authoritative drone telemetry from DroneRegistry with aerial camera sightings:
 * - Telemetry freshness validation (> 5s flagged as STALE, > 20s as EXPIRED)
 * - Strict separation of drone flight altitude/position from ground/water observation location
 * - Preserves existing DroneRegistry and DroneMissionManager as authoritative sources
 * - Emits DroneObservationReceived event contracts and notifies UI listeners
 */

import { DroneRegistry } from '../../drones/foundation/DroneRegistry';
import {
  DroneObservationRecord,
  FreshnessStatus,
  Phase4EventContract,
} from './integration.types';

export interface IngestDroneObservationInput {
  droneId: string;
  currentMissionId?: string;
  estimatedObservationLocation?: { x: number; y: number; z?: number };
  confidenceScore: number;
  trackingId?: string;
  cameraObservationReference?: string;
  notes?: string;
  eventTimestampMs?: number;
}

export class DroneObservationAdapter {
  private static instance: DroneObservationAdapter | null = null;

  private registry: DroneRegistry;
  private observations: Map<string, DroneObservationRecord> = new Map();
  private observationHistory: DroneObservationRecord[] = [];
  private observationCounter: number = 2000;
  private eventListeners: Set<(event: Phase4EventContract) => void> = new Set();
  private changeListeners: Set<() => void> = new Set();

  public readonly FRESH_THRESHOLD_MS = 5000;
  public readonly STALE_THRESHOLD_MS = 20000;

  public static getInstance(registry: DroneRegistry = DroneRegistry.getInstance()): DroneObservationAdapter {
    if (!DroneObservationAdapter.instance) {
      DroneObservationAdapter.instance = new DroneObservationAdapter(registry);
    }
    return DroneObservationAdapter.instance;
  }

  constructor(registry: DroneRegistry = DroneRegistry.getInstance()) {
    this.registry = registry;
  }

  public reset(): void {
    this.observations.clear();
    this.observationHistory = [];
    this.observationCounter = 2000;
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
        console.error('Error in DroneObservationAdapter change listener:', err);
      }
    });
  }

  private emitEvent(event: Phase4EventContract): void {
    this.eventListeners.forEach((l) => {
      try {
        l(event);
      } catch (err) {
        console.error('Error in DroneObservationAdapter event listener:', err);
      }
    });
  }

  /**
   * Evaluates telemetry freshness based on telemetry packet timestamp
   */
  public evaluateTelemetryFreshness(telemetryTimestampMs: number, clockMs: number = Date.now()): FreshnessStatus {
    const ageMs = Math.max(0, clockMs - telemetryTimestampMs);
    if (ageMs < this.FRESH_THRESHOLD_MS) {
      return 'FRESH';
    } else if (ageMs <= this.STALE_THRESHOLD_MS) {
      return 'STALE';
    } else {
      return 'EXPIRED';
    }
  }

  /**
   * Ingests an aerial observation from a patrol or response drone
   */
  public ingestDroneObservation(
    input: IngestDroneObservationInput,
    clockMs: number = Date.now()
  ): { observation?: DroneObservationRecord; accepted: boolean; reason?: string } {
    const drone = this.registry.getDrone(input.droneId);
    if (!drone) {
      return { accepted: false, reason: `Unknown droneId: ${input.droneId}` };
    }

    if (input.confidenceScore < 0.0 || input.confidenceScore > 1.0 || isNaN(input.confidenceScore)) {
      return { accepted: false, reason: 'Invalid confidenceScore: must be between 0.0 and 1.0' };
    }

    const telemetryTimestamp = input.eventTimestampMs ?? drone.lastObservationTimeMs ?? clockMs;
    const telemetryFreshness = this.evaluateTelemetryFreshness(telemetryTimestamp, clockMs);

    // Strictly separate drone 3D flight position from swimmer ground observation location
    const droneFlightPos = {
      x: drone.position3D.x,
      y: drone.position3D.y, // Altitude in air, e.g. 25m
      z: drone.position3D.z,
    };

    let groundObservationLocation = input.estimatedObservationLocation
      ? { ...input.estimatedObservationLocation }
      : undefined;

    // Ground location elevation must be at water/ground plane (near 0), never the drone's altitude
    if (groundObservationLocation && groundObservationLocation.z === undefined) {
      groundObservationLocation.z = 0;
    }

    const linkStatus = drone.connectivity === 'CONNECTED'
      ? (telemetryFreshness === 'FRESH' ? 'CONNECTED' : 'DEGRADED')
      : 'DISCONNECTED';

    this.observationCounter++;
    const observationId = `DRN-OBS-${this.observationCounter}`;

    const observation: DroneObservationRecord = {
      observationId,
      droneId: drone.droneId,
      currentMissionId: input.currentMissionId ?? drone.currentMissionId,
      timestampedDronePosition: droneFlightPos,
      telemetryFreshness,
      telemetryTimestampMs: telemetryTimestamp,
      batteryPercent: drone.battery.percentage,
      operationalStatus: drone.status,
      missionStatus: drone.currentMissionId ? 'ACTIVE_MISSION' : 'IDLE_PATROL',
      cameraObservationReference: input.cameraObservationReference,
      estimatedObservationLocation: groundObservationLocation,
      linkStatus,
      confidenceScore: Math.round(input.confidenceScore * 100) / 100,
      trackingId: input.trackingId,
      notes: input.notes,
    };

    this.observations.set(observationId, observation);
    this.observationHistory.unshift(observation);
    if (this.observationHistory.length > 200) {
      this.observationHistory.pop();
    }

    // Emit event contract
    this.emitEvent({
      eventId: `EVT-DRN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      eventType: 'DroneObservationReceived',
      timestampMs: clockMs,
      sourceId: drone.droneId,
      correlationId: observationId,
      payload: { ...observation },
    });

    this.notifyChange();
    return { accepted: true, observation };
  }

  public getObservation(id: string): DroneObservationRecord | undefined {
    return this.observations.get(id);
  }

  public getAllObservations(): DroneObservationRecord[] {
    return Array.from(this.observations.values());
  }

  public getRecentObservations(limit: number = 50): DroneObservationRecord[] {
    return this.observationHistory.slice(0, limit);
  }
}
