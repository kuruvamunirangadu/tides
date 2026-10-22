import * as THREE from 'three';
import { Visitor } from '../../models/Visitor';
import { CharacterAppearance, CharacterRoleState3D, HumanoidJoints, Visitor3DTransform } from './visitor3d.types';
import { VisitorModelLoader } from './VisitorModelLoader';
import { VisitorAnimationController } from './VisitorAnimationController';

/**
 * VisitorCharacter3D.ts
 * 
 * Manages an individual 3D humanoid character in the scene:
 * - Persistent identity linked to simulation visitor ID
 * - Smooth positional and rotational interpolation (zero teleporting)
 * - Articulated kinematic skeletal joints with human body proportions
 * - Overhead 3D status billboard badges (Normal, Caution, Distress)
 * - Dynamic water splashing froth rings & vertical locator beam during distress
 * - Selection highlight ring for interactive inspection & camera framing
 * - Clean lifecycle disposal
 */
export class VisitorCharacter3D {
  public readonly id: string;
  public readonly root: THREE.Group;
  public readonly joints: HumanoidJoints;
  public readonly appearance: CharacterAppearance;

  private animationController: VisitorAnimationController;
  private currentYaw: number = 0;
  private isInitialized: boolean = false;

  // Visual cues & overhead indicators
  private overheadSprite: THREE.Sprite | null = null;
  private currentBadgeState: string = '';
  private splashRings: THREE.Mesh[] = [];
  private splashGroup: THREE.Group;
  private locatorBeam: THREE.Mesh | null = null;
  private selectionRing: THREE.Mesh | null = null;
  private orangeLocatorRing: THREE.Mesh | null = null;

  private pulseClock: number = Math.random() * Math.PI * 2;
  public static showBadgesGlobally: boolean = true;

  constructor(visitor: Visitor) {
    this.id = visitor.id;
    this.appearance = VisitorModelLoader.deriveAppearance(visitor);

    const { root, joints } = VisitorModelLoader.createHumanoid(this.appearance);
    this.root = root;
    this.joints = joints;
    this.animationController = new VisitorAnimationController();

    // Tag root for raycasting
    this.root.userData = {
      type: 'SWIMMER',
      visitorId: this.id,
      visitorName: (visitor as any).name || `Swimmer #${this.id.slice(-4)}`,
    };

    // 1. Water Splash / Ripple System (active during water distress)
    this.splashGroup = new THREE.Group();
    this.splashGroup.visible = false;
    this.root.add(this.splashGroup);

    const ringGeo = new THREE.RingGeometry(0.35, 0.55, 24);
    ringGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < 2; i++) {
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(0, 0.05, 0);
      this.splashRings.push(ring);
      this.splashGroup.add(ring);
    }

