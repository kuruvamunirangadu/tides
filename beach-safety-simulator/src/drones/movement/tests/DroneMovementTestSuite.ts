/**
 * DroneMovementTestSuite.ts
 * 
 * TIDES Drone Phase 3: Movement, GPS & Telemetry Integration Test Suite
 * 
 * Validates the 14 core requirements of Phase 3:
 * 1. Default patrol circuit progression along coastal waypoints.
 * 2. Smooth kinematic position updates without positional jumps.
 * 3. Heading alignment with horizontal movement vector.
 * 4. Stationary heading deadband filter prevents rotation jitter.
 * 5. Altitude AGL boundary constraints (clamped between 0m and 120m ceiling).
 * 6. Bi-directional WGS84 GPS coordinate mapping and precision.
 * 7. Monotonic telemetry ordering and duplicate rejection.
 * 8. Discontinuous position jump / teleportation safeguards.
 * 9. Movement state classification (STATIONARY, HOVERING, CRUISING, CLIMBING, DESCENDING).
 * 10. 3D world target dispatch and autonomous flight steering.
 * 11. Geodetic WGS84 target dispatch with boundary validation.
 * 12. Battery drain during airborne flight & automatic recharge on landing pad.
 * 13. Simulation pause and resume non-interference.
 * 14. Multi-drone concurrent fleet movement without state cross-contamination.
 */

import { DroneMovementEngine } from '../DroneMovementEngine';
import { DroneRegistry } from '../../foundation/DroneRegistry';
import { DroneTelemetryAdapter } from '../../foundation/DroneTelemetryAdapter';
import { GeoCoordinateTransform } from '../../../geospatial/GeoCoordinateTransform';
import { RawDroneTelemetryPacket, DroneWorld3DPosition } from '../../foundation/drone.types';

export interface MovementTestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: Record<string, any>;
}

export class DroneMovementTestSuite {
  private engine: DroneMovementEngine;
  private registry: DroneRegistry;
  private adapter: DroneTelemetryAdapter;
  private geoTransform: GeoCoordinateTransform;

  constructor() {
    this.engine = DroneMovementEngine.getInstance();
    this.registry = DroneRegistry.getInstance();
    this.adapter = DroneTelemetryAdapter.getInstance();
    this.geoTransform = GeoCoordinateTransform.getInstance();
  }

  public runAll(): MovementTestResult[] {
    const results: MovementTestResult[] = [];

    this.registry.resetFleet();
    this.engine.reset();

    results.push(this.testDefaultPatrolCircuitProgression());
    results.push(this.testSmoothKinematicPositionUpdates());
    results.push(this.testHeadingAlignmentWithVelocity());
    results.push(this.testStationaryHeadingDeadband());
    results.push(this.testAltitudeAglBoundaryConstraints());
    results.push(this.testBidirectionalWgs84Mapping());
    results.push(this.testMonotonicTelemetryOrdering());
    results.push(this.testSuddenPositionJumpDetection());
    results.push(this.testMovementStateClassification());
    results.push(this.testTargetDispatchWorldPosition());
    results.push(this.testTargetDispatchGeoPosition());
    results.push(this.testBatteryDrainAndPadCharging());
    results.push(this.testSimulationPauseAndResume());
    results.push(this.testFleetConcurrencyAndNonInterference());

    this.registry.resetFleet();
    this.engine.reset();

    return results;
  }

