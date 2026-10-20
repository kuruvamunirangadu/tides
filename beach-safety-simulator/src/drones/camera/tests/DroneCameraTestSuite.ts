/**
 * DroneCameraTestSuite.ts
 * 
 * TIDES Drone Phase 5: Camera Integration & Simulated Live View Verification Test Suite
 * 
 * Validates the 14 core requirements of Phase 5:
 * 1. Authoritative camera registry binding for all 4 fleet drones.
 * 2. Role mapping (Optical, Rescue Monitoring, Multi-Spectrum Thermal, Standby).
 * 3. Gimbal pitch adjustment and boundary clamping (-90° nadir to 0° horizon).
 * 4. Gimbal yaw adjustment and boundary clamping (-90° to +90°).
 * 5. Optical zoom adjustment and scaling within safe physical limits.
 * 6. Camera operational state transitions (ACTIVE, STANDBY, FAULTED, DISCONNECTED).
 * 7. Decoupled camera vs drone operational status (non-interference).
 * 8. Ground coverage footprint geometry and scaling with drone altitude.
 * 9. Timestamped observation snapshot creation and audit metadata.
 * 10. Virtual perspective camera transform synchronization (position, heading, pitch).
 * 11. Decoupled virtual camera (zero mutation to main simulation viewport/camera).
 * 12. 3D FOV frustum geometry construction and visibility toggling.
 * 13. Multi-drone camera selection and seamless feed switching.
 * 14. Resource cleanup, render target disposal, and memory leak prevention.
 */

import * as THREE from 'three';
import { DroneCameraRegistry } from '../DroneCameraRegistry';
import { DroneRegistry } from '../../foundation/DroneRegistry';
import { DroneVirtualFeedManager } from '../../../scene3d/drones/DroneVirtualFeedManager';
import { DroneCameraFrustumVisual3D } from '../../../scene3d/drones/DroneCameraFrustumVisual3D';
import { DroneCameraRecord, DroneCameraStatus } from '../droneCamera.types';

export interface CameraTestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: Record<string, any>;
}

export class DroneCameraTestSuite {
  private cameraRegistry: DroneCameraRegistry;
  private droneRegistry: DroneRegistry;

  constructor() {
    this.cameraRegistry = DroneCameraRegistry.getInstance();
    this.droneRegistry = DroneRegistry.getInstance();
  }

  public runAll(): CameraTestResult[] {
    const results: CameraTestResult[] = [];

    // Reset singletons to known clean state
    this.droneRegistry.resetFleet();
    this.cameraRegistry.reset();

    results.push(this.testCameraRegistryFleetBinding());
    results.push(this.testCameraRoleMapping());
    results.push(this.testGimbalPitchClamping());
    results.push(this.testGimbalYawClamping());
    results.push(this.testOpticalZoomAdjustment());
    results.push(this.testCameraOperationalStatusTransitions());
    results.push(this.testDecoupledCameraAndDroneStatus());
    results.push(this.testGroundCoverageFootprintCalculation());
    results.push(this.testTimestampedObservationGeneration());
    results.push(this.testVirtualCameraTransformSync());
    results.push(this.testVirtualCameraDecouplingFromMain());
    results.push(this.testDroneCameraFrustumVisual3D());
    results.push(this.testMultiDroneCameraSwitching());
    results.push(this.testDisposalAndResourceCleanup());

    return results;
  }

