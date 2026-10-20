/**
 * LocalizedWarningDistributionEngine.ts
 * 
 * TIDES Track B — Wristband Phase 2: Localized Warning Distribution Engine
 * 
 * Delivers targeted warnings strictly to nearby virtual devices on other beach visitors:
 * - Spatial distance-bounded targeting (75m - 150m radius around hazards)
 * - Zone-bounded and rip-corridor intersection targeting
 * - Excludes distant swimmers to prevent panic and alert fatigue
 * - Routes downlinks through coastal RF Gateway stations
 * - Manages full delivery lifecycle (PENDING -> DELIVERED -> ACKNOWLEDGED / FAILED)
 */

import {
  LocalizedWarningPacket,
  WarningTargetingCriteria,
  WristbandId,
  SwimmerWristband,
  WarningCategory,
} from './wristband.types';
import { WristbandRegistry } from './WristbandRegistry';
import { BeachGatewayService } from './gateway/BeachGatewayService';

export class LocalizedWarningDistributionEngine {
  private static instance: LocalizedWarningDistributionEngine | null = null;
  private registry: WristbandRegistry;
  private activeWarnings: Map<string, LocalizedWarningPacket> = new Map();
  private warningHistory: LocalizedWarningPacket[] = [];
  private warningCounter: number = 2000;

  private constructor(registry: WristbandRegistry = WristbandRegistry.getInstance()) {
    this.registry = registry;
  }

  public static getInstance(): LocalizedWarningDistributionEngine {
    if (!LocalizedWarningDistributionEngine.instance) {
      LocalizedWarningDistributionEngine.instance = new LocalizedWarningDistributionEngine();
    }
    return LocalizedWarningDistributionEngine.instance;
  }

  /**
   * Previews how many wristbands match the targeting criteria without dispatching
   */
  public previewTargetCount(criteria: WarningTargetingCriteria): number {
    return this.identifyEligibleWristbands(criteria).length;
  }

  /**
   * Evaluates and identifies all virtual wristbands matching localized targeting criteria
   */
  public identifyEligibleWristbands(criteria: WarningTargetingCriteria): SwimmerWristband[] {
    const allWristbands = this.registry.getWristbands();
    const eligible: SwimmerWristband[] = [];

    const excludeSet = new Set(criteria.excludeWristbandIds || []);

    for (const wb of allWristbands) {
      // 1. Exclude devices in the explicit exclusion set or standby units without swimmers
      if (excludeSet.has(wb.id) || (!wb.pairedVisitorId && wb.provenance !== 'HARDWARE')) {
        continue;
      }

      // 2. Connectivity check (DISCONNECTED devices cannot receive downlinks)
      if (wb.connectivity === 'DISCONNECTED') {
        continue;
      }

      let matches = false;

      // 3. Spatial radius matching
      if (criteria.centerCoordinate && criteria.radiusMeters && criteria.radiusMeters > 0) {
        if (wb.telemetry.hasLocation && wb.telemetry.simPosition) {
          const dx = wb.telemetry.simPosition.x - criteria.centerCoordinate.x;
          const dy = wb.telemetry.simPosition.y - criteria.centerCoordinate.y;
          const dist = Math.hypot(dx, dy);

          if (dist <= criteria.radiusMeters) {
            matches = true;
          }
        }
      }

      // 4. Zone matching
      if (!matches && criteria.zoneIds && criteria.zoneIds.length > 0) {
        if (criteria.zoneIds.includes(wb.currentZone)) {
          matches = true;
        }
      }

      // 5. Rip current corridor intersection matching
      if (!matches && criteria.ripCorridors && criteria.ripCorridors.length > 0) {
        if (wb.telemetry.hasLocation && wb.telemetry.simPosition) {
          const posX = wb.telemetry.simPosition.x;
          for (const corridor of criteria.ripCorridors) {
            if (posX >= corridor.x_min - 15 && posX <= corridor.x_max + 15) {
              matches = true;
              break;
            }
          }
        }
      }

      if (matches) {
        eligible.push(wb);
      }
    }

    return eligible;
  }

