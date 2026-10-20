/**
 * DroneFaultRecoveryManager.ts
 * 
 * TIDES Drone Phase 12: Master Fault Handling & Recovery Orchestrator
 * 
 * Central coordinator connecting DroneFaultDetector, DroneRecoveryStrategyManager,
 * DroneRegistry, DroneMovementEngine, DroneMissionManager, and MultiDroneCoordinationEngine:
 * - Runs continuous 1 Hz fleet scan and recovery cycle in simulation animate loop
 * - Executes automated recovery actions (RTB, hold, replacement allocation, surface escalation)
 * - Verifies resolution criteria when fresh telemetry is ingested or landing completes
 * - Provides Command Center operator actions (Acknowledge, Retry, Manual RTB, Reassignment)
 * - Guarantees zero-teleportation, monotonic audit logging, and active emergency preservation
 */

import { DroneRegistry } from '../foundation/DroneRegistry';
import { DroneMissionManager } from '../missions/DroneMissionManager';
import { DroneMovementEngine } from '../movement/DroneMovementEngine';
import { MultiDroneCoordinationEngine } from '../coordination/MultiDroneCoordinationEngine';
import { MultiDroneAllocationEngine } from '../coordination/MultiDroneAllocationEngine';
import { IncidentPriorityQueue } from '../coordination/IncidentPriorityQueue';
import { RescueCoordinator } from '../../scene3d/rescue/RescueCoordinator';
import { RawDroneTelemetryPacket } from '../foundation/drone.types';
import { DroneFaultDetector } from './DroneFaultDetector';
import { DroneRecoveryStrategyManager } from './DroneRecoveryStrategyManager';
import {
  DroneFaultRecord,
  DroneRecoveryAction,
  FaultMetricsSummary,
  FaultPolicyConfig,
  DEFAULT_FAULT_POLICY_CONFIG,
  FAULT_LIFE_SAFETY_POLICY,
} from './droneFault.types';

export class DroneFaultRecoveryManager {
  private static instance: DroneFaultRecoveryManager | null = null;

  private registry: DroneRegistry;
  private missionManager: DroneMissionManager;
  private movementEngine: DroneMovementEngine;
  private coordinationEngine: MultiDroneCoordinationEngine;
  private allocationEngine: MultiDroneAllocationEngine;
  private priorityQueue: IncidentPriorityQueue;
  private rescueCoordinator: RescueCoordinator;

  private detector: DroneFaultDetector;
  private strategyManager: DroneRecoveryStrategyManager;
  private config: FaultPolicyConfig;

  private lastScanTimeMs: number = 0;
  private readonly SCAN_INTERVAL_MS = 1000; // 1 Hz evaluation loop

  private listeners: Set<() => void> = new Set();

  public static getInstance(config: FaultPolicyConfig = DEFAULT_FAULT_POLICY_CONFIG): DroneFaultRecoveryManager {
    if (!DroneFaultRecoveryManager.instance) {
      const coord = MultiDroneCoordinationEngine.getInstance();
      DroneFaultRecoveryManager.instance = new DroneFaultRecoveryManager(
        DroneRegistry.getInstance(),
        DroneMissionManager.getInstance(),
        DroneMovementEngine.getInstance(),
        coord,
        coord.getAllocationEngine(),
        coord.getPriorityQueue(),
        RescueCoordinator.getInstance(),
        config
      );
    }
    return DroneFaultRecoveryManager.instance;
  }

