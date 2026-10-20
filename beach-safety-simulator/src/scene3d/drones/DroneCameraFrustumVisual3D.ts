/**
 * DroneCameraFrustumVisual3D.ts
 * 
 * TIDES Drone Phase 5: 3D Camera Field-of-View (FOV) Coverage Visualizer
 * 
 * Renders lightweight, non-obtrusive viewing cones and ground footprint boundaries
 * projecting from the drone camera gimbal down to the sea surface or beach terrain:
 * - Dynamically updates with drone altitude, heading, and gimbal pitch angle
 * - Distinct color-coding per camera sensor role (Optical Cyan, Thermal Purple, Rescue Amber)
 * - Configurable visibility toggle controlled by the operator HUD
 * - Full resource cleanup and memory disposal
 */

import * as THREE from 'three';
import { DroneCameraRegistry } from '../../drones/camera/DroneCameraRegistry';
import { DroneRegistry } from '../../drones/foundation/DroneRegistry';

export class DroneCameraFrustumVisual3D {
  public group: THREE.Group;
  private cameraRegistry: DroneCameraRegistry;
  private droneRegistry: DroneRegistry;

  private frustumMeshes: Map<string, { mesh: THREE.Mesh; lines: THREE.LineSegments }> = new Map();
  private isVisible: boolean = true;
  private selectedDroneId: string | null = null;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'DroneCameraFrustumVisual3D';
    this.cameraRegistry = DroneCameraRegistry.getInstance();
    this.droneRegistry = DroneRegistry.getInstance();
  }

  public getGroup(): THREE.Group {
    return this.group;
  }

  public setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.group.visible = visible;
  }

  public getVisible(): boolean {
    return this.isVisible;
  }

  public setSelectedDrone(droneId: string | null): void {
    this.selectedDroneId = droneId;
  }

  /**
   * Per-frame update synchronizing frustum geometry with live drone positions
   */
  public update(): void {
    if (!this.isVisible) return;

    const cameras = this.cameraRegistry.getAllCameras();
    const activeCameraIds = new Set<string>();

    for (const cam of cameras) {
      if (cam.status === 'STANDBY' || cam.status === 'DISCONNECTED') {
        // Hide dormant camera frustums
        const existing = this.frustumMeshes.get(cam.cameraId);
        if (existing) {
          existing.mesh.visible = false;
          existing.lines.visible = false;
        }
        continue;
      }

      activeCameraIds.add(cam.cameraId);
      const drone = this.droneRegistry.getDrone(cam.droneId);
      if (!drone) continue;

      const footprint = this.cameraRegistry.calculateCoverageFootprint(cam.droneId);
      if (!footprint.isCalculated || footprint.groundPolygonPoints.length < 4) continue;

      let frustumObj = this.frustumMeshes.get(cam.cameraId);
      if (!frustumObj) {
        frustumObj = this.createFrustumObject(cam.cameraId, cam.role);
        this.frustumMeshes.set(cam.cameraId, frustumObj);
        this.group.add(frustumObj.mesh);
        this.group.add(frustumObj.lines);
      }

      frustumObj.mesh.visible = true;
      frustumObj.lines.visible = true;

      // Highlight selected drone's camera FOV
      const isSelected = this.selectedDroneId === cam.droneId;
      const meshMat = frustumObj.mesh.material as THREE.MeshBasicMaterial;
      meshMat.opacity = isSelected ? 0.22 : 0.08;

      // Apex: Drone gimbal position
      const apex = new THREE.Vector3(drone.position3D.x, drone.position3D.y - 0.2, drone.position3D.z);
      const pts = footprint.groundPolygonPoints;

      // 4 Base corners on water/ground plane
      const p0 = new THREE.Vector3(pts[0].x, 0.15, pts[0].z);
      const p1 = new THREE.Vector3(pts[1].x, 0.15, pts[1].z);
      const p2 = new THREE.Vector3(pts[2].x, 0.15, pts[2].z);
      const p3 = new THREE.Vector3(pts[3].x, 0.15, pts[3].z);

      // Construct pyramid mesh faces (4 sides + ground base)
      const positions: number[] = [
        // Side 1: Apex -> P0 -> P1
        apex.x, apex.y, apex.z, p0.x, p0.y, p0.z, p1.x, p1.y, p1.z,
        // Side 2: Apex -> P1 -> P2
        apex.x, apex.y, apex.z, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z,
        // Side 3: Apex -> P2 -> P3
        apex.x, apex.y, apex.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z,
        // Side 4: Apex -> P3 -> P0
        apex.x, apex.y, apex.z, p3.x, p3.y, p3.z, p0.x, p0.y, p0.z,
        // Ground Quad (2 triangles)
        p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z,
        p0.x, p0.y, p0.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z,
      ];

      frustumObj.mesh.geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(positions, 3)
      );
      frustumObj.mesh.geometry.computeVertexNormals();

      // Wireframe outline edges
      const linePositions: number[] = [
        // Ray from apex to corners
        apex.x, apex.y, apex.z, p0.x, p0.y, p0.z,
        apex.x, apex.y, apex.z, p1.x, p1.y, p1.z,
        apex.x, apex.y, apex.z, p2.x, p2.y, p2.z,
        apex.x, apex.y, apex.z, p3.x, p3.y, p3.z,
        // Ground perimeter
        p0.x, p0.y, p0.z, p1.x, p1.y, p1.z,
        p1.x, p1.y, p1.z, p2.x, p2.y, p2.z,
        p2.x, p2.y, p2.z, p3.x, p3.y, p3.z,
        p3.x, p3.y, p3.z, p0.x, p0.y, p0.z,
      ];

      frustumObj.lines.geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(linePositions, 3)
      );
    }
  }

  private createFrustumObject(
    cameraId: string,
    role: string
  ): { mesh: THREE.Mesh; lines: THREE.LineSegments } {
    let colorHex = 0x06b6d4; // Default Cyan (Optical)
    if (role === 'THERMAL_IR' || role === 'MULTI_SPECTRUM') {
      colorHex = 0xa855f7; // Purple
    } else if (role === 'RESCUE_MONITORING') {
      colorHex = 0xf59e0b; // Amber
    }

    const meshGeo = new THREE.BufferGeometry();
    const meshMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(meshGeo, meshMat);
    mesh.name = `FrustumMesh_${cameraId}`;

    const lineGeo = new THREE.BufferGeometry();
    const lineMat = new THREE.LineBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.45,
    });
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    lines.name = `FrustumLines_${cameraId}`;

    return { mesh, lines };
  }

  public dispose(): void {
    this.frustumMeshes.forEach(({ mesh, lines }) => {
      this.group.remove(mesh);
      this.group.remove(lines);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      lines.geometry.dispose();
      (lines.material as THREE.Material).dispose();
    });
    this.frustumMeshes.clear();
  }
}
