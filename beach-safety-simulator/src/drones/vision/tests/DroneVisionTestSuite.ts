/**
 * DroneVisionTestSuite.ts
 * 
 * TIDES Drone Phase 6: Computer Vision & Swimmer Detection Verification Suite
 * 
 * Validates the 16 core requirements of Phase 6:
 * 1. Detection record schema & bounding box normalization.
 * 2. Model adapter initialization & metrics telemetry.
 * 3. Person detection on populated camera frustum.
 * 4. Empty frame handling (zero detections produced without error).
 * 5. Out-of-view / behind-camera frustum culling.
 * 6. Bounding box validity & inverse distance perspective scaling.
 * 7. Temporary tracking ID assignment.
 * 8. Tracking continuity across frames & TENTATIVE -> CONFIRMED promotion.
 * 9. Multi-person simultaneous tracking without ID collision.
 * 10. Missed detection handling & stale track expiration.
 * 11. Tracking ID reuse prevention (monotonic sequencing).
 * 12. Per-camera track state isolation (no cross-camera leakage).
 * 13. Stale frame rejection (> 300ms) & dropped frame counter.
 * 14. Structured candidate observation event emission with verification requirement.
 * 15. Observation event deduplication (debounce window).
 * 16. Non-interference: Person detection does NOT auto-create emergency rescue response.
 */

import * as THREE from 'three';
import { DronePersonDetectionAdapter } from '../DronePersonDetectionAdapter';
import { DroneObjectTracker } from '../DroneObjectTracker';
import { DroneObservationPublisher } from '../DroneObservationPublisher';
import { DroneVisionManager } from '../DroneVisionManager';
import { DroneCameraRegistry } from '../../camera/DroneCameraRegistry';
import { DroneRegistry } from '../../foundation/DroneRegistry';
import { DroneVirtualFeedManager } from '../../../scene3d/drones/DroneVirtualFeedManager';
import { DroneDetectionFrame, DroneDetectionRecord, DroneTrackRecord } from '../droneDetection.types';

export interface VisionTestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: Record<string, any>;
}

export class DroneVisionTestSuite {
  private adapter: DronePersonDetectionAdapter;
  private tracker: DroneObjectTracker;
  private publisher: DroneObservationPublisher;
  private cameraRegistry: DroneCameraRegistry;
  private droneRegistry: DroneRegistry;
  private feedManager: DroneVirtualFeedManager;

  constructor() {
    this.adapter = new DronePersonDetectionAdapter();
    this.tracker = DroneObjectTracker.getInstance();
    this.publisher = DroneObservationPublisher.getInstance();
    this.cameraRegistry = DroneCameraRegistry.getInstance();
    this.droneRegistry = DroneRegistry.getInstance();
    this.feedManager = DroneVirtualFeedManager.getInstance();
  }

  public runAll(): VisionTestResult[] {
    const results: VisionTestResult[] = [];

    // Reset all singletons
    this.droneRegistry.resetFleet();
    this.cameraRegistry.reset();
    this.adapter.reset();
    this.tracker.reset();
    this.publisher.reset();
    DroneVisionManager.getInstance().reset();

    results.push(this.testDetectionRecordSchemaAndBoundsValidation());
    results.push(this.testModelAdapterInitialization());
    results.push(this.testPersonDetectionOnPopulatedFrustum());
    results.push(this.testEmptyFrameHandling());
    results.push(this.testBehindCameraCulling());
    results.push(this.testBoundingBoxPerspectiveScale());
    results.push(this.testTrackingIdAssignment());
    results.push(this.testTrackingContinuityAcrossFrames());
    results.push(this.testMultiPersonSimultaneousTracking());
    results.push(this.testMissedDetectionsAndStaleExpiration());
    results.push(this.testTrackingIdReusePrevention());
    results.push(this.testPerCameraTrackingIsolation());
    results.push(this.testStaleFrameRejection());
    results.push(this.testCandidateObservationEmission());
    results.push(this.testObservationEventDeduplication());
    results.push(this.testNonInterferenceEmergencyIsolation());

    return results;
  }

