import { BeachRegistry } from './BeachRegistry';
import { RegionalIncidentAdapter } from './RegionalIncidentAdapter';
import { RegionalResourceRegistry } from './RegionalResourceRegistry';
import { RegionalBeachRecord, RegionalIncidentRecord, RegionalResourceRecord } from './types';

export interface IncidentPriorityRecord {
  incident: RegionalIncidentRecord;
  priorityScore: number;
  rationale: string;
}

export interface ResourceRecommendation {
  resource: RegionalResourceRecord;
  eligible: boolean;
  rationale: string;
}

export interface RegionalOperationalSnapshot {
  regions: Array<{
    region: RegionalBeachRecord;
    activeIncidentCount: number;
    unassignedIncidentCount: number;
    availableResourceCount: number;
    staleTelemetry: boolean;
    forecastWarning: string | null;
  }>;
  prioritizedIncidents: IncidentPriorityRecord[];
  availableResources: number;
  assignedResources: number;
}

export class Phase5CoordinationService {
  private readonly registry: BeachRegistry;
  private readonly incidents: RegionalIncidentAdapter;
  private readonly resources: RegionalResourceRegistry;

  public constructor(
    registry: BeachRegistry = BeachRegistry.getInstance(),
    incidents: RegionalIncidentAdapter = RegionalIncidentAdapter.getInstance(),
    resources: RegionalResourceRegistry = RegionalResourceRegistry.getInstance()
  ) {
    this.registry = registry;
    this.incidents = incidents;
    this.resources = resources;
  }

  public getSnapshot(nowMs: number = Date.now()): RegionalOperationalSnapshot {
    const regions = this.registry.getBeaches().map((region) => {
      const incidents = this.incidents.getAllIncidents({ siteId: region.beachId }).filter((incident) => incident.status !== 'RESOLVED');
      const resources = this.resources.getAllResources({ beachId: region.beachId });
      return {
        region,
        activeIncidentCount: incidents.length,
        unassignedIncidentCount: incidents.filter((incident) => !incident.assignedResourceId).length,
        availableResourceCount: resources.filter((resource) => this.isResourceReady(resource, nowMs)).length,
        staleTelemetry: region.dataFreshness !== 'FRESH' || !region.connected,
        forecastWarning: null,
      };
    });
    const allResources = this.resources.getAllResources();
    return {
      regions,
      prioritizedIncidents: this.prioritizeIncidents(nowMs),
      availableResources: allResources.filter((resource) => this.isResourceReady(resource, nowMs)).length,
      assignedResources: allResources.filter((resource) => resource.operationalStatus !== 'AVAILABLE').length,
    };
  }

  public prioritizeIncidents(nowMs: number = Date.now()): IncidentPriorityRecord[] {
    const severityRank: Record<RegionalIncidentRecord['severity'], number> = {
      LOW: 1,
      MODERATE: 2,
      HIGH: 3,
      CRITICAL: 4,
    };
    return this.incidents
      .getAllIncidents()
      .filter((incident) => incident.status !== 'RESOLVED')
      .map((incident) => {
        const ageSeconds = Math.max(0, (nowMs - incident.createdAt) / 1000);
        const priorityScore = severityRank[incident.severity] * 100 + incident.distressLevel * 20 + Math.min(30, ageSeconds / 60);
        return {
          incident,
          priorityScore,
          rationale: `${incident.severity} severity, distress ${(incident.distressLevel * 100).toFixed(0)}%, waiting ${Math.round(ageSeconds)}s; forecast context does not replace individual distress state.`,
        };
      })
      .sort((a, b) => b.priorityScore - a.priorityScore || a.incident.createdAt - b.incident.createdAt || a.incident.incidentId.localeCompare(b.incident.incidentId));
  }

  public recommendResources(incident: RegionalIncidentRecord, nowMs: number = Date.now()): ResourceRecommendation[] {
    return this.resources.getAllResources().map((resource) => {
      if (!this.isResourceReady(resource, nowMs)) {
        return { resource, eligible: false, rationale: `Excluded: ${resource.operationalStatus !== 'AVAILABLE' ? `resource is ${resource.operationalStatus}` : 'telemetry is stale'}.` };
      }
      const local = resource.assignedBeachId === incident.siteId || resource.homeBeachId === incident.siteId;
      if (!local && !resource.isCrossBeachEligible) {
        return { resource, eligible: false, rationale: 'Excluded: station-bound resource is not cross-beach eligible.' };
      }
      return {
        resource,
        eligible: true,
        rationale: local
          ? `Eligible local ${resource.resourceType.toLowerCase()} with available status and fresh simulated registry data.`
          : `Eligible cross-beach ${resource.resourceType.toLowerCase()}; operator authorization and transit review are still required.`,
      };
    }).sort((a, b) => Number(b.eligible) - Number(a.eligible) || a.resource.resourceId.localeCompare(b.resource.resourceId));
  }

  private isResourceReady(resource: RegionalResourceRecord, nowMs: number): boolean {
    return resource.operationalStatus === 'AVAILABLE' && nowMs - resource.lastUpdated <= 15 * 60 * 1000;
  }
}