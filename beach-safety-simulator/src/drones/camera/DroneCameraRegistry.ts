/**
 * DroneCameraRegistry.ts
 * 
 * TIDES Drone Phase 5: Authoritative Drone Camera Registry
 * 
 * Central registry managing virtual optical, thermal, and rescue cameras
 * attached to each registered drone in the Rushikonda Beach digital twin fleet.
 * - Tracks camera operational states (ACTIVE, STANDBY, FAULTED, DISCONNECTED)
 * - Controls gimbal orientation (pitch tilt, relative yaw) and optical zoom
 * - Calculates ground coverage footprint geometry
 * - Emits timestamped, audited camera observation records
 * - Enforces clean separation between drone operational status and camera status
 */

import { DroneRegistry } from '../foundation/DroneRegistry';
import {
  DroneCameraRecord,
  DroneCameraRole,
  DroneCameraStatus,
  DroneCameraObservation,
  CameraCoverageFootprint,
} from './droneCamera.types';

export class DroneCameraRegistry {
  private static instance: DroneCameraRegistry | null = null;

  private registry: DroneRegistry;
  private cameras: Map<string, DroneCameraRecord> = new Map();
  private listeners: Set<() => void> = new Set();
  private observationCounter: number = 1000;

  public static getInstance(): DroneCameraRegistry {
    if (!DroneCameraRegistry.instance) {
      DroneCameraRegistry.instance = new DroneCameraRegistry();
    }
    return DroneCameraRegistry.instance;
  }

  constructor() {
    this.registry = DroneRegistry.getInstance();
    this.initializeDefaultCameras();
  }

  public reset(): void {
    this.cameras.clear();
    this.initializeDefaultCameras();
    this.notify();
  }

  /**
   * Initializes standard camera payloads for all fleet drones
   */
  public initializeDefaultCameras(): void {
    this.cameras.clear();
    const now = Date.now();

    // 1. DRONE-01: Surveillance Specialist — 4K Optical Camera with 30x Zoom
    this.registerCamera({
      cameraId: 'CAM-DRONE-01',
      droneId: 'DRONE-01',
      role: 'SURVEILLANCE_OPTICAL',
      status: 'ACTIVE',
      gimbal: {
        pitchDegrees: -35.0, // Downward looking towards surf zone
        yawDegrees: 0.0,
        rollDegrees: 0.0,
      },
      fieldOfViewDegrees: 75.0,
      opticalZoomLevel: 1.0,
      aspectRatio: 16 / 9,
      nearClipMeters: 0.5,
      farClipMeters: 800.0,
      resolution: { width: 1920, height: 1080 },
      frameRateFps: 30,
      sourceType: 'SIMULATED_VIRTUAL_PERSPECTIVE',
      lastUpdateTimestampMs: now,
      provenance: 'SIMULATED',
      isSimulatedFeed: true,
    });

    // 2. DRONE-02: Search & Rescue Hexacopter — Rescue Drop Monitoring Camera
    this.registerCamera({
      cameraId: 'CAM-DRONE-02',
      droneId: 'DRONE-02',
      role: 'RESCUE_MONITORING',
      status: 'ACTIVE',
      gimbal: {
        pitchDegrees: -60.0, // Steep downward angle for precision flotation aid release
        yawDegrees: 0.0,
        rollDegrees: 0.0,
      },
      fieldOfViewDegrees: 80.0,
      opticalZoomLevel: 1.0,
      aspectRatio: 16 / 9,
      nearClipMeters: 0.5,
      farClipMeters: 500.0,
      resolution: { width: 1920, height: 1080 },
      frameRateFps: 30,
      sourceType: 'SIMULATED_VIRTUAL_PERSPECTIVE',
      lastUpdateTimestampMs: now,
      provenance: 'SIMULATED',
      isSimulatedFeed: true,
    });

    // 3. DRONE-03: Multi-Role Sentinel — Dual-Payload Thermal IR & Optical Sensor
    this.registerCamera({
      cameraId: 'CAM-DRONE-03',
      droneId: 'DRONE-03',
      role: 'MULTI_SPECTRUM',
      status: 'ACTIVE',
      gimbal: {
        pitchDegrees: -45.0,
        yawDegrees: 0.0,
        rollDegrees: 0.0,
      },
      fieldOfViewDegrees: 65.0,
      opticalZoomLevel: 1.0,
      aspectRatio: 16 / 9,
      nearClipMeters: 0.5,
      farClipMeters: 600.0,
      resolution: { width: 1280, height: 720 },
      frameRateFps: 30,
      sourceType: 'SIMULATED_VIRTUAL_PERSPECTIVE',
      lastUpdateTimestampMs: now,
      provenance: 'SIMULATED',
      isSimulatedFeed: true,
    });

    // 4. DRONE-04: Standby Reserve Quad — Standard Surveillance Camera
    this.registerCamera({
      cameraId: 'CAM-DRONE-04',
      droneId: 'DRONE-04',
      role: 'SURVEILLANCE_OPTICAL',
      status: 'STANDBY', // Powered down while on charging pad
      gimbal: {
        pitchDegrees: -45.0,
        yawDegrees: 0.0,
        rollDegrees: 0.0,
      },
      fieldOfViewDegrees: 70.0,
      opticalZoomLevel: 1.0,
      aspectRatio: 16 / 9,
      nearClipMeters: 0.5,
      farClipMeters: 500.0,
      resolution: { width: 1280, height: 720 },
      frameRateFps: 30,
      sourceType: 'SIMULATED_VIRTUAL_PERSPECTIVE',
      lastUpdateTimestampMs: now,
      provenance: 'SIMULATED',
      isSimulatedFeed: true,
    });
  }

