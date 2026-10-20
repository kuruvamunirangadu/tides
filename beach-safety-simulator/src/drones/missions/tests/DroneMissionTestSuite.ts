/**
 * DroneMissionTestSuite.ts
 * 
 * TIDES Drone Phase 4: Mission & Patrol Manager Verification Test Suite
 * 
 * Validates the 14 core requirements of Phase 4:
 * 1. Mission creation and preflight initial state.
 * 2. Preflight rejection on non-existent drone.
 * 3. Preflight rejection on disconnected or stale telemetry.
 * 4. Preflight rejection on insufficient battery reserve (<25%).
 * 5. Preflight rejection on explicit unsupported mission types.
 * 6. Capability validation for rescue assistance missions.
 * 7. Mission acceptance and exclusive drone reservation lock.
 * 8. Double-booking conflict prevention.
 * 9. State machine transition matrix and terminal state lock.
 * 10. Patrol route execution and waypoint progression.
 * 11. Observation mission lifecycle (transit, dwell, return).
 * 12. Return-to-base and landing lifecycle.
 * 13. Mission cancellation with recorded reason and safe recall.
 * 14. Multi-mission concurrency and simulation non-interference.
 */

import { DroneMissionManager } from '../DroneMissionManager';
import { DroneRegistry } from '../../foundation/DroneRegistry';
import { DroneMovementEngine } from '../../movement/DroneMovementEngine';
import { DroneMissionType } from '../droneMission.types';

export interface MissionTestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: Record<string, any>;
}

export class DroneMissionTestSuite {
  private manager: DroneMissionManager;
  private registry: DroneRegistry;
  private movementEngine: DroneMovementEngine;

  constructor() {
    this.manager = DroneMissionManager.getInstance();
    this.registry = DroneRegistry.getInstance();
    this.movementEngine = DroneMovementEngine.getInstance();
  }

  public runAll(): MissionTestResult[] {
    const results: MissionTestResult[] = [];

    this.registry.resetFleet();
    this.movementEngine.reset();
    this.manager.reset();

    results.push(this.testMissionCreationAndPreflight());
    results.push(this.testPreflightRejectionUnknownDrone());
    results.push(this.testPreflightRejectionDisconnectedOrStale());
    results.push(this.testPreflightRejectionLowBattery());
    results.push(this.testPreflightRejectionUnsupportedType());
    results.push(this.testCapabilityValidationRescueAssistance());
    results.push(this.testMissionAcceptanceAndDroneLock());
    results.push(this.testDoubleBookingConflictPrevention());
    results.push(this.testStateMachineTransitionsAndTerminalLock());
    results.push(this.testPatrolRouteExecutionAndWaypointProgression());
    results.push(this.testObservationMissionLifecycle());
    results.push(this.testReturnToBaseAndLandingLifecycle());
    results.push(this.testMissionCancellationAndSafeRecall());
    results.push(this.testMultiMissionConcurrencyAndNonInterference());

    this.registry.resetFleet();
    this.movementEngine.reset();
    this.manager.reset();

    return results;
  }

  // 1. Mission Creation & Preflight
  private testMissionCreationAndPreflight(): MissionTestResult {
    this.registry.resetFleet();
    this.manager.reset();

    const res = this.manager.createMission({
      type: 'PATROL',
      droneId: 'DRONE-01',
      routeId: 'ROUTE-COASTAL-CRESCENT',
      notes: 'Initial test patrol',
    });

    const m = res.mission;
    const passed = res.success && !!m && m.status === 'PENDING' && m.waypoints.length === 4;

    const events = this.manager.getMissionEvents(m?.missionId);
    const hasCreated = events.some((e) => e.eventType === 'MISSION_CREATED');
    const hasPassed = events.some((e) => e.eventType === 'VALIDATION_PASSED');

    return {
      name: '1. Mission Creation & Preflight Initial State',
      passed: passed && hasCreated && hasPassed,
      message: passed
        ? `Created mission ${m?.missionId} (status: PENDING, waypoints: ${m?.waypoints.length}). Audit events verified.`
        : `Mission creation failed: ${res.errors.join(', ')}`,
      details: { missionId: m?.missionId, status: m?.status },
    };
  }

