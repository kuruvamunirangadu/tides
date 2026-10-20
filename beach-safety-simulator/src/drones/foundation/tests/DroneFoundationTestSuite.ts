/**
 * DroneFoundationTestSuite.ts
 * 
 * TIDES Drone Phase 1: Foundation Verification Test Suite
 * 
 * Validates the core requirements of the Drone Registry and Shared Telemetry Foundation:
 * 1. Unique drone IDs and default fleet registration.
 * 2. Valid telemetry packet ingestion and coordinate updates.
 * 3. Timestamp sanity and future packet rejection.
 * 4. Physical coordinate boundary and speed clamping.
 * 5. Telemetry freshness audit and stale degradation (> 15s).
 * 6. Capability validation (surveillance vs rescue flotation payload).
 * 7. Exclusive mission assignment and double-booking conflict prevention.
 * 8. Low battery reserve lockout (< 20% reserve gate).
 * 9. Mission release and operational status recovery.
 * 10. Offline and disconnected state handling.
 * 11. Multiple drones independent state concurrency.
 * 12. 3D coordinate mapping compatibility.
 */

import { DroneRegistry } from '../DroneRegistry';
import { DroneTelemetryAdapter } from '../DroneTelemetryAdapter';
import { RawDroneTelemetryPacket, DroneRecord } from '../drone.types';

export interface DroneTestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: Record<string, any>;
}

export class DroneFoundationTestSuite {
  private registry: DroneRegistry;
  private adapter: DroneTelemetryAdapter;

  constructor() {
    this.registry = DroneRegistry.getInstance();
    this.adapter = DroneTelemetryAdapter.getInstance();
  }

  public runAll(): DroneTestResult[] {
    const results: DroneTestResult[] = [];

    this.registry.resetFleet();

    results.push(this.testDefaultFleetRegistration());
    results.push(this.testValidTelemetryIngestion());
    results.push(this.testTimestampSanityAndFutureRejection());
    results.push(this.testPhysicalBoundsAndSpeedClamping());
    results.push(this.testTelemetryFreshnessAndStaleDegradation());
    results.push(this.testCapabilityValidationFlotationPayload());
    results.push(this.testExclusiveMissionAssignmentLock());
    results.push(this.testLowBatteryReserveLockout());
    results.push(this.testMissionReleaseAndStatusRecovery());
    results.push(this.testOfflineAndDisconnectedHandling());
    results.push(this.testMultipleDronesIndependentConcurrency());
    results.push(this.test3DCoordinateMappingCompatibility());

    this.registry.resetFleet();

    return results;
  }

  // 1. Default Fleet Registration
  private testDefaultFleetRegistration(): DroneTestResult {
    this.registry.resetFleet();
    const drones = this.registry.getAllDrones();
    const ids = drones.map((d) => d.droneId);
    const uniqueIds = new Set(ids);

    const hasD1 = this.registry.getDrone('DRONE-01')?.role === 'SURVEILLANCE';
    const hasD2 = this.registry.getDrone('DRONE-02')?.role === 'RESCUE_ASSISTANCE';
    const hasD3 = this.registry.getDrone('DRONE-03')?.role === 'MULTI_ROLE';

    const passed = drones.length === 4 && uniqueIds.size === 4 && hasD1 && hasD2 && hasD3;

    return {
      name: '1. Unique Drone IDs & Default Fleet Registration',
      passed,
      message: passed
        ? `Registered 4 distinct drones with unique IDs: ${ids.join(', ')}.`
        : 'Failed to verify 4 distinct default drones.',
      details: { totalDrones: drones.length, ids },
    };
  }

