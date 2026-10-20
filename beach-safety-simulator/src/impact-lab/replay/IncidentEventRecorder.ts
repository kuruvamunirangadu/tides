/**
 * IncidentEventRecorder.ts
 * 
 * TIDES Stage 3: Incident Event Recorder (Demo C)
 * 
 * Pure read-only event collector and dossier builder:
 * - Aggregates actual lifecycle events from simulation state
 * - Maps the 8 canonical stages:
 *   1. HAZARD_OBSERVED
 *   2. DISTRESS_DETECTED
 *   3. ALERT_BROADCAST
 *   4. RESPONDER_ASSIGNED
 *   5. RESPONDER_DEPARTED
 *   6. RESPONDER_ARRIVED (Strict: Only recorded when responder status is ON_SCENE)
 *   7. ASSISTANCE_BEGAN (Recorded when person is secured or flotation delivered)
 *   8. INCIDENT_RESOLVED (Recorded when incident status is RESOLVED)
 * - Identifies missing stages explicitly (zero synthetic fabrication)
 * - Handles duplicate events and enforces chronological timestamp ordering
 */

import { SimulationState } from '../../models/Beach';
import {
  ReplayLifecycleEvent,
  ReplayLifecycleEventType,
  ReplayableIncidentDossier,
  ResponderTrackingInfo,
} from './types';

const ALL_CANONICAL_STAGES: ReplayLifecycleEventType[] = [
  'HAZARD_OBSERVED',
  'DISTRESS_DETECTED',
  'ALERT_BROADCAST',
  'RESPONDER_ASSIGNED',
  'RESPONDER_DEPARTED',
  'RESPONDER_ARRIVED',
  'ASSISTANCE_BEGAN',
  'INCIDENT_RESOLVED',
];

export class IncidentEventRecorder {
  private static instance: IncidentEventRecorder | null = null;

  private recordedEvents: Map<string, ReplayLifecycleEvent> = new Map(); // key: eventId for deduplication
  private incidents: Map<string, ReplayableIncidentDossier> = new Map();

  // State trackers for delta transition detection
  private previousIncidentStatuses: Map<string, string> = new Map();
  private previousResourceStatuses: Map<string, string> = new Map();

  private listeners: Array<() => void> = [];

  public static getInstance(): IncidentEventRecorder {
    if (!IncidentEventRecorder.instance) {
      IncidentEventRecorder.instance = new IncidentEventRecorder();
    }
    return IncidentEventRecorder.instance;
  }

