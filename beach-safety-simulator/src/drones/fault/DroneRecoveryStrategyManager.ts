/**
 * DroneRecoveryStrategyManager.ts
 * 
 * TIDES Drone Phase 12: Recovery Strategy Decision Layer
 * 
 * Evaluates operational faults, validates current drone/mission state, and determines
 * supported recovery procedures using existing simulator systems:
 * - Return-to-Base (RTB) for low battery
 * - Station hold and uncertainty preservation for comms loss / stale telemetry
 * - Bounded retries for transient navigation errors (maxRetries = 3)
 * - Autonomous replacement drone requests via MultiDroneAllocationEngine
 * - Escalation to surface lifesavers (RescueCoordinator, LG-01, RB-01)
 * - Operator review when automatic recovery is unsafe
 * - Enforces zero-teleportation and life-safety active incident protection
 */

import { DroneRegistry } from '../foundation/DroneRegistry';
import { DroneMissionManager } from '../missions/DroneMissionManager';
import { DroneMovementEngine } from '../movement/DroneMovementEngine';
import { RescueCoordinator } from '../../scene3d/rescue/RescueCoordinator';
import { MultiDroneAllocationEngine } from '../coordination/MultiDroneAllocationEngine';
import { IncidentPriorityQueue } from '../coordination/IncidentPriorityQueue';
import { MultiDroneCoordinationEngine } from '../coordination/MultiDroneCoordinationEngine';
import {
  DroneFaultRecord,
  DroneRecoveryAction,
  DroneRecoveryOutcome,
  FaultPolicyConfig,
  DEFAULT_FAULT_POLICY_CONFIG,
} from './droneFault.types';

export interface StrategyExecutionResult {
  success: boolean;
  action: DroneRecoveryAction;
  outcome: DroneRecoveryOutcome;
  rationale: string;
  replacementDroneId?: string;
  escalatedToSurface: boolean;
}

export class DroneRecoveryStrategyManager {
  private registry: DroneRegistry;
  private missionManager: DroneMissionManager;
  private movementEngine: DroneMovementEngine;
  private rescueCoordinator: RescueCoordinator;
  private allocationEngine: MultiDroneAllocationEngine;
  private priorityQueue: IncidentPriorityQueue;
  private config: FaultPolicyConfig;

  constructor(
    registry: DroneRegistry = DroneRegistry.getInstance(),
    missionManager: DroneMissionManager = DroneMissionManager.getInstance(),
    movementEngine: DroneMovementEngine = DroneMovementEngine.getInstance(),
    rescueCoordinator: RescueCoordinator = RescueCoordinator.getInstance(),
    allocationEngine?: MultiDroneAllocationEngine,
    priorityQueue?: IncidentPriorityQueue,
    config: FaultPolicyConfig = DEFAULT_FAULT_POLICY_CONFIG
  ) {
    this.registry = registry;
    this.missionManager = missionManager;
    this.movementEngine = movementEngine;
    this.rescueCoordinator = rescueCoordinator;
    const coord = MultiDroneCoordinationEngine.getInstance();
    this.allocationEngine = allocationEngine || coord.getAllocationEngine();
    this.priorityQueue = priorityQueue || coord.getPriorityQueue();
    this.config = { ...config };
  }

