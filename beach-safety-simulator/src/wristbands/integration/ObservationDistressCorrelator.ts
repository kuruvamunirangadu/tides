/**
 * ObservationDistressCorrelator.ts
 * 
 * TIDES Phase 4: Camera & Drone Integration with the Wristband Safety System
 * 
 * Multi-sensor evidence associator and human-in-the-loop verification engine:
 * - Correlates fixed camera detections and aerial drone observations into candidate dossiers
 * - Computes composite confidence with multi-sensor corroboration boost (FUSED > single sensor)
 * - Assigns spatial uncertainty radius based on observation provenance
 * - Enforces strict human-in-the-loop state machine (PENDING_REVIEW -> VERIFIED / DISMISSED / MONITORING)
 * - On operator confirmation: creates authoritative incident in IncidentManager and triggers wristband warnings
 * - Preserves independent SOS inviolability (SOS triggers immediate emergency without waiting for CV)
 */

import { IncidentManager } from '../../visitors/incidents/IncidentManager';
import { DroneMissionManager } from '../../drones/missions/DroneMissionManager';
import { DroneRegistry } from '../../drones/foundation/DroneRegistry';
import {
  CameraObservation,
  CandidateDistressIncident,
  DroneObservationRecord,
  IntegrationAuditRecord,
  LocationProvenance,
  Phase4EventContract,
  VerificationState,
} from './integration.types';
import { IncidentSeverity } from '../../models/Incident';
import { WristbandWarningIntegrationService } from './WristbandWarningIntegrationService';

export class ObservationDistressCorrelator {
  private static instance: ObservationDistressCorrelator | null = null;

  private candidates: Map<string, CandidateDistressIncident> = new Map();
  private auditLogs: IntegrationAuditRecord[] = [];
  private eventListeners: Set<(event: Phase4EventContract) => void> = new Set();
  private changeListeners: Set<() => void> = new Set();
  private candidateCounter: number = 5000;
  private auditCounter: number = 8000;

  // Correlation thresholds
  public readonly SPATIAL_PROXIMITY_THRESHOLD_METERS = 35.0;
  public readonly TEMPORAL_WINDOW_MS = 20000;

  public static getInstance(): ObservationDistressCorrelator {
    if (!ObservationDistressCorrelator.instance) {
      ObservationDistressCorrelator.instance = new ObservationDistressCorrelator();
    }
    return ObservationDistressCorrelator.instance;
  }

  public reset(): void {
    this.candidates.clear();
    this.auditLogs = [];
    this.candidateCounter = 5000;
    this.auditCounter = 8000;
    this.notifyChange();
  }

