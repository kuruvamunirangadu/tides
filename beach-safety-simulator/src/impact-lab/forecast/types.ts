/**
 * types.ts
 * 
 * TIDES Stage 4: Predictive Hazard Forecasting Data Contracts (Demo A)
 * 
 * Strictly decoupled data structures for:
 * - Multi-horizon rip-current forecasting (1m, 3m, 5m)
 * - Explicit validity and stale-data flags (never fabricated)
 * - Evaluation scoring (MAE, Coverage, Lead Time, Missed Event Rate, False Alarm Rate)
 * - Comparison against simple Persistence Baseline (v(t+h) = v(t))
 * - Repeatable scenario test fixtures
 */

export type ForecastMethodId = 'TREND_EXTRAPOLATION' | 'PERSISTENCE_BASELINE';

export type ForecastValidityStatus =
  | 'VALID'
  | 'INSUFFICIENT_HISTORY'
  | 'DATA_STALE'
  | 'SENSOR_DEGRADED'
  | 'DISCONTINUOUS_TIME'
  | 'OUT_OF_BOUNDS';

export interface ForecastHorizonEstimate {
  forecastId: string;
  method: ForecastMethodId;
  horizonSeconds: number;       // 60, 180, 300
  horizonLabel: string;         // '1 min (+60s)', '3 min (+180s)', '5 min (+300s)'
  issuedSimTime: number;
  targetSimTime: number;
  issuedTimeDisplay: string;
  targetTimeDisplay: string;
  observedInputVelocity: number; // m/s observed at issue time
  predictedVelocity: number;    // m/s predicted at targetSimTime
  uncertaintyBand: { min: number; max: number }; // [min, max] plausible velocity
  predictedRiskScore: number;   // 0 - 100
  predictedRiskCategory: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  status: ForecastValidityStatus;
  isExperimental: boolean;      // Always true: clearly marks predictions as experimental
  confidenceScore: number;      // 0.0 - 1.0 heuristic score decaying with horizon
  reason?: string;              // Reason when status !== 'VALID'
}

export interface ZoneForecast {
  zoneId: string;
  zoneName: string;
  currentRipVelocity: number;
  currentRiskScore: number;
  estimates: Record<number, ForecastHorizonEstimate>;
}

export interface ForecastEvaluationRecord {
  evaluationId: string;
  forecastId: string;
  method: ForecastMethodId;
  issuedSimTime: number;
  targetSimTime: number;
  horizonSeconds: number;
  predictedVelocity: number;
  actualObservedVelocity: number;
  absoluteError: number;
  issuedTimeDisplay: string;
  targetTimeDisplay: string;
}

export interface EarlyWarningAlertRecord {
  alertId: string;
  hazardDefinition: string;     // e.g. "Rip Current Velocity > 1.5 m/s"
  thresholdVelocity: number;
  firstAlertIssuedSimTime: number;
  firstAlertTimeDisplay: string;
  qualifyingEventOnsetSimTime: number | null;
  qualifyingEventTimeDisplay: string | null;
  leadTimeSeconds: number | null; // t_event - t_alert
  status: 'ALERT_TRIGGERED' | 'VERIFIED_EARLY_WARNING' | 'FALSE_ALARM' | 'MISSED_EVENT';
}

export interface ForecastScoringReport {
  method: ForecastMethodId;
  totalForecastsIssued: number;
  totalMaturedEvaluations: number;
  meanAbsoluteError: number | null; // Velocity MAE (m/s)
  coveragePercentage: number;       // % eligible targets with valid observations
  qualifyingHazardEventsCount: number;
  alertsTriggeredCount: number;
  verifiedEarlyWarningsCount: number;
  averageLeadTimeSeconds: number | null; // Average lead time across verified warnings
  missedEventRatePercentage: number;    // Fraction of hazard events without preceding alert
  falseAlarmRatePercentage: number;     // Fraction of alerts without qualifying event
}

export interface Stage4TestExecutionRecord {
  testId: string;
  name: string;
  description: string;
  expectedOutcome: string;
  actualOutcome: string;
  passed: boolean;
  trendMAE: number | null;
  baselineMAE: number | null;
  leadTimeSeconds: number | null;
  coveragePercentage: number;
  notes: string;
}

