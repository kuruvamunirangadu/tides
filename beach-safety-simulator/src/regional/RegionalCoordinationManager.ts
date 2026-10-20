/**
 * src/regional/RegionalCoordinationManager.ts
 * 
 * TIDES — Phase 8: Multi-Beach Deployment & Coastal Network Coordination
 * 
 * Manages cross-site assistance requests, mutual-aid workflows, transit time estimates,
 * and auditable operator coordination between Andhra Pradesh coastal sites.
 * 
 * Strict Principle:
 * Assistance requests coordinate decisions and record agreements between beach operations,
 * but NEVER automatically dispatch physical assets or override local site autonomy.
 * Asset mobilization requires explicit authorization by the local beach operator.
 */

import { BeachRegistry } from './BeachRegistry';
import {
  CrossSiteAssistanceRequest,
  AssistanceRequestStatus,
  AssistanceResourceType,
  AssistanceUrgency,
  AssistanceAuditEntry,
} from './types';

export interface CreateAssistanceRequestInput {
  requestingSiteId: string;
  receivingSiteId: string;
  incidentId: string;
  resourceType: AssistanceResourceType;
  urgency: AssistanceUrgency;
  rationale: string;
  operatorId: string;
}

export interface TransitEstimate {
  distanceKm: number;
  estimatedTransitTimeMinutes: number;
  feasible: boolean;
  transitAdvisory: string;
}

export class RegionalCoordinationManager {
  private static instance: RegionalCoordinationManager | null = null;
  private requests: Map<string, CrossSiteAssistanceRequest> = new Map();
  private beachRegistry: BeachRegistry;
  private requestCounter: number = 1;

  constructor(beachRegistry?: BeachRegistry) {
    this.beachRegistry = beachRegistry || BeachRegistry.getInstance();
  }

  public static getInstance(): RegionalCoordinationManager {
    if (!RegionalCoordinationManager.instance) {
      RegionalCoordinationManager.instance = new RegionalCoordinationManager();
    }
    return RegionalCoordinationManager.instance;
  }

  /**
   * Resets all assistance requests (useful for isolated unit testing).
   */
  public reset(): void {
    this.requests.clear();
    this.requestCounter = 1;
  }

  /**
   * Estimates transit time and feasibility for transferring a resource between two beaches.
   */
  public evaluateTransit(
    originSiteId: string,
    targetSiteId: string,
    resourceType: AssistanceResourceType
  ): TransitEstimate {
    const origin = this.beachRegistry.getBeach(originSiteId.toUpperCase());
    const target = this.beachRegistry.getBeach(targetSiteId.toUpperCase());

    if (!origin || !origin.location || !target || !target.location) {
      return {
        distanceKm: 0,
        estimatedTransitTimeMinutes: 0,
        feasible: false,
        transitAdvisory: 'Missing geographic coordinates for one or both coastal sites.',
      };
    }

    const distanceKm = this.calculateHaversineDistance(
      origin.location.latitude,
      origin.location.longitude,
      target.location.latitude,
      target.location.longitude
    );

    let speedKmH = 45; // Default overland speed
    let maxOperationalRangeKm = 50;

    switch (resourceType) {
      case 'SURVEILLANCE_DRONE':
        speedKmH = 75; // ~21 m/s
        maxOperationalRangeKm = 25; // Strict battery/RF limit
        break;
      case 'RESCUE_BOAT':
        speedKmH = 55; // ~15 m/s sea state dependent
        maxOperationalRangeKm = 60;
        break;
      case 'PARAMEDIC_TEAM':
      case 'LIFEGUARD':
        speedKmH = 40; // Coastal roadway transit
        maxOperationalRangeKm = 100;
        break;
    }

    const transitMinutes = Math.round((distanceKm / speedKmH) * 60);
    const feasible = distanceKm <= maxOperationalRangeKm;

    let transitAdvisory = '';
    if (!feasible) {
      transitAdvisory = `WARNING: Inter-site distance (${distanceKm.toFixed(1)} km) exceeds operational deployment range (${maxOperationalRangeKm} km) for ${resourceType}. Transit unfeasible without intermediate staging.`;
    } else {
      transitAdvisory = `Inter-site transit ${distanceKm.toFixed(1)} km feasible. Estimated arrival in ~${transitMinutes} minutes under normal operational conditions.`;
    }

    return {
      distanceKm: Number(distanceKm.toFixed(2)),
      estimatedTransitTimeMinutes: transitMinutes,
      feasible,
      transitAdvisory,
    };
  }

