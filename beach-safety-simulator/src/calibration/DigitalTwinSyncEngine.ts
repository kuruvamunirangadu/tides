/**
 * src/calibration/DigitalTwinSyncEngine.ts
 * 
 * TIDES — Phase 9: Digital Twin Calibration & Real-Time Synchronization
 * 
 * Central Synchronization Engine bridging real observations, sensor calibrations,
 * temporal order, and discrepancy monitoring to the 3D Coastal Digital Twin.
 * 
 * Strict Invariants:
 * 1. Separation of Observed State from Simulation State: Real observations NEVER
 *    directly overwrite the deterministic physics engine or simulation variables.
 * 2. Raw Preservation: Raw observations are preserved alongside calibrated values.
 * 3. Source Mode Governance: Supports SIMULATION_ONLY (default), OBSERVED_ONLY,
 *    SIDE_BY_SIDE_COMPARISON, and VALIDATED_SYNCHRONIZED.
 * 4. Offline Resiliency: Buffers events during disconnection and flushes idempotently.
 */

import {
  UnifiedDigitalTwinObservation,
  DigitalTwinSourceMode,
  DeviceSyncHealth,
  SiteSyncSummary,
  DigitalTwinAuditEntry,
  ObservationVariableType,
  SourceType,
  TransportType,
  ObservationProvenance,
  DigitalTwinDiscrepancy,
  SyncStatus,
} from './digitalTwinObservation.types';
import { SensorCalibrationService, CalibrationResult } from './SensorCalibrationService';
import { ObservationValidationService } from './ObservationValidationService';
import { TimeSynchronizationManager } from './TimeSynchronizationManager';
import { DigitalTwinDiscrepancyMonitor } from './DigitalTwinDiscrepancyMonitor';
import { BeachRegistry } from '../regional/BeachRegistry';

export class DigitalTwinSyncEngine {
  private static instance: DigitalTwinSyncEngine | null = null;

  private calibrationService: SensorCalibrationService;
  private validationService: ObservationValidationService;
  private timeSyncManager: TimeSynchronizationManager;
  private discrepancyMonitor: DigitalTwinDiscrepancyMonitor;
  private beachRegistry: BeachRegistry;

  // Active operational source mode (Defaults to safe SIMULATION_ONLY)
  private activeSourceMode: DigitalTwinSourceMode = 'SIMULATION_ONLY';

  // State Separation Stores
  private rawObservations: Map<string, UnifiedDigitalTwinObservation> = new Map();
  private calibratedObservations: Map<string, UnifiedDigitalTwinObservation> = new Map();
  private latestObservedStates: Map<string, UnifiedDigitalTwinObservation> = new Map(); // key: `siteId::variable`

  // Device health tracking
  private deviceHealthRegistry: Map<string, DeviceSyncHealth> = new Map();

  // Offline event buffer: siteId -> array of observations
  private offlineBuffer: Map<string, UnifiedDigitalTwinObservation[]> = new Map();

  // Audit trail
  private auditLog: DigitalTwinAuditEntry[] = [];
  private auditCounter: number = 1;

  constructor(
    calibrationService?: SensorCalibrationService,
    validationService?: ObservationValidationService,
    timeSyncManager?: TimeSynchronizationManager,
    discrepancyMonitor?: DigitalTwinDiscrepancyMonitor,
    beachRegistry?: BeachRegistry
  ) {
    this.calibrationService = calibrationService || SensorCalibrationService.getInstance();
    this.validationService = validationService || ObservationValidationService.getInstance();
    this.timeSyncManager = timeSyncManager || TimeSynchronizationManager.getInstance();
    this.discrepancyMonitor = discrepancyMonitor || DigitalTwinDiscrepancyMonitor.getInstance();
    this.beachRegistry = beachRegistry || BeachRegistry.getInstance();

    this.initializeDeviceCatalog();
  }

  public static getInstance(): DigitalTwinSyncEngine {
    if (!DigitalTwinSyncEngine.instance) {
      DigitalTwinSyncEngine.instance = new DigitalTwinSyncEngine();
    }
    return DigitalTwinSyncEngine.instance;
  }