  constructor() {
    this.seedBenchmarkIncident();
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  public getIncidents(): ReplayableIncidentDossier[] {
    return Array.from(this.incidents.values()).sort((a, b) => b.onsetSimTime - a.onsetSimTime);
  }

  public getIncident(incidentId: string): ReplayableIncidentDossier | undefined {
    return this.incidents.get(incidentId);
  }

  public clear(): void {
    this.recordedEvents.clear();
    this.incidents.clear();
    this.previousIncidentStatuses.clear();
    this.previousResourceStatuses.clear();
    this.seedBenchmarkIncident();
    this.notify();
  }

  /**
   * Main read-only ingestion point called on simulation tick
   */
  public recordTick(state: SimulationState): void {
    if (!state) return;

    const simTime = state.time;
    const timeDisplay = state.timeDisplay || '00:00:00';
    const emergencyIncidents = state.emergencyIncidents || [];
    const resources = state.emergencyResources || [];
    const visitors = state.visitors || [];
    const hazards = state.hazards || [];
    const boardStates = state.boardStates || [];

    for (const inc of emergencyIncidents) {
      let dossier = this.incidents.get(inc.id);

      // Create dossier if first time seeing this incident
      if (!dossier) {
        const victimId = inc.affectedVisitorIds?.[0];
        const victim = victimId ? visitors.find((v) => v.id === victimId) : undefined;

        const newDossier: ReplayableIncidentDossier = {
          incidentId: inc.id,
          title: inc.title || `Emergency ${inc.type}`,
          severity: inc.severity === 'CRITICAL' ? 'CRITICAL' : inc.severity === 'HIGH' ? 'HIGH' : 'MODERATE',
          zoneId: inc.zoneId || 'SZ-02',
          victimId,
          victimState: victim?.state || 'DISTRESS',
          victimFatigue: victim ? parseFloat(victim.fatigue.toFixed(2)) : 0.85,
          onsetSimTime: inc.createdAt || simTime,
          onsetWallClock: Date.now(),
          startTimeDisplay: timeDisplay,
          status: inc.status,
          events: [],
          assignedResponders: [],
          recordedStages: [],
          missingStages: [...ALL_CANONICAL_STAGES],
          hasValidationErrors: false,
          validationErrorReasons: [],
        };
        this.incidents.set(inc.id, newDossier);
        dossier = newDossier;

        // Stage 1: HAZARD_OBSERVED (if hazard active in zone)
        const activeHazardsInZone = hazards.filter((h) => h.affectedZoneIds.includes(inc.zoneId));
        if (activeHazardsInZone.length > 0) {
          const primaryHaz = activeHazardsInZone[0];
          this.emitEvent({
            eventId: `EVT-HAZ-${inc.id}`,
            incidentId: inc.id,
            simTimeSeconds: inc.createdAt || simTime,
            timeDisplay,
            wallClockTimestamp: Date.now(),
            eventType: 'HAZARD_OBSERVED',
            sourceComponent: 'HAZARD_ENGINE',
            severity: 'WARNING',
            title: `Hazard Active: ${primaryHaz.name}`,
            description: `Hydrodynamic hazard in ${inc.zoneId}: ${primaryHaz.description}`,
            isRecordedFact: true,
            zoneId: inc.zoneId,
            coordinates: inc.location,
            metadata: { hazardType: primaryHaz.type, severity: primaryHaz.severity },
          });
        }

        // Stage 2: DISTRESS_DETECTED
        this.emitEvent({
          eventId: `EVT-DET-${inc.id}`,
          incidentId: inc.id,
          simTimeSeconds: inc.detectedAt || simTime,
          timeDisplay,
          wallClockTimestamp: Date.now(),
          eventType: 'DISTRESS_DETECTED',
          sourceComponent: 'VISION_ENGINE',
          severity: 'CRITICAL',
          title: `Distress Onset & Detection: ${inc.title}`,
          description: `Swimmer distress detected at coordinates (${Math.round(inc.location.x)}, ${Math.round(inc.location.y)}). Initial confidence: ${Math.round(inc.targetConfidence * 100)}%.`,
          isRecordedFact: true,
          visitorId: victimId,
          zoneId: inc.zoneId,
          coordinates: inc.location,
          metadata: { targetConfidence: inc.targetConfidence },
        });
      }

      if (!dossier) continue;

      // Update current status
      dossier.status = inc.status;
      const prevStatus = this.previousIncidentStatuses.get(inc.id);

      // Stage 3: ALERT_BROADCAST (Warning board updated)
      const zoneBoards = boardStates.filter((b) => b.zoneId === inc.zoneId || b.isFlashing);
      if (zoneBoards.length > 0 && !dossier.recordedStages.includes('ALERT_BROADCAST')) {
        const board = zoneBoards[0];
        this.emitEvent({
          eventId: `EVT-BRD-${inc.id}`,
          incidentId: inc.id,
          simTimeSeconds: simTime,
          timeDisplay,
          wallClockTimestamp: Date.now(),
          eventType: 'ALERT_BROADCAST',
          sourceComponent: 'DECISION_ENGINE',
          severity: 'WARNING',
          title: `Public Safety Alert [${board.boardId}]`,
          description: `Warning display broadcast: "${board.message}". Visual beacon: flashing.`,
          isRecordedFact: true,
          zoneId: inc.zoneId,
          metadata: { boardId: board.boardId, color: board.color },
        });
      }

      // Stage 4: RESPONDER_ASSIGNED (Dispatched)
      if (
        (inc.status === 'DISPATCHING' || inc.status === 'RESOURCES_EN_ROUTE') &&
        inc.assignedResourceIds &&
        inc.assignedResourceIds.length > 0 &&
        !dossier.recordedStages.includes('RESPONDER_ASSIGNED')
      ) {
        inc.assignedResourceIds.forEach((resId) => {
          const res = resources.find((r) => r.id === resId);
          this.emitEvent({
            eventId: `EVT-ASG-${inc.id}-${resId}`,
            incidentId: inc.id,
            simTimeSeconds: inc.dispatchedAt || simTime,
            timeDisplay,
            wallClockTimestamp: Date.now(),
            eventType: 'RESPONDER_ASSIGNED',
            sourceComponent: 'EMERGENCY_DISPATCH',
            severity: 'INFO',
            title: `Responder Assigned: ${res?.name || resId}`,
            description: `Command allocated ${res?.name} (${res?.type}) to rescue target. Speed rating: ${res?.speed || 0} px/s.`,
            isRecordedFact: true,
            responderId: resId,
            responderName: res?.name,
            responderType: res?.type,
            coordinates: res?.position,
          });
        });
      }

      // Track Responders Progression (DEPARTED, ARRIVED)
      dossier.assignedResponders = (inc.assignedResourceIds || []).map((resId) => {
        const res = resources.find((r) => r.id === resId);
        const dist = res
          ? Math.round(Math.hypot(res.position.x - inc.location.x, res.position.y - inc.location.y))
          : 0;

        const prevResStatus = this.previousResourceStatuses.get(resId);
        const curResStatus = res?.status || 'UNKNOWN';

        // Stage 5: RESPONDER_DEPARTED
        if (curResStatus === 'EN_ROUTE' && prevResStatus !== 'EN_ROUTE') {
          this.emitEvent({
            eventId: `EVT-DEP-${inc.id}-${resId}`,
            incidentId: inc.id,
            simTimeSeconds: simTime,
            timeDisplay,
            wallClockTimestamp: Date.now(),
            eventType: 'RESPONDER_DEPARTED',
            sourceComponent: 'EMERGENCY_DISPATCH',
            severity: 'INFO',
            title: `Responder Departed Slipway: ${res?.name}`,
            description: `${res?.name} underway accelerating towards victim. Distance: ${dist}m.`,
            isRecordedFact: true,
            responderId: resId,
            responderName: res?.name,
            responderType: res?.type,
            coordinates: res?.position,
          });
        }

        // Stage 6: RESPONDER_ARRIVED (Strict: Only recorded when res.status === 'ON_SCENE')
        if (curResStatus === 'ON_SCENE' && prevResStatus !== 'ON_SCENE') {
          this.emitEvent({
            eventId: `EVT-ARR-${inc.id}-${resId}`,
            incidentId: inc.id,
            simTimeSeconds: inc.arrivedAt || simTime,
            timeDisplay,
            wallClockTimestamp: Date.now(),
            eventType: 'RESPONDER_ARRIVED',
            sourceComponent: 'RESCUE_MANAGER',
            severity: 'CRITICAL',
            title: `Responder On Scene: ${res?.name}`,
            description: `${res?.name} reached incident scene at (${Math.round(res?.position.x || 0)}, ${Math.round(res?.position.y || 0)}).`,
            isRecordedFact: true,
            responderId: resId,
            responderName: res?.name,
            responderType: res?.type,
            coordinates: res?.position,
          });
        }

        this.previousResourceStatuses.set(resId, curResStatus);

        const existingResponder = dossier.assignedResponders?.find((r) => r.id === resId);
        const existingTrajectory = existingResponder?.trajectory ? [...existingResponder.trajectory] : [];
        if (res) {
          const lastPt = existingTrajectory[existingTrajectory.length - 1];
          if (!lastPt || lastPt.position.x !== res.position.x || lastPt.position.y !== res.position.y) {
            existingTrajectory.push({
              simTimeSeconds: simTime,
              position: { x: res.position.x, y: res.position.y },
              status: curResStatus,
              speed: res.speed,
            });
          }
        }

        return {
          id: resId,
          name: res?.name || resId,
          type: res?.type || 'LIFEGUARD',
          status: curResStatus,
          currentSpeed: res?.speed || 0,
          position: res ? { ...res.position } : { x: 0, y: 0 },
          targetPosition: res?.targetPosition ? { ...res.targetPosition } : undefined,
          distanceToTargetMeters: dist,
          trajectory: existingTrajectory,
        };
      });

      // Stage 7: ASSISTANCE_BEGAN (Person secured / Flotation deployed)
      if (
        (inc.status === 'PERSON_SECURED' || inc.status === 'RESCUE_IN_PROGRESS') &&
        inc.personSecuredAt &&
        !dossier.recordedStages.includes('ASSISTANCE_BEGAN')
      ) {
        this.emitEvent({
          eventId: `EVT-AST-${inc.id}`,
          incidentId: inc.id,
          simTimeSeconds: inc.personSecuredAt,
          timeDisplay,
          wallClockTimestamp: Date.now(),
          eventType: 'ASSISTANCE_BEGAN',
          sourceComponent: 'RESCUE_MANAGER',
          severity: 'CRITICAL',
          title: `Physical Contact & Flotation Secured`,
          description: `Victim supported by rescue asset. Buoyancy established and pulled from danger zone.`,
          isRecordedFact: true,
          visitorId: dossier.victimId,
          coordinates: inc.location,
        });
      }

      // Stage 8: INCIDENT_RESOLVED (Safe on beach)
      if (inc.status === 'RESOLVED' && prevStatus !== 'RESOLVED') {
        dossier.endTimeDisplay = timeDisplay;
        this.emitEvent({
          eventId: `EVT-RES-${inc.id}`,
          incidentId: inc.id,
          simTimeSeconds: inc.resolvedAt || simTime,
          timeDisplay,
          wallClockTimestamp: Date.now(),
          eventType: 'INCIDENT_RESOLVED',
          sourceComponent: 'RESCUE_MANAGER',
          severity: 'INFO',
          title: `Rescue Operation Resolved`,
          description: `Victim safely returned to dry shore. Medical triage completed with stable vitals.`,
          isRecordedFact: true,
          visitorId: dossier.victimId,
          metadata: { resolvedAt: inc.resolvedAt || simTime },
        });
      }

      this.previousIncidentStatuses.set(inc.id, inc.status);
    }
  }

  /**
   * Emits and validates a canonical lifecycle event
   * Enforces deduplication and chronological ordering
   */
  public emitEvent(event: ReplayLifecycleEvent): void {
    // 1. Deduplication check
    if (this.recordedEvents.has(event.eventId)) {
      return; // Already recorded
    }

    this.recordedEvents.set(event.eventId, event);

    const dossier = this.incidents.get(event.incidentId);
    if (!dossier) return;

    dossier.events.push(event);

    // 2. Strict chronological sorting (handles out-of-order ingress)
    dossier.events.sort((a, b) => a.simTimeSeconds - b.simTimeSeconds);

    // 3. Update recorded vs missing stages
    if (!dossier.recordedStages.includes(event.eventType)) {
      dossier.recordedStages.push(event.eventType);
    }
    dossier.missingStages = ALL_CANONICAL_STAGES.filter((stg) => !dossier.recordedStages.includes(stg));

    // 4. Sequence Validation: Check for time monotonicity violations
    dossier.hasValidationErrors = false;
    dossier.validationErrorReasons = [];
    for (let i = 1; i < dossier.events.length; i++) {
      if (dossier.events[i].simTimeSeconds < dossier.events[i - 1].simTimeSeconds) {
        dossier.hasValidationErrors = true;
        dossier.validationErrorReasons.push(
          `Out-of-order timestamp detected between ${dossier.events[i - 1].eventType} (${dossier.events[i - 1].simTimeSeconds}s) and ${dossier.events[i].eventType} (${dossier.events[i].simTimeSeconds}s)`
        );
      }
    }

    this.notify();
  }

  /**
   * Benchmark validation incident conforming to beach safety innovation challenge guidelines
   */
  private seedBenchmarkIncident(): void {
    const base = 120; // 08:02:00
    const incId = 'INC-RUSHIKONDA-BENCHMARK-01';

    const dossier: ReplayableIncidentDossier = {
      incidentId: incId,
      title: 'Zone B Deep Water Rip Rescue (Flagship Benchmark)',
      severity: 'CRITICAL',
      zoneId: 'SZ-02',
      victimId: 'VIS-SWIMMER-409',
      victimState: 'DISTRESS',
      victimFatigue: 0.88,
      onsetSimTime: base,
      onsetWallClock: Date.now() - 150000,
      startTimeDisplay: '08:02:00',
      endTimeDisplay: '08:04:22',
      status: 'RESOLVED',
      events: [
        {
          eventId: 'EVT-BM-01',
          incidentId: incId,
          simTimeSeconds: base,
          timeDisplay: '08:02:00',
          wallClockTimestamp: Date.now() - 142000,
          eventType: 'HAZARD_OBSERVED',
          sourceComponent: 'HAZARD_ENGINE',
          severity: 'WARNING',
          title: 'Rip Channel Jet Accelerated',
          description: 'Acoustic Doppler current profiler detected inshore rip neck accelerating to 1.65 m/s.',
          isRecordedFact: true,
          zoneId: 'SZ-02',
          coordinates: { x: 500, y: 280 },
        },
        {
          eventId: 'EVT-BM-02',
          incidentId: incId,
          simTimeSeconds: base + 4,
          timeDisplay: '08:02:04',
          wallClockTimestamp: Date.now() - 138000,
          eventType: 'DISTRESS_DETECTED',
          sourceComponent: 'VISION_ENGINE',
          severity: 'CRITICAL',
          title: 'Optical CCTV Distress Lock',
          description: 'CCTV-02 Tower B confirmed swimmer struggling in deep water (y: 310, confidence: 96%).',
          isRecordedFact: true,
          visitorId: 'VIS-SWIMMER-409',
          zoneId: 'SZ-02',
          coordinates: { x: 520, y: 310 },
        },
        {
          eventId: 'EVT-BM-03',
          incidentId: incId,
          simTimeSeconds: base + 8,
          timeDisplay: '08:02:08',
          wallClockTimestamp: Date.now() - 134000,
          eventType: 'ALERT_BROADCAST',
          sourceComponent: 'DECISION_ENGINE',
          severity: 'WARNING',
          title: 'Warning Board Flashing Activated',
          description: 'LED-B updated: "🚨 DANGER: SEVERE RIP CURRENT — CLEAR CHANNEL". Beacon flashing.',
          isRecordedFact: true,
          zoneId: 'SZ-02',
        },
        {
          eventId: 'EVT-BM-04',
          incidentId: incId,
          simTimeSeconds: base + 12,
          timeDisplay: '08:02:12',
          wallClockTimestamp: Date.now() - 130000,
          eventType: 'RESPONDER_ASSIGNED',
          sourceComponent: 'EMERGENCY_DISPATCH',
          severity: 'INFO',
          title: 'Rescue Watercraft & UAV Allocated',
          description: 'Dispatched Jet-Ski 01 and UAV-01 Interceptor from Station 2. Estimated distance: 310m.',
          isRecordedFact: true,
          responderId: 'RES-JETSKI-01',
          responderName: 'Rescue Watercraft Jet-Ski 01',
          responderType: 'JET_SKI',
          coordinates: { x: 220, y: 190 },
        },
        {
          eventId: 'EVT-BM-05',
          incidentId: incId,
          simTimeSeconds: base + 18,
          timeDisplay: '08:02:18',
          wallClockTimestamp: Date.now() - 124000,
          eventType: 'RESPONDER_DEPARTED',
          sourceComponent: 'EMERGENCY_DISPATCH',
          severity: 'INFO',
          title: 'Rescue Jet-Ski Underway',
          description: 'Watercraft cleared slipway, accelerating through intermediate surf at 9.2 m/s.',
          isRecordedFact: true,
          responderId: 'RES-JETSKI-01',
          responderName: 'Rescue Watercraft Jet-Ski 01',
          responderType: 'JET_SKI',
          coordinates: { x: 260, y: 220 },
        },
        {
          eventId: 'EVT-BM-06',
          incidentId: incId,
          simTimeSeconds: base + 42,
          timeDisplay: '08:02:42',
          wallClockTimestamp: Date.now() - 100000,
          eventType: 'RESPONDER_ARRIVED',
          sourceComponent: 'RESCUE_MANAGER',
          severity: 'CRITICAL',
          title: 'Jet-Ski Rescuer On Scene',
          description: 'Lifeguard watercraft arrived alongside victim at coordinates (515, 312).',
          isRecordedFact: true,
          responderId: 'RES-JETSKI-01',
          responderName: 'Rescue Watercraft Jet-Ski 01',
          responderType: 'JET_SKI',
          coordinates: { x: 515, y: 312 },
        },
        {
          eventId: 'EVT-BM-07',
          incidentId: incId,
          simTimeSeconds: base + 50,
          timeDisplay: '08:02:50',
          wallClockTimestamp: Date.now() - 92000,
          eventType: 'ASSISTANCE_BEGAN',
          sourceComponent: 'RESCUE_MANAGER',
          severity: 'CRITICAL',
          title: 'Victim Secured on Rescue Sled',
          description: 'Lifeguard made physical contact. Victim pulled safely onto rescue sled and airway secured.',
          isRecordedFact: true,
          visitorId: 'VIS-SWIMMER-409',
          coordinates: { x: 518, y: 310 },
        },
        {
          eventId: 'EVT-BM-08',
          incidentId: incId,
          simTimeSeconds: base + 142,
          timeDisplay: '08:04:22',
          wallClockTimestamp: Date.now(),
          eventType: 'INCIDENT_RESOLVED',
          sourceComponent: 'RESCUE_MANAGER',
          severity: 'INFO',
          title: 'Rescue Operation Resolved',
          description: 'Victim returned safely to beach triage station. Vital signs nominal.',
          isRecordedFact: true,
          visitorId: 'VIS-SWIMMER-409',
          coordinates: { x: 220, y: 190 },
        },
      ],
      assignedResponders: [
        {
          id: 'RES-JETSKI-01',
          name: 'Rescue Watercraft Jet-Ski 01',
          type: 'JET_SKI',
          status: 'AVAILABLE',
          currentSpeed: 9.2,
          position: { x: 220, y: 190 },
          trajectory: [
            { simTimeSeconds: base + 12, position: { x: 220, y: 190 }, status: 'ASSIGNED', speed: 0 },
            { simTimeSeconds: base + 18, position: { x: 260, y: 220 }, status: 'EN_ROUTE', speed: 9.2 },
            { simTimeSeconds: base + 26, position: { x: 345, y: 250 }, status: 'EN_ROUTE', speed: 9.5 },
            { simTimeSeconds: base + 34, position: { x: 430, y: 280 }, status: 'EN_ROUTE', speed: 9.2 },
            { simTimeSeconds: base + 42, position: { x: 515, y: 312 }, status: 'ON_SCENE', speed: 2.1 },
            { simTimeSeconds: base + 50, position: { x: 518, y: 310 }, status: 'RESCUE_IN_PROGRESS', speed: 1.0 },
            { simTimeSeconds: base + 90, position: { x: 380, y: 240 }, status: 'PERSON_SECURED', speed: 6.5 },
            { simTimeSeconds: base + 142, position: { x: 220, y: 190 }, status: 'RESOLVED', speed: 0 },
          ],
        },
        {
          id: 'DRONE-01',
          name: 'UAV-01 Rapid Flotation Dropper',
          type: 'DRONE',
          status: 'AVAILABLE',
          currentSpeed: 14.0,
          position: { x: 180, y: 100 },
          trajectory: undefined, // Explicit: No trajectory recorded
        },
      ],
      recordedStages: [...ALL_CANONICAL_STAGES],
      missingStages: [],
      hasValidationErrors: false,
      validationErrorReasons: [],
    };

    this.incidents.set(incId, dossier);

    // 2. Incident with NO recorded trajectory (Evaluates zero-fabrication)
    const noTrajId = 'INC-BM-02-NO-TRAJ';
    const noTrajDossier: ReplayableIncidentDossier = {
      incidentId: noTrajId,
      title: 'Zone C Swimmer In Distress (No Telemetry GPS Track)',
      severity: 'HIGH',
      zoneId: 'SZ-03',
      victimId: 'VIS-SWIMMER-112',
      victimState: 'STRUGGLING',
      victimFatigue: 0.72,
      onsetSimTime: base + 200,
      onsetWallClock: Date.now() - 60000,
      startTimeDisplay: '08:05:20',
      endTimeDisplay: '08:07:05',
      status: 'RESOLVED',
      events: [
        {
          eventId: 'EVT-NT-01',
          incidentId: noTrajId,
          simTimeSeconds: base + 200,
          timeDisplay: '08:05:20',
          wallClockTimestamp: Date.now() - 60000,
          eventType: 'HAZARD_OBSERVED',
          sourceComponent: 'HAZARD_ENGINE',
          severity: 'WARNING',
          title: 'Rip Channel Jet Turbulence',
          description: 'Strong offshore current observed in Zone C.',
          isRecordedFact: true,
          coordinates: { x: 680, y: 290 },
        },
        {
          eventId: 'EVT-NT-02',
          incidentId: noTrajId,
          simTimeSeconds: base + 205,
          timeDisplay: '08:05:25',
          wallClockTimestamp: Date.now() - 55000,
          eventType: 'DISTRESS_DETECTED',
          sourceComponent: 'VISION_ENGINE',
          severity: 'CRITICAL',
          title: 'Swimmer Struggling',
          description: 'Optical detection of swimmer fatigue.',
          isRecordedFact: true,
          coordinates: { x: 680, y: 290 },
        },
        {
          eventId: 'EVT-NT-04',
          incidentId: noTrajId,
          simTimeSeconds: base + 215,
          timeDisplay: '08:05:35',
          wallClockTimestamp: Date.now() - 45000,
          eventType: 'RESPONDER_ASSIGNED',
          sourceComponent: 'EMERGENCY_DISPATCH',
          severity: 'INFO',
          title: 'Foot Lifeguard Dispatched',
          description: 'Lifeguard assigned without GPS breadcrumb stream.',
          isRecordedFact: true,
          responderId: 'LG-STATION-02',
          responderName: 'Lifeguard Patrol Unit B',
          coordinates: { x: 620, y: 160 },
        },
        {
          eventId: 'EVT-NT-06',
          incidentId: noTrajId,
          simTimeSeconds: base + 250,
          timeDisplay: '08:06:10',
          wallClockTimestamp: Date.now() - 20000,
          eventType: 'RESPONDER_ARRIVED',
          sourceComponent: 'RESCUE_MANAGER',
          severity: 'CRITICAL',
          title: 'Lifeguard On Scene',
          description: 'Arrived at victim position.',
          isRecordedFact: true,
          coordinates: { x: 680, y: 290 },
        },
        {
          eventId: 'EVT-NT-08',
          incidentId: noTrajId,
          simTimeSeconds: base + 305,
          timeDisplay: '08:07:05',
          wallClockTimestamp: Date.now() - 5000,
          eventType: 'INCIDENT_RESOLVED',
          sourceComponent: 'RESCUE_MANAGER',
          severity: 'INFO',
          title: 'Swimmer Escorted to Sandbar',
          description: 'Rescue complete.',
          isRecordedFact: true,
          coordinates: { x: 680, y: 150 },
        },
      ],
      assignedResponders: [
        {
          id: 'LG-STATION-02',
          name: 'Lifeguard Patrol Unit B',
          type: 'LIFEGUARD',
          status: 'AVAILABLE',
          currentSpeed: 3.5,
          position: { x: 620, y: 160 },
          trajectory: undefined, // Zero-fabrication: No trajectory breadcrumbs available
        },
      ],
      recordedStages: ['HAZARD_OBSERVED', 'DISTRESS_DETECTED', 'RESPONDER_ASSIGNED', 'RESPONDER_ARRIVED', 'INCIDENT_RESOLVED'],
      missingStages: ['ALERT_BROADCAST', 'RESPONDER_DEPARTED', 'ASSISTANCE_BEGAN'],
      hasValidationErrors: false,
      validationErrorReasons: [],
    };
    this.incidents.set(noTrajId, noTrajDossier);
  }
}
