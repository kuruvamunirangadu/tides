/**
 * DroneMissionManager.ts
 * 
 * TIDES Drone Phase 4: Mission & Patrol Manager
 * 
 * Authoritative orchestrator for drone mission lifecycles:
 * - Coordinates PATROL, WAYPOINT_TRAVEL, OBSERVATION, RETURN_TO_BASE, and RESCUE_ASSISTANCE missions
 * - Enforces preflight safety validation (telemetry freshness, battery reserve, connectivity, capability match)
 * - Guarantees single-assignment lock and conflict prevention per drone
 * - Enforces strict state machine transitions with terminal state protection
 * - Integrates directly with DroneMovementEngine for smooth kinematic execution
 * - Tracks waypoint progress, observation dwell timers, and return-to-base landing
 * - Maintains an immutable, deduplicated audit event log and mission history
 * - Preserves existing rescue coordination (RescueCoordinator) and digital twin systems
 */

import { DroneRegistry } from '../foundation/DroneRegistry';
import { DroneMovementEngine } from '../movement/DroneMovementEngine';
import { DroneRecord, DroneWorld3DPosition } from '../foundation/drone.types';
import {
  DroneMissionType,
  DroneMissionStatus,
  DroneMissionEventType,
  DroneMissionEvent,
  DroneMissionWaypoint,
  ConfiguredPatrolRoute,
  DroneMissionDossier,
  MissionCreationRequest,
  PreflightValidationResult,
  MissionTransitionResult,
  UNSUPPORTED_MISSION_TYPES,
} from './droneMission.types';

export class DroneMissionManager {
  private static instance: DroneMissionManager | null = null;

  private registry: DroneRegistry;
  private movementEngine: DroneMovementEngine;

  private activeMissions: Map<string, DroneMissionDossier> = new Map();
  private missionHistory: DroneMissionDossier[] = [];
  private configuredRoutes: Map<string, ConfiguredPatrolRoute> = new Map();
  private missionEvents: DroneMissionEvent[] = [];
  private eventDedupKeys: Set<string> = new Set();
  private listeners: Set<() => void> = new Set();

  private missionCounter: number = 100;
  private eventCounter: number = 1000;

  public static getInstance(): DroneMissionManager {
    if (!DroneMissionManager.instance) {
      DroneMissionManager.instance = new DroneMissionManager();
    }
    return DroneMissionManager.instance;
  }

  constructor() {
    this.registry = DroneRegistry.getInstance();
    this.movementEngine = DroneMovementEngine.getInstance();
    this.initializeDefaultRoutes();
  }

  /**
   * Clears all missions, history, and events (for test suites)
   */
  public reset(): void {
    this.activeMissions.clear();
    this.missionHistory = [];
    this.missionEvents = [];
    this.eventDedupKeys.clear();
    this.initializeDefaultRoutes();
    this.notifyListeners();
  }

