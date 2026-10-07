import { GeoPoint } from '../../gis/models/GeoPoint';

export class DronePhysics {
  /**
   * Calculate ground coverage radius from altitude (m) and camera FOV (degrees)
   * r = altitude * tan(fov / 2)
   */
  public static calculateCoverageRadius(altitude: number, fovDegrees: number = 70): number {
    const fovRad = (fovDegrees * Math.PI) / 180;
    return Math.max(5, altitude * Math.tan(fovRad / 2));
  }

  /**
   * Calculate heading in degrees (0-360, 0 = North/Up) from (x1, y1) to (x2, y2)
   */
  public static calculateHeading(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const rad = Math.atan2(dx, -dy); // 0 is North (-Y in screen space)
    let deg = (rad * 180) / Math.PI;
    if (deg < 0) deg += 360;
    return Math.round(deg);
  }

  /**
   * Interpolate movement towards target with max velocity
   */
  public static stepTowards(
    current: { x: number; y: number },
    target: { x: number; y: number },
    maxDistance: number
  ): { x: number; y: number; arrived: boolean } {
    const dx = target.x - current.x;
    const dy = target.y - current.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= maxDistance || dist < 0.1) {
      return { x: target.x, y: target.y, arrived: true };
    }

    const ratio = maxDistance / dist;
    return {
      x: current.x + dx * ratio,
      y: current.y + dy * ratio,
      arrived: false,
    };
  }

  /**
   * Step altitude towards target altitude
   */
  public static stepAltitude(current: number, target: number, maxStep: number): number {
    const diff = target - current;
    if (Math.abs(diff) <= maxStep) return target;
    return current + Math.sign(diff) * maxStep;
  }
}
