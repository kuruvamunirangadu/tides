import { VirtualDrone } from '../simulation/VirtualDrone';
import { Visitor } from '../../models/Visitor';
import { UnifiedSafetyEvent, DetectionSource } from '../models/UnifiedSafetyEvent';
import { CVSafetyEvent } from '../../vision/models/CVSafetyEvent';
import { DroneCoverage } from '../models/DroneCoverage';

export interface DroneDetectionTrack {
  trackId: string;
  droneId: string;
  visitorId: string;
  canvasPosition: { x: number; y: number };
  confidence: number;
  apparentSpeed: number;
  inWater: boolean;
  behavior: 'NORMAL' | 'DRIFTING' | 'STRUGGLING' | 'SUBMERGING';
  firstObservedAt: number;
  lastObservedAt: number;
}

export class DroneVisionEngine {
  private activeTracks: Map<string, DroneDetectionTrack> = new Map();
  private unifiedEvents: UnifiedSafetyEvent[] = [];

  public tick(
    drones: VirtualDrone[],
    visitors: Visitor[],
    cctvEvents: CVSafetyEvent[],
    currentTime: number,
    timeDisplay: string
  ): { tracks: DroneDetectionTrack[]; safetyEvents: UnifiedSafetyEvent[]; coverages: DroneCoverage[] } {
    const currentTracks: DroneDetectionTrack[] = [];
    const coverages: DroneCoverage[] = [];

    // 1. Process each airborne drone
    for (const drone of drones) {
      if (drone.altitude < 5 || drone.camera.status === 'OFFLINE') continue;

      const coverage = drone.getCoverage();
      coverages.push(coverage);
      const rad = coverage.radiusMeters;
      const dX = drone.canvasPosition.x;
      const dY = drone.canvasPosition.y;

      // Detect visitors inside coverage circle
      for (const visitor of visitors) {
        const dist = Math.hypot(visitor.position.x - dX, visitor.position.y - dY);
        if (dist <= rad) {
          // Calculate vision confidence based on distance from nadir center & altitude
          const centerDistRatio = dist / rad; // 0 (center) to 1 (edge)
          let confidence = 0.94 - centerDistRatio * 0.15;
          if (drone.camera.status === 'DEGRADED') confidence *= 0.6;

          // Determine behavior
          let behavior: DroneDetectionTrack['behavior'] = 'NORMAL';
          const isDistressed = visitor.state === 'DISTRESS' || visitor.state === 'STRUGGLING';
          const isDrifting = visitor.state === 'DRIFTING';

          if (isDistressed) {
            behavior = visitor.state === 'DISTRESS' ? 'SUBMERGING' : 'STRUGGLING';
          } else if (isDrifting) {
            behavior = 'DRIFTING';
          }

          const track: DroneDetectionTrack = {
            trackId: `D-TRK-${drone.id.slice(-2)}-${visitor.id.slice(-4)}`,
            droneId: drone.id,
            visitorId: visitor.id,
            canvasPosition: { ...visitor.position },
            confidence: Math.round(confidence * 100) / 100,
            apparentSpeed: visitor.speed,
            inWater: visitor.position.y >= 260,
            behavior,
            firstObservedAt: currentTime,
            lastObservedAt: currentTime,
          };
          currentTracks.push(track);
          this.activeTracks.set(track.trackId, track);

          // 2. Formulate or Fuse Safety Events
          if (isDistressed || isDrifting || visitor.state === 'IN_RESTRICTED_ZONE') {
            this.handleDetectedAnomaly(track, visitor, cctvEvents, drone, currentTime, timeDisplay);
          }
        }
      }
    }

    // Filter resolved/old unified events
    this.unifiedEvents = this.unifiedEvents.filter(
      (e) => currentTime - e.timestamp < 120 && e.status !== 'RESOLVED'
    );

    return {
      tracks: currentTracks,
      safetyEvents: this.unifiedEvents,
      coverages,
    };
  }

  private handleDetectedAnomaly(
    track: DroneDetectionTrack,
    visitor: Visitor,
    cctvEvents: CVSafetyEvent[],
    drone: VirtualDrone,
    currentTime: number,
    timeDisplay: string
  ): void {
    // Check if CCTV already had an active safety event for this visitor
    const matchingCCTV = cctvEvents.find(
      (ce) => ce.groundTruthVisitorIds.includes(visitor.id) || ce.zoneId === visitor.currentZone
    );

    // Cross-Modal Bayesian Confidence Fusion
    const cctvConf = matchingCCTV ? matchingCCTV.confidence : 0.0;
    const droneConf = track.confidence;
    const fusedConfidence = matchingCCTV
      ? 1 - (1 - cctvConf) * (1 - droneConf)
      : droneConf;

    const sources: DetectionSource[] = [
      {
        sourceType: 'DRONE_UAV',
        sourceId: drone.id,
        confidence: droneConf,
        observedAt: currentTime,
        rawTrackId: track.trackId,
        notes: `Aerial Top-Down Tracking: Behavior = ${track.behavior}`,
      },
    ];

    if (matchingCCTV) {
      sources.push({
        sourceType: 'FIXED_CCTV',
        sourceId: matchingCCTV.cameraId,
        confidence: cctvConf,
        observedAt: matchingCCTV.timestamp,
        rawTrackId: matchingCCTV.trackIds.join(', '),
        notes: `Fixed CCTV Optical Stream (${matchingCCTV.type})`,
      });
    }

    let eventType: UnifiedSafetyEvent['type'] = 'POSSIBLE_DISTRESS';
    if (visitor.state === 'DISTRESS') eventType = 'CONFIRMED_DROWNING';
    else if (visitor.state === 'DRIFTING') eventType = 'DRIFTING_SWIMMER';
    else if (visitor.state === 'IN_RESTRICTED_ZONE') eventType = 'RESTRICTED_ZONE_BREACH';

    const existingIndex = this.unifiedEvents.findIndex((e) => e.visitorId === visitor.id);
    const unifiedEvent: UnifiedSafetyEvent = {
      id: existingIndex >= 0 ? this.unifiedEvents[existingIndex].id : `UNIFIED-EVT-${Date.now().toString().slice(-4)}`,
      type: eventType,
      location: { latitude: 17.7125, longitude: 83.3180 },
      canvasPosition: { ...visitor.position },
      zoneId: visitor.currentZone || 'SZ-01',
      visitorId: visitor.id,
      confidence: Math.round(fusedConfidence * 100) / 100,
      sources,
      timestamp: currentTime,
      timeDisplay,
      status: fusedConfidence > 0.85 ? 'CONFIRMED' : 'SUSPECTED',
      verificationDetails: {
        cctvConfidence: cctvConf,
        droneConfidence: droneConf,
        verifiedByDrone: true,
        verificationLatencySec: matchingCCTV ? Math.max(1, currentTime - matchingCCTV.timestamp) : 0,
      },
    };

    if (existingIndex >= 0) {
      this.unifiedEvents[existingIndex] = unifiedEvent;
    } else {
      this.unifiedEvents.push(unifiedEvent);
    }
  }

  public getUnifiedEvents(): UnifiedSafetyEvent[] {
    return this.unifiedEvents;
  }
}