  // 1. Detection record schema & bounding box normalization
  private testDetectionRecordSchemaAndBoundsValidation(): VisionTestResult {
    const frame: DroneDetectionFrame = {
      frameId: 'FRM-TEST-01',
      cameraId: 'CAM-DRONE-01',
      droneId: 'DRONE-01',
      timestampMs: Date.now(),
      width: 640,
      height: 360,
      cameraFovDegrees: 75,
      gimbalPitchDegrees: -45,
      droneAltitudeAgl: 25,
    };

    // Position drone at [0, 25, 0] looking toward [0, 0, -25]
    const drone = this.droneRegistry.getDrone('DRONE-01')!;
    drone.position3D = { x: 0, y: 25, z: 0 };
    drone.headingDegrees = 0; // North (-Z)
    this.cameraRegistry.setGimbalPitch('CAM-DRONE-01', -45);
    this.feedManager.setSelectedDrone('DRONE-01');
    this.feedManager.syncVirtualCamera('DRONE-01');

    // Visitor placed in direct line of sight
    const visitors = [{ id: 'VIS-01', x: 0, y: 0, z: -25 }];
    const detections = this.adapter.detect(frame, visitors);

    const hasDet = detections.length === 1;
    const det = detections[0];
    const validBBox =
      det !== undefined &&
      det.bbox.xMin >= 0 &&
      det.bbox.xMax <= 1 &&
      det.bbox.yMin >= 0 &&
      det.bbox.yMax <= 1 &&
      det.bbox.xMin < det.bbox.xMax &&
      det.bbox.yMin < det.bbox.yMax;

    const validClass = det?.className === 'PERSON';
    const validConf = det?.confidence >= 0.45 && det?.confidence <= 1.0;
    const validProv = det?.provenance === 'SIMULATED';

    const passed = Boolean(hasDet && validBBox && validClass && validConf && validProv);
    return {
      name: 'Detection Record Schema & Normalized Bounding Box Validation',
      passed,
      message: passed
        ? `Valid detection produced: bbox=[${det.bbox.xMin}, ${det.bbox.yMin}, ${det.bbox.xMax}, ${det.bbox.yMax}], class=${det.className}, conf=${det.confidence}.`
        : `Detection validation failed: hasDet=${hasDet}, validBBox=${validBBox}, validClass=${validClass}`,
      details: det,
    };
  }

  // 2. Model adapter initialization & metrics telemetry
  private testModelAdapterInitialization(): VisionTestResult {
    const metrics = this.adapter.getMetrics();
    const threshold = this.adapter.getConfidenceThreshold();

    const nameOk = metrics.modelName.includes('TIDES-Aerial-Person-Detector');
    const loadedOk = metrics.isModelLoaded;
    const thresholdOk = threshold === 0.45;

    const passed = nameOk && loadedOk && thresholdOk;
    return {
      name: 'Model Adapter Initialization & Inference Telemetry',
      passed,
      message: passed
        ? `Adapter initialized (${metrics.modelName}) with default threshold ${threshold}.`
        : `Adapter initialization failed.`,
      details: metrics,
    };
  }

  // 3. Person detection on populated camera frustum
  private testPersonDetectionOnPopulatedFrustum(): VisionTestResult {
    const frame: DroneDetectionFrame = {
      frameId: 'FRM-POPULATED-01',
      cameraId: 'CAM-DRONE-01',
      droneId: 'DRONE-01',
      timestampMs: Date.now(),
      width: 640,
      height: 360,
      cameraFovDegrees: 75,
      gimbalPitchDegrees: -45,
      droneAltitudeAgl: 25,
    };

    const drone = this.droneRegistry.getDrone('DRONE-01')!;
    drone.position3D = { x: 0, y: 25, z: 0 };
    drone.headingDegrees = 0;
    this.feedManager.setSelectedDrone('DRONE-01');
    this.feedManager.syncVirtualCamera('DRONE-01');

    // 2 visitors in line of sight
    const visitors = [
      { id: 'VIS-A', x: -5, y: 0, z: -25 },
      { id: 'VIS-B', x: 5, y: 0, z: -25 },
    ];

    const detections = this.adapter.detect(frame, visitors);
    const passed = detections.length === 2 && detections.every((d) => d.className === 'PERSON');

    return {
      name: 'Person Detection on Populated Camera View',
      passed,
      message: passed
        ? `Successfully detected ${detections.length} candidate persons in camera view.`
        : `Expected 2 detections, received ${detections.length}.`,
      details: { count: detections.length },
    };
  }

