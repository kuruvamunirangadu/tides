import { EmergencyIncident, EmergencyIncidentType, EmergencyIncidentStatus } from './models/EmergencyIncident';
import { EmergencyResource } from './models/EmergencyResource';
import { ResponseMetrics, PerformanceAnalytics } from './models/ResponseMetrics';
import { EmergencyResourceManager } from './resources/ResourceManager';
import { DispatchManager } from './dispatch/DispatchManager';
import { EmergencyMovement } from './movement/EmergencyMovement';
import { RescueManager } from './rescue/RescueManager';
import { DroneMissionManager } from './drone/DroneMission';
import { WarningBoardManager, BoardDisplayState } from './communication/WarningBoardManager';
import { PerformanceAnalyticsCalculator } from './metrics/PerformanceAnalytics';
import { Incident } from '../models/Incident';
import { Decision } from '../decision/models/Decision';
import { BeachRiskOverview } from '../models/Risk';
import { VisitorEngine } from '../visitors/VisitorEngine';

export class EmergencyResponseEngine {
  private resourceManager: EmergencyResourceManager = new EmergencyResourceManager();
  private dispatchManager: DispatchManager = new DispatchManager();
  private analyticsCalculator: PerformanceAnalyticsCalculator = new PerformanceAnalyticsCalculator();
  private emergencyIncidents: Map<string, EmergencyIncident> = new Map();
  private boardStates: BoardDisplayState[] = [];

  public getResourceManager(): EmergencyResourceManager {
    return this.resourceManager;
  }

  public getDispatchManager(): DispatchManager {
    return this.dispatchManager;
  }

  public getAnalyticsCalculator(): PerformanceAnalyticsCalculator {
    return this.analyticsCalculator;
  }

  public getEmergencyIncidents(): EmergencyIncident[] {
    return Array.from(this.emergencyIncidents.values());
  }

  public getBoardStates(): BoardDisplayState[] {
    return this.boardStates;
  }

