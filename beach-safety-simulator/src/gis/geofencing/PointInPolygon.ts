import { GeoPoint } from '../models/GeoPoint';
import { GeoPolygon } from '../models/GeoPolygon';

export class PointInPolygon {
  /**
   * Determine if a point [longitude, latitude] is inside a GeoPolygon
   * using the Ray-Casting algorithm
   */
  public static isPointInGeoPolygon(point: GeoPoint, polygon: GeoPolygon): boolean {
    const x = point.longitude;
    const y = point.latitude;

    if (!polygon || !polygon.coordinates || polygon.coordinates.length === 0) {
      return false;
    }

    const outerRing = polygon.coordinates[0];
    let inside = false;

    for (let i = 0, j = outerRing.length - 1; i < outerRing.length; j = i++) {
      const xi = outerRing[i][0];
      const yi = outerRing[i][1];
      const xj = outerRing[j][0];
      const yj = outerRing[j][1];

      const intersect =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

      if (intersect) {
        inside = !inside;
      }
    }

    // Check inner rings (holes) if any
    if (inside && polygon.coordinates.length > 1) {
      for (let k = 1; k < polygon.coordinates.length; k++) {
        const hole = polygon.coordinates[k];
        let insideHole = false;
        for (let i = 0, j = hole.length - 1; i < hole.length; j = i++) {
          const xi = hole[i][0];
          const yi = hole[i][1];
          const xj = hole[j][0];
          const yj = hole[j][1];

          const intersect =
            yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

          if (intersect) insideHole = !insideHole;
        }
        if (insideHole) return false; // Inside hole means outside the polygon
      }
    }

    return inside;
  }

  /**
   * Determine if local 2D coordinate is inside 2D polygon vertices
   */
  public static isPointIn2DPolygon(
    px: number,
    py: number,
    vertices: Array<{ x: number; y: number }>
  ): boolean {
    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const xi = vertices[i].x;
      const yi = vertices[i].y;
      const xj = vertices[j].x;
      const yj = vertices[j].y;

      const intersect =
        yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;

      if (intersect) inside = !inside;
    }
    return inside;
  }
}
