import { PersonTrack } from '../models/PersonTrack';
import { CandidateIncident } from '../models/CandidateIncident';
import { FusedPerceptionSummary } from './SensorFusionAdapter';
import { Hazard } from '../../models/Hazard';
import { RescueCoordinator } from '../../scene3d/rescue/RescueCoordinator';

export class IncidentEvidenceCorrelator {
  private static instance: IncidentEvidenceCorrelator | null = null;
  private candidateIncidents: Map<string, CandidateIncident> = new Map();
  private recentSignatures: Map<string, number> = new Map();
  private nextCandidateId: number = 101;
  private dedupCooldownSeconds: number = 20.0;

  public static getInstance(): IncidentEvidenceCorrelator {
    if (!IncidentEvidenceCorrelator.instance) {
      IncidentEvidenceCorrelator.instance = new IncidentEvidenceCorrelator();
    }
    return IncidentEvidenceCorrelator.instance;
  }

  public correlateEvidence(
    tracks: PersonTrack[],
    fusion: FusedPerceptionSummary,
    hazards: Hazard[],
    simTime: number
  ): CandidateIncident[] {
    const activeTracks = tracks.filter((t) => t.active && t.state !== 'EXPIRED');

    for (const track of activeTracks) {
      const pos = track.positions[track.positions.length - 1];
      if (!pos) continue;

      // 1. Rip channel hazard corridor: X 360-480, Y >= 280
      const inRipChannel = pos.x >= 360 && pos.x <= 480 && pos.y >= 280;
      const isRapidDrift = track.speed >= 1.2;
      const isMotionlessOrStruggling = (track.speed < 0.15 && track.framesTracked > 15) || track.distressSuspected;

      if (inRipChannel && (isRapidDrift || isMotionlessOrStruggling)) {
        const candidateType = isMotionlessOrStruggling ? 'POSSIBLE_DISTRESS' : 'DRIFT_RISK';
        const signature = `${candidateType}:${track.trackId}`;

        const lastAlertTime = this.recentSignatures.get(signature);
        if (lastAlertTime && (simTime - lastAlertTime) < this.dedupCooldownSeconds) {
          continue;
        }

        this.recentSignatures.set(signature, simTime);
        const candId = `CAND-ALERT-${this.nextCandidateId++}`;

        const evidence = [
          `Camera [${track.cameraId}] tracking bather in high-risk rip current corridor (SZ-02)`,
          `Estimated ground coordinates: (${pos.x.toFixed(1)}m, ${pos.y.toFixed(1)}m)`,
          `Kinematic velocity: ${track.speed.toFixed(2)} m/s, direction ${track.direction}°`,
        ];

        if (fusion.adcpCurrentMps > 1.0) {
          evidence.push(`Acoustic ADCP confirms dangerous offshore rip current: ${fusion.adcpCurrentMps.toFixed(2)} m/s`);
        }

        const candidate: CandidateIncident = {
          id: candId,
          candidateType,
          trackIds: [track.trackId],
          cameraIds: [track.cameraId],
          location: { x: pos.x, y: pos.y },
          confidence: Number((track.confidence * 0.90).toFixed(2)),
          status: 'CANDIDATE_UNVERIFIED',
          supportingEvidence: evidence,
          uncertaintyReasons: [
            'AI visual inference alone is not medical confirmation of drowning or distress',
            'Telemetry could represent experienced bather navigating swell',
          ],
          requiresOperatorAction: true,
          autoDispatched: false, // STRICT SAFETY RULE: Zero automatic dispatch
          timestamp: simTime,
          decisionNotes: 'Candidate alert awaiting lifeguard visual confirmation.',
        };

        this.candidateIncidents.set(candId, candidate);
      }

      // 2. Restricted zone incursion: X >= 750 (Zone D Headland)
      else if (pos.x >= 750) {
        const signature = `RESTRICTED_ZONE_INCURSION:${track.trackId}`;
        const lastAlertTime = this.recentSignatures.get(signature);
        if (lastAlertTime && (simTime - lastAlertTime) < this.dedupCooldownSeconds) {
          continue;
        }

        this.recentSignatures.set(signature, simTime);
        const candId = `CAND-ALERT-${this.nextCandidateId++}`;

        const candidate: CandidateIncident = {
          id: candId,
          candidateType: 'RESTRICTED_ZONE_INCURSION',
          trackIds: [track.trackId],
          cameraIds: [track.cameraId],
          location: { x: pos.x, y: pos.y },
          confidence: track.confidence,
          status: 'CANDIDATE_UNVERIFIED',
          supportingEvidence: [
            `Track ${track.trackId} observed inside restricted rocky headland (RZ-01)`,
            `Coordinates (${pos.x.toFixed(1)}m, ${pos.y.toFixed(1)}m) breach coastal safety boundary`,
          ],
          uncertaintyReasons: [
            'Operator must visually confirm before dispatching motorized patrol',
          ],
          requiresOperatorAction: true,
          autoDispatched: false,
          timestamp: simTime,
          decisionNotes: 'Prohibited boundary breach detected by vision grid.',
        };

        this.candidateIncidents.set(candId, candidate);
      }
    }

    return Array.from(this.candidateIncidents.values());
  }

  public confirmCandidate(candidateId: string, notes?: string): CandidateIncident | undefined {
    const cand = this.candidateIncidents.get(candidateId);
    if (!cand) return undefined;

    cand.status = 'OPERATOR_CONFIRMED';
    cand.decisionNotes = notes || 'Operator visually verified candidate. Verified alert raised.';
    return cand;
  }

  public dismissCandidate(candidateId: string, notes?: string): CandidateIncident | undefined {
    const cand = this.candidateIncidents.get(candidateId);
    if (!cand) return undefined;

    cand.status = 'OPERATOR_DISMISSED';
    cand.decisionNotes = notes || 'Operator dismissed as false alarm / benign activity.';
    return cand;
  }

  public getCandidates(): CandidateIncident[] {
    return Array.from(this.candidateIncidents.values());
  }

  public reset(): void {
    this.candidateIncidents.clear();
    this.recentSignatures.clear();
    this.nextCandidateId = 101;
  }
}

