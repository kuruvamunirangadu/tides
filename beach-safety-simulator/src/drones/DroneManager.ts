import { VirtualDrone } from './simulation/VirtualDrone';
import { DroneType, DroneCapability } from './models/Drone';
import { MissionManager } from './missions/MissionManager';
import { DroneAllocator } from './allocation/DroneAllocator';
import { DroneVisionEngine, DroneDetectionTrack } from './vision/DroneVisionEngine';
import { DroneAnalyticsEngine, DronePerformanceMetrics } from './analytics/DroneAnalytics';
import { DroneMission, PatrolRoute } from './models/DroneMission';
import { UnifiedSafetyEvent } from './models/UnifiedSafetyEvent';
import { DroneCoverage } from './models/DroneCoverage';
import { DroneTelemetry } from './models/DroneTelemetry';
import { Visitor } from '../models/Visitor';
import { CVSafetyEvent } from '../vision/models/CVSafetyEvent';

export interface DroneManagerState {
  drones: VirtualDrone[];
  telemetries: DroneTelemetry[];
  activeMissions: DroneMission[];
  patrolRoutes: PatrolRoute[];
  coverages: DroneCoverage[];
  detectionTracks: DroneDetectionTrack[];
  unifiedEvents: UnifiedSafetyEvent[];
  metrics: DronePerformanceMetrics;
}

export class DroneManager {
  private drones: VirtualDrone[] = [];
  private missionManager: MissionManager;
  private visionEngine: DroneVisionEngine;
  private analyticsEngine: DroneAnalyticsEngine;

  private latestCoverages: DroneCoverage[] = [];
  private latestTracks: DroneDetectionTrack[] = [];
  private latestUnifiedEvents: UnifiedSafetyEvent[] = [];

  constructor() {
    this.missionManager = new MissionManager();
    this.visionEngine = new DroneVisionEngine();
    this.analyticsEngine = new DroneAnalyticsEngine();

    this.initializeDroneFleet();
  }

  private initializeDroneFleet(): void {
    // 1. DRONE-01: Rapid Interceptor Quadcopter
    const d1 = new VirtualDrone(
      'UAV-01',
      'RK-Falcon Rapid Interceptor',
      DroneType.RAPID_INTERCEPTOR,
      { x: 180, y: 80 },
      { latitude: 17.7120, longitude: 83.3160 },
      'LS-01',
      [
        DroneCapability.SURVEILLANCE,
        DroneCapability.PERSON_DETECTION,
        DroneCapability.TRACKING,
        DroneCapability.DISTRESS_DETECTION,
        DroneCapability.LIVE_VIDEO,
        DroneCapability.GPS,
      ]
    );

    // 2. DRONE-02: Long-Range Hexacopter
    const d2 = new VirtualDrone(
      'UAV-02',
      'Vizag-Sentinel Hexacopter',
      DroneType.LONG_RANGE_HEX,
      { x: 450, y: 70 },
      { latitude: 17.7130, longitude: 83.3190 },
      'LS-02',
      [
        DroneCapability.SURVEILLANCE,
        DroneCapability.PERSON_DETECTION,
        DroneCapability.TRACKING,
        DroneCapability.DISTRESS_DETECTION,
        DroneCapability.HIGH_RISK_MONITORING,
        DroneCapability.SEARCH,
        DroneCapability.LIVE_VIDEO,
        DroneCapability.GPS,
      ]
    );

    // 3. DRONE-03: Heavy Lifter Rescue UAV
    const d3 = new VirtualDrone(
      'UAV-03',
      'AquaLifter Rescue Heavy UAV',
      DroneType.HEAVY_LIFTER_RESCUE,
      { x: 720, y: 80 },
      { latitude: 17.7140, longitude: 83.3220 },
      'LS-03',
      [
        DroneCapability.SURVEILLANCE,
        DroneCapability.PERSON_DETECTION,
        DroneCapability.RESCUE_ASSISTANCE,
        DroneCapability.TRACKING,
        DroneCapability.LIVE_VIDEO,
        DroneCapability.GPS,
      ]
    );

    // 4. DRONE-04: Standby Reserve Quadcopter
    const d4 = new VirtualDrone(
      'UAV-04',
      'SkyPatrol Reserve Quad',
      DroneType.SURVEILLANCE_QUAD,
      { x: 750, y: 80 },
      { latitude: 17.7142, longitude: 83.3225 },
      'LS-03',
      [
        DroneCapability.SURVEILLANCE,
        DroneCapability.PERSON_DETECTION,
        DroneCapability.CROWD_MONITORING,
        DroneCapability.LIVE_VIDEO,
        DroneCapability.GPS,
      ]
    );

    this.drones = [d1, d2, d3, d4];
  }

