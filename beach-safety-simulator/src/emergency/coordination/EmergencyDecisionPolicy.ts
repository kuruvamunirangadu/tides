/**
 * src/emergency/coordination/EmergencyDecisionPolicy.ts
 * Transparent, rule-based emergency decision support policy.
 * Generates auditable recommendations with operator confirmation gates.
 */

import { EmergencyRecommendation, EmergencyActionType, RecommendationStatus } from './types';
import { EvacuationZoneManager } from './EvacuationZoneManager';

export class EmergencyDecisionPolicy {
  private static instance: EmergencyDecisionPolicy | null = null;
  private recommendations: Map<string, EmergencyRecommendation> = new Map();
  private listeners: Set<() => void> = new Set();

  public static getInstance(): EmergencyDecisionPolicy {
    if (!this.instance) {
      this.instance = new EmergencyDecisionPolicy();
    }
    return this.instance;
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  public getRecommendations(): EmergencyRecommendation[] {
    return Array.from(this.recommendations.values());
  }

  /**
   * Evaluates transparent decision rules and produces auditable recommendations.
   */
  public evaluateRules(
    activeIncidentsCount: number,
    ripCurrentSpeedMps: number,
    affectedCrowdCount: number,
    unresolvedCount: number
  ): EmergencyRecommendation[] {
    const now = Date.now() / 1000;
    const generated: EmergencyRecommendation[] = [];

    // Rule 1: High rip current velocity -> Public Warning
    if (ripCurrentSpeedMps >= 0.45) {
      const recId = 'REC-WARN-RIP-01';
      if (!this.recommendations.has(recId)) {
        const rec: EmergencyRecommendation = {
          recommendationId: recId,
          targetZoneId: 'ZONE-CENTRAL-SWIM',
          actionType: 'PUBLIC_WARNING',
          ruleTriggered: 'RULE_RIP_CURRENT_VELOCITY_CAUTION',
          supportingInputs: {
            ripCurrentSpeedMps,
            threshold: 0.45,
            zone: 'ZONE-CENTRAL-SWIM',
          },
          uncertaintyNotes: 'ADCP current velocity uncertainty +/- 0.05 m/s.',
          status: 'RECOMMENDED',
          createdAt: now,
        };
        this.recommendations.set(recId, rec);
        generated.push(rec);
      }
    }

    // Rule 2: Multiple concurrent incidents + severe rip current -> Evacuate swimming zone
    if (activeIncidentsCount >= 2 && ripCurrentSpeedMps >= 0.60) {
      const recId = 'REC-EVAC-CENTRAL-01';
      if (!this.recommendations.has(recId)) {
        const rec: EmergencyRecommendation = {
          recommendationId: recId,
          targetZoneId: 'ZONE-CENTRAL-SWIM',
          actionType: 'EVACUATE_ZONE',
          ruleTriggered: 'RULE_MULTI_INCIDENT_ESCALATION_EVACUATE',
          supportingInputs: {
            activeIncidentsCount,
            ripCurrentSpeedMps,
            affectedCrowdCount,
          },
          uncertaintyNotes: 'High-impact action: requires explicit operator confirmation.',
          status: 'RECOMMENDED',
          createdAt: now,
        };
        this.recommendations.set(recId, rec);
        generated.push(rec);
      }
    }

    // Rule 3: Resource shortage -> Prepare additional resources
    if (unresolvedCount > 0) {
      const recId = 'REC-PREP-RESOURCES-01';
      if (!this.recommendations.has(recId)) {
        const rec: EmergencyRecommendation = {
          recommendationId: recId,
          actionType: 'PREPARE_RESOURCES',
          ruleTriggered: 'RULE_RESOURCE_SHORTAGE_BACKUP',
          supportingInputs: {
            unresolvedCount,
          },
          uncertaintyNotes: 'Mutual aid from port authority requested.',
          status: 'RECOMMENDED',
          createdAt: now,
        };
        this.recommendations.set(recId, rec);
        generated.push(rec);
      }
    }

    if (generated.length > 0) {
      this.notify();
    }

    return generated;
  }

  /**
   * Operator confirmation gate for recommendations.
   */
  public reviewRecommendation(
    recommendationId: string,
    approve: boolean,
    operatorId = 'TIDES-CHIEF-OPERATOR'
  ): { success: boolean; message: string } {
    const rec = this.recommendations.get(recommendationId);
    if (!rec) {
      return { success: false, message: `Recommendation ${recommendationId} not found.` };
    }

    rec.status = approve ? 'OPERATOR_APPROVED' : 'OPERATOR_REJECTED';
    rec.reviewedAt = Date.now() / 1000;
    rec.reviewedBy = operatorId;

    if (approve) {
      const zoneMgr = EvacuationZoneManager.getInstance();
      if (rec.actionType === 'EVACUATE_ZONE' && rec.targetZoneId) {
        zoneMgr.setZoneState(
          rec.targetZoneId,
          'EVACUATION',
          'Compulsory evacuation authorized by operator.',
          true
        );
      } else if (rec.actionType === 'RESTRICT_ZONE' && rec.targetZoneId) {
        zoneMgr.setZoneState(
          rec.targetZoneId,
          'RESTRICTED',
          'Swimming restricted by operator.',
          true
        );
      }
    }

    this.notify();
    return {
      success: true,
      message: `Recommendation ${recommendationId} ${approve ? 'approved' : 'rejected'} by ${operatorId}.`,
    };
  }

  public reset() {
    this.recommendations.clear();
    this.notify();
  }
}