  public reset(): void {
    this.rawObservations.clear();
    this.calibratedObservations.clear();
    this.latestObservedStates.clear();
    this.deviceHealthRegistry.clear();
    this.offlineBuffer.clear();
    this.auditLog = [];
    this.activeSourceMode = 'SIMULATION_ONLY';
    this.initializeDeviceCatalog();
  }

  /**
   * Initializes known physical monitoring devices across the coastal digital twin.
   */
  private initializeDeviceCatalog(): void {
    const defaultDevices: Array<{
      deviceId: string;
      deviceName: string;
      siteId: string;
      sourceType: SourceType;
    }> = [
      {
        deviceId: 'INCOIS-WAVE-BUOY-01',
        deviceName: 'INCOIS Rushikonda Coastal Wave Buoy',
        siteId: 'RUSHIKONDA',
        sourceType: 'WAVE_BUOY',
      },
      {
        deviceId: 'IMD-AWS-VIZAG-COAST',
        deviceName: 'IMD Visakhapatnam Coastal Automated Weather Station',
        siteId: 'RUSHIKONDA',
        sourceType: 'WEATHER_STATION',
      },
      {
        deviceId: 'NIOT-TIDE-GAUGE-01',
        deviceName: 'NIOT Acoustic Tide Gauge & Benchmark Array',
        siteId: 'RUSHIKONDA',
        sourceType: 'TIDE_GAUGE',
      },
      {
        deviceId: 'ADCP-CURRENT-METER-01',
        deviceName: 'NIOT Acoustic Doppler Current Profiler (ADCP)',
        siteId: 'RUSHIKONDA',
        sourceType: 'ENVIRONMENTAL_SENSOR',
      },
      {
        deviceId: 'WATER-TEMP-SENS-01',
        deviceName: 'Rushikonda Pier Water Temperature Probe',
        siteId: 'RUSHIKONDA',
        sourceType: 'ENVIRONMENTAL_SENSOR',
      },
    ];

    for (const d of defaultDevices) {
      this.deviceHealthRegistry.set(d.deviceId, {
        deviceId: d.deviceId,
        deviceName: d.deviceName,
        siteId: d.siteId,
        sourceType: d.sourceType,
        status: 'SYNCHRONIZED',
        lastObservationTimestamp: 0,
        lastIngestionTimestamp: 0,
        syncLatencyMs: 0,
        totalUpdatesReceived: 0,
        duplicateCount: 0,
        outOfOrderCount: 0,
        qualityWarningsCount: 0,
        activeDiscrepanciesCount: 0,
        calibrationStatus: 'CALIBRATED_VALID',
      });
    }
  }

  // ============================================================================
  // Source Mode Management
  // ============================================================================

  public getActiveSourceMode(): DigitalTwinSourceMode {
    return this.activeSourceMode;
  }

  public setActiveSourceMode(mode: DigitalTwinSourceMode, operatorId: string = 'OP-SYSTEM'): void {
    const prevMode = this.activeSourceMode;
    this.activeSourceMode = mode;
    this.recordAudit(operatorId, 'SET_SOURCE_MODE', mode, `Digital twin source mode transitioned from ${prevMode} to ${mode}.`);
  }

  // ============================================================================
  // Ingestion & Real-Time Synchronization Pipeline
  // ============================================================================

