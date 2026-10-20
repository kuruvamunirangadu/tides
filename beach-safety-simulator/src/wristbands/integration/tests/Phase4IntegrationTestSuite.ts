/**
 * Phase4IntegrationTestSuite.ts
 * 
 * TIDES Phase 4: Camera & Drone Integration with the Wristband Safety System
 * 
 * Comprehensive 14-point Automated Verification Suite:
 * 1. Camera Observation Schema & Freshness Verification
 * 2. Camera Sliding-Window Deduplication
 * 3. Camera Zero Coordinate Fabrication
 * 4. Drone Observation Telemetry Integration
 * 5. Drone Flight Altitude vs Ground Observation Separation
 * 6. Drone Stale Telemetry Detection
 * 7. Multi-Sensor Spatial & Temporal Distress Correlation
 * 8. Correlator Composite Confidence & Corroboration Bonus
 * 9. Human-In-The-Loop Pending State Machine
 * 10. Operator Confirm Distress Action
 * 11. Operator Dismiss Observation Action
 * 12. Operator Dispatch Drone Closer Look Action
 * 13. Wristband Warning Eligibility & Rate-Limiting Throttling
 * 14. Independent Swimmer SOS Inviolability
 */

import { CameraObservationAdapter } from '../CameraObservationAdapter';
import { DroneObservationAdapter } from '../DroneObservationAdapter';
import { ObservationDistressCorrelator } from '../ObservationDistressCorrelator';
import { WristbandWarningIntegrationService } from '../WristbandWarningIntegrationService';
import { DroneRegistry } from '../../../drones/foundation/DroneRegistry';
import { DroneMissionManager } from '../../../drones/missions/DroneMissionManager';
import { IncidentManager } from '../../../visitors/incidents/IncidentManager';
import { WristbandRegistry } from '../../WristbandRegistry';
import { BeachGatewayService } from '../../gateway/BeachGatewayService';

export interface TestResult {
  testId: string;
  name: string;
  passed: boolean;
  message: string;
  durationMs: number;
}

export class Phase4IntegrationTestSuite {
  private camAdapter = CameraObservationAdapter.getInstance();
  private droneAdapter = DroneObservationAdapter.getInstance();
  private correlator = ObservationDistressCorrelator.getInstance();
  private warningService = WristbandWarningIntegrationService.getInstance();
  private droneRegistry = DroneRegistry.getInstance();
  private missionManager = DroneMissionManager.getInstance();
  private incidentManager = IncidentManager.getInstance();
  private wristbandRegistry = WristbandRegistry.getInstance();
  private gatewayService = BeachGatewayService.getInstance();

  private resetAll(): void {
    this.camAdapter.reset();
    this.droneAdapter.reset();
    this.correlator.reset();
    this.warningService.reset();
    this.droneRegistry.reset();
    this.missionManager.reset();
    this.wristbandRegistry.reset();
    this.gatewayService.reset();
  }

  public async runAllTests(): Promise<{ results: TestResult[]; allPassed: boolean }> {
    const results: TestResult[] = [];

    const tests = [
      () => this.test1_CameraObservationFreshness(),
      () => this.test2_CameraSlidingWindowDeduplication(),
      () => this.test3_CameraZeroCoordinateFabrication(),
      () => this.test4_DroneObservationTelemetryIntegration(),
      () => this.test5_DroneAltitudeSeparation(),
      () => this.test6_DroneStaleTelemetryDetection(),
      () => this.test7_MultiSensorSpatialTemporalCorrelation(),
      () => this.test8_CorrelatorCompositeConfidenceBonus(),
      () => this.test9_HumanInTheLoopPendingStateMachine(),
      () => this.test10_OperatorConfirmDistress(),
      () => this.test11_OperatorDismissObservation(),
      () => this.test12_OperatorDispatchDroneCloserLook(),
      () => this.test13_WristbandEligibilityAndThrottling(),
      () => this.test14_IndependentSOSInviolability(),
    ];

    for (const test of tests) {
      this.resetAll();
      const start = performance.now();
      try {
        const res = await test();
        res.durationMs = performance.now() - start;
        results.push(res);
      } catch (err: any) {
        results.push({
          testId: 'ERR',
          name: 'Unexpected Exception',
          passed: false,
          message: `Test threw error: ${err.message || String(err)}`,
          durationMs: performance.now() - start,
        });
      }
    }

    const allPassed = results.every((r) => r.passed);
    return { results, allPassed };
  }

