/**
 * DroneRescueDispatchManager.ts
 * 
 * TIDES Drone Phase 9: Rescue Mission Allocation & Dispatch Service
 * 
 * Central orchestrator connecting authoritative IncidentManager, DroneRegistry,
 * DroneMissionManager, and CoastalZoneRegistry to coordinate rapid aerial flotation delivery:
 * 
 * Strict Guarantees:
 * - Uses existing IncidentManager and RipCurrentSimulator incidents without competing engines.
 * - Enforces drone eligibility (role, flotation payload, battery > 25%, telemetry < 15s).
 * - Implements deterministic, capability-first drone selection (ETA & role matching).
 * - Connects to authoritative DroneMissionManager for flight execution and lifecycle tracking.
 * - Transparently handles surveillance patrol preemption with coverage impact auditing.
 * - Distinguishes PROPOSED, APPROVED, DISPATCHED, EN_ROUTE, ASSISTING, COMPLETED, and FAILED states.
 * - Clarifies: Drone delivers buoyant flotation aid; it does NOT declare a person safe.
 * - Full audit trail with duplicate delivery and concurrency prevention.
 */

import { DroneRegistry } from '../foundation/DroneRegistry';
import { DroneMissionManager } from '../missions/DroneMissionManager';
import { CoastalZoneRegistry } from '../coverage/CoastalZoneRegistry';
import { IncidentManager } from '../../visitors/incidents/IncidentManager';
import { RescueCoordinator } from '../../scene3d/rescue/RescueCoordinator';
import { Incident } from '../../models/Incident';
import { DistressIncidentEvent } from '../../scene3d/hazards/rip3d.types';
import { DroneRescueEligibilityValidator } from './DroneRescueEligibilityValidator';
import { DroneRescueAuditLogger } from './DroneRescueAuditLogger';
import { DroneRescueExecutionManager } from './execution/DroneRescueExecutionManager';
import {
  RescueDroneAssignment,
  RescueAssignmentStatus,
  RescueDroneEligibilityCheck,
  IncidentEligibilityAssessment,
} from './droneRescue.types';

export class DroneRescueDispatchManager {
  private static instance: DroneRescueDispatchManager | null = null;

  private droneRegistry: DroneRegistry;
  private missionManager: DroneMissionManager;
  private coastalRegistry: CoastalZoneRegistry;
  private incidentManager: IncidentManager;
  private rescueCoordinator: RescueCoordinator;
  private validator: DroneRescueEligibilityValidator;
  private auditLogger: DroneRescueAuditLogger;

  // Active and historical assignments: assignmentId -> RescueDroneAssignment
  private assignments: Map<string, RescueDroneAssignment> = new Map();
  // Quick index: incidentId -> assignmentId
  private incidentToAssignment: Map<string, string> = new Map();

  // Concurrency deduplication lock: incidentId -> lastDispatchMs
  private dispatchCooldowns: Map<string, number> = new Map();

  // Assistance hold timers: assignmentId -> elapsedSeconds
  private assistanceTimers: Map<string, number> = new Map();
  private readonly ASSISTANCE_HOLD_DURATION_SEC = 4.0; // 4s flotation drop hold

  // Emergency policy toggle (default true to preserve established automated life-safety response)
  private autoDispatchEnabled: boolean = true;
  private assignmentCounter: number = 1000;
  private listeners: Set<() => void> = new Set();

  public static getInstance(): DroneRescueDispatchManager {
    if (!DroneRescueDispatchManager.instance) {
      DroneRescueDispatchManager.instance = new DroneRescueDispatchManager();
    }
    return DroneRescueDispatchManager.instance;
  }

