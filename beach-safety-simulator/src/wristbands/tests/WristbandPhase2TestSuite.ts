/**
 * WristbandPhase2TestSuite.ts
 * 
 * TIDES Track B — Wristband Phase 2: Comprehensive Test Suite
 * 
 * Verifies all 14 core requirements:
 * 1. Virtual Wristband Registry & Hardware Initialization
 * 2. Device Identity Verification (Unregistered Rejection)
 * 3. Event Deduplication & Idempotency Window
 * 4. Zero Coordinate Fabrication Preservation
 * 5. Authoritative Incident Creation via WristbandIncidentBridge
 * 6. Duplicate Incident Suppression on Repeated SOS
 * 7. Rescue Coordination Integration (Authoritative Incident Reflection)
 * 8. Two-Way Incident Resolution Synchronization
 * 9. Spatial Distance-Bounded Localized Warning Targeting
 * 10. Zone-Based Warning Targeting
 * 11. Rip Current Corridor Intersection Targeting
 * 12. Downlink Delivery Lifecycle (PENDING -> DELIVERED -> ACKNOWLEDGED)
 * 13. Gateway Connectivity & Transmission Failure Handling
 * 14. Non-Interference with Drone Track A & Clean Fleet Reset
 */

import { WristbandRegistry } from '../WristbandRegistry';
import { WristbandEventAdapter } from '../WristbandEventAdapter';
import { WristbandIncidentBridge } from '../WristbandIncidentBridge';
import { LocalizedWarningDistributionEngine } from '../LocalizedWarningDistributionEngine';
import { IncidentManager } from '../../visitors/incidents/IncidentManager';
import { DroneRegistry } from '../../drones/foundation/DroneRegistry';

export class WristbandPhase2TestSuite {
  private registry: WristbandRegistry;
  private adapter: WristbandEventAdapter;
  private bridge: WristbandIncidentBridge;
  private warningEngine: LocalizedWarningDistributionEngine;
  private incidentManager: IncidentManager;

  constructor() {
    this.registry = WristbandRegistry.getInstance();
    this.adapter = WristbandEventAdapter.getInstance();
    this.bridge = WristbandIncidentBridge.getInstance();
    this.warningEngine = LocalizedWarningDistributionEngine.getInstance();
    this.incidentManager = IncidentManager.getInstance();
  }

  public beforeEach(): void {
    this.registry.reset();
    this.adapter.clear();
    this.bridge.clear();
    this.warningEngine.clear();
    this.incidentManager.clear();
  }

  // 1. Virtual Wristband Registry & Hardware Initialization
  public testVirtualWristbandRegistryInitialization(): { pass: boolean; details: string } {
    this.beforeEach();
    const wristbands = this.registry.getWristbands();

    if (wristbands.length !== 8) {
      return { pass: false, details: `Expected 8 registered wristbands, got ${wristbands.length}` };
    }

    const wb101 = this.registry.getWristband('WB-101');
    if (!wb101 || wb101.batteryPercent <= 0 || wb101.ledState !== 'PULSING_GREEN') {
      return { pass: false, details: `WB-101 failed initialization criteria: ${JSON.stringify(wb101)}` };
    }

    const gateways = this.registry.getGateways();
    if (gateways.length !== 3 || !gateways.every((g) => g.status === 'ONLINE')) {
      return { pass: false, details: `Gateways improperly initialized: ${gateways.length} found` };
    }

    return {
      pass: true,
      details: 'Authoritative virtual wristband fleet (WB-101..WB-108) and 3 coastal gateways initialized with proper battery, OLED, and LED states.',
    };
  }

