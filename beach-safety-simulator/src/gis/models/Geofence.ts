import { GeoPolygon } from './GeoPolygon';
import { GeoPoint } from './GeoPoint';

export type GeofenceType =
  | 'RESTRICTED'
  | 'HIGH_RISK'
  | 'SWIMMING'
  | 'EVACUATION'
  | 'SAFE_ASSEMBLY'
  | 'DYNAMIC_HAZARD';

export type GeofenceActionType =
  | 'LOG_EVENT'
  | 'TRIGGER_SIREN'
  | 'DISPATCH_LIFEGUARD'
  | 'SEND_MOBILE_SMS'
  | 'ESCALATE_ZONE_RISK';

export interface GeofenceRule {
  id: string;
  triggerOn: 'ENTER' | 'EXIT' | 'DWELL';
  dwellThresholdSeconds?: number;
  action: GeofenceActionType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
}

export interface Geofence {
  id: string;
  name: string;
  type: GeofenceType;
  geometry: GeoPolygon;
  rules: GeofenceRule[];
  active: boolean;
  createdTime: number;
  expiryTime?: number; // For dynamic AI forecasted geofences
  source: 'MANUAL' | 'ZONE_MAP' | 'AI_FORECAST' | 'EMERGENCY_DIRECTIVE';
  color?: string;
}

export interface GeofenceBreachEvent {
  id: string;
  geofenceId: string;
  geofenceName: string;
  geofenceType: GeofenceType;
  visitorId: string;
  location: GeoPoint;
  timestamp: number;
  timeDisplay: string;
  eventType: 'ENTER' | 'EXIT' | 'DWELL_LIMIT_EXCEEDED';
  ruleTriggered: GeofenceRule;
  acknowledged: boolean;
}
