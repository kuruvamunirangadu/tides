import * as THREE from 'three';

export type CameraMode =
  | 'OVERVIEW'
  | 'FOLLOW_SWIMMER'
  | 'RESCUE_BOAT'
  | 'LIFEGUARD'
  | 'INCIDENT_FOCUS';

export interface CameraTargetInfo {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
  name: string;
  available: boolean;
  unavailableReason?: string;
}

export interface CameraDirectorState {
  currentMode: CameraMode;
  targetName: string;
  isTracking: boolean;
  isTransitioning: boolean;
  hasTarget: boolean;
}

