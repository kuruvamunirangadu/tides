import { GeoPolygon } from './GeoPolygon';

export type ZoneGISType =
  | 'PUBLIC'
  | 'SWIMMING'
  | 'RESTRICTED'
  | 'HIGH_RISK'
  | 'EMERGENCY'
  | 'ASSEMBLY';

export type ZoneGISRiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface BeachZoneGIS {
  id: string;
  name: string;
  type: ZoneGISType;
  geometry: GeoPolygon;
  riskLevel: ZoneGISRiskLevel;
  accessAllowed: boolean;
  capacity?: number;
  active: boolean;
  color?: string;
  description?: string;
}
