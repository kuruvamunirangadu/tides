/**
 * PersistenceBaselineModel.ts
 * 
 * TIDES — Phase 7: Predictive Coastal Risk Intelligence
 * 
 * Transparent baseline reference model:
 * Assumes coastal conditions remain constant across the forecast horizon:
 *   v_pred(t + h) = v_obs(t)
 * 
 * Serves as the scientific benchmark to evaluate whether complex predictive
 * models provide genuine value above simple persistence.
 */

import { CoastalZoneFeatureVector } from '../features/coastalRiskFeatures.types';
import {
  ModelPredictionDossier,
  ZoneHorizonPrediction,
  PredictionStatus,
  ForecastHorizon,
} from './predictiveRisk.types';
import { RiskTrend } from './PredictionTypes';

export class PersistenceBaselineModel {
  public static readonly MODEL_ID = 'PERSISTENCE_BASELINE';
  public static readonly MODEL_VERSION = 'v1.0-baseline';

  public predict(features: CoastalZoneFeatureVector): ModelPredictionDossier {
    const horizons: Array<{ key: ForecastHorizon; minutes: number }> = [
      { key: '15m', minutes: 15 },
      { key: '30m', minutes: 30 },
      { key: '60m', minutes: 60 },
    ];

    const isAvailable = !features.isDataDegradedOrStale && features.inputQualityScore >= 0.5;
    const currentVelocity = features.currentSpeedCurrent;

    const predictions: Record<ForecastHorizon, ZoneHorizonPrediction> = {} as any;

    for (const h of horizons) {
      // Uncertainty interval grows with square root of time
      const uncertaintyMargin = Number((0.15 * Math.sqrt(h.minutes / 15)).toFixed(2));
      const minVal = Math.max(0.0, Number((currentVelocity - uncertaintyMargin).toFixed(2)));
      const maxVal = Math.min(3.5, Number((currentVelocity + uncertaintyMargin).toFixed(2)));

      // Risk category based on persisted speed
      let riskCategory: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'LOW';
      if (currentVelocity >= 1.0) riskCategory = 'CRITICAL';
      else if (currentVelocity >= 0.70) riskCategory = 'HIGH';
      else if (currentVelocity >= 0.45) riskCategory = 'MODERATE';

      const escProb = Math.min(1.0, Math.max(0.05, currentVelocity / 1.2));
      const status: PredictionStatus = isAvailable ? 'VALID' : 'PREDICTION_UNAVAILABLE';

      predictions[h.key] = {
        zoneId: features.zoneId,
        horizon: h.key,
        horizonMinutes: h.minutes,
        predictedVelocityMs: currentVelocity,
        escalationProbability: Number(escProb.toFixed(2)),
        riskCategory,
        trend: 'STABLE' as RiskTrend,
        uncertaintyBand: {
          min: minVal,
          max: maxVal,
          confidencePercent: 95,
        },
        keyDrivers: ['Persistence baseline: assumed unchanged from current observation'],
        status,
        limitations: isAvailable ? 'Assumes static ocean conditions' : 'Input observations stale or missing',
        modelConfidence: isAvailable ? Math.max(0.4, Number((1.0 - (h.minutes / 120)).toFixed(2))) : 0.0,
      };
    }

    return {
      modelId: PersistenceBaselineModel.MODEL_ID,
      modelVersion: PersistenceBaselineModel.MODEL_VERSION,
      issueTimestamp: features.featureTimestamp,
      zoneId: features.zoneId,
      predictions,
      provenance: features.provenance,
      inputFreshnessSeconds: features.featureTimestamp > 0 ? (Date.now() - features.featureTimestamp) / 1000 : 0,
      status: isAvailable ? 'VALID' : 'PREDICTION_UNAVAILABLE',
      evaluated: false,
    };
  }
}

