/**
 * droneDetection.types.ts
 * 
 * TIDES Drone Phase 6: Computer Vision & Swimmer Detection Data Contracts
 * 
 * Defines strict type definitions for drone aerial person detection, tracking,
 * visualization overlays, and candidate observation event publishing:
 * - DroneNormalizedBBox: Coordinates normalized to [0, 1] relative to source camera frame
 * - DroneDetectionRecord: Normalized candidate person detection with confidence and provenance
 * - DroneTrackRecord: Multi-frame persistent temporary track state
 * - DroneCandidateObservation: Structured observation event requiring human/CCTV verification
 * - IDroneDetectionAdapter: Pluggable detection adapter interface
 * - InferenceMetrics: Operational inference telemetry (latency, frame rate, dropped frames)
 * 
 * Strict Principle:
 * A person detection is a visual observation, not proof of distress or drowning.
 * Candidate observations require operator or lifeguard review before emergency action.
 */

export interface DroneNormalizedBBox {
  /** Normalized minimum X coordinate [0.0, 1.0] (left) */
  xMin: number;
  /** Normalized minimum Y coordinate [0.0, 1.0] (top) */
  yMin: number;
  /** Normalized maximum X coordinate [0.0, 1.0] (right) */
  xMax: number;
  /** Normalized maximum Y coordinate [0.0, 1.0] (bottom) */
  yMax: number;
  /** Normalized width [0.0, 1.0] */
  width: number;
  /** Normalized height [0.0, 1.0] */
  height: number;
}

export type DroneDetectedClass = 'PERSON';

export type DroneDetectionProcessingStatus = 'VALID' | 'DEGRADED' | 'UNVERIFIED' | 'DROPPED';

export interface DroneDetectionRecord {
  /** Unique detection event identifier (e.g. DET-CAM-DRONE-01-1001) */
  detectionId: string;
  /** Source camera identifier (e.g. CAM-DRONE-01) */
  cameraId: string;
  /** Source drone identifier (e.g. DRONE-01) */
  droneId: string;
  /** Associated active mission identifier, when assigned */
  missionId?: string;
  /** Source frame identifier or monotonically increasing sequence tag */
  frameId: string;
  /** Source frame acquisition timestamp (epoch ms) */
  frameTimestampMs: number;
  /** Bounding box in normalized source frame coordinates [0, 1] */
  bbox: DroneNormalizedBBox;
  /** Detected target class (strictly 'PERSON' in Phase 6) */
  className: DroneDetectedClass;
  /** Detection confidence score [0.0, 1.0] */
  confidence: number;
  /** Associated persistent temporary tracking identifier, when assigned by tracker */
  trackingId?: string;
  /** Detection calculation timestamp (epoch ms) */
  detectionTimestampMs: number;
  /** Timestamp when inference processing completed */
  processingTimestampMs: number;
  /** Provenance marker: software simulation digital twin */
  provenance: 'SIMULATED';
  /** Status of bounding box & telemetry validation */
  processingStatus: DroneDetectionProcessingStatus;
  /** Estimated 3D ground/sea coordinate projection in Three.js world space */
  groundPositionEstimated?: { x: number; y: number; z: number };
  /** Optional ground truth simulation link for algorithmic evaluation */
  groundTruthVisitorId?: string;
}

export type DroneTrackState = 'TENTATIVE' | 'CONFIRMED' | 'STALE' | 'EXPIRED';

export interface DroneTrackRecord {
  /** Persistent temporary track identifier (e.g. TRK-01-101) */
  trackId: string;
  /** Source camera identifier */
  cameraId: string;
  /** Source drone identifier */
  droneId: string;
  /** Most recent normalized bounding box */
  bbox: DroneNormalizedBBox;
  /** Filtered confidence score across tracking window */
  confidence: number;
  /** Total frames this track has been active */
  ageFrames: number;
  /** Number of successful detection associations */
  hits: number;
  /** Number of consecutive missed detection frames */
  misses: number;
  /** Timestamp when track was first initiated */
  firstSeenTimestampMs: number;
  /** Timestamp of most recent matched detection */
  lastSeenTimestampMs: number;
  /** State machine stage */
  state: DroneTrackState;
  /** Estimated 3D ground position */
  groundPositionEstimated?: { x: number; y: number; z: number };
  /** Optional ground truth reference for test verification */
  groundTruthVisitorId?: string;
}

export type DroneObservationCategory =
  | 'PERSON_IN_SURF'
  | 'PERSON_SHORELINE'
  | 'PERSON_DEEP_WATER'
  | 'PERSON_OBSERVED';

export interface DroneCandidateObservation {
  /** Unique candidate observation identifier (e.g. OBS-CANDIDATE-1001) */
  observationId: string;
  /** Source detection identifier */
  detectionId: string;
  /** Associated persistent tracking identifier */
  trackId?: string;
  /** Source drone identifier */
  droneId: string;
  /** Source camera identifier */
  cameraId: string;
  /** Associated mission identifier */
  missionId?: string;
  /** Observation timestamp */
  timestampMs: number;
  /** Detection confidence score */
  confidence: number;
  /** Bounding box in normalized frame coordinates */
  bbox: DroneNormalizedBBox;
  /** Categorization of observation location */
  category: DroneObservationCategory;
  /** Formal event designation */
  observationType: 'CANDIDATE_OBSERVATION';
  /** Explicit verification requirement gate */
  requiresVerification: true;
  /** Operator verification state */
  reviewStatus: 'PENDING_REVIEW' | 'VERIFIED' | 'DISMISSED';
  /** Operator or system audit notes */
  operatorNotes?: string;
  /** Provenance marker */
  provenance: 'SIMULATED';
}

export interface DroneDetectionFrame {
  frameId: string;
  cameraId: string;
  droneId: string;
  missionId?: string;
  timestampMs: number;
  width: number;
  height: number;
  cameraFovDegrees: number;
  gimbalPitchDegrees: number;
  droneAltitudeAgl: number;
  isNightMode?: boolean;
  canvasElement?: HTMLCanvasElement | null;
}

export interface InferenceMetrics {
  modelName: string;
  inferenceLatencyMs: number;
  framesProcessedCount: number;
  droppedFramesCount: number;
  lastInferenceTimestampMs: number;
  inferenceFps: number;
  isModelLoaded: boolean;
  status: 'IDLE' | 'PROCESSING' | 'ERROR' | 'OFFLINE';
}

export interface IDroneDetectionAdapter {
  detect(
    frame: DroneDetectionFrame,
    visitors3D?: Array<{ id: string; x: number; y: number; z: number }>
  ): Promise<DroneDetectionRecord[]> | DroneDetectionRecord[];
  getMetrics(): InferenceMetrics;
  setConfidenceThreshold(threshold: number): void;
  getConfidenceThreshold(): number;
  reset(): void;
}