  public registerCamera(record: DroneCameraRecord): void {
    this.cameras.set(record.cameraId, { ...record });
    this.notify();
  }

  public unregisterCamera(cameraId: string): boolean {
    const deleted = this.cameras.delete(cameraId);
    if (deleted) this.notify();
    return deleted;
  }

  public getCamera(cameraId: string): DroneCameraRecord | undefined {
    return this.cameras.get(cameraId);
  }

  public getCameraByDroneId(droneId: string): DroneCameraRecord | undefined {
    return Array.from(this.cameras.values()).find((c) => c.droneId === droneId);
  }

  public getCameraForDrone(droneId: string): DroneCameraRecord | undefined {
    return this.getCameraByDroneId(droneId);
  }

  public getAllCameras(): DroneCameraRecord[] {
    return Array.from(this.cameras.values());
  }

  /**
   * Updates camera operational status independently of drone status
   */
  public setCameraStatus(cameraId: string, status: DroneCameraStatus): boolean {
    const cam = this.cameras.get(cameraId);
    if (!cam) return false;

    cam.status = status;
    cam.lastUpdateTimestampMs = Date.now();
    this.notify();
    return true;
  }

  /**
   * Controls gimbal pitch angle (-90° nadir to 0° horizon)
   */
  public setGimbalPitch(cameraId: string, pitchDegrees: number): boolean {
    const cam = this.cameras.get(cameraId);
    if (!cam) return false;

    cam.gimbal.pitchDegrees = Math.max(-90, Math.min(0, pitchDegrees));
    cam.lastUpdateTimestampMs = Date.now();
    this.notify();
    return true;
  }

  /**
   * Controls relative gimbal yaw angle (-90° port to +90° starboard)
   */
  public setGimbalYaw(cameraId: string, yawDegrees: number): boolean {
    const cam = this.cameras.get(cameraId);
    if (!cam) return false;

    cam.gimbal.yawDegrees = Math.max(-90, Math.min(90, yawDegrees));
    cam.lastUpdateTimestampMs = Date.now();
    this.notify();
    return true;
  }

  /**
   * Adjusts optical zoom level (1.0x to 30.0x)
   */
  public setOpticalZoom(cameraId: string, zoomLevel: number): boolean {
    const cam = this.cameras.get(cameraId);
    if (!cam) return false;

    cam.opticalZoomLevel = Math.max(1.0, Math.min(30.0, zoomLevel));
    cam.lastUpdateTimestampMs = Date.now();
    this.notify();
    return true;
  }

