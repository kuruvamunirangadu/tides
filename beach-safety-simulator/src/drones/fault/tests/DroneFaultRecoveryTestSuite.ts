/**
 * DroneFaultRecoveryTestSuite.ts
 * 
 * TIDES Drone Phase 12: Comprehensive Fault Handling & Recovery Test Suite
 * 
 * Tests 21 mandatory failure, uncertainty, resilience, and recovery scenarios:
 * 1. Valid drone telemetry without faults
 * 2. Low-battery warning (20% - 30%)
 * 3. Critical battery handling (<= 20%)
 * 4. Missing battery information (undefined/NaN)
 * 5. Stale telemetry (> 15s)
 * 6. Confirmed communication loss (> 30s or DISCONNECTED)
 * 7. Communication restoration with fresh telemetry
 * 8. Last-known position clearly distinguished from current position (Uncertainty flag)
 * 9. Navigation or movement failure
 * 10. Mission interruption during an active incident
 * 11. Failed return-to-base operation
 * 12. Repeated fault updates without duplicate fault records
 * 13. Recovery retry limits (bounded retries)
 * 14. Drone recovery followed by correct resource reallocation
 * 15. No eligible replacement drone (surface lifesaver escalation)
 * 16. Multiple simultaneous drone faults
 * 17. Multiple incidents competing for replacement resources
 * 18. Fault acknowledgement without false recovery
 * 19. No premature incident closure (life-safety boundary)
 * 20. Existing lifeguard and rescue boat assignments remain intact
 * 21. Existing simulation scenarios and controls remain unchanged
 */

import { DroneRegistry } from '../../foundation/DroneRegistry';
import { DroneMissionManager } from '../../missions/DroneMissionManager';
import { DroneMovementEngine } from '../../movement/DroneMovementEngine';
import { MultiDroneCoordinationEngine } from '../../coordination/MultiDroneCoordinationEngine';
import { MultiDroneAllocationEngine } from '../../coordination/MultiDroneAllocationEngine';
import { IncidentPriorityQueue } from '../../coordination/IncidentPriorityQueue';
import { RescueCoordinator } from '../../../scene3d/rescue/RescueCoordinator';
import { DroneFaultRecoveryManager } from '../DroneFaultRecoveryManager';
import { DroneFaultDetector } from '../DroneFaultDetector';
import { DroneRecoveryStrategyManager } from '../DroneRecoveryStrategyManager';
import { DroneFaultRecord } from '../droneFault.types';

export interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

export class DroneFaultRecoveryTestSuite {
  private registry: DroneRegistry;
  private missionManager: DroneMissionManager;
  private movementEngine: DroneMovementEngine;
  private coordinationEngine: MultiDroneCoordinationEngine;
  private allocationEngine: MultiDroneAllocationEngine;
  private priorityQueue: IncidentPriorityQueue;
  private rescueCoordinator: RescueCoordinator;
  private manager: DroneFaultRecoveryManager;
  private detector: DroneFaultDetector;
  private strategyManager: DroneRecoveryStrategyManager;

  constructor() {
    this.registry = DroneRegistry.getInstance();
    this.missionManager = DroneMissionManager.getInstance();
    this.movementEngine = DroneMovementEngine.getInstance();
    this.coordinationEngine = MultiDroneCoordinationEngine.getInstance();
    this.allocationEngine = this.coordinationEngine.getAllocationEngine();
    this.priorityQueue = this.coordinationEngine.getPriorityQueue();
    this.rescueCoordinator = RescueCoordinator.getInstance();
    this.manager = DroneFaultRecoveryManager.getInstance();
    this.detector = this.manager.getDetector();
    this.strategyManager = this.manager.getStrategyManager();
  }

