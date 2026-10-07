import { EmergencyResource } from '../../emergency/models/EmergencyResource';
import { ResourceMetrics, ResourceUtilizationMetric } from '../metrics/Types';

export class ResourceHistory {
  private resourceTimeMap: Map<
    string,
    {
      operationalTimeSec: number;
      busyTimeSec: number;
      missionsCompleted: number;
    }
  > = new Map();

  public sample(resources: EmergencyResource[], deltaSec: number): void {
    for (const r of resources) {
      let rec = this.resourceTimeMap.get(r.id);
      if (!rec) {
        rec = { operationalTimeSec: 0, busyTimeSec: 0, missionsCompleted: 0 };
        this.resourceTimeMap.set(r.id, rec);
      }

      rec.operationalTimeSec += deltaSec;
      if (r.status === 'DISPATCHED' || r.status === 'ON_SCENE' || r.status === 'RETURNING') {
        rec.busyTimeSec += deltaSec;
      }
    }
  }

  public recordMissionComplete(resourceId: string): void {
    const rec = this.resourceTimeMap.get(resourceId);
    if (rec) {
      rec.missionsCompleted += 1;
    }
  }

  public getResourceMetrics(currentResources: EmergencyResource[]): ResourceMetrics {
    const list: ResourceUtilizationMetric[] = [];
    let totalBusy = 0;
    let totalOperational = 0;

    let lgBusy = 0, lgTotal = 0;
    let drBusy = 0, drTotal = 0;
    let btBusy = 0, btTotal = 0;
    let ambBusy = 0, ambTotal = 0;
    let polBusy = 0, polTotal = 0;

    for (const r of currentResources) {
      const rec = this.resourceTimeMap.get(r.id) || {
        operationalTimeSec: 1,
        busyTimeSec: 0,
        missionsCompleted: 0,
      };

      const opTime = Math.max(1, rec.operationalTimeSec);
      const utilRate = Math.min(100, Math.round((rec.busyTimeSec / opTime) * 100));

      totalBusy += rec.busyTimeSec;
      totalOperational += opTime;

      if (r.type === 'LIFEGUARD') {
        lgBusy += rec.busyTimeSec;
        lgTotal += opTime;
      } else if (r.type === 'DRONE') {
        drBusy += rec.busyTimeSec;
        drTotal += opTime;
      } else if (r.type === 'RESCUE_BOAT') {
        btBusy += rec.busyTimeSec;
        btTotal += opTime;
      } else if (r.type === 'AMBULANCE') {
        ambBusy += rec.busyTimeSec;
        ambTotal += opTime;
      } else if (r.type === 'POLICE' || r.type === 'EMERGENCY_VEHICLE') {
        polBusy += rec.busyTimeSec;
        polTotal += opTime;
      }

      list.push({
        resourceId: r.id,
        name: r.name,
        type: r.type,
        status: r.status,
        totalOperationalTimeSeconds: Math.round(rec.operationalTimeSec),
        totalBusyTimeSeconds: Math.round(rec.busyTimeSec),
        utilizationRate: utilRate,
        missionsCompleted: rec.missionsCompleted,
        currentIncidentId: r.currentIncidentId,
      });
    }

    const overallRate = totalOperational > 0 ? Math.round((totalBusy / totalOperational) * 100) : 0;
    const availableCount = currentResources.filter((r) => r.status === 'AVAILABLE').length;
    const busyCount = currentResources.filter(
      (r) => r.status === 'DISPATCHED' || r.status === 'ON_SCENE' || r.status === 'RETURNING' || r.status === 'BUSY'
    ).length;
    const failedCount = currentResources.filter((r) => r.status === 'UNAVAILABLE').length;

    return {
      overallUtilizationRate: overallRate,
      fleetBreakdown: {
        lifeguardUtilization: lgTotal > 0 ? Math.round((lgBusy / lgTotal) * 100) : 0,
        droneUtilization: drTotal > 0 ? Math.round((drBusy / drTotal) * 100) : 0,
        boatUtilization: btTotal > 0 ? Math.round((btBusy / btTotal) * 100) : 0,
        ambulanceUtilization: ambTotal > 0 ? Math.round((ambBusy / ambTotal) * 100) : 0,
        policeUtilization: polTotal > 0 ? Math.round((polBusy / polTotal) * 100) : 0,
      },
      totalFleetCount: currentResources.length,
      availableCount,
      busyCount,
      failedCount,
      resources: list,
    };
  }

  public reset(): void {
    this.resourceTimeMap.clear();
  }
}
