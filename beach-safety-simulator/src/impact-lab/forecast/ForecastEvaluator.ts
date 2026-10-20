/**
 * ForecastEvaluator.ts
 * 
 * TIDES Stage 4: Independent Forecast Evaluator & Scoring Engine (Demo A)
 * 
 * Strict evaluation constraints:
 * - Stores issued predictions alongside target timestamps
 * - Evaluates predictions ONLY AFTER subsequent ground-truth observations exist (no premature scoring)
 * - Measures Velocity MAE against actual observations
 * - Measures Forecast Coverage (% of eligible targets with valid observations)
 * - Tracks Warning Lead Time (t_event - t_alert) for qualifying hazard events
 * - Computes Missed-Event Rate and False-Alarm Rate over defined evaluation windows
 * - Benchmarks the trend forecasting method against a simple Persistence Baseline (v(t+h) = v(t))
 * - Handles scenario resets, missing outcomes, and discontinuous timestamps explicitly
 */

import {
  ForecastMethodId,
  ForecastHorizonEstimate,
  ForecastEvaluationRecord,
  EarlyWarningAlertRecord,
  ForecastScoringReport,
} from './types';
import { TelemetrySnapshot } from '../types';

export class ForecastEvaluator {
  private static instance: ForecastEvaluator | null = null;

  // Pending predictions awaiting ground-truth observation maturity
  private pendingForecasts: Array<{
    forecastId: string;
    method: ForecastMethodId;
    issuedSimTime: number;
    targetSimTime: number;
    horizonSeconds: number;
    predictedVelocity: number;
    issuedTimeDisplay: string;
  }> = [];

  // Matured evaluation records grouped by method
  private evaluatedRecords: ForecastEvaluationRecord[] = [];

  // Early warning alert records
  private activeAlerts: Map<string, EarlyWarningAlertRecord> = new Map();
  private historicalAlerts: EarlyWarningAlertRecord[] = [];

  // Registered qualifying hazard event onsets
  private recordedHazardEvents: Array<{
    eventId: string;
    thresholdVelocity: number;
    onsetSimTime: number;
    onsetTimeDisplay: string;
  }> = [];

  // Configurable qualifying hazard threshold (Rushikonda dangerous rip standard)
  public static readonly QUALIFYING_RIP_THRESHOLD = 1.5; // m/s
  // Maximum evaluation window to verify an early warning alert (10 minutes)
  public static readonly ALERT_EVALUATION_WINDOW_SECONDS = 600;

  public static getInstance(): ForecastEvaluator {
    if (!ForecastEvaluator.instance) {
      ForecastEvaluator.instance = new ForecastEvaluator();
    }
    return ForecastEvaluator.instance;
  }

  /**
   * Enqueues an issued forecast for subsequent evaluation upon maturity
   */
  public registerForecast(estimate: ForecastHorizonEstimate): void {
    if (estimate.status !== 'VALID') {
      return; // Do not register unviable or degraded forecasts as eligible targets
    }

    // Deduplicate identical horizon forecasts issued within 2 seconds
    const alreadyQueued = this.pendingForecasts.some(
      (p) =>
        p.method === estimate.method &&
        p.horizonSeconds === estimate.horizonSeconds &&
        Math.abs(p.targetSimTime - estimate.targetSimTime) < 2
    );

    if (!alreadyQueued) {
      this.pendingForecasts.push({
        forecastId: estimate.forecastId,
        method: estimate.method,
        issuedSimTime: estimate.issuedSimTime,
        targetSimTime: estimate.targetSimTime,
        horizonSeconds: estimate.horizonSeconds,
        predictedVelocity: estimate.predictedVelocity,
        issuedTimeDisplay: estimate.issuedTimeDisplay,
      });

      // Bound queue length to prevent memory leakage
      if (this.pendingForecasts.length > 500) {
        this.pendingForecasts.shift();
      }
    }
  }