  // TEST 1
  private test1_CameraObservationFreshness(): TestResult {
    const testId = 'TC-INT-01';
    const name = 'Camera Observation Schema & Freshness Verification';
    const now = 100000;

    // Fresh (< 5s)
    const freshStatus = this.camAdapter.evaluateFreshness(now - 2000, now);
    // Stale (5s - 20s)
    const staleStatus = this.camAdapter.evaluateFreshness(now - 12000, now);
    // Expired (> 20s)
    const expiredStatus = this.camAdapter.evaluateFreshness(now - 25000, now);

    const ingestRes = this.camAdapter.ingestObservation({
      cameraId: 'CAM-01',
      detectionClass: 'STRUGGLING_SWIMMER',
      confidenceScore: 0.88,
      observationPosition: { x: 180, y: 160 },
      eventTimestampMs: now - 1000,
    }, now);

    const passed =
      freshStatus === 'FRESH' &&
      staleStatus === 'STALE' &&
      expiredStatus === 'EXPIRED' &&
      ingestRes.accepted &&
      ingestRes.observation?.freshnessStatus === 'FRESH' &&
      ingestRes.observation.confidenceScore === 0.88;

    return {
      testId,
      name,
      passed,
      message: passed
        ? 'Freshness calculated correctly (<5s FRESH, 5-20s STALE, >20s EXPIRED) and observation ingested'
        : `Freshness failure: fresh=${freshStatus}, stale=${staleStatus}, expired=${expiredStatus}`,
      durationMs: 0,
    };
  }

  // TEST 2
  private test2_CameraSlidingWindowDeduplication(): TestResult {
    const testId = 'TC-INT-02';
    const name = 'Camera Sliding-Window Deduplication';
    const now = 200000;

    const res1 = this.camAdapter.ingestObservation({
      cameraId: 'CAM-01',
      detectionClass: 'SWIMMER',
      confidenceScore: 0.85,
      trackingId: 'TRK-99',
      eventTimestampMs: now,
    }, now);

    // Immediate duplicate detection within 2000ms window
    const res2 = this.camAdapter.ingestObservation({
      cameraId: 'CAM-01',
      detectionClass: 'SWIMMER',
      confidenceScore: 0.86,
      trackingId: 'TRK-99',
      eventTimestampMs: now + 500,
    }, now + 500);

    // After deduplication window (2500ms later)
    const res3 = this.camAdapter.ingestObservation({
      cameraId: 'CAM-01',
      detectionClass: 'SWIMMER',
      confidenceScore: 0.87,
      trackingId: 'TRK-99',
      eventTimestampMs: now + 2500,
    }, now + 2500);

    const passed = res1.accepted && !res2.accepted && res3.accepted;

    return {
      testId,
      name,
      passed,
      message: passed
        ? 'Sliding-window deduplication correctly rejected duplicate detection within 2000ms and accepted after window'
        : `Deduplication failure: res1=${res1.accepted}, res2=${res2.accepted}, res3=${res3.accepted}`,
      durationMs: 0,
    };
  }

  // TEST 3
  private test3_CameraZeroCoordinateFabrication(): TestResult {
    const testId = 'TC-INT-03';
    const name = 'Camera Adapter Zero Coordinate Fabrication';
    const now = 300000;

    // Observation without calibrated coordinates
    const resUncalibrated = this.camAdapter.ingestObservation({
      cameraId: 'CAM-03',
      detectionClass: 'CANDIDATE_DISTRESS',
      confidenceScore: 0.75,
      observationPosition: undefined, // No 3D ground projection available
    }, now);

    const obs = resUncalibrated.observation;
    const passed =
      resUncalibrated.accepted &&
      obs !== undefined &&
      obs.observationPosition === undefined; // Did not invent (0,0) or camera pole position

    return {
      testId,
      name,
      passed,
      message: passed
        ? 'Zero coordinate fabrication preserved: uncalibrated detection has undefined ground position'
        : 'Fabrication error: observation invented coordinates',
      durationMs: 0,
    };
  }

