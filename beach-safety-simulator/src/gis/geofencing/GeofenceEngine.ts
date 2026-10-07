import { GeofenceManager } from './GeofenceManager';
import { GeofenceBreachEvent, Geofence } from '../models/Geofence';
import { PointInPolygon } from './PointInPolygon';
import { GeoPoint } from '../models/GeoPoint';

interface VisitorPresence {
  visitorId: string;
  geofenceId: string;
  enteredTimestamp: number;
  lastSeenTimestamp: number;
  dwellFired: boolean;
}

export interface VisitorGeoState {
  id: string;
  location: GeoPoint;
}

export class GeofenceEngine {
  private geofenceManager: GeofenceManager;
  private presences: Map<string, VisitorPresence> = new Map(); // key: `${visitorId}_${geofenceId}`
  private eventHistory: GeofenceBreachEvent[] = [];

  constructor(geofenceManager: GeofenceManager) {
    this.geofenceManager = geofenceManager;
  }

  public getGeofenceManager(): GeofenceManager {
    return this.geofenceManager;
  }

  /**
   * Evaluate all active visitors against active geofences
   */
  public evaluate(
    visitors: VisitorGeoState[],
    currentTime: number,
    timeDisplay: string
  ): GeofenceBreachEvent[] {
    this.geofenceManager.cleanExpiredGeofences(currentTime);
    const activeGeofences = this.geofenceManager.getActiveGeofences();
    const newEvents: GeofenceBreachEvent[] = [];

    // Track which presence keys were seen in this frame
    const currentFramePresenceKeys = new Set<string>();

    visitors.forEach((visitor) => {
      activeGeofences.forEach((gf) => {
        const isInside = PointInPolygon.isPointInGeoPolygon(visitor.location, gf.geometry);
        const presenceKey = `${visitor.id}_${gf.id}`;

        if (isInside) {
          currentFramePresenceKeys.add(presenceKey);
          const existingPresence = this.presences.get(presenceKey);

          if (!existingPresence) {
            // 1. ENTER Event
            this.presences.set(presenceKey, {
              visitorId: visitor.id,
              geofenceId: gf.id,
              enteredTimestamp: currentTime,
              lastSeenTimestamp: currentTime,
              dwellFired: false,
            });

            const enterRule = gf.rules.find((r) => r.triggerOn === 'ENTER');
            if (enterRule) {
              const breachEvent: GeofenceBreachEvent = {
                id: `GF-EVT-${gf.id}-${visitor.id}-${Math.round(currentTime)}`,
                geofenceId: gf.id,
                geofenceName: gf.name,
                geofenceType: gf.type,
                visitorId: visitor.id,
                location: visitor.location,
                timestamp: currentTime,
                timeDisplay,
                eventType: 'ENTER',
                ruleTriggered: enterRule,
                acknowledged: false,
              };
              newEvents.push(breachEvent);
              this.eventHistory.push(breachEvent);
            }
          } else {
            // Update last seen
            existingPresence.lastSeenTimestamp = currentTime;
            const dwellDuration = currentTime - existingPresence.enteredTimestamp;

            // 2. DWELL Event
            const dwellRule = gf.rules.find((r) => r.triggerOn === 'DWELL');
            if (
              dwellRule &&
              !existingPresence.dwellFired &&
              dwellRule.dwellThresholdSeconds &&
              dwellDuration >= dwellRule.dwellThresholdSeconds
            ) {
              existingPresence.dwellFired = true;
              const dwellEvent: GeofenceBreachEvent = {
                id: `GF-DWELL-${gf.id}-${visitor.id}-${Math.round(currentTime)}`,
                geofenceId: gf.id,
                geofenceName: gf.name,
                geofenceType: gf.type,
                visitorId: visitor.id,
                location: visitor.location,
                timestamp: currentTime,
                timeDisplay,
                eventType: 'DWELL_LIMIT_EXCEEDED',
                ruleTriggered: dwellRule,
                acknowledged: false,
              };
              newEvents.push(dwellEvent);
              this.eventHistory.push(dwellEvent);
            }
          }
        }
      });
    });

    // 3. EXIT Events (Was present in previous frame, but not inside anymore)
    for (const [key, presence] of this.presences.entries()) {
      if (!currentFramePresenceKeys.has(key)) {
        const gf = this.geofenceManager.getGeofenceById(presence.geofenceId);
        const visitor = visitors.find((v) => v.id === presence.visitorId);

        if (gf && visitor) {
          const exitRule = gf.rules.find((r) => r.triggerOn === 'EXIT');
          if (exitRule) {
            const exitEvent: GeofenceBreachEvent = {
              id: `GF-EXIT-${gf.id}-${presence.visitorId}-${Math.round(currentTime)}`,
              geofenceId: gf.id,
              geofenceName: gf.name,
              geofenceType: gf.type,
              visitorId: presence.visitorId,
              location: visitor.location,
              timestamp: currentTime,
              timeDisplay,
              eventType: 'EXIT',
              ruleTriggered: exitRule,
              acknowledged: false,
            };
            newEvents.push(exitEvent);
            this.eventHistory.push(exitEvent);
          }
        }
        this.presences.delete(key);
      }
    }

    // Keep history capped
    if (this.eventHistory.length > 200) {
      this.eventHistory = this.eventHistory.slice(-200);
    }

    return newEvents;
  }

  public getEventHistory(): GeofenceBreachEvent[] {
    return this.eventHistory;
  }

  public getRecentEvents(count: number = 20): GeofenceBreachEvent[] {
    return this.eventHistory.slice(-count).reverse();
  }

  public acknowledgeEvent(eventId: string): void {
    const evt = this.eventHistory.find((e) => e.id === eventId);
    if (evt) evt.acknowledged = true;
  }

  public reset(): void {
    this.presences.clear();
    this.eventHistory = [];
  }
}
