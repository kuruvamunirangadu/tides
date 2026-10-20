/**
 * src/regional/RegionalResourceRegistry.ts
 * Cross-beach emergency rescue fleet inventory for Andhra Pradesh coastal monitoring.
 * Strictly advisory: cross-beach transfer requests never automatically reassign or dispatch assets.
 */

import { RegionalResourceRecord, AdvisoryTransferEvaluation } from './types';

export class RegionalResourceRegistry {
  private static instance: RegionalResourceRegistry | null = null;
  private resources: Map<string, RegionalResourceRecord> = new Map();

  constructor() {
    this.initializeFleet();
  }

  public static getInstance(): RegionalResourceRegistry {
    if (!RegionalResourceRegistry.instance) {
      RegionalResourceRegistry.instance = new RegionalResourceRegistry();
    }
    return RegionalResourceRegistry.instance;
  }

  public initializeFleet(): void {
    this.resources.clear();
    const now = Date.now();

    // --- 1. RUSHIKONDA FLEET (Connected Digital Twin) ---
    this.resources.set('RB-01', {
      resourceId: 'RB-01',
      resourceName: 'Rapid Response Rescue Boat (Sea Patrol)',
      resourceType: 'RESCUE_BOAT',
      homeBeachId: 'RUSHIKONDA',
      assignedBeachId: 'RUSHIKONDA',
      operationalStatus: 'AVAILABLE',
      activeIncidentId: null,
      lastUpdated: now,
      provenance: 'SIMULATED',
      speedMps: 18.5,
      isCrossBeachEligible: true,
      advisoryTransitNote: 'Deep-draft offshore hull capable of coastal transit to RK Beach or Bheemili under calm seas.',
    });

    this.resources.set('RB-02', {
      resourceId: 'RB-02',
      resourceName: 'Reserve Rapid Rescue Boat (Zodiac Patrol)',
      resourceType: 'RESCUE_BOAT',
      homeBeachId: 'RUSHIKONDA',
      assignedBeachId: 'RUSHIKONDA',
      operationalStatus: 'AVAILABLE',
      activeIncidentId: null,
      lastUpdated: now,
      provenance: 'SIMULATED',
      speedMps: 16.0,
      isCrossBeachEligible: false,
      advisoryTransitNote: 'Inshore shallow craft reserved for local Rushikonda bay defense.',
    });

    this.resources.set('LG-01', {
      resourceId: 'LG-01',
      resourceName: 'Lifeguard Rescue Squad 01 (West Station)',
      resourceType: 'LIFEGUARD',
      homeBeachId: 'RUSHIKONDA',
      assignedBeachId: 'RUSHIKONDA',
      operationalStatus: 'AVAILABLE',
      activeIncidentId: null,
      lastUpdated: now,
      provenance: 'SIMULATED',
      speedMps: 7.2,
      isCrossBeachEligible: false,
      advisoryTransitNote: 'Stationary beach patrol tower; non-transferrable overland asset.',
    });

    this.resources.set('LG-02', {
      resourceId: 'LG-02',
      resourceName: 'Lifeguard Rescue Squad 02 (Central Station)',
      resourceType: 'LIFEGUARD',
      homeBeachId: 'RUSHIKONDA',
      assignedBeachId: 'RUSHIKONDA',
      operationalStatus: 'AVAILABLE',
      activeIncidentId: null,
      lastUpdated: now,
      provenance: 'SIMULATED',
      speedMps: 7.2,
      isCrossBeachEligible: false,
      advisoryTransitNote: 'Stationary beach patrol tower; non-transferrable overland asset.',
    });

    this.resources.set('DRONE-01', {
      resourceId: 'DRONE-01',
      resourceName: 'Autonomous Lifesaving UAV (Rushikonda Perch)',
      resourceType: 'DRONE',
      homeBeachId: 'RUSHIKONDA',
      assignedBeachId: 'RUSHIKONDA',
      operationalStatus: 'AVAILABLE',
      activeIncidentId: null,
      lastUpdated: now,
      provenance: 'SIMULATED',
      speedMps: 22.0,
      isCrossBeachEligible: true,
      advisoryTransitNote: 'Max range 15km; cross-beach verification flights require line-of-sight telemetry authorization.',
    });

    // --- 2. RK BEACH FLEET (Demonstration Assets) ---
    this.resources.set('RK-RB-01', {
      resourceId: 'RK-RB-01',
      resourceName: 'RK Coastal Jet Boat 01',
      resourceType: 'RESCUE_BOAT',
      homeBeachId: 'RK_BEACH',
      assignedBeachId: 'RK_BEACH',
      operationalStatus: 'AVAILABLE',
      activeIncidentId: null,
      lastUpdated: now - 1800 * 1000,
      provenance: 'DEMONSTRATION',
      speedMps: 17.0,
      isCrossBeachEligible: true,
      advisoryTransitNote: 'Transit to Rushikonda: ~12.5 km (Advisory Only).',
    });

    this.resources.set('RK-LG-01', {
      resourceId: 'RK-LG-01',
      resourceName: 'RK Lifeguard Tower 01 Squad',
      resourceType: 'LIFEGUARD',
      homeBeachId: 'RK_BEACH',
      assignedBeachId: 'RK_BEACH',
      operationalStatus: 'DISPATCHED',
      activeIncidentId: 'INC-RK-01',
      lastUpdated: now - 1200 * 1000,
      provenance: 'DEMONSTRATION',
      speedMps: 7.0,
      isCrossBeachEligible: false,
      advisoryTransitNote: 'Stationary tower; actively handling INC-RK-01.',
    });

    this.resources.set('RK-LG-02', {
      resourceId: 'RK-LG-02',
      resourceName: 'RK Lifeguard Tower 02 Squad',
      resourceType: 'LIFEGUARD',
      homeBeachId: 'RK_BEACH',
      assignedBeachId: 'RK_BEACH',
      operationalStatus: 'AVAILABLE',
      activeIncidentId: null,
      lastUpdated: now - 2000 * 1000,
      provenance: 'DEMONSTRATION',
      speedMps: 7.0,
      isCrossBeachEligible: false,
      advisoryTransitNote: 'Stationary tower.',
    });

    this.resources.set('RK-DRONE-01', {
      resourceId: 'RK-DRONE-01',
      resourceName: 'RK Reconnaissance Drone',
      resourceType: 'DRONE',
      homeBeachId: 'RK_BEACH',
      assignedBeachId: 'RK_BEACH',
      operationalStatus: 'AVAILABLE',
      activeIncidentId: null,
      lastUpdated: now - 1500 * 1000,
      provenance: 'DEMONSTRATION',
      speedMps: 20.0,
      isCrossBeachEligible: true,
      advisoryTransitNote: 'Demonstration aerial asset.',
    });

    // --- 3. BHEEMILI FLEET (Demonstration Assets) ---
    this.resources.set('BHM-RB-01', {
      resourceId: 'BHM-RB-01',
      resourceName: 'Bheemili Fast Jet Boat',
      resourceType: 'RESCUE_BOAT',
      homeBeachId: 'BHEEMILI',
      assignedBeachId: 'BHEEMILI',
      operationalStatus: 'DISPATCHED',
      activeIncidentId: 'INC-BHM-01',
      lastUpdated: now - 900 * 1000,
      provenance: 'DEMONSTRATION',
      speedMps: 19.0,
      isCrossBeachEligible: true,
      advisoryTransitNote: 'Dispatched to rocky breakwater incident INC-BHM-01.',
    });

    this.resources.set('BHM-LG-01', {
      resourceId: 'BHM-LG-01',
      resourceName: 'Bheemili Estuary Lifeguard Squad',
      resourceType: 'LIFEGUARD',
      homeBeachId: 'BHEEMILI',
      assignedBeachId: 'BHEEMILI',
      operationalStatus: 'AVAILABLE',
      activeIncidentId: null,
      lastUpdated: now - 400 * 1000,
      provenance: 'DEMONSTRATION',
      speedMps: 6.8,
      isCrossBeachEligible: false,
      advisoryTransitNote: 'Stationary beach unit.',
    });

    // --- 4. SURYALANKA FLEET (Demonstration Assets) ---
    this.resources.set('SL-LG-01', {
      resourceId: 'SL-LG-01',
      resourceName: 'Suryalanka Beach Lifeguard Post 01',
      resourceType: 'LIFEGUARD',
      homeBeachId: 'SURYALANKA',
      assignedBeachId: 'SURYALANKA',
      operationalStatus: 'AVAILABLE',
      activeIncidentId: null,
      lastUpdated: now - 300 * 1000,
      provenance: 'DEMONSTRATION',
      speedMps: 7.0,
      isCrossBeachEligible: false,
      advisoryTransitNote: 'Local Bapatla beach squad.',
    });

    this.resources.set('SL-RB-01', {
      resourceId: 'SL-RB-01',
      resourceName: 'Suryalanka Inshore Inflatable Craft',
      resourceType: 'RESCUE_BOAT',
      homeBeachId: 'SURYALANKA',
      assignedBeachId: 'SURYALANKA',
      operationalStatus: 'AVAILABLE',
      activeIncidentId: null,
      lastUpdated: now - 300 * 1000,
      provenance: 'DEMONSTRATION',
      speedMps: 14.0,
      isCrossBeachEligible: false,
      advisoryTransitNote: 'Local inshore craft only.',
    });
  }