  /**
   * Initializes standard Rushikonda Beach coastal routes
   */
  public initializeDefaultRoutes(): void {
    this.configuredRoutes.clear();

    // 1. Crescent Coastal Surf Sweep (covers 1km shoreline)
    this.configuredRoutes.set('ROUTE-COASTAL-CRESCENT', {
      routeId: 'ROUTE-COASTAL-CRESCENT',
      name: 'Rushikonda Coastal Crescent Patrol',
      description: 'Continuous 4-waypoint surveillance sweep along the surf zone and swimming beach',
      defaultAltitudeMeters: 18.0,
      cruiseSpeedMps: 6.0,
      isLoop: true,
      waypoints: [
        {
          index: 0,
          position3D: { x: -30.0, y: 18.0, z: -40.0 },
          targetAltitudeMeters: 18.0,
          holdDurationSec: 4.0,
          name: 'South Cove / Surf Break (WP-1)',
        },
        {
          index: 1,
          position3D: { x: 0.0, y: 22.0, z: -45.0 },
          targetAltitudeMeters: 22.0,
          holdDurationSec: 5.0,
          name: 'Central Rip Corridor (WP-2)',
        },
        {
          index: 2,
          position3D: { x: 35.0, y: 20.0, z: -35.0 },
          targetAltitudeMeters: 20.0,
          holdDurationSec: 4.0,
          name: 'North Swimming Zone (WP-3)',
        },
        {
          index: 3,
          position3D: { x: 10.0, y: 18.0, z: -25.0 },
          targetAltitudeMeters: 18.0,
          holdDurationSec: 4.0,
          name: 'Alongshore Midline Return (WP-4)',
        },
      ],
    });

    // 2. Offshore Rip Current Boundary Watch
    this.configuredRoutes.set('ROUTE-OFFSHORE-RIP-WATCH', {
      routeId: 'ROUTE-OFFSHORE-RIP-WATCH',
      name: 'Offshore Rip Head Perimeter Watch',
      description: 'Offshore surveillance corridor monitoring seaward rip feeder channels',
      defaultAltitudeMeters: 24.0,
      cruiseSpeedMps: 7.5,
      isLoop: true,
      waypoints: [
        {
          index: 0,
          position3D: { x: -20.0, y: 24.0, z: -60.0 },
          targetAltitudeMeters: 24.0,
          holdDurationSec: 6.0,
          name: 'South Offshore Feeder (WP-1)',
        },
        {
          index: 1,
          position3D: { x: 15.0, y: 26.0, z: -65.0 },
          targetAltitudeMeters: 26.0,
          holdDurationSec: 8.0,
          name: 'Rip Head Expansion Zone (WP-2)',
        },
        {
          index: 2,
          position3D: { x: 45.0, y: 24.0, z: -55.0 },
          targetAltitudeMeters: 24.0,
          holdDurationSec: 6.0,
          name: 'North Offshore Return (WP-3)',
        },
      ],
    });

    // 3. Promenade Overlook Surveillance
    this.configuredRoutes.set('ROUTE-PROMENADE-OVERLOOK', {
      routeId: 'ROUTE-PROMENADE-OVERLOOK',
      name: 'Promenade Beachfront Overlook',
      description: 'High-altitude situational surveillance over beach crowd clusters and access points',
      defaultAltitudeMeters: 28.0,
      cruiseSpeedMps: 5.5,
      isLoop: true,
      waypoints: [
        {
          index: 0,
          position3D: { x: -50.0, y: 28.0, z: 10.0 },
          targetAltitudeMeters: 28.0,
          holdDurationSec: 5.0,
          name: 'South Promenade Mast CP-01',
        },
        {
          index: 1,
          position3D: { x: 0.0, y: 30.0, z: 15.0 },
          targetAltitudeMeters: 30.0,
          holdDurationSec: 5.0,
          name: 'Central Plaza Mast CP-04',
        },
        {
          index: 2,
          position3D: { x: 60.0, y: 28.0, z: 12.0 },
          targetAltitudeMeters: 28.0,
          holdDurationSec: 5.0,
          name: 'North Lifeguard Mast CP-07',
        },
      ],
    });
  }

  public getConfiguredRoutes(): ConfiguredPatrolRoute[] {
    return Array.from(this.configuredRoutes.values());
  }

  public getRoute(routeId: string): ConfiguredPatrolRoute | undefined {
    return this.configuredRoutes.get(routeId);
  }

  public getActiveMissions(): DroneMissionDossier[] {
    return Array.from(this.activeMissions.values());
  }

  public getMissionHistory(): DroneMissionDossier[] {
    return this.missionHistory;
  }

  public getMission(missionId: string): DroneMissionDossier | undefined {
    return this.activeMissions.get(missionId) || this.missionHistory.find((m) => m.missionId === missionId);
  }

  public getDroneActiveMission(droneId: string): DroneMissionDossier | undefined {
    return Array.from(this.activeMissions.values()).find((m) => m.droneId === droneId);
  }

  public getMissionEvents(missionId?: string): DroneMissionEvent[] {
    if (missionId) {
      return this.missionEvents.filter((e) => e.missionId === missionId);
    }
    return this.missionEvents;
  }

  // --------------------------------------------------------------------------
  // Preflight Validation
  // --------------------------------------------------------------------------

  /**
   * Rigorously audits preflight constraints prior to mission acceptance
   */
  public validatePreflight(
    request: MissionCreationRequest,
    clockMs: number = Date.now()
  ): PreflightValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Explicit Unsupported Mission Type Check
    if ((UNSUPPORTED_MISSION_TYPES as readonly string[]).includes(request.type)) {
      errors.push(`Mission type '${request.type}' is strictly unsupported by TIDES coastal aerial safety subsystem.`);
      return { valid: false, errors, warnings, checkedAtMs: clockMs };
    }

    const supportedTypes: DroneMissionType[] = [
      'PATROL',
      'WAYPOINT_TRAVEL',
      'OBSERVATION',
      'RETURN_TO_BASE',
      'RESCUE_ASSISTANCE',
    ];
    if (!supportedTypes.includes(request.type)) {
      errors.push(`Unrecognized or unsupported mission type: '${request.type}'.`);
      return { valid: false, errors, warnings, checkedAtMs: clockMs };
    }

    // 2. Drone Existence & Registry Validation
    const drone = this.registry.getDrone(request.droneId);
    if (!drone) {
      errors.push(`Drone '${request.droneId}' not found in authoritative fleet registry.`);
      return { valid: false, errors, warnings, checkedAtMs: clockMs };
    }

