/**
 * TIDES Impact Lab - Stage 1 & 2 Read-Only Telemetry, Reliability & Event Types
 * 
 * Strict specifications for Stage 2 (Demo B: Sensor & Camera Reliability Monitoring):
 * - Independent sensor health monitoring across cameras & IoT streams
 * - Configurable freshness thresholds per sensor category
 * - Clear distinction between STALE, OFFLINE, DEGRADED, and UNKNOWN
 * - Explicit separation of AI Model Detection Confidence from Sensor Stream Freshness
 * - Degraded-state detection for downstream dependent forecasts and vision alerts
 * - Evaluation test harness results
 */

export type DataQualityFlag =
  | 'VALID'
  | 'STALE'
  | 'MISSING'
  | 'DEGRADED'
  | 'OUT_OF_BOUNDS'
  | 'HIGH_VARIANCE'
  | 'CONFLICT'
  | 'DROPPED_FRAMES'
  | 'NO_OBSERVATIONS';

export type SensorOperationalStatus =
  | 'HEALTHY'
  | 'STALE'
  | 'OFFLINE'
  | 'DEGRADED'
  | 'UNKNOWN';

export type SensorCategory =
  | 'CCTV_CAMERA'
  | 'OCEAN_BUOY'
  | 'WEATHER_STATION'
  | 'ACOUSTIC_CURRENT_PROFILER'
  | 'TIDE_GAUGE'
  | 'GPS_TRACKER'
  | 'EXPERIMENTAL';

export interface FreshnessThresholdConfig {
  warningAgeSeconds: number;   // Threshold to flag latency warning
  staleAgeSeconds: number;     // Threshold to classify as STALE
  offlineAgeSeconds: number;   // Threshold to classify as OFFLINE
  requiredConsecutiveRecoveries: number; // Observations needed to confirm recovery
}

export interface SensorHealthRecord {
  sensorId: string;
  category: SensorCategory;
  name: string;
  zoneId?: string;
  zoneIds?: string[];
  lastObservationTimestamp: number | null; // null if no observations received (UNKNOWN)
  lastObservationTimeDisplay: string;
  observationAgeSeconds: number;
  status: SensorOperationalStatus;
  qualityFlags: DataQualityFlag[];
  healthReason: string;
  lastStatusTransitionSimTime: number;
  lastStatusTransitionTimeDisplay: string;
  consecutiveValidObservations: number;
  consecutiveInvalidObservations: number;
  detectionConfidence?: number;            // Raw AI model inference confidence (0.0 - 1.0)
  sourceReliabilityScore: number;         // Sensor stream physical integrity & freshness (0.0 - 1.0)
  isTestFaultInjected: boolean;           // True if affected by isolated test harness
  thresholds: FreshnessThresholdConfig;
}

export type DependentOutputStatus = 'NOMINAL' | 'DEGRADED' | 'UNAVAILABLE';

export interface DependentSafetyOutput {
  outputId: string;
  name: string;
  outputType: 'VISION_DETECTION' | 'RIP_FORECAST' | 'SWELL_WARNING' | 'GEOFENCE_ALERT' | 'TIDE_ADVISORY';
  affectedZoneId: string;
  requiredSensorIds: string[];
  status: DependentOutputStatus;
  primarySensorStatus: SensorOperationalStatus;
  rawAIConfidence?: number;               // Raw AI detection confidence from model
  sourceReliability: number;              // Physical telemetry source reliability
  degradationReason?: string;
  operationalRecommendation: string;
}

export interface ZoneTelemetry {
  zoneId: string;
  zoneName: string;
  zoneType: string;
  riskScore: number;
  riskCategory: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  hazardScore: number;
  visitorCount: number;
  swimmerCount: number;
  distressedCount: number;
  ripCurrentActive: boolean;
  ripVelocity: number;
}

export interface TelemetrySnapshot {
  snapshotId: string;
  runId: string;
  simTimeSeconds: number;
  timeDisplay: string;
  wallClockTimestamp: number;

  environment: {
    waveHeight: number;
    wavePeriod: number;
    windSpeed: number;
    windDirection: number;
    tideLevel: number;
    currentSpeed: number;
    currentDirection: number;
    ripProbability: number;
    waterTemperature: number;
  };

  ripCurrents: Array<{
    id: string;
    zoneId: string;
    velocity: number;
    severity: string;
    position: { x: number; y: number };
  }>;
  maxRipVelocity: number;
  activeHazardCount: number;

  overallRiskScore: number;
  zoneTelemetry: Record<string, ZoneTelemetry>;

  visitors: {
    total: number;
    onBeach: number;
    inWater: number;
    swimming: number;
    drifting: number;
    distressed: number;
    struggling: number;
    inRestrictedZone: number;
  };

  emergency: {
    activeIncidentCount: number;
    activeDecisionsCount: number;
    resourcesTotal: number;
    resourcesAvailable: number;
    resourcesDispatched: number;
    resourcesOnScene: number;
    activeBoardAlerts: number;
  };

  sensorHealth: {
    totalSensors: number;
    healthyCount: number;
    staleCount: number;
    offlineCount: number;
    degradedCount: number;
    overallSensorsOnlineRatio: number;
  };
}

export type TelemetryEventType =
  | 'HAZARD_THRESHOLD_CROSSED'
  | 'SWIMMER_DISTRESS_ONSET'
  | 'CV_DISTRESS_DETECTED'
  | 'ALERT_BROADCAST_GENERATED'
  | 'RESPONDER_ASSIGNED'
  | 'RESPONDER_DEPARTED'
  | 'RESPONDER_ARRIVED'
  | 'INCIDENT_RESOLVED'
  | 'RESTRICTED_ZONE_BREACH'
  | 'SENSOR_STALE_DETECTED'
  | 'SENSOR_OFFLINE_DETECTED'
  | 'SENSOR_RESTORED'
  | 'MANUAL_SCENARIO_INJECTED';

export interface TelemetryEvent {
  id: string;
  runId: string;
  incidentId?: string;
  visitorId?: string;
  responderId?: string;
  sensorId?: string;
  simTimeSeconds: number;
  timeDisplay: string;
  wallClockTimestamp: number;
  eventType: TelemetryEventType;
  sourceComponent:
    | 'HAZARD_ENGINE'
    | 'VISITOR_ENGINE'
    | 'VISION_ENGINE'
    | 'EMERGENCY_ENGINE'
    | 'DECISION_ENGINE'
    | 'IOT_ENGINE'
    | 'RELIABILITY_MONITOR';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface ImpactLabRunSession {
  runId: string;
  beachId: string;
  beachName: string;
  startedAtSimTime: number;
  startedAtWallClock: number;
  startedTimeDisplay: string;
  totalSnapshotsRecorded: number;
  totalEventsRecorded: number;
  samplingIntervalSec: number;
  isRecording: boolean;
}

export interface TestExecutionRecord {
  scenarioId: string;
  scenarioName: string;
  targetSensorId: string;
  injectedCondition: string;
  expectedStatus: SensorOperationalStatus;
  actualStatus: SensorOperationalStatus;
  detectionLatencySeconds: number;
  recoveryTimeSeconds?: number;
  dependentOutputsAffectedCount: number;
  misclassified: boolean;
  notes: string;
  passed: boolean;
  timestamp: string;
}
