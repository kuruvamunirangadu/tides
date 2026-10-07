import { BeachRiskOverview, ZoneRiskAssessment } from '../models/Risk';
import { Incident } from '../models/Incident';
import { Zone } from '../models/Zone';
import { Environment } from '../models/Environment';
import { VisitorEngine } from '../visitors/VisitorEngine';
import { Decision } from './models/Decision';
import { ResponseAction } from './models/ResponseAction';
import { ResourceManager } from './resources/ResourceManager';
import { ActionManager } from './actions/ActionManager';
import { ActionExecutor } from './actions/ActionExecutor';
import { DecisionHistory } from './history/DecisionHistory';
import { PriorityCalculator } from './prioritization/IncidentPriority';
import { evaluateLowRiskRules } from './rules/lowRiskRules';
import { evaluateModerateRiskRules } from './rules/moderateRiskRules';
import { evaluateHighRiskRules } from './rules/highRiskRules';
import { evaluateCriticalRiskRules } from './rules/criticalRiskRules';

export class DecisionEngine {
  private resourceManager: ResourceManager = new ResourceManager();
  private actionManager: ActionManager = new ActionManager();
  private history: DecisionHistory = new DecisionHistory();
  private currentDecisions: Map<string, Decision> = new Map();
  private safetyInterventionsActive: boolean = true;

  public setInterventionsActive(active: boolean): void {
    this.safetyInterventionsActive = active;
  }

  public isInterventionsActive(): boolean {
    return this.safetyInterventionsActive;
  }

  public getResourceManager(): ResourceManager {
    return this.resourceManager;
  }

  public getActionManager(): ActionManager {
    return this.actionManager;
  }

  public getHistory(): DecisionHistory {
    return this.history;
  }

  public getActiveDecisions(): Decision[] {
    return Array.from(this.currentDecisions.values());
  }

  /**
   * Main Decision & Response loop executed every simulation tick
   */
  public evaluateAndExecute(
    riskOverview: BeachRiskOverview | undefined,
    incidents: Incident[],
    zones: Zone[],
    _environment: Environment,
    visitorEngine: VisitorEngine,
    currentTime: number,
    timeDisplay: string,
    deltaTime: number
  ): {
    decisions: Decision[];
    actions: ResponseAction[];
  } {
    // 1. Advance kinematic movement of dispatched assets (Lifeguards, Drones)
    this.resourceManager.updateResourceMovement(deltaTime);

    if (!riskOverview) {
      return { decisions: [], actions: [] };
    }

    if (!this.safetyInterventionsActive) {
      // Passive Observation Mode: No automated warnings or dispatches executed
      return { decisions: [], actions: [] };
    }

    // 2. Prioritize active incidents
    const sortedIncidents = [...incidents]
      .filter((i) => i.active)
      .sort((a, b) => {
        const pA = PriorityCalculator.calculatePriority(a, riskOverview.zoneAssessments[a.zoneId]).priority;
        const pB = PriorityCalculator.calculatePriority(b, riskOverview.zoneAssessments[b.zoneId]).priority;
        return pB - pA;
      });

    const newDecisions: Decision[] = [];

    // 3. Process each zone's operational risk & associated incidents
    zones.forEach((zone) => {
      const za = riskOverview.zoneAssessments[zone.id];
      if (!za) return;

      const zoneIncident = sortedIncidents.find((inc) => inc.zoneId === zone.id);
      let actions: ResponseAction[] = [];
      let reason = za.reason;
      let resourcesRequired: string[] = [];
      let resourcesAssigned: string[] = [];
      let priority = 20;

      switch (za.category) {
        case 'CRITICAL': {
          const critResult = evaluateCriticalRiskRules(
            zone.id,
            za,
            zoneIncident,
            this.resourceManager,
            currentTime
          );
          actions = critResult.actions;
          reason = critResult.reason;
          resourcesRequired = critResult.resourcesRequired;
          resourcesAssigned = critResult.resourcesAssigned;
          priority = 95;
          break;
        }

        case 'HIGH': {
          actions = evaluateHighRiskRules(zone.id, za, this.resourceManager, currentTime);
          resourcesRequired = ['LIFEGUARD', 'WARNING_DISPLAY'];
          priority = 75;
          break;
        }

        case 'MODERATE': {
          actions = evaluateModerateRiskRules(zone.id, za, currentTime);
          resourcesRequired = ['WARNING_DISPLAY'];
          priority = 45;
          break;
        }

        case 'LOW':
        default: {
          actions = evaluateLowRiskRules(zone.id, za, currentTime);
          priority = 15;
          break;
        }
      }

      // Check existing decision to avoid spamming logs unless state changed
      const existing = this.currentDecisions.get(zone.id);
      const isStatusChanged = !existing || existing.riskLevel !== za.category || (zoneIncident && !existing.incidentId);

      const decision: Decision = {
        id: `DEC-${zone.id}-${Math.floor(currentTime)}`,
        incidentId: zoneIncident?.id,
        zoneId: zone.id,
        riskLevel: za.category,
        actions,
        priority,
        reason,
        resourcesRequired,
        resourcesAssigned,
        createdAt: existing?.createdAt || currentTime,
        updatedAt: currentTime,
        status: za.category === 'CRITICAL' && resourcesAssigned.length === 0 ? 'ESCALATED' : 'EXECUTING',
      };

      this.currentDecisions.set(zone.id, decision);
      newDecisions.push(decision);

      if (isStatusChanged && (za.category === 'HIGH' || za.category === 'CRITICAL' || zoneIncident)) {
        this.history.logDecision(decision, timeDisplay);
      }
    });

    // 4. Flatten all active actions and register with ActionManager
    const allNewActions = newDecisions.flatMap((d) => d.actions);
    this.actionManager.addActions(allNewActions);

    // 5. Execute closed-loop actions (Kinematics, rescues, evacuation compliance)
    ActionExecutor.executeActions(
      this.actionManager.getActiveActions(),
      this.resourceManager,
      visitorEngine,
      zones,
      currentTime
    );

    return {
      decisions: newDecisions,
      actions: this.actionManager.getActiveActions(),
    };
  }

  public reset(): void {
    this.resourceManager.reset();
    this.actionManager.clear();
    this.currentDecisions.clear();
    this.history.clear();
  }
}
