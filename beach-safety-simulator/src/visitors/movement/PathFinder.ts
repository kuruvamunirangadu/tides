import { Position } from '../../models/Incident';
import { Zone } from '../../models/Zone';

export class PathFinder {
  public static getZoneCenter(zone: Zone): Position {
    return {
      x: zone.x + zone.width / 2,
      y: zone.y + zone.height / 2,
    };
  }

  public static clampToBounds(pos: Position, width = 1200, height = 700): Position {
    return {
      x: Math.max(30, Math.min(width - 30, pos.x)),
      y: Math.max(40, Math.min(height - 40, pos.y)),
    };
  }
}
