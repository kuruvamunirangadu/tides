/**
 * CameraDroneWristbandVisual3D.ts
 * 
 * TIDES Phase 4: Camera & Drone Integration with the Wristband Safety System
 * 
 * Three.js Digital Twin Visualization Layer:
 * - Renders candidate distress beacons (pulsing amber beacons with spatial uncertainty rings)
 * - Renders multi-sensor observation sightline vectors (dashed lines from camera/drone to target)
 * - Renders localized warning perimeter overlays (100m warning radius rings around verified incidents)
 * - Fixed camera station indicators with surveillance orientation cones
 */

import * as THREE from 'three';
import { ObservationDistressCorrelator } from '../../wristbands/integration/ObservationDistressCorrelator';
import { DroneRegistry } from '../../drones/foundation/DroneRegistry';
import { DEFAULT_CAMERAS } from '../../vision/VisionConfig';
import { CandidateDistressIncident } from '../../wristbands/integration/integration.types';

export class CameraDroneWristbandVisual3D {
  public group: THREE.Group;
  private isVisible: boolean = true;

  private correlator: ObservationDistressCorrelator;
  private droneRegistry: DroneRegistry;

  private candidateMeshes: Map<string, THREE.Group> = new Map();
  private sightlineLines: Map<string, THREE.Line> = new Map();
  private warningZoneMeshes: Map<string, THREE.Mesh> = new Map();
  private cameraStationGroup: THREE.Group;

  constructor(
    correlator: ObservationDistressCorrelator = ObservationDistressCorrelator.getInstance(),
    droneRegistry: DroneRegistry = DroneRegistry.getInstance()
  ) {
    this.group = new THREE.Group();
    this.group.name = 'CameraDroneWristbandVisual3D';
    this.correlator = correlator;
    this.droneRegistry = droneRegistry;

    this.cameraStationGroup = new THREE.Group();
    this.cameraStationGroup.name = 'FixedCameraStations';
    this.group.add(this.cameraStationGroup);

    this.buildCameraStations();
  }

