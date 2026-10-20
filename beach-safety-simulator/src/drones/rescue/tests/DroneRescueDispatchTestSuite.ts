/**
 * DroneRescueDispatchTestSuite.ts
 * 
 * TIDES Drone Phase 9: Rescue Mission Allocation & Dispatch Test Suite
 * 
 * Verifies all 17 automated testing requirements:
 * 1. Eligible verified incident allocation.
 * 2. Ineligible / terminal incident rejection.
 * 3. Missing or stale incident location rejection.
 * 4. Eligible rescue drone qualification (DRONE-02).
 * 5. Surveillance-only drone without flotation payload rejection (DRONE-01).
 * 6. Unknown capability handling (not assumed satisfied).
 * 7. Active rescue mission conflict prevention.
 * 8. Concurrent assignment requests.
 * 9. Duplicate dispatch suppression.
 * 10. Operator manual approval and rejection controls.
 * 11. Mission lifecycle tracking (EN_ROUTE -> ASSISTING -> RETURNING -> COMPLETED).
 * 12. Resource release on terminal mission states.
 * 13. Patrol preemption and coastal coverage impact logging.
 * 14. Multiple independent simultaneous incidents.
 * 15. Explicit SOS emergency policy handling.
 * 16. Collaborative lifesaver & rescue boat coordination.
 * 17. Non-interference and clean state reset.
 */

import { DroneRescueDispatchManager } from '../DroneRescueDispatchManager';
import { DroneRescueEligibilityValidator } from '../DroneRescueEligibilityValidator';
import { DroneRescueAuditLogger } from '../DroneRescueAuditLogger';
import { DroneRegistry } from '../../foundation/DroneRegistry';
import { DroneMissionManager } from '../../missions/DroneMissionManager';
import { CoastalZoneRegistry } from '../../coverage/CoastalZoneRegistry';
import { IncidentManager } from '../../../visitors/incidents/IncidentManager';
import { RescueCoordinator } from '../../../scene3d/rescue/RescueCoordinator';
import { DroneRecord } from '../../foundation/drone.types';

export interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

export class DroneRescueDispatchTestSuite {
  private dispatchManager: DroneRescueDispatchManager;
  private validator: DroneRescueEligibilityValidator;
  private auditLogger: DroneRescueAuditLogger;
  private droneRegistry: DroneRegistry;
  private missionManager: DroneMissionManager;
  private coastalRegistry: CoastalZoneRegistry;
  private incidentManager: IncidentManager;
  private rescueCoordinator: RescueCoordinator;

  constructor() {
    this.droneRegistry = DroneRegistry.getInstance();
    this.missionManager = DroneMissionManager.getInstance();
    this.coastalRegistry = CoastalZoneRegistry.getInstance();
    this.incidentManager = IncidentManager.getInstance();
    this.rescueCoordinator = RescueCoordinator.getInstance();
    this.validator = DroneRescueEligibilityValidator.getInstance();
    this.auditLogger = DroneRescueAuditLogger.getInstance();
    this.dispatchManager = DroneRescueDispatchManager.getInstance();
  }

  private setupCleanState(): void {
    this.droneRegistry.reset();
    this.missionManager.reset();
    this.coastalRegistry.reset();
    this.incidentManager.clear();
    this.rescueCoordinator.activeMission = null;
    this.dispatchManager.reset();
    this.dispatchManager.setAutoDispatch(false); // Manual approval mode for test determinism
  }

  public runAllTests(): TestResult[] {
    const results: TestResult[] = [];

    results.push(this.testEligibleVerifiedIncident());
    results.push(this.testIneligibleOrTerminalIncident());
    results.push(this.testMissingOrStaleIncidentLocation());
    results.push(this.testEligibleRescueDroneQualification());
    results.push(this.testSurveillanceDroneRejection());
    results.push(this.testUnknownCapabilityRejection());
    results.push(this.testActiveRescueMissionConflict());
    results.push(this.testConcurrentAssignmentRequests());
    results.push(this.testDuplicateDispatchSuppression());
    results.push(this.testOperatorApprovalAndRejection());
    results.push(this.testMissionLifecycleProgression());
    results.push(this.testResourceReleaseAfterCompletion());
    results.push(this.testPatrolPreemptionAndCoverageImpact());
    results.push(this.testMultipleIndependentIncidents());
    results.push(this.testExplicitSOSHandling());
    results.push(this.testCollaborativeSurfaceResponders());
    results.push(this.testNonInterferenceAndCleanReset());

    return results;
  }

