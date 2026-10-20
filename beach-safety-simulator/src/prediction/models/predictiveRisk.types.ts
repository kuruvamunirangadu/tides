/**
 * predictiveRisk.types.ts
 * 
 * TIDES — Phase 7: Predictive Models & Advisory Contracts
 * 
 * Strict decoupled advisory contracts:
 * - Multi-horizon risk forecasting (15m, 30m, 60m / 1m, 3m, 5m)
 * - Transparent baselines (Persistence Baseline, Moving Average)
 * - Calibrated coastal risk model with widening uncertainty intervals
 * - Disagreement flagging between deterministic hazard engine and predictive advisory
 * - Comprehensive evaluation metrics (MAE, RMSE, Bias, Coverage, False Alarm Rate, Missed Event Rate)
 */

import { ForecastHorizon, RiskTrend } from './PredictionTypes';
import { DataProvenance } from '../pipeline/environmentalIngestion.types';

export type { ForecastHorizon, RiskTrend };

export type PredictionModelId =
  | 'PERSISTENCE_BASELINE'
  | 'MOVING_AVERAGE_BASELINE'
  | 'CALIBRATED_COASTAL_RISK_FORECASTER';

export type PredictionStatus =
  | 'VALID'
  | 'INSUFFICIENT_HISTORY'
  | 'DATA_STALE'
  | 'SENSOR_DEGRADED'
  | 'PREDICTION_UNAVAILABLE';

export interface UncertaintyInterval {
  min: number;
  max: number;
  confidencePercent: number; // e.g. 95%
}

export interface ZoneHorizonPrediction {
  zoneId: string;
  horizon: ForecastHorizon;
  horizonMinutes: number; // 15, 30, 60
  predictedVelocityMs: number;
  escalationProbability: number; // 0.0 to 1.0
  riskCategory: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  trend: RiskTrend;
  uncertaintyBand: UncertaintyInterval;
  keyDrivers: string[];
  status: PredictionStatus;
  limitations?: string;
  modelConfidence: number; // 0.0 to 1.0
}

export interface ModelPredictionDossier {
  modelId: PredictionModelId;
  modelVersion: string;
  issueTimestamp: number;
  zoneId: string;
  predictions: Record<ForecastHorizon, ZoneHorizonPrediction>;
  provenance: DataProvenance;
  inputFreshnessSeconds: number;
  status: PredictionStatus;
  evaluated: boolean;
}

export interface PredictiveAdvisoryRecord {
  advisoryId: string;
  timestamp: number;
  zoneId: string;
  zoneName: string;

  // Authoritative Deterministic Status (From HazardEngine)
  deterministicSeverity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  activeDeterministicHazardsCount: number;
  deterministicPrimaryThreat?: string;

  // Advisory Predictive Outlook
  advisoryModelId: PredictionModelId;
  advisorySeverity15m: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  advisorySeverity30m: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  escalationProbability30m: number;
  predictedRipVelocityMs30m: number;
  uncertaintyBand30m: UncertaintyInterval;
  advisoryTrend: RiskTrend;
  advisoryConfidence: number;
  keyDrivers: string[];
  provenance: DataProvenance;
  dataQualityScore: number;

  // Disagreement Flagging
  hasDisagreement: boolean;
  disagreementReason?: string;
  recommendedOperatorReviewAction: string;

  // Strict Life-Safety Invariant
  isAdvisoryOnly: true; // Strictly true: never suppresses alarms or closes incidents
}

export interface ModelEvaluationSummary {
  modelId: PredictionModelId;
  totalEvaluated: number;
  meanAbsoluteError: number | null; // MAE (m/s)
  rootMeanSquaredError: number | null; // RMSE (m/s)
  forecastBias: number | null; // Mean signed error
  coveragePercent: number; // % evaluated with ground truth
  falseAlarmRatePercent: number;
  missedEventRatePercent: number;
  averageLeadTimeSeconds: number | null;
}
