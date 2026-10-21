/**
 * SwimmerFeelingControlManager.ts
 * 
 * TIDES Track B — Human-in-the-Loop Swimmer Perception & Closed-Loop System Control Engine
 * 
 * Manages:
 * - Psychological & physiological feeling states of wristband-wearing swimmers
 *   (SAFE -> APPREHENSIVE -> UNSAFE -> CRITICAL_PANIC -> STABILIZED)
 * - Closed-loop system control flow:
 *   Stage 1: Feeling Detection (biometrics, struggle index, undertow drag)
 *   Stage 2: Localized Wristband Downlink (haptic cadence + directional OLED guidance)
 *   Stage 3: Autonomous AI Directives & Resource Dispatch (matrix board flash + UAV buoy drop + rescue craft)
 *   Stage 4: Emotional & Physical Stabilization (flotation secured, ACK confirmation, safe recovery)
 * - Chronological Suffering & Distress Event Log with verified timestamps, swimmer IDs, band IDs, and Golden Window SLA compliance
 */

import { WristbandRegistry } from '../WristbandRegistry';
import { WristbandIncidentBridge } from '../WristbandIncidentBridge';
import { LocalizedWarningDistributionEngine } from '../LocalizedWarningDistributionEngine';
import { Visitor } from '../../models/Visitor';
import { SwimmerWristband } from '../wristband.types';

export type SwimmerSafetyFeeling =
  | 'SAFE'              // Calm, confident, swimming in designated zone
  | 'APPREHENSIVE'     // Wave shoaling, undertow drag, slight drift
  | 'UNSAFE'            // Seaward rip current pull, severe fatigue, struggling against current
  | 'CRITICAL_PANIC'    // Submersion risk, gasping, SOS active
  | 'STABILIZED';       // Flotation buoy secured / assisted by lifeguard, safety restored

export type SystemControlStage =
  | 'MONITORING_SAFE'         // Standard passive sensor monitoring
  | 'ADVISORY_DOWNLINK'       // Stage 1: Wristband haptic pulse & OLED cautionary guidance
  | 'WARNING_INTERVENTION'    // Stage 2: Haptic alert burst, beach matrix board warning, UAV patrol alert
  | 'EMERGENCY_DISPATCH'      // Stage 3: Flotation buoy dropped by UAV + RB-01 rescue craft en route
  | 'CLOSED_LOOP_RECOVERED';  // Stage 4: Person stabilized, panic alleviated, resolved with SLA

export interface SwimmerFeelingState {
  wristbandId: string;
  visitorId: string;
  visitorName: string;
  zoneId: string;
  feeling: SwimmerSafetyFeeling;
  sensationDescription: string;
  fatiguePercent: number;
  heartRateBpm: number;
  struggleIndex: 'NOMINAL' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  systemControlStage: SystemControlStage;
  activeIntervention: string;
  feelingStartedAt: string;
  feelingStartedMs: number;
  lastUpdatedMs: number;
  isSuffering: boolean;
}

export interface SwimmerDistressLogEntry {
  id: string;
  timestamp: string;
  timestampMs: number;
  swimmerId: string;
  swimmerName: string;
  wristbandId: string;
  zoneId: string;
  feeling: SwimmerSafetyFeeling;
  hazardCause: string;
  sensationDetails: string;
  fatiguePercent: number;
  heartRateBpm: number;
  struggleIndex: 'MODERATE' | 'HIGH' | 'CRITICAL';
  systemControlAction: string;
  interventionStage: SystemControlStage;
  status: 'SUFFERING_ACTIVE' | 'SYSTEM_INTERVENING' | 'STABILIZED_SAFE';
  resolvedAt?: string;
  resolutionLatencySec?: number;
  goldenWindowCompliant: boolean;
}

export class SwimmerFeelingControlManager {
  private static instance: SwimmerFeelingControlManager | null = null;
  private feelings: Map<string, SwimmerFeelingState> = new Map();
  private distressLog: SwimmerDistressLogEntry[] = [];
  private logCounter: number = 500;

  private constructor() {
    this.initializeDefaultFeelings();
  }

  public static getInstance(): SwimmerFeelingControlManager {
    if (!SwimmerFeelingControlManager.instance) {
      SwimmerFeelingControlManager.instance = new SwimmerFeelingControlManager();
    }
    return SwimmerFeelingControlManager.instance;
  }

