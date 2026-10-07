import { SimulationState } from '../../models/Beach';
import { SimulationEvent } from '../metrics/Types';

export interface ReplayFrame {
  frameIndex: number;
  simulationTime: number;
  timeDisplay: string;
  realTimestamp: number;
  state: {
    environment: SimulationState['environment'];
    visitors: SimulationState['visitors'];
    hazards: SimulationState['hazards'];
    emergencyIncidents: SimulationState['emergencyIncidents'];
    emergencyResources: SimulationState['emergencyResources'];
    riskOverview?: SimulationState['riskOverview'];
    activeFailures: SimulationState['activeFailures'];
    decisions: SimulationState['decisions'];
    actions: SimulationState['actions'];
  };
  eventsTriggered: SimulationEvent[];
}

export interface ReplaySession {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  durationSeconds: number;
  totalFrames: number;
  frames: ReplayFrame[];
}
