import { DroneMission, PatrolRoute, MissionType } from '../models/DroneMission';
import { GeoPoint } from '../../gis/models/GeoPoint';

export class MissionManager {
  private activeMissions: Map<string, DroneMission> = new Map();
  private missionHistory: DroneMission[] = [];
  private patrolRoutes: PatrolRoute[] = [];

  constructor() {
    this.initializeDefaultPatrolRoutes();
  }

  private initializeDefaultPatrolRoutes(): void {
    this.patrolRoutes = [
      {
        id: 'ROUTE-SZ-COASTAL',
        name: 'Zone A & Swimming Zone Coastal Sweep',
        waypoints: [
          { x: 120, y: 220, altitude: 35 },
          { x: 300, y: 240, altitude: 35 },
          { x: 500, y: 250, altitude: 35 },
          { x: 300, y: 200, altitude: 30 },
        ],
        altitude: 35,
        speed: 10,
        zones: ['SZ-01', 'SZ-02'],
        enabled: true,
      },
      {
        id: 'ROUTE-RESTRICTED-ROCKS',
        name: 'Restricted Rocky Shoal Intercept Sweep',
        waypoints: [
          { x: 550, y: 230, altitude: 40 },
          { x: 700, y: 250, altitude: 40 },
          { x: 650, y: 320, altitude: 35 },
          { x: 520, y: 280, altitude: 35 },
        ],
        altitude: 40,
        speed: 12,
        zones: ['RZ-01'],
        enabled: true,
      },
      {
        id: 'ROUTE-DEEP-WATER-PERIMETER',
        name: 'Offshore Rip Current Boundary Watch',
        waypoints: [
          { x: 100, y: 350, altitude: 45 },
          { x: 400, y: 380, altitude: 45 },
          { x: 750, y: 360, altitude: 45 },
          { x: 400, y: 320, altitude: 40 },
        ],
        altitude: 45,
        speed: 14,
        zones: ['SZ-01', 'SZ-02', 'RZ-01'],
        enabled: true,
      },
    ];
  }

  public getPatrolRoutes(): PatrolRoute[] {
    return this.patrolRoutes;
  }

  public getActiveMissions(): DroneMission[] {
    return Array.from(this.activeMissions.values());
  }

  public getMissionHistory(): DroneMission[] {
    return this.missionHistory;
  }

  public createPatrolMission(droneId: string, routeId: string, currentTime: number, timeDisplay: string): DroneMission {
    const route = this.patrolRoutes.find((r) => r.id === routeId) || this.patrolRoutes[0];
    const mission: DroneMission = {
      id: `MSN-${Date.now().toString().slice(-5)}`,
      droneId,
      type: 'PATROL',
      priority: 3,
      startTime: currentTime,
      timeDisplay,
      status: 'ASSIGNED',
      waypoints: route.waypoints.map((w) => ({ ...w })),
      currentWaypointIndex: 0,
      progressPercent: 0,
      notes: `Autonomous Patrol: ${route.name}`,
    };
    this.activeMissions.set(mission.id, mission);
    return mission;
  }

  public createDistressVerificationMission(
    droneId: string,
    targetCanvasPos: { x: number; y: number },
    targetVisitorId: string,
    currentTime: number,
    timeDisplay: string,
    targetIncidentId?: string
  ): DroneMission {
    const mission: DroneMission = {
      id: `MSN-VERIFY-${Date.now().toString().slice(-4)}`,
      droneId,
      type: 'VERIFY_DISTRESS',
      priority: 1, // Highest priority
      startTime: currentTime,
      timeDisplay,
      targetCanvasPos,
      targetVisitorId,
      targetIncidentId,
      status: 'ASSIGNED',
      progressPercent: 0,
      notes: `Urgent Aerial Verification of suspected swimmer distress (${targetVisitorId})`,
    };
    this.activeMissions.set(mission.id, mission);
    return mission;
  }

  public createHighRiskMonitoringMission(
    droneId: string,
    targetCanvasPos: { x: number; y: number },
    zoneId: string,
    currentTime: number,
    timeDisplay: string
  ): DroneMission {
    const mission: DroneMission = {
      id: `MSN-HR-${Date.now().toString().slice(-4)}`,
      droneId,
      type: 'HIGH_RISK_MONITORING',
      priority: 2,
      startTime: currentTime,
      timeDisplay,
      targetCanvasPos,
      targetZoneId: zoneId,
      status: 'ASSIGNED',
      progressPercent: 0,
      notes: `Pre-positioned Aerial Observation for High-Risk Zone ${zoneId}`,
    };
    this.activeMissions.set(mission.id, mission);
    return mission;
  }

  public completeMission(missionId: string): void {
    const mission = this.activeMissions.get(missionId);
    if (mission) {
      mission.status = 'COMPLETED';
      mission.progressPercent = 100;
      this.missionHistory.push({ ...mission });
      this.activeMissions.delete(missionId);
    }
  }

  public cancelMission(missionId: string): void {
    const mission = this.activeMissions.get(missionId);
    if (mission) {
      mission.status = 'CANCELLED';
      this.missionHistory.push({ ...mission });
      this.activeMissions.delete(missionId);
    }
  }
}
