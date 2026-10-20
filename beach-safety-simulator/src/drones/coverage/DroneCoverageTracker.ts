/**
 * DroneCoverageTracker.ts
 * 
 * TIDES Drone Phase 8: Observation-Based Coverage Tracker & Gap Analyzer
 * 
 * Strict Principle:
 * Coverage derives solely from valid, timestamped camera observations.
 * An assigned drone or FOV cone is NOT proof of observed coverage.
 * 
 * Responsibilities:
 * 1. Ingests valid camera observations and correlates with spatial zone boundaries.
 * 2. Updates last observation timestamp and observation count per zone.
 * 3. Detects overlapping coverage when multiple distinct drones observe the same zone.
 * 4. Audits observation staleness against each zone's required interval.
 * 5. Identifies coverage blind spots, degraded drones, and unserviced sectors.
 * 6. Generates standardized CoverageSummaryReport with explicitly defined denominator.
 */

import { CoastalZoneRegistry } from './CoastalZoneRegistry';
import { DroneRegistry } from '../foundation/DroneRegistry';
import { DroneCameraRegistry } from '../camera/DroneCameraRegistry';
import {
  CoastalCoverageStatus,
  CoastalSurveillanceZone,
  CoverageGap,
  CoverageSummaryReport,
} from './droneCoverage.types';

export interface IngestedObservationPayload {
  observationId: string;
  cameraId: string;
  droneId: string;
  timestampMs: number;
  scenePosition?: { x: number; y: number; z: number };
  confidence: number;
}

export class DroneCoverageTracker {
  private static instance: DroneCoverageTracker | null = null;

  private zoneRegistry: CoastalZoneRegistry;
  private droneRegistry: DroneRegistry;
  private cameraRegistry: DroneCameraRegistry;

  // Recent observations window per zone for overlap detection: zoneId -> Map<cameraId, timestampMs>
  private recentZoneObservations: Map<string, Map<string, number>> = new Map();

  // Deduplication cache for observations
  private processedObservationIds: Map<string, number> = new Map();

  public static getInstance(): DroneCoverageTracker {
    if (!DroneCoverageTracker.instance) {
      DroneCoverageTracker.instance = new DroneCoverageTracker();
    }
    return DroneCoverageTracker.instance;
  }

  constructor(
    zoneRegistry: CoastalZoneRegistry = CoastalZoneRegistry.getInstance(),
    droneRegistry: DroneRegistry = DroneRegistry.getInstance(),
    cameraRegistry: DroneCameraRegistry = DroneCameraRegistry.getInstance()
  ) {
    this.zoneRegistry = zoneRegistry;
    this.droneRegistry = droneRegistry;
    this.cameraRegistry = cameraRegistry;
  }

  public reset(): void {
    this.recentZoneObservations.clear();
    this.processedObservationIds.clear();
  }

  /**
   * Ingests a camera observation and maps it to intersecting coastal zones
   */
  public recordObservation(
    obs: IngestedObservationPayload,
    clockMs: number = Date.now()
  ): { matchedZones: string[]; status: 'RECORDED' | 'OUT_OF_BOUNDS' | 'DUPLICATE' | 'INVALID' } {
    if (!obs || !obs.observationId || !obs.scenePosition) {
      return { matchedZones: [], status: 'INVALID' };
    }

    const { x, z } = obs.scenePosition;
    if (isNaN(x) || isNaN(z)) {
      return { matchedZones: [], status: 'INVALID' };
    }

    // Deduplication check
    const lastSeen = this.processedObservationIds.get(obs.observationId);
    if (lastSeen !== undefined && (clockMs - lastSeen) < 15000) {
      return { matchedZones: [], status: 'DUPLICATE' };
    }
    this.processedObservationIds.set(obs.observationId, clockMs);

    // Find all coastal zones containing this observation coordinate
    const intersecting = this.zoneRegistry.findIntersectingZones({ x, z });
    if (intersecting.length === 0) {
      return { matchedZones: [], status: 'OUT_OF_BOUNDS' };
    }

    const matchedZoneIds: string[] = [];

    for (const zone of intersecting) {
      matchedZoneIds.push(zone.zoneId);

      // Track recent cameras observing this zone
      let cameraMap = this.recentZoneObservations.get(zone.zoneId);
      if (!cameraMap) {
        cameraMap = new Map();
        this.recentZoneObservations.set(zone.zoneId, cameraMap);
      }
      cameraMap.set(obs.cameraId, obs.timestampMs);

      // Prune observations older than the zone's required interval
      for (const [camId, time] of cameraMap.entries()) {
        if (clockMs - time > zone.requiredObservationIntervalMs) {
          cameraMap.delete(camId);
        }
      }

      // Check for overlapping multi-camera coverage
      const distinctActiveCameras = cameraMap.size;
      const coverageStatus: CoastalCoverageStatus =
        distinctActiveCameras >= 2 ? 'OVERLAPPING_COVERAGE' : 'COVERED';

      this.zoneRegistry.updateZoneStatus(zone.zoneId, coverageStatus, {
        timestampMs: obs.timestampMs,
        coords: { ...obs.scenePosition },
        cameraId: obs.cameraId,
      });
    }

    return { matchedZones: matchedZoneIds, status: 'RECORDED' };
  }

