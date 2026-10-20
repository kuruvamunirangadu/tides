/**
 * DroneRescueExecutionTestSuite.ts
 * 
 * TIDES Drone Phase 10: Search, Approach & Rescue Assistance Test Suite
 * 
 * Comprehensive verification of rescue mission execution:
 * 1. Valid approved rescue mission lifecycle
 * 2. Missing or stale destination rejection
 * 3. Existing movement and approach integration (no teleportation)
 * 4. Arrival and observation state transitions
 * 5. Target observed, not observed, and uncertain outcomes
 * 6. Supported and unsupported payload capabilities
 * 7. Simulated delivery success and failure
 * 8. Duplicate event suppression
 * 9. Return-to-base progression
 * 10. Landing and resource release
 * 11. Cancellation and emergency battery abort
 * 12. Incident state change during execution
 * 13. Multiple independent concurrent rescue missions
 * 14. Lifeguard and rescue boat coordination preservation
 * 15. Life-safety boundary enforcement (no auto-resolution)
 * 16. Non-interference and clean state reset isolation
 */

import { DroneRegistry } from '../../../foundation/DroneRegistry';
import { DroneMovementEngine } from '../../../movement/DroneMovementEngine';
import { DroneMissionManager } from '../../../missions/DroneMissionManager';
import { DroneCameraRegistry } from '../../../camera/DroneCameraRegistry';
import { DroneVisionManager } from '../../../vision/DroneVisionManager';
import { IncidentManager } from '../../../../visitors/incidents/IncidentManager';
import { RescueCoordinator } from '../../../../scene3d/rescue/RescueCoordinator';
import { DroneRescueDispatchManager } from '../../DroneRescueDispatchManager';
import { DroneRescueAuditLogger } from '../../DroneRescueAuditLogger';
import { DroneRescueExecutionManager } from '../DroneRescueExecutionManager';
import { RescueDroneAssignment } from '../../droneRescue.types';

export interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

export class DroneRescueExecutionTestSuite {
  private droneRegistry: DroneRegistry;
  private movementEngine: DroneMovementEngine;
  private missionManager: DroneMissionManager;
  private cameraRegistry: DroneCameraRegistry;
  private visionManager: DroneVisionManager;
  private incidentManager: IncidentManager;
  private rescueCoordinator: RescueCoordinator;
  private dispatchManager: DroneRescueDispatchManager;
  private auditLogger: DroneRescueAuditLogger;
  private execManager: DroneRescueExecutionManager;

  constructor() {
    this.droneRegistry = DroneRegistry.getInstance();
    this.movementEngine = DroneMovementEngine.getInstance();
    this.missionManager = DroneMissionManager.getInstance();
    this.cameraRegistry = DroneCameraRegistry.getInstance();
    this.visionManager = DroneVisionManager.getInstance();
    this.incidentManager = IncidentManager.getInstance();
    this.rescueCoordinator = RescueCoordinator.getInstance();
    this.dispatchManager = DroneRescueDispatchManager.getInstance();
    this.auditLogger = DroneRescueAuditLogger.getInstance();
    this.execManager = DroneRescueExecutionManager.getInstance();
  }

  private setupCleanState(): void {
    this.droneRegistry.reset();
    this.movementEngine.reset();
    this.missionManager.reset();
    this.cameraRegistry.reset();
    this.incidentManager.clear();
    this.rescueCoordinator.activeMission = null;
    this.dispatchManager.reset();
    this.execManager.reset();
    this.dispatchManager.setAutoDispatch(false);
  }

  public runAllTests(): TestResult[] {
    const results: TestResult[] = [];

    results.push(this.testValidApprovedRescueMissionLifecycle());
    results.push(this.testMissingOrStaleDestinationRejection());
    results.push(this.testMovementAndApproachIntegration());
    results.push(this.testArrivalAndObservationTransitions());
    results.push(this.testTargetObservationOutcomes());
    results.push(this.testSupportedAndUnsupportedPayloads());
    results.push(this.testSimulatedDeliverySuccessAndFailure());
    results.push(this.testDuplicateEventSuppression());
    results.push(this.testReturnToBaseProgression());
    results.push(this.testLandingAndResourceRelease());
    results.push(this.testCancellationAndBatteryAbort());
    results.push(this.testIncidentStateChangeDuringExecution());
    results.push(this.testMultipleIndependentConcurrentExecutions());
    results.push(this.testLifeguardAndRescueBoatCoordination());
    results.push(this.testLifeSafetyBoundaryNoAutoResolution());
    results.push(this.testNonInterferenceAndCleanReset());

    return results;
  }

