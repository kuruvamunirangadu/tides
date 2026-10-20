/**
 * DroneRegistry.ts
 * 
 * TIDES Drone Phase 1: Authoritative Drone Fleet Registry
 * 
 * Single source of truth for all coastal drones (Surveillance, Rescue Assistance, Multi-Role):
 * - Role-based capability registration
 * - Telemetry synchronization via DroneTelemetryAdapter
 * - Exclusive mission assignment lock (prevents double-booking)
 * - Capability requirement validation (verifies flotation payload or optical zoom)
 * - Battery depletion safeguards (< 20% lockout)
 * - Observational non-interference with existing simulation loops
 */

import {
  DroneRecord,
  DroneRole,
  DroneOperationalStatus,
  DroneConnectivity,
  DronePayloadCapabilities,
  RawDroneTelemetryPacket,
  MissionAssignmentRequest,
  MissionAssignmentResult,
} from './drone.types';
import { DroneTelemetryAdapter } from './DroneTelemetryAdapter';

export class DroneRegistry {
  private static instance: DroneRegistry | null = null;

  private drones: Map<string, DroneRecord> = new Map();
  private telemetryAdapter: DroneTelemetryAdapter;

  public static getInstance(): DroneRegistry {
    if (!DroneRegistry.instance) {
      DroneRegistry.instance = new DroneRegistry();
    }
    return DroneRegistry.instance;
  }

  constructor() {
    this.telemetryAdapter = DroneTelemetryAdapter.getInstance();
    this.initializeDefaultFleet();
  }

  public reset(): void {
    this.initializeDefaultFleet();
  }

