/**
 * WristbandRegistry.ts
 * 
 * TIDES Track B — Wristband Phase 2: Virtual Device & Gateway Fleet Registry
 * 
 * Manages:
 * - Authoritative virtual wristbands (WB-101 to WB-108)
 * - Swimmer pairing, battery monitoring, OLED display state, LED indicators, and haptic engine
 * - Coastal RF Gateways (GW-TOWER-01, GW-COMMAND-02, GW-TOWER-03)
 * - Sync with visitor engine positions while preserving zero coordinate fabrication
 */

import {
  WristbandId,
  SwimmerWristband,
  GatewayStation,
  WristbandSOSEvent,
  WristbandFleetKPIs,
  WristbandTelemetry,
  WristbandBatteryState,
} from './wristband.types';
import { Visitor } from '../models/Visitor';

export class WristbandRegistry {
  private static instance: WristbandRegistry | null = null;

  private wristbands: Map<WristbandId, SwimmerWristband> = new Map();
  private gateways: Map<string, GatewayStation> = new Map();
  private eventSequenceCounter: number = 1000;

  private constructor() {
    this.initializeDefaultGateways();
    this.initializeDefaultFleet();
  }

  public static getInstance(): WristbandRegistry {
    if (!WristbandRegistry.instance) {
      WristbandRegistry.instance = new WristbandRegistry();
    }
    return WristbandRegistry.instance;
  }

  public static resetInstance(): void {
    if (WristbandRegistry.instance) {
      WristbandRegistry.instance.reset();
    }
    WristbandRegistry.instance = new WristbandRegistry();
  }

  private initializeDefaultGateways(): void {
    this.gateways.clear();
    const defaultGateways: GatewayStation[] = [
      {
        id: 'GW-TOWER-01',
        name: 'North Watchtower Gateway',
        position: { x: 200, y: 150 },
        rangeMeters: 400,
        status: 'ONLINE',
        connectedDeviceCount: 3,
        packetsForwarded: 142,
        lastPingMs: Date.now(),
      },
      {
        id: 'GW-COMMAND-02',
        name: 'Central HQ Base Station',
        position: { x: 500, y: 120 },
        rangeMeters: 450,
        status: 'ONLINE',
        connectedDeviceCount: 4,
        packetsForwarded: 289,
        lastPingMs: Date.now(),
      },
      {
        id: 'GW-TOWER-03',
        name: 'South Rock Bluff Gateway',
        position: { x: 800, y: 160 },
        rangeMeters: 400,
        status: 'ONLINE',
        connectedDeviceCount: 1,
        packetsForwarded: 87,
        lastPingMs: Date.now(),
      },
    ];

    for (const gw of defaultGateways) {
      this.gateways.set(gw.id, gw);
    }
  }

  private initializeDefaultFleet(): void {
    this.wristbands.clear();

    const initialDevices: Array<{
      id: WristbandId;
      visitorId: string | null;
      visitorName: string | null;
      zone: string;
      battery: number;
      pos?: { x: number; y: number };
      hasLoc: boolean;
    }> = [
      { id: 'WB-101', visitorId: 'VIS-SWIM-01', visitorName: 'Rohan Sharma', zone: 'SWIM_ZONE_NORTH', battery: 94, pos: { x: 220, y: 350 }, hasLoc: true },
      { id: 'WB-102', visitorId: 'VIS-SWIM-02', visitorName: 'Ananya Rao', zone: 'SWIM_ZONE_NORTH', battery: 88, pos: { x: 280, y: 380 }, hasLoc: true },
      { id: 'WB-103', visitorId: 'VIS-SWIM-03', visitorName: 'Vikram Patel', zone: 'CENTRAL_SURF', battery: 76, pos: { x: 490, y: 390 }, hasLoc: true },
      { id: 'WB-104', visitorId: 'VIS-SWIM-04', visitorName: 'Pooja Reddy', zone: 'CENTRAL_SURF', battery: 62, pos: { x: 520, y: 410 }, hasLoc: true },
      { id: 'WB-105', visitorId: 'VIS-REST-01', visitorName: 'Karthik Varma', zone: 'RIP_CURRENT_CORRIDOR_SOUTH', battery: 45, pos: { x: 740, y: 440 }, hasLoc: true },
      { id: 'WB-106', visitorId: 'VIS-SHORE-01', visitorName: 'Sneha Nair', zone: 'SHORELINE_SOUTH', battery: 91, pos: { x: 790, y: 240 }, hasLoc: true },
      { id: 'WB-107', visitorId: 'VIS-SWIM-05', visitorName: 'Devraj Sen', zone: 'NORTH_SHORE', battery: 28, pos: { x: 180, y: 220 }, hasLoc: false }, // Simulating degraded GPS
      { id: 'WB-108', visitorId: null, visitorName: null, zone: 'RESERVE_STATION', battery: 100, hasLoc: false }, // Standby reserve unit
    ];

    const now = Date.now();

    for (const d of initialDevices) {
      const batState: WristbandBatteryState =
        d.battery <= 20 ? 'CRITICAL' : d.battery <= 35 ? 'LOW' : 'NORMAL';

      const wb: SwimmerWristband = {
        id: d.id,
        provenance: 'SIMULATED',
        pairedVisitorId: d.visitorId,
        pairedVisitorName: d.visitorName,
        currentZone: d.zone,
        connectivity: 'CONNECTED',
        batteryPercent: d.battery,
        batteryState: batState,
        ledState: 'PULSING_GREEN',
        vibrationPattern: 'OFF',
        oledMessage: 'SAFE - BEACH OPEN',
        isSosActive: false,
        sosTriggeredAtMs: null,
        lastWarningReceived: null,
        lastAcknowledgedAtMs: null,
        lastTelemetryAtMs: now,
        telemetry: {
          batteryPercent: d.battery,
          signalStrengthDbm: -72 - Math.floor(Math.random() * 20),
          hasLocation: d.hasLoc,
          simPosition: d.pos,
          accuracyMeters: d.hasLoc ? 6 : undefined,
          waterImmersion: d.zone.includes('SWIM') || d.zone.includes('SURF') || d.zone.includes('RIP'),
          headingDeg: 180,
          lastHeartbeatMs: now,
        },
      };

      this.wristbands.set(wb.id, wb);
    }
  }

