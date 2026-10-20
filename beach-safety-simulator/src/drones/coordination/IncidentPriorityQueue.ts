/**
 * IncidentPriorityQueue.ts
 * 
 * TIDES Drone Phase 11: Multi-Incident Priority Queue
 * 
 * Coordinates and orders all active coastal emergencies according to:
 * 1. Authoritative severity: CRITICAL > HIGH > MEDIUM > LOW
 * 2. Emergency type: Water DISTRESS has highest life-safety priority over zone violations or crowd congestion
 * 3. Stable tie-breaker: Detection time (FIFO - earlier incident served first)
 * 4. Starvation prevention: Wait-time threshold boosts lower-priority emergencies without violating critical life-safety rules
 * 5. Full explainability: Transparent rationale for queue order and wait statuses
 */

import { IncidentSeverity, IncidentType } from '../../models/Incident';
import {
  CoordinationIncident,
  CoordinationPolicyConfig,
  CoordinationIncidentStatus,
} from './droneCoordination.types';

export class IncidentPriorityQueue {
  private queue: Map<string, CoordinationIncident> = new Map();
  private config: CoordinationPolicyConfig;

  constructor(config: CoordinationPolicyConfig) {
    this.config = config;
  }

  public updateConfig(config: Partial<CoordinationPolicyConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public clear(): void {
    this.queue.clear();
  }

  public getIncident(incidentId: string): CoordinationIncident | undefined {
    return this.queue.get(incidentId);
  }

  public getAllIncidents(): CoordinationIncident[] {
    return Array.from(this.queue.values());
  }

  public getActiveQueue(): CoordinationIncident[] {
    return Array.from(this.queue.values()).filter(
      (inc) => inc.status !== 'RESOLVED'
    );
  }

  public getPendingQueue(): CoordinationIncident[] {
    return Array.from(this.queue.values()).filter(
      (inc) => inc.status === 'QUEUED' || inc.status === 'UNASSIGNABLE'
    );
  }

  /**
   * Enqueue or update an incident in the multi-incident coordination queue
   */
  public enqueue(
    incident: Omit<CoordinationIncident, 'priorityRank' | 'waitTimeSeconds' | 'starvationBoostApplied' | 'history'>,
    clockMs: number = Date.now()
  ): CoordinationIncident {
    const existing = this.queue.get(incident.incidentId);

    if (existing) {
      // Update mutable properties while preserving detection time & history
      existing.severity = incident.severity;
      existing.type = incident.type;
      existing.position3D = incident.position3D;
      existing.title = incident.title;
      existing.zoneId = incident.zoneId;
      if (incident.status) existing.status = incident.status;
      if (incident.assignedDroneId !== undefined) existing.assignedDroneId = incident.assignedDroneId;
      if (incident.assignedLifeguardId !== undefined) existing.assignedLifeguardId = incident.assignedLifeguardId;
      if (incident.assignedRescueBoatId !== undefined) existing.assignedRescueBoatId = incident.assignedRescueBoatId;
      if (incident.assignedMissionId !== undefined) existing.assignedMissionId = incident.assignedMissionId;
      
      this.recalculateRanks(clockMs);
      return existing;
    }

    const newIncident: CoordinationIncident = {
      ...incident,
      priorityRank: 5,
      waitTimeSeconds: 0,
      starvationBoostApplied: false,
      history: [
        {
          timestampMs: clockMs,
          fromStatus: 'QUEUED',
          toStatus: incident.status || 'QUEUED',
          reason: 'Incident registered in priority queue',
        },
      ],
    };

    this.queue.set(incident.incidentId, newIncident);
    this.recalculateRanks(clockMs);
    return newIncident;
  }

  /**
   * Updates an incident status with an audited reason
   */
  public updateStatus(
    incidentId: string,
    toStatus: CoordinationIncidentStatus,
    reason: string,
    clockMs: number = Date.now()
  ): boolean {
    const inc = this.queue.get(incidentId);
    if (!inc) return false;

    if (inc.status === toStatus) return true;

    const fromStatus = inc.status;
    inc.status = toStatus;
    inc.history.push({
      timestampMs: clockMs,
      fromStatus,
      toStatus,
      reason,
    });

    if (toStatus === 'ALLOCATED' && !inc.assignedAtMs) {
      inc.assignedAtMs = clockMs;
    }

    this.recalculateRanks(clockMs);
    return true;
  }

  /**
   * Computes deterministic priority ordering across all active incidents
   */
  public recalculateRanks(clockMs: number = Date.now()): CoordinationIncident[] {
    const list = Array.from(this.queue.values());

    for (const inc of list) {
      // Calculate wait time
      inc.waitTimeSeconds = Math.max(0, (clockMs - inc.detectedAtMs) / 1000);

      // Base rank determined by severity and incident type
      let baseRank = this.computeBaseRank(inc.severity, inc.type);

      // Starvation boost: lower priority incidents waiting longer than threshold receive elevation
      if (
        inc.status === 'QUEUED' &&
        inc.waitTimeSeconds >= this.config.starvationThresholdSeconds &&
        inc.severity !== 'CRITICAL'
      ) {
        // Boost priority by up to 2 ranks, but never jump ahead of CRITICAL life-threats (min rank 2)
        baseRank = Math.max(2, baseRank - 2);
        inc.starvationBoostApplied = true;
      } else {
        inc.starvationBoostApplied = false;
      }

      inc.priorityRank = baseRank;
    }

    // Sort: Lowest rank number first (e.g. 1 before 2).
    // Tie-breaker: Detection time FIFO (earlier timestamp first)
    list.sort((a, b) => {
      if (a.priorityRank !== b.priorityRank) {
        return a.priorityRank - b.priorityRank;
      }
      return a.detectedAtMs - b.detectedAtMs;
    });

    return list;
  }

  /**
   * Computes base integer rank (1 = Highest, 8 = Lowest)
   */
  private computeBaseRank(severity: IncidentSeverity, type: IncidentType): number {
    switch (severity) {
      case 'CRITICAL':
        return type === 'DISTRESS' ? 1 : 2;
      case 'HIGH':
        return type === 'DISTRESS' ? 3 : 4;
      case 'MEDIUM':
        return type === 'DISTRESS' ? 5 : 6;
      case 'LOW':
      default:
        return 8;
    }
  }

  /**
   * Generates human-readable explanation of priority rank and queue position
   */
  public explainPriority(incidentId: string): string {
    const inc = this.queue.get(incidentId);
    if (!inc) return `Incident ${incidentId} not found in coordination queue.`;

    const sortedActive = this.recalculateRanks().filter((i) => i.status !== 'RESOLVED');
    const queuePos = sortedActive.findIndex((i) => i.incidentId === incidentId) + 1;

    let explanation = `Queue Position #${queuePos} of ${sortedActive.length} (Priority Rank: ${inc.priorityRank}). `;
    explanation += `Severity: ${inc.severity}, Type: ${inc.type}. `;

    if (inc.starvationBoostApplied) {
      explanation += `[Anti-Starvation Boost Applied: Waited ${inc.waitTimeSeconds.toFixed(1)}s >= ${this.config.starvationThresholdSeconds}s threshold]. `;
    }

    explanation += `Wait Duration: ${inc.waitTimeSeconds.toFixed(1)}s (FIFO Tie-breaker: ${new Date(inc.detectedAtMs).toLocaleTimeString()}). `;

    if (inc.status === 'QUEUED') {
      explanation += inc.unassignableReason
        ? `Status: Awaiting Resource (${inc.unassignableReason})`
        : 'Status: Pending Allocation in Queue.';
    } else if (inc.status === 'ALLOCATED') {
      explanation += `Status: Allocated to ${inc.assignedDroneId || 'Resource'}. ${inc.allocationRationale || ''}`;
    } else {
      explanation += `Status: ${inc.status}.`;
    }

    return explanation;
  }
}