  /**
   * Initializes the standard coastal safety drone fleet for Rushikonda Beach
   */
  public initializeDefaultFleet(): void {
    this.drones.clear();

    const now = Date.now();

    // 1. DRONE-01: Surveillance Specialist
    this.registerDrone({
      droneId: 'DRONE-01',
      callsign: 'Falcon-Surveillance-01',
      modelName: 'AeroScout Pro-4 (Coastal Spec)',
      role: 'SURVEILLANCE',
      status: 'PATROLLING',
      connectivity: 'CONNECTED',
      provenance: 'SIMULATED',
      capabilities: {
        hasThermalCamera: true,
        hasOpticalZoom: true,
        hasMegaphoneSiren: false,
        hasFlotationPayload: false,
        maxWindResistanceMps: 14.0,
        maxFlightRangeMeters: 4500,
      },
      battery: {
        percentage: 88,
        voltageVolts: 22.8,
        reserveThresholdPercent: 20,
        isLowBattery: false,
        isCriticalBattery: false,
      },
      position3D: { x: -25.0, y: 18.0, z: -45.0 }, // Patrolling over crescent surf zone
      positionGeo: {
        latitude: 17.7820,
        longitude: 83.3850,
        altitudeAglMeters: 18.0,
        gpsAccuracyCepMeters: 0.8,
      },
      headingDegrees: 45,
      speedMps: 4.5,
      lastObservationTimeMs: now,
      lastReceivedTimeMs: now,
      telemetryFreshnessSeconds: 0.0,
      isStale: false,
      homeBaseId: 'STATION-SOUTH-TOWER',
      homePosition3D: { x: -59.6, y: 5.0, z: -5.3 }, // CP-02 South Tower pad
    });

    // 2. DRONE-02: Search & Rescue Flotation Delivery UAV
    this.registerDrone({
      droneId: 'DRONE-02',
      callsign: 'AquaLifter-Rescue-01',
      modelName: 'SeaRescue Heavy-Hex MkII',
      role: 'RESCUE_ASSISTANCE',
      status: 'IDLE',
      connectivity: 'CONNECTED',
      provenance: 'SIMULATED',
      capabilities: {
        hasThermalCamera: false,
        hasOpticalZoom: false,
        hasMegaphoneSiren: true,
        hasFlotationPayload: true,
        flotationPayloadCapacityKg: 3.5, // Holds 2 auto-inflating Restube marine collars
        maxWindResistanceMps: 18.0,
        maxFlightRangeMeters: 3800,
      },
      battery: {
        percentage: 95,
        voltageVolts: 24.2,
        reserveThresholdPercent: 25,
        isLowBattery: false,
        isCriticalBattery: false,
      },
      position3D: { x: 0.0, y: 4.5, z: 5.0 }, // Staged at Central Promenade Base CP-04
      positionGeo: {
        latitude: 17.7830,
        longitude: 83.3855,
        altitudeAglMeters: 4.5,
        gpsAccuracyCepMeters: 0.5,
      },
      headingDegrees: 90,
      speedMps: 0.0,
      lastObservationTimeMs: now,
      lastReceivedTimeMs: now,
      telemetryFreshnessSeconds: 0.0,
      isStale: false,
      homeBaseId: 'STATION-PROMENADE-HQ',
      homePosition3D: { x: 0.0, y: 4.5, z: 5.0 },
    });

    // 3. DRONE-03: Multi-Role Rapid Interceptor
    this.registerDrone({
      droneId: 'DRONE-03',
      callsign: 'Sentinel-MultiRole-01',
      modelName: 'Interceptor Dual-Payload Quad',
      role: 'MULTI_ROLE',
      status: 'IDLE',
      connectivity: 'CONNECTED',
      provenance: 'SIMULATED',
      capabilities: {
        hasThermalCamera: true,
        hasOpticalZoom: true,
        hasMegaphoneSiren: true,
        hasFlotationPayload: true,
        flotationPayloadCapacityKg: 1.8, // 1 compact lifebuoy
        maxWindResistanceMps: 15.0,
        maxFlightRangeMeters: 3500,
      },
      battery: {
        percentage: 82,
        voltageVolts: 22.4,
        reserveThresholdPercent: 20,
        isLowBattery: false,
        isCriticalBattery: false,
      },
      position3D: { x: 87.1, y: 4.2, z: -11.1 }, // Staged at North Lifeguard Station CP-07
      positionGeo: {
        latitude: 17.7862,
        longitude: 83.3879,
        altitudeAglMeters: 4.2,
        gpsAccuracyCepMeters: 0.7,
      },
      headingDegrees: 180,
      speedMps: 0.0,
      lastObservationTimeMs: now,
      lastReceivedTimeMs: now,
      telemetryFreshnessSeconds: 0.0,
      isStale: false,
      homeBaseId: 'STATION-NORTH-PAD',
      homePosition3D: { x: 87.1, y: 4.2, z: -11.1 },
    });

    // 4. DRONE-04: Standby Reserve Unit
    this.registerDrone({
      droneId: 'DRONE-04',
      callsign: 'Standby-Quad-01',
      modelName: 'AeroScout Lite',
      role: 'SURVEILLANCE',
      status: 'CHARGING',
      connectivity: 'CONNECTED',
      provenance: 'SIMULATED',
      capabilities: {
        hasThermalCamera: false,
        hasOpticalZoom: true,
        hasMegaphoneSiren: false,
        hasFlotationPayload: false,
        maxWindResistanceMps: 10.0,
        maxFlightRangeMeters: 2500,
      },
      battery: {
        percentage: 42,
        voltageVolts: 21.0,
        reserveThresholdPercent: 20,
        isLowBattery: false,
        isCriticalBattery: false,
      },
      position3D: { x: -62.0, y: 4.0, z: -4.0 }, // Pad charge dock
      positionGeo: {
        latitude: 17.7804,
        longitude: 83.3843,
        altitudeAglMeters: 4.0,
      },
      headingDegrees: 0,
      speedMps: 0.0,
      lastObservationTimeMs: now,
      lastReceivedTimeMs: now,
      telemetryFreshnessSeconds: 0.0,
      isStale: false,
      homeBaseId: 'STATION-SOUTH-TOWER',
      homePosition3D: { x: -62.0, y: 4.0, z: -4.0 },
    });
  }

  /**
   * Registers a new drone or updates an existing drone descriptor
   */
  public registerDrone(drone: DroneRecord): boolean {
    if (!drone.droneId || drone.droneId.trim() === '') {
      return false;
    }
    this.drones.set(drone.droneId, { ...drone });
    return true;
  }

