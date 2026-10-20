/**
 * DroneRescueEligibilityValidator.ts
 * 
 * TIDES Drone Phase 9: Rescue Drone & Incident Eligibility Validator
 * 
 * Strict Architectural Guarantees:
 * - Checks drone role, payload capability (hasFlotationPayload), operational availability,
 *   connectivity, telemetry freshness (< 15s), and battery reserve (> 25%).
 * - Surveillance-only drones without rescue payloads are strictly rejected.
 * - Unknown capabilities are reported as unknown rather than assumed satisfied.
 * - Prevents double-booking: a drone already assisting another incident cannot be reassigned.
 * - Preserves existing incident severity policies without creating parallel severity systems.
 */

import { DroneRecord } from '../foundation/drone.types';
import { DroneMissionManager } from '../missions/DroneMissionManager';
import { Incident } from '../../models/Incident';
import { DistressIncidentEvent } from '../../scene3d/hazards/rip3d.types';
import {
  IncidentEligibilityAssessment,
  RescueDroneEligibilityCheck,
  RescueDroneAssignment,
} from './droneRescue.types';

export class DroneRescueEligibilityValidator {
  private static instance: DroneRescueEligibilityValidator | null = null;

  public static getInstance(): DroneRescueEligibilityValidator {
    if (!DroneRescueEligibilityValidator.instance) {
      DroneRescueEligibilityValidator.instance = new DroneRescueEligibilityValidator();
    }
    return DroneRescueEligibilityValidator.instance;
  }

  /**
   * Evaluates an incident from authoritative IncidentManager or RipCurrentSimulator for drone rescue eligibility
   */
  public evaluateIncidentEligibility(
    incident: Incident | DistressIncidentEvent | any,
    existingAssignments: RescueDroneAssignment[] = []
  ): IncidentEligibilityAssessment {
    const incidentId = incident.id ?? incident.incidentId ?? 'UNKNOWN-INC';
    const title = incident.title ?? (incident.type ? `Incident (${incident.type})` : 'Distress Event');
    const severity = incident.severity ?? 'CRITICAL';
    const incidentType = incident.type ?? 'DISTRESS';
    const rejectionReasons: string[] = [];

    // 1. Check active/unresolved state
    const isActive = incident.active !== false && !incident.resolved && !incident.resolvedAt;
    if (!isActive) {
      rejectionReasons.push(`Incident ${incidentId} is already resolved or inactive.`);
    }

    // 2. Incident Severity Policy Check (CRITICAL or HIGH, or DISTRESS type)
    const isHighPriority =
      severity === 'CRITICAL' || severity === 'HIGH' || incidentType === 'DISTRESS';
    if (!isHighPriority) {
      rejectionReasons.push(
        `Incident severity '${severity}' / type '${incidentType}' does not qualify for emergency aerial flotation dispatch.`
      );
    }

    // 3. Location Validity and Scene-Space Coordinates
    let targetPos: { x: number; y: number; z: number } | undefined;

    if (incident.position3D && typeof incident.position3D.x === 'number') {
      targetPos = {
        x: incident.position3D.x,
        y: incident.position3D.y ?? 0,
        z: incident.position3D.z,
      };
    } else if (incident.location && typeof incident.location.x === 'number') {
      // Map 2D simulation location to 3D scene space if needed
      // Standard beach coordinate mapper: X centered [-150, 150], Y elevation, Z water/beach
      targetPos = {
        x: (incident.location.x - 500) * 0.3,
        y: 0,
        z: (incident.location.y - 150) * -0.5,
      };
    }

    if (!targetPos || isNaN(targetPos.x) || isNaN(targetPos.z)) {
      rejectionReasons.push(`Incident has missing, stale, or invalid coordinates (NaN / undefined).`);
    } else {
      // Bounds check: Rushikonda Digital Twin operational envelope [-250, 250]
      if (targetPos.x < -250 || targetPos.x > 250 || targetPos.z < -200 || targetPos.z > 150) {
        rejectionReasons.push(
          `Incident location (${targetPos.x.toFixed(1)}, ${targetPos.z.toFixed(1)}) is outside digital twin coastal flight perimeter.`
        );
      }
    }

    // 4. Existing Active Assignment Conflict Check
    const activeExisting = existingAssignments.find(
      (a) =>
        a.incidentId === incidentId &&
        (a.status === 'PROPOSED' ||
          a.status === 'APPROVED' ||
          a.status === 'DISPATCHED' ||
          a.status === 'EN_ROUTE' ||
          a.status === 'ASSISTING')
    );

    let existingAssignmentId: string | undefined;
    let existingResourceId: string | undefined;

    if (activeExisting) {
      existingAssignmentId = activeExisting.assignmentId;
      existingResourceId = activeExisting.assignedResourceId;
      rejectionReasons.push(
        `Incident already has active rescue drone assignment ${activeExisting.assignmentId} assigned to ${activeExisting.assignedResourceId} (Status: ${activeExisting.status}).`
      );
    }

    return {
      incidentId,
      isEligible: rejectionReasons.length === 0,
      severity,
      incidentType,
      title,
      targetPosition3D: targetPos,
      existingAssignmentId,
      existingResourceId,
      rejectionReasons,
    };
  }