  /**
   * Creates a formal cross-site assistance request.
   * Enforces non-negotiable rule: isRealDispatched = false.
   */
  public createAssistanceRequest(input: CreateAssistanceRequestInput): {
    success: boolean;
    request?: CrossSiteAssistanceRequest;
    error?: string;
  } {
    const reqSiteId = input.requestingSiteId.toUpperCase();
    const recSiteId = input.receivingSiteId.toUpperCase();

    const reqSite = this.beachRegistry.getBeach(reqSiteId);
    if (!reqSite) {
      return { success: false, error: `Requesting site '${input.requestingSiteId}' not found in registry.` };
    }

    const recSite = this.beachRegistry.getBeach(recSiteId);
    if (!recSite) {
      return { success: false, error: `Receiving site '${input.receivingSiteId}' not found in registry.` };
    }

    if (reqSiteId === recSiteId) {
      return { success: false, error: 'Requesting site and receiving site must be different for cross-site coordination.' };
    }

    if (!input.rationale || input.rationale.trim().length === 0) {
      return { success: false, error: 'Assistance request rationale is required.' };
    }

    if (!input.incidentId || input.incidentId.trim().length === 0) {
      return { success: false, error: 'Assistance request must be linked to an authoritative incident ID.' };
    }

    const now = Date.now();
    const requestId = `XREQ-${String(this.requestCounter++).padStart(4, '0')}`;

    const auditEntry: AssistanceAuditEntry = {
      timestamp: now,
      operatorId: input.operatorId,
      status: 'REQUESTED',
      notes: `Request created: ${input.resourceType} requested for incident ${input.incidentId} (${input.urgency}). Rationale: ${input.rationale}`,
    };

    const newRequest: CrossSiteAssistanceRequest = {
      requestId,
      requestingSiteId: reqSiteId,
      requestingSiteName: reqSite.name,
      receivingSiteId: recSiteId,
      receivingSiteName: recSite.name,
      incidentId: input.incidentId,
      resourceType: input.resourceType,
      urgency: input.urgency,
      rationale: input.rationale,
      status: 'REQUESTED',
      requestedAt: now,
      auditTrail: [auditEntry],
      isRealDispatched: false, // Strict: Never auto-dispatches physical resources
    };

    this.requests.set(requestId, newRequest);
    return { success: true, request: newRequest };
  }

  /**
   * Receiving site acknowledges the incoming assistance request.
   */
  public acknowledgeRequest(requestId: string, operatorId: string, notes?: string): { success: boolean; error?: string } {
    const req = this.requests.get(requestId);
    if (!req) return { success: false, error: `Request '${requestId}' not found.` };

    if (req.status !== 'REQUESTED') {
      return { success: false, error: `Cannot acknowledge request in '${req.status}' state.` };
    }

    req.status = 'ACKNOWLEDGED';
    req.respondedAt = Date.now();
    req.respondingOperatorId = operatorId;
    req.auditTrail.push({
      timestamp: Date.now(),
      operatorId,
      status: 'ACKNOWLEDGED',
      notes: notes || 'Assistance request acknowledged by receiving site operator.',
    });

    return { success: true };
  }

  /**
   * Receiving site operator explicitly accepts the request.
   * Note: This records coordination agreement; local dispatch requires local operator execution.
   */
  public acceptRequest(requestId: string, operatorId: string, responseNotes?: string): { success: boolean; error?: string } {
    const req = this.requests.get(requestId);
    if (!req) return { success: false, error: `Request '${requestId}' not found.` };

    if (req.status !== 'REQUESTED' && req.status !== 'ACKNOWLEDGED') {
      return { success: false, error: `Cannot accept request in '${req.status}' state.` };
    }

    req.status = 'ACCEPTED';
    req.respondedAt = Date.now();
    req.respondingOperatorId = operatorId;
    req.responseNotes = responseNotes;
    req.auditTrail.push({
      timestamp: Date.now(),
      operatorId,
      status: 'ACCEPTED',
      notes: responseNotes || 'Assistance request accepted by receiving site. Resource mobilization authorized locally.',
    });

    return { success: true };
  }

