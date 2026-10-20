/**
 * DroneLayer3D.ts
 * 
 * TIDES Drone Phase 2: 3D Drone Visualization & Scene Integration
 * 
 * Authoritative Three.js visualization layer for coastal drone operations:
 * - Role-differentiated airframes (Surveillance Quadcopter vs Rescue Hexacopter)
 * - State-dependent propeller rotation (stationary on ground, spinning in flight)
 * - Aerodynamic flight pitch tilt & banking orientation
 * - Altitude projection drop-line with surface shadow disc
 * - Stale and disconnected telemetry indicators (freshness countdown & provenance)
 * - Interactive click-to-select with glowing selection reticle
 * - Dynamic 3D overhead billboard badges updating with battery & status
 * - Purely observational: strictly reads DroneRegistry without mutating physics
 */

import * as THREE from 'three';
import { DroneRegistry } from '../../drones/foundation/DroneRegistry';
import { DroneRecord, DroneOperationalStatus } from '../../drones/foundation/drone.types';
import { DroneModelBuilder, BuiltDroneMeshComponents } from './DroneModelBuilder';

interface DroneMeshObject {
  droneId: string;
  components: BuiltDroneMeshComponents;
  badgeMesh: THREE.Sprite;
  badgeTexture?: THREE.CanvasTexture;
  badgeCanvas?: HTMLCanvasElement;
}