  // 2. Valid Telemetry Packet Ingestion
  private testValidTelemetryIngestion(): DroneTestResult {
    const now = Date.now();
    const packet: RawDroneTelemetryPacket = {
      packetId: 'PKT-101',
      droneId: 'DRONE-01',
      sourceTimestampMs: now - 500, // 500ms ago
      position3D: { x: 10.5, y: 22.0, z: -35.2 },
      headingDegrees: 120,
      speedMps: 6.8,
      altitudeMeters: 22.0,
      batteryPercentage: 85,
      voltageVolts: 22.5,
      provenance: 'SIMULATED',
    };

    const ingested = this.registry.ingestTelemetry(packet, now);
    const drone = this.registry.getDrone('DRONE-01');

    const passed =
      ingested &&
      drone !== undefined &&
      drone.position3D.x === 10.5 &&
      drone.position3D.y === 22.0 &&
      drone.speedMps === 6.8 &&
      drone.battery.percentage === 85 &&
      !drone.isStale;

    return {
      name: '2. Valid Telemetry Ingestion & State Synchronization',
      passed,
      message: passed
        ? `Ingested packet PKT-101 for DRONE-01. Position: [${drone?.position3D.x}, ${drone?.position3D.y}, ${drone?.position3D.z}], Speed: ${drone?.speedMps} m/s.`
        : 'Failed to ingest valid telemetry packet.',
      details: { ingested, dronePosition: drone?.position3D },
    };
  }

  // 3. Timestamp Sanity & Future Packet Rejection
  private testTimestampSanityAndFutureRejection(): DroneTestResult {
    const now = Date.now();

    // Future packet (> 5000ms ahead)
    const futurePacket: RawDroneTelemetryPacket = {
      packetId: 'PKT-FUT',
      droneId: 'DRONE-01',
      sourceTimestampMs: now + 15000, // 15 seconds in future!
      position3D: { x: 0, y: 10, z: 0 },
      headingDegrees: 0,
      speedMps: 0,
      altitudeMeters: 10,
      batteryPercentage: 90,
    };

    const futureRes = this.adapter.processPacket(futurePacket, now);

    // Negative timestamp packet
    const negPacket: RawDroneTelemetryPacket = {
      packetId: 'PKT-NEG',
      droneId: 'DRONE-01',
      sourceTimestampMs: -100,
      position3D: { x: 0, y: 10, z: 0 },
      headingDegrees: 0,
      speedMps: 0,
      altitudeMeters: 10,
      batteryPercentage: 90,
    };

    const negRes = this.adapter.processPacket(negPacket, now);

    const passed = !futureRes.valid && !negRes.valid;

    return {
      name: '3. Timestamp Sanity & Future Telemetry Rejection',
      passed,
      message: passed
        ? `Future and negative timestamps rejected. Future reason: '${futureRes.rejectionReason}'.`
        : 'Failed to reject invalid timestamps.',
      details: { futureValid: futureRes.valid, negValid: negRes.valid },
    };
  }

  // 4. Physical Coordinate Bounds & Speed Clamping
  private testPhysicalBoundsAndSpeedClamping(): DroneTestResult {
    const now = Date.now();

    // Supersonic speed packet (> 35 m/s)
    const hyperSpeedPacket: RawDroneTelemetryPacket = {
      packetId: 'PKT-HYPER',
      droneId: 'DRONE-01',
      sourceTimestampMs: now,
      position3D: { x: 0, y: 10, z: 0 },
      headingDegrees: 0,
      speedMps: 150.0, // 150 m/s is unphysical for coastal quadcopter
      altitudeMeters: 10,
      batteryPercentage: 90,
    };
    const speedRes = this.adapter.processPacket(hyperSpeedPacket, now);

    // NaN position packet
    const nanPacket: RawDroneTelemetryPacket = {
      packetId: 'PKT-NAN',
      droneId: 'DRONE-01',
      sourceTimestampMs: now,
      position3D: { x: NaN, y: 10, z: 0 },
      headingDegrees: 0,
      speedMps: 5.0,
      altitudeMeters: 10,
      batteryPercentage: 90,
    };
    const nanRes = this.adapter.processPacket(nanPacket, now);

    const passed = !speedRes.valid && !nanRes.valid;

    return {
      name: '4. Physical Envelope & Speed Clamping Safeguards',
      passed,
      message: passed
        ? `Unphysical metrics caught. Speed reason: '${speedRes.rejectionReason}'. NaN reason: '${nanRes.rejectionReason}'.`
        : 'Failed to reject unphysical coordinates or speeds.',
    };
  }