  constructor(
    droneRegistry: DroneRegistry = DroneRegistry.getInstance(),
    missionManager: DroneMissionManager = DroneMissionManager.getInstance(),
    coastalRegistry: CoastalZoneRegistry = CoastalZoneRegistry.getInstance(),
    incidentManager: IncidentManager = IncidentManager.getInstance(),
    rescueCoordinator: RescueCoordinator = RescueCoordinator.getInstance(),
    validator: DroneRescueEligibilityValidator = DroneRescueEligibilityValidator.getInstance(),
    auditLogger: DroneRescueAuditLogger = DroneRescueAuditLogger.getInstance()
  ) {
    this.droneRegistry = droneRegistry;
    this.missionManager = missionManager;
    this.coastalRegistry = coastalRegistry;
    this.incidentManager = incidentManager;
    this.rescueCoordinator = rescueCoordinator;
    this.validator = validator;
    this.auditLogger = auditLogger;
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('Error in DroneRescueDispatchManager listener:', err);
      }
    });
  }

  public reset(): void {
    this.assignments.clear();
    this.incidentToAssignment.clear();
    this.dispatchCooldowns.clear();
    this.assistanceTimers.clear();
    this.assignmentCounter = 1000;
    this.auditLogger.clear();
    DroneRescueExecutionManager.getInstance().reset();
    this.notify();
  }

  public setAutoDispatch(enabled: boolean): void {
    this.autoDispatchEnabled = enabled;
    this.notify();
  }

  public getAutoDispatch(): boolean {
    return this.autoDispatchEnabled;
  }

  public getAllAssignments(): RescueDroneAssignment[] {
    return Array.from(this.assignments.values());
  }

  public getActiveAssignments(): RescueDroneAssignment[] {
    return Array.from(this.assignments.values()).filter(
      (a) =>
        a.status === 'PROPOSED' ||
        a.status === 'APPROVED' ||
        a.status === 'DISPATCHED' ||
        a.status === 'EN_ROUTE' ||
        a.status === 'ASSISTING' ||
        a.status === 'RETURNING'
    );
  }

  public getAssignment(assignmentId: string): RescueDroneAssignment | undefined {
    return this.assignments.get(assignmentId);
  }

  public getAssignmentForIncident(incidentId: string): RescueDroneAssignment | undefined {
    const asgId = this.incidentToAssignment.get(incidentId);
    return asgId ? this.assignments.get(asgId) : undefined;
  }

  /**
   * Evaluates an eligible incident and identifies the best rescue-assistance drone
   */
  public proposeAssignment(
    incident: Incident | DistressIncidentEvent | any,
    clockMs: number = Date.now()
  ): {
    assignment?: RescueDroneAssignment;
    assessment: IncidentEligibilityAssessment;
    candidateChecks: RescueDroneEligibilityCheck[];
    success: boolean;
    reason: string;
  } {
    const existingActiveList = this.getActiveAssignments();
    const assessment = this.validator.evaluateIncidentEligibility(incident, existingActiveList);

    if (!assessment.isEligible || !assessment.targetPosition3D) {
      return {
        assessment,
        candidateChecks: [],
        success: false,
        reason: assessment.rejectionReasons.join('; '),
      };
    }

    // Concurrency / Duplicate submission guard (deduplicate within 3 seconds)
    const lastDispatch = this.dispatchCooldowns.get(assessment.incidentId);
    if (lastDispatch !== undefined && clockMs - lastDispatch < 3000) {
      return {
        assessment,
        candidateChecks: [],
        success: false,
        reason: `Duplicate dispatch suppressed: Incident ${assessment.incidentId} was submitted within 3s debounce window.`,
      };
    }

    const allDrones = this.droneRegistry.getAllDrones();
    const candidateChecks: RescueDroneEligibilityCheck[] = [];

    for (const drone of allDrones) {
      const check = this.validator.evaluateDroneEligibility(
        drone,
        assessment.targetPosition3D,
        this.missionManager,
        clockMs
      );
      candidateChecks.push(check);
    }

    const eligibleChecks = candidateChecks.filter((c) => c.isEligible);

    if (eligibleChecks.length === 0) {
      const reasons = candidateChecks
        .map((c) => `${c.droneId}: ${c.rejectionReasons.join(', ')}`)
        .join(' | ');

      this.auditLogger.recordEvent(
        'NONE',
        assessment.incidentId,
        'NONE',
        'ASSIGNMENT_REJECTED',
        'SYSTEM_EVALUATOR',
        { failureReason: 'No eligible rescue drone available', droneRejections: reasons },
        clockMs
      );

      return {
        assessment,
        candidateChecks,
        success: false,
        reason: `No eligible rescue drone available. Details: ${reasons}`,
      };
    }

    // Deterministic selection policy:
    // 1. Role priority: RESCUE_ASSISTANCE first (e.g. DRONE-02), then MULTI_ROLE.
    // 2. Minimum ETA / Distance to incident coordinates.
    eligibleChecks.sort((a, b) => {
      if (a.role === 'RESCUE_ASSISTANCE' && b.role !== 'RESCUE_ASSISTANCE') return -1;
      if (b.role === 'RESCUE_ASSISTANCE' && a.role !== 'RESCUE_ASSISTANCE') return 1;
      return a.metrics.estimatedArrivalSec - b.metrics.estimatedArrivalSec;
    });

    const selectedCheck = eligibleChecks[0];
    const selectedDrone = this.droneRegistry.getDrone(selectedCheck.droneId)!;

    this.assignmentCounter++;
    const assignmentId = `ASG-RES-${this.assignmentCounter}`;

    // Inspect surveillance patrol preemption (Step 7)
    let patrolPreemption: any = undefined;
    const currentMission = this.missionManager.getDroneActiveMission(selectedDrone.droneId);
    if (currentMission && currentMission.type === 'PATROL') {
      const zones = this.coastalRegistry.getAllZones();
      const patrolledZone = zones.find((z) => z.assignedDroneIds.includes(selectedDrone.droneId));

      patrolPreemption = {
        preemptedDroneId: selectedDrone.droneId,
        preemptedZoneId: patrolledZone?.zoneId,
        preemptedRouteId: currentMission.routeId,
        previousMissionId: currentMission.missionId,
        coverageImpactDescription: patrolledZone
          ? `Emergency diversion preempted patrol on zone '${patrolledZone.name}' (${patrolledZone.zoneId}). Zone transitioned to unmonitored.`
          : `Drone diverted from general coastal sweep (${currentMission.routeId}).`,
        preemptedAtMs: clockMs,
      };
    }

    // Check collaborative lifesaver / boat response (Step 1 & 8)
    const activeRescueMission = this.rescueCoordinator.getActiveMissionForIncident(assessment.incidentId);
    const collaborativeResponders = {
      lifeguardId: activeRescueMission?.resourceType === 'LIFEGUARD' ? activeRescueMission.assignedResourceId : undefined,
      rescueBoatId: activeRescueMission?.resourceType === 'RESCUE_BOAT' ? activeRescueMission.assignedResourceId : undefined,
      coordinationNotes: activeRescueMission
        ? `Collaborative SAR: Aerial drone delivers rapid flotation aid while surface unit (${activeRescueMission.assignedResourceName}) performs physical extraction.`
        : 'Aerial rapid flotation drop initiated; surface lifesavers notified.',
    };

    const assignment: RescueDroneAssignment = {
      assignmentId,
      incidentId: assessment.incidentId,
      visitorId: incident.visitorId,
      assignedResourceId: selectedDrone.droneId,
      resourceType: 'DRONE',
      status: 'PROPOSED',
      createdAtMs: clockMs,
      updatedAtMs: clockMs,
      targetPosition3D: { ...assessment.targetPosition3D },
      distanceMeters: selectedCheck.metrics.distanceMeters,
      estimatedArrivalSec: selectedCheck.metrics.estimatedArrivalSec,
      rationale: `Selected ${selectedDrone.callsign} (${selectedDrone.role}) as primary rescue asset (Distance: ${selectedCheck.metrics.distanceMeters.toFixed(0)}m, ETA: ${selectedCheck.metrics.estimatedArrivalSec.toFixed(1)}s, Flotation payload ready).`,
      authorization: {
        authorizedBy: this.autoDispatchEnabled ? 'AUTO_DISPATCH_POLICY' : 'PENDING_OPERATOR_APPROVAL',
        requiresManualApproval: !this.autoDispatchEnabled,
      },
      patrolPreemption,
      collaborativeResponders,
      payloadType: 'BUOYANT_REST_RING',
      safetyNotice: 'FLOTATION AID DELIVERY ONLY. Physical extraction and swimmer recovery performed by lifeguards/boat.',
      provenance: 'SIMULATED_SCENE_SPACE',
    };

    this.assignments.set(assignmentId, assignment);
    this.incidentToAssignment.set(assessment.incidentId, assignmentId);
    this.dispatchCooldowns.set(assessment.incidentId, clockMs);

    this.auditLogger.recordEvent(
      assignmentId,
      assessment.incidentId,
      selectedDrone.droneId,
      'ASSIGNMENT_PROPOSED',
      'RESCUE_ALLOCATOR',
      {
        rationale: assignment.rationale,
        distanceMeters: assignment.distanceMeters,
        estimatedArrivalSec: assignment.estimatedArrivalSec,
        patrolPreemption,
      },
      clockMs
    );

    this.notify();

    // Auto-dispatch policy execution (Step 8)
    if (this.autoDispatchEnabled) {
      this.approveAndDispatch(assignmentId, 'AUTO_DISPATCH_POLICY', 'Automated emergency life-safety dispatch', clockMs);
    }

    return {
      assignment,
      assessment,
      candidateChecks,
      success: true,
      reason: assignment.rationale,
    };
  }

  /**
   * Approves and executes dispatch of a proposed rescue assignment
   */
  public approveAndDispatch(
    assignmentId: string,
    actor: string = 'OPERATOR-MANUAL',
    operatorNotes?: string,
    clockMs: number = Date.now()
  ): { success: boolean; errors: string[] } {
    const assignment = this.assignments.get(assignmentId);
    if (!assignment) {
      return { success: false, errors: [`Assignment ${assignmentId} not found.`] };
    }

    if (assignment.status !== 'PROPOSED') {
      return {
        success: false,
        errors: [`Cannot dispatch assignment in state '${assignment.status}' (must be PROPOSED).`],
      };
    }

    const drone = this.droneRegistry.getDrone(assignment.assignedResourceId);
    if (!drone) {
      assignment.status = 'FAILED';
      assignment.failureReason = `Drone ${assignment.assignedResourceId} no longer exists in registry.`;
      this.notify();
      return { success: false, errors: [assignment.failureReason] };
    }

    // Step 7: Handle surveillance patrol preemption cleanly
    if (assignment.patrolPreemption?.previousMissionId) {
      this.missionManager.cancelMission(
        assignment.patrolPreemption.previousMissionId,
        `Emergency rescue preemption for incident ${assignment.incidentId}`,
        clockMs
      );

      if (assignment.patrolPreemption.preemptedZoneId) {
        // Release from coastal coverage zone
        this.coastalRegistry.setZoneDroneAssignment(assignment.patrolPreemption.preemptedZoneId, []);
      }

      this.auditLogger.recordEvent(
        assignmentId,
        assignment.incidentId,
        drone.droneId,
        'PATROL_PREEMPTED',
        actor,
        { ...assignment.patrolPreemption },
        clockMs
      );
    }

    // Step 6: Create and submit RESCUE_ASSISTANCE mission in authoritative DroneMissionManager
    const missionRes = this.missionManager.createMission(
      {
        type: 'RESCUE_ASSISTANCE',
        droneId: drone.droneId,
        targetPosition3D: { ...assignment.targetPosition3D },
        linkedIncidentId: assignment.incidentId,
        priority: 1, // Highest priority
        observationDurationSec: this.ASSISTANCE_HOLD_DURATION_SEC,
      },
      clockMs
    );

    if (!missionRes.success || !missionRes.mission) {
      assignment.status = 'FAILED';
      assignment.failureReason = missionRes.errors.join('; ');
      assignment.updatedAtMs = clockMs;

      this.auditLogger.recordEvent(
        assignmentId,
        assignment.incidentId,
        drone.droneId,
        'MISSION_FAILED',
        actor,
        { errors: missionRes.errors },
        clockMs
      );
      this.notify();
      return { success: false, errors: missionRes.errors };
    }

    const missionId = missionRes.mission.missionId;
    assignment.missionId = missionId;

    // Accept mission into execution
    const acceptRes = this.missionManager.acceptMission(missionId, clockMs);
    if (!acceptRes.success) {
      assignment.status = 'FAILED';
      assignment.failureReason = acceptRes.errorReason ?? 'Mission acceptance failed.';
      assignment.updatedAtMs = clockMs;
      this.notify();
      return { success: false, errors: [assignment.failureReason] };
    }

    // Start mission flight
    this.missionManager.startMission(missionId, clockMs);

    // Update assignment record to DISPATCHED / EN_ROUTE
    assignment.status = 'EN_ROUTE';
    assignment.dispatchedAtMs = clockMs;
    assignment.updatedAtMs = clockMs;
    assignment.authorization = {
      authorizedBy: actor,
      authorizedAtMs: clockMs,
      requiresManualApproval: false,
      operatorNotes,
    };

    this.auditLogger.recordEvent(
      assignmentId,
      assignment.incidentId,
      drone.droneId,
      'MISSION_DISPATCHED',
      actor,
      {
        missionId,
        targetPosition3D: assignment.targetPosition3D,
        estimatedArrivalSec: assignment.estimatedArrivalSec,
      },
      clockMs
    );

    // Phase 10: Trigger Search, Approach and Assistance execution
    DroneRescueExecutionManager.getInstance().startExecution(assignment, undefined, clockMs);

    this.notify();
    return { success: true, errors: [] };
  }

  /**
   * Rejects an assignment proposal
   */
  public rejectAssignment(
    assignmentId: string,
    actor: string = 'OPERATOR-MANUAL',
    reason: string = 'Operator rejected assignment proposal',
    clockMs: number = Date.now()
  ): boolean {
    const assignment = this.assignments.get(assignmentId);
    if (!assignment) return false;

    assignment.status = 'REJECTED';
    assignment.failureReason = reason;
    assignment.updatedAtMs = clockMs;

    this.auditLogger.recordEvent(
      assignmentId,
      assignment.incidentId,
      assignment.assignedResourceId,
      'ASSIGNMENT_REJECTED',
      actor,
      { reason },
      clockMs
    );

    this.notify();
    return true;
  }

  /**
   * Cancels or aborts an active rescue assignment
   */
  public cancelAssignment(
    assignmentId: string,
    actor: string = 'OPERATOR-MANUAL',
    reason: string = 'Operator recalled rescue drone',
    clockMs: number = Date.now()
  ): boolean {
    const assignment = this.assignments.get(assignmentId);
    if (!assignment) return false;

    if (assignment.missionId) {
      this.missionManager.cancelMission(assignment.missionId, reason, clockMs);
    }

    const exec = DroneRescueExecutionManager.getInstance().getExecutionByAssignmentId(assignmentId);
    if (exec) {
      DroneRescueExecutionManager.getInstance().cancelExecution(exec.executionId, actor, reason, clockMs);
    }

    assignment.status = 'CANCELLED';
    assignment.failureReason = reason;
    assignment.updatedAtMs = clockMs;

    this.auditLogger.recordEvent(
      assignmentId,
      assignment.incidentId,
      assignment.assignedResourceId,
      'MISSION_CANCELLED',
      actor,
      { reason },
      clockMs
    );

    this.notify();
    return true;
  }

  /**
   * Per-frame lifecycle tracker synchronizing with drone movement and mission managers
   */
  public update(delta: number = 0.016, clockMs: number = Date.now()): void {
    DroneRescueExecutionManager.getInstance().update(delta, clockMs);

    const activeList = this.getActiveAssignments();

    for (const assignment of activeList) {
      const drone = this.droneRegistry.getDrone(assignment.assignedResourceId);

      // Check for telemetry failure or disconnection (Step 9)
      if (!drone || drone.connectivity === 'DISCONNECTED' || drone.isStale) {
        assignment.status = 'FAILED';
        assignment.failureReason = 'Drone telemetry lost or disconnected during rescue transit.';
        assignment.updatedAtMs = clockMs;

        if (assignment.missionId) {
          this.missionManager.cancelMission(assignment.missionId, assignment.failureReason, clockMs);
        }

        this.auditLogger.recordEvent(
          assignment.assignmentId,
          assignment.incidentId,
          assignment.assignedResourceId,
          'MISSION_FAILED',
          'HEALTH_MONITOR',
          { failureReason: assignment.failureReason },
          clockMs
        );
        this.notify();
        continue;
      }

      // Check battery emergency abort
      if (drone.battery.percentage <= 20.0) {
        assignment.status = 'FAILED';
        assignment.failureReason = `Emergency battery abort (${drone.battery.percentage.toFixed(0)}% <= 20% critical threshold).`;
        assignment.updatedAtMs = clockMs;

        if (assignment.missionId) {
          this.missionManager.cancelMission(assignment.missionId, assignment.failureReason, clockMs);
        }

        this.auditLogger.recordEvent(
          assignment.assignmentId,
          assignment.incidentId,
          assignment.assignedResourceId,
          'MISSION_FAILED',
          'BATTERY_MONITOR',
          { batteryPercentage: drone.battery.percentage },
          clockMs
        );
        this.notify();
        continue;
      }

      // Track physical transit distance to target
      const dx = assignment.targetPosition3D.x - drone.position3D.x;
      const dz = assignment.targetPosition3D.z - drone.position3D.z;
      const horizontalDist = Math.hypot(dx, dz);

      // 1. Arrival at Drop Zone & Flotation Aid Delivery
      if (assignment.status === 'EN_ROUTE' && horizontalDist <= 12.0) {
        assignment.status = 'ASSISTING';
        assignment.arrivedAtMs = clockMs;
        assignment.updatedAtMs = clockMs;
        this.assistanceTimers.set(assignment.assignmentId, 0);

        this.auditLogger.recordEvent(
          assignment.assignmentId,
          assignment.incidentId,
          drone.droneId,
          'ARRIVED_DROP_ZONE',
          'NAVIGATION_SYSTEM',
          { horizontalDistMeters: horizontalDist },
          clockMs
        );

        this.auditLogger.recordEvent(
          assignment.assignmentId,
          assignment.incidentId,
          drone.droneId,
          'FLOTATION_AID_DEPLOYED',
          'PAYLOAD_SYSTEM',
          {
            payloadType: assignment.payloadType,
            notice: assignment.safetyNotice,
          },
          clockMs
        );
        this.notify();
      }

      // 2. Assisting Dwell & Payload Delivery Completion
      if (assignment.status === 'ASSISTING') {
        const timer = (this.assistanceTimers.get(assignment.assignmentId) ?? 0) + delta;
        this.assistanceTimers.set(assignment.assignmentId, timer);

        if (timer >= this.ASSISTANCE_HOLD_DURATION_SEC) {
          assignment.status = 'RETURNING';
          assignment.updatedAtMs = clockMs;

          this.auditLogger.recordEvent(
            assignment.assignmentId,
            assignment.incidentId,
            drone.droneId,
            'RETURN_COMMENCED',
            'AUTONOMOUS_NAV',
            { holdDurationSec: timer },
            clockMs
          );
          this.notify();
        }
      }

      // 3. Mission Completion & Landing Recovery
      if (assignment.status === 'RETURNING') {
        const mission = assignment.missionId ? this.missionManager.getMission(assignment.missionId) : undefined;
        // Drone is back at home pad or landed
        const homeDist = Math.hypot(
          drone.homePosition3D.x - drone.position3D.x,
          drone.homePosition3D.z - drone.position3D.z
        );

        if (
          (homeDist <= 8.0 && Math.abs(drone.position3D.y - drone.homePosition3D.y) <= 3.0) ||
          mission?.status === 'COMPLETED'
        ) {
          assignment.status = 'COMPLETED';
          assignment.completedAtMs = clockMs;
          assignment.updatedAtMs = clockMs;

          if (assignment.missionId) {
            this.missionManager.completeMission(assignment.missionId, clockMs);
          }

          this.auditLogger.recordEvent(
            assignment.assignmentId,
            assignment.incidentId,
            drone.droneId,
            'MISSION_COMPLETED',
            'RECOVERY_MANAGER',
            { completedAtMs: clockMs },
            clockMs
          );

          this.auditLogger.recordEvent(
            assignment.assignmentId,
            assignment.incidentId,
            drone.droneId,
            'RESOURCE_RELEASED',
            'RECOVERY_MANAGER',
            { droneId: drone.droneId },
            clockMs
          );
          this.notify();
        }
      }
    }
  }
}
