/**
 * DeviceReadinessManager.ts
 * 
 * TIDES Phase 5: Controlled Field Pilot & Real-World Validation Framework
 * 
 * Configurable preflight readiness checklists for all coastal safety assets:
 * - Wristband, Gateway, Camera, and Drone checklists
 * - Safety-critical check gating: blocks real-device tests when safety checks fail
 * - Preserves independent simulation runs with explicit labeling
 * - Tracks evidence references, assessor notes, and timestamps
 */

import {
  DeviceCategory,
  DeviceReadinessCheck,
  DeviceReadinessDossier,
  CheckStatus,
  PilotSession,
} from '../pilot.types';

export class DeviceReadinessManager {
  private static instance: DeviceReadinessManager | null = null;
  private dossiers: Map<string, DeviceReadinessDossier> = new Map();
  private changeListeners: Set<() => void> = new Set();

  public static getInstance(): DeviceReadinessManager {
    if (!DeviceReadinessManager.instance) {
      DeviceReadinessManager.instance = new DeviceReadinessManager();
    }
    return DeviceReadinessManager.instance;
  }

  constructor() {
    this.initializeDefaultDossiers();
  }

  public reset(): void {
    this.dossiers.clear();
    this.initializeDefaultDossiers();
    this.notifyChange();
  }