  private formatTime(date: Date = new Date()): string {
    return date.toTimeString().split(' ')[0];
  }

  private initializeDefaultFeelings(): void {
    const now = Date.now();
    const timeStr = this.formatTime();

    const initialRoster: Array<{
      wbId: string;
      visId: string;
      name: string;
      zone: string;
      feeling: SwimmerSafetyFeeling;
      sensation: string;
      fatigue: number;
      hr: number;
      struggle: 'NOMINAL' | 'MODERATE' | 'HIGH' | 'CRITICAL';
      stage: SystemControlStage;
      action: string;
      suffering: boolean;
    }> = [
      {
        wbId: 'WB-101',
        visId: 'VIS-SWIM-01',
        name: 'Rohan Sharma',
        zone: 'SWIM_ZONE_NORTH',
        feeling: 'SAFE',
        sensation: 'Gentle swell, swimming comfortably within designated flags',
        fatigue: 18,
        hr: 82,
        struggle: 'NOMINAL',
        stage: 'MONITORING_SAFE',
        action: 'Routine Telemetry Heartbeat (~3 Hz)',
        suffering: false,
      },
      {
        wbId: 'WB-102',
        visId: 'VIS-SWIM-02',
        name: 'Ananya Rao',
        zone: 'SWIM_ZONE_NORTH',
        feeling: 'SAFE',
        sensation: 'Shallow sandbar wading, calm waters',
        fatigue: 24,
        hr: 86,
        struggle: 'NOMINAL',
        stage: 'MONITORING_SAFE',
        action: 'Routine Telemetry Heartbeat (~3 Hz)',
        suffering: false,
      },
      {
        wbId: 'WB-103',
        visId: 'VIS-SWIM-03',
        name: 'Vikram Patel',
        zone: 'CENTRAL_SURF',
        feeling: 'SAFE',
        sensation: 'Body-surfing waves, moderate wave action',
        fatigue: 36,
        hr: 104,
        struggle: 'NOMINAL',
        stage: 'MONITORING_SAFE',
        action: 'Routine Telemetry Heartbeat (~3 Hz)',
        suffering: false,
      },
      {
        wbId: 'WB-104',
        visId: 'VIS-SWIM-04',
        name: 'Pooja Reddy',
        zone: 'CENTRAL_SURF',
        feeling: 'APPREHENSIVE',
        sensation: 'Undertow drag detected on feet, current pushing toward sandbar edge',
        fatigue: 54,
        hr: 118,
        struggle: 'MODERATE',
        stage: 'ADVISORY_DOWNLINK',
        action: 'Haptic Advisory Downlinked • Guided Inshore',
        suffering: true,
      },
      {
        wbId: 'WB-105',
        visId: 'VIS-REST-01',
        name: 'Karthik Varma',
        zone: 'RIP_CURRENT_CORRIDOR_SOUTH',
        feeling: 'UNSAFE',
        sensation: 'Caught in seaward rip chute (velocity 1.4 m/s), legs tiring, panic rising',
        fatigue: 78,
        hr: 146,
        struggle: 'HIGH',
        stage: 'WARNING_INTERVENTION',
        action: 'Matrix Board Alert Active • UAV Patrol Dispatched',
        suffering: true,
      },
      {
        wbId: 'WB-106',
        visId: 'VIS-SHORE-01',
        name: 'Sneha Nair',
        zone: 'SHORELINE_SOUTH',
        feeling: 'SAFE',
        sensation: 'Shallow shoreline wading, dry / ankle-deep water',
        fatigue: 12,
        hr: 76,
        struggle: 'NOMINAL',
        stage: 'MONITORING_SAFE',
        action: 'Standby Shoreline Beacon',
        suffering: false,
      },
      {
        wbId: 'WB-107',
        visId: 'VIS-SWIM-05',
        name: 'Devraj Sen',
        zone: 'NORTH_SHORE',
        feeling: 'SAFE',
        sensation: 'Gentle water entry, safe sector',
        fatigue: 20,
        hr: 80,
        struggle: 'NOMINAL',
        stage: 'MONITORING_SAFE',
        action: 'Low-Battery Monitoring (28%)',
        suffering: false,
      },
      {
        wbId: 'WB-108',
        visId: 'VIS-STANDBY-01',
        name: 'Standby Reserve',
        zone: 'RESERVE_STATION',
        feeling: 'SAFE',
        sensation: 'Lifeguard tower charging cradle',
        fatigue: 0,
        hr: 0,
        struggle: 'NOMINAL',
        stage: 'MONITORING_SAFE',
        action: 'Reserve Standby Unit',
        suffering: false,
      },
    ];

    for (const r of initialRoster) {
      this.feelings.set(r.wbId, {
        wristbandId: r.wbId,
        visitorId: r.visId,
        visitorName: r.name,
        zoneId: r.zone,
        feeling: r.feeling,
        sensationDescription: r.sensation,
        fatiguePercent: r.fatigue,
        heartRateBpm: r.hr,
        struggleIndex: r.struggle,
        systemControlStage: r.stage,
        activeIntervention: r.action,
        feelingStartedAt: timeStr,
        feelingStartedMs: now - 35000,
        lastUpdatedMs: now,
        isSuffering: r.suffering,
      });

      // Record initial active suffering entries in distress log
      if (r.suffering) {
        this.logCounter += 1;
        this.distressLog.unshift({
          id: `SUFFER-${this.logCounter}`,
          timestamp: timeStr,
          timestampMs: now - 35000,
          swimmerId: r.visId,
          swimmerName: r.name,
          wristbandId: r.wbId,
          zoneId: r.zone,
          feeling: r.feeling,
          hazardCause: r.zone.includes('RIP') ? 'Rip Current Jet' : 'Surf Undertow Drag',
          sensationDetails: r.sensation,
          fatiguePercent: r.fatigue,
          heartRateBpm: r.hr,
          struggleIndex: r.struggle === 'HIGH' ? 'HIGH' : 'MODERATE',
          systemControlAction: r.action,
          interventionStage: r.stage,
          status: 'SUFFERING_ACTIVE',
          goldenWindowCompliant: true,
        });
      }
    }
  }