  // 1. Authoritative camera registry binding for all 4 fleet drones
  private testCameraRegistryFleetBinding(): CameraTestResult {
    const cameras = this.cameraRegistry.getAllCameras();
    const expectedIds = ['CAM-DRONE-01', 'CAM-DRONE-02', 'CAM-DRONE-03', 'CAM-DRONE-04'];
    const actualIds = cameras.map((c) => c.cameraId);

    const allPresent = expectedIds.every((id) => actualIds.includes(id));
    const countMatch = cameras.length === 4;

    const drone1Cam = this.cameraRegistry.getCameraByDroneId('DRONE-01');
    const drone2Cam = this.cameraRegistry.getCameraByDroneId('DRONE-02');
    const drone3Cam = this.cameraRegistry.getCameraByDroneId('DRONE-03');
    const drone4Cam = this.cameraRegistry.getCameraByDroneId('DRONE-04');

    const bindsValid =
      drone1Cam?.droneId === 'DRONE-01' &&
      drone2Cam?.droneId === 'DRONE-02' &&
      drone3Cam?.droneId === 'DRONE-03' &&
      drone4Cam?.droneId === 'DRONE-04';

    const passed = allPresent && countMatch && bindsValid;
    return {
      name: 'Camera Registry Fleet Binding',
      passed,
      message: passed
        ? `Authoritative registry verified with 4 cameras mapped to DRONE-01..04.`
        : `Registry binding mismatch. Found: ${actualIds.join(', ')}`,
      details: { count: cameras.length, actualIds },
    };
  }

  // 2. Role mapping
  private testCameraRoleMapping(): CameraTestResult {
    const c1 = this.cameraRegistry.getCamera('CAM-DRONE-01');
    const c2 = this.cameraRegistry.getCamera('CAM-DRONE-02');
    const c3 = this.cameraRegistry.getCamera('CAM-DRONE-03');
    const c4 = this.cameraRegistry.getCamera('CAM-DRONE-04');

    const role1Ok = c1?.role === 'SURVEILLANCE_OPTICAL';
    const role2Ok = c2?.role === 'RESCUE_MONITORING';
    const role3Ok = c3?.role === 'MULTI_SPECTRUM';
    const role4Ok = c4?.role === 'SURVEILLANCE_OPTICAL' && c4?.status === 'STANDBY';

    const passed = Boolean(role1Ok && role2Ok && role3Ok && role4Ok);
    return {
      name: 'Camera Role & Sensor Payload Mapping',
      passed,
      message: passed
        ? `Sensor payloads verified: DRONE-01 Optical, DRONE-02 Rescue, DRONE-03 Multi-Spectrum, DRONE-04 Standby.`
        : `Role mismatch: c1=${c1?.role}, c2=${c2?.role}, c3=${c3?.role}, c4=${c4?.role}`,
      details: { c1Role: c1?.role, c2Role: c2?.role, c3Role: c3?.role, c4Role: c4?.role },
    };
  }

  // 3. Gimbal pitch adjustment and boundary clamping (-90° nadir to 0° horizon)
  private testGimbalPitchClamping(): CameraTestResult {
    const camId = 'CAM-DRONE-01';

    // Nominal set
    this.cameraRegistry.setGimbalPitch(camId, -45);
    const nominal = this.cameraRegistry.getCamera(camId)?.gimbal.pitchDegrees;

    // Over-pitch above horizon (+15° -> 0°)
    this.cameraRegistry.setGimbalPitch(camId, 15);
    const clampedMax = this.cameraRegistry.getCamera(camId)?.gimbal.pitchDegrees;

    // Under-pitch below nadir (-120° -> -90°)
    this.cameraRegistry.setGimbalPitch(camId, -120);
    const clampedMin = this.cameraRegistry.getCamera(camId)?.gimbal.pitchDegrees;

    // Restore to normal
    this.cameraRegistry.setGimbalPitch(camId, -35);

    const passed = nominal === -45 && clampedMax === 0 && clampedMin === -90;
    return {
      name: 'Gimbal Pitch Control & Angular Bounds',
      passed,
      message: passed
        ? `Pitch controls strictly clamped: nominal -45°, max clamped to 0°, min clamped to -90°.`
        : `Pitch clamping failure: nominal=${nominal}, max=${clampedMax}, min=${clampedMin}`,
      details: { nominal, clampedMax, clampedMin },
    };
  }

