import { Beach } from '../../models/Beach';
import { Environment } from '../../models/Environment';
import { Visitor } from '../../models/Visitor';
import { soundEngine } from '../../audio/BeachSoundEngine';
import { IncidentEventRecorder } from '../../impact-lab/replay/IncidentEventRecorder';
import { DistressIncidentEvent } from '../hazards/rip3d.types';
import { RipCurrentSimulator } from '../hazards/RipCurrentSimulator';
import { PerSwimmerRescueEvaluator } from './PerSwimmerRescueEvaluator';
import {
  RescueMissionDossier,
  RescueOperationMetrics,
  RescueOperationStage,
  RescueResourceState3D,
} from './rescue.types';
import { RescueResourceRegistry } from './RescueResourceRegistry';
import { RescueAssignmentPolicy } from './RescueAssignmentPolicy';
import { RescueNavigation } from './RescueNavigation';
import { RescueMetrics } from './RescueMetrics';

/**
 * RescueCoordinator.ts
 * 
 * Central orchestrator for Milestones 4 & 12:
 * - Coordinates concurrent multi-resource lifesaver dispatches across simultaneous distress incidents
 * - Enforces single-assignment idempotence per incident while allowing multiple active missions
 * - Drives explicit 8-stage state machine independently for each active rescue mission
 * - Manages incident queue (AWAITING_RESOURCE) when all rescue assets are engaged
 * - Synchronizes with IncidentEventRecorder for Incident Replay and Golden Window SLA verification
 */
export class RescueCoordinator {
  private static instance: RescueCoordinator | null = null;

  public readonly registry: RescueResourceRegistry;

  // Multi-mission state management (Milestone 12)
  private activeMissionsMap: Map<string, RescueMissionDossier> = new Map();
  private unassignedIncidents: Map<string, DistressIncidentEvent> = new Map();
  private assistanceTimers: Map<string, number> = new Map();

  public missionHistory: RescueMissionDossier[] = [];
  public autoDispatchEnabled: boolean = true;

  private readonly ASSISTANCE_DURATION_SECONDS = 1.2;
  private listeners: Set<() => void> = new Set();

  public static getInstance(): RescueCoordinator {
    if (!RescueCoordinator.instance) {
      RescueCoordinator.instance = new RescueCoordinator();
    }
    return RescueCoordinator.instance;
  }

  constructor() {
    this.registry = new RescueResourceRegistry();
  }

  /**
   * Backwards-compatible getter for primary active mission
   */
  public get activeMission(): RescueMissionDossier | null {
    if (this.activeMissionsMap.size === 0) return null;
    return this.activeMissionsMap.values().next().value ?? null;
  }

  public set activeMission(m: RescueMissionDossier | null) {
    if (m) {
      this.activeMissionsMap.set(m.incidentId, m);
    } else {
      this.activeMissionsMap.clear();
      this.assistanceTimers.clear();
    }
  }

  public getActiveMissions(): RescueMissionDossier[] {
    return Array.from(this.activeMissionsMap.values());
  }

  public getActiveMissionForIncident(incidentId: string): RescueMissionDossier | undefined {
    return this.activeMissionsMap.get(incidentId);
  }

  public getQueuedIncidents(): DistressIncidentEvent[] {
    return Array.from(this.unassignedIncidents.values());
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    this.listeners.forEach((cb) => cb());
  }