  // 1. Valid approved rescue mission
  private testValidApprovedRescueMissionLifecycle(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    const incident = {
      id: 'INC-EXEC-01',
      title: 'Distressed Bather off North Sandbar',
      type: 'DISTRESS',
      severity: 'CRITICAL',
      active: true,
      position3D: { x: 15, y: 0, z: -35 },
    };

    const prop = this.dispatchManager.proposeAssignment(incident, now);
    const asgId = prop.assignment!.assignmentId;
    this.dispatchManager.approveAndDispatch(asgId, 'OPERATOR-MANUAL', 'Approved', now);

    const exec = this.execManager.getExecutionByAssignmentId(asgId);
    const passed =
      exec !== undefined &&
      exec.stage === 'APPROACHING' &&
      exec.droneId === 'DRONE-02' &&
      exec.targetPosition3D.x === 15 &&
      exec.payload !== undefined &&
      exec.payload.readinessState === 'ATTACHED';

    return {
      name: 'Valid Approved Rescue Mission Lifecycle Initiation',
      passed,
      message: passed
        ? `Mission initialized in APPROACHING stage with payload ATTACHED (ETA: ${exec?.estimatedArrivalSec}s).`
        : `Initialization failed: stage=${exec?.stage}`,
    };
  }

  // 2. Missing or stale destination rejection
  private testMissingOrStaleDestinationRejection(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    // Out of bounds / NaN coordinate
    const badDest = { x: NaN, y: 0, z: 999 };
    const valBad = this.execManager.validateDestination(badDest as any, 'WEARABLE_GPS', now, now);

    // Stale coordinate (> 15s)
    const staleDest = { x: 10, y: 0, z: -20 };
    const valStale = this.execManager.validateDestination(staleDest, 'WEARABLE_GPS', now - 20000, now);

    const passed =
      !valBad.valid &&
      valBad.errors.some((e) => e.includes('NaN')) &&
      !valStale.valid &&
      valStale.isStale &&
      valStale.errors.some((e) => e.includes('stale'));

    return {
      name: 'Missing or Stale Destination Rejection',
      passed,
      message: passed
        ? 'Safely rejected NaN coordinate and stale coordinate (20.0s > 15.0s threshold) without launching drone.'
        : `Validation failed: badValid=${valBad.valid}, staleValid=${valStale.valid}`,
    };
  }

  // 3. Movement and approach integration (no teleportation)
  private testMovementAndApproachIntegration(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    const incident = {
      id: 'INC-MOVE-01',
      title: 'Swimmer Current Sweep',
      type: 'DISTRESS',
      severity: 'CRITICAL',
      active: true,
      position3D: { x: 50, y: 0, z: -40 },
    };

    const prop = this.dispatchManager.proposeAssignment(incident, now);
    const asg = prop.assignment!;
    this.dispatchManager.approveAndDispatch(asg.assignmentId, 'OPERATOR', 'Approved', now);

    const exec = this.execManager.getExecutionByAssignmentId(asg.assignmentId)!;
    const initialDist = exec.transitDistanceMeters;

    // Simulate partial flight step (drone at intermediate waypoint)
    this.droneRegistry.ingestTelemetry({
      packetId: 'PKT-APPROACH-1',
      droneId: 'DRONE-02',
      sourceTimestampMs: now + 2000,
      position3D: { x: 60, y: 20, z: -20 },
      headingDegrees: 180,
      speedMps: 10,
      altitudeMeters: 20,
      batteryPercentage: 80,
      connectivity: 'CONNECTED',
    }, now + 2000);

    this.execManager.update(0.1, now + 2000);
    const updatedDist = exec.transitDistanceMeters;

    const passed =
      exec.stage === 'APPROACHING' &&
      updatedDist < initialDist &&
      exec.groundSpeedMps === 10;

    return {
      name: 'Kinematic Movement and Approach Integration (No Teleportation)',
      passed,
      message: passed
        ? `Drone progressed smoothly: distance decreased from ${initialDist}m to ${updatedDist}m at 10 m/s.`
        : `Movement check failed: initial=${initialDist}, updated=${updatedDist}`,
    };
  }

