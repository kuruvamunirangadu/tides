/**
 * DroneCoverageTestSuite.ts
 * 
 * TIDES Drone Phase 8: Coastal Coverage & Multi-Drone Patrol Coordination Test Suite
 * 
 * Verifies all 16 core requirements:
 * 1. Default zone creation and registration.
 * 2. Boundary validation and coordinate limits.
 * 3. Drone fleet eligibility filtering (battery, telemetry freshness, connectivity).
 * 4. Dedicated rescue drone preservation (DRONE-02 never assigned to patrol).
 * 5. Active rescue mission conflict prevention.
 * 6. Multi-zone priority-based allocation (CRITICAL -> HIGH -> MEDIUM -> LOW).
 * 7. Patrol route mapping & mission submission through DroneMissionManager.
 * 8. Spatial intersection testing of camera observations.
 * 9. Out-of-bounds observation rejection.
 * 10. Observation freshness and staleness transitions.
 * 11. Multi-camera overlapping coverage detection.
 * 12. Duplicate observation suppression.
 * 13. Coverage blind spot and gap classification.
 * 14. Degraded drone & camera fault handling.
 * 15. Coverage summary report with explicit denominator.
 * 16. Non-interference and clean reset.
 */

import { CoastalZoneRegistry } from '../CoastalZoneRegistry';
import { DroneCoverageAllocator } from '../DroneCoverageAllocator';
import { DroneCoverageTracker } from '../DroneCoverageTracker';
import { DroneRegistry } from '../../foundation/DroneRegistry';
import { DroneCameraRegistry } from '../../camera/DroneCameraRegistry';
import { DroneMissionManager } from '../../missions/DroneMissionManager';
import {
  CoastalSurveillanceZone,
  CoastalCoverageStatus,
  PatrolAllocationPlan,
} from '../droneCoverage.types';

export interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

export class DroneCoverageTestSuite {
  private zoneRegistry: CoastalZoneRegistry;
  private allocator: DroneCoverageAllocator;
  private tracker: DroneCoverageTracker;
  private droneRegistry: DroneRegistry;
  private cameraRegistry: DroneCameraRegistry;
  private missionManager: DroneMissionManager;

  constructor() {
    this.zoneRegistry = CoastalZoneRegistry.getInstance();
    this.droneRegistry = DroneRegistry.getInstance();
    this.cameraRegistry = DroneCameraRegistry.getInstance();
    this.missionManager = DroneMissionManager.getInstance();
    this.allocator = DroneCoverageAllocator.getInstance();
    this.tracker = DroneCoverageTracker.getInstance();
  }

  private setupCleanState(): void {
    this.droneRegistry.reset();
    this.cameraRegistry.reset();
    this.missionManager.reset();
    this.zoneRegistry.reset();
    this.tracker.reset();
  }

  public runAllTests(): TestResult[] {
    const results: TestResult[] = [];

    // Test 1: Default zone creation and registration
    results.push(this.testDefaultZoneRegistration());

    // Test 2: Boundary validation and coordinate limits
    results.push(this.testBoundaryValidation());

    // Test 3: Drone fleet eligibility filtering
    results.push(this.testFleetEligibilityFiltering());

    // Test 4: Dedicated rescue drone preservation
    results.push(this.testRescueDronePreservation());

    // Test 5: Active rescue mission conflict prevention
    results.push(this.testRescueMissionConflictPrevention());

    // Test 6: Multi-zone priority-based allocation
    results.push(this.testPriorityAllocation());

    // Test 7: Patrol route mapping & mission submission
    results.push(this.testMissionSubmission());

    // Test 8: Spatial intersection testing of camera observations
    results.push(this.testSpatialIntersection());

    // Test 9: Out-of-bounds observation rejection
    results.push(this.testOutOfBoundsObservation());

    // Test 10: Observation freshness and staleness transitions
    results.push(this.testFreshnessAndStaleness());

    // Test 11: Multi-camera overlapping coverage detection
    results.push(this.testOverlappingCoverage());

    // Test 12: Duplicate observation suppression
    results.push(this.testDuplicateSuppression());

    // Test 13: Coverage blind spot and gap classification
    results.push(this.testBlindSpotClassification());

    // Test 14: Degraded drone & camera fault handling
    results.push(this.testDegradedDroneHandling());

    // Test 15: Coverage summary report with explicit denominator
    results.push(this.testExplicitDenominatorSummary());

    // Test 16: Non-interference and clean reset
    results.push(this.testNonInterferenceAndCleanReset());

    return results;
  }

