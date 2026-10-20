/**
 * src/scene3d/terrain/DepthContourVisual3D.ts
 * 
 * TIDES Milestone 15: 3D Depth Contours (Isobaths) & Terrain Visualizer.
 * 
 * Renders calibrated 3D bathymetric depth contours and terrain diagnostic overlays:
 * - 0.0m MSL Mean Shoreline (Bright White / Cyan)
 * - -1.0m Shallow Swash Limit (Sky Blue)
 * - -2.0m Inner Surf Zone Limit (Amber)
 * - -3.8m Submerged Reef & Rip Current Trench (Crimson Red)
 * - -5.0m Nearshore Shelf Break (Indigo)
 * - -10.0m Offshore Basin (Deep Blue)
 * 
 * Includes 3D depth station markers, floating indicator pips, and wireframe toggle.
 */

import * as THREE from 'three';
import { RUSHIKONDA_TERRAIN_PROFILE } from '../../terrain/TerrainDataProfile';
import { BathymetryElevationProvider } from '../../terrain/BathymetryElevationProvider';
import { RealShorelineProvider } from '../../terrain/RealShorelineProvider';

export class DepthContourVisual3D {
  public group: THREE.Group;
  private isVisible: boolean = false;
  private contourLines: THREE.Line[] = [];
  private pulseMaterials: THREE.LineBasicMaterial[] = [];
  private pulseClock: number = 0;
  private elevationProvider: BathymetryElevationProvider;
  private shorelineProvider: RealShorelineProvider;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'DepthContourVisual3DGroup';
    this.elevationProvider = BathymetryElevationProvider.getInstance();
    this.shorelineProvider = RealShorelineProvider.getInstance();

    this.buildContourSystem();
    this.setVisible(false);
  }

  public setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.group.visible = visible;
  }

  public getVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Generates the 3D contour line geometries across the calibrated bathymetry
   */
  private buildContourSystem(): void {
    const isobaths = RUSHIKONDA_TERRAIN_PROFILE.isobaths;

    for (const isobath of isobaths) {
      const targetElev = -isobath.depthMeters; // In Three.js, depth below MSL is negative Y
      const line = this.generateIsobathLine(targetElev, isobath.colorHex);
      if (line) {
        this.contourLines.push(line);
        this.group.add(line);
      }
    }

    // Add 3D Depth Station Marker Posts along the central cross-shore axis (x = 0)
    this.buildDepthStationMarkers();
  }

  /**
   * Traces an isobath contour across alongshore X coordinates from -100 to +100
   */
  private generateIsobathLine(targetElevation: number, colorHex: string): THREE.Line | null {
    const points: THREE.Vector3[] = [];
    const minX = -105;
    const maxX = 105;
    const steps = 140;
    const dx = (maxX - minX) / steps;

    for (let i = 0; i <= steps; i++) {
      const x = minX + i * dx;
      const shoreZ = this.shorelineProvider.getShorelineZ(x);

      // Binary search / secant search to find Z where elevation ≈ targetElevation
      // For depth (targetElevation <= 0), search seaward (z <= shoreZ)
      let foundZ: number;

      if (targetElevation === 0) {
        foundZ = shoreZ;
      } else {
        // Search seaward from shoreZ down to shoreZ - 85
        let lowZ = shoreZ - 85;
        let highZ = shoreZ;
        let bestZ = lowZ;
        let minDiff = Infinity;

        // Discrete search with fine stepping
        for (let zScan = highZ; zScan >= lowZ; zScan -= 0.5) {
          const elev = this.elevationProvider.getElevation(x, zScan);
          const diff = Math.abs(elev - targetElevation);
          if (diff < minDiff) {
            minDiff = diff;
            bestZ = zScan;
          }
        }
        foundZ = bestZ;
      }

      // Elevate slightly (+0.08) to prevent z-fighting with terrain surface
      const y = this.elevationProvider.getElevation(x, foundZ) + 0.12;
      points.push(new THREE.Vector3(x, y, foundZ));
    }

    if (points.length < 2) return null;

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color(colorHex),
      linewidth: targetElevation === 0 ? 3 : 2,
      transparent: true,
      opacity: 0.88,
      depthTest: true,
    });

    this.pulseMaterials.push(material);
    return new THREE.Line(geometry, material);
  }

  /**
   * Builds distinct depth station beacons at key isobaths along the central beach axis
   */
  private buildDepthStationMarkers(): void {
    const stations = [
      { depth: 0.0, label: '0m MSL', color: 0xffffff, x: 0 },
      { depth: 1.0, label: '-1.0m', color: 0x38bdf8, x: 0 },
      { depth: 2.0, label: '-2.0m', color: 0xfbbf24, x: 0 },
      { depth: 3.8, label: '-3.8m TRENCH', color: 0xef4444, x: 35.5 }, // Located at rip channel
      { depth: 5.0, label: '-5.0m', color: 0x818cf8, x: 0 },
    ];

    for (const st of stations) {
      const shoreZ = this.shorelineProvider.getShorelineZ(st.x);
      // Find Z position
      let targetZ = shoreZ;
      if (st.depth > 0) {
        for (let zScan = shoreZ; zScan >= shoreZ - 70; zScan -= 0.5) {
          const elev = this.elevationProvider.getElevation(st.x, zScan);
          if (Math.abs(elev - (-st.depth)) < 0.25) {
            targetZ = zScan;
            break;
          }
        }
      }

      const y = this.elevationProvider.getElevation(st.x, targetZ);

      // Marker post
      const postGeom = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8);
      const postMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        metalness: 0.8,
        roughness: 0.2,
      });
      const post = new THREE.Mesh(postGeom, postMat);
      post.position.set(st.x, y + 0.6, targetZ);
      this.group.add(post);

      // Glowing floating orb on top
      const orbGeom = new THREE.SphereGeometry(0.24, 12, 12);
      const orbMat = new THREE.MeshBasicMaterial({
        color: st.color,
        wireframe: false,
      });
      const orb = new THREE.Mesh(orbGeom, orbMat);
      orb.position.set(st.x, y + 1.25, targetZ);
      this.group.add(orb);
    }
  }

  /**
   * Per-frame animation update (subtle pulsation for hazardous trench contour)
   */
  public update(delta: number): void {
    if (!this.isVisible) return;

    this.pulseClock += delta * 2.5;
    const pulseFactor = 0.75 + 0.25 * Math.sin(this.pulseClock);

    // Trench material is at index 3 (-3.8m contour)
    if (this.pulseMaterials.length > 3) {
      this.pulseMaterials[3].opacity = pulseFactor;
    }
  }

  public dispose(): void {
    this.contourLines.forEach((line) => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    });
    this.contourLines = [];
    this.pulseMaterials = [];

    while (this.group.children.length > 0) {
      const obj = this.group.children[0];
      this.group.remove(obj);
      if ((obj as any).geometry) (obj as any).geometry.dispose();
      if ((obj as any).material) {
        if (Array.isArray((obj as any).material)) {
          (obj as any).material.forEach((m: THREE.Material) => m.dispose());
        } else {
          (obj as any).material.dispose();
        }
      }
    }
  }
}

