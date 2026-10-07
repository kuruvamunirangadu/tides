import { Position } from '../../models/Incident';
import { Resource } from '../models/Resource';

export class ResponseTimeCalculator {
  /**
   * Estimates response time in seconds based on straight-line distance,
   * speed of the resource, and setup latency.
   */
  public static calculateETA(resource: Resource, target: Position): number {
    const dist = Math.hypot(resource.position.x - target.x, resource.position.y - target.y);
    const speed = Math.max(10, resource.speed); // pixels/sec
    const travelTime = dist / speed;

    // Dispatch latency
    let setupLatency = 3; // seconds
    if (resource.type === 'DRONE') setupLatency = 1.5;
    else if (resource.type === 'PA_SYSTEM' || resource.type === 'WARNING_DISPLAY') return 0.5;

    return Math.round(travelTime + setupLatency);
  }
}