  private testDefaultZoneRegistration(): TestResult {
    this.setupCleanState();
    const zones = this.zoneRegistry.getAllZones();

    const expectedZoneIds = [
      'CZ-01-SOUTH-SURF',
      'CZ-02-CENTRAL-RIP',
      'CZ-03-NORTH-BATHING',
      'CZ-04-OFFSHORE-DEEP',
    ];

    const hasAll = expectedZoneIds.every((id) => zones.some((z) => z.zoneId === id));
    const ripZone = this.zoneRegistry.getZone('CZ-02-CENTRAL-RIP');

    const passed =
      zones.length === 4 &&
      hasAll &&
      ripZone?.priority === 'CRITICAL' &&
      ripZone.boundary3D.xMin === -30 &&
      ripZone.boundary3D.xMax === 45;

    return {
      name: 'Zone Creation & Default Sector Registration',
      passed,
      message: passed
        ? `Successfully registered 4 default Rushikonda surveillance sectors (Critical Rip current channel validated).`
        : `Failed to register expected default zones. Count: ${zones.length}`,
    };
  }

  private testBoundaryValidation(): TestResult {
    this.setupCleanState();

    // Inverted x bounds
    const invalidX = this.zoneRegistry.validateBoundary({
      xMin: 50,
      xMax: 20,
      zMin: -50,
      zMax: 10,
    });

    // Inverted z bounds
    const invalidZ = this.zoneRegistry.validateBoundary({
      xMin: -20,
      xMax: 20,
      zMin: 30,
      zMax: 10,
    });

    // Out of Rushikonda bounds (> 250)
    const outOfBounds = this.zoneRegistry.validateBoundary({
      xMin: -300,
      xMax: 100,
      zMin: -50,
      zMax: 10,
    });

    // Valid boundary
    const valid = this.zoneRegistry.validateBoundary({
      xMin: -40,
      xMax: 40,
      zMin: -80,
      zMax: 0,
    });

    const passed = !invalidX.valid && !invalidZ.valid && !outOfBounds.valid && valid.valid;

    return {
      name: 'Geometric Boundary Validation & Limits Enforcement',
      passed,
      message: passed
        ? 'Correctly rejected inverted X/Z bounds and out-of-scene coordinates; validated proper boundaries.'
        : `Boundary validation logic failed: ${JSON.stringify({ invalidX, invalidZ, outOfBounds, valid })}`,
    };
  }

  private testFleetEligibilityFiltering(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    // DRONE-01: Healthy surveillance drone -> Eligible
    // DRONE-02: RESCUE_ASSISTANCE -> Ineligible (Preserved)
    // DRONE-03: Low battery (15%) -> Ineligible
    this.droneRegistry.ingestTelemetry(
      {
        packetId: 'PKT-TEST-03',
        droneId: 'DRONE-03',
        sourceTimestampMs: now,
        receivedTimestampMs: now,
        position3D: { x: 0, y: 15, z: 0 },
        headingDegrees: 90,
        speedMps: 0,
        altitudeMeters: 15,
        batteryPercentage: 15, // <= 25%
        connectivity: 'CONNECTED',
      },
      now
    );

    const assessment = this.allocator.getEligibleSurveillanceDrones(now);
    const eligibleIds = assessment.eligible.map((d) => d.droneId);

    const passed = eligibleIds.includes('DRONE-01') && !eligibleIds.includes('DRONE-03');

    return {
      name: 'Fleet Availability & Flight Constraint Filtering',
      passed,
      message: passed
        ? `Filtered fleet successfully: DRONE-01 eligible, low-battery DRONE-03 rejected (15% <= 25%).`
        : `Eligibility check failed. Eligible: ${eligibleIds.join(', ')}`,
    };
  }

  private testRescueDronePreservation(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    const assessment = this.allocator.getEligibleSurveillanceDrones(now);
    const eligibleIds = assessment.eligible.map((d) => d.droneId);
    const ineligibleEntry = assessment.ineligible.find((i) => i.drone.droneId === 'DRONE-02');

    const passed =
      !eligibleIds.includes('DRONE-02') &&
      ineligibleEntry !== undefined &&
      ineligibleEntry.reason.includes('Preserved for Emergency Rescue');

    return {
      name: 'Dedicated Rescue Fleet Preservation (DRONE-02 Protected)',
      passed,
      message: passed
        ? 'DRONE-02 strictly barred from routine surveillance patrol: preserved exclusively for flotation aid.'
        : `DRONE-02 preservation failed. Ineligible entries: ${JSON.stringify(assessment.ineligible)}`,
    };
  }