  // TEST 4
  private test4_DroneObservationTelemetryIntegration(): TestResult {
    const testId = 'TC-INT-04';
    const name = 'Drone Observation Telemetry Integration';
    const now = 400000;

    const drone = this.droneRegistry.getDrone('DRONE-01');
    if (!drone) {
      return { testId, name, passed: false, message: 'DRONE-01 not found in DroneRegistry', durationMs: 0 };
    }

    const res = this.droneAdapter.ingestDroneObservation({
      droneId: 'DRONE-01',
      confidenceScore: 0.92,
      estimatedObservationLocation: { x: 220, y: 160 },
      trackingId: 'TRK-DRN-01',
      eventTimestampMs: now,
    }, now);

    const obs = res.observation;
    const passed =
      res.accepted &&
      obs !== undefined &&
      obs.droneId === 'DRONE-01' &&
      obs.batteryPercent === drone.battery.percentage &&
      obs.operationalStatus === drone.status &&
      obs.linkStatus === 'CONNECTED';

    return {
      testId,
      name,
      passed,
      message: passed
        ? 'Drone observation successfully integrated live telemetry, battery, and link state from DroneRegistry'
        : 'Telemetry integration failure',
      durationMs: 0,
    };
  }

  // TEST 5
  private test5_DroneAltitudeSeparation(): TestResult {
    const testId = 'TC-INT-05';
    const name = 'Drone Flight Altitude vs Ground Observation Separation';
    const now = 500000;

    const drone = this.droneRegistry.getDrone('DRONE-01')!;
    drone.position3D = { x: 180, y: 28.5, z: 40 }; // 28.5m in the air!

    const res = this.droneAdapter.ingestDroneObservation({
      droneId: 'DRONE-01',
      confidenceScore: 0.90,
      estimatedObservationLocation: { x: 185, y: 42 },
    }, now);

    const obs = res.observation!;
    const passed =
      obs.timestampedDronePosition.y === 28.5 && // Air altitude preserved
      obs.estimatedObservationLocation?.x === 185 &&
      obs.estimatedObservationLocation?.y === 42 &&
      obs.estimatedObservationLocation?.z === 0; // Water/ground plane

    return {
      testId,
      name,
      passed,
      message: passed
        ? 'Drone altitude (28.5m) strictly separated from ground observation coordinates (z=0m)'
        : 'Separation failure: drone altitude confused with ground target',
      durationMs: 0,
    };
  }

  // TEST 6
  private test6_DroneStaleTelemetryDetection(): TestResult {
    const testId = 'TC-INT-06';
    const name = 'Drone Stale Telemetry Detection';
    const now = 600000;

    // Telemetry timestamp 8 seconds old (> 5s threshold)
    const staleFreshness = this.droneAdapter.evaluateTelemetryFreshness(now - 8000, now);
    // Telemetry timestamp 25 seconds old (> 20s threshold)
    const expiredFreshness = this.droneAdapter.evaluateTelemetryFreshness(now - 25000, now);

    const res = this.droneAdapter.ingestDroneObservation({
      droneId: 'DRONE-01',
      confidenceScore: 0.80,
      eventTimestampMs: now - 8000,
    }, now);

    const passed =
      staleFreshness === 'STALE' &&
      expiredFreshness === 'EXPIRED' &&
      res.observation?.telemetryFreshness === 'STALE' &&
      res.observation?.linkStatus === 'DEGRADED';

    return {
      testId,
      name,
      passed,
      message: passed
        ? 'Stale drone telemetry (>5s) correctly detected and linkStatus marked DEGRADED'
        : 'Stale detection failure',
      durationMs: 0,
    };
  }