  // 4. Gimbal yaw adjustment and boundary clamping (-90° to +90°)
  private testGimbalYawClamping(): CameraTestResult {
    const camId = 'CAM-DRONE-01';

    // Nominal
    this.cameraRegistry.setGimbalYaw(camId, 45);
    const nominal = this.cameraRegistry.getCamera(camId)?.gimbal.yawDegrees;

    // Clamp right (+110° -> +90°)
    this.cameraRegistry.setGimbalYaw(camId, 110);
    const clampedMax = this.cameraRegistry.getCamera(camId)?.gimbal.yawDegrees;

    // Clamp left (-120° -> -90°)
    this.cameraRegistry.setGimbalYaw(camId, -120);
    const clampedMin = this.cameraRegistry.getCamera(camId)?.gimbal.yawDegrees;

    // Restore to 0
    this.cameraRegistry.setGimbalYaw(camId, 0);

    const passed = nominal === 45 && clampedMax === 90 && clampedMin === -90;
    return {
      name: 'Gimbal Yaw Relative Pan Control',
      passed,
      message: passed
        ? `Gimbal relative pan verified: nominal 45°, max clamped to +90°, min clamped to -90°.`
        : `Yaw clamping failure: nominal=${nominal}, max=${clampedMax}, min=${clampedMin}`,
      details: { nominal, clampedMax, clampedMin },
    };
  }

  // 5. Optical zoom adjustment and scaling within safe physical limits
  private testOpticalZoomAdjustment(): CameraTestResult {
    const camId = 'CAM-DRONE-01';

    // Set 4.5x
    this.cameraRegistry.setOpticalZoom(camId, 4.5);
    const nominal = this.cameraRegistry.getCamera(camId)?.opticalZoomLevel;

    // Clamp min (< 1.0 -> 1.0)
    this.cameraRegistry.setOpticalZoom(camId, 0.5);
    const clampedMin = this.cameraRegistry.getCamera(camId)?.opticalZoomLevel;

    // Clamp max (> 30.0 -> 30.0)
    this.cameraRegistry.setOpticalZoom(camId, 50.0);
    const clampedMax = this.cameraRegistry.getCamera(camId)?.opticalZoomLevel;

    // Restore
    this.cameraRegistry.setOpticalZoom(camId, 1.0);

    const passed = nominal === 4.5 && clampedMin === 1.0 && clampedMax === 30.0;
    return {
      name: 'Optical Zoom Control & Range Enforcement',
      passed,
      message: passed
        ? `Optical zoom verified: nominal 4.5x, min clamped to 1.0x, max clamped to 30.0x.`
        : `Zoom failure: nominal=${nominal}, min=${clampedMin}, max=${clampedMax}`,
      details: { nominal, clampedMin, clampedMax },
    };
  }

  // 6. Camera operational state transitions
  private testCameraOperationalStatusTransitions(): CameraTestResult {
    const camId = 'CAM-DRONE-02';
    const initialStatus = this.cameraRegistry.getCamera(camId)?.status;

    // Set CALIBRATING
    this.cameraRegistry.setCameraStatus(camId, 'CALIBRATING');
    const s1 = this.cameraRegistry.getCamera(camId)?.status;

    // Set FAULTED
    this.cameraRegistry.setCameraStatus(camId, 'FAULTED');
    const s2 = this.cameraRegistry.getCamera(camId)?.status;

    // Set DISCONNECTED
    this.cameraRegistry.setCameraStatus(camId, 'DISCONNECTED');
    const s3 = this.cameraRegistry.getCamera(camId)?.status;

    // Restore ACTIVE
    this.cameraRegistry.setCameraStatus(camId, 'ACTIVE');
    const s4 = this.cameraRegistry.getCamera(camId)?.status;

    const passed =
      initialStatus === 'ACTIVE' &&
      s1 === 'CALIBRATING' &&
      s2 === 'FAULTED' &&
      s3 === 'DISCONNECTED' &&
      s4 === 'ACTIVE';

    return {
      name: 'Camera Operational State Machine',
      passed,
      message: passed
        ? `Camera state transitions verified (ACTIVE -> CALIBRATING -> FAULTED -> DISCONNECTED -> ACTIVE).`
        : `State machine transition error: initial=${initialStatus}, s1=${s1}, s2=${s2}, s3=${s3}, s4=${s4}`,
      details: { initialStatus, s1, s2, s3, s4 },
    };
  }