  public getSwimmerFeeling(wristbandId: string): SwimmerFeelingState {
    const existing = this.feelings.get(wristbandId);
    if (existing) return existing;

    const wb = WristbandRegistry.getInstance().getWristband(wristbandId);
    const now = Date.now();
    const fallback: SwimmerFeelingState = {
      wristbandId,
      visitorId: wb?.pairedVisitorId || `VIS-${wristbandId}`,
      visitorName: wb?.pairedVisitorName || 'Swimmer Unit',
      zoneId: wb?.currentZone || 'CENTRAL_SURF',
      feeling: wb?.isSosActive ? 'CRITICAL_PANIC' : 'SAFE',
      sensationDescription: wb?.isSosActive
        ? 'Severe water distress, gasping, SOS trigger active'
        : 'Swimming in open waters',
      fatiguePercent: wb?.isSosActive ? 85 : 30,
      heartRateBpm: wb?.isSosActive ? 155 : 85,
      struggleIndex: wb?.isSosActive ? 'CRITICAL' : 'NOMINAL',
      systemControlStage: wb?.isSosActive ? 'EMERGENCY_DISPATCH' : 'MONITORING_SAFE',
      activeIntervention: wb?.isSosActive ? 'Autonomous Rescue Active' : 'Passive Telemetry',
      feelingStartedAt: this.formatTime(),
      feelingStartedMs: now,
      lastUpdatedMs: now,
      isSuffering: wb?.isSosActive || false,
    };
    this.feelings.set(wristbandId, fallback);
    return fallback;
  }

  public getAllFeelings(): SwimmerFeelingState[] {
    return Array.from(this.feelings.values());
  }

  public getDistressLog(): SwimmerDistressLogEntry[] {
    return [...this.distressLog];
  }

  public getActiveSufferingCount(): number {
    return Array.from(this.feelings.values()).filter((f) => f.isSuffering).length;
  }

