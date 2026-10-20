/**
 * DegradedOutputDetector.ts
 * 
 * TIDES Stage 2: Reliability-Aware Output Status Interface (Demo B)
 * 
 * Maps physical sensors and camera feeds to downstream safety outputs:
 * - Computer Vision person detection & distress verification
 * - Hydrodynamic rip current forecasting
 * - Offshore wave swell alerts
 * - Geofence intrusion tracking
 * 
 * Core architectural rule:
 * - When an underlying sensor fails or becomes stale, the dependent output
 *   is explicitly marked DEGRADED or UNAVAILABLE.
 * - Stale readings are NEVER silently substituted as live observations.
 * - Raw AI model confidence is kept strictly separate from source physical reliability.
 */

import { SensorHealthMonitor } from './SensorHealthMonitor';
import {
  DependentSafetyOutput,
  DependentOutputStatus,
  SensorHealthRecord,
} from '../types';

export class DegradedOutputDetector {
  private static instance: DegradedOutputDetector | null = null;

  private healthMonitor: SensorHealthMonitor;

  // Registered downstream safety outputs dependent on sensors
  private outputDefinitions: Array<{
    outputId: string;
    name: string;
    outputType: DependentSafetyOutput['outputType'];
    affectedZoneId: string;
    requiredSensorIds: string[];
    defaultAIConfidence?: number;
  }> = [
    {
      outputId: 'OUT-VISION-ZONE-A',
      name: 'Zone A Swimmer Detection & Crowd Density',
      outputType: 'VISION_DETECTION',
      affectedZoneId: 'SZ-01',
      requiredSensorIds: ['CAM-01'],
      defaultAIConfidence: 0.94,
    },
    {
      outputId: 'OUT-VISION-ZONE-B',
      name: 'Zone B Deep Water Distress Verification',
      outputType: 'VISION_DETECTION',
      affectedZoneId: 'SZ-02',
      requiredSensorIds: ['CAM-02'],
      defaultAIConfidence: 0.98,
    },
    {
      outputId: 'OUT-VISION-ZONE-C',
      name: 'Zone C North Cliff Restricted Intruder Tracking',
      outputType: 'GEOFENCE_ALERT',
      affectedZoneId: 'RZ-01',
      requiredSensorIds: ['CAM-03'],
      defaultAIConfidence: 0.92,
    },
    {
      outputId: 'OUT-VISION-PROMENADE',
      name: 'Promenade Beachhead Crowd Flow Analysis',
      outputType: 'VISION_DETECTION',
      affectedZoneId: 'BZ-01',
      requiredSensorIds: ['CAM-04'],
      defaultAIConfidence: 0.90,
    },
    {
      outputId: 'OUT-FORECAST-RIP',
      name: 'Hydrodynamic Rip-Current Intensification Forecast',
      outputType: 'RIP_FORECAST',
      affectedZoneId: 'SZ-02',
      requiredSensorIds: ['CURRENT-ADCP-01', 'CAM-02'],
      defaultAIConfidence: 0.88,
    },
    {
      outputId: 'OUT-FORECAST-WAVE',
      name: 'Offshore Swell & Dangerous Shorebreak Warning',
      outputType: 'SWELL_WARNING',
      affectedZoneId: 'OFFSHORE',
      requiredSensorIds: ['WAVE-BUOY-01'],
      defaultAIConfidence: undefined,
    },
    {
      outputId: 'OUT-ADVISORY-WEATHER',
      name: 'Coastal Gale & Poor Visibility Alert',
      outputType: 'TIDE_ADVISORY',
      affectedZoneId: 'BEACH_SHORE',
      requiredSensorIds: ['WEATHER-AWS-01'],
      defaultAIConfidence: undefined,
    },
  ];

  public static getInstance(): DegradedOutputDetector {
    if (!DegradedOutputDetector.instance) {
      DegradedOutputDetector.instance = new DegradedOutputDetector();
    }
    return DegradedOutputDetector.instance;
  }

  constructor() {
    this.healthMonitor = SensorHealthMonitor.getInstance();
  }

  /**
   * Evaluates all dependent outputs against current sensor health statuses
   */
  public evaluateDependentOutputs(): DependentSafetyOutput[] {
    const allSensors = this.healthMonitor.getAllSensors();
    const sensorMap = new Map<string, SensorHealthRecord>();
    allSensors.forEach((s) => sensorMap.set(s.sensorId, s));

    return this.outputDefinitions.map((def) => {
      const depSensors = def.requiredSensorIds.map((id) => sensorMap.get(id)).filter(Boolean) as SensorHealthRecord[];

      // Check for any offline or missing sensor
      const offlineSensor = depSensors.find((s) => s.status === 'OFFLINE' || s.status === 'UNKNOWN');
      // Check for stale sensor
      const staleSensor = depSensors.find((s) => s.status === 'STALE');
      // Check for degraded sensor
      const degradedSensor = depSensors.find((s) => s.status === 'DEGRADED');

      let status: DependentOutputStatus = 'NOMINAL';
      let primaryStatus = depSensors[0]?.status || 'HEALTHY';
      let degradationReason: string | undefined = undefined;
      let recommendation = 'Nominal automated processing active. All data feeds verified.';

      // Minimum reliability across dependent sensors
      const sourceReliability = depSensors.length > 0
        ? Math.min(...depSensors.map((s) => s.sourceReliabilityScore))
        : 1.0;

      if (offlineSensor) {
        status = 'UNAVAILABLE';
        primaryStatus = offlineSensor.status;
        degradationReason = `Primary source ${offlineSensor.name} (${offlineSensor.sensorId}) is ${offlineSensor.status}. Feed unreachable. Automated output halted.`;
        recommendation = `SUSPEND AUTOMATED RELIANCE: Dispatch handheld lifeguard patrol or UAV-01 aerial inspection to ${def.affectedZoneId}.`;
      } else if (staleSensor) {
        status = 'DEGRADED';
        primaryStatus = 'STALE';
        degradationReason = `Source ${staleSensor.name} is STALE (telemetry age: ${staleSensor.observationAgeSeconds.toFixed(1)}s). AI model confidence preserved as diagnostic reference, but output marked DEGRADED.`;
        recommendation = `CROSS-VERIFY: Request verbal visual confirmation from Lifeguard Tower covering ${def.affectedZoneId}.`;
      } else if (degradedSensor) {
        status = 'DEGRADED';
        primaryStatus = 'DEGRADED';
        degradationReason = `Source ${degradedSensor.name} is DEGRADED (${degradedSensor.healthReason}). Quality flags: [${degradedSensor.qualityFlags.join(', ')}].`;
        recommendation = `EVALUATE UNCERTAINTY: Sensor variance elevated; verify trend against secondary sensors.`;
      }

      return {
        outputId: def.outputId,
        name: def.name,
        outputType: def.outputType,
        affectedZoneId: def.affectedZoneId,
        requiredSensorIds: def.requiredSensorIds,
        status,
        primarySensorStatus: primaryStatus,
        rawAIConfidence: def.defaultAIConfidence,
        sourceReliability,
        degradationReason,
        operationalRecommendation: recommendation,
      };
    });
  }
}

