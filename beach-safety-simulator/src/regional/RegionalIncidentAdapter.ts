/**
 * src/regional/RegionalIncidentAdapter.ts
 * Read-only adapter for multi-beach incident feed across Andhra Pradesh coastal sectors.
 * Preserves original timestamps, deduplicates events, and strictly avoids state mutations.
 */

import { RegionalIncidentRecord } from './types';

export class RegionalIncidentAdapter {
  private static instance: RegionalIncidentAdapter | null = null;
  private incidents: Map<string, RegionalIncidentRecord> = new Map();

  constructor() {
    this.initializeDemoIncidents();
  }

  public static getInstance(): RegionalIncidentAdapter {
    if (!RegionalIncidentAdapter.instance) {
      RegionalIncidentAdapter.instance = new RegionalIncidentAdapter();
    }
    return RegionalIncidentAdapter.instance;
  }

  public initializeDemoIncidents(): void {
    this.incidents.clear();
    const now = Date.now();

    // Demonstration incident at RK Beach
    this.incidents.set('INC-RK-01', {
      incidentId: 'INC-RK-01',
      siteId: 'RK_BEACH',
      siteName: 'Ramakrishna (RK) Beach, Visakhapatnam',
      createdAt: now - 2400 * 1000,
      updatedAt: now - 1200 * 1000,
      severity: 'HIGH',
      distressLevel: 0.75,
      status: 'ON_SCENE',
      acknowledgementStatus: 'ACKNOWLEDGED',
      assignedResourceId: 'RK-LG-01',
      assignedResourceName: 'RK Lifeguard Tower 01 Squad',
      description: 'Swimmer caught in longshore tidal drift near Kali Temple sector.',
      provenance: 'DEMONSTRATION',
    });

    // Demonstration incident 1 at Bheemili Beach
    this.incidents.set('INC-BHM-01', {
      incidentId: 'INC-BHM-01',
      siteId: 'BHEEMILI',
      siteName: 'Bheemunipatnam (Bheemili) Beach',
      createdAt: now - 1800 * 1000,
      updatedAt: now - 900 * 1000,
      severity: 'CRITICAL',
      distressLevel: 0.90,
      status: 'DISPATCHED',
      acknowledgementStatus: 'ACKNOWLEDGED',
      assignedResourceId: 'BHM-RB-01',
      assignedResourceName: 'Bheemili Fast Jet Boat',
      description: 'Two bathers swept beyond rocky breakwater during high spring tide swell.',
      provenance: 'DEMONSTRATION',
    });

    // Demonstration incident 2 at Bheemili Beach
    this.incidents.set('INC-BHM-02', {
      incidentId: 'INC-BHM-02',
      siteId: 'BHEEMILI',
      siteName: 'Bheemunipatnam (Bheemili) Beach',
      createdAt: now - 600 * 1000,
      updatedAt: now - 150 * 1000,
      severity: 'MODERATE',
      distressLevel: 0.55,
      status: 'REPORTED',
      acknowledgementStatus: 'PENDING',
      assignedResourceId: null,
      assignedResourceName: null,
      description: 'Distressed child in knee-deep surge near river mouth channel.',
      provenance: 'DEMONSTRATION',
    });
  }

  public syncRushikondaIncidents(
    incidents: Array<{
      incidentId: string;
      distressLevel: number;
      status: string;
      assignedResourceId?: string | null;
      assignedResourceName?: string | null;
      createdAt?: number;
      notes?: string;
    }>
  ): void {
    const now = Date.now();
    for (const inc of incidents) {
      const existing = this.incidents.get(inc.incidentId);
      const createdAt = inc.createdAt || (existing ? existing.createdAt : now);

      this.incidents.set(inc.incidentId, {
        incidentId: inc.incidentId,
        siteId: 'RUSHIKONDA',
        siteName: 'Rushikonda Blue Flag Beach, Visakhapatnam',
        createdAt,
        updatedAt: now,
        severity: inc.distressLevel >= 0.75 ? 'CRITICAL' : 'HIGH',
        distressLevel: inc.distressLevel,
        status: (inc.status as any) || 'REPORTED',
        acknowledgementStatus: 'ACKNOWLEDGED',
        assignedResourceId: inc.assignedResourceId || null,
        assignedResourceName: inc.assignedResourceName || null,
        description: inc.notes || 'Simulated active distress event at Rushikonda Beach.',
        provenance: 'SIMULATED',
      });
    }
  }

  public ingestIncident(record: RegionalIncidentRecord): void {
    const existing = this.incidents.get(record.incidentId);
    if (existing) {
      record.createdAt = Math.min(existing.createdAt, record.createdAt);
    }
    this.incidents.set(record.incidentId, record);
  }

  public getAllIncidents(filters?: {
    siteId?: string;
    severity?: string;
    status?: string;
  }): RegionalIncidentRecord[] {
    let results = Array.from(this.incidents.values());

    if (filters) {
      if (filters.siteId && filters.siteId !== 'ALL') {
        results = results.filter((i) => i.siteId.toUpperCase() === filters.siteId!.toUpperCase());
      }
      if (filters.severity && filters.severity !== 'ALL') {
        results = results.filter((i) => i.severity.toUpperCase() === filters.severity!.toUpperCase());
      }
      if (filters.status && filters.status !== 'ALL') {
        results = results.filter((i) => i.status.toUpperCase() === filters.status!.toUpperCase());
      }
    }

    // Deterministic sorting: newest updated/created first
    results.sort((a, b) => b.updatedAt - a.updatedAt || b.createdAt - a.createdAt);
    return results;
  }

  public getIncident(incidentId: string): RegionalIncidentRecord | undefined {
    return this.incidents.get(incidentId);
  }
}

