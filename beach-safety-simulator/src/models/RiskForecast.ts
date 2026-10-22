import type { RiskCategory } from './Risk';

export type ForecastTrend = 'RISING' | 'STABLE' | 'FALLING' | 'UNAVAILABLE';

export interface RiskForecastPoint {
  horizonSeconds: number;
  targetSimTime: number;
  score: number;
  category: RiskCategory;
  trend: ForecastTrend;
  status: 'AVAILABLE' | 'UNAVAILABLE';
  reason?: string;
}

export interface RegionalRiskForecast {
  zoneId: string;
  zoneName: string;
  currentScore: number;
  currentCategory: RiskCategory;
  visitorIds: string[];
  points: RiskForecastPoint[];
  source: 'SIMULATED' | 'MEASURED' | 'UNAVAILABLE';
  assumption: string;
}

export interface EarlyWarning {
  id: string;
  zoneId: string;
  horizonSeconds: number;
  severity: RiskCategory;
  message: string;
  acknowledged: boolean;
  active: boolean;
  source: 'SIMULATED' | 'MEASURED' | 'UNAVAILABLE';
}

export interface RiskForecastState {
  issuedSimTime: number;
  horizonsSeconds: number[];
  regions: RegionalRiskForecast[];
  warnings: EarlyWarning[];
  status: 'AVAILABLE' | 'UNAVAILABLE';
  provenance: 'SIMULATED' | 'MEASURED' | 'UNAVAILABLE';
  limitation: string;
}