  public setConfig(config: Partial<FaultPolicyConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // --------------------------------------------------------------------------
  // Strategy Determination
  // --------------------------------------------------------------------------

  /**
   * Selects an appropriate, supported recovery action based on the fault category,
   * drone state, and incident commitments.
   */
  public selectRecoveryAction(fault: DroneFaultRecord): {
    action: DroneRecoveryAction;
    rationale: string;
  } {
    const drone = this.registry.getDrone(fault.droneId);
    if (!drone) {
      return {
        action: 'REQUEST_OPERATOR_INTERVENTION',
        rationale: `Drone ${fault.droneId} not found in authoritative registry. Manual operator intervention required.`,
      };
    }

    // 1. Critical Battery Handling
    if (fault.category === 'CRITICAL_BATTERY') {
      const isAirborne = drone.position3D.y > (drone.homePosition3D.y + 0.5);
      if (isAirborne) {
        return {
          action: 'RETURN_TO_BASE',
          rationale: `Critical battery (${drone.battery?.percentage}%). Immediate autonomous Return-to-Base commanded to preserve airframe.`,
        };
      } else {
        return {
          action: 'MARK_UNAVAILABLE',
          rationale: `Critical battery (${drone.battery?.percentage}%) while landed. Locked to pad charger until replenished.`,
        };
      }
    }

    // 2. Low Battery Warning Handling
    if (fault.category === 'LOW_BATTERY') {
      const isAirborne = drone.position3D.y > (drone.homePosition3D.y + 0.5);
      if (isAirborne && this.config.autoReturnOnLowBattery) {
        return {
          action: 'RETURN_TO_BASE',
          rationale: `Low battery warning (${drone.battery?.percentage}% <= ${this.config.lowBatteryWarningThresholdPercent}%). Return-to-Base requested.`,
        };
      } else {
        return {
          action: 'MARK_UNAVAILABLE',
          rationale: `Low battery (${drone.battery?.percentage}%). Barred from new flight dispatches until recharged.`,
        };
      }
    }

    // 3. Missing Battery Data
    if (fault.category === 'MISSING_BATTERY_DATA') {
      return {
        action: 'REQUEST_OPERATOR_INTERVENTION',
        rationale: `Battery telemetry unmeasurable. Feasibility of return cannot be validated without battery data. Operator review required.`,
      };
    }

    // 4. Lost Communication & Stale Telemetry
    if (fault.category === 'COMMUNICATION_LOST') {
      return {
        action: 'HOLD_STATION',
        rationale: `Telemetry connection severed. Kinematic position uncertain; holding stationary hover on last-known coordinates without blind movement.`,
      };
    }

    if (fault.category === 'STALE_TELEMETRY') {
      return {
        action: 'REQUEST_OPERATOR_INTERVENTION',
        rationale: `Telemetry updates delayed (>15s). Position uncertain; awaiting link refresh or operator confirmation.`,
      };
    }

    // 5. Invalid Coordinates
    if (fault.category === 'INVALID_COORDINATES') {
      return {
        action: 'HOLD_STATION',
        rationale: `Telemetry reported non-finite coordinates. Kinematic navigation suspended to prevent unphysical jump.`,
      };
    }

    // 6. Movement / Navigation Errors & Execution Failures
    if (fault.category === 'MOVEMENT_NAVIGATION_ERROR' || fault.category === 'MISSION_EXECUTION_FAILURE') {
      if (fault.retryCount < fault.maxRetries) {
        return {
          action: 'RETRY_OPERATION',
          rationale: `Transient navigation anomaly. Attempting bounded waypoint retry (${fault.retryCount + 1}/${fault.maxRetries}).`,
        };
      } else {
        return {
          action: 'REQUEST_REPLACEMENT_DRONE',
          rationale: `Recovery retry limit reached (${fault.maxRetries}/${fault.maxRetries}). Aborting mission and requesting replacement drone.`,
        };
      }
    }

    // 7. Offline / Maintenance
    if (fault.category === 'DRONE_OFFLINE') {
      return {
        action: 'MARK_UNAVAILABLE',
        rationale: `Drone entered OFFLINE/MAINTENANCE status. Locked in fleet allocator.`,
      };
    }

    // Default fallback
    return {
      action: 'REQUEST_OPERATOR_INTERVENTION',
      rationale: `Operational anomaly (${fault.category}) requires human command-center assessment.`,
    };
  }

  // --------------------------------------------------------------------------
  // Strategy Execution
  // --------------------------------------------------------------------------

  /**
   * Executes the selected recovery strategy using existing simulator subsystems.
   * Guarantees that active incidents are preserved and replacement assets are requested.
   */
  public executeRecovery(
    fault: DroneFaultRecord,
    actionOverride?: DroneRecoveryAction,
    clockMs: number = Date.now()
  ): StrategyExecutionResult {
    const selected = actionOverride
      ? { action: actionOverride, rationale: `Operator override: ${actionOverride}` }
      : this.selectRecoveryAction(fault);

    fault.recoveryAction = selected.action;
    fault.recoveryActionRationale = selected.rationale;
    fault.status = 'RECOVERING';
    fault.recoveryOutcome = 'IN_PROGRESS';

    fault.history.push({
      timestampMs: clockMs,
      fromStatus: 'RESPONSE_REQUIRED',
      toStatus: 'RECOVERING',
      event: 'RECOVERY_STARTED',
      details: `Action: ${selected.action} | ${selected.rationale}`,
    });

    const drone = this.registry.getDrone(fault.droneId);
    let success = true;
    let replacementDroneId: string | undefined = undefined;
    let escalatedToSurface = false;

    switch (selected.action) {
      case 'RETURN_TO_BASE': {
        if (fault.relatedMissionId) {
          const missionResult = this.missionManager.requestReturnToBase(
            fault.relatedMissionId,
            `Fault recovery: ${fault.category}`,
            clockMs
          );
          if (!missionResult.success) {
            // Fall back to direct movement return
            this.movementEngine.returnToBase(fault.droneId);
          }
        } else {
          this.movementEngine.returnToBase(fault.droneId);
        }

        // If the drone was serving an active emergency incident, request a replacement!
        if (fault.relatedIncidentId) {
          const repResult = this.handleActiveIncidentProtection(fault, clockMs);
          replacementDroneId = repResult.replacementDroneId;
          escalatedToSurface = repResult.escalatedToSurface;
        }
        break;
      }

      case 'HOLD_STATION': {
        this.movementEngine.stopAndHold(fault.droneId);
        if (fault.relatedIncidentId) {
          const repResult = this.handleActiveIncidentProtection(fault, clockMs);
          replacementDroneId = repResult.replacementDroneId;
          escalatedToSurface = repResult.escalatedToSurface;
        }
        break;
      }

      case 'LAND_SAFELY': {
        if (drone) {
          this.movementEngine.stopAndHold(fault.droneId, drone.homePosition3D.y);
          drone.status = 'RETURNING';
        }
        if (fault.relatedIncidentId) {
          const repResult = this.handleActiveIncidentProtection(fault, clockMs);
          replacementDroneId = repResult.replacementDroneId;
          escalatedToSurface = repResult.escalatedToSurface;
        }
        break;
      }

      case 'RETRY_OPERATION': {
        fault.retryCount++;
        if (fault.relatedMissionId) {
          const mission = this.missionManager.getMission(fault.relatedMissionId);
          if (mission && mission.status !== 'CANCELLED' && mission.status !== 'FAILED') {
            // Re-apply flight profile to retry path
            if (mission.waypoints.length > 0) {
              this.movementEngine.dispatchToWorldPosition(
                fault.droneId,
                mission.waypoints[mission.currentWaypointIndex || 0].position3D,
                mission.waypoints[mission.currentWaypointIndex || 0].targetAltitudeMeters,
                mission.missionId
              );
            }
          }
        }
        break;
      }

      case 'MARK_UNAVAILABLE': {
        if (drone) {
          // Lock drone in registry so allocator excludes it
          drone.status = 'MAINTENANCE';
        }
        if (fault.relatedIncidentId) {
          const repResult = this.handleActiveIncidentProtection(fault, clockMs);
          replacementDroneId = repResult.replacementDroneId;
          escalatedToSurface = repResult.escalatedToSurface;
        }
        break;
      }

      case 'REQUEST_REPLACEMENT_DRONE': {
        if (fault.relatedIncidentId) {
          const repResult = this.handleActiveIncidentProtection(fault, clockMs);
          replacementDroneId = repResult.replacementDroneId;
          escalatedToSurface = repResult.escalatedToSurface;
        }
        break;
      }

      case 'ESCALATE_TO_SURFACE_RESCUE': {
        if (fault.relatedIncidentId) {
          this.escalateIncidentToSurfaceLifesavers(fault.relatedIncidentId, fault.diagnostics, clockMs);
          escalatedToSurface = true;
        }
        break;
      }

      case 'REQUEST_OPERATOR_INTERVENTION': {
        fault.status = 'OPERATOR_REVIEW';
        fault.recoveryOutcome = 'PENDING';
        fault.history.push({
          timestampMs: clockMs,
          fromStatus: 'RECOVERING',
          toStatus: 'OPERATOR_REVIEW',
          event: 'OPERATOR_REVIEW_REQUIRED',
          details: selected.rationale,
        });
        break;
      }

      case 'CONTINUE_SAFELY': {
        fault.recoveryOutcome = 'SUCCEEDED';
        fault.status = 'RESOLVED';
        break;
      }
    }

    return {
      success,
      action: selected.action,
      outcome: fault.recoveryOutcome,
      rationale: selected.rationale,
      replacementDroneId,
      escalatedToSurface,
    };
  }

  // --------------------------------------------------------------------------
  // Active Incident Protection & Replacement Coordination
  // --------------------------------------------------------------------------

  /**
   * Protects the life-safety lifecycle of an active emergency incident when its
   * assigned aerial drone fails. Requests an alternate eligible drone from the fleet,
   * or escalates to surface lifesavers (RescueCoordinator, LG-01, RB-01) if no drone is available.
   */
  public handleActiveIncidentProtection(
    fault: DroneFaultRecord,
    clockMs: number = Date.now()
  ): {
    replacementDroneId?: string;
    escalatedToSurface: boolean;
  } {
    const incidentId = fault.relatedIncidentId;
    if (!incidentId) {
      return { escalatedToSurface: false };
    }

    const incident = this.priorityQueue.getIncident(incidentId);
    if (!incident || incident.status === 'RESOLVED') {
      return { escalatedToSurface: false };
    }

    // 1. Detach failing drone from incident and mark failing drone as unavailable
    const failingDrone = this.registry.getDrone(fault.droneId);
    if (failingDrone && failingDrone.status !== 'RETURNING') {
      failingDrone.status = 'OFFLINE';
    }

    incident.assignedDroneId = undefined;
    incident.status = 'QUEUED';
    incident.allocationRationale = `Replacement required: Primary asset ${fault.droneId} faulted (${fault.category})`;
    incident.history.push({
      timestampMs: clockMs,
      fromStatus: 'ALLOCATED',
      toStatus: 'QUEUED',
      reason: `Primary drone ${fault.droneId} faulted (${fault.category}). Held in priority queue for replacement dispatch.`,
    });

    fault.replacementRequested = true;

    // 2. Perform atomic allocation pass to locate an eligible replacement
    const pending = [incident];
    const allocResult = this.allocationEngine.allocatePendingIncidents(pending, clockMs);

    if (allocResult.allocatedCount > 0 && incident.assignedDroneId) {
      // Successfully found replacement drone!
      fault.replacementDroneId = incident.assignedDroneId;
      fault.history.push({
        timestampMs: clockMs,
        fromStatus: fault.status,
        toStatus: fault.status,
        event: 'REPLACEMENT_DRONE_ALLOCATED',
        details: `Replacement drone ${incident.assignedDroneId} allocated to incident ${incidentId}`,
      });
      return { replacementDroneId: incident.assignedDroneId, escalatedToSurface: false };
    }

    // 3. No eligible replacement drone available: ESCALATE to surface rescue resources!
    this.escalateIncidentToSurfaceLifesavers(incidentId, `No replacement aerial drones available in fleet (${fault.category})`, clockMs);
    return { escalatedToSurface: true };
  }

  /**
   * Escalates an active incident to surface lifesavers without closing the incident
   */
  public escalateIncidentToSurfaceLifesavers(
    incidentId: string,
    reason: string,
    clockMs: number = Date.now()
  ): void {
    const incident = this.priorityQueue.getIncident(incidentId);
    if (incident) {
      // Ensure surface lifesavers are assigned
      const boat = this.rescueCoordinator.registry.getResource('RB-01');
      const lg1 = this.rescueCoordinator.registry.getResource('LG-01');

      if (boat && (boat.status === 'AVAILABLE' || boat.assignedIncidentId === incidentId)) {
        incident.assignedRescueBoatId = 'RB-01';
      }
      if (lg1 && (lg1.status === 'AVAILABLE' || lg1.assignedIncidentId === incidentId)) {
        incident.assignedLifeguardId = 'LG-01';
      }

      incident.history.push({
        timestampMs: clockMs,
        fromStatus: incident.status,
        toStatus: incident.status,
        reason: `Escalated to surface lifesavers: ${reason}`,
      });
    }
  }
}