  public syncRushikondaFleet(
    resources: Array<{ id: string; status: string; assignedIncidentId?: string | null }>
  ): void {
    const now = Date.now();
    for (const r of resources) {
      const rec = this.resources.get(r.id);
      if (rec) {
        rec.lastUpdated = now;
        rec.operationalStatus = (r.status as any) || 'AVAILABLE';
        rec.activeIncidentId = r.assignedIncidentId || null;
      }
    }
  }

  public getAllResources(filters?: {
    beachId?: string;
    resourceType?: string;
    operationalStatus?: string;
  }): RegionalResourceRecord[] {
    let results = Array.from(this.resources.values());

    if (filters) {
      if (filters.beachId && filters.beachId !== 'ALL') {
        results = results.filter(
          (r) =>
            r.assignedBeachId.toUpperCase() === filters.beachId!.toUpperCase() ||
            r.homeBeachId.toUpperCase() === filters.beachId!.toUpperCase()
        );
      }
      if (filters.resourceType && filters.resourceType !== 'ALL') {
        results = results.filter((r) => r.resourceType.toUpperCase() === filters.resourceType!.toUpperCase());
      }
      if (filters.operationalStatus && filters.operationalStatus !== 'ALL') {
        results = results.filter(
          (r) => r.operationalStatus.toUpperCase() === filters.operationalStatus!.toUpperCase()
        );
      }
    }

    return results;
  }