  // TEST 7
  private test7_MultiSensorSpatialTemporalCorrelation(): TestResult {
    const testId = 'TC-INT-07';
    const name = 'Multi-Sensor Spatial & Temporal Distress Correlation';
    const now = 700000;

    // Sighting 1: Fixed Camera at (200, 180)
    const camRes = this.camAdapter.ingestObservation({
      cameraId: 'CAM-01',
      detectionClass: 'STRUGGLING_SWIMMER',
      confidenceScore: 0.80,
      observationPosition: { x: 200, y: 180 },
    }, now);

    const cand1 = this.correlator.correlateCameraObservation(camRes.observation!, now);

    // Sighting 2: Drone at (212, 185) — 13 meters away, 2 seconds later
    const droneRes = this.droneAdapter.ingestDroneObservation({
      droneId: 'DRONE-01',
      confidenceScore: 0.85,
      estimatedObservationLocation: { x: 212, y: 185 },
    }, now + 2000);

    const cand2 = this.correlator.correlateDroneObservation(droneRes.observation!, now + 2000);

    const passed =
      cand1 !== null &&
      cand2 !== null &&
      cand1.candidateId === cand2.candidateId && // Clustered into same dossier!
      cand1.cameraObservationIds.length === 1 &&
      cand1.droneObservationIds.length === 1 &&
      cand1.primarySource === 'FUSED';

    return {
      testId,
      name,
      passed,
      message: passed
        ? `Camera & Drone observations within 13m successfully clustered into single dossier ${cand1.candidateId} with FUSED source`
        : 'Correlation failure: observations failed to cluster',
      durationMs: 0,
    };
  }

  // TEST 8
  private test8_CorrelatorCompositeConfidenceBonus(): TestResult {
    const testId = 'TC-INT-08';
    const name = 'Correlator Composite Confidence & Corroboration Bonus';
    const now = 800000;

    // Single camera sighting at 0.78
    const camRes = this.camAdapter.ingestObservation({
      cameraId: 'CAM-02',
      detectionClass: 'STRUGGLING_SWIMMER',
      confidenceScore: 0.78,
      observationPosition: { x: 350, y: 170 },
    }, now);

    const cand = this.correlator.correlateCameraObservation(camRes.observation!, now);
    const initialConf = cand.compositeConfidence;

    // Corroborating drone sighting at 0.82
    const droneRes = this.droneAdapter.ingestDroneObservation({
      droneId: 'DRONE-02',
      confidenceScore: 0.82,
      estimatedObservationLocation: { x: 355, y: 172 },
    }, now + 1000);

    this.correlator.correlateDroneObservation(droneRes.observation!, now + 1000);

    // Fused confidence should receive +0.18 bonus: min(0.99, max(0.78, 0.82) + 0.18) = 1.00 capped at 0.99
    const passed =
      initialConf === 0.78 &&
      cand.compositeConfidence >= 0.95 &&
      cand.compositeConfidence > 0.82 &&
      cand.spatialUncertaintyRadiusMeters === 8.0; // Reduced uncertainty

    return {
      testId,
      name,
      passed,
      message: passed
        ? `Composite confidence boosted from ${initialConf} to ${cand.compositeConfidence} via multi-sensor corroboration (uncertainty tightened to ±8m)`
        : `Corroboration bonus failure: initial=${initialConf}, final=${cand.compositeConfidence}`,
      durationMs: 0,
    };
  }

  // TEST 9
  private test9_HumanInTheLoopPendingStateMachine(): TestResult {
    const testId = 'TC-INT-09';
    const name = 'Human-In-The-Loop Pending State Machine';
    const now = 900000;

    const initialIncidentCount = this.incidentManager.getActiveIncidents().length;

    const camRes = this.camAdapter.ingestObservation({
      cameraId: 'CAM-01',
      detectionClass: 'STRUGGLING_SWIMMER',
      confidenceScore: 0.94,
      observationPosition: { x: 190, y: 170 },
    }, now);

    const cand = this.correlator.correlateCameraObservation(camRes.observation!, now);

    const postIncidentCount = this.incidentManager.getActiveIncidents().length;

    const passed =
      cand.verificationState === 'PENDING_REVIEW' &&
      postIncidentCount === initialIncidentCount && // No authoritative incident created automatically!
      cand.createdIncidentId === undefined &&
      !cand.warningDispatched;

    return {
      testId,
      name,
      passed,
      message: passed
        ? 'High-confidence (94%) CV detection remains PENDING_REVIEW; authoritative incident count unchanged'
        : 'State machine failure: CV detection bypassed human verification',
      durationMs: 0,
    };
  }

