/**
 * DronePersonDetectionAdapter.ts
 * 
 * TIDES Drone Phase 6: Aerial Person Detection Inference Adapter
 * 
 * Implements a pluggable computer vision detection adapter for aerial drone cameras:
 * - Projects coastal visitors/swimmers through the drone's virtual perspective camera matrix
 * - Generates normalized 2D bounding boxes [xMin, yMin, xMax, yMax] aligned with the frame
 * - Computes distance, perspective angle, focal length, and sensor-attenuated confidence scores
 * - Enforces strict bounding box validation and out-of-frame clipping
 * - Rejects stale frames (> 300ms) and handles missing or faulted cameras gracefully
 * - Measures inference latency, frame rates, and dropped-frame metrics
 * - Non-interference: Does NOT declare drowning or emergency state; outputs class 'PERSON' only.
 */

import * as THREE from 'three';
import {
  IDroneDetectionAdapter,
  DroneDetectionFrame,
  DroneDetectionRecord,
  InferenceMetrics,
  DroneNormalizedBBox,
} from './droneDetection.types';
import { DroneVirtualFeedManager } from '../../scene3d/drones/DroneVirtualFeedManager';
import { DroneCameraRegistry } from '../camera/DroneCameraRegistry';

export class DronePersonDetectionAdapter implements IDroneDetectionAdapter {
  private minConfidenceThreshold: number = 0.45;
  private detectionCounter: number = 1000;
  private metrics: InferenceMetrics;
  private feedManager: DroneVirtualFeedManager;
  private cameraRegistry: DroneCameraRegistry;

  constructor() {
    this.feedManager = DroneVirtualFeedManager.getInstance();
    this.cameraRegistry = DroneCameraRegistry.getInstance();
    this.metrics = {
      modelName: 'TIDES-Aerial-Person-Detector-v1 (Three.js Virtual Camera Adapter)',
      inferenceLatencyMs: 0,
      framesProcessedCount: 0,
      droppedFramesCount: 0,
      lastInferenceTimestampMs: 0,
      inferenceFps: 0,
      isModelLoaded: true,
      status: 'IDLE',
    };
  }

  public setConfidenceThreshold(threshold: number): void {
    this.minConfidenceThreshold = Math.max(0.1, Math.min(0.95, threshold));
  }

  public getConfidenceThreshold(): number {
    return this.minConfidenceThreshold;
  }

  public getMetrics(): InferenceMetrics {
    return { ...this.metrics };
  }

  public reset(): void {
    this.detectionCounter = 1000;
    this.metrics.framesProcessedCount = 0;
    this.metrics.droppedFramesCount = 0;
    this.metrics.inferenceLatencyMs = 0;
    this.metrics.status = 'IDLE';
  }

