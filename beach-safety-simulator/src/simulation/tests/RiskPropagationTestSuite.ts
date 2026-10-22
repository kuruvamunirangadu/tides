import { Beach } from '../../models/Beach';
import { Environment } from '../../models/Environment';
import { RiskEngine } from '../RiskEngine';
import { RiskPropagationModel } from '../RiskPropagationModel';

export class RiskPropagationTestSuite {
  private passed = 0;
  private failed = 0;

  private assert(condition: boolean, name: string): void {
    if (condition) {
      this.passed++;
      console.log(`  [PASS] ${name}`);
    } else {
      this.failed++;
      console.error(`  [FAIL] ${name}`);
    }
  }

  public run(): { passed: number; failed: number } {
    const beach = this.createBeach();
    const environment = this.createEnvironment();
    const risk = new RiskEngine().evaluateBeachRisk(beach, environment, [], [], '08:00:00');
    const model = new RiskPropagationModel();
    const first = model.forecast(beach, environment, risk, 120);
    const second = model.forecast(beach, environment, risk, 120);
    const region = first.regions.find((item) => item.zoneId === 'SZ-02');

    this.assert(JSON.stringify(first) === JSON.stringify(second), 'Identical inputs produce identical forecasts');
    this.assert(region?.points[0].targetSimTime === 1020 && region.points[2].targetSimTime === 3720, 'Forecast horizons follow simulation time');
    this.assert(region?.currentScore === risk.zoneAssessments['SZ-02'].overallScore, 'Current risk remains separate and is used as forecast baseline');
    this.assert(Boolean(region?.points.every((point) => point.status === 'AVAILABLE')), 'Available current data produces explicit forecast points');
    this.assert(first.provenance === 'SIMULATED' && first.limitation.includes('not a calibrated'), 'Forecast provenance and calibration limitation are explicit');

    const warningRisk = JSON.parse(JSON.stringify(risk)) as typeof risk;
    warningRisk.zoneAssessments['SZ-02'].overallScore = 59;
    warningRisk.zoneAssessments['SZ-02'].category = 'MODERATE';
    warningRisk.currentImpact!.zoneImpacts['SZ-02'].influenceScore = 100;
    const warningState = model.forecast(beach, environment, warningRisk, 120);
    this.assert(warningState.warnings.length > 0, 'Forecast threshold emits a regional early warning');

    const unavailable = model.forecast(
      beach,
      { ...environment, waterCurrent: Number.NaN, currentSpeed: Number.NaN },
      new RiskEngine().evaluateBeachRisk(beach, { ...environment, waterCurrent: Number.NaN, currentSpeed: Number.NaN }, [], [], '08:00:00'),
      120
    );
    this.assert(unavailable.status === 'UNAVAILABLE' && unavailable.regions[0].points[0].status === 'UNAVAILABLE', 'Missing current telemetry produces unavailable forecast state');

    if (warningState.warnings[0]) {
      model.acknowledgeWarning(warningState.warnings[0].id);
      const acknowledged = model.forecast(beach, environment, warningRisk, 121).warnings.find((warning) => warning.id === warningState.warnings[0].id);
      this.assert(acknowledged?.acknowledged === true, 'Warning acknowledgement persists without resolving the forecast');
    } else {
      this.assert(false, 'Warning acknowledgement fixture was not emitted');
    }
    model.reset();
    const afterReset = model.forecast(beach, environment, warningRisk, 122);
    this.assert(!afterReset.warnings.some((warning) => warning.acknowledged), 'Reset clears transient forecast acknowledgement state');

    console.log(`Results: ${this.passed} passed, ${this.failed} failed.`);
    return { passed: this.passed, failed: this.failed };
  }

  private createEnvironment(): Environment {
    return { tideLevel: 1.4, tideStatus: 'RISING', waveHeight: 1.4, wavePeriod: 8, waveDirection: 180, windSpeed: 12, windDirection: 180, weather: 'CLEAR', visibility: 10, waterCurrent: 1.2, currentSpeed: 1.2, currentDirection: 180 };
  }

  private createBeach(): Beach {
    const zone = (id: string, x: number): Beach['zones'][number] => ({ id, name: id, type: 'SWIMMING', x, y: 0, width: 100, height: 100, status: 'OPEN' });
    return { id: 'FORECAST-TEST', name: 'Forecast Test Beach', width: 1000, height: 600, shorelineY: 280, zones: [zone('SZ-01', 0), zone('SZ-02', 450)], lifeguardStations: [], emergencyPoints: [] };
  }
}