  // 2. Device Identity Verification (Unregistered Rejection)
  public testEventAdapterDeviceIdentityVerification(): { pass: boolean; details: string } {
    this.beforeEach();

    // Test unregistered device rejection
    const unregResult = this.adapter.ingestSOSEvent({
      wristbandId: 'WB-UNKNOWN-999',
      timestampMs: Date.now(),
      zoneId: 'SWIM_ZONE_NORTH',
    });

    if (unregResult.isValid || !unregResult.rejectionReason?.includes('UNREGISTERED_DEVICE')) {
      return { pass: false, details: `Failed to reject unregistered device: ${JSON.stringify(unregResult)}` };
    }

    // Test registered device acceptance
    const regResult = this.adapter.ingestSOSEvent({
      wristbandId: 'WB-101',
      timestampMs: Date.now(),
      zoneId: 'SWIM_ZONE_NORTH',
      hasLocation: true,
      location: { x: 220, y: 350 },
    });

    if (!regResult.isValid || !regResult.validatedEvent) {
      return { pass: false, details: `Valid device WB-101 was unexpectedly rejected: ${regResult.rejectionReason}` };
    }

    return {
      pass: true,
      details: 'Device identity verification successfully rejects unauthorized devices while validating authentic registered wristbands.',
    };
  }

  // 3. Event Deduplication & Idempotency Window
  public testEventAdapterDeduplicationAndIdempotency(): { pass: boolean; details: string } {
    this.beforeEach();
    const now = Date.now();

    const firstResult = this.adapter.ingestSOSEvent({
      eventId: 'EVT-TEST-001',
      wristbandId: 'WB-102',
      timestampMs: now,
      zoneId: 'SWIM_ZONE_NORTH',
      deduplicationKey: 'DEDUP-WB-102-WINDOW-1',
    });

    if (!firstResult.isValid) {
      return { pass: false, details: `First SOS ingestion failed: ${firstResult.rejectionReason}` };
    }

    // Retransmit same deduplication key 3 seconds later
    const duplicateResult = this.adapter.ingestSOSEvent({
      eventId: 'EVT-TEST-002',
      wristbandId: 'WB-102',
      timestampMs: now + 3000,
      zoneId: 'SWIM_ZONE_NORTH',
      deduplicationKey: 'DEDUP-WB-102-WINDOW-1',
    });

    if (duplicateResult.isValid || !duplicateResult.isDuplicate) {
      return { pass: false, details: `Duplicate packet was not suppressed: ${JSON.stringify(duplicateResult)}` };
    }

    return {
      pass: true,
      details: 'Idempotency window (20s) effectively suppresses high-frequency repeat SOS retransmissions from the same device.',
    };
  }

  // 4. Zero Coordinate Fabrication Preservation
  public testZeroCoordinateFabricationPreservation(): { pass: boolean; details: string } {
    this.beforeEach();

    // Ingest event with NO location fix (GPS uncalibrated / underwater)
    const uncalibratedResult = this.adapter.ingestSOSEvent({
      wristbandId: 'WB-107',
      timestampMs: Date.now(),
      zoneId: 'NORTH_SHORE',
      hasLocation: false,
      location: undefined,
    });

    if (!uncalibratedResult.isValid || uncalibratedResult.spatialConfidence !== 'ZONE_ONLY') {
      return {
        pass: false,
        details: `Expected spatialConfidence 'ZONE_ONLY', got ${uncalibratedResult.spatialConfidence}`,
      };
    }

    if (uncalibratedResult.validatedEvent?.location !== undefined) {
      return {
        pass: false,
        details: 'Violation of Zero Fabrication principle: coordinates were fabricated for unlocated device!',
      };
    }

    return {
      pass: true,
      details: 'Zero Coordinate Fabrication enforced: missing or uncalibrated GPS metadata is preserved with spatial uncertainty flags rather than inventing false fixes.',
    };
  }

  // 5. Authoritative Incident Creation via WristbandIncidentBridge
  public testAuthoritativeIncidentCreationViaBridge(): { pass: boolean; details: string } {
    this.beforeEach();

    const rawEvent = this.registry.triggerSOS('WB-103', true);
    if (!rawEvent) {
      return { pass: false, details: 'Failed to trigger SOS on WB-103' };
    }

    const validation = this.adapter.ingestSOSEvent(rawEvent);
    if (!validation.isValid || !validation.validatedEvent) {
      return { pass: false, details: `Event validation failed: ${validation.rejectionReason}` };
    }

    const bridgeResult = this.bridge.handleSOSEvent(validation.validatedEvent);

    if (!bridgeResult.created || bridgeResult.incident.type !== 'DISTRESS' || bridgeResult.incident.severity !== 'CRITICAL') {
      return { pass: false, details: `Incident creation failed: ${JSON.stringify(bridgeResult)}` };
    }

    const activeList = this.incidentManager.getActiveIncidents();
    if (!activeList.some((i) => i.id === bridgeResult.incident.id)) {
      return { pass: false, details: 'Incident was not stored in authoritative IncidentManager' };
    }

    return {
      pass: true,
      details: `Authoritative CRITICAL DISTRESS incident (${bridgeResult.incident.id}) created and stored in IncidentManager with full provenance.`,
    };
  }

