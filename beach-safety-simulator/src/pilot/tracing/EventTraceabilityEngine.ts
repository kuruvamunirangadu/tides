/**
 * EventTraceabilityEngine.ts
 * 
 * TIDES Phase 5: Controlled Field Pilot & Real-World Validation Framework
 * 
 * End-to-end event chain verification and auditability:
 * - Records discrete stages with microsecond timestamps and correlation IDs
 * - Tracks stage-to-stage latencies (SOS -> Backend -> Incident -> Verification -> Warning -> Gateway -> Device ACK -> Observed Feedback)
 * - Explicitly marks unmeasured stages as UNOBSERVED rather than inventing success
 * - Distinguishes SIMULATED vs HARDWARE data chains
 */

import {
  TraceableEventChain,
  TraceStage,
  TraceStageStatus,
  TraceChainStep,
  ProvenanceMode,
} from '../pilot.types';

export class EventTraceabilityEngine {
  private static instance: EventTraceabilityEngine | null = null;

  private chains: Map<string, TraceableEventChain> = new Map();
  private correlationCounter: number = 7000;
  private changeListeners: Set<() => void> = new Set();

  public static getInstance(): EventTraceabilityEngine {
    if (!EventTraceabilityEngine.instance) {
      EventTraceabilityEngine.instance = new EventTraceabilityEngine();
    }
    return EventTraceabilityEngine.instance;
  }

  public reset(): void {
    this.chains.clear();
    this.correlationCounter = 7000;
    this.notifyChange();
  }

  public subscribeChange(listener: () => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  private notifyChange(): void {
    this.changeListeners.forEach((l) => {
      try {
        l();
      } catch (err) {
        console.error('Error in EventTraceabilityEngine listener:', err);
      }
    });
  }

  public getAllChains(): TraceableEventChain[] {
    return Array.from(this.chains.values());
  }

  public getChain(correlationId: string): TraceableEventChain | undefined {
    return this.chains.get(correlationId);
  }

  public getChainsForSession(sessionId: string): TraceableEventChain[] {
    return Array.from(this.chains.values()).filter((c) => c.sessionId === sessionId);
  }

  /**
   * Starts a new traceable event chain
   */
  public initiateChain(
    sessionId: string,
    eventType: 'SOS_TRIGGER' | 'CAMERA_DETECTION' | 'DRONE_SIGHTING' | 'MANUAL_DISPATCH',
    provenance: ProvenanceMode,
    sourceDeviceId: string,
    initialDetails: string,
    clockMs: number = Date.now()
  ): TraceableEventChain {
    this.correlationCounter++;
    const correlationId = `TRC-${eventType.slice(0, 3)}-${this.correlationCounter}`;

    const initialStep: TraceChainStep = {
      stage: 'EVENT_GENERATED',
      status: 'OBSERVED',
      timestampMs: clockMs,
      sourceId: sourceDeviceId,
      details: initialDetails,
      latencyFromPreviousMs: 0,
    };

    const chain: TraceableEventChain = {
      correlationId,
      sessionId,
      eventType,
      provenance,
      sourceDeviceId,
      initiatedAtMs: clockMs,
      steps: [initialStep],
      outcome: 'PARTIAL',
    };

    this.chains.set(correlationId, chain);
    this.notifyChange();
    return chain;
  }

  /**
   * Appends a measured verification stage to an existing chain
   */
  public recordStage(
    correlationId: string,
    stage: TraceStage,
    status: TraceStageStatus,
    sourceId: string,
    details: string,
    clockMs: number = Date.now(),
    rawPayloadSnippet?: string
  ): boolean {
    const chain = this.chains.get(correlationId);
    if (!chain) return false;

    const previousStep = chain.steps[chain.steps.length - 1];
    const previousTimestamp = previousStep?.timestampMs ?? chain.initiatedAtMs;
    const latencyFromPreviousMs = status === 'OBSERVED' ? Math.max(0, clockMs - previousTimestamp) : undefined;

    const step: TraceChainStep = {
      stage,
      status,
      timestampMs: status === 'OBSERVED' ? clockMs : undefined,
      sourceId,
      details,
      latencyFromPreviousMs,
      rawPayloadSnippet,
    };

    chain.steps.push(step);

    // Update completion and outcome
    if (stage === 'DEVICE_ACKNOWLEDGED' || stage === 'PHYSICAL_RESPONSE_OBSERVED') {
      chain.completedAtMs = clockMs;
      chain.totalLatencyMs = Math.max(0, clockMs - chain.initiatedAtMs);
      chain.outcome = status === 'OBSERVED' ? 'SUCCESS' : 'PARTIAL';
    } else if (status === 'FAILED') {
      chain.outcome = 'FAILED';
    }

    this.notifyChange();
    return true;
  }

  /**
   * Explicitly marks unmeasured downstream stages as UNOBSERVED
   */
  public markStageUnobserved(
    correlationId: string,
    stage: TraceStage,
    sourceId: string,
    reason: string
  ): boolean {
    return this.recordStage(correlationId, stage, 'UNOBSERVED', sourceId, `Unmeasured: ${reason}`);
  }
}