  // TEST 10
  private test10_OperatorConfirmDistress(): TestResult {
    const testId = 'TC-INT-10';
    const name = 'Operator Confirm Distress Action';
    const now = 1000000;

    const camRes = this.camAdapter.ingestObservation({
      cameraId: 'CAM-01',
      detectionClass: 'STRUGGLING_SWIMMER',
      confidenceScore: 0.85,
      observationPosition: { x: 200, y: 175 },
    }, now);

    const cand = this.correlator.correlateCameraObservation(camRes.observation!, now);

    const initialIncidentCount = this.incidentManager.getActiveIncidents().length;

    // Operator confirms distress
    const confirmRes = this.correlator.confirmDistress(
      cand.candidateId,
      'COMMANDER_SMITH',
      'Visible head bobbing in rip channel',
      now + 2000
    );

    const updatedIncidents = this.incidentManager.getActiveIncidents();
    const passed =
      confirmRes.success &&
      cand.verificationState === 'VERIFIED' &&
      cand.createdIncidentId !== undefined &&
      updatedIncidents.length === initialIncidentCount + 1 &&
      cand.warningDispatched;

    return {
      testId,
      name,
      passed,
      message: passed
        ? `Operator confirmation created authoritative incident ${cand.createdIncidentId} and dispatched warnings`
        : 'Operator confirm failure',
      durationMs: 0,
    };
  }

  // TEST 11
  private test11_OperatorDismissObservation(): TestResult {
    const testId = 'TC-INT-11';
    const name = 'Operator Dismiss Observation Action';
    const now = 1100000;

    const camRes = this.camAdapter.ingestObservation({
      cameraId: 'CAM-02',
      detectionClass: 'CANDIDATE_DISTRESS',
      confidenceScore: 0.65,
      observationPosition: { x: 380, y: 160 },
    }, now);

    const cand = this.correlator.correlateCameraObservation(camRes.observation!, now);
    const initialIncidentCount = this.incidentManager.getActiveIncidents().length;

    const dismissRes = this.correlator.dismissObservation(
      cand.candidateId,
      'COMMANDER_SMITH',
      'False alarm: floating drift log',
      now + 1000
    );

    const postCount = this.incidentManager.getActiveIncidents().length;

    const passed =
      dismissRes.success &&
      cand.verificationState === 'DISMISSED' &&
      cand.operatorDecision?.rationale === 'False alarm: floating drift log' &&
      postCount === initialIncidentCount && // No incident created
      !cand.warningDispatched;

    return {
      testId,
      name,
      passed,
      message: passed
        ? `Candidate ${cand.candidateId} successfully dismissed with rationale; zero incidents generated`
        : 'Operator dismiss failure',
      durationMs: 0,
    };
  }

  // TEST 12
  private test12_OperatorDispatchDroneCloserLook(): TestResult {
    const testId = 'TC-INT-12';
    const name = 'Operator Dispatch Drone Closer Look Action';
    const now = 1200000;

    const camRes = this.camAdapter.ingestObservation({
      cameraId: 'CAM-01',
      detectionClass: 'CANDIDATE_DISTRESS',
      confidenceScore: 0.72,
      observationPosition: { x: 210, y: 170 },
    }, now);

    const cand = this.correlator.correlateCameraObservation(camRes.observation!, now);

    const lookRes = this.correlator.requestDroneCloserLook(
      cand.candidateId,
      'COMMANDER_SMITH',
      'DRONE-01',
      now + 500
    );

    const drone = this.droneRegistry.getDrone('DRONE-01');

    const passed =
      lookRes.success &&
      cand.verificationState === 'MONITORING' &&
      lookRes.missionId !== undefined &&
      drone?.currentMissionId === lookRes.missionId;

    return {
      testId,
      name,
      passed,
      message: passed
        ? `Drone closer look dispatched: DRONE-01 assigned mission ${lookRes.missionId}, candidate state set to MONITORING`
        : `Closer look failure: ${lookRes.error}`,
      durationMs: 0,
    };
  }

