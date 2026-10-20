import * as THREE from 'three';
import { Environment } from '../models/Environment';
import { BeachTerrain } from './BeachTerrain';

/**
 * OceanSurface.ts
 * 
 * Provides photorealistic, dynamic 3D ocean rendering:
 * - Multi-layered trochoidal wave displacement simulating physical ocean swells
 * - Depth-aware water color transition (turquoise shallows -> azure mid-sea -> navy deep ocean)
 * - Dynamic vertex normal calculation for glistening sun glint and specular reflections
 * - Animated shoreline surf & swash foam band that washes up onto the sand
 * - Reactive to simulation environment (wave height, wind speed, tide, night mode)
 */
export class OceanSurface {
  public mesh: THREE.Mesh;
  public foamMesh: THREE.Mesh;
  public group: THREE.Group;

  private geometry: THREE.PlaneGeometry;
  private material: THREE.MeshStandardMaterial;
  private foamGeometry: THREE.PlaneGeometry;
  private foamMaterial: THREE.MeshBasicMaterial;

  private basePositions: Float32Array;
  private foamBasePositions: Float32Array;
  private waveClock: number = 0;

  constructor() {
    this.group = new THREE.Group();

    // 1. Ocean Water Mesh
    const oceanWidth = 260;
    const oceanDepth = 150;
    const segX = 140;
    const segZ = 90;

    this.geometry = new THREE.PlaneGeometry(oceanWidth, oceanDepth, segX, segZ);
    this.geometry.rotateX(-Math.PI / 2);
    // Center ocean seaward: spans Z from -125 to +25
    this.geometry.translate(0, 0, -50);

    // Save base coordinates
    const pos = this.geometry.attributes.position;
    this.basePositions = new Float32Array(pos.array);

    // Vertex colors for depth transition (turquoise shallows -> deep navy ocean)
    const colors = new Float32Array(pos.count * 3);
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const shoreZ = BeachTerrain.getShorelineZ(v.x);
      const distFromShore = v.z - shoreZ; // Negative = into ocean

      let r = 0.04, g = 0.35, b = 0.55;

      if (distFromShore >= -8) {
        // Very shallow swash: crystalline turquoise
        r = 0.12; g = 0.72; b = 0.78;
      } else if (distFromShore >= -35) {
        // Nearshore breaker zone: vivid coastal azure
        const t = (distFromShore + 8) / -27;
        r = 0.12 * (1 - t) + 0.05 * t;
        g = 0.72 * (1 - t) + 0.48 * t;
        b = 0.78 * (1 - t) + 0.72 * t;
      } else {
        // Deep offshore ocean: abyssal navy
        const t = Math.min(1.0, (-distFromShore - 35) / 50);
        r = 0.05 * (1 - t) + 0.02 * t;
        g = 0.48 * (1 - t) + 0.16 * t;
        b = 0.72 * (1 - t) + 0.35 * t;
      }

      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }

    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.18,
      metalness: 0.12,
      transparent: true,
      opacity: 0.88,
      flatShading: false,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.receiveShadow = true;
    this.group.add(this.mesh);

    // 2. Animated Shoreline Surf & Swash Foam Band
    const foamWidth = 240;
    const foamDepth = 18;
    this.foamGeometry = new THREE.PlaneGeometry(foamWidth, foamDepth, 120, 15);
    this.foamGeometry.rotateX(-Math.PI / 2);
    this.foamBasePositions = new Float32Array(this.foamGeometry.attributes.position.array);

    this.foamMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.foamMesh = new THREE.Mesh(this.foamGeometry, this.foamMaterial);
    this.foamMesh.position.y = 0.15; // Just slightly above terrain swash
    this.group.add(this.foamMesh);
  }

  /**
   * Updates wave displacements, normal computations, and shoreline foam
   */
  public update(delta: number, environment: Environment, isNight: boolean = false): void {
    const waveHeight = environment.waveHeight ?? 1.2;
    const currentSpeed = environment.currentSpeed ?? environment.waterCurrent ?? 0.35;

    // Modulate wave clock based on current speed & delta
    const speedFactor = 0.9 + Math.min(currentSpeed * 0.8, 1.2);
    this.waveClock += delta * speedFactor;

    // Amplitude scale derived from wave height (normalized around 1.2m)
    const baseAmp = Math.min(Math.max(waveHeight * 0.5, 0.35), 2.2);

    // A. Update Ocean Surface Waves
    const pos = this.geometry.attributes.position;
    const count = pos.count;

    for (let i = 0; i < count; i++) {
      const bx = this.basePositions[i * 3];
      const bz = this.basePositions[i * 3 + 2];

      const shoreZ = BeachTerrain.getShorelineZ(bx);
      const distFromShore = bz - shoreZ;

      // Primary ocean swell rolling toward shore (+Z direction)
      const swell1 = Math.sin(bz * 0.14 + this.waveClock * 2.2) * (baseAmp * 0.55);

      // Angled secondary interference swell
      const swell2 = Math.cos(bx * 0.08 + bz * 0.18 + this.waveClock * 1.6) * (baseAmp * 0.28);

      // Fine capillary ripples
      const chop = Math.sin(bx * 0.35 - bz * 0.25 + this.waveClock * 3.4) * (baseAmp * 0.12);

      // Near shore dampening / shoaling
      let depthDamping = 1.0;
      if (distFromShore > -6) {
        // Taper off right at the shoreline edge
        depthDamping = Math.max(0, 1 - (distFromShore + 6) / 10);
      } else if (distFromShore < -70) {
        // Offshore smoothing
        depthDamping = 0.85;
      }

      const waveY = (swell1 + swell2 + chop) * depthDamping;
      pos.setY(i, waveY);
    }

    pos.needsUpdate = true;
    this.geometry.computeVertexNormals();

    // B. Update Shoreline Swash Foam
    const foamPos = this.foamGeometry.attributes.position;
    const foamCount = foamPos.count;

    // Pulsing tide surge offset
    const surge = Math.sin(this.waveClock * 1.8) * (1.8 + baseAmp * 0.5);
    const foamPulse = 0.35 + 0.3 * Math.sin(this.waveClock * 2.2);
    this.foamMaterial.opacity = Math.max(0.2, Math.min(0.75, foamPulse));

    for (let i = 0; i < foamCount; i++) {
      const bx = this.foamBasePositions[i * 3];
      const bz = this.foamBasePositions[i * 3 + 2];

      const shoreZ = BeachTerrain.getShorelineZ(bx);
      // Map foam ribbon along the curved shoreline plus the rhythmic wave surge
      const targetZ = shoreZ + bz * 0.8 + surge;
      const targetY = BeachTerrain.getElevation(bx, targetZ) + 0.08;

      foamPos.setXYZ(i, bx, targetY, targetZ);
    }

    foamPos.needsUpdate = true;

    // C. Adjust Water Material for Day / Night
    if (isNight) {
      this.material.roughness = 0.08; // High specular gloss for moonlight reflection
      this.material.opacity = 0.94;
    } else {
      this.material.roughness = 0.18;
      this.material.opacity = 0.88;
    }
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    if (this.geometry) this.geometry.dispose();
    if (this.material) this.material.dispose();
    if (this.foamGeometry) this.foamGeometry.dispose();
    if (this.foamMaterial) this.foamMaterial.dispose();
  }
}
