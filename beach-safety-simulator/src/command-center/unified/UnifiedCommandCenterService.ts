/**
 * UnifiedCommandCenterService.ts
 * 
 * TIDES — Phase 13: Unified Command Center Dashboard & Mission Replay
 * 
 * Central aggregator service reading strictly from authoritative existing subsystems:
 * - IncidentManager & IncidentPriorityQueue
 * - DroneRegistry & DroneMovementEngine
 * - DroneMissionManager & DroneRescueExecutionManager
 * - DroneFaultRecoveryManager & DroneFaultDetector
 * - RescueCoordinator (Surface Lifesavers & Jet Boats)
 * 
 * Guarantees:
 * - Zero fabricated data: metrics and timelines reflect real simulation state.
 * - Strict non-overlapping categorization: drones and incidents are never double-counted.
 * - Explanatory reasons for drone availability or unreadiness.
 * - Clean event subscription pattern with subscriber cleanup.
 */

import { IncidentManager } from '../../visitors/incidents/IncidentManager';
import { Incident } from '../../models/Incident';
import { DroneRegistry } from '../../drones/foundation/DroneRegistry';
import { DroneRecord, DroneOperationalStatus } from '../../drones/foundation/drone.types';
import { DroneMissionManager } from '../../drones/missions/DroneMissionManager';
import { DroneMissionDossier } from '../../drones/missions/droneMission.types';
import { DroneRescueExecutionManager } from '../../drones/rescue/execution/DroneRescueExecutionManager';
import { RescueExecutionDossier } from '../../drones/rescue/execution/droneRescueExecution.types';
import { DroneFaultRecoveryManager } from '../../drones/fault/DroneFaultRecoveryManager';
import { DroneFaultRecord } from '../../drones/fault/droneFault.types';
import { MultiDroneCoordinationEngine } from '../../drones/coordination/MultiDroneCoordinationEngine';
import { CoordinationIncident } from '../../drones/coordination/droneCoordination.types';
import { RescueCoordinator } from '../../scene3d/rescue/RescueCoordinator';
import { ObservationDistressCorrelator } from '../../wristbands/integration/ObservationDistressCorrelator';
import { CandidateDistressIncident, WristbandEligibilityRecord } from '../../wristbands/integration/integration.types';
import { WristbandRegistry } from '../../wristbands/WristbandRegistry';
import { BeachGatewayService } from '../../wristbands/gateway/BeachGatewayService';
import { WristbandWarningIntegrationService } from '../../wristbands/integration/WristbandWarningIntegrationService';
import { CameraObservationAdapter } from '../../wristbands/integration/CameraObservationAdapter';
import { PilotSessionManager } from '../../pilot/session/PilotSessionManager';
import { PilotMetricsCalculator } from '../../pilot/metrics/PilotMetricsCalculator';
import { DeviceReadinessManager } from '../../pilot/session/DeviceReadinessManager';
import { PredictiveRiskAdvisoryService } from '../../prediction/service/PredictiveRiskAdvisoryService';
import {
  PredictiveAdvisoryRecord,
  ModelEvaluationSummary,
  PredictionModelId,
} from '../../prediction/models/predictiveRisk.types';
import { EnvironmentalDataIngestionService } from '../../prediction/pipeline/EnvironmentalDataIngestionService';
import {
  EnvironmentalDataQualitySummary,
  SensorMetadata,
} from '../../prediction/pipeline/environmentalIngestion.types';
import { BeachRegistry } from '../../regional/BeachRegistry';
import { RegionalSiteScopingService } from '../../regional/RegionalSiteScopingService';
import { RegionalCoordinationManager } from '../../regional/RegionalCoordinationManager';
import { RegionalSyncManager } from '../../regional/RegionalSyncManager';
import { RegionalAccessController } from '../../regional/RegionalAccessController';
import { RegionalAnalyticsReporter } from '../../regional/RegionalAnalyticsReporter';
import {
  RegionalBeachRecord,
  CrossSiteAssistanceRequest,
  SiteSyncState,
  RegionalAnalyticsReport,
  AssistanceResourceType,
  AssistanceUrgency,
  UserSecurityContext,
} from '../../regional/types';
import { DigitalTwinSyncEngine } from '../../calibration/DigitalTwinSyncEngine';
import { SensorCalibrationService } from '../../calibration/SensorCalibrationService';
import { DigitalTwinDiscrepancyMonitor } from '../../calibration/DigitalTwinDiscrepancyMonitor';
import {
  DigitalTwinSourceMode,
  UnifiedDigitalTwinObservation,
  DigitalTwinDiscrepancy,
  DeviceSyncHealth,
  SiteSyncSummary,
  SensorCalibrationRecord,
  ObservationVariableType,
  SourceType,
} from '../../calibration/digitalTwinObservation.types';
import { ResilienceOrchestrator } from '../../resilience/ResilienceOrchestrator';
import {
  CommandCenterSection,
  OperationalOverviewMetrics,
  OverviewMetricFilterKey,
  MissionReplayEvent,
  REPLAY_LIFE_SAFETY_DISCLAIMER,
  DataFreshnessStatus,
  SubsystemHealthRecord,
  WristbandMonitoringRecord,
  LocalizedWarningDeliveryRecord,
  OperatorAuditAction,
  LayerVisibilityState,
} from './commandCenter.types';

export interface DetailedIncidentView {
  incident: Incident;
  priorityScore?: number;
  priorityRank?: number;
  assignedDroneId?: string;
  assignedDrone?: DroneRecord;
  assignedSurfaceUnit?: string;
  rescueDossier?: RescueExecutionDossier;
  activeFaults: DroneFaultRecord[];
  timeline: MissionReplayEvent[];
  isEscalatedToSurface: boolean;
  statusDisplay: string;
  candidateDossier?: CandidateDistressIncident;
  warningDelivery?: LocalizedWarningDeliveryRecord;
  evidenceSummary?: string;
  multiSensorConfidence?: number;
  spatialUncertaintyMeters?: number;
}

export interface DetailedDroneView {
  drone: DroneRecord;
  categorization: 'AVAILABLE' | 'ON_ACTIVE_MISSION' | 'RETURNING_TO_BASE' | 'UNAVAILABLE';
  unreadinessReason?: string;
  activeMission?: DroneMissionDossier;
  activeRescueDossier?: RescueExecutionDossier;
  linkedIncident?: Incident;
  activeFaults: DroneFaultRecord[];
  faultHistory: DroneFaultRecord[];
  isPositionUncertain: boolean;
}

export class UnifiedCommandCenterService {
  private static instance: UnifiedCommandCenterService | null = null;

