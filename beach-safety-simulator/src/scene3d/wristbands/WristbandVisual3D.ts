/**
 * WristbandVisual3D.ts
 * 
 * TIDES Track B — Wristband Phase 2: 3D Wristband & Localized Warning Visualizer
 * 
 * Renders in the Three.js digital twin:
 * - Coastal Gateway base stations (towers with pulsing RF status beacons)
 * - Localized warning radius discs pulsating on the water surface around hazard centers
 * - Floating status rings above swimmers wearing wristbands (Green = Safe, Amber = Warning, Red = SOS)
 * - Dynamic RF transmission vectors between Gateways and targeted wristbands
 */

import * as THREE from 'three';
import { WristbandRegistry } from '../../wristbands/WristbandRegistry';
import { LocalizedWarningDistributionEngine } from '../../wristbands/LocalizedWarningDistributionEngine';
import { BeachTerrain } from '../BeachTerrain';
import { SwimmerFeelingControlManager } from '../../wristbands/feeling/SwimmerFeelingControlManager';

export class WristbandVisual3D {
  public group: THREE.Group;
  private isVisible: boolean = true;

  private registry: WristbandRegistry;
  private warningEngine: LocalizedWarningDistributionEngine;

  private gatewayMeshes: Map<string, THREE.Group> = new Map();
  private warningDiscs: Map<string, THREE.Mesh> = new Map();
  private swimmerHalos: Map<string, THREE.Group> = new Map();
  private transmissionLines: Map<string, THREE.Line> = new Map();

  constructor(
    registry: WristbandRegistry = WristbandRegistry.getInstance(),
    warningEngine: LocalizedWarningDistributionEngine = LocalizedWarningDistributionEngine.getInstance()
  ) {
    this.group = new THREE.Group();
    this.group.name = 'WristbandSafetyVisual3D';
    this.registry = registry;
    this.warningEngine = warningEngine;

    this.buildGatewayTowers();
  }

