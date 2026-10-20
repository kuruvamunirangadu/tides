/**
 * MultiDroneAllocationEngine.ts
 * 
 * TIDES Drone Phase 11: Multi-Drone Allocation & Conflict Resolution Engine
 * 
 * Central deterministic allocation service matching active coastal incidents
 * with eligible aerial drones, resolving resource conflicts, enforcing preemption
 * policies, and synchronizing with existing rescue and mission services.
 */

import { DroneRegistry } from '../foundation/DroneRegistry';
import { DroneMissionManager } from '../missions/DroneMissionManager';
import { DroneRescueDispatchManager } from '../rescue/DroneRescueDispatchManager';
import { RescueCoordinator } from '../../scene3d/rescue/RescueCoordinator';
import { DroneWorld3DPosition, DroneRecord } from '../foundation/drone.types';
import {
  CoordinationIncident,
  DroneResourceAvailability,
  AllocationCandidateScore,
  AllocationDecision,
  CoordinationConflictRecord,
  CoordinationPolicyConfig,
} from './droneCoordination.types';

export class MultiDroneAllocationEngine {
  private droneRegistry: DroneRegistry;
  private missionManager: DroneMissionManager;
  private rescueDispatchManager: DroneRescueDispatchManager;
  private rescueCoordinator: RescueCoordinator;
  private config: CoordinationPolicyConfig;

  // Decision and conflict audit history
  private decisions: AllocationDecision[] = [];
  private conflicts: CoordinationConflictRecord[] = [];
  private decisionCounter: number = 1000;
  private conflictCounter: number = 1000;

  constructor(
    config: CoordinationPolicyConfig,
    droneRegistry: DroneRegistry = DroneRegistry.getInstance(),
    missionManager: DroneMissionManager = DroneMissionManager.getInstance(),
    rescueDispatchManager: DroneRescueDispatchManager = DroneRescueDispatchManager.getInstance(),
    rescueCoordinator: RescueCoordinator = RescueCoordinator.getInstance()
  ) {
    this.config = config;
    this.droneRegistry = droneRegistry;
    this.missionManager = missionManager;
    this.rescueDispatchManager = rescueDispatchManager;
    this.rescueCoordinator = rescueCoordinator;
  }