  /**
   * Periodic evaluation of coverage freshness and drone operational status
   */
  public evaluateCoverageHealth(clockMs: number = Date.now()): void {
    const zones = this.zoneRegistry.getAllZones();

    for (const zone of zones) {
      // 1. Unassigned Zone
      if (zone.assignedDroneIds.length === 0) {
        this.zoneRegistry.updateZoneStatus(zone.zoneId, 'UNASSIGNED');
        continue;
      }

      // Check assigned drone health
      const primaryDroneId = zone.assignedDroneIds[0];
      const drone = this.droneRegistry.getDrone(primaryDroneId);

      if (!drone || drone.connectivity === 'DISCONNECTED' || drone.status === 'OFFLINE' || drone.isStale) {
        this.zoneRegistry.updateZoneStatus(zone.zoneId, 'COVERAGE_DEGRADED');
        continue;
      }

      // Check camera health
      const camera = this.cameraRegistry.getCameraForDrone(primaryDroneId);
      if (camera && (camera.status === 'FAULTED' || camera.status === 'DISCONNECTED')) {
        this.zoneRegistry.updateZoneStatus(zone.zoneId, 'COVERAGE_DEGRADED');
        continue;
      }

      // 2. Uncovered: Drone assigned, but 0 observations received
      if (!zone.lastValidObservationTimestampMs) {
        this.zoneRegistry.updateZoneStatus(zone.zoneId, 'UNCOVERED');
        continue;
      }

      // 3. Stale Coverage: Observation age exceeds required interval
      const observationAgeMs = clockMs - zone.lastValidObservationTimestampMs;
      if (observationAgeMs > zone.requiredObservationIntervalMs) {
        this.zoneRegistry.updateZoneStatus(zone.zoneId, 'STALE_COVERAGE');
        continue;
      }

      // 4. Overlapping vs Single Coverage
      const cameraMap = this.recentZoneObservations.get(zone.zoneId);
      if (cameraMap && cameraMap.size >= 2) {
        this.zoneRegistry.updateZoneStatus(zone.zoneId, 'OVERLAPPING_COVERAGE');
      } else {
        this.zoneRegistry.updateZoneStatus(zone.zoneId, 'COVERED');
      }
    }
  }

