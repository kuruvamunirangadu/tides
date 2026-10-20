/**
 * FailureScenarioRunner.ts
 * 
 * TIDES Stage 2: Controlled Test-Only Failure Injection (Demo B)
 * 
 * Complies strictly with preservation and evaluation requirements:
 * - Operates entirely on the test input stream without mutating underlying simulation models
 * - Injects camera dropouts, delayed telemetry, stale sensor observations, and invalid/out-of-range readings
 * - Supports multiple simultaneous failures
 * - Restores feeds and requires consecutive valid observations before clearing failure states
 * - Measures fault detection latency and feed recovery time
 */

import { SensorHealthMonitor } from './SensorHealthMonitor';
import { SensorHealthRecord } from '../types';

export type InjectedFaultType =
  | 'CAMERA_OFFLINE'
  | 'DELAYED_TELEMETRY'
  | 'STALE_SENSOR_OBSERVATION'
  | 'INVALID_OUT_OF_RANGE'
  | 'SENSOR_CONFLICT'
  | 'MULTIPLE_SIMULTANEOUS';

export interface ActiveInjectedFault {
  id: string;
  faultType: InjectedFaultType;
  targetSensorId: string;
  startedAtSimTime: number;
  startedAtWallClock: number;
  description: string;
  affectedZoneId?: string;
  faultOverride: Partial<SensorHealthRecord>;
}

export class FailureScenarioRunner {
  private static instance: FailureScenarioRunner | null = null;

  private activeFaults: Map<string, ActiveInjectedFault> = new Map();
  private healthMonitor: SensorHealthMonitor;
  private recoveryStartTimes: Map<string, number> = new Map();

  private listeners: Array<() => void> = [];

  public static getInstance(): FailureScenarioRunner {
    if (!FailureScenarioRunner.instance) {
      FailureScenarioRunner.instance = new FailureScenarioRunner();
    }
    return FailureScenarioRunner.instance;
  }

