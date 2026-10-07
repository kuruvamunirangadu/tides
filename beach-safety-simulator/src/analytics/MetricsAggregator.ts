import { EventStore } from './EventStore';
import { HazardHistory } from './history/HazardHistory';
import { IncidentHistory } from './history/IncidentHistory';
import { ResourceHistory } from './history/ResourceHistory';
import { RiskHistory } from './history/RiskHistory';
import {
  ExposureMetrics,
  FailureMetrics,
  HazardMetrics,
  RiskMetrics,
  SimulationMetrics,
} from './metrics/Types';
import { SimulationState } from '../models/Beach';
import { ResilienceDimensions } from '../failures/metrics/ResilienceMetrics';

export class MetricsAggregator {
  private peakExposure: number = 0;
  private totalPeopleWarned: number = 0;
  private totalPeopleEvacuated: number = 0;

  public recordWarningIssued(count: number = 1): void {
    this.totalPeopleWarned += count;
  }

  public recordEvacuation(count: number = 1): void {
    this.totalPeopleEvacuated += count;
  }

  public aggregate(
    state: SimulationState,
    hazardHistory: HazardHistory,
    riskHistory: RiskHistory,
    resourceHistory: ResourceHistory,
    incidentHistory: IncidentHistory,
    eventStore: EventStore,
    resilience?: ResilienceDimensions
  ): SimulationMetrics {
    const timeDisplay = state.timeDisplay;
    const simTime = state.time;

    // 1. Exposure Metrics
    const totalVisitors = state.visitors.length;
    const inWater = state.visitors.filter((v) => v.position.y >= 260);
    const swimmers = state.visitors.filter((v) => v.state === 'SWIMMING' || v.state === 'DRIFTING');
    const vulnerable = state.visitors.filter(
      (v) => (v.type === 'CHILD' || v.swimmingAbility < 0.4) && v.position.y >= 260
    );
    this.peakExposure = Math.max(this.peakExposure, inWater.length);

    const exposure: ExposureMetrics = {
      totalPeopleExposed: inWater.length,
      swimmersExposed: swimmers.length,
      vulnerablePeopleExposed: vulnerable.length,
      peopleWarned: Math.max(
        this.totalPeopleWarned,
        state.visitors.filter((v) => v.state === 'EXITING' || v.state === 'EXITED' || v.state === 'WARNING_RECEIVED').length
      ),
      peopleEvacuated: this.totalPeopleEvacuated,
      averageExposureDuration: 180, // estimated avg time in water
      peakExposure: this.peakExposure,
      currentExposure: inWater.length,
    };

    // 2. Incident & Detection Metrics
    const chains = eventStore.getAllIncidentChains();
    const activeDistressed = state.visitors.filter((v) => v.state === 'DISTRESS' || v.state === 'STRUGGLING').length;
    const criticalIncidents = state.emergencyIncidents.filter((i) => i.severity === 'CRITICAL').length;
    const highIncidents = state.emergencyIncidents.filter((i) => i.severity === 'HIGH').length;
    const modIncidents = state.emergencyIncidents.filter((i) => i.severity === 'MEDIUM' || i.severity === 'MODERATE').length;

    const detection = incidentHistory.computeDetectionMetrics(
      Math.max(state.emergencyIncidents.length, activeDistressed, 1),
      state.emergencyIncidents.length,
      chains
    );

    const response = incidentHistory.computeResponseMetrics(chains);

    const incidents = incidentHistory.computeIncidentMetrics(
      state.emergencyIncidents.length,
      criticalIncidents,
      highIncidents,
      modIncidents,
      activeDistressed
    );

    // 3. Resource Metrics
    const resources = resourceHistory.getResourceMetrics(state.emergencyResources);

    // 4. Hazard Metrics
    const peaks = hazardHistory.getPeaks();
    const ripProb = state.environment.ripProbability ?? 0;
    const hazards: HazardMetrics = {
      currentWaveHeight: state.environment.waveHeight,
      peakWaveHeight: Math.max(peaks.peakWave, state.environment.waveHeight),
      currentCurrentSpeed: state.environment.waterCurrent,
      peakCurrentSpeed: Math.max(peaks.peakCurrent, state.environment.waterCurrent),
      currentRipProbability: ripProb,
      peakRipProbability: Math.max(peaks.peakRip ?? 0, ripProb),
      totalHazardsDetected: state.hazards.length,
      history: hazardHistory.getSamples(),
    };

    // 5. Risk Metrics
    const riskPeaks = riskHistory.getPeakRisk();
    const risk: RiskMetrics = {
      overallScore: state.riskOverview?.overallBeachRiskScore || 0,
      overallCategory: state.riskOverview?.overallCategory || 'LOW',
      peakRiskScore: Math.max(riskPeaks.peakScore, state.riskOverview?.overallBeachRiskScore || 0),
      timeAtCriticalRiskSeconds: riskPeaks.timeAtCriticalSec,
      timeAtHighRiskSeconds: riskPeaks.timeAtHighSec,
      zones: riskHistory.getZoneMetrics(),
      history: riskHistory.getSamples(),
    };

    // 6. Failure Metrics
    const failures: FailureMetrics = {
      totalFailuresInjected: state.activeFailures?.length || 0,
      failuresDetected: state.activeFailures?.length || 0,
      fallbacksActivated: state.fallbackStrategy?.fallbackActions.length || 0,
      detectionRate: resilience?.failureDetectionRate || 100,
      fallbackRate: resilience?.fallbackActivationRate || 100,
      overallResilienceIndex: resilience?.overallResilienceIndex || 100,
      activeDegradationLevel: state.fallbackStrategy?.activeLevel || 'FULL_CAPABILITY',
    };

    // 7. Bottleneck Analysis
    const stages: Array<{ stage: 'DETECTION' | 'DECISION' | 'DISPATCH' | 'TRAVEL' | 'RESCUE'; delaySeconds: number; desc: string }> = [
      { stage: 'DETECTION', delaySeconds: response.averageDetectionLatency, desc: 'Sensory and vision scanning lag' },
      { stage: 'DECISION', delaySeconds: response.averageDecisionLatency, desc: 'Engine rule evaluation & prioritization' },
      { stage: 'DISPATCH', delaySeconds: response.averageDispatchLatency, desc: 'Command transmission & crew assignment' },
      { stage: 'TRAVEL', delaySeconds: response.averageArrivalLatency, desc: 'Physical transit distance through surf' },
      { stage: 'RESCUE', delaySeconds: response.averageRescueDuration, desc: 'In-water stabilization and extraction operation' },
    ];

    let maxStage = stages[0];
    for (const s of stages) {
      if (s.delaySeconds > maxStage.delaySeconds) {
        maxStage = s;
      }
    }

    const totalDelay = Math.max(1, response.averageTotalResponseTime);
    const pct = Math.min(100, Math.round((maxStage.delaySeconds / totalDelay) * 100));

    return {
      timestamp: timeDisplay,
      simulationTime: simTime,
      detection,
      response,
      incidents,
      exposure,
      resources,
      hazards,
      risk,
      failures,
      bottleneck: {
        stage: maxStage.stage,
        description: `Largest simulated response component: ${maxStage.stage} (${maxStage.delaySeconds}s - ${pct}% of total response cycle)`,
        percentageOfTotalTime: pct,
        delaySeconds: maxStage.delaySeconds,
      },
    };
  }

  public reset(): void {
    this.peakExposure = 0;
    this.totalPeopleWarned = 0;
    this.totalPeopleEvacuated = 0;
  }
}
