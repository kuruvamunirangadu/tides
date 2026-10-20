/**
 * src/calibration/DigitalTwinDiscrepancyMonitor.ts
 * 
 * TIDES — Phase 9: Digital Twin Calibration & Real-Time Synchronization
 * 
 * Discrepancy Detection and Monitoring Service.
 * Evaluates divergences between validated physical observations and digital-twin simulation state.
 * 
 * Non-Negotiable Invariants:
 * 1. Discrepancies do NOT automatically modify deterministic hazard rules, trigger rescue dispatches,
 *    or cancel safety warnings.
 * 2. All comparisons require unit, temporal, and geographic compatibility.
 * 3. Flagged discrepancies are preserved for human operator review and audit traceability.
 */

import {
  ObservationVariableType,
  DigitalTwinDiscrepancy,
  DiscrepancyClassification,
  UnifiedDigitalTwinObservation,
} from './digitalTwinObservation.types';

export class DigitalTwinDiscrepancyMonitor {
  private static instance: DigitalTwinDiscrepancyMonitor | null = null;
  private discrepancies: Map<string, DigitalTwinDiscrepancy> = new Map();
  private discrepancyCounter: number = 1;

  public static readonly TOLERANCES: Record<ObservationVariableType, { absolute: number; relativePct: number }> = {
    WAVE_HEIGHT: { absolute: 0.35, relativePct: 25.0 },     // 0.35m or 25%
    WAVE_PERIOD: { absolute: 2.0, relativePct: 20.0 },      // 2.0s
    WAVE_DIRECTION: { absolute: 30.0, relativePct: 25.0 },  // 30 deg
    WIND_SPEED: { absolute: 8.0, relativePct: 25.0 },       // 8.0 km/h
    WIND_DIRECTION: { absolute: 35.0, relativePct: 25.0 },  // 35 deg
    TIDE_LEVEL: { absolute: 0.25, relativePct: 20.0 },      // 0.25m
    WATER_CURRENT: { absolute: 0.25, relativePct: 30.0 },   // 0.25 m/s
    CURRENT_DIRECTION: { absolute: 30.0, relativePct: 25.0 },
    WATER_TEMPERATURE: { absolute: 1.5, relativePct: 10.0 },// 1.5 C
    VISIBILITY: { absolute: 2.0, relativePct: 25.0 },       // 2.0 km
    CV_DETECTION: { absolute: 0.2, relativePct: 30.0 },
    DRONE_TELEMETRY: { absolute: 5.0, relativePct: 15.0 },
    WRISTBAND_STATUS: { absolute: 10.0, relativePct: 20.0 },
  };

  public static getInstance(): DigitalTwinDiscrepancyMonitor {
    if (!DigitalTwinDiscrepancyMonitor.instance) {
      DigitalTwinDiscrepancyMonitor.instance = new DigitalTwinDiscrepancyMonitor();
    }
    return DigitalTwinDiscrepancyMonitor.instance;
  }

  public reset(): void {
    this.discrepancies.clear();
    this.discrepancyCounter = 1;
  }

  /**
   * Evaluates discrepancy between a validated real observation and corresponding simulation state.
   */
  public evaluateDiscrepancy(input: {
    siteId: string;
    entityId: string;
    variable: ObservationVariableType;
    observedValue: number;
    simulatedValue: number;
    units: string;
    observationTimestamp: number;
    measurementUncertainty?: number;
    isUncalibrated?: boolean;
    isStale?: boolean;
  }): DigitalTwinDiscrepancy {
    const absDiff = Math.abs(input.observedValue - input.simulatedValue);
    const denom = Math.max(Math.abs(input.simulatedValue), 0.001);
    const relDiffPct = (absDiff / denom) * 100.0;

    const tol = DigitalTwinDiscrepancyMonitor.TOLERANCES[input.variable] || { absolute: 1.0, relativePct: 25.0 };
    const uncertainty = input.measurementUncertainty || 0.1;

    let classification: DiscrepancyClassification = 'WITHIN_TOLERANCE';

    if (input.isStale) {
      classification = 'STALE_TWIN_STATE';
    } else if (input.isUncalibrated || uncertainty > tol.absolute) {
      classification = 'INSUFFICIENT_EVIDENCE';
    } else if (absDiff <= tol.absolute) {
      classification = 'WITHIN_TOLERANCE';
    } else if (absDiff <= tol.absolute * 1.5) {
      classification = 'EXPECTED_VARIATION';
    } else if (absDiff > tol.absolute * 3.0 && relDiffPct > 100) {
      classification = 'POTENTIAL_SENSOR_FAULT';
    } else {
      classification = 'UNEXPECTED_DIVERGENCE';
    }

    const discrepancyId = `DISC-${String(this.discrepancyCounter++).padStart(4, '0')}`;
    const discrepancy: DigitalTwinDiscrepancy = {
      discrepancyId,
      siteId: input.siteId,
      entityId: input.entityId,
      variable: input.variable,
      observedValue: Number(input.observedValue.toFixed(3)),
      simulatedValue: Number(input.simulatedValue.toFixed(3)),
      units: input.units,
      absoluteDifference: Number(absDiff.toFixed(3)),
      relativeDifferencePct: Number(relDiffPct.toFixed(1)),
      measurementUncertainty: uncertainty,
      applicableTolerance: tol.absolute,
      classification,
      timestamp: Date.now(),
      sourceTimestamp: input.observationTimestamp,
      reviewStatus: 'PENDING_REVIEW',
    };

    // Store in active discrepancy registry if divergence detected
    if (classification !== 'WITHIN_TOLERANCE') {
      this.discrepancies.set(discrepancyId, discrepancy);
    }

    return discrepancy;
  }

  public getDiscrepancy(discrepancyId: string): DigitalTwinDiscrepancy | undefined {
    return this.discrepancies.get(discrepancyId);
  }

  public getAllDiscrepancies(filters?: {
    siteId?: string;
    classification?: DiscrepancyClassification;
    reviewStatus?: string;
  }): DigitalTwinDiscrepancy[] {
    let list = Array.from(this.discrepancies.values());

    if (filters) {
      if (filters.siteId && filters.siteId !== 'ALL') {
        const norm = filters.siteId.toUpperCase();
        list = list.filter((d) => d.siteId.toUpperCase() === norm);
      }
      if (filters.classification) {
        list = list.filter((d) => d.classification === filters.classification);
      }
      if (filters.reviewStatus && filters.reviewStatus !== 'ALL') {
        list = list.filter((d) => d.reviewStatus === filters.reviewStatus);
      }
    }

    return list.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Operator reviews and updates the status of an identified discrepancy.
   */
  public updateReviewStatus(
    discrepancyId: string,
    status: 'ACKNOWLEDGED' | 'INVESTIGATING' | 'RESOLVED',
    operatorId: string,
    notes?: string
  ): { success: boolean; error?: string } {
    const d = this.discrepancies.get(discrepancyId);
    if (!d) return { success: false, error: `Discrepancy ${discrepancyId} not found.` };

    d.reviewStatus = status;
    d.reviewedBy = operatorId;
    d.reviewNotes = notes || `Status updated to ${status} by operator.`;
    return { success: true };
  }
}