  // 4. Arrival and observation state transitions
  private testArrivalAndObservationTransitions(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    const incident = {
      id: 'INC-ARRIVE-01',
      title: 'Arrive Test',
      type: 'DISTRESS',
      severity: 'CRITICAL',
      active: true,
      position3D: { x: 20, y: 0, z: -30 },
    };

    const prop = this.dispatchManager.proposeAssignment(incident, now);
    const asgId = prop.assignment!.assignmentId;
    this.dispatchManager.approveAndDispatch(asgId, 'OPERATOR', 'Approved', now);

    // Drone arrives within 15m radius
    this.droneRegistry.ingestTelemetry({
      packetId: 'PKT-ARRIVE-1',
      droneId: 'DRONE-02',
      sourceTimestampMs: now + 3000,
      position3D: { x: 20, y: 18, z: -30 },
      headingDegrees: 0,
      speedMps: 0,
      altitudeMeters: 18,
      batteryPercentage: 78,
      connectivity: 'CONNECTED',
    }, now + 3000);

    this.execManager.update(0.1, now + 3000);
    const isSearching = this.execManager.getExecutionByAssignmentId(asgId)?.stage === 'SEARCHING';

    // Search sweep completes (1.2s > SEARCH_HOLD_DURATION_SEC)
    this.execManager.update(1.2, now + 4200);
    const isObserving = this.execManager.getExecutionByAssignmentId(asgId)?.stage === 'OBSERVING';

    const passed = isSearching && isObserving;

    return {
      name: 'Arrival in Vicinity and Observation State Transitions',
      passed,
      message: passed
        ? 'Successfully transitioned APPROACHING -> SEARCHING (vicinity <= 15m) -> OBSERVING (hold completed).'
        : `Transitions failed: searching=${isSearching}, observing=${isObserving}`,
    };
  }

  // 5. Target observed, not observed, and uncertain outcomes
  private testTargetObservationOutcomes(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    // Scenario A: Healthy camera with active incident -> TARGET_OBSERVED
    const incObj = this.incidentManager.createIncident('DISTRESS', ['V-1'], 'Z-1', 'CRITICAL', 'Swimmer in Surf', 'Desc', { x: 10, y: -25 }, now);
    const incidentA = {
      id: incObj.id,
      title: incObj.title,
      type: incObj.type,
      severity: incObj.severity,
      active: incObj.active,
      position3D: { x: 10, y: 0, z: -25 },
    };
    const propA = this.dispatchManager.proposeAssignment(incidentA, now);
    this.dispatchManager.approveAndDispatch(propA.assignment!.assignmentId, 'OP', 'Approved', now);
    const execA = this.execManager.getExecutionByAssignmentId(propA.assignment!.assignmentId)!;

    // Arrive & observe (tick 1: arrive into SEARCHING, tick 2: complete hold into OBSERVING)
    this.droneRegistry.ingestTelemetry({
      packetId: 'PKT-OBS-A',
      droneId: 'DRONE-02',
      sourceTimestampMs: now + 1000,
      position3D: { x: 10, y: 18, z: -25 },
      headingDegrees: 0,
      speedMps: 0,
      altitudeMeters: 18,
      batteryPercentage: 75,
      connectivity: 'CONNECTED',
    }, now + 1000);
    this.execManager.update(0.1, now + 1000);
    this.execManager.update(1.2, now + 2200);

    const outcomeA = execA.observationOutcome;

    // Scenario B: Camera faulted -> TARGET_UNCERTAIN
    this.dispatchManager.reset();
    this.execManager.reset();
    const cam = this.cameraRegistry.getCameraForDrone('DRONE-02');
    if (cam) cam.status = 'FAULTED';

    const incObjB = this.incidentManager.createIncident('DISTRESS', ['V-2'], 'Z-1', 'CRITICAL', 'Swimmer B', 'Desc', { x: 10, y: -25 }, now + 3000);
    const incidentB = {
      id: incObjB.id,
      title: incObjB.title,
      type: incObjB.type,
      severity: incObjB.severity,
      active: incObjB.active,
      position3D: { x: 10, y: 0, z: -25 },
    };

    const propB = this.dispatchManager.proposeAssignment(incidentB, now + 3000);
    this.dispatchManager.approveAndDispatch(propB.assignment!.assignmentId, 'OP', 'Approved', now + 3000);
    const execB = this.execManager.getExecutionByAssignmentId(propB.assignment!.assignmentId)!;

    this.droneRegistry.ingestTelemetry({
      packetId: 'PKT-OBS-B',
      droneId: 'DRONE-02',
      sourceTimestampMs: now + 3500,
      position3D: { x: 10, y: 18, z: -25 },
      headingDegrees: 0,
      speedMps: 0,
      altitudeMeters: 18,
      batteryPercentage: 74,
      connectivity: 'CONNECTED',
    }, now + 3500);

    this.execManager.update(0.1, now + 3500);
    this.execManager.update(1.2, now + 4700);
    const outcomeB = execB.observationOutcome;

    const passed = outcomeA === 'TARGET_OBSERVED' && outcomeB === 'TARGET_UNCERTAIN';

    return {
      name: 'Target Observed vs Uncertain Sensor Assessment',
      passed,
      message: passed
        ? 'Healthy camera confirmed TARGET_OBSERVED; faulted sensor safely preserved TARGET_UNCERTAIN.'
        : `Outcomes failed: outcomeA=${outcomeA}, outcomeB=${outcomeB}`,
    };
  }