  public getWristbands(): SwimmerWristband[] {
    return Array.from(this.wristbands.values());
  }

  public getWristband(id: WristbandId): SwimmerWristband | undefined {
    return this.wristbands.get(id);
  }

  public getWristbandByVisitorId(visitorId: string): SwimmerWristband | undefined {
    return Array.from(this.wristbands.values()).find((w) => w.pairedVisitorId === visitorId);
  }

  public registerWristband(wb: SwimmerWristband): void {
    this.wristbands.set(wb.id, wb);
  }

  public updateWristband(id: WristbandId, partial: Partial<SwimmerWristband>): void {
    const existing = this.wristbands.get(id);
    if (!existing) return;

    if (partial.batteryPercent !== undefined) {
      const bat = Math.max(0, Math.min(100, partial.batteryPercent));
      partial.batteryState = bat <= 20 ? 'CRITICAL' : bat <= 35 ? 'LOW' : 'NORMAL';
    }

    const updated = {
      ...existing,
      ...partial,
      telemetry: {
        ...existing.telemetry,
        ...(partial.telemetry || {}),
      },
    };

    this.wristbands.set(id, updated);
  }

  public pairVisitor(wristbandId: WristbandId, visitorId: string, visitorName?: string): void {
    const wb = this.wristbands.get(wristbandId);
    if (!wb) return;
    wb.pairedVisitorId = visitorId;
    wb.pairedVisitorName = visitorName || `Swimmer (${visitorId})`;
  }

  public unpairVisitor(wristbandId: WristbandId): void {
    const wb = this.wristbands.get(wristbandId);
    if (!wb) return;
    wb.pairedVisitorId = null;
    wb.pairedVisitorName = null;
  }

  /**
   * Simulates Swimmer pressing the 1-Tap SOS button
   */
  public triggerSOS(wristbandId: WristbandId, isManual: boolean = true): WristbandSOSEvent | null {
    const wb = this.wristbands.get(wristbandId);
    if (!wb) return null;

    const now = Date.now();
    this.eventSequenceCounter += 1;

    wb.isSosActive = true;
    wb.sosTriggeredAtMs = now;
    wb.ledState = 'FLASHING_RED';
    wb.vibrationPattern = 'PERSISTENT_ALARM';
    wb.oledMessage = 'SOS SENT - HELP IN ROUTE';

    const event: WristbandSOSEvent = {
      eventId: `EVT-SOS-${wb.id}-${this.eventSequenceCounter}`,
      wristbandId: wb.id,
      pairedVisitorId: wb.pairedVisitorId,
      timestampMs: now,
      zoneId: wb.currentZone,
      location: wb.telemetry.hasLocation && wb.telemetry.simPosition ? { ...wb.telemetry.simPosition } : undefined,
      hasLocation: wb.telemetry.hasLocation,
      accuracyMeters: wb.telemetry.accuracyMeters,
      batteryPercent: wb.batteryPercent,
      telemetrySequence: this.eventSequenceCounter,
      deduplicationKey: `${wb.id}-${Math.floor(now / 15000)}`, // 15s deduplication key
      isManualTrigger: isManual,
    };

    return event;
  }

  /**
   * Cancels/resets active SOS on a wristband
   */
  public cancelSOS(wristbandId: WristbandId): void {
    const wb = this.wristbands.get(wristbandId);
    if (!wb) return;

    wb.isSosActive = false;
    wb.sosTriggeredAtMs = null;
    wb.ledState = 'PULSING_GREEN';
    wb.vibrationPattern = 'OFF';
    wb.oledMessage = 'SAFE - BEACH OPEN';
  }

