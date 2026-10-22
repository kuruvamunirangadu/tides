import { Zone } from './Zone';
import { LifeguardStation } from './LifeguardStation';
import { EmergencyPoint } from './EmergencyPoint';
import { Environment } from './Environment';
import { Visitor } from './Visitor';
import { Hazard } from './Hazard';
import { BeachRiskOverview } from './Risk';
import { Incident } from './Incident';
import { Decision } from '../decision/models/Decision';
import { ResponseAction } from '../decision/models/ResponseAction';
import { ResourceState } from '../decision/models/Resource';
import { DecisionLogEntry } from '../decision/history/DecisionHistory';
import { EmergencyIncident } from '../emergency/models/EmergencyIncident';
import { EmergencyResource } from '../emergency/models/EmergencyResource';
import { BoardDisplayState } from '../emergency/communication/WarningBoardManager';
import { PerformanceAnalytics, ResponseMetrics } from '../emergency/models/ResponseMetrics';
import { FailureEvent } from '../failures/types/FailureTypes';
import { SensorConflict } from '../failures/sensors/SensorReading';
import { FallbackStrategy } from '../failures/fallback/FallbackEngine';
import { ResilienceDimensions } from '../failures/metrics/ResilienceMetrics';
import { ScenarioReport } from '../failures/scenarios/ScenarioRunner';
import { SimulationMetrics } from '../analytics/metrics/Types';
import { Camera } from '../vision/models/Camera';
import { CVSafetyEvent } from '../vision/models/CVSafetyEvent';
import { VisionMetrics } from '../vision/evaluation/VisionMetrics';
import { PredictionState } from '../prediction/models/PredictionTypes';
import { BeachGIS } from '../gis/models/BeachGIS';
import { GeofenceBreachEvent } from '../gis/models/Geofence';
import { FusedEnvironmentState } from '../iot/models/FusedReading';
import { DataSourceMode } from '../iot/IoTManager';
import { VirtualDrone } from '../drones/simulation/VirtualDrone';
import { DroneCoverage } from '../drones/models/DroneCoverage';
import { UnifiedSafetyEvent } from '../drones/models/UnifiedSafetyEvent';
import { DronePerformanceMetrics } from '../drones/analytics/DroneAnalytics';
import { DroneMission } from '../drones/models/DroneMission';
import { MultiBeachCommandState } from '../command-center/CommandCenterManager';
import { CacheStats } from '../cache/CacheStats';
import { RenderSnapshot } from '../cache/RenderSnapshot';
import type { SwimmerBehaviorAssessment } from '../visitors/analysis/SwimmerBehaviorAnalysisService';

export type BeachPresetId = 'RUSHIKONDA_VIZAG' | 'SURYALANKA_BAPATLA';

export interface Beach {
  id: string;
  presetId?: BeachPresetId;
  name: string;
  locationName?: string;
  coordinates?: { lat: number; lng: number };
  bathymetryType?: 'EMBEDDED_TRENCH_REEF' | 'WIDE_FLAT_SHELF';
  trenchDepthMeters?: number;
  width: number;
  height: number;
  shorelineY: number;
  zones: Zone[];
  lifeguardStations: LifeguardStation[];
  emergencyPoints: EmergencyPoint[];
}

export interface SimulationState {
  time: number;
  timeDisplay: string;
  running: boolean;
  speed: number;
  beach: Beach;
  environment: Environment;
  visitors: Visitor[];
  hazards: Hazard[];
  incidents: Incident[];
  decisions: Decision[];
  actions: ResponseAction[];
  resourceState: ResourceState;
  decisionLogs: DecisionLogEntry[];
  riskOverview?: BeachRiskOverview;
  // Phase 6 Additions
  emergencyIncidents: EmergencyIncident[];
  emergencyResources: EmergencyResource[];
  boardStates: BoardDisplayState[];
  analytics: PerformanceAnalytics;
  recentMetrics: ResponseMetrics[];
  selectedVisitorId?: string;
  // Phase 7 Additions
  activeFailures: FailureEvent[];
  fallbackStrategy: FallbackStrategy;
  resilience: ResilienceDimensions;
  isNightMode: boolean;
  sensorConflict?: SensorConflict;
  gpsErrorMeters?: number;
  scenarioReport?: ScenarioReport;
  // Phase 8 Additions
  metrics?: SimulationMetrics;
  // Phase 9 Additions
  cameras?: Camera[];
  cctvSafetyEvents?: CVSafetyEvent[];
  visionMetrics?: VisionMetrics;
  // Phase 10 Additions
  predictionState?: PredictionState | null;
  // Phase 11 Additions
  activeBeachGIS?: BeachGIS;
  gisBreachEvents?: GeofenceBreachEvent[];
  // Phase 12 Additions
  fusedEnvironmentState?: FusedEnvironmentState | null;
  iotDataSourceMode?: DataSourceMode;
  // Phase 13 Additions
  drones?: VirtualDrone[];
  droneCoverages?: DroneCoverage[];
  droneMissions?: DroneMission[];
  unifiedSafetyEvents?: UnifiedSafetyEvent[];
  droneMetrics?: DronePerformanceMetrics;
  // Phase 14 Additions
  multiBeachCommandState?: MultiBeachCommandState;
  // Manual Risk Control & Experiment Lab
  riskHistory?: Array<{
    time: string;
    timestamp: number;
    riskScore: number;
    hazardScore: number;
    exposureScore: number;
    vulnerabilityScore: number;
    responseScore: number;
    primaryCause: string;
    activeSwimmers: number;
    distressedCount: number;
  }>;
  safetyInterventionsActive?: boolean;
  isManualEnvironmentActive?: boolean;
  cacheStats?: CacheStats;
  performanceMetrics?: {
    fps: number;
    simTps: number;
    tickDurationMs: number;
    riskCalcDurationMs: number;
    renderDurationMs: number;
    cacheHitRate: number;
    savedCalculations: number;
    savedComputeTimeMs: number;
    activeCacheEntries: number;
  };
  renderSnapshot?: RenderSnapshot;
  visitorStats: {
    total: number;
    beach: number;
    swimming: number;
    water: number;
    restricted: number;
    children: number;
    tourists: number;
    distressed: number;
    groups: number;
  };
  // TIDES Impact Lab Live Bridge
  impactLab?: ImpactLabSimulationState;
  swimmerAssessments?: SwimmerBehaviorAssessment[];
}

export interface ImpactLabSimulationState {
  forecastHorizons?: Array<{
    horizonSeconds: number;
    horizonLabel: string;
    predictedVelocity: number;
    predictedRiskCategory: string;
    uncertaintyMin: number;
    uncertaintyMax: number;
  }>;
  sensorHealthSummary?: {
    totalSensors: number;
    healthyCount: number;
    staleCount: number;
    offlineCount: number;
    degradedCount: number;
  };
  activeGoldenWindow?: {
    incidentId: string;
    timeToAssistanceSeconds: number | null;
    isWithinGoldenWindow: boolean;
    goldenWindowLimitSeconds: number;
    status: string;
  };
}

export type { Environment, CacheStats, RenderSnapshot };

