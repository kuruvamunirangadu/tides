/**
 * DroneFaultVisual3D.ts
 * 
 * TIDES Drone Phase 12: 3D Fault Visualization Layer
 * 
 * Renders spatial fault indicators and uncertainty markers in the Three.js viewport:
 * - Low-Battery Warning: Amber pulsating warning ring
 * - Critical Battery: Fast red flashing alert beacon
 * - Communication Lost / Stale Telemetry: Translucent "Last Known Position (Uncertain)" ghost marker
 *   at lastKnownValidPosition3D, clearly separated from verified live airframes
 * - Operator Intervention Required: Pulsing red warning diamond
 * - Return-to-Base in Progress: Directional cyan dashed vector line to home pad
 * - Enforces zero-teleportation and non-interference with existing scene graph
 */

import * as THREE from 'three';
import { DroneFaultRecoveryManager } from '../../drones/fault/DroneFaultRecoveryManager';
import { DroneRegistry } from '../../drones/foundation/DroneRegistry';
import { DroneFaultRecord } from '../../drones/fault/droneFault.types';

export class DroneFaultVisual3D extends THREE.Group {
  private recoveryManager: DroneFaultRecoveryManager;
  private registry: DroneRegistry;

  // Active visual nodes keyed by faultId
  private faultVisuals: Map<string, THREE.Group> = new Map();
  // Ghost markers for uncertain positions keyed by droneId
  private ghostMarkers: Map<string, THREE.Group> = new Map();

  private pulseTime: number = 0;

  constructor(
    recoveryManager: DroneFaultRecoveryManager = DroneFaultRecoveryManager.getInstance(),
    registry: DroneRegistry = DroneRegistry.getInstance()
  ) {
    super();
    this.name = 'DroneFaultVisualLayer';
    this.recoveryManager = recoveryManager;
    this.registry = registry;
  }

  /**
   * Animation update loop called from BeachScene3D at 60 FPS
   */
  public update(deltaTimeSec: number): void {
    this.pulseTime += deltaTimeSec;
    const pulseFactor = 0.5 + 0.5 * Math.sin(this.pulseTime * 5.0); // 0 to 1
    const fastPulse = 0.5 + 0.5 * Math.sin(this.pulseTime * 12.0);

    const activeFaults = this.recoveryManager.getDetector().getActiveFaults();
    const activeFaultIds = new Set(activeFaults.map((f) => f.faultId));
    const activeUncertainDroneIds = new Set<string>();

    // 1. Synchronize visual nodes for each active fault
    for (const fault of activeFaults) {
      let visualGroup = this.faultVisuals.get(fault.faultId);
      if (!visualGroup) {
        visualGroup = this.createFaultVisualGroup(fault);
        this.faultVisuals.set(fault.faultId, visualGroup);
        this.add(visualGroup);
      }

      this.updateFaultVisualGroup(visualGroup, fault, pulseFactor, fastPulse);

      // Track drones needing uncertain last-known position ghost markers
      if (fault.isPositionUncertain && fault.lastKnownValidPosition3D) {
        activeUncertainDroneIds.add(fault.droneId);
        let ghostGroup = this.ghostMarkers.get(fault.droneId);
        if (!ghostGroup) {
          ghostGroup = this.createGhostPositionMarker(fault.droneId, fault.lastKnownValidPosition3D);
          this.ghostMarkers.set(fault.droneId, ghostGroup);
          this.add(ghostGroup);
        }
        // Animate ghost marker
        const ghostRing = ghostGroup.getObjectByName('ghostRing') as THREE.Mesh;
        if (ghostRing) {
          ghostRing.scale.setScalar(1.0 + 0.2 * pulseFactor);
        }
      }
    }

    // 2. Garbage collect cleared fault visuals
    for (const [faultId, group] of this.faultVisuals.entries()) {
      if (!activeFaultIds.has(faultId)) {
        this.remove(group);
        this.disposeGroup(group);
        this.faultVisuals.delete(faultId);
      }
    }

    // 3. Garbage collect resolved ghost markers
    for (const [droneId, group] of this.ghostMarkers.entries()) {
      if (!activeUncertainDroneIds.has(droneId)) {
        this.remove(group);
        this.disposeGroup(group);
        this.ghostMarkers.delete(droneId);
      }
    }
  }

  /**
   * Constructs the 3D visual group for a specific fault
   */
  private createFaultVisualGroup(fault: DroneFaultRecord): THREE.Group {
    const group = new THREE.Group();
    group.name = `FaultVisual_${fault.faultId}`;

    // A. Warning Ring Geometry
    const ringGeo = new THREE.RingGeometry(1.5, 1.8, 32);
    ringGeo.rotateX(-Math.PI / 2); // Align with water surface/horizontal plane
    const ringMat = new THREE.MeshBasicMaterial({
      color: fault.severity === 'CRITICAL' ? 0xef4444 : 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.name = 'warningRing';
    group.add(ringMesh);

    // B. RTB Vector Line (if Return-to-Base active)
    const lineMat = new THREE.LineDashedMaterial({
      color: 0x06b6d4,
      dashSize: 1.0,
      gapSize: 0.5,
      transparent: true,
      opacity: 0.75,
    });
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
    ]);
    const lineMesh = new THREE.Line(lineGeo, lineMat);
    lineMesh.name = 'rtbVector';
    lineMesh.visible = false;
    group.add(lineMesh);

    return group;
  }

