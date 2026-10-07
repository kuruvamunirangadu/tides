export type IncidentType =
  | 'DISTRESS'
  | 'RESTRICTED_ENTRY'
  | 'DRIFT'
  | 'CROWD'
  | 'MULTIPLE';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Position {
  x: number;
  y: number;
}

export interface DistressState {
  level: number; // 0.0 - 1.0 (Higher = more severe distress)
  cause: 'STRONG_CURRENT' | 'HIGH_WAVE' | 'FATIGUE' | 'CRAMP' | 'UNKNOWN';
  startedAt: number; // timestamp in simulation seconds
  location: Position;
  assistanceRequired: boolean;
}

export interface Incident {
  id: string;
  type: IncidentType;
  visitorIds: string[];
  zoneId: string;
  severity: IncidentSeverity;
  title: string;
  description: string;
  startedAt: number; // simulation timestamp
  location: Position;
  active: boolean;
  resolvedAt?: number;
}

export interface Warning {
  id: string;
  visitorId: string;
  hazardType: string;
  zoneId: string;
  timestamp: number;
}
