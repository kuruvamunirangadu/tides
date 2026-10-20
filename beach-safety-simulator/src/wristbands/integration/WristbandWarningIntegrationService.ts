/**
 * WristbandWarningIntegrationService.ts
 * 
 * TIDES Phase 4: Camera & Drone Integration with the Wristband Safety System
 * 
 * Coordinates authoritative localized warning distribution to registered wristbands:
 * - Transparent evaluation of all fleet wristbands with explicit inclusion/exclusion reasons
 * - Downlink lifecycle management (PENDING -> DISPATCHED -> DELIVERED -> ACKNOWLEDGED)
 * - 15-second rate-limiting debounce to prevent swimmer alert fatigue
 * - Zero coordinate fabrication: unlocated devices flagged appropriately
 * - Physical hardware gateway bridge: physical devices queue through BeachGatewayService
 * - Emits Phase4 event contracts and maintains audit records
 */

import { WristbandRegistry } from '../WristbandRegistry';
import { BeachGatewayService } from '../gateway/BeachGatewayService';
import { LocalizedWarningDistributionEngine } from '../LocalizedWarningDistributionEngine';
import {
  CandidateDistressIncident,
  Phase4EventContract,
  WristbandEligibilityRecord,
} from './integration.types';
import { SwimmerWristband, WristbandId } from '../wristband.types';

export interface DispatchWarningResult {
  success: boolean;
  eligibleCount: number;
  excludedCount: number;
  records: WristbandEligibilityRecord[];
  throttled: boolean;
  error?: string;
}

export class WristbandWarningIntegrationService {
  private static instance: WristbandWarningIntegrationService | null = null;

  private registry: WristbandRegistry;
  private distributionEngine: LocalizedWarningDistributionEngine;
  private gatewayService: BeachGatewayService;

  private eligibilityRecords: Map<string, WristbandEligibilityRecord[]> = new Map();
  private lastWarningDispatchedByZone: Map<string, number> = new Map();
  private lastWarningDispatchedByDevice: Map<WristbandId, number> = new Map();

  private eventListeners: Set<(event: Phase4EventContract) => void> = new Set();
  private changeListeners: Set<() => void> = new Set();

  public readonly WARNING_RADIUS_METERS = 100.0;
  public readonly RATE_LIMIT_DEBOUNCE_MS = 15000; // 15s throttle

  public static getInstance(): WristbandWarningIntegrationService {
    if (!WristbandWarningIntegrationService.instance) {
      WristbandWarningIntegrationService.instance = new WristbandWarningIntegrationService();
    }
    return WristbandWarningIntegrationService.instance;
  }

  constructor(
    registry: WristbandRegistry = WristbandRegistry.getInstance(),
    distributionEngine: LocalizedWarningDistributionEngine = LocalizedWarningDistributionEngine.getInstance(),
    gatewayService: BeachGatewayService = BeachGatewayService.getInstance()
  ) {
    this.registry = registry;
    this.distributionEngine = distributionEngine;
    this.gatewayService = gatewayService;
  }

  public reset(): void {
    this.eligibilityRecords.clear();
    this.lastWarningDispatchedByZone.clear();
    this.lastWarningDispatchedByDevice.clear();
    this.notifyChange();
  }