  public getResource(resourceId: string): RegionalResourceRecord | undefined {
    return this.resources.get(resourceId.toUpperCase());
  }

  public evaluateCrossBeachTransfer(resourceId: string, targetBeachId: string): AdvisoryTransferEvaluation {
    const res = this.resources.get(resourceId.toUpperCase());
    if (!res) {
      return {
        allowed: false,
        reason: `Resource '${resourceId}' not found in fleet registry.`,
        advisory: 'Cannot evaluate transfer for unknown asset.',
      };
    }

    if (!res.isCrossBeachEligible) {
      return {
        allowed: false,
        reason: `Asset '${res.resourceName}' (${res.resourceType}) is station-bound and not eligible for inter-beach transit.`,
        advisory: 'Stationary assets (towers) cannot be transferred. Use mobile rescue boats or UAVs.',
      };
    }

    if (res.operationalStatus !== 'AVAILABLE') {
      return {
        allowed: false,
        reason: `Asset '${res.resourceName}' is currently ${res.operationalStatus} and cannot be redeployed.`,
        advisory: 'Await incident resolution or mission release before cross-beach assignment.',
      };
    }

    return {
      allowed: true,
      resourceId: res.resourceId,
      homeBeachId: res.homeBeachId,
      targetBeachId: targetBeachId.toUpperCase(),
      transitFeasible: true,
      notice:
        'ADVISORY ONLY: Cross-beach dispatch must be explicitly authorized by regional operations commander. Automated cross-dispatch disabled.',
    };
  }
}

