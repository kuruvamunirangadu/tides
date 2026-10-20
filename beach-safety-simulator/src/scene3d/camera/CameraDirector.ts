import * as THREE from 'three';
import { CameraMode, CameraDirectorState, CameraTargetInfo } from './camera.types';
import { BeachCamera } from '../BeachCamera';
import { FollowTargetController } from './FollowTargetController';
import { Visitor } from '../../models/Visitor';
import { Beach } from '../../models/Beach';
import { Environment } from '../../models/Environment';

/**
 * CameraDirector.ts
 * 
 * Central coordinator for the Multi-Camera Experience (Milestone 5):
 * - Manages 5 cinematic camera modes: Beach Overview, Follow Swimmer, Rescue Boat, Lifeguard, Incident Focus
 * - Smooth, bounded transitions between viewpoints
 * - Frame-by-frame continuous tracking of moving objects without camera jitter
 * - Safe fallback to overview when target objects are absent
 * - Preserves existing orbit, pan, and zoom controls
 * - Zero mutation of simulation state
 */
export class CameraDirector {
  private static instance: CameraDirector | null = null;

  public mode: CameraMode = 'OVERVIEW';
  private targetController: FollowTargetController = new FollowTargetController();
  private beachCamera: BeachCamera | null = null;

  private isTracking: boolean = true;
  private isTransitioning: boolean = false;
  private transitionTimer: number = 0;
  private readonly TRANSITION_DURATION: number = 0.5; // Smooth 0.5s transition

  private currentTargetInfo: CameraTargetInfo = {
    position: new THREE.Vector3(0, 55, 95),
    lookAt: new THREE.Vector3(0, 3, -10),
    name: 'Beach Overview',
    available: true,
  };

  private listeners: Set<(state: CameraDirectorState) => void> = new Set();

  public static getInstance(): CameraDirector {
    if (!CameraDirector.instance) {
      CameraDirector.instance = new CameraDirector();
    }
    return CameraDirector.instance;
  }

  public attachCamera(camera: BeachCamera): void {
    this.beachCamera = camera;
  }

  public subscribe(cb: (state: CameraDirectorState) => void): () => void {
    this.listeners.add(cb);
    cb(this.getState());
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    const s = this.getState();
    this.listeners.forEach((cb) => cb(s));
  }

  public getState(): CameraDirectorState {
    return {
      currentMode: this.mode,
      targetName: this.currentTargetInfo.name,
      isTracking: this.isTracking,
      isTransitioning: this.isTransitioning,
      hasTarget: this.currentTargetInfo.available,
    };
  }

  public setMode(newMode: CameraMode): void {
    if (this.mode === newMode) return;
    this.mode = newMode;
    this.isTransitioning = true;
    this.transitionTimer = 0;
    this.notify();
  }

  public resetToOverview(): void {
    this.setMode('OVERVIEW');
    this.beachCamera?.reset();
  }

  /**
   * Main per-frame update loop called from BeachScene3D render loop
   */
  public update(
    delta: number,
    visitors: Visitor[],
    beach: Beach,
    environment: Environment
  ): void {
    if (!this.beachCamera) return;

    // 1. Resolve current target
    const target = this.targetController.resolveTarget(
      this.mode,
      visitors,
      beach,
      environment
    );
    this.currentTargetInfo = target;

    const cam = this.beachCamera.camera;
    const controls = this.beachCamera.controls;

    // 2. Transition handling vs continuous tracking
    if (this.isTransitioning) {
      this.transitionTimer += delta;
      const t = Math.min(1.0, this.transitionTimer / this.TRANSITION_DURATION);
      // Smooth cubic ease out
      const factor = 1 - Math.pow(1 - t, 3);

      cam.position.lerp(target.position, factor * 0.25);
      controls.target.lerp(target.lookAt, factor * 0.25);

      if (t >= 1.0 || cam.position.distanceTo(target.position) < 0.25) {
        cam.position.copy(target.position);
        controls.target.copy(target.lookAt);
        this.isTransitioning = false;
        this.notify();
      }
    } else if (this.isTracking && this.mode !== 'OVERVIEW' && target.available) {
      // Damped continuous tracking for moving targets (boat, swimmer, lifeguard)
      // Soft lerp prevents jitter while maintaining solid tracking framing
      const trackDamping = 0.08;
      cam.position.lerp(target.position, trackDamping);
      controls.target.lerp(target.lookAt, trackDamping);
    }
  }

  public dispose(): void {
    this.beachCamera = null;
    this.listeners.clear();
  }
}

