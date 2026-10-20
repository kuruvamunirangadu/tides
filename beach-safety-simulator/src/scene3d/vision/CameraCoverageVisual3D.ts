import * as THREE from 'three';
import { Camera } from '../../vision/models/Camera';
import { DEFAULT_CAMERAS } from '../../vision/VisionConfig';
import { CameraCoverageGeometry } from '../../vision/cameras/CameraCoverageGeometry';

export class CameraCoverageVisual3D {
  public group: THREE.Group;
  private cameraMeshes: Map<string, THREE.Group> = new Map();
  private blindSpotMeshes: THREE.Group = new THREE.Group();
  private visible: boolean = false;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'CameraCoverageVisual3D';
    this.group.visible = false;
    this.group.add(this.blindSpotMeshes);

    this.initCameraVisuals(DEFAULT_CAMERAS);
  }

  private initCameraVisuals(cameras: Camera[]): void {
    cameras.forEach((cam) => {
      const camGroup = new THREE.Group();
      camGroup.name = `CamFrustum-${cam.id}`;

      // 1. Camera Tower Marker
      // Map 2D coords (x: 0..1000, y: 0..400) to 3D world (X: -250..250, Z: -150..150)
      const posX = (cam.position.x - 500) * 0.5;
      const posZ = (cam.position.y - 200) * 0.7;

      const poleGeo = new THREE.CylinderGeometry(0.4, 0.6, 8, 8);
      const poleMat = new THREE.MeshStandardMaterial({
        color: 0x475569,
        metalness: 0.8,
        roughness: 0.2,
      });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(posX, 4, posZ);
      camGroup.add(pole);

      // Camera Head
      const headGeo = new THREE.BoxGeometry(1.2, 0.8, 1.8);
      const headMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(cam.color || '#06b6d4'),
        roughness: 0.3,
      });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.set(posX, 8.2, posZ);
      head.rotation.y = -((cam.rotation - 90) * Math.PI) / 180;
      camGroup.add(head);

      // 2. Ground-plane FOV Cone Frustum
      const range3D = cam.range * 0.45;
      const fovRad = (cam.fieldOfView * Math.PI) / 180;
      const coneGeo = new THREE.ConeGeometry(range3D * Math.tan(fovRad / 2), range3D, 24, 1, true);
      const coneMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(cam.color || '#06b6d4'),
        transparent: true,
        opacity: 0.15,
        wireframe: false,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.rotation.x = Math.PI / 2;
      cone.position.set(posX, 0.2, posZ + range3D / 2);
      camGroup.add(cone);

      // Wireframe outline
      const wireMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(cam.color || '#06b6d4'),
        wireframe: true,
        transparent: true,
        opacity: 0.4,
      });
      const wire = new THREE.Mesh(coneGeo, wireMat);
      wire.rotation.x = Math.PI / 2;
      wire.position.set(posX, 0.25, posZ + range3D / 2);
      camGroup.add(wire);

      this.cameraMeshes.set(cam.id, camGroup);
      this.group.add(camGroup);
    });

    // 3. Deep Ocean Blind Spot Void Warning Plane (> 320m Y)
    const blindGeo = new THREE.PlaneGeometry(500, 50);
    const blindMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const blindMesh = new THREE.Mesh(blindGeo, blindMat);
    blindMesh.rotation.x = -Math.PI / 2;
    blindMesh.position.set(0, 0.3, (350 - 200) * 0.7);
    this.blindSpotMeshes.add(blindMesh);
  }

  public setVisible(show: boolean): void {
    this.visible = show;
    this.group.visible = show;
  }

  public isVisible(): boolean {
    return this.visible;
  }

  public update(cameras: Camera[]): void {
    if (!this.visible) return;

    // Update camera status visuals (e.g. offline turns red/hidden)
    cameras.forEach((cam) => {
      const mesh = this.cameraMeshes.get(cam.id);
      if (mesh) {
        mesh.visible = cam.status !== 'OFFLINE';
      }
    });
  }

  public dispose(): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (obj.geometry) obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else if (obj.material) {
          obj.material.dispose();
        }
      }
    });
  }
}

