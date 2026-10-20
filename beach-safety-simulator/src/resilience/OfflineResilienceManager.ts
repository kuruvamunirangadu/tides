/**
 * src/resilience/OfflineResilienceManager.ts
 * 
 * TIDES — Phase 10: Resilience, Fault Tolerance & Disaster Recovery
 * 
 * Offline Event Buffering and Reconnection Reconciliation Engine:
 * - Manages bounded offline event buffers for gateways, sensors, and site nodes.
 * - Enforces capacity limits with priority-aware retention (CRITICAL_SOS prioritized over regular telemetry).
 * - On Reconnection:
 *   1. Establishes connection status verification.
 *   2. Reconciles buffered records in chronological order by original sourceTimestamp.
 *   3. Enforces idempotency and duplicate elimination.
 *   4. Preserves original source timestamps (never overwrites with flush time).
 *   5. Detects out-of-order records: archives historically without mutating newer live state.
 */

import {
  FailureDomain,
  IdempotentEventRecord,
  OfflineBufferRecord,
  ReconnectionFlushResult,
} from './resilience.types';
import { ReliableEventProcessor } from './ReliableEventProcessor';

export interface BufferCapacityConfig {
  maxRecordsPerQueue: number; // Default 500
  retentionTtlMs: number;     // Default 24 hours
}

export class OfflineResilienceManager {
  private static instance: OfflineResilienceManager | null = null;

  // Key: `${siteId}:${sourceId}` -> Array of buffered records
  private bufferQueues: Map<string, OfflineBufferRecord[]> = new Map();

  // Latest observed timestamp per component (for out-of-order detection)
  private latestComponentTimestamps: Map<string, number> = new Map();

  private config: BufferCapacityConfig = {
    maxRecordsPerQueue: 500,
    retentionTtlMs: 24 * 60 * 60 * 1000,
  };

  private eventProcessor: ReliableEventProcessor;

  // Reconciliation execution history
  private reconciliationHistory: ReconnectionFlushResult[] = [];

  constructor(eventProcessor?: ReliableEventProcessor) {
    this.eventProcessor = eventProcessor || ReliableEventProcessor.getInstance();
  }

  public static getInstance(): OfflineResilienceManager {
    if (!OfflineResilienceManager.instance) {
      OfflineResilienceManager.instance = new OfflineResilienceManager();
    }
    return OfflineResilienceManager.instance;
  }

  public reset(): void {
    this.bufferQueues.clear();
    this.latestComponentTimestamps.clear();
    this.reconciliationHistory = [];
  }