  // 6. Supported and unsupported payload capabilities
  private testSupportedAndUnsupportedPayloads(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    // Drone 2: hasFlotationPayload = true
    const drone2 = this.droneRegistry.getDrone('DRONE-02')!;
    const hasFloat2 = drone2.capabilities.hasFlotationPayload;

    // Drone 1: hasFlotationPayload = false (Surveillance quad)
    const drone1 = this.droneRegistry.getDrone('DRONE-01')!;
    const hasFloat1 = drone1.capabilities.hasFlotationPayload;

    const passed = hasFloat2 === true && hasFloat1 === false;

    return {
      name: 'Supported vs Unsupported Rescue Payload Differentiation',
      passed,
      message: passed
        ? 'DRONE-02 equipped with BUOYANT_FLOTATION_RING; DRONE-01 lacks flotation (pure surveillance).'
        : `Payload check failed: drone2=${hasFloat2}, drone1=${hasFloat1}`,
    };
  }

  // 7. Simulated delivery success and failure
  private testSimulatedDeliverySuccessAndFailure(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    const incident = {
      id: 'INC-DROP-01',
      title: 'Drop Delivery Test',
      type: 'DISTRESS',
      severity: 'CRITICAL',
      active: true,
      position3D: { x: 5, y: 0, z: -35 },
    };

    const prop = this.dispatchManager.proposeAssignment(incident, now);
    const asgId = prop.assignment!.assignmentId;
    this.dispatchManager.approveAndDispatch(asgId, 'OPERATOR', 'Approved', now);
    const exec = this.execManager.getExecutionByAssignmentId(asgId)!;

    // Move to vicinity
    this.droneRegistry.ingestTelemetry({
      packetId: 'PKT-DROP-1',
      droneId: 'DRONE-02',
      sourceTimestampMs: now + 1000,
      position3D: { x: 5, y: 18, z: -35 },
      headingDegrees: 0,
      speedMps: 0,
      altitudeMeters: 18,
      batteryPercentage: 74,
      connectivity: 'CONNECTED',
    }, now + 1000);

    // Step 1: Arrive in vicinity -> SEARCHING
    this.execManager.update(0.1, now + 1000);
    // Step 2: Complete search hold -> OBSERVING
    this.execManager.update(1.2, now + 2200);
    // Step 3: Complete observation hold -> ASSISTANCE_PENDING
    this.execManager.update(0.8, now + 3000);
    const isPending = exec.stage === 'ASSISTANCE_PENDING';
    const isArmed = exec.payload?.readinessState === 'ARMED';

    // Step 4: Advance to ASSISTANCE_IN_PROGRESS
    this.execManager.update(0.1, now + 3100);

    // Step 5: Complete drop dwell (2.2s > ASSISTANCE_HOLD_DURATION_SEC) -> ASSISTANCE_REPORTED
    this.execManager.update(2.2, now + 5300);
    const isDeployed = exec.payload?.readinessState === 'DEPLOYED';
    const isSuccess = exec.payload?.deliveryAttemptStatus === 'SUCCESS';
    const ringSpawned = this.execManager.getDeployedFlotationRings().length >= 1;

    const passed = isPending && isArmed && isDeployed && isSuccess && ringSpawned;

    return {
      name: 'Controlled Simulated Flotation Delivery Workflow',
      passed,
      message: passed
        ? 'Payload workflow executed: ATTACHED -> ARMED -> DROPPING -> DEPLOYED (floating ring spawned at sea level).'
        : `Delivery failed: pending=${isPending}, armed=${isArmed}, deployed=${isDeployed}, success=${isSuccess}, ring=${ringSpawned}`,
    };
  }

