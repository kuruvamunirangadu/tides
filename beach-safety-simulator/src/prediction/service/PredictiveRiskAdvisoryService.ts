/**
 * PredictiveRiskAdvisoryService.ts
 * 
 * TIDES — Phase 7: Predictive Coastal Risk Intelligence
 * 
 * Orchestrating service for:
 * 1. Time-aware feature extraction and multi-model forecast execution.
 * 2. Risk Fusion with deterministic HazardEngine: side-by-side comparison without overriding.
 * 3. Disagreement detection and explainable operator advisory alerts.
 * 4. Ground-truth forecast evaluation against maturing observations (MAE, RMSE, Lead Time, False Alarms).
 * 5. Strict preservation of life-safety workflows: advisory forecasts CANNOT suppress alarms or close incidents.
 */

import { EnvironmentalDataIngestionService } from '../pipeline/EnvironmentalDataIngestionService';
import { CoastalRiskFeatureEngine } from '../features/CoastalRiskFeatureEngine';
import { PersistenceBaselineModel } from '../models/PersistenceBaselineModel';
import { CalibratedCoastalRiskForecaster } from '../models/CalibratedCoastalRiskForecaster';
import {
  ModelPredictionDossier,
  PredictiveAdvisoryRecord,
  ModelEvaluationSummary,
  PredictionModelId,
} from '../models/predictiveRisk.types';
import { HazardEngine } from '../../simulation/HazardEngine';
import { Hazard, HazardSeverity } from '../../models/Hazard';
import { Environment } from '../../models/Environment';
import { Beach } from '../../models/Beach';
import { Visitor } from '../../models/Visitor';
import { Incident } from '../../models/Incident';

interface PendingEvaluation {
  id: string;
  modelId: PredictionModelId;
  zoneId: string;
  issueTimestamp: number;
  targetTimestamp: number;
  predictedVelocityMs: number;
  predictedSeverity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  matured: boolean;
  actualVelocityMs?: number;
}

export class PredictiveRiskAdvisoryService {
  private static instance: PredictiveRiskAdvisoryService | null = null;

  private ingestionService: EnvironmentalDataIngestionService;
  private featureEngine: CoastalRiskFeatureEngine;
  private baselineModel: PersistenceBaselineModel;
  private calibratedModel: CalibratedCoastalRiskForecaster;
  private deterministicEngine: HazardEngine;

  private latestAdvisories: Map<string, PredictiveAdvisoryRecord> = new Map();
  private pendingEvaluations: PendingEvaluation[] = [];

  // Evaluation tracking records
  private evaluationsStore: Array<{
    modelId: PredictionModelId;
    absoluteError: number;
    squaredError: number;
    signedError: number;
    isFalseAlarm: boolean;
    isMissedEvent: boolean;
    leadTimeSeconds: number;
  }> = [];

  // Listeners
  private listeners: Set<() => void> = new Set();

  public static getInstance(): PredictiveRiskAdvisoryService {
    if (!PredictiveRiskAdvisoryService.instance) {
      PredictiveRiskAdvisoryService.instance = new PredictiveRiskAdvisoryService();
    }
    return PredictiveRiskAdvisoryService.instance;
  }