  /**
   * Authoritative Ingestion Pipeline:
   * 1. Preserves raw observation.
   * 2. Evaluates time synchronization, order, and duplicates.
   * 3. Validates physical bounds and rate-of-change.
   * 4. Applies sensor calibration.
   * 5. Updates observed state (separate from simulation).
   * 6. Compares with simulated value to detect discrepancies.
   * 7. Updates device synchronization health telemetry.
   */
  public ingestObservation(input: {
    observationId: string;
    sourceId: string;
    sourceType: SourceType;
    siteId?: string;
    entityId?: string;
    variable: ObservationVariableType;
    rawValue: any;
    rawUnits: string;
    sourceTimestamp: number;
    provenance?: ObservationProvenance;
    transportType?: TransportType;
    location?: { latitude: number; longitude: number; altitudeM?: number };
    currentSimulationValue?: number; // Optional simulated ground truth for discrepancy detection
  }): {
    observation: UnifiedDigitalTwinObservation;
    discrepancy?: DigitalTwinDiscrepancy;
    appliedToLiveTwin: boolean;
  } {
    const now = Date.now();
    const siteId = (input.siteId && input.siteId.trim().length > 0) ? input.siteId.toUpperCase() : 'RUSHIKONDA';
    const provenance = input.provenance || 'MEASURED';
    const transportType = input.transportType || 'INTERNAL_BUS';

    // Step 1: Time Synchronization & Ordering Check
    const timeSync = this.timeSyncManager.evaluateTimeSync({
      sourceId: input.sourceId,
      variable: input.variable,
      sourceTimestamp: input.sourceTimestamp,
      observationId: input.observationId,
      backendTimestamp: now,
    });

    // Step 2: Measurement Validation & Physical Envelope Check
    const validation = this.validationService.validateMeasurement({
      sourceId: input.sourceId,
      variable: input.variable,
      rawValue: input.rawValue,
      rawUnits: input.rawUnits,
      sourceTimestamp: input.sourceTimestamp,
      backendTimestamp: now,
    });

    // Combine warnings
    const combinedWarnings = [...validation.warnings, ...timeSync.timeSyncWarnings];

    // Step 3: Sensor Calibration Transformation
    let calResult: CalibrationResult = {
      calibratedValue: validation.normalizedValue,
      calibratedUnits: validation.normalizedUnits,
      calibrationRecordId: undefined,
      calibrationVersion: undefined,
      isCalibrated: false,
      uncertainty: 0.15,
      warnings: [],
    };

    if (validation.isValid && !Number.isNaN(validation.normalizedValue)) {
      calResult = this.calibrationService.calibrateObservation({
        sensorId: input.sourceId,
        variable: input.variable,
        rawValue: validation.normalizedValue,
        rawUnits: validation.normalizedUnits,
      });
      combinedWarnings.push(...calResult.warnings);
    }

    // Step 4: Determine Synchronization Status
    let syncStatus: SyncStatus = 'SYNCHRONIZED';
    if (!validation.isValid) {
      syncStatus = 'FAILED';
    } else if (timeSync.isDuplicate) {
      syncStatus = 'DELAYED';
    } else if (validation.isStale) {
      syncStatus = 'STALE';
    } else if (!calResult.isCalibrated) {
      syncStatus = 'UNCALIBRATED';
    }

    // Construct UnifiedDigitalTwinObservation
    const observation: UnifiedDigitalTwinObservation = {
      observationId: input.observationId,
      sourceId: input.sourceId,
      sourceType: input.sourceType,
      siteId,
      entityId: input.entityId,
      variable: input.variable,
      rawValue: input.rawValue,
      rawUnits: input.rawUnits,
      calibratedValue: calResult.calibratedValue,
      calibratedUnits: calResult.calibratedUnits,
      sourceTimestamp: input.sourceTimestamp,
      ingestionTimestamp: now,
      clockOffsetMs: timeSync.clockOffsetMs,
      clockUncertaintyMs: timeSync.clockUncertaintyMs,
      syncLatencyMs: timeSync.syncLatencyMs,
      location: input.location,
      calibrationRecordId: calResult.calibrationRecordId,
      calibrationVersion: calResult.calibrationVersion,
      qualityStatus: !calResult.isCalibrated && validation.qualityStatus === 'VALID' ? 'UNCALIBRATED' : validation.qualityStatus,
      provenance,
      transportType,
      measurementUncertainty: calResult.uncertainty,
      syncStatus,
      validationWarnings: combinedWarnings,
    };

    // Store raw and calibrated records separately
    this.rawObservations.set(observation.observationId, { ...observation, calibratedValue: undefined });
    this.calibratedObservations.set(observation.observationId, observation);

    // Step 5: Update Live Observed State (Separate from Simulation State)
    let appliedToLiveTwin = false;
    if (validation.isValid && timeSync.shouldUpdateLiveState) {
      const stateKey = `${siteId}::${input.variable}`;
      this.latestObservedStates.set(stateKey, observation);
      appliedToLiveTwin = true;
    }

    // Step 6: Discrepancy Detection (Only when a compatible simulation ground truth is provided)
    let discrepancy: DigitalTwinDiscrepancy | undefined;
    if (
      validation.isValid &&
      typeof input.currentSimulationValue === 'number' &&
      Number.isFinite(input.currentSimulationValue)
    ) {
      discrepancy = this.discrepancyMonitor.evaluateDiscrepancy({
        siteId,
        entityId: input.entityId || input.sourceId,
        variable: input.variable,
        observedValue: calResult.calibratedValue,
        simulatedValue: input.currentSimulationValue,
        units: calResult.calibratedUnits,
        observationTimestamp: input.sourceTimestamp,
        measurementUncertainty: calResult.uncertainty,
        isUncalibrated: !calResult.isCalibrated,
        isStale: validation.isStale,
      });
    }

    // Step 7: Update Device Health Telemetry
    this.updateDeviceHealth(input.sourceId, observation, timeSync.isDuplicate, timeSync.isOutOfOrder, discrepancy);

    return {
      observation,
      discrepancy,
      appliedToLiveTwin,
    };
  }