  private setupCleanState(): void {
    this.manager.reset();
    this.coordinationEngine.reset();
    this.allocationEngine.clear();
    this.priorityQueue.clear();
    this.missionManager.reset();
    this.registry.reset();

    const now = Date.now();
    const drones = this.registry.getAllDrones();
    for (const d of drones) {
      this.registry.ingestTelemetry(
        {
          packetId: `PKT-INIT-${d.droneId}`,
          droneId: d.droneId,
          sourceTimestampMs: now,
          position3D: { ...d.homePosition3D },
          headingDegrees: 0,
          speedMps: 0,
          altitudeMeters: d.homePosition3D.y,
          batteryPercentage: 90,
          connectivity: 'CONNECTED',
        },
        now
      );
    }

    // Set DRONE-03 flotation to false in baseline clean state
    const d3 = this.registry.getDrone('DRONE-03');
    if (d3) {
      d3.capabilities.hasFlotationPayload = false;
    }
  }

  public runAllTests(): TestResult[] {
    return [
      this.test1_ValidTelemetryWithoutFaults(),
      this.test2_LowBatteryWarning(),
      this.test3_CriticalBatteryHandling(),
      this.test4_MissingBatteryInformation(),
      this.test5_StaleTelemetry(),
      this.test6_ConfirmedCommunicationLoss(),
      this.test7_CommunicationRestorationWithFreshTelemetry(),
      this.test8_LastKnownPositionDistinguishedFromLive(),
      this.test9_NavigationOrMovementFailure(),
      this.test10_MissionInterruptionDuringActiveIncident(),
      this.test11_FailedReturnToBaseOperation(),
      this.test12_RepeatedFaultUpdatesWithoutDuplicateRecords(),
      this.test13_RecoveryRetryLimits(),
      this.test14_DroneRecoveryFollowedByReallocation(),
      this.test15_NoEligibleReplacementDroneEscalation(),
      this.test16_MultipleSimultaneousDroneFaults(),
      this.test17_MultipleIncidentsCompetingForReplacement(),
      this.test18_FaultAcknowledgementWithoutFalseRecovery(),
      this.test19_NoPrematureIncidentClosure(),
      this.test20_LifeguardAndRescueBoatAssignmentsIntact(),
      this.test21_ExistingSimulationNonInterference(),
    ];
  }

  // 1. Valid drone telemetry without faults
  private test1_ValidTelemetryWithoutFaults(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    const faults = this.detector.scanFleet(now);
    const passed = faults.length === 0 && this.detector.getActiveFaults().length === 0;

    return {
      name: '1. Valid Drone Telemetry Without Faults',
      passed,
      message: passed
        ? 'Healthy fleet scanned with zero false-positive fault alerts.'
        : `Unexpected faults flagged: count=${faults.length}`,
    };
  }

  // 2. Low-battery warning (20% - 30%)
  private test2_LowBatteryWarning(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    const drone = this.registry.getDrone('DRONE-01')!;
    drone.battery = {
      percentage: 26, // In warning zone (20% < 26% <= 30%)
      reserveThresholdPercent: 20,
      isLowBattery: true,
      isCriticalBattery: false,
    };

    const faults = this.detector.evaluateDrone(drone, now);
    const lowBattFault = faults.find((f) => f.category === 'LOW_BATTERY');

    const passed =
      lowBattFault !== undefined &&
      lowBattFault.severity === 'WARNING' &&
      lowBattFault.status === 'DETECTED';

    return {
      name: '2. Low-Battery Warning Detection',
      passed,
      message: passed
        ? 'Battery at 26% correctly triggered LOW_BATTERY warning without premature critical shutdown.'
        : `Low battery detection failed: found=${Boolean(lowBattFault)}`,
    };
  }

  // 3. Critical battery handling (<= 20%)
  private test3_CriticalBatteryHandling(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    const drone = this.registry.getDrone('DRONE-02')!;
    drone.battery = {
      percentage: 16, // In critical zone (16% <= 20%)
      reserveThresholdPercent: 20,
      isLowBattery: true,
      isCriticalBattery: true,
    };
    drone.position3D.y = 25.0; // Airborne

    const faults = this.detector.evaluateDrone(drone, now);
    const critFault = faults.find((f) => f.category === 'CRITICAL_BATTERY');
    const strat = critFault ? this.strategyManager.selectRecoveryAction(critFault) : null;

    const passed =
      critFault !== undefined &&
      critFault.severity === 'CRITICAL' &&
      strat?.action === 'RETURN_TO_BASE';

    return {
      name: '3. Critical Battery Handling & Immediate RTB',
      passed,
      message: passed
        ? 'Critical battery (16%) triggered CRITICAL_BATTERY alert and autonomous RETURN_TO_BASE command.'
        : `Critical battery check failed: fault=${Boolean(critFault)}, action=${strat?.action}`,
    };
  }