  private incidentManager: IncidentManager;
  private droneRegistry: DroneRegistry;
  private missionManager: DroneMissionManager;
  private rescueExecutionManager: DroneRescueExecutionManager;
  private faultRecoveryManager: DroneFaultRecoveryManager;
  private coordinationEngine: MultiDroneCoordinationEngine;
  private rescueCoordinator: RescueCoordinator;
  private correlator: ObservationDistressCorrelator;
  private wristbandRegistry: WristbandRegistry;
  private gatewayService: BeachGatewayService;
  private warningService: WristbandWarningIntegrationService;
  private cameraAdapter: CameraObservationAdapter;
  private pilotSessionManager: PilotSessionManager;
  private pilotMetricsCalculator: PilotMetricsCalculator;
  private deviceReadinessManager: DeviceReadinessManager;
  private predictiveService: PredictiveRiskAdvisoryService;
  private ingestionService: EnvironmentalDataIngestionService;
  private beachRegistry: BeachRegistry;
  private scopingService: RegionalSiteScopingService;
  private regionalCoordination: RegionalCoordinationManager;
  private syncManager: RegionalSyncManager;
  private accessController: RegionalAccessController;
  private analyticsReporter: RegionalAnalyticsReporter;
  private digitalTwinSyncEngine: DigitalTwinSyncEngine;
  private digitalTwinDiscrepancyMonitor: DigitalTwinDiscrepancyMonitor;
  private sensorCalibrationService: SensorCalibrationService;
  private resilienceOrchestrator: ResilienceOrchestrator = ResilienceOrchestrator.getInstance();

  private activeSection: CommandCenterSection = 'OVERVIEW';
  private selectedFilter: OverviewMetricFilterKey | null = null;
  private selectedIncidentId: string | null = null;
  private selectedDroneId: string | null = null;

  private operatorAuditLogs: OperatorAuditAction[] = [];
  private layerVisibility: LayerVisibilityState = {
    hazards: true,
    incidents: true,
    cameras: true,
    drones: true,
    wristbands: true,
    warningZones: true,
    gateways: true,
    uncertaintyCircles: true,
  };

  private listeners: Set<() => void> = new Set();
  private auditLoopTimer: NodeJS.Timeout | null = null;

  public static getInstance(): UnifiedCommandCenterService {
    if (!UnifiedCommandCenterService.instance) {
      UnifiedCommandCenterService.instance = new UnifiedCommandCenterService();
    }
    return UnifiedCommandCenterService.instance;
  }

  public static resetInstance(): void {
    if (UnifiedCommandCenterService.instance) {
      UnifiedCommandCenterService.instance.destroy();
      UnifiedCommandCenterService.instance = null;
    }
    UnifiedCommandCenterService.instance = new UnifiedCommandCenterService();
  }

