import { Zone } from '../models/Zone';
import { Visitor } from '../models/Visitor';

export class ZoneManager {
  private zones: Zone[];

  constructor(zones: Zone[]) {
    this.zones = [...zones];
  }

  public getZoneAt(x: number, y: number): Zone | null {
    // Check zones in reverse order (e.g. specialized zones first)
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      if (
        x >= z.x &&
        x <= z.x + z.width &&
        y >= z.y &&
        y <= z.y + z.height
      ) {
        return z;
      }
    }
    return null;
  }

  public getZoneById(id: string): Zone | null {
    return this.zones.find((z) => z.id === id) || null;
  }

  public calculateStats(visitors: Visitor[]): {
    total: number;
    beach: number;
    swimming: number;
    water: number;
    restricted: number;
  } {
    let beachCount = 0;
    let swimmingCount = 0;
    let waterCount = 0;
    let restrictedCount = 0;

    for (const v of visitors) {
      const z = this.getZoneAt(v.position.x, v.position.y);
      if (z) {
        switch (z.type) {
          case 'BEACH_ZONE':
            beachCount++;
            break;
          case 'SWIMMING':
            swimmingCount++;
            break;
          case 'WATER_AREA':
          case 'SHORELINE':
            waterCount++;
            break;
          case 'RESTRICTED':
            restrictedCount++;
            break;
          default:
            beachCount++;
        }
      } else {
        // Fallback based on Y position (below shoreline is water, above is beach)
        if (v.position.y > 250) {
          waterCount++;
        } else {
          beachCount++;
        }
      }
    }

    return {
      total: visitors.length,
      beach: beachCount,
      swimming: swimmingCount,
      water: waterCount,
      restricted: restrictedCount,
    };
  }

  public getZones(): Zone[] {
    return this.zones;
  }
}