  /**
   * Evaluates distress incident and triggers resource assignment.
   * If assets are exhausted, queues the incident as AWAITING_RESOURCE.
   */
  public handleDistressIncident(
    incident: DistressIncidentEvent,
    visitors: Visitor[],
    beach: Beach
  ): boolean {
    // 1. Idempotency Check: Prevent duplicate dispatch for same unresolved incident
    if (this.activeMissionsMap.has(incident.incidentId)) {
      return false;
    }
    if (this.unassignedIncidents.has(incident.incidentId)) {
      return false;
    }

    const resources = this.registry.getResources();
    const isDeepWater = incident.position3D.z < 0; // Seaward of shoreline

    const decision = RescueAssignmentPolicy.evaluateAssignment(
      incident.position3D.x,
      incident.position3D.y,
      incident.position3D.z,
      isDeepWater,
      resources
    );

    const now = performance.now() / 1000;

    // 2. Resource Contention: All assets busy -> Queue incident
    if (!decision.selectedResource) {
      this.unassignedIncidents.set(incident.incidentId, incident);
      this.notify();
      return false;
    }

    const res = decision.selectedResource;

    // 3. Update Resource State (Exclusive Non-Reentrant Lock)
    this.registry.updateResource(res.id, {
      status: 'EN_ROUTE',
      assignedIncidentId: incident.incidentId,
      targetX: incident.position3D.x,
      targetY: incident.position3D.y,
      targetZ: incident.position3D.z,
    });

    // 4. Create Mission Dossier
    const mission: RescueMissionDossier = {
      missionId: `MSN-${Math.floor(1000 + Math.random() * 9000)}`,
      incidentId: incident.incidentId,
      visitorId: incident.visitorId,
      assignedResourceId: res.id,
      assignedResourceName: res.name,
      resourceType: res.type,
      assignmentRationale: decision.rationale,
      stage: 'EN_ROUTE',
      distressSimTime: incident.onsetSimTime,
      alertSimTime: incident.alertSimTime,
      dispatchSimTime: now,
      departSimTime: now,
    };

    this.activeMissionsMap.set(incident.incidentId, mission);
    this.unassignedIncidents.delete(incident.incidentId);

    // 5. Acoustic Notification
    soundEngine.playLifeguardWhistle();

    // 6. Ingest into IncidentEventRecorder
    const recorder = IncidentEventRecorder.getInstance();
    recorder.recordTick({
      time: Math.floor(now),
      timeDisplay: incident.timeDisplay,
      visitors,
      hazards: [],
      incidents: [],
      emergencyIncidents: [],
      emergencyResources: [
        {
          id: res.id,
          name: res.name,
          type: res.type,
          status: 'EN_ROUTE',
          position: { x: res.currentX, y: res.currentZ },
          basePosition: { x: res.standbyX, y: res.standbyZ },
          speed: res.speedMps,
          responseRadius: 300,
          currentIncidentId: incident.incidentId,
        },
      ],
      metrics: {} as any,
    } as any);

    this.notify();
    return true;
  }