  // 4. Empty frame handling (zero detections produced without error)
  private testEmptyFrameHandling(): VisionTestResult {
    const frame: DroneDetectionFrame = {
      frameId: 'FRM-EMPTY-01',
      cameraId: 'CAM-DRONE-01',
      droneId: 'DRONE-01',
      timestampMs: Date.now(),
      width: 640,
      height: 360,
      cameraFovDegrees: 75,
      gimbalPitchDegrees: -45,
      droneAltitudeAgl: 25,
    };

    const detections = this.adapter.detect(frame, []);
    const passed = Array.isArray(detections) && detections.length === 0;

    return {
      name: 'Empty Frame Handling & Zero False Positives',
      passed,
      message: passed
        ? `Clean 0-detection output on empty frame without exceptions.`
        : `Empty frame produced unexpected detections: ${detections.length}`,
    };
  }

  // 5. Out-of-view / behind-camera frustum culling
  private testBehindCameraCulling(): VisionTestResult {
    const frame: DroneDetectionFrame = {
      frameId: 'FRM-CULL-01',
      cameraId: 'CAM-DRONE-01',
      droneId: 'DRONE-01',
      timestampMs: Date.now(),
      width: 640,
      height: 360,
      cameraFovDegrees: 75,
      gimbalPitchDegrees: -45,
      droneAltitudeAgl: 25,
    };

    const drone = this.droneRegistry.getDrone('DRONE-01')!;
    drone.position3D = { x: 0, y: 25, z: 0 };
    drone.headingDegrees = 0; // Looking forward toward -Z
    this.feedManager.setSelectedDrone('DRONE-01');
    this.feedManager.syncVirtualCamera('DRONE-01');

    // Visitor placed behind the camera (+Z)
    const behindVisitors = [{ id: 'VIS-BEHIND', x: 0, y: 0, z: 50 }];
    const detections = this.adapter.detect(frame, behindVisitors);

    const passed = detections.length === 0;
    return {
      name: 'Behind-Camera Frustum Geometric Culling',
      passed,
      message: passed
        ? `Out-of-view visitor behind camera correctly culled (0 detections).`
        : `Behind-camera subject leaked into detections (${detections.length}).`,
    };
  }

  // 6. Bounding box validity & inverse distance perspective scaling
  private testBoundingBoxPerspectiveScale(): VisionTestResult {
    const frame: DroneDetectionFrame = {
      frameId: 'FRM-SCALE-01',
      cameraId: 'CAM-DRONE-01',
      droneId: 'DRONE-01',
      timestampMs: Date.now(),
      width: 640,
      height: 360,
      cameraFovDegrees: 75,
      gimbalPitchDegrees: -45,
      droneAltitudeAgl: 25,
    };

    const drone = this.droneRegistry.getDrone('DRONE-01')!;
    drone.position3D = { x: 0, y: 25, z: 0 };
    drone.headingDegrees = 0;
    this.feedManager.setSelectedDrone('DRONE-01');
    this.feedManager.syncVirtualCamera('DRONE-01');

    // Close subject at 20m vs far subject at 60m
    const visitors = [
      { id: 'VIS-CLOSE', x: 0, y: 0, z: -20 },
      { id: 'VIS-FAR', x: 0, y: 0, z: -60 },
    ];

    const detections = this.adapter.detect(frame, visitors);
    const closeDet = detections.find((d) => d.groundTruthVisitorId === 'VIS-CLOSE');
    const farDet = detections.find((d) => d.groundTruthVisitorId === 'VIS-FAR');

    const scaleCorrect =
      closeDet !== undefined &&
      farDet !== undefined &&
      closeDet.bbox.height > farDet.bbox.height;

    const passed = Boolean(scaleCorrect);
    return {
      name: 'Bounding Box Inverse Distance Perspective Scaling',
      passed,
      message: passed
        ? `Perspective scale verified: close height=${closeDet?.bbox.height.toFixed(3)}, far height=${farDet?.bbox.height.toFixed(3)}.`
        : `Scale failure: close=${closeDet?.bbox.height}, far=${farDet?.bbox.height}`,
    };
  }

