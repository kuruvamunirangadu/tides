import { Beach } from '../../models/Beach';
import { CurrentFieldModel } from '../../models/CurrentField';
import { Environment } from '../../models/Environment';
import { Visitor } from '../../models/Visitor';
import { RiskEngine } from '../RiskEngine';

export class CurrentFieldTestSuite {
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
    const environment: Environment = {
      tideLevel: 1.4, tideStatus: 'RISING', waveHeight: 1.4, wavePeriod: 8,
      waveDirection: 180, windSpeed: 12, windDirection: 180, weather: 'CLEAR',
      visibility: 10, waterCurrent: 1.0, currentSpeed: 1.0, currentDirection: 180,
    };
    const beach = this.createBeach();
    const visitor = this.createVisitor('VIS-RIP', 500, 40, 'SZ-02');
    const field = CurrentFieldModel.fromEnvironment(environment);
    const impactA = CurrentFieldModel.assessZones(beach, [visitor], field);
    const impactB = CurrentFieldModel.assessZones(beach, [visitor], CurrentFieldModel.fromEnvironment(environment));

    this.assert(JSON.stringify(impactA) === JSON.stringify(impactB), 'Identical current inputs produce deterministic regional impacts');
    this.assert(impactA.zoneImpacts['SZ-02'].affected, 'Visitor sector is identified as current-affected');
    this.assert(impactA.zoneImpacts['SZ-02'].visitorIds.includes(visitor.id), 'Visitor intersection is recorded in the affected region');
    this.assert(impactA.zoneImpacts['SZ-01'].influenceScore !== impactA.zoneImpacts['SZ-02'].influenceScore, 'Current influence varies spatially across coastal regions');
    this.assert(visitor.state === 'SWIMMING' && visitor.distressLevel === 0, 'Regional exposure does not mutate visitor distress state');

    const slowSlack = CurrentFieldModel.assessZones(
      beach,
      [visitor],
      CurrentFieldModel.fromEnvironment({ ...environment, tideStatus: 'LOW', currentSpeed: 0.4, waterCurrent: 0.4, currentDirection: 90 })
    );
    const fastEbb = CurrentFieldModel.assessZones(
      beach,
      [visitor],
      CurrentFieldModel.fromEnvironment({ ...environment, tideStatus: 'FALLING', currentSpeed: 1.2, waterCurrent: 1.2, currentDirection: 210 })
    );
    this.assert(fastEbb.zoneImpacts['SZ-02'].influenceScore > slowSlack.zoneImpacts['SZ-02'].influenceScore, 'Changing tide phase and current speed refresh regional risk');
    this.assert(fastEbb.currentDirectionDeg === 210 && fastEbb.tidePhase === 'FALLING', 'Changing current direction and tide phase refresh telemetry context');

    const riskOverview = new RiskEngine().evaluateBeachRisk(beach, environment, [visitor], [], '0:00');
    this.assert(Boolean(riskOverview.currentImpact?.zoneImpacts['SZ-02']), 'Current impact reaches the authoritative risk-engine entry point');
    this.assert(riskOverview.zoneAssessments['SZ-02'].contributingFactors.some((factor) => factor.includes('current')), 'Risk output explains the spatial current contribution');

    const unavailable = CurrentFieldModel.fromEnvironment({ ...environment, waterCurrent: Number.NaN, currentSpeed: Number.NaN });
    this.assert(unavailable.dataStatus === 'UNAVAILABLE' && unavailable.currentSpeedMps === 0, 'Unavailable current data is explicit and safe');
    console.log(`Results: ${this.passed} passed, ${this.failed} failed.`);
    return { passed: this.passed, failed: this.failed };
  }

  private createBeach(): Beach {
    const zone = (id: string, x: number): Beach['zones'][number] => ({ id, name: id, type: 'SWIMMING', x, y: 0, width: 100, height: 100, status: 'OPEN' });
    return { id: 'TEST-BEACH', name: 'Test Beach', width: 1000, height: 600, shorelineY: 280, zones: [zone('SZ-01', 0), zone('SZ-02', 450)], lifeguardStations: [], emergencyPoints: [] };
  }

  private createVisitor(id: string, x: number, y: number, currentZone: string): Visitor {
    return {
      id, type: 'SWIMMER', position: { x, y }, currentZone, state: 'SWIMMING', behavior: {} as Visitor['behavior'],
      vulnerability: 0.4, awareness: 0.5, swimmingAbility: 0.7, riskTolerance: 0.5, warningResponse: 0.5,
      distressLevel: 0, speed: 1, active: true, awarenessState: 'UNAWARE', reactionDelaySeconds: 1,
      localWaterDepth: 1.5, fatigue: 0, waterTime: 0, velocity: { vx: 0, vy: 0 }, driftVector: { dx: 0, dy: 0 },
      color: '#22c55e', warningCount: 0,
    };
  }
}