  /**
   * Dispatches targeted warnings to all eligible nearby wristbands
   */
  public dispatchTargetedWarning(criteria: WarningTargetingCriteria): LocalizedWarningPacket[] {
    const eligibleDevices = this.identifyEligibleWristbands(criteria);
    const packets: LocalizedWarningPacket[] = [];
    const now = Date.now();
    const expiryMs = now + 45000; // 45 seconds default validity

    for (const wb of eligibleDevices) {
      this.warningCounter += 1;
      const warningId = `WARN-LOC-${wb.id}-${this.warningCounter}`;

      // Find nearest online gateway for transmission
      const pos = wb.telemetry.simPosition || { x: 500, y: 300 };
      const gateway = this.registry.getNearestOnlineGateway(pos);

      const packet: LocalizedWarningPacket = {
        warningId,
        originIncidentId: criteria.originIncidentId,
        targetWristbandId: wb.id,
        targetVisitorId: wb.pairedVisitorId,
        category: criteria.category,
        title: criteria.title,
        message: criteria.message,
        zoneId: wb.currentZone,
        hazardCoordinate: criteria.centerCoordinate,
        warningRadiusMeters: criteria.radiusMeters,
        timestampMs: now,
        expiresAtMs: expiryMs,
        status: gateway ? 'DELIVERED' : 'FAILED',
        dispatchedByGatewayId: gateway ? gateway.id : 'NO_GATEWAY_IN_RANGE',
        deliveredAtMs: gateway ? now + 250 : undefined, // Simulated 250ms transmission latency
        retryCount: 0,
      };

      if (gateway) {
        // Gateway forwarded packet successfully
        gateway.packetsForwarded += 1;

        // Route to physical RF gateway queue if device is hardware
        if (wb.provenance === 'HARDWARE') {
          BeachGatewayService.getInstance().queueDownlinkWarning(packet);
        }

        // Apply visual and haptic state to wristband
        this.applyWarningToWristband(wb, packet);
      }

      this.activeWarnings.set(warningId, packet);
      this.warningHistory.push(packet);
      packets.push(packet);
    }

    return packets;
  }

  /**
   * Updates physical indicators on a virtual wristband upon receiving a warning packet
   */
  private applyWarningToWristband(wb: SwimmerWristband, packet: LocalizedWarningPacket): void {
    wb.lastWarningReceived = packet;

    switch (packet.category) {
      case 'EMERGENCY':
        wb.ledState = 'FLASHING_RED';
        wb.vibrationPattern = 'PERSISTENT_ALARM';
        wb.oledMessage = 'EVACUATE WATER NOW';
        break;
      case 'EVACUATE_ZONE':
        wb.ledState = 'STROBE_AMBER';
        wb.vibrationPattern = 'CADENCE_BURST';
        wb.oledMessage = 'EVACUATE WATER NOW';
        break;
      case 'CAUTION':
        wb.ledState = 'STROBE_AMBER';
        wb.vibrationPattern = 'SHORT_PULSE';
        wb.oledMessage = 'CAUTION - RIP DETECTED';
        break;
      case 'ADVISORY':
      default:
        wb.ledState = 'STROBE_AMBER';
        wb.vibrationPattern = 'SHORT_PULSE';
        wb.oledMessage = 'WARNING - HAZARD NEARBY';
        break;
    }
  }

  /**
   * Swimmer manually acknowledges the warning on their wristband
   */
  public acknowledgeWarning(warningId: string, wristbandId: WristbandId): boolean {
    const packet = this.activeWarnings.get(warningId);
    if (!packet || packet.targetWristbandId !== wristbandId) {
      return false;
    }

    const now = Date.now();
    packet.status = 'ACKNOWLEDGED';
    packet.acknowledgedAtMs = now;

    const wb = this.registry.getWristband(wristbandId);
    if (wb) {
      wb.lastAcknowledgedAtMs = now;
      wb.vibrationPattern = 'OFF'; // Cease haptic vibration on acknowledgment
    }

    return true;
  }

  /**
   * Automatically expires old warnings and clears alert states if expired
   */
  public expireStaleWarnings(currentTimeMs: number = Date.now()): void {
    for (const [id, packet] of this.activeWarnings.entries()) {
      if (currentTimeMs >= packet.expiresAtMs) {
        this.activeWarnings.delete(id);

        const wb = this.registry.getWristband(packet.targetWristbandId);
        if (wb && wb.lastWarningReceived?.warningId === id && !wb.isSosActive) {
          wb.ledState = 'PULSING_GREEN';
          wb.vibrationPattern = 'OFF';
          wb.oledMessage = 'SAFE - BEACH OPEN';
          wb.lastWarningReceived = null;
        }
      }
    }
  }

  public getActiveWarnings(): LocalizedWarningPacket[] {
    return Array.from(this.activeWarnings.values());
  }

  public getWarningHistory(): LocalizedWarningPacket[] {
    return [...this.warningHistory];
  }

  public clear(): void {
    this.activeWarnings.clear();
    this.warningHistory = [];
    this.warningCounter = 2000;
  }
}