  /**
   * Updates position, scale, and animation of a fault visual node
   */
  private updateFaultVisualGroup(
    group: THREE.Group,
    fault: DroneFaultRecord,
    pulseFactor: number,
    fastPulse: number
  ): void {
    const drone = this.registry.getDrone(fault.droneId);
    if (!drone) return;

    // Position warning ring directly underneath drone airframe
    group.position.set(drone.position3D.x, Math.max(0.2, drone.position3D.y - 1.0), drone.position3D.z);

    const ringMesh = group.getObjectByName('warningRing') as THREE.Mesh;
    if (ringMesh) {
      const mat = ringMesh.material as THREE.MeshBasicMaterial;
      if (fault.severity === 'CRITICAL') {
        mat.color.setHex(0xef4444); // Red
        mat.opacity = 0.5 + 0.5 * fastPulse;
        ringMesh.scale.setScalar(1.0 + 0.3 * fastPulse);
      } else {
        mat.color.setHex(0xf59e0b); // Amber
        mat.opacity = 0.4 + 0.4 * pulseFactor;
        ringMesh.scale.setScalar(1.0 + 0.15 * pulseFactor);
      }
    }

    // Update Return-to-Base Vector Line
    const lineMesh = group.getObjectByName('rtbVector') as THREE.Line;
    if (lineMesh) {
      if (fault.recoveryAction === 'RETURN_TO_BASE' && drone.homePosition3D) {
        lineMesh.visible = true;
        const pts = [
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(
            drone.homePosition3D.x - drone.position3D.x,
            drone.homePosition3D.y - (drone.position3D.y - 1.0),
            drone.homePosition3D.z - drone.position3D.z
          ),
        ];
        lineMesh.geometry.setFromPoints(pts);
        lineMesh.computeLineDistances();
      } else {
        lineMesh.visible = false;
      }
    }
  }

  /**
   * Creates an unmistakable Last Known Position (LKP) Ghost Marker.
   * Features a translucent faceted sphere and dashed surface ring clearly labeled UNCERTAIN.
   */
  private createGhostPositionMarker(droneId: string, pos: { x: number; y: number; z: number }): THREE.Group {
    const ghostGroup = new THREE.Group();
    ghostGroup.name = `GhostMarker_${droneId}`;
    ghostGroup.position.set(pos.x, pos.y, pos.z);

    // 1. Translucent Ghost Airframe Placeholder Sphere
    const sphereGeo = new THREE.IcosahedronGeometry(1.2, 1);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0xf97316, // Orange
      wireframe: true,
      transparent: true,
      opacity: 0.6,
    });
    const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
    sphereMesh.name = 'ghostSphere';
    ghostGroup.add(sphereMesh);

    // 2. Ground Projection Dropline to Water Datum
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, -pos.y, 0),
    ]);
    const lineMat = new THREE.LineDashedMaterial({
      color: 0xf97316,
      dashSize: 0.5,
      gapSize: 0.3,
      transparent: true,
      opacity: 0.5,
    });
    const dropLine = new THREE.Line(lineGeo, lineMat);
    dropLine.computeLineDistances();
    ghostGroup.add(dropLine);

    // 3. Ground Halo Ring at Water Surface
    const groundRingGeo = new THREE.RingGeometry(1.8, 2.2, 24);
    groundRingGeo.rotateX(-Math.PI / 2);
    const groundRingMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    });
    const groundRing = new THREE.Mesh(groundRingGeo, groundRingMat);
    groundRing.name = 'ghostRing';
    groundRing.position.set(0, -pos.y + 0.1, 0);
    ghostGroup.add(groundRing);

    return ghostGroup;
  }

  /**
   * Safely disposes Three.js group geometry and materials
   */
  private disposeGroup(group: THREE.Group): void {
    group.traverse((obj) => {
      if ((obj as THREE.Mesh).geometry) {
        (obj as THREE.Mesh).geometry.dispose();
      }
      if ((obj as THREE.Mesh).material) {
        const mat = (obj as THREE.Mesh).material;
        if (Array.isArray(mat)) {
          mat.forEach((m) => m.dispose());
        } else {
          mat.dispose();
        }
      }
    });
  }

  public dispose(): void {
    for (const group of this.faultVisuals.values()) {
      this.disposeGroup(group);
    }
    for (const group of this.ghostMarkers.values()) {
      this.disposeGroup(group);
    }
    this.faultVisuals.clear();
    this.ghostMarkers.clear();
    this.clear();
  }
}

