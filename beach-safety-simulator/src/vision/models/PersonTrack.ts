import { Position } from '../../models/Incident';
import { BoundingBox, DetectionProvenance } from './Detection';

export type TrackLifecycleState = 'TENTATIVE' | 'CONFIRMED' | 'LOST' | 'EXPIRED';

export interface PersonTrack {
  trackId: string;
  cameraId: string;
  groundTruthVisitorId: string;
  positions: Position[];
  latestBBox: BoundingBox;
  firstSeen: number; // timestamp in seconds
  lastSeen: number;
  velocity: {
    x: number;
    y: number;
  };
  speed: number;
  direction: number; // angle in degrees
  confidence: number;
  active: boolean;
  state: TrackLifecycleState;
  hits: number;
  misses: number;
  provenance?: DetectionProvenance;
  globalCrossCameraId?: string;
  currentZoneId?: string;
  framesTracked: number;
  driftingObserved: boolean;
  distressSuspected: boolean;
  restrictedEntryObserved: boolean;
}
