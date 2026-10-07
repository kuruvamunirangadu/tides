import { ScenarioRunSummary, SimulationRunRecord } from './ScenarioMetrics';
import { SimulationMetrics } from '../metrics/Types';

export const BENCHMARK_SCENARIOS: ScenarioRunSummary[] = [
  {
    scenarioId: 'SCENARIO_A',
    scenarioName: 'Scenario A: Normal Baseline',
    conditionDescription: 'Waves 0.8m, Current 0.3m/s, 40 beachgoers, Full fleet available',
    durationSeconds: 300,
    peopleExposed: 12,
    peopleWarned: 12,
    incidents: 1,
    falsePositives: 0,
    falseNegatives: 0,
    detectionLatencySec: 3,
    decisionLatencySec: 2,
    dispatchLatencySec: 5,
    arrivalLatencySec: 14,
    rescueDurationSec: 16,
    totalResponseTimeSec: 40,
    lifeguardUtilization: 35,
    droneUtilization: 20,
    fallbackActivated: false,
    escalationsRequired: 0,
    incidentsResolved: 1,
    overallResilienceIndex: 100,
  },
  {
    scenarioId: 'SCENARIO_B',
    scenarioName: 'Scenario B: High Rip Current',
    conditionDescription: 'Waves 1.6m, Current 1.2m/s, 65 beachgoers, Yellow flag warning',
    durationSeconds: 300,
    peopleExposed: 31,
    peopleWarned: 28,
    incidents: 2,
    falsePositives: 1,
    falseNegatives: 0,
    detectionLatencySec: 5,
    decisionLatencySec: 2,
    dispatchLatencySec: 7,
    arrivalLatencySec: 18,
    rescueDurationSec: 23,
    totalResponseTimeSec: 55,
    lifeguardUtilization: 58,
    droneUtilization: 45,
    fallbackActivated: false,
    escalationsRequired: 0,
    incidentsResolved: 2,
    overallResilienceIndex: 94,
  },
  {
    scenarioId: 'SCENARIO_C',
    scenarioName: 'Scenario C: High Current + Crowd Surge',
    conditionDescription: 'Waves 2.1m, Current 1.4m/s, 120 beachgoers in water, Red flag active',
    durationSeconds: 300,
    peopleExposed: 87,
    peopleWarned: 81,
    incidents: 5,
    falsePositives: 1,
    falseNegatives: 0,
    detectionLatencySec: 8,
    decisionLatencySec: 2,
    dispatchLatencySec: 12,
    arrivalLatencySec: 24,
    rescueDurationSec: 35,
    totalResponseTimeSec: 81,
    lifeguardUtilization: 88,
    droneUtilization: 75,
    fallbackActivated: false,
    escalationsRequired: 1,
    incidentsResolved: 4,
    overallResilienceIndex: 88,
  },
  {
    scenarioId: 'SCENARIO_D',
    scenarioName: 'Scenario D: High Current + Crowd + Drone Failure',
    conditionDescription: 'Waves 2.1m, Current 1.4m/s, 120 crowd, DRONE-01 battery failure',
    durationSeconds: 300,
    peopleExposed: 87,
    peopleWarned: 81,
    incidents: 5,
    falsePositives: 1,
    falseNegatives: 0,
    detectionLatencySec: 8,
    decisionLatencySec: 2,
    dispatchLatencySec: 19,
    arrivalLatencySec: 35,
    rescueDurationSec: 40,
    totalResponseTimeSec: 104,
    lifeguardUtilization: 95,
    droneUtilization: 0,
    fallbackActivated: true,
    escalationsRequired: 2,
    incidentsResolved: 4,
    overallResilienceIndex: 78,
  },
  {
    scenarioId: 'SCENARIO_E',
    scenarioName: 'Scenario E: Flagship Compound Crisis',
    conditionDescription: 'Waves 2.4m, Sensor out, 1200ms Network lag, 120 crowd, 2 distresses',
    durationSeconds: 300,
    peopleExposed: 94,
    peopleWarned: 88,
    incidents: 6,
    falsePositives: 2,
    falseNegatives: 0,
    detectionLatencySec: 14,
    decisionLatencySec: 4,
    dispatchLatencySec: 27,
    arrivalLatencySec: 42,
    rescueDurationSec: 45,
    totalResponseTimeSec: 132,
    lifeguardUtilization: 100,
    droneUtilization: 0,
    fallbackActivated: true,
    escalationsRequired: 3,
    incidentsResolved: 5,
    overallResilienceIndex: 72,
  },
];

export class ScenarioComparator {
  private recordedRuns: SimulationRunRecord[] = [];

  public getBenchmarkScenarios(): ScenarioRunSummary[] {
    return BENCHMARK_SCENARIOS;
  }

  public recordLiveRun(
    scenarioId: string,
    name: string,
    startTime: number,
    endTime: number,
    metrics: SimulationMetrics
  ): SimulationRunRecord {
    const record: SimulationRunRecord = {
      id: `RUN-${Date.now().toString().slice(-4)}`,
      scenarioId,
      name,
      startTime,
      endTime,
      duration: Math.max(1, Math.round(endTime - startTime)),
      events: [],
      metricsSnapshot: metrics,
    };

    this.recordedRuns.push(record);
    return record;
  }

  public getRecordedRuns(): SimulationRunRecord[] {
    return [...this.recordedRuns];
  }

  public convertMetricsToSummary(
    scenarioId: string,
    scenarioName: string,
    desc: string,
    metrics: SimulationMetrics
  ): ScenarioRunSummary {
    return {
      scenarioId,
      scenarioName,
      conditionDescription: desc,
      durationSeconds: metrics.simulationTime,
      peopleExposed: metrics.exposure.totalPeopleExposed,
      peopleWarned: metrics.exposure.peopleWarned,
      incidents: metrics.incidents.total,
      falsePositives: metrics.detection.falsePositives,
      falseNegatives: metrics.detection.falseNegatives,
      detectionLatencySec: metrics.response.averageDetectionLatency,
      decisionLatencySec: metrics.response.averageDecisionLatency,
      dispatchLatencySec: metrics.response.averageDispatchLatency,
      arrivalLatencySec: metrics.response.averageArrivalLatency,
      rescueDurationSec: metrics.response.averageRescueDuration,
      totalResponseTimeSec: metrics.response.averageTotalResponseTime,
      lifeguardUtilization: metrics.resources.fleetBreakdown.lifeguardUtilization,
      droneUtilization: metrics.resources.fleetBreakdown.droneUtilization,
      fallbackActivated: metrics.failures.fallbacksActivated > 0,
      escalationsRequired: metrics.incidents.escalated,
      incidentsResolved: metrics.incidents.resolved,
      overallResilienceIndex: metrics.failures.overallResilienceIndex,
    };
  }
}
