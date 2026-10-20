/**
 * src/emergency/coordination/EvacuationZoneManager.ts
 * Manages dynamic beach safety and evacuation zones for Rushikonda Beach.
 */

import { EvacuationZone, EvacuationZoneState } from './types';
import { Visitor } from '../../models/Visitor';

export class EvacuationZoneManager {
  private static instance: EvacuationZoneManager | null = null;
  private zones: Map<string, EvacuationZone> = new Map();
  private listeners: Set<() => void> = new Set();

  public static getInstance(): EvacuationZoneManager {
    if (!this.instance) {
      this.instance = new EvacuationZoneManager();
    }
    return this.instance;
  }

  constructor() {
    this.reset();
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  public getZones(): EvacuationZone[] {
    return Array.from(this.zones.values());
  }

  public getZone(zoneId: string): EvacuationZone | undefined {
    return this.zones.get(zoneId);
  }

  public setZoneState(
    zoneId: string,
    state: EvacuationZoneState,
    reason: string,
    isOperatorConfirmed = false
  ): boolean {
    const zone = this.zones.get(zoneId);
    if (!zone) return false;

    zone.state = state;
    zone.reason = reason;
    zone.isOperatorConfirmed = isOperatorConfirmed;
    zone.stateChangedAt = Date.now() / 1000;
    this.notify();
    return true;
  }

  /**
   * Updates zone crowd counts from live visitor positions without modifying visitor state.
   */
  public updateCrowdCounts(visitors: Visitor[]) {
    // Reset counts
    for (const z of this.zones.values()) {
      z.activeVisitorCount = 0;
    }

    for (const v of visitors) {
      if (!v.active) continue;
      const x = v.position.x;
      const y = v.position.y;

      for (const z of this.zones.values()) {
        if (x >= z.xMin && x <= z.xMax && y >= z.yMin && y <= z.yMax) {
          z.activeVisitorCount++;
          break;
        }
      }
    }
    this.notify();
  }

  public reset() {
    this.zones.clear();
    const defaults: EvacuationZone[] = [
      {
        zoneId: 'ZONE-CENTRAL-SWIM',
        name: 'Rushikonda Main Swimming Bay',
        xMin: 350.0,
        xMax: 700.0,
        yMin: 220.0,
        yMax: 460.0,
        state: 'NORMAL',
        reason: 'Standard patrolled swimming bay',
        hazardRefs: [],
        stateChangedAt: Date.now() / 1000,
        isOperatorConfirmed: false,
        activeVisitorCount: 0,
      },
      {
        zoneId: 'ZONE-NORTH-PROMENADE',
        name: 'North Dunes & Water Sports Corridor',
        xMin: 700.0,
        xMax: 1000.0,
        yMin: 120.0,
        yMax: 280.0,
        state: 'NORMAL',
        reason: 'Upper dry sand recreational sector',
        hazardRefs: [],
        stateChangedAt: Date.now() / 1000,
        isOperatorConfirmed: false,
        activeVisitorCount: 0,
      },
      {
        zoneId: 'ZONE-SOUTH-SURF',
        name: 'South Family Bathing Sector',
        xMin: 50.0,
        xMax: 350.0,
        yMin: 180.0,
        yMax: 380.0,
        state: 'NORMAL',
        reason: 'Shallow sandbar safe zone',
        hazardRefs: [],
        stateChangedAt: Date.now() / 1000,
        isOperatorConfirmed: false,
        activeVisitorCount: 0,
      },
      {
        zoneId: 'ZONE-NORTH-ROCKS',
        name: 'North Cape Submerged Granite Rocks',
        xMin: 880.0,
        xMax: 1000.0,
        yMin: 280.0,
        yMax: 500.0,
        state: 'RESTRICTED',
        reason: 'Hazardous submerged granite and strong rip undertow',
        hazardRefs: ['HAZ-ROCKY-SHELF'],
        stateChangedAt: Date.now() / 1000,
        isOperatorConfirmed: true,
        activeVisitorCount: 0,
      },
    ];

    for (const d of defaults) {
      this.zones.set(d.zoneId, d);
    }
    this.notify();
  }
}