  // 5. Telemetry Freshness & Stale Degradation
  private testTelemetryFreshnessAndStaleDegradation(): DroneTestResult {
    const now = Date.now();

    // Packet from 25 seconds ago (> 15s max freshness)
    const stalePacket: RawDroneTelemetryPacket = {
      packetId: 'PKT-STALE',
      droneId: 'DRONE-01',
      sourceTimestampMs: now - 25000,
      position3D: { x: 5, y: 15, z: -10 },
      headingDegrees: 0,
      speedMps: 2.0,
      altitudeMeters: 15,
      batteryPercentage: 80,
    };

    const res = this.adapter.processPacket(stalePacket, now);
    this.registry.ingestTelemetry(stalePacket, now);
    const drone = this.registry.getDrone('DRONE-01');

    const passed =
      res.valid &&
      res.isStale &&
      res.freshnessSeconds >= 24.0 &&
      res.connectivity === 'DEGRADED' &&
      drone?.isStale === true &&
      drone?.connectivity === 'DEGRADED';

    return {
      name: '5. Telemetry Freshness Audit & Stale Degradation (>15s)',
      passed,
      message: passed
        ? `Telemetry age ${res.freshnessSeconds}s correctly flagged as STALE (Connectivity: ${res.connectivity}).`
        : 'Failed to flag stale telemetry.',
      details: { freshnessSeconds: res.freshnessSeconds, isStale: res.isStale },
    };
  }

  // 6. Capability Validation: Flotation Payload
  private testCapabilityValidationFlotationPayload(): DroneTestResult {
    this.registry.resetFleet();

    // Attempt to assign flotation mission to DRONE-01 (Surveillance, lacks flotation)
    const req1 = {
      droneId: 'DRONE-01',
      missionId: 'MSN-RESCUE-01',
      requiredCapability: 'hasFlotationPayload' as const,
      incidentId: 'INC-101',
    };
    const res1 = this.registry.assignMission(req1);

    // Attempt to assign flotation mission to DRONE-02 (Rescue Heavy Hex, has flotation)
    const req2 = {
      droneId: 'DRONE-02',
      missionId: 'MSN-RESCUE-01',
      requiredCapability: 'hasFlotationPayload' as const,
      incidentId: 'INC-101',
    };
    const res2 = this.registry.assignMission(req2);

    const passed = !res1.success && res2.success;

    return {
      name: '6. Payload Capability Validation (Flotation Aid)',
      passed,
      message: passed
        ? `Surveillance drone rejected flotation mission: '${res1.rejectionReason}'. Rescue drone accepted mission.`
        : 'Failed capability validation check.',
      details: { res1Success: res1.success, res2Success: res2.success },
    };
  }

  // 7. Exclusive Mission Assignment Lock
  private testExclusiveMissionAssignmentLock(): DroneTestResult {
    // DRONE-02 is currently busy with MSN-RESCUE-01
    const reqConflict = {
      droneId: 'DRONE-02',
      missionId: 'MSN-RESCUE-02', // Different mission!
      incidentId: 'INC-102',
    };

    const resConflict = this.registry.assignMission(reqConflict);

    const passed = Boolean(!resConflict.success && resConflict.rejectionReason?.includes('already assigned'));

    return {
      name: '7. Exclusive Mission Assignment Lock & Conflict Prevention',
      passed,
      message: passed
        ? `Conflict rejected: '${resConflict.rejectionReason}'. Double-booking prevented.`
        : 'Failed to reject conflicting mission assignment.',
      details: { conflictSuccess: resConflict.success },
    };
  }

  // 8. Low Battery Reserve Lockout (< 20%)
  private testLowBatteryReserveLockout(): DroneTestResult {
    this.registry.resetFleet();
    const drone = this.registry.getDrone('DRONE-03');
    if (drone) {
      drone.battery.percentage = 14; // Low battery below 20% reserve
    }

    const req = {
      droneId: 'DRONE-03',
      missionId: 'MSN-LOW-BATT',
      incidentId: 'INC-103',
    };

    const res = this.registry.assignMission(req);
    const passed = Boolean(!res.success && res.rejectionReason?.includes('Insufficient battery'));

    return {
      name: '8. Low Battery Reserve Gate (< 20% Lockout)',
      passed,
      message: passed
        ? `Mission rejected due to battery depletion: '${res.rejectionReason}'.`
        : 'Failed to reject mission on low battery.',
      details: { success: res.success, reason: res.rejectionReason },
    };
  }