  /**
   * Receiving site operator declines the request with documented reason.
   */
  public declineRequest(requestId: string, operatorId: string, reason: string): { success: boolean; error?: string } {
    const req = this.requests.get(requestId);
    if (!req) return { success: false, error: `Request '${requestId}' not found.` };

    if (req.status !== 'REQUESTED' && req.status !== 'ACKNOWLEDGED') {
      return { success: false, error: `Cannot decline request in '${req.status}' state.` };
    }

    if (!reason || reason.trim().length === 0) {
      return { success: false, error: 'Declining an assistance request requires a documented operational reason.' };
    }

    req.status = 'DECLINED';
    req.respondedAt = Date.now();
    req.respondingOperatorId = operatorId;
    req.responseNotes = reason;
    req.auditTrail.push({
      timestamp: Date.now(),
      operatorId,
      status: 'DECLINED',
      notes: `Declined: ${reason}`,
    });

    return { success: true };
  }

  /**
   * Marks an accepted assistance mission as completed.
   */
  public completeRequest(requestId: string, operatorId: string, completionNotes?: string): { success: boolean; error?: string } {
    const req = this.requests.get(requestId);
    if (!req) return { success: false, error: `Request '${requestId}' not found.` };

    if (req.status !== 'ACCEPTED') {
      return { success: false, error: `Cannot complete request in '${req.status}' state; must be 'ACCEPTED'.` };
    }

    req.status = 'COMPLETED';
    req.auditTrail.push({
      timestamp: Date.now(),
      operatorId,
      status: 'COMPLETED',
      notes: completionNotes || 'Assistance mission completed and resource stood down.',
    });

    return { success: true };
  }

  /**
   * Cancels a pending or acknowledged request.
   */
  public cancelRequest(requestId: string, operatorId: string, reason: string): { success: boolean; error?: string } {
    const req = this.requests.get(requestId);
    if (!req) return { success: false, error: `Request '${requestId}' not found.` };

    if (req.status === 'COMPLETED' || req.status === 'DECLINED' || req.status === 'CANCELLED') {
      return { success: false, error: `Cannot cancel request in terminal state '${req.status}'.` };
    }

    req.status = 'CANCELLED';
    req.auditTrail.push({
      timestamp: Date.now(),
      operatorId,
      status: 'CANCELLED',
      notes: `Cancelled: ${reason}`,
    });

    return { success: true };
  }

  /**
   * Retrieves assistance requests matching optional filters.
   */
  public getRequests(filters?: {
    requestingSiteId?: string;
    receivingSiteId?: string;
    status?: AssistanceRequestStatus;
    incidentId?: string;
  }): CrossSiteAssistanceRequest[] {
    let list = Array.from(this.requests.values());

    if (filters) {
      if (filters.requestingSiteId && filters.requestingSiteId !== 'ALL') {
        const norm = filters.requestingSiteId.toUpperCase();
        list = list.filter((r) => r.requestingSiteId === norm);
      }
      if (filters.receivingSiteId && filters.receivingSiteId !== 'ALL') {
        const norm = filters.receivingSiteId.toUpperCase();
        list = list.filter((r) => r.receivingSiteId === norm);
      }
      if (filters.status) {
        list = list.filter((r) => r.status === filters.status);
      }
      if (filters.incidentId) {
        list = list.filter((r) => r.incidentId === filters.incidentId);
      }
    }

    // Sort newest first
    return list.sort((a, b) => b.requestedAt - a.requestedAt);
  }

  public getRequest(requestId: string): CrossSiteAssistanceRequest | undefined {
    return this.requests.get(requestId);
  }

  private calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

