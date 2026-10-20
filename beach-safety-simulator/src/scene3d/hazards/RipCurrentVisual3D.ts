import * as THREE from 'three';
import { BeachTerrain } from '../BeachTerrain';
import { RipHazardZone3D } from './rip3d.types';

/**
 * RipCurrentVisual3D.ts
 * 
 * High-fidelity 3D visualization of an offshore rip current:
 * - Natural trench bathymetry discoloration (turbid sediment plume)
 * - Lateral feeder streamlines converging from left and right along the surf
 * - High-speed offshore rip neck jet with animated foam tracers
 * - Dynamically modulated by simulated flow velocity
 * - Visual warning perimeter marking the active hazard boundary
 */
export class RipCurrentVisual3D {
  public readonly group: THREE.Group;

  private plumeMesh: THREE.Mesh;
  private particlePoints: THREE.Points;
  private particlePositions: Float32Array;
  private particleSpeeds: Float32Array;
  private particleCount: number = 160;

  private feederLinesGroup: THREE.Group;
  private boundaryMesh: THREE.LineSegments;

  private currentZone: RipHazardZone3D;
  private flowClock: number = 0;

  constructor() {
    this.group = new THREE.Group();

    // Default zone: X=12 (centered on x=560 in 2D), width=22m, extending seaward
    const shoreZ = BeachTerrain.getShorelineZ(12);
    this.currentZone = {
      id: 'HAZ-RIP-3D',
      centerX: 12,
      centerZ: shoreZ - 26,
      width: 22,
      length: 52,
      shoreZ,
      flowSpeedMps: 1.9,
      active: true,
      severity: 'CRITICAL',
    };

    // 1. Sediment Trench Plume (Discolored ocean water)
    const plumeGeo = new THREE.PlaneGeometry(this.currentZone.width + 6, this.currentZone.length, 32, 32);
    plumeGeo.rotateX(-Math.PI / 2);
    plumeGeo.translate(this.currentZone.centerX, 0.05, this.currentZone.centerZ);

    const plumeMat = new THREE.MeshStandardMaterial({
      color: 0x064e3b, // Darker turbid emerald-teal trench water
      roughness: 0.25,
      metalness: 0.1,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    });

    this.plumeMesh = new THREE.Mesh(plumeGeo, plumeMat);
    this.group.add(this.plumeMesh);

    // 2. Animated Flow Particles (Tracer foam and sand bubbles)
    const pGeo = new THREE.BufferGeometry();
    this.particlePositions = new Float32Array(this.particleCount * 3);
    this.particleSpeeds = new Float32Array(this.particleCount);

    for (let i = 0; i < this.particleCount; i++) {
      this.resetParticle(i, true);
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));

    const pMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.45,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.particlePoints = new THREE.Points(pGeo, pMat);
    this.group.add(this.particlePoints);

    // 3. Lateral Feeder Streamline Channels (Left & Right)
    this.feederLinesGroup = this.createFeederStreamlines();
    this.group.add(this.feederLinesGroup);

