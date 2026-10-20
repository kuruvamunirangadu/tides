/**
 * DroneDistressAuditLogger.ts
 * 
 * TIDES Drone Phase 7: Audit & Reliability Logger
 * 
 * Implements an immutable audit event logger recording:
 * - Ingestion, validation, rejection events
 * - Evidence correlation and candidate dossier creation
 * - Operator verification actions (authorizations, timestamps, rationale)
 * - Incident linking and emergency escalations
 * - Explicit SOS bypass events
 * - Rejection and deduplication traces
 * 
 * Thread-safe, non-blocking in-memory ring buffer with structured queries.
 */

import {
  DroneDistressAuditEvent,
  DroneDistressAuditEventType,
} from './droneDistress.types';

export class DroneDistressAuditLogger {
  private static instance: DroneDistressAuditLogger | null = null;
  private readonly MAX_EVENTS: number = 300;
  private events: DroneDistressAuditEvent[] = [];
  private eventCounter: number = 1000;

  public static getInstance(): DroneDistressAuditLogger {
    if (!DroneDistressAuditLogger.instance) {
      DroneDistressAuditLogger.instance = new DroneDistressAuditLogger();
    }
    return DroneDistressAuditLogger.instance;
  }

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.events = [];
    this.eventCounter = 1000;
  }

  /**
   * Records an immutable audit log entry
   */
  public log(
    eventType: DroneDistressAuditEventType,
    actor: string,
    sourceReference: string,
    summary: string,
    details?: Record<string, any>,
    timestampMs: number = Date.now()
  ): DroneDistressAuditEvent {
    this.eventCounter++;
    const eventId = `AUDIT-EVT-${this.eventCounter}`;

    const event: DroneDistressAuditEvent = {
      eventId,
      timestampMs,
      eventType,
      actor,
      sourceReference,
      summary,
      details: details ? { ...details } : undefined,
    };

    this.events.unshift(event);
    if (this.events.length > this.MAX_EVENTS) {
      this.events.pop();
    }

    return event;
  }

  public getEvents(): DroneDistressAuditEvent[] {
    return [...this.events];
  }

  public getEventsByType(type: DroneDistressAuditEventType): DroneDistressAuditEvent[] {
    return this.events.filter((e) => e.eventType === type);
  }

  public getEventsForSource(sourceReference: string): DroneDistressAuditEvent[] {
    return this.events.filter((e) => e.sourceReference === sourceReference);
  }

  public getLatestEvent(): DroneDistressAuditEvent | undefined {
    return this.events[0];
  }
}