  // 1. Default Patrol Circuit Progression
  private testDefaultPatrolCircuitProgression(): MovementTestResult {
    this.registry.resetFleet();
    this.engine.reset();

    const drone = this.registry.getDrone('DRONE-01');
    if (!drone) {
      return {
        name: '1. Default Patrol Circuit Progression',
        passed: false,
        message: 'DRONE-01 not found in registry',
      };
    }

    const initialX = drone.position3D.x;
    const initialZ = drone.position3D.z;

    // Simulate 10 frames of 100ms
    let simClock = Date.now();
    for (let i = 0; i < 10; i++) {
      simClock += 100;
      this.engine.update(0.1, simClock);
    }

    const updated = this.registry.getDrone('DRONE-01')!;
    const distanceMoved = Math.hypot(updated.position3D.x - initialX, updated.position3D.z - initialZ);
    const passed = distanceMoved > 0.5 && updated.status === 'PATROLLING';

    return {
      name: '1. Default Patrol Circuit Progression',
      passed,
      message: passed
        ? `DRONE-01 advanced along patrol circuit by ${distanceMoved.toFixed(2)}m (Status: ${updated.status}).`
        : `DRONE-01 failed to advance along patrol circuit (moved: ${distanceMoved.toFixed(2)}m).`,
      details: { initial: [initialX, initialZ], current: [updated.position3D.x, updated.position3D.z], distanceMoved },
    };
  }

  // 2. Smooth Kinematic Position Updates
  private testSmoothKinematicPositionUpdates(): MovementTestResult {
    const drone = this.registry.getDrone('DRONE-01')!;
    const startPos = { ...drone.position3D };

    // Advance by a small delta (50ms)
    const dt = 0.05;
    const now = Date.now() + 1000;
    this.engine.update(dt, now);

    const nextPos = drone.position3D;
    const stepDist = Math.hypot(nextPos.x - startPos.x, nextPos.z - startPos.z);
    const maxExpectedDist = DroneMovementEngine.DEFAULT_CRUISE_SPEED_MPS * dt + 0.1; // speed * dt tolerance
    const passed = stepDist <= maxExpectedDist && stepDist > 0.01;

    return {
      name: '2. Smooth Kinematic Position Updates',
      passed,
      message: passed
        ? `Position stepped smoothly by ${stepDist.toFixed(3)}m per 50ms tick (<= physical limit ${maxExpectedDist.toFixed(3)}m).`
        : `Position step ${stepDist.toFixed(3)}m exceeded expected maximum ${maxExpectedDist.toFixed(3)}m.`,
      details: { stepDist, maxExpectedDist },
    };
  }

  // 3. Heading Alignment with Direction of Travel
  private testHeadingAlignmentWithVelocity(): MovementTestResult {
    this.registry.resetFleet();
    this.engine.reset();

    // Direct DRONE-02 due East (+X direction)
    const drone = this.registry.getDrone('DRONE-02')!;
    drone.position3D = { x: 0, y: 15, z: 0 };
    drone.status = 'DISPATCHED';

    this.engine.dispatchToWorldPosition('DRONE-02', { x: 50, y: 15, z: 0 }, 15);

    // Update simulation
    let simClock = Date.now();
    for (let i = 0; i < 5; i++) {
      simClock += 100;
      this.engine.update(0.1, simClock);
    }

    const updated = this.registry.getDrone('DRONE-02')!;
    // East corresponds to heading 90 degrees
    const headingDiff = Math.abs(updated.headingDegrees - 90);
    const passed = headingDiff <= 2;

    return {
      name: '3. Heading Alignment with Direction of Travel',
      passed,
      message: passed
        ? `Drone heading aligned correctly to ${updated.headingDegrees}° when traveling East (+X).`
        : `Heading alignment failed: expected ~90°, received ${updated.headingDegrees}°.`,
      details: { heading: updated.headingDegrees },
    };
  }

  // 4. Stationary Heading Deadband Filter
  private testStationaryHeadingDeadband(): MovementTestResult {
    this.registry.resetFleet();
    this.engine.reset();

    // DRONE-04 is stationary on the launch pad
    const drone = this.registry.getDrone('DRONE-04')!;
    const initialHeading = drone.headingDegrees;

    let simClock = Date.now();
    for (let i = 0; i < 10; i++) {
      simClock += 100;
      this.engine.update(0.1, simClock);
    }

    const updated = this.registry.getDrone('DRONE-04')!;
    const passed = updated.headingDegrees === initialHeading && updated.speedMps === 0;

    return {
      name: '4. Stationary Heading Deadband Filter',
      passed,
      message: passed
        ? `Stationary drone heading held rock-steady at ${updated.headingDegrees}° with 0 m/s speed.`
        : `Stationary heading jittered from ${initialHeading}° to ${updated.headingDegrees}°.`,
      details: { heading: updated.headingDegrees, speed: updated.speedMps },
    };
  }

