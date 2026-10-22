import { SimulationState, Beach, Environment, BeachPresetId } from '../models/Beach';
import { COASTAL_BEACH_PRESETS } from '../data/beachPresets';
import { SimulationClock } from './SimulationClock';
import { EnvironmentEngine } from './EnvironmentEngine';
import { ZoneManager } from './ZoneManager';
import { VisitorEngine } from '../visitors/VisitorEngine';
import { VisitorGenerator } from '../visitors/VisitorGenerator';
import { HazardEngine } from './HazardEngine';
import { RiskEngine } from './RiskEngine';
import { DecisionEngine } from '../decision/DecisionEngine';
import { EmergencyResponseEngine } from '../emergency/EmergencyResponseEngine';
import { DEFAULT_BEACH } from '../data/beachConfig';
import { Visitor } from '../models/Visitor';
import { Hazard } from '../models/Hazard';
import { BeachRiskOverview } from '../models/Risk';
import { Incident } from '../models/Incident';
import { Decision } from '../decision/models/Decision';
import { ResponseAction } from '../decision/models/ResponseAction';
import { EmergencyIncident } from '../emergency/models/EmergencyIncident';
import { EmergencyResource } from '../emergency/models/EmergencyResource';
import { BoardDisplayState } from '../emergency/communication/WarningBoardManager';
import { PerformanceAnalytics, ResponseMetrics } from '../emergency/models/ResponseMetrics';
import { FailureEngine } from '../failures/FailureEngine';
import { ScenarioRunner, ScenarioReport } from '../failures/scenarios/ScenarioRunner';
import { FailureEvent, FailureType, FailureSeverity } from '../failures/types/FailureTypes';
import { FallbackStrategy } from '../failures/fallback/FallbackEngine';
import { ResilienceDimensions } from '../failures/metrics/ResilienceMetrics';
import { AnalyticsEngine } from '../analytics/AnalyticsEngine';
import { ReplayEngine } from '../analytics/replay/ReplayEngine';
import { ScenarioComparator } from '../analytics/scenarios/ScenarioComparator';
import { SimulationMetrics } from '../analytics/metrics/Types';
import { VisionEngine, VisionState } from '../vision/VisionEngine';
import { PredictionEngine } from '../prediction/PredictionEngine';
import { PredictionState } from '../prediction/models/PredictionTypes';
import { PredictiveRiskAdvisoryService } from '../prediction/service/PredictiveRiskAdvisoryService';
import { GISManager } from '../gis/GISManager';
import { GeofenceBreachEvent } from '../gis/models/Geofence';
import { IoTManager, DataSourceMode } from '../iot/IoTManager';
import { FusedEnvironmentState } from '../iot/models/FusedReading';
import { DroneManager, DroneManagerState } from '../drones/DroneManager';
import { CommandCenterManager, MultiBeachCommandState } from '../command-center/CommandCenterManager';
import { SimulationCache } from '../cache/SimulationCache';
import { CacheKeys } from '../cache/CacheKeys';
import { CacheStats } from '../cache/CacheStats';
import { RenderSnapshot, RenderVisitorSnapshot, RenderHazardSnapshot, RenderZoneSnapshot } from '../cache/RenderSnapshot';
import { RiskPropagationModel } from './RiskPropagationModel';
import { SwimmerBehaviorAnalysisService } from '../visitors/analysis/SwimmerBehaviorAnalysisService';

export class SimulationEngine {
  private clock: SimulationClock;
  private envEngine: EnvironmentEngine;
  private zoneManager: ZoneManager;
  private visitorEngine: VisitorEngine;
  private hazardEngine: HazardEngine;
  private riskEngine: RiskEngine;
  private riskPropagationModel: RiskPropagationModel;
  private swimmerBehaviorAnalysis: SwimmerBehaviorAnalysisService;
  private decisionEngine: DecisionEngine;
  private emergencyEngine: EmergencyResponseEngine;
  private failureEngine: FailureEngine;
  private scenarioRunner: ScenarioRunner;
  private analyticsEngine: AnalyticsEngine;
  private replayEngine: ReplayEngine;
  private scenarioComparator: ScenarioComparator;
  private visionEngine: VisionEngine;
  private predictionEngine: PredictionEngine;
  private gisManager: GISManager;
  private iotManager: IoTManager;
  private droneManager: DroneManager;
  private commandCenterManager: CommandCenterManager;

  private latestFusedState: FusedEnvironmentState | null = null;
  private latestDroneState?: DroneManagerState;

  private beach: Beach;
  private visitors: Visitor[] = [];
  private activeHazards: Hazard[] = [];
  private activeIncidents: Incident[] = [];
  private activeDecisions: Decision[] = [];
  private activeActions: ResponseAction[] = [];
  private emergencyIncidents: EmergencyIncident[] = [];
  private emergencyResources: EmergencyResource[] = [];
  private boardStates: BoardDisplayState[] = [];
  private analytics: PerformanceAnalytics;
  private recentMetrics: ResponseMetrics[] = [];
  private latestMetrics?: SimulationMetrics;
  private latestVisionState?: VisionState;
  private latestPredictionState?: PredictionState;
  private latestGISBreaches: GeofenceBreachEvent[] = [];

  // Phase 7 state
  private activeFailures: FailureEvent[] = [];
  private fallbackStrategy: FallbackStrategy = {
    activeLevel: 'FULL_CAPABILITY',
    primaryFailures: [],
    fallbackActions: [],
    explanation: 'All primary sensors and response assets operational nominal.',
  };
  private resilience: ResilienceDimensions = {
    failureDetectionRate: 100,
    fallbackActivationRate: 100,
    responseContinuityRate: 100,
    resourceRecoveryRate: 100,
    incidentResolutionRate: 100,
    overallResilienceIndex: 100,
  };
  private isNightMode: boolean = false;
  private scenarioReport?: ScenarioReport;

  // Temporary In-Memory Simulation Cache & Version Invalidation Layer
  private cache: SimulationCache = new SimulationCache(3500);
  private environmentVersion: number = 1;
  private visitorVersion: number = 1;
  private hazardVersion: number = 1;
  private riskVersion: number = 1;
  private resourceVersion: number = 1;
  private snapshotVersion: number = 1;

  // Performance Profiling Metrics
  private lastTickDurationMs: number = 0.45;
  private lastRiskCalcDurationMs: number = 0.2;
  private lastRenderDurationMs: number = 0.5;
  private currentFps: number = 60;
  private currentSimTps: number = 60;
  private frameCount: number = 0;
  private lastFpsSampleTime: number = performance.now();

  // Sub-engine update interval timers
  private safetyEngineAccumulator: number = 0;
  private visionAccumulator: number = 0;
  private predictionAccumulator: number = 0;
  private gisAccumulator: number = 0;
  private analyticsAccumulator: number = 0;

  private riskOverview?: BeachRiskOverview;
  private riskForecast?: import('../models/RiskForecast').RiskForecastState;
  private swimmerAssessments: import('../visitors/analysis/SwimmerBehaviorAnalysisService').SwimmerBehaviorAssessment[] = [];
  private riskHistory: Array<{
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
  }> = [];
  private selectedVisitorId?: string;
  private isRunning: boolean = false;
  private speed: number = 1;

  private listeners: Array<(state: SimulationState) => void> = [];

