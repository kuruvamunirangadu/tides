import * as THREE from 'three';
import { RescueResourceState3D } from './rescue.types';

/**
 * RescueBoat3D.ts
 * 
 * High-fidelity 3D coastal rescue watercraft:
 * - Deep-V rigid inflatable rescue boat (RIB) hull with orange emergency collar
 * - Center steering console, windshield, and overhead safety radar arch
 * - Twin outboard engines at the transom
 * - Navigation lights and flashing amber rescue beacon
 * - Dynamic animated water wake trailing behind the boat
 * - Hydrodynamic pitch and roll buoyancy bobbing
 */
export class RescueBoat3D {
  public readonly group: THREE.Group;
  private boatMeshGroup: THREE.Group;
  private beaconLight: THREE.PointLight;
  private wakeGroup: THREE.Group;
  private wakeRibbons: THREE.Mesh[] = [];

  private bobClock: number = 0;

  constructor() {
    this.group = new THREE.Group();
    this.boatMeshGroup = new THREE.Group();
    this.group.add(this.boatMeshGroup);

    // 1. Deep-V Hull
    const hullMatWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 });
    const hullMatRescue = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 }); // Safety Red/Orange
    const hullMatDark = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });

    // Main hull base
    const hullGeo = new THREE.ConeGeometry(1.3, 5.8, 4);
    hullGeo.rotateX(Math.PI / 2);
    hullGeo.scale(1.2, 0.4, 1.0);
    const hull = new THREE.Mesh(hullGeo, hullMatWhite);
    hull.position.set(0, 0.35, 0.4);
    hull.castShadow = true;
    this.boatMeshGroup.add(hull);

    // Inflatable Sponson Collar (Orange tubes around perimeter)
    const collarLeftGeo = new THREE.CylinderGeometry(0.22, 0.22, 5.2, 10);
    collarLeftGeo.rotateX(Math.PI / 2);
    const collarLeft = new THREE.Mesh(collarLeftGeo, hullMatRescue);
    collarLeft.position.set(-1.1, 0.55, 0);
    this.boatMeshGroup.add(collarLeft);

    const collarRight = new THREE.Mesh(collarLeftGeo, hullMatRescue);
    collarRight.position.set(1.1, 0.55, 0);
    this.boatMeshGroup.add(collarRight);

    // Bow collar tip
    const bowCollarGeo = new THREE.TorusGeometry(0.85, 0.22, 8, 12, Math.PI);
    bowCollarGeo.rotateX(Math.PI / 2);
    const bowCollar = new THREE.Mesh(bowCollarGeo, hullMatRescue);
    bowCollar.position.set(0, 0.55, 2.5);
    this.boatMeshGroup.add(bowCollar);

    // 2. Center Steering Console & Windshield
    const consoleGeo = new THREE.BoxGeometry(0.9, 1.1, 0.9);
    const consoleMesh = new THREE.Mesh(consoleGeo, hullMatWhite);
    consoleMesh.position.set(0, 1.0, 0.2);
    this.boatMeshGroup.add(consoleMesh);

    // Windshield
    const windshieldGeo = new THREE.BoxGeometry(0.85, 0.45, 0.1);
    const windshieldMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.65,
      roughness: 0.1,
    });
    const windshield = new THREE.Mesh(windshieldGeo, windshieldMat);
    windshield.position.set(0, 1.7, 0.4);
    this.boatMeshGroup.add(windshield);

    // 3. Overhead Radar & Safety Rollbar Arch
    const archMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });
    const archLegGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.8);
    const archLegL = new THREE.Mesh(archLegGeo, archMat);
    archLegL.position.set(-0.85, 1.5, -0.6);
    this.boatMeshGroup.add(archLegL);

    const archLegR = new THREE.Mesh(archLegGeo, archMat);
    archLegR.position.set(0.85, 1.5, -0.6);
    this.boatMeshGroup.add(archLegR);

    const archTopGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.75);
    archTopGeo.rotateZ(Math.PI / 2);
    const archTop = new THREE.Mesh(archTopGeo, archMat);
    archTop.position.set(0, 2.4, -0.6);
    this.boatMeshGroup.add(archTop);

    // 4. Emergency Flashing Amber Beacon
    const beaconGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.14);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(0, 2.52, -0.6);
    this.boatMeshGroup.add(beacon);

    this.beaconLight = new THREE.PointLight(0xf59e0b, 1.5, 18);
    this.beaconLight.position.set(0, 2.6, -0.6);
    this.boatMeshGroup.add(this.beaconLight);

    // 5. Twin Outboard Motors at Transom
    const engineGeo = new THREE.BoxGeometry(0.32, 0.75, 0.45);
    const engineL = new THREE.Mesh(engineGeo, hullMatDark);
    engineL.position.set(-0.45, 0.4, -2.6);
    this.boatMeshGroup.add(engineL);

    const engineR = new THREE.Mesh(engineGeo, hullMatDark);
    engineR.position.set(0.45, 0.4, -2.6);
    this.boatMeshGroup.add(engineR);

    // 6. Water Wake Ribbon System
    this.wakeGroup = new THREE.Group();
    this.group.add(this.wakeGroup);
    const wakeMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const wakeGeo = new THREE.PlaneGeometry(1.6, 6.0);
    wakeGeo.rotateX(-Math.PI / 2);
    const wakeMeshL = new THREE.Mesh(wakeGeo, wakeMat);
    wakeMeshL.position.set(-0.8, 0.02, -5.0);
    this.wakeRibbons.push(wakeMeshL);
    this.wakeGroup.add(wakeMeshL);

    const wakeMeshR = new THREE.Mesh(wakeGeo, wakeMat);
    wakeMeshR.position.set(0.8, 0.02, -5.0);
    this.wakeRibbons.push(wakeMeshR);
    this.wakeGroup.add(wakeMeshR);

    this.group.userData = {
      type: 'RESCUE_BOAT',
      resourceId: 'RB-01',
      name: 'Rescue Boat RB-01',
    };

    // 7. Overhead Tactical Marine Callout Badge
    this.initOverheadBadge();
  }

  private overheadSprite: THREE.Sprite | null = null;
  private currentStatusText: string = '';

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
    this.overheadSprite.scale.set(4.0, 1.0, 1.0);
    this.overheadSprite.position.set(0, 3.6, 0);
    this.group.add(this.overheadSprite);
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

    let bgColor = 'rgba(15, 23, 42, 0.9)';
    let borderColor = '#38bdf8';
    let textColor = '#ffffff';

    if (status === 'EN_ROUTE') {
      bgColor = 'rgba(234, 88, 12, 0.95)';
      borderColor = '#facc15';
    } else if (status === 'ON_SCENE') {
      bgColor = 'rgba(6, 182, 212, 0.95)';
      borderColor = '#67e8f9';
    } else if (status === 'AVAILABLE') {
      bgColor = 'rgba(16, 185, 129, 0.9)';
      borderColor = '#34d399';
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
    ctx.fillText(`🚤 ${name} [${status}]`, 128, 32);

    (this.overheadSprite.material.map as THREE.CanvasTexture).needsUpdate = true;
  }

  /**
   * Updates boat transform, wave bobbing, and wake animation
   */
  public update(delta: number, state: RescueResourceState3D): void {
    this.group.position.set(state.currentX, state.currentY, state.currentZ);
    this.group.rotation.y = state.rotationY;

    this.bobClock += delta * 3.5;

    // Pitch and roll buoyancy motion
    const isMoving = state.status === 'EN_ROUTE' || state.status === 'RETURNING';
    const pitch = isMoving ? -0.06 : Math.sin(this.bobClock * 0.8) * 0.03; // Bow rises under power
    const roll = Math.sin(this.bobClock * 1.2) * 0.04;
    const heave = Math.sin(this.bobClock) * 0.06;

    this.boatMeshGroup.rotation.x = pitch;
    this.boatMeshGroup.rotation.z = roll;
    this.boatMeshGroup.position.y = heave;

    // Flashing emergency beacon (rapid strobe when responding)
    if (isMoving || state.status === 'ON_SCENE') {
      const strobe = Math.sin(this.bobClock * 8.0) > 0.1 ? 2.5 : 0.2;
      this.beaconLight.intensity = strobe;
    } else {
      this.beaconLight.intensity = 0.4;
    }

    // Wake visibility & stretch
    this.wakeGroup.visible = isMoving;
    if (isMoving) {
      const wakePulse = 0.35 + Math.sin(this.bobClock * 4.0) * 0.15;
      this.wakeRibbons.forEach((m) => {
        (m.material as THREE.MeshBasicMaterial).opacity = wakePulse;
      });
    }

    this.updateBadge(state.name, state.status);
  }

  public dispose(): void {
    if (this.overheadSprite) {
      (this.overheadSprite.material.map as THREE.Texture)?.dispose();
      this.overheadSprite.material.dispose();
    }
    this.boatMeshGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    this.wakeRibbons.forEach((m) => {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });
    this.beaconLight.dispose();
  }
}

