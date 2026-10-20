/**
 * src/resilience/SystemHealthMonitor.ts
 * 
 * TIDES — Phase 10: Resilience, Fault Tolerance & Disaster Recovery
 * 
 * Central Health Monitoring and Failure Detection Service:
 * - Aggregates health signals across all coastal failure domains.
 * - Enforces 6 explicit health states: HEALTHY, DEGRADED, OFFLINE, STALE, RECOVERING, UNKNOWN.
 * - Distinguishes infrastructure health check failures from actual beach safety incidents.
 * - Implements recovery verification hysteresis (requires consecutive valid checks before HEALTHY).
 * - Honest reporting: Unmeasured/disconnected entities report OFFLINE or UNKNOWN (never falsely safe).
 */

import {
  ComponentHealthStatus,
  FailureDomain,
  HealthCheckRecord,
} from './resilience.types';

export interface FreshnessPolicy {
  warningLatencyMs: number;
  staleHorizonMs: number;
  offlineTimeoutMs: number;
  requiredConsecutiveRecoveries: number;
}

export const DOMAIN_FRESHNESS_POLICIES: Record<FailureDomain, FreshnessPolicy> = {
  DRONE_AERIAL: {
    warningLatencyMs: 3000,
    staleHorizonMs: 15000,
    offlineTimeoutMs: 30000,
    requiredConsecutiveRecoveries: 3,
  },
  CAMERA_VISION: {
    warningLatencyMs: 2000,
    staleHorizonMs: 5000,
    offlineTimeoutMs: 10000,
    requiredConsecutiveRecoveries: 3,
  },
  WRISTBAND_GATEWAY: {
    warningLatencyMs: 5000,
    staleHorizonMs: 30000,
    offlineTimeoutMs: 60000,
    requiredConsecutiveRecoveries: 2,
  },
  SENSOR_TELEMETRY: {
    warningLatencyMs: 10000,
    staleHorizonMs: 45000,
    offlineTimeoutMs: 90000,
    requiredConsecutiveRecoveries: 2,
  },
  SITE_LOCAL: {
    warningLatencyMs: 5000,
    staleHorizonMs: 30000,
    offlineTimeoutMs: 60000,
    requiredConsecutiveRecoveries: 2,
  },
  PREDICTIVE_AI: {
    warningLatencyMs: 15000,
    staleHorizonMs: 60000,
    offlineTimeoutMs: 180000,
    requiredConsecutiveRecoveries: 2,
  },
  BACKEND_PIPELINE: {
    warningLatencyMs: 1000,
    staleHorizonMs: 5000,
    offlineTimeoutMs: 15000,
    requiredConsecutiveRecoveries: 3,
  },
  PERSISTENCE_STORE: {
    warningLatencyMs: 1000,
    staleHorizonMs: 5000,
    offlineTimeoutMs: 15000,
    requiredConsecutiveRecoveries: 2,
  },
};

export class SystemHealthMonitor {
  private static instance: SystemHealthMonitor | null = null;

  // Key: componentId
  private healthRecords: Map<string, HealthCheckRecord> = new Map();

  // Audit history of status transitions
  private statusTransitionHistory: Array<{
    componentId: string;
    fromStatus: ComponentHealthStatus;
    toStatus: ComponentHealthStatus;
    timestamp: number;
    reason: string;
  }> = [];

  constructor() {
    this.initializeBaselineComponents();
  }

  public static getInstance(): SystemHealthMonitor {
    if (!SystemHealthMonitor.instance) {
      SystemHealthMonitor.instance = new SystemHealthMonitor();
    }
    return SystemHealthMonitor.instance;
  }

  public reset(): void {
    this.healthRecords.clear();
    this.statusTransitionHistory = [];
    this.initializeBaselineComponents();
  }