    // 2. Vertical Emergency Locator Beacon Beam (active during distress)
    const beamGeo = new THREE.CylinderGeometry(0.32, 0.55, 6.0, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.locatorBeam = new THREE.Mesh(beamGeo, beamMat);
    this.locatorBeam.position.set(0, 3.0, 0);
    this.locatorBeam.visible = false;
    this.root.add(this.locatorBeam);

    // 3. Selection Indicator Ring
    const selGeo = new THREE.RingGeometry(0.65, 0.82, 32);
    selGeo.rotateX(-Math.PI / 2);
    const selMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.selectionRing = new THREE.Mesh(selGeo, selMat);
    this.selectionRing.position.set(0, 0.04, 0);
    this.selectionRing.visible = false;
    this.root.add(this.selectionRing);

    // 3b. Orange Locator Ring (active when person is suffocating or in orange distress)
    const orangeGeo = new THREE.RingGeometry(1.1, 1.5, 32);
    orangeGeo.rotateX(-Math.PI / 2);
    const orangeMat = new THREE.MeshBasicMaterial({
      color: 0xf97316, // Vivid Safety Orange
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.orangeLocatorRing = new THREE.Mesh(orangeGeo, orangeMat);
    this.orangeLocatorRing.position.set(0, 0.08, 0);
    this.orangeLocatorRing.visible = false;
    this.root.add(this.orangeLocatorRing);

    // 4. Overhead 3D Billboard Sprite Badge
    this.initOverheadBadge();
  }

  /**
   * Initializes or updates overhead sprite badge
   */
  private initOverheadBadge(): void {
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
    this.overheadSprite.scale.set(3.2, 0.8, 1.0);
    this.overheadSprite.position.set(0, 2.2, 0);
    this.root.add(this.overheadSprite);
  }

  /**
   * Renders high-visibility canvas badge based on role state
   */
  private updateBadgeTexture(role: CharacterRoleState3D, shortId: string, wristbandId?: string): void {
    if (typeof document === 'undefined' || !this.overheadSprite) return;
    const stateKey = `${role}-${shortId}-${wristbandId || ''}`;
    if (this.currentBadgeState === stateKey) return;
    this.currentBadgeState = stateKey;

    const canvas = (this.overheadSprite.material.map as THREE.CanvasTexture).image as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 256, 64);

    let bgColor = 'rgba(15, 23, 42, 0.85)';
    let borderColor = '#06b6d4';
    let textColor = '#ffffff';
    let label = `SWIMMER #${shortId}`;
    let icon = '🏊';

    if (role === 'SUFFOCATING_ORANGE') {
      bgColor = 'rgba(234, 88, 12, 0.96)'; // Vivid Safety Orange
      borderColor = '#fde047'; // High-vis yellow border
      textColor = '#ffffff';
      label = wristbandId ? `⚠️ [${wristbandId}] SUFFOCATING` : `⚠️ SUFFOCATING #${shortId}`;
      icon = '🦺';
    } else if (role === 'DISTRESS') {
      bgColor = 'rgba(239, 68, 68, 0.95)';
      borderColor = '#fef08a';
      textColor = '#ffffff';
      label = `SOS DISTRESS #${shortId}`;
      icon = '🚨';
    } else if (role === 'CAUTION') {
      bgColor = 'rgba(245, 158, 11, 0.92)';
      borderColor = '#fbbf24';
      textColor = '#0f172a';
      label = `CAUTION CURRENT #${shortId}`;
      icon = '⚠️';
    } else if (role === 'RESCUED') {
      bgColor = 'rgba(16, 185, 129, 0.92)';
      borderColor = '#34d399';
      textColor = '#ffffff';
      label = `SECURED #${shortId}`;
      icon = '🛡️';
    }

    // Rounded pill
    ctx.fillStyle = bgColor;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(8, 8, 240, 48, 24);
    ctx.fill();
    ctx.stroke();

    // Text & icon
    ctx.fillStyle = textColor;
    ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${icon} ${label}`, 128, 32);

    (this.overheadSprite.material.map as THREE.CanvasTexture).needsUpdate = true;
  }

  /**
   * Updates position, heading, kinematics, and visual cues
   */
  public update(delta: number, transform: Visitor3DTransform): void {
    this.pulseClock += delta * 4.0;

    if (!this.isInitialized) {
      this.root.position.set(transform.x, transform.y, transform.z);
      this.currentYaw = transform.rotationY;
      this.root.rotation.y = this.currentYaw;
      this.isInitialized = true;
    } else {
      // Smooth positional lerp (avoids simulation tick jitter)
      const lerpSpeed = Math.min(1.0, delta * 12.0);
      this.root.position.x += (transform.x - this.root.position.x) * lerpSpeed;
      this.root.position.y += (transform.y - this.root.position.y) * lerpSpeed;
      this.root.position.z += (transform.z - this.root.position.z) * lerpSpeed;

      // Smooth shortest-arc yaw rotation
      let diff = transform.rotationY - this.currentYaw;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.currentYaw += diff * Math.min(1.0, delta * 8.0);
      this.root.rotation.y = this.currentYaw;
    }

    // Kinematic skeletal animation
    this.animationController.update(
      this.joints,
      transform.animationState,
      transform.speed,
      delta
    );

    // Update Overhead Badge
    const role = transform.roleState || (transform.distress ? 'DISTRESS' : 'NORMAL');
    const shortId = this.id.slice(-4);
    const isOrange = role === 'SUFFOCATING_ORANGE' || Boolean(transform.isSuffocating) || Boolean(transform.isOrangeAlert);
    this.updateBadgeTexture(role, shortId, transform.wristbandId);

    if (this.overheadSprite) {
      this.overheadSprite.visible =
        VisitorCharacter3D.showBadgesGlobally &&
        (role === 'DISTRESS' || role === 'SUFFOCATING_ORANGE' || role === 'CAUTION' || transform.inWater);

      // In distress / orange suffocating state, pulse badge scale
      if (role === 'DISTRESS' || role === 'SUFFOCATING_ORANGE') {
        const pulse = 1.0 + Math.sin(this.pulseClock * 2.0) * 0.15;
        this.overheadSprite.scale.set(3.4 * pulse, 0.85 * pulse, 1.0);
        this.overheadSprite.position.y = 2.45 + Math.sin(this.pulseClock) * 0.08;
      } else {
        this.overheadSprite.scale.set(3.0, 0.75, 1.0);
        this.overheadSprite.position.y = 2.2;
      }
    }

    // Update Distress Visuals: Splashing foam & Emergency Locator Beam
    const isDistress = role === 'DISTRESS' || role === 'SUFFOCATING_ORANGE' || transform.distress;
    if (this.splashGroup) {
      this.splashGroup.visible = isDistress && transform.inWater;
      if (this.splashGroup.visible) {
        // Dynamic expanding splash ripples
        for (let i = 0; i < this.splashRings.length; i++) {
          const r = this.splashRings[i];
          const phase = (this.pulseClock * 0.8 + i * Math.PI) % (Math.PI * 2);
          const t = phase / (Math.PI * 2);
          const scale = 1.0 + t * 2.6;
          r.scale.set(scale, scale, 1.0);
          (r.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - t) * 0.75);
        }
      }
    }

    if (this.locatorBeam) {
      this.locatorBeam.visible = isDistress;
      if (isDistress) {
        const beamPulse = 0.35 + Math.sin(this.pulseClock * 3.0) * 0.2;
        const beamMat = this.locatorBeam.material as THREE.MeshBasicMaterial;
        beamMat.opacity = beamPulse;
        if (isOrange) {
          beamMat.color.setHex(0xf97316); // Vivid Safety Orange Beacon
        } else {
          beamMat.color.setHex(0xef4444); // Red Beacon
        }
      }
    }

    // Update Orange Locator Ring (Phase 2 Orange Highlight on Water Surface)
    if (this.orangeLocatorRing) {
      this.orangeLocatorRing.visible = isOrange;
      if (isOrange) {
        this.orangeLocatorRing.rotation.z += delta * 1.8;
        const oPulse = 1.0 + Math.sin(this.pulseClock * 2.5) * 0.25;
        this.orangeLocatorRing.scale.set(oPulse, oPulse, oPulse);
      }
    }

    // Update Selection Ring
    if (this.selectionRing) {
      this.selectionRing.visible = Boolean(transform.isSelected);
      if (this.selectionRing.visible) {
        this.selectionRing.rotation.z += delta * 1.5;
      }
    }
  }

  /**
   * Set selection highlight
   */
  public setSelected(selected: boolean): void {
    if (this.selectionRing) {
      this.selectionRing.visible = selected;
    }
  }

  /**
   * Clean up
   */
  public dispose(): void {
    if (this.overheadSprite) {
      (this.overheadSprite.material.map as THREE.Texture)?.dispose();
      this.overheadSprite.material.dispose();
    }
    this.splashRings.forEach((r) => {
      r.geometry.dispose();
      (r.material as THREE.Material).dispose();
    });
    if (this.locatorBeam) {
      this.locatorBeam.geometry.dispose();
      (this.locatorBeam.material as THREE.Material).dispose();
    }
    if (this.selectionRing) {
      this.selectionRing.geometry.dispose();
      (this.selectionRing.material as THREE.Material).dispose();
    }
    if (this.orangeLocatorRing) {
      this.orangeLocatorRing.geometry.dispose();
      (this.orangeLocatorRing.material as THREE.Material).dispose();
    }
    if (this.root.parent) {
      this.root.parent.remove(this.root);
    }
  }
}

