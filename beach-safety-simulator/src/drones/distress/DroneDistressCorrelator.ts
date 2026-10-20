/**
 * DroneDistressCorrelator.ts
 * 
 * TIDES Drone Phase 7: Multi-Source Evidence Correlation Engine
 * 
 * Correlates validated candidate observations with:
 * 1. Repeated observations of the same temporary track.
 * 2. Drone flight status and telemetry freshness from DroneRegistry.
 * 3. Spatial hazard-zone membership (Rip current corridors, restricted zones).
 * 4. Explicit wristband / beachgoer SOS events.
 * 5. Existing open incidents in the authoritative IncidentManager.
 * 
 * Strict Safety Rules:
 * - Do NOT treat two temporary tracking IDs as the same person merely because they are similar.
 * - Do NOT assume that detection confidence measures drowning probability.
 * - Do NOT invent evidence when a source is unavailable.
 * - Preserve independent incidents involving different locations or people.
 */

import {
  ValidatedCandidateObservation,
  CandidateDistressDossier,
  ExplicitSOSEvent,
} from './droneDistress.types';
import { DroneRegistry } from '../foundation/DroneRegistry';
import { IncidentManager } from '../../visitors/incidents/IncidentManager';
import { DroneDistressAuditLogger } from './DroneDistressAuditLogger';

export interface CorrelationConfig {
  spatialToleranceMeters: number; // Max distance to associate with existing incident (default 25.0m)
  temporalToleranceMs: number;    // Max age difference to associate with incident (default 45000ms)
  sosCorrelationRadiusMeters: number; // Max distance to correlate explicit SOS (default 40.0m)
  ripCurrentCorridorXMin: number;
  ripCurrentCorridorXMax: number;
  ripCurrentCorridorZMax: number; // Z <= 15m in Three.js coordinates is in water
}

export class DroneDistressCorrelator {
  private static instance: DroneDistressCorrelator | null = null;
  private readonly auditLogger: DroneDistressAuditLogger;

  private config: CorrelationConfig = {
    spatialToleranceMeters: 25.0,
    temporalToleranceMs: 45000,
    sosCorrelationRadiusMeters: 40.0,
    ripCurrentCorridorXMin: 360,
    ripCurrentCorridorXMax: 480,
    ripCurrentCorridorZMax: 15,
  };

  // Active dossiers map: dossierId -> CandidateDistressDossier
  private dossiers: Map<string, CandidateDistressDossier> = new Map();
  // Map of candidateObservationId -> dossierId
  private obsToDossierMap: Map<string, string> = new Map();
  // Track observation repetition: trackId -> count of observations
  private trackObservationCounts: Map<string, number> = new Map();

  // Explicit SOS event registry
  private activeSOSEvents: Map<string, ExplicitSOSEvent> = new Map();

  private dossierCounter: number = 1000;

  public static getInstance(): DroneDistressCorrelator {
    if (!DroneDistressCorrelator.instance) {
      DroneDistressCorrelator.instance = new DroneDistressCorrelator();
    }
    return DroneDistressCorrelator.instance;
  }

  constructor() {
    this.auditLogger = DroneDistressAuditLogger.getInstance();
    this.reset();
  }

  public reset(): void {
    this.dossiers.clear();
    this.obsToDossierMap.clear();
    this.trackObservationCounts.clear();
    this.activeSOSEvents.clear();
    this.dossierCounter = 1000;
  }

  public setConfig(custom: Partial<CorrelationConfig>): void {
    this.config = { ...this.config, ...custom };
  }

  public getConfig(): CorrelationConfig {
    return { ...this.config };
  }

  /**
   * Registers an explicit SOS event (e.g. from smart wristband, manual SOS pole, or visitor app).
   * Note: This does NOT wait for computer vision confirmation!
   */
  public registerExplicitSOS(event: ExplicitSOSEvent): void {
    this.activeSOSEvents.set(event.sosId, event);
    this.auditLogger.log(
      'EXPLICIT_SOS_PROCESSED',
      'DroneDistressCorrelator',
      event.sosId,
      `Explicit ${event.source} SOS received at (${event.scenePosition.x.toFixed(1)}, ${event.scenePosition.z.toFixed(1)}). Bypasses CV confirmation.`,
      { event }
    );
  }

