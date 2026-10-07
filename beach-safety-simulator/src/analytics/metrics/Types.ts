export type SimulationEventType =
  | 'HAZARD_DETECTED'
  | 'RISK_CHANGED'
  | 'INCIDENT_CREATED'
  | 'INCIDENT_UPDATED'
  | 'DECISION_CREATED'
  | 'RESOURCE_DISPATCHED'
  | 'RESOURCE_ARRIVED'
  | 'RESCUE_STARTED'
  | 'RESCUE_COMPLETED'
  | 'WARNING_ISSUED'
  | 'EVACUATION_STARTED'
  | 'FAILURE_DETECTED'
  | 'FALLBACK_ACTIVATED'
  | 'INCIDENT_RESOLVED';

export interface SimulationEvent {
  id: string;
  simulationTime: number; // in seconds from 00:00 or sim clock
  timeDisplay: string; // e.g. "10:01:15"
  realTimestamp: number;
  type: SimulationEventType;
  zoneId?: string;
  entityId?: string; // visitorId, incidentId, resourceId, failureId
  title: string;
  description: string;
  severity?: 'LOW' | 'MEDIUM' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  metadata?: Record<string, unknown>;
}

export interface DetectionMetrics {
  totalActualIncidents: number;
  detectedIncidents: number;
  falsePositives: number;
  falseNegatives: number;
  detectionRate: number; // percentage (e.g. 95)
  falsePositiveRate: number;
  falseNegativeRate: number;
  averageDetectionLatency: number; // seconds
}

export interface AnalyticsResponseMetrics {
  averageDetectionLatency: number; // sec
  averageDecisionLatency: number; // sec
  averageDispatchLatency: number; // sec
  averageArrivalLatency: number; // sec
  averageRescueDuration: number; // sec
  averageTotalResponseTime: number; // sec
  totalIncidentsTracked: number;
  fastestResponseTime: number; // sec
  slowestResponseTime: number; // sec
}

export interface IncidentMetrics {
  total: number;
  critical: number;
  high: number;
  moderate: number;
  low: number;
  resolved: number;
  unresolved: number;
  escalated: number;
  falsePositives: number;
  falseNegatives: number;
  activeDistressedCount: number;
}

export interface ExposureMetrics {
  totalPeopleExposed: number;
  swimmersExposed: number;
  vulnerablePeopleExposed: number; // children, weak swimmers
  peopleWarned: number;
  peopleEvacuated: number;
  averageExposureDuration: number; // seconds
  peakExposure: number;
  currentExposure: number;
}

export interface ResourceUtilizationMetric {
  resourceId: string;
  name: string;
  type: string;
  status: string;
  totalOperationalTimeSeconds: number;
  totalBusyTimeSeconds: number;
  utilizationRate: number; // 0 - 100 %
  missionsCompleted: number;
  currentIncidentId?: string;
}

export interface ResourceMetrics {
  overallUtilizationRate: number; // 0 - 100 %
  fleetBreakdown: {
    lifeguardUtilization: number;
    droneUtilization: number;
    boatUtilization: number;
    ambulanceUtilization: number;
    policeUtilization: number;
  };
  totalFleetCount: number;
  availableCount: number;
  busyCount: number;
  failedCount: number;
  resources: ResourceUtilizationMetric[];
}

export interface HazardSample {
  simulationTime: number;
  timeDisplay: string;
  waveHeight: number;
  waterCurrent: number;
  ripProbability: number;
  visibility: number;
  windSpeed: number;
  activeHazardCount: number;
}

export interface HazardMetrics {
  currentWaveHeight: number;
  peakWaveHeight: number;
  currentCurrentSpeed: number;
  peakCurrentSpeed: number;
  currentRipProbability: number;
  peakRipProbability: number;
  totalHazardsDetected: number;
  history: HazardSample[];
}

export interface RiskSample {
  simulationTime: number;
  timeDisplay: string;
  overallScore: number;
  overallCategory: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  zoneScores: Record<string, number>;
}

export interface ZoneMetrics {
  zoneId: string;
  zoneName: string;
  currentRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  currentScore: number;
  peakRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  peakScore: number;
  averageScore: number;
  timeAtHighRiskSeconds: number;
  timeAtCriticalRiskSeconds: number;
  incidentsCount: number;
  peopleExposed: number;
  warningsIssued: number;
  evacuationsCount: number;
}

export interface RiskMetrics {
  overallScore: number;
  overallCategory: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  peakRiskScore: number;
  timeAtCriticalRiskSeconds: number;
  timeAtHighRiskSeconds: number;
  zones: ZoneMetrics[];
  history: RiskSample[];
}

export interface FailureMetrics {
  totalFailuresInjected: number;
  failuresDetected: number;
  fallbacksActivated: number;
  detectionRate: number;
  fallbackRate: number;
  overallResilienceIndex: number;
  activeDegradationLevel: string;
}

export interface SimulationMetrics {
  timestamp: string;
  simulationTime: number;
  detection: DetectionMetrics;
  response: AnalyticsResponseMetrics;
  incidents: IncidentMetrics;
  exposure: ExposureMetrics;
  resources: ResourceMetrics;
  hazards: HazardMetrics;
  risk: RiskMetrics;
  failures: FailureMetrics;
  bottleneck: {
    stage: 'DETECTION' | 'DECISION' | 'DISPATCH' | 'TRAVEL' | 'RESCUE';
    description: string;
    percentageOfTotalTime: number;
    delaySeconds: number;
  };
}
