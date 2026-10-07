export type MovementPattern =
  | 'NORMAL'
  | 'DRIFTING'
  | 'ABNORMAL_MOVEMENT'
  | 'STATIONARY_IN_WATER'
  | 'RAPID_OSCILLATION'
  | 'RESTRICTED_ENTRY';

export interface BehaviorDetection {
  trackId: string;
  groundTruthVisitorId: string;
  pattern: MovementPattern;
  driftSpeed: number; // m/s
  deviationAngle: number; // degrees
  irregularityScore: number; // 0.0 - 1.0
  stationaryDurationSec: number;
  confidence: number;
  description: string;
  timestamp: number;
}

export interface DistressDetection {
  trackId: string;
  groundTruthVisitorId: string;
  confidence: number;
  indicators: {
    irregularMovement: number; // 0 - 1
    lowForwardProgress: number; // 0 - 1
    abnormalVerticalMotion: number; // 0 - 1
    driftOffshore: number; // 0 - 1
    persistence: number; // duration weighting
  };
  durationSec: number;
  status: 'SUSPECTED' | 'CONFIRMED_BY_SIMULATION' | 'CLEARED';
  firstSuspectedAt: number;
  lastEvaluatedAt: number;
}
