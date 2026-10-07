export type CVSafetyEventType =
  | 'PERSON_DETECTED'
  | 'CROWD_SURGE'
  | 'RESTRICTED_ZONE_ENTRY'
  | 'DRIFTING_DETECTED'
  | 'ABNORMAL_MOVEMENT'
  | 'POSSIBLE_DISTRESS';

export interface CVSafetyEvent {
  id: string;
  type: CVSafetyEventType;
  trackIds: string[];
  groundTruthVisitorIds: string[];
  cameraId: string;
  zoneId?: string;
  confidence: number;
  timestamp: number;
  timeDisplay: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  metadata?: Record<string, unknown>;
}