  constructor(initialBeach: Beach = DEFAULT_BEACH) {
    this.beach = JSON.parse(JSON.stringify(initialBeach));
    this.clock = new SimulationClock(8, 0);
    this.envEngine = new EnvironmentEngine();
    this.zoneManager = new ZoneManager(this.beach.zones);
    this.visitorEngine = new VisitorEngine();
    this.hazardEngine = new HazardEngine();
    this.riskEngine = new RiskEngine();
    this.riskPropagationModel = new RiskPropagationModel();
    this.swimmerBehaviorAnalysis = SwimmerBehaviorAnalysisService.getInstance();
    this.decisionEngine = new DecisionEngine();
    this.emergencyEngine = new EmergencyResponseEngine();
    this.failureEngine = new FailureEngine();
    this.scenarioRunner = new ScenarioRunner(this);
    this.analyticsEngine = new AnalyticsEngine();
    this.replayEngine = new ReplayEngine();
    this.scenarioComparator = new ScenarioComparator();
    this.visionEngine = new VisionEngine();
    this.predictionEngine = new PredictionEngine();
    this.gisManager = new GISManager();
    this.iotManager = new IoTManager();
    this.droneManager = new DroneManager();
    this.commandCenterManager = new CommandCenterManager();

    this.visitors = this.visitorEngine.getVisitorManager().getActiveVisitors();
    this.emergencyResources = this.emergencyEngine.getResourceManager().getAll();
    this.analytics = this.emergencyEngine.getAnalyticsCalculator().getAnalytics(this.emergencyResources);

    this.updateAllEngines(0.1);
  }

  public getVisitorEngine(): VisitorEngine {
    return this.visitorEngine;
  }

  public getDecisionEngine(): DecisionEngine {
    return this.decisionEngine;
  }

  public getEmergencyEngine(): EmergencyResponseEngine {
    return this.emergencyEngine;
  }

  public getFailureEngine(): FailureEngine {
    return this.failureEngine;
  }

  public getScenarioRunner(): ScenarioRunner {
    return this.scenarioRunner;
  }

  public getAnalyticsEngine(): AnalyticsEngine {
    return this.analyticsEngine;
  }

  public getReplayEngine(): ReplayEngine {
    return this.replayEngine;
  }

  public getScenarioComparator(): ScenarioComparator {
    return this.scenarioComparator;
  }

  public getVisionEngine(): VisionEngine {
    return this.visionEngine;
  }

  public getPredictionEngine(): PredictionEngine {
    return this.predictionEngine;
  }

  public getGISManager(): GISManager {
    return this.gisManager;
  }

  public getIoTManager(): IoTManager {
    return this.iotManager;
  }

  public getDroneManager(): DroneManager {
    return this.droneManager;
  }

  public dispatchDronePatrol(droneId: string, routeId: string): void {
    const timeDisplay = this.clock.getFormattedTime();
    const currentTime = this.clock.getTimeSeconds();
    this.droneManager.dispatchPatrol(droneId, routeId, currentTime, timeDisplay);
    this.notifyListeners(this.getState());
  }

  public dispatchDroneDistressVerification(visitorId: string, pos: { x: number; y: number }): void {
    const timeDisplay = this.clock.getFormattedTime();
    const currentTime = this.clock.getTimeSeconds();
    this.droneManager.dispatchDistressVerification(visitorId, pos, currentTime, timeDisplay);
    this.notifyListeners(this.getState());
  }

  public scenarioPhase13Flagship(): void {
    // 1. Trigger realistic rip current spike
    this.triggerCurrentSpike(1.5);
    this.triggerWaveSpike(2.2);

    // 2. Select or spawn a drifting swimmer in Zone A
    const targetVisitor = this.visitors.find((v) => v.state === 'SWIMMING') || this.visitors[0];
    if (targetVisitor) {
      targetVisitor.state = 'DRIFTING';
      targetVisitor.position = { x: 280, y: 310 }; // Drifting into deep water
      this.selectedVisitorId = targetVisitor.id;

      // 3. Dispatch UAV-01 Rapid Interceptor to verify distress
      const timeDisplay = this.clock.getFormattedTime();
      const currentTime = this.clock.getTimeSeconds();
      this.droneManager.dispatchDistressVerification(
        targetVisitor.id,
        { x: 280, y: 310 },
        currentTime,
        timeDisplay
      );
    }
    this.isRunning = true;
    this.notifyListeners(this.getState());
  }

  public getCommandCenterManager(): CommandCenterManager {
    return this.commandCenterManager;
  }

  public scenarioPhase14MultiBeachCrisis(): void {
    // 1. Trigger Flagship scenario on RK Beach (Drifting swimmer + Rapid UAV Interceptor)
    this.scenarioPhase13Flagship();

    // 2. Dispatch simulated crisis events across Bheemili and Rushikonda
    this.commandCenterManager.executeAction(
      'BROADCAST_PA_WARNING',
      'RK-BEACH-PA-01',
      'Urgent Zone A Rip Current Warning Broadcast'
    );
    this.commandCenterManager.executeAction(
      'CLOSE_ZONE',
      'BHEEMILI-ROCKY-SHOAL',
      'Rocky Break Zone closed due to high wave swells exceeding 2.5m',
      'BHEEMILI'
    );
    this.commandCenterManager.executeAction(
      'DISPATCH_LIFEGUARD',
      'BHEEMILI-INC-01',
      'Dispatched Lifeguard Squad 2 to Bheemili estuary rescue',
      'BHEEMILI'
    );

    this.notifyListeners(this.getState());
  }

  public setIoTDataSourceMode(mode: DataSourceMode): void {
    this.iotManager.setDataSourceMode(mode);
    this.notifyListeners(this.getState());
  }

  public toggleIoTSensorStatus(sensorId: string): void {
    this.iotManager.toggleSensorStatus(sensorId);
    this.notifyListeners(this.getState());
  }

  // --- MANUAL RISK & EXPERIMENT CONTROLS ---

  public setManualEnvironment(overrides: Partial<Environment>): void {
    this.envEngine.setManualEnvironment(overrides);
    this.updateAllEngines(0.1);
    this.notifyListeners(this.getState());
  }

  public resetManualEnvironment(): void {
    this.envEngine.resetManualOverrides();
    this.updateAllEngines(0.1);
    this.notifyListeners(this.getState());
  }

  public setVisitorPopulation(totalCount: number, swimmerRatio: number = 0.6, riskTakerRatio: number = 0.15): void {
    const vm = this.visitorEngine.getVisitorManager();
    const newVisitors: Visitor[] = [];
    const sz1 = this.beach.zones.find((z) => z.type === 'SWIMMING') || this.beach.zones[0];
    const bz1 = this.beach.zones.find((z) => z.type === 'BEACH_ZONE') || this.beach.zones[1];
    const rz = this.beach.zones.find((z) => z.type === 'RESTRICTED') || this.beach.zones[2];

    const swimmerCount = Math.round(totalCount * swimmerRatio);
    const riskTakerCount = Math.round(totalCount * riskTakerRatio);
    const regularBeachCount = Math.max(0, totalCount - swimmerCount - riskTakerCount);

    // 1. Swimmers
    for (let i = 0; i < swimmerCount; i++) {
      const x = sz1.x + 20 + Math.random() * (sz1.width - 40);
      const y = sz1.y + 20 + Math.random() * (sz1.height - 40);
      const profile = i % 4 === 0 ? 'CHILD' : i % 5 === 0 ? 'TOURIST' : 'SWIMMER';
      const v = VisitorGenerator.generateSingleVisitor(profile, x, y);
      v.state = 'SWIMMING';
      v.currentZone = sz1.id;
      newVisitors.push(v);
    }

    // 2. Risk-Takers / Intruders
    for (let i = 0; i < riskTakerCount; i++) {
      const targetZone = rz || sz1;
      const x = targetZone.x + 10 + Math.random() * (targetZone.width - 20);
      const y = targetZone.y + 10 + Math.random() * (targetZone.height - 20);
      const v = VisitorGenerator.generateSingleVisitor('RESTRICTED_ZONE_ENTRY', x, y);
      v.state = rz ? 'IN_RESTRICTED_ZONE' : 'SWIMMING';
      v.currentZone = targetZone.id;
      newVisitors.push(v);
    }

    // 3. Beach Bathers
    for (let i = 0; i < regularBeachCount; i++) {
      const x = bz1.x + 20 + Math.random() * (bz1.width - 40);
      const y = bz1.y + 10 + Math.random() * (bz1.height - 20);
      const v = VisitorGenerator.generateSingleVisitor('NON_SWIMMER', x, y);
      v.state = 'BEACH';
      v.currentZone = bz1.id;
      newVisitors.push(v);
    }

    vm.setVisitors(newVisitors);
    this.visitors = newVisitors;
    this.updateAllEngines(0.1);
    this.notifyListeners(this.getState());
  }