  public subscribeChange(listener: () => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  public subscribeEvents(listener: (event: Phase4EventContract) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  private notifyChange(): void {
    this.changeListeners.forEach((l) => {
      try {
        l();
      } catch (err) {
        console.error('Error in Correlator change listener:', err);
      }
    });
  }

  private emitEvent(event: Phase4EventContract): void {
    this.eventListeners.forEach((l) => {
      try {
        l(event);
      } catch (err) {
        console.error('Error in Correlator event listener:', err);
      }
    });
  }

  public logAudit(record: Omit<IntegrationAuditRecord, 'auditId'>): IntegrationAuditRecord {
    this.auditCounter++;
    const fullRecord: IntegrationAuditRecord = {
      auditId: `AUD-${this.auditCounter}`,
      ...record,
    };
    this.auditLogs.unshift(fullRecord);
    if (this.auditLogs.length > 300) {
      this.auditLogs.pop();
    }
    return fullRecord;
  }

  public getAuditLogs(): IntegrationAuditRecord[] {
    return [...this.auditLogs];
  }

  public getAllCandidates(): CandidateDistressIncident[] {
    return Array.from(this.candidates.values());
  }

  public getPendingCandidates(): CandidateDistressIncident[] {
    return Array.from(this.candidates.values()).filter(
      (c) => c.verificationState === 'PENDING_REVIEW' || c.verificationState === 'MONITORING'
    );
  }

  public getCandidate(id: string): CandidateDistressIncident | undefined {
    return this.candidates.get(id);
  }

  /**
   * Correlates an ingested camera observation
   */
  public correlateCameraObservation(
    obs: CameraObservation,
    clockMs: number = Date.now()
  ): CandidateDistressIncident {
    // Only correlate distress-relevant classes
    const isDistressRelevant =
      obs.detectionClass === 'CANDIDATE_DISTRESS' ||
      obs.detectionClass === 'STRUGGLING_SWIMMER' ||
      obs.detectionClass === 'SWIMMER' ||
      obs.confidenceScore >= 0.70;

    if (!isDistressRelevant) {
      // Still log but don't create candidate dossier
      return null as any;
    }

    // Try finding an existing active candidate within spatial and temporal proximity
    const existing = this.findMatchingCandidate(obs.observationPosition, clockMs);

    if (existing) {
      // Corroborate existing candidate
      if (!existing.cameraObservationIds.includes(obs.observationId)) {
        existing.cameraObservationIds.push(obs.observationId);
      }

      // Recompute composite confidence and primary source
      this.recalculateCandidateDossier(existing, obs.confidenceScore, 'CAMERA', clockMs);
      this.logAudit({
        timestampMs: clockMs,
        action: 'OBSERVATION_INGESTED',
        candidateId: existing.candidateId,
        sourceId: obs.cameraId,
        details: `Correlated camera detection ${obs.observationId} (${obs.detectionClass}, conf: ${obs.confidenceScore}) with candidate ${existing.candidateId}`,
      });

      this.notifyChange();
      return existing;
    }

    // Create new candidate distress dossier
    this.candidateCounter++;
    const candidateId = `CND-${this.candidateCounter}`;
    const targetLoc = obs.observationPosition
      ? { x: obs.observationPosition.x, y: obs.observationPosition.y }
      : { x: 300, y: 150 }; // Default general surf area if uncalibrated

    const locProvenance: LocationProvenance = obs.observationPosition
      ? 'CAMERA_ESTIMATED'
      : 'GATEWAY_SECTOR';

    const uncertaintyRadius = obs.observationPosition ? 22.0 : 50.0;
    const severity: IncidentSeverity = obs.confidenceScore >= 0.85 ? 'CRITICAL' : 'HIGH';

    const candidate: CandidateDistressIncident = {
      candidateId,
      primarySource: 'CAMERA',
      cameraObservationIds: [obs.observationId],
      droneObservationIds: [],
      targetZoneId: this.inferZone(targetLoc.x, targetLoc.y),
      estimatedLocation: targetLoc,
      locationProvenance: locProvenance,
      spatialUncertaintyRadiusMeters: uncertaintyRadius,
      compositeConfidence: obs.confidenceScore,
      severity,
      verificationState: 'PENDING_REVIEW',
      warningDispatched: false,
      firstObservedAtMs: obs.eventTimestampMs,
      lastUpdatedAtMs: clockMs,
    };

    this.candidates.set(candidateId, candidate);

    this.logAudit({
      timestampMs: clockMs,
      action: 'CANDIDATE_CREATED',
      candidateId,
      sourceId: obs.cameraId,
      details: `New candidate distress ${candidateId} created from camera ${obs.cameraId} (${obs.detectionClass}, conf: ${obs.confidenceScore})`,
    });

    this.emitEvent({
      eventId: `EVT-CND-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      eventType: 'CandidateDistressCreated',
      timestampMs: clockMs,
      sourceId: obs.cameraId,
      correlationId: candidateId,
      payload: { ...candidate },
    });

    this.notifyChange();
    return candidate;
  }

  /**
   * Correlates an aerial drone observation
   */
  public correlateDroneObservation(
    obs: DroneObservationRecord,
    clockMs: number = Date.now()
  ): CandidateDistressIncident {
    const targetLoc = obs.estimatedObservationLocation
      ? { x: obs.estimatedObservationLocation.x, y: obs.estimatedObservationLocation.y }
      : { x: obs.timestampedDronePosition.x, y: obs.timestampedDronePosition.z };

    const existing = this.findMatchingCandidate(targetLoc, clockMs);

    if (existing) {
      if (!existing.droneObservationIds.includes(obs.observationId)) {
        existing.droneObservationIds.push(obs.observationId);
      }

      this.recalculateCandidateDossier(existing, obs.confidenceScore, 'DRONE', clockMs);

      this.logAudit({
        timestampMs: clockMs,
        action: 'OBSERVATION_INGESTED',
        candidateId: existing.candidateId,
        sourceId: obs.droneId,
        details: `Correlated aerial observation ${obs.observationId} (${obs.droneId}, conf: ${obs.confidenceScore}) with candidate ${existing.candidateId}`,
      });

      this.notifyChange();
      return existing;
    }

    this.candidateCounter++;
    const candidateId = `CND-${this.candidateCounter}`;

    const candidate: CandidateDistressIncident = {
      candidateId,
      primarySource: 'DRONE',
      cameraObservationIds: [],
      droneObservationIds: [obs.observationId],
      targetZoneId: this.inferZone(targetLoc.x, targetLoc.y),
      estimatedLocation: targetLoc,
      locationProvenance: 'DRONE_GIMBAL_ESTIMATED',
      spatialUncertaintyRadiusMeters: 12.0,
      compositeConfidence: obs.confidenceScore,
      severity: obs.confidenceScore >= 0.85 ? 'CRITICAL' : 'HIGH',
      verificationState: 'PENDING_REVIEW',
      warningDispatched: false,
      firstObservedAtMs: obs.telemetryTimestampMs,
      lastUpdatedAtMs: clockMs,
    };

    this.candidates.set(candidateId, candidate);

    this.logAudit({
      timestampMs: clockMs,
      action: 'CANDIDATE_CREATED',
      candidateId,
      sourceId: obs.droneId,
      details: `New candidate distress ${candidateId} created from drone ${obs.droneId} (conf: ${obs.confidenceScore})`,
    });

    this.emitEvent({
      eventId: `EVT-CND-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      eventType: 'CandidateDistressCreated',
      timestampMs: clockMs,
      sourceId: obs.droneId,
      correlationId: candidateId,
      payload: { ...candidate },
    });

    this.notifyChange();
    return candidate;
  }

  /**
   * Recalculates confidence and provenance when new evidence is added
   */
  private recalculateCandidateDossier(
    candidate: CandidateDistressIncident,
    newConfidence: number,
    source: 'CAMERA' | 'DRONE',
    clockMs: number
  ): void {
    candidate.lastUpdatedAtMs = clockMs;

    const hasCamera = candidate.cameraObservationIds.length > 0;
    const hasDrone = candidate.droneObservationIds.length > 0;

    if (hasCamera && hasDrone) {
      candidate.primarySource = 'FUSED';
      candidate.locationProvenance = 'FUSED_ESTIMATED';
      candidate.spatialUncertaintyRadiusMeters = 8.0;

      // Multi-sensor corroboration boost: combines confidence and adds corroboration bonus
      const baseMax = Math.max(candidate.compositeConfidence, newConfidence);
      const corroborationBonus = 0.18;
      candidate.compositeConfidence = Math.min(0.99, Math.round((baseMax + corroborationBonus) * 100) / 100);
      candidate.severity = 'CRITICAL';
    } else {
      candidate.compositeConfidence = Math.max(candidate.compositeConfidence, newConfidence);
    }
  }

  private findMatchingCandidate(
    pos?: { x: number; y: number },
    clockMs: number = Date.now()
  ): CandidateDistressIncident | undefined {
    if (!pos) return undefined;

    for (const candidate of this.candidates.values()) {
      if (candidate.verificationState === 'DISMISSED') continue;

      // Temporal check
      if (clockMs - candidate.lastUpdatedAtMs > this.TEMPORAL_WINDOW_MS) continue;

      // Spatial distance check
      const dx = candidate.estimatedLocation.x - pos.x;
      const dy = candidate.estimatedLocation.y - pos.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= this.SPATIAL_PROXIMITY_THRESHOLD_METERS) {
        return candidate;
      }
    }
    return undefined;
  }

  private inferZone(x: number, y: number): string {
    if (x < 350) return 'SWIM_ZONE_NORTH';
    if (x < 650) return 'CENTRAL_SURF';
    return 'RIP_CURRENT_CORRIDOR_SOUTH';
  }

  // =========================================================================
  // Human-In-The-Loop Operator Actions
  // =========================================================================

  /**
   * Action 1: Confirm Distress
   * Promotes candidate to authoritative IncidentManager incident and dispatches wristband warnings
   */
  public confirmDistress(
    candidateId: string,
    operatorId: string,
    rationale: string,
    clockMs: number = Date.now()
  ): { success: boolean; incidentId?: string; error?: string } {
    const candidate = this.candidates.get(candidateId);
    if (!candidate) {
      return { success: false, error: `Candidate ${candidateId} not found` };
    }

    if (candidate.verificationState === 'VERIFIED') {
      return { success: false, error: `Candidate ${candidateId} is already verified` };
    }

    // 1. Transition state machine
    candidate.verificationState = 'VERIFIED';
    candidate.operatorDecision = {
      decision: 'CONFIRM',
      operatorId,
      timestampMs: clockMs,
      rationale,
    };

    // 2. Authoritative Incident Creation in IncidentManager
    const incMgr = IncidentManager.getInstance();
    const createdIncident = incMgr.createIncident(
      'DISTRESS',
      [], // No specific visitor ID required for aerial vision candidate
      candidate.targetZoneId,
      candidate.severity,
      `Verified Distress (${candidate.primarySource} Corroborated)`,
      `Human operator ${operatorId} verified distress at (${Math.round(candidate.estimatedLocation.x)}, ${Math.round(candidate.estimatedLocation.y)}). Rationale: ${rationale}`,
      { x: candidate.estimatedLocation.x, y: candidate.estimatedLocation.y },
      clockMs
    );

    candidate.createdIncidentId = createdIncident.id;

    // 3. Dispatch Localized Wristband Warnings
    const warningService = WristbandWarningIntegrationService.getInstance();
    const warningDispatch = warningService.dispatchWarningForDistress(
      candidate,
      createdIncident.id,
      clockMs
    );
    candidate.warningDispatched = warningDispatch.success;

    // 4. Audit Log
    this.logAudit({
      timestampMs: clockMs,
      action: 'OPERATOR_VERIFIED',
      operatorId,
      candidateId,
      incidentId: createdIncident.id,
      sourceId: operatorId,
      details: `Operator confirmed distress for candidate ${candidateId}. Authoritative incident ${createdIncident.id} generated. Localized warnings queued.`,
    });

    this.emitEvent({
      eventId: `EVT-VER-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      eventType: 'IncidentVerificationChanged',
      timestampMs: clockMs,
      sourceId: operatorId,
      correlationId: candidateId,
      payload: {
        candidateId,
        verificationState: 'VERIFIED',
        createdIncidentId: createdIncident.id,
        rationale,
      },
    });

    this.notifyChange();
    return { success: true, incidentId: createdIncident.id };
  }

  /**
   * Action 2: Dismiss Observation
   * Rejects candidate with rationale without generating an emergency incident
   */
  public dismissObservation(
    candidateId: string,
    operatorId: string,
    rationale: string,
    clockMs: number = Date.now()
  ): { success: boolean; error?: string } {
    const candidate = this.candidates.get(candidateId);
    if (!candidate) {
      return { success: false, error: `Candidate ${candidateId} not found` };
    }

    candidate.verificationState = 'DISMISSED';
    candidate.operatorDecision = {
      decision: 'DISMISS',
      operatorId,
      timestampMs: clockMs,
      rationale,
    };

    this.logAudit({
      timestampMs: clockMs,
      action: 'OPERATOR_DISMISSED',
      operatorId,
      candidateId,
      sourceId: operatorId,
      details: `Operator ${operatorId} dismissed candidate ${candidateId}. Rationale: ${rationale}`,
    });

    this.emitEvent({
      eventId: `EVT-DIS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      eventType: 'IncidentVerificationChanged',
      timestampMs: clockMs,
      sourceId: operatorId,
      correlationId: candidateId,
      payload: {
        candidateId,
        verificationState: 'DISMISSED',
        rationale,
      },
    });

    this.notifyChange();
    return { success: true };
  }

  /**
   * Action 3: Request Drone Closer Look
   * Dispatches surveillance drone observation mission to candidate location
   */
  public requestDroneCloserLook(
    candidateId: string,
    operatorId: string,
    preferredDroneId?: string,
    clockMs: number = Date.now()
  ): { success: boolean; missionId?: string; assignedDroneId?: string; error?: string } {
    const candidate = this.candidates.get(candidateId);
    if (!candidate) {
      return { success: false, error: `Candidate ${candidateId} not found` };
    }

    const registry = DroneRegistry.getInstance();
    const missionManager = DroneMissionManager.getInstance();

    let droneId = preferredDroneId;
    if (!droneId) {
      // Find eligible available drone with surveillance capability
      const candidates = registry.getAllDrones().filter(
        (d) =>
          d.connectivity === 'CONNECTED' &&
          d.battery.percentage >= 25 &&
          (d.role === 'SURVEILLANCE' || d.role === 'MULTI_ROLE') &&
          d.status !== 'OFFLINE' &&
          d.status !== 'RETURNING' &&
          !d.currentMissionId
      );
      if (candidates.length > 0) {
        droneId = candidates[0].droneId;
      } else {
        // Fallback to DRONE-01 or DRONE-02
        droneId = 'DRONE-01';
      }
    }

    // Convert beach canvas coordinates (x: 0..800, y: 0..600) to 3D world bounds (x: -150..150, z: -150..50)
    const worldX = ((candidate.estimatedLocation.x - 400) / 400) * 140;
    const worldZ = ((candidate.estimatedLocation.y - 300) / 300) * 80 - 30;
    const target3D = {
      x: Math.max(-180, Math.min(180, Math.round(worldX * 10) / 10)),
      y: 25.0, // Safe flight altitude
      z: Math.max(-180, Math.min(80, Math.round(worldZ * 10) / 10)),
    };

    const missionResult = missionManager.createMission(
      {
        droneId,
        type: 'OBSERVATION',
        targetPosition3D: target3D,
        targetAltitudeMeters: 25.0,
        observationDurationSec: 30.0,
        notes: `Close-look aerial inspection for Candidate ${candidateId} requested by ${operatorId}`,
      },
      clockMs
    );

    if (!missionResult.success) {
      return {
        success: false,
        error: `Could not dispatch drone mission: ${missionResult.errors.join(', ')}`,
      };
    }

    candidate.verificationState = 'MONITORING';
    candidate.operatorDecision = {
      decision: 'REQUEST_OBSERVATION',
      operatorId,
      timestampMs: clockMs,
      rationale: `Dispatched ${droneId} for close inspection`,
      assignedDroneId: droneId,
    };

    const missionId = missionResult.mission?.missionId;
    if (missionId) {
      missionManager.acceptMission(missionId, clockMs);
    }

    this.logAudit({
      timestampMs: clockMs,
      action: 'DRONE_INSPECT_REQUESTED',
      operatorId,
      candidateId,
      sourceId: droneId,
      details: `Operator ${operatorId} dispatched drone ${droneId} (Mission ${missionId}) to inspect candidate ${candidateId}`,
    });

    this.notifyChange();
    return { success: true, missionId, assignedDroneId: droneId };
  }

  /**
   * Independent SOS Inviolability:
   * Direct SOS bypasses candidate verification queue and creates authoritative incident immediately
   */
  public handleIndependentSOS(
    wristbandId: string,
    location: { x: number; y: number },
    zoneId: string,
    callerId: string = 'SWIMMER_SOS',
    clockMs: number = Date.now()
  ): string {
    const incMgr = IncidentManager.getInstance();
    const incident = incMgr.createIncident(
      'DISTRESS',
      [],
      zoneId,
      'CRITICAL',
      `Emergency SOS Alert (${wristbandId})`,
      `Immediate life-safety SOS triggered by wristband ${wristbandId} at (${Math.round(location.x)}, ${Math.round(location.y)}). Direct emergency dispatch.`,
      { x: location.x, y: location.y },
      clockMs
    );

    // Trigger wristband warnings immediately
    const warningService = WristbandWarningIntegrationService.getInstance();
    warningService.dispatchWarningForSOS(wristbandId, location, zoneId, incident.id, clockMs);

    this.logAudit({
      timestampMs: clockMs,
      action: 'OPERATOR_VERIFIED',
      operatorId: callerId,
      incidentId: incident.id,
      sourceId: wristbandId,
      details: `Independent SOS from ${wristbandId} escalated directly to authoritative incident ${incident.id} without waiting for CV verification.`,
    });

    this.notifyChange();
    return incident.id;
  }
}