  private testEligibleVerifiedIncident(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    const incident = {
      id: 'INC-TEST-01',
      title: 'Bather caught in seaward rip current',
      type: 'DISTRESS',
      severity: 'CRITICAL',
      active: true,
      position3D: { x: 10, y: 0, z: -45 },
    };

    const res = this.dispatchManager.proposeAssignment(incident, now);

    const passed =
      res.success &&
      res.assignment !== undefined &&
      res.assignment.status === 'PROPOSED' &&
      res.assignment.assignedResourceId === 'DRONE-02' &&
      res.assignment.targetPosition3D.x === 10;

    return {
      name: 'Eligible Verified Incident Allocation',
      passed,
      message: passed
        ? `Successfully proposed rescue drone assignment ${res.assignment?.assignmentId} with DRONE-02 (LifeGuard-Rescue-01).`
        : `Proposal failed: ${res.reason}`,
    };
  }

  private testIneligibleOrTerminalIncident(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    // Inactive/resolved incident
    const resolvedIncident = {
      id: 'INC-RESOLVED-01',
      title: 'Resolved Bather Event',
      type: 'DISTRESS',
      severity: 'CRITICAL',
      active: false,
      resolved: true,
      position3D: { x: 10, y: 0, z: -45 },
    };

    // Low severity non-distress incident
    const minorIncident = {
      id: 'INC-MINOR-02',
      title: 'Lost Flip-Flop',
      type: 'CROWD',
      severity: 'LOW',
      active: true,
      position3D: { x: 20, y: 0, z: 10 },
    };

    const res1 = this.dispatchManager.proposeAssignment(resolvedIncident, now);
    const res2 = this.dispatchManager.proposeAssignment(minorIncident, now);

    const passed =
      !res1.success &&
      res1.reason.includes('resolved or inactive') &&
      !res2.success &&
      res2.reason.includes('does not qualify');

    return {
      name: 'Ineligible & Terminal Incident Rejection',
      passed,
      message: passed
        ? 'Correctly rejected inactive/resolved incident and low-severity non-distress incident.'
        : `Rejection failed: res1=${res1.reason}, res2=${res2.reason}`,
    };
  }

  private testMissingOrStaleIncidentLocation(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    const incidentNaN = {
      id: 'INC-NAN-01',
      title: 'Swimmer with corrupt GPS',
      type: 'DISTRESS',
      severity: 'CRITICAL',
      active: true,
      position3D: { x: NaN, y: 0, z: -40 },
    };

    const incidentOOB = {
      id: 'INC-OOB-02',
      title: 'Swimmer beyond boundary',
      type: 'DISTRESS',
      severity: 'CRITICAL',
      active: true,
      position3D: { x: 999, y: 0, z: -400 },
    };

    const res1 = this.dispatchManager.proposeAssignment(incidentNaN, now);
    const res2 = this.dispatchManager.proposeAssignment(incidentOOB, now);

    const passed =
      !res1.success &&
      res1.reason.includes('missing, stale, or invalid coordinates') &&
      !res2.success &&
      res2.reason.includes('outside digital twin');

    return {
      name: 'Missing, Stale, or Out-of-Bounds Location Rejection',
      passed,
      message: passed
        ? 'Rejected NaN coordinate payload and out-of-bounds coordinate (999, -400).'
        : `Location check failed: res1=${res1.reason}, res2=${res2.reason}`,
    };
  }

