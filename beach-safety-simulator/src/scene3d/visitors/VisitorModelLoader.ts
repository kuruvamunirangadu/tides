import * as THREE from 'three';
import { Visitor } from '../../models/Visitor';
import { CharacterAppearance, HumanoidJoints } from './visitor3d.types';

/**
 * VisitorModelLoader.ts
 * 
 * Generates and caches anatomically proportioned, multi-jointed 3D humanoid rigs:
 * - Shared geometry buffers for 60 FPS crowd rendering
 * - Diverse skin tones, hair colors, and colorful beachwear
 * - Proportional scaling for adults vs children
 * - Full articulated joint hierarchy: Head, Torso, Hips, Upper Arms, Forearms, Thighs, Calves
 */
export class VisitorModelLoader {
  // Shared geometry cache to avoid per-instance allocations
  private static headGeo: THREE.SphereGeometry | null = null;
  private static hairGeo: THREE.SphereGeometry | null = null;
  private static capGeo: THREE.SphereGeometry | null = null;
  private static torsoGeo: THREE.CylinderGeometry | null = null;
  private static pelvisGeo: THREE.CylinderGeometry | null = null;
  private static limbGeo: THREE.CylinderGeometry | null = null;
  private static footGeo: THREE.BoxGeometry | null = null;

  // Material caches
  private static skinMaterials: Map<number, THREE.MeshStandardMaterial> = new Map();
  private static hairMaterials: Map<number, THREE.MeshStandardMaterial> = new Map();
  private static capMaterials: Map<number, THREE.MeshStandardMaterial> = new Map();
  private static wearMaterials: Map<number, THREE.MeshStandardMaterial> = new Map();

  // Natural palette selections
  public static readonly SKIN_TONES = [
    0xd4a373, // Warm Tan
    0x8d5524, // Deep Bronze
    0xb88b4a, // Golden Olive
    0xf1c27d, // Fair Peach
    0x5a3d28, // Rich Umber
    0xc58c85, // Sunburnt Ruddy
  ];

  public static readonly HAIR_COLORS = [
    0x1c1917, // Jet Black
    0x3f2e1e, // Dark Brown
    0x713f12, // Auburn Brown
    0xa16207, // Sandy Blonde
    0x52525b, // Salt & Pepper Gray
  ];

  public static readonly CAP_COLORS = [
    0xfacc15, // High-Vis Yellow
    0xef4444, // Signal Red
    0x06b6d4, // Electric Cyan
    0x10b981, // Emerald Green
    0xffffff, // Pure White
    0xf97316, // Safety Orange
  ];

  public static readonly SWIMWEAR_COLORS = [
    0x06b6d4, // Cyan
    0xef4444, // Red
    0xf59e0b, // Amber
    0x2563eb, // Royal Blue
    0x10b981, // Emerald Green
    0xf43f5e, // Coral Pink
    0xfacc15, // Bright Yellow
    0x0f172a, // Classic Navy
    0x8b5cf6, // Purple
  ];