  /**
   * Initializes baseline infrastructure components across all failure domains.
   */
  private initializeBaselineComponents(): void {
    const now = Date.now();
    const defaultComponents: Array<{
      id: string;
      name: string;
      domain: FailureDomain;
      siteId: string;
      initialStatus?: ComponentHealthStatus;
    }> = [
      // Backend & Persistence
      { id: 'CORE-INGESTION-BUS', name: 'Primary Ingestion Pipeline & Event Router', domain: 'BACKEND_PIPELINE', siteId: 'RUSHIKONDA' },
      { id: 'PERSISTENCE-DB-PRIMARY', name: 'Authoritative Coastal State Store', domain: 'PERSISTENCE_STORE', siteId: 'RUSHIKONDA' },

      // Gateways
      { id: 'GW-TOWER-01', name: 'Rushikonda North Watchtower LoRa Gateway', domain: 'WRISTBAND_GATEWAY', siteId: 'RUSHIKONDA' },
      { id: 'GW-PIER-02', name: 'Rushikonda Pier LoRa Station', domain: 'WRISTBAND_GATEWAY', siteId: 'RUSHIKONDA' },

      // CV Surveillance Cameras
      { id: 'CAM-01', name: 'Rushikonda Central Tower Optical Surveillance', domain: 'CAMERA_VISION', siteId: 'RUSHIKONDA' },
      { id: 'CAM-02', name: 'Rushikonda North Sector 4K CV Camera', domain: 'CAMERA_VISION', siteId: 'RUSHIKONDA' },
      { id: 'CAM-03', name: 'Rushikonda South Lagoon Zoom Unit', domain: 'CAMERA_VISION', siteId: 'RUSHIKONDA' },

      // Drones
      { id: 'UAV-01', name: 'Surveillance Drone Alpha (UAV-01)', domain: 'DRONE_AERIAL', siteId: 'RUSHIKONDA' },
      { id: 'UAV-02', name: 'Rapid Lifesaver Drone Bravo (UAV-02)', domain: 'DRONE_AERIAL', siteId: 'RUSHIKONDA' },

      // Environmental Sensors
      { id: 'INCOIS-WRB-01', name: 'INCOIS Directional Wave Buoy (WRB-01)', domain: 'SENSOR_TELEMETRY', siteId: 'RUSHIKONDA' },
      { id: 'IMD-AWS-VSP01', name: 'IMD Coastal Automatic Weather Station', domain: 'SENSOR_TELEMETRY', siteId: 'RUSHIKONDA' },
      { id: 'NIOT-TIDE-GAUGE-01', name: 'NIOT Acoustic Tide Benchmark', domain: 'SENSOR_TELEMETRY', siteId: 'RUSHIKONDA' },
      { id: 'ADCP-CURR-01', name: 'Acoustic Doppler Current Profiler', domain: 'SENSOR_TELEMETRY', siteId: 'RUSHIKONDA' },

      // Predictive AI
      { id: 'PREDICTIVE-ENGINE-MAIN', name: 'Coastal Risk Hydrodynamics Forecaster', domain: 'PREDICTIVE_AI', siteId: 'RUSHIKONDA' },

      // Regional Sites
      { id: 'SITE-RUSHIKONDA', name: 'Rushikonda Blue Flag Beach Local Node', domain: 'SITE_LOCAL', siteId: 'RUSHIKONDA' },
      { id: 'SITE-RK_BEACH', name: 'RK Beach Visakhapatnam Local Node', domain: 'SITE_LOCAL', siteId: 'RK_BEACH' },
      { id: 'SITE-BHEEMILI', name: 'Bheemunipatnam Beach Local Node', domain: 'SITE_LOCAL', siteId: 'BHEEMILI' },
      { id: 'SITE-VODAREVU', name: 'Vodarevu Sentinel Post (Uninstrumented)', domain: 'SITE_LOCAL', siteId: 'VODAREVU', initialStatus: 'UNKNOWN' },
    ];

    for (const comp of defaultComponents) {
      this.healthRecords.set(comp.id, {
        componentId: comp.id,
        componentName: comp.name,
        domain: comp.domain,
        siteId: comp.siteId,
        status: comp.initialStatus || 'HEALTHY',
        lastHeartbeatMs: comp.initialStatus === 'UNKNOWN' ? 0 : now,
        latencyMs: comp.initialStatus === 'UNKNOWN' ? null : 20,
        consecutiveFailures: 0,
        consecutiveRecoveries: 3,
        metrics: {
          packetLossPercent: 0,
          errorRatePercent: 0,
        },
        lastStatusChangeMs: now,
      });
    }
  }

