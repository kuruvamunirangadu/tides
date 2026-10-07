import { GeoLine, GeoPolygon } from './GeoPolygon';
import { GeoPoint } from './GeoPoint';

export type RouteStatus = 'OPEN' | 'BLOCKED' | 'RECOMMENDED' | 'CONGESTED';

export interface EvacuationRouteGIS {
  id: string;
  name: string;
  geometry: GeoLine;
  startZoneId: string;
  destinationId: string;
  distanceMeters: number;
  estimatedTimeSeconds: number;
  capacity?: number;
  status: RouteStatus;
  blockageReason?: string;
}

export interface AssemblyPointGIS {
  id: string;
  name: string;
  location: GeoPoint;
  capacity: number;
  currentOccupancy: number;
  accessibleByAmbulance: boolean;
  facilities: string[]; // e.g. ["TRIAGE", "WATER", "COMMUNICATION"]
}

export interface AccessPointGIS {
  id: string;
  name: string;
  location: GeoPoint;
  type: 'PEDESTRIAN' | 'VEHICULAR' | 'BOAT_RAMP' | 'EMERGENCY_ONLY';
  isOpen: boolean;
}