  /**
   * Assesses a drone's eligibility to respond to an emergency rescue mission
   */
  public evaluateDroneEligibility(
    drone: DroneRecord,
    targetPos: { x: number; y: number; z: number },
    missionManager: DroneMissionManager = DroneMissionManager.getInstance(),
    clockMs: number = Date.now()
  ): RescueDroneEligibilityCheck {
    const rejectionReasons: string[] = [];
    const unknownCapabilities: string[] = [];

    // 1. Role Capability Check
    const roleSupported =
      drone.role === 'RESCUE_ASSISTANCE' || drone.role === 'MULTI_ROLE';
    if (!roleSupported) {
      rejectionReasons.push(
        `Role mismatch: Drone '${drone.droneId}' is configured as '${drone.role}', which does not support emergency rescue dispatch.`
      );
    }

    // 2. Payload Capability (Flotation deployment hardware)
    let hasFlotationPayload = false;
    if (drone.capabilities === undefined || drone.capabilities.hasFlotationPayload === undefined) {
      unknownCapabilities.push('hasFlotationPayload');
      rejectionReasons.push(
        `Payload capability 'hasFlotationPayload' is UNKNOWN or undefined on drone '${drone.droneId}'. Cannot assume satisfied.`
      );
    } else if (!drone.capabilities.hasFlotationPayload) {
      rejectionReasons.push(
        `Capability deficit: Drone '${drone.droneId}' lacks required 'hasFlotationPayload' deployment mechanism.`
      );
    } else {
      hasFlotationPayload = true;
    }

    // 3. Operational Status Check
    const statusAvailable =
      drone.status !== 'OFFLINE' &&
      drone.status !== 'MAINTENANCE' &&
      drone.status !== 'CHARGING' &&
      drone.status !== 'RETURNING';
    if (!statusAvailable) {
      rejectionReasons.push(
        `Drone '${drone.droneId}' is currently unavailable (Status: ${drone.status}).`
      );
    }

    // 4. Connectivity Check
    const connectivityActive = drone.connectivity === 'CONNECTED';
    if (!connectivityActive) {
      rejectionReasons.push(
        `Drone '${drone.droneId}' telemetry link is ${drone.connectivity}. Command uplink prohibited.`
      );
    }

    // 5. Telemetry Freshness Check (< 15s)
    const telemetryAgeSeconds = (clockMs - drone.lastReceivedTimeMs) / 1000;
    const telemetryFresh = telemetryAgeSeconds <= 15.0 && !drone.isStale;
    if (!telemetryFresh) {
      rejectionReasons.push(
        `Telemetry link is stale (${telemetryAgeSeconds.toFixed(1)}s > 15s limit). Real-time kinematic lock unavailable.`
      );
    }

    // 6. Battery Reserve Check (> 25%)
    let batterySufficient = false;
    if (drone.battery === undefined || typeof drone.battery.percentage !== 'number') {
      unknownCapabilities.push('batteryPercentage');
      rejectionReasons.push(
        `Battery telemetry is missing or unknown on drone '${drone.droneId}'. Dispatch lockout enforced.`
      );
    } else if (drone.battery.percentage <= 25.0) {
      rejectionReasons.push(
        `Insufficient battery reserve: ${drone.battery.percentage.toFixed(0)}% <= 25% minimum dispatch reserve threshold.`
      );
    } else {
      batterySufficient = true;
    }

    // 7. Conflicting Active Rescue Mission Lock
    let noConflictingRescueMission = true;
    const activeMission = missionManager.getDroneActiveMission(drone.droneId);
    if (activeMission && activeMission.type === 'RESCUE_ASSISTANCE') {
      noConflictingRescueMission = false;
      rejectionReasons.push(
        `Drone '${drone.droneId}' is already locked to active emergency rescue mission ${activeMission.missionId}.`
      );
    }

    // 8. Distance & Flight Kinematics
    const dx = targetPos.x - drone.position3D.x;
    const dz = targetPos.z - drone.position3D.z;
    const distanceMeters = Math.hypot(dx, dz);
    const speed = Math.max(10.0, drone.speedMps || 15.0); // 15 m/s standard rapid transit
    const estimatedArrivalSec = Math.max(2.0, distanceMeters / speed);

    // 9. Boundary Constraints
    const targetWithinBounds =
      targetPos.x >= -250 && targetPos.x <= 250 && targetPos.z >= -200 && targetPos.z <= 150;
    if (!targetWithinBounds) {
      rejectionReasons.push(
        `Target coordinate (${targetPos.x.toFixed(1)}, ${targetPos.z.toFixed(1)}) exceeds digital twin flight boundary.`
      );
    }

    const isEligible =
      roleSupported &&
      hasFlotationPayload &&
      statusAvailable &&
      connectivityActive &&
      telemetryFresh &&
      batterySufficient &&
      noConflictingRescueMission &&
      targetWithinBounds &&
      unknownCapabilities.length === 0;

    return {
      droneId: drone.droneId,
      callsign: drone.callsign,
      role: drone.role,
      isEligible,
      checks: {
        roleSupported,
        hasFlotationPayload,
        statusAvailable,
        connectivityActive,
        telemetryFresh,
        batterySufficient,
        noConflictingRescueMission,
        targetWithinBounds,
      },
      metrics: {
        batteryPercentage: drone.battery?.percentage ?? 0,
        telemetryAgeSeconds,
        distanceMeters,
        estimatedArrivalSec,
      },
      rejectionReasons,
      unknownCapabilities,
    };
  }
}

