import { GeoPoint } from './models/GeoPoint';

export class CoordinateSystem {
  private static readonly EARTH_RADIUS_METERS = 6371000;

  /**
   * Calculate distance between two GeoPoints in meters using the Haversine formula
   */
  public static haversineDistance(p1: GeoPoint, p2: GeoPoint): number {
    const lat1Rad = (p1.latitude * Math.PI) / 180;
    const lat2Rad = (p2.latitude * Math.PI) / 180;
    const deltaLat = ((p2.latitude - p1.latitude) * Math.PI) / 180;
    const deltaLon = ((p2.longitude - p1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return this.EARTH_RADIUS_METERS * c;
  }

  /**
   * Convert WGS84 GeoPoint to local 2D simulation Cartesian coordinates (meters)
   * relative to a beach origin anchor point
   */
  public static geoToLocal(
    point: GeoPoint,
    origin: GeoPoint
  ): { x: number; y: number } {
    const latRad = (origin.latitude * Math.PI) / 180;
    
    // Meters per degree
    const metersPerDegreeLat = 111320;
    const metersPerDegreeLon = 111320 * Math.cos(latRad);

    const deltaLon = point.longitude - origin.longitude;
    const deltaLat = point.latitude - origin.latitude;

    // In simulation space: +X is East, +Y is South (downwards into water)
    const x = deltaLon * metersPerDegreeLon;
    const y = -deltaLat * metersPerDegreeLat; // Negative because higher latitude is North

    return { x, y };
  }

  /**
   * Convert local 2D simulation Cartesian coordinates (meters) back to WGS84 GeoPoint
   */
  public static localToGeo(
    local: { x: number; y: number },
    origin: GeoPoint
  ): GeoPoint {
    const latRad = (origin.latitude * Math.PI) / 180;

    const metersPerDegreeLat = 111320;
    const metersPerDegreeLon = 111320 * Math.cos(latRad);

    const deltaLon = local.x / metersPerDegreeLon;
    const deltaLat = -local.y / metersPerDegreeLat;

    return {
      latitude: Number((origin.latitude + deltaLat).toFixed(6)),
      longitude: Number((origin.longitude + deltaLon).toFixed(6)),
    };
  }

  /**
   * Calculate initial compass bearing in degrees (0 = North, 90 = East, 180 = South, 270 = West)
   */
  public static calculateBearing(start: GeoPoint, dest: GeoPoint): number {
    const lat1 = (start.latitude * Math.PI) / 180;
    const lat2 = (dest.latitude * Math.PI) / 180;
    const deltaLon = ((dest.longitude - start.longitude) * Math.PI) / 180;

    const y = Math.sin(deltaLon) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

    const bearingRad = Math.atan2(y, x);
    return ((bearingRad * 180) / Math.PI + 360) % 360;
  }
}