  private updateDeviceHealth(
    deviceId: string,
    obs: UnifiedDigitalTwinObservation,
    isDuplicate: boolean,
    isOutOfOrder: boolean,
    discrepancy?: DigitalTwinDiscrepancy
  ): void {
    let health = this.deviceHealthRegistry.get(deviceId);
    if (!health) {
      health = {
        deviceId,
        deviceName: deviceId,
        siteId: obs.siteId,
        sourceType: obs.sourceType,
        status: obs.syncStatus,
        lastObservationTimestamp: obs.sourceTimestamp,
        lastIngestionTimestamp: obs.ingestionTimestamp,
        syncLatencyMs: obs.syncLatencyMs,
        totalUpdatesReceived: 0,
        duplicateCount: 0,
        outOfOrderCount: 0,
        qualityWarningsCount: 0,
        activeDiscrepanciesCount: 0,
        calibrationStatus: obs.calibrationRecordId ? 'CALIBRATED_VALID' : 'UNVALIDATED',
      };
      this.deviceHealthRegistry.set(deviceId, health);
    }

    health.totalUpdatesReceived++;
    health.lastObservationTimestamp = obs.sourceTimestamp;
    health.lastIngestionTimestamp = obs.ingestionTimestamp;
    health.syncLatencyMs = obs.syncLatencyMs;
    health.status = obs.syncStatus;
    health.lastKnownValue = obs.calibratedValue;
    health.units = obs.calibratedUnits;

    if (isDuplicate) health.duplicateCount++;
    if (isOutOfOrder) health.outOfOrderCount++;
    if (obs.validationWarnings.length > 0) health.qualityWarningsCount++;
    if (discrepancy && discrepancy.classification !== 'WITHIN_TOLERANCE') health.activeDiscrepanciesCount++;
  }

  // ============================================================================
  // State Access & Separation Queries
  // ============================================================================

  public getRawObservation(id: string): UnifiedDigitalTwinObservation | undefined {
    return this.rawObservations.get(id);
  }

  public getCalibratedObservation(id: string): UnifiedDigitalTwinObservation | undefined {
    return this.calibratedObservations.get(id);
  }

  public getLatestObservedState(siteId: string, variable: ObservationVariableType): UnifiedDigitalTwinObservation | undefined {
    return this.latestObservedStates.get(`${siteId.toUpperCase()}::${variable}`);
  }

  public getAllLatestObservedStates(siteId?: string): UnifiedDigitalTwinObservation[] {
    const list = Array.from(this.latestObservedStates.values());
    if (!siteId || siteId.toUpperCase() === 'ALL') return list;
    const norm = siteId.toUpperCase();
    return list.filter((o) => o.siteId.toUpperCase() === norm);
  }

  public getDeviceHealth(deviceId: string): DeviceSyncHealth | undefined {
    return this.deviceHealthRegistry.get(deviceId);
  }

  public getAllDeviceHealths(siteId?: string): DeviceSyncHealth[] {
    const list = Array.from(this.deviceHealthRegistry.values());
    if (!siteId || siteId.toUpperCase() === 'ALL') return list;
    const norm = siteId.toUpperCase();
    return list.filter((d) => d.siteId.toUpperCase() === norm);
  }