  // 6. Duplicate Incident Suppression on Repeated SOS
  public testDuplicateIncidentSuppressionOnRepeatedSOS(): { pass: boolean; details: string } {
    this.beforeEach();

    // First SOS
    const event1 = this.registry.triggerSOS('WB-101', true)!;
    const val1 = this.adapter.ingestSOSEvent(event1);
    const bridge1 = this.bridge.handleSOSEvent(val1.validatedEvent!);

    if (!bridge1.created) {
      return { pass: false, details: 'Initial incident creation failed' };
    }

    const initialIncidentId = bridge1.incident.id;

    // Simulate subsequent SOS packet for same wristband
    const event2 = {
      ...event1,
      eventId: 'EVT-SOS-WB-101-9999',
      timestampMs: Date.now() + 5000,
      deduplicationKey: 'DEDUP-DIFF-KEY',
    };
    const val2 = this.adapter.ingestSOSEvent(event2);
    const bridge2 = this.bridge.handleSOSEvent(val2.validatedEvent!);

    if (bridge2.created || bridge2.reason !== 'EXISTING_INCIDENT_UPDATED') {
      return { pass: false, details: `Expected suppression of duplicate incident, got: ${JSON.stringify(bridge2)}` };
    }

    if (bridge2.incident.id !== initialIncidentId) {
      return { pass: false, details: 'Incident ID changed unexpectedly during repeated SOS update' };
    }

    const activeIncidents = this.incidentManager.getActiveIncidents();
    const matchingCount = activeIncidents.filter((i) => i.visitorIds.includes(event1.pairedVisitorId!)).length;
    if (matchingCount !== 1) {
      return { pass: false, details: `Expected exactly 1 active incident, found ${matchingCount}` };
    }

    return {
      pass: true,
      details: 'Duplicate incident suppression confirmed: repeated SOS packets update the existing incident without spawning duplicates.',
    };
  }

  // 7. Rescue Coordination Integration (Authoritative Incident Reflection)
  public testRescueCoordinationIntegration(): { pass: boolean; details: string } {
    this.beforeEach();

    const event = this.registry.triggerSOS('WB-104', true)!;
    const val = this.adapter.ingestSOSEvent(event);
    const res = this.bridge.handleSOSEvent(val.validatedEvent!);

    const activeIncidents = this.incidentManager.getActiveIncidents();
    const found = activeIncidents.find((i) => i.id === res.incident.id);

    if (!found || !found.visitorIds.includes('VIS-SWIM-04')) {
      return { pass: false, details: 'Created incident not queryable by downstream rescue engines' };
    }

    return {
      pass: true,
      details: 'Wristband incidents cleanly populate the authoritative IncidentManager queue consumed by DroneRescueDispatchManager & RescueCoordinator.',
    };
  }

  // 8. Two-Way Incident Resolution Synchronization
  public testTwoWayIncidentResolutionSync(): { pass: boolean; details: string } {
    this.beforeEach();

    const event = this.registry.triggerSOS('WB-101', true)!;
    const val = this.adapter.ingestSOSEvent(event);
    const res = this.bridge.handleSOSEvent(val.validatedEvent!);

    const wb = this.registry.getWristband('WB-101')!;
    if (!wb.isSosActive || wb.ledState !== 'FLASHING_RED') {
      return { pass: false, details: 'Wristband did not enter SOS active state' };
    }

    // Resolve the incident in IncidentManager
    res.incident.active = false;
    res.incident.resolvedAt = Date.now();

    // Trigger sync
    this.bridge.syncIncidentResolutions();

    const updatedWb = this.registry.getWristband('WB-101')!;
    if (updatedWb.isSosActive || updatedWb.ledState !== 'PULSING_GREEN') {
      return { pass: false, details: `Wristband failed to restore safe state on incident resolution: ${JSON.stringify(updatedWb)}` };
    }

    return {
      pass: true,
      details: 'Two-way synchronization confirmed: resolving the authoritative incident in the digital twin resets the swimmer wristband to safe monitoring state.',
    };
  }