  /**
   * Main per-frame navigation and assistance loop across all concurrent active missions
   */
  public update(
    delta: number,
    visitors: Visitor[],
    beach: Beach,
    environment: Environment
  ): void {
    const now = performance.now() / 1000;

    // A. Check for queued incidents if any resource has returned to AVAILABLE
    if (this.unassignedIncidents.size > 0 && this.autoDispatchEnabled) {
      for (const [incId, inc] of Array.from(this.unassignedIncidents.entries())) {
        const isDeepWater = inc.position3D.z < 0;
        const decision = RescueAssignmentPolicy.evaluateAssignment(
          inc.position3D.x,
          inc.position3D.y,
          inc.position3D.z,
          isDeepWater,
          this.registry.getResources()
        );
        if (decision.selectedResource) {
          this.handleDistressIncident(inc, visitors, beach);
        }
      }
    }

    if (this.activeMissionsMap.size === 0) return;

    // B. Progress each active mission independently
    for (const [incidentId, mission] of Array.from(this.activeMissionsMap.entries())) {
      const res = this.registry.getResource(mission.assignedResourceId);
      if (!res) continue;

      // Dynamic target tracking: continuously synchronize intercept target with live drifting bather
      if (mission.stage === 'EN_ROUTE' && mission.visitorId) {
        const victim = visitors.find((v) => v.id === mission.visitorId && v.active);
        if (victim) {
          const shorelineY = beach.shorelineY || 280;
          const liveTargetX = (victim.position.x - 500) * 0.25;
          const liveTargetZ = -((victim.position.y - shorelineY) * 0.45);
          const currDistToTarget =
            res.targetX != null && res.targetZ != null
              ? Math.hypot(res.currentX - res.targetX, res.currentZ - res.targetZ)
              : Infinity;
          if (currDistToTarget > 3.0 || res.targetX == null) {
            res.targetX = liveTargetX;
            res.targetZ = liveTargetZ;
          }
        }
      }

      // 1. EN ROUTE: Navigate towards distressed bather
      if (mission.stage === 'EN_ROUTE' && res.targetX != null && res.targetZ != null) {
        const arrivalRadius = res.type === 'RESCUE_BOAT' ? 5.5 : 2.8;
        const nav = RescueNavigation.step(
          res,
          res.targetX,
          res.targetY || 0,
          res.targetZ,
          delta,
          arrivalRadius
        );

        this.registry.updateResource(res.id, {
          currentX: nav.x,
          currentY: nav.y,
          currentZ: nav.z,
          rotationY: nav.rotationY,
        });

        if (nav.hasArrived) {
          mission.stage = 'ARRIVED';
          mission.arrivalSimTime = now;
          mission.assistanceStartSimTime = now;
          this.assistanceTimers.set(mission.missionId, this.ASSISTANCE_DURATION_SECONDS);

          this.registry.updateResource(res.id, {
            status: 'ON_SCENE',
          });

          // Trigger two-tone broadcast chime
          soundEngine.playPACallChime();
          this.notify();
        }
      }
      // 2. ON SCENE & ASSISTING: Deploy flotation and secure bather
      else if (mission.stage === 'ARRIVED' || mission.stage === 'ASSISTING') {
        mission.stage = 'ASSISTING';
        let timer = (this.assistanceTimers.get(mission.missionId) ?? this.ASSISTANCE_DURATION_SECONDS) - delta;
        this.assistanceTimers.set(mission.missionId, timer);

        if (timer <= 0) {
          mission.stage = 'COMPLETED';
          mission.assistanceEndSimTime = now;
          mission.resolutionSimTime = now;

          // Transition bather to safe recovered state
          const bather = visitors.find((v) => v.id === mission.visitorId);
          if (bather) {
            bather.state = 'BEACH';
            bather.distressLevel = 0;
            bather.fatigue = 0.15;
            bather.position.y = 160; // Safe dry beach swash
            bather.awarenessState = 'UNAWARE';
            if (bather.distressState) {
              bather.distressState = undefined;
            }
          }

          // Clear evaluated lock from PerSwimmerRescueEvaluator
          try {
            PerSwimmerRescueEvaluator.getInstance().clearEvaluated(mission.visitorId);
          } catch {
            // non-blocking
          }

          // Calculate verified response metrics
          const metrics = RescueMetrics.compute(mission);
          mission.alertLatencySec = metrics.alertLatencySec || undefined;
          mission.dispatchLatencySec = metrics.dispatchLatencySec || undefined;
          mission.travelTimeSec = metrics.travelTimeSec || undefined;
          mission.timeToAssistanceSec = metrics.timeToAssistanceSec || undefined;
          mission.assistanceDurationSec = metrics.assistanceDurationSec || undefined;
          mission.totalMissionDurationSec = metrics.totalDurationSec || undefined;
          mission.isGoldenWindowMet = metrics.goldenWindowSLA.compliant;

          // Resolve in hazard simulator
          RipCurrentSimulator.getInstance().resolveIncident(mission.incidentId);

          // Begin return journey to base station
          mission.stage = 'RETURNING';
          this.registry.updateResource(res.id, {
            status: 'RETURNING',
            targetX: res.standbyX,
            targetY: res.standbyY,
            targetZ: res.standbyZ,
          });

          this.notify();
        }
      }
      // 3. RETURNING: Resource navigates back to designated station
      else if (mission.stage === 'RETURNING') {
        const nav = RescueNavigation.step(
          res,
          res.standbyX,
          res.standbyY,
          res.standbyZ,
          delta,
          3.0
        );

        this.registry.updateResource(res.id, {
          currentX: nav.x,
          currentY: nav.y,
          currentZ: nav.z,
          rotationY: nav.rotationY,
        });

        if (nav.hasArrived) {
          mission.stage = 'RESOLVED';
          this.registry.updateResource(res.id, {
            status: 'AVAILABLE',
            assignedIncidentId: null,
            targetX: undefined,
            targetY: undefined,
            targetZ: undefined,
          });

          this.missionHistory.unshift({ ...mission });
          this.activeMissionsMap.delete(mission.incidentId);
          this.assistanceTimers.delete(mission.missionId);

          this.notify();
        }
      }
    }
  }

  /**
   * Resets all active rescue operations
   */
  public resetOperations(): void {
    this.registry.resetAll();
    this.activeMissionsMap.clear();
    this.unassignedIncidents.clear();
    this.assistanceTimers.clear();
    try {
      PerSwimmerRescueEvaluator.getInstance().reset();
    } catch {
      // non-blocking
    }
    this.notify();
  }

  public getMetrics(): RescueOperationMetrics {
    const resources = this.registry.getResources();
    const availableBoats = resources.filter((r) => r.type === 'RESCUE_BOAT' && r.status === 'AVAILABLE').length;
    const availableLGs = resources.filter((r) => r.type === 'LIFEGUARD' && r.status === 'AVAILABLE').length;

    const resolved = this.missionHistory.filter((m) => m.timeToAssistanceSec != null);
    const avgTta = resolved.length > 0
      ? resolved.reduce((acc, m) => acc + (m.timeToAssistanceSec || 0), 0) / resolved.length
      : null;

    const goldenCompliantCount = resolved.filter((m) => m.isGoldenWindowMet).length;
    const complianceRate = resolved.length > 0 ? (goldenCompliantCount / resolved.length) * 100 : 100;

    return {
      activeMissionsCount: this.activeMissionsMap.size,
      resolvedMissionsCount: this.missionHistory.length,
      averageTimeToAssistanceSec: avgTta ? Number(avgTta.toFixed(1)) : null,
      goldenWindowComplianceRate: Number(complianceRate.toFixed(0)),
      availableBoatsCount: availableBoats,
      availableLifeguardsCount: availableLGs,
    };
  }
}
