import { EmergencyResource, EmergencyResourceType, EmergencyResourceStatus } from '../models/EmergencyResource';
import { Position } from '../../models/Incident';
import { RESOURCE_CAPABILITIES } from './ResourceCapabilities';

export class EmergencyResourceManager {
  private resources: Map<string, EmergencyResource> = new Map();

  constructor() {
    this.initializeFleet();
  }

  public initializeFleet(): void {
    this.resources.clear();

    const initialFleet: EmergencyResource[] = [
      // 1. Lifeguard Units (Rapid Beach Sprint & Surf Launch)
      {
        id: 'LG-01',
        name: 'Lifeguard Rescue Unit 01 (West)',
        type: 'LIFEGUARD',
        status: 'AVAILABLE',
        position: { x: 200, y: 150 },
        basePosition: { x: 200, y: 150 },
        speed: 85,
        responseRadius: 280,
        color: '#f59e0b',
      },
      {
        id: 'LG-02',
        name: 'Lifeguard Rescue Unit 02 (Central)',
        type: 'LIFEGUARD',
        status: 'AVAILABLE',
        position: { x: 600, y: 150 },
        basePosition: { x: 600, y: 150 },
        speed: 85,
        responseRadius: 280,
        color: '#f59e0b',
      },
      {
        id: 'LG-03',
        name: 'Lifeguard Rescue Unit 03 (East)',
        type: 'LIFEGUARD',
        status: 'AVAILABLE',
        position: { x: 1000, y: 150 },
        basePosition: { x: 1000, y: 150 },
        speed: 85,
        responseRadius: 280,
        color: '#f59e0b',
      },

      // 2. High-Speed Rescue Watercraft / Jet Boat (Rapid Sea Intercept)
      {
        id: 'BOAT-01',
        name: 'Rapid Response Rescue Boat (Sea Patrol)',
        type: 'RESCUE_BOAT',
        status: 'AVAILABLE',
        position: { x: 150, y: 340 },
        basePosition: { x: 150, y: 340 },
        speed: 160,
        responseRadius: 900,
        batteryOrFuel: 100,
        color: '#0284c7',
      },

      // 3. Autonomous Aerial Lifesaver Drones (Instant Flotation Drop)
      {
        id: 'DRONE-01',
        name: 'Autonomous UAV Lifesaver Alpha',
        type: 'DRONE',
        status: 'AVAILABLE',
        position: { x: 300, y: 40 },
        basePosition: { x: 300, y: 40 },
        speed: 220,
        responseRadius: 1200,
        batteryOrFuel: 98,
        payloadReady: true,
        color: '#06b6d4',
      },
      {
        id: 'DRONE-02',
        name: 'Autonomous UAV Lifesaver Bravo',
        type: 'DRONE',
        status: 'AVAILABLE',
        position: { x: 900, y: 40 },
        basePosition: { x: 900, y: 40 },
        speed: 220,
        responseRadius: 1200,
        batteryOrFuel: 95,
        payloadReady: true,
        color: '#06b6d4',
      },

      // 4. Emergency Medical Services (Ambulance)
      {
        id: 'AMB-01',
        name: 'Paramedic Ambulance Unit 01',
        type: 'AMBULANCE',
        status: 'AVAILABLE',
        position: { x: 80, y: 35 },
        basePosition: { x: 80, y: 35 },
        speed: 60,
        responseRadius: 1500,
        color: '#ef4444',
      },

      // 5. Coastal Police & Crowd Security
      {
        id: 'POLICE-01',
        name: 'Coastal Police Patrol Unit',
        type: 'POLICE',
        status: 'AVAILABLE',
        position: { x: 450, y: 35 },
        basePosition: { x: 450, y: 35 },
        speed: 50,
        responseRadius: 1000,
        color: '#3b82f6',
      },

      // 6. Broadcast & Warning Infrastructure
      {
        id: 'PA-MAIN',
        name: 'Central Multi-Zone PA Acoustic Array',
        type: 'PA_SYSTEM',
        status: 'AVAILABLE',
        position: { x: 600, y: 30 },
        basePosition: { x: 600, y: 30 },
        speed: 999,
        responseRadius: 2000,
        color: '#a855f7',
      },
      {
        id: 'LED-A',
        name: 'Dynamic Warning Board (Zone A)',
        type: 'LED_WARNING_BOARD',
        status: 'AVAILABLE',
        position: { x: 300, y: 120 },
        basePosition: { x: 300, y: 120 },
        speed: 999,
        responseRadius: 300,
        color: '#eab308',
      },
      {
        id: 'LED-B',
        name: 'Dynamic Warning Board (Zone B)',
        type: 'LED_WARNING_BOARD',
        status: 'AVAILABLE',
        position: { x: 600, y: 120 },
        basePosition: { x: 600, y: 120 },
        speed: 999,
        responseRadius: 300,
        color: '#eab308',
      },
      {
        id: 'LED-C',
        name: 'Dynamic Warning Board (Zone C)',
        type: 'LED_WARNING_BOARD',
        status: 'AVAILABLE',
        position: { x: 950, y: 120 },
        basePosition: { x: 950, y: 120 },
        speed: 999,
        responseRadius: 300,
        color: '#eab308',
      },
    ];

    initialFleet.forEach((res) => {
      this.resources.set(res.id, res);
    });
  }

  public getAll(): EmergencyResource[] {
    return Array.from(this.resources.values());
  }

  public getById(id: string): EmergencyResource | undefined {
    return this.resources.get(id);
  }

  public getAvailableByType(type: EmergencyResourceType): EmergencyResource[] {
    return Array.from(this.resources.values()).filter(
      (r) => r.type === type && r.status === 'AVAILABLE'
    );
  }

  public findBestSuitableResource(
    requiredCapability: keyof typeof RESOURCE_CAPABILITIES.LIFEGUARD,
    target: Position,
    preferredType?: EmergencyResourceType
  ): EmergencyResource | undefined {
    const candidates = Array.from(this.resources.values()).filter((r) => {
      if (r.status !== 'AVAILABLE') return false;
      const cap = RESOURCE_CAPABILITIES[r.type];
      if (!cap || !cap[requiredCapability]) return false;
      if (preferredType && r.type !== preferredType) return false;
      return true;
    });

    if (candidates.length === 0) return undefined;

    // Sort by ETA (distance / speed)
    return candidates.sort((a, b) => {
      const distA = Math.hypot(a.position.x - target.x, a.position.y - target.y);
      const distB = Math.hypot(b.position.x - target.x, b.position.y - target.y);
      const etaA = distA / a.speed;
      const etaB = distB / b.speed;
      return etaA - etaB;
    })[0];
  }

  public setStatus(
    id: string,
    status: EmergencyResourceStatus,
    incidentId?: string,
    targetPos?: Position
  ): void {
    const r = this.resources.get(id);
    if (r) {
      r.status = status;
      r.currentIncidentId = incidentId;
      if (targetPos) {
        r.targetPosition = { ...targetPos };
      }
    }
  }

  public reset(): void {
    this.initializeFleet();
  }
}