  /**
   * Closed-Loop Step 1: Simulate Swimmer Feeling Unsafe
   * Triggers realistic perception cascade & automated system control flow
   */
  public simulateFeelingUnsafe(
    wristbandId: string,
    hazardCause: string = 'Strong Seaward Rip Undertow'
  ): SwimmerFeelingState {
    const feeling = this.getSwimmerFeeling(wristbandId);
    const now = Date.now();
    const timeStr = this.formatTime();

    feeling.feeling = 'UNSAFE';
    feeling.sensationDescription = `Sudden rip current outflow surge (1.45 m/s); swimmer experiencing leg fatigue & seaward drag`;
    feeling.fatiguePercent = 82;
    feeling.heartRateBpm = 148;
    feeling.struggleIndex = 'HIGH';
    feeling.systemControlStage = 'WARNING_INTERVENTION';
    feeling.activeIntervention = 'Haptic Warning Delivered • OLED Caution Inshore • Matrix Board Flashing';
    feeling.feelingStartedAt = timeStr;
    feeling.feelingStartedMs = now;
    feeling.lastUpdatedMs = now;
    feeling.isSuffering = true;

    // Update wristband hardware indicators
    WristbandRegistry.getInstance().updateWristband(wristbandId, {
      vibrationPattern: 'CADENCE_BURST',
      ledState: 'STROBE_AMBER',
      oledMessage: 'CAUTION - RIP DETECTED',
      lastWarningReceived: {
        warningId: `WARN-UNSAFE-${now}`,
        originIncidentId: `FEEL-${wristbandId}-${now}`,
        targetWristbandId: wristbandId,
        targetVisitorId: feeling.visitorId,
        category: 'CAUTION',
        title: 'Rip Current Hazard Proximity',
        message: 'Rip current hazard in sector. Move toward shore.',
        timestampMs: now,
        expiresAtMs: now + 45000,
        status: 'DELIVERED',
        dispatchedByGatewayId: 'GW-TOWER-01',
        deliveredAtMs: now,
        retryCount: 0,
      },
    });

    // Append to authoritative suffering log
    this.logCounter += 1;
    this.distressLog.unshift({
      id: `SUFFER-${this.logCounter}`,
      timestamp: timeStr,
      timestampMs: now,
      swimmerId: feeling.visitorId,
      swimmerName: feeling.visitorName,
      wristbandId,
      zoneId: feeling.zoneId,
      feeling: 'UNSAFE',
      hazardCause,
      sensationDetails: feeling.sensationDescription,
      fatiguePercent: 82,
      heartRateBpm: 148,
      struggleIndex: 'HIGH',
      systemControlAction: feeling.activeIntervention,
      interventionStage: 'WARNING_INTERVENTION',
      status: 'SUFFERING_ACTIVE',
      goldenWindowCompliant: true,
    });

    return feeling;
  }

  /**
   * Closed-Loop Step 2: Escalate to Emergency SOS Distress
   */
  public simulateSOSDistress(wristbandId: string): SwimmerFeelingState {
    const feeling = this.getSwimmerFeeling(wristbandId);
    const now = Date.now();
    const timeStr = this.formatTime();

    feeling.feeling = 'CRITICAL_PANIC';
    feeling.sensationDescription = `Submersion risk; exhaustion threshold exceeded; emergency SOS button engaged`;
    feeling.fatiguePercent = 94;
    feeling.heartRateBpm = 168;
    feeling.struggleIndex = 'CRITICAL';
    feeling.systemControlStage = 'EMERGENCY_DISPATCH';
    feeling.activeIntervention = 'SOS Authoritative Incident • Autonomous Drone Buoy Drop • RB-01 Dispatched';
    feeling.lastUpdatedMs = now;
    feeling.isSuffering = true;

    // Trigger authoritative SOS via Registry & Bridge
    const rawEvent = WristbandRegistry.getInstance().triggerSOS(wristbandId, true);
    if (rawEvent) {
      WristbandIncidentBridge.getInstance().handleSOSEvent(rawEvent);
    }

    // Update log entry
    this.logCounter += 1;
    this.distressLog.unshift({
      id: `SOS-DISTRESS-${this.logCounter}`,
      timestamp: timeStr,
      timestampMs: now,
      swimmerId: feeling.visitorId,
      swimmerName: feeling.visitorName,
      wristbandId,
      zoneId: feeling.zoneId,
      feeling: 'CRITICAL_PANIC',
      hazardCause: 'Critical Water Inhalation & Rip Exhaustion',
      sensationDetails: feeling.sensationDescription,
      fatiguePercent: 94,
      heartRateBpm: 168,
      struggleIndex: 'CRITICAL',
      systemControlAction: feeling.activeIntervention,
      interventionStage: 'EMERGENCY_DISPATCH',
      status: 'SYSTEM_INTERVENING',
      goldenWindowCompliant: true,
    });

    return feeling;
  }