  // 2. Preflight Rejection: Unknown Drone
  private testPreflightRejectionUnknownDrone(): MissionTestResult {
    this.registry.resetFleet();
    this.manager.reset();

    const res = this.manager.createMission({
      type: 'PATROL',
      droneId: 'UNKNOWN-DRONE-99',
      routeId: 'ROUTE-COASTAL-CRESCENT',
    });

    const passed = !res.success && res.errors.some((err) => err.includes('not found in authoritative'));

    return {
      name: '2. Preflight Rejection on Non-Existent Drone',
      passed,
      message: passed
        ? `Preflight correctly rejected unknown drone: '${res.errors[0]}'.`
        : 'Failed to reject unknown drone.',
      details: { errors: res.errors },
    };
  }

  // 3. Preflight Rejection: Disconnected or Stale Telemetry
  private testPreflightRejectionDisconnectedOrStale(): MissionTestResult {
    this.registry.resetFleet();
    this.manager.reset();

    // Make DRONE-01 disconnected
    const drone = this.registry.getDrone('DRONE-01')!;
    drone.connectivity = 'DISCONNECTED';

    const resDisc = this.manager.createMission({
      type: 'PATROL',
      droneId: 'DRONE-01',
      routeId: 'ROUTE-COASTAL-CRESCENT',
    });

    // Make DRONE-02 stale (>15s)
    const drone2 = this.registry.getDrone('DRONE-02')!;
    drone2.isStale = true;
    drone2.telemetryFreshnessSeconds = 25.0;

    const resStale = this.manager.createMission({
      type: 'PATROL',
      droneId: 'DRONE-02',
      routeId: 'ROUTE-COASTAL-CRESCENT',
    });

    const passed = !resDisc.success && !resStale.success;

    return {
      name: '3. Preflight Rejection on Disconnected or Stale Telemetry',
      passed,
      message: passed
        ? `Disconnected link rejected: '${resDisc.errors[0]}'. Stale link rejected: '${resStale.errors[0]}'.`
        : 'Failed to reject disconnected/stale drone.',
      details: { discErr: resDisc.errors, staleErr: resStale.errors },
    };
  }

  // 4. Preflight Rejection: Low Battery Reserve
  private testPreflightRejectionLowBattery(): MissionTestResult {
    this.registry.resetFleet();
    this.manager.reset();

    const drone = this.registry.getDrone('DRONE-03')!;
    drone.battery.percentage = 18; // Reserve is 20%, min required is 25%

    const res = this.manager.createMission({
      type: 'PATROL',
      droneId: 'DRONE-03',
      routeId: 'ROUTE-COASTAL-CRESCENT',
    });

    const passed = !res.success && res.errors.some((err) => err.includes('Insufficient battery'));

    return {
      name: '4. Preflight Rejection on Insufficient Battery Reserve (<25%)',
      passed,
      message: passed
        ? `Preflight gated low battery: '${res.errors[0]}'.`
        : 'Failed to reject low battery drone.',
      details: { errors: res.errors },
    };
  }

  // 5. Preflight Rejection: Unsupported Mission Types
  private testPreflightRejectionUnsupportedType(): MissionTestResult {
    this.registry.resetFleet();
    this.manager.reset();

    const res = this.manager.createMission({
      type: 'CARPET_BOMBING' as DroneMissionType,
      droneId: 'DRONE-01',
    });

    const passed = !res.success && res.errors.some((err) => err.includes('unsupported by TIDES'));

    return {
      name: '5. Preflight Rejection on Explicit Unsupported Mission Types',
      passed,
      message: passed
        ? `Explicit unsupported type caught: '${res.errors[0]}'.`
        : 'Failed to reject unsupported mission type.',
      details: { errors: res.errors },
    };
  }