  public getSiteSyncSummary(siteId: string = 'RUSHIKONDA'): SiteSyncSummary {
    const devices = this.getAllDeviceHealths(siteId);
    const syncCount = devices.filter((d) => d.status === 'SYNCHRONIZED').length;
    const degradedCount = devices.filter((d) => d.status === 'DELAYED' || d.status === 'STALE' || d.status === 'FAILED').length;
    const uncalibratedCount = devices.filter((d) => d.status === 'UNCALIBRATED' || d.calibrationStatus !== 'CALIBRATED_VALID').length;
    const discrepancies = this.discrepancyMonitor.getAllDiscrepancies({ siteId }).filter((d) => d.reviewStatus === 'PENDING_REVIEW').length;

    const avgLatency = devices.length > 0
      ? Math.round(devices.reduce((acc, d) => acc + d.syncLatencyMs, 0) / devices.length)
      : 0;

    const healthPct = devices.length > 0
      ? Math.round((syncCount / devices.length) * 100)
      : 100;

    const beach = this.beachRegistry.getBeach(siteId);

    return {
      siteId,
      siteName: beach?.name || siteId,
      totalDevices: devices.length,
      synchronizedDevices: syncCount,
      degradedOrStaleDevices: degradedCount,
      uncalibratedDevices: uncalibratedCount,
      activeDiscrepanciesCount: discrepancies,
      averageSyncLatencyMs: avgLatency,
      overallHealthPct: healthPct,
    };
  }

  // ============================================================================
  // Offline Buffering & Reconnection Synchronization
  // ============================================================================

  public bufferOfflineObservation(siteId: string, observation: UnifiedDigitalTwinObservation): void {
    const norm = siteId.toUpperCase();
    const queue = this.offlineBuffer.get(norm) || [];
    queue.push(observation);
    this.offlineBuffer.set(norm, queue);
  }

  public flushOfflineBuffer(siteId: string): {
    flushedCount: number;
    duplicatesFiltered: number;
    discrepanciesDetected: number;
  } {
    const norm = siteId.toUpperCase();
    const queue = this.offlineBuffer.get(norm) || [];
    if (queue.length === 0) {
      return { flushedCount: 0, duplicatesFiltered: 0, discrepanciesDetected: 0 };
    }

    // Sort chronologically by source timestamp
    queue.sort((a, b) => a.sourceTimestamp - b.sourceTimestamp);

    let flushedCount = 0;
    let duplicatesFiltered = 0;
    let discrepanciesDetected = 0;

    for (const obs of queue) {
      const res = this.ingestObservation({
        observationId: obs.observationId,
        sourceId: obs.sourceId,
        sourceType: obs.sourceType,
        siteId: obs.siteId,
        entityId: obs.entityId,
        variable: obs.variable,
        rawValue: obs.rawValue,
        rawUnits: obs.rawUnits,
        sourceTimestamp: obs.sourceTimestamp,
        provenance: obs.provenance,
        transportType: obs.transportType,
        location: obs.location,
      });

      if (res.appliedToLiveTwin) {
        flushedCount++;
      } else {
        duplicatesFiltered++;
      }
      if (res.discrepancy && res.discrepancy.classification !== 'WITHIN_TOLERANCE') {
        discrepanciesDetected++;
      }
    }

    this.offlineBuffer.set(norm, []);
    return { flushedCount, duplicatesFiltered, discrepanciesDetected };
  }

  public getOfflineBufferSize(siteId: string): number {
    return (this.offlineBuffer.get(siteId.toUpperCase()) || []).length;
  }

  // ============================================================================
  // Audit Trail
  // ============================================================================

  private recordAudit(operatorId: string, action: string, targetId: string, details: string): void {
    this.auditLog.push({
      auditId: `AUD-CAL-${String(this.auditCounter++).padStart(4, '0')}`,
      timestamp: Date.now(),
      operatorId,
      action,
      targetId,
      details,
    });
  }

  public getAuditTrail(): DigitalTwinAuditEntry[] {
    return [...this.auditLog];
  }
}