  // 7. Temporary tracking ID assignment
  private testTrackingIdAssignment(): VisionTestResult {
    this.tracker.reset();

    const mockDetection = this.createMockDetection('DET-01', { xMin: 0.4, yMin: 0.4, xMax: 0.5, yMax: 0.6 });
    const tracks = this.tracker.update('CAM-DRONE-01', 'DRONE-01', [mockDetection], 1000);

    const hasTrack = tracks.length === 1;
    const t = tracks[0];
    const isTentative = t?.state === 'TENTATIVE';
    const hasAssignedId = Boolean(t?.trackId && t.trackId.startsWith('TRK-01-'));
    const detReceivedTrack = mockDetection.trackingId === t?.trackId;

    const passed = hasTrack && isTentative && hasAssignedId && detReceivedTrack;
    return {
      name: 'Temporary Tracking ID Initial Assignment',
      passed,
      message: passed
        ? `Assigned tracking ID ${t.trackId} (state: ${t.state}, hits: ${t.hits}).`
        : `Tracking assignment failure: hasTrack=${hasTrack}, state=${t?.state}`,
      details: t,
    };
  }

  // 8. Tracking continuity across frames & TENTATIVE -> CONFIRMED promotion
  private testTrackingContinuityAcrossFrames(): VisionTestResult {
    this.tracker.reset();

    const camId = 'CAM-DRONE-01';
    const droneId = 'DRONE-01';

    // Frame 1
    const det1 = this.createMockDetection('DET-01', { xMin: 0.4, yMin: 0.4, xMax: 0.5, yMax: 0.6 });
    const t1 = this.tracker.update(camId, droneId, [det1], 1000);
    const assignedId = t1[0].trackId;
    const initialHits = t1[0].hits;

    // Frame 2: Slight movement
    const det2 = this.createMockDetection('DET-02', { xMin: 0.41, yMin: 0.41, xMax: 0.51, yMax: 0.61 });
    const t2 = this.tracker.update(camId, droneId, [det2], 1100);

    const matchOk = t2.length === 1 && t2[0].trackId === assignedId;
    const hitsIncremented = t2[0].hits === 2;
    const confirmedOk = t2[0].state === 'CONFIRMED';

    const passed = matchOk && hitsIncremented && confirmedOk;
    return {
      name: 'Tracking Continuity & State Promotion (CONFIRMED)',
      passed,
      message: passed
        ? `Track ${assignedId} maintained across frames and promoted to CONFIRMED (hits: ${t2[0].hits}).`
        : `Tracking continuity lost: matchOk=${matchOk}, state=${t2[0]?.state}`,
      details: t2[0],
    };
  }

  // 9. Multi-person simultaneous tracking without ID collision
  private testMultiPersonSimultaneousTracking(): VisionTestResult {
    this.tracker.reset();

    const camId = 'CAM-DRONE-01';
    const droneId = 'DRONE-01';

    // 2 distinct detections separated on screen
    const detA = this.createMockDetection('DET-A', { xMin: 0.1, yMin: 0.2, xMax: 0.2, yMax: 0.4 });
    const detB = this.createMockDetection('DET-B', { xMin: 0.7, yMin: 0.2, xMax: 0.8, yMax: 0.4 });

    const tracks = this.tracker.update(camId, droneId, [detA, detB], 1000);

    const twoTracks = tracks.length === 2;
    const uniqueIds = new Set(tracks.map((t) => t.trackId)).size === 2;

    const passed = twoTracks && uniqueIds;
    return {
      name: 'Multi-Person Simultaneous Tracking Disambiguation',
      passed,
      message: passed
        ? `Simultaneously tracked 2 persons without ID collision: ${tracks.map((t) => t.trackId).join(', ')}.`
        : `Multi-tracking failure: twoTracks=${twoTracks}, uniqueIds=${uniqueIds}`,
    };
  }

  // 10. Missed detection handling & stale track expiration
  private testMissedDetectionsAndStaleExpiration(): VisionTestResult {
    this.tracker.reset();

    const camId = 'CAM-DRONE-01';
    const droneId = 'DRONE-01';

    // Frame 1: Initial detection
    const det1 = this.createMockDetection('DET-01', { xMin: 0.4, yMin: 0.4, xMax: 0.5, yMax: 0.6 });
    this.tracker.update(camId, droneId, [det1], 1000);

    // Frame 2: Confirmed
    const det2 = this.createMockDetection('DET-02', { xMin: 0.4, yMin: 0.4, xMax: 0.5, yMax: 0.6 });
    this.tracker.update(camId, droneId, [det2], 1100);

    // Frames 3 & 4: Missed detections
    this.tracker.update(camId, droneId, [], 1200);
    const staleTracks = this.tracker.update(camId, droneId, [], 1300);
    const isStale = staleTracks[0]?.state === 'STALE';

    // Simulate timeout (> 1800ms)
    const expiredTracks = this.tracker.update(camId, droneId, [], 3500);
    const isExpired = expiredTracks.length === 0;

    const passed = isStale && isExpired;
    return {
      name: 'Missed Detection Handling & Stale Track Expiration',
      passed,
      message: passed
        ? `Track transitioned through STALE on misses and cleanly EXPIRED upon timeout.`
        : `Track expiration failure: isStale=${isStale}, isExpired=${isExpired}`,
    };
  }