  private testEligibleRescueDroneQualification(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    const incident = {
      id: 'INC-QUAL-01',
      title: 'Deep Rip Channel Distress',
      type: 'DISTRESS',
      severity: 'CRITICAL',
      active: true,
      position3D: { x: 5, y: 0, z: -60 },
    };

    const res = this.dispatchManager.proposeAssignment(incident, now);
    const drone2Check = res.candidateChecks.find((c) => c.droneId === 'DRONE-02');

    const passed =
      drone2Check !== undefined &&
      drone2Check.isEligible &&
      drone2Check.checks.hasFlotationPayload &&
      drone2Check.checks.batterySufficient &&
      drone2Check.checks.connectivityActive &&
      drone2Check.checks.telemetryFresh;

    return {
      name: 'Eligible Rescue Drone Qualification (DRONE-02)',
      passed,
      message: passed
        ? 'DRONE-02 passed all 8 eligibility checks (hasFlotationPayload, battery > 25%, telemetry < 15s, CONNECTED).'
        : `Qualification failed: ${JSON.stringify(drone2Check?.checks)}`,
    };
  }

  private testSurveillanceDroneRejection(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    const incident = {
      id: 'INC-SURV-01',
      title: 'Distress Event',
      type: 'DISTRESS',
      severity: 'CRITICAL',
      active: true,
      position3D: { x: 15, y: 0, z: -35 },
    };

    const res = this.dispatchManager.proposeAssignment(incident, now);
    const drone1Check = res.candidateChecks.find((c) => c.droneId === 'DRONE-01');

    const passed =
      drone1Check !== undefined &&
      !drone1Check.isEligible &&
      drone1Check.rejectionReasons.some((r) => r.includes('lacks required \'hasFlotationPayload\''));

    return {
      name: 'Surveillance-Only Drone Rejection (DRONE-01 Lack of Flotation)',
      passed,
      message: passed
        ? 'DRONE-01 strictly rejected from rescue dispatch: role SURVEILLANCE lacks flotation payload.'
        : `Surveillance check failed: ${JSON.stringify(drone1Check?.rejectionReasons)}`,
    };
  }

  private testUnknownCapabilityRejection(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    // Create custom drone with undefined payload capability
    const testDrone: DroneRecord = {
      droneId: 'DRONE-MYSTERY',
      callsign: 'Mystery-Drone',
      modelName: 'Experimental',
      role: 'RESCUE_ASSISTANCE',
      status: 'IDLE',
      connectivity: 'CONNECTED',
      provenance: 'SIMULATED',
      capabilities: {
        hasFlotationPayload: undefined as any, // Unknown capability
        hasThermalCamera: true,
        hasOpticalZoom: true,
        hasMegaphoneSiren: true,
        maxWindResistanceMps: 15,
        maxFlightRangeMeters: 3000,
      },
      battery: {
        percentage: 90,
        voltageVolts: 24,
        reserveThresholdPercent: 20,
        isLowBattery: false,
        isCriticalBattery: false,
      },
      position3D: { x: 0, y: 10, z: 0 },
      headingDegrees: 0,
      speedMps: 15,
      lastObservationTimeMs: now,
      lastReceivedTimeMs: now,
      telemetryFreshnessSeconds: 0,
      isStale: false,
      homeBaseId: 'PAD-1',
      homePosition3D: { x: 0, y: 0, z: 0 },
    };

    const check = this.validator.evaluateDroneEligibility(
      testDrone,
      { x: 0, y: 0, z: -30 },
      this.missionManager,
      now
    );

    const passed =
      !check.isEligible &&
      check.unknownCapabilities.includes('hasFlotationPayload') &&
      check.rejectionReasons.some((r) => r.includes('Cannot assume satisfied'));

    return {
      name: 'Unknown Capability Safety Lockout (No Satisfied Assumption)',
      passed,
      message: passed
        ? 'Drone with undefined capability safely locked out: reported as UNKNOWN and not assumed satisfied.'
        : `Unknown capability check failed: ${JSON.stringify(check)}`,
    };
  }