    // 3. Operational Availability & Conflict Prevention
    const existingMission = this.getDroneActiveMission(request.droneId);
    if (existingMission && existingMission.missionId !== request.missionId) {
      errors.push(
        `Conflict: Drone '${request.droneId}' is already assigned to active mission '${existingMission.missionId}' (${existingMission.status}).`
      );
    }

    if (drone.currentMissionId && drone.currentMissionId !== request.missionId) {
      errors.push(
        `Conflict: Drone '${request.droneId}' registry lock indicates active assignment to '${drone.currentMissionId}'.`
      );
    }

    if (drone.status === 'MAINTENANCE' || drone.status === 'OFFLINE') {
      errors.push(`Drone '${request.droneId}' is currently unavailable (Status: ${drone.status}).`);
    }

    // 4. Connectivity & Telemetry Freshness
    if (drone.connectivity === 'DISCONNECTED') {
      errors.push(`Drone '${request.droneId}' telemetry link is DISCONNECTED. Preflight rejected.`);
    }

    if (drone.isStale || drone.telemetryFreshnessSeconds > 15.0) {
      errors.push(
        `Telemetry link is STALE (${drone.telemetryFreshnessSeconds.toFixed(1)}s > 15.0s threshold). Command uplink rejected.`
      );
    }

    // 5. Battery Reserve & Readiness Gate
    const minRequiredBattery = drone.battery.reserveThresholdPercent + 5; // e.g. 20% + 5% = 25%
    if (drone.battery.percentage <= minRequiredBattery) {
      errors.push(
        `Insufficient battery: ${drone.battery.percentage}% <= minimum dispatch threshold (${minRequiredBattery}%).`
      );
    }

    if (drone.battery.isLowBattery || drone.battery.isCriticalBattery) {
      errors.push(`Drone battery alert active: low/critical battery lockout enforced.`);
    }

    // 6. Capability Match
    if (request.type === 'RESCUE_ASSISTANCE') {
      if (!drone.capabilities.hasFlotationPayload && drone.role !== 'RESCUE_ASSISTANCE' && drone.role !== 'MULTI_ROLE') {
        errors.push(`Capability deficit: Drone '${drone.droneId}' lacks flotation payload deployment capability.`);
      }
    }

