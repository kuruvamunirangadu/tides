/**
 * MultiDroneCoordinationEngine.ts
 * 
 * TIDES Drone Phase 11: Central Multi-Incident & Multi-Drone Coordination Subsystem
 * 
 * Master coordinator connecting:
 * - IncidentManager (Authoritative Incident Records)
 * - RescueCoordinator (Authoritative Lifeguard & Rescue Boat Operations)
 * - DroneRegistry (Authoritative 4-Drone Fleet Telemetry)
 * - DroneMissionManager & DroneMovementEngine (Authoritative Flight Dynamics)
 * - DroneRescueDispatchManager & DroneRescueExecutionManager (Flotation Aid Delivery)
 * 
 * Core Guarantees:
 * - Multiple simultaneous active emergencies handled without cross-contamination.
 * - Global priority queue with stable FIFO tie-breaker and starvation prevention.
 * - Deterministic, capability-first drone allocation.
 * - Explicit conflict resolution and safety preemption policy.
 * - Full multi-asset lifesaver coordination (Drones + Lifeguards + Boats).
 * - Life-safety boundary: Drone arrival or payload drop stabilizes swimmer; recovery is by surface lifesavers.
 */

import { IncidentManager } from '../../visitors/incidents/IncidentManager';
import { RescueCoordinator } from '../../scene3d/rescue/RescueCoordinator';
import { DroneRegistry } from '../foundation/DroneRegistry';
import { DroneMissionManager } from '../missions/DroneMissionManager';
import { DroneRescueDispatchManager } from '../rescue/DroneRescueDispatchManager';
import { DroneRescueExecutionManager } from '../rescue/execution/DroneRescueExecutionManager';
import { IncidentPriorityQueue } from './IncidentPriorityQueue';
import { MultiDroneAllocationEngine } from './MultiDroneAllocationEngine';
import { DroneWorld3DPosition } from '../foundation/drone.types';
import {
  CoordinationIncident,
  DroneResourceAvailability,
  AllocationDecision,
  CoordinationConflictRecord,
  CoordinationPolicyConfig,
  CoordinationSummaryMetrics,
  COORDINATION_LIFE_SAFETY_POLICY,
} from './droneCoordination.types';

export class MultiDroneCoordinationEngine {
  private static instance: MultiDroneCoordinationEngine | null = null;

  private incidentManager: IncidentManager;
  private rescueCoordinator: RescueCoordinator;
  private droneRegistry: DroneRegistry;
  private missionManager: DroneMissionManager;
  private dispatchManager: DroneRescueDispatchManager;
  private executionManager: DroneRescueExecutionManager;

  private priorityQueue: IncidentPriorityQueue;
  private allocationEngine: MultiDroneAllocationEngine;

  private config: CoordinationPolicyConfig = {
    starvationThresholdSeconds: 45.0,
    preemptionAllowedForCritical: true,
    minBatteryForRescuePercent: 25.0,
    maxTelemetryAgeSeconds: 15.0,
    autoAllocationEnabled: true,
  };

  private listeners: Set<() => void> = new Set();
  private lastEvaluationTimeMs: number = 0;
  private readonly EVALUATION_INTERVAL_MS = 1000; // 1 Hz queue audit and allocation pass

  public static getInstance(): MultiDroneCoordinationEngine {
    if (!MultiDroneCoordinationEngine.instance) {
      MultiDroneCoordinationEngine.instance = new MultiDroneCoordinationEngine();
    }
    return MultiDroneCoordinationEngine.instance;
  }