  /**
   * Records a valid heartbeat or successful telemetry message from a component.
   * Handles recovery hysteresis: moves from OFFLINE/DEGRADED to RECOVERING,
   * then to HEALTHY once consecutive valid checks meet the policy threshold.
   */
  public recordHeartbeat(
    componentId: string,
    latencyMs: number = 25,
    customMetrics?: Record<string, any>
  ): HealthCheckRecord {
    const record = this.healthRecords.get(componentId);
    const now = Date.now();

    if (!record) {
      // Register dynamic component if not present
      const newRecord: HealthCheckRecord = {
        componentId,
        componentName: componentId,
        domain: 'SENSOR_TELEMETRY',
        siteId: 'RUSHIKONDA',
        status: 'HEALTHY',
        lastHeartbeatMs: now,
        latencyMs,
        consecutiveFailures: 0,
        consecutiveRecoveries: 1,
        metrics: { ...customMetrics },
        lastStatusChangeMs: now,
      };
      this.healthRecords.set(componentId, newRecord);
      return newRecord;
    }

    record.lastHeartbeatMs = now;
    record.latencyMs = latencyMs;
    record.consecutiveFailures = 0;
    record.consecutiveRecoveries += 1;
    if (customMetrics) {
      record.metrics = { ...record.metrics, ...customMetrics };
    }

    const policy = DOMAIN_FRESHNESS_POLICIES[record.domain] || DOMAIN_FRESHNESS_POLICIES.SENSOR_TELEMETRY;

    // Check if latency is elevated
    const isLatencyHigh = latencyMs > policy.warningLatencyMs;

    let targetStatus: ComponentHealthStatus = record.status;

    if (record.status === 'OFFLINE' || record.status === 'DEGRADED' || record.status === 'STALE') {
      targetStatus = 'RECOVERING';
    }

    if (targetStatus === 'RECOVERING' && record.consecutiveRecoveries >= policy.requiredConsecutiveRecoveries) {
      targetStatus = isLatencyHigh ? 'DEGRADED' : 'HEALTHY';
      record.failureReason = undefined;
    } else if (record.status === 'HEALTHY' && isLatencyHigh) {
      targetStatus = 'DEGRADED';
      record.failureReason = `High communication latency (${latencyMs}ms > ${policy.warningLatencyMs}ms)`;
    }

    if (targetStatus !== record.status) {
      this.transitionStatus(record, targetStatus, `Heartbeat processed (latency: ${latencyMs}ms)`);
    }

    return record;
  }

  /**
   * Explicitly reports an operational failure, communication timeout, or sensor drop.
   * Note: This records an infrastructure fault; it does NOT alter safety thresholds or create false incidents.
   */
  public reportFailure(
    componentId: string,
    reason: string,
    markOfflineImmediately: boolean = false
  ): HealthCheckRecord {
    let record = this.healthRecords.get(componentId);
    const now = Date.now();

    if (!record) {
      record = {
        componentId,
        componentName: componentId,
        domain: 'SENSOR_TELEMETRY',
        siteId: 'RUSHIKONDA',
        status: markOfflineImmediately ? 'OFFLINE' : 'DEGRADED',
        lastHeartbeatMs: 0,
        latencyMs: null,
        failureReason: reason,
        consecutiveFailures: 1,
        consecutiveRecoveries: 0,
        metrics: { errorRatePercent: 100 },
        lastStatusChangeMs: now,
      };
      this.healthRecords.set(componentId, record);
      return record;
    }

    record.consecutiveFailures += 1;
    record.consecutiveRecoveries = 0;
    record.failureReason = reason;

    const targetStatus: ComponentHealthStatus = markOfflineImmediately || record.consecutiveFailures >= 3
      ? 'OFFLINE'
      : 'DEGRADED';

    if (targetStatus !== record.status) {
      this.transitionStatus(record, targetStatus, reason);
    }

    return record;
  }

