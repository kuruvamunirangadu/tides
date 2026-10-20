/**
 * src/emergency/coordination/EvacuationRoutePlanner.ts
 * Graph-based route planning, designated exits, and dynamic blockage rerouting.
 */

import { EvacuationExit, EvacuationRoute, Point2D } from './types';

export class EvacuationRoutePlanner {
  private static instance: EvacuationRoutePlanner | null = null;
  private exits: Map<string, EvacuationExit> = new Map();
  private routes: Map<string, EvacuationRoute> = new Map();

  public static getInstance(): EvacuationRoutePlanner {
    if (!this.instance) {
      this.instance = new EvacuationRoutePlanner();
    }
    return this.instance;
  }

  constructor() {
    this.reset();
  }

  public getExits(): EvacuationExit[] {
    return Array.from(this.exits.values());
  }

  public getRoutes(): EvacuationRoute[] {
    return Array.from(this.routes.values());
  }

  public setRouteBlocked(routeId: string, isBlocked: boolean, reason?: string): boolean {
    const r = this.routes.get(routeId);
    if (!r) return false;
    r.isBlocked = isBlocked;
    if (isBlocked && reason) {
      r.bottleneckLocation = r.waypoints[0] || null;
    } else {
      r.bottleneckLocation = undefined;
    }
    return true;
  }

  public setExitBlocked(exitId: string, isBlocked: boolean, reason?: string): boolean {
    const e = this.exits.get(exitId);
    if (!e) return false;
    e.isBlocked = isBlocked;
    e.blockedReason = reason;
    return true;
  }

  /**
   * Finds the optimal unblocked evacuation route for a visitor.
   * Considers path distance and exit queue penalties.
   */
  public findBestRoute(originX: number, originY: number, originZoneId: string): EvacuationRoute | null {
    const candidates = Array.from(this.routes.values()).filter((r) => {
      const exitObj = this.exits.get(r.exitId);
      return (
        r.originZoneId === originZoneId &&
        !r.isBlocked &&
        exitObj &&
        !exitObj.isBlocked
      );
    });

    if (candidates.length === 0) {
      return null; // Explicit no valid route
    }

    const calcCost = (r: EvacuationRoute): number => {
      const exitObj = this.exits.get(r.exitId)!;
      const dx = exitObj.location.x - originX;
      const dy = exitObj.location.y - originY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const queuePenalty = exitObj.currentQueueCount * 12.0; // Queue wait penalty
      return dist + queuePenalty;
    };

    candidates.sort((a, b) => calcCost(a) - calcCost(b));
    return candidates[0];
  }

  public reset() {
    this.exits.clear();
    this.routes.clear();

    const exitsList: EvacuationExit[] = [
      {
        exitId: 'EXIT-NORTH-RAMP',
        name: 'North Promenade Concrete Ramp',
        location: { x: 880.0, y: 100.0 },
        flowCapacityPerSec: 1.5,
        currentQueueCount: 0,
        isBlocked: false,
      },
      {
        exitId: 'EXIT-CENTRAL-PAVILION',
        name: 'Central Pavilion Boardwalk Exit',
        location: { x: 520.0, y: 80.0 },
        flowCapacityPerSec: 2.0,
        currentQueueCount: 0,
        isBlocked: false,
      },
      {
        exitId: 'EXIT-SOUTH-DUNES',
        name: 'South Dunes Access Trail',
        location: { x: 140.0, y: 120.0 },
        flowCapacityPerSec: 1.0,
        currentQueueCount: 0,
        isBlocked: false,
      },
    ];

    for (const e of exitsList) {
      this.exits.set(e.exitId, e);
    }

    const routesList: EvacuationRoute[] = [
      {
        routeId: 'ROUTE-CENTRAL-TO-PAVILION',
        name: 'Central Bay to Central Pavilion Boardwalk',
        originZoneId: 'ZONE-CENTRAL-SWIM',
        exitId: 'EXIT-CENTRAL-PAVILION',
        waypoints: [
          { x: 520.0, y: 240.0 },
          { x: 520.0, y: 160.0 },
          { x: 520.0, y: 80.0 },
        ],
        isBlocked: false,
        occupantCount: 0,
      },
      {
        routeId: 'ROUTE-CENTRAL-TO-NORTH',
        name: 'Central Bay Alternate via North Ramp',
        originZoneId: 'ZONE-CENTRAL-SWIM',
        exitId: 'EXIT-NORTH-RAMP',
        waypoints: [
          { x: 600.0, y: 220.0 },
          { x: 760.0, y: 180.0 },
          { x: 880.0, y: 100.0 },
        ],
        isBlocked: false,
        occupantCount: 0,
      },
      {
        routeId: 'ROUTE-SOUTH-TO-DUNES',
        name: 'South Beach to South Dunes Exit',
        originZoneId: 'ZONE-SOUTH-SURF',
        exitId: 'EXIT-SOUTH-DUNES',
        waypoints: [
          { x: 220.0, y: 220.0 },
          { x: 180.0, y: 170.0 },
          { x: 140.0, y: 120.0 },
        ],
        isBlocked: false,
        occupantCount: 0,
      },
    ];

    for (const r of routesList) {
      this.routes.set(r.routeId, r);
    }
  }
}