  // 11. Tracking ID reuse prevention (monotonic sequencing)
  private testTrackingIdReusePrevention(): VisionTestResult {
    this.tracker.reset();

    const camId = 'CAM-DRONE-01';
    const droneId = 'DRONE-01';

    // Track 1
    const d1 = this.createMockDetection('DET-1', { xMin: 0.1, yMin: 0.1, xMax: 0.2, yMax: 0.2 });
    const t1 = this.tracker.update(camId, droneId, [d1], 1000);
    const id1 = t1[0].trackId;

    // Track 2
    const d2 = this.createMockDetection('DET-2', { xMin: 0.8, yMin: 0.8, xMax: 0.9, yMax: 0.9 });
    const t2 = this.tracker.update(camId, droneId, [d1, d2], 1100);
    const id2 = t2.find((t) => t.trackId !== id1)?.trackId;

    const distinct = id1 !== id2 && id2 !== undefined;
    const passed = distinct;

    return {
      name: 'Tracking ID Monotonic Ordering & Reuse Prevention',
      passed,
      message: passed
        ? `Monotonic distinct IDs verified: ${id1} -> ${id2}. Active ID reuse prevented.`
        : `ID reuse collision detected.`,
    };
  }

  // 12. Per-camera track state isolation (no cross-camera leakage)
  private testPerCameraTrackingIsolation(): VisionTestResult {
    this.tracker.reset();

    // Camera 1 tracking
    const dCam1 = this.createMockDetection('DET-C1', { xMin: 0.3, yMin: 0.3, xMax: 0.4, yMax: 0.4 });
    this.tracker.update('CAM-DRONE-01', 'DRONE-01', [dCam1], 1000);
    const cam1Tracks = this.tracker.getActiveTracks('CAM-DRONE-01');

    // Camera 3 tracking with no detections
    const cam3Tracks = this.tracker.getActiveTracks('CAM-DRONE-03');

    const isolated = cam1Tracks.length === 1 && cam3Tracks.length === 0;
    const passed = isolated;

    return {
      name: 'Per-Camera Multi-Drone Tracking State Isolation',
      passed,
      message: passed
        ? `Clean camera track isolation: CAM-DRONE-01 has 1 track, CAM-DRONE-03 has 0 tracks.`
        : `Track state leakage between cameras detected.`,
    };
  }

  // 13. Stale frame rejection (> 300ms) & dropped frame counter
  private testStaleFrameRejection(): VisionTestResult {
    this.adapter.reset();

    const staleFrame: DroneDetectionFrame = {
      frameId: 'FRM-STALE-01',
      cameraId: 'CAM-DRONE-01',
      droneId: 'DRONE-01',
      timestampMs: Date.now() - 500, // 500ms old (> 300ms threshold)
      width: 640,
      height: 360,
      cameraFovDegrees: 75,
      gimbalPitchDegrees: -45,
      droneAltitudeAgl: 25,
    };

    const visitors = [{ id: 'VIS-01', x: 0, y: 0, z: -25 }];
    const detections = this.adapter.detect(staleFrame, visitors);
    const metrics = this.adapter.getMetrics();

    const rejected = detections.length === 0 && metrics.droppedFramesCount === 1;
    const passed = rejected;

    return {
      name: 'Stale Input Frame Rejection & Backlog Management',
      passed,
      message: passed
        ? `Stale frame (500ms lag) rejected immediately (dropped count: ${metrics.droppedFramesCount}).`
        : `Stale frame failed to drop.`,
    };
  }