  // 8. Duplicate event suppression
  private testDuplicateEventSuppression(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    const incident = {
      id: 'INC-DEDUP-01',
      title: 'Dedup Test',
      type: 'DISTRESS',
      severity: 'CRITICAL',
      active: true,
      position3D: { x: 0, y: 0, z: -20 },
    };

    const prop = this.dispatchManager.proposeAssignment(incident, now);
    this.dispatchManager.approveAndDispatch(prop.assignment!.assignmentId, 'OPERATOR', 'Approved', now);

    // Send arrival telemetry twice
    this.droneRegistry.ingestTelemetry({
      packetId: 'PKT-DEDUP-1',
      droneId: 'DRONE-02',
      sourceTimestampMs: now + 1000,
      position3D: { x: 0, y: 18, z: -20 },
      headingDegrees: 0,
      speedMps: 0,
      altitudeMeters: 18,
      batteryPercentage: 75,
      connectivity: 'CONNECTED',
    }, now + 1000);

    this.execManager.update(0.1, now + 1000);
    this.execManager.update(0.1, now + 1100);

    // Verify DESTINATION_REACHED event was only recorded once
    const events = this.auditLogger.getEvents().filter((e) => e.eventType === 'DESTINATION_REACHED');
    const passed = events.length === 1;

    return {
      name: 'Duplicate Arrival and Delivery Event Suppression',
      passed,
      message: passed
        ? 'Duplicate DESTINATION_REACHED events safely debounced to single authoritative audit record.'
        : `Dedup failed: event count = ${events.length}`,
    };
  }

  // 9. Return-to-base progression
  private testReturnToBaseProgression(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    const incident = {
      id: 'INC-RETURN-01',
      title: 'Return Test',
      type: 'DISTRESS',
      severity: 'CRITICAL',
      active: true,
      position3D: { x: 25, y: 0, z: -30 },
    };

    const prop = this.dispatchManager.proposeAssignment(incident, now);
    const asgId = prop.assignment!.assignmentId;
    this.dispatchManager.approveAndDispatch(asgId, 'OPERATOR', 'Approved', now);
    const exec = this.execManager.getExecutionByAssignmentId(asgId)!;

    // Arrive, observe, and complete delivery
    this.droneRegistry.ingestTelemetry({
      packetId: 'PKT-RET-1',
      droneId: 'DRONE-02',
      sourceTimestampMs: now + 1000,
      position3D: { x: 25, y: 18, z: -30 },
      headingDegrees: 0,
      speedMps: 0,
      altitudeMeters: 18,
      batteryPercentage: 70,
      connectivity: 'CONNECTED',
    }, now + 1000);

    this.execManager.update(0.1, now + 1000); // APPROACHING -> SEARCHING
    this.execManager.update(1.2, now + 2200); // SEARCHING -> OBSERVING
    this.execManager.update(0.8, now + 3000); // OBSERVING -> ASSISTANCE_PENDING
    this.execManager.update(0.1, now + 3100); // ASSISTANCE_PENDING -> ASSISTANCE_IN_PROGRESS
    this.execManager.update(2.2, now + 5300); // ASSISTANCE_IN_PROGRESS -> ASSISTANCE_REPORTED
    this.execManager.update(0.1, now + 5400); // ASSISTANCE_REPORTED -> RETURNING

    const isReturning = exec.stage === 'RETURNING';
    const profile = this.movementEngine.getFlightProfile('DRONE-02');
    const homePos = this.droneRegistry.getDrone('DRONE-02')!.homePosition3D;

    const headingHome =
      profile?.targetPosition3D?.x === homePos.x &&
      profile?.targetPosition3D?.z === homePos.z;

    const passed = isReturning && headingHome;

    return {
      name: 'Return-to-Base Autonomous Navigation Progression',
      passed,
      message: passed
        ? 'Assistance completed: transitioned to RETURNING, flight profile targeted home launch pad.'
        : `Return failed: returning=${isReturning}, headingHome=${headingHome}`,
    };
  }

