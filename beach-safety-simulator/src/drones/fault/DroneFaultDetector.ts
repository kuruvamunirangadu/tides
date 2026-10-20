/**
 * DroneFaultDetector.ts
 * 
 * TIDES Drone Phase 12: Centralized Fault Detection Service
 * 
 * Authoritative fault detection service integrated with DroneRegistry, DroneMovementEngine,
 * and DroneMissionManager:
 * - Detects battery anomalies (low, critical, missing/NaN)
 * - Identifies telemetry staleness (>15s) and confirmed communication loss (>30s or DISCONNECTED)
 * - Preserves last-known valid coordinates with explicit uncertainty labelling
 * - Identifies invalid coordinates (NaN/undefined/unphysical leaps)
 * - Detects mission execution failures, navigation stalls, and unexpected interruptions
 * - Enforces single-active-fault deduplication per unresolved condition
 */

import { DroneRegistry } from '../foundation/DroneRegistry';
import { DroneMissionManager } from '../missions/DroneMissionManager';
import { DroneMovementEngine } from '../movement/DroneMovementEngine';
import { DroneRecord, DroneWorld3DPosition } from '../foundation/drone.types';
import {
  DroneFaultCategory,
  DroneFaultSeverity,
  DroneFaultRecord,
  FaultPolicyConfig,
  DEFAULT_FAULT_POLICY_CONFIG,
} from './droneFault.types';

export class DroneFaultDetector {
  private static instance: DroneFaultDetector | null = null;

  private registry: DroneRegistry;
  private missionManager: DroneMissionManager;
  private movementEngine: DroneMovementEngine;
  private config: FaultPolicyConfig;

  // Active faults mapped by faultId
  private activeFaults: Map<string, DroneFaultRecord> = new Map();
  // Historical resolved/closed faults
  private faultHistory: DroneFaultRecord[] = [];
  // Deduplication lookup: key = `${droneId}:${category}` -> faultId
  private activeDedupIndex: Map<string, string> = new Map();

  // Last-known verified valid telemetry cache per drone
  private lastKnownValidTelemetry: Map<
    string,
    {
      position3D: DroneWorld3DPosition;
      timestampMs: number;
      batteryPercentage: number;
    }
  > = new Map();

  private faultCounter: number = 1000;
  private listeners: Set<() => void> = new Set();

  public static getInstance(config: FaultPolicyConfig = DEFAULT_FAULT_POLICY_CONFIG): DroneFaultDetector {
    if (!DroneFaultDetector.instance) {
      DroneFaultDetector.instance = new DroneFaultDetector(
        DroneRegistry.getInstance(),
        DroneMissionManager.getInstance(),
        DroneMovementEngine.getInstance(),
        config
      );
    }
    return DroneFaultDetector.instance;
  }

  constructor(
    registry: DroneRegistry = DroneRegistry.getInstance(),
    missionManager: DroneMissionManager = DroneMissionManager.getInstance(),
    movementEngine: DroneMovementEngine = DroneMovementEngine.getInstance(),
    config: FaultPolicyConfig = DEFAULT_FAULT_POLICY_CONFIG
  ) {
    this.registry = registry;
    this.missionManager = missionManager;
    this.movementEngine = movementEngine;
    this.config = { ...config };
  }