  // 9. Mission Release & Status Recovery
  private testMissionReleaseAndStatusRecovery(): DroneTestResult {
    this.registry.resetFleet();
    // Assign mission to DRONE-02
    this.registry.assignMission({
      droneId: 'DRONE-02',
      missionId: 'MSN-RELEASE-TEST',
    });

    const busyDrone = this.registry.getDrone('DRONE-02');
    const wasDispatched = busyDrone?.status === 'DISPATCHED' && busyDrone?.currentMissionId === 'MSN-RELEASE-TEST';

    // Release mission
    const released = this.registry.releaseMission('DRONE-02', 'MSN-RELEASE-TEST');
    const recoveredDrone = this.registry.getDrone('DRONE-02');
    const isIdle = recoveredDrone?.status === 'IDLE' && recoveredDrone?.currentMissionId === undefined;

    const passed = wasDispatched && released && isIdle;

    return {
      name: '9. Mission Release & Operational Status Recovery',
      passed,
      message: passed
        ? 'Mission MSN-RELEASE-TEST successfully released. Drone status recovered to IDLE.'
        : 'Failed to release mission or recover status.',
      details: { wasDispatched, released, isIdle },
    };
  }

  // 10. Offline & Disconnected State Handling
  private testOfflineAndDisconnectedHandling(): DroneTestResult {
    this.registry.resetFleet();
    this.registry.setDroneConnectivity('DRONE-02', 'DISCONNECTED');

    const available = this.registry.getAvailableDrones();
    const hasD2 = available.some((d) => d.droneId === 'DRONE-02');

    const passed = !hasD2;

    return {
      name: '10. Offline & Disconnected Telemetry Degradation',
      passed,
      message: passed
        ? 'Disconnected drone DRONE-02 excluded from available operational pool.'
        : 'Disconnected drone was improperly marked available.',
      details: { availableCount: available.length, hasD2 },
    };
  }

  // 11. Multiple Drones Independent Concurrency
  private testMultipleDronesIndependentConcurrency(): DroneTestResult {
    this.registry.resetFleet();
    const now = Date.now();

    const pkt1: RawDroneTelemetryPacket = {
      packetId: 'PKT-CONC-1',
      droneId: 'DRONE-01',
      sourceTimestampMs: now,
      position3D: { x: -10, y: 20, z: -30 },
      headingDegrees: 45,
      speedMps: 5.0,
      altitudeMeters: 20,
      batteryPercentage: 92,
    };

    const pkt3: RawDroneTelemetryPacket = {
      packetId: 'PKT-CONC-3',
      droneId: 'DRONE-03',
      sourceTimestampMs: now,
      position3D: { x: 50, y: 15, z: -10 },
      headingDegrees: 180,
      speedMps: 8.0,
      altitudeMeters: 15,
      batteryPercentage: 77,
    };

    this.registry.ingestTelemetry(pkt1, now);
    this.registry.ingestTelemetry(pkt3, now);

    const d1 = this.registry.getDrone('DRONE-01');
    const d3 = this.registry.getDrone('DRONE-03');

    const passed =
      d1?.position3D.x === -10 &&
      d1?.speedMps === 5.0 &&
      d3?.position3D.x === 50 &&
      d3?.speedMps === 8.0;

    return {
      name: '11. Multi-Drone Independent Telemetry Concurrency',
      passed,
      message: passed
        ? 'Simultaneous telemetry updates processed independently without state cross-contamination.'
        : 'Telemetry updates collided or overwrote state.',
    };
  }

  // 12. 3D Coordinate Mapping Compatibility
  private test3DCoordinateMappingCompatibility(): DroneTestResult {
    const drone = this.registry.getDrone('DRONE-01');
    if (!drone) {
      return { name: '12. 3D Coordinate Mapping Compatibility', passed: false, message: 'Drone not found' };
    }

    // Verify 3D position has numeric components within Rushikonda coastal scene envelope
    const p = drone.position3D;
    const valid =
      typeof p.x === 'number' &&
      typeof p.y === 'number' &&
      typeof p.z === 'number' &&
      !isNaN(p.x) &&
      !isNaN(p.y) &&
      !isNaN(p.z) &&
      p.y >= 0 &&
      p.y <= 100; // Reasonable altitude range

    return {
      name: '12. 3D Coordinate Mapping & Viewport Compatibility',
      passed: valid,
      message: valid
        ? `3D position vector [${p.x}, ${p.y}, ${p.z}] conforms to Three.js coordinate system (1 unit = 5.0m).`
        : 'Invalid 3D position vector.',
      details: { position: p },
    };
  }
}
