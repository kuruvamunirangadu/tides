import { Beach } from '../../../models/Beach';
import { Environment } from '../../../models/Environment';
import { Visitor } from '../../../models/Visitor';
import { SwimmerBehaviorAnalysisService } from '../SwimmerBehaviorAnalysisService';

export class SwimmerBehaviorAnalysisTestSuite {
  private passed = 0;
  private failed = 0;
  private assert(condition: boolean, name: string): void {
    if (condition) { this.passed++; console.log(`  [PASS] ${name}`); }
    else { this.failed++; console.error(`  [FAIL] ${name}`); }
  }

  public run(): { passed: number; failed: number } {
    const service = new SwimmerBehaviorAnalysisService();
    const beach = this.createBeach();
    const environment = this.createEnvironment();
    const normal = this.createVisitor('VIS-NORMAL', 300, 320);
    const first = service.evaluate([normal], beach, environment, 10);
    normal.position = { x: 302, y: 321 };
    const second = service.evaluate([normal], beach, environment, 11);

    this.assert(first[0].category !== 'CONFIRMED_DISTRESS', 'Normal swimmer behavior never becomes confirmed distress');
    this.assert(second[0].movement.speedMps > 0, 'Movement speed is derived from simulation-time position history');
    this.assert(second[0].telemetry.provenance === 'UNAVAILABLE', 'Missing wristband telemetry is explicit and not fabricated');

    const hazard = this.createVisitor('VIS-HAZARD', 550, 320);
    service.evaluate([hazard], beach, environment, 20);
    hazard.position = { x: 550, y: 350 };
    const concern = service.evaluate([hazard], beach, environment, 21);
    this.assert(concern[0].category !== 'CONFIRMED_DISTRESS', 'Environmental hazard context does not automatically trigger distress');
    this.assert(concern[0].environment.riskContext === 'ELEVATED', 'Hazard context remains represented in the assessment');
    this.assert(concern[0].explanation.length > 0, 'Anomaly output includes an explainable assessment');

    const distress = this.createVisitor('VIS-DISTRESS', 550, 350);
    distress.state = 'DISTRESS';
    const confirmed = service.evaluate([distress], beach, environment, 30);
    this.assert(confirmed[0].category === 'CONFIRMED_DISTRESS', 'Existing authoritative distress state is reflected as confirmed');
    service.acknowledge(distress.id);
    this.assert(service.evaluate([distress], beach, environment, 31)[0].acknowledged, 'Anomaly acknowledgement is separate from resolution');
    service.reset();
    this.assert(!service.evaluate([distress], beach, environment, 32)[0].acknowledged, 'Reset clears transient analysis state');

    console.log(`Results: ${this.passed} passed, ${this.failed} failed.`);
    return { passed: this.passed, failed: this.failed };
  }

  private createEnvironment(): Environment {
    return { tideLevel: 1.2, tideStatus: 'RISING', waveHeight: 1.4, wavePeriod: 8, waveDirection: 180, windSpeed: 12, windDirection: 180, weather: 'CLEAR', visibility: 10, waterCurrent: 1.1, currentSpeed: 1.1, currentDirection: 180 };
  }

  private createBeach(): Beach {
    return { id: 'ANALYSIS-BEACH', name: 'Analysis Beach', width: 1000, height: 600, shorelineY: 280, zones: [], lifeguardStations: [], emergencyPoints: [] };
  }

  private createVisitor(id: string, x: number, y: number): Visitor {
    return { id, type: 'SWIMMER', position: { x, y }, currentZone: '', state: 'SWIMMING', behavior: {} as Visitor['behavior'], vulnerability: 0.3, awareness: 0.5, swimmingAbility: 0.7, riskTolerance: 0.5, warningResponse: 0.5, distressLevel: 0, speed: 1, active: true, awarenessState: 'UNAWARE', reactionDelaySeconds: 1, localWaterDepth: 1.5, fatigue: 0.1, waterTime: 10, velocity: { vx: 0, vy: 0 }, driftVector: { dx: 0, dy: 0 }, color: '#22c55e', warningCount: 0 };
  }
}