import { ReplayLifecycleEvent, ReplayableIncidentDossier } from '../../impact-lab/replay/types';

export type SimulationViewMode = 'LIVE' | 'REPLAY';

export interface ReplayState3D {
  viewMode: SimulationViewMode;
  selectedIncidentId: string;
  isPlaying: boolean;
  playbackSpeed: number;
  currentSimTime: number;
  minSimTime: number;
  maxSimTime: number;
  progressPercent: number;
  activeEvents: ReplayLifecycleEvent[];
  currentEvent: ReplayLifecycleEvent | null;
  hasRecordedIncidents: boolean;
}

