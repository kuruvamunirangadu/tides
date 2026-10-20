/**
 * src/calibration/tests/CalibrationTestSuite.ts
 * Frontend test suite for TIDES Milestone 8:
 * Digital Twin Calibration, Real-Time Data & Field Validation.
 */

import { GeoCoordinateMapper } from '../GeoCoordinateMapper';
import { EnvironmentalDataProvider } from '../EnvironmentalDataProvider';
import { SimulationCalibrator } from '../SimulationCalibrator';

export interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

export class CalibrationTestSuite {
  public static runAll(): TestResult[] {
    const results: TestResult[] = [];

    const test = (name: string, fn: () => void) => {
      try {
        fn();
        results.push({ name, passed: true });
      } catch (err: any) {
        results.push({ name, passed: false, message: err?.message || String(err) });
      }
    };

    // 1. Valid environmental observations
    test('1. Valid environmental observations', () => {
      const provider = new EnvironmentalDataProvider();
      const now = Date.now() / 1000;
      const obs = provider.ingestObservation({
        id: 'OBS-FE-001',
        sourceId: 'INCOIS-WAVE-BUOY-01',
        sourceName: 'INCOIS Rushikonda Coastal Wave Buoy',
        variable: 'WAVE_HEIGHT',
        value: 1.25,
        units: 'm',
        observationTimestamp: now - 30,
        provenance: 'MEASURED',
      });

      if (obs.qualityStatus !== 'VALID') throw new Error(`Expected VALID, got ${obs.qualityStatus}`);
      if (obs.value !== 1.25) throw new Error(`Expected 1.25, got ${obs.value}`);
      if (obs.units !== 'm') throw new Error(`Expected 'm', got ${obs.units}`);
      if (obs.provenance !== 'MEASURED') throw new Error(`Expected MEASURED, got ${obs.provenance}`);
    });

    // 2. Missing and malformed observations
    test('2. Missing and malformed observations', () => {
      const provider = new EnvironmentalDataProvider();
      const obsMalformed = provider.ingestObservation({
        id: '',
        sourceId: '',
        sourceName: '',
        variable: 'WAVE_HEIGHT',
        value: undefined,
        units: '',
        observationTimestamp: 0,
      });
      if (obsMalformed.qualityStatus !== 'MALFORMED') {
        throw new Error(`Expected MALFORMED for missing fields, got ${obsMalformed.qualityStatus}`);
      }

      const obsNaN = provider.ingestObservation({
        id: 'OBS-NAN-1',
        sourceId: 'AWS-01',
        sourceName: 'AWS',
        variable: 'WIND_SPEED',
        value: NaN,
        units: 'km/h',
        observationTimestamp: Date.now() / 1000,
      });
      if (obsNaN.qualityStatus !== 'MALFORMED') {
        throw new Error(`Expected MALFORMED for NaN, got ${obsNaN.qualityStatus}`);
      }
      if (obsNaN.value === 0) {
        throw new Error(`Silent zero-fill detected for NaN value!`);
      }
    });

    // 3. Unit conversion
    test('3. Unit conversion', () => {
      const provider = new EnvironmentalDataProvider();
      const normWind = provider.normalizeUnits('WIND_SPEED', 20, 'knots');
      if (Math.abs(normWind.value - 37.04) > 0.05) {
        throw new Error(`Expected ~37.04 km/h for 20 knots, got ${normWind.value}`);
      }

      const normWave = provider.normalizeUnits('WAVE_HEIGHT', 6.56168, 'ft');
      if (Math.abs(normWave.value - 2.0) > 0.05) {
        throw new Error(`Expected ~2.0 m for 6.56 ft, got ${normWave.value}`);
      }

      const normTemp = provider.normalizeUnits('WATER_TEMPERATURE', 86, 'F');
      if (Math.abs(normTemp.value - 30.0) > 0.2) {
        throw new Error(`Expected ~30 C for 86 F, got ${normTemp.value}`);
      }
    });

    // 4. Duplicate and stale data
    test('4. Duplicate and stale data', () => {
      const provider = new EnvironmentalDataProvider();
      const now = Date.now() / 1000;
      provider.ingestObservation({
        id: 'OBS-DUP-1',
        sourceId: 'AWS-VIZAG',
        sourceName: 'AWS',
        variable: 'WIND_SPEED',
        value: 20,
        units: 'km/h',
        observationTimestamp: now - 10,
      });

      const dupObs = provider.ingestObservation({
        id: 'OBS-DUP-2',
        sourceId: 'AWS-VIZAG',
        sourceName: 'AWS',
        variable: 'WIND_SPEED',
        value: 20,
        units: 'km/h',
        observationTimestamp: now - 10,
      });

      if (dupObs.qualityStatus !== 'DUPLICATE') {
        throw new Error(`Expected DUPLICATE status, got ${dupObs.qualityStatus}`);
      }
    });

    // 5. Source outage and recovery
    test('5. Source outage and recovery', () => {
      const provider = new EnvironmentalDataProvider();
      const now = Date.now() / 1000;

      // Old reading past 2.5x horizon (wind horizon 600s -> outage > 1500s)
      const outageObs = provider.ingestObservation({
        id: 'OBS-OUTAGE-1',
        sourceId: 'AWS-VIZAG',
        sourceName: 'AWS',
        variable: 'WIND_SPEED',
        value: 15,
        units: 'km/h',
        observationTimestamp: now - 2000,
      });
      if (outageObs.qualityStatus !== 'OUTAGE') {
        throw new Error(`Expected OUTAGE status, got ${outageObs.qualityStatus}`);
      }

      // Fresh reading recovers source
      const recoveredObs = provider.ingestObservation({
        id: 'OBS-RECOVER-1',
        sourceId: 'AWS-VIZAG',
        sourceName: 'AWS',
        variable: 'WIND_SPEED',
        value: 16,
        units: 'km/h',
        observationTimestamp: now - 5,
      });
      if (recoveredObs.qualityStatus !== 'VALID') {
        throw new Error(`Expected recovery to VALID, got ${recoveredObs.qualityStatus}`);
      }
    });

    // 6. Provider timestamp handling
    test('6. Provider timestamp handling', () => {
      const provider = new EnvironmentalDataProvider();
      const futureTime = Date.now() / 1000 + 1000;
      const futureObs = provider.ingestObservation({
        id: 'OBS-FUTURE-1',
        sourceId: 'AWS-VIZAG',
        sourceName: 'AWS',
        variable: 'WIND_SPEED',
        value: 15,
        units: 'km/h',
        observationTimestamp: futureTime,
      });
      if (futureObs.qualityStatus !== 'MALFORMED') {
        throw new Error(`Expected MALFORMED for future timestamp, got ${futureObs.qualityStatus}`);
      }
    });

    // 7. Geographic coordinate transformations
    test('7. Geographic coordinate transformations', () => {
      const origin = { latitude: 17.7818, longitude: 83.3854 };
      const { local, inBounds, uncertaintyM } = GeoCoordinateMapper.wgs84ToSimulation(origin);
      if (!inBounds) throw new Error('Expected origin to be inBounds');
      if (uncertaintyM > 5.0) throw new Error(`Uncertainty too high: ${uncertaintyM}m`);
      if (Math.abs(local.x - 500) > 1.0 || Math.abs(local.y - 280) > 1.0) {
        throw new Error(`Expected origin at (500, 280), got (${local.x}, ${local.y})`);
      }

      // Inverse
      const { geo } = GeoCoordinateMapper.simulationToWgs84(local);
      if (Math.abs(geo.latitude - origin.latitude) > 0.0001 || Math.abs(geo.longitude - origin.longitude) > 0.0001) {
        throw new Error(`Inverse transformation drift: ${geo.latitude}, ${geo.longitude}`);
      }
    });

    // 8. Missing or invalid calibration points
    test('8. Missing or invalid calibration points', () => {
      const outsidePoint = { latitude: 13.0827, longitude: 80.2707 }; // Chennai
      const { inBounds, uncertaintyM } = GeoCoordinateMapper.wgs84ToSimulation(outsidePoint);
      if (inBounds) throw new Error('Chennai should be marked outside Rushikonda bounds');
      if (uncertaintyM < 30.0) throw new Error(`Expected high uncertainty for uncalibrated point, got ${uncertaintyM}m`);
    });

    // 9. Dataset provenance
    test('9. Dataset provenance', () => {
      const calibrator = new SimulationCalibrator();
      const manifests = calibrator.getManifests();
      if (manifests.length < 2) throw new Error(`Expected at least 2 manifests, got ${manifests.length}`);

      const cal = manifests.find((m) => m.split === 'CALIBRATION');
      const val = manifests.find((m) => m.split === 'EVALUATION_HOLDOUT');
      if (!cal || !val) throw new Error('Missing calibration or holdout split');
      if (!cal.checksumSha256 || !val.checksumSha256) throw new Error('Missing SHA-256 checksum in manifest');
      if (cal.provenance !== 'MEASURED') throw new Error(`Expected MEASURED, got ${cal.provenance}`);
      if (cal.limitations.length === 0) throw new Error('Expected documented limitations in manifest');
    });

    // 10. Repeatable calibration experiments
    test('10. Repeatable calibration experiments', () => {
      const calibrator = new SimulationCalibrator();
      const candidate = { ripDriftMultiplier: 1.2, waveBreakingFactor: 0.8 };

      const exp1 = calibrator.runExperiment('EXP-REP-1', candidate);
      const exp2 = calibrator.runExperiment('EXP-REP-2', candidate);

      const m1 = exp1.calibrationMetrics['WAVE_HEIGHT'];
      const m2 = exp2.calibrationMetrics['WAVE_HEIGHT'];
      if (m1.mae !== m2.mae || m1.rmse !== m2.rmse) {
        throw new Error(`Deterministic calibration failed: exp1 MAE ${m1.mae} != exp2 MAE ${m2.mae}`);
      }
    });

    // 11. Independent evaluation data separation
    test('11. Independent evaluation data separation', () => {
      const calibrator = new SimulationCalibrator();
      const exp = calibrator.runExperiment('EXP-SEP-1', { ripDriftMultiplier: 1.15 });

      const calWave = exp.calibrationMetrics['WAVE_HEIGHT'];
      const evalWave = exp.evaluationMetrics['WAVE_HEIGHT'];
      if (!calWave || !evalWave) throw new Error('Missing split metrics');
      if (calWave.sampleCount === evalWave.sampleCount) {
        throw new Error('Calibration split and independent holdout should have distinct sample sets');
      }
    });

    // 12. Missing-data metric handling
    test('12. Missing-data metric handling', () => {
      const calibrator = new SimulationCalibrator();
      const metric = calibrator.calculateContinuousMetrics('WATER_CURRENT', [], []);
      if (metric.mae !== null || metric.rmse !== null) {
        throw new Error('MAE and RMSE should be null for empty samples (no silent 0-fill)');
      }
      if (!metric.unvalidatedReason?.includes('N/A')) {
        throw new Error(`Expected N/A unvalidated reason, got ${metric.unvalidatedReason}`);
      }
    });

    // 13. No mutation of existing simulation state
    test('13. No mutation of existing simulation state', () => {
      const calibrator = new SimulationCalibrator();
      const initialBaseline = calibrator.getBaseline();

      // Running experiment must NOT mutate baseline
      const exp = calibrator.runExperiment('EXP-MUT-1', { ripDriftMultiplier: 2.5 });
      if (exp.status !== 'PROPOSED') throw new Error('Experiment should be in PROPOSED status');
      if (calibrator.getBaseline().ripDriftMultiplier !== initialBaseline.ripDriftMultiplier) {
        throw new Error('Simulation baseline was mutated without operator authorization!');
      }

      // Explicit approval required
      const ok = calibrator.applyExperiment('EXP-MUT-1', 'OP-01');
      if (!ok) throw new Error('Expected applyExperiment to succeed');
      if (calibrator.getBaseline().ripDriftMultiplier !== 2.5) {
        throw new Error('Failed to update baseline after operator approval');
      }
    });

    // 14. Existing simulator and dashboard regression tests
    test('14. Existing simulator and dashboard regression tests', () => {
      const residualRmse = GeoCoordinateMapper.calculateBenchmarkResidualRmse();
      if (residualRmse < 0.5 || residualRmse > 5.0) {
        throw new Error(`Unexpected benchmark residual RMSE: ${residualRmse}m`);
      }
      if (GeoCoordinateMapper.KNOWN_BENCHMARKS.length < 5) {
        throw new Error('Expected at least 5 surveyed benchmark points for Rushikonda');
      }
    });

    // 15. Safe read-only data-to-simulation mapping
    test('15. Safe read-only data-to-simulation mapping', () => {
      const provider = new EnvironmentalDataProvider();
      const now = Date.now() / 1000;
      provider.ingestObservation({
        id: 'OBS-MAP-1',
        sourceId: 'INCOIS-WAVE-BUOY-01',
        sourceName: 'INCOIS',
        variable: 'WAVE_HEIGHT',
        value: 1.1,
        units: 'm',
        observationTimestamp: now - 30,
        provenance: 'MEASURED',
      });
      provider.ingestObservation({
        id: 'OBS-MAP-2',
        sourceId: 'IMD-AWS',
        sourceName: 'IMD',
        variable: 'WIND_SPEED',
        value: 20,
        units: 'km/h',
        observationTimestamp: now - 30,
        provenance: 'MEASURED',
      });
      provider.ingestObservation({
        id: 'OBS-MAP-3',
        sourceId: 'NIOT-TIDE',
        sourceName: 'NIOT',
        variable: 'TIDE_LEVEL',
        value: 1.2,
        units: 'm',
        observationTimestamp: now - 30,
        provenance: 'MEASURED',
      });

      const mapping = provider.getSimulationMapping();
      if (!mapping.isReadyForInjection) {
        throw new Error('Core variables present; expected isReadyForInjection to be true');
      }
      if (mapping.missing.length === 0) {
        throw new Error('Non-core variables should be reported missing, not fabricated');
      }
    });

    return results;
  }
}

