import * as THREE from 'three';
import { Beach } from '../models/Beach';

import { RealShorelineProvider } from '../terrain/RealShorelineProvider';
import { BathymetryElevationProvider } from '../terrain/BathymetryElevationProvider';

/**
 * BeachTerrain.ts
 * 
 * Generates the realistic 3D coastal topography:
 * - Natural golden sand gradients and damp intertidal swash zone
 * - Curving shoreline matching the coastal bathymetry of Rushikonda / Suryalanka
 * - Undulating sand dunes in the backshore with coastal vegetation
 * - Rocky headlands framing the bay on both flanks
 * - Essential coastal landmarks: Lifeguard watchtower, warning flagpoles, beach umbrellas
 */
export class BeachTerrain {
  public mesh: THREE.Mesh;
  public landmarksGroup: THREE.Group;
  private texture: THREE.CanvasTexture | null = null;

  constructor(beach?: Beach) {
    const { mesh, texture } = this.createTerrainMesh(beach);
    this.mesh = mesh;
    this.texture = texture;
    this.landmarksGroup = this.createCoastalLandmarks();
  }

  /**
   * Evaluates calibrated real-world shoreline offset Z for a given X coordinate
   */
  public static getShorelineZ(x: number): number {
    return RealShorelineProvider.getInstance().getShorelineZ(x);
  }

  /**
   * Legacy procedural shoreline formula (available for fallback & diagnostic comparison)
   */
  public static getLegacyShorelineZ(x: number): number {
    return 10 * Math.sin(x / 40) + 4 * Math.cos(x / 20) - 2;
  }

  /**
   * Computes calibrated terrain elevation Y and underwater seabed bathymetry for any (x, z) position
   */
  public static getElevation(x: number, z: number): number {
    return BathymetryElevationProvider.getInstance().getElevation(x, z);
  }

  /**
   * Legacy procedural elevation formula (available for fallback & diagnostic comparison)
   */
  public static getLegacyElevation(x: number, z: number): number {
    const shoreZ = BeachTerrain.getLegacyShorelineZ(x);
    const distFromShore = z - shoreZ;

    let elevation = 0;

    // A. Ocean bed (z < shoreZ)
    if (distFromShore < 0) {
      const depthFactor = Math.abs(distFromShore);
      elevation = -Math.pow(depthFactor, 0.72) * 0.45;
      elevation += 0.35 * Math.sin(distFromShore / 4.5) * Math.cos(x / 15);
      if (elevation < -22) elevation = -22;
    }
    // B. Intertidal Swash Zone (0 <= distFromShore <= 15)
    else if (distFromShore <= 15) {
      elevation = (distFromShore / 15) * 1.2;
    }
    // C. Dry Sand & Dunes (distFromShore > 15)
    else {
      const inland = distFromShore - 15;
      elevation = 1.2 + inland * 0.08;

      if (inland > 18) {
        const duneDist = inland - 18;
        elevation += Math.sin(duneDist / 9) * 2.8 + Math.cos(x / 14) * 1.8;
        if (duneDist > 25) {
          elevation += Math.min((duneDist - 25) * 0.25, 6.0);
        }
      }
    }

    // D. Rocky Coastal Headlands / Bluffs on left and right flanks
    const absX = Math.abs(x);
    if (absX > 65) {
      const cliffFactor = (absX - 65) / 35;
      const cliffHeight = Math.pow(Math.min(cliffFactor, 1.4), 1.6) * 18;
      const forwardPush = Math.max(0, 1 - (distFromShore + 20) / 40);
      elevation += cliffHeight * (0.7 + 0.3 * Math.sin(z / 8) * Math.cos(x / 6)) + forwardPush * 4;
    }

    return elevation;
  }

  /**
   * Builds the procedural 3D terrain mesh and high-resolution texture
   */
  private createTerrainMesh(_beach?: Beach): { mesh: THREE.Mesh; texture: THREE.CanvasTexture } {
    const width = 240;
    const depth = 200;
    const segmentsX = 140;
    const segmentsZ = 120;

    const geometry = new THREE.PlaneGeometry(width, depth, segmentsX, segmentsZ);
    // Rotate plane so it lies horizontally in X-Z space (Y up)
    geometry.rotateX(-Math.PI / 2);

    const posAttr = geometry.attributes.position;
    const vertex = new THREE.Vector3();

    for (let i = 0; i < posAttr.count; i++) {
      vertex.fromBufferAttribute(posAttr, i);
      vertex.y = BeachTerrain.getElevation(vertex.x, vertex.z);
      posAttr.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    geometry.computeVertexNormals();

    // Generate high-resolution procedural coastal canvas texture
    const texture = this.generateCoastalTexture();
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.88,
      metalness: 0.05,
      flatShading: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.castShadow = false;

    return { mesh, texture };
  }

  /**
   * Generates a 1024x1024 procedural texture representing sand, wet swash, dunes, and rocks
   */
  private generateCoastalTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return new THREE.CanvasTexture(canvas);
    }