  constructor(
    registry: DroneRegistry = DroneRegistry.getInstance(),
    missionManager: DroneMissionManager = DroneMissionManager.getInstance(),
    movementEngine: DroneMovementEngine = DroneMovementEngine.getInstance(),
    coordinationEngine: MultiDroneCoordinationEngine = MultiDroneCoordinationEngine.getInstance(),
    allocationEngine?: MultiDroneAllocationEngine,
    priorityQueue?: IncidentPriorityQueue,
    rescueCoordinator: RescueCoordinator = RescueCoordinator.getInstance(),
    config: FaultPolicyConfig = DEFAULT_FAULT_POLICY_CONFIG
  ) {
    this.registry = registry;
    this.missionManager = missionManager;
    this.movementEngine = movementEngine;
    this.coordinationEngine = coordinationEngine;
    this.allocationEngine = allocationEngine || coordinationEngine.getAllocationEngine();
    this.priorityQueue = priorityQueue || coordinationEngine.getPriorityQueue();
    this.rescueCoordinator = rescueCoordinator;
    this.config = { ...config };

    this.detector = new DroneFaultDetector(registry, missionManager, movementEngine, this.config);
    this.strategyManager = new DroneRecoveryStrategyManager(
      registry,
      missionManager,
      movementEngine,
      rescueCoordinator,
      allocationEngine,
      priorityQueue,
      this.config
    );

    // Forward detector updates to listeners
    this.detector.subscribe(() => this.notify());
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  public reset(): void {
    this.detector.reset();
    this.lastScanTimeMs = 0;
    this.notify();
  }

  public getDetector(): DroneFaultDetector {
    return this.detector;
  }

  public getStrategyManager(): DroneRecoveryStrategyManager {
    return this.strategyManager;
  }

  // --------------------------------------------------------------------------
  // Main Simulation Loop Update (Called per frame from BeachScene3D)
  // --------------------------------------------------------------------------

  public update(deltaTimeSec: number, clockMs: number = Date.now()): void {
    if (clockMs - this.lastScanTimeMs < this.SCAN_INTERVAL_MS) {
      return;
    }
    this.lastScanTimeMs = clockMs;

    // 1. Scan fleet for newly emerged or continuing faults
    const activeFaults = this.detector.scanFleet(clockMs);

    // 2. Process all active faults needing strategy execution or verification
    const allActive = this.detector.getActiveFaults();
    for (const fault of allActive) {
      this.processFaultLifecycle(fault, clockMs);
    }

    this.notify();
  }

  /**
   * Advances the formal lifecycle of an active fault record
   */
  private processFaultLifecycle(fault: DroneFaultRecord, clockMs: number): void {
    const drone = this.registry.getDrone(fault.droneId);
    if (!drone) return;

    // Step A: Trigger strategy if newly detected or waiting for response
    if (fault.status === 'DETECTED') {
      fault.status = 'RESPONSE_REQUIRED';
      this.strategyManager.executeRecovery(fault, undefined, clockMs);
      return;
    }

    // Step B: If recovering, check resolution criteria
    if (fault.status === 'RECOVERING') {
      // 1. Check Return-to-Base landing completion
      if (fault.recoveryAction === 'RETURN_TO_BASE' || fault.recoveryAction === 'LAND_SAFELY') {
        const isLandedAtHome =
          Math.abs(drone.position3D.x - drone.homePosition3D.x) < 1.0 &&
          Math.abs(drone.position3D.z - drone.homePosition3D.z) < 1.0 &&
          Math.abs(drone.position3D.y - drone.homePosition3D.y) < 1.0;

        if (isLandedAtHome || drone.status === 'IDLE' || drone.status === 'CHARGING') {
          // Landing verified!
          this.detector.resolveFaultIfActive(
            fault.droneId,
            fault.category,
            `Recovery succeeded: Drone safely landed on home pad ${drone.homeBaseId}`,
            clockMs
          );
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // Telemetry Ingestion Hook (Restores Communication & Battery)
  // --------------------------------------------------------------------------

  /**
   * Evaluates fresh incoming telemetry packets to automatically recover comms faults
   */
  public onTelemetryIngested(packet: RawDroneTelemetryPacket, clockMs: number = Date.now()): void {
    const drone = this.registry.getDrone(packet.droneId);
    if (!drone) return;

    // Record verified valid telemetry
    if (packet.connectivity === 'CONNECTED' && Number.isFinite(packet.position3D.x)) {
      this.detector.recordValidTelemetry(drone, clockMs);

      // Automatically resolve communication and stale telemetry faults
      this.detector.resolveFaultIfActive(
        packet.droneId,
        'COMMUNICATION_LOST',
        `Live telemetry re-established via packet ${packet.packetId}`,
        clockMs
      );
      this.detector.resolveFaultIfActive(
        packet.droneId,
        'STALE_TELEMETRY',
        `Fresh telemetry stream restored via packet ${packet.packetId}`,
        clockMs
      );
      this.detector.resolveFaultIfActive(
        packet.droneId,
        'INVALID_COORDINATES',
        `Finite 3D coordinates restored via packet ${packet.packetId}`,
        clockMs
      );
    }
  }

  // --------------------------------------------------------------------------
  // Operator Command Center Actions
  // --------------------------------------------------------------------------

  /**
   * Operator acknowledges an active fault.
   * Logs situational awareness without falsely marking an unresolved fault as recovered.
   */
  public acknowledgeFault(faultId: string, operatorId: string = 'OPERATOR_1', clockMs: number = Date.now()): boolean {
    const fault = this.detector.getFault(faultId);
    if (!fault || fault.status === 'RESOLVED') return false;

    fault.operatorAcknowledged = true;
    fault.operatorId = operatorId;
    fault.acknowledgedAtMs = clockMs;

    fault.history.push({
      timestampMs: clockMs,
      fromStatus: fault.status,
      toStatus: fault.status,
      event: 'OPERATOR_ACKNOWLEDGED',
      details: `Acknowledged by ${operatorId}. Physical deficit remains active until verified recovery.`,
    });

    this.notify();
    return true;
  }

  /**
   * Operator requests retry of recovery operation
   */
  public retryRecovery(faultId: string, operatorId: string = 'OPERATOR_1', clockMs: number = Date.now()): {
    success: boolean;
    reason?: string;
  } {
    const fault = this.detector.getFault(faultId);
    if (!fault || fault.status === 'RESOLVED') {
      return { success: false, reason: 'Fault not found or already resolved' };
    }

    if (fault.retryCount >= fault.maxRetries) {
      return {
        success: false,
        reason: `Maximum retry limit (${fault.maxRetries}) reached. Automatic retries exhausted.`,
      };
    }

    const res = this.strategyManager.executeRecovery(fault, 'RETRY_OPERATION', clockMs);
    this.notify();
    return { success: res.success, reason: res.rationale };
  }

  /**
   * Operator commands manual Return-to-Base
   */
  public forceReturnToBase(faultId: string, operatorId: string = 'OPERATOR_1', clockMs: number = Date.now()): boolean {
    const fault = this.detector.getFault(faultId);
    if (!fault || fault.status === 'RESOLVED') return false;

    this.strategyManager.executeRecovery(fault, 'RETURN_TO_BASE', clockMs);
    this.notify();
    return true;
  }

  /**
   * Operator requests immediate replacement drone allocation for the incident
   */
  public requestReplacementDrone(
    faultId: string,
    operatorId: string = 'OPERATOR_1',
    clockMs: number = Date.now()
  ): {
    success: boolean;
    replacementDroneId?: string;
    escalatedToSurface: boolean;
  } {
    const fault = this.detector.getFault(faultId);
    if (!fault) return { success: false, escalatedToSurface: false };

    const res = this.strategyManager.handleActiveIncidentProtection(fault, clockMs);
    this.notify();
    return {
      success: Boolean(res.replacementDroneId || res.escalatedToSurface),
      replacementDroneId: res.replacementDroneId,
      escalatedToSurface: res.escalatedToSurface,
    };
  }

  // --------------------------------------------------------------------------
  // Summary Metrics & Reporting
  // --------------------------------------------------------------------------

  public getFaultMetrics(): FaultMetricsSummary {
    const active = this.detector.getActiveFaults();
    const history = this.detector.getFaultHistory();

    const criticalCount = active.filter((f) => f.severity === 'CRITICAL' || f.severity === 'FATAL').length;
    const warningCount = active.filter((f) => f.severity === 'WARNING').length;
    const commsLost = active.filter((f) => f.category === 'COMMUNICATION_LOST').length;
    const lowBatt = active.filter((f) => f.category === 'LOW_BATTERY' || f.category === 'CRITICAL_BATTERY').length;
    const interrupted = active.filter(
      (f) => f.category === 'MISSION_EXECUTION_FAILURE' || f.category === 'UNEXPECTED_INTERRUPTION'
    ).length;
    const replacements = active.filter((f) => f.replacementRequested && f.replacementDroneId).length;
    const escalated = active.filter((f) => f.recoveryAction === 'ESCALATE_TO_SURFACE_RESCUE').length;
    const reviews = active.filter((f) => f.status === 'OPERATOR_REVIEW').length;

    return {
      totalFaultsDetected: active.length + history.length,
      activeFaultsCount: active.length,
      criticalFaultsCount: criticalCount,
      warningFaultsCount: warningCount,
      communicationLostCount: commsLost,
      lowBatteryCount: lowBatt,
      interruptedMissionsCount: interrupted,
      replacementsDispatchedCount: replacements,
      escalatedToSurfaceCount: escalated,
      operatorReviewsPendingCount: reviews,
      resolvedFaultsCount: history.length,
    };
  }
}
