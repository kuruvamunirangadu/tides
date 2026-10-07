import { Camera } from '../models/Camera';
import { BoundingBox } from '../models/Detection';
import { Visitor } from '../../models/Visitor';

export class CameraSimulator {
  /**
   * Checks if a 2D world point is within the camera's FOV cone.
   */
  public static isPointInView(camera: Camera, point: { x: number; y: number }): boolean {
    if (camera.status === 'OFFLINE') return false;

    const dx = point.x - camera.position.x;
    const dy = point.y - camera.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > camera.range || dist < 10) return false;

    let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (angleDeg < 0) angleDeg += 360;

    let rot = camera.rotation % 360;
    if (rot < 0) rot += 360;

    let diff = Math.abs(angleDeg - rot);
    if (diff > 180) diff = 360 - diff;

    return diff <= camera.fieldOfView / 2;
  }

  /**
   * Generates a bounding box around a visitor in camera view space with realistic detector noise.
   */
  public static generateBoundingBox(
    camera: Camera,
    visitor: Visitor,
    isNightMode: boolean = false
  ): { bbox: BoundingBox; confidence: number } {
    const inWater = visitor.position.y >= 260;
    const dist = Math.sqrt(
      Math.pow(visitor.position.x - camera.position.x, 2) +
        Math.pow(visitor.position.y - camera.position.y, 2)
    );

    // Distance attenuation: closer objects appear larger
    const scaleFactor = Math.max(0.4, 1.0 - dist / (camera.range * 1.5));
    const baseW = inWater ? 16 * scaleFactor : 14 * scaleFactor;
    const baseH = inWater ? 18 * scaleFactor : 28 * scaleFactor;

    // Small simulated detection jitter (±1.5px)
    const jitterX = (Math.random() - 0.5) * 2;
    const jitterY = (Math.random() - 0.5) * 2;

    const bbox: BoundingBox = {
      x: Math.round(visitor.position.x - baseW / 2 + jitterX),
      y: Math.round(visitor.position.y - baseH / 2 + jitterY),
      width: Math.round(baseW),
      height: Math.round(baseH),
    };

    // Confidence model: decreases with distance, night mode, and water immersion
    let baseConfidence = 0.94 - (dist / camera.range) * 0.22;
    if (inWater) baseConfidence -= 0.08; // wave clutter
    if (isNightMode) baseConfidence -= 0.25; // zero ambient light
    if (camera.status === 'DEGRADED') baseConfidence -= 0.20;

    const confidence = Math.max(0.35, Math.min(0.99, Number(baseConfidence.toFixed(2))));

    return { bbox, confidence };
  }

  /**
   * Generates polygon points for rendering camera FOV cone on 2D canvas.
   */
  public static getFOVPolygon(camera: Camera): Array<{ x: number; y: number }> {
    const points: Array<{ x: number; y: number }> = [{ x: camera.position.x, y: camera.position.y }];
    const halfFov = camera.fieldOfView / 2;
    const segments = 16;

    for (let i = 0; i <= segments; i++) {
      const angleDeg = camera.rotation - halfFov + (i / segments) * camera.fieldOfView;
      const angleRad = (angleDeg * Math.PI) / 180;
      points.push({
        x: camera.position.x + Math.cos(angleRad) * camera.range,
        y: camera.position.y + Math.sin(angleRad) * camera.range,
      });
    }

    return points;
  }
}
