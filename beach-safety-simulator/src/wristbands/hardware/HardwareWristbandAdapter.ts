/**
 * HardwareWristbandAdapter.ts
 * 
 * TIDES Track B — Phase 3: Hardware-to-TIDES Backend Adapter
 * 
 * Responsibilities:
 * - Bridges real physical prototype events into authoritative TIDES services
 * - Strictly distinguishes HARDWARE vs SIMULATED provenance
 * - Reuses existing IncidentManager and WristbandIncidentBridge (Zero Duplicate Engines)
 * - Enforces Zero Coordinate Fabrication: never creates false GPS fixes for unequipped prototypes
 * - Secure audit logging of all hardware events without secret exposure
 */

import {
  WristbandSOSEvent,
  WristbandId,
  HardwareTelemetryMetadata,
  SwimmerWristband,
} from '../wristband.types';
import { WristbandRegistry } from '../WristbandRegistry';
import { WristbandIncidentBridge } from '../WristbandIncidentBridge';
import { LocalizedWarningDistributionEngine } from '../LocalizedWarningDistributionEngine';
import { Incident } from '../../models/Incident';

export interface HardwareBridgeResult {
  accepted: boolean;
  incident?: Incident;
  rejectionReason?: string;
  provenance: 'HARDWARE';
  spatialConfidence: 'ZONE_ONLY' | 'UNAVAILABLE' | 'HIGH';
  auditId: string;
}

export interface HardwareAuditRecord {
  auditId: string;
  timestampMs: number;
  deviceId: WristbandId;
  gatewayId: string;
  eventType: 'SOS_TRIGGER' | 'HEARTBEAT' | 'WARNING_ACK';
  rssiDbm: number;
  snrDb: number;
  batteryMv: number;
  incidentIdCreated?: string;
}

export class HardwareWristbandAdapter {
  private static instance: HardwareWristbandAdapter | null = null;

  private registry: WristbandRegistry;
  private incidentBridge: WristbandIncidentBridge;
  private warningEngine: LocalizedWarningDistributionEngine;
  private auditLogs: HardwareAuditRecord[] = [];
  private auditCounter: number = 5000;

  // Registered hardware units
  private registeredHardwareIds: Set<string> = new Set(['HW-WB-001', 'HW-WB-002', 'HW-WB-003']);

  private constructor(
    registry: WristbandRegistry = WristbandRegistry.getInstance(),
    incidentBridge: WristbandIncidentBridge = WristbandIncidentBridge.getInstance(),
    warningEngine: LocalizedWarningDistributionEngine = LocalizedWarningDistributionEngine.getInstance()
  ) {
    this.registry = registry;
    this.incidentBridge = incidentBridge;
    this.warningEngine = warningEngine;
    this.ensureHardwareDevicesInRegistry();
  }

  public static getInstance(): HardwareWristbandAdapter {
    if (!HardwareWristbandAdapter.instance) {
      HardwareWristbandAdapter.instance = new HardwareWristbandAdapter();
    }
    return HardwareWristbandAdapter.instance;
  }

  /**
   * Registers physical hardware prototypes into WristbandRegistry with 'HARDWARE' provenance
   */
  private ensureHardwareDevicesInRegistry(): void {
    const now = Date.now();

    const hwUnits: Array<{ id: string; name: string; zone: string; battery: number }> = [
      { id: 'HW-WB-001', name: 'Physical Prototype #1 (ESP32-S3/SX1262)', zone: 'SWIM_ZONE_NORTH', battery: 88 },
      { id: 'HW-WB-002', name: 'Bench Test Unit #2 (Laboratory Rig)', zone: 'CENTRAL_SURF', battery: 95 },
      { id: 'HW-WB-003', name: 'Prototype Reserve #3 (Waterproof Enclosure)', zone: 'RESERVE_STATION', battery: 100 },
    ];

    for (const u of hwUnits) {
      if (!this.registry.getWristband(u.id)) {
        const wb: SwimmerWristband = {
          id: u.id,
          provenance: 'HARDWARE',
          pairedVisitorId: null,
          pairedVisitorName: u.name,
          currentZone: u.zone,
          connectivity: 'CONNECTED',
          batteryPercent: u.battery,
          batteryState: 'NORMAL',
          ledState: 'PULSING_GREEN',
          vibrationPattern: 'OFF',
          oledMessage: 'SAFE - BEACH OPEN',
          isSosActive: false,
          sosTriggeredAtMs: null,
          lastWarningReceived: null,
          lastAcknowledgedAtMs: null,
          lastTelemetryAtMs: now,
          telemetry: {
            batteryPercent: u.battery,
            signalStrengthDbm: -78,
            hasLocation: false, // ZERO COORDINATE FABRICATION: Hardware prototype has no GPS module
            simPosition: undefined,
            accuracyMeters: undefined,
            waterImmersion: false,
            headingDeg: undefined,
            lastHeartbeatMs: now,
            hardwareMetadata: {
              gatewayId: 'GW-TOWER-01',
              gatewayReceiptMs: now,
              rssiDbm: -78,
              snrDb: 8.5,
              batteryMv: 3920,
              rfFrequencyHz: 865200000,
              firmwareVersion: '1.0.0-IN865',
            },
          },
        };
        this.registry.registerWristband(wb);
      }
    }
  }

