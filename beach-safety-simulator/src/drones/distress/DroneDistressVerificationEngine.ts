/**
 * DroneDistressVerificationEngine.ts
 * 
 * TIDES Drone Phase 7: Distress Verification & Incident Integration Engine
 * 
 * Core Orchestrator for Phase 7:
 * - Coordinates Intake, Validation, Evidence Correlation, and Human Verification.
 * - Integrates verified incidents with authoritative IncidentManager & RescueCoordinator.
 * - Enforces zero duplicate incident registries and zero duplicate rescue engines.
 * - Preserves immediate emergency escalation for explicit SOS events without waiting for CV.
 * - Enforces operator verification before any aerial CV candidate triggers rescue dispatch.
 */

import {
  CandidateDistressDossier,
  DroneVerificationStatus,
  ExplicitSOSEvent,
  OperatorDecisionRecord,
  ValidatedCandidateObservation,
} from './droneDistress.types';
import { DroneDistressIntakeManager } from './DroneDistressIntakeManager';
import { DroneDistressCorrelator } from './DroneDistressCorrelator';
import { DroneDistressAuditLogger } from './DroneDistressAuditLogger';
import { IncidentManager } from '../../visitors/incidents/IncidentManager';
import { RescueCoordinator } from '../../scene3d/rescue/RescueCoordinator';
import { DistressIncidentEvent } from '../../scene3d/hazards/rip3d.types';
import { Incident } from '../../models/Incident';

export class DroneDistressVerificationEngine {
  private static instance: DroneDistressVerificationEngine | null = null;

  private readonly intakeManager: DroneDistressIntakeManager;
  private readonly correlator: DroneDistressCorrelator;
  private readonly auditLogger: DroneDistressAuditLogger;

  // Authoritative incident system references
  private incidentManager: IncidentManager;
  private rescueCoordinator: RescueCoordinator;

  // Active verified incidents created through this engine: incidentId -> dossierId
  private verifiedIncidentsMap: Map<string, string> = new Map();

  // Listeners for UI state updates
  private changeListeners: Set<() => void> = new Set();

  public static getInstance(): DroneDistressVerificationEngine {
    if (!DroneDistressVerificationEngine.instance) {
      DroneDistressVerificationEngine.instance = new DroneDistressVerificationEngine();
    }
    return DroneDistressVerificationEngine.instance;
  }

  constructor(
    incidentManager: IncidentManager = IncidentManager.getInstance(),
    rescueCoordinator: RescueCoordinator = RescueCoordinator.getInstance()
  ) {
    this.intakeManager = DroneDistressIntakeManager.getInstance();
    this.correlator = DroneDistressCorrelator.getInstance();
    this.auditLogger = DroneDistressAuditLogger.getInstance();
    this.incidentManager = incidentManager;
    this.rescueCoordinator = rescueCoordinator;
  }

  public reset(): void {
    this.intakeManager.reset();
    this.correlator.reset();
    this.auditLogger.reset();
    this.verifiedIncidentsMap.clear();
    this.notifyListeners();
  }

