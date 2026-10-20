/**
 * MissionReplayVisual3D.ts
 * 
 * TIDES — Phase 13: Unified Command Center Dashboard & Mission Replay
 * 
 * Three.js 3D Visualizer for Historical Mission Replay:
 * - Mounts within BeachScene3D scene graph.
 * - Completely isolated from live DroneLayer3D and RescueOperationLayer.
 * - Only active and visible when MissionReplayEngine.isReplayActive === true.
 * - Renders:
 *   1. Distinct golden/amber holographic historical drone representations.
 *   2. Vertical tactical surface drop-lines and altitude indicators.
 *   3. Spatial uncertainty indicators during telemetry gaps (no fake paths).
 *   4. Historical incident markers and flotation drop locations.
 */

import * as THREE from 'three';
import { MissionReplayEngine } from '../../command-center/unified/MissionReplayEngine';
import { ReplayPlaybackState } from '../../command-center/unified/commandCenter.types';

export class MissionReplayVisual3D {
  private group: THREE.Group;
  private scene: THREE.Scene;
  private replayEngine: MissionReplayEngine;
  private unsubscribe: (() => void) | null = null;

  // Visual sub-groups
  private droneMeshes: Map<string, THREE.Group> = new Map();
  private incidentMarkerGroup: THREE.Group;
  private dropMarkerGroup: THREE.Group;