export class DroneLayer3D {
  private group: THREE.Group;
  private registry: DroneRegistry;
  private modelBuilder: DroneModelBuilder;
  private droneMeshes: Map<string, DroneMeshObject> = new Map();
  private isVisible: boolean = true;
  private animationClock: number = 0;
  private selectedDroneId: string | null = null;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'DroneFleetLayer3D';
    this.registry = DroneRegistry.getInstance();
    this.modelBuilder = DroneModelBuilder.getInstance();
    this.syncDronesFromRegistry();
  }

  public getGroup(): THREE.Group {
    return this.group;
  }

  public setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.group.visible = visible;
  }

  /**
   * Sets or clears the currently selected drone
   */
  public selectDrone(droneId: string | null): void {
    this.selectedDroneId = droneId;

    // Update selection reticles
    for (const [id, meshObj] of this.droneMeshes.entries()) {
      const isSelected = id === droneId;
      meshObj.components.selectionReticle.visible = isSelected;
    }
  }

  public getSelectedDroneId(): string | null {
    return this.selectedDroneId;
  }

  /**
   * Synchronizes visual 3D mesh instances with registered drones
   */
  public syncDronesFromRegistry(): void {
    const drones = this.registry.getAllDrones();
    const activeIds = new Set(drones.map((d) => d.droneId));

    // Remove obsolete meshes
    for (const [id, meshObj] of this.droneMeshes.entries()) {
      if (!activeIds.has(id)) {
        this.group.remove(meshObj.components.rootGroup);
        this.disposeMeshObject(meshObj);
        this.droneMeshes.delete(id);
      }
    }

    // Add or update active drones
    for (const drone of drones) {
      if (!this.droneMeshes.has(drone.droneId)) {
        const meshObj = this.createDroneMeshObject(drone);
        this.droneMeshes.set(drone.droneId, meshObj);
        this.group.add(meshObj.components.rootGroup);
      }
    }
  }

  /**
   * Constructs a drone mesh object with model builder and overhead badge
   */
  private createDroneMeshObject(drone: DroneRecord): DroneMeshObject {
    const components = this.modelBuilder.buildDroneModel(drone);
    const { sprite, texture, canvas } = this.createOverheadBadge(drone);
    components.rootGroup.add(sprite);

    return {
      droneId: drone.droneId,
      components,
      badgeMesh: sprite,
      badgeTexture: texture,
      badgeCanvas: canvas,
    };
  }

  /**
   * Creates a crisp HTML5 Canvas overhead billboard sprite
   */
  private createOverheadBadge(drone: DroneRecord): {
    sprite: THREE.Sprite;
    texture?: THREE.CanvasTexture;
    canvas?: HTMLCanvasElement;
  } {
    if (typeof document === 'undefined') {
      const sprite = new THREE.Sprite();
      sprite.scale.set(3.5, 1.17, 1.0);
      sprite.position.set(0, 1.6, 0);
      return { sprite };
    }

    const canvas = document.createElement('canvas');
    canvas.width = 420;
    canvas.height = 140;
    const ctx = canvas.getContext('2d')!;

    this.renderBadgeContent(ctx, drone, this.selectedDroneId === drone.droneId);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(3.5, 1.17, 1.0);
    sprite.position.set(0, 1.6, 0);

    return { sprite, texture, canvas };
  }

  /**
   * Renders the dynamic 2D badge for Three.js billboard sprite
   */
  private renderBadgeContent(
    ctx: CanvasRenderingContext2D,
    drone: DroneRecord,
    isSelected: boolean
  ): void {
    ctx.clearRect(0, 0, 420, 140);

    // Primary status color
    let statusColor = '#06b6d4'; // Cyan patrol
    if (drone.connectivity === 'DISCONNECTED') {
      statusColor = '#ef4444'; // Red disconnect
    } else if (drone.isStale) {
      statusColor = '#f59e0b'; // Amber stale
    } else if (drone.status === 'DISPATCHED' || drone.status === 'SEARCHING') {
      statusColor = '#f59e0b'; // Amber
    } else if (drone.status === 'ASSISTING') {
      statusColor = '#ef4444'; // Red assisting
    } else if (drone.status === 'IDLE') {
      statusColor = '#10b981'; // Emerald
    } else if (drone.status === 'CHARGING' || drone.status === 'OFFLINE') {
      statusColor = '#64748b'; // Slate
    }

    // Border and Glow if selected
    ctx.save();
    if (isSelected) {
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 18;
    }

    // Background pill
    ctx.fillStyle = isSelected ? 'rgba(15, 23, 42, 0.95)' : 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = isSelected ? '#00e5ff' : statusColor;
    ctx.lineWidth = isSelected ? 5 : 3.5;
    ctx.beginPath();
    ctx.roundRect(8, 8, 404, 124, 24);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Drone Icon & ID
    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`🛸 ${drone.droneId}`, 20, 44);

    // Selected Tag
    if (isSelected) {
      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#00e5ff';
      ctx.fillText('[SELECTED]', 190, 44);
    }

    // Battery / Stale Gauge (Right-aligned)
    if (drone.connectivity === 'DISCONNECTED') {
      ctx.font = 'bold 18px sans-serif';
      ctx.fillStyle = '#ef4444';
      ctx.fillText('⚡ OFFLINE', 285, 44);
    } else if (drone.isStale) {
      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#f59e0b';
      ctx.fillText(`⚠️ STALE ${drone.telemetryFreshnessSeconds.toFixed(0)}s`, 270, 44);
    } else {
      const batt = drone.battery.percentage;
      const battColor = batt <= 20 ? '#ef4444' : batt <= 40 ? '#f59e0b' : '#10b981';
      ctx.font = 'bold 22px monospace';
      ctx.fillStyle = battColor;
      ctx.fillText(`⚡ ${batt}%`, 310, 44);
    }

    // Role & Operational Status Subtitle
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = statusColor;
    ctx.fillText(`${drone.role} • ${drone.status}`, 20, 84);

    // Provenance & Altitude Tag
    ctx.font = '14px monospace';
    ctx.fillStyle = '#94a3b8';
    const altStr = `ALT: ${drone.position3D.y.toFixed(1)}m`;
    const provStr = `[${drone.provenance === 'SIMULATED' ? 'SIM' : 'HW'}]`;
    const missionStr = drone.currentMissionId ? `| ${drone.currentMissionId}` : '';
    ctx.fillText(`${altStr} ${provStr} ${missionStr}`, 20, 114);
  }

  /**
   * Per-frame animation & synchronization loop
   */
  public update(deltaSeconds: number = 0.016): void {
    if (!this.isVisible) return;

    this.animationClock += deltaSeconds;
    const drones = this.registry.getAllDrones();

    for (const drone of drones) {
      const meshObj = this.droneMeshes.get(drone.droneId);
      if (!meshObj) continue;

      const comp = meshObj.components;
      const isSelected = this.selectedDroneId === drone.droneId;

      // 1. Update World Position
      comp.rootGroup.position.set(drone.position3D.x, drone.position3D.y, drone.position3D.z);

      // 2. Flight Orientation (Heading + Aerodynamic Pitch Tilt)
      // When moving forward at speed v, tilt nose down slightly
      const pitchTilt = drone.speedMps > 0.5 ? Math.min(0.35, drone.speedMps * 0.035) : 0.0;
      comp.rootGroup.rotation.y = THREE.MathUtils.degToRad(-drone.headingDegrees + 90);
      comp.rootGroup.rotation.x = pitchTilt;

      // 3. Propeller Animation (Phase 2 Step 7)
      // Propellers are stationary if landed/charging/offline; spin rapidly when airborne
      const isAirborne =
        drone.status !== 'CHARGING' &&
        drone.status !== 'OFFLINE' &&
        (drone.status !== 'IDLE' || drone.position3D.y > 4.8);

      const spinSpeed = isAirborne ? 45.0 : 0.0;
      comp.rotorDiscs.forEach((disc, idx) => {
        disc.rotation.y += (idx % 2 === 0 ? 1 : -1) * spinSpeed * deltaSeconds;
      });

      // 4. Ground/Sea Altitude Projection Drop-Line & Shadow
      const altitude = Math.max(0.01, drone.position3D.y);
      const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -altitude, 0)];
      comp.dropLine.geometry.setFromPoints(points);
      comp.dropLine.computeLineDistances();
      comp.shadowDisc.position.set(0, -altitude + 0.05, 0);

      // Adjust drop line color based on stale/offline status
      const lineMat = comp.dropLine.material as THREE.LineDashedMaterial;
      if (drone.connectivity === 'DISCONNECTED') {
        lineMat.color.setHex(0xef4444); // Red warning for disconnected
        lineMat.opacity = 0.4;
      } else if (drone.isStale) {
        lineMat.color.setHex(0xf59e0b); // Amber for stale
        lineMat.opacity = 0.5;
      } else {
        lineMat.color.setHex(drone.role === 'RESCUE_ASSISTANCE' ? 0xf97316 : 0x00e5ff);
        lineMat.opacity = 0.6;
      }

      // 5. Strobe Navigation Light (1 Hz pulse, Amber if stale)
      const strobeOn = Math.sin(this.animationClock * Math.PI * 2) > 0.5;
      if (drone.isStale || drone.connectivity === 'DISCONNECTED') {
        comp.strobeLight.color.setHex(0xf59e0b);
        comp.strobeLight.intensity = strobeOn ? 1.0 : 0.1;
      } else {
        comp.strobeLight.color.setHex(drone.role === 'RESCUE_ASSISTANCE' ? 0xf97316 : 0x22c55e);
        comp.strobeLight.intensity = strobeOn ? 1.6 : 0.2;
      }

      // 6. Selection Reticle Animation (Pulsing tactical halo)
      if (isSelected) {
        comp.selectionReticle.visible = true;
        const pulse = 0.5 + 0.5 * Math.sin(this.animationClock * 4.0);
        const retMat = comp.selectionReticle.material as THREE.MeshBasicMaterial;
        retMat.opacity = 0.6 + 0.3 * pulse;
        comp.selectionReticle.rotation.z += deltaSeconds * 1.5; // Slowly rotates
      } else {
        comp.selectionReticle.visible = false;
      }

      // 7. Redraw Overhead Badge
      if (meshObj.badgeCanvas && meshObj.badgeTexture) {
        const ctx = meshObj.badgeCanvas.getContext('2d');
        if (ctx) {
          this.renderBadgeContent(ctx, drone, isSelected);
          meshObj.badgeTexture.needsUpdate = true;
        }
      }
    }
  }

  private disposeMeshObject(obj: DroneMeshObject): void {
    obj.components.rootGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    if (obj.badgeTexture) {
      obj.badgeTexture.dispose();
    }
  }

  public dispose(): void {
    for (const meshObj of this.droneMeshes.values()) {
      this.group.remove(meshObj.components.rootGroup);
      this.disposeMeshObject(meshObj);
    }
    this.droneMeshes.clear();
  }
}