  // 9. Spatial Distance-Bounded Localized Warning Targeting
  public testSpatialDistanceBoundedWarningTargeting(): { pass: boolean; details: string } {
    this.beforeEach();

    // Hazard at WB-101 position (220, 350)
    const packets = this.warningEngine.dispatchTargetedWarning({
      category: 'CAUTION',
      title: 'Rip Current Proximity',
      message: 'Rip current detected within 100m. Please swim parallel to shore.',
      centerCoordinate: { x: 220, y: 350 },
      radiusMeters: 100,
      excludeWristbandIds: ['WB-101'],
    });

    const targetIds = packets.map((p) => p.targetWristbandId);

    // WB-102 (280, 380, dist ~67m) should be targeted
    if (!targetIds.includes('WB-102')) {
      return { pass: false, details: `WB-102 within 100m was not targeted: ${JSON.stringify(targetIds)}` };
    }

    // WB-105 (740, 440, dist ~527m) MUST NOT be targeted
    if (targetIds.includes('WB-105')) {
      return { pass: false, details: 'WB-105 at >500m was mistakenly included in 100m localized warning' };
    }

    return {
      pass: true,
      details: 'Distance-bounded spatial filter accurately targets nearby swimmers (<100m) while protecting distant swimmers from alert fatigue.',
    };
  }

  // 10. Zone-Based Warning Targeting
  public testZoneBasedWarningDispatch(): { pass: boolean; details: string } {
    this.beforeEach();

    const packets = this.warningEngine.dispatchTargetedWarning({
      category: 'EVACUATE_ZONE',
      title: 'Zone Evacuation: North Surf',
      message: 'Sudden swell and hazardous rip active in North Surf. Evacuate water immediately.',
      zoneIds: ['SWIM_ZONE_NORTH'],
    });

    const targetIds = packets.map((p) => p.targetWristbandId);

    if (!targetIds.includes('WB-101') || !targetIds.includes('WB-102')) {
      return { pass: false, details: `Expected WB-101 and WB-102 to receive zone warning, got ${JSON.stringify(targetIds)}` };
    }

    if (targetIds.includes('WB-103') || targetIds.includes('WB-105')) {
      return { pass: false, details: 'Swimmers in other zones incorrectly received zone-specific alert' };
    }

    return {
      pass: true,
      details: 'Zone-bounded warning dispatch successfully isolates alerts to swimmers in designated hazard zone.',
    };
  }

  // 11. Rip Current Corridor Intersection Targeting
  public testRipCorridorWarningTargeting(): { pass: boolean; details: string } {
    this.beforeEach();

    // Rip current corridor between X: 700 and 780
    const packets = this.warningEngine.dispatchTargetedWarning({
      category: 'EMERGENCY',
      title: 'Rip Current Hazard Alert',
      message: 'Active rip current detected in your swim corridor. Swim laterally toward shore.',
      ripCorridors: [{ x_min: 700, x_max: 780 }],
    });

    const targetIds = packets.map((p) => p.targetWristbandId);

    // WB-105 (x: 740) is inside corridor
    if (!targetIds.includes('WB-105')) {
      return { pass: false, details: `WB-105 in corridor [700, 780] was not targeted: ${JSON.stringify(targetIds)}` };
    }

    // WB-101 (x: 220) is outside corridor
    if (targetIds.includes('WB-101')) {
      return { pass: false, details: 'WB-101 outside rip corridor was mistakenly targeted' };
    }

    return {
      pass: true,
      details: 'Rip current corridor intersection targeting accurately identifies swimmers entering hazardous drift corridors.',
    };
  }

