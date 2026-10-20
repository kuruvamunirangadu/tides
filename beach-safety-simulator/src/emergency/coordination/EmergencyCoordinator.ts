/**
 * src/emergency/coordination/EmergencyCoordinator.ts
 * Multi-incident coordination and conflict-free rescue resource dispatch.
 */

import { EmergencyIncident, EmergencyIncidentStatus, Point2D } from './types';
import { RescueCoordinator } from '../../scene3d/rescue/RescueCoordinator';

export class EmergencyCoordinator {
  private static instance: EmergencyCoordinator | null = null;

  private incidents: Map<string, EmergencyIncident> = new Map();
  private resourceLocks: Map<string, string> = new Map(); // resourceId -> incidentId
  private listeners: Set<() => void> = new Set();

  public static getInstance(): EmergencyCoordinator {
    if (!this.instance) {
      this.instance = new EmergencyCoordinator();
    }
    return this.instance;
  }

  constructor() {
    this.reset();
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  public calculatePriorityScore(distressLevel: number, yPos: number, waitTimeSec = 0): number {
    const depthFactor = Math.min(1.0, Math.max(0.0, (yPos - 280.0) / 200.0));
    const waitFactor = Math.min(1.0, Math.max(0.0, waitTimeSec / 60.0));
    const score = distressLevel * 0.5 + depthFactor * 0.3 + waitFactor * 0.2;
    return Number(score.toFixed(3));
  }

  /**
   * Registers a distress incident. Suppresses duplicate dispatches for existing incidentId.
   */
  public reportDistressIncident(
    incidentId: string,
    visitorId: string,
    location: Point2D,
    distressLevel = 0.85
  ): { incident: EmergencyIncident; dispatched: boolean; message: string } {
    // 1. Idempotency Check
    if (this.incidents.has(incidentId)) {
      return {
        incident: this.incidents.get(incidentId)!,
        dispatched: false,
        message: `Duplicate incident ${incidentId} suppressed.`,
      };
    }

    const priorityScore = this.calculatePriorityScore(distressLevel, location.y);
    const incident: EmergencyIncident = {
      incidentId,
      visitorId,
      location,
      distressLevel,
      priorityScore,
      status: 'REPORTED',
      createdAt: Date.now() / 1000,
    };

    this.incidents.set(incidentId, incident);

    // 2. Resource Dispatch
    const dispatchRes = this.dispatchBestResource(incident);
    this.notify();

    return {
      incident,
      dispatched: dispatchRes.success,
      message: dispatchRes.message,
    };
  }

  private dispatchBestResource(incident: EmergencyIncident): { success: boolean; message: string } {
    const rescueCoord = RescueCoordinator.getInstance();
    const resources = rescueCoord.registry.getResources();
    const isDeepWater = incident.location.y > 320.0;

    // Filter available resources not already locked
    const eligible = resources.filter((r) => {
      const isLocked = this.resourceLocks.has(r.id);
      const isAvailable = r.status === 'AVAILABLE';
      if (!isAvailable || isLocked) return false;
      if (isDeepWater && r.type !== 'RESCUE_BOAT' && (r.type as string) !== 'BOAT' && (r.type as string) !== 'DRONE') return false;
      return true;
    });

    if (eligible.length === 0) {
      incident.status = 'UNRESOLVED_RESOURCE_EXHAUSTION';
      incident.notes = 'All suitable rescue craft occupied or unavailable.';
      return {
        success: false,
        message: `Resource exhaustion: No available craft for incident ${incident.incidentId}`,
      };
    }

    // Pick fastest craft
    eligible.sort((a, b) => b.speedMps - a.speedMps);
    const selected = eligible[0];

    // Exclusively lock resource
    this.resourceLocks.set(selected.id, incident.incidentId);
    rescueCoord.registry.updateResource(selected.id, {
      status: 'EN_ROUTE',
      assignedIncidentId: incident.incidentId,
    });

    incident.status = 'DISPATCHED';
    incident.assignedResourceId = selected.id;
    incident.assignedResourceName = selected.name;
    incident.dispatchedAt = Date.now() / 1000;
    incident.notes = `Dispatched ${selected.name} (${selected.type})`;

    return {
      success: true,
      message: `Assigned ${selected.name} to incident ${incident.incidentId}`,
    };
  }

  public resolveIncident(incidentId: string): boolean {
    const inc = this.incidents.get(incidentId);
    if (!inc) return false;

    inc.status = 'RESOLVED';
    inc.resolvedAt = Date.now() / 1000;

    // Release resource lock
    if (inc.assignedResourceId) {
      this.resourceLocks.delete(inc.assignedResourceId);
      const rescueCoord = RescueCoordinator.getInstance();
      rescueCoord.registry.updateResource(inc.assignedResourceId, {
        status: 'AVAILABLE',
        assignedIncidentId: undefined,
      });
    }

    this.notify();
    return true;
  }

  public getIncidents(): EmergencyIncident[] {
    return Array.from(this.incidents.values()).sort((a, b) => b.priorityScore - a.priorityScore);
  }

  public getUnresolvedCount(): number {
    return Array.from(this.incidents.values()).filter(
      (i) => i.status === 'UNRESOLVED_RESOURCE_EXHAUSTION'
    ).length;
  }

  public reset() {
    const rescueCoord = RescueCoordinator.getInstance();
    rescueCoord.registry.resetAll();
    this.incidents.clear();
    this.resourceLocks.clear();
    this.notify();
  }
}