  public setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.group.visible = visible;
  }

  public getVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Builds fixed beach camera station pylons and observation cones
   */
  private buildCameraStations(): void {
    for (const cam of DEFAULT_CAMERAS) {
      const station = new THREE.Group();
      station.name = `Station-${cam.id}`;

      // Beach canvas (x, y) to 3D world: x = cam.position.x, y = 14 (tower height), z = cam.position.y - 150
      const worldX = cam.position.x;
      const worldY = 12.0;
      const worldZ = cam.position.y - 120.0;
      station.position.set(worldX, worldY, worldZ);

      // Camera mounting pole
      const poleGeo = new THREE.CylinderGeometry(0.4, 0.4, 12, 8);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = -6;
      station.add(pole);

      // Camera housing unit
      const headGeo = new THREE.BoxGeometry(1.6, 1.0, 2.2);
      const headMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, metalness: 0.5, roughness: 0.4 });
      const head = new THREE.Mesh(headGeo, headMat);
      station.add(head);

      // Lens dome
      const lensGeo = new THREE.SphereGeometry(0.4, 16, 16);
      const lensMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
      const lens = new THREE.Mesh(lensGeo, lensMat);
      lens.position.set(0, 0, 1.1);
      station.add(lens);

      // Ground footprint ring
      const baseRingGeo = new THREE.RingGeometry(2.0, 2.4, 16);
      const baseRingMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
      const baseRing = new THREE.Mesh(baseRingGeo, baseRingMat);
      baseRing.rotation.x = -Math.PI / 2;
      baseRing.position.y = -12.0;
      station.add(baseRing);

      this.cameraStationGroup.add(station);
    }
  }

  /**
   * Updates dynamic beacons, uncertainty rings, sightlines, and warning zones
   */
  public update(delta: number, clockMs: number = performance.now()): void {
    if (!this.isVisible) return;

    const pulse = (Math.sin(clockMs * 0.005) + 1.0) * 0.5; // 0.0 to 1.0
    const fastPulse = (Math.sin(clockMs * 0.01) + 1.0) * 0.5;

    // 1. Process candidate distress incidents
    const candidates = this.correlator.getAllCandidates();
    const activeCandidateIds = new Set<string>();

    for (const cand of candidates) {
      if (cand.verificationState === 'DISMISSED') continue;

      activeCandidateIds.add(cand.candidateId);

      let meshGroup = this.candidateMeshes.get(cand.candidateId);
      if (!meshGroup) {
        meshGroup = this.createCandidateBeacon(cand);
        this.candidateMeshes.set(cand.candidateId, meshGroup);
        this.group.add(meshGroup);
      }

      // Update position
      const worldX = cand.estimatedLocation.x;
      const worldZ = cand.estimatedLocation.y - 150.0;
      meshGroup.position.set(worldX, 0.5, worldZ);

      // Pulse the uncertainty ring
      const ringMesh = meshGroup.getObjectByName('uncertaintyRing') as THREE.Mesh;
      if (ringMesh && ringMesh.material instanceof THREE.Material) {
        const mat = ringMesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.35 + pulse * 0.35;
      }

      // Pulse beacon cone
      const coneMesh = meshGroup.getObjectByName('beaconCone') as THREE.Mesh;
      if (coneMesh) {
        coneMesh.position.y = 8.0 + pulse * 2.0;
        coneMesh.rotation.y += delta * 1.5;
      }

      // 2. Update sightline vectors
      this.updateSightlineVector(cand, worldX, worldZ);

      // 3. Localized warning perimeter
      if (cand.verificationState === 'VERIFIED' && cand.warningDispatched) {
        let warnMesh = this.warningZoneMeshes.get(cand.candidateId);
        if (!warnMesh) {
          const warnGeo = new THREE.RingGeometry(96.0, 100.0, 48);
          const warnMat = new THREE.MeshBasicMaterial({
            color: 0xef4444,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.6,
          });
          warnMesh = new THREE.Mesh(warnGeo, warnMat);
          warnMesh.rotation.x = -Math.PI / 2;
          this.warningZoneMeshes.set(cand.candidateId, warnMesh);
          this.group.add(warnMesh);
        }

        warnMesh.position.set(worldX, 0.4, worldZ);
        (warnMesh.material as THREE.MeshBasicMaterial).opacity = 0.3 + fastPulse * 0.5;
        const scaleVal = 1.0 + fastPulse * 0.05;
        warnMesh.scale.set(scaleVal, scaleVal, 1.0);
      }
    }

    // Clean up expired candidate meshes
    for (const [id, mesh] of this.candidateMeshes.entries()) {
      if (!activeCandidateIds.has(id)) {
        this.group.remove(mesh);
        this.candidateMeshes.delete(id);

        const line = this.sightlineLines.get(id);
        if (line) {
          this.group.remove(line);
          this.sightlineLines.delete(id);
        }

        const warn = this.warningZoneMeshes.get(id);
        if (warn) {
          this.group.remove(warn);
          this.warningZoneMeshes.delete(id);
        }
      }
    }
  }

  private createCandidateBeacon(cand: CandidateDistressIncident): THREE.Group {
    const group = new THREE.Group();
    group.name = `Candidate-${cand.candidateId}`;

    const isFused = cand.primarySource === 'FUSED';
    const isDrone = cand.primarySource === 'DRONE';
    const beaconColor = isFused ? 0xef4444 : (isDrone ? 0x38bdf8 : 0xf59e0b);

    // 1. Spatial uncertainty ring on water surface
    const radius = Math.max(8.0, cand.spatialUncertaintyRadiusMeters);
    const ringGeo = new THREE.RingGeometry(radius - 1.0, radius + 1.0, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: beaconColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.name = 'uncertaintyRing';
    ring.rotation.x = -Math.PI / 2;
    group.add(ring);

    // 2. Vertical beacon column
    const columnGeo = new THREE.CylinderGeometry(0.3, 0.3, 14, 8);
    const columnMat = new THREE.MeshBasicMaterial({
      color: beaconColor,
      transparent: true,
      opacity: 0.7,
    });
    const column = new THREE.Mesh(columnGeo, columnMat);
    column.position.y = 7.0;
    group.add(column);

    // 3. Floating inverted pyramid / beacon cone
    const coneGeo = new THREE.ConeGeometry(2.5, 4.0, 4);
    const coneMat = new THREE.MeshStandardMaterial({
      color: beaconColor,
      roughness: 0.2,
      metalness: 0.8,
      emissive: beaconColor,
      emissiveIntensity: 0.6,
    });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.name = 'beaconCone';
    cone.rotation.x = Math.PI; // point downward
    cone.position.y = 9.0;
    group.add(cone);

    return group;
  }

  private updateSightlineVector(cand: CandidateDistressIncident, targetX: number, targetZ: number): void {
    let sourcePos: THREE.Vector3 | null = null;

    if (cand.primarySource === 'DRONE' || cand.primarySource === 'FUSED') {
      // Find assigned or first drone
      const drones = this.droneRegistry.getAllDrones();
      if (drones.length > 0) {
        const drone = drones[0];
        sourcePos = new THREE.Vector3(drone.position3D.x, drone.position3D.y, drone.position3D.z);
      }
    } else {
      // Fixed camera CAM-01
      sourcePos = new THREE.Vector3(140, 12, 70);
    }

    if (!sourcePos) return;

    let line = this.sightlineLines.get(cand.candidateId);
    const targetPos = new THREE.Vector3(targetX, 1.0, targetZ);

    if (!line) {
      const geo = new THREE.BufferGeometry().setFromPoints([sourcePos, targetPos]);
      const mat = new THREE.LineDashedMaterial({
        color: cand.primarySource === 'FUSED' ? 0xef4444 : 0x06b6d4,
        dashSize: 3,
        gapSize: 2,
        transparent: true,
        opacity: 0.7,
      });
      line = new THREE.Line(geo, mat);
      line.computeLineDistances();
      this.sightlineLines.set(cand.candidateId, line);
      this.group.add(line);
    } else {
      const positions = line.geometry.attributes.position as THREE.BufferAttribute;
      positions.setXYZ(0, sourcePos.x, sourcePos.y, sourcePos.z);
      positions.setXYZ(1, targetPos.x, targetPos.y, targetPos.z);
      positions.needsUpdate = true;
      line.computeLineDistances();
    }
  }

  public dispose(): void {
    for (const mesh of this.candidateMeshes.values()) {
      this.group.remove(mesh);
    }
    this.candidateMeshes.clear();

    for (const line of this.sightlineLines.values()) {
      this.group.remove(line);
    }
    this.sightlineLines.clear();

    for (const warn of this.warningZoneMeshes.values()) {
      this.group.remove(warn);
    }
    this.warningZoneMeshes.clear();
  }
}

