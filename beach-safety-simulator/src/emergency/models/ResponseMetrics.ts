export interface ResponseMetrics {
  incidentId: string;
  incidentType: string;
  severity: string;
  detectionTime: number; // sec between incident onset and detection
  decisionTime: number; // sec between detection and dispatch decision
  dispatchTime: number; // sec between decision and asset departure
  arrivalTime: number; // sec of transit
  rescueTime?: number; // sec for on-scene intervention and extraction
  resolutionTime?: number; // sec from person secured to full recovery
  totalResponseTime: number; // total end-to-end seconds
}

export interface PerformanceAnalytics {
  averageDetectionTime: number;
  averageDecisionTime: number;
  averageDispatchTime: number;
  averageArrivalTime: number;
  averageRescueTime: number;
  averageTotalResponseTime: number;
  lifeguardUtilization: number; // percentage (0-100%)
  droneUtilization: number;
  boatUtilization: number;
  ambulanceUtilization: number;
  policeUtilization: number;
  incidentResolutionRate: number; // percentage (0-100%)
  escalationRate: number;
  totalIncidentsResolved: number;
  totalIncidentsEscalated: number;
}