  // Shared reusable materials
  private historicalDroneMaterial: THREE.MeshStandardMaterial;
  private rotorMaterial: THREE.MeshBasicMaterial;
  private uncertainMaterial: THREE.MeshBasicMaterial;
  private incidentMaterial: THREE.MeshStandardMaterial;
  private dropMaterial: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene, replayEngine: MissionReplayEngine = MissionReplayEngine.getInstance()) {
    this.scene = scene;
    this.replayEngine = replayEngine;
    this.group = new THREE.Group();
    this.group.name = 'TIDES_MissionReplayVisual3D_Group';
    this.group.visible = false; // Hidden until replay is active

    this.incidentMarkerGroup = new THREE.Group();
    this.dropMarkerGroup = new THREE.Group();
    this.group.add(this.incidentMarkerGroup);
    this.group.add(this.dropMarkerGroup);

    // Golden amber holographic materials for clear historical visual distinction
    this.historicalDroneMaterial = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Amber 500
      emissive: 0xd97706,
      emissiveIntensity: 0.6,
      roughness: 0.3,
      metalness: 0.8,
      wireframe: false,
    });

    this.rotorMaterial = new THREE.MeshBasicMaterial({
      color: 0xfef08a, // Amber 200
      transparent: true,
      opacity: 0.7,
    });

    this.uncertainMaterial = new THREE.MeshBasicMaterial({
      color: 0xf97316, // Orange 500
      wireframe: true,
      transparent: true,
      opacity: 0.6,
    });

    this.incidentMaterial = new THREE.MeshStandardMaterial({
      color: 0xef4444, // Red 500
      emissive: 0xb91c1c,
      emissiveIntensity: 0.5,
    });

    this.dropMaterial = new THREE.MeshStandardMaterial({
      color: 0x06b6d4, // Cyan 500
      emissive: 0x0891b2,
      emissiveIntensity: 0.5,
    });

    this.scene.add(this.group);

    // Subscribe to replay engine updates
    this.unsubscribe = this.replayEngine.subscribe((state) => {
      this.syncReplayState(state);
    });
  }

  /**
   * Synchronize visual representation with current replay state
   */
  public syncReplayState(state: ReplayPlaybackState): void {
    if (!state.isReplayActive) {
      this.group.visible = false;
      return;
    }

    this.group.visible = true;

    // 1. Synchronize Historical Drones
    const activeDroneIds = new Set<string>();

    state.historicalDronePositions.forEach((sample, droneId) => {
      activeDroneIds.add(droneId);
      let droneNode = this.droneMeshes.get(droneId);

      if (!droneNode) {
        droneNode = this.createHistoricalDroneMesh(droneId);
        this.droneMeshes.set(droneId, droneNode);
        this.group.add(droneNode);
      }

      droneNode.visible = true;
      droneNode.position.set(sample.position3D.x, sample.position3D.y, sample.position3D.z);

      // Handle spatial uncertainty visual
      const uncertaintySphere = droneNode.getObjectByName('uncertainty_sphere');
      if (uncertaintySphere) {
        uncertaintySphere.visible = !!sample.isPositionUncertain;
      }
    });

    // Hide drones not present at this point in time
    this.droneMeshes.forEach((mesh, droneId) => {
      if (!activeDroneIds.has(droneId)) {
        mesh.visible = false;
      }
    });

    // 2. Synchronize Historical Incident Marker
    this.updateIncidentMarker(state);

    // 3. Synchronize Historical Flotation Drop Marker
    this.updateFlotationDropMarker(state);
  }

  private createHistoricalDroneMesh(droneId: string): THREE.Group {
    const droneGroup = new THREE.Group();
    droneGroup.name = `historical_drone_${droneId}`;

    // Central chassis
    const bodyGeo = new THREE.BoxGeometry(1.6, 0.4, 1.6);
    const bodyMesh = new THREE.Mesh(bodyGeo, this.historicalDroneMaterial);
    droneGroup.add(bodyMesh);

    // 4 Quad arms
    const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.2);
    const arm1 = new THREE.Mesh(armGeo, this.historicalDroneMaterial);
    arm1.rotation.z = Math.PI / 2;
    arm1.rotation.y = Math.PI / 4;
    const arm2 = new THREE.Mesh(armGeo, this.historicalDroneMaterial);
    arm2.rotation.z = Math.PI / 2;
    arm2.rotation.y = -Math.PI / 4;
    droneGroup.add(arm1);
    droneGroup.add(arm2);

    // 4 Rotors
    const rotorGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.04, 16);
    const rotorPositions = [
      [0.8, 0.3, 0.8],
      [-0.8, 0.3, 0.8],
      [0.8, 0.3, -0.8],
      [-0.8, 0.3, -0.8],
    ];
    rotorPositions.forEach((pos) => {
      const rotor = new THREE.Mesh(rotorGeo, this.rotorMaterial);
      rotor.position.set(pos[0], pos[1], pos[2]);
      droneGroup.add(rotor);
    });

    // Vertical surface drop-line
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, -25, 0),
    ]);
    const lineMat = new THREE.LineDashedMaterial({
      color: 0xf59e0b,
      dashSize: 1,
      gapSize: 0.5,
      transparent: true,
      opacity: 0.5,
    });
    const dropLine = new THREE.Line(lineGeo, lineMat);
    dropLine.computeLineDistances();
    droneGroup.add(dropLine);

    // Spatial Uncertainty Ghost Sphere (visible only when telemetry gap occurs)
    const sphereGeo = new THREE.SphereGeometry(3.0, 12, 12);
    const sphereMesh = new THREE.Mesh(sphereGeo, this.uncertainMaterial);
    sphereMesh.name = 'uncertainty_sphere';
    sphereMesh.visible = false;
    droneGroup.add(sphereMesh);

    return droneGroup;
  }

  private updateIncidentMarker(state: ReplayPlaybackState): void {
    // Clear previous
    while (this.incidentMarkerGroup.children.length > 0) {
      const child = this.incidentMarkerGroup.children[0];
      this.incidentMarkerGroup.remove(child);
    }

    // Find if an incident is active in the session
    const incidentEvent = state.activeEvents.find(
      (e) => e.eventType === 'INCIDENT_DETECTED' && e.position3D
    );

    if (incidentEvent && incidentEvent.position3D) {
      const marker = new THREE.Group();
      marker.position.set(
        incidentEvent.position3D.x,
        incidentEvent.position3D.y,
        incidentEvent.position3D.z
      );

      // Warning diamond
      const diamondGeo = new THREE.OctahedronGeometry(1.5, 0);
      const diamondMesh = new THREE.Mesh(diamondGeo, this.incidentMaterial);
      diamondMesh.position.y = 2.0;
      marker.add(diamondMesh);

      // Surface ring
      const ringGeo = new THREE.RingGeometry(2.0, 2.5, 24);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xef4444,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.y = 0.2;
      marker.add(ringMesh);

      this.incidentMarkerGroup.add(marker);
    }
  }

  private updateFlotationDropMarker(state: ReplayPlaybackState): void {
    while (this.dropMarkerGroup.children.length > 0) {
      const child = this.dropMarkerGroup.children[0];
      this.dropMarkerGroup.remove(child);
    }

    const dropEvent = state.activeEvents.find(
      (e) => e.eventType === 'FLOTATION_DROPPED' && e.position3D
    );

    if (dropEvent && dropEvent.position3D) {
      const ringGroup = new THREE.Group();
      ringGroup.position.set(
        dropEvent.position3D.x,
        dropEvent.position3D.y,
        dropEvent.position3D.z
      );

      // Torus ring
      const torusGeo = new THREE.TorusGeometry(1.2, 0.3, 12, 24);
      torusGeo.rotateX(Math.PI / 2);
      const torusMesh = new THREE.Mesh(torusGeo, this.dropMaterial);
      ringGroup.add(torusMesh);

      this.dropMarkerGroup.add(ringGroup);
    }
  }

  /**
   * Called on every 60 FPS animation frame in BeachScene3D
   */
  public update(deltaSec: number): void {
    if (!this.group.visible) return;

    // Subtle rotor rotation for all active historical drones
    const rotSpeed = deltaSec * 15;
    this.droneMeshes.forEach((mesh) => {
      if (mesh.visible) {
        mesh.children.forEach((child) => {
          if (child instanceof THREE.Mesh && child.geometry instanceof THREE.CylinderGeometry) {
            child.rotation.y += rotSpeed;
          }
        });
      }
    });

    // Spin incident diamond
    if (this.incidentMarkerGroup.children.length > 0) {
      this.incidentMarkerGroup.children[0].rotation.y += deltaSec * 1.5;
    }
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.scene.remove(this.group);
  }
}