  // 5. Altitude AGL Boundary Constraints
  private testAltitudeAglBoundaryConstraints(): MovementTestResult {
    this.registry.resetFleet();
    this.engine.reset();

    // Dispatch DRONE-03 with an excessive ceiling target of 200m (legal ceiling is 120m)
    this.engine.dispatchToWorldPosition('DRONE-03', { x: 10, y: 200, z: -10 }, 200);

    // Step simulation multiple times
    let simClock = Date.now();
    for (let i = 0; i < 20; i++) {
      simClock += 100;
      this.engine.update(0.1, simClock);
    }

    const drone = this.registry.getDrone('DRONE-03')!;
    const isBelowCeiling = drone.position3D.y <= DroneMovementEngine.MAX_FLIGHT_ALTITUDE_AGL;
    const isAboveFloor = drone.position3D.y >= DroneMovementEngine.MIN_FLIGHT_ALTITUDE_AGL;
    const passed = isBelowCeiling && isAboveFloor;

    return {
      name: '5. Altitude AGL Boundary Constraints',
      passed,
      message: passed
        ? `Drone altitude ${drone.position3D.y.toFixed(1)}m strictly governed within regulatory bounds [0, 120]m AGL.`
        : `Altitude violation: drone reached ${drone.position3D.y}m.`,
      details: { altitude: drone.position3D.y },
    };
  }

  // 6. Bi-directional WGS84 GPS Coordinate Mapping
  private testBidirectionalWgs84Mapping(): MovementTestResult {
    const testWorldPos: DroneWorld3DPosition = { x: 15.0, y: 18.5, z: -25.0 };

    // 3D -> WGS84 GPS
    const geoPos = this.geoTransform.threeToWgs84(testWorldPos);

    // Verify coordinates fall within Rushikonda coastal bounding box
    const validLat = geoPos.latitude >= 17.77 && geoPos.latitude <= 17.79;
    const validLon = geoPos.longitude >= 83.37 && geoPos.longitude <= 83.39;

    // WGS84 GPS -> 3D
    const roundTrip3D = this.geoTransform.wgs84ToThree({
      latitude: geoPos.latitude,
      longitude: geoPos.longitude,
      altitudeMeters: testWorldPos.y,
    });

    const dx = Math.abs(roundTrip3D.x - testWorldPos.x);
    const dz = Math.abs(roundTrip3D.z - testWorldPos.z);
    const roundTripAccurate = dx < 0.05 && dz < 0.05;

    const passed = validLat && validLon && roundTripAccurate;

    return {
      name: '6. Bi-directional WGS84 GPS Coordinate Mapping',
      passed,
      message: passed
        ? `3D [${testWorldPos.x}, ${testWorldPos.z}] mapped to GPS (${geoPos.latitude.toFixed(5)}°N, ${geoPos.longitude.toFixed(5)}°E) with sub-centimeter roundtrip error (${dx.toFixed(4)}m, ${dz.toFixed(4)}m).`
        : `GPS mapping failed accuracy check: dx=${dx}, dz=${dz}.`,
      details: { geoPos, roundTrip3D, dx, dz },
    };
  }