    // 4. Hazard Boundary Perimeter (Dashed line)
    this.boundaryMesh = this.createBoundaryPerimeter();
    this.group.add(this.boundaryMesh);
  }

  private resetParticle(i: number, randomStart: boolean = false): void {
    const halfW = this.currentZone.width * 0.45;
    const px = this.currentZone.centerX + (Math.random() - 0.5) * halfW * 2;
    // Start near shoreline swash and travel seaward (-Z)
    const startZ = this.currentZone.shoreZ - 1.0;
    const endZ = this.currentZone.shoreZ - this.currentZone.length;

    const pz = randomStart
      ? startZ - Math.random() * this.currentZone.length
      : startZ;

    this.particlePositions[i * 3] = px;
    this.particlePositions[i * 3 + 1] = 0.08 + Math.random() * 0.04;
    this.particlePositions[i * 3 + 2] = pz;

    this.particleSpeeds[i] = (0.7 + Math.random() * 0.6) * this.currentZone.flowSpeedMps;
  }

  private createFeederStreamlines(): THREE.Group {
    const g = new THREE.Group();
    const mat = new THREE.LineBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.6,
      linewidth: 2,
    });

    const shoreZ = this.currentZone.shoreZ;
    const cX = this.currentZone.centerX;

    // Left feeder arrows converging towards cX
    [-24, -16, -8].forEach((offset) => {
      const pts = [
        new THREE.Vector3(cX + offset, 0.12, shoreZ - 2),
        new THREE.Vector3(cX + offset + 4, 0.12, shoreZ - 3),
        new THREE.Vector3(cX + offset + 7, 0.12, shoreZ - 5),
      ];
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      g.add(new THREE.Line(geom, mat));
    });

    // Right feeder arrows converging towards cX
    [24, 16, 8].forEach((offset) => {
      const pts = [
        new THREE.Vector3(cX + offset, 0.12, shoreZ - 2),
        new THREE.Vector3(cX + offset - 4, 0.12, shoreZ - 3),
        new THREE.Vector3(cX + offset - 7, 0.12, shoreZ - 5),
      ];
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      g.add(new THREE.Line(geom, mat));
    });

    return g;
  }

  private createBoundaryPerimeter(): THREE.LineSegments {
    const halfW = this.currentZone.width / 2;
    const cX = this.currentZone.centerX;
    const nearZ = this.currentZone.shoreZ;
    const farZ = this.currentZone.shoreZ - this.currentZone.length;

    const pts = [
      // Top near-shore
      new THREE.Vector3(cX - halfW, 0.1, nearZ),
      new THREE.Vector3(cX + halfW, 0.1, nearZ),
      // Right edge seaward
      new THREE.Vector3(cX + halfW, 0.1, nearZ),
      new THREE.Vector3(cX + halfW, 0.1, farZ),
      // Seaward terminus
      new THREE.Vector3(cX + halfW, 0.1, farZ),
      new THREE.Vector3(cX - halfW, 0.1, farZ),
      // Left edge shoreward
      new THREE.Vector3(cX - halfW, 0.1, farZ),
      new THREE.Vector3(cX - halfW, 0.1, nearZ),
    ];

    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineDashedMaterial({
      color: 0xef4444,
      dashSize: 1.5,
      gapSize: 0.8,
      transparent: true,
      opacity: 0.55,
    });

    const lines = new THREE.LineSegments(geom, mat);
    lines.computeLineDistances();
    return lines;
  }

  /**
   * Updates particle positions and flow animation
   */
  public update(delta: number, active: boolean, flowSpeed: number = 1.9): void {
    this.currentZone.active = active;
    this.currentZone.flowSpeedMps = flowSpeed;

    this.group.visible = active;
    if (!active) return;

    this.flowClock += delta;

    // Animate offshore rip particles
    const pos = this.particlePositions;
    const count = this.particleCount;
    const terminusZ = this.currentZone.shoreZ - this.currentZone.length;

    for (let i = 0; i < count; i++) {
      const speed = this.particleSpeeds[i] * 5.5; // Visual velocity scaling
      // Move seaward (-Z)
      pos[i * 3 + 2] -= delta * speed;

      // Reset when particle reaches deep ocean terminus
      if (pos[i * 3 + 2] < terminusZ) {
        this.resetParticle(i, false);
      }
    }

    this.particlePoints.geometry.attributes.position.needsUpdate = true;

    // Pulse plume opacity slightly with wave action
    const pulse = 0.35 + 0.1 * Math.sin(this.flowClock * 2.0);
    (this.plumeMesh.material as THREE.MeshStandardMaterial).opacity = pulse;
  }

  public getZone(): RipHazardZone3D {
    return this.currentZone;
  }

  public dispose(): void {
    this.plumeMesh.geometry.dispose();
    (this.plumeMesh.material as THREE.Material).dispose();
    this.particlePoints.geometry.dispose();
    (this.particlePoints.material as THREE.Material).dispose();
    this.boundaryMesh.geometry.dispose();
    (this.boundaryMesh.material as THREE.Material).dispose();
  }
}