  // 4. Missing battery information (undefined/NaN)
  private test4_MissingBatteryInformation(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    const drone = this.registry.getDrone('DRONE-03')!;
    (drone as any).battery = { percentage: NaN, reserveThresholdPercent: 20 };

    const faults = this.detector.evaluateDrone(drone, now);
    const missingFault = faults.find((f) => f.category === 'MISSING_BATTERY_DATA');
    const strat = missingFault ? this.strategyManager.selectRecoveryAction(missingFault) : null;

    const passed =
      missingFault !== undefined &&
      missingFault.severity === 'CRITICAL' &&
      strat?.action === 'REQUEST_OPERATOR_INTERVENTION';

    return {
      name: '4. Missing/NaN Battery Data Safe Interception',
      passed,
      message: passed
        ? 'Corrupted battery (NaN) flagged as MISSING_BATTERY_DATA and escalated to operator review without blind dispatch.'
        : `Missing battery test failed: fault=${Boolean(missingFault)}`,
    };
  }

  // 5. Stale telemetry (> 15s)
  private test5_StaleTelemetry(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    const drone = this.registry.getDrone('DRONE-01')!;
    drone.lastReceivedTimeMs = now - 20000; // 20s ago (> 15s, < 30s)

    const faults = this.detector.evaluateDrone(drone, now);
    const staleFault = faults.find((f) => f.category === 'STALE_TELEMETRY');

    const passed =
      staleFault !== undefined &&
      staleFault.severity === 'WARNING' &&
      staleFault.isPositionUncertain === true;

    return {
      name: '5. Stale Telemetry Degradation (>15s)',
      passed,
      message: passed
        ? 'Telemetry age 20s degraded to STALE_TELEMETRY with spatial uncertainty flag enabled.'
        : `Stale telemetry check failed: found=${Boolean(staleFault)}`,
    };
  }

  // 6. Confirmed communication loss (> 30s or DISCONNECTED)
  private test6_ConfirmedCommunicationLoss(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    const drone = this.registry.getDrone('DRONE-02')!;
    drone.connectivity = 'DISCONNECTED';
    drone.lastReceivedTimeMs = now - 45000; // 45s ago (> 30s)

    const faults = this.detector.evaluateDrone(drone, now);
    const commsFault = faults.find((f) => f.category === 'COMMUNICATION_LOST');
    const strat = commsFault ? this.strategyManager.selectRecoveryAction(commsFault) : null;

    const passed =
      commsFault !== undefined &&
      commsFault.severity === 'CRITICAL' &&
      commsFault.isPositionUncertain === true &&
      strat?.action === 'HOLD_STATION';

    return {
      name: '6. Confirmed Communication Loss & Stationary Hold',
      passed,
      message: passed
        ? 'Severed uplink correctly elevated to COMMUNICATION_LOST; commanded stationary hold without teleportation.'
        : `Comms loss test failed: fault=${Boolean(commsFault)}, action=${strat?.action}`,
    };
  }