  /**
   * Computes ground-plane projection footprint based on drone altitude, heading, and gimbal pitch
   */
  public calculateCoverageFootprint(droneId: string): CameraCoverageFootprint {
    const drone = this.registry.getDrone(droneId);
    const cam = this.getCameraByDroneId(droneId);

    if (!drone || !cam) {
      return {
        cameraId: cam?.cameraId ?? '',
        droneId,
        centerGroundPosition: { x: 0, y: 0, z: 0 },
        groundWidthMeters: 0,
        groundLengthMeters: 0,
        groundPolygonPoints: [],
        isCalculated: false,
      };
    }

    const altitude = Math.max(1.0, drone.position3D.y);
    const effectiveFov = (cam.fieldOfViewDegrees / cam.opticalZoomLevel) * (Math.PI / 180);
    const pitchRad = Math.abs((cam.gimbal.pitchDegrees * Math.PI) / 180);
    const droneHeadingRad = (drone.headingDegrees * Math.PI) / 180;

    // Ground projection geometry
    // Center point projected along look vector: forward distance = altitude / tan(pitch)
    const forwardDistance = Math.min(120.0, altitude / Math.max(0.15, Math.tan(pitchRad)));
    const centerGroundX = drone.position3D.x + forwardDistance * Math.sin(droneHeadingRad);
    const centerGroundZ = drone.position3D.z - forwardDistance * Math.cos(droneHeadingRad);

    // Approximate footprint span
    const groundWidth = 2.0 * forwardDistance * Math.tan(effectiveFov / 2);
    const groundLength = forwardDistance * 0.75;

    // 4 corner vertices in Three.js world coordinates
    const halfW = groundWidth / 2;
    const halfL = groundLength / 2;
    const cosH = Math.cos(droneHeadingRad);
    const sinH = Math.sin(droneHeadingRad);

    const corners = [
      { x: -halfW, z: -halfL }, // Front left
      { x: halfW, z: -halfL },  // Front right
      { x: halfW, z: halfL },   // Back right
      { x: -halfW, z: halfL },  // Back left
    ].map((c) => ({
      x: centerGroundX + c.x * cosH - c.z * sinH,
      z: centerGroundZ + c.x * sinH + c.z * cosH,
    }));

    return {
      cameraId: cam.cameraId,
      droneId,
      centerGroundPosition: { x: centerGroundX, y: 0.1, z: centerGroundZ },
      groundWidthMeters: groundWidth,
      groundLengthMeters: groundLength,
      groundPolygonPoints: corners,
      isCalculated: true,
    };
  }

  /**
   * Generates a timestamped, audited camera observation snapshot
   */
  public generateObservation(
    droneId: string,
    missionId?: string,
    clockMs: number = Date.now()
  ): DroneCameraObservation | undefined {
    const drone = this.registry.getDrone(droneId);
    const cam = this.getCameraByDroneId(droneId);

    if (!drone || !cam) return undefined;

    this.observationCounter++;
    return {
      observationId: `OBS-${cam.cameraId}-${this.observationCounter}`,
      cameraId: cam.cameraId,
      droneId: drone.droneId,
      missionId: missionId ?? drone.currentMissionId,
      timestampMs: clockMs,
      cameraStatus: cam.status,
      droneWorldPosition: { ...drone.position3D },
      droneGps: {
        latitude: drone.positionGeo?.latitude ?? 17.783,
        longitude: drone.positionGeo?.longitude ?? 83.385,
        altitudeMeters: drone.position3D.y,
      },
      gimbalHeadingDegrees: drone.headingDegrees + cam.gimbal.yawDegrees,
      gimbalPitchDegrees: cam.gimbal.pitchDegrees,
      zoomLevel: cam.opticalZoomLevel,
      provenance: 'SIMULATED',
    };
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }
}