  // 6. Capability Validation: Rescue Assistance
  private testCapabilityValidationRescueAssistance(): MissionTestResult {
    this.registry.resetFleet();
    this.manager.reset();

    // DRONE-01 has hasFlotationPayload: false and role SURVEILLANCE
    const resSurveillance = this.manager.createMission({
      type: 'RESCUE_ASSISTANCE',
      droneId: 'DRONE-01',
      targetPosition3D: { x: 10, y: 15, z: -35 },
      linkedIncidentId: 'INC-101',
    });

    // DRONE-02 has hasFlotationPayload: true and role RESCUE_ASSISTANCE
    const resRescue = this.manager.createMission({
      type: 'RESCUE_ASSISTANCE',
      droneId: 'DRONE-02',
      targetPosition3D: { x: 10, y: 15, z: -35 },
      linkedIncidentId: 'INC-101',
    });

    const passed = !resSurveillance.success && resRescue.success;

    return {
      name: '6. Capability Validation for Rescue Assistance Missions',
      passed,
      message: passed
        ? `Surveillance drone rejected for flotation rescue: '${resSurveillance.errors[0]}'. Rescue drone accepted.`
        : 'Capability check failed.',
      details: { d1Errors: resSurveillance.errors, d2Success: resRescue.success },
    };
  }

  // 7. Mission Acceptance & Drone Lock
  private testMissionAcceptanceAndDroneLock(): MissionTestResult {
    this.registry.resetFleet();
    this.manager.reset();

    const createRes = this.manager.createMission({
      type: 'PATROL',
      droneId: 'DRONE-01',
      routeId: 'ROUTE-COASTAL-CRESCENT',
    });

    const missionId = createRes.mission!.missionId;
    const acceptRes = this.manager.acceptMission(missionId);

    const drone = this.registry.getDrone('DRONE-01')!;
    const m = this.manager.getMission(missionId);

    const passed = acceptRes.success && m?.status === 'ACCEPTED' && drone.currentMissionId === missionId;

    return {
      name: '7. Mission Acceptance & Exclusive Drone Lock',
      passed,
      message: passed
        ? `Mission ${missionId} accepted and locked to DRONE-01 (registry lock: ${drone.currentMissionId}).`
        : 'Mission acceptance lock failed.',
      details: { acceptRes, status: m?.status, droneLock: drone.currentMissionId },
    };
  }

  // 8. Double-Booking Conflict Prevention
  private testDoubleBookingConflictPrevention(): MissionTestResult {
    this.registry.resetFleet();
    this.manager.reset();

    // 1st mission accepted on DRONE-01
    const m1 = this.manager.createMission({
      type: 'PATROL',
      droneId: 'DRONE-01',
      routeId: 'ROUTE-COASTAL-CRESCENT',
    }).mission!;
    this.manager.acceptMission(m1.missionId);

    // 2nd mission attempt on DRONE-01
    const m2Res = this.manager.createMission({
      type: 'WAYPOINT_TRAVEL',
      droneId: 'DRONE-01',
      targetPosition3D: { x: 20, y: 20, z: -20 },
    });

    const passed = !m2Res.success && m2Res.errors.some((err) => err.includes('Conflict'));

    return {
      name: '8. Double-Booking Conflict Prevention',
      passed,
      message: passed
        ? `Second mission blocked by conflict detector: '${m2Res.errors[0]}'.`
        : 'Failed to prevent double booking.',
      details: { errors: m2Res.errors },
    };
  }

  // 9. State Machine Transitions & Terminal State Lock
  private testStateMachineTransitionsAndTerminalLock(): MissionTestResult {
    this.registry.resetFleet();
    this.manager.reset();

    const m = this.manager.createMission({
      type: 'PATROL',
      droneId: 'DRONE-01',
      routeId: 'ROUTE-COASTAL-CRESCENT',
    }).mission!;

    // Start mission (PENDING -> ACCEPTED -> ACTIVE)
    const startRes = this.manager.startMission(m.missionId);

    // Cancel mission (ACTIVE -> CANCELLED)
    const cancelRes = this.manager.cancelMission(m.missionId, 'Unit test cancellation');

    // Attempt invalid transition out of terminal state CANCELLED -> ACTIVE
    const resumeRes = this.manager.startMission(m.missionId);

    const passed = startRes.success && cancelRes.success && !resumeRes.success;

    return {
      name: '9. State Machine Transitions & Terminal State Lock',
      passed,
      message: passed
        ? `Transition verified: PENDING -> ACTIVE -> CANCELLED. Terminal state lock blocked restart: '${resumeRes.errorReason}'.`
        : 'State machine transition check failed.',
      details: { startRes, cancelRes, resumeRes },
    };
  }