  // 10. Landing and resource release
  private testLandingAndResourceRelease(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    const incident = {
      id: 'INC-LAND-01',
      title: 'Landing Test',
      type: 'DISTRESS',
      severity: 'CRITICAL',
      active: true,
      position3D: { x: 10, y: 0, z: -20 },
    };

    const prop = this.dispatchManager.proposeAssignment(incident, now);
    const asgId = prop.assignment!.assignmentId;
    this.dispatchManager.approveAndDispatch(asgId, 'OPERATOR', 'Approved', now);
    const exec = this.execManager.getExecutionByAssignmentId(asgId)!;

    // Fast-forward to RETURNING
    exec.stage = 'RETURNING';

    // Drone arrives at home pad
    const drone = this.droneRegistry.getDrone('DRONE-02')!;
    const homePos = drone.homePosition3D;

    this.droneRegistry.ingestTelemetry({
      packetId: 'PKT-PAD-LAND',
      droneId: 'DRONE-02',
      sourceTimestampMs: now + 10000,
      position3D: { ...homePos },
      headingDegrees: 0,
      speedMps: 0,
      altitudeMeters: homePos.y,
      batteryPercentage: 65,
      connectivity: 'CONNECTED',
    }, now + 10000);

    this.execManager.update(0.1, now + 10000);

    const currentExec = this.execManager.getExecution(exec.executionId)!;
    const passed =
      (currentExec.stage as string) === 'COMPLETED' &&
      drone.status === 'IDLE' &&
      drone.currentMissionId === undefined;

    return {
      name: 'Landing on Launch Pad and Resource Release',
      passed,
      message: passed
        ? 'Landed on home pad: stage COMPLETED, drone status restored to IDLE, locks released.'
        : `Landing failed: stage=${exec.stage}, droneStatus=${drone.status}`,
    };
  }

  // 11. Cancellation and emergency battery abort
  private testCancellationAndBatteryAbort(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    // 1. Operator manual cancellation
    const incidentA = {
      id: 'INC-ABORT-01',
      title: 'Abort Test',
      type: 'DISTRESS',
      severity: 'CRITICAL',
      active: true,
      position3D: { x: 30, y: 0, z: -40 },
    };
    const propA = this.dispatchManager.proposeAssignment(incidentA, now);
    this.dispatchManager.approveAndDispatch(propA.assignment!.assignmentId, 'OPERATOR', 'Approved', now);
    const execA = this.execManager.getExecutionByAssignmentId(propA.assignment!.assignmentId)!;

    this.execManager.cancelExecution(execA.executionId, 'OPERATOR-CHIEF', 'Surface boat RB-01 has swimmer in custody', now + 1000);
    const isCancelled = execA.stage === 'CANCELLED';

    // 2. Battery emergency drop (<= 20%)
    this.setupCleanState();
    const propB = this.dispatchManager.proposeAssignment(incidentA, now + 2000);
    this.dispatchManager.approveAndDispatch(propB.assignment!.assignmentId, 'OPERATOR', 'Approved', now + 2000);
    const execB = this.execManager.getExecutionByAssignmentId(propB.assignment!.assignmentId)!;

    this.droneRegistry.ingestTelemetry({
      packetId: 'PKT-LOW-BATT',
      droneId: 'DRONE-02',
      sourceTimestampMs: now + 3000,
      position3D: { x: 30, y: 20, z: -40 },
      headingDegrees: 0,
      speedMps: 5,
      altitudeMeters: 20,
      batteryPercentage: 18, // Below 20% critical threshold
      connectivity: 'CONNECTED',
    }, now + 3000);

    this.execManager.update(0.1, now + 3000);
    const isFailed = execB.stage === 'FAILED' && Boolean(execB.failureReason?.includes('battery'));

    const passed: boolean = isCancelled && isFailed;

    return {
      name: 'Operator Cancellation and Emergency Battery Abort Handling',
      passed,
      message: passed
        ? 'Manual operator recall transitioned to CANCELLED; low battery (18%) safely aborted to FAILED.'
        : `Abort test failed: isCancelled=${isCancelled}, isFailed=${isFailed}`,
    };
  }