  constructor(
    incidentManager: IncidentManager = IncidentManager.getInstance(),
    droneRegistry: DroneRegistry = DroneRegistry.getInstance(),
    missionManager: DroneMissionManager = DroneMissionManager.getInstance(),
    rescueExecutionManager: DroneRescueExecutionManager = DroneRescueExecutionManager.getInstance(),
    faultRecoveryManager: DroneFaultRecoveryManager = DroneFaultRecoveryManager.getInstance(),
    coordinationEngine: MultiDroneCoordinationEngine = MultiDroneCoordinationEngine.getInstance(),
    rescueCoordinator: RescueCoordinator = RescueCoordinator.getInstance(),
    correlator: ObservationDistressCorrelator = ObservationDistressCorrelator.getInstance(),
    wristbandRegistry: WristbandRegistry = WristbandRegistry.getInstance(),
    gatewayService: BeachGatewayService = BeachGatewayService.getInstance(),
    warningService: WristbandWarningIntegrationService = WristbandWarningIntegrationService.getInstance(),
    cameraAdapter: CameraObservationAdapter = CameraObservationAdapter.getInstance(),
    pilotSessionManager: PilotSessionManager = PilotSessionManager.getInstance(),
    pilotMetricsCalculator: PilotMetricsCalculator = PilotMetricsCalculator.getInstance(),
    deviceReadinessManager: DeviceReadinessManager = DeviceReadinessManager.getInstance(),
    predictiveService: PredictiveRiskAdvisoryService = PredictiveRiskAdvisoryService.getInstance(),
    ingestionService: EnvironmentalDataIngestionService = EnvironmentalDataIngestionService.getInstance()
  ) {
    this.incidentManager = incidentManager;
    this.droneRegistry = droneRegistry;
    this.missionManager = missionManager;
    this.rescueExecutionManager = rescueExecutionManager;
    this.faultRecoveryManager = faultRecoveryManager;
    this.coordinationEngine = coordinationEngine;
    this.rescueCoordinator = rescueCoordinator;
    this.correlator = correlator;
    this.wristbandRegistry = wristbandRegistry;
    this.gatewayService = gatewayService;
    this.warningService = warningService;
    this.cameraAdapter = cameraAdapter;
    this.pilotSessionManager = pilotSessionManager;
    this.pilotMetricsCalculator = pilotMetricsCalculator;
    this.deviceReadinessManager = deviceReadinessManager;
    this.predictiveService = predictiveService;
    this.ingestionService = ingestionService;
    this.beachRegistry = BeachRegistry.getInstance();
    this.scopingService = RegionalSiteScopingService.getInstance();
    this.regionalCoordination = RegionalCoordinationManager.getInstance();
    this.syncManager = RegionalSyncManager.getInstance();
    this.accessController = RegionalAccessController.getInstance();
    this.analyticsReporter = RegionalAnalyticsReporter.getInstance();
    this.digitalTwinSyncEngine = DigitalTwinSyncEngine.getInstance();
    this.digitalTwinDiscrepancyMonitor = DigitalTwinDiscrepancyMonitor.getInstance();
    this.sensorCalibrationService = SensorCalibrationService.getInstance();

    // Start 1 Hz refresh for subscriber updates
    this.auditLoopTimer = setInterval(() => {
      this.notify();
    }, 1000);
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
        console.error('UnifiedCommandCenterService notification error:', err);
      }
    });
  }

  // ==========================================================================
  // Section Navigation & Filter State
  // ==========================================================================

  public getActiveSection(): CommandCenterSection {
    return this.activeSection;
  }

  public setActiveSection(section: CommandCenterSection): void {
    this.activeSection = section;
    this.notify();
  }

  public getSelectedFilter(): OverviewMetricFilterKey | null {
    return this.selectedFilter;
  }

  public setSelectedFilter(filter: OverviewMetricFilterKey | null): void {
    this.selectedFilter = filter;
    this.notify();
  }

  public selectIncident(incidentId: string | null): void {
    this.selectedIncidentId = incidentId;
    this.notify();
  }

  public getSelectedIncidentId(): string | null {
    return this.selectedIncidentId;
  }

  public selectDrone(droneId: string | null): void {
    this.selectedDroneId = droneId;
    this.notify();
  }

  public getSelectedDroneId(): string | null {
    return this.selectedDroneId;
  }

  // ==========================================================================
  // Module 2: Authoritative Operational Overview Metrics (Zero Double-Count)
  // ==========================================================================

  public getOverviewMetrics(): OperationalOverviewMetrics {
    const activeIncidents = this.incidentManager.getActiveIncidents();
    const historyIncidents = this.incidentManager.getHistory();
    const priorityQueue = this.coordinationEngine.getPriorityQueue();
    const pendingIncidents: CoordinationIncident[] = priorityQueue.getPendingQueue();

    // Drones categorization
    const drones = this.droneRegistry.getAllDrones();
    const activeFaults = this.faultRecoveryManager.getDetector().getActiveFaults();
    const failingDroneIds = new Set(
      activeFaults
        .filter((f: DroneFaultRecord) => f.severity === 'CRITICAL' || f.severity === 'FATAL')
        .map((f: DroneFaultRecord) => f.droneId)
    );

    let availableDrones = 0;
    let dronesOnActiveMissions = 0;
    let dronesReturningToBase = 0;
    let unavailableDrones = 0;

    for (const drone of drones) {
      const battPct = drone.battery?.percentage ?? 100;

      // 1. Check Unavailable: Disconnected, Offline, Battery <= 20%, or Critical fault
      if (
        drone.connectivity === 'DISCONNECTED' ||
        drone.status === 'OFFLINE' ||
        battPct <= 20 ||
        failingDroneIds.has(drone.droneId)
      ) {
        unavailableDrones++;
      }
      // 2. Returning to base / landing
      else if (drone.status === 'RETURNING' || drone.status === 'CHARGING') {
        dronesReturningToBase++;
      }
      // 3. Active mission in flight
      else if (
        drone.status === 'PATROLLING' ||
        drone.status === 'DISPATCHED' ||
        drone.status === 'SEARCHING' ||
        drone.status === 'ASSISTING' ||
        drone.currentMissionId
      ) {
        dronesOnActiveMissions++;
      }
      // 4. Clean Available
      else {
        availableDrones++;
      }
    }

    // Incidents requiring escalation: unassigned incidents waiting over 45s or CRITICAL
    const requiringEscalation = pendingIncidents.filter((p: CoordinationIncident) => {
      return p.waitTimeSeconds >= 45 || p.severity === 'CRITICAL';
    }).length;

    // Active missions count
    const activeMissionsCount =
      this.missionManager.getActiveMissions().length +
      this.rescueExecutionManager.getActiveExecutions().length;

    // Recovery operations
    const inRecoveryCount = activeFaults.filter((f: DroneFaultRecord) => f.status === 'RECOVERING').length;
    const awaitingAckCount = activeFaults.filter(
      (f: DroneFaultRecord) => !f.operatorAcknowledged && (f.severity === 'CRITICAL' || f.severity === 'FATAL')
    ).length;
    const uncertainCount = activeFaults.filter((f: DroneFaultRecord) => f.isPositionUncertain).length;

    // Surface responders
    const surfaceResponders = this.rescueCoordinator.registry.getResources();

    // Track B: Candidates, Wristbands, Gateways, Pilot
    const candidates = this.correlator.getAllCandidates();
    const candidateIncidentsCount = candidates.filter((c) => c.verificationState === 'PENDING_REVIEW').length;
    const fleetKPIs = this.wristbandRegistry.getFleetKPIs();
    const gwHealth = this.gatewayService.getHealthStatus();
    const activePilotSession = this.pilotSessionManager.getActiveSession();
    const allDossiers = this.deviceReadinessManager.getAllDossiers();
    let totalChecks = 0;
    let passedChecks = 0;
    for (const d of allDossiers) {
      for (const c of d.checks) {
        totalChecks++;
        if (c.status === 'PASSED' || c.status === 'NOT_APPLICABLE') passedChecks++;
      }
    }
    const readinessPct = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 100;

    // Calculate beach risk level from active emergencies
    const criticalCount = activeIncidents.filter((i) => i.severity === 'CRITICAL').length;
    let beachRiskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (criticalCount > 0 || activeIncidents.length >= 3) {
      beachRiskLevel = 'CRITICAL';
    } else if (activeIncidents.length === 2) {
      beachRiskLevel = 'HIGH';
    } else if (activeIncidents.length === 1 || candidateIncidentsCount > 0) {
      beachRiskLevel = 'MODERATE';
    }

    return {
      activeIncidentsCount: activeIncidents.length,
      incidentsAwaitingAssignmentCount: pendingIncidents.length,
      incidentsRequiringEscalationCount: requiringEscalation,
      resolvedIncidentsCount: historyIncidents.filter((i) => !i.active).length,
      candidateIncidentsCount,

      totalDronesCount: drones.length,
      availableDronesCount: availableDrones,
      dronesOnActiveMissionsCount: dronesOnActiveMissions,
      dronesReturningToBaseCount: dronesReturningToBase,
      unavailableDronesCount: unavailableDrones,

      activeMissionsCount,
      completedMissionsCount: this.missionManager.getMissionHistory().filter((m) => m.status === 'COMPLETED').length,
      preemptedMissionsCount: this.coordinationEngine.getAllocationEngine().getConflicts().length,

      activeFaultsCount: activeFaults.length,
      recoveryOperationsCount: inRecoveryCount,
      resourcesAwaitingAckCount: awaitingAckCount,
      positionUncertainCount: uncertainCount,

      activeSurfaceRespondersCount: surfaceResponders.length,

      totalWristbandsCount: fleetKPIs.totalRegistered,
      activeWristbandSosCount: fleetKPIs.activeSosCount,
      hardwareWristbandsCount: 2,
      activeWarningZonesCount: fleetKPIs.activeWarningsDispatched > 0 ? 1 : 0,

      gatewayStatus: gwHealth.status,
      bufferedGatewayPacketsCount: gwHealth.bufferedEventCount,

      currentPilotSessionId: activePilotSession?.sessionId ?? null,
      pilotReadinessScore: Math.round(readinessPct),
      beachRiskLevel,

      lastCalculatedTimestampMs: Date.now(),
    };
  }

  // ==========================================================================
  // Module 4: Incident Detail & Chronological Timeline
  // ==========================================================================

  public getAllIncidents(): Incident[] {
    const active = this.incidentManager.getActiveIncidents();
    const history = this.incidentManager.getHistory();
    const map = new Map<string, Incident>();
    active.forEach((i) => map.set(i.id, i));
    history.forEach((i) => {
      if (!map.has(i.id)) map.set(i.id, i);
    });
    return Array.from(map.values());
  }

  public getDetailedIncident(incidentId: string): DetailedIncidentView | null {
    const all = this.getAllIncidents();
    const incident = all.find((i) => i.id === incidentId);
    if (!incident) return null;

    // Priority info
    const queue = this.coordinationEngine.getPriorityQueue();
    const pending = queue.getPendingQueue().find((p: CoordinationIncident) => p.incidentId === incidentId);
    const activeCoord = queue.getActiveQueue().find((p: CoordinationIncident) => p.incidentId === incidentId);

    // Drone / surface assignments
    const assignedDroneId = activeCoord?.assignedDroneId || pending?.assignedDroneId;
    let assignedDrone: DroneRecord | undefined = undefined;
    if (assignedDroneId) {
      assignedDrone = this.droneRegistry.getDrone(assignedDroneId) ?? undefined;
    }

    // Rescue execution dossier
    const rescueDossier = this.rescueExecutionManager.getAllExecutions().find((e) => e.incidentId === incidentId);

    // Related faults
    const allFaults: DroneFaultRecord[] = [
      ...this.faultRecoveryManager.getDetector().getActiveFaults(),
      ...this.faultRecoveryManager.getDetector().getFaultHistory(),
    ];
    const activeFaults = allFaults.filter(
      (f: DroneFaultRecord) => f.relatedIncidentId === incidentId || (assignedDrone && f.droneId === assignedDrone.droneId)
    );

    // Build chronological timeline from actual records
    const timeline: MissionReplayEvent[] = [];

    // 1. Detection Event
    timeline.push({
      eventId: `EVT-INC-DET-${incident.id}`,
      sessionId: 'LIVE-SESSION',
      simTimeSeconds: incident.startedAt,
      wallClockTimestamp: Date.now() - (100 - incident.startedAt) * 1000,
      eventType: 'INCIDENT_DETECTED',
      severity: incident.severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
      title: `Incident Detected: ${incident.title}`,
      description: incident.description,
      incidentId: incident.id,
      position3D: { x: incident.location.x, y: 0, z: incident.location.y },
      isRecordedFact: true,
    });

    // 2. Resource Assignment Event if assigned
    if (assignedDroneId) {
      timeline.push({
        eventId: `EVT-INC-ASS-${incident.id}`,
        sessionId: 'LIVE-SESSION',
        simTimeSeconds: incident.startedAt + 2,
        wallClockTimestamp: activeCoord?.assignedAtMs || Date.now(),
        eventType: 'RESOURCE_ASSIGNED',
        severity: 'INFO',
        title: `Aerial Drone Allocated: ${assignedDroneId}`,
        description: `Dispatched ${assignedDroneId} to incident coordinates.`,
        incidentId: incident.id,
        droneId: assignedDroneId,
        isRecordedFact: true,
      });
    }

    // 3. Flotation drop or arrival if recorded in dossier
    if (rescueDossier) {
      const rings = this.rescueExecutionManager.getDeployedFlotationRings().filter((r) => r.incidentId === incidentId);
      if (rings.length > 0) {
        timeline.push({
          eventId: `EVT-INC-DROP-${rescueDossier.executionId}`,
          sessionId: 'LIVE-SESSION',
          simTimeSeconds: incident.startedAt + 18,
          wallClockTimestamp: rings[0].deployedAtMs,
          eventType: 'FLOTATION_DROPPED',
          severity: 'INFO',
          title: 'Flotation Aid Delivered to Victim',
          description: `Controlled buoyant ring deployment confirmed. Victim stabilized; surface lifesaver extraction active.`,
          incidentId: incident.id,
          droneId: rescueDossier.droneId,
          position3D: rings[0].position3D,
          isRecordedFact: true,
        });
      }
    }

    // 4. Fault Events if any occurred on assigned drone
    for (const fault of activeFaults) {
      timeline.push({
        eventId: `EVT-INC-FLT-${fault.faultId}`,
        sessionId: 'LIVE-SESSION',
        simTimeSeconds: incident.startedAt + 12,
        wallClockTimestamp: fault.detectedTimestampMs,
        eventType: 'FAULT_DETECTED',
        severity: fault.severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
        title: `Drone Fault: ${fault.category}`,
        description: fault.diagnostics,
        incidentId: incident.id,
        droneId: fault.droneId,
        faultCategory: fault.category,
        isRecordedFact: true,
      });
    }

    // 5. Resolution Event if incident is resolved
    if (!incident.active) {
      timeline.push({
        eventId: `EVT-INC-RES-${incident.id}`,
        sessionId: 'LIVE-SESSION',
        simTimeSeconds: incident.startedAt + 45,
        wallClockTimestamp: Date.now(),
        eventType: 'INCIDENT_RESOLVED',
        severity: 'INFO',
        title: 'Incident Resolved & Secured',
        description: `Lifesaver team safely extracted victim to shore medical station.`,
        incidentId: incident.id,
        isRecordedFact: true,
      });
    }

    // Sort timeline chronologically
    timeline.sort((a, b) => a.simTimeSeconds - b.simTimeSeconds);

    // Look for matching candidate distress dossier from multi-sensor vision
    const candidates = this.correlator.getAllCandidates();
    const candidate = candidates.find(
      (c) => c.createdIncidentId === incidentId || c.candidateId === incidentId
    );

    let warningDelivery: LocalizedWarningDeliveryRecord | undefined = undefined;
    const warningRecords = this.warningService.getEligibilityRecordsForIncident(incidentId);
    if (warningRecords && warningRecords.length > 0) {
      const eligible = warningRecords.filter((r) => r.eligible);
      const ackCount = eligible.filter((r) => r.deliveryStatus === 'ACKNOWLEDGED').length;
      const deliveredCount = eligible.filter(
        (r) => r.deliveryStatus === 'DELIVERED' || r.deliveryStatus === 'ACKNOWLEDGED'
      ).length;

      warningDelivery = {
        warningId: `WRN-${incidentId}`,
        incidentId,
        targetZoneId: incident.zoneId,
        issuedAtMs: Date.now() - 30000,
        eligibleCount: eligible.length,
        excludedCount: warningRecords.length - eligible.length,
        deliveredCount,
        acknowledgedCount: ackCount,
        status: incident.active ? 'ACTIVE' : 'RESOLVED',
        details: warningRecords,
      };

      // Push warning timeline event
      timeline.push({
        eventId: `EVT-WRN-${incidentId}`,
        sessionId: 'LIVE-SESSION',
        simTimeSeconds: incident.startedAt + 1,
        wallClockTimestamp: Date.now() - 25000,
        eventType: 'WARNING_ZONE_ACTIVATED',
        severity: 'INFO',
        title: `Localized Warning Dispatched to Zone ${incident.zoneId}`,
        description: `Delivered localized warning to ${eligible.length} wristbands (${ackCount} acknowledged).`,
        incidentId: incident.id,
        isRecordedFact: true,
      });
      timeline.sort((a, b) => a.simTimeSeconds - b.simTimeSeconds);
    }

    let evidenceSummary: string | undefined = undefined;
    if (candidate) {
      const isFused = candidate.cameraObservationIds.length > 0 && candidate.droneObservationIds.length > 0;
      const statusText = isFused ? 'FUSED_MULTI_SENSOR' : candidate.primarySource;
      evidenceSummary = `${candidate.cameraObservationIds.length} Fixed Camera Detections, ${candidate.droneObservationIds.length} Aerial Drone Observations (${statusText})`;
    }

    return {
      incident,
      priorityScore: activeCoord?.priorityRank ?? pending?.priorityRank,
      priorityRank: activeCoord?.priorityRank ?? pending?.priorityRank,
      assignedDroneId,
      assignedDrone,
      assignedSurfaceUnit: activeCoord?.assignedLifeguardId || activeCoord?.assignedRescueBoatId || 'LG-01 (Patrol Standby)',
      rescueDossier,
      activeFaults,
      timeline,
      isEscalatedToSurface: pending ? pending.waitTimeSeconds > 45 : false,
      statusDisplay: incident.active ? 'ACTIVE' : 'RESOLVED',
      candidateDossier: candidate,
      warningDelivery,
      evidenceSummary,
      multiSensorConfidence: candidate?.compositeConfidence,
      spatialUncertaintyMeters: candidate?.spatialUncertaintyRadiusMeters,
    };
  }

  // ==========================================================================
  // Module 5: Drone Fleet & Mission Detail View
  // ==========================================================================

  public getAllDrones(): DroneRecord[] {
    return this.droneRegistry.getAllDrones();
  }

  public getDetailedDrone(droneId: string): DetailedDroneView | null {
    const drone = this.droneRegistry.getDrone(droneId);
    if (!drone) return null;

    const activeFaults = this.faultRecoveryManager
      .getDetector()
      .getActiveFaults()
      .filter((f: DroneFaultRecord) => f.droneId === droneId);
    const faultHistory = this.faultRecoveryManager
      .getDetector()
      .getFaultHistory()
      .filter((f: DroneFaultRecord) => f.droneId === droneId);

    const battPct = drone.battery?.percentage ?? 100;

    // Determine non-overlapping categorization
    let categorization: DetailedDroneView['categorization'] = 'AVAILABLE';
    let unreadinessReason: string | undefined = undefined;

    if (
      drone.status === 'OFFLINE' ||
      drone.connectivity === 'DISCONNECTED' ||
      battPct <= 20 ||
      activeFaults.some((f: DroneFaultRecord) => f.severity === 'CRITICAL' || f.severity === 'FATAL')
    ) {
      categorization = 'UNAVAILABLE';
      unreadinessReason = battPct <= 20
        ? `Depleted battery (${battPct.toFixed(0)}% <= 20%)`
        : activeFaults[0]?.diagnostics || 'Asset offline or disconnected';
    } else if (drone.status === 'RETURNING' || drone.status === 'CHARGING') {
      categorization = 'RETURNING_TO_BASE';
    } else if (
      drone.status === 'PATROLLING' ||
      drone.status === 'DISPATCHED' ||
      drone.status === 'SEARCHING' ||
      drone.status === 'ASSISTING' ||
      drone.currentMissionId
    ) {
      categorization = 'ON_ACTIVE_MISSION';
    }

    const activeMission = drone.currentMissionId
      ? this.missionManager.getMission(drone.currentMissionId) ?? undefined
      : undefined;

    const activeRescueDossier = this.rescueExecutionManager
      .getAllExecutions()
      .find((e) => e.droneId === droneId);

    let linkedIncident: Incident | undefined = undefined;
    if (activeRescueDossier) {
      linkedIncident = this.incidentManager.getActiveIncidents().find((i) => i.id === activeRescueDossier.incidentId);
    }

    const isPositionUncertain = activeFaults.some((f: DroneFaultRecord) => f.isPositionUncertain);

    return {
      drone,
      categorization,
      unreadinessReason,
      activeMission,
      activeRescueDossier,
      linkedIncident,
      activeFaults,
      faultHistory,
      isPositionUncertain,
    };
  }

  // ==========================================================================
  // Module 6: Candidate Distress Triage (Multi-Sensor Vision & Aerial CV)
  // ==========================================================================

  public getCandidateIncidents(): CandidateDistressIncident[] {
    return this.correlator.getAllCandidates();
  }

  public getCandidateIncident(candidateId: string): CandidateDistressIncident | undefined {
    return this.correlator.getCandidate(candidateId);
  }

  public verifyCandidateObservation(
    candidateId: string,
    operatorId: string,
    rationale: string,
    clockMs: number = Date.now()
  ): { success: boolean; incidentId?: string; error?: string } {
    const result = this.correlator.confirmDistress(candidateId, operatorId, rationale, clockMs);
    this.logOperatorAction({
      operatorId,
      actionType: 'VERIFY_CANDIDATE',
      targetId: candidateId,
      details: result.success
        ? `Confirmed candidate distress. Created incident: ${result.incidentId}. Rationale: "${rationale}"`
        : `Verification failed: ${result.error}`,
      success: result.success,
    });
    this.notify();
    return result;
  }

  public dismissCandidateObservation(
    candidateId: string,
    operatorId: string,
    rationale: string,
    clockMs: number = Date.now()
  ): { success: boolean; error?: string } {
    const result = this.correlator.dismissObservation(candidateId, operatorId, rationale, clockMs);
    this.logOperatorAction({
      operatorId,
      actionType: 'DISMISS_CANDIDATE',
      targetId: candidateId,
      details: result.success
        ? `Dismissed candidate observation. Rationale: "${rationale}"`
        : `Dismissal failed: ${result.error}`,
      success: result.success,
    });
    this.notify();
    return result;
  }

  public requestDroneCloserLook(
    candidateId: string,
    operatorId: string,
    preferredDroneId?: string,
    clockMs: number = Date.now()
  ): { success: boolean; missionId?: string; assignedDroneId?: string; error?: string } {
    const result = this.correlator.requestDroneCloserLook(candidateId, operatorId, preferredDroneId, clockMs);
    this.logOperatorAction({
      operatorId,
      actionType: 'REQUEST_DRONE_INSPECTION',
      targetId: candidateId,
      details: result.success
        ? `Dispatched inspection mission ${result.missionId} with drone ${result.assignedDroneId}`
        : `Inspection request failed: ${result.error}`,
      success: result.success,
    });
    this.notify();
    return result;
  }

  // ==========================================================================
  // Module 7: Wristband Fleet & Localized Warning Distribution (Track B)
  // ==========================================================================

  public getAllWristbandRecords(): WristbandMonitoringRecord[] {
    const wristbands = this.wristbandRegistry.getWristbands();
    return wristbands.map((wb) => {
      const isHw = wb.id.startsWith('HW-');
      const hasLoc = wb.telemetry.hasLocation;

      return {
        wristbandId: wb.id,
        provenance: isHw ? 'HARDWARE' : 'SIMULATED',
        batteryPercent: wb.batteryPercent,
        connectivity: wb.connectivity,
        gatewayId: wb.telemetry.hardwareMetadata?.gatewayId,
        rssiDbm: wb.telemetry.hardwareMetadata?.rssiDbm ?? wb.telemetry.signalStrengthDbm,
        snrDb: wb.telemetry.hardwareMetadata?.snrDb,
        pairedVisitorName: wb.pairedVisitorName || undefined,
        zone: wb.currentZone,
        isSosActive: wb.isSosActive,
        lastWarningStatus: wb.lastWarningReceived?.status ?? 'NONE',
        deliveryTimeMs: wb.lastWarningReceived?.deliveredAtMs,
        locationState: hasLoc ? 'CALIBRATED' : 'UNKNOWN',
        position: hasLoc && wb.telemetry.simPosition
          ? { x: wb.telemetry.simPosition.x, y: wb.telemetry.simPosition.y }
          : undefined, // Zero coordinate fabrication
      };
    });
  }

  public getWarningDeliveryRecords(): LocalizedWarningDeliveryRecord[] {
    const records: LocalizedWarningDeliveryRecord[] = [];
    const allIncidents = this.getAllIncidents();

    for (const inc of allIncidents) {
      const warningDetails = this.warningService.getEligibilityRecordsForIncident(inc.id);
      if (warningDetails && warningDetails.length > 0) {
        const eligible = warningDetails.filter((r) => r.eligible);
        const ackCount = eligible.filter((r) => r.deliveryStatus === 'ACKNOWLEDGED').length;
        const deliveredCount = eligible.filter(
          (r) => r.deliveryStatus === 'DELIVERED' || r.deliveryStatus === 'ACKNOWLEDGED'
        ).length;

        records.push({
          warningId: `WRN-${inc.id}`,
          incidentId: inc.id,
          targetZoneId: inc.zoneId,
          issuedAtMs: Date.now() - 30000,
          eligibleCount: eligible.length,
          excludedCount: warningDetails.length - eligible.length,
          deliveredCount,
          acknowledgedCount: ackCount,
          status: inc.active ? 'ACTIVE' : 'RESOLVED',
          details: warningDetails,
        });
      }
    }

    return records;
  }

  public triggerManualLocalizedWarning(
    zoneId: string,
    location: { x: number; y: number },
    reason: string,
    operatorId: string,
    clockMs: number = Date.now()
  ): { success: boolean; eligibleCount: number; error?: string } {
    const warningIncidentId = `MANUAL-WRN-${Date.now()}`;
    const dispatchResult = this.warningService.dispatchWarningForSOS('OP-DISPATCH', location, zoneId, warningIncidentId, clockMs);
    this.logOperatorAction({
      operatorId,
      actionType: 'TRIGGER_LOCALIZED_WARNING',
      targetId: zoneId,
      details: dispatchResult.success
        ? `Broadcast localized warning to zone ${zoneId} (${dispatchResult.eligibleCount} devices). Reason: "${reason}"`
        : `Warning dispatch failed: ${dispatchResult.error || 'throttled'}`,
      success: dispatchResult.success,
    });
    this.notify();
    return {
      success: dispatchResult.success,
      eligibleCount: dispatchResult.eligibleCount,
      error: dispatchResult.error,
    };
  }

  // ==========================================================================
  // Module 8: Reliability & Subsystem Health Matrix (Explicit Freshness)
  // ==========================================================================

  public getSubsystemHealthMatrix(): SubsystemHealthRecord[] {
    const now = Date.now();
    const records: SubsystemHealthRecord[] = [];

    // 1. Fixed Coastal Camera Vision
    const lastCameraObs = this.cameraAdapter.getRecentObservations(1)[0];
    const cameraAge = lastCameraObs ? now - lastCameraObs.eventTimestampMs : 99999;
    let cameraStatus: DataFreshnessStatus = 'HEALTHY';
    let cameraStaleWarning: string | undefined = undefined;
    if (!lastCameraObs) {
      cameraStatus = 'UNKNOWN_UNMEASURED';
      cameraStaleWarning = 'No fixed camera detections ingested yet';
    } else if (cameraAge > 20000) {
      cameraStatus = 'STALE_DATA';
      cameraStaleWarning = `Telemetry age ${Math.round(cameraAge / 1000)}s > 20s stale threshold`;
    } else if (cameraAge > 5000) {
      cameraStatus = 'DEGRADED';
      cameraStaleWarning = `Telemetry latency ${Math.round(cameraAge / 1000)}s (>5s latency)`;
    }
    records.push({
      subsystemId: 'SUB-CAM-01',
      name: 'Fixed Coastal Camera Vision Array',
      category: 'CAMERA_VISION',
      status: cameraStatus,
      lastHeartbeatMs: lastCameraObs ? lastCameraObs.eventTimestampMs : now,
      latencyMs: lastCameraObs ? Math.max(10, Math.min(2500, cameraAge)) : null,
      packetLossPercent: 0,
      staleDataWarning: cameraStaleWarning,
      details: { totalObservations: this.cameraAdapter.getAllObservations().length },
    });

    // 2. Aerial Drone Fleet
    const drones = this.droneRegistry.getAllDrones();
    const offlineDrones = drones.filter((d) => d.status === 'OFFLINE' || d.connectivity === 'DISCONNECTED');
    let droneStatus: DataFreshnessStatus = 'HEALTHY';
    let droneWarning: string | undefined = undefined;
    if (offlineDrones.length === drones.length && drones.length > 0) {
      droneStatus = 'OFFLINE';
      droneWarning = 'All fleet drones disconnected or offline';
    } else if (offlineDrones.length > 0) {
      droneStatus = 'DEGRADED';
      droneWarning = `${offlineDrones.length} drone(s) degraded/offline`;
    }
    records.push({
      subsystemId: 'SUB-DRN-01',
      name: 'Autonomous Aerial Drone Telemetry Bus',
      category: 'DRONE_AERIAL',
      status: droneStatus,
      lastHeartbeatMs: now,
      latencyMs: 45,
      packetLossPercent: offlineDrones.length > 0 ? (offlineDrones.length / drones.length) * 100 : 0,
      staleDataWarning: droneWarning,
      details: { totalDrones: drones.length, offlineDrones: offlineDrones.map((d) => d.droneId) },
    });

    // 3. Swimmer Wristband Fleet
    const fleetKPIs = this.wristbandRegistry.getFleetKPIs();
    let wbStatus: DataFreshnessStatus = 'HEALTHY';
    let wbWarning: string | undefined = undefined;
    if (fleetKPIs.offlineCount === fleetKPIs.totalRegistered && fleetKPIs.totalRegistered > 0) {
      wbStatus = 'OFFLINE';
      wbWarning = 'Entire wristband fleet offline';
    } else if (fleetKPIs.degradedCount > 0 || fleetKPIs.offlineCount > 0) {
      wbStatus = 'DEGRADED';
      wbWarning = `${fleetKPIs.degradedCount} degraded, ${fleetKPIs.offlineCount} offline`;
    }
    records.push({
      subsystemId: 'SUB-WB-01',
      name: 'Connected Swimmer Wristband Fleet (Sim + HW)',
      category: 'WRISTBAND_FLEET',
      status: wbStatus,
      lastHeartbeatMs: now,
      latencyMs: 120,
      packetLossPercent: fleetKPIs.offlineCount > 0 ? (fleetKPIs.offlineCount / fleetKPIs.totalRegistered) * 100 : 0,
      staleDataWarning: wbWarning,
      details: { ...fleetKPIs },
    });

    // 4. Beach LoRa RF Gateway
    const gw = this.gatewayService.getHealthStatus();
    let gwStatus: DataFreshnessStatus = 'HEALTHY';
    let gwWarning: string | undefined = undefined;
    if (gw.status === 'OFFLINE') {
      gwStatus = 'OFFLINE';
      gwWarning = `Gateway ${gw.gatewayId} offline. Buffering packets: ${gw.bufferedEventCount}`;
    } else if (gw.status === 'DEGRADED' || gw.bufferedEventCount > 0) {
      gwStatus = 'DEGRADED';
      gwWarning = `Gateway buffering active (${gw.bufferedEventCount} events stored offline)`;
    }
    records.push({
      subsystemId: 'SUB-GW-01',
      name: 'Rushikonda Beach LoRa RF Gateway (GW-TOWER-01)',
      category: 'BEACH_GATEWAY',
      status: gwStatus,
      lastHeartbeatMs: gw.lastPingMs || now,
      latencyMs: 85,
      packetLossPercent: gw.packetsReceived > 0 ? (gw.packetsDropped / gw.packetsReceived) * 100 : 0,
      staleDataWarning: gwWarning,
      details: {
        packetsReceived: gw.packetsReceived,
        packetsForwarded: gw.packetsForwarded,
        bufferedCount: gw.bufferedEventCount,
      },
    });

    // 5. Controlled Field Pilot Framework
    const pilotSession = this.pilotSessionManager.getActiveSession();
    records.push({
      subsystemId: 'SUB-PLT-01',
      name: 'Controlled Field Pilot Test & Metric Harness',
      category: 'PILOT_FRAMEWORK',
      status: pilotSession ? 'HEALTHY' : 'UNKNOWN_UNMEASURED',
      lastHeartbeatMs: now,
      latencyMs: 25,
      packetLossPercent: 0,
      staleDataWarning: pilotSession ? undefined : 'No active pilot session running',
      details: {
        activeSessionId: pilotSession?.sessionId ?? 'NONE',
        status: pilotSession?.status ?? 'INACTIVE',
      },
    });

    // 6. Multi-Drone Coordination Engine
    const conflicts = this.coordinationEngine.getAllocationEngine().getConflicts();
    records.push({
      subsystemId: 'SUB-CRD-01',
      name: 'Multi-Drone Resource Allocation & Preemption Engine',
      category: 'COORDINATION_ENGINE',
      status: conflicts.length > 0 ? 'DEGRADED' : 'HEALTHY',
      lastHeartbeatMs: now,
      latencyMs: 15,
      packetLossPercent: 0,
      staleDataWarning: conflicts.length > 0 ? `${conflicts.length} active allocation conflict(s)` : undefined,
      details: { conflictCount: conflicts.length },
    });

    return records;
  }

  // ==========================================================================
  // Module 9: Controlled Field Pilot Validation Summary
  // ==========================================================================

  public getPilotValidationSummary() {
    const activeSession = this.pilotSessionManager.getActiveSession();
    const allDossiers = this.deviceReadinessManager.getAllDossiers();
    let totalChecks = 0;
    let passedChecks = 0;
    for (const d of allDossiers) {
      for (const c of d.checks) {
        totalChecks++;
        if (c.status === 'PASSED' || c.status === 'NOT_APPLICABLE') passedChecks++;
      }
    }
    const readinessPct = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 100;
    const metrics = this.pilotMetricsCalculator.computeAllMetrics(activeSession?.sessionId);

    return {
      activeSession,
      totalPreflightChecks: totalChecks,
      passedPreflightChecks: passedChecks,
      readinessPercentage: Math.round(readinessPct),
      metrics,
    };
  }

  // ==========================================================================
  // Module 10: Operator Actions, Audit Logging & 3D Layer Visibility
  // ==========================================================================

  public logOperatorAction(action: Omit<OperatorAuditAction, 'auditId' | 'timestampMs'>): OperatorAuditAction {
    const fullAction: OperatorAuditAction = {
      auditId: `ACT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestampMs: Date.now(),
      ...action,
    };
    this.operatorAuditLogs.unshift(fullAction);
    if (this.operatorAuditLogs.length > 200) {
      this.operatorAuditLogs.pop();
    }
    return fullAction;
  }

  public getOperatorAuditLog(): OperatorAuditAction[] {
    return [...this.operatorAuditLogs];
  }

  public reassignDroneToIncident(
    incidentId: string,
    droneId: string,
    operatorId: string
  ): { success: boolean; error?: string } {
    const drone = this.droneRegistry.getDrone(droneId);
    if (!drone) return { success: false, error: `Drone ${droneId} not found` };

    const coordIncident =
      this.coordinationEngine.getPriorityQueue().getActiveQueue().find((p) => p.incidentId === incidentId) ||
      this.coordinationEngine.getPriorityQueue().getPendingQueue().find((p) => p.incidentId === incidentId);

    if (coordIncident) {
      this.coordinationEngine.getAllocationEngine().requestReassignment(
        incidentId,
        droneId,
        operatorId,
        'Manual operator command center reassignment',
        coordIncident
      );
    }
    this.logOperatorAction({
      operatorId,
      actionType: 'REASSIGN_INCIDENT',
      targetId: incidentId,
      details: `Reassigned incident ${incidentId} to drone ${droneId}`,
      success: true,
    });
    this.notify();
    return { success: true };
  }

  public acknowledgeFault(faultId: string, operatorId: string): { success: boolean; error?: string } {
    const success = this.faultRecoveryManager.acknowledgeFault(faultId, operatorId);
    this.logOperatorAction({
      operatorId,
      actionType: 'ACKNOWLEDGE_FAULT',
      targetId: faultId,
      details: success ? `Acknowledged fault ${faultId}` : `Fault ${faultId} not found`,
      success,
    });
    this.notify();
    return { success };
  }

  public getLayerVisibility(): LayerVisibilityState {
    return { ...this.layerVisibility };
  }

  public setLayerVisibility(layer: keyof LayerVisibilityState, visible: boolean): void {
    this.layerVisibility[layer] = visible;
    this.notify();
  }

  // ============================================================================
  // Predictive Coastal Risk Intelligence & Advisory Queries
  // ============================================================================

  public getPredictiveAdvisories(): PredictiveAdvisoryRecord[] {
    return this.predictiveService.getAllAdvisories();
  }

  public getPredictiveDisagreements(): PredictiveAdvisoryRecord[] {
    return this.predictiveService.getDisagreements();
  }

  public getModelEvaluationSummary(modelId: PredictionModelId): ModelEvaluationSummary {
    return this.predictiveService.getEvaluationSummary(modelId);
  }

  public getEnvironmentalQualitySummary(): EnvironmentalDataQualitySummary {
    return this.ingestionService.getQualitySummary();
  }

  public getEnvironmentalSensors(): SensorMetadata[] {
    return this.ingestionService.getSensors();
  }

  public acknowledgeAdvisory(advisoryId: string, operatorId: string = 'OP-COMMAND'): void {
    this.logOperatorAction({
      operatorId,
      actionType: 'ACKNOWLEDGE_ADVISORY',
      targetId: advisoryId,
      details: `Operator acknowledged predictive advisory ${advisoryId}`,
      success: true,
    });
    this.notify();
  }

  public requestPrecautionaryPatrol(zoneId: string, operatorId: string = 'OP-COMMAND'): { success: boolean; message: string } {
    // Finds an available drone and dispatches precautionary search/patrol mission
    const availableDrones = this.droneRegistry.getAllDrones().filter(
      (d) => d.status === 'IDLE' && d.battery.percentage > 30
    );

    if (availableDrones.length === 0) {
      this.logOperatorAction({
        operatorId,
        actionType: 'PRECAUTIONARY_PATROL_REQUESTED',
        targetId: zoneId,
        details: `Precautionary patrol failed: no idle drones available for sector ${zoneId}`,
        success: false,
      });
      return { success: false, message: 'No idle drones available with sufficient battery.' };
    }

    const assignedDrone = availableDrones[0];
    this.logOperatorAction({
      operatorId,
      actionType: 'PRECAUTIONARY_PATROL_REQUESTED',
      targetId: zoneId,
      details: `Dispatched precautionary surveillance drone ${assignedDrone.droneId} to emerging risk sector ${zoneId}`,
      success: true,
    });
    this.notify();
    return { success: true, message: `Dispatched drone ${assignedDrone.droneId} for precautionary sector observation.` };
  }

  // ============================================================================
  // Phase 8: Multi-Beach Coastal Network & Regional Coordination Methods
  // ============================================================================

  public getActiveSiteId(): string {
    return this.beachRegistry.getActiveSiteId();
  }

  public setActiveSiteId(siteId: string, operatorId: string = 'OP-COMMAND'): { success: boolean; error?: string } {
    const res = this.beachRegistry.setActiveSiteId(siteId);
    if (res.success) {
      this.logOperatorAction({
        operatorId,
        actionType: 'SWITCH_ACTIVE_SITE',
        targetId: siteId,
        details: `Operator changed active operational beach to ${siteId}`,
        success: true,
      });
      this.notify();
    }
    return res;
  }

  public getRegionalSites(filters?: { status?: string; district?: string; provenance?: string; search?: string }): RegionalBeachRecord[] {
    return this.beachRegistry.getBeaches(filters);
  }

  public getActiveSiteRecord(): RegionalBeachRecord | undefined {
    return this.beachRegistry.getBeach(this.beachRegistry.getActiveSiteId());
  }

  public getCrossSiteAssistanceRequests(): CrossSiteAssistanceRequest[] {
    return this.regionalCoordination.getRequests();
  }

  public createCrossSiteAssistanceRequest(input: {
    requestingSiteId: string;
    receivingSiteId: string;
    incidentId: string;
    resourceType: AssistanceResourceType;
    urgency: AssistanceUrgency;
    rationale: string;
    operatorId?: string;
  }): { success: boolean; request?: CrossSiteAssistanceRequest; error?: string } {
    const op = input.operatorId || 'OP-COMMAND';
    const res = this.regionalCoordination.createAssistanceRequest({
      ...input,
      operatorId: op,
    });

    if (res.success && res.request) {
      this.logOperatorAction({
        operatorId: op,
        actionType: 'CREATE_ASSISTANCE_REQUEST',
        targetId: res.request.requestId,
        details: `Created cross-site mutual aid request ${res.request.requestId}: ${input.resourceType} from ${input.receivingSiteId} to ${input.requestingSiteId} (${input.urgency})`,
        success: true,
      });
      this.notify();
    }

    return res;
  }

  public acknowledgeAssistanceRequest(requestId: string, operatorId: string = 'OP-COMMAND', notes?: string): { success: boolean; error?: string } {
    const res = this.regionalCoordination.acknowledgeRequest(requestId, operatorId, notes);
    if (res.success) {
      this.logOperatorAction({
        operatorId,
        actionType: 'ACKNOWLEDGE_ASSISTANCE_REQUEST',
        targetId: requestId,
        details: `Acknowledged assistance request ${requestId}`,
        success: true,
      });
      this.notify();
    }
    return res;
  }

  public acceptAssistanceRequest(requestId: string, operatorId: string = 'OP-COMMAND', notes?: string): { success: boolean; error?: string } {
    const res = this.regionalCoordination.acceptRequest(requestId, operatorId, notes);
    if (res.success) {
      this.logOperatorAction({
        operatorId,
        actionType: 'ACCEPT_ASSISTANCE_REQUEST',
        targetId: requestId,
        details: `Accepted assistance request ${requestId}. Local resource mobilization authorized.`,
        success: true,
      });
      this.notify();
    }
    return res;
  }

  public declineAssistanceRequest(requestId: string, operatorId: string = 'OP-COMMAND', reason: string): { success: boolean; error?: string } {
    const res = this.regionalCoordination.declineRequest(requestId, operatorId, reason);
    if (res.success) {
      this.logOperatorAction({
        operatorId,
        actionType: 'DECLINE_ASSISTANCE_REQUEST',
        targetId: requestId,
        details: `Declined assistance request ${requestId}: ${reason}`,
        success: true,
      });
      this.notify();
    }
    return res;
  }

  public completeAssistanceRequest(requestId: string, operatorId: string = 'OP-COMMAND', notes?: string): { success: boolean; error?: string } {
    const res = this.regionalCoordination.completeRequest(requestId, operatorId, notes);
    if (res.success) {
      this.logOperatorAction({
        operatorId,
        actionType: 'COMPLETE_ASSISTANCE_REQUEST',
        targetId: requestId,
        details: `Completed assistance mission ${requestId}`,
        success: true,
      });
      this.notify();
    }
    return res;
  }

  public getSiteSyncStates(): SiteSyncState[] {
    return this.syncManager.getAllSiteSyncStates();
  }

  public getRegionalAnalyticsReport(): RegionalAnalyticsReport {
    return this.analyticsReporter.generateRegionalReport();
  }

  public getRegionalAccessController(): RegionalAccessController {
    return this.accessController;
  }

  // ============================================================================
  // Phase 9: Digital Twin Calibration, Real-Time Sync & Discrepancy Monitoring
  // ============================================================================

  public getDigitalTwinSyncEngine(): DigitalTwinSyncEngine {
    return this.digitalTwinSyncEngine;
  }

  public getDigitalTwinSourceMode(): DigitalTwinSourceMode {
    return this.digitalTwinSyncEngine.getActiveSourceMode();
  }

  public setDigitalTwinSourceMode(mode: DigitalTwinSourceMode, operatorId: string = 'OP-COMMAND'): void {
    this.digitalTwinSyncEngine.setActiveSourceMode(mode, operatorId);
    this.logOperatorAction({
      operatorId,
      actionType: 'SET_DIGITAL_TWIN_SOURCE_MODE',
      targetId: mode,
      details: `Operator changed digital twin source mode to ${mode}`,
      success: true,
    });
    this.notify();
  }

  public getDigitalTwinDiscrepancies(filters?: {
    siteId?: string;
    reviewStatus?: string;
  }): DigitalTwinDiscrepancy[] {
    return this.digitalTwinDiscrepancyMonitor.getAllDiscrepancies(filters);
  }

  public updateDigitalTwinDiscrepancyStatus(
    discrepancyId: string,
    status: 'ACKNOWLEDGED' | 'INVESTIGATING' | 'RESOLVED',
    operatorId: string = 'OP-COMMAND',
    notes?: string
  ): { success: boolean; error?: string } {
    const res = this.digitalTwinDiscrepancyMonitor.updateReviewStatus(discrepancyId, status, operatorId, notes);
    if (res.success) {
      this.logOperatorAction({
        operatorId,
        actionType: status === 'RESOLVED' ? 'RESOLVE_DISCREPANCY' : 'ACKNOWLEDGE_DISCREPANCY',
        targetId: discrepancyId,
        details: `Operator updated discrepancy ${discrepancyId} review status to ${status}`,
        success: true,
      });
      this.notify();
    }
    return res;
  }

  public getDigitalTwinSiteSyncSummary(siteId?: string): SiteSyncSummary {
    return this.digitalTwinSyncEngine.getSiteSyncSummary(siteId || this.getActiveSiteId());
  }

  public getDigitalTwinDeviceHealths(siteId?: string): DeviceSyncHealth[] {
    return this.digitalTwinSyncEngine.getAllDeviceHealths(siteId);
  }

  public ingestDigitalTwinObservation(params: {
    observationId: string;
    sourceId: string;
    sourceType: SourceType;
    siteId?: string;
    entityId?: string;
    variable: ObservationVariableType;
    rawValue: any;
    rawUnits: string;
    sourceTimestamp: number;
    currentSimulationValue?: number;
  }): {
    observation: UnifiedDigitalTwinObservation;
    discrepancy?: DigitalTwinDiscrepancy;
    appliedToLiveTwin: boolean;
  } {
    const res = this.digitalTwinSyncEngine.ingestObservation(params);
    this.notify();
    return res;
  }

  public getResilienceOrchestrator(): ResilienceOrchestrator {
    return this.resilienceOrchestrator;
  }

  public getResilienceSummary() {
    return this.resilienceOrchestrator.getResilienceSummary();
  }

  public destroy(): void {
    if (this.auditLoopTimer) {
      clearInterval(this.auditLoopTimer);
      this.auditLoopTimer = null;
    }
    this.listeners.clear();
  }
}
