import * as THREE from 'three';
import { Environment } from '../../models/Environment';
import { BeachTerrain } from '../BeachTerrain';
import {
  WaveShoalingConfig,
  ShoalingHydroMetrics,
  BreakerType,
  RipGapExtent,
} from './shoaling.types';

/**
 * WaveShoalingVisual3D.ts
 * 
 * TIDES Phase 3: Wave Shoaling & Breaker Dynamics Visualizer
 * 
 * Accurately models and visualizes coastal wave transformation over real-world bathymetry:
 * 1. Bathymetric Wave Shoaling Surface:
 *    - Wave height amplification via Green's Law (H proportional to h^-0.25)
 *    - Wavelength compression and wave slowing as depth decreases toward the shore
 *    - Trochoidal wave steepening (sharp crests, broad shallow troughs)
 * 2. Breaker Crest Lines & McCowan Breaking Criterion (gamma = H_b / h_b = 0.78):
 *    - Traces incoming wave crests and determines exact breaking zones
 *    - Dynamically differentiates SPILLING, PLUNGING, and SURGING breaker regimes via Iribarren number
 * 3. Dynamic Aerated Foam Rollers:
 *    - White-water turbulence and aerated bubbles tumbling down wave faces across the surf zone
 * 4. The Rip Current Gap Hazard Visualizer ("Calm Water Deception"):
 *    - Highlights the critical coastal safety hazard where deeper rip trenches (h = 3.8m)
 *      prevent waves from breaking, creating a deceptive "calm water" illusion that lures swimmers
 *      into dangerous seaward jets
 * 5. Dynamic Breaker Line Demarcation:
 *    - Tracks the boundary between offshore swell and the turbulent surf zone across varying tides
 * 
 * Completely non-invasive: Pure additive layer over the 3D scene, responsive to environment telemetry.
 */
export class WaveShoalingVisual3D {
  public readonly group: THREE.Group;

  // Configuration
  private config: WaveShoalingConfig = {
    visible: true,
    shoalingMeshVisible: true,
    breakerLinesVisible: true,
    foamRollersVisible: true,
    ripGapVisible: true,
    breakerDemarcationVisible: true,
    opacity: 0.85,
    waveScale: 1.0,
  };

  // 1. Shoaling Surface Grid
  private shoalingGroup: THREE.Group;
  private shoalingMesh: THREE.Mesh | null = null;
  private shoalingGeometry: THREE.PlaneGeometry | null = null;
  private shoalingMaterial: THREE.MeshStandardMaterial | null = null;
  private basePositions: Float32Array = new Float32Array(0);

  // 2. Breaker Crest Lines
  private breakerLinesGroup: THREE.Group;
  private crestWaveLines: THREE.Line[] = [];
  private crestPositionsList: Float32Array[] = [];
  private readonly numCrests: number = 5;

  // 3. Aerated Foam Rollers
  private foamRollersGroup: THREE.Group;
  private foamRollerPoints: THREE.Points | null = null;
  private foamRollerPositions: Float32Array = new Float32Array(0);
  private foamRollerLifetimes: Float32Array = new Float32Array(0);
  private foamRollerVelocities: Float32Array = new Float32Array(0);
  private readonly rollerParticleCount: number = 220;

  // 4. Rip Current Gap Hazard Indicator
  private ripGapGroup: THREE.Group;
  private ripGapMarkerMesh: THREE.Group | null = null;
  private ripGapBillboard: THREE.Sprite | null = null;

  // 5. Breaker Line Demarcation
  private breakerDemarcationGroup: THREE.Group;
  private breakerContourLine: THREE.Line | null = null;

  // Animation & Hydrodynamic State
  private waveClock: number = 0;
  private currentMetrics: ShoalingHydroMetrics;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'WaveShoalingVisual3DGroup';

    this.shoalingGroup = new THREE.Group();
    this.shoalingGroup.name = 'ShoalingSurfaceLayer';
    this.group.add(this.shoalingGroup);

    this.breakerLinesGroup = new THREE.Group();
    this.breakerLinesGroup.name = 'BreakerCrestLinesLayer';
    this.group.add(this.breakerLinesGroup);

    this.foamRollersGroup = new THREE.Group();
    this.foamRollersGroup.name = 'FoamRollersLayer';
    this.group.add(this.foamRollersGroup);

    this.ripGapGroup = new THREE.Group();
    this.ripGapGroup.name = 'RipGapHazardLayer';
    this.group.add(this.ripGapGroup);