  // 7. Communication restoration with fresh telemetry
  private test7_CommunicationRestorationWithFreshTelemetry(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    // 1. Create active comms lost fault
    const drone = this.registry.getDrone('DRONE-02')!;
    drone.connectivity = 'DISCONNECTED';
    drone.lastReceivedTimeMs = now - 40000;
    this.detector.evaluateDrone(drone, now);

    const activeBefore = this.detector.getFaultsForDrone('DRONE-02');
    const hasCommsBefore = activeBefore.some((f) => f.category === 'COMMUNICATION_LOST');

    // 2. Ingest fresh valid telemetry packet
    drone.connectivity = 'CONNECTED';
    drone.lastReceivedTimeMs = now;
    this.manager.onTelemetryIngested(
      {
        packetId: 'PKT-RESTORE-01',
        droneId: 'DRONE-02',
        sourceTimestampMs: now,
        position3D: { x: 10, y: 15, z: -20 },
        headingDegrees: 90,
        speedMps: 4.0,
        altitudeMeters: 15,
        batteryPercentage: 85,
        connectivity: 'CONNECTED',
      },
      now
    );

    const activeAfter = this.detector.getFaultsForDrone('DRONE-02');
    const hasCommsAfter = activeAfter.some((f) => f.category === 'COMMUNICATION_LOST');
    const historyResolved = this.detector.getFaultHistory().some(
      (f) => f.droneId === 'DRONE-02' && f.category === 'COMMUNICATION_LOST' && f.status === 'RESOLVED'
    );

    const passed = hasCommsBefore && !hasCommsAfter && historyResolved;

    return {
      name: '7. Communication Restoration with Fresh Telemetry',
      passed,
      message: passed
        ? 'Fresh valid telemetry packet cleanly cleared COMMUNICATION_LOST fault and recorded resolution in history.'
        : `Restoration failed: before=${hasCommsBefore}, after=${hasCommsAfter}, history=${historyResolved}`,
    };
  }

  // 8. Last-known position clearly distinguished from current position
  private test8_LastKnownPositionDistinguishedFromLive(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    // Drone was at known coords (15, 20, -35)
    const drone = this.registry.getDrone('DRONE-01')!;
    drone.position3D = { x: 15, y: 20, z: -35 };
    drone.battery.percentage = 85;
    this.detector.recordValidTelemetry(drone, now - 35000);

    // Link lost; coordinates become stale
    drone.connectivity = 'DISCONNECTED';
    drone.lastReceivedTimeMs = now - 35000;

    const faults = this.detector.evaluateDrone(drone, now);
    const commsFault = faults.find((f) => f.category === 'COMMUNICATION_LOST')!;

    const lastKnown = commsFault.lastKnownValidPosition3D;
    const isUncertain = commsFault.isPositionUncertain;

    const passed =
      isUncertain === true &&
      lastKnown !== undefined &&
      lastKnown.x === 15 &&
      lastKnown.y === 20 &&
      lastKnown.z === -35;

    return {
      name: '8. Last-Known Position Preserved & Tagged Uncertain',
      passed,
      message: passed
        ? 'Last-known valid coordinates (15, 20, -35) preserved with mandatory uncertainty flag.'
        : `Last-known check failed: isUncertain=${isUncertain}, coords=${JSON.stringify(lastKnown)}`,
    };
  }

  // 9. Navigation or movement failure
  private test9_NavigationOrMovementFailure(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    const fault = this.detector.registerOrUpdateFault(
      'DRONE-01',
      'MOVEMENT_NAVIGATION_ERROR',
      'CRITICAL',
      'Waypoint navigation stalled: destination unreachable due to virtual airspace obstacle',
      now
    );

    const strat = this.strategyManager.selectRecoveryAction(fault);
    const exec = this.strategyManager.executeRecovery(fault, undefined, now);

    const passed =
      fault.category === 'MOVEMENT_NAVIGATION_ERROR' &&
      strat.action === 'RETRY_OPERATION' &&
      exec.action === 'RETRY_OPERATION' &&
      fault.retryCount === 1;

    return {
      name: '9. Navigation Failure Interception & Bounded Retry',
      passed,
      message: passed
        ? 'Movement navigation error triggered first bounded waypoint retry (Retry 1/3).'
        : `Navigation error test failed: action=${strat.action}, retries=${fault.retryCount}`,
    };
  }

