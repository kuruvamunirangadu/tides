export interface CrowdDetection {
  cameraId: string;
  zoneId: string;
  peopleCount: number;
  swimmerCount: number;
  area: number; // m²
  density: number; // persons / m²
  level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  confidence: number;
  timestamp: number;
}
