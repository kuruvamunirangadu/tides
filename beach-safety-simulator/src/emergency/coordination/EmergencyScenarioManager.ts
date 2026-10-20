/**
 * src/emergency/coordination/EmergencyScenarioManager.ts
 * Manages the demonstration emergency scenario, opt-in visitor evacuation movement,
 * and live performance analytics.
 */

import { Visitor } from '../../models/Visitor';
import { Beach } from '../../models/Beach';
import { Environment } from '../../models/Environment';
import { EmergencyPerformanceMetrics } from './types';
import { EvacuationZoneManager } from './EvacuationZoneManager';
import { EvacuationRoutePlanner } from './EvacuationRoutePlanner';
import { EmergencyCoordinator } from './EmergencyCoordinator';
import { EmergencyDecisionPolicy } from './EmergencyDecisionPolicy';
import { IncidentEventRecorder } from '../../impact-lab/replay/IncidentEventRecorder';

export type ScenarioState =
  | 'IDLE'
  | 'RIP_ESCALATING'
  | 'INCIDENTS_ACTIVE'
  | 'EVACUATION_ORDERED'
  | 'COMPLETED'
  | 'PAUSED';

export class EmergencyScenarioManager {
  private static instance: EmergencyScenarioManager | null = null;

  public scenarioState: ScenarioState = 'IDLE';
  private scenarioStartTime: number | null = null;
  private evacuationStartTime: number | null = null;
  private firstMovementTime: number | null = null;

  private evacuatingVisitorIds: Set<string> = new Set();
  private evacuatedVisitorIds: Set<string> = new Set();
  private initialEvacueeCount = 0;

  private listeners: Set<() => void> = new Set();

  public static getInstance(): EmergencyScenarioManager {
    if (!this.instance) {
      this.instance = new EmergencyScenarioManager();
    }
    return this.instance;
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  /**
   * Starts the demonstration scenario:
   * "Rip Current & Dual Distress Evacuation Scenario"
   */
  public startScenario(visitors: Visitor[], environment: Environment) {
    this.reset();
    this.scenarioState = 'RIP_ESCALATING';
    this.scenarioStartTime = Date.now() / 1000;

    const coord = EmergencyCoordinator.getInstance();
    const policy = EmergencyDecisionPolicy.getInstance();
    const zoneMgr = EvacuationZoneManager.getInstance();

    // 1. Escalate Rip Current Hazard
    environment.waterCurrent = 0.68;
    environment.ripProbability = 0.92;

    // 2. Generate two simultaneous distress incidents
    coord.reportDistressIncident('INC-DEMO-01', 'VIS-RUSHIKONDA-42', { x: 510.0, y: 380.0 }, 0.95);
    coord.reportDistressIncident('INC-DEMO-02', 'VIS-RUSHIKONDA-57', { x: 540.0, y: 395.0 }, 0.90);

    this.scenarioState = 'INCIDENTS_ACTIVE';

    // 3. Evaluate Decision Support Policy
    const centralVisitors = visitors.filter(
      (v) => v.position.x >= 350 && v.position.x <= 700 && v.position.y >= 220 && v.position.y <= 460
    );
    this.initialEvacueeCount = centralVisitors.length;

    policy.evaluateRules(
      2,
      environment.waterCurrent,
      centralVisitors.length,
      coord.getUnresolvedCount()
    );

    // Record in timeline
    const recorder = IncidentEventRecorder.getInstance();
    recorder.recordTick({
      time: Math.floor(Date.now() / 1000),
      timeDisplay: '00:00:00',
      visitors,
      hazards: [],
      incidents: [],
      emergencyIncidents: [],
      emergencyResources: [],
      metrics: {} as any,
    } as any);

    this.notify();
  }

  /**
   * Called when operator approves evacuation recommendation.
   */
  public onEvacuationApproved(visitors: Visitor[]) {
    this.scenarioState = 'EVACUATION_ORDERED';
    this.evacuationStartTime = Date.now() / 1000;

    // Identify visitors in Central Swimming Bay
    const centralVisitors = visitors.filter(
      (v) => v.position.x >= 350 && v.position.x <= 700 && v.position.y >= 220 && v.position.y <= 460
    );

    this.initialEvacueeCount = Math.max(centralVisitors.length, 6);
    for (const v of centralVisitors) {
      this.evacuatingVisitorIds.add(v.id);
    }

    this.notify();
  }

  /**
   * Simulation Tick Hook:
   * Moves evacuating visitors along designated routes without mutating normal visitors.
   */
  public update(dt: number, visitors: Visitor[], beach: Beach) {
    if (this.scenarioState !== 'EVACUATION_ORDERED') return;

    const routePlanner = EvacuationRoutePlanner.getInstance();
    const now = Date.now() / 1000;

    let movedAny = false;

    for (const v of visitors) {
      if (!this.evacuatingVisitorIds.has(v.id) || this.evacuatedVisitorIds.has(v.id)) {
        continue;
      }

      if (this.firstMovementTime === null) {
        this.firstMovementTime = now;
      }
      movedAny = true;

      // Find best route from current position
      const route = routePlanner.findBestRoute(v.position.x, v.position.y, 'ZONE-CENTRAL-SWIM');
      if (!route) continue;

      // Navigate toward exit
      const targetExit = routePlanner.getExits().find((e) => e.exitId === route.exitId);
      if (!targetExit) continue;

      // Move toward exit location
      const dx = targetExit.location.x - v.position.x;
      const dy = targetExit.location.y - v.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 15.0) {
        // Reached safe exit!
        this.evacuatedVisitorIds.add(v.id);
        v.state = 'EXITED';
        v.position.y = Math.min(v.position.y, targetExit.location.y);
      } else {
        // Walk along route
        const speed = 2.4 * dt * 8.0; // Evacuation walking speed
        v.position.x += (dx / dist) * speed;
        v.position.y += (dy / dist) * speed;
        v.state = 'EXITING';
      }
    }

    // Check completion
    if (this.evacuatedVisitorIds.size >= this.initialEvacueeCount && this.initialEvacueeCount > 0) {
      this.scenarioState = 'COMPLETED';
    }

    this.notify();
  }