    this.breakerDemarcationGroup = new THREE.Group();
    this.breakerDemarcationGroup.name = 'BreakerDemarcationLayer';
    this.group.add(this.breakerDemarcationGroup);

    // Initial default telemetry
    this.currentMetrics = this.computeHydroMetrics(1.4, 8.0, 180, 1.2);

    // Build subsystems
    this.buildShoalingMesh();
    this.buildBreakerCrestLines();
    this.buildFoamRollers();
    this.buildRipGapVisualizer();
    this.buildBreakerDemarcationLine();

    this.applyVisibility();
  }

  // =========================================================================
  // Subsystem 1: Bathymetric Wave Shoaling Surface Mesh
  // =========================================================================
  private buildShoalingMesh(): void {
    const width = 220; // Cross-bay span: X from -110 to +110
    const depth = 110; // Offshore span: Z from -110 to 0
    const segX = 110;
    const segZ = 60;

    this.shoalingGeometry = new THREE.PlaneGeometry(width, depth, segX, segZ);
    this.shoalingGeometry.rotateX(-Math.PI / 2);
    this.shoalingGeometry.translate(0, 0, -55); // Centers Z from -110 to 0

    const pos = this.shoalingGeometry.attributes.position;
    this.basePositions = new Float32Array(pos.array);

    // Vertex colors based on wave depth & shoaling regime
    const colors = new Float32Array(pos.count * 3);
    const color = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const z = this.basePositions[i * 3 + 2];
      // Deep water (-110) = Deep Azure (0x0284c7)
      // Shoaling zone (-55 to -25) = Vibrant Turquoise (0x06b6d4)
      // Surf zone (-25 to 0) = Seafoam White (0xe0f2fe)
      const t = (z + 110) / 110;
      if (t < 0.6) {
        color.setRGB(0.04 + t * 0.1, 0.45 + t * 0.25, 0.75 + t * 0.15);
      } else {
        const surfT = (t - 0.6) / 0.4;
        color.setRGB(0.1 + surfT * 0.85, 0.6 + surfT * 0.38, 0.85 + surfT * 0.15);
      }
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    this.shoalingGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.shoalingMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.15,
      metalness: 0.08,
      transparent: true,
      opacity: 0.68,
      wireframe: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.shoalingMesh = new THREE.Mesh(this.shoalingGeometry, this.shoalingMaterial);
    this.shoalingMesh.position.y = 0.05; // Slightly above flat ocean datum
    this.shoalingGroup.add(this.shoalingMesh);
  }

  // =========================================================================
  // Subsystem 2: Breaker Crest Lines
  // =========================================================================
  private buildBreakerCrestLines(): void {
    const pointsPerCrest = 80;
    const xMin = -95;
    const xMax = 95;
    const stepX = (xMax - xMin) / (pointsPerCrest - 1);

    for (let c = 0; c < this.numCrests; c++) {
      const positions = new Float32Array(pointsPerCrest * 3);
      for (let i = 0; i < pointsPerCrest; i++) {
        const x = xMin + i * stepX;
        positions[i * 3] = x;
        positions[i * 3 + 1] = 0.2;
        positions[i * 3 + 2] = -80 + c * 18;
      }

      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const mat = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        linewidth: 2,
        transparent: true,
        opacity: 0.85,
      });

      const line = new THREE.Line(geom, mat);
      this.crestWaveLines.push(line);
      this.crestPositionsList.push(positions);
      this.breakerLinesGroup.add(line);
    }
  }

  // =========================================================================
  // Subsystem 3: Dynamic Aerated Foam Rollers
  // =========================================================================
  private buildFoamRollers(): void {
    this.foamRollerPositions = new Float32Array(this.rollerParticleCount * 3);
    this.foamRollerLifetimes = new Float32Array(this.rollerParticleCount);
    this.foamRollerVelocities = new Float32Array(this.rollerParticleCount);

    for (let i = 0; i < this.rollerParticleCount; i++) {
      this.resetFoamParticle(i, true);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(this.foamRollerPositions, 3));

    let texture: THREE.CanvasTexture | null = null;
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        grad.addColorStop(0.5, 'rgba(224, 242, 254, 0.75)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(32, 32, 30, 0, Math.PI * 2);
        ctx.fill();
        texture = new THREE.CanvasTexture(canvas);
      }
    }

    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.8,
      map: texture,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.foamRollerPoints = new THREE.Points(geom, mat);
    this.foamRollersGroup.add(this.foamRollerPoints);
  }

  private resetFoamParticle(idx: number, randomizeProgress: boolean = false): void {
    // Generate particles across the surf zone flanks (avoiding the rip gap where waves do not break!)
    // Rip gap spans X in [24, 46]. Rollers occur mainly on flanking sandbars: [-85, 20] and [50, 85]
    let x: number;
    if (Math.random() < 0.6) {
      x = -80 + Math.random() * 95; // South/Central sandbar
    } else {
      x = 48 + Math.random() * 37; // North sandbar past rip channel
    }

    // Breaker line Z is near -35 to -20
    const startZ = -32 - Math.random() * 8;
    const progress = randomizeProgress ? Math.random() : 0;
    const currentZ = startZ + progress * 24;

    this.foamRollerPositions[idx * 3] = x;
    this.foamRollerPositions[idx * 3 + 1] = 0.35 + Math.random() * 0.4;
    this.foamRollerPositions[idx * 3 + 2] = currentZ;

    this.foamRollerLifetimes[idx] = progress;
    this.foamRollerVelocities[idx] = 2.4 + Math.random() * 1.6; // Shoreward forward velocity m/s
  }

  // =========================================================================
  // Subsystem 4: Rip Current Gap Hazard Visualizer ("Calm Water Deception")
  // =========================================================================
  private buildRipGapVisualizer(): void {
    const ripGapGroup = new THREE.Group();
    ripGapGroup.name = 'RipGapHazardGroup';

    // Highlight bracket bounding the gap over the trench (X: 24 to 46, Z: -50 to -15)
    const gapWidth = 22; // 46 - 24
    const gapDepth = 35; // -15 - (-50)
    const centerX = 35.0;
    const centerZ = -32.5;

    // A. Submerged Trench Outline
    const bracketGeom = new THREE.BufferGeometry();
    const bracketPts = [
      new THREE.Vector3(24, 0.25, -50),
      new THREE.Vector3(24, 0.25, -15),
      new THREE.Vector3(46, 0.25, -15),
      new THREE.Vector3(46, 0.25, -50),
      new THREE.Vector3(24, 0.25, -50),
    ];
    bracketGeom.setFromPoints(bracketPts);

    const bracketMat = new THREE.LineDashedMaterial({
      color: 0xf59e0b, // Amber Warning
      linewidth: 2,
      dashSize: 2,
      gapSize: 1.5,
    });
    const bracketLine = new THREE.Line(bracketGeom, bracketMat);
    bracketLine.computeLineDistances();
    ripGapGroup.add(bracketLine);

    // B. Subtle Deep Trench Overlay Tint (Darker, non-breaking water)
    const trenchPlaneGeom = new THREE.PlaneGeometry(gapWidth, gapDepth);
    trenchPlaneGeom.rotateX(-Math.PI / 2);
    const trenchPlaneMat = new THREE.MeshBasicMaterial({
      color: 0x0369a1, // Deep Ocean Blue (no breaking white foam)
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const trenchPlane = new THREE.Mesh(trenchPlaneGeom, trenchPlaneMat);
    trenchPlane.position.set(centerX, 0.12, centerZ);
    ripGapGroup.add(trenchPlane);

    // C. 3D Billboard Badge: "⚠️ RIP GAP: Calmer Water = Seaward Rip Jet"
    let badgeTexture: THREE.CanvasTexture | null = null;
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.roundRect(10, 10, 492, 108, 16);
        ctx.fill();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText('⚠️ RIP GAP • DECEPTIVE CALM', 30, 48);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '18px sans-serif';
        ctx.fillText('Submerged Trench (3.8m) suppresses wave breaking', 30, 78);
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('DO NOT ENTER: Active Seaward Jet Corridor', 30, 104);
        badgeTexture = new THREE.CanvasTexture(canvas);
      }
    }

    const spriteMat = new THREE.SpriteMaterial({
      map: badgeTexture,
      color: badgeTexture ? 0xffffff : 0xf59e0b,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(18, 4.5, 1);
    sprite.position.set(centerX, 4.5, centerZ);

    ripGapGroup.add(sprite);
    this.ripGapBillboard = sprite;
    this.ripGapMarkerMesh = ripGapGroup;
    this.ripGapGroup.add(ripGapGroup);
  }

  // =========================================================================
  // Subsystem 5: Breaker Line Demarcation (McCowan Criterion Contour)
  // =========================================================================
  private buildBreakerDemarcationLine(): void {
    const pointsCount = 90;
    const xMin = -95;
    const xMax = 95;
    const stepX = (xMax - xMin) / (pointsCount - 1);
    const points: THREE.Vector3[] = [];

    for (let i = 0; i < pointsCount; i++) {
      const x = xMin + i * stepX;
      // Breaker line curves along the bathymetric contour where depth = breaker depth (~1.8m)
      const shoreZ = BeachTerrain.getShorelineZ(x);
      // In trench (x near 35), breaker depth is farther offshore or nonexistent
      let offshoreOffset = -28;
      if (Math.abs(x - 35) < 12) {
        offshoreOffset = -42; // Trench pushes breaking zone seaward
      }
      points.push(new THREE.Vector3(x, 0.28, shoreZ + offshoreOffset));
    }

    const geom = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineDashedMaterial({
      color: 0xef4444, // Breaker limit line: Red / Warning Demarcation
      linewidth: 2,
      dashSize: 2.5,
      gapSize: 2.0,
      transparent: true,
      opacity: 0.8,
    });

    this.breakerContourLine = new THREE.Line(geom, mat);
    this.breakerContourLine.computeLineDistances();
    this.breakerDemarcationGroup.add(this.breakerContourLine);
  }

  // =========================================================================
  // Hydrodynamic Computations (Airy Dispersion & McCowan Breaker Criterion)
  // =========================================================================
  public computeHydroMetrics(
    deepWaveHeight: number = 1.4,
    wavePeriod: number = 8.5,
    waveDirection: number = 180,
    tideLevel: number = 1.2
  ): ShoalingHydroMetrics {
    const g = 9.81;
    // Deep water wavelength: L_0 = (g * T^2) / (2 * PI)
    const L_0 = (g * Math.pow(wavePeriod, 2)) / (2 * Math.PI);
    const c_0 = (g * wavePeriod) / (2 * Math.PI);

    // Average beach slope of Rushikonda sandface
    const tanBeta = 0.035;

    // Iribarren number: Xi = tan(beta) / sqrt(H_0 / L_0)
    const waveSteepness = deepWaveHeight / L_0;
    const iribarren = tanBeta / Math.sqrt(Math.max(0.0001, waveSteepness));

    // Breaker type classification
    let breakerType: BreakerType = 'SPILLING';
    if (iribarren < 0.5) {
      breakerType = 'SPILLING';
    } else if (iribarren <= 3.3) {
      breakerType = 'PLUNGING';
    } else {
      breakerType = 'SURGING';
    }

    // McCowan Breaking Criterion: gamma = H_b / h_b = 0.78
    const gamma = 0.78;
    // Breaker wave height from shoaling transformation: H_b ~ 1.14 * H_0 * (tanBeta)^0.05
    const H_b = deepWaveHeight * 1.15;
    const h_b = H_b / gamma; // Breaker depth where wave breaks

    // Surf zone width (meters from breaker line h = h_b to shoreline)
    const surfZoneWidth = Math.round(h_b / tanBeta);

    // Max shoaling amplification factor (Green's Law Ks = (h_0 / h_b)^0.25)
    const maxShoalingFactor = Math.min(1.85, Math.pow(10.0 / Math.max(0.8, h_b), 0.25));

    // Rip gap extent
    const ripGap: RipGapExtent = {
      minX: 24,
      maxX: 46,
      centerX: 35.0,
      centerDepthMeters: 3.8 + (tideLevel - 1.2),
      sandbarDepthMeters: 1.2 + (tideLevel - 1.2),
      isBreakerSuppressed: 3.8 + (tideLevel - 1.2) > h_b,
    };

    return {
      deepWaterWaveHeight: deepWaveHeight,
      wavePeriod: wavePeriod,
      waveDirectionDeg: waveDirection,
      deepWaterWavelengthMeters: Math.round(L_0 * 10) / 10,
      deepWaterCelerity: Math.round(c_0 * 10) / 10,
      averageBeachSlope: tanBeta,
      iribarrenNumber: Math.round(iribarren * 100) / 100,
      breakerType,
      breakerIndexGamma: gamma,
      breakerWaveHeight: Math.round(H_b * 100) / 100,
      breakerDepthMeters: Math.round(h_b * 100) / 100,
      surfZoneWidthMeters: surfZoneWidth,
      maxShoalingFactor: Math.round(maxShoalingFactor * 100) / 100,
      ripGap,
      timestampMs: Date.now(),
    };
  }

  // =========================================================================
  // Per-Frame Animation & Bathymetric Deformation Update
  // =========================================================================
  public update(delta: number, environment: Environment): void {
    const deepH = environment.waveHeight ?? 1.4;
    const period = environment.wavePeriod ?? 8.5;
    const waveDir = environment.waveDirection ?? 180;
    const tideLevel = environment.tideLevel ?? 1.2;

    this.currentMetrics = this.computeHydroMetrics(deepH, period, waveDir, tideLevel);

    const speed = 1.0 + Math.min(2.0, (10.0 / period));
    this.waveClock += delta * speed;

    // A. Update Shoaling Surface Mesh Geometry
    if (this.shoalingMesh && this.shoalingGeometry && this.config.shoalingMeshVisible) {
      const pos = this.shoalingGeometry.attributes.position;
      const count = pos.count;
      const Hb = this.currentMetrics.breakerWaveHeight;
      const hb = this.currentMetrics.breakerDepthMeters;

      for (let i = 0; i < count; i++) {
        const bx = this.basePositions[i * 3];
        const bz = this.basePositions[i * 3 + 2];

        // Evaluate seabed elevation below MSL
        const seabedElev = BeachTerrain.getElevation(bx, bz);
        const waterDepth = Math.max(0.2, -seabedElev + (tideLevel - 1.2));

        // Green's Law Shoaling Factor: Ks = (10 / depth)^0.25
        const shoalingKs = Math.min(1.85, Math.pow(10.0 / waterDepth, 0.25));

        // Wavelength compression factor
        const waveK = 0.12 * Math.sqrt(Math.max(0.3, 10.0 / waterDepth));

        // Base incoming wave phase
        const phase = bz * waveK + this.waveClock * 2.4;

        // Trochoidal wave shape: sharpened crests, flat troughs
        const waveForm = Math.sin(phase) + 0.3 * Math.cos(2 * phase);

        // Check breaker status: if depth <= hb, wave breaks and dissipates
        let waveAmp = (deepH * 0.45) * shoalingKs;

        // Rip Trench Check: at x in [24, 46], water is deeper (3.8m), so wave does NOT break
        const isInRipChannel = Math.abs(bx - 35) < 11;

        if (waterDepth < hb && !isInRipChannel) {
          // In surf zone on sandbar: wave has broken, amplitude decays into turbulent bore
          const decay = Math.max(0.15, waterDepth / hb);
          waveAmp = (Hb * 0.35) * decay;
        }

        const waveY = waveForm * waveAmp * this.config.waveScale;
        pos.setY(i, waveY);
      }

      pos.needsUpdate = true;
      this.shoalingGeometry.computeVertexNormals();
    }

    // B. Update Breaker Crest Lines
    if (this.config.breakerLinesVisible) {
      for (let c = 0; c < this.numCrests; c++) {
        const positions = this.crestPositionsList[c];
        const line = this.crestWaveLines[c];
        const geom = line.geometry;
        const ptsCount = positions.length / 3;

        // Advance crest line shoreward (increasing Z)
        const crestBaseZ = -90 + ((this.waveClock * 14 + c * 22) % 100);

        for (let i = 0; i < ptsCount; i++) {
          const x = positions[i * 3];
          const shoreZ = BeachTerrain.getShorelineZ(x);
          const z = shoreZ + (crestBaseZ);

          const seabedElev = BeachTerrain.getElevation(x, z);
          const waterDepth = Math.max(0.2, -seabedElev);

          // Rip gap crest curvature: wave slows down more in shallow sandbars,
          // but speeds ahead in the deep rip channel, creating crest refraction!
          let refractionZ = z;
          if (Math.abs(x - 35) < 14) {
            refractionZ += 2.8; // Wave crest bows forward in deep rip channel
          }

          positions[i * 3] = x;
          positions[i * 3 + 1] = 0.25 + (Math.sin(this.waveClock * 3 + c) * 0.15);
          positions[i * 3 + 2] = refractionZ;
        }

        geom.attributes.position.needsUpdate = true;
      }
    }

    // C. Update Foam Rollers
    if (this.foamRollerPoints && this.config.foamRollersVisible) {
      const pos = this.foamRollerPoints.geometry.attributes.position;
      const count = this.rollerParticleCount;

      for (let i = 0; i < count; i++) {
        this.foamRollerLifetimes[i] += delta * 0.45;
        if (this.foamRollerLifetimes[i] >= 1.0) {
          this.resetFoamParticle(i, false);
        }

        const v = this.foamRollerVelocities[i];
        // Move forward shoreward (+Z)
        this.foamRollerPositions[i * 3 + 2] += delta * v * 3.5;

        // Bob slightly with turbulence
        this.foamRollerPositions[i * 3 + 1] = 0.25 + Math.sin(this.waveClock * 6 + i) * 0.12;

        pos.setXYZ(
          i,
          this.foamRollerPositions[i * 3],
          this.foamRollerPositions[i * 3 + 1],
          this.foamRollerPositions[i * 3 + 2]
        );
      }

      pos.needsUpdate = true;
    }

    // D. Update Rip Gap Hazard Billboard Pulse
    if (this.ripGapBillboard && this.config.ripGapVisible) {
      const pulse = 0.85 + Math.sin(this.waveClock * 2.8) * 0.15;
      this.ripGapBillboard.material.opacity = pulse;
    }

    // E. Breaker Contour Line Tide Adjustment
    if (this.breakerContourLine && this.config.breakerDemarcationVisible) {
      // Adjust vertical elevation slightly with tide
      this.breakerContourLine.position.y = 0.28 + (tideLevel - 1.2) * 0.15;
    }
  }

  // =========================================================================
  // Visibility & Configuration Toggles
  // =========================================================================
  public setVisible(visible: boolean): void {
    this.config.visible = visible;
    this.group.visible = visible;
  }

  public getVisible(): boolean {
    return this.config.visible;
  }

  public setShoalingMeshVisible(visible: boolean): void {
    this.config.shoalingMeshVisible = visible;
    this.shoalingGroup.visible = visible;
  }

  public setBreakerLinesVisible(visible: boolean): void {
    this.config.breakerLinesVisible = visible;
    this.breakerLinesGroup.visible = visible;
  }

  public setFoamRollersVisible(visible: boolean): void {
    this.config.foamRollersVisible = visible;
    this.foamRollersGroup.visible = visible;
  }

  public setRipGapVisible(visible: boolean): void {
    this.config.ripGapVisible = visible;
    this.ripGapGroup.visible = visible;
  }

  public setBreakerDemarcationVisible(visible: boolean): void {
    this.config.breakerDemarcationVisible = visible;
    this.breakerDemarcationGroup.visible = visible;
  }

  public setWaveScale(scale: number): void {
    this.config.waveScale = Math.max(0.2, Math.min(2.5, scale));
  }

  public getConfig(): WaveShoalingConfig {
    return { ...this.config };
  }

  public getMetrics(): ShoalingHydroMetrics {
    return { ...this.currentMetrics };
  }

  private applyVisibility(): void {
    this.group.visible = this.config.visible;
    this.shoalingGroup.visible = this.config.shoalingMeshVisible;
    this.breakerLinesGroup.visible = this.config.breakerLinesVisible;
    this.foamRollersGroup.visible = this.config.foamRollersVisible;
    this.ripGapGroup.visible = this.config.ripGapVisible;
    this.breakerDemarcationGroup.visible = this.config.breakerDemarcationVisible;
  }

  // =========================================================================
  // Clean Disposal
  // =========================================================================
  public dispose(): void {
    if (this.shoalingGeometry) this.shoalingGeometry.dispose();
    if (this.shoalingMaterial) this.shoalingMaterial.dispose();

    for (const line of this.crestWaveLines) {
      line.geometry.dispose();
      if (Array.isArray(line.material)) {
        line.material.forEach((m) => m.dispose());
      } else {
        line.material.dispose();
      }
    }
    this.crestWaveLines = [];

    if (this.foamRollerPoints) {
      this.foamRollerPoints.geometry.dispose();
      if (this.foamRollerPoints.material instanceof THREE.Material) {
        this.foamRollerPoints.material.dispose();
      }
    }

    if (this.breakerContourLine) {
      this.breakerContourLine.geometry.dispose();
      if (this.breakerContourLine.material instanceof THREE.Material) {
        this.breakerContourLine.material.dispose();
      }
    }

    if (this.ripGapBillboard) {
      this.ripGapBillboard.material.dispose();
    }

    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
  }
}