  public getDrones(): VirtualDrone[] {
    return this.drones;
  }

  public getDrone(droneId: string): VirtualDrone | undefined {
    return this.drones.find((d) => d.id === droneId);
  }

  public getMissionManager(): MissionManager {
    return this.missionManager;
  }

  public getAnalyticsEngine(): DroneAnalyticsEngine {
    return this.analyticsEngine;
  }

  public dispatchPatrol(droneId: string, routeId: string, currentTime: number, timeDisplay: string): boolean {
    const drone = this.getDrone(droneId);
    if (!drone || drone.batteryLevel < 30 || (drone.status !== 'AVAILABLE' && drone.status !== 'CHARGING')) {
      return false;
    }
    const mission = this.missionManager.createPatrolMission(droneId, routeId, currentTime, timeDisplay);
    drone.assignMission(mission);
    return true;
  }

  public dispatchDistressVerification(
    visitorId: string,
    targetCanvasPos: { x: number; y: number },
    currentTime: number,
    timeDisplay: string,
    incidentId?: string
  ): boolean {
    // Select best available drone via intelligent allocator
    const drone = DroneAllocator.selectBestDrone(
      this.drones,
      targetCanvasPos,
      DroneCapability.DISTRESS_DETECTION,
      1 // Priority 1
    );

    if (!drone) return false;

    const mission = this.missionManager.createDistressVerificationMission(
      drone.id,
      targetCanvasPos,
      visitorId,
      currentTime,
      timeDisplay,
      incidentId
    );
    drone.assignMission(mission);
    return true;
  }

  public dispatchHighRiskMonitoring(
    zoneId: string,
    targetCanvasPos: { x: number; y: number },
    currentTime: number,
    timeDisplay: string
  ): boolean {
    const drone = DroneAllocator.selectBestDrone(
      this.drones,
      targetCanvasPos,
      DroneCapability.HIGH_RISK_MONITORING,
      2 // Priority 2
    );

    if (!drone) return false;

    const mission = this.missionManager.createHighRiskMonitoringMission(
      drone.id,
      targetCanvasPos,
      zoneId,
      currentTime,
      timeDisplay
    );
    drone.assignMission(mission);
    return true;
  }

  public abortToReturn(droneId: string): void {
    const drone = this.getDrone(droneId);
    if (drone) {
      drone.abortToReturn();
    }
  }

  public toggleCameraPower(droneId: string): void {
    const drone = this.getDrone(droneId);
    if (drone) {
      drone.camera.status = drone.camera.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
    }
  }

  public tick(
    visitors: Visitor[],
    cctvEvents: CVSafetyEvent[],
    currentTime: number,
    timeDisplay: string,
    deltaTimeSec: number
  ): DroneManagerState {
    // 1. Tick all drones
    for (const drone of this.drones) {
      const prevPos = { ...drone.canvasPosition };
      drone.tick(deltaTimeSec, currentTime, timeDisplay);
      const distTraveled = Math.hypot(drone.canvasPosition.x - prevPos.x, drone.canvasPosition.y - prevPos.y);
      if (distTraveled > 0) {
        this.analyticsEngine.recordFlightStep(distTraveled, deltaTimeSec);
      }
    }

    // 2. Aerial Vision & Detection Fusion Cycle
    const { tracks, safetyEvents, coverages } = this.visionEngine.tick(
      this.drones,
      visitors,
      cctvEvents,
      currentTime,
      timeDisplay
    );

    this.latestTracks = tracks;
    this.latestUnifiedEvents = safetyEvents;
    this.latestCoverages = coverages;

    this.analyticsEngine.recordDetections(tracks.length);
    safetyEvents.forEach((ev) => this.analyticsEngine.recordVerifiedEvent(ev));

    const telemetries = this.drones.map((d) => d.getTelemetry(currentTime, timeDisplay));

    return {
      drones: this.drones,
      telemetries,
      activeMissions: this.missionManager.getActiveMissions(),
      patrolRoutes: this.missionManager.getPatrolRoutes(),
      coverages: this.latestCoverages,
      detectionTracks: this.latestTracks,
      unifiedEvents: this.latestUnifiedEvents,
      metrics: this.analyticsEngine.getMetrics(),
    };
  }
}
