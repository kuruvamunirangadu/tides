export type HazardType =
  | 'HIGH_WAVES'
  | 'STRONG_CURRENTS'
  | 'RIP_CURRENT'
  | 'RAPID_TIDE_CHANGE'
  | 'DANGEROUS_SHOREBREAK'
  | 'RESTRICTED_AREA_EXPOSURE'
  | 'POOR_VISIBILITY'
  | 'WEATHER_HAZARD'
  | 'MARINE_WILDLIFE'
  | 'DEEP_WATER_HAZARD'
  | 'WATER_TEMPERATURE_HAZARD';

export type HazardSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface Hazard {
  id: string;
  type: HazardType;
  name: string;
  severity: HazardSeverity;
  affectedZoneIds: string[];
  description: string;
  reason: string;
  detectedAt: string; // e.g. "08:15"
  confidence: number; // 0.0 to 1.0
  active: boolean;
}
