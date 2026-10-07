import { Position } from '../../models/Incident';

export type EmergencyResourceType =
  | 'LIFEGUARD'
  | 'RESCUE_BOAT'
  | 'DRONE'
  | 'POLICE'
  | 'AMBULANCE'
  | 'PA_SYSTEM'
  | 'LED_WARNING_BOARD'
  | 'EMERGENCY_VEHICLE';

export type EmergencyResourceStatus =
  | 'AVAILABLE'
  | 'DISPATCHED'
  | 'EN_ROUTE'
  | 'ON_SCENE'
  | 'BUSY'
  | 'RETURNING'
  | 'UNAVAILABLE';

export interface EmergencyResource {
  id: string;
  name: string;
  type: EmergencyResourceType;
  status: EmergencyResourceStatus;
  position: Position;
  basePosition: Position;
  targetPosition?: Position;
  speed: number; // pixels / second in simulation
  responseRadius: number; // effective operational range in pixels
  currentIncidentId?: string;
  currentDispatchId?: string;
  assignedAt?: number;
  arrivalTime?: number;
  batteryOrFuel?: number; // percentage (0-100%)
  payloadReady?: boolean; // e.g. flotation ring / medical kit
  color?: string;
}

export interface ResourceCapability {
  locate: boolean;
  warn: boolean;
  rescue: boolean;
  transport: boolean;
  medical: boolean;
  surveillance: boolean;
}
