/**
 * DroneVisionManager.ts
 * 
 * TIDES Drone Phase 6: Computer Vision Subsystem Manager
 * 
 * Central coordinator linking frame sources, person detection adapter,
 * multi-frame object tracker, and candidate observation event pipeline:
 * - Throttles inference to 8 Hz (125ms interval) to safeguard 60 FPS Three.js rendering
 * - Synchronizes with selected drone camera feed
 * - Coordinates per-camera track isolation during camera switches
 * - Maintains active detections, confirmed tracks, and observation logs
 * - Provides reactive event subscriptions for command-center UI components
 */

import {
  DroneDetectionRecord,
  DroneTrackRecord,
  DroneCandidateObservation,
  InferenceMetrics,
  DroneDetectionFrame,
} from './droneDetection.types';
import { DronePersonDetectionAdapter } from './DronePersonDetectionAdapter';
import { DroneObjectTracker } from './DroneObjectTracker';
import { DroneObservationPublisher } from './DroneObservationPublisher';
import { DroneVirtualFeedManager } from '../../scene3d/drones/DroneVirtualFeedManager';
import { DroneCameraRegistry } from '../camera/DroneCameraRegistry';
import { DroneRegistry } from '../foundation/DroneRegistry';

export class DroneVisionManager {
  private static instance: DroneVisionManager | null = null;

  private adapter: DronePersonDetectionAdapter;
  private tracker: DroneObjectTracker;
  private publisher: DroneObservationPublisher;
  private feedManager: DroneVirtualFeedManager;
  private cameraRegistry: DroneCameraRegistry;
  private droneRegistry: DroneRegistry;

  private latestDetections: DroneDetectionRecord[] = [];
  private latestTracks: DroneTrackRecord[] = [];
  private isOverlayEnabled: boolean = true;
  private lastInferenceTimeMs: number = 0;
  private readonly INFERENCE_INTERVAL_MS: number = 125; // 8 Hz inference rate
  private frameSequence: number = 1000;
  private listeners: Set<() => void> = new Set();

  public static getInstance(): DroneVisionManager {
    if (!DroneVisionManager.instance) {
      DroneVisionManager.instance = new DroneVisionManager();
    }
    return DroneVisionManager.instance;
  }

  constructor() {
    this.adapter = new DronePersonDetectionAdapter();
    this.tracker = DroneObjectTracker.getInstance();
    this.publisher = DroneObservationPublisher.getInstance();
    this.feedManager = DroneVirtualFeedManager.getInstance();
    this.cameraRegistry = DroneCameraRegistry.getInstance();
    this.droneRegistry = DroneRegistry.getInstance();
  }

  public reset(): void {
    this.adapter.reset();
    this.tracker.reset();
    this.publisher.reset();
    this.latestDetections = [];
    this.latestTracks = [];
    this.lastInferenceTimeMs = 0;
    this.notify();
  }

  public setOverlayEnabled(enabled: boolean): void {
    this.isOverlayEnabled = enabled;
    this.notify();
  }

  public getIsOverlayEnabled(): boolean {
    return this.isOverlayEnabled;
  }

  public getLatestDetections(): DroneDetectionRecord[] {
    return [...this.latestDetections];
  }

  public getActiveTracks(): DroneTrackRecord[] {
    return [...this.latestTracks];
  }

  public getMetrics(): InferenceMetrics {
    return this.adapter.getMetrics();
  }

  public getObservationPublisher(): DroneObservationPublisher {
    return this.publisher;
  }

  public getAdapter(): DronePersonDetectionAdapter {
    return this.adapter;
  }

  public getTracker(): DroneObjectTracker {
    return this.tracker;
  }

  /**
   * Main per-tick hook called from BeachScene3D render loop
   */
  public update(
    clockMs: number = performance.now(),
    visitors3D?: Array<{ id: string; x: number; y: number; z: number }>,
    isNightMode: boolean = false
  ): void {
    // Throttle inference rate to ~8 Hz to preserve simulation responsiveness
    if (clockMs - this.lastInferenceTimeMs < this.INFERENCE_INTERVAL_MS) {
      return;
    }
    this.lastInferenceTimeMs = clockMs;

    const selectedDroneId = this.feedManager.getSelectedDroneId();
    const camRecord = this.cameraRegistry.getCameraByDroneId(selectedDroneId);
    const droneRecord = this.droneRegistry.getDrone(selectedDroneId);

    if (!camRecord || !droneRecord || camRecord.status !== 'ACTIVE') {
      this.latestDetections = [];
      this.latestTracks = [];
      return;
    }

    this.frameSequence++;
    const frame: DroneDetectionFrame = {
      frameId: `FRM-${camRecord.cameraId}-${this.frameSequence}`,
      cameraId: camRecord.cameraId,
      droneId: droneRecord.droneId,
      missionId: droneRecord.currentMissionId,
      timestampMs: Date.now(),
      width: 640,
      height: 360,
      cameraFovDegrees: camRecord.fieldOfViewDegrees,
      gimbalPitchDegrees: camRecord.gimbal.pitchDegrees,
      droneAltitudeAgl: droneRecord.position3D.y,
      isNightMode,
    };

    // 1. Run Person Detection Inference
    const detections = this.adapter.detect(frame, visitors3D);
    this.latestDetections = detections;

    // 2. Run Multi-Frame Object Tracking
    const tracks = this.tracker.update(camRecord.cameraId, droneRecord.droneId, detections, frame.timestampMs);
    this.latestTracks = tracks.filter((t) => t.state !== 'EXPIRED');

    // 3. Evaluate & Publish Candidate Observations
    this.publisher.processTracksForObservations(tracks, frame.timestampMs);

    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }
}