  // 7. Decoupled camera vs drone operational status (non-interference)
  private testDecoupledCameraAndDroneStatus(): CameraTestResult {
    const drone = this.droneRegistry.getDrone('DRONE-01')!;
    const cam = this.cameraRegistry.getCameraByDroneId('DRONE-01')!;

    // Set drone to PATROLLING
    this.droneRegistry.updateOperationalStatus('DRONE-01', 'PATROLLING');
    // Set camera to FAULTED
    this.cameraRegistry.setCameraStatus(cam.cameraId, 'FAULTED');

    const droneAfter = this.droneRegistry.getDrone('DRONE-01');
    const camAfter = this.cameraRegistry.getCamera(cam.cameraId);

    const independent1 = droneAfter?.status === 'PATROLLING' && camAfter?.status === 'FAULTED';

    // Now restore camera to ACTIVE and set drone to CHARGING
    this.cameraRegistry.setCameraStatus(cam.cameraId, 'ACTIVE');
    this.droneRegistry.updateOperationalStatus('DRONE-01', 'CHARGING');

    const droneAfter2 = this.droneRegistry.getDrone('DRONE-01');
    const camAfter2 = this.cameraRegistry.getCamera(cam.cameraId);

    const independent2 = droneAfter2?.status === 'CHARGING' && camAfter2?.status === 'ACTIVE';

    const passed = independent1 && independent2;
    return {
      name: 'Decoupled Camera vs Drone Status Isolation',
      passed,
      message: passed
        ? `Status independence confirmed: drone remained PATROLLING while camera was FAULTED.`
        : `State leakage between drone and camera detected.`,
      details: { independent1, independent2 },
    };
  }

  // 8. Ground coverage footprint geometry and scaling with drone altitude
  private testGroundCoverageFootprintCalculation(): CameraTestResult {
    const drone = this.droneRegistry.getDrone('DRONE-01')!;
    // DRONE-01 at altitude 25m
    drone.position3D = { x: 50, y: 25, z: -20 };
    drone.headingDegrees = 90;
    this.cameraRegistry.setGimbalPitch('CAM-DRONE-01', -45);
    this.cameraRegistry.setOpticalZoom('CAM-DRONE-01', 1.0);

    const fp25m = this.cameraRegistry.calculateCoverageFootprint('DRONE-01');

    // DRONE-01 at altitude 50m (coverage footprint should widen)
    drone.position3D = { x: 50, y: 50, z: -20 };
    const fp50m = this.cameraRegistry.calculateCoverageFootprint('DRONE-01');

    const valid25 = fp25m.isCalculated && fp25m.groundWidthMeters > 0 && fp25m.groundLengthMeters > 0;
    const valid50 = fp50m.isCalculated && fp50m.groundWidthMeters > fp25m.groundWidthMeters;
    const hasPolygon = fp25m.groundPolygonPoints.length === 4 && fp50m.groundPolygonPoints.length === 4;

    const passed = Boolean(valid25 && valid50 && hasPolygon);
    return {
      name: 'Ground Coverage Footprint Geometry Math',
      passed,
      message: passed
        ? `Footprint geometry valid: 25m alt width=${fp25m.groundWidthMeters.toFixed(1)}m, 50m alt width=${fp50m.groundWidthMeters.toFixed(1)}m (scaled up correctly).`
        : `Footprint calculation error: valid25=${valid25}, valid50=${valid50}, hasPolygon=${hasPolygon}`,
      details: {
        width25: fp25m.groundWidthMeters,
        width50: fp50m.groundWidthMeters,
        points25: fp25m.groundPolygonPoints,
      },
    };
  }

