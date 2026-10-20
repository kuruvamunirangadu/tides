import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CameraPresetType, CameraPresetConfig } from './scene3d.types';

export const CAMERA_PRESETS: Record<CameraPresetType, CameraPresetConfig> = {
  overview: {
    position: [0, 55, 95],
    target: [0, 3, -10],
    label: 'Overview',
    icon: '🌅',
    description: 'Elevated oblique view of beach and ocean',
  },
  shoreline: {
    position: [12, 7, 28],
    target: [0, 1.5, 4],
    label: 'Shoreline',
    icon: '🏖️',
    description: 'Close-up of breaking surf and sand',
  },
  ocean: {
    position: [0, 24, -75],
    target: [0, 6, 20],
    label: 'Offshore',
    icon: '🌊',
    description: 'Seaward view looking back toward the beach',
  },
  topdown: {
    position: [0, 145, 8],
    target: [0, 0, 5],
    label: 'Top-Down',
    icon: '🧭',
    description: 'Surveillance aerial perspective',
  },
};

/**
 * BeachCamera.ts
 * 
 * Manages the 3D perspective camera and OrbitControls:
 * - Damped rotation, panning, and zoom
 * - Altitude constraints to avoid subterranean clipping
 * - Smooth animated transitions between tactical presets
 */
export class BeachCamera {
  public camera: THREE.PerspectiveCamera;
  public controls: OrbitControls;

  private targetPosition: THREE.Vector3 | null = null;
  private targetLookAt: THREE.Vector3 | null = null;
  private isTransitioning: boolean = false;
  private transitionAlpha: number = 0;

  constructor(domElement: HTMLElement, width: number, height: number) {
    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.5, 1000);

    const defaultPreset = CAMERA_PRESETS.overview;
    this.camera.position.set(...defaultPreset.position);

    this.controls = new OrbitControls(this.camera, domElement);
    this.controls.target.set(...defaultPreset.target);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.04; // Don't clip below horizon
    this.controls.minDistance = 10;
    this.controls.maxDistance = 320;
    this.controls.update();
  }

  /**
   * Smoothly animates camera to a predefined viewpoint
   */
  public setPreset(presetKey: CameraPresetType): void {
    const preset = CAMERA_PRESETS[presetKey];
    if (!preset) return;

    this.targetPosition = new THREE.Vector3(...preset.position);
    this.targetLookAt = new THREE.Vector3(...preset.target);
    this.isTransitioning = true;
    this.transitionAlpha = 0;
  }

  /**
   * Smoothly transitions the camera to focus on an active target (e.g. distressed swimmer)
   */
  public focusOn(targetPos: THREE.Vector3, distance: number = 22): void {
    this.targetLookAt = new THREE.Vector3(targetPos.x, targetPos.y + 0.5, targetPos.z);
    this.targetPosition = new THREE.Vector3(
      targetPos.x + 8,
      targetPos.y + 12,
      targetPos.z + distance
    );
    this.isTransitioning = true;
    this.transitionAlpha = 0;
  }

  /**
   * Reset to default overview
   */
  public reset(): void {
    this.setPreset('overview');
  }

  /**
   * Resizes camera projection matrix
   */
  public resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Update called every frame in RAF loop
   */
  public update(delta: number): void {
    if (this.isTransitioning && this.targetPosition && this.targetLookAt) {
      this.transitionAlpha += delta * 2.2; // ~0.45s smooth transition
      const t = Math.min(1.0, this.transitionAlpha);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - t, 3);

      this.camera.position.lerp(this.targetPosition, ease * 0.18);
      this.controls.target.lerp(this.targetLookAt, ease * 0.18);

      if (t >= 1.0 || this.camera.position.distanceTo(this.targetPosition) < 0.2) {
        this.camera.position.copy(this.targetPosition);
        this.controls.target.copy(this.targetLookAt);
        this.isTransitioning = false;
        this.targetPosition = null;
        this.targetLookAt = null;
      }
    }

    this.controls.update();
  }

  /**
   * Clean up listeners
   */
  public dispose(): void {
    this.controls.dispose();
  }
}