  // 10. Patrol Route Execution & Waypoint Progression
  private testPatrolRouteExecutionAndWaypointProgression(): MissionTestResult {
    this.registry.resetFleet();
    this.movementEngine.reset();
    this.manager.reset();

    const m = this.manager.createMission({
      type: 'PATROL',
      droneId: 'DRONE-01',
      routeId: 'ROUTE-COASTAL-CRESCENT',
    }).mission!;

    this.manager.startMission(m.missionId);

    // Simulate 30 steps of 100ms
    let simClock = Date.now();
    for (let i = 0; i < 30; i++) {
      simClock += 100;
      this.movementEngine.update(0.1, simClock);
      this.manager.update(0.1, simClock);
    }

    const updated = this.manager.getMission(m.missionId)!;
    const passed = updated.status === 'ACTIVE' && updated.progressPercent > 0;

    return {
      name: '10. Patrol Route Execution & Waypoint Progression',
      passed,
      message: passed
        ? `Patrol mission ACTIVE. Waypoint progression verified (Progress: ${updated.progressPercent}%, Waypoint Index: ${updated.currentWaypointIndex}).`
        : 'Patrol progression failed.',
      details: { progress: updated.progressPercent, wpIndex: updated.currentWaypointIndex },
    };
  }

  // 11. Observation Mission Lifecycle
  private testObservationMissionLifecycle(): MissionTestResult {
    this.registry.resetFleet();
    this.movementEngine.reset();
    this.manager.reset();

    const m = this.manager.createMission({
      type: 'OBSERVATION',
      droneId: 'DRONE-03',
      targetPosition3D: { x: 87.1, y: 5.5, z: -11.1 }, // Target slightly above pad for fast test convergence
      observationDurationSec: 1.0, // 1 second dwell for test speed
    }).mission!;

    this.manager.startMission(m.missionId);

    // Step simulation until dwell triggers return
    let simClock = Date.now();
    for (let i = 0; i < 40; i++) {
      simClock += 100;
      this.movementEngine.update(0.1, simClock);
      this.manager.update(0.1, simClock);
    }

    const events = this.manager.getMissionEvents(m.missionId);
    const hasObsStarted = events.some((e) => e.eventType === 'OBSERVATION_STARTED');
    const hasObsCompleted = events.some((e) => e.eventType === 'OBSERVATION_COMPLETED');
    const hasReturn = events.some((e) => e.eventType === 'RETURN_REQUESTED');

    const passed = hasObsStarted && hasObsCompleted && hasReturn;

    return {
      name: '11. Observation Mission Lifecycle (Transit, Dwell, Return)',
      passed,
      message: passed
        ? `Observation completed lifecycle: OBSERVATION_STARTED -> OBSERVATION_COMPLETED -> RETURN_REQUESTED.`
        : `Observation lifecycle failed: started=${hasObsStarted}, completed=${hasObsCompleted}, return=${hasReturn}.`,
      details: { hasObsStarted, hasObsCompleted, hasReturn },
    };
  }

  // 12. Return-to-Base & Landing Lifecycle
  private testReturnToBaseAndLandingLifecycle(): MissionTestResult {
    this.registry.resetFleet();
    this.movementEngine.reset();
    this.manager.reset();

    const m = this.manager.createMission({
      type: 'RETURN_TO_BASE',
      droneId: 'DRONE-01',
    }).mission!;

    this.manager.startMission(m.missionId);

    // Drone is already close to home pad
    const drone = this.registry.getDrone('DRONE-01')!;
    drone.position3D = { ...drone.homePosition3D };

    let simClock = Date.now();
    for (let i = 0; i < 10; i++) {
      simClock += 100;
      this.movementEngine.update(0.1, simClock);
      this.manager.update(0.1, simClock);
    }

    const events = this.manager.getMissionEvents(m.missionId);
    const hasLanded = events.some((e) => e.eventType === 'LANDED');
    const hasCompleted = events.some((e) => e.eventType === 'MISSION_COMPLETED');
    const lockReleased = drone.currentMissionId === undefined;

    const passed = hasLanded && hasCompleted && lockReleased;

    return {
      name: '12. Return-to-Base & Landing Lifecycle',
      passed,
      message: passed
        ? `Drone arrived at launch pad: LANDED -> MISSION_COMPLETED. Registry lock released.`
        : `Return-to-base failed: landed=${hasLanded}, completed=${hasCompleted}, lockReleased=${lockReleased}.`,
      details: { hasLanded, hasCompleted, lockReleased },
    };
  }