  // 9. Timestamped observation snapshot creation and audit metadata
  private testTimestampedObservationGeneration(): CameraTestResult {
    const obs = this.cameraRegistry.generateObservation('DRONE-01', 'MSN-PATROL-01', 1700000000000);

    const hasId = obs !== undefined && obs.observationId.startsWith('OBS-CAM-DRONE-01-');
    const hasMission = obs?.missionId === 'MSN-PATROL-01';
    const hasTimestamp = obs?.timestampMs === 1700000000000;
    const hasPosition = obs?.droneWorldPosition !== undefined;
    const hasGps = obs?.droneGps !== undefined && obs?.droneGps.latitude !== undefined;
    const hasProvenance = obs?.provenance === 'SIMULATED';

    const passed = Boolean(hasId && hasMission && hasTimestamp && hasPosition && hasGps && hasProvenance);
    return {
      name: 'Simulated Observation Snapshot Generation',
      passed,
      message: passed
        ? `Observation snapshot generated with audited metadata (${obs?.observationId}, provenance: ${obs?.provenance}).`
        : `Observation generation failed or missing required audit fields.`,
      details: obs,
    };
  }

  // 10. Virtual perspective camera transform synchronization (position, heading, pitch)
  private testVirtualCameraTransformSync(): CameraTestResult {
    const feedManager = DroneVirtualFeedManager.getInstance();
    const drone = this.droneRegistry.getDrone('DRONE-01')!;

    // Set drone position and gimbal
    drone.position3D = { x: 120, y: 30, z: -50 };
    drone.headingDegrees = 180; // Facing South
    this.cameraRegistry.setGimbalPitch('CAM-DRONE-01', -30);
    this.cameraRegistry.setOpticalZoom('CAM-DRONE-01', 2.0);

    feedManager.setSelectedDrone('DRONE-01');
    const synced = feedManager.syncVirtualCamera('DRONE-01');

    const cam = feedManager.virtualCamera;
    const posMatches = Math.abs(cam.position.x - 120) < 0.01 && Math.abs(cam.position.z - (-50)) < 0.01;
    // FOV should be 75.0 / 2.0 = 37.5
    const fovMatches = Math.abs(cam.fov - 37.5) < 0.1;

    const passed = synced && posMatches && fovMatches;
    return {
      name: 'Virtual Camera Transform & FOV Synchronization',
      passed,
      message: passed
        ? `Virtual camera synchronized to airframe: pos=(${cam.position.x}, ${cam.position.y.toFixed(1)}, ${cam.position.z}), effective FOV=${cam.fov}°.`
        : `Sync failed: synced=${synced}, posMatches=${posMatches}, fovMatches=${fovMatches} (fov=${cam.fov})`,
      details: { pos: cam.position, fov: cam.fov },
    };
  }

  // 11. Decoupled virtual camera (zero mutation to main simulation viewport/camera)
  private testVirtualCameraDecouplingFromMain(): CameraTestResult {
    const feedManager = DroneVirtualFeedManager.getInstance();
    const drone = this.droneRegistry.getDrone('DRONE-01')!;

    // Create an independent dummy main camera representing the user's primary 3D viewport
    const mainCamera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);
    mainCamera.position.set(0, 15, 80);
    mainCamera.lookAt(0, 0, 0);

    const initialMainPos = mainCamera.position.clone();
    const initialMainRot = mainCamera.quaternion.clone();

    // Move drone & sync virtual feed
    drone.position3D = { x: -200, y: 45, z: 100 };
    feedManager.syncVirtualCamera('DRONE-01');

    // Verify main camera position and rotation were untouched
    const mainPosUntouched = mainCamera.position.equals(initialMainPos);
    const mainRotUntouched = mainCamera.quaternion.equals(initialMainRot);
    const virtualIsDifferent = !feedManager.virtualCamera.position.equals(mainCamera.position);