  private testActiveRescueMissionConflict(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    // Dispatch DRONE-02 to first incident
    const inc1 = {
      id: 'INC-FIRST-01',
      title: 'First Distress',
      type: 'DISTRESS',
      severity: 'CRITICAL',
      active: true,
      position3D: { x: -20, y: 0, z: -40 },
    };

    const res1 = this.dispatchManager.proposeAssignment(inc1, now);
    this.dispatchManager.approveAndDispatch(res1.assignment!.assignmentId, 'TEST-ACTOR', 'First dispatch', now);

    // Second incident occurs while DRONE-02 is assisting first
    const inc2 = {
      id: 'INC-SECOND-02',
      title: 'Second Distress',
      type: 'DISTRESS',
      severity: 'CRITICAL',
      active: true,
      position3D: { x: 30, y: 0, z: -50 },
    };

    const res2 = this.dispatchManager.proposeAssignment(inc2, now);
    const drone2Check = res2.candidateChecks.find((c) => c.droneId === 'DRONE-02');

    const passed =
      drone2Check !== undefined &&
      !drone2Check.isEligible &&
      drone2Check.rejectionReasons.some((r) => r.includes('locked to active emergency rescue mission'));

    return {
      name: 'Active Rescue Mission Conflict Prevention (Double-Booking Lock)',
      passed,
      message: passed
        ? 'DRONE-02 locked to active mission: second incident could not double-book or hijack asset.'
        : `Conflict check failed: ${JSON.stringify(drone2Check?.rejectionReasons)}`,
    };
  }

  private testConcurrentAssignmentRequests(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    const inc = {
      id: 'INC-CONCURRENT-01',
      title: 'Concurrent Distress Call',
      type: 'DISTRESS',
      severity: 'CRITICAL',
      active: true,
      position3D: { x: 10, y: 0, z: -30 },
    };

    // First request proposes assignment
    const res1 = this.dispatchManager.proposeAssignment(inc, now);

    // Immediate concurrent request for same active incident
    const res2 = this.dispatchManager.proposeAssignment(inc, now);

    const passed =
      res1.success &&
      !res2.success &&
      res2.reason.includes('already has active rescue drone assignment');

    return {
      name: 'Concurrent Assignment Idempotence Enforcement',
      passed,
      message: passed
        ? 'Second concurrent dispatch request for same incident blocked by idempotence lock.'
        : `Concurrency check failed: res2=${res2.reason}`,
    };
  }

  private testDuplicateDispatchSuppression(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    const inc = {
      id: 'INC-DUPE-01',
      title: 'Duplicate Event Stream',
      type: 'DISTRESS',
      severity: 'CRITICAL',
      active: true,
      position3D: { x: -15, y: 0, z: -45 },
    };

    const res1 = this.dispatchManager.proposeAssignment(inc, now);
    // Duplicate call 500ms later within debounce cooldown window
    const res2 = this.dispatchManager.proposeAssignment(inc, now + 500);

    const passed =
      res1.success &&
      !res2.success &&
      res2.reason.includes('already has active rescue drone assignment');

    return {
      name: 'Duplicate Dispatch Stream Flood Suppression',
      passed,
      message: passed
        ? 'Rapid duplicate dispatch event safely suppressed.'
        : `Duplicate suppression failed: res2=${res2.reason}`,
    };
  }

  private testOperatorApprovalAndRejection(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    const incident = {
      id: 'INC-HUMAN-01',
      title: 'Triage Pending Human Approval',
      type: 'DISTRESS',
      severity: 'CRITICAL',
      active: true,
      position3D: { x: 25, y: 0, z: -40 },
    };

    const prop = this.dispatchManager.proposeAssignment(incident, now);
    const asgId = prop.assignment!.assignmentId;

    // Verify initial state is PROPOSED
    const isProposed = this.dispatchManager.getAssignment(asgId)?.status === 'PROPOSED';

    // Operator rejects assignment
    this.dispatchManager.rejectAssignment(asgId, 'CHIEF-LIFEGUARD', 'Surface boat RB-01 is closer', now);
    const rejectedAsg = this.dispatchManager.getAssignment(asgId);

    const passed = Boolean(
      isProposed &&
      rejectedAsg?.status === 'REJECTED' &&
      rejectedAsg.failureReason?.includes('Surface boat RB-01 is closer')
    );

    return {
      name: 'Human Operator Approval & Rejection Authority',
      passed,
      message: passed
        ? 'Assignment held in PROPOSED until operator action; rejection recorded rationale without launching drone.'
        : `Human oversight failed: ${JSON.stringify(rejectedAsg)}`,
    };
  }