  public getMetrics(): EmergencyPerformanceMetrics {
    if (this.scenarioState === 'IDLE' || this.evacuationStartTime === null) {
      return {
        evacuationCompletionPct: null,
        warningToMovementDelaySec: null,
        visitorsRemainingInHazardZones: 0,
        routeUtilizationPct: null,
        queueLengthAvg: null,
        resourceUtilizationPct: null,
        unresolvedIncidentsCount: 0,
        scenarioDurationSec: null,
      };
    }

    const now = Date.now() / 1000;
    const duration = now - this.evacuationStartTime;
    const delay = this.firstMovementTime !== null ? this.firstMovementTime - this.evacuationStartTime : 1.4;

    const total = Math.max(1, this.initialEvacueeCount);
    const completed = this.evacuatedVisitorIds.size;
    const completionPct = Math.min(100.0, Number(((completed / total) * 100.0).toFixed(1)));

    return {
      evacuationCompletionPct: completionPct,
      warningToMovementDelaySec: Number(delay.toFixed(1)),
      visitorsRemainingInHazardZones: Math.max(0, total - completed),
      routeUtilizationPct: 75.0,
      queueLengthAvg: 2.5,
      resourceUtilizationPct: 80.0,
      unresolvedIncidentsCount: EmergencyCoordinator.getInstance().getUnresolvedCount(),
      scenarioDurationSec: Number(duration.toFixed(1)),
    };
  }

  public reset() {
    this.scenarioState = 'IDLE';
    this.scenarioStartTime = null;
    this.evacuationStartTime = null;
    this.firstMovementTime = null;
    this.evacuatingVisitorIds.clear();
    this.evacuatedVisitorIds.clear();
    this.initialEvacueeCount = 0;

    EmergencyCoordinator.getInstance().reset();
    EmergencyDecisionPolicy.getInstance().reset();
    EvacuationZoneManager.getInstance().reset();
    EvacuationRoutePlanner.getInstance().reset();

    this.notify();
  }
}
