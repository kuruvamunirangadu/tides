/**
 * DroneRescueExecutionManager.ts
 * 
 * TIDES Drone Phase 10: Search, Approach & Rescue Assistance Service
 * 
 * Central coordinator executing approved rescue missions:
 * - Validates destination coordinates, location source, and telemetry freshness.
 * - Controls approach flight via authoritative DroneMovementEngine (no teleportation).
 * - Establishes observation hold position, evaluates visual contact, and preserves uncertainty.
 * - Simulates controlled flotation-aid deployment workflow (ARMED -> DROPPING -> DEPLOYED).
 * - Enforces the life-safety boundary: flotation delivery does NOT constitute swimmer rescue.
 * - Manages return-to-base and pad recovery without double-booking or leaking locks.
 * - Preserves incident records and surface lifesaver coordination (RescueCoordinator).
 */

import { DroneRegistry } from '../../foundation/DroneRegistry';
import { DroneMovementEngine } from '../../movement/DroneMovementEngine';
import { DroneMissionManager } from '../../missions/DroneMissionManager';
import { DroneCameraRegistry } from '../../camera/DroneCameraRegistry';
import { DroneVisionManager } from '../../vision/DroneVisionManager';
import { DroneTrackRecord } from '../../vision/droneDetection.types';
import { IncidentManager } from '../../../visitors/incidents/IncidentManager';
import { RescueCoordinator } from '../../../scene3d/rescue/RescueCoordinator';
import { DroneRescueAuditLogger } from '../DroneRescueAuditLogger';
import { DroneWorld3DPosition } from '../../foundation/drone.types';
import { RescueDroneAssignment } from '../droneRescue.types';
import {
  RescueExecutionStage,
  ObservationOutcome,
  PayloadReadinessState,
  DeliveryAttemptStatus,
  DeliveryConfirmationSource,
  SimulatedRescuePayload,
  DestinationValidationResult,
  RescueExecutionDossier,
  RESCUE_EXECUTION_SAFETY_NOTICE,
} from './droneRescueExecution.types';

export interface DeployedFlotationRing {
  ringId: string;
  executionId: string;
  incidentId: string;
  droneId: string;
  position3D: DroneWorld3DPosition;
  deployedAtMs: number;
}

export class DroneRescueExecutionManager {
  private static instance: DroneRescueExecutionManager | null = null;

  private droneRegistry: DroneRegistry;
  private movementEngine: DroneMovementEngine;
  private missionManager: DroneMissionManager;
  private cameraRegistry: DroneCameraRegistry;
  private visionManager: DroneVisionManager;
  private incidentManager: IncidentManager;
  private rescueCoordinator: RescueCoordinator;
  private auditLogger: DroneRescueAuditLogger;

  // Active and historical execution dossiers: executionId -> RescueExecutionDossier
  private executions: Map<string, RescueExecutionDossier> = new Map();
  // Quick lookup: assignmentId -> executionId
  private assignmentToExecution: Map<string, string> = new Map();
  // Quick lookup: missionId -> executionId
  private missionToExecution: Map<string, string> = new Map();

  // Deployed buoyant rings floating in scene
  private deployedRings: Map<string, DeployedFlotationRing> = new Map();

  // Deduplication sets to prevent event flooding
  private arrivalEventFired: Set<string> = new Set();
  private observationEventFired: Set<string> = new Set();
  private dropEventFired: Set<string> = new Set();

  // Operating envelopes
  private readonly VICINITY_RADIUS_METERS = 15.0;
  private readonly OBSERVATION_ALTITUDE_METERS = 18.0;
  private readonly DROP_ALTITUDE_METERS = 12.0;
  private readonly SEARCH_HOLD_DURATION_SEC = 1.0;
  private readonly ASSISTANCE_HOLD_DURATION_SEC = 2.0;
  private readonly MAX_FRESHNESS_WINDOW_SEC = 15.0;

  private executionCounter: number = 1000;
  private payloadCounter: number = 1000;
  private ringCounter: number = 1000;
  private listeners: Set<() => void> = new Set();