  private testRescueMissionConflictPrevention(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    // Temporarily grant DRONE-01 flotation capability so rescue preflight passes
    const drone1 = this.droneRegistry.getDrone('DRONE-01')!;
    drone1.capabilities.hasFlotationPayload = true;

    // Assign DRONE-01 to an active emergency rescue mission
    const m = this.missionManager.createMission(
      {
        type: 'RESCUE_ASSISTANCE',
        droneId: 'DRONE-01',
        targetPosition3D: { x: 10, y: 15, z: -35 },
      },
      now
    );
    if (m.mission) {
      this.missionManager.acceptMission(m.mission.missionId, now);
    }

    const assessment = this.allocator.getEligibleSurveillanceDrones(now);
    const drone1Ineligible = assessment.ineligible.find((i) => i.drone.droneId === 'DRONE-01');

    const passed =
      drone1Ineligible !== undefined &&
      drone1Ineligible.reason.includes('locked to active emergency rescue mission');

    return {
      name: 'Active Rescue Mission Conflict Prevention',
      passed,
      message: passed
        ? 'Drones executing active emergency rescue missions are protected and cannot be assigned to surveillance.'
        : `Rescue mission conflict check failed: ${drone1Ineligible?.reason}`,
    };
  }

  private testPriorityAllocation(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    // Generate patrol plan with default fleet (DRONE-01 and DRONE-03 available)
    const plan = this.allocator.generateAllocationPlan(now);

    // Highest priority zone is CZ-02-CENTRAL-RIP (CRITICAL)
    const criticalAlloc = plan.allocations.find((a) => a.zoneId === 'CZ-02-CENTRAL-RIP');

    const passed =
      plan.allocations.length >= 1 &&
      criticalAlloc !== undefined &&
      criticalAlloc.droneId === 'DRONE-01';

    return {
      name: 'Priority-Driven Multi-Zone Allocation Hierarchy',
      passed,
      message: passed
        ? `Allocated highest priority sector CZ-02-CENTRAL-RIP (CRITICAL) to DRONE-01 first.`
        : `Priority allocation failed. Allocations: ${JSON.stringify(plan.allocations)}`,
    };
  }

  private testMissionSubmission(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    const plan = this.allocator.generateAllocationPlan(now);
    const commitSuccess = this.allocator.commitAllocationPlan(plan);

    const ripZone = this.zoneRegistry.getZone('CZ-02-CENTRAL-RIP');
    const drone1ActiveMission = this.missionManager.getDroneActiveMission('DRONE-01');
    const committedAllocs = plan.allocations.filter((a) => a.status === 'COMMITTED');

    const passed =
      commitSuccess &&
      committedAllocs.length >= 1 &&
      Boolean(ripZone?.assignedDroneIds.includes('DRONE-01')) &&
      drone1ActiveMission !== undefined &&
      drone1ActiveMission.type === 'PATROL';

    return {
      name: 'Patrol Route Mapping & Mission Submission via MissionManager',
      passed,
      message: passed
        ? `Committed patrol plan: assigned DRONE-01 to zone CZ-02 and spawned PATROL mission ${drone1ActiveMission?.missionId}.`
        : `Commit failed: commitSuccess=${commitSuccess}, plan=${JSON.stringify(plan)}`,
    };
  }

  private testSpatialIntersection(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    // Central Rip zone boundary: x: [-30, 45], z: [-80, 15]
    // Point at x: 10, z: -40 is squarely in Central Rip
    const result = this.tracker.recordObservation(
      {
        observationId: 'OBS-TEST-001',
        cameraId: 'CAM-DRONE-01',
        droneId: 'DRONE-01',
        timestampMs: now,
        scenePosition: { x: 10, y: 0, z: -40 },
        confidence: 0.92,
      },
      now
    );

    const ripZone = this.zoneRegistry.getZone('CZ-02-CENTRAL-RIP');

    const passed =
      result.status === 'RECORDED' &&
      result.matchedZones.includes('CZ-02-CENTRAL-RIP') &&
      ripZone?.coverageStatus === 'COVERED' &&
      ripZone.totalValidObservationsCount === 1;

    return {
      name: 'Observation Ingestion & Spatial Zone Intersection',
      passed,
      message: passed
        ? 'Accurately mapped coordinate (10, -40) to CZ-02-CENTRAL-RIP and updated zone to COVERED.'
        : `Spatial intersection failed: status=${result.status}, zones=${result.matchedZones.join(',')}`,
    };
  }