  constructor(
    incidentManager: IncidentManager = IncidentManager.getInstance(),
    rescueCoordinator: RescueCoordinator = RescueCoordinator.getInstance(),
    droneRegistry: DroneRegistry = DroneRegistry.getInstance(),
    missionManager: DroneMissionManager = DroneMissionManager.getInstance(),
    dispatchManager: DroneRescueDispatchManager = DroneRescueDispatchManager.getInstance(),
    executionManager: DroneRescueExecutionManager = DroneRescueExecutionManager.getInstance()
  ) {
    this.incidentManager = incidentManager;
    this.rescueCoordinator = rescueCoordinator;
    this.droneRegistry = droneRegistry;
    this.missionManager = missionManager;
    this.dispatchManager = dispatchManager;
    this.executionManager = executionManager;

    this.priorityQueue = new IncidentPriorityQueue(this.config);
    this.allocationEngine = new MultiDroneAllocationEngine(
      this.config,
      this.droneRegistry,
      this.missionManager,
      this.dispatchManager,
      this.rescueCoordinator
    );
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
        console.error('Error in MultiDroneCoordinationEngine listener:', err);
      }
    });
  }

  public reset(): void {
    this.priorityQueue.clear();
    this.allocationEngine.clear();
    this.notify();
  }

  public getConfig(): CoordinationPolicyConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<CoordinationPolicyConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.priorityQueue.updateConfig(this.config);
    this.allocationEngine.updateConfig(this.config);
    this.notify();
  }

  public getPriorityQueue(): IncidentPriorityQueue {
    return this.priorityQueue;
  }

  public getAllocationEngine(): MultiDroneAllocationEngine {
    return this.allocationEngine;
  }

  public getAllIncidents(): CoordinationIncident[] {
    return this.priorityQueue.getAllIncidents();
  }

  public getActiveQueue(): CoordinationIncident[] {
    return this.priorityQueue.getActiveQueue();
  }

  public getPendingQueue(): CoordinationIncident[] {
    return this.priorityQueue.getPendingQueue();
  }

  public getFleetAvailability(clockMs: number = Date.now()): DroneResourceAvailability[] {
    return this.allocationEngine.evaluateFleetAvailability(clockMs);
  }

  public getDecisions(): AllocationDecision[] {
    return this.allocationEngine.getDecisions();
  }

  public getConflicts(): CoordinationConflictRecord[] {
    return this.allocationEngine.getConflicts();
  }

  /**
   * Main simulation tick called from BeachScene3D render loop
   */
  public update(delta: number, clockMs: number = Date.now()): void {
    // 1. Sync authoritative incidents from IncidentManager & RescueCoordinator
    this.syncAuthoritativeIncidents(clockMs);

    // 2. Periodic allocation and priority queue recalculation (1 Hz)
    if (clockMs - this.lastEvaluationTimeMs >= this.EVALUATION_INTERVAL_MS) {
      this.lastEvaluationTimeMs = clockMs;
      this.priorityQueue.recalculateRanks(clockMs);

      if (this.config.autoAllocationEnabled) {
        this.runAutonomousAllocationCycle(clockMs);
      }

      this.notify();
    }
  }

  /**
   * Reads active and resolved incidents from authoritative IncidentManager & RescueCoordinator
   */
  public syncAuthoritativeIncidents(clockMs: number = Date.now()): void {
    const rawIncidents = this.incidentManager.getActiveIncidents();

    // Map each authoritative incident into coordination queue
    for (const inc of rawIncidents) {
      // Convert 2D beach canvas coordinates to 3D world space if needed
      const pos3D: DroneWorld3DPosition = {
        x: (inc.location.x - 500) * 0.5,
        y: 0,
        z: (inc.location.y - 300) * 0.5,
      };

      const existing = this.priorityQueue.getIncident(inc.id);
      if (!existing) {
        this.priorityQueue.enqueue(
          {
            incidentId: inc.id,
            source: 'INCIDENT_MANAGER',
            type: inc.type,
            severity: inc.severity,
            title: inc.title,
            zoneId: inc.zoneId,
            position3D: pos3D,
            detectedAtMs: inc.startedAt > 1e11 ? inc.startedAt : clockMs - (inc.startedAt * 1000),
            status: 'QUEUED',
          },
          clockMs
        );
      }
    }

    // Sync from RescueCoordinator active missions
    const rescueMissions = this.rescueCoordinator.getActiveMissions();
    for (const mission of rescueMissions) {
      const existing = this.priorityQueue.getIncident(mission.incidentId);
      if (existing) {
        if (mission.stage === 'COMPLETED' || mission.stage === 'RESOLVED' || mission.stage === 'RETURNING') {
          existing.status = 'RESOLVED';
        } else if (mission.stage === 'ASSIGNED' || mission.stage === 'EN_ROUTE' || mission.stage === 'ARRIVED' || mission.stage === 'ASSISTING') {
          existing.status = 'ASSISTING';
        }
      } else {
        // Enqueue missing distress incident
        this.priorityQueue.enqueue(
          {
            incidentId: mission.incidentId,
            source: 'RIP_SIMULATOR',
            type: 'DISTRESS',
            severity: 'CRITICAL',
            title: `Rip Current Distress (${mission.visitorId})`,
            zoneId: 'ZONE-RIP',
            position3D: { x: 0, y: 0, z: -35 },
            detectedAtMs: mission.dispatchSimTime ? mission.dispatchSimTime * 1000 : clockMs,
            status: 'QUEUED',
            assignedLifeguardId: mission.assignedResourceId === 'LG-01' ? 'LG-01' : undefined,
            assignedRescueBoatId: mission.assignedResourceId === 'RB-01' ? 'RB-01' : undefined,
          },
          clockMs
        );
      }
    }

    // Also check for incidents resolved in IncidentManager history
    const allQueue = this.priorityQueue.getAllIncidents();
    const activeIds = new Set(rawIncidents.map((i) => i.id));
    const activeRescueIncidentIds = new Set(rescueMissions.map((m) => m.incidentId));

    for (const qInc of allQueue) {
      if (
        qInc.status !== 'RESOLVED' &&
        !activeIds.has(qInc.incidentId) &&
        !activeRescueIncidentIds.has(qInc.incidentId)
      ) {
        // Mark as resolved externally
        this.priorityQueue.updateStatus(
          qInc.incidentId,
          'RESOLVED',
          'Resolved by surface lifesavers in authoritative IncidentManager',
          clockMs
        );
      }
    }
  }

  /**
   * Executes atomic allocation pass across all queued incidents
   */
  public runAutonomousAllocationCycle(clockMs: number = Date.now()): void {
    const pendingIncidents = this.priorityQueue.getPendingQueue();
    if (pendingIncidents.length === 0) return;

    // Allocate optimal drone resources
    const allocationResult = this.allocationEngine.allocatePendingIncidents(pendingIncidents, clockMs);

    // If an incident was allocated, dispatch through DroneRescueDispatchManager
    for (const decision of allocationResult.decisions) {
      if (decision.decisionType === 'ALLOCATED' || decision.decisionType === 'PREEMPTED_AND_ALLOCATED') {
        const incident = this.priorityQueue.getIncident(decision.incidentId);
        if (!incident || !decision.assignedDroneId) continue;

        // Propose assignment in DroneRescueDispatchManager
        const prop = this.dispatchManager.proposeAssignment(
          {
            id: incident.incidentId,
            title: incident.title,
            type: incident.type,
            severity: incident.severity,
            active: true,
            position3D: incident.position3D,
          },
          clockMs
        );

        if (prop.success && prop.assignment) {
          incident.assignedMissionId = prop.assignment.assignmentId;
          // Automatically approve assignment to launch drone
          this.dispatchManager.approveAndDispatch(
            prop.assignment.assignmentId,
            'AUTO_COORDINATION_ENGINE',
            decision.rationale,
            clockMs
          );
        }
      }
    }
  }

  /**
   * Manual operator assignment or reassignment override
   */
  public manuallyAssignDrone(
    incidentId: string,
    targetDroneId: string,
    operatorId: string,
    reason: string,
    clockMs: number = Date.now()
  ): {
    success: boolean;
    rejectionReason?: string;
  } {
    const incident = this.priorityQueue.getIncident(incidentId);
    if (!incident) {
      return { success: false, rejectionReason: `Incident ${incidentId} not found.` };
    }

    const res = this.allocationEngine.requestReassignment(
      incidentId,
      targetDroneId,
      operatorId,
      reason,
      incident,
      clockMs
    );

    if (res.success) {
      this.priorityQueue.recalculateRanks(clockMs);
      this.notify();
    }

    return res;
  }

  /**
   * Computes comprehensive dashboard summary metrics
   */
  public getSummaryMetrics(): CoordinationSummaryMetrics {
    const allIncidents = this.priorityQueue.getAllIncidents();
    const fleet = this.getFleetAvailability();

    const activeIncidents = allIncidents.filter((i) => i.status !== 'RESOLVED');
    const queuedIncidents = allIncidents.filter((i) => i.status === 'QUEUED');
    const allocatedIncidents = allIncidents.filter(
      (i) => i.status === 'ALLOCATED' || i.status === 'IN_TRANSIT' || i.status === 'ASSISTING'
    );
    const resolvedIncidents = allIncidents.filter((i) => i.status === 'RESOLVED');
    const unassignableIncidents = allIncidents.filter((i) => i.status === 'UNASSIGNABLE');

    const availableDrones = fleet.filter((d) => !d.isLocked);
    const assignedDrones = fleet.filter((d) => d.isLocked && d.operationalStatus !== 'OFFLINE');
    const returningDrones = fleet.filter((d) => d.operationalStatus === 'RETURNING');
    const offlineDrones = fleet.filter(
      (d) => d.operationalStatus === 'OFFLINE' || d.connectivity === 'DISCONNECTED'
    );

    const conflicts = this.allocationEngine.getConflicts();
    const preemptions = conflicts.filter((c) => c.conflictType === 'PATROL_PREEMPTION').length;

    const multiAssetTeamed = activeIncidents.filter(
      (i) => i.assignedDroneId && (i.assignedLifeguardId || i.assignedRescueBoatId)
    ).length;

    return {
      totalIncidents: allIncidents.length,
      activeIncidentsCount: activeIncidents.length,
      queuedIncidentsCount: queuedIncidents.length,
      allocatedIncidentsCount: allocatedIncidents.length,
      resolvedIncidentsCount: resolvedIncidents.length,
      unassignableIncidentsCount: unassignableIncidents.length,
      totalFleetCount: fleet.length,
      availableDronesCount: availableDrones.length,
      assignedDronesCount: assignedDrones.length,
      returningDronesCount: returningDrones.length,
      offlineDronesCount: offlineDrones.length,
      preemptionsCount: preemptions,
      conflictsResolvedCount: conflicts.length,
      multiAssetTeamedCount: multiAssetTeamed,
    };
  }
}