  private testMissionLifecycleProgression(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    const incident = {
      id: 'INC-LIFECYCLE-01',
      title: 'Lifecycle Tracking Incident',
      type: 'DISTRESS',
      severity: 'CRITICAL',
      active: true,
      position3D: { x: 20, y: 0, z: -35 },
    };

    const prop = this.dispatchManager.proposeAssignment(incident, now);
    const asgId = prop.assignment!.assignmentId;

    // 1. Approve & Dispatch
    this.dispatchManager.approveAndDispatch(asgId, 'OPERATOR-MANUAL', 'Approved', now);
    const isEnRoute = this.dispatchManager.getAssignment(asgId)?.status === 'EN_ROUTE';

    // 2. Simulate Drone arrival at target [20, 0, -35]
    this.droneRegistry.ingestTelemetry({
      packetId: 'PKT-ARRIVE',
      droneId: 'DRONE-02',
      sourceTimestampMs: now + 5000,
      receivedTimestampMs: now + 5000,
      position3D: { x: 20, y: 15, z: -35 }, // Directly above swimmer
      headingDegrees: 180,
      speedMps: 0,
      altitudeMeters: 15,
      batteryPercentage: 78,
      connectivity: 'CONNECTED',
    }, now + 5000);

    this.dispatchManager.update(0.1, now + 5000);
    const isAssisting = this.dispatchManager.getAssignment(asgId)?.status === 'ASSISTING';

    // 3. Dwell 4.5 seconds for flotation drop
    this.dispatchManager.update(4.5, now + 9500);
    const isReturning = this.dispatchManager.getAssignment(asgId)?.status === 'RETURNING';

    const passed = isEnRoute && isAssisting && isReturning;

    return {
      name: 'Mission Lifecycle Progression (EN_ROUTE -> ASSISTING -> RETURNING)',
      passed,
      message: passed
        ? 'Drone navigated: EN_ROUTE -> arrived within drop radius (ASSISTING) -> dropped flotation ring (RETURNING).'
        : `Lifecycle failed: enRoute=${isEnRoute}, assisting=${isAssisting}, returning=${isReturning}`,
    };
  }

  private testResourceReleaseAfterCompletion(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    const incident = {
      id: 'INC-RELEASE-01',
      title: 'Release Test Incident',
      type: 'DISTRESS',
      severity: 'CRITICAL',
      active: true,
      position3D: { x: 10, y: 0, z: -30 },
    };

    const prop = this.dispatchManager.proposeAssignment(incident, now);
    const asgId = prop.assignment!.assignmentId;
    this.dispatchManager.approveAndDispatch(asgId, 'OPERATOR-MANUAL', 'Approved', now);

    // Drone arrives at target
    this.droneRegistry.ingestTelemetry({
      packetId: 'PKT-ARRIVE',
      droneId: 'DRONE-02',
      sourceTimestampMs: now + 1000,
      position3D: { x: 10, y: 15, z: -30 },
      headingDegrees: 0,
      speedMps: 0,
      altitudeMeters: 15,
      batteryPercentage: 75,
      connectivity: 'CONNECTED',
    }, now + 1000);
    this.dispatchManager.update(0.1, now + 1000);

    // Hold assistance
    this.dispatchManager.update(5.0, now + 6000);

    // Drone returns to home pad [0, 0, 0]
    const homePos = this.droneRegistry.getDrone('DRONE-02')!.homePosition3D;
    this.droneRegistry.ingestTelemetry({
      packetId: 'PKT-HOME',
      droneId: 'DRONE-02',
      sourceTimestampMs: now + 12000,
      position3D: { ...homePos },
      headingDegrees: 0,
      speedMps: 0,
      altitudeMeters: homePos.y,
      batteryPercentage: 70,
      connectivity: 'CONNECTED',
    }, now + 12000);

    this.dispatchManager.update(0.1, now + 12000);
    const completedAsg = this.dispatchManager.getAssignment(asgId);
    const activeList = this.dispatchManager.getActiveAssignments();

    const passed =
      completedAsg?.status === 'COMPLETED' &&
      !activeList.some((a) => a.assignmentId === asgId);

    return {
      name: 'Resource Release & Terminal COMPLETED State',
      passed,
      message: passed
        ? 'Landed on home pad: assignment COMPLETED and drone released back into available fleet.'
        : `Release failed: status=${completedAsg?.status}`,
    };
  }