  public getActiveSOSEvents(): ExplicitSOSEvent[] {
    return Array.from(this.activeSOSEvents.values());
  }

  /**
   * Correlates a validated candidate observation against known evidence sources.
   */
  public correlate(
    obs: ValidatedCandidateObservation,
    incidentManager: IncidentManager = IncidentManager.getInstance(),
    droneRegistry: DroneRegistry = DroneRegistry.getInstance()
  ): CandidateDistressDossier {
    const evidenceList: string[] = [];
    const uncertaintyList: string[] = [];
    let inHazardCorridor = false;
    let hazardZoneId: string | undefined;
    let hazardZoneName: string | undefined;

    // 1. Repeated Track Evidence
    let hitsCount = 1;
    if (obs.trackingId) {
      const priorCount = this.trackObservationCounts.get(obs.trackingId) || 0;
      hitsCount = priorCount + 1;
      this.trackObservationCounts.set(obs.trackingId, hitsCount);
      evidenceList.push(`Track ${obs.trackingId} consistently observed across ${hitsCount} detection frames.`);
    } else {
      uncertaintyList.push('No persistent tracking ID assigned to candidate detection.');
    }

    // 2. Drone Telemetry Freshness & Flight State
    const droneState = droneRegistry.getDrone(obs.droneId);
    if (droneState) {
      const telemAgeSec = droneState.telemetryFreshnessSeconds ?? ((Date.now() - droneState.lastReceivedTimeMs) / 1000);
      if (telemAgeSec <= 15) {
        evidenceList.push(
          `Drone ${obs.droneId} operational: telemetry fresh (${telemAgeSec.toFixed(1)}s age, alt: ${droneState.position3D.y.toFixed(1)}m, status: ${droneState.status}).`
        );
      } else {
        uncertaintyList.push(`Source drone telemetry is degraded/stale (${telemAgeSec.toFixed(1)}s old).`);
      }
    } else {
      uncertaintyList.push(`Source drone ${obs.droneId} not found in authoritative fleet registry.`);
    }

    // 3. Location & Hazard Corridor Check
    if (obs.scenePosition) {
      const { x, z } = obs.scenePosition;
      evidenceList.push(`Estimated ground coordinates: (${x.toFixed(1)}m, ${z.toFixed(1)}m) via ${obs.locationSource}.`);

      // Check Rip Current Corridor (SZ-02: X 360-480m, seaward Z <= 15m)
      if (x >= this.config.ripCurrentCorridorXMin && x <= this.config.ripCurrentCorridorXMax && z <= this.config.ripCurrentCorridorZMax) {
        inHazardCorridor = true;
        hazardZoneId = 'SZ-02';
        hazardZoneName = 'Central Rip Current Hazard Channel';
        evidenceList.push(`Position falls inside high-risk coastal hazard corridor [${hazardZoneName}] (SZ-02).`);
      } else if (x >= 750) {
        // Rocky Headland Restricted Zone (RZ-01)
        inHazardCorridor = true;
        hazardZoneId = 'RZ-01';
        hazardZoneName = 'North Rocky Headland Restricted Zone';
        evidenceList.push(`Position breaches non-bathing rocky headland boundary (RZ-01).`);
      }
    } else {
      uncertaintyList.push('Scene ground position is unestimated. Spatial hazard membership cannot be determined.');
    }

    // 4. Correlate with Explicit Wristband SOS
    let correlatedSOS: ExplicitSOSEvent | undefined;
    if (obs.scenePosition) {
      for (const sos of this.activeSOSEvents.values()) {
        const dx = obs.scenePosition.x - sos.scenePosition.x;
        const dz = obs.scenePosition.z - sos.scenePosition.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist <= this.config.sosCorrelationRadiusMeters) {
          correlatedSOS = sos;
          evidenceList.push(
            `Strong correlation: Matches active explicit SOS ${sos.sosId} (${sos.source}) within ${dist.toFixed(1)}m.`
          );
          break;
        }
      }
    }

