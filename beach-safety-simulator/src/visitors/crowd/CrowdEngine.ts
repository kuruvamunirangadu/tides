import { Visitor } from '../../models/Visitor';
import { Zone } from '../../models/Zone';
import { DensityCalculator, ZoneDensityStats } from './DensityCalculator';
import { GroupManager } from './GroupManager';

export class CrowdEngine {
  private groupManager: GroupManager = new GroupManager();

  public getGroupManager(): GroupManager {
    return this.groupManager;
  }

  public updateCrowdDynamics(
    visitors: Visitor[],
    zones: Zone[]
  ): {
    densityStats: Map<string, ZoneDensityStats>;
    crowdedZones: string[];
  } {
    const densityStats = DensityCalculator.calculateZoneDensities(visitors, zones);
    const crowdedZones: string[] = [];

    // Apply crowd congestion slowing down movement
    densityStats.forEach((stats, zoneId) => {
      if (stats.densityLevel === 'HIGH' || stats.densityLevel === 'EXTREME') {
        crowdedZones.push(zoneId);
      }
    });

    // Slow down visitors in high density zones due to congestion
    visitors.forEach((v) => {
      if (!v.active) return;
      const stats = densityStats.get(v.currentZone);
      if (stats) {
        if (stats.densityLevel === 'EXTREME') {
          v.speed = Math.min(v.speed, 0.4); // significant congestion slowdown
        } else if (stats.densityLevel === 'HIGH') {
          v.speed = Math.min(v.speed, 0.7);
        }
      }
    });

    return {
      densityStats,
      crowdedZones,
    };
  }
}
