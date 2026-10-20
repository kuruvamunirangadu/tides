/**
 * DroneCoverageAllocator.ts
 * 
 * TIDES Drone Phase 8: Multi-Drone Patrol Allocation Service
 * 
 * Responsibilities:
 * 1. Evaluates registered drone capabilities and availability.
 * 2. Matches available surveillance drones to configured coastal zones by priority.
 * 3. Enforces safety constraints: never overrides rescue missions or assigns low-battery drones.
 * 4. Coordinates patrol mission execution through authoritative DroneMissionManager.
 * 5. Prevents double-booking and conflicting assignments.
 * 6. Generates auditable allocation plans with explicit rationale and rejection logs.
 */

import { DroneRegistry } from '../foundation/DroneRegistry';
import { DroneMissionManager } from '../missions/DroneMissionManager';
import { DroneRecord } from '../foundation/drone.types';
import { CoastalZoneRegistry } from './CoastalZoneRegistry';
import {
  CoastalSurveillanceZone,
  PatrolAllocationPlan,
  ZoneDroneAllocation,
} from './droneCoverage.types';

export class DroneCoverageAllocator {
  private static instance: DroneCoverageAllocator | null = null;

  private zoneRegistry: CoastalZoneRegistry;
  private droneRegistry: DroneRegistry;
  private missionManager: DroneMissionManager;

  public static getInstance(): DroneCoverageAllocator {
    if (!DroneCoverageAllocator.instance) {
      DroneCoverageAllocator.instance = new DroneCoverageAllocator();
    }
    return DroneCoverageAllocator.instance;
  }

  constructor(
    zoneRegistry: CoastalZoneRegistry = CoastalZoneRegistry.getInstance(),
    droneRegistry: DroneRegistry = DroneRegistry.getInstance(),
    missionManager: DroneMissionManager = DroneMissionManager.getInstance()
  ) {
    this.zoneRegistry = zoneRegistry;
    this.droneRegistry = droneRegistry;
    this.missionManager = missionManager;
  }

  /**
   * Assesses fleet availability and filters for drones eligible for surveillance patrol
   */
  public getEligibleSurveillanceDrones(
    clockMs: number = Date.now()
  ): { eligible: DroneRecord[]; ineligible: { drone: DroneRecord; reason: string }[] } {
    const allDrones = this.droneRegistry.getAllDrones();
    const eligible: DroneRecord[] = [];
    const ineligible: { drone: DroneRecord; reason: string }[] = [];

    for (const drone of allDrones) {
      // 1. Role Check: Strictly preserve dedicated rescue assistance drones (DRONE-02)
      if (drone.role === 'RESCUE_ASSISTANCE') {
        ineligible.push({
          drone,
          reason: `Preserved for Emergency Rescue: Role '${drone.role}' is dedicated to flotation aid drops.`,
        });
        continue;
      }

      // 2. Connectivity & Telemetry Freshness (< 15s)
      if (drone.connectivity !== 'CONNECTED') {
        ineligible.push({ drone, reason: `Link connectivity is ${drone.connectivity}.` });
        continue;
      }
      const telemAge = (clockMs - drone.lastReceivedTimeMs) / 1000;
      if (telemAge > 15.0) {
        ineligible.push({ drone, reason: `Telemetry is stale (${telemAge.toFixed(1)}s > 15s threshold).` });
        continue;
      }

      // 3. Battery Reserve (> 25% dispatch threshold)
      if (drone.battery.percentage <= 25.0) {
        ineligible.push({
          drone,
          reason: `Insufficient battery: ${drone.battery.percentage.toFixed(0)}% <= 25% dispatch reserve.`,
        });
        continue;
      }

      // 4. Operational Status & Conflict Check
      if (
        drone.status === 'OFFLINE' ||
        drone.status === 'MAINTENANCE' ||
        drone.status === 'RETURNING' ||
        drone.status === 'CHARGING'
      ) {
        ineligible.push({ drone, reason: `Operational status is ${drone.status}.` });
        continue;
      }

      // Check if already assigned to an emergency rescue mission
      const activeMission = this.missionManager.getDroneActiveMission(drone.droneId);
      if (activeMission && activeMission.type === 'RESCUE_ASSISTANCE') {
        ineligible.push({
          drone,
          reason: `Drone locked to active emergency rescue mission ${activeMission.missionId}.`,
        });
        continue;
      }

      eligible.push(drone);
    }

    return { eligible, ineligible };
  }

