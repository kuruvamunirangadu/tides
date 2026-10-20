import * as THREE from 'three';
import { RescueResourceState3D } from './rescue.types';
import { VisitorModelLoader } from '../visitors/VisitorModelLoader';
import { VisitorAnimationController } from '../visitors/VisitorAnimationController';
import { HumanoidJoints } from '../visitors/visitor3d.types';

/**
 * Lifeguard3D.ts
 * 
 * 3D Beach Lifeguard Responder:
 * - Red & Yellow official surf lifesaving uniform
 * - Rescue torpedo flotation buoy (rescue can) attached to shoulder strap
 * - High-speed sprint locomotion on sand and wading through surf
 * - Direct assistance delivery gestures
 */
export class Lifeguard3D {
  public readonly group: THREE.Group;
  private joints: HumanoidJoints;
  private animationController: VisitorAnimationController;
  private rescueTube: THREE.Mesh;
  private overheadSprite: THREE.Sprite | null = null;
  private currentStatusText: string = '';

  constructor(resource: RescueResourceState3D) {
    this.group = new THREE.Group();

    // Lifeguard Appearance: Sun-bronzed skin, bright red & yellow uniform
    const appearance = {
      skinTone: 0xd4a373,
      swimwearColor: 0xef4444, // Lifeguard Red
      hairColor: 0x1c1917,
      capColor: 0xfacc15,      // Official Gold Cap
      scale: 1.08,
      gender: 'male' as const,
    };

    const { root, joints } = VisitorModelLoader.createHumanoid(appearance);
    this.group.add(root);
    this.joints = joints;
    this.animationController = new VisitorAnimationController();

    // Torpedo Flotation Rescue Can (Rescue Tube)
    const tubeGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.75, 8);
    tubeGeo.rotateZ(Math.PI / 2);
    const tubeMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 }); // High-visibility yellow
    this.rescueTube = new THREE.Mesh(tubeGeo, tubeMat);
    this.rescueTube.position.set(0.18, -0.22, 0.12);
    this.joints.rightForearm.add(this.rescueTube);

    this.group.position.set(resource.currentX, resource.currentY, resource.currentZ);
    this.group.rotation.y = resource.rotationY;

    this.group.userData = {
      type: 'LIFEGUARD',
      resourceId: resource.id,
      name: resource.name,
    };

    // Overhead Lifeguard Badge
    this.initOverheadBadge(resource);
  }

  private initOverheadBadge(resource: RescueResourceState3D): void {
    if (typeof document === 'undefined') return;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;

    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });

    this.overheadSprite = new THREE.Sprite(spriteMat);
    this.overheadSprite.scale.set(3.4, 0.85, 1.0);
    this.overheadSprite.position.set(0, 2.4, 0);
    this.group.add(this.overheadSprite);

    this.updateBadge(resource.name, resource.status);
  }

  private updateBadge(name: string, status: string): void {
    if (typeof document === 'undefined' || !this.overheadSprite) return;
    const key = `${name}-${status}`;
    if (this.currentStatusText === key) return;
    this.currentStatusText = key;

    const canvas = (this.overheadSprite.material.map as THREE.CanvasTexture).image as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 256, 64);

    let bgColor = 'rgba(239, 68, 68, 0.9)'; // Lifeguard red
    let borderColor = '#facc15';           // Lifeguard gold
    let textColor = '#ffffff';

    if (status === 'ON_SCENE' || status === 'ASSIGNED') {
      bgColor = 'rgba(234, 88, 12, 0.95)';
    }

    ctx.fillStyle = bgColor;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(8, 8, 240, 48, 24);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`🛡️ ${name} [${status}]`, 128, 32);

    (this.overheadSprite.material.map as THREE.CanvasTexture).needsUpdate = true;
  }

  public update(delta: number, state: RescueResourceState3D): void {
    this.group.position.set(state.currentX, state.currentY, state.currentZ);
    this.group.rotation.y = state.rotationY;

    const isMoving = state.status === 'EN_ROUTE' || state.status === 'RETURNING';
    const isAssisting = state.status === 'ON_SCENE';

    const animState = isAssisting
      ? 'distress'
      : isMoving
      ? state.currentZ < 0
        ? 'wade'
        : 'walk'
      : 'idle';

    this.animationController.update(
      this.joints,
      animState,
      isMoving ? 1.4 : 0.8,
      delta
    );

    this.updateBadge(state.name, state.status);
  }

  public dispose(): void {
    if (this.overheadSprite) {
      (this.overheadSprite.material.map as THREE.Texture)?.dispose();
      this.overheadSprite.material.dispose();
    }
    this.rescueTube.geometry.dispose();
    (this.rescueTube.material as THREE.Material).dispose();
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}