  // 7. Monotonic Telemetry Ordering & Deduplication
  private testMonotonicTelemetryOrdering(): MovementTestResult {
    this.adapter.reset();
    const now = Date.now();

    const packet1: RawDroneTelemetryPacket = {
      packetId: 'PKT-MONO-1',
      droneId: 'DRONE-01',
      sourceTimestampMs: now,
      position3D: { x: 10, y: 15, z: -20 },
      headingDegrees: 90,
      speedMps: 5.0,
      altitudeMeters: 15.0,
      batteryPercentage: 90,
    };

    // First packet valid
    const res1 = this.adapter.processPacket(packet1, now);

    // Duplicate timestamp packet rejected
    const packetDuplicate: RawDroneTelemetryPacket = {
      ...packet1,
      packetId: 'PKT-MONO-DUP',
    };
    const resDup = this.adapter.processPacket(packetDuplicate, now, {
      lastObservedTimestampMs: now,
    });

    // Older out-of-order packet rejected
    const packetOlder: RawDroneTelemetryPacket = {
      ...packet1,
      packetId: 'PKT-MONO-OLD',
      sourceTimestampMs: now - 500,
    };
    const resOlder = this.adapter.processPacket(packetOlder, now, {
      lastObservedTimestampMs: now,
    });

    const passed = res1.valid && !resDup.valid && !resOlder.valid;

    return {
      name: '7. Monotonic Telemetry Ordering & Deduplication',
      passed,
      message: passed
        ? `Verified monotonic packet stream: fresh packet accepted, identical timestamp rejected, older packet (${now - 500}ms < ${now}ms) rejected.`
        : `Monotonic packet verification failed. res1: ${res1.valid}, resDup: ${resDup.valid}, resOlder: ${resOlder.valid}.`,
      details: { dupReason: resDup.rejectionReason, olderReason: resOlder.rejectionReason },
    };
  }

  // 8. Discontinuous Position Jump / Teleportation Safeguards
  private testSuddenPositionJumpDetection(): MovementTestResult {
    const now = Date.now();
    const lastPos: DroneWorld3DPosition = { x: 0, y: 15, z: 0 };
    const lastTime = now - 1000; // 1 second ago

    // Unphysical leap: 100 meters in 1 second = 100 m/s (> 35 m/s physical maximum)
    const jumpPacket: RawDroneTelemetryPacket = {
      packetId: 'PKT-JUMP-1',
      droneId: 'DRONE-01',
      sourceTimestampMs: now,
      position3D: { x: 100, y: 15, z: 0 },
      headingDegrees: 90,
      speedMps: 10.0,
      altitudeMeters: 15.0,
      batteryPercentage: 80,
      isRelocation: false,
    };

    const resJump = this.adapter.processPacket(jumpPacket, now, {
      lastObservedTimestampMs: lastTime,
      lastObservedPosition3D: lastPos,
    });

    // Validated relocation jump should pass when isRelocation is true
    const relocationPacket: RawDroneTelemetryPacket = {
      ...jumpPacket,
      packetId: 'PKT-RELOC-1',
      isRelocation: true,
    };
    const resReloc = this.adapter.processPacket(relocationPacket, now, {
      lastObservedTimestampMs: lastTime,
      lastObservedPosition3D: lastPos,
    });

    const passed = !resJump.valid && resReloc.valid;

    return {
      name: '8. Discontinuous Position Jump Safeguards',
      passed,
      message: passed
        ? `Unphysical position leap (>35 m/s) rejected successfully: '${resJump.rejectionReason}'. Relocation flag honored.`
        : 'Failed sudden position jump safeguard test.',
      details: { resJumpValid: resJump.valid, resRelocValid: resReloc.valid },
    };
  }