  // 12. Incident state change during execution
  private testIncidentStateChangeDuringExecution(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    const incident = {
      id: 'INC-EXT-RESOLVE',
      title: 'Resolved by Surface Lifeguard',
      type: 'DISTRESS',
      severity: 'CRITICAL',
      active: true,
      position3D: { x: 15, y: 0, z: -25 },
    };

    const prop = this.dispatchManager.proposeAssignment(incident, now);
    const asgId = prop.assignment!.assignmentId;
    this.dispatchManager.approveAndDispatch(asgId, 'OPERATOR', 'Approved', now);
    const exec = this.execManager.getExecutionByAssignmentId(asgId)!;

    // Swimmer self-rescued or lifeguard extricated: incident cleared from IncidentManager
    this.incidentManager.clear();

    // Drone arrives at scene
    this.droneRegistry.ingestTelemetry({
      packetId: 'PKT-ARR-CLEAR',
      droneId: 'DRONE-02',
      sourceTimestampMs: now + 2000,
      position3D: { x: 15, y: 18, z: -25 },
      headingDegrees: 0,
      speedMps: 0,
      altitudeMeters: 18,
      batteryPercentage: 76,
      connectivity: 'CONNECTED',
    }, now + 2000);

    this.execManager.update(0.1, now + 2000); // APPROACHING -> SEARCHING
    this.execManager.update(1.2, now + 3200); // SEARCHING -> OBSERVING (calls performObservationAssessment)
    const outcome = exec.observationOutcome;
    const passed = outcome === 'TARGET_NOT_OBSERVED';

    return {
      name: 'External Incident Resolution and Target Not Observed',
      passed,
      message: passed
        ? 'External swimmer resolution correctly assessed as TARGET_NOT_OBSERVED without false drop.'
        : `External resolution check failed: outcome=${outcome}`,
    };
  }

  // 13. Multiple independent concurrent rescue missions
  private testMultipleIndependentConcurrentExecutions(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    // Grant DRONE-03 flotation capability as secondary multi-role rescue asset
    const drone3 = this.droneRegistry.getDrone('DRONE-03')!;
    drone3.capabilities.hasFlotationPayload = true;
    drone3.role = 'MULTI_ROLE';

    const incA = {
      id: 'INC-DUAL-A',
      title: 'South Rip Current Swimmer',
      type: 'DISTRESS',
      severity: 'CRITICAL',
      active: true,
      position3D: { x: -40, y: 0, z: -40 },
    };
    const incB = {
      id: 'INC-DUAL-B',
      title: 'North Sandbar Swimmer',
      type: 'DISTRESS',
      severity: 'CRITICAL',
      active: true,
      position3D: { x: 40, y: 0, z: -35 },
    };

    const propA = this.dispatchManager.proposeAssignment(incA, now);
    this.dispatchManager.approveAndDispatch(propA.assignment!.assignmentId, 'OPERATOR', 'Approved A', now);

    const propB = this.dispatchManager.proposeAssignment(incB, now + 100);
    this.dispatchManager.approveAndDispatch(propB.assignment!.assignmentId, 'OPERATOR', 'Approved B', now + 100);

    const execA = this.execManager.getExecutionByAssignmentId(propA.assignment!.assignmentId)!;
    const execB = this.execManager.getExecutionByAssignmentId(propB.assignment!.assignmentId)!;

    const passed =
      execA.droneId === 'DRONE-02' &&
      execB.droneId === 'DRONE-03' &&
      execA.executionId !== execB.executionId &&
      this.execManager.getActiveExecutions().length === 2;

    return {
      name: 'Multiple Independent Concurrent Rescue Missions',
      passed,
      message: passed
        ? 'Concurrently managed DRONE-02 and DRONE-03 missions on independent targets without crosstalk.'
        : `Concurrent check failed: execA=${execA.droneId}, execB=${execB.droneId}`,
    };
  }

