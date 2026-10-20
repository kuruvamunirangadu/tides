/**
 * ForecastTypes.ts
 * 
 * TIDES Milestone 6: Predictive Beach Safety Intelligence Data Contracts
 * Strictly decoupled, advisory-only contracts:
 * - Hazard forecasting (1m, 3m, 5m horizons)
 * - Transparent baselines (Persistence, Moving Average, Trend)
 * - Future visitor exposure mapping (current vs predicted)
 * - Advisory rescue readiness recommendations (operator review only)
 * - Ground-truth forecast evaluation scoring (MAE, RMSE, Bias, Coverage, False Alarm, Missed Event)
 */

export type ForecastMethodId =
  | 'PERSISTENCE_BASELINE'
  | 'MOVING_AVERAGE'
  | 'TREND_BASELINE';

export type ForecastValidityStatus =
  | 'VALID'
  | 'INSUFFICIENT_HISTORY'
  | 'DATA_STALE'
  | 'SENSOR_DEGRADED'
  | 'OUT_OF_BOUNDS';

export interface PredictionRecord {
  predictionId: string;
  hazardType: 'RIP_CURRENT' | 'WAVE_HEIGHT';
  sourceZoneId: string;
  sourceZoneName: string;
  observationTimestamp: number;
  forecastIssueTimestamp: number;
  targetTimestamp: number;
  horizonMinutes: number;           // 1, 3, 5 minutes
  observedValue: number;
  predictedValue: number;
  units: string;                    // 'm/s' or 'm'
  uncertaintyBand: { min: number; max: number };
  method: ForecastMethodId;
  inputQuality: 'HIGH' | 'MODERATE' | 'DEGRADED' | 'STALE';
  status: ForecastValidityStatus;
  limitations: string;
  isSimulatedEstimate: boolean;     // Always true for synthetic digital twin telemetry
  evaluated: boolean;
  actualObservedValue?: number;
  error?: number;
}

export interface ExposureForecastResult {
  horizonMinutes: number;
  targetSimTime: number;
  currentlyExposedVisitorsCount: number;
  predictedExposedVisitorsCount: number;
  exposedVisitorIds: string[];
  atRiskZoneIds: string[];
  assumptions: string;
}

export interface ReadinessRecommendation {
  id: string;
  severity: 'ADVISORY' | 'WARNING' | 'CRITICAL';
  title: string;
  description: string;
  affectedZoneId: string;
  availableBoatsCount: number;
  availableLifeguardsCount: number;
  occupiedResourcesCount: number;
  recommendedAction: string;
  isDispatched: false;              // STRICT: Never automatically dispatched
}

export interface EvaluationMetricsSummary {
  totalForecastsEvaluated: number;
  meanAbsoluteError: number | null; // MAE (m/s)
  rootMeanSquaredError: number | null; // RMSE (m/s)
  forecastBias: number | null;      // Bias (mean signed error)
  coveragePercentage: number;       // % eligible targets evaluated
  falseAlarmRatePercentage: number; // % alerts without qualifying hazard
  missedEventRatePercentage: number;// % hazards without prior alert
  averageLeadTimeSeconds: number | null; // Lead time for early warnings
}