  /**
   * Main Emergency Response Simulation Tick
   */
  public tick(
    activeIncidents: Incident[],
    _activeDecisions: Decision[],
    riskOverview: BeachRiskOverview | undefined,
    visitorEngine: VisitorEngine,
    currentTime: number,
    deltaTime: number
  ): {
    incidents: EmergencyIncident[];
    resources: EmergencyResource[];
    boardStates: BoardDisplayState[];
    analytics: PerformanceAnalytics;
    recentMetrics: ResponseMetrics[];
  } {
    // 1. Synchronize Incident Manager events with Emergency Incidents
    activeIncidents.forEach((inc) => {
      let eInc = this.emergencyIncidents.get(inc.id);

      if (!eInc && inc.active) {
        let eType: EmergencyIncidentType = 'SWIMMER_DISTRESS';
        if (inc.type === 'RESTRICTED_ENTRY') eType = 'RESTRICTED_ZONE';
        else if (inc.type === 'CROWD') eType = 'CROWD_EMERGENCY';

        eInc = {
          id: inc.id,
          type: eType,
          title: inc.title,
          description: inc.description,
          zoneId: inc.zoneId,
          location: { ...inc.location },
          targetConfidence: 0.78, // Initial localization confidence
          severity: inc.severity,
          status: 'DETECTED',
          affectedVisitorIds: [...inc.visitorIds],
          assignedResourceIds: [],
          createdAt: inc.startedAt,
          detectedAt: currentTime,
        };

        this.emergencyIncidents.set(inc.id, eInc);

        // Immediate automated resource allocation
        this.allocateResourcesForIncident(eInc, currentTime);
      } else if (eInc && inc.active) {
        // Incident already exists: dynamically update location and target coordinates of assigned resources
        eInc.location = { ...inc.location };
        eInc.severity = inc.severity;
        eInc.targetConfidence = Math.min(0.99, eInc.targetConfidence + 0.05 * deltaTime);

        // Dynamically update target position for all dispatched and en-route resources
        eInc.assignedResourceIds.forEach((resId) => {
          const res = this.resourceManager.getById(resId);
          if (res && (res.status === 'DISPATCHED' || res.status === 'EN_ROUTE')) {
            res.targetPosition = { ...inc.location };
          }
        });

        // Dynamic escalation: if in water (y >= 240) and critical, ensure RESCUE_BOAT is dispatched if not already!
        if (
          (eInc.type === 'SWIMMER_DISTRESS' || eInc.type === 'DROWNING_RISK') &&
          eInc.location.y >= 240 &&
          (eInc.severity === 'CRITICAL' || eInc.location.y >= 270)
        ) {
          const hasBoat = eInc.assignedResourceIds.some((id) => {
            const r = this.resourceManager.getById(id);
            return r?.type === 'RESCUE_BOAT';
          });
          if (!hasBoat) {
            const boat = this.resourceManager.findBestSuitableResource('rescue', eInc.location, 'RESCUE_BOAT');
            if (boat) {
              this.resourceManager.setStatus(boat.id, 'DISPATCHED', eInc.id, eInc.location);
              eInc.assignedResourceIds.push(boat.id);
              const eta = Math.round(
                Math.hypot(boat.position.x - eInc.location.x, boat.position.y - eInc.location.y) / boat.speed
              );
              this.dispatchManager.createDispatch(eInc.id, boat.id, currentTime, eta, 'High-speed critical sea rescue');
            }
          }
        }
      }
    });

    // Synchronize resolved or inactive incidents
    this.emergencyIncidents.forEach((eInc, id) => {
      const match = activeIncidents.find((ai) => ai.id === id);
      if ((!match || !match.active) && eInc.status !== 'RESOLVED') {
        eInc.status = 'RESOLVED';
        eInc.resolvedAt = currentTime;
        eInc.assignedResourceIds.forEach((resId) => {
          const res = this.resourceManager.getById(resId);
          if (res && res.status !== 'AVAILABLE' && res.status !== 'UNAVAILABLE') {
            res.status = 'RETURNING';
            res.currentIncidentId = undefined;
          }
        });
      }
    });

    // 2. Physical Kinematic Transit
    const resources = this.resourceManager.getAll();
    EmergencyMovement.updateMovement(resources, deltaTime);

    // 3. Drone Mission & Aerial Visual Locking
    const drones = resources.filter((r) => r.type === 'DRONE');
    DroneMissionManager.updateDroneMissions(Array.from(this.emergencyIncidents.values()), drones);

    // 4. Rescue State Machine & Metric Compilation
    RescueManager.updateRescueOperations(
      Array.from(this.emergencyIncidents.values()),
      this.resourceManager,
      visitorEngine,
      currentTime,
      (metrics) => {
        this.analyticsCalculator.logResolvedMetrics(metrics);
      }
    );

    // 5. Update Dynamic LED Warning Boards
    const boards = resources.filter((r) => r.type === 'LED_WARNING_BOARD');
    this.boardStates = WarningBoardManager.updateBoards(boards, riskOverview);

    // 6. Analytics compilation
    const analytics = this.analyticsCalculator.getAnalytics(resources);

    return {
      incidents: this.getEmergencyIncidents(),
      resources: this.resourceManager.getAll(),
      boardStates: this.boardStates,
      analytics,
      recentMetrics: this.analyticsCalculator.getRecentMetrics(),
    };
  }

