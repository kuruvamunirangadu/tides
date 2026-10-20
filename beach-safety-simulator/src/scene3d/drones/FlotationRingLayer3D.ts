/**
 * FlotationRingLayer3D.ts
 * 
 * TIDES Drone Phase 10: 3D Deployed Buoyant Flotation Ring Layer
 * 
 * Visualizes simulated emergency flotation rings deployed by rescue drones in the
 * Three.js 3D coastal twin scene. Features gentle ocean surface bobbing and an
 * active locator beacon.
 */

import * as THREE from 'three';
import { DroneRescueExecutionManager, DeployedFlotationRing } from '../../drones/rescue/execution/DroneRescueExecutionManager';

export class FlotationRingLayer3D {
  public group: THREE.Group;
  private ringMeshes: Map<string, THREE.Group> = new Map();
  private execManager: DroneRescueExecutionManager;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'DeployedFlotationRingsLayer';
    this.execManager = DroneRescueExecutionManager.getInstance();
  }

  public update(delta: number, clockMs: number = Date.now()): void {
    const deployed = this.execManager.getDeployedFlotationRings();
    const activeIds = new Set<string>();

    for (const ring of deployed) {
      activeIds.add(ring.ringId);

      let meshGroup = this.ringMeshes.get(ring.ringId);
      if (!meshGroup) {
        meshGroup = this.createRingMesh(ring);
        this.ringMeshes.set(ring.ringId, meshGroup);
        this.group.add(meshGroup);
      }

      // Gentle water bobbing and wave oscillation
      const bobTime = clockMs / 1000;
      const yBob = ring.position3D.y + Math.sin(bobTime * 2.5 + ring.position3D.x) * 0.12;
      meshGroup.position.set(ring.position3D.x, yBob, ring.position3D.z);
      meshGroup.rotation.y += delta * 0.4;
      meshGroup.rotation.z = Math.sin(bobTime * 1.8) * 0.08;
    }

    // Clean up removed rings
    for (const [id, meshGroup] of this.ringMeshes.entries()) {
      if (!activeIds.has(id)) {
        this.group.remove(meshGroup);
        this.disposeGroup(meshGroup);
        this.ringMeshes.delete(id);
      }
    }
  }

  private createRingMesh(ring: DeployedFlotationRing): THREE.Group {
    const group = new THREE.Group();
    group.name = `Ring-${ring.ringId}`;

    // 1. Torus Body: International Orange Safety Ring
    const torusGeom = new THREE.TorusGeometry(0.65, 0.16, 16, 32);
    torusGeom.rotateX(Math.PI / 2); // Lay flat on water surface
    const torusMat = new THREE.MeshStandardMaterial({
      color: 0xff3b00, // Vibrant SOLAS safety orange
      roughness: 0.35,
      metalness: 0.1,
      emissive: 0x441100,
    });
    const torusMesh = new THREE.Mesh(torusGeom, torusMat);
    group.add(torusMesh);

    // 2. White Retro-reflective Straps (4 segments)
    const strapMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2,
      metalness: 0.3,
      emissive: 0x333333,
    });

    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const strapGeom = new THREE.CylinderGeometry(0.18, 0.18, 0.15, 16);
      const strapMesh = new THREE.Mesh(strapGeom, strapMat);
      strapMesh.position.set(Math.cos(angle) * 0.65, 0, Math.sin(angle) * 0.65);
      group.add(strapMesh);
    }

    // 3. Flashing Distress Beacon Strobe
    const beaconGeom = new THREE.SphereGeometry(0.1, 16, 16);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const beaconMesh = new THREE.Mesh(beaconGeom, beaconMat);
    beaconMesh.position.set(0, 0.25, 0);
    group.add(beaconMesh);

    group.position.set(ring.position3D.x, ring.position3D.y, ring.position3D.z);
    return group;
  }

  private disposeGroup(group: THREE.Group): void {
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material?.dispose();
        }
      }
    });
  }

  public dispose(): void {
    for (const mesh of this.ringMeshes.values()) {
      this.group.remove(mesh);
      this.disposeGroup(mesh);
    }
    this.ringMeshes.clear();
  }
}