  public setSafetyInterventionsActive(active: boolean): void {
    this.decisionEngine.setInterventionsActive(active);
    this.notifyListeners(this.getState());
  }

  public isSafetyInterventionsActive(): boolean {
    return this.decisionEngine.isInterventionsActive();
  }

  public injectHazardScenario(type: 'HIGH_WAVES' | 'STRONG_CURRENT' | 'RIP_CURRENT' | 'RAPID_TIDE' | 'POOR_VISIBILITY' | 'STORM_SQUALL' | 'CROWD_SURGE' | 'RESTRICTED_BREACH' | 'COMPOUND_CRISIS'): void {
    switch (type) {
      case 'HIGH_WAVES':
        this.setManualEnvironment({
          waveHeight: 2.8,
          wavePeriod: 14.0,
          windSpeed: 28,
        });
        break;
      case 'STRONG_CURRENT':
        this.setManualEnvironment({
          waterCurrent: 1.5,
          currentSpeed: 1.5,
          currentDirection: 180,
          ripProbability: 0.85,
        });
        break;
      case 'RIP_CURRENT':
        this.setManualEnvironment({
          waterCurrent: 1.9,
          currentSpeed: 1.9,
          waveHeight: 2.2,
          ripProbability: 0.95,
        });
        // Select or create target swimmer in critical offshore distress
        let swimmer = this.visitors.find((v) => v.state === 'SWIMMING' || v.state === 'DRIFTING');
        if (!swimmer && this.visitors.length > 0) {
          swimmer = this.visitors[0];
        }
        if (swimmer) {
          swimmer.state = 'DISTRESS';
          swimmer.position = { x: 560, y: 310 };
          swimmer.distressLevel = 0.95;
          swimmer.fatigue = 0.9;
          swimmer.distressState = {
            level: 0.95,
            cause: 'STRONG_CURRENT',
            startedAt: this.clock.getTimeSeconds(),
            location: { x: 560, y: 310 },
            assistanceRequired: true,
          };
          this.selectedVisitorId = swimmer.id;
        }
        break;
      case 'RAPID_TIDE':
        this.setManualEnvironment({
          tideLevel: 0.45, // extreme low tide exposing channel
          waterCurrent: 1.3,
          ripProbability: 0.8,
        });
        break;
      case 'POOR_VISIBILITY':
        this.setManualEnvironment({
          weather: 'FOG',
          visibility: 0.8,
        });
        break;
      case 'STORM_SQUALL':
        this.setManualEnvironment({
          weather: 'STORM',
          windSpeed: 58,
          waveHeight: 2.6,
          visibility: 1.8,
          waterCurrent: 1.4,
        });
        break;
      case 'CROWD_SURGE':
        this.setVisitorPopulation(180, 0.7, 0.15);
        break;
      case 'RESTRICTED_BREACH':
        const rzZone = this.beach.zones.find((z) => z.type === 'RESTRICTED') || this.beach.zones[0];
        const intruder = VisitorGenerator.generateSingleVisitor('RESTRICTED_ZONE_ENTRY', rzZone.x + 30, rzZone.y + 40);
        intruder.state = 'IN_RESTRICTED_ZONE';
        intruder.currentZone = rzZone.id;
        this.visitorEngine.getVisitorManager().addVisitor(intruder);
        this.visitors = this.visitorEngine.getVisitorManager().getActiveVisitors();
        this.selectedVisitorId = intruder.id;
        break;
      case 'COMPOUND_CRISIS':
        this.setManualEnvironment({
          weather: 'STORM',
          windSpeed: 52,
          waveHeight: 2.7,
          waterCurrent: 1.7,
          visibility: 1.5,
          ripProbability: 0.92,
        });
        this.setVisitorPopulation(150, 0.65, 0.2);
        break;
    }
    this.isRunning = true;
    this.updateAllEngines(0.1);
    this.notifyListeners(this.getState());
  }

  public runRiskProgression(presetKey: 'CALM_TO_CRISIS' | 'STORM_SURGE' | 'MASS_RESCUE'): void {
    this.reset();
    this.isRunning = true;

    // Stage 1: Calm Baseline (T = 0s)
    this.setManualEnvironment({
      waveHeight: 0.7,
      waterCurrent: 0.2,
      windSpeed: 8,
      visibility: 12,
      weather: 'CLEAR',
    });
    this.setVisitorPopulation(45, 0.4, 0.05);

    // Stage 2: Current & Wind Acceleration (T = 3s)
    setTimeout(() => {
      this.setManualEnvironment({
        waveHeight: 1.2,
        waterCurrent: 0.65,
        windSpeed: 22,
        ripProbability: 0.55,
      });
      this.setVisitorPopulation(80, 0.55, 0.1);
    }, 3000);

    // Stage 3: Dangerous Rip Channel Outflow & High Exposure (T = 6s)
    setTimeout(() => {
      this.setManualEnvironment({
        waveHeight: 1.9,
        waterCurrent: 1.35,
        ripProbability: 0.88,
        windSpeed: 38,
      });
      this.setVisitorPopulation(130, 0.7, 0.15);
      const target = this.visitors.find((v) => v.state === 'SWIMMING');
      if (target) {
        target.state = 'DRIFTING';
        target.position = { x: 560, y: 305 };
      }
    }, 6000);

    // Stage 4: Critical Distress & Multi-Agency Rescue Kinematics (T = 9s)
    setTimeout(() => {
      this.setManualEnvironment({
        waveHeight: 2.5,
        waterCurrent: 1.8,
        ripProbability: 0.98,
      });
      const target = this.visitors.find((v) => v.state === 'DRIFTING') || this.visitors[0];
      if (target) {
        target.state = 'DISTRESS';
        target.distressState = {
          level: 0.95,
          cause: 'STRONG_CURRENT',
          startedAt: this.clock.getTimeSeconds(),
          location: { x: target.position.x, y: target.position.y },
          assistanceRequired: true,
        };
        this.selectedVisitorId = target.id;
        this.droneManager.dispatchDistressVerification(
          target.id,
          target.position,
          this.clock.getTimeSeconds(),
          this.clock.getFormattedTime()
        );
      }
    }, 9000);
  }

  public getRiskHistory(): Array<{
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
  }> {
    return [...this.riskHistory];
  }

  public updateCameraPTZ(cameraId: string, rotation: number, fov: number): void {
    const cam = this.visionEngine.getCameraManager().getCamera(cameraId);
    if (cam) {
      cam.rotation = rotation;
      cam.fieldOfView = fov;
      this.notifyListeners(this.getState());
    }
  }

  public toggleCameraPower(cameraId: string): void {
    const cam = this.visionEngine.getCameraManager().getCamera(cameraId);
    if (cam) {
      const nextStatus = cam.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
      this.visionEngine.getCameraManager().updateCameraStatus(cameraId, nextStatus);
      this.notifyListeners(this.getState());
    }
  }

  public selectVisitor(visitorId?: string): void {
    this.selectedVisitorId = visitorId;
    this.notifyListeners(this.getState());
  }

