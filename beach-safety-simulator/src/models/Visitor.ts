import { BehaviorProfile } from './BehaviorProfile';
import { DistressState, Position } from './Incident';

export type VisitorType =
  | 'SWIMMER'
  | 'NON_SWIMMER'
  | 'CHILD'
  | 'TOURIST'
  | 'EXPERIENCED_SWIMMER'
  | 'RESTRICTED_ZONE_ENTRY'
  | 'WARNING_IGNORER'
  | 'DISTRESSED_SWIMMER';

export type VisitorState =
  | 'ENTERING'
  | 'WALKING'
  | 'BEACH'
  | 'WATER_ENTRY'
  | 'SWIMMING'
  | 'STRUGGLING'
  | 'DRIFTING'
  | 'DISTRESS'
  | 'WARNING_RECEIVED'
  | 'IGNORING_WARNING'
  | 'IN_RESTRICTED_ZONE'
  | 'WAITING'
  | 'EXITING'
  | 'EXITED';

export type AwarenessState = 'UNAWARE' | 'SUSPICIOUS' | 'FLEEING' | 'TRAPPED';

export interface Visitor {
  id: string;
  type: VisitorType;
  position: Position;
  currentZone: string;
  zone?: string; // backwards compatibility
  destinationZone?: string;
  targetPosition?: Position;
  state: VisitorState;
  behavior: BehaviorProfile;
  vulnerability: number; // 0.0 - 1.0
  awareness: number; // 0.0 - 1.0
  swimmingAbility: number; // 0.0 - 1.0
  riskTolerance: number; // 0.0 - 1.0
  warningResponse: number; // 0.0 - 1.0
  distressLevel: number; // 0.0 - 1.0
  speed: number;
  active: boolean;

  // Sensory Perception & Autonomous Escape Navigation
  awarenessState: AwarenessState;
  reactionDelaySeconds: number; // Human reaction delay time (0.8 - 2.5s)
  reactionTimer?: number; // Countdown until SUSPICIOUS transitions to FLEEING
  targetSafetyCoord?: Position; // Coordinate of highest dry dune or lateral escape exit
  escapeVector?: { dx: number; dy: number }; // Directional escape vector
  localWaterDepth: number; // Current local water column depth (m)
  previousDepth?: number;
  depthRateOfChange?: number; // m/s depth surge or drawdown
  tactileUndertowDetected?: boolean;
  suddenSurgeDetected?: boolean;
  drawdownDetected?: boolean;
  isIsolatedByTide?: boolean;

  // Group Dynamics
  groupId?: string;
  leaderId?: string;
  isLeader?: boolean;

  // Physiology & Kinematics
  fatigue: number; // 0.0 - 1.0
  waterTime: number; // seconds spent in water
  velocity: { vx: number; vy: number };
  driftVector: { dx: number; dy: number };

  // Safety & Tracking
  color: string;
  name?: string;
  wristbandId?: string;
  isSuffocating?: boolean;
  feelingState?: 'SAFE' | 'APPREHENSIVE' | 'UNSAFE' | 'CRITICAL_PANIC' | 'STABILIZED';
  warningCount: number;
  lastWarningTime?: number;
  distressState?: DistressState;
  timeRemainingInState?: number;
  preferredZoneId?: string;
}

export interface VisitorGenerationConfig {
  arrivalRate: number; // visitors per minute
  maxVisitors: number;
  visitorDistribution: {
    swimmer: number;
    nonSwimmer: number;
    child: number;
    tourist: number;
    experiencedSwimmer: number;
    riskTaker: number;
    warningIgnorer: number;
  };
}

export interface VisionTrackOverlay {
  trackId: number;
  x: number;
  y: number;
  className: 'swimmer_normal' | 'struggling_arms' | 'submerged_head';
  confidence: number;
  isBreach: boolean;
}

