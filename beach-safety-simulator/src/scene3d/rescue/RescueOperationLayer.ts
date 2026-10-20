import * as THREE from 'three';
import { RescueCoordinator } from './RescueCoordinator';
import { RescueBoat3D } from './RescueBoat3D';
import { Lifeguard3D } from './Lifeguard3D';
import { TacticalRescueVisual3D } from './TacticalRescueVisual3D';

/**
 * RescueOperationLayer.ts
 * 
 * 3D Scene layer coordinating visual rescue boats and lifeguards:
 * - Hosts multiple RescueBoat3D and Lifeguard3D meshes independently
 * - Synchronizes with RescueCoordinator simulation state
 * - Coordinates animated 3D tactical dispatch vectors and assistance halos
 * - Clean resource disposal
 */
export class RescueOperationLayer {
  public readonly group: THREE.Group;
  private boats: Map<string, RescueBoat3D> = new Map();
  private lifeguards: Map<string, Lifeguard3D> = new Map();
  private tacticalVisuals: TacticalRescueVisual3D;
  private coordinator: RescueCoordinator;

  constructor() {
    this.group = new THREE.Group();
    this.coordinator = RescueCoordinator.getInstance();
    this.tacticalVisuals = new TacticalRescueVisual3D();
    this.group.add(this.tacticalVisuals.group);

    const resources = this.coordinator.registry.getResources();
    for (const res of resources) {
      if (res.type === 'RESCUE_BOAT') {
        const boat = new RescueBoat3D();
        this.boats.set(res.id, boat);
        this.group.add(boat.group);
      } else if (res.type === 'LIFEGUARD') {
        const lg = new Lifeguard3D(res);
        this.lifeguards.set(res.id, lg);
        this.group.add(lg.group);
      }
    }
  }

  public setTacticalVectorsVisible(visible: boolean): void {
    this.tacticalVisuals.setVisible(visible);
  }

  /**
   * Per-frame visual update
   */
  public update(delta: number): void {
    const resources = this.coordinator.registry.getResources();

    for (const res of resources) {
      if (res.type === 'RESCUE_BOAT') {
        let boat = this.boats.get(res.id);
        if (!boat) {
          boat = new RescueBoat3D();
          this.boats.set(res.id, boat);
          this.group.add(boat.group);
        }
        boat.update(delta, res);
      } else if (res.type === 'LIFEGUARD') {
        let lg = this.lifeguards.get(res.id);
        if (!lg) {
          lg = new Lifeguard3D(res);
          this.lifeguards.set(res.id, lg);
          this.group.add(lg.group);
        }
        lg.update(delta, res);
      }
    }

    // Update animated dispatch vectors & assistance halos
    this.tacticalVisuals.update(delta);
  }

  public dispose(): void {
    this.tacticalVisuals.dispose();
    for (const boat of this.boats.values()) {
      boat.dispose();
    }
    this.boats.clear();

    for (const lg of this.lifeguards.values()) {
      lg.dispose();
    }
    this.lifeguards.clear();
  }
}
