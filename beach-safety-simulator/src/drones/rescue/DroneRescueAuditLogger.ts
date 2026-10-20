/**
 * DroneRescueAuditLogger.ts
 * 
 * TIDES Drone Phase 9: Rescue Dispatch Audit Trail & Event Recorder
 * 
 * Maintains immutable, chronological audit records for all rescue drone allocations,
 * preflight eligibility checks, human authorizations, mission dispatch events,
 * patrol preemptions, and post-mission resource releases.
 */

import { RescueDispatchAuditEvent, RescueDispatchAuditEventType } from './droneRescue.types';

export class DroneRescueAuditLogger {
  private static instance: DroneRescueAuditLogger | null = null;
  private events: RescueDispatchAuditEvent[] = [];
  private eventCounter: number = 1000;
  private listeners: Set<() => void> = new Set();

  public static getInstance(): DroneRescueAuditLogger {
    if (!DroneRescueAuditLogger.instance) {
      DroneRescueAuditLogger.instance = new DroneRescueAuditLogger();
    }
    return DroneRescueAuditLogger.instance;
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('Error in DroneRescueAuditLogger listener:', err);
      }
    });
  }

  public recordEvent(
    assignmentId: string,
    incidentId: string,
    droneId: string,
    eventType: RescueDispatchAuditEventType,
    actor: string,
    details: Record<string, any> = {},
    clockMs: number = Date.now()
  ): RescueDispatchAuditEvent {
    this.eventCounter++;
    const event: RescueDispatchAuditEvent = {
      eventId: `EVT-RES-${this.eventCounter}`,
      assignmentId,
      incidentId,
      droneId,
      eventType,
      timestampMs: clockMs,
      actor,
      details,
      provenance: 'SIMULATED_SCENE_SPACE',
    };

    this.events.unshift(event);
    if (this.events.length > 200) {
      this.events.pop();
    }

    this.notify();
    return event;
  }

  public getEvents(assignmentId?: string, incidentId?: string): RescueDispatchAuditEvent[] {
    return this.events.filter((e) => {
      if (assignmentId && e.assignmentId !== assignmentId) return false;
      if (incidentId && e.incidentId !== incidentId) return false;
      return true;
    });
  }

  public getAllEvents(): RescueDispatchAuditEvent[] {
    return [...this.events];
  }

  public clear(): void {
    this.events = [];
    this.eventCounter = 1000;
    this.notify();
  }
}