  private static initSharedGeometries(): void {
    if (this.headGeo) return;

    // Enhanced proportions: recognizable human silhouette from camera distance
    this.headGeo = new THREE.SphereGeometry(0.155, 12, 10);
    this.hairGeo = new THREE.SphereGeometry(0.162, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6);
    this.capGeo = new THREE.SphereGeometry(0.160, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
    this.torsoGeo = new THREE.CylinderGeometry(0.18, 0.15, 0.46, 10);
    this.pelvisGeo = new THREE.CylinderGeometry(0.16, 0.15, 0.24, 10);
    this.limbGeo = new THREE.CylinderGeometry(0.062, 0.052, 0.38, 8);
    this.footGeo = new THREE.BoxGeometry(0.10, 0.06, 0.20);
  }

  private static getMaterial(
    cache: Map<number, THREE.MeshStandardMaterial>,
    color: number,
    roughness: number = 0.6,
    emissiveBoost: boolean = false
  ): THREE.MeshStandardMaterial {
    let mat = cache.get(color);
    if (!mat) {
      mat = new THREE.MeshStandardMaterial({
        color,
        roughness,
        metalness: 0.05,
        emissive: emissiveBoost ? color : 0x000000,
        emissiveIntensity: emissiveBoost ? 0.18 : 0.0,
      });
      cache.set(color, mat);
    }
    return mat;
  }

  /**
   * Generates character appearance attributes from visitor attributes
   */
  public static deriveAppearance(visitor: Visitor): CharacterAppearance {
    // Generate deterministic pseudo-random index from visitor ID
    let hash = 0;
    for (let i = 0; i < visitor.id.length; i++) {
      hash = (hash << 5) - hash + visitor.id.charCodeAt(i);
      hash |= 0;
    }
    const absHash = Math.abs(hash);

    const skinTone = this.SKIN_TONES[absHash % this.SKIN_TONES.length];
    const hairColor = this.HAIR_COLORS[(absHash >> 3) % this.HAIR_COLORS.length];
    const capColor = this.CAP_COLORS[(absHash >> 2) % this.CAP_COLORS.length];

    // Parse visitor color if available or pick from vibrant beachwear palette
    let swimwearColor = this.SWIMWEAR_COLORS[(absHash >> 5) % this.SWIMWEAR_COLORS.length];
    if (visitor.color && visitor.color.startsWith('#')) {
      const parsed = parseInt(visitor.color.replace('#', '0x'), 16);
      if (!isNaN(parsed)) swimwearColor = parsed;
    }

    const isChild = visitor.type === 'CHILD';
    const scale = isChild ? 0.72 : 1.05 + ((absHash % 10) - 5) * 0.018;
    const gender = isChild ? 'child' : absHash % 2 === 0 ? 'male' : 'female';

    return {
      skinTone,
      swimwearColor,
      hairColor,
      capColor,
      scale,
      gender,
    };
  }

  /**
   * Builds an articulated 3D humanoid character
   */
  public static createHumanoid(appearance: CharacterAppearance): {
    root: THREE.Group;
    joints: HumanoidJoints;
  } {
    this.initSharedGeometries();

    const skinMat = this.getMaterial(this.skinMaterials, appearance.skinTone, 0.55);
    const hairMat = this.getMaterial(this.hairMaterials, appearance.hairColor, 0.85);
    const capMat = this.getMaterial(this.capMaterials, appearance.capColor, 0.45, true);
    const wearMat = this.getMaterial(this.wearMaterials, appearance.swimwearColor, 0.5, true);

    const root = new THREE.Group();
    root.scale.set(appearance.scale, appearance.scale, appearance.scale);

    // 1. Pelvis / Hips (Root pivot of the character)
    const pelvis = new THREE.Group();
    pelvis.position.set(0, 0.92, 0);
    const pelvisMesh = new THREE.Mesh(this.pelvisGeo!, wearMat);
    pelvisMesh.position.set(0, 0, 0);
    pelvisMesh.castShadow = true;
    pelvisMesh.receiveShadow = true;
    pelvis.add(pelvisMesh);
    root.add(pelvis);

    // 2. Torso (Spine / Chest)
    const torso = new THREE.Group();
    torso.position.set(0, 0.16, 0); // Pivoted on top of pelvis
    // Male: bare chest with skinMat, Female: swimsuit wearMat
    const torsoMat = appearance.gender === 'female' ? wearMat : skinMat;
    const torsoMesh = new THREE.Mesh(this.torsoGeo!, torsoMat);
    torsoMesh.position.set(0, 0.23, 0);
    torsoMesh.castShadow = true;
    torsoMesh.receiveShadow = true;
    torso.add(torsoMesh);
    pelvis.add(torso);

    // 3. Head & High-Visibility Cap / Hair
    const head = new THREE.Group();
    head.position.set(0, 0.50, 0); // Neck pivot
    const headMesh = new THREE.Mesh(this.headGeo!, skinMat);
    headMesh.position.set(0, 0.12, 0);
    headMesh.castShadow = true;
    head.add(headMesh);

    // High-visibility swim cap for marine contrast
    const capMesh = new THREE.Mesh(this.capGeo!, capMat);
    capMesh.position.set(0, 0.14, 0);
    capMesh.castShadow = true;
    head.add(capMesh);

    const hairMesh = new THREE.Mesh(this.hairGeo!, hairMat);
    hairMesh.position.set(0, 0.12, -0.02);
    hairMesh.scale.set(0.96, 0.96, 0.96);
    head.add(hairMesh);
    torso.add(head);

    // 4. Arms
    // Left Arm
    const leftUpperArm = new THREE.Group();
    leftUpperArm.position.set(-0.24, 0.38, 0); // Shoulder
    const leftUpperMesh = new THREE.Mesh(this.limbGeo!, skinMat);
    leftUpperMesh.position.set(0, -0.18, 0);
    leftUpperMesh.castShadow = true;
    leftUpperArm.add(leftUpperMesh);

    const leftForearm = new THREE.Group();
    leftForearm.position.set(0, -0.36, 0); // Elbow
    const leftForeMesh = new THREE.Mesh(this.limbGeo!, skinMat);
    leftForeMesh.position.set(0, -0.16, 0);
    leftForeMesh.scale.set(0.92, 0.88, 0.92);
    leftForeMesh.castShadow = true;
    leftForearm.add(leftForeMesh);
    leftUpperArm.add(leftForearm);
    torso.add(leftUpperArm);

    // Right Arm
    const rightUpperArm = new THREE.Group();
    rightUpperArm.position.set(0.24, 0.38, 0); // Shoulder
    const rightUpperMesh = new THREE.Mesh(this.limbGeo!, skinMat);
    rightUpperMesh.position.set(0, -0.18, 0);
    rightUpperMesh.castShadow = true;
    rightUpperArm.add(rightUpperMesh);

    const rightForearm = new THREE.Group();
    rightForearm.position.set(0, -0.36, 0); // Elbow
    const rightForeMesh = new THREE.Mesh(this.limbGeo!, skinMat);
    rightForeMesh.position.set(0, -0.16, 0);
    rightForeMesh.scale.set(0.92, 0.88, 0.92);
    rightForeMesh.castShadow = true;
    rightForearm.add(rightForeMesh);
    rightUpperArm.add(rightForearm);
    torso.add(rightUpperArm);

    // 5. Legs
    // Left Leg
    const leftThigh = new THREE.Group();
    leftThigh.position.set(-0.10, -0.11, 0); // Hip
    const leftThighMesh = new THREE.Mesh(this.limbGeo!, skinMat);
    leftThighMesh.position.set(0, -0.19, 0);
    leftThighMesh.scale.set(1.2, 1.0, 1.2);
    leftThighMesh.castShadow = true;
    leftThigh.add(leftThighMesh);

    const leftCalf = new THREE.Group();
    leftCalf.position.set(0, -0.38, 0); // Knee
    const leftCalfMesh = new THREE.Mesh(this.limbGeo!, skinMat);
    leftCalfMesh.position.set(0, -0.18, 0);
    leftCalfMesh.castShadow = true;
    leftCalf.add(leftCalfMesh);

    const leftFoot = new THREE.Mesh(this.footGeo!, skinMat);
    leftFoot.position.set(0, -0.38, 0.05);
    leftFoot.castShadow = true;
    leftCalf.add(leftFoot);

    leftThigh.add(leftCalf);
    pelvis.add(leftThigh);

    // Right Leg
    const rightThigh = new THREE.Group();
    rightThigh.position.set(0.10, -0.11, 0); // Hip
    const rightThighMesh = new THREE.Mesh(this.limbGeo!, skinMat);
    rightThighMesh.position.set(0, -0.19, 0);
    rightThighMesh.scale.set(1.2, 1.0, 1.2);
    rightThighMesh.castShadow = true;
    rightThigh.add(rightThighMesh);

    const rightCalf = new THREE.Group();
    rightCalf.position.set(0, -0.38, 0); // Knee
    const rightCalfMesh = new THREE.Mesh(this.limbGeo!, skinMat);
    rightCalfMesh.position.set(0, -0.18, 0);
    rightCalfMesh.castShadow = true;
    rightCalf.add(rightCalfMesh);

    const rightFoot = new THREE.Mesh(this.footGeo!, skinMat);
    rightFoot.position.set(0, -0.38, 0.05);
    rightFoot.castShadow = true;
    rightCalf.add(rightFoot);

    rightThigh.add(rightCalf);
    pelvis.add(rightThigh);

    const joints: HumanoidJoints = {
      root,
      pelvis,
      torso,
      head,
      leftUpperArm,
      leftForearm,
      rightUpperArm,
      rightForearm,
      leftThigh,
      leftCalf,
      rightThigh,
      rightCalf,
    };

    return { root, joints };
  }

  /**
   * Cleanup
   */
  public static dispose(): void {
    this.headGeo?.dispose();
    this.hairGeo?.dispose();
    this.capGeo?.dispose();
    this.torsoGeo?.dispose();
    this.pelvisGeo?.dispose();
    this.limbGeo?.dispose();
    this.footGeo?.dispose();

    this.headGeo = null;
    this.hairGeo = null;
    this.capGeo = null;
    this.torsoGeo = null;
    this.pelvisGeo = null;
    this.limbGeo = null;
    this.footGeo = null;

    this.skinMaterials.forEach((m) => m.dispose());
    this.hairMaterials.forEach((m) => m.dispose());
    this.capMaterials.forEach((m) => m.dispose());
    this.wearMaterials.forEach((m) => m.dispose());

    this.skinMaterials.clear();
    this.hairMaterials.clear();
    this.capMaterials.clear();
    this.wearMaterials.clear();
  }
}

