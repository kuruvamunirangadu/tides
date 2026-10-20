import * as THREE from 'three';
import { Environment } from '../models/Environment';

/**
 * BeachLighting.ts
 * 
 * Manages realistic coastal lighting, solar illumination, and atmospheric haze:
 * - Elevated directional sun light casting specular highlights across water
 * - Realistic hemisphere sky & sand-bounce lighting
 * - Soft fill ambient illumination
 * - Coastal atmospheric fog (FogExp2) giving photographic distance depth
 * - Dynamic Day / Night transitions matching the simulation environment
 */
export class BeachLighting {
  public group: THREE.Group;
  public sunLight: THREE.DirectionalLight;
  public hemiLight: THREE.HemisphereLight;
  public ambientLight: THREE.AmbientLight;
  public fog: THREE.FogExp2;

  constructor(scene: THREE.Scene, environment?: Environment, isNight: boolean = false) {
    this.group = new THREE.Group();

    // 1. Directional Sun Light
    this.sunLight = new THREE.DirectionalLight(0xfffbeb, 1.6);
    this.sunLight.position.set(70, 95, -50);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 280;
    this.sunLight.shadow.camera.left = -120;
    this.sunLight.shadow.camera.right = 120;
    this.sunLight.shadow.camera.top = 100;
    this.sunLight.shadow.camera.bottom = -100;
    this.group.add(this.sunLight);

    // 2. Hemisphere Sky / Sand-Bounce Light
    this.hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0xfde68a, 0.65);
    this.hemiLight.position.set(0, 100, 0);
    this.group.add(this.hemiLight);

    // 3. Ambient Fill Light
    this.ambientLight = new THREE.AmbientLight(0xe0f2fe, 0.4);
    this.group.add(this.ambientLight);

    // 4. Coastal Atmospheric Fog
    this.fog = new THREE.FogExp2(0xbae6fd, 0.0032);
    scene.fog = this.fog;

    if (environment) {
      this.update(environment, isNight);
    }
  }

  /**
   * Synchronizes lighting with simulation environment
   */
  public update(_environment: Environment, isNight: boolean = false): void {

    if (isNight) {
      // Midnight coastal moonlight
      this.sunLight.color.setHex(0x93c5fd);
      this.sunLight.intensity = 0.45;
      this.sunLight.position.set(-40, 75, -45);

      this.hemiLight.color.setHex(0x1e293b);
      this.hemiLight.groundColor.setHex(0x0f172a);
      this.hemiLight.intensity = 0.25;

      this.ambientLight.color.setHex(0x0f172a);
      this.ambientLight.intensity = 0.25;

      this.fog.color.setHex(0x090e1a);
      this.fog.density = 0.0042;
    } else {
      // Radiant golden daytime coastal sun
      this.sunLight.color.setHex(0xfffbeb);
      this.sunLight.intensity = 1.6;
      this.sunLight.position.set(70, 95, -50);

      this.hemiLight.color.setHex(0x7dd3fc);
      this.hemiLight.groundColor.setHex(0xfde68a);
      this.hemiLight.intensity = 0.65;

      this.ambientLight.color.setHex(0xe0f2fe);
      this.ambientLight.intensity = 0.4;

      this.fog.color.setHex(0xbae6fd);
      this.fog.density = 0.0032;
    }
  }

  /**
   * Memory cleanup
   */
  public dispose(): void {
    this.sunLight.dispose();
  }
}