  public updateConfig(config: Partial<CoordinationPolicyConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public clear(): void {
    this.decisions = [];
    this.conflicts = [];
    this.decisionCounter = 1000;
    this.conflictCounter = 1000;
  }

  public getDecisions(): AllocationDecision[] {
    return [...this.decisions];
  }

  public getConflicts(): CoordinationConflictRecord[] {
    return [...this.conflicts];
  }

  /**
   * Scans authoritative DroneRegistry and MissionManager to produce shared availability matrix
   */
  public evaluateFleetAvailability(clockMs: number = Date.now()): DroneResourceAvailability[] {
    const drones = this.droneRegistry.getAllDrones();
    const result: DroneResourceAvailability[] = [];

    for (const drone of drones) {
      const ageSec = Math.max(0, (clockMs - drone.lastReceivedTimeMs) / 1000);
      const isOnline = drone.connectivity !== 'DISCONNECTED' && drone.status !== 'OFFLINE';
      const battPct = drone.battery?.percentage ?? 0;
      const hasBattery = battPct >= this.config.minBatteryForRescuePercent;
      const isFresh = ageSec <= this.config.maxTelemetryAgeSeconds;

      const hasFlotation = Boolean(drone.capabilities?.hasFlotationPayload);
      const activeMissionId = drone.currentMissionId;

      // Determine lock and preemption state
      let isLocked = false;
      let isPreemptible = false;
      let lockReason: string | undefined = undefined;

      if (!isOnline) {
        isLocked = true;
        lockReason = `Drone is ${drone.connectivity === 'DISCONNECTED' ? 'DISCONNECTED' : 'OFFLINE'}`;
      } else if (!hasBattery) {
        isLocked = true;
        lockReason = `Battery (${battPct}%) below dispatch threshold (${this.config.minBatteryForRescuePercent}%)`;
      } else if (!isFresh) {
        isLocked = true;
        lockReason = `Telemetry is stale (${ageSec.toFixed(1)}s > ${this.config.maxTelemetryAgeSeconds}s)`;
      } else if (activeMissionId) {
        const mission = this.missionManager.getMission(activeMissionId);
        if (mission && (mission.type === 'RESCUE_ASSISTANCE' || (mission.type as any) === 'RESCUE_DROP')) {
          // Active rescue mission is locked and protected against interruption
          isLocked = true;
          lockReason = `Engaged in active rescue mission ${activeMissionId}`;
        } else if (mission && mission.type === 'PATROL') {
          // Routine patrol can be preempted for life-threatening emergencies
          isPreemptible = this.config.preemptionAllowedForCritical;
          lockReason = `Executing routine patrol ${activeMissionId} (Preemptible for distress)`;
        } else {
          isLocked = true;
          lockReason = `Assigned to active mission ${activeMissionId}`;
        }
      } else if (drone.status === 'RETURNING') {
        isLocked = true;
        lockReason = 'Returning to launch pad';
      }

      const isEligibleForRescue =
        isOnline &&
        hasBattery &&
        isFresh &&
        hasFlotation &&
        (!isLocked || isPreemptible);

      const isEligibleForPatrol =
        isOnline &&
        hasBattery &&
        isFresh &&
        !isLocked &&
        (drone.role === 'SURVEILLANCE' || drone.role === 'MULTI_ROLE');

      result.push({
        droneId: drone.droneId,
        callsign: drone.callsign,
        role: drone.role,
        operationalStatus: drone.status,
        connectivity: drone.connectivity,
        batteryPercentage: battPct,
        telemetryAgeSeconds: ageSec,
        position3D: { ...drone.position3D },
        currentMissionId: activeMissionId,
        capabilities: { ...drone.capabilities },
        isEligibleForRescue,
        isEligibleForPatrol,
        isLocked,
        isPreemptible,
        lockReason,
      });
    }

    return result;
  }

  /**
   * Evaluates candidate drones for an incident and returns ranked scores
   */
  public evaluateCandidatesForIncident(
    incident: CoordinationIncident,
    fleet: DroneResourceAvailability[],
    clockMs: number = Date.now()
  ): AllocationCandidateScore[] {
    const scores: AllocationCandidateScore[] = [];

    for (const res of fleet) {
      const rejectionReasons: string[] = [];

      // 1. Connectivity & Telemetry Check
      if (res.connectivity === 'DISCONNECTED' || res.operationalStatus === 'OFFLINE') {
        rejectionReasons.push(`Drone is ${res.connectivity === 'DISCONNECTED' ? 'DISCONNECTED' : 'OFFLINE'}`);
      }
      if (res.telemetryAgeSeconds > this.config.maxTelemetryAgeSeconds) {
        rejectionReasons.push(`Telemetry stale (${res.telemetryAgeSeconds.toFixed(1)}s > ${this.config.maxTelemetryAgeSeconds}s)`);
      }

      // 2. Battery Reserve Check
      if (res.batteryPercentage < this.config.minBatteryForRescuePercent) {
        rejectionReasons.push(`Battery depleted (${res.batteryPercentage}% < ${this.config.minBatteryForRescuePercent}%)`);
      }

      // 3. Capability Check: Swimmer distress strictly requires flotation payload
      if (incident.type === 'DISTRESS' && !res.capabilities.hasFlotationPayload) {
        rejectionReasons.push(`Lacks flotation payload required for water distress`);
      }

      // 4. Mission Conflict & Preemption Check
      if (res.isLocked && !res.isPreemptible) {
        rejectionReasons.push(res.lockReason || 'Drone is locked to active mission');
      }

      // If preemption is required, verify incident severity is CRITICAL or HIGH
      if (res.isPreemptible && incident.severity !== 'CRITICAL' && incident.severity !== 'HIGH') {
        rejectionReasons.push(`Preemption of patrol only permitted for CRITICAL or HIGH emergencies`);
      }

      // 5. Spatial Proximity & Flight Time
      const distance = Math.hypot(
        res.position3D.x - incident.position3D.x,
        res.position3D.z - incident.position3D.z
      );
      const estTimeSec = distance / 10.0; // Cruise speed 10 m/s

      const isEligible = rejectionReasons.length === 0;

      // Scoring model
      const proximityScore = Math.max(0, 100 - distance * 0.25);
      const batteryScore = res.batteryPercentage * 0.5;
      const capabilityScore = res.capabilities.hasFlotationPayload ? 20 : 10;
      const idleBonus = res.operationalStatus === 'IDLE' ? 30 : (res.isPreemptible ? 10 : 0);

      const overallScore = isEligible
        ? proximityScore + batteryScore + capabilityScore + idleBonus
        : -1;

      scores.push({
        droneId: res.droneId,
        isEligible,
        rejectionReasons,
        distanceMeters: distance,
        estimatedTransitTimeSeconds: estTimeSec,
        batteryPercentage: res.batteryPercentage,
        isCurrentlyPreemptible: res.isPreemptible,
        overallScore,
        scoreBreakdown: {
          proximityScore,
          batteryScore,
          capabilityScore,
          idleBonus,
        },
      });
    }

    // Sort: Highest overall score first
    scores.sort((a, b) => b.overallScore - a.overallScore);
    return scores;
  }

  /**
   * Performs atomic multi-drone allocation across all pending incidents in priority order
   */
  public allocatePendingIncidents(
    incidents: CoordinationIncident[],
    clockMs: number = Date.now()
  ): {
    decisions: AllocationDecision[];
    allocatedCount: number;
    queuedCount: number;
  } {
    const fleet = this.evaluateFleetAvailability(clockMs);
    const assignedDroneIds = new Set<string>();

    const currentDecisions: AllocationDecision[] = [];
    let allocatedCount = 0;
    let queuedCount = 0;

    for (const incident of incidents) {
      // Only allocate unassigned incidents
      if (incident.status !== 'QUEUED' && incident.status !== 'UNASSIGNABLE') {
        continue;
      }

      // Evaluate all fleet assets for full transparency and explainability
      const candidateScores = this.evaluateCandidatesForIncident(incident, fleet, clockMs);

      // Find best eligible candidate not yet claimed in this pass
      const bestCandidate = candidateScores.find((c) => c.isEligible && !assignedDroneIds.has(c.droneId));

      if (bestCandidate) {
        const drone = fleet.find((d) => d.droneId === bestCandidate.droneId)!;
        const isPreempted = bestCandidate.isCurrentlyPreemptible;

        if (isPreempted) {
          // Log preemption conflict
          const conflictId = `CONF-${this.conflictCounter++}`;
          this.conflicts.push({
            conflictId,
            conflictType: 'PATROL_PREEMPTION',
            timestampMs: clockMs,
            incidentIds: [incident.incidentId],
            droneIds: [drone.droneId],
            resolutionAction: `Preempted routine patrol on ${drone.droneId} for ${incident.severity} emergency ${incident.incidentId}`,
            operatorExplanation: `Routine surveillance patrol on ${drone.droneId} automatically yielded to higher priority distress incident.`,
          });
        }

        const decisionId = `DEC-${this.decisionCounter++}`;
        const rationale = isPreempted
          ? `Preempted routine patrol on ${drone.droneId} (Proximity: ${bestCandidate.distanceMeters.toFixed(0)}m, Battery: ${bestCandidate.batteryPercentage}%, ETA: ${bestCandidate.estimatedTransitTimeSeconds.toFixed(1)}s)`
          : `Assigned optimal idle asset ${drone.droneId} (Proximity: ${bestCandidate.distanceMeters.toFixed(0)}m, Battery: ${bestCandidate.batteryPercentage}%, ETA: ${bestCandidate.estimatedTransitTimeSeconds.toFixed(1)}s)`;

        const decision: AllocationDecision = {
          decisionId,
          incidentId: incident.incidentId,
          assignedDroneId: drone.droneId,
          decisionType: isPreempted ? 'PREEMPTED_AND_ALLOCATED' : 'ALLOCATED',
          rationale,
          evaluatedCandidates: candidateScores,
          timestampMs: clockMs,
        };

        // Commit reservation
        assignedDroneIds.add(drone.droneId);
        incident.assignedDroneId = drone.droneId;
        incident.status = 'ALLOCATED';
        incident.allocationRationale = rationale;
        incident.assignedAtMs = clockMs;

        // Associate human lifesaver responders from RescueCoordinator
        this.linkCollaborativeSurfaceResponders(incident);

        this.decisions.push(decision);
        currentDecisions.push(decision);
        allocatedCount++;
      } else {
        // No eligible drone available in this pass
        // If it's a DISTRESS incident, prioritize reason from rescue-capable drone (e.g. DRONE-02)
        const capableCandidate = candidateScores.find((c) => {
          const drone = fleet.find((f) => f.droneId === c.droneId);
          return drone?.capabilities.hasFlotationPayload;
        });
        const primaryReason = (capableCandidate && capableCandidate.rejectionReasons.length > 0)
          ? capableCandidate.rejectionReasons[0]
          : (candidateScores.length > 0 && candidateScores[0].rejectionReasons.length > 0
            ? candidateScores[0].rejectionReasons[0]
            : 'All fleet assets currently committed to active missions');

        const decisionId = `DEC-${this.decisionCounter++}`;
        const decision: AllocationDecision = {
          decisionId,
          incidentId: incident.incidentId,
          decisionType: 'QUEUED_NO_RESOURCE',
          rationale: `Held in queue: ${primaryReason}`,
          evaluatedCandidates: candidateScores,
          timestampMs: clockMs,
        };

        incident.status = 'QUEUED';
        incident.unassignableReason = primaryReason;

        this.decisions.push(decision);
        currentDecisions.push(decision);
        queuedCount++;
      }
    }

    return {
      decisions: currentDecisions,
      allocatedCount,
      queuedCount,
    };
  }

  /**
   * Safely attempts manual reassignment with explicit policy validation
   */
  public requestReassignment(
    incidentId: string,
    targetDroneId: string,
    operatorId: string,
    reason: string,
    incident: CoordinationIncident,
    clockMs: number = Date.now()
  ): {
    success: boolean;
    rejectionReason?: string;
  } {
    const fleet = this.evaluateFleetAvailability(clockMs);
    const targetDrone = fleet.find((d) => d.droneId === targetDroneId);

    if (!targetDrone) {
      return { success: false, rejectionReason: `Drone ${targetDroneId} not found in fleet.` };
    }

    // Unsafe Reassignment Rule: If drone is currently engaged in active rescue (ASSISTING/DROPPING),
    // reassignment is strictly prohibited to protect swimmer in water
    if (targetDrone.isLocked && !targetDrone.isPreemptible) {
      const conflictId = `CONF-${this.conflictCounter++}`;
      this.conflicts.push({
        conflictId,
        conflictType: 'UNSAFE_REASSIGNMENT_ATTEMPT',
        timestampMs: clockMs,
        incidentIds: [incidentId],
        droneIds: [targetDroneId],
        resolutionAction: 'REJECTED_UNSAFE',
        operatorExplanation: `Operator ${operatorId} attempted to reassign ${targetDroneId}, but the drone is actively executing a rescue mission (${targetDrone.lockReason}). Request blocked.`,
      });

      return {
        success: false,
        rejectionReason: `Unsafe Reassignment Blocked: ${targetDroneId} is currently executing an active rescue mission (${targetDrone.lockReason}).`,
      };
    }

    // Capability check: Swimmer distress requires flotation
    if (incident.type === 'DISTRESS' && !targetDrone.capabilities.hasFlotationPayload) {
      return {
        success: false,
        rejectionReason: `Capability deficit: ${targetDroneId} lacks flotation payload required for distress response.`,
      };
    }

    // Commit reassignment
    const previousDroneId = incident.assignedDroneId;
    incident.assignedDroneId = targetDroneId;
    incident.status = 'ALLOCATED';
    incident.allocationRationale = `Manual operator reassignment by ${operatorId}: ${reason} (Previous: ${previousDroneId || 'None'})`;

    const decisionId = `DEC-${this.decisionCounter++}`;
    this.decisions.push({
      decisionId,
      incidentId,
      assignedDroneId: targetDroneId,
      decisionType: 'REASSIGNED',
      rationale: incident.allocationRationale,
      evaluatedCandidates: [],
      timestampMs: clockMs,
    });

    return { success: true };
  }

  /**
   * Connects assigned incident with active surface lifesavers (Lifeguards LG-01 / Rescue Boat RB-01)
   */
  private linkCollaborativeSurfaceResponders(incident: CoordinationIncident): void {
    const boat = this.rescueCoordinator.registry.getResource('RB-01');
    const lg1 = this.rescueCoordinator.registry.getResource('LG-01');

    if (boat && (boat.status === 'AVAILABLE' || boat.assignedIncidentId === incident.incidentId)) {
      incident.assignedRescueBoatId = 'RB-01';
    }
    if (lg1 && (lg1.status === 'AVAILABLE' || lg1.assignedIncidentId === incident.incidentId)) {
      incident.assignedLifeguardId = 'LG-01';
    }
  }
}