    // 7. Route / Waypoint Integrity Validation
    if (request.type === 'PATROL') {
      const waypoints = request.waypoints ?? (request.routeId ? this.configuredRoutes.get(request.routeId)?.waypoints : undefined);
      if (!waypoints || waypoints.length < 2) {
        errors.push(`Patrol mission requires at least 2 valid waypoints.`);
      } else {
        waypoints.forEach((wp, idx) => {
          this.validateWaypointBounds(wp, idx, errors);
        });
      }
    } else if (request.type === 'WAYPOINT_TRAVEL' || request.type === 'OBSERVATION') {
      const waypoints = request.waypoints ?? (request.targetPosition3D ? [{
        index: 0,
        position3D: request.targetPosition3D,
        targetAltitudeMeters: request.targetAltitudeMeters ?? request.targetPosition3D.y,
        holdDurationSec: request.observationDurationSec ?? 30.0,
      }] : undefined);

      if (!waypoints || waypoints.length === 0) {
        errors.push(`Mission type '${request.type}' requires at least 1 destination waypoint.`);
      } else {
        waypoints.forEach((wp, idx) => {
          this.validateWaypointBounds(wp, idx, errors);
        });
      }

      if (request.type === 'OBSERVATION') {
        const duration = request.observationDurationSec ?? waypoints?.[0]?.holdDurationSec ?? 0;
        if (duration <= 0) {
          errors.push(`Observation mission requires observationDurationSec > 0.`);
        }
      }
    } else if (request.type === 'RETURN_TO_BASE') {
      if (!drone.homePosition3D) {
        errors.push(`Drone '${drone.droneId}' has no configured home launch pad position.`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      checkedAtMs: clockMs,
    };
  }

  private validateWaypointBounds(wp: DroneMissionWaypoint, idx: number, errors: string[]): void {
    const pos = wp.position3D;
    if (!pos || isNaN(pos.x) || isNaN(pos.y) || isNaN(pos.z)) {
      errors.push(`Waypoint ${idx} contains invalid or NaN coordinates.`);
      return;
    }
    if (pos.y < DroneMovementEngine.MIN_FLIGHT_ALTITUDE_AGL || pos.y > DroneMovementEngine.MAX_FLIGHT_ALTITUDE_AGL) {
      errors.push(
        `Waypoint ${idx} altitude ${pos.y}m violates flight bounds [${DroneMovementEngine.MIN_FLIGHT_ALTITUDE_AGL}, ${DroneMovementEngine.MAX_FLIGHT_ALTITUDE_AGL}]m AGL.`
      );
    }
    // Coastal boundary sanity check (Three.js coordinates: Rushikonda bounds ~ [-150, 150] X, [-150, 50] Z)
    if (pos.x < -200 || pos.x > 200 || pos.z < -200 || pos.z > 100) {
      errors.push(`Waypoint ${idx} [${pos.x}, ${pos.z}] is outside coastal operational boundary.`);
    }
  }

  // --------------------------------------------------------------------------
  // Mission Creation & Lifecycle Management
  // --------------------------------------------------------------------------

  /**
   * Creates, validates, and initializes a drone mission dossier
   */
  public createMission(
    request: MissionCreationRequest,
    clockMs: number = Date.now()
  ): { mission?: DroneMissionDossier; success: boolean; errors: string[] } {
    this.missionCounter++;
    const missionId = request.missionId ?? `MSN-${request.type.slice(0, 3)}-${this.missionCounter}`;

    // Resolve waypoints
    let waypoints: DroneMissionWaypoint[] = [];
    if (request.waypoints && request.waypoints.length > 0) {
      waypoints = request.waypoints.map((w, idx) => ({ ...w, index: idx }));
    } else if (request.routeId && this.configuredRoutes.has(request.routeId)) {
      const route = this.configuredRoutes.get(request.routeId)!;
      waypoints = route.waypoints.map((w) => ({ ...w }));
    } else if (request.targetPosition3D) {
      waypoints = [
        {
          index: 0,
          position3D: { ...request.targetPosition3D },
          targetAltitudeMeters: request.targetAltitudeMeters ?? request.targetPosition3D.y,
          holdDurationSec: request.observationDurationSec ?? 30.0,
          name: request.type === 'OBSERVATION' ? 'Observation Hold Station' : 'Target Waypoint',
        },
      ];
    } else if (request.type === 'RETURN_TO_BASE') {
      const drone = this.registry.getDrone(request.droneId);
      if (drone) {
        waypoints = [
          {
            index: 0,
            position3D: { ...drone.homePosition3D },
            targetAltitudeMeters: drone.homePosition3D.y,
            holdDurationSec: 0,
            name: `${drone.homeBaseId} Pad`,
          },
        ];
      }
    }

    const validation = this.validatePreflight({ ...request, missionId, waypoints }, clockMs);

    // Record Event: Created
    this.recordEvent({
      eventId: `EVT-${this.eventCounter++}`,
      missionId,
      droneId: request.droneId,
      eventType: 'MISSION_CREATED',
      timestampMs: clockMs,
      details: { type: request.type, waypointsCount: waypoints.length, routeId: request.routeId },
      provenance: request.provenance ?? 'SIMULATED',
    });

    if (!validation.valid) {
      // Record Event: Validation Failed
      this.recordEvent({
        eventId: `EVT-${this.eventCounter++}`,
        missionId,
        droneId: request.droneId,
        eventType: 'VALIDATION_FAILED',
        timestampMs: clockMs,
        details: { errors: validation.errors },
        provenance: request.provenance ?? 'SIMULATED',
      });

      const failedDossier: DroneMissionDossier = {
        missionId,
        type: request.type,
        droneId: request.droneId,
        status: 'FAILED',
        priority: request.priority ?? 3,
        createdAtMs: clockMs,
        updatedAtMs: clockMs,
        routeId: request.routeId,
        waypoints,
        currentWaypointIndex: 0,
        observationDurationSec: request.observationDurationSec,
        observationTimerSec: 0,
        linkedIncidentId: request.linkedIncidentId,
        failureReason: validation.errors.join(' | '),
        notes: request.notes,
        progressPercent: 0,
        provenance: request.provenance ?? 'SIMULATED',
      };
      this.missionHistory.push(failedDossier);
      this.notifyListeners();
      return { success: false, errors: validation.errors, mission: failedDossier };
    }

    // Record Event: Validation Passed
    this.recordEvent({
      eventId: `EVT-${this.eventCounter++}`,
      missionId,
      droneId: request.droneId,
      eventType: 'VALIDATION_PASSED',
      timestampMs: clockMs,
      provenance: request.provenance ?? 'SIMULATED',
    });

    const mission: DroneMissionDossier = {
      missionId,
      type: request.type,
      droneId: request.droneId,
      status: 'PENDING',
      priority: request.priority ?? (request.type === 'RESCUE_ASSISTANCE' ? 1 : 3),
      createdAtMs: clockMs,
      updatedAtMs: clockMs,
      routeId: request.routeId,
      waypoints,
      currentWaypointIndex: 0,
      observationDurationSec: request.observationDurationSec ?? (request.type === 'OBSERVATION' ? 30.0 : undefined),
      observationTimerSec: 0,
      linkedIncidentId: request.linkedIncidentId,
      notes: request.notes,
      progressPercent: 0,
      provenance: request.provenance ?? 'SIMULATED',
    };

    this.activeMissions.set(missionId, mission);
    this.notifyListeners();

    return { mission, success: true, errors: [] };
  }

  /**
   * Formally accepts a pending mission and establishes an exclusive reservation lock on the drone
   */
  public acceptMission(missionId: string, clockMs: number = Date.now()): MissionTransitionResult {
    const mission = this.activeMissions.get(missionId);
    if (!mission) {
      return { success: false, fromStatus: 'DRAFT', toStatus: 'ACCEPTED', missionId, errorReason: 'Mission not found' };
    }

    const transition = this.validateTransition(mission.status, 'ACCEPTED');
    if (!transition.allowed) {
      return {
        success: false,
        fromStatus: mission.status,
        toStatus: 'ACCEPTED',
        missionId,
        errorReason: transition.reason,
      };
    }

    // Reserve drone in authoritative registry
    const assignResult = this.registry.assignMission({
      droneId: mission.droneId,
      missionId: mission.missionId,
      incidentId: mission.linkedIncidentId,
    });

    if (!assignResult.success) {
      mission.status = 'FAILED';
      mission.failureReason = assignResult.rejectionReason;
      mission.updatedAtMs = clockMs;
      this.recordEvent({
        eventId: `EVT-${this.eventCounter++}`,
        missionId,
        droneId: mission.droneId,
        eventType: 'MISSION_FAILED',
        timestampMs: clockMs,
        details: { rejectionReason: assignResult.rejectionReason },
        provenance: mission.provenance,
      });
      this.notifyListeners();
      return {
        success: false,
        fromStatus: mission.status,
        toStatus: 'ACCEPTED',
        missionId,
        errorReason: assignResult.rejectionReason,
      };
    }

    const prevStatus = mission.status;
    mission.status = 'ACCEPTED';
    mission.updatedAtMs = clockMs;

    this.recordEvent({
      eventId: `EVT-${this.eventCounter++}`,
      missionId,
      droneId: mission.droneId,
      eventType: 'MISSION_ACCEPTED',
      timestampMs: clockMs,
      provenance: mission.provenance,
    });

    this.notifyListeners();
    return { success: true, fromStatus: prevStatus, toStatus: 'ACCEPTED', missionId };
  }

  /**
   * Commences mission execution, configuring the flight profile in the DroneMovementEngine
   */
  public startMission(missionId: string, clockMs: number = Date.now()): MissionTransitionResult {
    const mission = this.activeMissions.get(missionId);
    if (!mission) {
      return { success: false, fromStatus: 'DRAFT', toStatus: 'ACTIVE', missionId, errorReason: 'Mission not found' };
    }

    // Auto-accept if still PENDING
    if (mission.status === 'PENDING') {
      const acceptRes = this.acceptMission(missionId, clockMs);
      if (!acceptRes.success) {
        return acceptRes;
      }
    }

    const transition = this.validateTransition(mission.status, 'ACTIVE');
    if (!transition.allowed) {
      return {
        success: false,
        fromStatus: mission.status,
        toStatus: 'ACTIVE',
        missionId,
        errorReason: transition.reason,
      };
    }

    const prevStatus = mission.status;
    mission.status = 'ACTIVE';
    mission.startedAtMs = clockMs;
    mission.updatedAtMs = clockMs;

    // Configure flight kinematics on DroneMovementEngine
    if (mission.type === 'PATROL' && mission.waypoints.length > 0) {
      const routeWaypoints = mission.waypoints.map((w) => w.position3D);
      this.movementEngine.configurePatrolCircuit(
        mission.droneId,
        routeWaypoints,
        DroneMovementEngine.DEFAULT_CRUISE_SPEED_MPS,
        mission.waypoints[0]?.holdDurationSec ?? 4.0,
        mission.missionId
      );
    } else if (mission.type === 'WAYPOINT_TRAVEL' || mission.type === 'OBSERVATION') {
      const firstWp = mission.waypoints[0];
      if (firstWp) {
        this.movementEngine.dispatchToWorldPosition(
          mission.droneId,
          firstWp.position3D,
          firstWp.targetAltitudeMeters,
          mission.missionId
        );
      }
    } else if (mission.type === 'RETURN_TO_BASE') {
      this.movementEngine.returnToBase(mission.droneId);
      mission.status = 'RETURNING';
    } else if (mission.type === 'RESCUE_ASSISTANCE') {
      const firstWp = mission.waypoints[0];
      if (firstWp) {
        this.movementEngine.dispatchToWorldPosition(
          mission.droneId,
          firstWp.position3D,
          firstWp.targetAltitudeMeters,
          mission.missionId
        );
        const drone = this.registry.getDrone(mission.droneId);
        if (drone) drone.status = 'ASSISTING';
      }
    }

    this.recordEvent({
      eventId: `EVT-${this.eventCounter++}`,
      missionId,
      droneId: mission.droneId,
      eventType: 'MISSION_STARTED',
      timestampMs: clockMs,
      details: { type: mission.type, waypointsCount: mission.waypoints.length },
      provenance: mission.provenance,
    });

    this.notifyListeners();
    return { success: true, fromStatus: prevStatus, toStatus: mission.status, missionId };
  }

  /**
   * Initiates safe Return-to-Base for a mission
   */
  public requestReturnToBase(
    missionId: string,
    reason: string = 'Operator command or mission completion',
    clockMs: number = Date.now()
  ): MissionTransitionResult {
    const mission = this.activeMissions.get(missionId);
    if (!mission) {
      return { success: false, fromStatus: 'DRAFT', toStatus: 'RETURNING', missionId, errorReason: 'Mission not found' };
    }

    if (mission.status === 'COMPLETED' || mission.status === 'CANCELLED' || mission.status === 'FAILED') {
      return {
        success: false,
        fromStatus: mission.status,
        toStatus: 'RETURNING',
        missionId,
        errorReason: `Cannot request return: mission is already in terminal state '${mission.status}'.`,
      };
    }

    const prevStatus = mission.status;
    mission.status = 'RETURNING';
    mission.updatedAtMs = clockMs;
    mission.notes = mission.notes ? `${mission.notes} | Return: ${reason}` : `Return: ${reason}`;

    this.movementEngine.returnToBase(mission.droneId);

    this.recordEvent({
      eventId: `EVT-${this.eventCounter++}`,
      missionId,
      droneId: mission.droneId,
      eventType: 'RETURN_REQUESTED',
      timestampMs: clockMs,
      details: { reason },
      provenance: mission.provenance,
    });

    this.notifyListeners();
    return { success: true, fromStatus: prevStatus, toStatus: 'RETURNING', missionId };
  }

  /**
   * Safely cancels an active or pending mission
   */
  public cancelMission(
    missionId: string,
    reason: string = 'Operator cancellation request',
    clockMs: number = Date.now()
  ): MissionTransitionResult {
    const mission = this.activeMissions.get(missionId);
    if (!mission) {
      return { success: false, fromStatus: 'DRAFT', toStatus: 'CANCELLED', missionId, errorReason: 'Mission not found' };
    }

    if (mission.status === 'COMPLETED' || mission.status === 'CANCELLED' || mission.status === 'FAILED') {
      return {
        success: false,
        fromStatus: mission.status,
        toStatus: 'CANCELLED',
        missionId,
        errorReason: `Cannot cancel mission: already in terminal state '${mission.status}'.`,
      };
    }

    const prevStatus = mission.status;
    mission.status = 'CANCELLED';
    mission.cancellationReason = reason;
    mission.completedAtMs = clockMs;
    mission.updatedAtMs = clockMs;

    // Safe recovery: recall drone to pad if airborne
    const drone = this.registry.getDrone(mission.droneId);
    if (drone) {
      const isAirborne = drone.position3D.y > (drone.homePosition3D.y + 0.5);
      if (isAirborne) {
        this.movementEngine.returnToBase(mission.droneId);
      } else {
        drone.status = 'IDLE';
      }
      this.registry.releaseMission(mission.droneId, missionId);
    }

    this.recordEvent({
      eventId: `EVT-${this.eventCounter++}`,
      missionId,
      droneId: mission.droneId,
      eventType: 'MISSION_CANCELLED',
      timestampMs: clockMs,
      details: { cancellationReason: reason },
      provenance: mission.provenance,
    });

    // Archive mission
    this.activeMissions.delete(missionId);
    this.missionHistory.push({ ...mission });

    this.notifyListeners();
    return { success: true, fromStatus: prevStatus, toStatus: 'CANCELLED', missionId };
  }

  /**
   * Marks a mission as failed with recorded diagnostic reason
   */
  public failMission(
    missionId: string,
    reason: string,
    clockMs: number = Date.now()
  ): MissionTransitionResult {
    const mission = this.activeMissions.get(missionId);
    if (!mission) {
      return { success: false, fromStatus: 'DRAFT', toStatus: 'FAILED', missionId, errorReason: 'Mission not found' };
    }

    const prevStatus = mission.status;
    mission.status = 'FAILED';
    mission.failureReason = reason;
    mission.completedAtMs = clockMs;
    mission.updatedAtMs = clockMs;

    this.registry.releaseMission(mission.droneId, missionId);

    this.recordEvent({
      eventId: `EVT-${this.eventCounter++}`,
      missionId,
      droneId: mission.droneId,
      eventType: 'MISSION_FAILED',
      timestampMs: clockMs,
      details: { failureReason: reason },
      provenance: mission.provenance,
    });

    this.activeMissions.delete(missionId);
    this.missionHistory.push({ ...mission });

    this.notifyListeners();
    return { success: true, fromStatus: prevStatus, toStatus: 'FAILED', missionId };
  }

  // --------------------------------------------------------------------------
  // Simulation Frame Update Loop
  // --------------------------------------------------------------------------

  /**
   * Main per-frame mission update loop. Evaluates waypoint arrival, observation dwell,
   * return progression, landing completion, and progress telemetry.
   */
  public update(deltaTimeSec: number, currentClockMs: number = Date.now()): void {
    if (deltaTimeSec <= 0) return;

    for (const [missionId, mission] of this.activeMissions.entries()) {
      const drone = this.registry.getDrone(mission.droneId);
      if (!drone) {
        this.failMission(missionId, `Assigned drone '${mission.droneId}' was removed from registry.`, currentClockMs);
        continue;
      }

      if (mission.status === 'ACTIVE') {
        this.updateActiveMission(mission, drone, deltaTimeSec, currentClockMs);
      } else if (mission.status === 'RETURNING') {
        this.updateReturningMission(mission, drone, deltaTimeSec, currentClockMs);
      }
    }
  }

  private updateActiveMission(
    mission: DroneMissionDossier,
    drone: DroneRecord,
    dt: number,
    clockMs: number
  ): void {
    if (mission.type === 'PATROL') {
      const profile = this.movementEngine.getFlightProfile(mission.droneId);
      if (profile && profile.waypoints.length > 0) {
        const wpIdx = profile.currentWaypointIndex;
        if (wpIdx !== mission.currentWaypointIndex) {
          mission.currentWaypointIndex = wpIdx;
          mission.updatedAtMs = clockMs;

          // Record Waypoint Reached
          const dedupKey = `${mission.missionId}_WP_${wpIdx}`;
          if (!this.eventDedupKeys.has(dedupKey)) {
            this.eventDedupKeys.add(dedupKey);
            this.recordEvent({
              eventId: `EVT-${this.eventCounter++}`,
              missionId: mission.missionId,
              droneId: mission.droneId,
              eventType: 'WAYPOINT_REACHED',
              timestampMs: clockMs,
              details: { waypointIndex: wpIdx, position: drone.position3D },
              provenance: mission.provenance,
            });
          }
        }

        const totalWps = mission.waypoints.length || profile.waypoints.length;
        mission.progressPercent = Math.min(99, Math.round(((wpIdx + 1) / totalWps) * 100));
      }
    } else if (mission.type === 'OBSERVATION') {
      const targetWp = mission.waypoints[0];
      if (targetWp) {
        const dx = targetWp.position3D.x - drone.position3D.x;
        const dz = targetWp.position3D.z - drone.position3D.z;
        const dist = Math.hypot(dx, dz);
        const altDiff = Math.abs(targetWp.targetAltitudeMeters - drone.position3D.y);

        const onStation = dist <= 0.8 && altDiff <= 0.5;
        if (onStation) {
          // Started observation
          const dedupKey = `${mission.missionId}_OBS_STARTED`;
          if (!this.eventDedupKeys.has(dedupKey)) {
            this.eventDedupKeys.add(dedupKey);
            this.recordEvent({
              eventId: `EVT-${this.eventCounter++}`,
              missionId: mission.missionId,
              droneId: mission.droneId,
              eventType: 'OBSERVATION_STARTED',
              timestampMs: clockMs,
              details: { targetAltitude: targetWp.targetAltitudeMeters },
              provenance: mission.provenance,
            });
          }

          mission.observationTimerSec = (mission.observationTimerSec ?? 0) + dt;
          const targetDuration = mission.observationDurationSec ?? targetWp.holdDurationSec ?? 30.0;
          mission.progressPercent = Math.min(99, Math.round((mission.observationTimerSec / targetDuration) * 100));

          if (mission.observationTimerSec >= targetDuration) {
            // Observation Complete
            this.recordEvent({
              eventId: `EVT-${this.eventCounter++}`,
              missionId: mission.missionId,
              droneId: mission.droneId,
              eventType: 'OBSERVATION_COMPLETED',
              timestampMs: clockMs,
              details: { totalDurationSec: mission.observationTimerSec },
              provenance: mission.provenance,
            });

            // Automatically request return to base upon observation completion
            this.requestReturnToBase(mission.missionId, 'Observation dwell complete', clockMs);
          }
        } else {
          // In transit to observation station
          mission.progressPercent = 15;
        }
      }
    } else if (mission.type === 'WAYPOINT_TRAVEL') {
      const targetWp = mission.waypoints[0];
      if (targetWp) {
        const dx = targetWp.position3D.x - drone.position3D.x;
        const dz = targetWp.position3D.z - drone.position3D.z;
        const dist = Math.hypot(dx, dz);
        if (dist <= 0.5) {
          this.recordEvent({
            eventId: `EVT-${this.eventCounter++}`,
            missionId: mission.missionId,
            droneId: mission.droneId,
            eventType: 'WAYPOINT_REACHED',
            timestampMs: clockMs,
            details: { waypointIndex: 0, position: drone.position3D },
            provenance: mission.provenance,
          });
          mission.progressPercent = 100;
          this.completeMission(mission.missionId, clockMs);
        }
      }
    }
  }

  private updateReturningMission(
    mission: DroneMissionDossier,
    drone: DroneRecord,
    dt: number,
    clockMs: number
  ): void {
    const home = drone.homePosition3D;
    const dx = home.x - drone.position3D.x;
    const dz = home.z - drone.position3D.z;
    const horizontalDist = Math.hypot(dx, dz);
    const altDiff = Math.abs(drone.position3D.y - home.y);

    // Landed when within 0.5m horizontal and 0.2m altitude of launch pad
    if (horizontalDist <= 0.5 && altDiff <= 0.2) {
      this.recordEvent({
        eventId: `EVT-${this.eventCounter++}`,
        missionId: mission.missionId,
        droneId: mission.droneId,
        eventType: 'RETURN_COMPLETED',
        timestampMs: clockMs,
        provenance: mission.provenance,
      });

      this.recordEvent({
        eventId: `EVT-${this.eventCounter++}`,
        missionId: mission.missionId,
        droneId: mission.droneId,
        eventType: 'LANDED',
        timestampMs: clockMs,
        details: { padId: drone.homeBaseId, landingPosition: drone.position3D },
        provenance: mission.provenance,
      });

      this.completeMission(mission.missionId, clockMs);
    } else {
      // Calculate return progress percent
      mission.progressPercent = Math.max(50, Math.min(99, 100 - Math.round(horizontalDist)));
    }
  }

  /**
   * Finalizes mission completion, releases drone lock, and archives dossier
   */
  public completeMission(missionId: string, clockMs: number = Date.now()): void {
    const mission = this.activeMissions.get(missionId);
    if (!mission) return;

    mission.status = 'COMPLETED';
    mission.progressPercent = 100;
    mission.completedAtMs = clockMs;
    mission.updatedAtMs = clockMs;

    this.registry.releaseMission(mission.droneId, missionId);

    const drone = this.registry.getDrone(mission.droneId);
    if (drone) {
      if (drone.status === 'RETURNING') {
        drone.status = drone.battery.percentage < 100 ? 'CHARGING' : 'IDLE';
      }
    }

    this.recordEvent({
      eventId: `EVT-${this.eventCounter++}`,
      missionId,
      droneId: mission.droneId,
      eventType: 'MISSION_COMPLETED',
      timestampMs: clockMs,
      provenance: mission.provenance,
    });

    this.activeMissions.delete(missionId);
    this.missionHistory.push({ ...mission });
    this.notifyListeners();
  }

  // --------------------------------------------------------------------------
  // State Machine Validation & Event Auditing
  // --------------------------------------------------------------------------

  private validateTransition(
    from: DroneMissionStatus,
    to: DroneMissionStatus
  ): { allowed: boolean; reason?: string } {
    // Terminal states cannot transition
    if (from === 'COMPLETED' || from === 'CANCELLED' || from === 'FAILED') {
      return {
        allowed: false,
        reason: `Illegal state transition: mission is in terminal state '${from}' and cannot transition to '${to}'.`,
      };
    }

    const transitions: Record<DroneMissionStatus, DroneMissionStatus[]> = {
      DRAFT: ['PENDING', 'VALIDATING', 'CANCELLED'],
      PENDING: ['VALIDATING', 'ACCEPTED', 'CANCELLED', 'FAILED'],
      VALIDATING: ['ACCEPTED', 'FAILED', 'CANCELLED'],
      ACCEPTED: ['ACTIVE', 'CANCELLED', 'FAILED'],
      ACTIVE: ['PAUSED', 'RETURNING', 'COMPLETED', 'CANCELLED', 'FAILED'],
      PAUSED: ['ACTIVE', 'CANCELLED', 'FAILED'],
      RETURNING: ['COMPLETED', 'CANCELLED', 'FAILED'],
      COMPLETED: [],
      CANCELLED: [],
      FAILED: [],
    };

    const allowedNext = transitions[from] || [];
    if (!allowedNext.includes(to)) {
      return {
        allowed: false,
        reason: `Illegal transition from '${from}' to '${to}'. Allowed transitions: [${allowedNext.join(', ')}].`,
      };
    }

    return { allowed: true };
  }

  private recordEvent(event: DroneMissionEvent): void {
    this.missionEvents.push(event);
    if (this.missionEvents.length > 500) {
      this.missionEvents.shift();
    }
  }

  // --------------------------------------------------------------------------
  // Reactive Listener Support for React UI
  // --------------------------------------------------------------------------

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((l) => l());
  }
}

