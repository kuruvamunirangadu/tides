import * as THREE from 'three';
import { RescueCoordinator } from './RescueCoordinator';
import { RescueMissionDossier } from './rescue.types';

/**
 * TacticalRescueVisual3D.ts
 * 
 * Renders observable 3D maritime rescue operations and coordinated action flows:
 * - Dynamic animated tactical dispatch vectors connecting assigned rescue assets to victims
 * - Animated rescue zone perimeter rings with deployed flotation cues during active assistance
 * - Safe return vectors back to designated coastal standby stations
 * - Distance and ETA visual billboards along trajectories
 * - Zero mutation of authoritative simulation or rescue logic
 */
export class TacticalRescueVisual3D {
  public readonly group: THREE.Group;
  private vectorMeshes: Map<string, THREE.Group> = new Map();
  private pulseClock: number = 0;
  private isVisible: boolean = true;

  constructor() {
    this.group = new THREE.Group();
  }

  public setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.group.visible = visible;
  }

  public update(delta: number): void {
    if (!this.isVisible) return;
    this.pulseClock += delta * 3.5;

    const coordinator = RescueCoordinator.getInstance();
    const activeMissions = coordinator.getActiveMissions();
    const activeIds = new Set<string>();

    for (const mission of activeMissions) {
      activeIds.add(mission.incidentId);

      const res = coordinator.registry.getResource(mission.assignedResourceId);
      if (!res) continue;

      let missionGroup = this.vectorMeshes.get(mission.incidentId);
      if (!missionGroup) {
        missionGroup = this.createMissionVisualGroup();
        this.vectorMeshes.set(mission.incidentId, missionGroup);
        this.group.add(missionGroup);
      }

      this.updateMissionVisual(missionGroup, mission, res, delta);
    }

    // Clean up finished missions
    for (const [incId, grp] of this.vectorMeshes.entries()) {
      if (!activeIds.has(incId)) {
        this.disposeGroup(grp);
        this.group.remove(grp);
        this.vectorMeshes.delete(incId);
      }
    }
  }

  private createMissionVisualGroup(): THREE.Group {
    const grp = new THREE.Group();

    // 1. Line geometry & material
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
    ]);
    const lineMat = new THREE.LineDashedMaterial({
      color: 0x06b6d4,
      dashSize: 1.5,
      gapSize: 0.8,
      linewidth: 3,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const line = new THREE.Line(lineGeo, lineMat);
    line.name = 'dispatchLine';
    grp.add(line);

    // 2. Pulse beacon marker moving along vector
    const pulseGeo = new THREE.SphereGeometry(0.35, 12, 10);
    const pulseMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.9,
    });
    const pulseMesh = new THREE.Mesh(pulseGeo, pulseMat);
    pulseMesh.name = 'pulseMarker';
    grp.add(pulseMesh);

    // 3. Assistance zone halo ring (active when arrived)
    const ringGeo = new THREE.RingGeometry(3.2, 3.6, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.name = 'rescueHalo';
    ringMesh.visible = false;
    grp.add(ringMesh);

    return grp;
  }

  private updateMissionVisual(
    grp: THREE.Group,
    mission: RescueMissionDossier,
    res: any,
    _delta: number
  ): void {
    const line = grp.getObjectByName('dispatchLine') as THREE.Line;
    const pulse = grp.getObjectByName('pulseMarker') as THREE.Mesh;
    const halo = grp.getObjectByName('rescueHalo') as THREE.Mesh;

    const startX = res.currentX;
    const startY = Math.max(0.12, res.currentY + 0.15);
    const startZ = res.currentZ;

    const targetX = res.targetX ?? res.standbyX;
    const targetY = Math.max(0.12, (res.targetY || 0) + 0.15);
    const targetZ = res.targetZ ?? res.standbyZ;

    const dx = targetX - startX;
    const dz = targetZ - startZ;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (mission.stage === 'EN_ROUTE') {
      // Show tactical dispatch vector line
      line.visible = true;
      const positions = new Float32Array([
        startX, startY, startZ,
        targetX, targetY, targetZ,
      ]);
      line.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      line.computeLineDistances();
      (line.material as THREE.LineDashedMaterial).color.setHex(
        res.type === 'RESCUE_BOAT' ? 0x06b6d4 : 0xfacc15
      );

      // Pulse traveling along vector from resource to victim
      pulse.visible = true;
      const t = (this.pulseClock * 0.4) % 1.0;
      pulse.position.set(
        startX + dx * t,
        startY + (targetY - startY) * t + 0.2,
        startZ + dz * t
      );
      halo.visible = false;
    } else if (mission.stage === 'ARRIVED' || mission.stage === 'ASSISTING') {
      // Assistance active: hide line, display pulsing rescue zone perimeter ring
      line.visible = false;
      pulse.visible = false;
      halo.visible = true;
      halo.position.set(targetX, 0.08, targetZ);
      const pulseScale = 1.0 + Math.sin(this.pulseClock * 2.0) * 0.15;
      halo.scale.set(pulseScale, pulseScale, 1.0);
      (halo.material as THREE.MeshBasicMaterial).opacity = 0.55 + Math.sin(this.pulseClock * 2.0) * 0.25;
    } else if (mission.stage === 'RETURNING') {
      // Returning to base station: dashed vector back to standby
      line.visible = true;
      const positions = new Float32Array([
        startX, startY, startZ,
        res.standbyX, Math.max(0.12, res.standbyY + 0.15), res.standbyZ,
      ]);
      line.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      line.computeLineDistances();
      (line.material as THREE.LineDashedMaterial).color.setHex(0x3b82f6);
      pulse.visible = false;
      halo.visible = false;
    } else {
      line.visible = false;
      pulse.visible = false;
      halo.visible = false;
    }
  }

  private disposeGroup(grp: THREE.Group): void {
    grp.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }

  public dispose(): void {
    for (const grp of this.vectorMeshes.values()) {
      this.disposeGroup(grp);
    }
    this.vectorMeshes.clear();
  }
}