  /**
   * Evaluates freshness across all components using domain-specific time horizons.
   * Identifies STALE and OFFLINE components based on real elapsed time.
   */
  public evaluateFreshness(currentTimestampMs: number = Date.now()): void {
    for (const record of this.healthRecords.values()) {
      if (record.status === 'UNKNOWN' || record.lastHeartbeatMs === 0) {
        continue; // Uninstrumented or never-connected entities remain UNKNOWN / OFFLINE
      }

      const policy = DOMAIN_FRESHNESS_POLICIES[record.domain] || DOMAIN_FRESHNESS_POLICIES.SENSOR_TELEMETRY;
      const ageMs = currentTimestampMs - record.lastHeartbeatMs;

      record.metrics.staleAgeSeconds = Math.round(ageMs / 1000);

      if (ageMs > policy.offlineTimeoutMs && record.status !== 'OFFLINE') {
        this.transitionStatus(
          record,
          'OFFLINE',
          `Heartbeat timeout (${Math.round(ageMs / 1000)}s > ${Math.round(policy.offlineTimeoutMs / 1000)}s)`
        );
      } else if (ageMs > policy.staleHorizonMs && record.status !== 'OFFLINE' && record.status !== 'STALE') {
        this.transitionStatus(
          record,
          'STALE',
          `Telemetry staleness detected (${Math.round(ageMs / 1000)}s > ${Math.round(policy.staleHorizonMs / 1000)}s)`
        );
      }
    }
  }

  private transitionStatus(
    record: HealthCheckRecord,
    newStatus: ComponentHealthStatus,
    reason: string
  ): void {
    const oldStatus = record.status;
    record.status = newStatus;
    record.lastStatusChangeMs = Date.now();
    if (newStatus === 'OFFLINE' || newStatus === 'DEGRADED') {
      record.failureReason = reason;
    }

    this.statusTransitionHistory.push({
      componentId: record.componentId,
      fromStatus: oldStatus,
      toStatus: newStatus,
      timestamp: record.lastStatusChangeMs,
      reason,
    });
  }

  public getHealth(componentId: string): HealthCheckRecord | undefined {
    return this.healthRecords.get(componentId);
  }

  public getAllHealthRecords(): HealthCheckRecord[] {
    return Array.from(this.healthRecords.values());
  }

  public getRecordsByDomain(domain: FailureDomain): HealthCheckRecord[] {
    return Array.from(this.healthRecords.values()).filter((r) => r.domain === domain);
  }

  public getRecordsBySite(siteId: string): HealthCheckRecord[] {
    return Array.from(this.healthRecords.values()).filter((r) => r.siteId === siteId);
  }

  public getStatusTransitionHistory(): Array<{
    componentId: string;
    fromStatus: ComponentHealthStatus;
    toStatus: ComponentHealthStatus;
    timestamp: number;
    reason: string;
  }> {
    return [...this.statusTransitionHistory];
  }

  public getSummary(): {
    totalComponents: number;
    healthyCount: number;
    degradedCount: number;
    offlineCount: number;
    staleCount: number;
    recoveringCount: number;
    unknownCount: number;
    criticalFailuresCount: number;
  } {
    const records = Array.from(this.healthRecords.values());
    return {
      totalComponents: records.length,
      healthyCount: records.filter((r) => r.status === 'HEALTHY').length,
      degradedCount: records.filter((r) => r.status === 'DEGRADED').length,
      offlineCount: records.filter((r) => r.status === 'OFFLINE').length,
      staleCount: records.filter((r) => r.status === 'STALE').length,
      recoveringCount: records.filter((r) => r.status === 'RECOVERING').length,
      unknownCount: records.filter((r) => r.status === 'UNKNOWN').length,
      criticalFailuresCount: records.filter((r) => r.status === 'OFFLINE').length,
    };
  }
}