    // Map canvas: Y from 0 (seaward Z = -100) to 1024 (inland Z = +100)
    // X from 0 (west X = -120) to 1024 (east X = +120)

    // Base background: Deep ocean shelf
    ctx.fillStyle = '#1e3852';
    ctx.fillRect(0, 0, 1024, 1024);

    // Render horizontal zones
    const imgData = ctx.createImageData(1024, 1024);
    const data = imgData.data;

    for (let py = 0; py < 1024; py++) {
      // Convert pixel Y to 3D Z: py=0 is z=-100, py=1023 is z=+100
      const z = -100 + (py / 1023) * 200;

      for (let px = 0; px < 1024; px++) {
        // Convert pixel X to 3D X: px=0 is x=-120, px=1023 is x=+120
        const x = -120 + (px / 1023) * 240;
        const shoreZ = BeachTerrain.getShorelineZ(x);
        const distFromShore = z - shoreZ;
        const absX = Math.abs(x);

        let r = 238, g = 218, b = 162; // Default golden sand

        // 1. Rocky headlands on flanks
        if (absX > 65) {
          const cliffFactor = Math.min(1.0, (absX - 65) / 30);
          // Dark granitic coastal rock with patch of green coastal scrub
          const rockNoise = Math.sin(px * 0.1) * Math.cos(py * 0.1);
          if (rockNoise > 0.2 && distFromShore > -10) {
            // Coastal scrub/vegetation
            r = 75; g = 105; b = 35;
          } else {
            // Granite cliff
            r = 85 + Math.floor(rockNoise * 15);
            g = 95 + Math.floor(rockNoise * 15);
            b = 105 + Math.floor(rockNoise * 15);
          }
          // Blend with sand/bed
          const blend = cliffFactor;
          const defaultR = 238, defaultG = 218, defaultB = 162;
          r = Math.floor(defaultR * (1 - blend) + r * blend);
          g = Math.floor(defaultG * (1 - blend) + g * blend);
          b = Math.floor(defaultB * (1 - blend) + b * blend);
        }
        // 2. Underwater ocean floor
        else if (distFromShore < 0) {
          const depthRatio = Math.min(1.0, Math.abs(distFromShore) / 70);
          // Shallows: cyan-tinted sand (#89b8b0) fading to deep blue shelf (#1e3852)
          r = Math.floor(137 * (1 - depthRatio) + 30 * depthRatio);
          g = Math.floor(184 * (1 - depthRatio) + 56 * depthRatio);
          b = Math.floor(176 * (1 - depthRatio) + 82 * depthRatio);
        }
        // 3. Wet intertidal swash zone (0 to 12m)
        else if (distFromShore <= 12) {
          const wetFactor = 1.0 - (distFromShore / 12);
          // Wet sand is darker, glossy amber-brown (#ba8e50)
          r = Math.floor(238 * (1 - wetFactor * 0.35));
          g = Math.floor(218 * (1 - wetFactor * 0.42));
          b = Math.floor(162 * (1 - wetFactor * 0.52));
        }
        // 4. Upper dry sand & coastal dunes (distFromShore > 12)
        else {
          const duneRatio = Math.min(1.0, (distFromShore - 12) / 60);
          // Warm sunlit golden sand
          r = 245; g = 225; b = 175;

          // Back dunes with patches of spinifex/marram grass
          if (distFromShore > 35) {
            const grassNoise = Math.sin(x * 0.25) * Math.cos(z * 0.25) + Math.sin(x * 0.08 + z * 0.12);
            if (grassNoise > 0.4) {
              // Coastal vegetation clumps
              r = 102; g = 138; b = 58;
            } else {
              // Pale dry dune sand
              r = 250; g = 235; b = 195;
            }
          }
        }

        // Add subtle natural sand grain micro-noise
        const grain = (Math.sin(px * 1.5) + Math.cos(py * 1.5)) * 3;
        r = Math.min(255, Math.max(0, r + grain));
        g = Math.min(255, Math.max(0, g + grain));
        b = Math.min(255, Math.max(0, b + grain));

        const idx = (py * 1024 + px) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Adds lightweight low-poly coastal landmarks for scale and realism:
   * - Lifeguard tower
   * - Warning safety flags
   * - Beach umbrellas and loungers
   */
  private createCoastalLandmarks(): THREE.Group {
    const group = new THREE.Group();

    // 1. Lifeguard Watchtower
    const towerX = 15;
    const towerZ = BeachTerrain.getShorelineZ(towerX) + 16;
    const towerY = BeachTerrain.getElevation(towerX, towerZ);

    const towerGroup = new THREE.Group();
    towerGroup.position.set(towerX, towerY, towerZ);

    // Stilts / Legs
    const stiltMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 });
    const stiltGeo = new THREE.CylinderGeometry(0.12, 0.12, 4.2);
    const legOffsets = [
      [-1.2, -1.2],
      [1.2, -1.2],
      [-1.2, 1.2],
      [1.2, 1.2],
    ];
    legOffsets.forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(stiltGeo, stiltMat);
      leg.position.set(lx, 2.1, lz);
      towerGroup.add(leg);
    });

    // Cabin platform & roof
    const cabinGeo = new THREE.BoxGeometry(2.8, 2.0, 2.8);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 4.8, 0);
    towerGroup.add(cabin);

    // Red roof
    const roofGeo = new THREE.ConeGeometry(2.3, 1.0, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 6.3, 0);
    towerGroup.add(roof);

    // Lifeguard Flag on Tower
    const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.2);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
    const flagPole = new THREE.Mesh(poleGeo, poleMat);
    flagPole.position.set(1.4, 7.0, 0);
    towerGroup.add(flagPole);

    // Red & Yellow Beach Safety Flag
    const flagGeo = new THREE.PlaneGeometry(1.0, 0.6);
    const flagMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide });
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(1.9, 7.8, 0);
    towerGroup.add(flag);

    group.add(towerGroup);

    // 2. Beach Umbrellas & Loungers along safe sand zone
    const umbrellaMatRed = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4, side: THREE.DoubleSide });
    const umbrellaMatCyan = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.4, side: THREE.DoubleSide });
    const umbrellaMatAmber = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4, side: THREE.DoubleSide });
    const mats = [umbrellaMatRed, umbrellaMatCyan, umbrellaMatAmber];

    const umbrellaLocations = [
      { x: -35, offsetZ: 14 },
      { x: -28, offsetZ: 17 },
      { x: -20, offsetZ: 15 },
      { x: -10, offsetZ: 16 },
      { x: 30, offsetZ: 15 },
      { x: 38, offsetZ: 18 },
      { x: 45, offsetZ: 16 },
    ];

    umbrellaLocations.forEach((loc, idx) => {
      const uZ = BeachTerrain.getShorelineZ(loc.x) + loc.offsetZ;
      const uY = BeachTerrain.getElevation(loc.x, uZ);

      const uGroup = new THREE.Group();
      uGroup.position.set(loc.x, uY, uZ);

      // Pole
      const uPoleGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.4);
      const uPole = new THREE.Mesh(uPoleGeo, stiltMat);
      uPole.position.set(0, 1.2, 0);
      uGroup.add(uPole);

      // Canopy (cone)
      const canopyGeo = new THREE.ConeGeometry(1.6, 0.5, 12, 1, true);
      const canopy = new THREE.Mesh(canopyGeo, mats[idx % mats.length]);
      canopy.position.set(0, 2.3, 0);
      canopy.rotation.z = 0.08 * ((idx % 3) - 1);
      uGroup.add(canopy);

      // Sun lounger / mat
      const loungerGeo = new THREE.BoxGeometry(0.8, 0.1, 1.6);
      const loungerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
      const lounger = new THREE.Mesh(loungerGeo, loungerMat);
      lounger.position.set(0.6, 0.08, 0.4);
      lounger.rotation.y = 0.2;
      uGroup.add(lounger);

      group.add(uGroup);
    });

    // 3. Safety Zone Markers (Twin Red/Yellow Safe Swim Boundary Poles)
    const swimZoneXList = [-45, 50];
    swimZoneXList.forEach((szX) => {
      const szZ = BeachTerrain.getShorelineZ(szX) + 4;
      const szY = BeachTerrain.getElevation(szX, szZ);

      const poleG = new THREE.Group();
      poleG.position.set(szX, szY, szZ);

      const pMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.6), poleMat);
      pMesh.position.set(0, 1.8, 0);
      poleG.add(pMesh);

      const fMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.9, 0.55),
        new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide })
      );
      fMesh.position.set(0.5, 3.2, 0);
      poleG.add(fMesh);

      group.add(poleG);
    });

    return group;
  }

  /**
   * Memory cleanup
   */
  public dispose(): void {
    if (this.mesh.geometry) {
      this.mesh.geometry.dispose();
    }
    if (this.mesh.material instanceof THREE.Material) {
      this.mesh.material.dispose();
    }
    if (this.texture) {
      this.texture.dispose();
    }
    this.landmarksGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  }
}