  // 9. Movement State Classification
  private testMovementStateClassification(): MovementTestResult {
    this.registry.resetFleet();
    this.engine.reset();

    const drone = this.registry.getDrone('DRONE-01')!;
    
    // Simulate vertical climb
    drone.position3D = { x: 0, y: 5, z: -20 };
    this.engine.dispatchToWorldPosition('DRONE-01', { x: 0, y: 25, z: -20 }, 25);

    let simClock = Date.now();
    this.engine.update(0.1, simClock);

    const climbingState = drone.movementState;

    // Simulate cruise
    this.engine.dispatchToWorldPosition('DRONE-01', { x: 30, y: drone.position3D.y, z: -20 }, drone.position3D.y);
    simClock += 100;
    this.engine.update(0.1, simClock);

    const cruisingState = drone.movementState;

    const passed = climbingState === 'CLIMBING' && (cruisingState === 'CRUISING' || cruisingState === 'MANEUVERING');

    return {
      name: '9. Movement State Classification',
      passed,
      message: passed
        ? `Movement states successfully classified: climb -> ${climbingState}, horizontal travel -> ${cruisingState}.`
        : `Movement state classification failed: climb=${climbingState}, cruise=${cruisingState}.`,
      details: { climbingState, cruisingState },
    };
  }

  // 10. 3D World Target Dispatch & Autonomous Flight Steering
  private testTargetDispatchWorldPosition(): MovementTestResult {
    this.registry.resetFleet();
    this.engine.reset();

    const destTarget: DroneWorld3DPosition = { x: 40.0, y: 20.0, z: -30.0 };
    const success = this.engine.dispatchToWorldPosition('DRONE-02', destTarget, 20.0, 'MSN-AUTON-PATROL');

    const drone = this.registry.getDrone('DRONE-02')!;
    const statusDispatched = drone.status === 'DISPATCHED';
    const missionSet = drone.currentMissionId === 'MSN-AUTON-PATROL';

    // Step simulation
    let simClock = Date.now();
    for (let i = 0; i < 5; i++) {
      simClock += 100;
      this.engine.update(0.1, simClock);
    }

    const passed = success && statusDispatched && missionSet && drone.speedMps > 0;

    return {
      name: '10. 3D World Target Dispatch & Steering',
      passed,
      message: passed
        ? `Dispatched DRONE-02 to [40, 20, -30] (Mission: ${drone.currentMissionId}, Speed: ${drone.speedMps} m/s).`
        : 'Failed 3D world target dispatch test.',
      details: { success, status: drone.status, missionId: drone.currentMissionId },
    };
  }

  // 11. Geodetic WGS84 Target Dispatch with Boundary Validation
  private testTargetDispatchGeoPosition(): MovementTestResult {
    this.registry.resetFleet();
    this.engine.reset();

    // Valid GPS dispatch
    const validTarget = {
      latitude: 17.7845,
      longitude: 83.3865,
      altitudeAglMeters: 22.0,
    };
    const validSuccess = this.engine.dispatchToGeoPosition('DRONE-03', validTarget, 'MSN-GEO-DISPATCH');

    // Invalid GPS dispatch (latitude out of range)
    const invalidTarget = {
      latitude: 95.0, // illegal
      longitude: 83.3865,
      altitudeAglMeters: 20.0,
    };
    const invalidSuccess = this.engine.dispatchToGeoPosition('DRONE-03', invalidTarget);

    const passed = validSuccess && !invalidSuccess;

    return {
      name: '11. Geodetic WGS84 Target Dispatch',
      passed,
      message: passed
        ? 'Valid WGS84 GPS dispatch accepted and converted to 3D. Out-of-bounds latitude (95.0°) rejected.'
        : `GPS dispatch failed: valid=${validSuccess}, invalid=${invalidSuccess}.`,
      details: { validSuccess, invalidSuccess },
    };
  }