  /**
   * Unregisters a drone by ID
   */
  public unregisterDrone(droneId: string): boolean {
    return this.drones.delete(droneId);
  }

  /**
   * Retrieves a single drone by ID
   */
  public getDrone(droneId: string): DroneRecord | undefined {
    return this.drones.get(droneId);
  }

  /**
   * Returns all currently registered drones
   */
  public getAllDrones(): DroneRecord[] {
    return Array.from(this.drones.values());
  }

  /**
   * Filters drones by role
   */
  public getDronesByRole(role: DroneRole): DroneRecord[] {
    return this.getAllDrones().filter((d) => d.role === role || d.role === 'MULTI_ROLE');
  }

  /**
   * Returns operational drones available for dispatch (not busy, offline, or low battery)
   */
  public getAvailableDrones(requiredRole?: DroneRole): DroneRecord[] {
    return this.getAllDrones().filter((d) => {
      // Must be in an assignable state
      const isAssignable = d.status === 'IDLE' || d.status === 'PATROLLING';
      if (!isAssignable) return false;

      // Must have healthy connectivity
      if (d.connectivity === 'DISCONNECTED') return false;

      // Must have sufficient battery reserve (> reserve threshold)
      if (d.battery.percentage <= d.battery.reserveThresholdPercent) return false;

      // Match role requirement if specified
      if (requiredRole && requiredRole !== d.role && d.role !== 'MULTI_ROLE') {
        return false;
      }

      return true;
    });
  }

  /**
   * Ingests and sanitizes a raw telemetry packet, updating authoritative state
   */
  public ingestTelemetry(packet: RawDroneTelemetryPacket, clockMs: number = Date.now()): boolean {
    const sanitized = this.telemetryAdapter.processPacket(packet, clockMs);
    if (!sanitized.valid) {
      return false;
    }

    const existing = this.drones.get(sanitized.droneId);
    if (!existing) {
      return false; // Unknown drone must be formally registered first
    }

    // Update battery state
    const isLow = sanitized.batteryPercentage <= existing.battery.reserveThresholdPercent;
    const isCritical = sanitized.batteryPercentage <= 10;

    existing.previousPosition3D = sanitized.previousPosition3D ?? existing.position3D;
    existing.position3D = sanitized.position3D;
    if (sanitized.positionGeo) {
      existing.positionGeo = sanitized.positionGeo;
    }
    if (sanitized.targetPosition3D) {
      existing.targetPosition3D = sanitized.targetPosition3D;
    }
    if (sanitized.movementState) {
      existing.movementState = sanitized.movementState;
    }
    existing.headingDegrees = sanitized.headingDegrees;
    existing.speedMps = sanitized.speedMps;
    existing.battery.percentage = sanitized.batteryPercentage;
    existing.battery.voltageVolts = sanitized.voltageVolts ?? existing.battery.voltageVolts;
    existing.battery.isLowBattery = isLow;
    existing.battery.isCriticalBattery = isCritical;
    existing.connectivity = sanitized.connectivity;
    existing.provenance = sanitized.provenance;
    existing.lastObservationTimeMs = sanitized.sourceTimestampMs;
    existing.lastReceivedTimeMs = sanitized.receivedTimestampMs;
    existing.telemetryFreshnessSeconds = sanitized.freshnessSeconds;
    existing.isStale = sanitized.isStale;

    return true;
  }