  // TEST 13
  private test13_WristbandEligibilityAndThrottling(): TestResult {
    const testId = 'TC-INT-13';
    const name = 'Wristband Warning Eligibility & Rate-Limiting Throttling';
    const now = 1300000;

    // Evaluate eligibility around hazard at (230, 360) in SWIM_ZONE_NORTH (near WB-101 and WB-102)
    const records = this.warningService.evaluateFleetEligibility({ x: 230, y: 360 }, 'SWIM_ZONE_NORTH');

    // Must evaluate all registered wristbands
    const allWbs = this.wristbandRegistry.getWristbands();
    const hasAllWbs = records.length === allWbs.length;

    // Check inclusion/exclusion rationale clarity
    const includedRecords = records.filter((r) => r.eligible);
    const excludedRecords = records.filter((r) => !r.eligible);

    const rationaleValid = records.every((r) => r.reason.length > 5);

    // Test Throttling
    const cand = this.correlator.correlateCameraObservation({
      observationId: 'CAM-TEST-THROTTLE',
      cameraId: 'CAM-01',
      cameraSourceType: 'CCTV_FIXED',
      eventTimestampMs: now,
      ingestionTimestampMs: now,
      detectionClass: 'STRUGGLING_SWIMMER',
      confidenceScore: 0.90,
      observationPosition: { x: 230, y: 360 },
      coordinateReference: 'BEACH_CANVAS',
      freshnessStatus: 'FRESH',
      verificationStatus: 'PENDING_REVIEW',
      provenance: 'SIMULATED',
    }, now);

    // First warning dispatch
    const firstDispatch = this.warningService.dispatchWarningForDistress(cand, 'INC-TEST-1', now);

    // Second warning dispatch to same zone 4 seconds later (within 15s debounce window)
    const secondDispatch = this.warningService.dispatchWarningForDistress(cand, 'INC-TEST-2', now + 4000);

    const passed =
      hasAllWbs &&
      rationaleValid &&
      includedRecords.length > 0 &&
      excludedRecords.length > 0 &&
      firstDispatch.success &&
      !firstDispatch.throttled &&
      !secondDispatch.success &&
      secondDispatch.throttled;

    return {
      testId,
      name,
      passed,
      message: passed
        ? `Eligibility transparently audited (${includedRecords.length} included, ${excludedRecords.length} excluded) and 15s rate-limit throttle successfully blocked redundant warning`
        : `Eligibility/throttle failure: hasAll=${hasAllWbs}, first=${firstDispatch.success}, secondThrottled=${secondDispatch.throttled}`,
      durationMs: 0,
    };
  }

  // TEST 14
  private test14_IndependentSOSInviolability(): TestResult {
    const testId = 'TC-INT-14';
    const name = 'Independent Swimmer SOS Inviolability';
    const now = 1400000;

    const initialIncidents = this.incidentManager.getActiveIncidents().length;

    // Direct SOS from WB-101
    const incId = this.correlator.handleIndependentSOS(
      'WB-101',
      { x: 190, y: 170 },
      'SZ-01',
      'DIRECT_SOS_BUTTON',
      now
    );

    const postIncidents = this.incidentManager.getActiveIncidents();
    const createdIncident = postIncidents.find((i) => i.id === incId);

    // Verifies immediate creation of emergency incident without needing CV verification
    const passed =
      createdIncident !== undefined &&
      createdIncident.severity === 'CRITICAL' &&
      createdIncident.type === 'DISTRESS' &&
      postIncidents.length === initialIncidents + 1;

    return {
      testId,
      name,
      passed,
      message: passed
        ? `Independent SOS escalated immediately to CRITICAL emergency incident ${incId} with zero CV latency`
        : 'SOS inviolability failure: SOS failed to create authoritative incident immediately',
      durationMs: 0,
    };
  }
}
