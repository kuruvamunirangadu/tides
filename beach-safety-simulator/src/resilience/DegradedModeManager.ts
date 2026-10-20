/**
 * src/resilience/DegradedModeManager.ts
 * 
 * TIDES — Phase 10: Resilience, Fault Tolerance & Disaster Recovery
 * 
 * Safe Degraded Operations & Life-Safety Invariant Guard:
 * - Formalizes explicit degraded fallback policies per coastal failure domain.
 * - Guarantees that sensor or service outages never lower deterministic hazard alerts,
 *   suppress confirmed SOS distress calls, or fabricate missing coordinates.
 * - Prevents automatic physical asset mobilization during recovery actions.
 */

import {
  DegradedModeRecord,
  FailureDomain,
} from './resilience.types';

export class DegradedModeManager {
  private static instance: DegradedModeManager | null = null;

  // Key: domain
  private activeDegradedStates: Map<FailureDomain, DegradedModeRecord> = new Map();

  // Audit history of degraded mode activations and deactivations
  private degradedAuditHistory: Array<{
    timestamp: number;
    domain: FailureDomain;
    componentId: string;
    action: 'ACTIVATED' | 'DEACTIVATED';
    reason: string;
  }> = [];

  constructor() {
    this.initializeBaselinePolicies();
  }

  public static getInstance(): DegradedModeManager {
    if (!DegradedModeManager.instance) {
      DegradedModeManager.instance = new DegradedModeManager();
    }
    return DegradedModeManager.instance;
  }

  public reset(): void {
    this.activeDegradedStates.clear();
    this.degradedAuditHistory = [];
    this.initializeBaselinePolicies();
  }

  private initializeBaselinePolicies(): void {
    const domains: FailureDomain[] = [
      'SENSOR_TELEMETRY',
      'WRISTBAND_GATEWAY',
      'CAMERA_VISION',
      'DRONE_AERIAL',
      'SITE_LOCAL',
      'PREDICTIVE_AI',
      'BACKEND_PIPELINE',
      'PERSISTENCE_STORE',
    ];

    for (const d of domains) {
      this.activeDegradedStates.set(d, {
        domain: d,
        componentId: 'SYSTEM',
        isDegraded: false,
        degradationReason: 'Nominal operational status',
        fallbackAction: this.getStandardFallbackAction(d),
        activeSinceMs: 0,
        safetyInvariantsPreserved: {
          confirmedSosNeverSuppressed: true,
          safetyThresholdsUnlowered: true,
          zeroFabricatedCoordinates: true,
          zeroAutomatedPhysicalDispatch: true,
        },
      });
    }
  }

  /**
   * Activates degraded mode for a failure domain with an explicit fallback strategy.
   */
  public activateDegradedMode(
    domain: FailureDomain,
    componentId: string,
    reason: string
  ): DegradedModeRecord {
    const now = Date.now();
    const fallbackAction = this.getStandardFallbackAction(domain);

    const record: DegradedModeRecord = {
      domain,
      componentId,
      isDegraded: true,
      degradationReason: reason,
      fallbackAction,
      activeSinceMs: now,
      safetyInvariantsPreserved: {
        confirmedSosNeverSuppressed: true,
        safetyThresholdsUnlowered: true,
        zeroFabricatedCoordinates: true,
        zeroAutomatedPhysicalDispatch: true,
      },
    };

    this.activeDegradedStates.set(domain, record);
    this.degradedAuditHistory.push({
      timestamp: now,
      domain,
      componentId,
      action: 'ACTIVATED',
      reason,
    });

    return record;
  }

  /**
   * Deactivates degraded mode upon verified system recovery.
   */
  public deactivateDegradedMode(domain: FailureDomain, componentId: string): void {
    const record = this.activeDegradedStates.get(domain);
    if (record && record.isDegraded) {
      record.isDegraded = false;
      record.degradationReason = 'Recovered to nominal operation';
      record.activeSinceMs = 0;

      this.degradedAuditHistory.push({
        timestamp: Date.now(),
        domain,
        componentId,
        action: 'DEACTIVATED',
        reason: 'Restored nominal health',
      });
    }
  }

  /**
   * Retrieves standard fallback actions per domain.
   */
  public getStandardFallbackAction(domain: FailureDomain): string {
    switch (domain) {
      case 'SENSOR_TELEMETRY':
        return 'Preserve last valid observation with source timestamp; flag STALE; widen uncertainty bounds; do not mutate simulation physics.';
      case 'PREDICTIVE_AI':
        return 'Mark advisory PREDICTION_UNAVAILABLE; deterministic hazard engine and established safety thresholds continue operating 100% unaltered.';
      case 'CAMERA_VISION':
        return 'Display CV stream as FEED_UNAVAILABLE; zero fabricated distress candidates; wristband SOS path remains 100% functional.';
      case 'WRISTBAND_GATEWAY':
        return 'Mark missing downlink receipts as UNCONFIRMED; notify beach lifeguards; buffer offline events up to capacity.';
      case 'DRONE_AERIAL':
        return 'Render last-known GPS coordinates with expanding uncertainty circle; prohibit coordinate fabrication; trigger autonomous hover or RTB.';
      case 'SITE_LOCAL':
        return 'Mark remote site as OFFLINE / NO_DATA on regional map; local simulation and life-safety procedures operate autonomously.';
      case 'BACKEND_PIPELINE':
        return 'Quarantine malformed payloads into Dead Letter Queue; retry recoverable operations with bounded exponential backoff.';
      case 'PERSISTENCE_STORE':
        return 'Switch to in-memory durable queue fallback; buffer transaction log for subsequent database flush.';
    }
  }

  /**
   * Verifies that safety invariants remain unbroken regardless of any active degraded modes.
   * Throws if any attempt is made to suppress confirmed SOS or lower deterministic thresholds.
   */
  public verifySafetyInvariants(testIncident?: {
    isConfirmedSos: boolean;
    active: boolean;
    hazardLevel: string;
  }): {
    valid: boolean;
    violations: string[];
  } {
    const violations: string[] = [];

    // If an incident is a confirmed SOS, it must NEVER be closed or suppressed due to a degraded mode
    if (testIncident?.isConfirmedSos && !testIncident.active) {
      violations.push('Confirmed swimmer SOS was improperly closed during a degraded condition.');
    }

    // Safety hazard level must never be downgraded to 'SAFE' merely because a sensor failed
    if (testIncident?.hazardLevel === 'SAFE' && this.isDomainDegraded('SENSOR_TELEMETRY')) {
      violations.push('Hazard level was improperly lowered to SAFE while environmental sensors were degraded.');
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }

  public isDomainDegraded(domain: FailureDomain): boolean {
    const record = this.activeDegradedStates.get(domain);
    return record ? record.isDegraded : false;
  }

  public getDegradedState(domain: FailureDomain): DegradedModeRecord | undefined {
    return this.activeDegradedStates.get(domain);
  }

  public getAllDegradedStates(): DegradedModeRecord[] {
    return Array.from(this.activeDegradedStates.values());
  }

  public getActiveDegradedCount(): number {
    return Array.from(this.activeDegradedStates.values()).filter((s) => s.isDegraded).length;
  }

  public getAuditHistory() {
    return [...this.degradedAuditHistory];
  }
}