  private testOutOfBoundsObservation(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    // Point far inland at x: -200, z: 120 (outside any surveillance zone)
    const result = this.tracker.recordObservation(
      {
        observationId: 'OBS-TEST-OOB',
        cameraId: 'CAM-DRONE-01',
        droneId: 'DRONE-01',
        timestampMs: now,
        scenePosition: { x: -200, y: 0, z: 120 },
        confidence: 0.88,
      },
      now
    );

    const passed = result.status === 'OUT_OF_BOUNDS' && result.matchedZones.length === 0;

    return {
      name: 'Out-of-Bounds Observation Detection & Isolation',
      passed,
      message: passed
        ? 'Correctly identified out-of-bounds coordinates (-200, 120) without corrupting zone states.'
        : `Out of bounds handling failed: status=${result.status}`,
    };
  }

  private testFreshnessAndStaleness(): TestResult {
    this.setupCleanState();
    const t0 = 1000000;

    // Record observation in South Surf (interval is 30,000 ms)
    this.tracker.recordObservation(
      {
        observationId: 'OBS-FRESH-01',
        cameraId: 'CAM-DRONE-01',
        droneId: 'DRONE-01',
        timestampMs: t0,
        scenePosition: { x: -60, y: 0, z: -30 }, // Inside CZ-01-SOUTH-SURF
        confidence: 0.9,
      },
      t0
    );

    // Assign DRONE-01 to zone CZ-01
    this.zoneRegistry.assignDroneToZone('CZ-01-SOUTH-SURF', 'DRONE-01');

    // At t0 + 10s: Fresh
    this.tracker.evaluateCoverageHealth(t0 + 10000);
    const freshStatus = this.zoneRegistry.getZone('CZ-01-SOUTH-SURF')?.coverageStatus;

    // At t0 + 35s: Exceeds 30s threshold -> STALE_COVERAGE
    this.tracker.evaluateCoverageHealth(t0 + 35000);
    const staleStatus = this.zoneRegistry.getZone('CZ-01-SOUTH-SURF')?.coverageStatus;

    const passed = freshStatus === 'COVERED' && staleStatus === 'STALE_COVERAGE';

    return {
      name: 'Observation Freshness Window & Staleness Transition',
      passed,
      message: passed
        ? 'Zone correctly remained COVERED at +10s and automatically transitioned to STALE_COVERAGE at +35s.'
        : `Staleness transition failed: fresh=${freshStatus}, stale=${staleStatus}`,
    };
  }

  private testOverlappingCoverage(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    // First camera observes Central Rip
    this.tracker.recordObservation(
      {
        observationId: 'OBS-CAM1',
        cameraId: 'CAM-DRONE-01',
        droneId: 'DRONE-01',
        timestampMs: now,
        scenePosition: { x: 5, y: 0, z: -30 },
        confidence: 0.95,
      },
      now
    );

    // Second distinct camera observes Central Rip within freshness window
    this.tracker.recordObservation(
      {
        observationId: 'OBS-CAM2',
        cameraId: 'CAM-DRONE-03',
        droneId: 'DRONE-03',
        timestampMs: now + 500,
        scenePosition: { x: 15, y: 0, z: -25 },
        confidence: 0.91,
      },
      now + 500
    );

    const ripZone = this.zoneRegistry.getZone('CZ-02-CENTRAL-RIP');
    const passed = ripZone?.coverageStatus === 'OVERLAPPING_COVERAGE';

    return {
      name: 'Multi-Camera Overlapping Coverage Detection',
      passed,
      message: passed
        ? 'Dual observation from CAM-DRONE-01 and CAM-DRONE-03 accurately promoted status to OVERLAPPING_COVERAGE.'
        : `Overlapping check failed: status=${ripZone?.coverageStatus}`,
    };
  }

  private testDuplicateSuppression(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    const obs = {
      observationId: 'OBS-DUPE-TEST',
      cameraId: 'CAM-DRONE-01',
      droneId: 'DRONE-01',
      timestampMs: now,
      scenePosition: { x: 10, y: 0, z: -40 },
      confidence: 0.9,
    };

    const first = this.tracker.recordObservation(obs, now);
    // Immediate identical re-submission within 15s debounce window
    const second = this.tracker.recordObservation(obs, now + 100);

    const passed = first.status === 'RECORDED' && second.status === 'DUPLICATE';

    return {
      name: 'Duplicate Observation Flood Suppression',
      passed,
      message: passed
        ? 'Rapid duplicate observation suppressed within 15s debounce window.'
        : `Duplicate check failed: first=${first.status}, second=${second.status}`,
    };
  }