  /**
   * Conflict-free multi-resource allocation based on incident capabilities.
   * Prioritizes high-speed maritime rescue craft (RESCUE_BOAT) for critical in-water emergencies,
   * co-dispatching Lifeguards for swim assistance and SAR Drones for aerial flotation drop.
   */
  private allocateResourcesForIncident(inc: EmergencyIncident, currentTime: number): void {
    inc.status = 'DISPATCHING';
    inc.dispatchedAt = currentTime;

    // 1. Swimmer in distress in water (shoreline is y = 250; water is y >= 250)
    if (inc.type === 'SWIMMER_DISTRESS' || inc.type === 'DROWNING_RISK') {
      const isWaterborne = inc.location.y >= 240;
      const isCriticalOrOffshore = inc.severity === 'CRITICAL' || inc.location.y >= 270;

      let primaryRescue: EmergencyResource | undefined;

      // In water: if critical distress or offshore (y >= 270), prioritize high-speed rescue boat (BOAT-01)
      if (isWaterborne && isCriticalOrOffshore) {
        primaryRescue = this.resourceManager.findBestSuitableResource('rescue', inc.location, 'RESCUE_BOAT');
      }

      // If no boat available or nearshore non-critical, try nearest lifeguard
      if (!primaryRescue) {
        primaryRescue = this.resourceManager.findBestSuitableResource('rescue', inc.location, 'LIFEGUARD');
      }

      // Fallback to rescue boat if waterborne and lifeguards unavailable
      if (!primaryRescue && isWaterborne) {
        primaryRescue = this.resourceManager.findBestSuitableResource('rescue', inc.location, 'RESCUE_BOAT');
      }

      if (primaryRescue) {
        this.resourceManager.setStatus(primaryRescue.id, 'DISPATCHED', inc.id, inc.location);
        inc.assignedResourceIds.push(primaryRescue.id);
        const eta = Math.round(
          Math.hypot(primaryRescue.position.x - inc.location.x, primaryRescue.position.y - inc.location.y) /
            primaryRescue.speed
        );
        this.dispatchManager.createDispatch(inc.id, primaryRescue.id, currentTime, eta);

        // For CRITICAL distress in water: Co-dispatch complementary rescue assets!
        // Dual-response doctrine: Rapid vessel intercept + swim stabilization
        if (isWaterborne && isCriticalOrOffshore) {
          if (primaryRescue.type === 'RESCUE_BOAT') {
            const secondaryLg = this.resourceManager.findBestSuitableResource('rescue', inc.location, 'LIFEGUARD');
            if (secondaryLg && !inc.assignedResourceIds.includes(secondaryLg.id)) {
              this.resourceManager.setStatus(secondaryLg.id, 'DISPATCHED', inc.id, inc.location);
              inc.assignedResourceIds.push(secondaryLg.id);
              const etaLg = Math.round(
                Math.hypot(secondaryLg.position.x - inc.location.x, secondaryLg.position.y - inc.location.y) /
                  secondaryLg.speed
              );
              this.dispatchManager.createDispatch(inc.id, secondaryLg.id, currentTime, etaLg, 'Co-dispatch swim support');
            }
          } else if (primaryRescue.type === 'LIFEGUARD') {
            const secondaryBoat = this.resourceManager.findBestSuitableResource('rescue', inc.location, 'RESCUE_BOAT');
            if (secondaryBoat && !inc.assignedResourceIds.includes(secondaryBoat.id)) {
              this.resourceManager.setStatus(secondaryBoat.id, 'DISPATCHED', inc.id, inc.location);
              inc.assignedResourceIds.push(secondaryBoat.id);
              const etaBoat = Math.round(
                Math.hypot(secondaryBoat.position.x - inc.location.x, secondaryBoat.position.y - inc.location.y) /
                  secondaryBoat.speed
              );
              this.dispatchManager.createDispatch(inc.id, secondaryBoat.id, currentTime, etaBoat, 'Co-dispatch rapid intercept');
            }
          }
        }
      } else {
        // Lifeguard/Boat conflict / resource exhaustion -> Escalate!
        inc.status = 'ESCALATED';
        this.analyticsCalculator.recordEscalation();
      }

      // 2. Dispatch UAV Drone for visual lock and flotation drop
      const drone = this.resourceManager.findBestSuitableResource('locate', inc.location, 'DRONE');
      if (drone) {
        this.resourceManager.setStatus(drone.id, 'DISPATCHED', inc.id, inc.location);
        inc.assignedResourceIds.push(drone.id);
        const eta = Math.round(Math.hypot(drone.position.x - inc.location.x, drone.position.y - inc.location.y) / drone.speed);
        this.dispatchManager.createDispatch(inc.id, drone.id, currentTime, eta, 'Aerial tracking & flotation drop');
      }
    } else if (inc.type === 'CROWD_EMERGENCY' || inc.type === 'RESTRICTED_ZONE') {
      // Police patrol unit
      const police = this.resourceManager.findBestSuitableResource('warn', inc.location, 'POLICE');
      if (police) {
        this.resourceManager.setStatus(police.id, 'DISPATCHED', inc.id, { x: inc.location.x, y: 55 });
        inc.assignedResourceIds.push(police.id);
      }
    }

    if (inc.assignedResourceIds.length > 0 && inc.status !== 'ESCALATED') {
      inc.status = 'RESOURCES_EN_ROUTE';
    }
  }

  public reset(): void {
    this.resourceManager.reset();
    this.dispatchManager.clear();
    this.emergencyIncidents.clear();
    this.analyticsCalculator.clear();
    this.boardStates = [];
  }
}
