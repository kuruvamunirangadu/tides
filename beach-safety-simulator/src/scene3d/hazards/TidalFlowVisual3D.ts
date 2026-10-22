import * as THREE from 'three';
import { Environment } from '../../models/Environment';
import { BeachTerrain } from '../BeachTerrain';
import { TidalFlowConfig, TidalFlowState, TidalPhase, RipCorridorMetrics } from './tidal.types';

/**
 * TidalFlowVisual3D.ts
 * 
 * TIDES Phase 1 & Phase 2: Coastal Hydrodynamics, Longshore Feeder Channels & Rip-Current Mapping
 * 
 * Visualizes coastal ocean hydrodynamics using existing Three.js architecture:
 * 1. Dynamic Directional Flow Streamlines & Velocity Vector Grid across coastal waters (Phase 1)
 * 2. Fluorescent Chartreuse Dye Tracer Plume simulation matching field pilot aerial photos (Phase 1)
 * 3. Shoreline Intertidal Waterline & Tidal Elevation Gauge Pillar (Phase 1)
 * 4. Longshore Feeder Channels moving water parallel to shoreline converging into rip corridor (Phase 2)
 * 5. High-Velocity Rip Neck Corridor cutting through surf zone with boundary ribbons and jet particles (Phase 2)
 * 6. Expanding Offshore Head Plume (mushroom/fan dispersal with eddy circulation) past breakers (Phase 2)
 * 
 * - Purely additive visualization without modifying water shader, bathymetry, hazard physics, or rescue logic
 * - Responsive to live environmental telemetry: tideLevel, tideStatus, waterCurrent, currentDirection
 * - Independent operator controls for each visual subsystem
 */
export class TidalFlowVisual3D {
  public readonly group: THREE.Group;

  // Configuration
  private config: TidalFlowConfig = {
    visible: true,
    dyeTracerVisible: true,
    tideGaugeVisible: true,
    feederChannelsVisible: true,
    ripCorridorVisible: true,
    offshorePlumeVisible: true,
    streamlineDensity: 'MEDIUM',
    dyeColor: '#22c55e',
    opacity: 0.85,
  };

  // 1. Vector Flow Grid & Streamlines (Phase 1)
  private vectorGroup: THREE.Group;
  private arrowInstances: THREE.InstancedMesh | null = null;
  private arrowPositions: Float32Array = new Float32Array(0);
  private arrowBaseDirections: Float32Array = new Float32Array(0);
  private arrowSpeeds: Float32Array = new Float32Array(0);
  private arrowCount: number = 0;
  private dummyObj: THREE.Object3D = new THREE.Object3D();

  // 2. Fluorescent Dye Tracer (Phase 1, matching field pilot aerial photos)
  private dyeGroup: THREE.Group;
  private dyePoints: THREE.Points | null = null;
  private dyePositions: Float32Array = new Float32Array(0);
  private dyeVelocities: Float32Array = new Float32Array(0);
  private dyeLifespans: Float32Array = new Float32Array(0);
  private dyeCount: number = 240;

  // 3. Shoreline Tidal Waterline Ribbon & Tide Pillar (Phase 1)
  private tideGaugeGroup: THREE.Group;
  private shorelineRibbon: THREE.Line | null = null;
  private tideGaugePillar: THREE.Group | null = null;

  // 4. Longshore Feeder Channels (Phase 2)
  private feederGroup: THREE.Group;
  private feederLines: THREE.Line[] = [];
  private feederPoints: THREE.Points | null = null;
  private feederPositions: Float32Array = new Float32Array(0);
  private feederSide: Float32Array = new Float32Array(0); // -1 for left feeder, +1 for right feeder
  private feederSpeeds: Float32Array = new Float32Array(0);
  private feederCount: number = 120;

  // 5. Rip Neck Corridor (Phase 2)
  private ripCorridorGroup: THREE.Group;
  private ripBoundaryLines: THREE.Line[] = [];
  private ripJetLines: THREE.Line[] = [];
  private ripTroughMesh: THREE.Mesh | null = null;
  private ripJetPoints: THREE.Points | null = null;
  private ripJetPositions: Float32Array = new Float32Array(0);
  private ripJetSpeeds: Float32Array = new Float32Array(0);
  private ripJetCount: number = 100;

  // 6. Expanding Offshore Head Plume (Phase 2)
  private offshorePlumeGroup: THREE.Group;
  private plumeFanMesh: THREE.Mesh | null = null;
  private plumeCirculationLines: THREE.Line[] = [];
  private plumePoints: THREE.Points | null = null;
  private plumePositions: Float32Array = new Float32Array(0);
  private plumeVelocities: Float32Array = new Float32Array(0);
  private plumeLifespans: Float32Array = new Float32Array(0);
  private plumeCount: number = 100;

  // Animation Clocks & State
  private flowClock: number = 0;
  private pulseClock: number = 0;
  private lastTideLevel: number = 1.4;
  private lastTidePhase: TidalPhase = 'RISING';

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'TidalFlowVisual3D';

    // Subsystem 1: Vector Grid
    this.vectorGroup = new THREE.Group();
    this.vectorGroup.name = 'TidalVectorGroup';
    this.group.add(this.vectorGroup);