  private testBlindSpotClassification(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    // Initial state: all zones are UNASSIGNED
    this.tracker.evaluateCoverageHealth(now);
    const gaps = this.tracker.identifyCoverageGaps(now);

    const unassignedGaps = gaps.filter((g) => g.gapType === 'UNASSIGNED_ZONE');
    const criticalGap = gaps.find(
      (g) => g.zoneId === 'CZ-02-CENTRAL-RIP' && g.severity === 'CRITICAL'
    );

    const passed =
      gaps.length === 4 &&
      unassignedGaps.length === 4 &&
      criticalGap !== undefined &&
      criticalGap.recommendedAction.length > 0;

    return {
      name: 'Coverage Blind Spot & Gap Classification',
      passed,
      message: passed
        ? `Identified all 4 unassigned zones as blind spots; flagged CZ-02-CENTRAL-RIP as CRITICAL severity.`
        : `Gap classification failed: total=${gaps.length}`,
    };
  }

  private testDegradedDroneHandling(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    // Assign DRONE-01 to North Bathing
    this.zoneRegistry.assignDroneToZone('CZ-03-NORTH-BATHING', 'DRONE-01');

    // Record valid observation so it is not UNCOVERED
    this.tracker.recordObservation(
      {
        observationId: 'OBS-DEG-01',
        cameraId: 'CAM-DRONE-01',
        droneId: 'DRONE-01',
        timestampMs: now,
        scenePosition: { x: 80, y: 0, z: -10 },
        confidence: 0.9,
      },
      now
    );

    // Simulate drone telemetry disconnection
    this.droneRegistry.updateConnectivity('DRONE-01', 'DISCONNECTED');

    this.tracker.evaluateCoverageHealth(now);
    const zoneStatus = this.zoneRegistry.getZone('CZ-03-NORTH-BATHING')?.coverageStatus;

    const passed = zoneStatus === 'COVERAGE_DEGRADED';

    return {
      name: 'Degraded Drone & Lost Telemetry Status Degradation',
      passed,
      message: passed
        ? 'Assigned drone link disconnection immediately degraded sector status to COVERAGE_DEGRADED.'
        : `Degraded test failed: status=${zoneStatus}`,
    };
  }

  private testExplicitDenominatorSummary(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    // Assign DRONE-01 to South Surf so zone is monitored
    this.zoneRegistry.assignDroneToZone('CZ-01-SOUTH-SURF', 'DRONE-01');

    // Record observation in South Surf (1 covered out of 4 total)
    this.tracker.recordObservation(
      {
        observationId: 'OBS-SUMM-01',
        cameraId: 'CAM-DRONE-01',
        droneId: 'DRONE-01',
        timestampMs: now,
        scenePosition: { x: -60, y: 0, z: -30 },
        confidence: 0.9,
      },
      now
    );

    const report = this.tracker.getCoverageSummaryReport(now);

    // Explicit calculation: (1 covered / 4 total) * 100 = 25.0%
    const expectedPercentage = 25.0;

    const passed =
      report.totalConfiguredZones === 4 &&
      report.coveredZonesCount === 1 &&
      report.unassignedZonesCount === 3 &&
      report.coveragePercentage === expectedPercentage;

    return {
      name: 'Coverage Summary Report with Explicit Denominator',
      passed,
      message: passed
        ? `Explicit denominator verified: 1 / 4 zones = ${report.coveragePercentage.toFixed(1)}%.`
        : `Denominator calculation failed: ${JSON.stringify(report)}`,
    };
  }

  private testNonInterferenceAndCleanReset(): TestResult {
    this.setupCleanState();

    // Verify reset restores default state
    const zones = this.zoneRegistry.getAllZones();
    const activeDrones = this.droneRegistry.getAllDrones();

    const passed =
      zones.length === 4 &&
      zones.every((z) => z.coverageStatus === 'UNASSIGNED') &&
      activeDrones.length === 4;

    return {
      name: 'Non-Interference & Clean State Reset Isolation',
      passed,
      message: passed
        ? 'Reset cleanly re-initialized default zones and fleet registry without leaking cross-phase state.'
        : `Clean reset failed: zones=${zones.length}, drones=${activeDrones.length}`,
    };
  }
}
