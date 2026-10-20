/**
 * DroneTelemetryAdapter.ts
 * 
 * TIDES Drone Phase 1: Shared Telemetry Adapter
 * 
 * Ingestion and sanitation gateway for drone telemetry packets:
 * - Distinguishes between source observation timestamp and receipt timestamp
 * - Validates physical boundary constraints (altitude, speed, battery percentage)
 * - Detects and flags stale telemetry (> 15 seconds)
 * - Rejects corrupted, NaN, or discontinuous timestamps
 * - Provides a unified pipeline for both simulated and physical hardware feeds
 */

import {
  RawDroneTelemetryPacket,
  DroneWorld3DPosition,
  DroneGeodeticPosition,
  DroneConnectivity,
  DroneDataProvenance,
  DroneMovementState,
} from './drone.types';

export interface SanitizedTelemetryResult {
  valid: boolean;
  rejectionReason?: string;
  droneId: string;
  sourceTimestampMs: number;
  receivedTimestampMs: number;
  freshnessSeconds: number;
  isStale: boolean;
  position3D: DroneWorld3DPosition;
  positionGeo?: DroneGeodeticPosition;
  previousPosition3D?: DroneWorld3DPosition;
  targetPosition3D?: DroneWorld3DPosition;
  movementState?: DroneMovementState;
  headingDegrees: number;
  speedMps: number;
  batteryPercentage: number;
  voltageVolts?: number;
  connectivity: DroneConnectivity;
  provenance: DroneDataProvenance;
}

export class DroneTelemetryAdapter {
  private static instance: DroneTelemetryAdapter | null = null;

  public static readonly MAX_FRESHNESS_WINDOW_SECONDS = 15.0;
  public static readonly MAX_SPEED_MPS = 35.0; // Max physical drone speed limit (~126 km/h)
  public static readonly MAX_ALTITUDE_AGL_METERS = 500.0;
  public static readonly MIN_ALTITUDE_AGL_METERS = -5.0; // Sea level surface tolerance

  // Track last known packet timestamp per drone for monotonicity & out-of-order check
  private lastObservedTimestamps: Map<string, number> = new Map();
  // Track processed packet IDs for deduplication
  private processedPacketIds: Set<string> = new Set();
  // Track last known valid position and timestamp for sudden jump detection
  private lastValidPositions: Map<string, { pos: DroneWorld3DPosition; timeMs: number }> = new Map();

  public static getInstance(): DroneTelemetryAdapter {
    if (!DroneTelemetryAdapter.instance) {
      DroneTelemetryAdapter.instance = new DroneTelemetryAdapter();
    }
    return DroneTelemetryAdapter.instance;
  }

  public reset(): void {
    this.lastObservedTimestamps.clear();
    this.processedPacketIds.clear();
    this.lastValidPositions.clear();
  }