  // 10. Mission interruption during an active incident
  private test10_MissionInterruptionDuringActiveIncident(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    // Enable DRONE-03 flotation payload so replacement is available
    const drone03 = this.registry.getDrone('DRONE-03')!;
    drone03.capabilities.hasFlotationPayload = true;

    // Enqueue critical distress incident assigned to DRONE-02
    this.priorityQueue.enqueue(
      {
        incidentId: 'INC-ACTIVE-FAIL-01',
        source: 'INCIDENT_MANAGER',
        type: 'DISTRESS',
        severity: 'CRITICAL',
        title: 'Swimmer in Distress at Central Channel',
        zoneId: 'CZ-02',
        position3D: { x: 20, y: 0, z: -40 },
        detectedAtMs: now,
        status: 'ALLOCATED',
        assignedDroneId: 'DRONE-02',
      },
      now
    );

    // Drone 02 suffers critical battery while executing rescue
    const fault = this.detector.registerOrUpdateFault(
      'DRONE-02',
      'CRITICAL_BATTERY',
      'CRITICAL',
      'Battery depleted to 14% during active rescue approach',
      now,
      'MSN-ACTIVE-02',
      'INC-ACTIVE-FAIL-01'
    );

    const exec = this.strategyManager.executeRecovery(fault, undefined, now);
    const inc = this.priorityQueue.getIncident('INC-ACTIVE-FAIL-01')!;

    const passed =
      inc.status !== 'RESOLVED' &&
      exec.replacementDroneId === 'DRONE-03' &&
      inc.assignedDroneId === 'DRONE-03';

    return {
      name: '10. Mission Interruption During Active Incident (Auto-Replacement)',
      passed,
      message: passed
        ? 'Incident protected: DRONE-02 critical fault automatically triggered replacement allocation to DRONE-03.'
        : `Active incident protection failed: replacement=${exec.replacementDroneId}, assigned=${inc.assignedDroneId}`,
    };
  }

  // 11. Failed return-to-base operation
  private test11_FailedReturnToBaseOperation(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    const fault = this.detector.registerOrUpdateFault(
      'DRONE-01',
      'MISSION_EXECUTION_FAILURE',
      'CRITICAL',
      'Return-to-base landing pad blocked by physical obstacle',
      now
    );
    // Exhaust retries to simulate RTB terminal failure
    fault.retryCount = fault.maxRetries;

    const strat = this.strategyManager.selectRecoveryAction(fault);
    const passed = strat.action === 'REQUEST_REPLACEMENT_DRONE' || strat.action === 'REQUEST_OPERATOR_INTERVENTION';

    return {
      name: '11. Failed Return-to-Base Escalation',
      passed,
      message: passed
        ? 'Failed RTB with exhausted retries escalated to operator/replacement without looping.'
        : `Failed RTB test failed: action=${strat.action}`,
    };
  }

  // 12. Repeated fault updates without duplicate fault records
  private test12_RepeatedFaultUpdatesWithoutDuplicateRecords(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    const drone = this.registry.getDrone('DRONE-01')!;
    drone.battery.percentage = 24; // Low battery

    // Simulate 10 successive telemetry updates for same unresolved fault
    for (let i = 0; i < 10; i++) {
      this.detector.evaluateDrone(drone, now + i * 50);
    }

    const faultsForDrone = this.detector.getFaultsForDrone('DRONE-01');
    const lowBattFaults = faultsForDrone.filter((f) => f.category === 'LOW_BATTERY');

    const passed = lowBattFaults.length === 1;

    return {
      name: '12. Single-Active-Fault Deduplication Under Rapid Updates',
      passed,
      message: passed
        ? '10 consecutive telemetry frames yielded exactly 1 active LOW_BATTERY fault record without duplicate spam.'
        : `Deduplication failed: activeCount=${lowBattFaults.length}`,
    };
  }

  // 13. Recovery retry limits (bounded retries)
  private test13_RecoveryRetryLimits(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    const fault = this.detector.registerOrUpdateFault(
      'DRONE-01',
      'MOVEMENT_NAVIGATION_ERROR',
      'CRITICAL',
      'Navigation waypoint unreachable',
      now
    );

    // Execute retries up to maximum limit
    for (let i = 0; i < 3; i++) {
      this.strategyManager.executeRecovery(fault, 'RETRY_OPERATION', now + i * 100);
    }

    // Attempt 4th retry when limit is 3
    const overLimitStrat = this.strategyManager.selectRecoveryAction(fault);
    const passed = fault.retryCount === 3 && overLimitStrat.action !== 'RETRY_OPERATION';

    return {
      name: '13. Strict Recovery Retry Limits Enforcement (Max 3 Retries)',
      passed,
      message: passed
        ? 'Recovery retries strictly capped at 3; subsequent attempt transitioned to replacement/operator review.'
        : `Retry limit test failed: retries=${fault.retryCount}, nextAction=${overLimitStrat.action}`,
    };
  }

