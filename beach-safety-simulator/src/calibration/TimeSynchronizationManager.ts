/**
 * src/calibration/TimeSynchronizationManager.ts
 * 
 * TIDES — Phase 9: Digital Twin Calibration & Real-Time Synchronization
 * 
 * Time Synchronization and Ordering Management.
 * Tracks source clock offsets, transport ingestion latency, out-of-order packets,
 * and enforces strict temporal ordering for digital twin state updates.
 * 
 * Principles:
 * 1. Out-of-order observations are preserved historically but NEVER overwrite newer state.
 * 2. Clock drift is explicitly measured and bounded.
 * 3. Idempotent deduplication prevents double-processing of network re-transmissions.
 */

export interface TimeSyncEvaluation {
  sourceTimestamp: number;
  ingestionTimestamp: number;
  clockOffsetMs: number;
  syncLatencyMs: number;
  clockUncertaintyMs: number;
  isDuplicate: boolean;
  isOutOfOrder: boolean;
  shouldUpdateLiveState: boolean;
  timeSyncWarnings: string[];
}

export class TimeSynchronizationManager {
  private static instance: TimeSynchronizationManager | null = null;

  // Last known source timestamp per stream key: `sourceId::variable`
  private latestSourceTimestamps: Map<string, number> = new Map();

  // Sliding window for deduplication: `sourceId::variable::sourceTimestamp` -> arrivalMs
  private deduplicationIndex: Map<string, number> = new Map();

  // Sliding window expiration: 15 minutes
  private readonly DEDUP_WINDOW_MS = 15 * 60 * 1000;

  public static getInstance(): TimeSynchronizationManager {
    if (!TimeSynchronizationManager.instance) {
      TimeSynchronizationManager.instance = new TimeSynchronizationManager();
    }
    return TimeSynchronizationManager.instance;
  }

  public reset(): void {
    this.latestSourceTimestamps.clear();
    this.deduplicationIndex.clear();
  }

  /**
   * Evaluates timing, order, and duplicates for an incoming observation.
   */
  public evaluateTimeSync(input: {
    sourceId: string;
    variable: string;
    sourceTimestamp: number;
    observationId?: string;
    backendTimestamp?: number;
  }): TimeSyncEvaluation {
    const ingestion = input.backendTimestamp || Date.now();
    const source = input.sourceTimestamp;
    const warnings: string[] = [];

    // 1. Clock offset & synchronization latency
    const clockOffsetMs = source - ingestion;
    const syncLatencyMs = Math.max(0, ingestion - source);
    let clockUncertaintyMs = 25; // Base RF/network clock uncertainty in ms

    if (Math.abs(clockOffsetMs) > 2000) {
      clockUncertaintyMs = Math.min(500, Math.abs(clockOffsetMs) * 0.1);
      warnings.push(`Device clock drift detected: offset of ${clockOffsetMs} ms exceeds 2000ms threshold.`);
    }

    // 2. Duplicate detection
    const dedupKey = `${input.sourceId.toUpperCase()}::${input.variable.toUpperCase()}::${source}`;
    let isDuplicate = false;

    if (this.deduplicationIndex.has(dedupKey)) {
      isDuplicate = true;
      warnings.push(`Duplicate observation detected for key ${dedupKey}.`);
    } else {
      this.deduplicationIndex.set(dedupKey, ingestion);
      this.cleanExpiredDedupKeys(ingestion);
    }

    // 3. Temporal ordering check
    const streamKey = `${input.sourceId.toUpperCase()}::${input.variable.toUpperCase()}`;
    const lastSourceTime = this.latestSourceTimestamps.get(streamKey) || 0;
    let isOutOfOrder = false;

    if (source < lastSourceTime) {
      isOutOfOrder = true;
      const delayMs = lastSourceTime - source;
      warnings.push(`Out-of-order observation: source timestamp is ${(delayMs / 1000).toFixed(2)}s older than latest accepted state (${new Date(lastSourceTime).toISOString()}). Live state will not be overwritten.`);
    } else if (!isDuplicate) {
      this.latestSourceTimestamps.set(streamKey, source);
    }

    // Live state update policy: Only update live state if not duplicate and not out-of-order
    const shouldUpdateLiveState = !isDuplicate && !isOutOfOrder;

    return {
      sourceTimestamp: source,
      ingestionTimestamp: ingestion,
      clockOffsetMs,
      syncLatencyMs,
      clockUncertaintyMs,
      isDuplicate,
      isOutOfOrder,
      shouldUpdateLiveState,
      timeSyncWarnings: warnings,
    };
  }

  private cleanExpiredDedupKeys(now: number): void {
    if (this.deduplicationIndex.size < 1000) return;
    for (const [key, arrival] of this.deduplicationIndex.entries()) {
      if (now - arrival > this.DEDUP_WINDOW_MS) {
        this.deduplicationIndex.delete(key);
      }
    }
  }

  public getLatestTimestampForStream(sourceId: string, variable: string): number {
    return this.latestSourceTimestamps.get(`${sourceId.toUpperCase()}::${variable.toUpperCase()}`) || 0;
  }
}