    // Subsystem 2: Dye Tracer
    this.dyeGroup = new THREE.Group();
    this.dyeGroup.name = 'FluorescentDyeTracerGroup';
    this.group.add(this.dyeGroup);

    // Subsystem 3: Tide Gauge & Waterline
    this.tideGaugeGroup = new THREE.Group();
    this.tideGaugeGroup.name = 'TideGaugeGroup';
    this.group.add(this.tideGaugeGroup);

    // Subsystem 4: Longshore Feeder Channels (Phase 2)
    this.feederGroup = new THREE.Group();
    this.feederGroup.name = 'FeederChannelsGroup';
    this.group.add(this.feederGroup);

    // Subsystem 5: Rip Neck Corridor (Phase 2)
    this.ripCorridorGroup = new THREE.Group();
    this.ripCorridorGroup.name = 'RipCorridorGroup';
    this.group.add(this.ripCorridorGroup);

    // Subsystem 6: Expanding Offshore Head Plume (Phase 2)
    this.offshorePlumeGroup = new THREE.Group();
    this.offshorePlumeGroup.name = 'OffshorePlumeGroup';
    this.group.add(this.offshorePlumeGroup);

    // Initialize all subsystems
    this.initVectorField();
    this.initDyeTracer();
    this.initTideGauge();
    this.initFeederChannels();
    this.initRipCorridor();
    this.initOffshorePlume();
  }

  /**
   * 1. Initialize Directional Flow Vector Grid (Phase 1)
   */
  private initVectorField(): void {
    const xRange = [-105, 105];
    const xStep = 14;
    const zRange = [-95, -10];
    const zStep = 11;

    const positions: number[] = [];
    const baseDirs: number[] = [];
    const speeds: number[] = [];

    for (let x = xRange[0]; x <= xRange[1]; x += xStep) {
      const shoreZ = BeachTerrain.getShorelineZ(x);
      for (let z = zRange[0]; z <= Math.min(zRange[1], shoreZ - 6); z += zStep) {
        const offsetX = ((z / zStep) % 2 === 0) ? 0 : xStep * 0.45;
        const posX = x + offsetX;
        if (posX < xRange[0] || posX > xRange[1]) continue;

        positions.push(posX, 0.35, z);

        const toCenter = -posX * 0.008;
        baseDirs.push(toCenter);

        const distFromShore = Math.abs(z - shoreZ);
        const depthSpeedFactor = distFromShore < 35 ? 1.25 : 0.85;
        speeds.push(depthSpeedFactor);
      }
    }

    this.arrowCount = positions.length / 3;
    this.arrowPositions = new Float32Array(positions);
    this.arrowBaseDirections = new Float32Array(baseDirs);
    this.arrowSpeeds = new Float32Array(speeds);

    const arrowShape = new THREE.CylinderGeometry(0.08, 0.28, 2.6, 6);
    arrowShape.rotateX(Math.PI / 2);

    const arrowMaterial = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
    });

    this.arrowInstances = new THREE.InstancedMesh(arrowShape, arrowMaterial, this.arrowCount);
    this.arrowInstances.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const color = new THREE.Color();
    for (let i = 0; i < this.arrowCount; i++) {
      const px = this.arrowPositions[i * 3];
      const py = this.arrowPositions[i * 3 + 1];
      const pz = this.arrowPositions[i * 3 + 2];

      this.dummyObj.position.set(px, py, pz);
      this.dummyObj.updateMatrix();
      this.arrowInstances.setMatrixAt(i, this.dummyObj.matrix);

      color.setHex(0x06b6d4);
      this.arrowInstances.setColorAt(i, color);
    }

    if (this.arrowInstances.instanceColor) {
      this.arrowInstances.instanceColor.needsUpdate = true;
    }
    this.arrowInstances.instanceMatrix.needsUpdate = true;
    this.vectorGroup.add(this.arrowInstances);
  }

  /**
   * 2. Initialize Fluorescent Dye Tracer Plume (Phase 1)
   */
  private initDyeTracer(): void {
    const geo = new THREE.BufferGeometry();
    this.dyePositions = new Float32Array(this.dyeCount * 3);
    this.dyeVelocities = new Float32Array(this.dyeCount * 3);
    this.dyeLifespans = new Float32Array(this.dyeCount * 2);

    for (let i = 0; i < this.dyeCount; i++) {
      this.resetDyeParticle(i, true);
    }

    geo.setAttribute('position', new THREE.BufferAttribute(this.dyePositions, 3));

    const dyeMaterial = new THREE.PointsMaterial({
      color: new THREE.Color(0x22c55e),
      size: 1.4,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.dyePoints = new THREE.Points(geo, dyeMaterial);
    this.dyeGroup.add(this.dyePoints);
  }

  private resetDyeParticle(i: number, randomAge: boolean = false): void {
    const releaseX = 12 + (Math.random() - 0.5) * 28;
    const shoreZ = BeachTerrain.getShorelineZ(releaseX);
    const releaseZ = shoreZ - 2.5 - Math.random() * 4.0;
    const releaseY = 0.28 + Math.random() * 0.15;

    this.dyePositions[i * 3] = releaseX;
    this.dyePositions[i * 3 + 1] = releaseY;
    this.dyePositions[i * 3 + 2] = releaseZ;

    const toCenter = (12 - releaseX) * 0.08;
    const seawardVelocity = -0.45 - Math.random() * 0.55;

    this.dyeVelocities[i * 3] = toCenter;
    this.dyeVelocities[i * 3 + 1] = 0;
    this.dyeVelocities[i * 3 + 2] = seawardVelocity;

    const maxAge = 8.0 + Math.random() * 6.0;
    this.dyeLifespans[i * 2] = randomAge ? Math.random() * maxAge : 0;
    this.dyeLifespans[i * 2 + 1] = maxAge;
  }

  /**
   * 3. Initialize Shoreline Intertidal Waterline Ribbon & Tide Pillar (Phase 1)
   */
  private initTideGauge(): void {
    const points: THREE.Vector3[] = [];
    for (let x = -115; x <= 115; x += 2.5) {
      const z = BeachTerrain.getShorelineZ(x);
      points.push(new THREE.Vector3(x, 0.22, z));
    }

    const ribbonGeo = new THREE.BufferGeometry().setFromPoints(points);
    const ribbonMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      linewidth: 2,
      transparent: true,
      opacity: 0.65,
    });

    this.shorelineRibbon = new THREE.Line(ribbonGeo, ribbonMat);
    this.tideGaugeGroup.add(this.shorelineRibbon);

    this.tideGaugePillar = new THREE.Group();
    this.tideGaugePillar.position.set(-85, 0, BeachTerrain.getShorelineZ(-85));

    const postGeo = new THREE.CylinderGeometry(0.25, 0.35, 4.5, 8);
    const postMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.8,
      roughness: 0.2,
    });
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.y = 2.25;
    this.tideGaugePillar.add(post);

    const scaleGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.4, 8);
    const yellowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const blueMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });

    for (let step = 0; step < 5; step++) {
      const band = new THREE.Mesh(scaleGeo, step % 2 === 0 ? yellowMat : blueMat);
      band.position.y = 0.8 + step * 0.7;
      this.tideGaugePillar.add(band);
    }

    const beaconGeo = new THREE.SphereGeometry(0.35, 12, 12);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.y = 4.6;
    this.tideGaugePillar.add(beacon);

    this.tideGaugeGroup.add(this.tideGaugePillar);
  }

  /**
   * 4. Initialize Longshore Feeder Channels (Phase 2)
   * Visualizes lateral water mass transport along the shoreline converging into the rip current neck (X = 12m).
   */
  private initFeederChannels(): void {
    const feederMat = new THREE.LineBasicMaterial({
      color: 0xf59e0b, // Amber / Warm Gold
      linewidth: 2,
      transparent: true,
      opacity: 0.75,
    });

    // Distance offsets seaward from shoreline (surf breaker zone)
    const offsets = [3.0, 5.0, 7.2];

    // Left Feeder Streamlines: Flowing right (+X) from X = -65m to X = 10m
    offsets.forEach((offset) => {
      const pts: THREE.Vector3[] = [];
      for (let x = -65; x <= 10; x += 3.0) {
        const baseShoreZ = BeachTerrain.getShorelineZ(x);
        // Curve offshore as it approaches the rip neck at X = 12m
        const neckProximity = Math.max(0, (x - (-15)) / 25);
        const seawardCurve = neckProximity * neckProximity * 4.5;
        pts.push(new THREE.Vector3(x, 0.24, baseShoreZ - offset - seawardCurve));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, feederMat);
      this.feederLines.push(line);
      this.feederGroup.add(line);
    });

    // Right Feeder Streamlines: Flowing left (-X) from X = 75m down to X = 14m
    offsets.forEach((offset) => {
      const pts: THREE.Vector3[] = [];
      for (let x = 75; x >= 14; x -= 3.0) {
        const baseShoreZ = BeachTerrain.getShorelineZ(x);
        const neckProximity = Math.max(0, (35 - x) / 21);
        const seawardCurve = neckProximity * neckProximity * 4.5;
        pts.push(new THREE.Vector3(x, 0.24, baseShoreZ - offset - seawardCurve));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, feederMat);
      this.feederLines.push(line);
      this.feederGroup.add(line);
    });

    // Feeder Flow Particles (Water moving alongshore into neck)
    const pGeo = new THREE.BufferGeometry();
    this.feederPositions = new Float32Array(this.feederCount * 3);
    this.feederSide = new Float32Array(this.feederCount);
    this.feederSpeeds = new Float32Array(this.feederCount);

    for (let i = 0; i < this.feederCount; i++) {
      this.resetFeederParticle(i, true);
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(this.feederPositions, 3));

    const pMat = new THREE.PointsMaterial({
      color: 0xfbbf24, // Bright Gold
      size: 1.1,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.feederPoints = new THREE.Points(pGeo, pMat);
    this.feederGroup.add(this.feederPoints);
  }

  private resetFeederParticle(i: number, randomStart: boolean = false): void {
    // 50% left feeder, 50% right feeder
    const isLeft = i % 2 === 0;
    this.feederSide[i] = isLeft ? -1 : 1;

    let posX: number;
    if (isLeft) {
      posX = randomStart ? -65 + Math.random() * 70 : -65;
    } else {
      posX = randomStart ? 75 - Math.random() * 58 : 75;
    }

    const shoreZ = BeachTerrain.getShorelineZ(posX);
    const offsetZ = 2.8 + Math.random() * 4.6;
    const neckProximity = isLeft ? Math.max(0, (posX - (-15)) / 25) : Math.max(0, (35 - posX) / 21);
    const seawardCurve = neckProximity * neckProximity * 4.5;

    this.feederPositions[i * 3] = posX;
    this.feederPositions[i * 3 + 1] = 0.26 + Math.random() * 0.08;
    this.feederPositions[i * 3 + 2] = shoreZ - offsetZ - seawardCurve;

    this.feederSpeeds[i] = 0.65 + Math.random() * 0.45;
  }

  /**
   * 5. Initialize Rip Neck Corridor (Phase 2)
   * High-velocity channel cutting seaward through the surf zone at X = 12m.
   */
  private initRipCorridor(): void {
    const centerShoreZ = BeachTerrain.getShorelineZ(12);
    const startZ = centerShoreZ - 2.0;
    const endZ = -45.0; // Neck termination where plume expands
    const neckLength = Math.abs(endZ - startZ);
    const neckCenterZ = (startZ + endZ) / 2;

    // 1. Trough Bed (Discolored deeper channel bathymetry)
    const troughGeo = new THREE.PlaneGeometry(16, neckLength);
    troughGeo.rotateX(-Math.PI / 2);
    troughGeo.translate(12, 0.18, neckCenterZ);

    const troughMat = new THREE.MeshBasicMaterial({
      color: 0x0d9488, // Dark teal trench
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    });

    this.ripTroughMesh = new THREE.Mesh(troughGeo, troughMat);
    this.ripCorridorGroup.add(this.ripTroughMesh);

    // 2. Lateral Corridor Boundaries (Orange/Coral hazard lines)
    const boundaryMat = new THREE.LineDashedMaterial({
      color: 0xf97316, // Vivid Orange
      dashSize: 2.0,
      gapSize: 1.2,
      transparent: true,
      opacity: 0.78,
    });

    // Left and Right Boundary Ribbons (X = 3.5m and X = 20.5m)
    [3.5, 20.5].forEach((bx) => {
      const bShoreZ = BeachTerrain.getShorelineZ(bx) - 1.5;
      const pts = [
        new THREE.Vector3(bx, 0.26, bShoreZ),
        new THREE.Vector3(bx, 0.26, endZ),
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, boundaryMat);
      line.computeLineDistances();
      this.ripBoundaryLines.push(line);
      this.ripCorridorGroup.add(line);
    });

    // 3. Central Fast Seaward Streamlines
    const jetMat = new THREE.LineBasicMaterial({
      color: 0xf43f5e, // Rose / Coral fast jet
      linewidth: 2,
      transparent: true,
      opacity: 0.8,
    });

    [8, 12, 16].forEach((jx) => {
      const jShoreZ = BeachTerrain.getShorelineZ(jx) - 2.0;
      const pts = [
        new THREE.Vector3(jx, 0.27, jShoreZ),
        new THREE.Vector3(jx, 0.27, endZ),
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, jetMat);
      this.ripJetLines.push(line);
      this.ripCorridorGroup.add(line);
    });

    // 4. Accelerated Seaward Particles (Fast rip neck jet)
    const jetGeo = new THREE.BufferGeometry();
    this.ripJetPositions = new Float32Array(this.ripJetCount * 3);
    this.ripJetSpeeds = new Float32Array(this.ripJetCount);

    for (let i = 0; i < this.ripJetCount; i++) {
      this.resetRipJetParticle(i, true);
    }

    jetGeo.setAttribute('position', new THREE.BufferAttribute(this.ripJetPositions, 3));

    const jetPointMat = new THREE.PointsMaterial({
      color: 0xfb923c, // Neon Coral Amber
      size: 1.3,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.ripJetPoints = new THREE.Points(jetGeo, jetPointMat);
    this.ripCorridorGroup.add(this.ripJetPoints);
  }

  private resetRipJetParticle(i: number, randomStart: boolean = false): void {
    const shoreZ = BeachTerrain.getShorelineZ(12) - 2.0;
    const endZ = -45.0;
    const length = Math.abs(endZ - shoreZ);

    const px = 12 + (Math.random() - 0.5) * 12.0;
    const pz = randomStart ? shoreZ - Math.random() * length : shoreZ;
    const py = 0.27 + Math.random() * 0.08;

    this.ripJetPositions[i * 3] = px;
    this.ripJetPositions[i * 3 + 1] = py;
    this.ripJetPositions[i * 3 + 2] = pz;

    this.ripJetSpeeds[i] = 1.6 + Math.random() * 0.8;
  }

  /**
   * 6. Initialize Expanding Offshore Head Plume (Phase 2)
   * Dispersing fan/mushroom plume expanding offshore past breakers (Z: -45m to -75m, X: -18m to +42m).
   */
  private initOffshorePlume(): void {
    // 1. Expanding Fan Surface Mesh
    const plumeShape = new THREE.Shape();
    // Apex at neck exit (12, -45)
    plumeShape.moveTo(12, -45);
    // Right expanding curved lobe
    plumeShape.quadraticCurveTo(38, -55, 42, -75);
    // Outer offshore arc
    plumeShape.quadraticCurveTo(12, -80, -18, -75);
    // Left expanding curved lobe back to apex
    plumeShape.quadraticCurveTo(-14, -55, 12, -45);

    const plumeGeo = new THREE.ShapeGeometry(plumeShape);
    plumeGeo.rotateX(-Math.PI / 2); // Lay flat on water surface
    // Elevate slightly above water mesh to avoid z-fighting
    plumeGeo.translate(0, 0.22, 0);

    const plumeMat = new THREE.MeshBasicMaterial({
      color: 0x047857, // Dispersing Emerald-Teal Plume
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.plumeFanMesh = new THREE.Mesh(plumeGeo, plumeMat);
    this.offshorePlumeGroup.add(this.plumeFanMesh);

    // 2. Plume Circulation & Eddy Streamlines (Image 2 reference)
    const eddyMat = new THREE.LineBasicMaterial({
      color: 0x34d399, // Bright Mint Green
      linewidth: 2,
      transparent: true,
      opacity: 0.65,
    });

    // Left circulation eddy (counter-clockwise recirculating back toward feeder)
    const leftEddyPts = [
      new THREE.Vector3(12, 0.24, -45),
      new THREE.Vector3(0, 0.24, -58),
      new THREE.Vector3(-15, 0.24, -68),
      new THREE.Vector3(-18, 0.24, -52),
      new THREE.Vector3(-10, 0.24, -38),
    ];
    const leftEddyGeo = new THREE.BufferGeometry().setFromPoints(leftEddyPts);
    const leftEddyLine = new THREE.Line(leftEddyGeo, eddyMat);
    this.plumeCirculationLines.push(leftEddyLine);
    this.offshorePlumeGroup.add(leftEddyLine);

    // Right circulation eddy (clockwise recirculating back toward feeder)
    const rightEddyPts = [
      new THREE.Vector3(12, 0.24, -45),
      new THREE.Vector3(24, 0.24, -58),
      new THREE.Vector3(39, 0.24, -68),
      new THREE.Vector3(36, 0.24, -52),
      new THREE.Vector3(25, 0.24, -38),
    ];
    const rightEddyGeo = new THREE.BufferGeometry().setFromPoints(rightEddyPts);
    const rightEddyLine = new THREE.Line(rightEddyGeo, eddyMat);
    this.plumeCirculationLines.push(rightEddyLine);
    this.offshorePlumeGroup.add(rightEddyLine);

    // 3. Dispersing Offshore Plume Particles
    const pGeo = new THREE.BufferGeometry();
    this.plumePositions = new Float32Array(this.plumeCount * 3);
    this.plumeVelocities = new Float32Array(this.plumeCount * 3);
    this.plumeLifespans = new Float32Array(this.plumeCount * 2);

    for (let i = 0; i < this.plumeCount; i++) {
      this.resetPlumeParticle(i, true);
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(this.plumePositions, 3));

    const pMat = new THREE.PointsMaterial({
      color: 0x6ee7b7, // Pale Emerald Plume
      size: 1.5,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.plumePoints = new THREE.Points(pGeo, pMat);
    this.offshorePlumeGroup.add(this.plumePoints);
  }

  private resetPlumeParticle(i: number, randomAge: boolean = false): void {
    // Emerge from rip neck exit (12, -45)
    const startX = 12 + (Math.random() - 0.5) * 8.0;
    const startZ = -45.0 - Math.random() * 3.0;

    this.plumePositions[i * 3] = startX;
    this.plumePositions[i * 3 + 1] = 0.25 + Math.random() * 0.08;
    this.plumePositions[i * 3 + 2] = startZ;

    // Fan outwards radially and seaward (-Z)
    const spreadAngle = (Math.random() - 0.5) * 1.4; // +/- ~40 degrees
    const speed = 0.45 + Math.random() * 0.35;

    this.plumeVelocities[i * 3] = Math.sin(spreadAngle) * speed * 1.5;
    this.plumeVelocities[i * 3 + 1] = 0;
    this.plumeVelocities[i * 3 + 2] = -Math.cos(spreadAngle) * speed;

    const maxAge = 6.0 + Math.random() * 4.0;
    this.plumeLifespans[i * 2] = randomAge ? Math.random() * maxAge : 0;
    this.plumeLifespans[i * 2 + 1] = maxAge;
  }

  /**
   * Main per-frame animation and state update loop
   * Hooks cleanly into the existing BeachScene3D animate() call
   */
  public update(delta: number, environment: Environment): void {
    if (!this.config.visible) return;

    this.flowClock += delta;
    this.pulseClock += delta * 2.0;

    // 1. Read Authoritative Environmental Telemetry
    const tideLevel = environment.tideLevel ?? 1.4;
    const tidePhase: TidalPhase = environment.tideStatus ?? (tideLevel > 1.4 ? 'RISING' : 'FALLING');
    const currentSpeed = environment.currentSpeed ?? environment.waterCurrent ?? 0.35;
    const currentDirDeg = environment.currentDirection ?? (tidePhase === 'RISING' ? 10 : 190);

    this.lastTideLevel = tideLevel;
    this.lastTidePhase = tidePhase;

    const flowRad = (currentDirDeg * Math.PI) / 180;
    const tidalVelocityX = Math.cos(flowRad);
    const tidalVelocityZ = Math.sin(flowRad);

    const animationSpeed = 0.8 + Math.min(currentSpeed * 1.6, 3.2);

    // 2. Update Vector Flow Arrows (Phase 1)
    if (this.arrowInstances && this.arrowInstances.visible) {
      const color = new THREE.Color();
      if (currentSpeed > 1.1) {
        color.setHex(0xa3e635); // Strong: Chartreuse / Lime
      } else if (currentSpeed >= 0.5) {
        color.setHex(0x10b981); // Moderate: Vivid Emerald
      } else {
        color.setHex(0x06b6d4); // Gentle: Coastal Cyan
      }

      for (let i = 0; i < this.arrowCount; i++) {
        const baseX = this.arrowPositions[i * 3];
        const baseZ = this.arrowPositions[i * 3 + 2];
        const localSpeedMult = this.arrowSpeeds[i];

        const surgeOffset = Math.sin(this.flowClock * animationSpeed + baseX * 0.05 + baseZ * 0.08) * 0.8;
        const curX = baseX + tidalVelocityX * surgeOffset;
        const curZ = baseZ + tidalVelocityZ * surgeOffset;
        const curY = 0.28 + Math.sin(this.flowClock * 1.8 + baseX * 0.1) * 0.12;

        this.dummyObj.position.set(curX, curY, curZ);

        const lateralBias = this.arrowBaseDirections[i];
        const totalAngle = Math.atan2(tidalVelocityX + lateralBias, tidalVelocityZ);
        this.dummyObj.rotation.set(0, totalAngle, 0);

        const scaleLen = Math.min(Math.max(0.7 + currentSpeed * 0.6, 0.7), 2.2) * localSpeedMult;
        this.dummyObj.scale.set(1.0, 1.0, scaleLen);

        this.dummyObj.updateMatrix();
        this.arrowInstances.setMatrixAt(i, this.dummyObj.matrix);
        this.arrowInstances.setColorAt(i, color);
      }

      if (this.arrowInstances.instanceColor) {
        this.arrowInstances.instanceColor.needsUpdate = true;
      }
      this.arrowInstances.instanceMatrix.needsUpdate = true;
    }

    // 3. Update Fluorescent Dye Tracer Plume (Phase 1)
    if (this.config.dyeTracerVisible && this.dyePoints) {
      const pos = this.dyePositions;
      const vel = this.dyeVelocities;
      const life = this.dyeLifespans;
      const geo = this.dyePoints.geometry;

      const dyeDriftRate = delta * animationSpeed;

      for (let i = 0; i < this.dyeCount; i++) {
        life[i * 2] += delta;

        if (life[i * 2] >= life[i * 2 + 1]) {
          this.resetDyeParticle(i, false);
          continue;
        }

        pos[i * 3] += vel[i * 3] * dyeDriftRate;
        pos[i * 3 + 2] += vel[i * 3 + 2] * dyeDriftRate;

        pos[i * 3] += (Math.random() - 0.5) * 0.06;
        pos[i * 3 + 2] += (Math.random() - 0.5) * 0.06;

        pos[i * 3 + 1] = 0.25 + Math.sin(this.flowClock * 2.2 + pos[i * 3] * 0.2) * 0.08;
      }

      geo.attributes.position.needsUpdate = true;
    }

    // 4. Update Shoreline Tidal Ribbon & Water Elevation (Phase 1)
    if (this.shorelineRibbon && this.config.tideGaugeVisible) {
      const mat = this.shorelineRibbon.material as THREE.LineBasicMaterial;
      const pulse = 0.45 + 0.3 * Math.sin(this.pulseClock);
      mat.opacity = pulse;

      if (tidePhase === 'RISING') {
        mat.color.setHex(0x38bdf8); // Sky blue rising
      } else {
        mat.color.setHex(0x0d9488); // Darker teal receding
      }
    }

    // 5. Update Longshore Feeder Channels (Phase 2)
    if (this.config.feederChannelsVisible && this.feederPoints) {
      const pos = this.feederPositions;
      const side = this.feederSide;
      const speeds = this.feederSpeeds;
      const geo = this.feederPoints.geometry;

      const feederRate = delta * animationSpeed * (0.8 + currentSpeed * 0.6);

      for (let i = 0; i < this.feederCount; i++) {
        const isLeft = side[i] === -1;
        // Travel alongshore towards X = 12
        if (isLeft) {
          pos[i * 3] += speeds[i] * feederRate * 5.0;
          if (pos[i * 3] >= 11.5) {
            this.resetFeederParticle(i, false);
            continue;
          }
        } else {
          pos[i * 3] -= speeds[i] * feederRate * 5.0;
          if (pos[i * 3] <= 12.5) {
            this.resetFeederParticle(i, false);
            continue;
          }
        }

        const curX = pos[i * 3];
        const shoreZ = BeachTerrain.getShorelineZ(curX);
        const neckProximity = isLeft ? Math.max(0, (curX - (-15)) / 25) : Math.max(0, (35 - curX) / 21);
        const seawardCurve = neckProximity * neckProximity * 4.5;
        pos[i * 3 + 2] = shoreZ - 4.5 - seawardCurve;
        pos[i * 3 + 1] = 0.25 + Math.sin(this.flowClock * 2.5 + curX * 0.3) * 0.05;
      }

      geo.attributes.position.needsUpdate = true;
    }

    // 6. Update Rip Neck Corridor (Phase 2)
    if (this.config.ripCorridorVisible && this.ripJetPoints) {
      const pos = this.ripJetPositions;
      const speeds = this.ripJetSpeeds;
      const geo = this.ripJetPoints.geometry;

      // Accelerated seaward flow velocity through neck (Image 2 reference)
      const ripSpeedFactor = (1.5 + currentSpeed * 1.2) * delta * 7.5;
      const endZ = -45.0;

      for (let i = 0; i < this.ripJetCount; i++) {
        pos[i * 3 + 2] -= speeds[i] * ripSpeedFactor; // Move seaward (-Z)
        if (pos[i * 3 + 2] <= endZ) {
          this.resetRipJetParticle(i, false);
          continue;
        }

        // Slight turbulent lateral jitter
        pos[i * 3] += (Math.random() - 0.5) * 0.08;
        // Constrain within neck corridor bounds
        pos[i * 3] = Math.max(4.5, Math.min(19.5, pos[i * 3]));
        pos[i * 3 + 1] = 0.26 + Math.sin(this.flowClock * 3.0 + pos[i * 3 + 2] * 0.2) * 0.06;
      }

      geo.attributes.position.needsUpdate = true;

      // Pulse boundary ribbons
      this.ripBoundaryLines.forEach((line) => {
        const mat = line.material as THREE.LineDashedMaterial;
        mat.opacity = 0.55 + 0.35 * Math.sin(this.pulseClock * 1.5);
      });
    }

    // 7. Update Expanding Offshore Plume (Phase 2)
    if (this.config.offshorePlumeVisible && this.plumePoints) {
      const pos = this.plumePositions;
      const vel = this.plumeVelocities;
      const life = this.plumeLifespans;
      const geo = this.plumePoints.geometry;

      const plumeDriftRate = delta * animationSpeed * (0.6 + currentSpeed * 0.4);

      for (let i = 0; i < this.plumeCount; i++) {
        life[i * 2] += delta;

        if (life[i * 2] >= life[i * 2 + 1]) {
          this.resetPlumeParticle(i, false);
          continue;
        }

        // Move along fanning trajectory
        pos[i * 3] += vel[i * 3] * plumeDriftRate * 3.0;
        pos[i * 3 + 2] += vel[i * 3 + 2] * plumeDriftRate * 3.0;

        // Dispersive lateral spread
        pos[i * 3] += (Math.random() - 0.5) * 0.12;
        pos[i * 3 + 1] = 0.24 + Math.sin(this.flowClock * 1.5 + pos[i * 3] * 0.15) * 0.05;
      }

      geo.attributes.position.needsUpdate = true;

      // Pulse plume fan mesh opacity subtly
      if (this.plumeFanMesh) {
        const mat = this.plumeFanMesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.24 + 0.1 * Math.sin(this.flowClock * 0.8);
      }
    }
  }

  /**
   * Toggles overall layer visibility
   */
  public setVisible(visible: boolean): void {
    this.config.visible = visible;
    this.group.visible = visible;
  }

  public isVisible(): boolean {
    return this.config.visible;
  }

  /**
   * Toggles the Fluorescent Dye Tracer Plume
   */
  public setDyeTracerVisible(visible: boolean): void {
    this.config.dyeTracerVisible = visible;
    this.dyeGroup.visible = visible;
  }

  public isDyeTracerVisible(): boolean {
    return this.config.dyeTracerVisible;
  }

  /**
   * Toggles Flow Streamlines / Vectors
   */
  public setVectorsVisible(visible: boolean): void {
    this.vectorGroup.visible = visible;
  }

  public isVectorsVisible(): boolean {
    return this.vectorGroup.visible;
  }

  /**
   * Phase 2: Toggles Longshore Feeder Channels
   */
  public setFeederChannelsVisible(visible: boolean): void {
    this.config.feederChannelsVisible = visible;
    this.feederGroup.visible = visible;
  }

  public isFeederChannelsVisible(): boolean {
    return this.config.feederChannelsVisible;
  }

  /**
   * Phase 2: Toggles Rip Neck Corridor
   */
  public setRipCorridorVisible(visible: boolean): void {
    this.config.ripCorridorVisible = visible;
    this.ripCorridorGroup.visible = visible;
  }

  public isRipCorridorVisible(): boolean {
    return this.config.ripCorridorVisible;
  }

  /**
   * Phase 2: Toggles Expanding Offshore Head Plume
   */
  public setOffshorePlumeVisible(visible: boolean): void {
    this.config.offshorePlumeVisible = visible;
    this.offshorePlumeGroup.visible = visible;
  }

  public isOffshorePlumeVisible(): boolean {
    return this.config.offshorePlumeVisible;
  }

  /**
   * Returns authoritative live telemetry summary for UI HUD
   */
  public getStateSummary(environment: Environment): TidalFlowState {
    const tideLevel = environment.tideLevel ?? this.lastTideLevel;
    const tidePhase = environment.tideStatus ?? this.lastTidePhase;
    const currentSpeed = environment.currentSpeed ?? environment.waterCurrent ?? 0.35;
    const currentDirDeg = environment.currentDirection ?? (tidePhase === 'RISING' ? 10 : 190);

    const flowRad = (currentDirDeg * Math.PI) / 180;
    const ripNeckSpeed = Math.round(currentSpeed * 1.8 * 100) / 100;

    let hazardLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME' = 'MODERATE';
    if (ripNeckSpeed > 1.8) hazardLevel = 'EXTREME';
    else if (ripNeckSpeed > 1.2) hazardLevel = 'HIGH';
    else if (ripNeckSpeed < 0.6) hazardLevel = 'LOW';

    const ripMetrics: RipCorridorMetrics = {
      corridorX: 12,
      corridorWidth: 17,
      neckVelocityMps: ripNeckSpeed,
      plumeExpansionMeters: 45,
      hazardLevel,
    };

    return {
      tideLevelMeters: tideLevel,
      tidePhase,
      currentSpeedMps: currentSpeed,
      currentDirectionDeg: currentDirDeg,
      flowVector: { x: Math.cos(flowRad), z: Math.sin(flowRad) },
      waveHeightMeters: environment.waveHeight ?? 1.2,
      provenance: 'SIMULATED - AP Coastal Hydrodynamics Model',
      isDemonstration: false,
      ripMetrics,
    };
  }

  /**
   * Thorough resource cleanup
   */
  public dispose(): void {
    // 1. Vector grid cleanup
    if (this.arrowInstances) {
      this.arrowInstances.geometry.dispose();
      if (Array.isArray(this.arrowInstances.material)) {
        this.arrowInstances.material.forEach((m) => m.dispose());
      } else {
        this.arrowInstances.material.dispose();
      }
    }

    // 2. Dye tracer cleanup
    if (this.dyePoints) {
      this.dyePoints.geometry.dispose();
      if (Array.isArray(this.dyePoints.material)) {
        this.dyePoints.material.forEach((m) => m.dispose());
      } else {
        this.dyePoints.material.dispose();
      }
    }

    // 3. Tide gauge ribbon cleanup
    if (this.shorelineRibbon) {
      this.shorelineRibbon.geometry.dispose();
      if (Array.isArray(this.shorelineRibbon.material)) {
        this.shorelineRibbon.material.forEach((m) => m.dispose());
      } else {
        this.shorelineRibbon.material.dispose();
      }
    }

    // 4. Feeder channels cleanup (Phase 2)
    this.feederLines.forEach((l) => {
      l.geometry.dispose();
      if (Array.isArray(l.material)) l.material.forEach((m) => m.dispose());
      else l.material.dispose();
    });
    this.feederLines = [];

    if (this.feederPoints) {
      this.feederPoints.geometry.dispose();
      if (Array.isArray(this.feederPoints.material)) {
        this.feederPoints.material.forEach((m) => m.dispose());
      } else {
        this.feederPoints.material.dispose();
      }
    }

    // 5. Rip corridor cleanup (Phase 2)
    this.ripBoundaryLines.forEach((l) => {
      l.geometry.dispose();
      if (Array.isArray(l.material)) l.material.forEach((m) => m.dispose());
      else l.material.dispose();
    });
    this.ripBoundaryLines = [];

    this.ripJetLines.forEach((l) => {
      l.geometry.dispose();
      if (Array.isArray(l.material)) l.material.forEach((m) => m.dispose());
      else l.material.dispose();
    });
    this.ripJetLines = [];

    if (this.ripTroughMesh) {
      this.ripTroughMesh.geometry.dispose();
      if (Array.isArray(this.ripTroughMesh.material)) {
        this.ripTroughMesh.material.forEach((m) => m.dispose());
      } else {
        this.ripTroughMesh.material.dispose();
      }
    }

    if (this.ripJetPoints) {
      this.ripJetPoints.geometry.dispose();
      if (Array.isArray(this.ripJetPoints.material)) {
        this.ripJetPoints.material.forEach((m) => m.dispose());
      } else {
        this.ripJetPoints.material.dispose();
      }
    }

    // 6. Offshore plume cleanup (Phase 2)
    if (this.plumeFanMesh) {
      this.plumeFanMesh.geometry.dispose();
      if (Array.isArray(this.plumeFanMesh.material)) {
        this.plumeFanMesh.material.forEach((m) => m.dispose());
      } else {
        this.plumeFanMesh.material.dispose();
      }
    }

    this.plumeCirculationLines.forEach((l) => {
      l.geometry.dispose();
      if (Array.isArray(l.material)) l.material.forEach((m) => m.dispose());
      else l.material.dispose();
    });
    this.plumeCirculationLines = [];

    if (this.plumePoints) {
      this.plumePoints.geometry.dispose();
      if (Array.isArray(this.plumePoints.material)) {
        this.plumePoints.material.forEach((m) => m.dispose());
      } else {
        this.plumePoints.material.dispose();
      }
    }

    this.vectorGroup.clear();
    this.dyeGroup.clear();
    this.tideGaugeGroup.clear();
    this.feederGroup.clear();
    this.ripCorridorGroup.clear();
    this.offshorePlumeGroup.clear();
    this.group.clear();
  }
}