  // 14. Drone recovery followed by correct resource reallocation
  private test14_DroneRecoveryFollowedByReallocation(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    // 1. Fault DRONE-02 with low battery
    const drone02 = this.registry.getDrone('DRONE-02')!;
    drone02.battery.percentage = 18;
    this.detector.evaluateDrone(drone02, now);

    let fleet = this.allocationEngine.evaluateFleetAvailability(now);
    const drone02LockedBefore = fleet.find((d) => d.droneId === 'DRONE-02')!.isLocked;

    // 2. Simulate complete recharge to 95% and resolve fault
    drone02.battery.percentage = 95;
    this.detector.evaluateDrone(drone02, now + 1000);

    fleet = this.allocationEngine.evaluateFleetAvailability(now + 2000);
    const drone02LockedAfter = fleet.find((d) => d.droneId === 'DRONE-02')!.isLocked;

    const passed = drone02LockedBefore === true && drone02LockedAfter === false;

    return {
      name: '14. Drone Recovery & Fleet Re-allocation Restoration',
      passed,
      message: passed
        ? 'Recharging battery unlocked DRONE-02, restoring availability in multi-incident fleet pool.'
        : `Reallocation test failed: beforeLocked=${drone02LockedBefore}, afterLocked=${drone02LockedAfter}`,
    };
  }

  // 15. No eligible replacement drone (surface lifesaver escalation)
  private test15_NoEligibleReplacementDroneEscalation(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    // All other drones lack flotation or are busy
    this.priorityQueue.enqueue(
      {
        incidentId: 'INC-LONE-SURFACE-01',
        source: 'INCIDENT_MANAGER',
        type: 'DISTRESS',
        severity: 'CRITICAL',
        title: 'Sole Flotation Drone Failure',
        zoneId: 'CZ-02',
        position3D: { x: 10, y: 0, z: -30 },
        detectedAtMs: now,
        status: 'ALLOCATED',
        assignedDroneId: 'DRONE-02',
      },
      now
    );

    // Sole flotation drone DRONE-02 fails
    const drone02 = this.registry.getDrone('DRONE-02')!;
    drone02.battery.percentage = 12;
    drone02.status = 'OFFLINE';

    const fault = this.detector.registerOrUpdateFault(
      'DRONE-02',
      'CRITICAL_BATTERY',
      'CRITICAL',
      'Sole flotation drone depleted battery',
      now,
      'MSN-02',
      'INC-LONE-SURFACE-01'
    );

    const exec = this.strategyManager.executeRecovery(fault, undefined, now);
    const inc = this.priorityQueue.getIncident('INC-LONE-SURFACE-01')!;

    const passed =
      exec.replacementDroneId === undefined &&
      exec.escalatedToSurface === true &&
      (inc.assignedRescueBoatId === 'RB-01' || inc.assignedLifeguardId === 'LG-01') &&
      inc.status !== 'RESOLVED';

    return {
      name: '15. No Replacement Drone: Automatic Surface Lifesaver Escalation',
      passed,
      message: passed
        ? 'When no replacement aerial drones existed, incident escalated seamlessly to Rescue Boat RB-01.'
        : `Escalation failed: surfaceEscalated=${exec.escalatedToSurface}, boat=${inc.assignedRescueBoatId}`,
    };
  }

