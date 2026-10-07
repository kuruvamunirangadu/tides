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
   * Conflict-free multi-resource allocation based on incident capabilities
   */
  private allocateResourcesForIncident(inc: EmergencyIncident, currentTime: number): void {
    inc.status = 'DISPATCHING';
    inc.dispatchedAt = currentTime;

    // 1. Swimmer in distress in deep water (y > 300) -> Check Rescue Boat or Lifeguard
    if (inc.type === 'SWIMMER_DISTRESS' || inc.type === 'DROWNING_RISK') {
      let primaryRescue: EmergencyResource | undefined;

      if (inc.location.y > 330) {
        // Deep water: Prefer rapid rescue boat
        primaryRescue = this.resourceManager.findBestSuitableResource('rescue', inc.location, 'RESCUE_BOAT');
      }

      if (!primaryRescue) {
        // Lifeguard rescue
        primaryRescue = this.resourceManager.findBestSuitableResource('rescue', inc.location, 'LIFEGUARD');
      }

      if (primaryRescue) {
        this.resourceManager.setStatus(primaryRescue.id, 'DISPATCHED', inc.id, inc.location);
        inc.assignedResourceIds.push(primaryRescue.id);
        const eta = Math.round(Math.hypot(primaryRescue.position.x - inc.location.x, primaryRescue.position.y - inc.location.y) / primaryRescue.speed);
        this.dispatchManager.createDispatch(inc.id, primaryRescue.id, currentTime, eta);
      } else {
        // Lifeguard conflict / resource exhaustion -> Escalate!
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
