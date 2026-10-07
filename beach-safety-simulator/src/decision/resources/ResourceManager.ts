import { Resource, ResourceState, ResourceType, ResourceStatus } from '../models/Resource';
import { Position } from '../../models/Incident';
import { ResponseTimeCalculator } from './ResponseTimeCalculator';

export class ResourceManager {
  private resources: Map<string, Resource> = new Map();

  constructor() {
    this.initializeDefaultFleet();
  }

  public initializeDefaultFleet(): void {
    this.resources.clear();

    // 1. Lifeguards (Patrol & Rescue Teams)
    const lifeguards: Resource[] = [
      {
        id: 'LG-01',
        name: 'Lifeguard Team 01 (Sector West)',
        type: 'LIFEGUARD',
        status: 'AVAILABLE',
        position: { x: 200, y: 160 },
        coverageRadius: 250,
        speed: 45, // pixels/sec (running/swimming)
      },
      {
        id: 'LG-02',
        name: 'Lifeguard Team 02 (Sector Central)',
        type: 'LIFEGUARD',
        status: 'AVAILABLE',
        position: { x: 600, y: 160 },
        coverageRadius: 250,
        speed: 45,
      },
      {
        id: 'LG-03',
        name: 'Lifeguard Team 03 (Sector East)',
        type: 'LIFEGUARD',
        status: 'AVAILABLE',
        position: { x: 1000, y: 160 },
        coverageRadius: 250,
        speed: 45,
      },
    ];

    // 2. Autonomous Aerial Patrol Drones (UAV Lifesavers)
    const drones: Resource[] = [
      {
        id: 'DRONE-01',
        name: 'Autonomous UAV Patrol Alpha',
        type: 'DRONE',
        status: 'AVAILABLE',
        position: { x: 300, y: 55 },
        coverageRadius: 800,
        speed: 130, // High speed flight
        batteryLevel: 98,
        payloadReady: true,
      },
      {
        id: 'DRONE-02',
        name: 'Autonomous UAV Patrol Bravo',
        type: 'DRONE',
        status: 'AVAILABLE',
        position: { x: 900, y: 55 },
        coverageRadius: 800,
        speed: 130,
        batteryLevel: 95,
        payloadReady: true,
      },
    ];

    // 3. Audio & Visual Broadcast Systems
    const publicAddress: Resource = {
      id: 'PA-MAIN',
      name: 'Central Beach PA & Siren Network',
      type: 'PA_SYSTEM',
      status: 'AVAILABLE',
      position: { x: 600, y: 40 },
      coverageRadius: 1500,
      speed: 999,
    };

    const displays: Resource[] = [
      {
        id: 'DISP-A',
        name: 'Digital LED Flag Display (Zone A)',
        type: 'WARNING_DISPLAY',
        status: 'AVAILABLE',
        position: { x: 300, y: 120 },
        coverageRadius: 300,
        speed: 999,
      },
      {
        id: 'DISP-B',
        name: 'Digital LED Flag Display (Zone B)',
        type: 'WARNING_DISPLAY',
        status: 'AVAILABLE',
        position: { x: 600, y: 120 },
        coverageRadius: 300,
        speed: 999,
      },
      {
        id: 'DISP-C',
        name: 'Digital LED Flag Display (Zone C)',
        type: 'WARNING_DISPLAY',
        status: 'AVAILABLE',
        position: { x: 950, y: 120 },
        coverageRadius: 300,
        speed: 999,
      },
    ];

    [...lifeguards, ...drones, publicAddress, ...displays].forEach((r) => {
      this.resources.set(r.id, r);
    });
  }

  public getAllResources(): Resource[] {
    return Array.from(this.resources.values());
  }

  public getResource(id: string): Resource | undefined {
    return this.resources.get(id);
  }

  public getAvailableResourcesByType(type: ResourceType): Resource[] {
    return Array.from(this.resources.values()).filter(
      (r) => r.type === type && r.status === 'AVAILABLE'
    );
  }

  public setResourceStatus(id: string, status: ResourceStatus, incidentId?: string, actionId?: string): void {
    const r = this.resources.get(id);
    if (r) {
      r.status = status;
      r.currentIncidentId = incidentId;
      r.currentActionId = actionId;
    }
  }

  public findNearestAvailable(type: ResourceType, target: Position): Resource | undefined {
    const avail = this.getAvailableResourcesByType(type);
    if (avail.length === 0) return undefined;

    return avail.sort((a, b) => {
      const distA = Math.hypot(a.position.x - target.x, a.position.y - target.y);
      const distB = Math.hypot(b.position.x - target.x, b.position.y - target.y);
      return distA - distB;
    })[0];
  }

  public getFleetState(): ResourceState {
    const list = this.getAllResources();
    const lgs = list.filter((r) => r.type === 'LIFEGUARD');
    const drones = list.filter((r) => r.type === 'DRONE');
    const pa = list.find((r) => r.type === 'PA_SYSTEM');
    const disps = list.filter((r) => r.type === 'WARNING_DISPLAY');

    return {
      resources: list,
      totalLifeguards: lgs.length,
      availableLifeguards: lgs.filter((r) => r.status === 'AVAILABLE').length,
      totalDrones: drones.length,
      availableDrones: drones.filter((r) => r.status === 'AVAILABLE').length,
      paActive: pa?.status === 'BUSY',
      warningDisplaysActive: disps.some((d) => d.status === 'BUSY'),
    };
  }

  /**
   * Advances movement kinematics for dispatched assets (Lifeguards & Drones moving towards targets)
   */
  public updateResourceMovement(deltaTime: number): void {
    this.resources.forEach((r) => {
      if ((r.status === 'DISPATCHED' || r.status === 'BUSY') && r.targetPosition) {
        const dx = r.targetPosition.x - r.position.x;
        const dy = r.targetPosition.y - r.position.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 8) {
          const moveDist = r.speed * deltaTime;
          const step = Math.min(dist, moveDist);
          r.position.x += (dx / dist) * step;
          r.position.y += (dy / dist) * step;
          r.estimatedResponseTime = ResponseTimeCalculator.calculateETA(r, r.targetPosition);
        } else {
          // Arrived on scene
          r.position.x = r.targetPosition.x;
          r.position.y = r.targetPosition.y;
          r.status = 'BUSY';
          r.estimatedResponseTime = 0;
        }
      }
    });
  }

  public reset(): void {
    this.initializeDefaultFleet();
  }
}
