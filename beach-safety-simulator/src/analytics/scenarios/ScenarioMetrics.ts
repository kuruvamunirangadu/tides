import { SimulationMetrics } from '../metrics/Types';
import { SimulationState } from '../../models/Beach';
import { SimulationEvent } from '../metrics/Types';

export interface ScenarioRunSummary {
  scenarioId: string;
  scenarioName: string;
  conditionDescription: string;
  durationSeconds: number;
  peopleExposed: number;
  peopleWarned: number;
  incidents: number;
  falsePositives: number;
  falseNegatives: number;
  detectionLatencySec: number;
  decisionLatencySec: number;
  dispatchLatencySec: number;
  arrivalLatencySec: number;
  rescueDurationSec: number;
  totalResponseTimeSec: number;
  lifeguardUtilization: number;
  droneUtilization: number;
  fallbackActivated: boolean;
  escalationsRequired: number;
  incidentsResolved: number;
  overallResilienceIndex: number;
}

export interface SimulationRunRecord {
  id: string;
  scenarioId: string;
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  events: SimulationEvent[];
  metricsSnapshot: SimulationMetrics;
  stateSnapshot?: Partial<SimulationState>;
}