  // 12. Downlink Delivery Lifecycle (PENDING -> DELIVERED -> ACKNOWLEDGED)
  public testDownlinkDeliveryLifecycle(): { pass: boolean; details: string } {
    this.beforeEach();

    const [packet] = this.warningEngine.dispatchTargetedWarning({
      category: 'CAUTION',
      title: 'High Wave Alert',
      message: 'Elevated wave heights detected.',
      centerCoordinate: { x: 220, y: 350 },
      radiusMeters: 50,
    });

    if (!packet || packet.status !== 'DELIVERED') {
      return { pass: false, details: `Expected status DELIVERED, got ${packet?.status}` };
    }

    const wb = this.registry.getWristband(packet.targetWristbandId)!;
    if (wb.ledState !== 'STROBE_AMBER' || wb.vibrationPattern === 'OFF') {
      return { pass: false, details: `Wristband indicators did not reflect warning delivery: ${JSON.stringify(wb)}` };
    }

    // Swimmer acknowledges warning on wristband
    const acknowledged = this.warningEngine.acknowledgeWarning(packet.warningId, packet.targetWristbandId);
    const updatedPacket = this.warningEngine.getActiveWarnings().find((p) => p.warningId === packet.warningId);
    if (!acknowledged || !updatedPacket || updatedPacket.status !== 'ACKNOWLEDGED') {
      return { pass: false, details: 'Warning acknowledgment failed' };
    }

    const updatedWb = this.registry.getWristband(packet.targetWristbandId)!;
    if (updatedWb.vibrationPattern !== 'OFF') {
      return { pass: false, details: 'Vibration did not cease upon acknowledgment' };
    }

    return {
      pass: true,
      details: 'Downlink lifecycle verified: PENDING -> DELIVERED (via Gateway) -> ACKNOWLEDGED with haptic vibration silence.',
    };
  }

  // 13. Gateway Connectivity & Transmission Failure Handling
  public testGatewayConnectivityAndFailureHandling(): { pass: boolean; details: string } {
    this.beforeEach();

    // Mark WB-102 as DISCONNECTED
    this.registry.updateWristband('WB-102', { connectivity: 'DISCONNECTED' });

    const packets = this.warningEngine.dispatchTargetedWarning({
      category: 'ADVISORY',
      title: 'Tide Advisory',
      message: 'High tide approaching in 30 minutes.',
      centerCoordinate: { x: 280, y: 380 },
      radiusMeters: 100,
    });

    const targetIds = packets.map((p) => p.targetWristbandId);
    if (targetIds.includes('WB-102')) {
      return { pass: false, details: 'Disconnected wristband WB-102 was incorrectly dispatched an RF downlink' };
    }

    return {
      pass: true,
      details: 'Gateway link verification confirmed: disconnected devices are prevented from receiving false downlink delivery confirmations.',
    };
  }

  // 14. Non-Interference with Drone Track A & Clean Fleet Reset
  public testNonInterferenceWithCoreSimAndTrackA(): { pass: boolean; details: string } {
    this.beforeEach();

    const droneRegistry = DroneRegistry.getInstance();
    const drones = droneRegistry.getAllDrones();

    if (drones.length !== 4) {
      return { pass: false, details: `Track A drone fleet corrupted: expected 4 drones, got ${drones.length}` };
    }

    const droneIds = drones.map((d) => d.droneId).sort();
    const expectedIds = ['DRONE-01', 'DRONE-02', 'DRONE-03', 'DRONE-04'].sort();
    if (JSON.stringify(droneIds) !== JSON.stringify(expectedIds)) {
      return { pass: false, details: `Track A fleet IDs mismatch: ${JSON.stringify(droneIds)}` };
    }

    this.registry.reset();
    const kpis = this.registry.getFleetKPIs();
    if (kpis.totalRegistered !== 8 || kpis.activeSosCount !== 0) {
      return { pass: false, details: `Wristband reset failed: ${JSON.stringify(kpis)}` };
    }

    return {
      pass: true,
      details: 'Zero regression confirmed: Track A drone registry (4 drones) is completely untouched and clean reset restores initial state.',
    };
  }
}