  public setConfig(config: Partial<FaultPolicyConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getConfig(): FaultPolicyConfig {
    return { ...this.config };
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
    this.activeFaults.clear();
    this.faultHistory = [];
    this.activeDedupIndex.clear();
    this.lastKnownValidTelemetry.clear();
    this.notify();
  }

  // --------------------------------------------------------------------------
  // Telemetry Ingestion & Last-Known Position Auditing
  // --------------------------------------------------------------------------

  /**
   * Caches verified valid telemetry and updates last-known position
   */
  public recordValidTelemetry(drone: DroneRecord, clockMs: number = Date.now()): void {
    const isPosValid =
      drone.position3D &&
      Number.isFinite(drone.position3D.x) &&
      Number.isFinite(drone.position3D.y) &&
      Number.isFinite(drone.position3D.z);

    const isBattValid =
      drone.battery &&
      Number.isFinite(drone.battery.percentage) &&
      drone.battery.percentage >= 0 &&
      drone.battery.percentage <= 100;

    if (isPosValid && isBattValid) {
      this.lastKnownValidTelemetry.set(drone.droneId, {
        position3D: { ...drone.position3D },
        timestampMs: clockMs,
        batteryPercentage: drone.battery.percentage,
      });
    }
  }

  public getLastKnownValidTelemetry(droneId: string): {
    position3D: DroneWorld3DPosition;
    timestampMs: number;
    batteryPercentage: number;
  } | undefined {
    return this.lastKnownValidTelemetry.get(droneId);
  }

  // --------------------------------------------------------------------------
  // Core Fault Detection & Scan Pass
  // --------------------------------------------------------------------------

  /**
   * Scans all drones and active missions in the authoritative fleet for faults
   */
  public scanFleet(clockMs: number = Date.now()): DroneFaultRecord[] {
    const drones = this.registry.getAllDrones();
    const newFaults: DroneFaultRecord[] = [];

    for (const drone of drones) {
      const droneFaults = this.evaluateDrone(drone, clockMs);
      newFaults.push(...droneFaults);
    }

    return newFaults;
  }

  /**
   * Thoroughly evaluates a single drone against all failure modes
   */
  public evaluateDrone(drone: DroneRecord, clockMs: number = Date.now()): DroneFaultRecord[] {
    const detected: DroneFaultRecord[] = [];

    // Retrieve active mission and incident associations if any
    const activeMission = this.missionManager.getDroneActiveMission(drone.droneId);
    const relatedMissionId = activeMission?.missionId || drone.currentMissionId;
    const relatedIncidentId = activeMission?.linkedIncidentId;

    // 1. Missing or Invalid Coordinates Check
    const hasInvalidCoords =
      !drone.position3D ||
      !Number.isFinite(drone.position3D.x) ||
      !Number.isFinite(drone.position3D.y) ||
      !Number.isFinite(drone.position3D.z);

    if (hasInvalidCoords) {
      const fault = this.registerOrUpdateFault(
        drone.droneId,
        'INVALID_COORDINATES',
        'CRITICAL',
        `Drone coordinates contain NaN or non-finite values (x: ${drone.position3D?.x}, y: ${drone.position3D?.y}, z: ${drone.position3D?.z})`,
        clockMs,
        relatedMissionId,
        relatedIncidentId
      );
      if (fault) detected.push(fault);
    } else {
      // Coords are valid; update last known position if not already flagged comms lost
      if (drone.connectivity !== 'DISCONNECTED') {
        this.recordValidTelemetry(drone, clockMs);
      }
    }

    // 2. Battery Checks (Missing, Critical, Low Warning)
    const batt = drone.battery;
    if (!batt || !Number.isFinite(batt.percentage) || batt.percentage < 0) {
      const fault = this.registerOrUpdateFault(
        drone.droneId,
        'MISSING_BATTERY_DATA',
        'CRITICAL',
        `Battery telemetry missing, undefined, or unmeasurable for ${drone.droneId}`,
        clockMs,
        relatedMissionId,
        relatedIncidentId
      );
      if (fault) detected.push(fault);
    } else {
      // Clear missing battery fault if resolved
      this.resolveFaultIfActive(drone.droneId, 'MISSING_BATTERY_DATA', 'Valid battery telemetry restored', clockMs);

      if (batt.percentage <= this.config.criticalBatteryThresholdPercent) {
        // Critical Battery (<20%)
        const fault = this.registerOrUpdateFault(
          drone.droneId,
          'CRITICAL_BATTERY',
          'CRITICAL',
          `Critical battery level: ${batt.percentage.toFixed(1)}% <= ${this.config.criticalBatteryThresholdPercent}% safety reserve threshold`,
          clockMs,
          relatedMissionId,
          relatedIncidentId
        );
        if (fault) detected.push(fault);
      } else if (batt.percentage <= this.config.lowBatteryWarningThresholdPercent) {
        // Low Battery Warning (20% - 30%)
        const fault = this.registerOrUpdateFault(
          drone.droneId,
          'LOW_BATTERY',
          'WARNING',
          `Low battery warning: ${batt.percentage.toFixed(1)}% <= ${this.config.lowBatteryWarningThresholdPercent}% warning threshold`,
          clockMs,
          relatedMissionId,
          relatedIncidentId
        );
        if (fault) detected.push(fault);
      } else {
        // Battery is healthy: clear low/critical battery faults if active
        this.resolveFaultIfActive(drone.droneId, 'LOW_BATTERY', `Battery replenished to ${batt.percentage}%`, clockMs);
        this.resolveFaultIfActive(drone.droneId, 'CRITICAL_BATTERY', `Battery replenished to ${batt.percentage}%`, clockMs);
      }
    }

    // 3. Telemetry Freshness & Communication Loss
    const ageSeconds = drone.lastReceivedTimeMs > 0 ? Math.max(0, (clockMs - drone.lastReceivedTimeMs) / 1000) : 999;
    const isExplicitlyDisconnected = drone.connectivity === 'DISCONNECTED';
    const isCommsLost = isExplicitlyDisconnected || ageSeconds > this.config.lostCommunicationTimeoutSeconds;
    const isStale = !isCommsLost && ageSeconds > this.config.staleTelemetryTimeoutSeconds;

    if (isCommsLost) {
      const fault = this.registerOrUpdateFault(
        drone.droneId,
        'COMMUNICATION_LOST',
        'CRITICAL',
        isExplicitlyDisconnected
          ? `Uplink to ${drone.droneId} explicitly DISCONNECTED. Command & telemetry stream severed.`
          : `Telemetry lost: age ${ageSeconds.toFixed(1)}s exceeds ${this.config.lostCommunicationTimeoutSeconds}s timeout.`,
        clockMs,
        relatedMissionId,
        relatedIncidentId
      );
      if (fault) detected.push(fault);
      // If communication is lost, resolve any intermediate STALE_TELEMETRY fault
      this.resolveFaultIfActive(drone.droneId, 'STALE_TELEMETRY', 'Elevated to COMMUNICATION_LOST', clockMs);
    } else if (isStale) {
      const fault = this.registerOrUpdateFault(
        drone.droneId,
        'STALE_TELEMETRY',
        'WARNING',
        `Telemetry stale: age ${ageSeconds.toFixed(1)}s exceeds ${this.config.staleTelemetryTimeoutSeconds}s threshold.`,
        clockMs,
        relatedMissionId,
        relatedIncidentId
      );
      if (fault) detected.push(fault);
    } else {
      // Telemetry is fresh (<15s) and CONNECTED
      this.resolveFaultIfActive(drone.droneId, 'STALE_TELEMETRY', `Fresh telemetry received (${ageSeconds.toFixed(1)}s)`, clockMs);
      this.resolveFaultIfActive(drone.droneId, 'COMMUNICATION_LOST', `Communication link re-established (${ageSeconds.toFixed(1)}s)`, clockMs);
    }

    // 4. Drone Marked Offline / Maintenance
    if (drone.status === 'OFFLINE' || drone.status === 'MAINTENANCE') {
      const fault = this.registerOrUpdateFault(
        drone.droneId,
        'DRONE_OFFLINE',
        'WARNING',
        `Drone ${drone.droneId} operational status is ${drone.status}. Unavailable for flight dispatch.`,
        clockMs,
        relatedMissionId,
        relatedIncidentId
      );
      if (fault) detected.push(fault);
    } else {
      this.resolveFaultIfActive(drone.droneId, 'DRONE_OFFLINE', `Drone restored to operational status ${drone.status}`, clockMs);
    }

    // 5. Active Mission Failures & Interruptions
    if (activeMission) {
      if (activeMission.status === 'FAILED') {
        const fault = this.registerOrUpdateFault(
          drone.droneId,
          'MISSION_EXECUTION_FAILURE',
          'CRITICAL',
          `Mission ${activeMission.missionId} failed: ${activeMission.failureReason || 'Execution error reported'}`,
          clockMs,
          activeMission.missionId,
          activeMission.linkedIncidentId
        );
        if (fault) detected.push(fault);
      } else if (activeMission.status === 'CANCELLED') {
        const fault = this.registerOrUpdateFault(
          drone.droneId,
          'UNEXPECTED_INTERRUPTION',
          'INFO',
          `Mission ${activeMission.missionId} cancelled: ${activeMission.cancellationReason || 'Operator or system cancellation'}`,
          clockMs,
          activeMission.missionId,
          activeMission.linkedIncidentId
        );
        if (fault) detected.push(fault);
      }
    }

    return detected;
  }

  // --------------------------------------------------------------------------
  // Deduplicated Fault Registry Management
  // --------------------------------------------------------------------------

  /**
   * Registers a new fault or idempotently updates an unresolved active fault
   * to prevent duplicate spamming across frame ticks.
   */
  public registerOrUpdateFault(
    droneId: string,
    category: DroneFaultCategory,
    severity: DroneFaultSeverity,
    diagnostics: string,
    clockMs: number = Date.now(),
    relatedMissionId?: string,
    relatedIncidentId?: string
  ): DroneFaultRecord {
    const dedupKey = `${droneId}:${category}`;
    const existingFaultId = this.activeDedupIndex.get(dedupKey);

    if (existingFaultId) {
      const existingFault = this.activeFaults.get(existingFaultId);
      if (existingFault && existingFault.status !== 'RESOLVED' && existingFault.status !== 'UNRECOVERABLE') {
        // Idempotently update diagnostics & timestamps without creating duplicate record
        existingFault.diagnostics = diagnostics;
        if (relatedMissionId && !existingFault.relatedMissionId) existingFault.relatedMissionId = relatedMissionId;
        if (relatedIncidentId && !existingFault.relatedIncidentId) existingFault.relatedIncidentId = relatedIncidentId;
        return existingFault;
      }
    }

    // Create new formal fault record
    const faultId = `FLT-${this.faultCounter++}`;
    const lastValid = this.lastKnownValidTelemetry.get(droneId);

    const isCommsOrStale = category === 'COMMUNICATION_LOST' || category === 'STALE_TELEMETRY' || category === 'INVALID_COORDINATES';

    const newFault: DroneFaultRecord = {
      faultId,
      droneId,
      relatedMissionId,
      relatedIncidentId,
      category,
      severity,
      status: 'DETECTED',
      detectedTimestampMs: clockMs,
      lastKnownValidTelemetryTimestampMs: lastValid?.timestampMs,
      lastKnownValidPosition3D: lastValid?.position3D ? { ...lastValid.position3D } : undefined,
      isPositionUncertain: isCommsOrStale,
      diagnostics,
      retryCount: 0,
      maxRetries: this.config.maxRecoveryRetries,
      recoveryOutcome: 'PENDING',
      operatorAcknowledged: false,
      replacementRequested: false,
      history: [
        {
          timestampMs: clockMs,
          fromStatus: 'DETECTED',
          toStatus: 'DETECTED',
          event: 'FAULT_DETECTED',
          details: diagnostics,
        },
      ],
    };

    this.activeFaults.set(faultId, newFault);
    this.activeDedupIndex.set(dedupKey, faultId);

    this.notify();
    return newFault;
  }

  /**
   * Safely marks an active fault resolved when verified recovery criteria are met
   */
  public resolveFaultIfActive(
    droneId: string,
    category: DroneFaultCategory,
    reason: string,
    clockMs: number = Date.now()
  ): boolean {
    const dedupKey = `${droneId}:${category}`;
    const faultId = this.activeDedupIndex.get(dedupKey);
    if (!faultId) return false;

    const fault = this.activeFaults.get(faultId);
    if (!fault || fault.status === 'RESOLVED') return false;

    const fromStatus = fault.status;
    fault.status = 'RESOLVED';
    fault.recoveryOutcome = 'SUCCEEDED';
    fault.resolutionTimestampMs = clockMs;
    fault.resolutionReason = reason;
    fault.isPositionUncertain = false;

    fault.history.push({
      timestampMs: clockMs,
      fromStatus,
      toStatus: 'RESOLVED',
      event: 'FAULT_RESOLVED',
      details: reason,
    });

    // Remove from active dedup index and move to history
    this.activeDedupIndex.delete(dedupKey);
    this.activeFaults.delete(faultId);
    this.faultHistory.push({ ...fault });

    this.notify();
    return true;
  }

  // --------------------------------------------------------------------------
  // Query & Reporting API
  // --------------------------------------------------------------------------

  public getActiveFaults(): DroneFaultRecord[] {
    return Array.from(this.activeFaults.values());
  }

  public getFault(faultId: string): DroneFaultRecord | undefined {
    return this.activeFaults.get(faultId) || this.faultHistory.find((f) => f.faultId === faultId);
  }

  public getFaultsForDrone(droneId: string): DroneFaultRecord[] {
    return Array.from(this.activeFaults.values()).filter((f) => f.droneId === droneId);
  }

  public getFaultsForIncident(incidentId: string): DroneFaultRecord[] {
    return Array.from(this.activeFaults.values()).filter((f) => f.relatedIncidentId === incidentId);
  }

  public getFaultHistory(): DroneFaultRecord[] {
    return [...this.faultHistory];
  }
}