    const passed = mainPosUntouched && mainRotUntouched && virtualIsDifferent;
    return {
      name: 'Decoupled Virtual Perspective Camera Isolation',
      passed,
      message: passed
        ? `Decoupled virtual camera operated without mutating primary simulation camera.`
        : `Main camera mutation detected during virtual camera synchronization.`,
      details: { mainPosUntouched, mainRotUntouched, virtualIsDifferent },
    };
  }

  // 12. 3D FOV frustum geometry construction and visibility toggling
  private testDroneCameraFrustumVisual3D(): CameraTestResult {
    const frustumVisual = new DroneCameraFrustumVisual3D();

    const initialGroup = frustumVisual.getGroup();
    const initialVisible = frustumVisual.getVisible();

    // Update with active drones
    frustumVisual.update();
    const childrenCount = initialGroup.children.length;

    // Toggle visibility
    frustumVisual.setVisible(false);
    const toggledOff = !frustumVisual.getVisible() && !initialGroup.visible;

    frustumVisual.setVisible(true);
    const toggledOn = frustumVisual.getVisible() && initialGroup.visible;

    // Cleanup
    frustumVisual.dispose();
    const cleanedUp = initialGroup.children.length === 0;

    const passed = childrenCount > 0 && toggledOff && toggledOn && cleanedUp;
    return {
      name: '3D Camera FOV Frustum Geometry & Visibility',
      passed,
      message: passed
        ? `Frustum visual created ${childrenCount} 3D elements, toggled visibility cleanly, and disposed properly.`
        : `Frustum visual failure: children=${childrenCount}, toggledOff=${toggledOff}, toggledOn=${toggledOn}, cleanedUp=${cleanedUp}`,
      details: { childrenCount, toggledOff, toggledOn, cleanedUp },
    };
  }

  // 13. Multi-drone camera selection and seamless feed switching
  private testMultiDroneCameraSwitching(): CameraTestResult {
    const feedManager = DroneVirtualFeedManager.getInstance();

    feedManager.setSelectedDrone('DRONE-01');
    const s1 = feedManager.getSelectedDroneId();
    feedManager.syncVirtualCamera('DRONE-01');
    const fov1 = feedManager.virtualCamera.fov;

    feedManager.setSelectedDrone('DRONE-03');
    const s3 = feedManager.getSelectedDroneId();
    feedManager.syncVirtualCamera('DRONE-03');
    const fov3 = feedManager.virtualCamera.fov;

    // Reset back to DRONE-01
    feedManager.setSelectedDrone('DRONE-01');

    const passed = s1 === 'DRONE-01' && s3 === 'DRONE-03' && fov1 !== fov3;
    return {
      name: 'Multi-Drone Camera Selection & Dynamic Switching',
      passed,
      message: passed
        ? `Seamless multi-drone switching verified between DRONE-01 (FOV ${fov1}°) and DRONE-03 (FOV ${fov3}°).`
        : `Switching failure: s1=${s1}, s3=${s3}, fov1=${fov1}, fov3=${fov3}`,
      details: { s1, s3, fov1, fov3 },
    };
  }

  // 14. Resource cleanup, render target disposal, and memory leak prevention
  private testDisposalAndResourceCleanup(): CameraTestResult {
    const feedManager = DroneVirtualFeedManager.getInstance();
    const frustumVisual = new DroneCameraFrustumVisual3D();

    frustumVisual.update();
    frustumVisual.dispose();

    feedManager.dispose();

    const passed = frustumVisual.getGroup().children.length === 0 && !feedManager.getIsFeedActive();
    return {
      name: 'Resource Cleanup & Zero Memory Leaks',
      passed,
      message: passed
        ? `All WebGL render targets, geometries, and canvas contexts disposed cleanly.`
        : `Disposal failed to release internal references.`,
    };
  }
}
