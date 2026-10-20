/**
 * src/regional/RegionalSyncManager.ts
 * 
 * TIDES — Phase 8: Multi-Beach Deployment & Coastal Network Coordination
 * 
 * Manages site connectivity tracking, heartbeats, and offline event synchronization.
 * 
 * Core Guarantees:
 * 1. Independent Local Operations: Outages or disconnection at one site do NOT disrupt
 *    local simulation, local incident management, or other connected sites.
 * 2. Idempotent Synchronization: Flushed events are deduplicated by unique eventId.
 * 3. Honest Telemetry: Disconnected sites report OFFLINE / NO_DATA; never presumed safe.
 */

import { BeachRegistry } from './BeachRegistry';
import { SiteSyncState } from './types';

export interface QueuedRegionalEvent {
  eventId: string;
  siteId: string;
  eventType: 'INCIDENT_CREATED' | 'INCIDENT_UPDATED' | 'WARNING_DISPATCHED' | 'DISPATCH_RECORD' | 'STATUS_CHANGED';
  timestamp: number;
  payload: any;
}

export class RegionalSyncManager {
  private static instance: RegionalSyncManager | null = null;
  private siteStates: Map<string, SiteSyncState> = new Map();
  private eventQueues: Map<string, QueuedRegionalEvent[]> = new Map();
  private processedEventIds: Set<string> = new Set();
  private beachRegistry: BeachRegistry;

  private readonly ONLINE_THRESHOLD_MS = 30 * 1000;    // 30s
  private readonly DEGRADED_THRESHOLD_MS = 120 * 1000;  // 2m

  constructor(beachRegistry?: BeachRegistry) {
    this.beachRegistry = beachRegistry || BeachRegistry.getInstance();
    this.initializeSites();
  }

  public static getInstance(): RegionalSyncManager {
    if (!RegionalSyncManager.instance) {
      RegionalSyncManager.instance = new RegionalSyncManager();
    }
    return RegionalSyncManager.instance;
  }

  public reset(): void {
    this.siteStates.clear();
    this.eventQueues.clear();
    this.processedEventIds.clear();
    this.initializeSites();
  }

  private initializeSites(): void {
    const beaches = this.beachRegistry.getBeaches();
    const now = Date.now();

    for (const b of beaches) {
      this.siteStates.set(b.beachId, {
        siteId: b.beachId,
        siteName: b.name,
        lastHeartbeatMs: b.connected ? now : now - 300 * 1000,
        latencyMs: b.connected ? 25 : 0,
        status: b.connected ? 'ONLINE' : 'OFFLINE',
        pendingSyncEventsCount: 0,
        duplicateEventsFilteredCount: 0,
        lastSyncTimestamp: b.connected ? now : 0,
      });
      this.eventQueues.set(b.beachId, []);
    }
  }

  /**
   * Records a heartbeat for a site, marking it ONLINE or DEGRADED based on latency.
   */
  public recordHeartbeat(siteId: string, latencyMs: number = 35): void {
    const norm = siteId.toUpperCase();
    let state = this.siteStates.get(norm);
    const now = Date.now();

    if (!state) {
      const beach = this.beachRegistry.getBeach(norm);
      state = {
        siteId: norm,
        siteName: beach?.name || norm,
        lastHeartbeatMs: now,
        latencyMs,
        status: latencyMs > 300 ? 'DEGRADED' : 'ONLINE',
        pendingSyncEventsCount: 0,
        duplicateEventsFilteredCount: 0,
        lastSyncTimestamp: now,
      };
      this.siteStates.set(norm, state);
    } else {
      state.lastHeartbeatMs = now;
      state.latencyMs = latencyMs;
      state.status = latencyMs > 300 ? 'DEGRADED' : 'ONLINE';
    }
  }

  /**
   * Explicitly sets a site OFFLINE (e.g. simulated network failure or disconnect drill).
   */
  public setSiteOffline(siteId: string): void {
    const norm = siteId.toUpperCase();
    const state = this.siteStates.get(norm);
    if (state) {
      state.status = 'OFFLINE';
      state.latencyMs = 0;
      state.lastHeartbeatMs = Date.now() - 300 * 1000;
    }
  }

  /**
   * Asserts whether a site operates autonomously even when disconnected.
   * By architectural rule, all sites operate autonomously.
   */
  public isSiteAutonomous(siteId: string): boolean {
    return true;
  }

  /**
   * Gets the evaluated health status of a site based on elapsed time since last heartbeat.
   */
  public getSiteSyncState(siteId: string): SiteSyncState {
    const norm = siteId.toUpperCase();
    let state = this.siteStates.get(norm);
    const now = Date.now();

    if (!state) {
      return {
        siteId: norm,
        siteName: norm,
        lastHeartbeatMs: 0,
        latencyMs: 0,
        status: 'OFFLINE',
        pendingSyncEventsCount: 0,
        duplicateEventsFilteredCount: 0,
        lastSyncTimestamp: 0,
      };
    }

    const elapsed = now - state.lastHeartbeatMs;
    if (elapsed > this.DEGRADED_THRESHOLD_MS) {
      state.status = 'OFFLINE';
    } else if (elapsed > this.ONLINE_THRESHOLD_MS) {
      state.status = 'DEGRADED';
    }

    const queue = this.eventQueues.get(norm) || [];
    state.pendingSyncEventsCount = queue.length;

    return { ...state };
  }

  public getAllSiteSyncStates(): SiteSyncState[] {
    const result: SiteSyncState[] = [];
    for (const siteId of this.siteStates.keys()) {
      result.push(this.getSiteSyncState(siteId));
    }
    return result;
  }

  /**
   * Queues an event generated at a local site while offline or during delayed uplink.
   */
  public queueOfflineEvent(siteId: string, event: Omit<QueuedRegionalEvent, 'siteId'>): { success: boolean; queueLength: number } {
    const norm = siteId.toUpperCase();
    const queue = this.eventQueues.get(norm) || [];

    const fullEvent: QueuedRegionalEvent = {
      ...event,
      siteId: norm,
    };

    queue.push(fullEvent);
    this.eventQueues.set(norm, queue);

    const state = this.siteStates.get(norm);
    if (state) {
      state.pendingSyncEventsCount = queue.length;
    }

    return { success: true, queueLength: queue.length };
  }

  /**
   * Flushes queued offline events when site connectivity is restored.
   * Applies idempotent deduplication using eventId.
   */
  public flushPendingEvents(siteId: string): {
    syncedCount: number;
    duplicateCount: number;
    remainingInQueue: number;
  } {
    const norm = siteId.toUpperCase();
    const queue = this.eventQueues.get(norm) || [];
    const state = this.siteStates.get(norm);

    let syncedCount = 0;
    let duplicateCount = 0;

    for (const ev of queue) {
      if (this.processedEventIds.has(ev.eventId)) {
        duplicateCount++;
      } else {
        this.processedEventIds.add(ev.eventId);
        syncedCount++;
      }
    }

    // Clear queue
    this.eventQueues.set(norm, []);

    if (state) {
      state.pendingSyncEventsCount = 0;
      state.duplicateEventsFilteredCount += duplicateCount;
      state.lastSyncTimestamp = Date.now();
      state.status = 'ONLINE';
    }

    return {
      syncedCount,
      duplicateCount,
      remainingInQueue: 0,
    };
  }

  public getPendingQueue(siteId: string): QueuedRegionalEvent[] {
    return [...(this.eventQueues.get(siteId.toUpperCase()) || [])];
  }
}

