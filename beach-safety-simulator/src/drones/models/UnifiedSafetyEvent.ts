import { GeoPoint } from '../../gis/models/GeoPoint';

export type DetectionSourceType = 'FIXED_CCTV' | 'DRONE_UAV' | 'IOT_SENSOR' | 'LIFEGUARD_REPORT' | 'SIMULATION_PHYSICS';

export interface DetectionSource {
  sourceType: DetectionSourceType;
  sourceId: string;
  confidence: number;
  observedAt: number;
  rawTrackId?: string;
  notes?: string;
}

export type UnifiedSafetyEventType =
  | 'PERSON_DETECTED'
  | 'DRIFTING_SWIMMER'
  | 'POSSIBLE_DISTRESS'
  | 'CONFIRMED_DROWNING'
  | 'RESTRICTED_ZONE_BREACH'
  | 'HIGH_RISK_CROWD_DENSITY';

export interface UnifiedSafetyEvent {
  id: string;
  type: UnifiedSafetyEventType;
  location: GeoPoint;
  canvasPosition: { x: number; y: number };
  zoneId: string;
  visitorId?: string;
  confidence: number; // 0.0 - 1.0 (Composite fused Bayesian score)
  sources: DetectionSource[];
  timestamp: number;
  timeDisplay: string;
  status: 'SUSPECTED' | 'CONFIRMED' | 'RESOLVED' | 'DISMISSED';
  verificationDetails?: {
    cctvConfidence?: number;
    droneConfidence?: number;
    verifiedByDrone: boolean;
    verificationLatencySec?: number;
  };
}
