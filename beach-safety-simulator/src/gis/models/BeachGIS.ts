import { GeoPoint } from './GeoPoint';
import { GeoPolygon, GeoLine } from './GeoPolygon';
import { BeachZoneGIS } from './BeachZoneGIS';
import { EvacuationRouteGIS, AssemblyPointGIS, AccessPointGIS } from './EvacuationRouteGIS';

export interface LifeguardStationGIS {
  id: string;
  name: string;
  location: GeoPoint;
  coverageRadiusMeters: number;
  status: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE';
  assignedLifeguardIds: string[];
  equipment: string[]; // e.g. ["RESCUE_TUBE", "DEFIBRILLATOR", "SURFBOARD", "BINOCULARS"]
}

export type EmergencyPointGISType =
  | 'FIRST_AID'
  | 'AED'
  | 'EMERGENCY_PHONE'
  | 'RESCUE_EQUIPMENT'
  | 'BOAT_LAUNCH'
  | 'DRONE_PAD';

export interface EmergencyPointGIS {
  id: string;
  name: string;
  type: EmergencyPointGISType;
  location: GeoPoint;
  accessible: boolean;
  notes?: string;
}

export interface CameraGIS {
  id: string;
  name: string;
  location: GeoPoint;
  coveragePolygon?: GeoPolygon;
  headingDegrees: number;
  fovDegrees: number;
  rangeMeters: number;
  isOnline: boolean;
}

export interface WarningBoardGIS {
  id: string;
  name: string;
  location: GeoPoint;
  displayMessage: string;
  color: string;
  isFlashing: boolean;
}

export interface MedicalFacilityGIS {
  id: string;
  name: string;
  location: GeoPoint;
  type: 'AMBULANCE_BAY' | 'FIRST_AID_CENTER' | 'DISTRICT_HOSPITAL';
  bedCapacity: number;
  availableAmbulances: number;
  distanceFromBeachMeters: number;
  transitTimeSeconds: number;
}

export interface BeachGIS {
  id: string;
  name: string;
  country: string;
  state: string;
  district?: string;
  center: GeoPoint;
  boundary: GeoPolygon;
  shoreline: GeoLine;
  dimensionsMeters: {
    width: number;
    length: number;
  };
  zones: BeachZoneGIS[];
  infrastructure: {
    lifeguardStations: LifeguardStationGIS[];
    emergencyPoints: EmergencyPointGIS[];
    cameras: CameraGIS[];
    warningBoards: WarningBoardGIS[];
    medicalFacilities: MedicalFacilityGIS[];
  };
  accessPoints: AccessPointGIS[];
  evacuationRoutes: EvacuationRouteGIS[];
  assemblyPoints: AssemblyPointGIS[];
}