  public tick(realDeltaSeconds: number): SimulationState {
    const tickStart = performance.now();
    if (!this.isRunning) {
      return this.getState();
    }

    // 1. Calculate FPS / TPS performance metrics
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsSampleTime >= 1000) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsSampleTime));
      this.currentSimTps = this.currentFps;
      this.frameCount = 0;
      this.lastFpsSampleTime = now;
    }

    // 2. Advance simulation clock
    const simTimeSeconds = this.clock.tick(realDeltaSeconds, this.speed);

    // 3. Advance environmental physics
    const simDeltaSeconds = realDeltaSeconds * 60 * this.speed;
    const environment = this.envEngine.update(simTimeSeconds, simDeltaSeconds);

    // 4. Visitor Dynamics (Intent, Superimposed Drift, Fatigue, Distress, Incidents)
    const { visitors, activeIncidents } = this.visitorEngine.tick(
      realDeltaSeconds * this.speed,
      simTimeSeconds,
      this.beach.zones,
      environment
    );
    this.visitors = visitors;
    this.activeIncidents = activeIncidents;
    this.visitorVersion++;
    this.snapshotVersion++;

    // 5. Hazards, Risk, Decision, Emergency & Failure Simulation Loops (~15-20 Hz)
    this.safetyEngineAccumulator += realDeltaSeconds * this.speed;
    if (this.safetyEngineAccumulator >= 0.05 || !this.riskOverview) {
      this.safetyEngineAccumulator = 0;
      this.updateAllEngines(realDeltaSeconds * this.speed);
    }

    // 6. Record tick duration
    this.lastTickDurationMs = performance.now() - tickStart;

    // 7. Assemble state and notify listeners
    const state = this.getState();
    this.notifyListeners(state);
    return state;
  }

  private updateAllEngines(deltaTime: number): void {
    const rawEnv = this.envEngine.getEnvironment();
    const timeDisplay = this.clock.getFormattedTime();
    const currentTime = this.clock.getTimeSeconds();

    // Phase 12: IoT Multi-Sensor Ingestion & Fusion Cycle
    const { fusedState, environment: env } = this.iotManager.tick(
      rawEnv,
      currentTime,
      timeDisplay
    );
    this.latestFusedState = fusedState;
    this.swimmerAssessments = this.swimmerBehaviorAnalysis.evaluate(
      this.visitors,
      this.beach,
      env,
      currentTime
    );

    // Phase 7: Failure & Degradation Engine Tick
    const failureRes = this.failureEngine.tick(
      this.emergencyEngine.getResourceManager(),
      currentTime,
      deltaTime
    );
    this.activeFailures = failureRes.activeFailures;
    this.fallbackStrategy = failureRes.fallbackStrategy;
    this.resilience = failureRes.resilience;
    this.isNightMode = failureRes.isNightMode;

    // Synchronize Camera Status with activeFailures
    const cameraFailures = this.activeFailures.filter((f) => f.type === 'CAMERA_FAILURE');
    const camMgr = this.visionEngine.getCameraManager();
    for (const cam of camMgr.getAllCameras()) {
      const isFailed = cameraFailures.some((f) => {
        if (!f.targetId) return true;
        if (f.targetId === cam.id) return true;
        if (f.targetId === 'CCTV-01' && cam.id === 'CAM-01') return true;
        return false;
      });
      camMgr.updateCameraStatus(cam.id, isFailed ? 'OFFLINE' : 'ONLINE');
    }

    // Phase 2: Hazard Detection (Cached with version invalidation)
    const hazardCacheKey = CacheKeys.hazardDetection(this.environmentVersion, this.visitors.length);
    this.activeHazards = this.cache.getOrCompute(
      hazardCacheKey,
      this.environmentVersion + (this.visitors.length % 30),
      () => this.hazardEngine.detectHazards(env, this.beach, this.visitors, timeDisplay),
      120,
      'hazard'
    );
    this.hazardVersion++;

    // Phase 3: 4-Pillar Risk Assessment (Cached with version invalidation)
    const tRisk0 = performance.now();
    const riskCacheKey = CacheKeys.overallRisk(this.environmentVersion, this.hazardVersion, this.visitorVersion);
    this.riskOverview = this.cache.getOrCompute(
      riskCacheKey,
      this.environmentVersion + this.hazardVersion + Math.floor(this.visitorVersion / 10),
      () => this.riskEngine.evaluateBeachRisk(this.beach, env, this.visitors, this.activeHazards, timeDisplay),
      180,
      'risk'
    );
    this.riskForecast = this.riskPropagationModel.forecast(
      this.beach,
      env,
      this.riskOverview,
      currentTime
    );
    this.riskOverview = { ...this.riskOverview, forecast: this.riskForecast };
    this.lastRiskCalcDurationMs = performance.now() - tRisk0;
    this.riskVersion++;

    // Phase 5: Decision & Response Policy
    const { decisions, actions } = this.decisionEngine.evaluateAndExecute(
      this.riskOverview,
      this.activeIncidents,
      this.beach.zones,
      env,
      this.visitorEngine,
      currentTime,
      timeDisplay,
      deltaTime
    );
    this.activeDecisions = decisions;
    this.activeActions = actions;

    // Phase 6: Emergency Response Simulation (Multi-agency dispatch, kinematics, rescues, metrics)
    const { incidents, resources, boardStates, analytics, recentMetrics } = this.emergencyEngine.tick(
      this.activeIncidents,
      this.activeDecisions,
      this.riskOverview,
      this.visitorEngine,
      currentTime,
      deltaTime
    );
    this.emergencyIncidents = incidents;
    this.emergencyResources = resources;
    this.boardStates = boardStates;
    this.analytics = analytics;
    this.recentMetrics = recentMetrics;

    // Adapt Zone Flags
    this.beach.zones.forEach((zone) => {
      const za = this.riskOverview?.zoneAssessments[zone.id];
      if (za) {
        if (za.category === 'CRITICAL') {
          zone.status = 'CLOSED';
        } else if (za.category === 'HIGH' || za.category === 'MODERATE') {
          zone.status = zone.type === 'RESTRICTED' ? 'CLOSED' : 'CAUTION';
        } else {
          zone.status = zone.type === 'RESTRICTED' ? 'CLOSED' : 'OPEN';
        }
      }
    });

    // Phase 9: Computer Vision Perception Layer Tick (~6-7 Hz)
    this.visionAccumulator += deltaTime;
    if (this.visionAccumulator >= 0.15 || !this.latestVisionState) {
      this.visionAccumulator = 0;
      this.latestVisionState = this.visionEngine.tick(
        this.visitors,
        this.beach.zones,
        this.activeHazards,
        currentTime,
        timeDisplay,
        deltaTime,
        this.isNightMode
      );
    }

    // Phase 10 & Phase 7: AI / ML Predictive Safety Engine & Advisory Tick (~3 Hz)
    this.predictionAccumulator += deltaTime;
    if (this.predictionAccumulator >= 0.3 || !this.latestPredictionState) {
      this.predictionAccumulator = 0;
      this.latestPredictionState = this.predictionEngine.update(
        this.beach,
        env,
        currentTime
      );
      // Phase 7: Predictive Coastal Risk Intelligence Advisory Evaluation
      PredictiveRiskAdvisoryService.getInstance().evaluateCoastalRisk(
        this.beach,
        env,
        this.visitors,
        this.activeIncidents,
        currentTime
      );
    }

    // Phase 8: Simulation Analytics Engine & Replay Frame Stream (~2 Hz)
    this.analyticsAccumulator += deltaTime;
    if (this.analyticsAccumulator >= 0.5 || !this.latestMetrics) {
      this.analyticsAccumulator = 0;
      const rawState = this.getState();
      this.latestMetrics = this.analyticsEngine.tick(rawState, deltaTime, this.resilience);
      this.replayEngine.recordFrame(rawState);
    }

    // Phase 11: GIS & Geofencing Engine Tick (~3-4 Hz)
    this.gisAccumulator += deltaTime;
    if (this.gisAccumulator >= 0.25 || this.latestGISBreaches.length === 0) {
      this.gisAccumulator = 0;
      const rawState = this.getState();
      this.latestGISBreaches = this.gisManager.tick(rawState, currentTime, timeDisplay);
    }

    // Phase 13: Drone Aerial Perception, Tracking & Response Tick (Every frame for smooth flight kinematics)
    this.latestDroneState = this.droneManager.tick(
      this.visitors,
      this.latestVisionState?.safetyEvents || [],
      currentTime,
      timeDisplay,
      deltaTime
    );

    // Phase 14: Central Command Center State Synchronization (~3 Hz)
    if (this.predictionAccumulator === 0 || !this.latestPredictionState) {
      const rawState = this.getState();
      this.commandCenterManager.syncLiveSimulation(rawState);

      // Record snapshot in riskHistory for real-time progression graphing
      if (this.riskOverview) {
        const topZa = Object.values(this.riskOverview.zoneAssessments)[0];
        const swimmers = this.visitors.filter((v) => v.state === 'SWIMMING' || v.state === 'DRIFTING').length;
        const distressed = this.visitors.filter((v) => v.state === 'DISTRESS' || v.state === 'STRUGGLING').length;
        this.riskHistory.push({
          time: timeDisplay,
          timestamp: currentTime,
          riskScore: this.riskOverview.overallBeachRiskScore,
          hazardScore: topZa?.hazardScore || 0,
          exposureScore: topZa?.exposureScore || 0,
          vulnerabilityScore: topZa?.vulnerabilityScore || 0,
          responseScore: topZa?.responseScore || 0,
          primaryCause: topZa?.primaryHazard || 'NOMINAL',
          activeSwimmers: swimmers,
          distressedCount: distressed,
        });
        if (this.riskHistory.length > 120) {
          this.riskHistory.shift();
        }
      }
    }
  }

  public getState(): SimulationState {
    const total = this.visitors.length;
    const swimming = this.visitors.filter((v) => v.state === 'SWIMMING' || v.state === 'DRIFTING').length;
    const water = this.visitors.filter((v) => v.position.y >= 260).length;
    const beach = total - water;
    const restricted = this.visitors.filter((v) => v.state === 'IN_RESTRICTED_ZONE').length;
    const children = this.visitors.filter((v) => v.type === 'CHILD').length;
    const tourists = this.visitors.filter((v) => v.type === 'TOURIST').length;
    const distressed = this.visitors.filter((v) => v.state === 'DISTRESS' || v.state === 'STRUGGLING').length;
    const groups = this.visitorEngine.getCrowdEngine().getGroupManager().getAllGroups().length;

    return {
      time: this.clock.getTimeSeconds(),
      timeDisplay: this.clock.getFormattedTime(),
      running: this.isRunning,
      speed: this.speed,
      beach: this.beach,
      environment: this.envEngine.getEnvironment(),
      visitors: [...this.visitors],
      hazards: [...this.activeHazards],
      incidents: [...this.activeIncidents],
      decisions: [...this.activeDecisions],
      actions: [...this.activeActions],
      resourceState: this.decisionEngine.getResourceManager().getFleetState(),
      decisionLogs: this.decisionEngine.getHistory().getHistory(),
      emergencyIncidents: this.emergencyIncidents,
      emergencyResources: this.emergencyResources,
      boardStates: this.boardStates,
      analytics: this.analytics,
      recentMetrics: this.recentMetrics,
      riskOverview: this.riskOverview,
      selectedVisitorId: this.selectedVisitorId,
      activeFailures: this.activeFailures,
      fallbackStrategy: this.fallbackStrategy,
      resilience: this.resilience,
      isNightMode: this.isNightMode,
      sensorConflict: this.failureEngine.getSensorConflict(),
      gpsErrorMeters: this.failureEngine.getGPSErrorMeters(),
      scenarioReport: this.scenarioReport,
      metrics: this.latestMetrics,
      // Phase 9 Computer Vision
      cameras: this.latestVisionState?.cameras || this.visionEngine.getCameraManager().getAllCameras(),
      cctvSafetyEvents: this.latestVisionState?.safetyEvents || [],
      visionMetrics: this.latestVisionState?.metrics,
      // Phase 10 Prediction
      predictionState: this.latestPredictionState,
      // Phase 7 Swimmer Behavior Analysis
      swimmerAssessments: this.swimmerAssessments,
      // Phase 11 GIS
      activeBeachGIS: this.gisManager?.getActiveBeach(),
      gisBreachEvents: this.latestGISBreaches,
      // Phase 12 IoT Sensors
      fusedEnvironmentState: this.latestFusedState,
      iotDataSourceMode: this.iotManager.getDataSourceMode(),
      // Phase 13 Drones
      drones: this.latestDroneState?.drones || this.droneManager.getDrones(),
      droneCoverages: this.latestDroneState?.coverages || [],
      droneMissions: this.latestDroneState?.activeMissions || [],
      unifiedSafetyEvents: this.latestDroneState?.unifiedEvents || [],
      droneMetrics: this.latestDroneState?.metrics,
      // Phase 14 Central Command & Control
      multiBeachCommandState: this.commandCenterManager.getCommandState(),
      // Manual Risk Experiment Lab State
      riskHistory: this.getRiskHistory(),
      safetyInterventionsActive: this.decisionEngine.isInterventionsActive(),
      isManualEnvironmentActive: this.envEngine.isManualActive(),
      // Memory & Temporary Simulation Cache Layer
      cacheStats: this.cache.getStats(),
      performanceMetrics: {
        fps: this.currentFps,
        simTps: this.currentSimTps,
        tickDurationMs: Math.round(this.lastTickDurationMs * 100) / 100,
        riskCalcDurationMs: Math.round(this.lastRiskCalcDurationMs * 100) / 100,
        renderDurationMs: Math.round(this.lastRenderDurationMs * 100) / 100,
        cacheHitRate: this.cache.getStats().hitRate,
        savedCalculations: this.cache.getStats().savedCalculations,
        savedComputeTimeMs: this.cache.getStats().savedComputeTimeMs,
        activeCacheEntries: this.cache.getStats().entryCount,
      },
      renderSnapshot: this.getRenderSnapshot(),
      visitorStats: {
        total,
        beach,
        swimming,
        water,
        restricted,
        children,
        tourists,
        distressed,
        groups,
      },
    };
  }

  public getRenderSnapshot(): RenderSnapshot {
    const key = CacheKeys.renderSnapshot(this.snapshotVersion);
    return this.cache.getOrCompute(
      key,
      this.snapshotVersion,
      () => {
        const t0 = performance.now();
        const visitors: RenderVisitorSnapshot[] = this.visitors.map((v) => ({
          id: v.id,
          x: Math.round(v.position.x * 10) / 10,
          y: Math.round(v.position.y * 10) / 10,
          state: v.state,
          type: v.type,
          color:
            v.type === 'CHILD'
              ? '#c084fc'
              : v.type === 'TOURIST'
              ? '#fb923c'
              : v.type === 'EXPERIENCED_SWIMMER'
              ? '#34d399'
              : v.type === 'RESTRICTED_ZONE_ENTRY'
              ? '#f43f5e'
              : '#38bdf8',
          vulnerability: v.vulnerability,
          currentZone: v.currentZone,
        }));

        const hazards: RenderHazardSnapshot[] = this.activeHazards.map((h) => ({
          id: h.id,
          type: h.type,
          name: h.name,
          severity: h.severity,
          affectedZoneIds: h.affectedZoneIds,
          description: h.description,
          reason: h.reason,
          detectedAt: h.detectedAt,
          confidence: h.confidence,
          active: h.active,
        }));

        const zones: RenderZoneSnapshot[] = this.beach.zones.map((z) => {
          const za = this.riskOverview?.zoneAssessments[z.id];
          return {
            id: z.id,
            name: z.name,
            type: z.type,
            x: z.x,
            y: z.y,
            width: z.width,
            height: z.height,
            status: z.status,
            riskScore: za?.overallScore || 0,
            riskCategory: za?.category || 'LOW',
          };
        });

        const snapshot: RenderSnapshot = {
          simulationTime: this.clock.getTimeSeconds(),
          timeDisplay: this.clock.getFormattedTime(),
          snapshotVersion: this.snapshotVersion,
          beach: this.beach,
          environment: this.envEngine.getEnvironment(),
          visitors,
          hazards,
          zones,
          emergencyResources: this.emergencyResources,
          boardStates: this.boardStates,
          cameras: this.latestVisionState?.cameras || this.visionEngine.getCameraManager().getAllCameras(),
          drones: this.latestDroneState?.drones || this.droneManager.getDrones(),
          droneCoverages: this.latestDroneState?.coverages || [],
          isNightMode: this.isNightMode,
          selectedVisitorId: this.selectedVisitorId,
          metrics: {
            fps: this.currentFps,
            simTps: this.currentSimTps,
            tickDurationMs: Math.round(this.lastTickDurationMs * 100) / 100,
            riskCalcDurationMs: Math.round(this.lastRiskCalcDurationMs * 100) / 100,
            renderDurationMs: Math.round(this.lastRenderDurationMs * 100) / 100,
            cacheHitRate: this.cache.getStats().hitRate,
            totalVisitors: this.visitors.length,
            distressedCount: this.visitors.filter((v) => v.state === 'DISTRESS' || v.state === 'STRUGGLING').length,
          },
        };
        this.lastRenderDurationMs = performance.now() - t0;
        return snapshot;
      },
      50,
      'snapshot'
    );
  }

  public getCache(): SimulationCache {
    return this.cache;
  }

  public getCacheStats(): CacheStats {
    return this.cache.getStats();
  }

  public clearCache(): void {
    this.cache.clear();
    this.notifyListeners(this.getState());
  }

  public runPerformanceBenchmark(targetPopulation: number): {
    population: number;
    fps: number;
    avgTickMs: number;
    riskCalcMs: number;
    cacheHitRate: number;
    savedCalculations: number;
    savedComputeTimeMs: number;
    grade: 'A+' | 'A' | 'B' | 'C' | 'D';
  } {
    // 1. Set population
    this.setVisitorPopulation(targetPopulation, 0.6, 0.15);
    this.cache.resetStats();

    const iterations = 40;
    const startBench = performance.now();
    let totalTickTime = 0;

    for (let i = 0; i < iterations; i++) {
      const t0 = performance.now();
      this.tick(0.016);
      totalTickTime += performance.now() - t0;
    }

    const elapsedTotal = performance.now() - startBench;
    const avgTick = totalTickTime / iterations;
    const estimatedFps = Math.min(60, Math.round(1000 / Math.max(1, avgTick)));
    const stats = this.cache.getStats();

    let grade: 'A+' | 'A' | 'B' | 'C' | 'D' = 'A+';
    if (avgTick > 16.0) grade = 'D';
    else if (avgTick > 8.0) grade = 'C';
    else if (avgTick > 4.0) grade = 'B';
    else if (avgTick > 2.0) grade = 'A';

    return {
      population: targetPopulation,
      fps: estimatedFps,
      avgTickMs: Math.round(avgTick * 100) / 100,
      riskCalcMs: Math.round(this.lastRiskCalcDurationMs * 100) / 100,
      cacheHitRate: stats.hitRate,
      savedCalculations: stats.savedCalculations,
      savedComputeTimeMs: stats.savedComputeTimeMs,
      grade,
    };
  }

  public start(): void {
    this.isRunning = true;
    this.notifyListeners(this.getState());
  }

  public pause(): void {
    this.isRunning = false;
    this.notifyListeners(this.getState());
  }

  public reset(): void {
    this.isRunning = false;
    this.clock.reset();
    this.envEngine.reset();
    this.visitorEngine.initializeDefaultPopulation(75);
    this.visitors = this.visitorEngine.getVisitorManager().getActiveVisitors();
    this.beach = JSON.parse(JSON.stringify(DEFAULT_BEACH));
    this.decisionEngine.reset();
    this.emergencyEngine.reset();
    this.failureEngine.reset();
    this.riskPropagationModel.reset();
    this.swimmerBehaviorAnalysis.reset();
    this.analyticsEngine.reset();
    this.replayEngine.clear();
    this.latestMetrics = undefined;
    this.scenarioReport = undefined;
    this.selectedVisitorId = undefined;
    this.updateAllEngines(0.1);
    this.notifyListeners(this.getState());
  }

  public setSpeed(multiplier: number): void {
    this.speed = Math.max(1, Math.min(10, multiplier));
    this.notifyListeners(this.getState());
  }

  // ==========================================
  // PHASE 6 EMERGENCY RESCUE SCENARIOS
  // ==========================================

  // Scenario 1: Complete Swimmer Distress & Rescue Operation
  public scenarioPhase6SwimmerRescue(): void {
    this.reset();
    const env = this.envEngine.getEnvironment();
    env.waveHeight = 2.1;
    env.waterCurrent = 1.4;
    env.ripProbability = 0.88;

    const sz1 = this.beach.zones.find((z) => z.id === 'SZ-01') || this.beach.zones[0];
    const victim = VisitorGenerator.generateSingleVisitor('CHILD', sz1.x + 100, sz1.y + 110);
    victim.swimmingAbility = 0.25;
    victim.state = 'DISTRESS';
    victim.currentZone = sz1.id;
    victim.distressState = {
      level: 0.95,
      cause: 'STRONG_CURRENT',
      startedAt: this.clock.getTimeSeconds(),
      location: { x: sz1.x + 100, y: sz1.y + 110 },
      assistanceRequired: true,
    };

    const vm = this.visitorEngine.getVisitorManager();
    vm.addVisitor(victim);
    this.selectedVisitorId = victim.id;
    this.visitors = vm.getActiveVisitors();

    this.updateAllEngines(0.1);
    this.notifyListeners(this.getState());
  }

  // Scenario 2: Deep-Water Rescue Boat Deployment
  public scenarioPhase6DeepWaterBoatRescue(): void {
    this.reset();
    const env = this.envEngine.getEnvironment();
    env.waveHeight = 2.4;
    env.waterCurrent = 1.6;
    env.ripProbability = 0.95;

    // Victim swept far offshore into deep water (y = 480)
    const victim = VisitorGenerator.generateSingleVisitor('EXPERIENCED_SWIMMER', 450, 480);
    victim.state = 'DISTRESS';
    victim.currentZone = 'SZ-01';
    victim.distressState = {
      level: 0.98,
      cause: 'STRONG_CURRENT',
      startedAt: this.clock.getTimeSeconds(),
      location: { x: 450, y: 480 },
      assistanceRequired: true,
    };

    const vm = this.visitorEngine.getVisitorManager();
    vm.addVisitor(victim);
    this.selectedVisitorId = victim.id;
    this.visitors = vm.getActiveVisitors();

    this.updateAllEngines(0.1);
    this.notifyListeners(this.getState());
  }

  // Scenario 3: Multiple Simultaneous Emergencies (Zone A Swimmer + Zone B Missing Child + Zone C Restricted)
  public scenarioPhase6SimultaneousEmergencies(): void {
    this.reset();
    const env = this.envEngine.getEnvironment();
    env.waterCurrent = 1.3;
    env.waveHeight = 2.0;
    env.ripProbability = 0.8;

    const sz1 = this.beach.zones.find((z) => z.id === 'SZ-01') || this.beach.zones[0];
    const bz1 = this.beach.zones.find((z) => z.id === 'BZ-01') || this.beach.zones[1];
    const rz = this.beach.zones.find((z) => z.type === 'RESTRICTED') || this.beach.zones[2];

    // Incident 1: Swimmer Distress in Zone A
    const distressed = VisitorGenerator.generateSingleVisitor('CHILD', sz1.x + 80, sz1.y + 90);
    distressed.state = 'DISTRESS';
    distressed.currentZone = sz1.id;
    distressed.distressState = {
      level: 0.92,
      cause: 'STRONG_CURRENT',
      startedAt: this.clock.getTimeSeconds(),
      location: { x: sz1.x + 80, y: sz1.y + 90 },
      assistanceRequired: true,
    };

    // Incident 2: Restricted entry in Zone C
    const intruder = VisitorGenerator.generateSingleVisitor('RESTRICTED_ZONE_ENTRY', rz.x + 40, rz.y + 50);
    intruder.state = 'IN_RESTRICTED_ZONE';
    intruder.currentZone = rz.id;

    // Incident 3: Missing Child / Crowd Panic in Zone B
    const crowd: Visitor[] = [];
    for (let i = 0; i < 45; i++) {
      const cv = VisitorGenerator.generateSingleVisitor('TOURIST', bz1.x + 15 + Math.random() * (bz1.width - 30), bz1.y + 15 + Math.random() * (bz1.height - 30));
      cv.currentZone = bz1.id;
      cv.state = 'BEACH';
      crowd.push(cv);
    }

    const vm = this.visitorEngine.getVisitorManager();
    vm.addVisitors([distressed, intruder, ...crowd]);
    this.visitors = vm.getActiveVisitors();

    this.updateAllEngines(0.1);
    this.notifyListeners(this.getState());
  }

  // Scenario 4: Resource Conflict & Coast Guard Escalation
  public scenarioPhase6ResourceExhaustion(): void {
    this.reset();
    this.setManualEnvironment({
      waveHeight: 2.1,
      waterCurrent: 1.4,
      currentSpeed: 1.4,
    });

    // Set 2 of 3 Lifeguards to UNAVAILABLE
    const rm = this.emergencyEngine.getResourceManager();
    rm.setStatus('LG-01', 'UNAVAILABLE');
    rm.setStatus('LG-02', 'UNAVAILABLE');

    const sz1 = this.beach.zones.find((z) => z.id === 'SZ-01') || this.beach.zones[0];
    // Create 2 simultaneous distresses: Only 1 lifeguard left -> Second escalates!
    const victim1 = VisitorGenerator.generateSingleVisitor('CHILD', sz1.x + 40, sz1.y + 70);
    victim1.state = 'DISTRESS';
    victim1.currentZone = sz1.id;
    victim1.distressState = {
      level: 0.9,
      cause: 'STRONG_CURRENT',
      startedAt: this.clock.getTimeSeconds(),
      location: { x: sz1.x + 40, y: sz1.y + 70 },
      assistanceRequired: true,
    };

    const victim2 = VisitorGenerator.generateSingleVisitor('TOURIST', sz1.x + 160, sz1.y + 110);
    victim2.state = 'DISTRESS';
    victim2.currentZone = sz1.id;
    victim2.distressState = {
      level: 0.9,
      cause: 'STRONG_CURRENT',
      startedAt: this.clock.getTimeSeconds(),
      location: { x: sz1.x + 160, y: sz1.y + 110 },
      assistanceRequired: true,
    };

    const vm = this.visitorEngine.getVisitorManager();
    vm.addVisitors([victim1, victim2]);
    this.visitors = vm.getActiveVisitors();

    this.updateAllEngines(0.1);
    this.notifyListeners(this.getState());
  }

  // Phase 5 Backward-Compatible Methods
  public scenarioPhase5LowRisk = () => {
    this.reset();
    this.setManualEnvironment({
      waveHeight: 0.6,
      waterCurrent: 0.2,
      currentSpeed: 0.2,
    });
    this.visitorEngine.initializeDefaultPopulation(40);
    this.visitors = this.visitorEngine.getVisitorManager().getActiveVisitors();
    this.updateAllEngines(0.1);
    this.notifyListeners(this.getState());
  };
  public scenarioPhase5ModerateRisk = () => {
    this.reset();
    this.setManualEnvironment({
      waveHeight: 1.3,
      waterCurrent: 0.55,
      currentSpeed: 0.55,
    });
    this.visitorEngine.initializeDefaultPopulation(80);
    this.visitors = this.visitorEngine.getVisitorManager().getActiveVisitors();
    this.updateAllEngines(0.1);
    this.notifyListeners(this.getState());
  };
  public scenarioPhase5HighRisk = () => {
    this.reset();
    this.setManualEnvironment({
      waveHeight: 1.9,
      waterCurrent: 1.1,
      currentSpeed: 1.1,
    });
    this.visitorEngine.initializeDefaultPopulation(120);
    this.visitors = this.visitorEngine.getVisitorManager().getActiveVisitors();
    this.updateAllEngines(0.1);
    this.notifyListeners(this.getState());
  };
  public scenarioPhase5CriticalDistress = () => this.scenarioPhase6SwimmerRescue();
  public scenarioPhase5NoLifeguardEscalation = () => this.scenarioPhase6ResourceExhaustion();
  public scenarioPhase5MultiIncidentPrioritization = () => this.scenarioPhase6SimultaneousEmergencies();

  // Test Cases & Triggers
  public testCaseA = () => {
    this.reset();
    this.setManualEnvironment({
      waveHeight: 2.1,
      waterCurrent: 1.4,
      currentSpeed: 1.4,
    });
    this.visitorEngine.getVisitorManager().clear();
    this.visitors = [];
    this.updateAllEngines(0.1);
    this.notifyListeners(this.getState());
  };
  public testCaseB = () => {
    this.reset();
    this.setManualEnvironment({
      waveHeight: 2.1,
      waterCurrent: 1.4,
      currentSpeed: 1.4,
    });
    const sz1 = this.beach.zones.find((z) => z.id === 'SZ-01') || this.beach.zones[0];
    const vm = this.visitorEngine.getVisitorManager();
    vm.clear();
    const sws: Visitor[] = [];
    for (let i = 0; i < 80; i++) {
      const v = VisitorGenerator.generateSingleVisitor('SWIMMER', sz1.x + 20 + Math.random() * (sz1.width - 40), sz1.y + 20 + Math.random() * (sz1.height - 40));
      v.state = 'SWIMMING';
      v.currentZone = sz1.id;
      sws.push(v);
    }
    vm.addVisitors(sws);
    this.visitors = vm.getActiveVisitors();
    this.updateAllEngines(0.1);
    this.notifyListeners(this.getState());
  };
  public testCaseC = () => this.scenarioPhase6SwimmerRescue();

  public triggerWaveSpike = (heightM: number = 2.3) => {
    this.setManualEnvironment({ waveHeight: heightM });
  };
  public triggerCurrentSpike = (currentMps: number = 0.85) => {
    this.setManualEnvironment({
      waterCurrent: currentMps,
      currentSpeed: currentMps,
      ripProbability: currentMps > 0.8 ? 0.9 : 0.3,
    });
  };
  public triggerWeatherSquall = () => {
    this.setManualEnvironment({
      weather: 'STORM',
      windSpeed: 38.0,
      visibility: 2.0,
      waveHeight: 2.2,
    });
  };

  // ==========================================
  // PHASE 7 FAILURE & RESILIENCE SCENARIOS
  // ==========================================

  /**
   * Scenario 1: Flagship Compound Crisis
   * Simultaneous sensory failure, poor visibility, severe wave conditions, 120 crowd,
   * 2 critical distresses, and 2 lifeguards unavailable -> Demonstrates fallback & Coast Guard escalation.
   */
  public scenarioPhase7CompoundCrisis = (): void => {
    this.reset();
    this.setManualEnvironment({
      waveHeight: 2.4,
      waterCurrent: 1.5,
      currentSpeed: 1.5,
      ripProbability: 0.92,
      visibility: 2.5,
      weather: 'RAIN',
    });

    // Inject sensory & camera failures
    this.failureEngine.injectFailure(
      'SENSOR_FAILURE',
      'Wave Sensor Telemetry Lost',
      'Acoustic buoy telemetry bus offline; estimating wave height via hydrodynamic model',
      'HIGH',
      'WAVE_SENSOR'
    );
    this.failureEngine.injectFailure(
      'CAMERA_FAILURE',
      'CCTV Optical Vision Model Offline',
      'Vision tracking degraded due to rain and network lag',
      'MEDIUM',
      'CAM-01'
    );

    // Populate beach with 120 visitors
    this.visitorEngine.initializeDefaultPopulation(120);

    // Limit Lifeguard availability to 1 available responder
    const rm = this.emergencyEngine.getResourceManager();
    rm.setStatus('LG-01', 'UNAVAILABLE');
    rm.setStatus('LG-02', 'UNAVAILABLE');

    // Create 2 simultaneous critical swimmer distresses
    const sz1 = this.beach.zones.find((z) => z.id === 'SZ-01') || this.beach.zones[0];
    const victim1 = VisitorGenerator.generateSingleVisitor('CHILD', sz1.x + 50, sz1.y + 80);
    victim1.state = 'DISTRESS';
    victim1.currentZone = sz1.id;
    victim1.distressState = {
      level: 0.95,
      cause: 'STRONG_CURRENT',
      startedAt: this.clock.getTimeSeconds(),
      location: { x: sz1.x + 50, y: sz1.y + 80 },
      assistanceRequired: true,
    };

    const victim2 = VisitorGenerator.generateSingleVisitor('TOURIST', sz1.x + 160, sz1.y + 110);
    victim2.state = 'DISTRESS';
    victim2.currentZone = sz1.id;
    victim2.distressState = {
      level: 0.92,
      cause: 'STRONG_CURRENT',
      startedAt: this.clock.getTimeSeconds(),
      location: { x: sz1.x + 160, y: sz1.y + 110 },
      assistanceRequired: true,
    };

    const vm = this.visitorEngine.getVisitorManager();
    vm.addVisitors([victim1, victim2]);
    this.visitors = vm.getActiveVisitors();
    this.selectedVisitorId = victim1.id;

    this.updateAllEngines(0.1);
    this.notifyListeners(this.getState());
  };

  /**
   * Scenario 2: Sensor Conflict & Weighted Consensus Resolution
   */
  public scenarioPhase7SensorConflict = (): void => {
    this.reset();
    this.setManualEnvironment({
      waterCurrent: 1.2,
      currentSpeed: 1.2,
      waveHeight: 1.95,
    });

    this.failureEngine.injectFailure(
      'CONFLICTING_SENSORS',
      'Acoustic vs Optical Telemetry Conflict',
      'Buoy 01 (2.3m) vs Sensor 02 (0.8m) vs Optical Vision (2.1m)',
      'HIGH'
    );

    this.updateAllEngines(0.1);
    this.notifyListeners(this.getState());
  };

  /**
   * Scenario 3: GPS Drift & Spatial Uncertainty Search
   */
  public scenarioPhase7GPSDrift = (): void => {
    this.reset();
    this.setManualEnvironment({
      waveHeight: 2.0,
      waterCurrent: 1.3,
      currentSpeed: 1.3,
    });

    this.failureEngine.injectFailure(
      'GPS_ERROR',
      'GPS Drift & Spatial Uncertainty',
      'GPS coordinates drifting with ±35m circular error probable',
      'MEDIUM',
      undefined,
      undefined,
      { errorRadius: 35 }
    );

    const sz1 = this.beach.zones.find((z) => z.id === 'SZ-01') || this.beach.zones[0];
    const victim = VisitorGenerator.generateSingleVisitor('TOURIST', sz1.x + 110, sz1.y + 90);
    victim.state = 'DISTRESS';
    victim.currentZone = sz1.id;
    victim.distressState = {
      level: 0.9,
      cause: 'STRONG_CURRENT',
      startedAt: this.clock.getTimeSeconds(),
      location: { x: sz1.x + 110, y: sz1.y + 90 },
      assistanceRequired: true,
    };

    const vm = this.visitorEngine.getVisitorManager();
    vm.addVisitor(victim);
    this.visitors = vm.getActiveVisitors();
    this.selectedVisitorId = victim.id;

    this.updateAllEngines(0.1);
    this.notifyListeners(this.getState());
  };

  /**
   * Scenario 4: Communication Blackout & Autonomous Failsafe Mode
   */
  public scenarioPhase7CommBlackout = (): void => {
    this.reset();
    this.failureEngine.injectFailure(
      'NETWORK_FAILURE',
      'Central Cellular & Network Severance',
      'Complete loss of network connectivity; switching to standalone station failsafe mode',
      'CRITICAL',
      undefined,
      undefined,
      { condition: 'OFFLINE' }
    );

    this.updateAllEngines(0.1);
    this.notifyListeners(this.getState());
  };

  /**
   * Chaos Monkey: Random Multi-Fault Injection
   */
  public triggerChaosMonkey = (): void => {
    const candidates: Array<{ type: FailureType; name: string; desc: string; target?: string; params?: any }> = [
      { type: 'CAMERA_FAILURE', name: 'CCTV Camera Glitch', desc: 'Optical feed lost', target: 'CAM-01' },
      { type: 'GPS_ERROR', name: 'GPS Ionospheric Drift', desc: '±35m coordinate error', params: { errorRadius: 35 } },
      { type: 'SENSOR_FAILURE', name: 'Wave Sensor Failure', desc: 'Telemetry timeout', target: 'WAVE_SENSOR' },
      { type: 'DRONE_FAILURE', name: 'Drone Low Battery', desc: 'DRONE-01 returning to dock', target: 'DRONE-01' },
      { type: 'NETWORK_FAILURE', name: 'Cellular Degraded', desc: '1200ms latency', params: { condition: 'DEGRADED' } },
      { type: 'NIGHT_MODE', name: 'Night Operation Mode', desc: 'Zero ambient illumination' },
    ];

    // Pick 2-3 random faults
    const shuffled = [...candidates].sort(() => 0.5 - Math.random());
    const count = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const item = shuffled[i];
      this.failureEngine.injectFailure(item.type, item.name, item.desc, 'HIGH', item.target, undefined, item.params);
    }

    this.updateAllEngines(0.1);
    this.notifyListeners(this.getState());
  };

  /**
   * Automated Scenario Runner Suite Trigger
   */
  public runAutomatedScenario = (scenarioKey: 'COMPOUND' | 'CONFLICT' | 'GPS' | 'COMM'): ScenarioReport => {
    let report: ScenarioReport;
    switch (scenarioKey) {
      case 'COMPOUND':
        report = this.scenarioRunner.runCompoundCrisisScenario();
        break;
      case 'CONFLICT':
        report = this.scenarioRunner.runSensorConflictScenario();
        break;
      case 'GPS':
        report = this.scenarioRunner.runGPSDriftScenario();
        break;
      case 'COMM':
        report = this.scenarioRunner.runCommBlackoutScenario();
        break;
    }
    this.scenarioReport = report;
    this.notifyListeners(this.getState());
    return report;
  };

  public injectFailure = (
    type: FailureType,
    name: string,
    description: string,
    severity: FailureSeverity = 'HIGH',
    targetId?: string,
    duration?: number,
    params?: any
  ): FailureEvent => {
    const f = this.failureEngine.injectFailure(type, name, description, severity, targetId, duration, params);
    this.updateAllEngines(0.1);
    this.notifyListeners(this.getState());
    return f;
  };

  public removeFailure = (id: string): void => {
    this.failureEngine.removeFailure(id);
    this.updateAllEngines(0.1);
    this.notifyListeners(this.getState());
  };

  public clearAllFailures = (): void => {
    this.failureEngine.clearAll();
    this.updateAllEngines(0.1);
    this.notifyListeners(this.getState());
  };

  public setBeachPreset = (presetId: BeachPresetId): void => {
    const preset = COASTAL_BEACH_PRESETS[presetId];
    if (!preset) return;
    this.beach = { ...preset.layout };
    this.zoneManager = new ZoneManager(this.beach.zones);
    this.cache.clear();
    this.environmentVersion++;
    this.visitorVersion++;
    this.hazardVersion++;
    this.riskVersion++;
    this.updateAllEngines(0.1);
    this.notifyListeners(this.getState());
  };

  public subscribe(listener: (state: SimulationState) => void): () => void {
    this.listeners.push(listener);
    listener(this.getState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(state: SimulationState): void {
    for (const listener of this.listeners) {
      listener(state);
    }
  }
}
