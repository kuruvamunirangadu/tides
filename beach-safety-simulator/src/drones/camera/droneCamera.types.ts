/**
 * droneCamera.types.ts
 * 
 * TIDES Drone Phase 5: Camera Integration & Simulated Video Feed Types
 * 
 * Defines domain models for drone-mounted optical, thermal, and rescue cameras,
 * gimbal orientation transforms, field-of-view geometry, and observation records.
 */

import { DroneDataProvenance } from '../foundation/drone.types';

export type DroneCameraRole =
  | 'SURVEILLANCE_OPTICAL'  // High-resolution visible light camera with optical zoom
  | 'THERMAL_IR'            // Long-wave infrared thermal sensor for heat-signature tracking
  | 'RESCUE_MONITORING'     // Downward wide-angle camera for payload drop guidance
  | 'MULTI_SPECTRUM';       // Combined optical and thermal sensor payload

export type DroneCameraStatus =
  | 'ACTIVE'          // Camera operational and publishing live telemetry
  | 'STANDBY'         // Camera powered down or resting on launch pad
  | 'CALIBRATING'     // Gimbal homing or sensor auto-calibration in progress
  | 'FAULTED'         // Hardware/software fault detected (no stream)
  | 'DISCONNECTED';   // Telemetry link offline or camera detached

export type DroneCameraSourceType =
  | 'SIMULATED_VIRTUAL_PERSPECTIVE' // Synthesized 3D scene render from virtual perspective camera
  | 'SYNTHETIC_SENSOR_STREAM';      // Procedural telemetry-driven optical simulation

export interface DroneGimbalOrientation {
  pitchDegrees: number; // Downward tilt: -90° (nadir straight down) to 0° (horizon)
  yawDegrees: number;   // Relative yaw offset to drone heading: -180° to +180°
  rollDegrees: number;  // Stabilization roll angle
}

export interface DroneCameraRecord {
  cameraId: string;
  droneId: string;
  role: DroneCameraRole;
  status: DroneCameraStatus;
  gimbal: DroneGimbalOrientation;
  fieldOfViewDegrees: number; // Horizontal FOV (e.g., 65° to 84°)
  opticalZoomLevel: number;   // 1.0x to 30.0x zoom multiplier
  aspectRatio: number;        // Standard 16:9 (1.777)
  nearClipMeters: number;     // 0.5m near plane
  farClipMeters: number;      // 800m far plane
  resolution: {
    width: number;
    height: number;
  };
  frameRateFps: number;
  sourceType: DroneCameraSourceType;
  lastUpdateTimestampMs: number;
  provenance: DroneDataProvenance;
  isSimulatedFeed: true; // Explicit confirmation that this is a simulated feed
}

export interface DroneCameraObservation {
  observationId: string;
  cameraId: string;
  droneId: string;
  missionId?: string;
  timestampMs: number;
  cameraStatus: DroneCameraStatus;
  droneWorldPosition: { x: number; y: number; z: number };
  droneGps: {
    latitude: number;
    longitude: number;
    altitudeMeters: number;
  };
  gimbalHeadingDegrees: number;
  gimbalPitchDegrees: number;
  zoomLevel: number;
  provenance: DroneDataProvenance;
}

export interface CameraCoverageFootprint {
  cameraId: string;
  droneId: string;
  centerGroundPosition: { x: number; y: number; z: number };
  groundWidthMeters: number;
  groundLengthMeters: number;
  groundPolygonPoints: Array<{ x: number; z: number }>;
  isCalculated: boolean;
}