  /**
   * Identifies coverage blind spots and gaps
   */
  public identifyCoverageGaps(clockMs: number = Date.now()): CoverageGap[] {
    this.evaluateCoverageHealth(clockMs);
    const zones = this.zoneRegistry.getAllZones();
    const gaps: CoverageGap[] = [];
    let gapCounter = 1;

    for (const zone of zones) {
      if (zone.coverageStatus === 'UNASSIGNED') {
        gaps.push({
          gapId: `GAP-${gapCounter++}`,
          zoneId: zone.zoneId,
          zoneName: zone.name,
          priority: zone.priority,
          gapType: 'UNASSIGNED_ZONE',
          description: `No surveillance drone assigned to monitor ${zone.name}.`,
          severity: zone.priority === 'CRITICAL' || zone.priority === 'HIGH' ? 'CRITICAL' : 'WARNING',
          recommendedAction: `Allocate eligible surveillance drone to patrol route ${zone.compatibleRouteId}.`,
        });
      } else if (zone.coverageStatus === 'UNCOVERED') {
        gaps.push({
          gapId: `GAP-${gapCounter++}`,
          zoneId: zone.zoneId,
          zoneName: zone.name,
          priority: zone.priority,
          gapType: 'UNOBSERVED_PATROL',
          description: `Drone assigned (${zone.assignedDroneIds.join(', ')}) but 0 confirmed observations received.`,
          severity: 'WARNING',
          assignedDroneId: zone.assignedDroneIds[0],
          recommendedAction: 'Awaiting patrol route traversal to acquire initial observation evidence.',
        });
      } else if (zone.coverageStatus === 'STALE_COVERAGE') {
        const lagSec = zone.lastValidObservationTimestampMs
          ? (clockMs - zone.lastValidObservationTimestampMs) / 1000
          : 0;
        gaps.push({
          gapId: `GAP-${gapCounter++}`,
          zoneId: zone.zoneId,
          zoneName: zone.name,
          priority: zone.priority,
          gapType: 'STALE_OBSERVATIONS',
          description: `Observation evidence is stale (${lagSec.toFixed(1)}s age > ${(zone.requiredObservationIntervalMs / 1000).toFixed(0)}s interval).`,
          severity: zone.priority === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
          observationLagSeconds: lagSec,
          assignedDroneId: zone.assignedDroneIds[0],
          recommendedAction: 'Verify drone waypoint progress or increase patrol speed.',
        });
      } else if (zone.coverageStatus === 'COVERAGE_DEGRADED') {
        gaps.push({
          gapId: `GAP-${gapCounter++}`,
          zoneId: zone.zoneId,
          zoneName: zone.name,
          priority: zone.priority,
          gapType: 'DEGRADED_DRONE',
          description: `Assigned drone (${zone.assignedDroneIds.join(', ')}) telemetry is degraded, disconnected, or camera faulted.`,
          severity: 'CRITICAL',
          assignedDroneId: zone.assignedDroneIds[0],
          recommendedAction: 'Recall degraded drone to base pad and reassign reserve unit.',
        });
      }
    }

    return gaps;
  }

  /**
   * Generates a formal Coverage Summary Report with explicitly defined denominator
   */
  public generateSummaryReport(clockMs: number = Date.now()): CoverageSummaryReport {
    this.evaluateCoverageHealth(clockMs);
    const zones = this.zoneRegistry.getAllZones();
    const gaps = this.identifyCoverageGaps(clockMs);

    const totalConfiguredZones = zones.length;
    let coveredZonesCount = 0;
    let staleZonesCount = 0;
    let uncoveredZonesCount = 0;
    let unassignedZonesCount = 0;
    let degradedZonesCount = 0;
    let overlappingZonesCount = 0;

    const activePatrolDrones = new Set<string>();

    for (const z of zones) {
      if (z.coverageStatus === 'COVERED' || z.coverageStatus === 'OVERLAPPING_COVERAGE') {
        coveredZonesCount++;
      }
      if (z.coverageStatus === 'OVERLAPPING_COVERAGE') {
        overlappingZonesCount++;
      }
      if (z.coverageStatus === 'STALE_COVERAGE') {
        staleZonesCount++;
      }
      if (z.coverageStatus === 'UNCOVERED') {
        uncoveredZonesCount++;
      }
      if (z.coverageStatus === 'UNASSIGNED') {
        unassignedZonesCount++;
      }
      if (z.coverageStatus === 'COVERAGE_DEGRADED') {
        degradedZonesCount++;
      }
      z.assignedDroneIds.forEach((id) => activePatrolDrones.add(id));
    }

    const coveragePercentage = totalConfiguredZones > 0
      ? parseFloat(((coveredZonesCount / totalConfiguredZones) * 100).toFixed(1))
      : 0.0;

    return {
      reportId: `COV-REP-${Math.floor(1000 + Math.random() * 9000)}`,
      generatedAtMs: clockMs,
      totalConfiguredZones,
      coveredZonesCount,
      staleZonesCount,
      uncoveredZonesCount,
      unassignedZonesCount,
      degradedZonesCount,
      overlappingZonesCount,
      activePatrolDronesCount: activePatrolDrones.size,
      coveragePercentage,
      blindSpots: gaps,
      zones: [...zones],
    };
  }

  public getCoverageSummaryReport(clockMs: number = Date.now()): CoverageSummaryReport {
    return this.generateSummaryReport(clockMs);
  }
}