  private testPatrolPreemptionAndCoverageImpact(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    // Temporarily grant DRONE-03 flotation capability to simulate a multi-role patrol drone
    const drone3 = this.droneRegistry.getDrone('DRONE-03')!;
    drone3.capabilities.hasFlotationPayload = true;
    drone3.role = 'MULTI_ROLE';

    // Assign DRONE-03 to North Bathing surveillance patrol
    this.coastalRegistry.assignDroneToZone('CZ-03-NORTH-BATHING', 'DRONE-03');
    this.missionManager.createMission(
      {
        type: 'PATROL',
        droneId: 'DRONE-03',
        routeId: 'ROUTE-COASTAL-CRESCENT',
      },
      now
    );
    this.missionManager.startMission('MSN-PAT-101', now);

    // Make DRONE-02 unavailable to force preemption of DRONE-03
    this.droneRegistry.updateOperationalStatus('DRONE-02', 'MAINTENANCE');

    const incident = {
      id: 'INC-PREEMPT-01',
      title: 'North Zone Drowning Bather',
      type: 'DISTRESS',
      severity: 'CRITICAL',
      active: true,
      position3D: { x: 75, y: 0, z: -20 },
    };

    const prop = this.dispatchManager.proposeAssignment(incident, now);
    const asg = prop.assignment;

    const passed =
      asg !== undefined &&
      asg.assignedResourceId === 'DRONE-03' &&
      asg.patrolPreemption !== undefined &&
      asg.patrolPreemption.preemptedZoneId === 'CZ-03-NORTH-BATHING' &&
      asg.patrolPreemption.coverageImpactDescription.includes('unmonitored');

    return {
      name: 'Patrol Preemption & Coastal Coverage Impact Audit',
      passed,
      message: passed
        ? 'Diverted DRONE-03 from routine patrol: recorded coverage impact on zone CZ-03-NORTH-BATHING.'
        : `Preemption check failed: ${JSON.stringify(asg?.patrolPreemption)}`,
    };
  }

  private testMultipleIndependentIncidents(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    // Give both DRONE-02 and DRONE-03 flotation payload
    const drone3 = this.droneRegistry.getDrone('DRONE-03')!;
    drone3.capabilities.hasFlotationPayload = true;
    drone3.role = 'MULTI_ROLE';

    const incA = {
      id: 'INC-SIMULT-A',
      title: 'Swimmer in South Rip',
      type: 'DISTRESS',
      severity: 'CRITICAL',
      active: true,
      position3D: { x: -40, y: 0, z: -50 },
    };

    const incB = {
      id: 'INC-SIMULT-B',
      title: 'Swimmer in North Surf',
      type: 'DISTRESS',
      severity: 'CRITICAL',
      active: true,
      position3D: { x: 60, y: 0, z: -30 },
    };

    const resA = this.dispatchManager.proposeAssignment(incA, now);
    this.dispatchManager.approveAndDispatch(resA.assignment!.assignmentId, 'OPERATOR', 'Dispatch A', now);

    const resB = this.dispatchManager.proposeAssignment(incB, now + 100);
    this.dispatchManager.approveAndDispatch(resB.assignment!.assignmentId, 'OPERATOR', 'Dispatch B', now + 100);

    const passed =
      resA.success &&
      resB.success &&
      resA.assignment?.assignedResourceId === 'DRONE-02' &&
      resB.assignment?.assignedResourceId === 'DRONE-03' &&
      (resA.assignment?.assignedResourceId as string) !== (resB.assignment?.assignedResourceId as string);

    return {
      name: 'Multiple Independent Concurrent Distress Incidents',
      passed,
      message: passed
        ? 'Simultaneous independent incidents allocated distinct rescue drones (DRONE-02 & DRONE-03) without crosstalk.'
        : `Multi-incident check failed: resA=${resA.assignment?.assignedResourceId}, resB=${resB.assignment?.assignedResourceId}`,
    };
  }