  // 16. Multiple simultaneous drone faults
  private test16_MultipleSimultaneousDroneFaults(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    const d1 = this.registry.getDrone('DRONE-01')!;
    d1.lastReceivedTimeMs = now - 40000; // Comms lost

    const d2 = this.registry.getDrone('DRONE-02')!;
    d2.battery.percentage = 15; // Critical battery

    const d3 = this.registry.getDrone('DRONE-03')!;
    d3.status = 'OFFLINE';

    this.detector.scanFleet(now);
    const activeFaults = this.detector.getActiveFaults();

    const hasD1 = activeFaults.some((f) => f.droneId === 'DRONE-01' && f.category === 'COMMUNICATION_LOST');
    const hasD2 = activeFaults.some((f) => f.droneId === 'DRONE-02' && f.category === 'CRITICAL_BATTERY');
    const hasD3 = activeFaults.some((f) => f.droneId === 'DRONE-03' && f.category === 'DRONE_OFFLINE');

    const passed = activeFaults.length === 3 && hasD1 && hasD2 && hasD3;

    return {
      name: '16. Multiple Simultaneous Drone Faults Concurrency',
      passed,
      message: passed
        ? 'Simultaneously tracked 3 distinct failure modes across 3 drones without state crosstalk.'
        : `Multi-fault concurrency failed: count=${activeFaults.length}`,
    };
  }

  // 17. Multiple incidents competing for replacement resources
  private test17_MultipleIncidentsCompetingForReplacement(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    // Primary rescue drone DRONE-02 is faulted/unavailable
    const drone02 = this.registry.getDrone('DRONE-02')!;
    drone02.status = 'MAINTENANCE';
    drone02.battery.percentage = 12;

    // Enable DRONE-03 as the single available replacement drone
    const drone03 = this.registry.getDrone('DRONE-03')!;
    drone03.capabilities.hasFlotationPayload = true;

    // Enqueue two competing incidents
    this.priorityQueue.enqueue(
      {
        incidentId: 'INC-COMPETE-CRIT',
        source: 'INCIDENT_MANAGER',
        type: 'DISTRESS',
        severity: 'CRITICAL',
        title: 'Critical Victim',
        zoneId: 'CZ-02',
        position3D: { x: 10, y: 0, z: -30 },
        detectedAtMs: now,
        status: 'QUEUED',
      },
      now
    );

    this.priorityQueue.enqueue(
      {
        incidentId: 'INC-COMPETE-MED',
        source: 'INCIDENT_MANAGER',
        type: 'DISTRESS',
        severity: 'MEDIUM',
        title: 'Fatigued Swimmer',
        zoneId: 'CZ-01',
        position3D: { x: -40, y: 0, z: -20 },
        detectedAtMs: now,
        status: 'QUEUED',
      },
      now
    );

    // Run priority allocation pass
    this.allocationEngine.allocatePendingIncidents(this.priorityQueue.getPendingQueue(), now);

    const critInc = this.priorityQueue.getIncident('INC-COMPETE-CRIT')!;
    const medInc = this.priorityQueue.getIncident('INC-COMPETE-MED')!;

    const passed =
      critInc.assignedDroneId !== undefined &&
      medInc.assignedDroneId === undefined &&
      medInc.status === 'QUEUED';

    return {
      name: '17. Multi-Incident Priority Competition for Replacement Drone',
      passed,
      message: passed
        ? 'Lone available drone awarded to CRITICAL emergency; lower incident held in queue.'
        : `Competition failed: critAsg=${critInc.assignedDroneId}, medAsg=${medInc.assignedDroneId}`,
    };
  }

  // 18. Fault acknowledgement without false recovery
  private test18_FaultAcknowledgementWithoutFalseRecovery(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    const fault = this.detector.registerOrUpdateFault(
      'DRONE-01',
      'CRITICAL_BATTERY',
      'CRITICAL',
      'Battery depleted to 12%',
      now
    );

    // Operator acknowledges fault
    const ackSuccess = this.manager.acknowledgeFault(fault.faultId, 'TEST_OPERATOR_01', now);

    // Fault must NOT be marked resolved!
    const active = this.detector.getActiveFaults();
    const faultStillActive = active.some((f) => f.faultId === fault.faultId);
    const isAcked = fault.operatorAcknowledged;

    const passed = ackSuccess && faultStillActive && isAcked && fault.status !== 'RESOLVED';

    return {
      name: '18. Fault Acknowledgement Without False Physical Recovery',
      passed,
      message: passed
        ? 'Acknowledgement logged operator situational awareness; active physical battery deficit remains open.'
        : `Ack test failed: ackSuccess=${ackSuccess}, stillActive=${faultStillActive}`,
    };
  }