  public setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.group.visible = visible;
  }

  public getVisible(): boolean {
    return this.isVisible;
  }

  private canvasTo3D(x: number, y: number): THREE.Vector3 {
    const normX = Math.max(0, Math.min(1, x / 1000));
    const x3d = (normX - 0.5) * 200;
    const shoreZ = BeachTerrain.getShorelineZ(x3d);
    const shorelineY = 280;
    let z3d = shoreZ;
    let y3d = 0.3;

    if (y < shorelineY) {
      const sandFrac = (shorelineY - y) / Math.max(1, shorelineY);
      z3d = shoreZ + sandFrac * 62;
      y3d = BeachTerrain.getElevation(x3d, z3d);
    } else {
      const waterFrac = (y - shorelineY) / Math.max(1, 600 - shorelineY);
      z3d = shoreZ - waterFrac * 70;
      y3d = 0.25;
    }

    return new THREE.Vector3(x3d, y3d, z3d);
  }

  private buildGatewayTowers(): void {
    const gateways = this.registry.getGateways();

    for (const gw of gateways) {
      const towerGroup = new THREE.Group();
      towerGroup.name = `GatewayTower-${gw.id}`;

      const pos3D = this.canvasTo3D(gw.position.x, gw.position.y);
      pos3D.y = 1.0; // on land / sand elevation
      towerGroup.position.copy(pos3D);

      // 1. Antenna Mast (slender metallic cylinder)
      const mastGeom = new THREE.CylinderGeometry(0.2, 0.4, 7, 8);
      mastGeom.translate(0, 3.5, 0);
      const mastMat = new THREE.MeshStandardMaterial({
        color: 0x475569,
        metalness: 0.8,
        roughness: 0.3,
      });
      const mastMesh = new THREE.Mesh(mastGeom, mastMat);
      towerGroup.add(mastMesh);

      // 2. Gateway Beacon Sphere at top of antenna
      const beaconGeom = new THREE.SphereGeometry(0.5, 16, 16);
      beaconGeom.translate(0, 7.2, 0);
      const beaconMat = new THREE.MeshBasicMaterial({
        color: 0x06B6D4, // Cyan
        wireframe: false,
      });
      const beaconMesh = new THREE.Mesh(beaconGeom, beaconMat);
      beaconMesh.name = 'BeaconSphere';
      towerGroup.add(beaconMesh);

      // 3. Ground ring base
      const baseGeom = new THREE.RingGeometry(0.8, 1.2, 16);
      baseGeom.rotateX(-Math.PI / 2);
      const baseMat = new THREE.MeshBasicMaterial({
        color: 0x0EA5E9,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
      });
      const baseMesh = new THREE.Mesh(baseGeom, baseMat);
      towerGroup.add(baseMesh);

      this.gatewayMeshes.set(gw.id, towerGroup);
      this.group.add(towerGroup);
    }
  }

  public update(delta: number, clockMs: number = performance.now()): void {
    if (!this.isVisible) return;

    // 1. Animate Gateway Tower status beacons
    const gateways = this.registry.getGateways();
    for (const gw of gateways) {
      const tower = this.gatewayMeshes.get(gw.id);
      if (tower) {
        const beacon = tower.getObjectByName('BeaconSphere') as THREE.Mesh;
        if (beacon && beacon.material instanceof THREE.MeshBasicMaterial) {
          const color = gw.status === 'ONLINE' ? 0x06B6D4 : gw.status === 'DEGRADED' ? 0xF59E0B : 0xEF4444;
          beacon.material.color.setHex(color);
          const pulse = 1.0 + Math.sin(clockMs * 0.006 + gw.position.x) * 0.2;
          beacon.scale.set(pulse, pulse, pulse);
        }
      }
    }

    // 2. Update Swimmer Wristband Status Halos
    const wristbands = this.registry.getWristbands();
    const activeWbIds = new Set<string>();

    for (const wb of wristbands) {
      if (!wb.pairedVisitorId || !wb.telemetry.hasLocation || !wb.telemetry.simPosition) {
        continue;
      }

      activeWbIds.add(wb.id);
      const swimmerPos3D = this.canvasTo3D(wb.telemetry.simPosition.x, wb.telemetry.simPosition.y);
      swimmerPos3D.y = 2.2; // Above swimmer's head

      let halo = this.swimmerHalos.get(wb.id);
      if (!halo) {
        halo = this.createSwimmerHalo(wb);
        this.swimmerHalos.set(wb.id, halo);
        this.group.add(halo);
      }

      halo.position.copy(swimmerPos3D);

      // Color and pulsation by device status & feeling state (Orange for Suffocating / Danger)
      const ringMesh = halo.getObjectByName('HaloRing') as THREE.Mesh;
      if (ringMesh && ringMesh.material instanceof THREE.MeshBasicMaterial) {
        const feeling = SwimmerFeelingControlManager.getInstance().getSwimmerFeeling(wb.id);
        const isOrangeDistress = wb.isSosActive || feeling.feeling === 'UNSAFE' || feeling.feeling === 'CRITICAL_PANIC' || feeling.isSuffering;

        if (isOrangeDistress) {
          ringMesh.material.color.setHex(0xF97316); // Vivid Safety Orange!
          const orangePulse = 1.0 + Math.sin(clockMs * 0.012) * 0.45;
          ringMesh.scale.set(orangePulse, orangePulse, orangePulse);
        } else if (wb.lastWarningReceived && wb.lastWarningReceived.status !== 'ACKNOWLEDGED') {
          ringMesh.material.color.setHex(0xF59E0B); // Amber
          const warnPulse = 1.0 + Math.sin(clockMs * 0.008) * 0.2;
          ringMesh.scale.set(warnPulse, warnPulse, warnPulse);
        } else {
          ringMesh.material.color.setHex(0x10B981); // Emerald Green
          ringMesh.scale.set(1, 1, 1);
        }
      }
    }

    // Clean up inactive swimmer halos
    for (const [id, halo] of this.swimmerHalos.entries()) {
      if (!activeWbIds.has(id)) {
        this.group.remove(halo);
        this.swimmerHalos.delete(id);
      }
    }

    // 3. Render Localized Warning Discs on Water Surface
    const activeWarnings = this.warningEngine.getActiveWarnings();
    const activeWarningIds = new Set<string>();

    for (const warn of activeWarnings) {
      activeWarningIds.add(warn.warningId);

      if (!warn.hazardCoordinate) continue;

      let disc = this.warningDiscs.get(warn.warningId);
      if (!disc) {
        const radius3D = ((warn.warningRadiusMeters || 100) * 0.5);
        const discGeom = new THREE.RingGeometry(0.5, radius3D, 48);
        discGeom.rotateX(-Math.PI / 2);
        const color = warn.category === 'EMERGENCY' ? 0xEF4444 : warn.category === 'EVACUATE_ZONE' ? 0xF97316 : 0xF59E0B;
        const discMat = new THREE.MeshBasicMaterial({
          color,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.35,
        });
        disc = new THREE.Mesh(discGeom, discMat);
        this.warningDiscs.set(warn.warningId, disc);
        this.group.add(disc);
      }

      const discPos3D = this.canvasTo3D(warn.hazardCoordinate.x, warn.hazardCoordinate.y);
      discPos3D.y = 0.25;
      disc.position.copy(discPos3D);

      const pulseScale = 1.0 + Math.sin(clockMs * 0.004) * 0.08;
      disc.scale.set(pulseScale, 1, pulseScale);
    }

    // Clean up expired warning discs
    for (const [id, disc] of this.warningDiscs.entries()) {
      if (!activeWarningIds.has(id)) {
        this.group.remove(disc);
        disc.geometry.dispose();
        if (Array.isArray(disc.material)) disc.material.forEach((m) => m.dispose());
        else disc.material.dispose();
        this.warningDiscs.delete(id);
      }
    }
  }

  private createSwimmerHalo(wb: any): THREE.Group {
    const group = new THREE.Group();
    group.name = `Halo-${wb.id}`;
    group.userData = { type: 'WRISTBAND_HALO', wristbandId: wb.id, visitorId: wb.pairedVisitorId };

    // Halo floating ring
    const ringGeom = new THREE.RingGeometry(0.8, 1.1, 24);
    ringGeom.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x10B981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const ringMesh = new THREE.Mesh(ringGeom, ringMat);
    ringMesh.name = 'HaloRing';
    group.add(ringMesh);

    return group;
  }

  public dispose(): void {
    for (const [_, mesh] of this.gatewayMeshes.entries()) {
      this.group.remove(mesh);
    }
    for (const [_, disc] of this.warningDiscs.entries()) {
      this.group.remove(disc);
      disc.geometry.dispose();
    }
    for (const [_, halo] of this.swimmerHalos.entries()) {
      this.group.remove(halo);
    }
    this.gatewayMeshes.clear();
    this.warningDiscs.clear();
    this.swimmerHalos.clear();
    this.transmissionLines.clear();
  }
}

