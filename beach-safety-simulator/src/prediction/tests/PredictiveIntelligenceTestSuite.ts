import { ForecastEngine } from '../ForecastEngine';
import { ForecastEvaluator } from '../ForecastEvaluator';
import { ExposureForecast } from '../ExposureForecast';
import { RescueReadinessAnalyzer } from '../RescueReadinessAnalyzer';
import { RescueCoordinator } from '../../scene3d/rescue/RescueCoordinator';
import { Visitor } from '../../models/Visitor';
import { Beach } from '../../models/Beach';

export class PredictiveIntelligenceTestSuite {
  public static runAll(): { name: string; passed: boolean; message?: string }[] {
    const results: { name: string; passed: boolean; message?: string }[] = [];

    const mockBeach: Beach = {
      id: 'b-01',
      name: 'Rushikonda Beach',
      shorelineY: 280,
      width: 1000,
      length: 800,
    } as any;

    const createMockVisitors = (): Visitor[] => [
      {
        id: 'v-01',
        name: 'Swimmer in Deep Water',
        state: 'SWIMMING',
        position: { x: 550, y: 310 }, // Past shoreline
        active: true,
      } as any,
      {
        id: 'v-02',
        name: 'Wader in Swash Channel',
        state: 'WATER_ENTRY',
        position: { x: 555, y: 285 }, // Near shore feeder
        active: true,
      } as any,
      {
        id: 'v-03',
        name: 'Beach Lounger',
        state: 'BEACH',
        position: { x: 200, y: 150 }, // Dry sand
        active: true,
      } as any,
    ];

    // Scenario 1: Stable Conditions
    try {
      const engine = new ForecastEngine();
      engine.clearHistory();
      engine.recordObservation({ timestamp: 100, ripVelocity: 1.2, waveHeight: 1.2, zoneId: 'SZ-02' });
      engine.recordObservation({ timestamp: 105, ripVelocity: 1.2, waveHeight: 1.2, zoneId: 'SZ-02' });
      engine.recordObservation({ timestamp: 110, ripVelocity: 1.2, waveHeight: 1.2, zoneId: 'SZ-02' });

      const preds = engine.generateForecast('TREND_BASELINE', 110);
      const p3m = preds.find((p) => p.horizonMinutes === 3);

      if (p3m && p3m.predictedValue === 1.2 && p3m.status === 'VALID') {
        results.push({ name: '1. Stable Conditions: Constant input produces stable baseline forecast', passed: true });
      } else {
        results.push({ name: '1. Stable Conditions: Constant input produces stable baseline forecast', passed: false, message: `val=${p3m?.predictedValue}` });
      }
    } catch (e: any) {
      results.push({ name: '1. Stable Conditions: Constant input produces stable baseline forecast', passed: false, message: e.message });
    }

    // Scenario 2: Gradually Increasing Current Trend
    try {
      const engine = new ForecastEngine();
      engine.clearHistory();
      engine.recordObservation({ timestamp: 100, ripVelocity: 1.0, waveHeight: 1.2, zoneId: 'SZ-02' });
      engine.recordObservation({ timestamp: 110, ripVelocity: 1.2, waveHeight: 1.3, zoneId: 'SZ-02' });
      engine.recordObservation({ timestamp: 120, ripVelocity: 1.4, waveHeight: 1.4, zoneId: 'SZ-02' });

      const preds = engine.generateForecast('TREND_BASELINE', 120);
      const p1m = preds.find((p) => p.horizonMinutes === 1); // +60s
      // slope = (1.4 - 1.0)/20 = 0.02 m/s per second. +60s -> 1.4 + 1.2 = 2.6 m/s
      if (p1m && p1m.predictedValue > 1.4 && p1m.predictedValue <= 3.2) {
        results.push({ name: '2. Increasing Current: Detects positive slope and projects upward trend', passed: true });
      } else {
        results.push({ name: '2. Increasing Current: Detects positive slope and projects upward trend', passed: false, message: `val=${p1m?.predictedValue}` });
      }
    } catch (e: any) {
      results.push({ name: '2. Increasing Current: Detects positive slope and projects upward trend', passed: false, message: e.message });
    }

    // Scenario 3: Gradually Decreasing Current Trend
    try {
      const engine = new ForecastEngine();
      engine.clearHistory();
      engine.recordObservation({ timestamp: 100, ripVelocity: 1.6, waveHeight: 1.5, zoneId: 'SZ-02' });
      engine.recordObservation({ timestamp: 110, ripVelocity: 1.4, waveHeight: 1.4, zoneId: 'SZ-02' });
      engine.recordObservation({ timestamp: 120, ripVelocity: 1.2, waveHeight: 1.3, zoneId: 'SZ-02' });

      const preds = engine.generateForecast('TREND_BASELINE', 120);
      const p3m = preds.find((p) => p.horizonMinutes === 3);
      if (p3m && p3m.predictedValue < 1.2 && p3m.predictedValue >= 0.0) {
        results.push({ name: '3. Decreasing Current: Detects negative slope and projects decay toward slack', passed: true });
      } else {
        results.push({ name: '3. Decreasing Current: Detects negative slope and projects decay toward slack', passed: false, message: `val=${p3m?.predictedValue}` });
      }
    } catch (e: any) {
      results.push({ name: '3. Decreasing Current: Detects negative slope and projects decay toward slack', passed: false, message: e.message });
    }

    // Scenario 4: Physical Bounds Enforcement [0.0, 3.2 m/s]
    try {
      const engine = new ForecastEngine();
      engine.clearHistory();
      // Extreme steep climb: +0.2 m/s per sec
      engine.recordObservation({ timestamp: 100, ripVelocity: 1.0, waveHeight: 1.0, zoneId: 'SZ-02' });
      engine.recordObservation({ timestamp: 105, ripVelocity: 2.0, waveHeight: 1.5, zoneId: 'SZ-02' });
      engine.recordObservation({ timestamp: 110, ripVelocity: 3.0, waveHeight: 2.0, zoneId: 'SZ-02' });

      const preds = engine.generateForecast('TREND_BASELINE', 110);
      const p5m = preds.find((p) => p.horizonMinutes === 5);

      if (p5m && p5m.predictedValue === ForecastEngine.MAX_RIP_VELOCITY && p5m.uncertaintyBand.max <= 3.2) {
        results.push({ name: '4. Physical Bounds: Enforces oceanographic speed ceiling (3.2 m/s)', passed: true });
      } else {
        results.push({ name: '4. Physical Bounds: Enforces oceanographic speed ceiling (3.2 m/s)', passed: false, message: `val=${p5m?.predictedValue}` });
      }
    } catch (e: any) {
      results.push({ name: '4. Physical Bounds: Enforces oceanographic speed ceiling (3.2 m/s)', passed: false, message: e.message });
    }

    // Scenario 5: Insufficient History Handling (<3 observations)
    try {
      const engine = new ForecastEngine();
      engine.clearHistory();
      engine.recordObservation({ timestamp: 100, ripVelocity: 1.2, waveHeight: 1.2, zoneId: 'SZ-02' });

      const preds = engine.generateForecast('TREND_BASELINE', 100);
      const p = preds[0];

      if (p && p.status === 'INSUFFICIENT_HISTORY' && p.inputQuality === 'DEGRADED') {
        results.push({ name: '5. Insufficient History: Explicitly flags <3 points without guessing slope', passed: true });
      } else {
        results.push({ name: '5. Insufficient History: Explicitly flags <3 points without guessing slope', passed: false, message: `status=${p?.status}` });
      }
    } catch (e: any) {
      results.push({ name: '5. Insufficient History: Explicitly flags <3 points without guessing slope', passed: false, message: e.message });
    }

    // Scenario 6: Stale Data Validation (>30s old)
    try {
      const engine = new ForecastEngine();
      engine.clearHistory();
      engine.recordObservation({ timestamp: 100, ripVelocity: 1.2, waveHeight: 1.2, zoneId: 'SZ-02' });
      engine.recordObservation({ timestamp: 105, ripVelocity: 1.3, waveHeight: 1.2, zoneId: 'SZ-02' });
      engine.recordObservation({ timestamp: 110, ripVelocity: 1.4, waveHeight: 1.2, zoneId: 'SZ-02' });

      // Request forecast at t=160 (50s later)
      const preds = engine.generateForecast('TREND_BASELINE', 160);
      const p = preds[0];

      if (p && p.status === 'DATA_STALE' && p.inputQuality === 'STALE') {
        results.push({ name: '6. Stale Data: Pauses extrapolation when observation is >30s old', passed: true });
      } else {
        results.push({ name: '6. Stale Data: Pauses extrapolation when observation is >30s old', passed: false, message: `status=${p?.status}` });
      }
    } catch (e: any) {
      results.push({ name: '6. Stale Data: Pauses extrapolation when observation is >30s old', passed: false, message: e.message });
    }

    // Scenario 7: Invalid Input Rejection
    try {
      const engine = new ForecastEngine();
      engine.clearHistory();
      const countBefore = engine.getObservations().length;
      engine.recordObservation({ timestamp: -5, ripVelocity: NaN, waveHeight: 1.2, zoneId: 'SZ-02' });
      const countAfter = engine.getObservations().length;

      if (countBefore === countAfter) {
        results.push({ name: '7. Invalid Input: Silently rejects NaN velocities and negative timestamps', passed: true });
      } else {
        results.push({ name: '7. Invalid Input: Silently rejects NaN velocities and negative timestamps', passed: false, message: `Ingested invalid point` });
      }
    } catch (e: any) {
      results.push({ name: '7. Invalid Input: Silently rejects NaN velocities and negative timestamps', passed: false, message: e.message });
    }

    // Scenario 8: Multi-Horizon Uncertainty Expansion
    try {
      const engine = new ForecastEngine();
      engine.clearHistory();
      engine.recordObservation({ timestamp: 100, ripVelocity: 1.2, waveHeight: 1.2, zoneId: 'SZ-02' });
      engine.recordObservation({ timestamp: 105, ripVelocity: 1.2, waveHeight: 1.2, zoneId: 'SZ-02' });
      engine.recordObservation({ timestamp: 110, ripVelocity: 1.2, waveHeight: 1.2, zoneId: 'SZ-02' });

      const preds = engine.generateForecast('TREND_BASELINE', 110);
      const p1 = preds.find((p) => p.horizonMinutes === 1)!;
      const p5 = preds.find((p) => p.horizonMinutes === 5)!;

      const band1 = p1.uncertaintyBand.max - p1.uncertaintyBand.min;
      const band5 = p5.uncertaintyBand.max - p5.uncertaintyBand.min;

      if (band5 > band1) {
        results.push({ name: '8. Uncertainty Expansion: Confidence interval widens with horizon distance', passed: true });
      } else {
        results.push({ name: '8. Uncertainty Expansion: Confidence interval widens with horizon distance', passed: false, message: `band1=${band1}, band5=${band5}` });
      }
    } catch (e: any) {
      results.push({ name: '8. Uncertainty Expansion: Confidence interval widens with horizon distance', passed: false, message: e.message });
    }

    // Scenario 9: Future Exposure Mapping
    try {
      const visitors = createMockVisitors();
      const forecastRecord = {
        predictedValue: 1.8, // Hazardous (>1.5)
        forecastIssueTimestamp: 100,
      } as any;

      const exposure = ExposureForecast.evaluateExposure(visitors, mockBeach, forecastRecord, 3);

      // v-01 is currently past shoreline in water (currentlyExposed = 1)
      // v-01 and v-02 are inside the expanding corridor (predictedExposed = 2)
      // v-03 is on dry sand and excluded
      const currOk = exposure.currentlyExposedVisitorsCount === 1;
      const predOk = exposure.predictedExposedVisitorsCount === 2;

      if (currOk && predOk) {
        results.push({ name: '9. Exposure Mapping: Accurately separates current from predicted exposed bathers', passed: true });
      } else {
        results.push({ name: '9. Exposure Mapping: Accurately separates current from predicted exposed bathers', passed: false, message: `curr=${exposure.currentlyExposedVisitorsCount}, pred=${exposure.predictedExposedVisitorsCount}` });
      }
    } catch (e: any) {
      results.push({ name: '9. Exposure Mapping: Accurately separates current from predicted exposed bathers', passed: false, message: e.message });
    }

    // Scenario 10: Exposure Safety Constraint (No Drowning Inference)
    try {
      const visitors = createMockVisitors();
      const exposure = ExposureForecast.evaluateExposure(visitors, mockBeach, null, 3);
      const statesUnchanged = visitors.every((v) => v.state !== 'DISTRESS' || v.id === 'v-01');

      if (statesUnchanged && !exposure.assumptions.toLowerCase().includes('drowning')) {
        results.push({ name: '10. Exposure Constraint: Never infers drowning or alters visitor distress states', passed: true });
      } else {
        results.push({ name: '10. Exposure Constraint: Never infers drowning or alters visitor distress states', passed: false, message: 'Invalid inference found' });
      }
    } catch (e: any) {
      results.push({ name: '10. Exposure Constraint: Never infers drowning or alters visitor distress states', passed: false, message: e.message });
    }

    // Scenario 11: Rescue Readiness Recommendations
    try {
      const coordinator = new RescueCoordinator();
      // Artificially mark boat as busy
      coordinator.registry.updateResource('RB-01', { status: 'EN_ROUTE' });

      const forecastRecord = { predictedValue: 1.8, horizonMinutes: 3 } as any;
      const readiness = RescueReadinessAnalyzer.analyzeReadiness(coordinator, forecastRecord);

      const hasCriticalGap = readiness.recommendations.some((r) => r.id === 'REC-OFFSHORE-GAP');

      if (readiness.availableBoats === 0 && hasCriticalGap) {
        results.push({ name: '11. Readiness Analysis: Identifies offshore boat shortage under high rip forecast', passed: true });
      } else {
        results.push({ name: '11. Readiness Analysis: Identifies offshore boat shortage under high rip forecast', passed: false, message: `hasCriticalGap=${hasCriticalGap}` });
      }
    } catch (e: any) {
      results.push({ name: '11. Readiness Analysis: Identifies offshore boat shortage under high rip forecast', passed: false, message: e.message });
    }

    // Scenario 12: Readiness Dispatch Constraint (Strict Advisory Only)
    try {
      const coordinator = new RescueCoordinator();
      const readiness = RescueReadinessAnalyzer.analyzeReadiness(coordinator, null);
      const allAdvisory = readiness.recommendations.every((r) => r.isDispatched === false);
      const noActiveMission = coordinator.activeMission === null;

      if (allAdvisory && noActiveMission) {
        results.push({ name: '12. Readiness Constraint: Recommendations strictly advisory; never auto-dispatches', passed: true });
      } else {
        results.push({ name: '12. Readiness Constraint: Recommendations strictly advisory; never auto-dispatches', passed: false, message: 'Auto-dispatch detected' });
      }
    } catch (e: any) {
      results.push({ name: '12. Readiness Constraint: Recommendations strictly advisory; never auto-dispatches', passed: false, message: e.message });
    }

    // Scenario 13: Chronological Ground-Truth Evaluation & Error Scoring
    try {
      const evaluator = new ForecastEvaluator();
      evaluator.clear();

      // Issue prediction at t=100 for target t=160 (+60s), predicted 1.6 m/s
      evaluator.registerPrediction({
        predictionId: 'PRED-TEST-1',
        hazardType: 'RIP_CURRENT',
        sourceZoneId: 'SZ-02',
        sourceZoneName: 'Central Zone',
        observationTimestamp: 100,
        forecastIssueTimestamp: 100,
        targetTimestamp: 160,
        horizonMinutes: 1,
        observedValue: 1.2,
        predictedValue: 1.6,
        units: 'm/s',
        uncertaintyBand: { min: 1.48, max: 1.72 },
        method: 'TREND_BASELINE',
        inputQuality: 'HIGH',
        status: 'VALID',
        limitations: 'Test',
        isSimulatedEstimate: true,
        evaluated: false,
      });

      // Ground-truth arrives at t=160 with actual observed velocity = 1.5 m/s
      evaluator.ingestObservation({ timestamp: 160, ripVelocity: 1.5, waveHeight: 1.2, zoneId: 'SZ-02' });

      const summary = evaluator.getSummary();
      const maeOk = summary.meanAbsoluteError === 0.1; // |1.6 - 1.5| = 0.1
      const countOk = summary.totalForecastsEvaluated === 1;

      if (maeOk && countOk) {
        results.push({ name: '13. Ground-Truth Scoring: Computes exact MAE (0.10 m/s) upon target maturity', passed: true });
      } else {
        results.push({ name: '13. Ground-Truth Scoring: Computes exact MAE (0.10 m/s) upon target maturity', passed: false, message: `mae=${summary.meanAbsoluteError}, count=${summary.totalForecastsEvaluated}` });
      }
    } catch (e: any) {
      results.push({ name: '13. Ground-Truth Scoring: Computes exact MAE (0.10 m/s) upon target maturity', passed: false, message: e.message });
    }

    // Scenario 14: Simulation Invariance
    try {
      const visitors = createMockVisitors();
      const initialPositions = visitors.map((v) => ({ ...v.position }));

      const engine = new ForecastEngine();
      engine.clearHistory();
      engine.recordObservation({ timestamp: 100, ripVelocity: 1.2, waveHeight: 1.2, zoneId: 'SZ-02' });
      engine.recordObservation({ timestamp: 105, ripVelocity: 1.3, waveHeight: 1.2, zoneId: 'SZ-02' });
      engine.recordObservation({ timestamp: 110, ripVelocity: 1.4, waveHeight: 1.2, zoneId: 'SZ-02' });

      const preds = engine.generateForecast('TREND_BASELINE', 110);
      ExposureForecast.evaluateExposure(visitors, mockBeach, preds[0], 3);
      RescueReadinessAnalyzer.analyzeReadiness(RescueCoordinator.getInstance(), preds[0]);

      const positionsUnchanged = visitors.every(
        (v, i) => v.position.x === initialPositions[i].x && v.position.y === initialPositions[i].y
      );

      if (positionsUnchanged) {
        results.push({ name: '14. Simulation Invariance: All forecast modules are 100% read-only observers', passed: true });
      } else {
        results.push({ name: '14. Simulation Invariance: All forecast modules are 100% read-only observers', passed: false, message: 'Simulation state modified' });
      }
    } catch (e: any) {
      results.push({ name: '14. Simulation Invariance: All forecast modules are 100% read-only observers', passed: false, message: e.message });
    }

    return results;
  }
}