    // 5. Correlate with Authoritative Open Incidents (Deduplication Check)
    let matchedIncidentId: string | undefined;
    let distanceToIncident: number | undefined;

    const activeIncidents = incidentManager.getActiveIncidents();
    if (obs.scenePosition && activeIncidents.length > 0) {
      let closestDist = Infinity;
      let closestId: string | undefined;

      for (const inc of activeIncidents) {
        // Spatial distance check
        const dx = obs.scenePosition.x - inc.location.x;
        const dz = obs.scenePosition.z - inc.location.y; // In 2D coords, location.y corresponds to Z
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist <= this.config.spatialToleranceMeters && dist < closestDist) {
          closestDist = dist;
          closestId = inc.id;
        }
      }

      if (closestId && closestDist <= this.config.spatialToleranceMeters) {
        matchedIncidentId = closestId;
        distanceToIncident = closestDist;
        evidenceList.push(
          `Correlates with existing authoritative incident ${closestId} (${closestDist.toFixed(1)}m distance <= ${this.config.spatialToleranceMeters}m tolerance).`
        );
      }
    }

    // Always preserve inherent uncertainty of visual machine inference
    uncertaintyList.push('Visual detection alone does not confirm medical distress or drowning.');
    uncertaintyList.push('Human operator visual inspection required prior to physical dispatch.');

    // Determine Recommended Triage Action
    let recommendedAction: CandidateDistressDossier['recommendedAction'] = 'AWAIT_OPERATOR_VERIFICATION';
    if (matchedIncidentId) {
      recommendedAction = 'LINK_EXISTING_INCIDENT';
    } else if (correlatedSOS) {
      recommendedAction = 'DIRECT_EMERGENCY_ESCALATION';
    }

    // Construct Dossier
    this.dossierCounter++;
    const dossierId = `DOSSIER-${this.dossierCounter}`;

    const dossier: CandidateDistressDossier = {
      dossierId,
      candidateObservationId: obs.observationId,
      droneId: obs.droneId,
      cameraId: obs.cameraId,
      trackingId: obs.trackingId,
      scenePosition: obs.scenePosition ? { ...obs.scenePosition } : undefined,
      inHazardCorridor,
      hazardZoneId,
      hazardZoneName,
      isNearExistingIncident: Boolean(matchedIncidentId),
      existingIncidentId: matchedIncidentId,
      distanceToExistingIncidentMeters: distanceToIncident,
      repeatedHitsCount: hitsCount,
      detectionConfidence: obs.confidence,
      hasCorrelatedSOS: Boolean(correlatedSOS),
      sosId: correlatedSOS?.sosId,
      evidenceSummary: evidenceList,
      uncertaintyReasons: uncertaintyList,
      recommendedAction,
      verificationStatus: matchedIncidentId ? 'DUPLICATE_OBSERVATION' : 'AWAITING_VERIFICATION',
      createdAtMs: Date.now(),
      updatedAtMs: Date.now(),
    };

    this.dossiers.set(dossierId, dossier);
    this.obsToDossierMap.set(obs.observationId, dossierId);

    this.auditLogger.log(
      'EVIDENCE_CORRELATED',
      'DroneDistressCorrelator',
      dossierId,
      `Candidate observation ${obs.observationId} correlated. Recommended: ${recommendedAction}.`,
      {
        inHazardCorridor,
        matchedIncidentId,
        hasSOS: Boolean(correlatedSOS),
        hitsCount,
      }
    );

    return dossier;
  }

  public getDossier(dossierId: string): CandidateDistressDossier | undefined {
    return this.dossiers.get(dossierId);
  }

  public getDossierForObservation(obsId: string): CandidateDistressDossier | undefined {
    const dId = this.obsToDossierMap.get(obsId);
    return dId ? this.dossiers.get(dId) : undefined;
  }

  public getAllDossiers(): CandidateDistressDossier[] {
    return Array.from(this.dossiers.values());
  }

  public getPendingDossiers(): CandidateDistressDossier[] {
    return Array.from(this.dossiers.values()).filter(
      (d) => d.verificationStatus === 'AWAITING_VERIFICATION' || d.verificationStatus === 'UNDER_REVIEW'
    );
  }
}