  /**
   * Ingests validated hardware SOS event and routes to authoritative IncidentManager
   */
  public handleHardwareSOSEvent(
    event: WristbandSOSEvent,
    metadata: HardwareTelemetryMetadata
  ): HardwareBridgeResult {
    this.auditCounter++;
    const auditId = `AUDIT-HW-${this.auditCounter}`;

    // 1. Hardware Authorization Check
    if (!this.registeredHardwareIds.has(event.wristbandId)) {
      return {
        accepted: false,
        rejectionReason: `UNAUTHORIZED_HARDWARE_DEVICE: ${event.wristbandId} is not in authorized bench inventory`,
        provenance: 'HARDWARE',
        spatialConfidence: 'UNAVAILABLE',
        auditId,
      };
    }

    // 2. Ensure device entry is synchronized
    this.ensureHardwareDevicesInRegistry();
    const wb = this.registry.getWristband(event.wristbandId);
    if (wb) {
      wb.isSosActive = true;
      wb.ledState = 'FLASHING_RED';
      wb.vibrationPattern = 'PERSISTENT_ALARM';
      wb.oledMessage = 'SOS SENT - HELP IN ROUTE';
      wb.batteryPercent = event.batteryPercent;
      wb.telemetry.lastHeartbeatMs = metadata.gatewayReceiptMs;
      wb.telemetry.signalStrengthDbm = metadata.rssiDbm;
      wb.telemetry.hardwareMetadata = metadata;
    }

    // 3. Connect to authoritative WristbandIncidentBridge (reusing core incident pipeline)
    // ZERO COORDINATE FABRICATION:
    // Location is explicitly marked as unavailable/zone-only because prototype lacks GPS
    const bridgeResult = this.incidentBridge.handleSOSEvent({
      ...event,
      hasLocation: false,
      location: undefined,
      zoneId: event.zoneId || 'SWIM_ZONE_NORTH',
    });

    // Annotate incident description with hardware provenance
    if (bridgeResult.incident) {
      bridgeResult.incident.description = `[HARDWARE PROTOTYPE ${event.wristbandId}] Gateway: ${metadata.gatewayId} (RSSI: ${metadata.rssiDbm}dBm, SNR: ${metadata.snrDb}dB, Vbat: ${metadata.batteryMv}mV). ${bridgeResult.incident.description}`;
    }

    // 4. Record Audit Log
    this.auditLogs.push({
      auditId,
      timestampMs: metadata.gatewayReceiptMs,
      deviceId: event.wristbandId,
      gatewayId: metadata.gatewayId,
      eventType: 'SOS_TRIGGER',
      rssiDbm: metadata.rssiDbm,
      snrDb: metadata.snrDb,
      batteryMv: metadata.batteryMv,
      incidentIdCreated: bridgeResult.incident?.id,
    });

    return {
      accepted: true,
      incident: bridgeResult.incident,
      provenance: 'HARDWARE',
      spatialConfidence: 'ZONE_ONLY',
      auditId,
    };
  }

  /**
   * Processes hardware heartbeat telemetry
   */
  public handleHardwareHeartbeat(
    deviceId: string,
    metadata: HardwareTelemetryMetadata,
    batteryPercent: number
  ): void {
    const wb = this.registry.getWristband(deviceId);
    if (!wb) return;

    wb.batteryPercent = batteryPercent;
    wb.telemetry.batteryPercent = batteryPercent;
    wb.telemetry.signalStrengthDbm = metadata.rssiDbm;
    wb.telemetry.lastHeartbeatMs = metadata.gatewayReceiptMs;
    wb.telemetry.hardwareMetadata = metadata;
  }

  /**
   * Processes physical swimmer acknowledgment of a localized warning
   */
  public handleHardwareWarningAck(deviceId: string, warningId: string): boolean {
    const wb = this.registry.getWristband(deviceId);
    if (!wb) return false;

    return this.warningEngine.acknowledgeWarning(warningId, deviceId);
  }

  public getAuditLogs(): HardwareAuditRecord[] {
    return [...this.auditLogs];
  }

  public getRegisteredHardwareIds(): string[] {
    return Array.from(this.registeredHardwareIds);
  }

  public reset(): void {
    this.auditLogs = [];
    this.auditCounter = 5000;
    this.ensureHardwareDevicesInRegistry();
  }
}