  public subscribeChange(listener: () => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  private notifyChange(): void {
    this.changeListeners.forEach((l) => {
      try {
        l();
      } catch (err) {
        console.error('Error in DeviceReadinessManager listener:', err);
      }
    });
  }

  public getAllDossiers(): DeviceReadinessDossier[] {
    return Array.from(this.dossiers.values());
  }

  public getDossier(deviceId: string): DeviceReadinessDossier | undefined {
    return this.dossiers.get(deviceId);
  }

  /**
   * Initializes standard preflight dossiers for Rushikonda fleet
   */
  public initializeDefaultDossiers(): void {
    // 1. Physical Prototype Wristband: HW-WB-001
    this.registerDossier({
      deviceId: 'HW-WB-001',
      deviceCategory: 'WRISTBAND',
      modelName: 'TIDES Safety Band (ESP32-S3 + SX1262)',
      provenance: 'HARDWARE',
      overallStatus: 'NOT_READY',
      lastUpdatedMs: Date.now(),
      checks: [
        {
          checkId: 'WB-ID-FW',
          category: 'WRISTBAND',
          name: 'Device Identity & Firmware Version',
          description: 'Verify SHA256 firmware hash and unique IEEE EUI device ID match registry.',
          isSafetyCritical: true,
          status: 'PASSED',
          assessedBy: 'TECH-LEAD-01',
          notes: 'Firmware v1.2.0-prod verified on ESP32-S3.',
        },
        {
          checkId: 'WB-BATT',
          category: 'WRISTBAND',
          name: 'Battery State of Charge',
          description: 'Verify battery voltage > 3.85V and capacity >= 70% before field deployment.',
          isSafetyCritical: true,
          status: 'PASSED',
          assessedBy: 'TECH-LEAD-01',
          notes: 'Measured 4.10V (92% SoC).',
        },
        {
          checkId: 'WB-BTN-SOS',
          category: 'WRISTBAND',
          name: 'Physical SOS Button Hold & Debounce',
          description: 'Verify sustained 1.2s push-button hold triggers emergency routine.',
          isSafetyCritical: true,
          status: 'PASSED',
          assessedBy: 'TECH-LEAD-01',
          notes: 'Oscilloscope confirmed clean active-low transition at 1220ms.',
        },
        {
          checkId: 'WB-FEEDBACK',
          category: 'WRISTBAND',
          name: 'LED & Haptic Feedback Actuation',
          description: 'Verify flashing red LED and eccentric motor pulse under alert mode.',
          isSafetyCritical: false,
          status: 'PASSED',
          assessedBy: 'TECH-LEAD-01',
          notes: 'Vibration pattern CADENCE_BURST tactile response verified.',
        },
        {
          checkId: 'WB-GW-LINK',
          category: 'WRISTBAND',
          name: 'RF LoRa Gateway Connectivity',
          description: 'Verify bi-directional communication with GW-TOWER-01 on 865.2 MHz.',
          isSafetyCritical: true,
          status: 'PASSED',
          assessedBy: 'TECH-LEAD-01',
          notes: 'RSSI -74 dBm, SNR +9.5 dB.',
        },
        {
          checkId: 'WB-ACK-RETRY',
          category: 'WRISTBAND',
          name: 'Downlink Acknowledgement & Retry',
          description: 'Verify device responds with MSG_ACK (0x04) within 500ms.',
          isSafetyCritical: false,
          status: 'PASSED',
          assessedBy: 'TECH-LEAD-01',
        },
        {
          checkId: 'WB-ENCLOSURE',
          category: 'WRISTBAND',
          name: 'IP68 Enclosure & O-Ring Seal Inspection',
          description: 'Inspect silicone gasket, ultrasonic weld, and tactile button diaphragm for tears.',
          isSafetyCritical: true,
          status: 'PASSED',
          assessedBy: 'QA-INSPECTOR-02',
          notes: 'Submerged bench pressure tested at 0.5 bar for 30 mins.',
          evidenceReference: 'DOC-ENV-IP68-001',
        },
      ],
    });

    // 2. Beach Gateway: GW-TOWER-01
    this.registerDossier({
      deviceId: 'GW-TOWER-01',
      deviceCategory: 'GATEWAY',
      modelName: 'Coastal LoRa Gateway Station (Tower A)',
      provenance: 'HARDWARE',
      overallStatus: 'READY',
      lastUpdatedMs: Date.now(),
      checks: [
        {
          checkId: 'GW-PWR',
          category: 'GATEWAY',
          name: 'Power & UPS Battery Backup',
          description: 'Verify primary mains power and 4-hour LiFePO4 UPS backup status.',
          isSafetyCritical: true,
          status: 'PASSED',
          assessedBy: 'SITE-OPS-01',
        },
        {
          checkId: 'GW-NET-RF',
          category: 'GATEWAY',
          name: 'RF Front-End & Ethernet Backhaul',
          description: 'Verify SX1302 concentrator sensitivity and 1 Gbps fiber/4G link.',
          isSafetyCritical: true,
          status: 'PASSED',
          assessedBy: 'SITE-OPS-01',
        },
        {
          checkId: 'GW-CLOCK-SYNC',
          category: 'GATEWAY',
          name: 'NTP & GPS PPS Clock Synchronization',
          description: 'Verify gateway timestamp jitter < 5ms against authoritative server.',
          isSafetyCritical: false,
          status: 'PASSED',
          assessedBy: 'SITE-OPS-01',
        },
        {
          checkId: 'GW-OFFLINE-BUF',
          category: 'GATEWAY',
          name: 'Resilient Offline Event Buffer',
          description: 'Verify non-volatile storage queues up to 1,000 packets during link loss.',
          isSafetyCritical: true,
          status: 'PASSED',
          assessedBy: 'SITE-OPS-01',
        },
      ],
    });

    // 3. Beach Camera: CAM-01
    this.registerDossier({
      deviceId: 'CAM-01',
      deviceCategory: 'CAMERA',
      modelName: 'HikVision Coastal PTZ 4K (Tower A)',
      provenance: 'SIMULATED',
      overallStatus: 'READY',
      lastUpdatedMs: Date.now(),
      checks: [
        {
          checkId: 'CAM-FEED-AVAIL',
          category: 'CAMERA',
          name: 'RTSP Feed & Ingestion Status',
          description: 'Verify frame capture at 15 FPS without dropped frame spikes.',
          isSafetyCritical: true,
          status: 'PASSED',
        },
        {
          checkId: 'CAM-TS-VALID',
          category: 'CAMERA',
          name: 'Frame Timestamp Validity',
          description: 'Verify camera frame timestamps are within 250ms of system clock.',
          isSafetyCritical: false,
          status: 'PASSED',
        },
        {
          checkId: 'CAM-GEO-REF',
          category: 'CAMERA',
          name: 'Georeferenced Homography Calibration',
          description: 'Verify beach coordinates projection matrix matches survey markers.',
          isSafetyCritical: true,
          status: 'PASSED',
        },
        {
          checkId: 'CAM-PRIVACY',
          category: 'CAMERA',
          name: 'Visitor Privacy Masking',
          description: 'Verify high-resolution pedestrian face blurring in public views.',
          isSafetyCritical: false,
          status: 'PASSED',
        },
      ],
    });

    // 4. Surveillance Drone: DRONE-01
    this.registerDossier({
      deviceId: 'DRONE-01',
      deviceCategory: 'DRONE',
      modelName: 'AeroScout Pro-4 (Coastal Spec)',
      provenance: 'SIMULATED',
      overallStatus: 'READY',
      lastUpdatedMs: Date.now(),
      checks: [
        {
          checkId: 'DRN-ID-MISSION',
          category: 'DRONE',
          name: 'Drone Identity & Registry Lock',
          description: 'Verify droneId registered and not currently assigned to conflicting missions.',
          isSafetyCritical: true,
          status: 'PASSED',
        },
        {
          checkId: 'DRN-BATT-TEL',
          category: 'DRONE',
          name: 'Battery Reserve (>= 30%) & Telemetry Freshness',
          description: 'Verify battery percentage and last telemetry packet < 3s ago.',
          isSafetyCritical: true,
          status: 'PASSED',
        },
        {
          checkId: 'DRN-PREFLIGHT-AUTH',
          category: 'DRONE',
          name: 'Operator Flight Authorization',
          description: 'Verify DGCA / Coast Guard airspace clearance and licensed drone pilot signoff.',
          isSafetyCritical: true,
          status: 'PASSED',
        },
        {
          checkId: 'DRN-RTH-GEOFENCE',
          category: 'DRONE',
          name: 'Return-To-Home & Geofence Boundaries',
          description: 'Verify RTH home pad coordinates and maximum coastal operational boundary.',
          isSafetyCritical: true,
          status: 'PASSED',
        },
      ],
    });

    this.recalculateAllOverallStatuses();
  }

  public registerDossier(dossier: DeviceReadinessDossier): void {
    this.dossiers.set(dossier.deviceId, dossier);
    this.recalculateOverallStatus(dossier);
    this.notifyChange();
  }

  public updateCheckStatus(
    deviceId: string,
    checkId: string,
    status: CheckStatus,
    assessorId: string,
    notes?: string,
    evidenceReference?: string
  ): boolean {
    const dossier = this.dossiers.get(deviceId);
    if (!dossier) return false;

    const check = dossier.checks.find((c) => c.checkId === checkId);
    if (!check) return false;

    check.status = status;
    check.assessedAtMs = Date.now();
    check.assessedBy = assessorId;
    if (notes !== undefined) check.notes = notes;
    if (evidenceReference !== undefined) check.evidenceReference = evidenceReference;

    dossier.lastUpdatedMs = Date.now();
    this.recalculateOverallStatus(dossier);
    this.notifyChange();
    return true;
  }

  private recalculateOverallStatus(dossier: DeviceReadinessDossier): void {
    const hasSafetyCriticalFailure = dossier.checks.some(
      (c) => c.isSafetyCritical && c.status === 'FAILED'
    );

    if (hasSafetyCriticalFailure) {
      dossier.overallStatus = 'BLOCKED';
      return;
    }

    const allChecked = dossier.checks.every(
      (c) => c.status === 'PASSED' || c.status === 'NOT_APPLICABLE'
    );

    dossier.overallStatus = allChecked ? 'READY' : 'NOT_READY';
  }

  private recalculateAllOverallStatuses(): void {
    for (const d of this.dossiers.values()) {
      this.recalculateOverallStatus(d);
    }
  }

  /**
   * Safety gating check: validates participating devices before a session starts
   */
  public validateDeviceReadinessForSession(session: PilotSession): {
    canStart: boolean;
    blockedDevices: string[];
    reasons: string[];
  } {
    const blockedDevices: string[] = [];
    const reasons: string[] = [];

    const allParticipantIds = [
      ...session.participatingWristbandIds,
      ...session.participatingGatewayIds,
      ...session.participatingCameraIds,
      ...session.participatingDroneIds,
    ];

    // For real field drills or evaluations, safety critical checks are strictly enforced
    const isLiveEvaluation =
      session.sessionType === 'CONTROLLED_FIELD_DRILL' ||
      session.sessionType === 'APPROVED_FIELD_EVALUATION';

    for (const devId of allParticipantIds) {
      const dossier = this.dossiers.get(devId);
      if (!dossier) continue;

      if (dossier.overallStatus === 'BLOCKED') {
        const failedChecks = dossier.checks
          .filter((c) => c.isSafetyCritical && c.status === 'FAILED')
          .map((c) => c.name);

        blockedDevices.push(devId);
        reasons.push(
          `Device ${devId} (${dossier.modelName}) has FAILED safety-critical checks: ${failedChecks.join(', ')}`
        );
      } else if (isLiveEvaluation && dossier.overallStatus !== 'READY') {
        blockedDevices.push(devId);
        reasons.push(
          `Live field session requires all checks PASSED for device ${devId} (current status: ${dossier.overallStatus})`
        );
      }
    }

    return {
      canStart: blockedDevices.length === 0,
      blockedDevices,
      reasons,
    };
  }
}