  public subscribe(listener: () => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  private notifyListeners(): void {
    this.changeListeners.forEach((l) => {
      try {
        l();
      } catch (err) {
        console.error('Error in DroneDistressVerificationEngine listener:', err);
      }
    });
  }

  /**
   * Main entrypoint to process an incoming candidate observation:
   * 1. Validates payload via IntakeManager.
   * 2. Correlates evidence via DroneDistressCorrelator.
   * 3. Stages CandidateDistressDossier for operator review.
   */
  public processObservation(rawObservation: any, receiptTimeMs: number = Date.now()): {
    status: 'ACCEPTED' | 'REJECTED' | 'DUPLICATE' | 'DELAYED';
    dossier?: CandidateDistressDossier;
    message: string;
  } {
    // Step 1: Intake & Validation
    const intakeResult = this.intakeManager.ingestObservation(rawObservation, receiptTimeMs);
    if (intakeResult.status === 'REJECTED' || intakeResult.status === 'DUPLICATE') {
      return { status: intakeResult.status, message: intakeResult.message };
    }

    const validRecord = intakeResult.record!;

    // Step 2: Evidence Correlation
    const dossier = this.correlator.correlate(validRecord, this.incidentManager);

    // If observation matches an existing incident, update validated record
    if (dossier.isNearExistingIncident && dossier.existingIncidentId) {
      validRecord.verificationStatus = 'DUPLICATE_OBSERVATION';
      validRecord.associatedIncidentId = dossier.existingIncidentId;
    } else {
      validRecord.verificationStatus = 'AWAITING_VERIFICATION';
    }

    this.notifyListeners();
    return {
      status: intakeResult.status,
      dossier,
      message: `Candidate observation staged as dossier ${dossier.dossierId} (${dossier.verificationStatus}).`,
    };
  }

  /**
   * Operator Verification Action: Confirm candidate observation as a real incident.
   * Creates or escalates an incident in authoritative IncidentManager and alerts RescueCoordinator.
   */
  public verifyCandidate(
    dossierId: string,
    operatorId: string = 'OP-COMMAND-01',
    reason: string = 'Visual operator verification confirmed swimmer distress in rip corridor.',
    currentTimeSec: number = performance.now() / 1000
  ): { success: boolean; incident?: Incident; message: string } {
    const dossier = this.correlator.getDossier(dossierId);
    if (!dossier) {
      return { success: false, message: `Dossier ${dossierId} not found.` };
    }

    if (dossier.verificationStatus === 'VERIFIED_INCIDENT') {
      return { success: false, message: `Dossier ${dossierId} is already verified.` };
    }

    const decision: OperatorDecisionRecord = {
      operatorId,
      decision: 'VERIFY',
      reason,
      decisionTimestampMs: Date.now(),
    };

    let incident: Incident;
    const scenePos = dossier.scenePosition || { x: 420, y: 0, z: -5 };
    const zoneId = dossier.hazardZoneId || 'SZ-02';

    if (dossier.existingIncidentId) {
      // Correlated with existing incident -> Link rather than duplicate!
      const existing = this.incidentManager.getActiveIncidents().find((i) => i.id === dossier.existingIncidentId);
      if (existing) {
        incident = existing;
        existing.description += ` [Verified by aerial observation ${dossier.candidateObservationId} / ${operatorId}]`;
      } else {
        // Fallback: create fresh incident
        incident = this.incidentManager.createIncident(
          'DISTRESS',
          [dossier.trackingId || 'CV-TARGET'],
          zoneId,
          'CRITICAL',
          `Verified Aerial Distress (${dossier.droneId})`,
          `Operator-verified aerial candidate ${dossier.candidateObservationId}. ${reason}`,
          { x: scenePos.x, y: scenePos.z },
          currentTimeSec
        );
      }
    } else {
      // Create fresh authoritative incident
      incident = this.incidentManager.createIncident(
        'DISTRESS',
        [dossier.trackingId || 'CV-TARGET'],
        zoneId,
        'CRITICAL',
        `Verified Aerial Distress (${dossier.droneId})`,
        `Operator-verified aerial candidate ${dossier.candidateObservationId}. ${reason}`,
        { x: scenePos.x, y: scenePos.z },
        currentTimeSec
      );
    }

    decision.resultingIncidentId = incident.id;
    dossier.verificationStatus = 'VERIFIED_INCIDENT';
    dossier.operatorDecision = decision;
    dossier.existingIncidentId = incident.id;
    dossier.updatedAtMs = Date.now();

    this.verifiedIncidentsMap.set(incident.id, dossierId);

    // Pass verified incident to existing 3D RescueCoordinator if available
    const distressEvent: DistressIncidentEvent = {
      incidentId: incident.id,
      visitorId: dossier.trackingId || 'CV-TARGET',
      visitorName: `Tracked Person (${dossier.trackingId || 'Bather'})`,
      hazardId: zoneId,
      hazardType: 'RIP_CURRENT',
      onsetSimTime: currentTimeSec,
      timeDisplay: new Date().toLocaleTimeString(),
      position3D: { x: scenePos.x, y: 0.5, z: scenePos.z },
      position2D: { x: scenePos.x, y: scenePos.z },
      stage: 'ALERT_ISSUED',
      severity: 'CRITICAL',
      description: incident.description,
      resolved: false,
    };

    if (this.rescueCoordinator.autoDispatchEnabled) {
      this.rescueCoordinator.handleDistressIncident(distressEvent, [], {
        id: 'rushikonda-main',
        name: 'Rushikonda Beach',
        width: 1000,
        height: 400,
        shorelineY: 150,
        zones: [],
        lifeguardStations: [],
        emergencyPoints: [],
      });
    }

    this.auditLogger.log(
      'INCIDENT_ESCALATED',
      operatorId,
      incident.id,
      `Operator verified candidate observation ${dossier.candidateObservationId}. Incident ${incident.id} created/escalated.`,
      { dossierId, incidentId: incident.id, reason }
    );

    this.notifyListeners();
    return {
      success: true,
      incident,
      message: `Incident ${incident.id} successfully verified and escalated.`,
    };
  }

  /**
   * Operator Verification Action: Dismiss candidate as false alarm.
   */
  public dismissCandidate(
    dossierId: string,
    operatorId: string = 'OP-COMMAND-01',
    reason: string = 'Benign swimmer observed. Normal swimming posture, no distress evident.'
  ): { success: boolean; message: string } {
    const dossier = this.correlator.getDossier(dossierId);
    if (!dossier) {
      return { success: false, message: `Dossier ${dossierId} not found.` };
    }

    const decision: OperatorDecisionRecord = {
      operatorId,
      decision: 'DISMISS',
      reason,
      decisionTimestampMs: Date.now(),
    };

    dossier.verificationStatus = 'DISMISSED_CANDIDATE';
    dossier.operatorDecision = decision;
    dossier.updatedAtMs = Date.now();

    this.auditLogger.log(
      'VERIFICATION_DECIDED',
      operatorId,
      dossierId,
      `Candidate observation ${dossier.candidateObservationId} dismissed: ${reason}`,
      { dossierId, decision }
    );

    this.notifyListeners();
    return { success: true, message: `Dossier ${dossierId} dismissed.` };
  }

  /**
   * Operator Verification Action: Mark observation as duplicate of existing incident.
   */
  public markDuplicate(
    dossierId: string,
    targetIncidentId: string,
    operatorId: string = 'OP-COMMAND-01',
    reason: string = 'Confirmed observation belongs to active incident already under response.'
  ): { success: boolean; message: string } {
    const dossier = this.correlator.getDossier(dossierId);
    if (!dossier) {
      return { success: false, message: `Dossier ${dossierId} not found.` };
    }

    const decision: OperatorDecisionRecord = {
      operatorId,
      decision: 'MARK_DUPLICATE',
      reason,
      decisionTimestampMs: Date.now(),
      resultingIncidentId: targetIncidentId,
    };

    dossier.verificationStatus = 'DUPLICATE_OBSERVATION';
    dossier.existingIncidentId = targetIncidentId;
    dossier.operatorDecision = decision;
    dossier.updatedAtMs = Date.now();

    this.auditLogger.log(
      'INCIDENT_LINKED',
      operatorId,
      dossierId,
      `Observation ${dossier.candidateObservationId} marked duplicate of incident ${targetIncidentId}.`,
      { dossierId, targetIncidentId, reason }
    );

    this.notifyListeners();
    return { success: true, message: `Dossier ${dossierId} marked as duplicate of ${targetIncidentId}.` };
  }

  /**
   * Explicit SOS Emergency Intake:
   * CRITICAL PRINCIPLE: Bypasses CV confirmation; immediately executes emergency response.
   */
  public handleExplicitSOS(
    sos: ExplicitSOSEvent,
    currentTimeSec: number = performance.now() / 1000
  ): Incident {
    // 1. Register SOS in correlator
    this.correlator.registerExplicitSOS(sos);

    // 2. Direct creation in authoritative IncidentManager
    const incident = this.incidentManager.createIncident(
      'DISTRESS',
      [sos.visitorId || 'SOS-USER'],
      'SZ-02',
      'CRITICAL',
      `EXPLICIT SOS ALERT (${sos.source})`,
      `Immediate emergency beacon triggered via ${sos.source}. Bypassed CV verification gate.`,
      { x: sos.scenePosition.x, y: sos.scenePosition.z },
      currentTimeSec
    );

    // 3. Direct dispatch in RescueCoordinator
    const distressEvent: DistressIncidentEvent = {
      incidentId: incident.id,
      visitorId: sos.visitorId || 'SOS-USER',
      visitorName: `SOS Caller (${sos.source})`,
      hazardId: 'SZ-02',
      hazardType: 'RIP_CURRENT',
      onsetSimTime: currentTimeSec,
      timeDisplay: new Date().toLocaleTimeString(),
      position3D: { ...sos.scenePosition },
      position2D: { x: sos.scenePosition.x, y: sos.scenePosition.z },
      stage: 'ALERT_ISSUED',
      severity: 'CRITICAL',
      description: incident.description,
      resolved: false,
    };

    if (this.rescueCoordinator.autoDispatchEnabled) {
      this.rescueCoordinator.handleDistressIncident(distressEvent, [], {
        id: 'rushikonda-main',
        name: 'Rushikonda Beach',
        width: 1000,
        height: 400,
        shorelineY: 150,
        zones: [],
        lifeguardStations: [],
        emergencyPoints: [],
      });
    }

    this.auditLogger.log(
      'EXPLICIT_SOS_PROCESSED',
      sos.source,
      incident.id,
      `Direct emergency response initiated for SOS ${sos.sosId}. Bypassed CV.`,
      { sosId: sos.sosId, incidentId: incident.id }
    );

    this.notifyListeners();
    return incident;
  }

  // Accessors
  public getIntakeManager(): DroneDistressIntakeManager {
    return this.intakeManager;
  }

  public getCorrelator(): DroneDistressCorrelator {
    return this.correlator;
  }

  public getAuditLogger(): DroneDistressAuditLogger {
    return this.auditLogger;
  }

  public getPendingDossiers(): CandidateDistressDossier[] {
    return this.correlator.getPendingDossiers();
  }

  public getAllDossiers(): CandidateDistressDossier[] {
    return this.correlator.getAllDossiers();
  }
}