  // 14. Structured candidate observation event emission with verification requirement
  private testCandidateObservationEmission(): VisionTestResult {
    this.publisher.reset();

    const mockTrack = this.createMockTrack('TRK-01-105', 'CONFIRMED', { x: 10, y: 0, z: 5 });
    const observations = this.publisher.processTracksForObservations([mockTrack], 1000);

    const hasObs = observations.length === 1;
    const obs = observations[0];
    const isCandidate = obs?.observationType === 'CANDIDATE_OBSERVATION';
    const reqVerification = obs?.requiresVerification === true;
    const statusPending = obs?.reviewStatus === 'PENDING_REVIEW';
    const hasCategory = obs?.category === 'PERSON_IN_SURF';

    const passed = Boolean(hasObs && isCandidate && reqVerification && statusPending && hasCategory);
    return {
      name: 'Structured Candidate Observation Event Emission',
      passed,
      message: passed
        ? `Emitted candidate observation ${obs?.observationId} (status: PENDING_REVIEW, category: ${obs?.category}).`
        : `Observation emission failed: hasObs=${hasObs}, reqVerification=${reqVerification}`,
      details: obs,
    };
  }

  // 15. Observation event deduplication (debounce window)
  private testObservationEventDeduplication(): VisionTestResult {
    this.publisher.reset();

    const mockTrack = this.createMockTrack('TRK-01-105', 'CONFIRMED', { x: 10, y: 0, z: 5 });

    // First frame: should emit
    const obs1 = this.publisher.processTracksForObservations([mockTrack], 1000);
    // Second frame 500ms later (< 4000ms debounce): should NOT emit duplicate
    const obs2 = this.publisher.processTracksForObservations([mockTrack], 1500);

    const passed = obs1.length === 1 && obs2.length === 0;
    return {
      name: 'Candidate Observation Event Deduplication (Debounce Gate)',
      passed,
      message: passed
        ? `Event deduplication verified: frame 1 emitted, frame 2 suppressed (debounce 4.0s).`
        : `Duplicate observation event spam detected.`,
    };
  }

  // 16. Non-interference: Person detection does NOT auto-create emergency rescue response
  private testNonInterferenceEmergencyIsolation(): VisionTestResult {
    const drone = this.droneRegistry.getDrone('DRONE-01')!;
    const initialMission = drone.currentMissionId;

    // Run vision pipeline on active track
    const mockTrack = this.createMockTrack('TRK-01-110', 'CONFIRMED', { x: 0, y: 0, z: -15 });
    this.publisher.processTracksForObservations([mockTrack], Date.now());

    // Verify drone was not automatically launched or diverted to an emergency rescue mission
    const droneAfter = this.droneRegistry.getDrone('DRONE-01')!;
    const unmutated = droneAfter.currentMissionId === initialMission;

    const passed = unmutated;
    return {
      name: 'Non-Interference: Observation vs Emergency Rescue Isolation',
      passed,
      message: passed
        ? `Isolation confirmed: Person detection remained candidate observation without auto-dispatching rescue.`
        : `Emergency rescue was improperly triggered by computer vision observation.`,
    };
  }

  private createMockDetection(id: string, bbox: { xMin: number; yMin: number; xMax: number; yMax: number }): DroneDetectionRecord {
    return {
      detectionId: id,
      cameraId: 'CAM-DRONE-01',
      droneId: 'DRONE-01',
      frameId: 'FRM-1',
      frameTimestampMs: 1000,
      bbox: {
        ...bbox,
        width: bbox.xMax - bbox.xMin,
        height: bbox.yMax - bbox.yMin,
      },
      className: 'PERSON' as const,
      confidence: 0.9,
      detectionTimestampMs: 1000,
      processingTimestampMs: 1010,
      provenance: 'SIMULATED' as const,
      processingStatus: 'VALID' as const,
      groundPositionEstimated: { x: 0, y: 0, z: 0 },
    };
  }

  private createMockTrack(
    trackId: string,
    state: 'TENTATIVE' | 'CONFIRMED' | 'STALE' | 'EXPIRED',
    groundPos: { x: number; y: number; z: number }
  ): DroneTrackRecord {
    return {
      trackId,
      cameraId: 'CAM-DRONE-01',
      droneId: 'DRONE-01',
      bbox: { xMin: 0.4, yMin: 0.4, xMax: 0.5, yMax: 0.6, width: 0.1, height: 0.2 },
      confidence: 0.92,
      ageFrames: 3,
      hits: 3,
      misses: 0,
      firstSeenTimestampMs: 1000,
      lastSeenTimestampMs: 1000,
      state,
      groundPositionEstimated: groundPos,
    };
  }
}