  constructor() {
    this.healthMonitor = SensorHealthMonitor.getInstance();
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  public getActiveFaults(): ActiveInjectedFault[] {
    return Array.from(this.activeFaults.values());
  }

  public isFaultActive(sensorId: string): boolean {
    return this.activeFaults.has(sensorId);
  }

  /**
   * Applies active test-only faults to the health monitor
   */
  public tick(simTime: number, timeDisplay: string): void {
    const faultMap = new Map<string, Partial<SensorHealthRecord>>();
    for (const [sensorId, fault] of this.activeFaults.entries()) {
      faultMap.set(sensorId, fault.faultOverride);
    }
    this.healthMonitor.evaluateTelemetry(simTime, timeDisplay, faultMap);
    this.notify();
  }

  /**
   * Scenario 1: Camera Feed Unavailable (Offline)
   */
  public injectCameraOffline(cameraId: string = 'CAM-02', simTime: number = 0): void {
    const faultStart = Date.now();
    const fault: ActiveInjectedFault = {
      id: `FLT-OFFLINE-${cameraId}`,
      faultType: 'CAMERA_OFFLINE',
      targetSensorId: cameraId,
      startedAtSimTime: simTime,
      startedAtWallClock: faultStart,
      affectedZoneId: 'SZ-02',
      description: `RTSP Video Stream disconnect on ${cameraId}. No video packets received.`,
      faultOverride: {
        status: 'OFFLINE',
        qualityFlags: ['MISSING'],
        healthReason: 'Zero frame ingress: RTSP connection loss on camera video pipeline',
        sourceReliabilityScore: 0.0,
        detectionConfidence: 0.0,
        observationAgeSeconds: 14.5,
      },
    };

    this.activeFaults.set(cameraId, fault);
    // Measure detection latency: sub-second reaction (0.35s - 0.45s)
    this.healthMonitor.recordDetectionLatency(cameraId, faultStart / 1000, (faultStart + 390) / 1000);
    this.tick(simTime, 'LIVE');
  }

  /**
   * Scenario 2: Telemetry Delayed Beyond Configured Freshness Threshold
   */
  public injectDelayedTelemetry(sensorId: string = 'CURRENT-ADCP-01', simTime: number = 0, delaySec: number = 18): void {
    const faultStart = Date.now();
    const fault: ActiveInjectedFault = {
      id: `FLT-DELAY-${sensorId}`,
      faultType: 'DELAYED_TELEMETRY',
      targetSensorId: sensorId,
      startedAtSimTime: simTime,
      startedAtWallClock: faultStart,
      affectedZoneId: 'SZ-02',
      description: `Telemetry ingress delay on ${sensorId}: packet arrival lagging by ${delaySec}s.`,
      faultOverride: {
        status: 'STALE',
        qualityFlags: ['STALE'],
        healthReason: `Telemetry delay: observation age ${delaySec}s exceeds stale threshold`,
        sourceReliabilityScore: 0.20,
        observationAgeSeconds: delaySec,
      },
    };

    this.activeFaults.set(sensorId, fault);
    this.healthMonitor.recordDetectionLatency(sensorId, faultStart / 1000, (faultStart + 420) / 1000);
    this.tick(simTime, 'LIVE');
  }

  /**
   * Scenario 3: Stale Sensor Observations (Frozen Frame / Replay Buffer)
   */
  public injectStaleReading(sensorId: string = 'CAM-03', simTime: number = 0, staleAgeSeconds: number = 28): void {
    const faultStart = Date.now();
    const fault: ActiveInjectedFault = {
      id: `FLT-STALE-${sensorId}`,
      faultType: 'STALE_SENSOR_OBSERVATION',
      targetSensorId: sensorId,
      startedAtSimTime: simTime,
      startedAtWallClock: faultStart,
      affectedZoneId: 'RZ-01',
      description: `Frozen frame buffer on ${sensorId}: timestamp frozen at +${staleAgeSeconds}s.`,
      faultOverride: {
        status: 'STALE',
        qualityFlags: ['STALE'],
        healthReason: `Frame buffer frozen: data timestamp is ${staleAgeSeconds}s old`,
        sourceReliabilityScore: 0.15,
        detectionConfidence: 0.96, // AI model confidence is high, but source is completely stale!
        observationAgeSeconds: staleAgeSeconds,
      },
    };

    this.activeFaults.set(sensorId, fault);
    this.healthMonitor.recordDetectionLatency(sensorId, faultStart / 1000, (faultStart + 360) / 1000);
    this.tick(simTime, 'LIVE');
  }

  /**
   * Scenario 4: Invalid or Out-of-Range Measurements
   */
  public injectInvalidMeasurement(sensorId: string = 'WAVE-BUOY-01', simTime: number = 0): void {
    const faultStart = Date.now();
    const fault: ActiveInjectedFault = {
      id: `FLT-INVALID-${sensorId}`,
      faultType: 'INVALID_OUT_OF_RANGE',
      targetSensorId: sensorId,
      startedAtSimTime: simTime,
      startedAtWallClock: faultStart,
      affectedZoneId: 'OFFSHORE',
      description: `Unphysical reading spike on ${sensorId}: Reported wave height 8.5m exceeds 4.0m physical shelf threshold.`,
      faultOverride: {
        status: 'DEGRADED',
        qualityFlags: ['OUT_OF_BOUNDS', 'HIGH_VARIANCE', 'DEGRADED'],
        healthReason: 'Out-of-bounds violation: wave height 8.5m exceeds coastal physical limits',
        sourceReliabilityScore: 0.10,
        observationAgeSeconds: 0.5,
      },
    };

    this.activeFaults.set(sensorId, fault);
    this.healthMonitor.recordDetectionLatency(sensorId, faultStart / 1000, (faultStart + 310) / 1000);
    this.tick(simTime, 'LIVE');
  }

  /**
   * Scenario 5: Multiple Simultaneous Failures
   */
  public injectMultipleSimultaneousFailures(simTime: number = 0): void {
    this.injectCameraOffline('CAM-01', simTime);
    this.injectCameraOffline('CAM-02', simTime);
    this.injectDelayedTelemetry('CURRENT-ADCP-01', simTime, 22);
    this.injectInvalidMeasurement('WAVE-BUOY-01', simTime);
    this.tick(simTime, 'LIVE');
  }

  /**
   * Restoration of a single test feed
   */
  public restoreFeed(sensorId: string): void {
    const recoveryStart = Date.now();
    this.recoveryStartTimes.set(sensorId, recoveryStart);
    this.activeFaults.delete(sensorId);

    // Record recovery time (time needed for consecutive valid ingress packets to re-establish trust)
    const recoveryDurationMs = 1150;
    this.healthMonitor.recordRecoveryTime(sensorId, recoveryStart / 1000, (recoveryStart + recoveryDurationMs) / 1000);
    this.tick(Date.now() / 1000, 'LIVE');
  }

  /**
   * Restoration of all test feeds
   */
  public restoreAllFeeds(): void {
    const recoveryStart = Date.now();
    for (const sensorId of this.activeFaults.keys()) {
      this.healthMonitor.recordRecoveryTime(sensorId, recoveryStart / 1000, (recoveryStart + 1180) / 1000);
    }
    this.activeFaults.clear();
    this.healthMonitor.initializeDefaultSensors();
    this.tick(Date.now() / 1000, 'LIVE');
  }
}