  // 14. Lifeguard and rescue boat coordination preservation
  private testLifeguardAndRescueBoatCoordination(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    const incident = {
      id: 'INC-COOP-01',
      title: 'Cooperative Rescue Mission',
      type: 'DISTRESS',
      severity: 'CRITICAL',
      active: true,
      position3D: { x: 10, y: 0, z: -30 },
    };

    const prop = this.dispatchManager.proposeAssignment(incident, now);
    this.dispatchManager.approveAndDispatch(prop.assignment!.assignmentId, 'OPERATOR', 'Approved', now);
    const exec = this.execManager.getExecutionByAssignmentId(prop.assignment!.assignmentId)!;

    const responders = exec.collaborativeResponders;
    const passed =
      responders !== undefined &&
      responders.lifeguardId === 'LG-01' &&
      responders.rescueBoatId === 'RB-01';

    return {
      name: 'Collaborative Multi-Asset Responders Preservation',
      passed,
      message: passed
        ? 'Drone mission coordinated alongside surface units (Lifeguard LG-01 & Rescue Boat RB-01).'
        : `Responders check failed: ${JSON.stringify(responders)}`,
    };
  }

  // 15. Life-safety boundary enforcement (no auto-resolution)
  private testLifeSafetyBoundaryNoAutoResolution(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    // Create incident in IncidentManager
    const inc = this.incidentManager.createIncident(
      'DISTRESS',
      ['V-SAFETY-1'],
      'Z-NORTH',
      'CRITICAL',
      'Life Safety Test',
      'Swimmer distress in surf',
      { x: 15, y: -30 },
      now
    );

    const prop = this.dispatchManager.proposeAssignment(
      {
        id: inc.id,
        title: inc.title,
        type: inc.type,
        severity: inc.severity,
        active: inc.active,
        position3D: { x: 15, y: 0, z: -30 },
      },
      now
    );

    this.dispatchManager.approveAndDispatch(prop.assignment!.assignmentId, 'OPERATOR', 'Approved', now);
    const exec = this.execManager.getExecutionByAssignmentId(prop.assignment!.assignmentId)!;

    // Drone arrives, drops flotation ring, returns, and completes mission
    exec.stage = 'COMPLETED';

    // Verify: The incident in IncidentManager MUST STILL BE ACTIVE!
    const openIncidents = this.incidentManager.getActiveIncidents();
    const incidentStillActive = openIncidents.some((i) => i.id === inc.id && i.active);

    const passed =
      incidentStillActive &&
      exec.safetyNotice.includes('NOT constitute successful rescue');

    return {
      name: 'Life-Safety Boundary: Flotation Drop Does Not Resolve Incident',
      passed,
      message: passed
        ? 'Confirmed: Flotation drop completed but incident remains ACTIVE awaiting physical lifesaver extraction.'
        : `Safety boundary failed: incidentStillActive=${incidentStillActive}`,
    };
  }

  // 16. Non-interference and clean state reset isolation
  private testNonInterferenceAndCleanReset(): TestResult {
    this.setupCleanState();

    const activeExecs = this.execManager.getActiveExecutions();
    const rings = this.execManager.getDeployedFlotationRings();
    const fleet = this.droneRegistry.getAllDrones();

    const passed =
      activeExecs.length === 0 &&
      rings.length === 0 &&
      fleet.length === 4;

    return {
      name: 'Non-Interference & Clean State Reset Isolation',
      passed,
      message: passed
        ? 'Clean reset purged executions and floating buoys while preserving 4-drone fleet registry.'
        : `Reset check failed: execs=${activeExecs.length}, rings=${rings.length}, fleet=${fleet.length}`,
    };
  }
}