  /**
   * Generates a deterministic patrol allocation plan based on zone priorities
   */
  public generateAllocationPlan(clockMs: number = Date.now()): PatrolAllocationPlan {
    const { eligible, ineligible } = this.getEligibleSurveillanceDrones(clockMs);
    const zones = this.zoneRegistry.getAllZones();

    // Priority sort: CRITICAL (0) -> HIGH (1) -> MEDIUM (2) -> LOW (3)
    const priorityWeight: Record<string, number> = {
      CRITICAL: 0,
      HIGH: 1,
      MEDIUM: 2,
      LOW: 3,
    };
    const sortedZones = [...zones].sort(
      (a, b) => (priorityWeight[a.priority] ?? 99) - (priorityWeight[b.priority] ?? 99)
    );

    const allocations: ZoneDroneAllocation[] = [];
    const assignedDroneIds = new Set<string>();
    const unassignedZoneIds: string[] = [];
    const rejectionReasons: Record<string, string> = {};

    // 1. Maintain existing healthy patrols to avoid unnecessary churn
    for (const zone of sortedZones) {
      if (zone.assignedDroneIds.length > 0) {
        const currentDroneId = zone.assignedDroneIds[0];
        const isStillEligible = eligible.some((d) => d.droneId === currentDroneId);
        const activeMission = this.missionManager.getDroneActiveMission(currentDroneId);

        if (isStillEligible && activeMission && activeMission.status === 'ACTIVE') {
          allocations.push({
            zoneId: zone.zoneId,
            droneId: currentDroneId,
            routeId: zone.compatibleRouteId,
            missionId: activeMission.missionId,
            allocationReason: `Maintaining existing active patrol on ${zone.name}.`,
            status: 'COMMITTED',
          });
          assignedDroneIds.add(currentDroneId);
        }
      }
    }

    // 2. Allocate remaining eligible drones to unserviced zones by priority
    const availableDrones = eligible.filter((d) => !assignedDroneIds.has(d.droneId));

    for (const zone of sortedZones) {
      // Check if already covered by an existing maintained patrol
      if (allocations.some((a) => a.zoneId === zone.zoneId && a.status === 'COMMITTED')) {
        continue;
      }

      // Find compatible candidate drone
      let candidateDrone: DroneRecord | undefined;
      let candidateIndex = -1;

      for (let i = 0; i < availableDrones.length; i++) {
        const drone = availableDrones[i];
        // Capability check (e.g. optical zoom requirement)
        if (zone.requiredCapabilities.requiresOpticalZoom && !drone.capabilities.hasOpticalZoom) {
          rejectionReasons[`${zone.zoneId}:${drone.droneId}`] = `Lacks required optical zoom for deep offshore observation.`;
          continue;
        }
        if (zone.requiredCapabilities.requiresThermalCamera && !drone.capabilities.hasThermalCamera) {
          rejectionReasons[`${zone.zoneId}:${drone.droneId}`] = `Lacks required thermal sensor for low-light observation.`;
          continue;
        }

        candidateDrone = drone;
        candidateIndex = i;
        break;
      }

      if (candidateDrone && candidateIndex >= 0) {
        allocations.push({
          zoneId: zone.zoneId,
          droneId: candidateDrone.droneId,
          routeId: zone.compatibleRouteId,
          allocationReason: `Assigned eligible ${candidateDrone.callsign} (${candidateDrone.role}) to high-priority zone ${zone.name}.`,
          status: 'PROPOSED',
        });
        assignedDroneIds.add(candidateDrone.droneId);
        availableDrones.splice(candidateIndex, 1);
      } else {
        unassignedZoneIds.push(zone.zoneId);
        rejectionReasons[zone.zoneId] = `No eligible surveillance drone available matching required capabilities.`;
      }
    }

    const idleDroneIds = availableDrones.map((d) => d.droneId);
    const ineligibleDroneIds = ineligible.map((i) => i.drone.droneId);
    ineligible.forEach((i) => {
      rejectionReasons[i.drone.droneId] = i.reason;
    });

    return {
      planId: `PLAN-${Math.floor(1000 + Math.random() * 9000)}`,
      timestampMs: clockMs,
      allocations,
      unassignedZoneIds,
      idleDroneIds,
      ineligibleDroneIds,
      rejectionReasons,
    };
  }

  /**
   * Commits and executes an allocation plan by submitting missions through DroneMissionManager
   */
  public commitAllocationPlan(plan: PatrolAllocationPlan, clockMs: number = Date.now()): boolean {
    let anyFailed = false;

    for (const alloc of plan.allocations) {
      if (alloc.status === 'COMMITTED') continue; // Already active

      const zone = this.zoneRegistry.getZone(alloc.zoneId);
      if (!zone) {
        alloc.status = 'REJECTED';
        alloc.rejectionReason = `Zone ${alloc.zoneId} not found in registry.`;
        anyFailed = true;
        continue;
      }

      // Check if drone currently has an active mission that needs release
      const existingMission = this.missionManager.getDroneActiveMission(alloc.droneId);
      if (existingMission) {
        if (existingMission.routeId === alloc.routeId && existingMission.status === 'ACTIVE') {
          alloc.status = 'COMMITTED';
          alloc.missionId = existingMission.missionId;
          this.zoneRegistry.setZoneDroneAssignment(zone.zoneId, [alloc.droneId], existingMission.missionId);
          continue;
        }
        // Cancel non-rescue mission to reassign
        this.missionManager.cancelMission(existingMission.missionId, 'Reassigned to higher priority patrol', clockMs);
      }

      // Create new patrol mission through authoritative DroneMissionManager
      const createRes = this.missionManager.createMission(
        {
          type: 'PATROL',
          droneId: alloc.droneId,
          routeId: alloc.routeId,
        },
        clockMs
      );

      if (!createRes.success || !createRes.mission) {
        alloc.status = 'REJECTED';
        alloc.rejectionReason = createRes.errors.join('; ');
        anyFailed = true;
        continue;
      }

      // Accept mission into execution
      const acceptRes = this.missionManager.acceptMission(createRes.mission.missionId, clockMs);
      if (!acceptRes.success) {
        alloc.status = 'REJECTED';
        alloc.rejectionReason = acceptRes.errorReason ?? 'Mission acceptance failed.';
        anyFailed = true;
        continue;
      }

      // Start mission into active execution
      this.missionManager.startMission(createRes.mission.missionId, clockMs);

      alloc.status = 'COMMITTED';
      alloc.missionId = createRes.mission.missionId;

      // Update Zone Registry assignment
      this.zoneRegistry.setZoneDroneAssignment(zone.zoneId, [alloc.droneId], createRes.mission.missionId);
    }

    // Set unassigned zones to UNASSIGNED status
    for (const unassignedId of plan.unassignedZoneIds) {
      this.zoneRegistry.setZoneDroneAssignment(unassignedId, []);
    }

    return !anyFailed;
  }
}
