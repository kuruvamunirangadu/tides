/**
 * CoastalCoverageVisual3D.ts
 * 
 * TIDES Drone Phase 8: 3D Coastal Surveillance Zone & Coverage Visualizer
 * 
 * Renders spatial boundaries, dynamic status shading, and overhead labels for
 * configured coastal surveillance sectors in the Rushikonda Beach Digital Twin.
 * 
 * Strict Architectural Guarantees:
 * - Dynamic color shading driven strictly by observation-backed coverage status.
 * - Does not displace or modify existing terrain, depth contours, or hazard visuals.
 * - Clean Three.js memory management with full resource disposal.
 */

import * as THREE from 'three';
import { CoastalZoneRegistry } from '../../drones/coverage/CoastalZoneRegistry';
import { DroneCoverageTracker } from '../../drones/coverage/DroneCoverageTracker';
import {
  CoastalSurveillanceZone,
  CoastalCoverageStatus,
} from '../../drones/coverage/droneCoverage.types';

interface ZoneVisualObject {
  zoneId: string;
  line: THREE.LineSegments;
  plane: THREE.Mesh;
  planeMaterial: THREE.MeshBasicMaterial;
  lineMaterial: THREE.LineBasicMaterial;
  labelSprite: THREE.Sprite;
  labelTexture: THREE.CanvasTexture;
  labelCanvas: HTMLCanvasElement;
  lastKnownStatus: CoastalCoverageStatus;
}

export class CoastalCoverageVisual3D {
  public group: THREE.Group;
  private zoneRegistry: CoastalZoneRegistry;
  private coverageTracker: DroneCoverageTracker;
  private zoneVisuals: Map<string, ZoneVisualObject> = new Map();
  private isVisible: boolean = true;
  private animationClock: number = 0;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'CoastalCoverageVisual3D';
    this.zoneRegistry = CoastalZoneRegistry.getInstance();
    this.coverageTracker = DroneCoverageTracker.getInstance();
    this.buildZoneVisuals();
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

  /**
   * Status-to-Color palette matching coastal safety operational standards
   */
  public static getStatusColorHex(status: CoastalCoverageStatus): { num: number; hex: string } {
    switch (status) {
      case 'COVERED':
        return { num: 0x10b981, hex: '#10b981' }; // Emerald Green
      case 'OVERLAPPING_COVERAGE':
        return { num: 0x06b6d4, hex: '#06b6d4' }; // Bright Cyan
      case 'PARTIALLY_COVERED':
        return { num: 0x38bdf8, hex: '#38bdf8' }; // Sky Blue
      case 'STALE_COVERAGE':
        return { num: 0xf59e0b, hex: '#f59e0b' }; // Amber Warning
      case 'UNCOVERED':
        return { num: 0xf43f5e, hex: '#f43f5e' }; // Rose Pink
      case 'COVERAGE_DEGRADED':
        return { num: 0xdc2626, hex: '#dc2626' }; // Red Degraded
      case 'UNASSIGNED':
      default:
        return { num: 0x64748b, hex: '#64748b' }; // Slate Gray
    }
  }