  /**
   * Primary inference entry point: processes a drone camera frame and produces
   * normalized candidate PERSON detections.
   */
  public detect(
    frame: DroneDetectionFrame,
    visitors3D?: Array<{ id: string; x: number; y: number; z: number }>
  ): DroneDetectionRecord[] {
    const startTime = performance.now();
    const now = Date.now();

    // 1. Stale-frame validation: reject frames with excessive latency (> 300ms)
    if (frame.timestampMs > 0 && now - frame.timestampMs > 300) {
      this.metrics.droppedFramesCount++;
      this.metrics.status = 'PROCESSING';
      return [];
    }

    // 2. Camera status validation
    const camRecord = this.cameraRegistry.getCamera(frame.cameraId);
    if (!camRecord || camRecord.status !== 'ACTIVE') {
      this.metrics.status = camRecord?.status === 'FAULTED' ? 'ERROR' : 'IDLE';
      return [];
    }

    // 3. Obtain virtual perspective camera matching this drone
    const vCam = this.feedManager.virtualCamera;
    if (!vCam) {
      this.metrics.status = 'ERROR';
      return [];
    }

    // Synchronize camera matrices for current frame projection
    vCam.updateMatrixWorld();
    vCam.matrixWorldInverse.copy(vCam.matrixWorld).invert();
    vCam.updateProjectionMatrix();

    const detections: DroneDetectionRecord[] = [];

    // If visitors3D are provided, project them; otherwise return empty detection set
    if (visitors3D && visitors3D.length > 0) {
      const camPos = vCam.position;
      const camRot = vCam.quaternion;
      const forwardVec = new THREE.Vector3(0, 0, -1).applyQuaternion(camRot);

      for (const v of visitors3D) {
        // Torso center height (~0.9m above ground/water)
        const personWorldPos = new THREE.Vector3(v.x, v.y + 0.9, v.z);
        const toPerson = personWorldPos.clone().sub(camPos);
        const distanceMeters = toPerson.length();

        // Cull if behind camera near clip or beyond max optical range (180m)
        const forwardDot = toPerson.normalize().dot(forwardVec);
        if (forwardDot <= 0.1 || distanceMeters < 1.0 || distanceMeters > 180.0) {
          continue;
        }

        // Project 3D coordinate to Normalized Device Coordinates (NDC) [-1, 1]
        const ndc = personWorldPos.clone().project(vCam);

        // Check if inside normalized frustum
        if (ndc.z >= -1.0 && ndc.z <= 1.0 && ndc.x >= -1.05 && ndc.x <= 1.05 && ndc.y >= -1.05 && ndc.y <= 1.05) {
          // Compute screen center coordinates [0.0, 1.0]
          const normCenterX = (ndc.x + 1.0) / 2.0;
          const normCenterY = (1.0 - ndc.y) / 2.0;

          // Estimate bounding box height based on apparent perspective scale
          // Standard standing human ~ 1.7m; floating swimmer ~ 1.0m profile
          const verticalFovRad = THREE.MathUtils.degToRad(vCam.fov);
          const visibleHeightMetersAtDist = 2.0 * distanceMeters * Math.tan(verticalFovRad / 2.0);
          const normHeight = Math.max(0.015, Math.min(0.35, 1.7 / Math.max(2.0, visibleHeightMetersAtDist)));
          const normWidth = Math.max(0.01, normHeight * 0.48); // Aspect ratio ~ 0.48 for person silhouette

          // Compute box boundaries [xMin, yMin, xMax, yMax]
          const xMin = Math.max(0.0, normCenterX - normWidth / 2.0);
          const xMax = Math.min(1.0, normCenterX + normWidth / 2.0);
          const yMin = Math.max(0.0, normCenterY - normHeight / 2.0);
          const yMax = Math.min(1.0, normCenterY + normHeight / 2.0);

          const actualW = xMax - xMin;
          const actualH = yMax - yMin;

          // Validate minimum box dimension
          if (actualW < 0.005 || actualH < 0.005) {
            continue;
          }

          // Calculate confidence score based on distance, zoom, and sensor mode
          let confidence = 0.94 - (distanceMeters / 150.0) * 0.4; // 0.94 at close range -> 0.54 at 150m
          // Optical zoom bonus for distant subjects
          if (camRecord.opticalZoomLevel > 1.0 && distanceMeters > 30.0) {
            confidence += Math.min(0.2, (camRecord.opticalZoomLevel - 1.0) * 0.03);
          }
          // Night mode lighting penalty unless thermal sensor is active
          if (frame.isNightMode) {
            if (camRecord.role === 'MULTI_SPECTRUM') {
              confidence *= 0.92; // Thermal signature remains distinct at night
            } else {
              confidence *= 0.52; // Daylight optical camera suffers low illumination
            }
          }

          confidence = Math.max(0.1, Math.min(0.98, parseFloat(confidence.toFixed(2))));

          if (confidence >= this.minConfidenceThreshold) {
            this.detectionCounter++;
            const bbox: DroneNormalizedBBox = {
              xMin: parseFloat(xMin.toFixed(4)),
              yMin: parseFloat(yMin.toFixed(4)),
              xMax: parseFloat(xMax.toFixed(4)),
              yMax: parseFloat(yMax.toFixed(4)),
              width: parseFloat(actualW.toFixed(4)),
              height: parseFloat(actualH.toFixed(4)),
            };

            detections.push({
              detectionId: `DET-${frame.cameraId}-${this.detectionCounter}`,
              cameraId: frame.cameraId,
              droneId: frame.droneId,
              missionId: frame.missionId,
              frameId: frame.frameId,
              frameTimestampMs: frame.timestampMs,
              bbox,
              className: 'PERSON',
              confidence,
              detectionTimestampMs: now,
              processingTimestampMs: now + Math.round(performance.now() - startTime),
              provenance: 'SIMULATED',
              processingStatus: 'VALID',
              groundPositionEstimated: { x: v.x, y: v.y, z: v.z },
              groundTruthVisitorId: v.id,
            });
          }
        }
      }
    }

    const elapsed = performance.now() - startTime;
    this.metrics.inferenceLatencyMs = parseFloat(elapsed.toFixed(1));
    this.metrics.framesProcessedCount++;
    this.metrics.lastInferenceTimestampMs = now;
    this.metrics.status = 'IDLE';

    return detections;
  }
}