  constructor(
    ingestionService?: EnvironmentalDataIngestionService,
    featureEngine?: CoastalRiskFeatureEngine,
    deterministicEngine?: HazardEngine
  ) {
    this.ingestionService = ingestionService ?? EnvironmentalDataIngestionService.getInstance();
    this.featureEngine = featureEngine ?? CoastalRiskFeatureEngine.getInstance();
    this.baselineModel = new PersistenceBaselineModel();
    this.calibratedModel = new CalibratedCoastalRiskForecaster();
    this.deterministicEngine = deterministicEngine ?? new HazardEngine();
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify(): void {
    for (const l of this.listeners) {
      try {
        l();
      } catch (err) {
        console.error('PredictiveRiskAdvisoryService listener error:', err);
      }
    }
  }

  public clearAll(): void {
    this.latestAdvisories.clear();
    this.pendingEvaluations = [];
    this.evaluationsStore = [];
    this.notify();
  }

  /**
   * Primary evaluation tick: ingests environment, extracts features, runs models,
   * detects disagreements with deterministic engine, and schedules ground-truth verification.
   */
  public evaluateCoastalRisk(
    beach: Beach,
    env: Environment,
    visitors: Visitor[] = [],
    incidents: Incident[] = [],
    currentTimeSec: number = Date.now() / 1000
  ): Map<string, PredictiveAdvisoryRecord> {
    const nowMs = Date.now();
    const zones = beach?.zones || [
      { id: 'SZ-01', name: 'Main Swim Zone', type: 'SWIMMING' },
      { id: 'SZ-02', name: 'Surf & Rip Channel', type: 'SURF' },
      { id: 'WA-01', name: 'Wading Area', type: 'WADING' },
      { id: 'RZ-01', name: 'Rocky Point Rip', type: 'RESTRICTED' },
    ];

    // 1. Ingest simulation environmental readings
    this.ingestionService.ingestFromEnvironment(
      env,
      currentTimeSec,
      zones.map((z) => z.id),
      'SIMULATED'
    );

    // 2. Authoritative Deterministic Hazard Evaluation (Strictly Preserved!)
    const timeDisplay = `${Math.floor(currentTimeSec / 60)}:${Math.floor(currentTimeSec % 60)}`;
    const deterministicHazards: Hazard[] = this.deterministicEngine.detectHazards(
      env,
      beach,
      visitors,
      timeDisplay
    );

    // 3. Process each coastal zone
    for (const zone of zones) {
      const zoneId = zone.id;
      const zoneName = zone.name;

      // Extract time-aware features strictly up to nowMs (NO leakage)
      const features = this.featureEngine.extractFeatureVector(zoneId, nowMs, {
        visitors,
        incidents,
      });

      // Run Models
      const baselineDossier = this.baselineModel.predict(features);
      const calibratedDossier = this.calibratedModel.predict(features);

      // Determine deterministic hazard state for this zone
      const zoneDeterministicHazards = deterministicHazards.filter(
        (h) => h.active && (h.affectedZoneIds.includes(zoneId) || h.affectedZoneIds.length === 0)
      );

      let deterministicSeverity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'LOW';
      let primaryThreat: string | undefined = undefined;
      for (const h of zoneDeterministicHazards) {
        if (h.severity === 'CRITICAL') {
          deterministicSeverity = 'CRITICAL';
          primaryThreat = h.name;
        } else if (h.severity === 'HIGH' && deterministicSeverity !== 'CRITICAL') {
          deterministicSeverity = 'HIGH';
          primaryThreat = h.name;
        } else if (h.severity === 'MODERATE' && deterministicSeverity === 'LOW') {
          deterministicSeverity = 'MODERATE';
          primaryThreat = h.name;
        }
      }

      // Extract 15m and 30m calibrated predictions
      const pred15m = calibratedDossier.predictions['15m'];
      const pred30m = calibratedDossier.predictions['30m'];

      // 4. Disagreement Detection (Deterministic vs Predictive)
      let hasDisagreement = false;
      let disagreementReason: string | undefined = undefined;
      let recommendedAction = 'Maintain standard coastal surveillance.';

      const isDeterministicHighOrCrit = deterministicSeverity === 'HIGH' || deterministicSeverity === 'CRITICAL';
      const isPredictiveHighOrCrit = pred30m.riskCategory === 'HIGH' || pred30m.riskCategory === 'CRITICAL';

      if (!isDeterministicHighOrCrit && isPredictiveHighOrCrit && pred30m.status === 'VALID') {
        hasDisagreement = true;
        disagreementReason = `Emerging Risk Warning: Advisory model anticipates sharp escalation to ${pred30m.riskCategory} within 30m (${(pred30m.escalationProbability * 100).toFixed(0)}% probability) while deterministic rules remain ${deterministicSeverity}.`;
        recommendedAction = 'Precautionary drone surveillance dispatch and enhanced lifeguard readiness recommended.';
      } else if (isDeterministicHighOrCrit && !isPredictiveHighOrCrit && pred30m.status === 'VALID') {
        hasDisagreement = true;
        disagreementReason = `Deterministic Hazard Active: Authoritative emergency controls remain strictly active (${deterministicSeverity}). Advisory subsidence projection does NOT bypass safety protocols.`;
        recommendedAction = 'Strictly enforce active hazard perimeter until authoritative sensor clearing occurs.';
      }

      // 5. Construct Advisory Record
      const advisoryId = `ADV-${zoneId}-${Math.floor(currentTimeSec)}`;
      const advisory: PredictiveAdvisoryRecord = {
        advisoryId,
        timestamp: nowMs,
        zoneId,
        zoneName,
        deterministicSeverity,
        activeDeterministicHazardsCount: zoneDeterministicHazards.length,
        deterministicPrimaryThreat: primaryThreat,
        advisoryModelId: CalibratedCoastalRiskForecaster.MODEL_ID,
        advisorySeverity15m: pred15m.riskCategory,
        advisorySeverity30m: pred30m.riskCategory,
        escalationProbability30m: pred30m.escalationProbability,
        predictedRipVelocityMs30m: pred30m.predictedVelocityMs,
        uncertaintyBand30m: pred30m.uncertaintyBand,
        advisoryTrend: pred30m.trend,
        advisoryConfidence: pred30m.modelConfidence,
        keyDrivers: pred30m.keyDrivers,
        provenance: features.provenance,
        dataQualityScore: features.inputQualityScore,
        hasDisagreement,
        disagreementReason,
        recommendedOperatorReviewAction: recommendedAction,
        isAdvisoryOnly: true, // Strict life safety invariant
      };

      this.latestAdvisories.set(zoneId, advisory);

      // 6. Register pending ground-truth evaluations (for 15m horizon)
      if (calibratedDossier.status === 'VALID') {
        this.pendingEvaluations.push({
          id: `EVAL-${calibratedDossier.modelId}-${zoneId}-${nowMs}`,
          modelId: calibratedDossier.modelId,
          zoneId,
          issueTimestamp: nowMs,
          targetTimestamp: nowMs + 15 * 60 * 1000,
          predictedVelocityMs: pred15m.predictedVelocityMs,
          predictedSeverity: pred15m.riskCategory,
          matured: false,
        });

        this.pendingEvaluations.push({
          id: `EVAL-${baselineDossier.modelId}-${zoneId}-${nowMs}`,
          modelId: baselineDossier.modelId,
          zoneId,
          issueTimestamp: nowMs,
          targetTimestamp: nowMs + 15 * 60 * 1000,
          predictedVelocityMs: baselineDossier.predictions['15m'].predictedVelocityMs,
          predictedSeverity: baselineDossier.predictions['15m'].riskCategory,
          matured: false,
        });
      }
    }

    // 7. Check maturing evaluations
    this.checkMaturedEvaluations(nowMs);

    this.notify();
    return this.latestAdvisories;
  }

  /**
   * Compares matured predictions against actual ground-truth observations
   */
  public checkMaturedEvaluations(nowMs: number): void {
    const maturedList = this.pendingEvaluations.filter((p) => !p.matured && nowMs >= p.targetTimestamp);

    for (const pending of maturedList) {
      pending.matured = true;
      const latestObs = this.ingestionService.getObservationsForVariable('WATER_CURRENT_SPEED', pending.zoneId, {
        cutoffTimestamp: nowMs,
        validOnly: true,
      });

      if (latestObs.length > 0 && typeof latestObs[latestObs.length - 1].value === 'number') {
        const actualVal = latestObs[latestObs.length - 1].value as number;
        pending.actualVelocityMs = actualVal;

        const err = pending.predictedVelocityMs - actualVal;
        const absErr = Math.abs(err);
        const sqErr = err * err;

        const isActualCritical = actualVal >= 1.0;
        const isPredCritical = pending.predictedSeverity === 'CRITICAL' || pending.predictedSeverity === 'HIGH';

        const isFalseAlarm = isPredCritical && !isActualCritical;
        const isMissedEvent = !isPredCritical && isActualCritical;
        const leadTimeSeconds = (pending.targetTimestamp - pending.issueTimestamp) / 1000;

        this.evaluationsStore.push({
          modelId: pending.modelId,
          absoluteError: absErr,
          squaredError: sqErr,
          signedError: err,
          isFalseAlarm,
          isMissedEvent,
          leadTimeSeconds,
        });
      }
    }

    // Prune completed pending list to 200 items
    if (this.pendingEvaluations.length > 200) {
      this.pendingEvaluations = this.pendingEvaluations.filter((p) => !p.matured).slice(-100);
    }
  }

  /**
   * Directly records an evaluated ground-truth observation for testing or live bench validation
   */
  public recordEvaluationResult(result: {
    modelId: PredictionModelId;
    absoluteError: number;
    squaredError: number;
    signedError: number;
    isFalseAlarm: boolean;
    isMissedEvent: boolean;
    leadTimeSeconds: number;
  }): void {
    this.evaluationsStore.push({ ...result });
  }

  public getEvaluationSummary(modelId: PredictionModelId): ModelEvaluationSummary {
    const list = this.evaluationsStore.filter((e) => e.modelId === modelId);
    if (list.length === 0) {
      return {
        modelId,
        totalEvaluated: 0,
        meanAbsoluteError: null,
        rootMeanSquaredError: null,
        forecastBias: null,
        coveragePercent: 0,
        falseAlarmRatePercent: 0,
        missedEventRatePercent: 0,
        averageLeadTimeSeconds: null,
      };
    }

    const total = list.length;
    const mae = list.reduce((a, b) => a + b.absoluteError, 0) / total;
    const rmse = Math.sqrt(list.reduce((a, b) => a + b.squaredError, 0) / total);
    const bias = list.reduce((a, b) => a + b.signedError, 0) / total;
    const falseAlarms = list.filter((e) => e.isFalseAlarm).length;
    const missed = list.filter((e) => e.isMissedEvent).length;
    const avgLeadTime = list.reduce((a, b) => a + b.leadTimeSeconds, 0) / total;

    return {
      modelId,
      totalEvaluated: total,
      meanAbsoluteError: Number(mae.toFixed(3)),
      rootMeanSquaredError: Number(rmse.toFixed(3)),
      forecastBias: Number(bias.toFixed(3)),
      coveragePercent: 100,
      falseAlarmRatePercent: Number(((falseAlarms / total) * 100).toFixed(1)),
      missedEventRatePercent: Number(((missed / total) * 100).toFixed(1)),
      averageLeadTimeSeconds: Number(avgLeadTime.toFixed(0)),
    };
  }

  public getAdvisory(zoneId: string): PredictiveAdvisoryRecord | undefined {
    return this.latestAdvisories.get(zoneId);
  }

  public getAllAdvisories(): PredictiveAdvisoryRecord[] {
    return Array.from(this.latestAdvisories.values());
  }

  public getDisagreements(): PredictiveAdvisoryRecord[] {
    return Array.from(this.latestAdvisories.values()).filter((a) => a.hasDisagreement);
  }
}