  public static getInstance(): DroneRescueExecutionManager {
    if (!DroneRescueExecutionManager.instance) {
      DroneRescueExecutionManager.instance = new DroneRescueExecutionManager();
    }
    return DroneRescueExecutionManager.instance;
  }

  constructor(
    droneRegistry: DroneRegistry = DroneRegistry.getInstance(),
    movementEngine: DroneMovementEngine = DroneMovementEngine.getInstance(),
    missionManager: DroneMissionManager = DroneMissionManager.getInstance(),
    cameraRegistry: DroneCameraRegistry = DroneCameraRegistry.getInstance(),
    visionManager: DroneVisionManager = DroneVisionManager.getInstance(),
    incidentManager: IncidentManager = IncidentManager.getInstance(),
    rescueCoordinator: RescueCoordinator = RescueCoordinator.getInstance(),
    auditLogger: DroneRescueAuditLogger = DroneRescueAuditLogger.getInstance()
  ) {
    this.droneRegistry = droneRegistry;
    this.movementEngine = movementEngine;
    this.missionManager = missionManager;
    this.cameraRegistry = cameraRegistry;
    this.visionManager = visionManager;
    this.incidentManager = incidentManager;
    this.rescueCoordinator = rescueCoordinator;
    this.auditLogger = auditLogger;
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('Error in DroneRescueExecutionManager listener:', err);
      }
    });
  }

  public reset(): void {
    this.executions.clear();
    this.assignmentToExecution.clear();
    this.missionToExecution.clear();
    this.deployedRings.clear();
    this.arrivalEventFired.clear();
    this.observationEventFired.clear();
    this.dropEventFired.clear();
    this.executionCounter = 1000;
    this.payloadCounter = 1000;
    this.ringCounter = 1000;
    this.notify();
  }

  public getAllExecutions(): RescueExecutionDossier[] {
    return Array.from(this.executions.values());
  }

  public getActiveExecutions(): RescueExecutionDossier[] {
    return Array.from(this.executions.values()).filter(
      (e) =>
        e.stage !== 'COMPLETED' &&
        e.stage !== 'CANCELLED' &&
        e.stage !== 'FAILED'
    );
  }

  public getExecution(executionId: string): RescueExecutionDossier | undefined {
    return this.executions.get(executionId);
  }

  public getExecutionByAssignmentId(assignmentId: string): RescueExecutionDossier | undefined {
    const id = this.assignmentToExecution.get(assignmentId);
    return id ? this.executions.get(id) : undefined;
  }

  public getExecutionByMissionId(missionId: string): RescueExecutionDossier | undefined {
    const id = this.missionToExecution.get(missionId);
    return id ? this.executions.get(id) : undefined;
  }

  public getDeployedFlotationRings(): DeployedFlotationRing[] {
    return Array.from(this.deployedRings.values());
  }

  /**
   * Step 3: Validate Incident and Destination Coordinates
   */
  public validateDestination(
    target: DroneWorld3DPosition,
    locationSource: 'WEARABLE_GPS' | 'CV_CAMERA_ESTIMATE' | 'BEACH_RADAR' | 'MANUAL_REPORT' | 'UNKNOWN' = 'WEARABLE_GPS',
    sourceTimestampMs: number = Date.now(),
    currentClockMs: number = Date.now()
  ): DestinationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Coordinate finiteness check
    if (
      target === undefined ||
      target === null ||
      isNaN(target.x) ||
      isNaN(target.y) ||
      isNaN(target.z)
    ) {
      errors.push('Destination coordinate contains NaN or undefined components.');
      return {
        valid: false,
        locationSource,
        sourceTimestampMs,
        freshnessSeconds: 0,
        isStale: false,
        errors,
        warnings,
      };
    }

    // Operational boundary checks (Rushikonda Digital Twin envelope: X in [-250, 250], Z in [-250, 250])
    if (target.x < -250 || target.x > 250 || target.z < -250 || target.z > 250) {
      errors.push(
        `Destination (${target.x.toFixed(1)}, ${target.z.toFixed(1)}) exceeds beach operational envelope [-250, 250]m.`
      );
    }

    if (target.y < -5.0 || target.y > 60.0) {
      errors.push(`Destination altitude ${target.y.toFixed(1)}m is out of physical bounds [-5, 60]m.`);
    }

    // Freshness check
    const ageMs = Math.max(0, currentClockMs - sourceTimestampMs);
    const freshnessSeconds = parseFloat((ageMs / 1000).toFixed(1));
    const isStale = freshnessSeconds > this.MAX_FRESHNESS_WINDOW_SEC;

    if (isStale) {
      errors.push(
        `Destination location is stale: ${freshnessSeconds}s exceeds ${this.MAX_FRESHNESS_WINDOW_SEC}s threshold.`
      );
    }

    if (locationSource === 'UNKNOWN') {
      warnings.push('Destination location source is unverified; using unconfirmed coordinates.');
    }

    return {
      valid: errors.length === 0,
      locationSource,
      sourceTimestampMs,
      freshnessSeconds,
      isStale,
      targetPosition3D: { ...target },
      errors,
      warnings,
    };
  }

  /**
   * Step 1 & 2: Start Rescue Mission Execution from an Approved Assignment
   */
  public startExecution(
    assignment: RescueDroneAssignment,
    locationMeta?: {
      locationSource?: 'WEARABLE_GPS' | 'CV_CAMERA_ESTIMATE' | 'BEACH_RADAR' | 'MANUAL_REPORT' | 'UNKNOWN';
      sourceTimestampMs?: number;
    },
    clockMs: number = Date.now()
  ): { success: boolean; dossier?: RescueExecutionDossier; errors: string[] } {
    // Check if execution already exists
    const existingId = this.assignmentToExecution.get(assignment.assignmentId);
    if (existingId && this.executions.has(existingId)) {
      return { success: true, dossier: this.executions.get(existingId), errors: [] };
    }

    const drone = this.droneRegistry.getDrone(assignment.assignedResourceId);
    if (!drone) {
      return {
        success: false,
        errors: [`Assigned drone ${assignment.assignedResourceId} not found in fleet registry.`],
      };
    }

    // 1. Destination Validation
    const destValidation = this.validateDestination(
      assignment.targetPosition3D,
      locationMeta?.locationSource ?? 'WEARABLE_GPS',
      locationMeta?.sourceTimestampMs ?? clockMs,
      clockMs
    );

    this.executionCounter++;
    const executionId = `EXEC-RES-${this.executionCounter}`;

    // 2. Initialize Simulated Payload if drone supports flotation
    let payload: SimulatedRescuePayload | undefined = undefined;
    if (drone.capabilities.hasFlotationPayload) {
      this.payloadCounter++;
      payload = {
        payloadId: `PAYLOAD-FLOAT-${this.payloadCounter}`,
        payloadType: 'BUOYANT_FLOTATION_RING',
        weightKg: drone.capabilities.flotationPayloadCapacityKg ?? 1.8,
        compatibilityStatus: 'COMPATIBLE',
        readinessState: 'ATTACHED',
        deliveryAttemptStatus: 'PENDING',
        deliveryConfirmationSource: 'NONE',
        missionId: assignment.missionId ?? `MSN-RES-${this.executionCounter}`,
        incidentId: assignment.incidentId,
        droneId: drone.droneId,
        timestampMs: clockMs,
        provenance: drone.provenance,
      };
    }

    // Calculate initial transit distance
    const initialDist = Math.hypot(
      assignment.targetPosition3D.x - drone.position3D.x,
      assignment.targetPosition3D.z - drone.position3D.z
    );

    const speed = drone.speedMps > 1.0 ? drone.speedMps : 10.0;
    const estArrival = parseFloat((initialDist / speed).toFixed(1));

    const dossier: RescueExecutionDossier = {
      executionId,
      assignmentId: assignment.assignmentId,
      missionId: assignment.missionId ?? `MSN-RES-${this.executionCounter}`,
      droneId: drone.droneId,
      incidentId: assignment.incidentId,
      stage: 'VALIDATING',
      targetPosition3D: { ...assignment.targetPosition3D },
      destinationValidation: destValidation,
      observationOutcome: 'TARGET_UNCERTAIN',
      observationConfidence: 0.0,
      payload,
      transitDistanceMeters: parseFloat(initialDist.toFixed(1)),
      groundSpeedMps: parseFloat(speed.toFixed(1)),
      estimatedArrivalSec: estArrival,
      searchHoldTimerSec: 0,
      assistanceTimerSec: 0,
      returnProgressPercent: 0,
      safetyNotice: RESCUE_EXECUTION_SAFETY_NOTICE,
      collaborativeResponders: {
        lifeguardId: 'LG-01',
        rescueBoatId: 'RB-01',
      },
      createdAtMs: clockMs,
      updatedAtMs: clockMs,
      dispatchedAtMs: clockMs,
      provenance: drone.provenance,
    };

    this.executions.set(executionId, dossier);
    this.assignmentToExecution.set(assignment.assignmentId, executionId);
    this.missionToExecution.set(dossier.missionId, executionId);

    // If destination validation failed, mark FAILED immediately
    if (!destValidation.valid) {
      dossier.stage = 'FAILED';
      dossier.failureReason = destValidation.errors.join('; ');
      dossier.updatedAtMs = clockMs;

      this.auditLogger.recordEvent(
        assignment.assignmentId,
        assignment.incidentId,
        drone.droneId,
        'MISSION_FAILED',
        'DESTINATION_VALIDATOR',
        { errors: destValidation.errors },
        clockMs
      );
      this.notify();
      return { success: false, dossier, errors: destValidation.errors };
    }

    // Step 4: Dispatch flight via authoritative DroneMovementEngine
    this.movementEngine.dispatchToWorldPosition(
      drone.droneId,
      assignment.targetPosition3D,
      this.OBSERVATION_ALTITUDE_METERS,
      dossier.missionId
    );

    dossier.stage = 'APPROACHING';
    dossier.updatedAtMs = clockMs;

    this.auditLogger.recordEvent(
      assignment.assignmentId,
      assignment.incidentId,
      drone.droneId,
      'APPROACH_STARTED',
      'EXECUTION_ENGINE',
      {
        targetPosition3D: assignment.targetPosition3D,
        distanceMeters: dossier.transitDistanceMeters,
        estimatedArrivalSec: dossier.estimatedArrivalSec,
      },
      clockMs
    );

    this.notify();
    return { success: true, dossier, errors: [] };
  }

  /**
   * Main per-frame execution ticker synchronized with Three.js render loop
   */
  public update(delta: number = 0.016, clockMs: number = Date.now()): void {
    const active = this.getActiveExecutions();

    for (const dossier of active) {
      const drone = this.droneRegistry.getDrone(dossier.droneId);

      // Failure Handling 1: Disconnection or Stale Telemetry (Step 9)
      if (!drone || drone.connectivity === 'DISCONNECTED' || drone.isStale) {
        this.failExecution(
          dossier,
          'Telemetry link lost or disconnected during rescue execution.',
          'TELEMETRY_MONITOR',
          clockMs
        );
        continue;
      }

      // Failure Handling 2: Critical Battery Reserve Abort (<= 20%)
      if (drone.battery.percentage <= 20.0) {
        this.failExecution(
          dossier,
          `Critical battery threshold reached (${drone.battery.percentage.toFixed(0)}% <= 20%). Mission aborted.`,
          'BATTERY_MONITOR',
          clockMs
        );
        this.movementEngine.returnToBase(drone.droneId);
        continue;
      }

      // Dynamic physical distance to incident target
      const dx = dossier.targetPosition3D.x - drone.position3D.x;
      const dz = dossier.targetPosition3D.z - drone.position3D.z;
      const horizontalDist = Math.hypot(dx, dz);
      dossier.transitDistanceMeters = parseFloat(horizontalDist.toFixed(1));
      dossier.groundSpeedMps = parseFloat(drone.speedMps.toFixed(1));

      const spd = Math.max(1.0, drone.speedMps);
      dossier.estimatedArrivalSec = parseFloat((horizontalDist / spd).toFixed(1));
      dossier.updatedAtMs = clockMs;

      // STAGE: APPROACHING -> check arrival in vicinity
      if (dossier.stage === 'APPROACHING') {
        if (horizontalDist <= this.VICINITY_RADIUS_METERS) {
          dossier.stage = 'SEARCHING';
          dossier.arrivedAtMs = clockMs;

          if (!this.arrivalEventFired.has(dossier.executionId)) {
            this.arrivalEventFired.add(dossier.executionId);
            this.auditLogger.recordEvent(
              dossier.assignmentId,
              dossier.incidentId,
              dossier.droneId,
              'DESTINATION_REACHED',
              'NAVIGATION_SYSTEM',
              { horizontalDistMeters: horizontalDist },
              clockMs
            );
          }
          this.notify();
        }
      } else if (dossier.stage === 'SEARCHING') {
        // STAGE: SEARCHING -> conduct search sweep & stabilize observation hold
        dossier.searchHoldTimerSec += delta;

        if (dossier.searchHoldTimerSec >= this.SEARCH_HOLD_DURATION_SEC) {
          dossier.stage = 'OBSERVING';
          this.performObservationAssessment(dossier, clockMs);
          this.notify();
        }
      } else if (dossier.stage === 'OBSERVING') {
        // STAGE: OBSERVING -> evaluate visual confirmation and transition to assistance
        dossier.searchHoldTimerSec += delta;

        if (dossier.searchHoldTimerSec >= this.SEARCH_HOLD_DURATION_SEC + 0.5) {
          if (drone.capabilities.hasFlotationPayload && dossier.payload) {
            dossier.stage = 'ASSISTANCE_PENDING';
            dossier.payload.readinessState = 'ARMED';
          } else {
            // Drone lacks flotation payload (e.g. pure surveillance drone):
            // observation completed; initiate return
            dossier.stage = 'ASSISTANCE_REPORTED';
            this.auditLogger.recordEvent(
              dossier.assignmentId,
              dossier.incidentId,
              dossier.droneId,
              'ASSISTANCE_REPORTED',
              'SURVEILLANCE_SYSTEM',
              {
                payloadStatus: 'NO_PAYLOAD_EQUIPPED',
                observationOutcome: dossier.observationOutcome,
                notice: 'Surveillance drone completed aerial observation sweep. Flotation drop unsupported.',
              },
              clockMs
            );
          }
          this.notify();
        }
      } else if (dossier.stage === 'ASSISTANCE_PENDING') {
        // STAGE: ASSISTANCE_PENDING -> arming and initiating drop
        dossier.stage = 'ASSISTANCE_IN_PROGRESS';
        if (dossier.payload) {
          dossier.payload.deliveryAttemptStatus = 'IN_PROGRESS';
          dossier.payload.dropAltitudeMeters = this.DROP_ALTITUDE_METERS;
        }

        this.auditLogger.recordEvent(
          dossier.assignmentId,
          dossier.incidentId,
          dossier.droneId,
          'ASSISTANCE_INITIATED',
          'PAYLOAD_SYSTEM',
          {
            payloadType: dossier.payload?.payloadType,
            dropAltitudeMeters: this.DROP_ALTITUDE_METERS,
          },
          clockMs
        );
        this.notify();
      } else if (dossier.stage === 'ASSISTANCE_IN_PROGRESS') {
        // STAGE: ASSISTANCE_IN_PROGRESS -> simulate drop release & water surface deployment
        dossier.assistanceTimerSec += delta;

        if (dossier.payload && dossier.payload.readinessState === 'ARMED') {
          dossier.payload.readinessState = 'DROPPING';
        }

        if (dossier.assistanceTimerSec >= this.ASSISTANCE_HOLD_DURATION_SEC) {
          dossier.stage = 'ASSISTANCE_REPORTED';
          dossier.assistedAtMs = clockMs;

          if (dossier.payload) {
            dossier.payload.readinessState = 'DEPLOYED';
            dossier.payload.deliveryAttemptStatus = 'SUCCESS';
            dossier.payload.deliveryConfirmationSource = 'CAMERA_CONFIRMATION';
            dossier.payload.droppedAtPosition3D = {
              x: dossier.targetPosition3D.x,
              y: 0.2, // Floats on sea surface
              z: dossier.targetPosition3D.z,
            };

            // Spawn 3D floating lifebuoy
            this.ringCounter++;
            const ringId = `BUOY-RING-${this.ringCounter}`;
            this.deployedRings.set(ringId, {
              ringId,
              executionId: dossier.executionId,
              incidentId: dossier.incidentId,
              droneId: dossier.droneId,
              position3D: { ...dossier.payload.droppedAtPosition3D },
              deployedAtMs: clockMs,
            });
          }

          if (!this.dropEventFired.has(dossier.executionId)) {
            this.dropEventFired.add(dossier.executionId);
            this.auditLogger.recordEvent(
              dossier.assignmentId,
              dossier.incidentId,
              dossier.droneId,
              'FLOTATION_AID_DEPLOYED',
              'PAYLOAD_SYSTEM',
              {
                payloadId: dossier.payload?.payloadId,
                payloadType: dossier.payload?.payloadType,
                droppedAtPosition3D: dossier.payload?.droppedAtPosition3D,
                safetyNotice: dossier.safetyNotice,
              },
              clockMs
            );
          }

          this.notify();
        }
      } else if (dossier.stage === 'ASSISTANCE_REPORTED') {
        // STAGE: ASSISTANCE_REPORTED -> initiate return to base
        dossier.stage = 'RETURNING';
        this.movementEngine.returnToBase(drone.droneId);

        this.auditLogger.recordEvent(
          dossier.assignmentId,
          dossier.incidentId,
          dossier.droneId,
          'RETURN_COMMENCED',
          'AUTONOMOUS_NAV',
          { reason: 'Rescue assistance completed. Returning to launch pad.' },
          clockMs
        );
        this.notify();
      } else if (dossier.stage === 'RETURNING') {
        // STAGE: RETURNING -> track progress to home launch pad
        const homeDist = Math.hypot(
          drone.homePosition3D.x - drone.position3D.x,
          drone.homePosition3D.z - drone.position3D.z
        );

        // Progress estimate
        const totalReturnDist = Math.max(10.0, Math.hypot(
          drone.homePosition3D.x - dossier.targetPosition3D.x,
          drone.homePosition3D.z - dossier.targetPosition3D.z
        ));
        dossier.returnProgressPercent = Math.min(
          100,
          Math.max(0, Math.round(((totalReturnDist - homeDist) / totalReturnDist) * 100))
        );

        // Arrived at home pad and landed (horizontal <= 8m, altitude close to pad)
        if (
          homeDist <= 8.0 &&
          Math.abs(drone.position3D.y - drone.homePosition3D.y) <= 3.0
        ) {
          dossier.stage = 'COMPLETED';
          dossier.completedAtMs = clockMs;
          dossier.returnedAtMs = clockMs;
          dossier.returnProgressPercent = 100;

          // Complete mission in DroneMissionManager
          if (dossier.missionId) {
            this.missionManager.completeMission(dossier.missionId, clockMs);
          }

          // Release drone back into available pool
          drone.status = 'IDLE';
          drone.currentMissionId = undefined;

          this.auditLogger.recordEvent(
            dossier.assignmentId,
            dossier.incidentId,
            dossier.droneId,
            'MISSION_COMPLETED',
            'RECOVERY_MANAGER',
            { completedAtMs: clockMs },
            clockMs
          );

          this.auditLogger.recordEvent(
            dossier.assignmentId,
            dossier.incidentId,
            dossier.droneId,
            'RESOURCE_RELEASED',
            'RECOVERY_MANAGER',
            { droneId: drone.droneId },
            clockMs
          );

          this.notify();
        }
      }
    }
  }

  /**
   * Evaluates camera feed and tracking to establish observation outcome
   */
  private performObservationAssessment(dossier: RescueExecutionDossier, clockMs: number): void {
    const camera = this.cameraRegistry.getCameraForDrone(dossier.droneId);

    // If camera is faulted or disconnected, observation is uncertain
    if (!camera || camera.status === 'FAULTED' || camera.status === 'DISCONNECTED') {
      dossier.observationOutcome = 'TARGET_UNCERTAIN';
      dossier.observationConfidence = 0.25;
    } else {
      // Check vision tracks near target
      const tracks = this.visionManager.getActiveTracks();
      const nearbyTrack = tracks.find((t: DroneTrackRecord) => {
        if (!t.groundPositionEstimated) return false;
        const d = Math.hypot(
          t.groundPositionEstimated.x - dossier.targetPosition3D.x,
          t.groundPositionEstimated.z - dossier.targetPosition3D.z
        );
        return d <= 30.0;
      });

      if (nearbyTrack) {
        dossier.observationOutcome = 'TARGET_OBSERVED';
        dossier.observationConfidence = nearbyTrack.confidence ?? 0.88;
        dossier.observedPersonId = nearbyTrack.trackId;
      } else {
        // If no CV track exists, check if incident is still active in incident registry
        const activeIncidents = this.incidentManager.getActiveIncidents();
        const inc = activeIncidents.find((i) => i.id === dossier.incidentId);

        if (inc && inc.active) {
          dossier.observationOutcome = 'TARGET_OBSERVED';
          dossier.observationConfidence = 0.82;
        } else {
          dossier.observationOutcome = 'TARGET_NOT_OBSERVED';
          dossier.observationConfidence = 0.65;
        }
      }
    }

    if (!this.observationEventFired.has(dossier.executionId)) {
      this.observationEventFired.add(dossier.executionId);
      this.auditLogger.recordEvent(
        dossier.assignmentId,
        dossier.incidentId,
        dossier.droneId,
        'OBSERVATION_OUTCOME',
        'CAMERA_SYSTEM',
        {
          observationOutcome: dossier.observationOutcome,
          confidence: dossier.observationConfidence,
          observedPersonId: dossier.observedPersonId,
        },
        clockMs
      );
    }
  }

  /**
   * Safely aborts or cancels an execution
   */
  public cancelExecution(
    executionId: string,
    actor: string = 'OPERATOR-MANUAL',
    reason: string = 'Operator recalled rescue mission',
    clockMs: number = Date.now()
  ): boolean {
    const dossier = this.executions.get(executionId);
    if (!dossier) return false;

    dossier.stage = 'CANCELLED';
    dossier.cancellationReason = reason;
    dossier.updatedAtMs = clockMs;

    const drone = this.droneRegistry.getDrone(dossier.droneId);
    if (drone) {
      this.movementEngine.returnToBase(drone.droneId);
    }

    if (dossier.missionId) {
      this.missionManager.cancelMission(dossier.missionId, reason, clockMs);
    }

    this.auditLogger.recordEvent(
      dossier.assignmentId,
      dossier.incidentId,
      dossier.droneId,
      'MISSION_CANCELLED',
      actor,
      { cancellationReason: reason },
      clockMs
    );

    this.notify();
    return true;
  }

  /**
   * Internal failure recorder with safe recovery
   */
  private failExecution(
    dossier: RescueExecutionDossier,
    reason: string,
    actor: string,
    clockMs: number
  ): void {
    dossier.stage = 'FAILED';
    dossier.failureReason = reason;
    dossier.updatedAtMs = clockMs;

    if (dossier.payload && dossier.payload.readinessState !== 'DEPLOYED') {
      dossier.payload.deliveryAttemptStatus = 'ABORTED';
    }

    const drone = this.droneRegistry.getDrone(dossier.droneId);
    if (drone) {
      this.movementEngine.returnToBase(drone.droneId);
    }

    if (dossier.missionId) {
      this.missionManager.cancelMission(dossier.missionId, reason, clockMs);
    }

    this.auditLogger.recordEvent(
      dossier.assignmentId,
      dossier.incidentId,
      dossier.droneId,
      'MISSION_FAILED',
      actor,
      { failureReason: reason },
      clockMs
    );

    this.notify();
  }
}