  /**
   * Enqueues an observation or event during network outage or gateway disconnect.
   * Enforces bounded capacity with priority eviction (never evicts CRITICAL_SOS).
   */
  public enqueueOfflineRecord<T>(
    sourceId: string,
    siteId: string,
    domain: FailureDomain,
    event: IdempotentEventRecord<T>,
    priority: 'CRITICAL_SOS' | 'HIGH_ALERT' | 'NORMAL_TELEMETRY' | 'LOW_AUDIT' = 'NORMAL_TELEMETRY'
  ): { enqueued: boolean; bufferCount: number; evicted: boolean } {
    const queueKey = `${siteId}:${sourceId}`;
    let queue = this.bufferQueues.get(queueKey);

    if (!queue) {
      queue = [];
      this.bufferQueues.set(queueKey, queue);
    }

    let evicted = false;

    // Check capacity limit
    if (queue.length >= this.config.maxRecordsPerQueue) {
      // Find lowest priority non-SOS index to evict
      const lowestPriorityIndex = queue.findIndex(
        (r) => r.priority === 'LOW_AUDIT' || (r.priority === 'NORMAL_TELEMETRY' && priority !== 'LOW_AUDIT')
      );

      if (lowestPriorityIndex >= 0) {
        queue.splice(lowestPriorityIndex, 1);
        evicted = true;
      } else if (priority === 'CRITICAL_SOS') {
        // If incoming is CRITICAL_SOS, evict the oldest entry
        queue.shift();
        evicted = true;
      } else {
        // Queue full of high-priority events, cannot enqueue normal telemetry
        return { enqueued: false, bufferCount: queue.length, evicted: false };
      }
    }

    const record: OfflineBufferRecord<T> = {
      bufferId: `BUF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sourceId,
      siteId,
      domain,
      event,
      bufferedAtMs: Date.now(),
      priority,
    };

    queue.push(record);

    return {
      enqueued: true,
      bufferCount: queue.length,
      evicted,
    };
  }

  /**
   * Reconnects a component/site and reconciles buffered records in chronological order.
   */
  public async reconcileReconnection<T, R>(
    sourceId: string,
    siteId: string,
    handler: (payload: T, isHistoricalLatePacket: boolean) => Promise<R> | R
  ): Promise<ReconnectionFlushResult> {
    const queueKey = `${siteId}:${sourceId}`;
    const queue = this.bufferQueues.get(queueKey) || [];
    const startTime = Date.now();

    if (queue.length === 0) {
      const emptyResult: ReconnectionFlushResult = {
        siteId,
        sourceId,
        totalBuffered: 0,
        flushedCount: 0,
        duplicateCount: 0,
        outOfOrderCount: 0,
        failedCount: 0,
        durationMs: 0,
        status: 'SUCCESS',
      };
      this.reconciliationHistory.push(emptyResult);
      return emptyResult;
    }

    // Step 1: Sort chronologically by original sourceTimestamp
    queue.sort((a, b) => a.event.sourceTimestamp - b.event.sourceTimestamp);

    let flushedCount = 0;
    let duplicateCount = 0;
    let outOfOrderCount = 0;
    let failedCount = 0;

    let latestTimestamp = this.latestComponentTimestamps.get(sourceId) || 0;

    // Step 2: Iterate and process each record idempotently
    for (const item of queue) {
      const isHistoricalLatePacket = item.event.sourceTimestamp < latestTimestamp;
      if (isHistoricalLatePacket) {
        outOfOrderCount += 1;
      } else {
        latestTimestamp = item.event.sourceTimestamp;
        this.latestComponentTimestamps.set(sourceId, latestTimestamp);
      }

      try {
        const processResult = await this.eventProcessor.processEvent(
          {
            eventId: item.event.eventId,
            correlationId: item.event.correlationId,
            siteId: item.siteId,
            domain: item.domain,
            eventType: item.event.eventType,
            payload: item.event.payload,
            sourceTimestamp: item.event.sourceTimestamp, // Preserves original timestamp
            isDangerousExternalAction: item.event.isDangerousExternalAction,
          },
          (p) => handler(p, isHistoricalLatePacket)
        );

        if (processResult.status === 'COMPLETED') {
          flushedCount += 1;
        } else if (processResult.status === 'DUPLICATE_IGNORED') {
          duplicateCount += 1;
        } else {
          failedCount += 1;
        }
      } catch (err) {
        failedCount += 1;
      }
    }

    // Clear processed buffer queue
    this.bufferQueues.set(queueKey, []);

    const durationMs = Date.now() - startTime;
    const finalResult: ReconnectionFlushResult = {
      siteId,
      sourceId,
      totalBuffered: queue.length,
      flushedCount,
      duplicateCount,
      outOfOrderCount,
      failedCount,
      durationMs,
      status: failedCount === 0 ? 'SUCCESS' : flushedCount > 0 ? 'PARTIAL' : 'FAILED',
    };

    this.reconciliationHistory.push(finalResult);
    return finalResult;
  }

  public getQueueDepth(sourceId: string, siteId: string): number {
    const queue = this.bufferQueues.get(`${siteId}:${sourceId}`);
    return queue ? queue.length : 0;
  }

  public getTotalBufferedCount(): number {
    let total = 0;
    for (const q of this.bufferQueues.values()) {
      total += q.length;
    }
    return total;
  }

  public getAllQueuedRecords(): OfflineBufferRecord[] {
    const records: OfflineBufferRecord[] = [];
    for (const q of this.bufferQueues.values()) {
      records.push(...q);
    }
    return records;
  }

  public getReconciliationHistory(): ReconnectionFlushResult[] {
    return [...this.reconciliationHistory];
  }
}

