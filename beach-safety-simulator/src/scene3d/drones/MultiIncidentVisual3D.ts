/**
 * MultiIncidentVisual3D.ts
 * 
 * TIDES Drone Phase 11: 3D Multi-Incident & Drone Assignment Visualizer
 * 
 * Renders in the Three.js digital twin:
 * - Active incident beacon pillars and water-surface rings color-coded by severity
 * - Unassigned incident pulsing alert halos (awaiting resource in queue)
 * - Dynamic 3D assignment vector lines connecting assigned drones to target coordinates
 * - Multi-asset synergy markers indicating Lifeguard (LG-01) and Boat (RB-01) coordination
 */

import * as THREE from 'three';
import { MultiDroneCoordinationEngine } from '../../drones/coordination/MultiDroneCoordinationEngine';
import { DroneRegistry } from '../../drones/foundation/DroneRegistry';
import { CoordinationIncident } from '../../drones/coordination/droneCoordination.types';
import { IncidentSeverity } from '../../models/Incident';

export class MultiIncidentVisual3D {
  public group: THREE.Group;
  private incidentMeshes: Map<string, THREE.Group> = new Map();
  private vectorLines: Map<string, THREE.Line> = new Map();

  private coordinationEngine: MultiDroneCoordinationEngine;
  private droneRegistry: DroneRegistry;
  private isVisible: boolean = true;

  constructor(
    coordinationEngine: MultiDroneCoordinationEngine = MultiDroneCoordinationEngine.getInstance(),
    droneRegistry: DroneRegistry = DroneRegistry.getInstance()
  ) {
    this.group = new THREE.Group();
    this.group.name = 'MultiIncidentCoordinationVisual3D';
    this.coordinationEngine = coordinationEngine;
    this.droneRegistry = droneRegistry;
  }

  public setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.group.visible = visible;
  }

  public getVisible(): boolean {
    return this.isVisible;
  }

  public update(delta: number, clockMs: number = performance.now()): void {
    if (!this.isVisible) return;

    const activeIncidents = this.coordinationEngine.getActiveQueue();
    const activeIncidentIds = new Set<string>();

    for (const inc of activeIncidents) {
      activeIncidentIds.add(inc.incidentId);

      // 1. Update or create incident ground beacon
      let meshGroup = this.incidentMeshes.get(inc.incidentId);
      if (!meshGroup) {
        meshGroup = this.createIncidentBeacon(inc);
        this.incidentMeshes.set(inc.incidentId, meshGroup);
        this.group.add(meshGroup);
      }

      meshGroup.position.set(inc.position3D.x, 0.2, inc.position3D.z);

      // Pulse unassigned incidents
      const pulse = 1.0 + Math.sin(clockMs * 0.005) * 0.15;
      meshGroup.scale.set(pulse, 1, pulse);

      // 2. Update or create incident-to-drone vector line
      this.updateAssignmentVector(inc);
    }

    // Clean up removed or resolved incidents
    for (const [id, meshGroup] of this.incidentMeshes.entries()) {
      if (!activeIncidentIds.has(id)) {
        this.group.remove(meshGroup);
        this.disposeGroup(meshGroup);
        this.incidentMeshes.delete(id);

        const line = this.vectorLines.get(id);
        if (line) {
          this.group.remove(line);
          line.geometry.dispose();
          if (Array.isArray(line.material)) line.material.forEach((m) => m.dispose());
          else line.material.dispose();
          this.vectorLines.delete(id);
        }
      }
    }
  }

  private createIncidentBeacon(incident: CoordinationIncident): THREE.Group {
    const group = new THREE.Group();
    group.name = `Beacon-${incident.incidentId}`;

    const color = this.getSeverityColor(incident.severity);

    // 1. Concentric Water Surface Ring
    const ringGeom = new THREE.RingGeometry(1.8, 2.3, 32);
    ringGeom.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
    });
    const ringMesh = new THREE.Mesh(ringGeom, ringMat);
    group.add(ringMesh);

    // 2. Vertical Light Pillar (Beacon)
    const pillarGeom = new THREE.CylinderGeometry(0.15, 0.5, 16, 16);
    pillarGeom.translate(0, 8, 0); // Position base on water surface
    const pillarMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.35,
    });
    const pillarMesh = new THREE.Mesh(pillarGeom, pillarMat);
    group.add(pillarMesh);

    // 3. Top Strobe Marker
    const strobeGeom = new THREE.SphereGeometry(0.4, 16, 16);
    const strobeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const strobeMesh = new THREE.Mesh(strobeGeom, strobeMat);
    strobeMesh.position.set(0, 16.2, 0);
    group.add(strobeMesh);

    return group;
  }

  private updateAssignmentVector(incident: CoordinationIncident): void {
    if (!incident.assignedDroneId) {
      // Remove line if unassigned
      const existingLine = this.vectorLines.get(incident.incidentId);
      if (existingLine) {
        this.group.remove(existingLine);
        existingLine.geometry.dispose();
        if (Array.isArray(existingLine.material)) existingLine.material.forEach((m) => m.dispose());
        else existingLine.material.dispose();
        this.vectorLines.delete(incident.incidentId);
      }
      return;
    }

    const drone = this.droneRegistry.getDrone(incident.assignedDroneId);
    if (!drone) return;

    let line = this.vectorLines.get(incident.incidentId);

    const points = [
      new THREE.Vector3(drone.position3D.x, drone.position3D.y, drone.position3D.z),
      new THREE.Vector3(incident.position3D.x, 0.5, incident.position3D.z),
    ];

    if (!line) {
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const color = this.getSeverityColor(incident.severity);
      const mat = new THREE.LineDashedMaterial({
        color,
        dashSize: 1.5,
        gapSize: 0.8,
        transparent: true,
        opacity: 0.85,
      });
      line = new THREE.Line(geom, mat);
      line.computeLineDistances();
      this.vectorLines.set(incident.incidentId, line);
      this.group.add(line);
    } else {
      line.geometry.setFromPoints(points);
      line.computeLineDistances();
    }
  }

  private getSeverityColor(sev: IncidentSeverity): number {
    switch (sev) {
      case 'CRITICAL':
        return 0xff1744; // High-visibility red
      case 'HIGH':
        return 0xff9100; // Warning amber
      case 'MEDIUM':
        return 0xffea00; // Caution yellow
      case 'LOW':
      default:
        return 0x00e5ff; // Informational cyan
    }
  }

  private disposeGroup(group: THREE.Group): void {
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material?.dispose();
      }
    });
  }

  public dispose(): void {
    for (const mesh of this.incidentMeshes.values()) {
      this.group.remove(mesh);
      this.disposeGroup(mesh);
    }
    this.incidentMeshes.clear();

    for (const line of this.vectorLines.values()) {
      this.group.remove(line);
      line.geometry.dispose();
      if (Array.isArray(line.material)) line.material.forEach((m) => m.dispose());
      else line.material.dispose();
    }
    this.vectorLines.clear();
  }
}

