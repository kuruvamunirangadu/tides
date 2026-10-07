import { Position } from '../../models/Incident';

export type ResourceType =
  | 'LIFEGUARD'
  | 'DRONE'
  | 'PA_SYSTEM'
  | 'WARNING_DISPLAY'
  | 'EMERGENCY_POINT';

export type ResourceStatus =
  | 'AVAILABLE'
  | 'BUSY'
  | 'UNAVAILABLE'
  | 'DISPATCHED';

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  status: ResourceStatus;
  position: Position;
  targetPosition?: Position;
  coverageRadius: number; // in meters/pixels
  speed: number; // movement speed in pixels/sec
  currentIncidentId?: string;
  currentActionId?: string;
  estimatedResponseTime?: number; // ETA in seconds
  assignedZoneId?: string;
  batteryLevel?: number; // For drones (0-100%)
  payloadReady?: boolean; // For drones (flotation ring payload)
}

export interface ResourceState {
  resources: Resource[];
  totalLifeguards: number;
  availableLifeguards: number;
  totalDrones: number;
  availableDrones: number;
  paActive: boolean;
  warningDisplaysActive: boolean;
}
