import { EventStore } from './EventStore';
import { HazardHistory } from './history/HazardHistory';
import { IncidentHistory } from './history/IncidentHistory';
import { ResourceHistory } from './history/ResourceHistory';
import { RiskHistory } from './history/RiskHistory';
import { MetricsAggregator } from './MetricsAggregator';
import { SimulationEvent, SimulationEventType, SimulationMetrics } from './metrics/Types';
import { SimulationState } from '../models/Beach';
import { ResilienceDimensions } from '../failures/metrics/ResilienceMetrics';

export class AnalyticsEngine {
  private eventStore: EventStore = new EventStore();
  private hazardHistory: HazardHistory = new HazardHistory();
  private riskHistory: RiskHistory = new RiskHistory();
  private resourceHistory: ResourceHistory = new ResourceHistory();
  private incidentHistory: IncidentHistory = new IncidentHistory();
  private aggregator: MetricsAggregator = new MetricsAggregator();

  private latestMetrics?: SimulationMetrics;
  private previousHazardCount: number = 0;
  private previousRiskCategory: string = 'LOW';
  private previousIncidentCount: number = 0;

  public getEventStore(): EventStore {
    return this.eventStore;
  }

  public getHazardHistory(): HazardHistory {
    return this.hazardHistory;
  }

  public getRiskHistory(): RiskHistory {
    return this.riskHistory;
  }

  public getResourceHistory(): ResourceHistory {
    return this.resourceHistory;
  }

  public getIncidentHistory(): IncidentHistory {
    return this.incidentHistory;
  }

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
    return this.eventStore.recordEvent(
      type,
      title,
      description,
      simulationTime,
      timeDisplay,
      severity,
      zoneId,
      entityId,
      metadata
    );
  }

  public tick(
    state: SimulationState,
    deltaTime: number,
    resilience?: ResilienceDimensions
  ): SimulationMetrics {
    const simTime = state.time;
    const timeDisplay = state.timeDisplay;

    // 1. History samplers
    this.hazardHistory.sample(simTime, timeDisplay, state.environment, state.hazards.length);
    this.riskHistory.sample(simTime, timeDisplay, deltaTime, state.riskOverview);
    this.resourceHistory.sample(state.emergencyResources, deltaTime);

    // 2. Detect automatic state change events to populate the EventStore
    this.detectStateChangeEvents(state, simTime, timeDisplay);

    // 3. Compute comprehensive metrics
    this.latestMetrics = this.aggregator.aggregate(
      state,
      this.hazardHistory,
      this.riskHistory,
      this.resourceHistory,
      this.incidentHistory,
      this.eventStore,
      resilience
    );

    return this.latestMetrics;
  }

  private detectStateChangeEvents(state: SimulationState, simTime: number, timeDisplay: string): void {
    // A. Hazard count change
    if (state.hazards.length > this.previousHazardCount) {
      const newHazard = state.hazards[state.hazards.length - 1];
      this.recordEvent(
        'HAZARD_DETECTED',
        `Hazard Detected: ${newHazard.type}`,
        newHazard.description,
        simTime,
        timeDisplay,
        newHazard.severity,
        newHazard.affectedZoneIds ? newHazard.affectedZoneIds[0] : undefined,
        newHazard.id
      );
    }
    this.previousHazardCount = state.hazards.length;

    // B. Risk category change
    const currentRiskCat = state.riskOverview?.overallCategory || 'LOW';
    if (currentRiskCat !== this.previousRiskCategory) {
      const sev = currentRiskCat === 'CRITICAL' ? 'CRITICAL' : currentRiskCat === 'HIGH' ? 'HIGH' : 'LOW';
      this.recordEvent(
        'RISK_CHANGED',
        `Beach Risk Level Shift: ${currentRiskCat}`,
        `Overall Beach Risk Score is now ${state.riskOverview?.overallBeachRiskScore}/100`,
        simTime,
        timeDisplay,
        sev,
        state.riskOverview?.highestRiskZoneId
      );
      this.previousRiskCategory = currentRiskCat;
    }

    // C. Emergency Incident events
    if (state.emergencyIncidents.length > this.previousIncidentCount) {
      const newInc = state.emergencyIncidents[state.emergencyIncidents.length - 1];
      this.recordEvent(
        'INCIDENT_CREATED',
        `Distress Incident: ${newInc.id}`,
        `Swimmer distress identified in ${newInc.zoneId}`,
        simTime,
        timeDisplay,
        newInc.severity,
        newInc.zoneId,
        newInc.id,
        { affectedVisitorIds: newInc.affectedVisitorIds }
      );
      this.riskHistory.recordZoneIncident(newInc.zoneId);
    }
    this.previousIncidentCount = state.emergencyIncidents.length;
  }

  public getMetrics(): SimulationMetrics | undefined {
    return this.latestMetrics;
  }

  public reset(): void {
    this.eventStore.clear();
    this.hazardHistory.reset();
    this.riskHistory.reset();
    this.resourceHistory.reset();
    this.incidentHistory.reset();
    this.aggregator.reset();
    this.previousHazardCount = 0;
    this.previousRiskCategory = 'LOW';
    this.previousIncidentCount = 0;
    this.latestMetrics = undefined;
  }
}
