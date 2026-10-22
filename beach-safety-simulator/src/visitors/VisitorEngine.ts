import { Visitor, VisitorGenerationConfig } from '../models/Visitor';
import { Zone } from '../models/Zone';
import { EnvironmentState } from '../models/Environment';
import { Incident } from '../models/Incident';
import { VisitorManager } from './VisitorManager';
import { VisitorGenerator, DEFAULT_GENERATION_CONFIG } from './VisitorGenerator';
import { BehaviorEngine } from './behavior/BehaviorEngine';
import { MovementEngine } from './movement/MovementEngine';
import { CrowdEngine } from './crowd/CrowdEngine';
import { DistressEngine } from './distress/DistressEngine';
import { IncidentManager } from './incidents/IncidentManager';
import { ZoneDensityStats } from './crowd/DensityCalculator';

import { SensoryPerceptionEngine } from './perception/SensoryPerceptionEngine';

export class VisitorEngine {
  private visitorManager: VisitorManager = new VisitorManager();
  private crowdEngine: CrowdEngine = new CrowdEngine();
  private incidentManager: IncidentManager = new IncidentManager();
  private config: VisitorGenerationConfig = { ...DEFAULT_GENERATION_CONFIG };
  private spawnAccumulator: number = 0;

  constructor() {
    this.initializeDefaultPopulation(75);
  }

  public initializeDefaultPopulation(count: number = 75): void {
    this.visitorManager.clear();
    this.incidentManager.clear();
    this.crowdEngine.getGroupManager().clear();

    const initialVisitors: Visitor[] = [];

    // Seed paired connected wristband visitors (WB-101 to WB-106)
    // Ensures real-time connection between wristband readings, 3D simulation, and orange locator highlights
    // In normal baseline simulation, ALL visitors start safe/nominal. Demo distress is explicitly triggered on demand.
    initialVisitors.push(
      VisitorGenerator.generateWristbandVisitor('VIS-REST-01', 'Karthik Varma', 'WB-105', 740, 440, 'RIP_CURRENT_CORRIDOR_SOUTH', 'SWIMMING', false),
      VisitorGenerator.generateWristbandVisitor('VIS-SWIM-04', 'Pooja Reddy', 'WB-104', 520, 410, 'CENTRAL_SURF', 'SWIMMING', false),
      VisitorGenerator.generateWristbandVisitor('VIS-SWIM-01', 'Rohan Sharma', 'WB-101', 220, 350, 'SWIM_ZONE_NORTH', 'SWIMMING', false),
      VisitorGenerator.generateWristbandVisitor('VIS-SWIM-02', 'Ananya Rao', 'WB-102', 280, 380, 'SWIM_ZONE_NORTH', 'SWIMMING', false),
      VisitorGenerator.generateWristbandVisitor('VIS-SWIM-03', 'Vikram Patel', 'WB-103', 490, 390, 'CENTRAL_SURF', 'SWIMMING', false),
      VisitorGenerator.generateWristbandVisitor('VIS-SHORE-01', 'Sneha Nair', 'WB-106', 790, 240, 'SHORELINE_SOUTH', 'BEACH', false),
    );

    // Spawn 2-3 families
    for (let i = 0; i < 3; i++) {
      const family = VisitorGenerator.generateFamilyGroup(
        this.crowdEngine.getGroupManager(),
        200 + i * 250,
        70 + Math.random() * 40
      );
      initialVisitors.push(...family);
    }

    // Fill remaining with distribution
    while (initialVisitors.length < count) {
      const type = VisitorGenerator.selectRandomVisitorType(this.config);
      const v = VisitorGenerator.generateSingleVisitor(type);
      initialVisitors.push(v);
    }

    this.visitorManager.setVisitors(initialVisitors);
  }

  public getVisitorManager(): VisitorManager {
    return this.visitorManager;
  }

  public getIncidentManager(): IncidentManager {
    return this.incidentManager;
  }

  public getCrowdEngine(): CrowdEngine {
    return this.crowdEngine;
  }