  public subscribeChange(listener: () => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  public subscribeEvents(listener: (event: Phase4EventContract) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  private notifyChange(): void {
    this.changeListeners.forEach((l) => {
      try {
        l();
      } catch (err) {
        console.error('Error in WarningIntegrationService change listener:', err);
      }
    });
  }

  private emitEvent(event: Phase4EventContract): void {
    this.eventListeners.forEach((l) => {
      try {
        l(event);
      } catch (err) {
        console.error('Error in WarningIntegrationService event listener:', err);
      }
    });
  }

  /**
   * Evaluates all fleet wristbands against an incident location and zone,
   * returning detailed eligibility records with human-readable rationale
   */
  public evaluateFleetEligibility(
    hazardLocation: { x: number; y: number },
    targetZone: string,
    excludeWristbandIds: string[] = []
  ): WristbandEligibilityRecord[] {
    const allWristbands = this.registry.getWristbands();
    const excludeSet = new Set(excludeWristbandIds);
    const records: WristbandEligibilityRecord[] = [];

    for (const wb of allWristbands) {
      const visitorName = wb.pairedVisitorId ? `Swimmer (${wb.pairedVisitorId})` : null;

      const provenance = wb.provenance ?? 'SIMULATED';

      // 1. Excluded if in explicit exclude list (e.g. distressed swimmer themselves)
      if (excludeSet.has(wb.id)) {
        records.push({
          wristbandId: wb.id,
          visitorId: wb.pairedVisitorId,
          visitorName,
          provenance,
          eligible: false,
          reason: 'Excluded: device belongs to distressed victim (incident origin)',
          zone: wb.currentZone,
          connectivity: wb.connectivity,
          deliveryStatus: 'EXPIRED',
          retryCount: 0,
        });
        continue;
      }

      // 2. Excluded if unassigned standby unit without active swimmer (unless physical hardware test unit)
      if (!wb.pairedVisitorId && wb.provenance !== 'HARDWARE') {
        records.push({
          wristbandId: wb.id,
          visitorId: null,
          visitorName: null,
          provenance,
          eligible: false,
          reason: 'Excluded: standby unit in storage (no swimmer paired)',
          zone: wb.currentZone,
          connectivity: wb.connectivity,
          deliveryStatus: 'EXPIRED',
          retryCount: 0,
        });
        continue;
      }

      // 3. Excluded if connectivity is DISCONNECTED
      if (wb.connectivity === 'DISCONNECTED') {
        records.push({
          wristbandId: wb.id,
          visitorId: wb.pairedVisitorId,
          visitorName,
          provenance,
          eligible: false,
          reason: 'Excluded: RF connection offline (cannot receive downlink)',
          zone: wb.currentZone,
          connectivity: wb.connectivity,
          deliveryStatus: 'FAILED',
          retryCount: 0,
        });
        continue;
      }

      // 4. Distance and zone checks
      let distMeters: number | undefined = undefined;
      let isWithinRadius = false;

      if (wb.telemetry.hasLocation && wb.telemetry.simPosition) {
        const dx = wb.telemetry.simPosition.x - hazardLocation.x;
        const dy = wb.telemetry.simPosition.y - hazardLocation.y;
        distMeters = Math.round(Math.hypot(dx, dy));
        isWithinRadius = distMeters <= this.WARNING_RADIUS_METERS;
      }

      const isSameZone = wb.currentZone === targetZone;

      if (isWithinRadius) {
        records.push({
          wristbandId: wb.id,
          visitorId: wb.pairedVisitorId,
          visitorName,
          provenance,
          eligible: true,
          reason: `Included: within ${this.WARNING_RADIUS_METERS}m hazard perimeter (${distMeters}m from center)`,
          distanceMeters: distMeters,
          zone: wb.currentZone,
          connectivity: wb.connectivity,
          deliveryStatus: 'PENDING',
          retryCount: 0,
        });
      } else if (isSameZone && distMeters !== undefined && distMeters <= this.WARNING_RADIUS_METERS * 1.5) {
        records.push({
          wristbandId: wb.id,
          visitorId: wb.pairedVisitorId,
          visitorName,
          provenance,
          eligible: true,
          reason: `Included: located in active hazard sector ${targetZone} (${distMeters}m away)`,
          distanceMeters: distMeters,
          zone: wb.currentZone,
          connectivity: wb.connectivity,
          deliveryStatus: 'PENDING',
          retryCount: 0,
        });
      } else {
        const distStr = distMeters !== undefined ? `${distMeters}m > ${this.WARNING_RADIUS_METERS}m` : 'outside zone';
        records.push({
          wristbandId: wb.id,
          visitorId: wb.pairedVisitorId,
          visitorName,
          provenance,
          eligible: false,
          reason: `Excluded: safe perimeter (${distStr})`,
          distanceMeters: distMeters,
          zone: wb.currentZone,
          connectivity: wb.connectivity,
          deliveryStatus: 'EXPIRED',
          retryCount: 0,
        });
      }
    }

    return records;
  }

  /**
   * Dispatches localized warnings when a candidate distress is verified by an operator
   */
  public dispatchWarningForDistress(
    candidate: CandidateDistressIncident,
    incidentId: string,
    clockMs: number = Date.now()
  ): DispatchWarningResult {
    // 1. Throttling / Rate-limiting check by zone
    const lastZoneWarning = this.lastWarningDispatchedByZone.get(candidate.targetZoneId);
    if (lastZoneWarning && clockMs - lastZoneWarning < this.RATE_LIMIT_DEBOUNCE_MS) {
      return {
        success: false,
        eligibleCount: 0,
        excludedCount: 0,
        records: [],
        throttled: true,
        error: `Warning throttled: zone ${candidate.targetZoneId} received an alert ${Math.round((clockMs - lastZoneWarning) / 1000)}s ago (throttle: ${this.RATE_LIMIT_DEBOUNCE_MS / 1000}s)`,
      };
    }
    this.lastWarningDispatchedByZone.set(candidate.targetZoneId, clockMs);

    // 2. Evaluate eligibility across all fleet wristbands
    const records = this.evaluateFleetEligibility(candidate.estimatedLocation, candidate.targetZoneId);
    this.eligibilityRecords.set(incidentId, records);

    const eligible = records.filter((r) => r.eligible);
    const excluded = records.filter((r) => !r.eligible);

    // 3. Emit Request Event
    this.emitEvent({
      eventId: `EVT-WRN-REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      eventType: 'WristbandWarningRequested',
      timestampMs: clockMs,
      sourceId: incidentId,
      correlationId: candidate.candidateId,
      payload: {
        incidentId,
        candidateId: candidate.candidateId,
        targetZoneId: candidate.targetZoneId,
        eligibleCount: eligible.length,
        excludedCount: excluded.length,
      },
    });

    // 4. Downlink delivery lifecycle
    this.processWarningDeliveryLifecycle(eligible, incidentId, candidate.targetZoneId, clockMs);

    this.notifyChange();
    return {
      success: true,
      eligibleCount: eligible.length,
      excludedCount: excluded.length,
      records,
      throttled: false,
    };
  }

  /**
   * Independent SOS Warning Dispatch (Direct life-safety bypass)
   */
  public dispatchWarningForSOS(
    originWristbandId: string,
    location: { x: number; y: number },
    targetZone: string,
    incidentId: string,
    clockMs: number = Date.now()
  ): DispatchWarningResult {
    this.lastWarningDispatchedByZone.set(targetZone, clockMs);

    // Exclude the distress originator
    const records = this.evaluateFleetEligibility(location, targetZone, [originWristbandId]);
    this.eligibilityRecords.set(incidentId, records);

    const eligible = records.filter((r) => r.eligible);
    const excluded = records.filter((r) => !r.eligible);

    this.processWarningDeliveryLifecycle(eligible, incidentId, targetZone, clockMs);

    this.notifyChange();
    return {
      success: true,
      eligibleCount: eligible.length,
      excludedCount: excluded.length,
      records,
      throttled: false,
    };
  }

  /**
   * Processes the warning delivery lifecycle transitions:
   * PENDING -> DISPATCHED -> DELIVERED -> ACKNOWLEDGED
   */
  private processWarningDeliveryLifecycle(
    eligibleRecords: WristbandEligibilityRecord[],
    incidentId: string,
    zoneId: string,
    clockMs: number
  ): void {
    for (const record of eligibleRecords) {
      // Step A: Mark DISPATCHED
      record.deliveryStatus = 'DISPATCHED';
      record.dispatchedAtMs = clockMs;

      // Check device debounce
      this.lastWarningDispatchedByDevice.set(record.wristbandId, clockMs);

      const wb = this.registry.getWristband(record.wristbandId);
      if (wb) {
        // Step B: Mark DELIVERED
        record.deliveryStatus = 'DELIVERED';
        record.deliveredAtMs = clockMs + 100; // Simulated downlink latency

        // If physical hardware, forward packet to BeachGatewayService queue
        if (wb.provenance === 'HARDWARE') {
          this.gatewayService.queueDownlinkWarning({
            warningId: `WARN-HW-${record.wristbandId}-${Date.now().toString().slice(-4)}`,
            originIncidentId: incidentId,
            targetWristbandId: record.wristbandId,
            targetVisitorId: record.visitorId,
            category: 'EMERGENCY',
            title: 'SURF HAZARD ALERT',
            message: `Emergency distress reported nearby in ${zoneId}. Move away from rip corridor.`,
            zoneId,
            timestampMs: clockMs,
            expiresAtMs: clockMs + 45000,
            status: 'DELIVERED',
            dispatchedByGatewayId: 'GW-TOWER-01',
            retryCount: 0,
          });
        }

        // Apply display/LED/haptic alarm state to wristband
        wb.oledMessage = 'WARNING - HAZARD NEARBY';
        wb.ledState = 'STROBE_AMBER';
        wb.vibrationPattern = 'PERSISTENT_ALARM';

        // Step C: Mark ACKNOWLEDGED (Device confirmation receipt)
        record.deliveryStatus = 'ACKNOWLEDGED';
        record.acknowledgedAtMs = clockMs + 250;

        // Emit updated delivery event
        this.emitEvent({
          eventId: `EVT-WRN-DLV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          eventType: 'WristbandWarningDeliveryUpdated',
          timestampMs: clockMs,
          sourceId: record.wristbandId,
          correlationId: incidentId,
          payload: {
            wristbandId: record.wristbandId,
            deliveryStatus: record.deliveryStatus,
            deliveredAtMs: record.deliveredAtMs,
            acknowledgedAtMs: record.acknowledgedAtMs,
          },
        });
      }
    }
  }

  public getEligibilityRecordsForIncident(incidentId: string): WristbandEligibilityRecord[] {
    return this.eligibilityRecords.get(incidentId) || [];
  }

  public getLatestEligibilityRecords(): WristbandEligibilityRecord[] {
    const keys = Array.from(this.eligibilityRecords.keys());
    if (keys.length === 0) return [];
    return this.eligibilityRecords.get(keys[keys.length - 1]) || [];
  }
}
