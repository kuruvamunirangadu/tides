import { BeachTerrain } from '../BeachTerrain';
import { RescueResourceState3D } from './rescue.types';

/**
 * RescueResourceRegistry.ts
 * 
 * Manages the simulated emergency rescue fleet:
 * - RB-01: Offshore Rapid Rescue Jet Boat
 * - LG-01: West Lifeguard Squad Station
 * - LG-02: Central Lifeguard Squad Station
 * - Tracks availability states and current incident assignments
 */
export class RescueResourceRegistry {
  private resources: Map<string, RescueResourceState3D> = new Map();

  constructor() {
    this.initializeFleet();
  }

  public initializeFleet(): void {
    this.resources.clear();

    // 1. High-Speed Offshore Rescue Boat (Stationed in deep water)
    const boatStandbyX = -35;
    const boatStandbyZ = -45;
    this.resources.set('RB-01', {
      id: 'RB-01',
      name: 'Rapid Response Rescue Boat (Sea Patrol)',
      type: 'RESCUE_BOAT',
      currentX: boatStandbyX,
      currentY: 0,
      currentZ: boatStandbyZ,
      rotationY: Math.PI / 2, // Facing alongshore towards the bay
      standbyX: boatStandbyX,
      standbyY: 0,
      standbyZ: boatStandbyZ,
      speedMps: 26.0, // ~50 knots high-speed emergency response
      status: 'AVAILABLE',
      assignedIncidentId: null,
      color: '#0284c7',
    });

    // 2. West Beach Lifeguard Station
    const lg1StandbyX = -25;
    const lg1StandbyZ = 18;
    const lg1StandbyY = BeachTerrain.getElevation(lg1StandbyX, lg1StandbyZ);
    this.resources.set('LG-01', {
      id: 'LG-01',
      name: 'Lifeguard Rescue Squad 01 (West Station)',
      type: 'LIFEGUARD',
      currentX: lg1StandbyX,
      currentY: lg1StandbyY,
      currentZ: lg1StandbyZ,
      rotationY: Math.PI, // Facing ocean
      standbyX: lg1StandbyX,
      standbyY: lg1StandbyY,
      standbyZ: lg1StandbyZ,
      speedMps: 11.5, // Rapid beach sprint & surf entry
      status: 'AVAILABLE',
      assignedIncidentId: null,
      color: '#f59e0b',
    });

    // 3. Central Beach Lifeguard Station
    const lg2StandbyX = 35;
    const lg2StandbyZ = 18;
    const lg2StandbyY = BeachTerrain.getElevation(lg2StandbyX, lg2StandbyZ);
    this.resources.set('LG-02', {
      id: 'LG-02',
      name: 'Lifeguard Rescue Squad 02 (Central Station)',
      type: 'LIFEGUARD',
      currentX: lg2StandbyX,
      currentY: lg2StandbyY,
      currentZ: lg2StandbyZ,
      rotationY: Math.PI, // Facing ocean
      standbyX: lg2StandbyX,
      standbyY: lg2StandbyY,
      standbyZ: lg2StandbyZ,
      speedMps: 11.5,
      status: 'AVAILABLE',
      assignedIncidentId: null,
      color: '#f59e0b',
    });

    // 4. Reserve Rapid Rescue Boat
    const boat2StandbyX = 25;
    const boat2StandbyZ = -45;
    this.resources.set('RB-02', {
      id: 'RB-02',
      name: 'Reserve Rapid Rescue Boat (Zodiac Patrol)',
      type: 'RESCUE_BOAT',
      currentX: boat2StandbyX,
      currentY: 0,
      currentZ: boat2StandbyZ,
      rotationY: Math.PI / 2,
      standbyX: boat2StandbyX,
      standbyY: 0,
      standbyZ: boat2StandbyZ,
      speedMps: 22.0,
      status: 'AVAILABLE',
      assignedIncidentId: null,
      color: '#0284c7',
    });
  }

  public getResources(): RescueResourceState3D[] {
    return Array.from(this.resources.values());
  }

  public getResource(id: string): RescueResourceState3D | undefined {
    return this.resources.get(id);
  }

  public updateResource(id: string, updates: Partial<RescueResourceState3D>): void {
    const res = this.resources.get(id);
    if (res) {
      Object.assign(res, updates);
    }
  }

  public resetAll(): void {
    for (const res of this.resources.values()) {
      res.currentX = res.standbyX;
      res.currentY = res.standbyY;
      res.currentZ = res.standbyZ;
      res.status = 'AVAILABLE';
      res.assignedIncidentId = null;
      res.targetX = undefined;
      res.targetY = undefined;
      res.targetZ = undefined;
    }
  }
}

