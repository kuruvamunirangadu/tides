import { DroneCameraRegistry } from '../camera/DroneCameraRegistry';
import { DroneRegistry } from '../foundation/DroneRegistry';
import { DroneMissionManager } from '../missions/DroneMissionManager';
import { CoastalZoneRegistry } from './CoastalZoneRegistry';
import { DroneCoverageAllocator } from './DroneCoverageAllocator';
import { DroneCoverageTracker } from './DroneCoverageTracker';
import { CoverageGap, CoastalSurveillanceZone, PatrolAllocationPlan } from './droneCoverage.types';

export interface SurveillanceRegionStatus {
  zone: CoastalSurveillanceZone;
  coverage: CoastalSurveillanceZone['coverageStatus'];
  sensorIds: string[];
  riskContext: 'ELEVATED' | 'NORMAL' | 'UNAVAILABLE';
  explanation: string;
}

export interface SurveillanceSnapshot {
  regions: SurveillanceRegionStatus[];
  gaps: CoverageGap[];
  patrolPlan: PatrolAllocationPlan;
  activeCameras: number;
  unavailableCameras: number;
  simulatedDataNotice: string;
}

export class IntelligentSurveillanceService {
  private readonly zoneRegistry: CoastalZoneRegistry;
  private readonly tracker: DroneCoverageTracker;
  private readonly allocator: DroneCoverageAllocator;
  private readonly cameraRegistry: DroneCameraRegistry;
  private readonly droneRegistry: DroneRegistry;
  private readonly missionManager: DroneMissionManager;

  public constructor(
    zoneRegistry: CoastalZoneRegistry = CoastalZoneRegistry.getInstance(),
    tracker: DroneCoverageTracker = DroneCoverageTracker.getInstance(),
    allocator: DroneCoverageAllocator = DroneCoverageAllocator.getInstance(),
    cameraRegistry: DroneCameraRegistry = DroneCameraRegistry.getInstance(),
    droneRegistry: DroneRegistry = DroneRegistry.getInstance(),
    missionManager: DroneMissionManager = DroneMissionManager.getInstance()
  ) {
    this.zoneRegistry = zoneRegistry;
    this.tracker = tracker;
    this.allocator = allocator;
    this.cameraRegistry = cameraRegistry;
    this.droneRegistry = droneRegistry;
    this.missionManager = missionManager;
  }

  public getSnapshot(clockMs: number = Date.now()): SurveillanceSnapshot {
    const gaps = this.tracker.identifyCoverageGaps(clockMs);
    const gapIds = new Set(gaps.map((gap) => gap.zoneId));
    const regions = this.zoneRegistry.getAllZones().map((zone) => {
      const sensorIds = zone.assignedDroneIds
        .map((droneId) => this.cameraRegistry.getCameraByDroneId(droneId)?.cameraId)
        .filter((cameraId): cameraId is string => Boolean(cameraId));
      const hasGap = gapIds.has(zone.zoneId);
      const riskContext: SurveillanceRegionStatus['riskContext'] = zone.priority === 'CRITICAL' || zone.priority === 'HIGH'
        ? 'ELEVATED'
        : zone.priority === 'LOW' ? 'NORMAL' : 'UNAVAILABLE';
      return {
        zone,
        coverage: zone.coverageStatus,
        sensorIds,
        riskContext,
        explanation: hasGap
          ? `Coverage gap: ${gaps.find((gap) => gap.zoneId === zone.zoneId)?.description}`
          : 'Fresh modeled surveillance evidence is available for this sector.',
      };
    });
    const cameras = this.cameraRegistry.getAllCameras();
    return {
      regions,
      gaps,
      patrolPlan: this.allocator.generateAllocationPlan(clockMs),
      activeCameras: cameras.filter((camera) => camera.status === 'ACTIVE').length,
      unavailableCameras: cameras.filter((camera) => camera.status !== 'ACTIVE').length,
      simulatedDataNotice: 'Coverage is modeled from simulated scene-space telemetry and valid observations; it is not proof of real-world detection.',
    };
  }

  public confirmPatrol(zoneId: string, droneId: string, clockMs: number = Date.now()): { success: boolean; message: string } {
    const drone = this.droneRegistry.getDrone(droneId);
    const zone = this.zoneRegistry.getZone(zoneId);
    if (!drone || !zone) return { success: false, message: 'Unknown drone or surveillance zone.' };
    if (this.missionManager.getDroneActiveMission(droneId)) {
      return { success: false, message: `Patrol rejected: ${drone.callsign} already has an active mission.` };
    }
    const plan = this.allocator.generateAllocationPlan(clockMs);
    const allocation = plan.allocations.find((item) => item.zoneId === zoneId && item.droneId === droneId);
    if (!allocation || allocation.status === 'REJECTED') {
      return { success: false, message: plan.rejectionReasons[`${zoneId}:${droneId}`] || 'Drone is not eligible for this patrol.' };
    }
    return { success: false, message: 'Patrol recommendation is ready; confirmation must use DroneMissionManager authorization.' };
  }
}