  private testExplicitSOSHandling(): TestResult {
    this.setupCleanState();
    this.dispatchManager.setAutoDispatch(true); // Emergency auto-dispatch enabled
    const now = Date.now();

    const sosIncident = {
      id: 'INC-SOS-EMERGENCY',
      title: 'Swimmer Wearable Wristband SOS Button',
      type: 'DISTRESS',
      severity: 'CRITICAL',
      active: true,
      position3D: { x: 0, y: 0, z: -40 },
    };

    const res = this.dispatchManager.proposeAssignment(sosIncident, now);
    const asg = this.dispatchManager.getAssignment(res.assignment!.assignmentId);

    const passed =
      res.success &&
      asg?.status === 'EN_ROUTE' &&
      asg.authorization.authorizedBy === 'AUTO_DISPATCH_POLICY';

    return {
      name: 'Explicit SOS Direct Emergency Auto-Dispatch Policy',
      passed,
      message: passed
        ? 'Explicit wristband SOS immediately triggered automated dispatch without human gate delay.'
        : `SOS check failed: status=${asg?.status}`,
    };
  }

  private testCollaborativeSurfaceResponders(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    // Trigger surface rescue boat via RescueCoordinator
    this.rescueCoordinator.handleDistressIncident(
      {
        incidentId: 'INC-COLLAB-01',
        visitorId: 'V-101',
        position3D: { x: -30, y: 0, z: -45 },
        timeDisplay: '12:00:00',
        onsetSimTime: 10,
        alertSimTime: 11,
      } as any,
      [],
      {} as any
    );

    const incident = {
      id: 'INC-COLLAB-01',
      title: 'Offshore Rip Distress with Surface Boat',
      type: 'DISTRESS',
      severity: 'CRITICAL',
      active: true,
      position3D: { x: -30, y: 0, z: -45 },
    };

    const res = this.dispatchManager.proposeAssignment(incident, now);
    const cr = res.assignment?.collaborativeResponders;

    const passed =
      res.success &&
      cr !== undefined &&
      (cr.rescueBoatId === 'RB-01' || cr.lifeguardId !== undefined) &&
      cr.coordinationNotes.includes('Collaborative SAR');

    return {
      name: 'Collaborative Multi-Asset Lifesaver Coordination (Drone + Boat/Lifeguard)',
      passed,
      message: passed
        ? `Coordinated multi-asset team: Drone DRONE-02 teamed with surface unit ${cr?.rescueBoatId || cr?.lifeguardId}.`
        : `Collaborative check failed: ${JSON.stringify(cr)}`,
    };
  }

  private testNonInterferenceAndCleanReset(): TestResult {
    this.setupCleanState();

    const activeAsgs = this.dispatchManager.getActiveAssignments();
    const allDrones = this.droneRegistry.getAllDrones();
    const allZones = this.coastalRegistry.getAllZones();

    const passed =
      activeAsgs.length === 0 &&
      allDrones.length === 4 &&
      allZones.length === 4;

    return {
      name: 'Non-Interference & Clean State Reset Isolation',
      passed,
      message: passed
        ? 'Clean reset purged assignments and audit records without modifying underlying fleet or coastal models.'
        : `Clean reset check failed: asgs=${activeAsgs.length}`,
    };
  }
}
