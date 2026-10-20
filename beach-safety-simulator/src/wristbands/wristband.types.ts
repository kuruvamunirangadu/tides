/**
 * wristband.types.ts
 * 
 * TIDES Track B — Wristband Phase 2: Incident Integration & Localized Warning Engine
 * 
 * Defines core models for:
 * - Simulated Swimmer Wristband fleet (hardware state, OLED, LED, haptics, battery)
 * - Coastal Gateway Stations (RF coverage, health, routing)
 * - Wristband SOS Event packets & Telemetry (preserving spatial uncertainty)
 * - Localized Warning Packets & targeting criteria
 */

export type WristbandId = string;

export type WristbandConnectivity = 'CONNECTED' | 'DEGRADED' | 'DISCONNECTED';

export type WristbandBatteryState = 'NORMAL' | 'LOW' | 'CRITICAL';

export type WristbandLedState =
  | 'OFF'
  | 'PULSING_GREEN'    // Safe monitoring
  | 'FLASHING_RED'     // Active SOS distress
  | 'STROBE_AMBER'     // Localized warning / hazard alert
  | 'RAPID_CYAN';      // Rescue dispatched / assistance approaching

export type WristbandVibrationPattern =
  | 'OFF'
  | 'SHORT_PULSE'      // Advisory / ping
  | 'PERSISTENT_ALARM' // High severity / SOS confirmation
  | 'CADENCE_BURST';   // Evacuate / imminent hazard

export type WristbandOledMessage =
  | 'SAFE - BEACH OPEN'
  | 'CAUTION - RIP DETECTED'
  | 'WARNING - HAZARD NEARBY'
  | 'EVACUATE WATER NOW'
  | 'SOS SENT - HELP IN ROUTE'
  | 'STANDBY - CONNECTING...';

export type WarningCategory = 'ADVISORY' | 'CAUTION' | 'EVACUATE_ZONE' | 'EMERGENCY';

export type WarningDeliveryStatus = 'PENDING' | 'DELIVERED' | 'ACKNOWLEDGED' | 'FAILED';

export type WristbandProvenance = 'SIMULATED' | 'HARDWARE';

export interface HardwareTelemetryMetadata {
  gatewayId: string;
  gatewayReceiptMs: number;
  rssiDbm: number;
  snrDb: number;
  batteryMv: number;
  rfFrequencyHz?: number;
  firmwareVersion?: string;
}

export interface WristbandTelemetry {
  batteryPercent: number;          // 0 - 100
  signalStrengthDbm: number;       // e.g. -65 dBm (good) to -115 dBm (poor)
  hasLocation: boolean;            // Mandatory truth: false if GPS fix unavailable
  latitude?: number;
  longitude?: number;
  simPosition?: { x: number; y: number };
  accuracyMeters?: number;         // e.g. 5m - 50m, undefined if no fix
  waterImmersion: boolean;         // Saltwater immersion sensor trigger
  headingDeg?: number;
  lastHeartbeatMs: number;
  // Hardware specific extensions
  hardwareMetadata?: HardwareTelemetryMetadata;
}

export interface SwimmerWristband {
  id: WristbandId;
  provenance?: WristbandProvenance; // Explicit distinction between Simulated and Hardware
  pairedVisitorId: string | null;
  pairedVisitorName: string | null;
  currentZone: string;
  connectivity: WristbandConnectivity;
  batteryPercent: number;
  batteryState: WristbandBatteryState;
  ledState: WristbandLedState;
  vibrationPattern: WristbandVibrationPattern;
  oledMessage: WristbandOledMessage;
  isSosActive: boolean;
  sosTriggeredAtMs: number | null;
  lastWarningReceived: LocalizedWarningPacket | null;
  lastAcknowledgedAtMs: number | null;
  lastTelemetryAtMs: number;
  telemetry: WristbandTelemetry;
}

export interface GatewayStation {
  id: string;
  name: string;
  position: { x: number; y: number };
  rangeMeters: number;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  connectedDeviceCount: number;
  packetsForwarded: number;
  lastPingMs: number;
}

export interface WristbandSOSEvent {
  eventId: string;
  wristbandId: WristbandId;
  pairedVisitorId: string | null;
  timestampMs: number;
  zoneId: string;
  location?: { x: number; y: number };
  hasLocation: boolean;
  accuracyMeters?: number;
  batteryPercent: number;
  telemetrySequence: number;
  deduplicationKey: string;
  isManualTrigger: boolean;
}

export interface LocalizedWarningPacket {
  warningId: string;
  originIncidentId?: string;
  targetWristbandId: WristbandId;
  targetVisitorId: string | null;
  category: WarningCategory;
  title: string;
  message: string;
  zoneId?: string;
  hazardCoordinate?: { x: number; y: number };
  warningRadiusMeters?: number;
  timestampMs: number;
  expiresAtMs: number;
  status: WarningDeliveryStatus;
  dispatchedByGatewayId: string;
  deliveredAtMs?: number;
  acknowledgedAtMs?: number;
  retryCount: number;
}

export interface WarningTargetingCriteria {
  originIncidentId?: string;
  category: WarningCategory;
  title: string;
  message: string;
  centerCoordinate?: { x: number; y: number };
  radiusMeters?: number;
  zoneIds?: string[];
  ripCorridors?: Array<{ x_min: number; x_max: number }>;
  excludeWristbandIds?: WristbandId[];
}

export interface WristbandFleetKPIs {
  totalRegistered: number;
  activeConnected: number;
  degradedCount: number;
  offlineCount: number;
  activeSosCount: number;
  activeWarningsDispatched: number;
  acknowledgmentRatePercent: number;
  averageBatteryPercent: number;
}