  /**
   * Builds 3D visual representations for all registered coastal zones
   */
  private buildZoneVisuals(): void {
    const zones = this.zoneRegistry.getAllZones();

    for (const zone of zones) {
      const { xMin, xMax, zMin, zMax } = zone.boundary3D;
      const width = xMax - xMin;
      const depth = zMax - zMin;
      const centerX = (xMin + xMax) / 2;
      const centerZ = (zMin + zMax) / 2;
      const baseElevation = 0.45; // Just above sea surface level

      const colorData = CoastalCoverageVisual3D.getStatusColorHex(zone.coverageStatus);

      // 1. Perimeter Wireframe Box
      // Corner coordinates
      const vertices = new Float32Array([
        xMin, baseElevation, zMin,  xMax, baseElevation, zMin,
        xMax, baseElevation, zMin,  xMax, baseElevation, zMax,
        xMax, baseElevation, zMax,  xMin, baseElevation, zMax,
        xMin, baseElevation, zMax,  xMin, baseElevation, zMin,
      ]);
      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      const lineMaterial = new THREE.LineBasicMaterial({
        color: colorData.num,
        linewidth: 2,
        transparent: true,
        opacity: 0.85,
      });
      const line = new THREE.LineSegments(lineGeo, lineMaterial);
      this.group.add(line);

      // 2. Translucent Surface Shading Plane
      const planeGeo = new THREE.PlaneGeometry(width, depth);
      planeGeo.rotateX(-Math.PI / 2);
      const planeMaterial = new THREE.MeshBasicMaterial({
        color: colorData.num,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const plane = new THREE.Mesh(planeGeo, planeMaterial);
      plane.position.set(centerX, baseElevation - 0.05, centerZ);
      this.group.add(plane);

      // 3. Overhead Canvas Billboard Label
      const { sprite, texture, canvas } = this.createZoneBadge(zone, colorData.hex);
      sprite.position.set(centerX, baseElevation + 4.5, centerZ);
      this.group.add(sprite);

      this.zoneVisuals.set(zone.zoneId, {
        zoneId: zone.zoneId,
        line,
        plane,
        planeMaterial,
        lineMaterial,
        labelSprite: sprite,
        labelTexture: texture,
        labelCanvas: canvas,
        lastKnownStatus: zone.coverageStatus,
      });
    }
  }

  /**
   * Generates a 2D billboard sprite texture with zone metadata
   */
  private createZoneBadge(
    zone: CoastalSurveillanceZone,
    colorHex: string
  ): { sprite: THREE.Sprite; texture: THREE.CanvasTexture; canvas: HTMLCanvasElement } {
    const canvas = document.createElement('canvas');
    canvas.width = 440;
    canvas.height = 140;
    const ctx = canvas.getContext('2d')!;

    this.renderBadgeContent(ctx, zone, colorHex);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;

    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(16, 5.1, 1.0);

    return { sprite, texture, canvas };
  }

  /**
   * Renders the text and badge graphics onto the canvas
   */
  private renderBadgeContent(
    ctx: CanvasRenderingContext2D,
    zone: CoastalSurveillanceZone,
    colorHex: string
  ): void {
    ctx.clearRect(0, 0, 440, 140);

    // Background pill
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)'; // slate-900 / 88%
    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(8, 8, 424, 124, 16);
    ctx.fill();
    ctx.stroke();

    // Priority marker pill (top-right)
    ctx.fillStyle = colorHex;
    ctx.beginPath();
    ctx.roundRect(300, 18, 116, 26, 8);
    ctx.fill();
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.fillStyle = '#020617';
    ctx.textAlign = 'center';
    ctx.fillText(`${zone.priority}`, 358, 36);

    // Zone ID & Name
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.fillText(zone.name, 22, 40);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px JetBrains Mono, monospace';
    ctx.fillText(`${zone.zoneId}`, 22, 64);

    // Status Pill
    ctx.font = 'bold 14px JetBrains Mono, monospace';
    ctx.fillStyle = colorHex;
    const cleanStatus = zone.coverageStatus.replace(/_/g, ' ');
    ctx.fillText(`STATUS: ${cleanStatus}`, 22, 92);

    // Assigned Drone & Observations count
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '12px Inter, sans-serif';
    const assignedText = zone.assignedDroneIds.length > 0 ? zone.assignedDroneIds.join(', ') : 'None';
    ctx.fillText(`Patrol Drone: ${assignedText} | Obs: ${zone.totalValidObservationsCount}`, 22, 116);

    ctx.restore();
  }

  /**
   * Per-frame animation and synchronization with CoastalZoneRegistry & Tracker
   */
  public update(delta: number = 0.016): void {
    if (!this.isVisible) return;

    this.animationClock += delta;
    const pulseFactor = 0.16 + 0.06 * Math.sin(this.animationClock * 2.5);

    const zones = this.zoneRegistry.getAllZones();

    for (const zone of zones) {
      const visual = this.zoneVisuals.get(zone.zoneId);
      if (!visual) continue;

      const colorData = CoastalCoverageVisual3D.getStatusColorHex(zone.coverageStatus);

      // Status change detected: re-render canvas sprite & update colors
      if (visual.lastKnownStatus !== zone.coverageStatus) {
        visual.lastKnownStatus = zone.coverageStatus;
        visual.lineMaterial.color.setHex(colorData.num);
        visual.planeMaterial.color.setHex(colorData.num);

        const ctx = visual.labelCanvas.getContext('2d')!;
        this.renderBadgeContent(ctx, zone, colorData.hex);
        visual.labelTexture.needsUpdate = true;
      }

      // Pulsing opacity for attention-requiring states
      if (
        zone.coverageStatus === 'STALE_COVERAGE' ||
        zone.coverageStatus === 'COVERAGE_DEGRADED' ||
        zone.coverageStatus === 'OVERLAPPING_COVERAGE'
      ) {
        visual.planeMaterial.opacity = pulseFactor;
      } else {
        visual.planeMaterial.opacity = 0.16;
      }
    }
  }

  /**
   * Clean memory disposal of Three.js objects
   */
  public dispose(): void {
    for (const visual of this.zoneVisuals.values()) {
      visual.line.geometry.dispose();
      visual.lineMaterial.dispose();
      visual.plane.geometry.dispose();
      visual.planeMaterial.dispose();
      visual.labelTexture.dispose();
      (visual.labelSprite.material as THREE.SpriteMaterial).dispose();
      this.group.remove(visual.line);
      this.group.remove(visual.plane);
      this.group.remove(visual.labelSprite);
    }
    this.zoneVisuals.clear();
  }
}

