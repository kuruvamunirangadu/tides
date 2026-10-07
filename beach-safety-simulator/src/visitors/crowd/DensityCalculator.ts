import { Visitor } from '../../models/Visitor';
import { Zone } from '../../models/Zone';

export interface ZoneDensityStats {
  zoneId: string;
  count: number;
  areaSqMeters: number;
  density: number; // visitors per 100 sq meters
  densityLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
}

export class DensityCalculator {
  public static calculateZoneDensities(
    visitors: Visitor[],
    zones: Zone[]
  ): Map<string, ZoneDensityStats> {
    const statsMap = new Map<string, ZoneDensityStats>();

    zones.forEach((zone) => {
      const area = Math.max(10, (zone.width * zone.height) / 100);
      const zoneVisitors = visitors.filter((v) => v.active && v.currentZone === zone.id);
      const count = zoneVisitors.length;
      const density = (count / area) * 100;

      let densityLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME' = 'LOW';
      if (density > 25 || count > 60) densityLevel = 'EXTREME';
      else if (density > 15 || count > 35) densityLevel = 'HIGH';
      else if (density > 5 || count > 15) densityLevel = 'MODERATE';

      statsMap.set(zone.id, {
        zoneId: zone.id,
        count,
        areaSqMeters: area,
        density,
        densityLevel,
      });
    });

    return statsMap;
  }
}