  /**
   * Attempts an exclusive mission assignment with capability validation
   */
  public assignMission(request: MissionAssignmentRequest): MissionAssignmentResult {
    const drone = this.drones.get(request.droneId);
    if (!drone) {
      return {
        success: false,
        droneId: request.droneId,
        missionId: request.missionId,
        rejectionReason: `Drone ${request.droneId} not found in authoritative registry`,
      };
    }

    // 1. Conflict Prevention: Check if already booked
    if (drone.currentMissionId && drone.currentMissionId !== request.missionId) {
      return {
        success: false,
        droneId: request.droneId,
        missionId: request.missionId,
        rejectionReason: `Conflict: Drone ${drone.droneId} is already assigned to active mission ${drone.currentMissionId}`,
      };
    }

    // 2. Operational Status Check
    if (drone.status === 'OFFLINE' || drone.status === 'MAINTENANCE' || drone.status === 'CHARGING') {
      return {
        success: false,
        droneId: request.droneId,
        missionId: request.missionId,
        rejectionReason: `Drone ${drone.droneId} is unavailable (Status: ${drone.status})`,
      };
    }

    // 3. Connectivity Gate
    if (drone.connectivity === 'DISCONNECTED') {
      return {
        success: false,
        droneId: request.droneId,
        missionId: request.missionId,
        rejectionReason: `Drone ${drone.droneId} is disconnected from gateway`,
      };
    }

    // 4. Battery Reserve Gate
    if (drone.battery.percentage <= drone.battery.reserveThresholdPercent) {
      return {
        success: false,
        droneId: request.droneId,
        missionId: request.missionId,
        rejectionReason: `Insufficient battery: ${drone.battery.percentage}% <= reserve threshold (${drone.battery.reserveThresholdPercent}%)`,
      };
    }

    // 5. Role Validation
    if (request.requiredRole && request.requiredRole !== drone.role && drone.role !== 'MULTI_ROLE') {
      return {
        success: false,
        droneId: request.droneId,
        missionId: request.missionId,
        rejectionReason: `Role mismatch: Mission requires ${request.requiredRole}, but drone has role ${drone.role}`,
      };
    }

    // 6. Payload Capability Validation (e.g. Flotation aid)
    if (request.requiredCapability) {
      const cap = drone.capabilities[request.requiredCapability];
      if (!cap) {
        return {
          success: false,
          droneId: request.droneId,
          missionId: request.missionId,
          rejectionReason: `Capability deficit: Drone lacks required capability '${String(request.requiredCapability)}'`,
        };
      }
    }

    // Exclusive Assignment Granted
    drone.currentMissionId = request.missionId;
    drone.assignedIncidentId = request.incidentId;
    drone.status = 'DISPATCHED';

    return {
      success: true,
      droneId: drone.droneId,
      missionId: request.missionId,
      assignedStatus: 'DISPATCHED',
    };
  }

  /**
   * Releases a completed or cancelled mission
   */
  public releaseMission(droneId: string, missionId: string): boolean {
    const drone = this.drones.get(droneId);
    if (!drone || drone.currentMissionId !== missionId) {
      return false;
    }

    drone.currentMissionId = undefined;
    drone.assignedIncidentId = undefined;
    drone.status = 'IDLE';
    return true;
  }

  /**
   * Updates connectivity state
   */
  public setDroneConnectivity(droneId: string, connectivity: DroneConnectivity): void {
    const drone = this.drones.get(droneId);
    if (drone) {
      drone.connectivity = connectivity;
      if (connectivity === 'DISCONNECTED') {
        drone.isStale = true;
      }
    }
  }

  public updateConnectivity(droneId: string, connectivity: DroneConnectivity): void {
    this.setDroneConnectivity(droneId, connectivity);
  }

  /**
   * Updates drone operational status directly
   */
  public updateOperationalStatus(droneId: string, status: DroneOperationalStatus): boolean {
    const drone = this.drones.get(droneId);
    if (!drone) return false;
    drone.status = status;
    return true;
  }

  /**
   * Audits fleet freshness against current clock
   */
  public auditFleetHealth(currentClockMs: number = Date.now()): void {
    for (const drone of this.drones.values()) {
      const ageMs = Math.max(0, currentClockMs - drone.lastObservationTimeMs);
      drone.telemetryFreshnessSeconds = parseFloat((ageMs / 1000).toFixed(2));
      drone.isStale = drone.telemetryFreshnessSeconds > DroneTelemetryAdapter.MAX_FRESHNESS_WINDOW_SECONDS;

      if (drone.isStale && drone.connectivity === 'CONNECTED') {
        drone.connectivity = drone.telemetryFreshnessSeconds > 45.0 ? 'DISCONNECTED' : 'DEGRADED';
      }
    }
  }

  /**
   * Resets fleet to initial state (for test isolation)
   */
  public resetFleet(): void {
    this.telemetryAdapter.reset();
    this.initializeDefaultFleet();
  }
}