  // 13. Mission Cancellation & Safe Recall
  private testMissionCancellationAndSafeRecall(): MissionTestResult {
    this.registry.resetFleet();
    this.movementEngine.reset();
    this.manager.reset();

    const m = this.manager.createMission({
      type: 'PATROL',
      droneId: 'DRONE-01',
      routeId: 'ROUTE-COASTAL-CRESCENT',
    }).mission!;

    this.manager.startMission(m.missionId);

    // Cancel mission
    const res = this.manager.cancelMission(m.missionId, 'Severe weather squall inbound');

    const drone = this.registry.getDrone('DRONE-01')!;
    const archived = this.manager.getMission(m.missionId);
    const lockReleased = drone.currentMissionId === undefined;
    const statusCancelled = archived?.status === 'CANCELLED';
    const reasonSaved = archived?.cancellationReason === 'Severe weather squall inbound';

    const passed = res.success && lockReleased && statusCancelled && reasonSaved;

    return {
      name: '13. Mission Cancellation with Recorded Reason & Safe Recall',
      passed,
      message: passed
        ? `Mission cancelled cleanly: '${archived?.cancellationReason}'. Drone lock released.`
        : 'Mission cancellation check failed.',
      details: { res, status: archived?.status, reason: archived?.cancellationReason },
    };
  }

  // 14. Multi-Mission Concurrency & Simulation Non-Interference
  private testMultiMissionConcurrencyAndNonInterference(): MissionTestResult {
    this.registry.resetFleet();
    this.movementEngine.reset();
    this.manager.reset();

    // Mission 1: DRONE-01 Patrol
    const m1 = this.manager.createMission({
      type: 'PATROL',
      droneId: 'DRONE-01',
      routeId: 'ROUTE-COASTAL-CRESCENT',
    }).mission!;
    this.manager.startMission(m1.missionId);

    // Mission 2: DRONE-02 Rescue Standby Observation
    const m2 = this.manager.createMission({
      type: 'OBSERVATION',
      droneId: 'DRONE-02',
      targetPosition3D: { x: 0, y: 20, z: -25 },
      observationDurationSec: 45.0,
    }).mission!;
    this.manager.startMission(m2.missionId);

    // Step simulation
    let simClock = Date.now();
    for (let i = 0; i < 15; i++) {
      simClock += 100;
      this.movementEngine.update(0.1, simClock);
      this.manager.update(0.1, simClock);
    }

    const d1Mission = this.manager.getMission(m1.missionId);
    const d2Mission = this.manager.getMission(m2.missionId);

    const bothActive = d1Mission?.status === 'ACTIVE' && d2Mission?.status === 'ACTIVE';
    const separateDrones = d1Mission?.droneId === 'DRONE-01' && d2Mission?.droneId === 'DRONE-02';

    // Verify DRONE-04 remains unassigned and charging
    const d4 = this.registry.getDrone('DRONE-04')!;
    const d4Untouched = d4.status === 'CHARGING' && d4.currentMissionId === undefined;

    const passed = bothActive && separateDrones && d4Untouched;

    return {
      name: '14. Multi-Mission Concurrency & Simulation Non-Interference',
      passed,
      message: passed
        ? 'Independent missions executed concurrently on DRONE-01 and DRONE-02 without cross-contamination. Pad reserve DRONE-04 unaffected.'
        : 'Multi-mission concurrency failed.',
      details: { bothActive, separateDrones, d4Untouched },
    };
  }
}