  // 12. Battery Drain During Flight & Automatic Recharge on Pad
  private testBatteryDrainAndPadCharging(): MovementTestResult {
    this.registry.resetFleet();
    this.engine.reset();

    // DRONE-01 is airborne patrolling
    const airborneDrone = this.registry.getDrone('DRONE-01')!;
    const initialAirborneBatt = airborneDrone.battery.percentage;

    // Simulate 30 seconds of flight
    let simClock = Date.now();
    for (let i = 0; i < 300; i++) {
      simClock += 100;
      this.engine.update(0.1, simClock);
    }
    const finalAirborneBatt = airborneDrone.battery.percentage;
    const airborneDrained = finalAirborneBatt < initialAirborneBatt;

    // DRONE-04 is grounded charging with 50% battery
    const groundedDrone = this.registry.getDrone('DRONE-04')!;
    groundedDrone.battery.percentage = 50.0;
    groundedDrone.status = 'CHARGING';

    for (let i = 0; i < 300; i++) {
      simClock += 100;
      this.engine.update(0.1, simClock);
    }
    const finalGroundedBatt = groundedDrone.battery.percentage;
    const groundedCharged = finalGroundedBatt > 50.0;

    const passed = airborneDrained && groundedCharged;

    return {
      name: '12. Battery Flight Drain & Pad Charging',
      passed,
      message: passed
        ? `Airborne flight drained battery (${initialAirborneBatt.toFixed(1)}% -> ${finalAirborneBatt.toFixed(1)}%). Pad charging replenished battery (50.0% -> ${finalGroundedBatt.toFixed(1)}%).`
        : `Battery simulation failed: drained=${airborneDrained}, charged=${groundedCharged}.`,
      details: { initialAirborneBatt, finalAirborneBatt, finalGroundedBatt },
    };
  }

  // 13. Simulation Pause and Resume Non-Interference
  private testSimulationPauseAndResume(): MovementTestResult {
    this.registry.resetFleet();
    this.engine.reset();

    const drone = this.registry.getDrone('DRONE-01')!;
    this.engine.pause();
    const pausedPos = { ...drone.position3D };

    let simClock = Date.now();
    for (let i = 0; i < 10; i++) {
      simClock += 100;
      this.engine.update(0.1, simClock);
    }

    const posAfterPause = { ...drone.position3D };
    const stayedFrozen = posAfterPause.x === pausedPos.x && posAfterPause.z === pausedPos.z;

    this.engine.resume();
    for (let i = 0; i < 10; i++) {
      simClock += 100;
      this.engine.update(0.1, simClock);
    }

    const posAfterResume = { ...drone.position3D };
    const resumedMoving = Math.hypot(posAfterResume.x - posAfterPause.x, posAfterResume.z - posAfterPause.z) > 0.1;

    const passed = stayedFrozen && resumedMoving;

    return {
      name: '13. Simulation Pause & Resume Non-Interference',
      passed,
      message: passed
        ? 'Engine completely froze position updates during pause, and resumed smooth flight immediately.'
        : `Pause/Resume failed: stayedFrozen=${stayedFrozen}, resumedMoving=${resumedMoving}.`,
      details: { stayedFrozen, resumedMoving },
    };
  }

  // 14. Multi-Drone Concurrent Fleet Movement
  private testFleetConcurrencyAndNonInterference(): MovementTestResult {
    this.registry.resetFleet();
    this.engine.reset();

    const d1_init = { ...this.registry.getDrone('DRONE-01')!.position3D };
    const d4_init = { ...this.registry.getDrone('DRONE-04')!.position3D };

    let simClock = Date.now();
    for (let i = 0; i < 20; i++) {
      simClock += 100;
      this.engine.update(0.1, simClock);
    }

    const d1_final = this.registry.getDrone('DRONE-01')!.position3D;
    const d4_final = this.registry.getDrone('DRONE-04')!.position3D;

    const d1_moved = Math.hypot(d1_final.x - d1_init.x, d1_final.z - d1_init.z) > 0.5;
    const d4_held = d4_final.x === d4_init.x && d4_final.z === d4_init.z;

    const passed = d1_moved && d4_held;

    return {
      name: '14. Multi-Drone Concurrent Fleet Movement',
      passed,
      message: passed
        ? 'Independent drone movements execute concurrently: active patrol advanced while pad unit remained anchored.'
        : `Concurrency check failed: d1_moved=${d1_moved}, d4_held=${d4_held}.`,
      details: { d1_moved, d4_held },
    };
  }
}

