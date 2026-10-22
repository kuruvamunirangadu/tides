import { Incident, IncidentSeverity, IncidentType, Position } from '../../models/Incident';
import { Visitor } from '../../models/Visitor';
import { Zone } from '../../models/Zone';
import { ZoneDensityStats } from '../crowd/DensityCalculator';
import { IncidentHistory } from './IncidentHistory';

export class IncidentManager {
  private static instance: IncidentManager | null = null;
  private activeIncidents: Map<string, Incident> = new Map();
  private history: IncidentHistory = new IncidentHistory();

  public static getInstance(): IncidentManager {
    if (!IncidentManager.instance) {
      IncidentManager.instance = new IncidentManager();
    }
    return IncidentManager.instance;
  }

  public getActiveIncidents(): Incident[] {
    return Array.from(this.activeIncidents.values()).filter((inc) => inc.active);
  }

  public getHistory(): Incident[] {
    return this.history.getHistory();
  }

  public createIncident(
    type: IncidentType,
    visitorIds: string[],
    zoneId: string,
    severity: IncidentSeverity,
    title: string,
    description: string,
    location: Position,
    currentTime: number
  ): Incident {
    const id = `INC-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 1000)}`;
    const incident: Incident = {
      id,
      type,
      visitorIds,
      zoneId,
      severity,
      title,
      description,
      startedAt: currentTime,
      location,
      active: true,
    };

    this.activeIncidents.set(id, incident);
    this.history.logIncident(incident);
    return incident;
  }

  public evaluateIncidents(
    visitors: Visitor[],
    zones: Zone[],
    densityStats: Map<string, ZoneDensityStats>,
    currentTime: number
  ): Incident[] {
    // 1. Swimmer Distress Incidents (Rapid Early Life-Safety Detection)
    const distressedVisitors = visitors.filter(
      (v) =>
        v.active &&
        (v.state === 'DISTRESS' ||
          (v.distressLevel != null && v.distressLevel > 0.55) ||
          (v.fatigue != null && v.fatigue > 0.70 && v.position.y >= 240) ||
          (v.state === 'STRUGGLING' && v.position.y >= 265) ||
          Boolean(v.distressState?.assistanceRequired))
    );
    distressedVisitors.forEach((v) => {
      // Synchronize state to DISTRESS immediately for fast multi-agency response
      if (v.state !== 'DISTRESS') {
        v.state = 'DISTRESS';
        v.distressLevel = Math.max(0.85, v.distressLevel ?? 0.85);
        if (!v.distressState) {
          v.distressState = {
            level: v.distressLevel,
            cause: 'SWIMMER_DISTRESS' as any,
            startedAt: currentTime,
            location: { ...v.position },
            assistanceRequired: true,
          };
        }
      }

      const existing = Array.from(this.activeIncidents.values()).find(
        (inc) => inc.active && inc.type === 'DISTRESS' && inc.visitorIds.includes(v.id)
      );

      if (!existing) {
        this.createIncident(
          'DISTRESS',
          [v.id],
          v.currentZone,
          'CRITICAL',
          `Distressed Swimmer (${v.type})`,
          `Visitor in ${v.currentZone} experiencing ${v.distressState?.cause || 'severe distress'} and requires emergency assistance.`,
          { ...v.position },
          currentTime
        );
      } else {
        // Dynamically update location coordinates as distressed swimmer drifts with currents
        existing.location = { ...v.position };
      }
    });

    // 2. Restricted Area Entry Incidents
    const restrictedVisitors = visitors.filter(
      (v) => v.active && (v.state === 'IN_RESTRICTED_ZONE' || v.state === 'IGNORING_WARNING')
    );
    restrictedVisitors.forEach((v) => {
      const existing = Array.from(this.activeIncidents.values()).find(
        (inc) => inc.active && inc.type === 'RESTRICTED_ENTRY' && inc.visitorIds.includes(v.id)
      );

      if (!existing) {
        this.createIncident(
          'RESTRICTED_ENTRY',
          [v.id],
          v.currentZone,
          'HIGH',
          `Restricted Zone Violation (${v.currentZone})`,
          `Visitor entered non-bathing or hazardous zone (${v.currentZone}) ignoring safety warnings.`,
          { ...v.position },
          currentTime
        );
      }
    });

    // 3. Crowd Buildup Incidents
    densityStats.forEach((stats, zoneId) => {
      if (stats.densityLevel === 'EXTREME' || stats.count >= 40) {
        const existing = Array.from(this.activeIncidents.values()).find(
          (inc) => inc.active && inc.type === 'CROWD' && inc.zoneId === zoneId
        );

        if (!existing) {
          const zone = zones.find((z) => z.id === zoneId);
          const loc = zone ? { x: zone.x + zone.width / 2, y: zone.y + zone.height / 2 } : { x: 500, y: 300 };
          this.createIncident(
            'CROWD',
            visitors.filter((v) => v.active && v.currentZone === zoneId).slice(0, 5).map((v) => v.id),
            zoneId,
            'HIGH',
            `Extreme Crowd Congestion (${zoneId})`,
            `High crowd density (${stats.count} visitors) causing mobility bottlenecks and heightened exposure.`,
            loc,
            currentTime
          );
        }
      }
    });

    // 4. Auto-resolve incidents where conditions have cleared
    this.activeIncidents.forEach((inc) => {
      if (!inc.active) return;

      if (inc.type === 'DISTRESS') {
        const anyStillDistressed = visitors.some(
          (v) => v.active && inc.visitorIds.includes(v.id) && v.state === 'DISTRESS'
        );
        if (!anyStillDistressed) {
          inc.active = false;
          inc.resolvedAt = currentTime;
        }
      } else if (inc.type === 'RESTRICTED_ENTRY') {
        const anyStillRestricted = visitors.some(
          (v) =>
            v.active &&
            inc.visitorIds.includes(v.id) &&
            (v.state === 'IN_RESTRICTED_ZONE' || v.state === 'IGNORING_WARNING')
        );
        if (!anyStillRestricted) {
          inc.active = false;
          inc.resolvedAt = currentTime;
        }
      } else if (inc.type === 'CROWD') {
        const stats = densityStats.get(inc.zoneId);
        if (!stats || stats.count < 25) {
          inc.active = false;
          inc.resolvedAt = currentTime;
        }
      }
    });

    return this.getActiveIncidents();
  }

  public clear(): void {
    this.activeIncidents.clear();
    this.history.clear();
  }

  public resolveIncident(incidentId: string, currentTime: number = Date.now()): boolean {
    const inc = this.activeIncidents.get(incidentId);
    if (!inc) return false;
    inc.active = false;
    inc.resolvedAt = currentTime;
    return true;
  }
}