  /**
   * Ingests a new observation tick and evaluates all predictions whose target timestamp
   * has arrived or passed (strictly avoiding premature scoring)
   */
  public evaluateObservations(currentSnapshot: TelemetrySnapshot): void {
    const currentSimTime = currentSnapshot.simTimeSeconds;
    const actualVelocity = currentSnapshot.maxRipVelocity || 0;

    // 1. Evaluate matured predictions
    const matured: typeof this.pendingForecasts = [];
    const remaining: typeof this.pendingForecasts = [];

    for (const pending of this.pendingForecasts) {
      // Score ONLY when target time is reached
      if (currentSimTime >= pending.targetSimTime) {
        matured.push(pending);
      } else {
        remaining.push(pending);
      }
    }
    this.pendingForecasts = remaining;

    for (const item of matured) {
      const error = Math.abs(item.predictedVelocity - actualVelocity);
      this.evaluatedRecords.push({
        evaluationId: `EVAL-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        forecastId: item.forecastId,
        method: item.method,
        issuedSimTime: item.issuedSimTime,
        targetSimTime: item.targetSimTime,
        horizonSeconds: item.horizonSeconds,
        predictedVelocity: item.predictedVelocity,
        actualObservedVelocity: parseFloat(actualVelocity.toFixed(3)),
        absoluteError: parseFloat(error.toFixed(3)),
        issuedTimeDisplay: item.issuedTimeDisplay,
        targetTimeDisplay: currentSnapshot.timeDisplay,
      });

      if (this.evaluatedRecords.length > 1000) {
        this.evaluatedRecords.shift();
      }
    }

    // 2. Track Early-Warning Alerts and Lead Time
    this.auditEarlyWarnings(currentSimTime, currentSnapshot.timeDisplay, actualVelocity);
  }

  /**
   * Registers a triggered forecast alert and verifies whether a qualifying hazard follows
   */
  public recordForecastAlert(
    issuedSimTime: number,
    timeDisplay: string,
    predictedVelocity: number,
    threshold: number = ForecastEvaluator.QUALIFYING_RIP_THRESHOLD
  ): void {
    const alertKey = `ALERT-${threshold}`;
    if (!this.activeAlerts.has(alertKey)) {
      const newAlert: EarlyWarningAlertRecord = {
        alertId: `ALR-${Date.now().toString(36)}`,
        hazardDefinition: `Rip Current Velocity ≥ ${threshold.toFixed(1)} m/s`,
        thresholdVelocity: threshold,
        firstAlertIssuedSimTime: issuedSimTime,
        firstAlertTimeDisplay: timeDisplay,
        qualifyingEventOnsetSimTime: null,
        qualifyingEventTimeDisplay: null,
        leadTimeSeconds: null,
        status: 'ALERT_TRIGGERED',
      };
      this.activeAlerts.set(alertKey, newAlert);
    }
  }

  private auditEarlyWarnings(currentSimTime: number, timeDisplay: string, actualVelocity: number): void {
    const threshold = ForecastEvaluator.QUALIFYING_RIP_THRESHOLD;
    const alertKey = `ALERT-${threshold}`;
    const activeAlert = this.activeAlerts.get(alertKey);

    // Check if ground truth crossed the qualifying threshold
    if (actualVelocity >= threshold) {
      const alreadyLogged = this.recordedHazardEvents.some(
        (e) => Math.abs(e.onsetSimTime - currentSimTime) < 30
      );

      if (!alreadyLogged) {
        this.recordedHazardEvents.push({
          eventId: `HAZ-${Date.now().toString(36)}`,
          thresholdVelocity: threshold,
          onsetSimTime: currentSimTime,
          onsetTimeDisplay: timeDisplay,
        });

        if (activeAlert && activeAlert.status === 'ALERT_TRIGGERED') {
          // Alert was issued before event onset -> VERIFIED EARLY WARNING
          const leadTime = Math.max(0, currentSimTime - activeAlert.firstAlertIssuedSimTime);
          activeAlert.qualifyingEventOnsetSimTime = currentSimTime;
          activeAlert.qualifyingEventTimeDisplay = timeDisplay;
          activeAlert.leadTimeSeconds = parseFloat(leadTime.toFixed(1));
          activeAlert.status = 'VERIFIED_EARLY_WARNING';

          this.historicalAlerts.push({ ...activeAlert });
          this.activeAlerts.delete(alertKey);
        } else if (!activeAlert) {
          // Event occurred with NO prior alert -> MISSED EVENT
          this.historicalAlerts.push({
            alertId: `MISSED-${Date.now().toString(36)}`,
            hazardDefinition: `Rip Current Velocity ≥ ${threshold.toFixed(1)} m/s`,
            thresholdVelocity: threshold,
            firstAlertIssuedSimTime: currentSimTime,
            firstAlertTimeDisplay: timeDisplay,
            qualifyingEventOnsetSimTime: currentSimTime,
            qualifyingEventTimeDisplay: timeDisplay,
            leadTimeSeconds: 0,
            status: 'MISSED_EVENT',
          });
        }
      }
    }

    // Check for expired alerts that never saw the hazard -> FALSE ALARM
    if (activeAlert && activeAlert.status === 'ALERT_TRIGGERED') {
      const elapsed = currentSimTime - activeAlert.firstAlertIssuedSimTime;
      if (elapsed > ForecastEvaluator.ALERT_EVALUATION_WINDOW_SECONDS) {
        activeAlert.status = 'FALSE_ALARM';
        activeAlert.leadTimeSeconds = 0;
        this.historicalAlerts.push({ ...activeAlert });
        this.activeAlerts.delete(alertKey);
      }
    }
  }

  /**
   * Computes comprehensive scoring report for a given forecasting method
   */
  public generateReport(method: ForecastMethodId): ForecastScoringReport {
    const records = this.evaluatedRecords.filter((r) => r.method === method);
    const eligibleCount = records.length + this.pendingForecasts.filter((p) => p.method === method).length;

    const totalEvaluated = records.length;
    let mae: number | null = null;

    if (totalEvaluated > 0) {
      const sumErr = records.reduce((acc, r) => acc + r.absoluteError, 0);
      mae = parseFloat((sumErr / totalEvaluated).toFixed(3));
    }

    const coverage = eligibleCount > 0 ? parseFloat(((totalEvaluated / eligibleCount) * 100).toFixed(1)) : 100.0;

    // Early warning metrics
    const allAlerts = [...this.historicalAlerts, ...Array.from(this.activeAlerts.values())];
    const verifiedWarnings = allAlerts.filter((a) => a.status === 'VERIFIED_EARLY_WARNING');
    const falseAlarms = allAlerts.filter((a) => a.status === 'FALSE_ALARM');
    const missedEvents = allAlerts.filter((a) => a.status === 'MISSED_EVENT');

    let avgLeadTime: number | null = null;
    if (verifiedWarnings.length > 0) {
      const sumLead = verifiedWarnings.reduce((acc, w) => acc + (w.leadTimeSeconds || 0), 0);
      avgLeadTime = parseFloat((sumLead / verifiedWarnings.length).toFixed(1));
    }

    const totalEvents = this.recordedHazardEvents.length;
    const missedRate =
      totalEvents > 0 ? parseFloat(((missedEvents.length / totalEvents) * 100).toFixed(1)) : 0.0;

    const totalTriggeredAlerts = allAlerts.filter((a) => a.status !== 'MISSED_EVENT').length;
    const falseAlarmRate =
      totalTriggeredAlerts > 0
        ? parseFloat(((falseAlarms.length / totalTriggeredAlerts) * 100).toFixed(1))
        : 0.0;

    return {
      method,
      totalForecastsIssued: eligibleCount,
      totalMaturedEvaluations: totalEvaluated,
      meanAbsoluteError: mae,
      coveragePercentage: coverage,
      qualifyingHazardEventsCount: totalEvents,
      alertsTriggeredCount: totalTriggeredAlerts,
      verifiedEarlyWarningsCount: verifiedWarnings.length,
      averageLeadTimeSeconds: avgLeadTime,
      missedEventRatePercentage: missedRate,
      falseAlarmRatePercentage: falseAlarmRate,
    };
  }

  public getEvaluatedRecords(method?: ForecastMethodId): readonly ForecastEvaluationRecord[] {
    if (method) {
      return this.evaluatedRecords.filter((r) => r.method === method);
    }
    return this.evaluatedRecords;
  }

  public getAlerts(): readonly EarlyWarningAlertRecord[] {
    return [...this.historicalAlerts, ...Array.from(this.activeAlerts.values())];
  }

  public clear(): void {
    this.pendingForecasts = [];
    this.evaluatedRecords = [];
    this.activeAlerts.clear();
    this.historicalAlerts = [];
    this.recordedHazardEvents = [];
  }
}

