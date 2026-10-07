import { Position } from '../../models/Incident';

export type EmergencyIncidentType =
  | 'SWIMMER_DISTRESS'
  | 'DROWNING_RISK'
  | 'MEDICAL'
  | 'MISSING_PERSON'
  | 'RESTRICTED_ZONE'
  | 'CROWD_EMERGENCY'
  | 'MULTIPLE_INCIDENT';

export type EmergencyIncidentStatus =
  | 'DETECTED'
  | 'ASSESSED'
  | 'DISPATCHING'
  | 'RESOURCES_EN_ROUTE'
  | 'ON_SCENE'
  | 'RESCUE_IN_PROGRESS'
  | 'PERSON_SECURED'
  | 'MEDICAL_ASSESSMENT'
  | 'RESOLVED'
  | 'ESCALATED';

export interface EmergencyIncident {
  id: string;
  type: EmergencyIncidentType;
  title: string;
  description: string;
  zoneId: string;
  location: Position;
  targetConfidence: number; // 0.0 - 1.0
  severity: 'LOW' | 'MEDIUM' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  status: EmergencyIncidentStatus;
  affectedVisitorIds: string[];
  assignedResourceIds: string[];
  createdAt: number;
  detectedAt: number;
  dispatchedAt?: number;
  arrivedAt?: number;
  rescueStartedAt?: number;
  personSecuredAt?: number;
  resolvedAt?: number;
  medicalEscalationRequired?: boolean;
}