  /**
   * Simulates Swimmer pressing the Acknowledge button on the physical wristband
   */
  public acknowledgeWarning(wristbandId: WristbandId): boolean {
    const wb = this.wristbands.get(wristbandId);
    if (!wb || !wb.lastWarningReceived) return false;

    const now = Date.now();
    wb.lastAcknowledgedAtMs = now;
    wb.lastWarningReceived.status = 'ACKNOWLEDGED';
    wb.lastWarningReceived.acknowledgedAtMs = now;

    // Acknowledging lowers vibration, but preserves alert LED if warning still active
    wb.vibrationPattern = 'OFF';
    wb.oledMessage = 'CAUTION - RIP DETECTED';
    return true;
  }

  public updateTelemetry(wristbandId: WristbandId, partial: Partial<WristbandTelemetry>): void {
    const wb = this.wristbands.get(wristbandId);
    if (!wb) return;

    wb.telemetry = {
      ...wb.telemetry,
      ...partial,
      lastHeartbeatMs: Date.now(),
    };
    wb.lastTelemetryAtMs = Date.now();
  }

  public getGateways(): GatewayStation[] {
    return Array.from(this.gateways.values());
  }

  public getGateway(id: string): GatewayStation | undefined {
    return this.gateways.get(id);
  }

  public updateGateway(id: string, partial: Partial<GatewayStation>): void {
    const existing = this.gateways.get(id);
    if (!existing) return;
    this.gateways.set(id, { ...existing, ...partial });
  }

  public getNearestOnlineGateway(position: { x: number; y: number }): GatewayStation | null {
    let nearest: GatewayStation | null = null;
    let minDistance = Infinity;

    for (const gw of this.gateways.values()) {
      if (gw.status === 'OFFLINE') continue;
      const dx = gw.position.x - position.x;
      const dy = gw.position.y - position.y;
      const dist = Math.hypot(dx, dy);

      if (dist < minDistance && dist <= gw.rangeMeters) {
        minDistance = dist;
        nearest = gw;
      }
    }

    return nearest;
  }

  /**
   * Synchronizes paired wristbands with live visitors from VisitorEngine
   * Preserves exact positions and zones, never inventing coordinates for unlocated wristbands.
   */
  public syncWithVisitors(visitors: Visitor[]): void {
    const visitorMap = new Map<string, Visitor>();
    for (const v of visitors) {
      if (v.active) visitorMap.set(v.id, v);
    }

    const now = Date.now();

    for (const wb of this.wristbands.values()) {
      if (!wb.pairedVisitorId) continue;
      const visitor = visitorMap.get(wb.pairedVisitorId);

      if (visitor) {
        wb.currentZone = visitor.currentZone;
        wb.telemetry.hasLocation = true;
        wb.telemetry.simPosition = { x: visitor.position.x, y: visitor.position.y };
        wb.telemetry.waterImmersion = visitor.state === 'SWIMMING' || visitor.state === 'STRUGGLING' || visitor.state === 'DISTRESS';
        wb.telemetry.lastHeartbeatMs = now;
        wb.lastTelemetryAtMs = now;

        // Auto-trigger SOS if visitor enters DISTRESS in simulation and SOS isn't yet active
        if (visitor.state === 'DISTRESS' && !wb.isSosActive) {
          this.triggerSOS(wb.id, false);
        }
      }
    }
  }

  public getFleetKPIs(): WristbandFleetKPIs {
    const all = Array.from(this.wristbands.values());
    let connected = 0;
    let degraded = 0;
    let offline = 0;
    let activeSos = 0;
    let activeWarnings = 0;
    let acknowledgedWarnings = 0;
    let totalBattery = 0;

    for (const wb of all) {
      if (wb.connectivity === 'CONNECTED') connected++;
      else if (wb.connectivity === 'DEGRADED') degraded++;
      else offline++;

      if (wb.isSosActive) activeSos++;

      if (wb.lastWarningReceived) {
        activeWarnings++;
        if (wb.lastWarningReceived.status === 'ACKNOWLEDGED') {
          acknowledgedWarnings++;
        }
      }

      totalBattery += wb.batteryPercent;
    }

    const ackRate = activeWarnings > 0 ? (acknowledgedWarnings / activeWarnings) * 100 : 100;
    const avgBattery = all.length > 0 ? totalBattery / all.length : 100;

    return {
      totalRegistered: all.length,
      activeConnected: connected,
      degradedCount: degraded,
      offlineCount: offline,
      activeSosCount: activeSos,
      activeWarningsDispatched: activeWarnings,
      acknowledgmentRatePercent: Math.round(ackRate),
      averageBatteryPercent: Math.round(avgBattery),
    };
  }

  public reset(): void {
    this.initializeDefaultGateways();
    this.initializeDefaultFleet();
    this.eventSequenceCounter = 1000;
  }
}