  public setConfig(config: Partial<VisitorGenerationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getConfig(): VisitorGenerationConfig {
    return this.config;
  }

  /**
   * Main simulation tick for visitor dynamics
   */
  public tick(
    deltaTime: number,
    currentTime: number,
    zones: Zone[],
    environment: EnvironmentState
  ): {
    visitors: Visitor[];
    activeIncidents: Incident[];
    densityStats: Map<string, ZoneDensityStats>;
  } {
    const visitors = this.visitorManager.getActiveVisitors();
    const visitorsMap = this.visitorManager.getVisitorsMap();

    // 1. Spawning new arrivals
    if (visitors.length < this.config.maxVisitors) {
      this.spawnAccumulator += (this.config.arrivalRate / 60) * deltaTime;
      while (this.spawnAccumulator >= 1 && this.visitorManager.getActiveVisitors().length < this.config.maxVisitors) {
        this.spawnAccumulator -= 1;
        const type = VisitorGenerator.selectRandomVisitorType(this.config);
        const newVisitor = VisitorGenerator.generateSingleVisitor(type);
        this.visitorManager.addVisitor(newVisitor);
      }
    }

    const currentVisitors = this.visitorManager.getActiveVisitors();

    // 2. Direct Sensory Perception & Tactile Shoreline Feedback
    currentVisitors.forEach((v) => {
      const currentZone = zones.find((z) => z.id === v.currentZone);
      SensoryPerceptionEngine.evaluateSensoryPerception(v, deltaTime, environment, currentZone, zones);
    });

    // 3. Behavioral Updates
    currentVisitors.forEach((v) => {
      BehaviorEngine.updateVisitorBehavior(v, deltaTime, zones, environment);
    });

    // 4. Movement & Vector Superposition (incorporating escape vector if FLEEING)
    currentVisitors.forEach((v) => {
      MovementEngine.updateVisitorMovement(v, deltaTime, zones, environment, visitorsMap);
    });

    // 5. Crowd Dynamics & Congestion Slowdown
    const { densityStats } = this.crowdEngine.updateCrowdDynamics(currentVisitors, zones);

    // 6. Distress Evaluation
    currentVisitors.forEach((v) => {
      DistressEngine.updateDistressState(v, deltaTime, currentTime, environment, zones);
    });

    // 7. Incident Evaluation
    const activeIncidents = this.incidentManager.evaluateIncidents(
      currentVisitors,
      zones,
      densityStats,
      currentTime
    );

    return {
      visitors: currentVisitors,
      activeIncidents,
      densityStats,
    };
  }

  public sendWarningToVisitor(visitorId: string, hazardType: string, zoneId: string, env?: EnvironmentState, zones: Zone[] = []): void {
    const visitor = this.visitorManager.getVisitor(visitorId);
    if (visitor && visitor.active) {
      visitor.warningCount += 1;
      visitor.state = 'WARNING_RECEIVED';
      if (env) {
        SensoryPerceptionEngine.propagateSystemWarning(visitor, env, zones, 'ACOUSTIC_SIREN');
      }
    }
  }

  public sendWarningToZone(zoneId: string, hazardType: string, env?: EnvironmentState, zones: Zone[] = []): void {
    const visitors = this.visitorManager
      .getActiveVisitors()
      .filter((v) => v.currentZone === zoneId);
    visitors.forEach((v) => {
      v.warningCount += 1;
      v.state = 'WARNING_RECEIVED';
      if (env) {
        SensoryPerceptionEngine.propagateSystemWarning(v, env, zones, 'ACOUSTIC_SIREN');
      }
    });
  }

  /**
   * Explicitly triggers on-demand demo distress scenario for a wristband visitor
   */
  public triggerDemoDistressScenario(wristbandId: string = 'WB-105'): boolean {
    const visitor = this.visitorManager.getActiveVisitors().find((v) => v.wristbandId === wristbandId);
    if (!visitor) return false;
    visitor.state = 'STRUGGLING';
    visitor.isSuffocating = true;
    visitor.color = '#f97316';
    visitor.distressLevel = 0.88;
    visitor.feelingState = 'UNSAFE';
    return true;
  }

  /**
   * Recovers/resets a distressed visitor back to normal swimming state
   */
  public resetDistressScenario(wristbandId: string = 'WB-105'): boolean {
    const visitor = this.visitorManager.getActiveVisitors().find((v) => v.wristbandId === wristbandId);
    if (!visitor) return false;
    visitor.state = 'SWIMMING';
    visitor.isSuffocating = false;
    visitor.color = '#38bdf8';
    visitor.distressLevel = 0.0;
    visitor.feelingState = 'SAFE';
    return true;
  }
}

export interface EscapePath {
  originX: number;
  originY: number;
  intermediateX: number;
  intermediateY: number;
  finalTargetX: number;
  finalTargetY: number;
  escapeMode: 'LATERAL_TRAVERSE' | 'DIRECT_SHORE_RUN';
}

export function calculateEscapePath(
  agentX: number,
  agentY: number,
  ripCorridors: Array<{ x_min: number; x_max: number }>,
  waterDepth: number
): EscapePath {
  const trappedCorridor = ripCorridors.find(
    (c) => agentX >= c.x_min - 5 && agentX <= c.x_max + 5
  );

  if (trappedCorridor && waterDepth > 1.0) {
    const distToLeft = Math.abs(agentX - trappedCorridor.x_min);
    const distToRight = Math.abs(agentX - trappedCorridor.x_max);
    
    const exitX = distToLeft < distToRight 
      ? trappedCorridor.x_min - 15 
      : trappedCorridor.x_max + 15;

    return {
      originX: agentX,
      originY: agentY,
      intermediateX: exitX,
      intermediateY: agentY,
      finalTargetX: exitX,
      finalTargetY: 0,
      escapeMode: 'LATERAL_TRAVERSE'
    };
  }

  return {
    originX: agentX,
    originY: agentY,
    intermediateX: agentX,
    intermediateY: 0,
    finalTargetX: agentX,
    finalTargetY: 0,
    escapeMode: 'DIRECT_SHORE_RUN'
  };
}

