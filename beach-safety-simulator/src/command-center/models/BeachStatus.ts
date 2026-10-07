export interface BeachStatus {
  beachId: string;
  name: string;
  location: { latitude: number; longitude: number };
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  riskScore: number; // 0-100
  activeHazards: number;
  activeIncidents: number;
  peopleExposed: number;
  peopleWarned: number;
  availableLifeguards: number;
  totalLifeguards: number;
  availableDrones: number;
  totalDrones: number;
  sensorHealth: number; // 0-100%
  cameraHealth: number; // 0-100%
  predictedRisk?: string; // e.g. "HIGH → CRITICAL (+10m)"
  predictedRiskScore?: number;
  lastUpdated: number;
  timeDisplay: string;
}