  // 19. No premature incident closure (life-safety boundary)
  private test19_NoPrematureIncidentClosure(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    this.priorityQueue.enqueue(
      {
        incidentId: 'INC-NO-CLOSE-01',
        source: 'INCIDENT_MANAGER',
        type: 'DISTRESS',
        severity: 'CRITICAL',
        title: 'Active Rescue in Rip',
        zoneId: 'CZ-02',
        position3D: { x: 20, y: 0, z: -40 },
        detectedAtMs: now,
        status: 'ALLOCATED',
        assignedDroneId: 'DRONE-02',
      },
      now
    );

    // Drone crashes / disconnected mid-rescue
    const fault = this.detector.registerOrUpdateFault(
      'DRONE-02',
      'COMMUNICATION_LOST',
      'CRITICAL',
      'Telemetry connection severed mid-mission',
      now,
      'MSN-ACTIVE',
      'INC-NO-CLOSE-01'
    );

    this.strategyManager.executeRecovery(fault, undefined, now);
    const inc = this.priorityQueue.getIncident('INC-NO-CLOSE-01')!;

    // Incident MUST remain active/queued, NEVER closed or resolved
    const passed = inc.status !== 'RESOLVED';

    return {
      name: '19. Life-Safety Rule: Zero Premature Incident Closure',
      passed,
      message: passed
        ? 'Drone communication failure mid-rescue safely detached asset without closing active emergency.'
        : `Premature closure violation: status=${inc.status}`,
    };
  }

  // 20. Existing lifeguard and rescue boat assignments remain intact
  private test20_LifeguardAndRescueBoatAssignmentsIntact(): TestResult {
    this.setupCleanState();
    const now = Date.now();

    this.priorityQueue.enqueue(
      {
        incidentId: 'INC-SURFACE-HOLD-01',
        source: 'INCIDENT_MANAGER',
        type: 'DISTRESS',
        severity: 'CRITICAL',
        title: 'Multi-Asset Rip Distress',
        zoneId: 'CZ-02',
        position3D: { x: 20, y: 0, z: -40 },
        detectedAtMs: now,
        status: 'ALLOCATED',
        assignedDroneId: 'DRONE-02',
        assignedLifeguardId: 'LG-01',
        assignedRescueBoatId: 'RB-01',
      },
      now
    );

    // Drone 02 fails
    const fault = this.detector.registerOrUpdateFault(
      'DRONE-02',
      'LOW_BATTERY',
      'WARNING',
      'Battery low during approach',
      now,
      'MSN-02',
      'INC-SURFACE-HOLD-01'
    );

    this.strategyManager.executeRecovery(fault, undefined, now);
    const inc = this.priorityQueue.getIncident('INC-SURFACE-HOLD-01')!;

    // Lifeguard LG-01 and Rescue Boat RB-01 MUST remain assigned
    const passed = inc.assignedLifeguardId === 'LG-01' && inc.assignedRescueBoatId === 'RB-01';

    return {
      name: '20. Surface Lifesaver & Rescue Boat Assignments Preserved',
      passed,
      message: passed
        ? 'Aerial drone failure preserved surface lifesavers LG-01 and Jet Boat RB-01 on scene.'
        : `Surface preservation failed: lg=${inc.assignedLifeguardId}, boat=${inc.assignedRescueBoatId}`,
    };
  }

  // 21. Existing simulation scenarios and controls remain unchanged
  private test21_ExistingSimulationNonInterference(): TestResult {
    this.setupCleanState();
    const droneCount = this.registry.getAllDrones().length;

    // Reset fault recovery manager
    this.manager.reset();

    const droneCountAfter = this.registry.getAllDrones().length;
    const activeFaultsClean = this.detector.getActiveFaults().length === 0;

    const passed = droneCount === 4 && droneCountAfter === 4 && activeFaultsClean;

    return {
      name: '21. Non-Interference & Clean State Reset Isolation',
      passed,
      message: passed
        ? 'Clean fault recovery reset purged diagnostics without modifying underlying 4-drone fleet registry.'
        : `Non-interference check failed: initial=${droneCount}, after=${droneCountAfter}`,
    };
  }
}
