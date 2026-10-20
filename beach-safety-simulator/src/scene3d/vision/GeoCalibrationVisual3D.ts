import * as THREE from 'three';
import { GeoControlPointRegistry, GeoControlPoint } from '../../geospatial/GeoControlPointRegistry';
import { BeachTerrain } from '../BeachTerrain';

/**
 * GeoCalibrationVisual3D.ts
 * 
 * 3D visual overlay for TIDES Geographic Calibration:
 * - 3D marker pins at each surveyed Ground Control Point (GCP)
 * - Color-coded status beacons (Verified, Checkpoint, Datum)
 * - Alongshore curved geodesic reference line (~1,008m shoreline crescent)
 * - Highly optimized procedural geometry with clean lifecycle disposal
 */
export class GeoCalibrationVisual3D {
  public group: THREE.Group;
  private isVisible: boolean = false;
  private pinsGroup: THREE.Group;
  private shorelineLine: THREE.Line | null = null;
  private beaconClock: number = 0;
  private beaconMaterials: THREE.MeshBasicMaterial[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'GeoCalibrationVisuals';
    this.pinsGroup = new THREE.Group();
    this.group.add(this.pinsGroup);

    this.buildControlPointPins();
    this.buildAlongshoreReferenceLine();

    // Default to hidden until toggled by operator
    this.group.visible = false;
  }

  public setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.group.visible = visible;
  }

  public getVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Constructs 3D survey marker pins at each control point's position.
   */
  private buildControlPointPins(): void {
    const registry = GeoControlPointRegistry.getInstance();
    const points = registry.getAllControlPoints();

    const pinStemGeo = new THREE.CylinderGeometry(0.12, 0.04, 3.5, 8);
    pinStemGeo.translate(0, 1.75, 0); // Origin at pin base
    const pinStemMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      metalness: 0.85,
      roughness: 0.25,
    });

    const headGeo = new THREE.SphereGeometry(0.55, 16, 16);

    for (const cp of points) {
      const pinGroup = new THREE.Group();
      pinGroup.name = `Pin_${cp.id}`;

      // 1. Slender metallic stem
      const stemMesh = new THREE.Mesh(pinStemGeo, pinStemMat);
      pinGroup.add(stemMesh);

      // 2. Color-coded beacon sphere
      let beaconColor = 0x10b981; // Green for verified
      if (cp.verificationStatus === 'INDEPENDENT_CHECKPOINT') {
        beaconColor = 0x06b6d4; // Cyan for check points
      } else if (cp.category === 'PROMENADE_DATUM') {
        beaconColor = 0xf59e0b; // Gold for central datum
      } else if (cp.category === 'HAZARD_FEATURE') {
        beaconColor = 0xef4444; // Red for rip channel
      }

      const beaconMat = new THREE.MeshBasicMaterial({
        color: beaconColor,
      });
      this.beaconMaterials.push(beaconMat);

      const headMesh = new THREE.Mesh(headGeo, beaconMat);
      headMesh.position.y = 3.5;
      pinGroup.add(headMesh);

      // 3. Ground target ring
      const ringGeo = new THREE.RingGeometry(0.4, 0.9, 16);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: beaconColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.y = 0.05;
      pinGroup.add(ringMesh);

      // Position pin at control point 3D coordinates
      // Y elevation clamped to actual terrain elevation at that (x, z)
      const terrainElev = BeachTerrain.getElevation(cp.local3DPosition.x, cp.local3DPosition.z);
      pinGroup.position.set(cp.local3DPosition.x, terrainElev, cp.local3DPosition.z);

      this.pinsGroup.add(pinGroup);
    }
  }

  /**
   * Constructs the alongshore curved geodesic reference line connecting shoreline points.
   */
  private buildAlongshoreReferenceLine(): void {
    const registry = GeoControlPointRegistry.getInstance();
    const points = registry.getAllControlPoints();

    // Sort alongshore by X coordinate (South to North)
    const sorted = [...points].sort((a, b) => a.local3DPosition.x - b.local3DPosition.x);

    const curvePoints: THREE.Vector3[] = [];
    for (const cp of sorted) {
      const elev = BeachTerrain.getElevation(cp.local3DPosition.x, cp.local3DPosition.z);
      curvePoints.push(new THREE.Vector3(cp.local3DPosition.x, elev + 0.4, cp.local3DPosition.z));
    }

    if (curvePoints.length >= 2) {
      const curve = new THREE.CatmullRomCurve3(curvePoints);
      const sampled = curve.getPoints(80);

      const lineGeo = new THREE.BufferGeometry().setFromPoints(sampled);
      const lineMat = new THREE.LineDashedMaterial({
        color: 0x06b6d4,
        dashSize: 2.5,
        gapSize: 1.2,
        linewidth: 2,
      });

      this.shorelineLine = new THREE.Line(lineGeo, lineMat);
      this.shorelineLine.computeLineDistances();
      this.group.add(this.shorelineLine);
    }
  }

  /**
   * Animates pulsing beacon glow.
   */
  public update(delta: number): void {
    if (!this.isVisible) return;
    this.beaconClock += delta;
    const pulse = 0.75 + 0.25 * Math.sin(this.beaconClock * 4.0);

    for (let i = 0; i < this.beaconMaterials.length; i++) {
      this.beaconMaterials[i].opacity = pulse;
    }
  }

  public dispose(): void {
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
    this.beaconMaterials.forEach((m) => m.dispose());
    this.beaconMaterials = [];
  }
}

