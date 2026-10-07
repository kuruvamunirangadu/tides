import { SimulationEvent, SimulationEventType } from './metrics/Types';

export interface IncidentEventChain {
  incidentId: string;
  distressStart?: SimulationEvent;
  detection?: SimulationEvent;
  riskEscalation?: SimulationEvent;
  decision?: SimulationEvent;
  dispatch?: SimulationEvent;
  arrival?: SimulationEvent;
  rescueStart?: SimulationEvent;
  rescueComplete?: SimulationEvent;
  resolution?: SimulationEvent;
  allEvents: SimulationEvent[];
  latencies: {
    detectionSec: number;
    decisionSec: number;
    dispatchSec: number;
    arrivalSec: number;
    rescueSec: number;
    totalResponseSec: number;
  };
}

export class EventStore {
  private events: SimulationEvent[] = [];
  private maxEvents: number = 2000;
  private incidentEventMap: Map<string, SimulationEvent[]> = new Map();

  public recordEvent(
    type: SimulationEventType,
    title: string,
    description: string,
    simulationTime: number,
    timeDisplay: string,
    severity: 'LOW' | 'MEDIUM' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'MEDIUM',
    zoneId?: string,
    entityId?: string,
    metadata?: Record<string, unknown>
  ): SimulationEvent {
    const id = `EVT-${Date.now().toString().slice(-5)}-${Math.random().toString(36).substr(2, 4)}`;
    const event: SimulationEvent = {
      id,
      simulationTime,
      timeDisplay,
      realTimestamp: Date.now(),
      type,
      zoneId,
      entityId,
      title,
      description,
      severity,
      metadata,
    };

    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    if (entityId) {
      const existing = this.incidentEventMap.get(entityId) || [];
      existing.push(event);
      this.incidentEventMap.set(entityId, existing);
    }

    return event;
  }

  public getAllEvents(): SimulationEvent[] {
    return [...this.events];
  }

  public getRecentEvents(limit: number = 50): SimulationEvent[] {
    return this.events.slice(-limit).reverse();
  }

  public getEventsByType(type: SimulationEventType): SimulationEvent[] {
    return this.events.filter((e) => e.type === type);
  }

  public getEventsByZone(zoneId: string): SimulationEvent[] {
    return this.events.filter((e) => e.zoneId === zoneId);
  }

  public getEventsByEntity(entityId: string): SimulationEvent[] {
    return this.incidentEventMap.get(entityId) || [];
  }

  public getIncidentChain(incidentId: string): IncidentEventChain {
    const events = this.getEventsByEntity(incidentId);

    const distressStart = events.find((e) => e.type === 'INCIDENT_CREATED');
    const detection = events.find((e) => e.type === 'HAZARD_DETECTED' || e.type === 'INCIDENT_CREATED');
    const riskEscalation = events.find((e) => e.type === 'RISK_CHANGED');
    const decision = events.find((e) => e.type === 'DECISION_CREATED');
    const dispatch = events.find((e) => e.type === 'RESOURCE_DISPATCHED');
    const arrival = events.find((e) => e.type === 'RESOURCE_ARRIVED');
    const rescueStart = events.find((e) => e.type === 'RESCUE_STARTED');
    const rescueComplete = events.find((e) => e.type === 'RESCUE_COMPLETED');
    const resolution = events.find((e) => e.type === 'INCIDENT_RESOLVED');

    const detectionTime = detection ? detection.simulationTime : 0;
    const decisionTime = decision ? decision.simulationTime : detectionTime;
    const dispatchTime = dispatch ? dispatch.simulationTime : decisionTime;
    const arrivalTime = arrival ? arrival.simulationTime : dispatchTime;
    const rescueStartTime = rescueStart ? rescueStart.simulationTime : arrivalTime;
    const rescueCompleteTime = rescueComplete ? rescueComplete.simulationTime : rescueStartTime;
    const resolutionTime = resolution ? resolution.simulationTime : rescueCompleteTime;

    const detectionSec = Math.max(0, detectionTime - (distressStart?.simulationTime || detectionTime));
    const decisionSec = Math.max(0, decisionTime - detectionTime);
    const dispatchSec = Math.max(0, dispatchTime - decisionTime);
    const arrivalSec = Math.max(0, arrivalTime - dispatchTime);
    const rescueSec = Math.max(0, rescueCompleteTime - rescueStartTime);
    const totalResponseSec = Math.max(0, resolutionTime - detectionTime);

    return {
      incidentId,
      distressStart,
      detection,
      riskEscalation,
      decision,
      dispatch,
      arrival,
      rescueStart,
      rescueComplete,
      resolution,
      allEvents: events,
      latencies: {
        detectionSec,
        decisionSec,
        dispatchSec,
        arrivalSec,
        rescueSec,
        totalResponseSec,
      },
    };
  }

  public getAllIncidentChains(): IncidentEventChain[] {
    const chains: IncidentEventChain[] = [];
    for (const incidentId of this.incidentEventMap.keys()) {
      chains.push(this.getIncidentChain(incidentId));
    }
    return chains;
  }

  public clear(): void {
    this.events = [];
    this.incidentEventMap.clear();
  }
}