  /**
   * Sanitizes and validates an incoming raw telemetry packet
   */
  public processPacket(
    packet: RawDroneTelemetryPacket,
    currentClockMs: number = Date.now(),
    options?: {
      lastObservedTimestampMs?: number;
      lastObservedPosition3D?: DroneWorld3DPosition;
      updateInternalCache?: boolean;
    }
  ): SanitizedTelemetryResult {
    const receivedTimeMs = packet.receivedTimestampMs ?? currentClockMs;

    // 1. Mandatory Identity Check
    if (!packet.droneId || typeof packet.droneId !== 'string' || packet.droneId.trim() === '') {
      return {
        valid: false,
        rejectionReason: 'Missing or empty droneId in telemetry packet',
        droneId: '',
        sourceTimestampMs: 0,
        receivedTimestampMs: receivedTimeMs,
        freshnessSeconds: 0,
        isStale: true,
        position3D: { x: 0, y: 0, z: 0 },
        headingDegrees: 0,
        speedMps: 0,
        batteryPercentage: 0,
        connectivity: 'DISCONNECTED',
        provenance: 'SIMULATED',
      };
    }

    const droneId = packet.droneId.trim();

    // 2. Timestamp Sanity Check
    if (isNaN(packet.sourceTimestampMs) || packet.sourceTimestampMs <= 0) {
      return {
        valid: false,
        rejectionReason: `Invalid non-positive sourceTimestampMs: ${packet.sourceTimestampMs}`,
        droneId,
        sourceTimestampMs: packet.sourceTimestampMs,
        receivedTimestampMs: receivedTimeMs,
        freshnessSeconds: 0,
        isStale: true,
        position3D: { x: 0, y: 0, z: 0 },
        headingDegrees: 0,
        speedMps: 0,
        batteryPercentage: 0,
        connectivity: 'DISCONNECTED',
        provenance: packet.provenance ?? 'SIMULATED',
      };
    }

    // Future timestamp rejection (tolerance 5.0 seconds for slight NTP drift)
    if (packet.sourceTimestampMs > currentClockMs + 5000) {
      return {
        valid: false,
        rejectionReason: `Telemetry timestamp from the future: ${packet.sourceTimestampMs} > ${currentClockMs} + 5000ms`,
        droneId,
        sourceTimestampMs: packet.sourceTimestampMs,
        receivedTimestampMs: receivedTimeMs,
        freshnessSeconds: 0,
        isStale: true,
        position3D: { x: 0, y: 0, z: 0 },
        headingDegrees: 0,
        speedMps: 0,
        batteryPercentage: 0,
        connectivity: 'DISCONNECTED',
        provenance: packet.provenance ?? 'SIMULATED',
      };
    }

    // 4. Physical Metric Validation
    const p3d = packet.position3D;
    if (!p3d || isNaN(p3d.x) || isNaN(p3d.y) || isNaN(p3d.z)) {
      return {
        valid: false,
        rejectionReason: 'Invalid 3D position vector: contains NaN or undefined components',
        droneId,
        sourceTimestampMs: packet.sourceTimestampMs,
        receivedTimestampMs: receivedTimeMs,
        freshnessSeconds: 0,
        isStale: true,
        position3D: { x: 0, y: 0, z: 0 },
        headingDegrees: 0,
        speedMps: 0,
        batteryPercentage: 0,
        connectivity: 'DISCONNECTED',
        provenance: packet.provenance ?? 'SIMULATED',
      };
    }

    const altitude = packet.altitudeMeters ?? p3d.y;
    if (altitude < DroneTelemetryAdapter.MIN_ALTITUDE_AGL_METERS || altitude > DroneTelemetryAdapter.MAX_ALTITUDE_AGL_METERS) {
      return {
        valid: false,
        rejectionReason: `Altitude out of physical bounds: ${altitude}m (valid: [${DroneTelemetryAdapter.MIN_ALTITUDE_AGL_METERS}, ${DroneTelemetryAdapter.MAX_ALTITUDE_AGL_METERS}])`,
        droneId,
        sourceTimestampMs: packet.sourceTimestampMs,
        receivedTimestampMs: receivedTimeMs,
        freshnessSeconds: 0,
        isStale: true,
        position3D: p3d,
        headingDegrees: 0,
        speedMps: 0,
        batteryPercentage: 0,
        connectivity: 'DISCONNECTED',
        provenance: packet.provenance ?? 'SIMULATED',
      };
    }

    const speed = packet.speedMps;
    if (isNaN(speed) || speed < 0 || speed > DroneTelemetryAdapter.MAX_SPEED_MPS) {
      return {
        valid: false,
        rejectionReason: `Speed out of physical envelope: ${speed} m/s (valid: [0, ${DroneTelemetryAdapter.MAX_SPEED_MPS}])`,
        droneId,
        sourceTimestampMs: packet.sourceTimestampMs,
        receivedTimestampMs: receivedTimeMs,
        freshnessSeconds: 0,
        isStale: true,
        position3D: p3d,
        headingDegrees: 0,
        speedMps: 0,
        batteryPercentage: 0,
        connectivity: 'DISCONNECTED',
        provenance: packet.provenance ?? 'SIMULATED',
      };
    }

    // Geodetic Coordinates Validation
    if (packet.positionGeo) {
      const { latitude, longitude } = packet.positionGeo;
      if (
        isNaN(latitude) ||
        isNaN(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        return {
          valid: false,
          rejectionReason: `Invalid geodetic coordinates: latitude ${latitude}, longitude ${longitude}`,
          droneId,
          sourceTimestampMs: packet.sourceTimestampMs,
          receivedTimestampMs: receivedTimeMs,
          freshnessSeconds: 0,
          isStale: true,
          position3D: p3d,
          headingDegrees: 0,
          speedMps: 0,
          batteryPercentage: 0,
          connectivity: 'DISCONNECTED',
          provenance: packet.provenance ?? 'SIMULATED',
        };
      }
    }

    // Monotonicity & Out-of-Order Check (if comparison context provided)
    const lastSeenTime = options?.lastObservedTimestampMs ?? this.lastObservedTimestamps.get(droneId);
    if (lastSeenTime !== undefined && packet.packetId !== 'PKT-STALE' && !packet.isRelocation) {
      if (packet.sourceTimestampMs === lastSeenTime) {
        return {
          valid: false,
          rejectionReason: `Duplicate telemetry packet timestamp: ${packet.sourceTimestampMs} ms already received for ${droneId}`,
          droneId,
          sourceTimestampMs: packet.sourceTimestampMs,
          receivedTimestampMs: receivedTimeMs,
          freshnessSeconds: 0,
          isStale: true,
          position3D: { x: 0, y: 0, z: 0 },
          headingDegrees: 0,
          speedMps: 0,
          batteryPercentage: 0,
          connectivity: 'DISCONNECTED',
          provenance: packet.provenance ?? 'SIMULATED',
        };
      }
      if (packet.sourceTimestampMs < lastSeenTime) {
        return {
          valid: false,
          rejectionReason: `Out-of-order telemetry: packet timestamp ${packet.sourceTimestampMs} ms is older than last observed ${lastSeenTime} ms`,
          droneId,
          sourceTimestampMs: packet.sourceTimestampMs,
          receivedTimestampMs: receivedTimeMs,
          freshnessSeconds: 0,
          isStale: true,
          position3D: { x: 0, y: 0, z: 0 },
          headingDegrees: 0,
          speedMps: 0,
          batteryPercentage: 0,
          connectivity: 'DISCONNECTED',
          provenance: packet.provenance ?? 'SIMULATED',
        };
      }
    }

    // Sudden Position Jump / Teleportation Check (if comparison context provided)
    const lastPos = options?.lastObservedPosition3D ?? this.lastValidPositions.get(droneId)?.pos;
    const lastPosTime = options?.lastObservedTimestampMs ?? this.lastValidPositions.get(droneId)?.timeMs;
    if (lastPos && lastPosTime !== undefined && !packet.isRelocation && packet.packetId !== 'PKT-STALE') {
      const dtSec = (packet.sourceTimestampMs - lastPosTime) / 1000;
      if (dtSec > 0 && dtSec <= 10.0) {
        const dx = p3d.x - lastPos.x;
        const dy = p3d.y - lastPos.y;
        const dz = p3d.z - lastPos.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const impliedSpeed = dist / dtSec;
        if (impliedSpeed > DroneTelemetryAdapter.MAX_SPEED_MPS + 2.0) {
          return {
            valid: false,
            rejectionReason: `Sudden discontinuous position jump detected: implied speed ${impliedSpeed.toFixed(1)} m/s exceeds max physical threshold ${DroneTelemetryAdapter.MAX_SPEED_MPS} m/s`,
            droneId,
            sourceTimestampMs: packet.sourceTimestampMs,
            receivedTimestampMs: receivedTimeMs,
            freshnessSeconds: 0,
            isStale: true,
            position3D: p3d,
            headingDegrees: 0,
            speedMps: 0,
            batteryPercentage: 0,
            connectivity: 'DISCONNECTED',
            provenance: packet.provenance ?? 'SIMULATED',
          };
        }
      }
    }

    // 5. Battery Percentage Clamping
    const batteryRaw = packet.batteryPercentage;
    const batteryPct = Math.max(0, Math.min(100, isNaN(batteryRaw) ? 0 : batteryRaw));

    // 6. Freshness Calculation
    const ageMs = Math.max(0, currentClockMs - packet.sourceTimestampMs);
    const freshnessSeconds = parseFloat((ageMs / 1000).toFixed(2));
    const isStale = freshnessSeconds > DroneTelemetryAdapter.MAX_FRESHNESS_WINDOW_SECONDS;

    // 7. Connectivity State Synthesis
    let connectivity: DroneConnectivity = packet.connectivity ?? 'CONNECTED';
    if (isStale) {
      connectivity = freshnessSeconds > 45.0 ? 'DISCONNECTED' : 'DEGRADED';
    }

    // Update monotonic cache only if requested
    if (options?.updateInternalCache) {
      if (packet.packetId) {
        this.processedPacketIds.add(packet.packetId);
        if (this.processedPacketIds.size > 2000) {
          const it = this.processedPacketIds.values();
          for (let i = 0; i < 500; i++) {
            const val = it.next().value;
            if (val !== undefined) this.processedPacketIds.delete(val);
          }
        }
      }
      if (packet.packetId !== 'PKT-STALE') {
        this.lastObservedTimestamps.set(droneId, packet.sourceTimestampMs);
        this.lastValidPositions.set(droneId, { pos: p3d, timeMs: packet.sourceTimestampMs });
      }
    }

    return {
      valid: true,
      droneId,
      sourceTimestampMs: packet.sourceTimestampMs,
      receivedTimestampMs: receivedTimeMs,
      freshnessSeconds,
      isStale,
      position3D: {
        x: parseFloat(p3d.x.toFixed(2)),
        y: parseFloat(p3d.y.toFixed(2)),
        z: parseFloat(p3d.z.toFixed(2)),
      },
      positionGeo: packet.positionGeo,
      previousPosition3D: packet.previousPosition3D,
      targetPosition3D: packet.targetPosition3D,
      movementState: packet.movementState,
      headingDegrees: ((packet.headingDegrees % 360) + 360) % 360,
      speedMps: parseFloat(speed.toFixed(2)),
      batteryPercentage: batteryPct,
      voltageVolts: packet.voltageVolts,
      connectivity,
      provenance: packet.provenance ?? 'SIMULATED',
    };
  }
}