  /**
   * Closed-Loop Step 3: Closed-Loop Stabilization & Safe Recovery
   * Swimmer is assisted, panic subsides, feeling safely stabilized
   */
  public stabilizeSwimmer(wristbandId: string): SwimmerFeelingState {
    const feeling = this.getSwimmerFeeling(wristbandId);
    const now = Date.now();
    const timeStr = this.formatTime();
    const latencySec = Math.max(1, Math.round((now - feeling.feelingStartedMs) / 1000));

    feeling.feeling = 'STABILIZED';
    feeling.sensationDescription = `Autonomous flotation buoy secured; lifeguard contact established; relief & breathing stabilized`;
    feeling.fatiguePercent = 38;
    feeling.heartRateBpm = 96;
    feeling.struggleIndex = 'NOMINAL';
    feeling.systemControlStage = 'CLOSED_LOOP_RECOVERED';
    feeling.activeIntervention = `Swimmer Secured in ${latencySec}s • Double-Tap Ack Logged • Transferred to Safe Shallows`;
    feeling.lastUpdatedMs = now;
    feeling.isSuffering = false;

    // Reset wristband state
    WristbandRegistry.getInstance().cancelSOS(wristbandId);
    WristbandRegistry.getInstance().updateWristband(wristbandId, {
      ledState: 'PULSING_GREEN',
      vibrationPattern: 'OFF',
      oledMessage: 'SAFE - BEACH OPEN',
      lastAcknowledgedAtMs: now,
    });

    // Mark active log entries for this wristband as resolved
    for (const entry of this.distressLog) {
      if (entry.wristbandId === wristbandId && entry.status !== 'STABILIZED_SAFE') {
        entry.status = 'STABILIZED_SAFE';
        entry.resolvedAt = timeStr;
        entry.resolutionLatencySec = latencySec;
        entry.goldenWindowCompliant = latencySec <= 180; // 3-minute Golden Window SLA
      }
    }

    return feeling;
  }

  /**
   * Synchronize real-time feeling states with the active simulation loop
   */
  public syncWithSimulation(visitors: Visitor[], wristbands: SwimmerWristband[]): void {
    const now = Date.now();
    for (const wb of wristbands) {
      let state = this.feelings.get(wb.id);
      if (!state) {
        state = this.getSwimmerFeeling(wb.id);
      }

      // If wristband has an active SOS, ensure feeling reflects CRITICAL_PANIC
      if (wb.isSosActive && state.feeling !== 'CRITICAL_PANIC') {
        state.feeling = 'CRITICAL_PANIC';
        state.struggleIndex = 'CRITICAL';
        state.fatiguePercent = Math.max(state.fatiguePercent, 88);
        state.systemControlStage = 'EMERGENCY_DISPATCH';
        state.activeIntervention = 'Active Distress Protocol • Multi-Agency Response In Progress';
        state.isSuffering = true;
      }

      // Check linked simulated visitor
      if (wb.pairedVisitorId) {
        const vis = visitors.find((v) => v.id === wb.pairedVisitorId);
        if (vis) {
          if (vis.state === 'DISTRESS' && state.feeling !== 'CRITICAL_PANIC') {
            state.feeling = 'CRITICAL_PANIC';
            state.struggleIndex = 'CRITICAL';
            state.fatiguePercent = Math.round(vis.fatigue * 100);
            state.isSuffering = true;
          } else if (vis.state === 'STRUGGLING' && state.feeling === 'SAFE') {
            state.feeling = 'UNSAFE';
            state.struggleIndex = 'HIGH';
            state.fatiguePercent = Math.round(vis.fatigue * 100);
            state.isSuffering = true;
          } else if (vis.state === 'DRIFTING' && state.feeling === 'SAFE') {
            state.feeling = 'APPREHENSIVE';
            state.struggleIndex = 'MODERATE';
            state.fatiguePercent = Math.round(vis.fatigue * 100);
            state.isSuffering = true;
          }
        }
      }

      state.lastUpdatedMs = now;
    }
  }
}

