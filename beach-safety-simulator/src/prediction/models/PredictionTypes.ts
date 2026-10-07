export type ForecastHorizon = '15m' | '30m' | '60m';

export type RiskTrend = 'RISING' | 'STABLE' | 'FALLING' | 'CRITICAL_SPIKE';

export interface RipCurrentForecast {
  zoneId: string;
  horizon: ForecastHorizon;
  probability: number; // 0 to 1
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  trend: RiskTrend;
  keyDrivers: string[];
  estimatedCurrentSpeedMs: number;
}

export interface WaveRiskForecast {
  zoneId: string;
  horizon: ForecastHorizon;
  predictedWaveHeightM: number;
  predictedWavePeriodS: number;
  shorebreakRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';
  trend: RiskTrend;
  keyDrivers: string[];
}

export interface CrowdRiskForecast {
  zoneId: string;
  horizon: ForecastHorizon;
  predictedTotalVisitors: number;
  predictedSwimmers: number;
  predictedDensity: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
  influxRatePerHour: number;
  trend: RiskTrend;
}

export interface DistressForecast {
  zoneId: string;
  horizon: ForecastHorizon;
  distressProbability: number; // 0 to 1
  estimatedDistressIncidents: number;
  highRiskCohort: 'CHILDREN' | 'ELDERLY' | 'WEAK_SWIMMERS' | 'GENERAL';
  contributingFactors: string[];
}

export interface ZoneRiskForecast {
  zoneId: string;
  zoneName: string;
  currentRiskScore: number;
  predictedRisk15m: number;
  predictedRisk30m: number;
  predictedRisk60m: number;
  riskTrend: RiskTrend;
  confidence: number; // 0 to 1
  primaryThreat: string;
  recommendedAction: string;
}

export interface PredictiveAlert {
  id: string;
  zoneId: string;
  timestamp: number;
  horizon: ForecastHorizon;
  severity: 'ADVISORY' | 'WARNING' | 'EMERGENCY_PROJECTION';
  message: string;
  leadTimeToSpikeMinutes: number;
  preventativeMeasures: string[];
}

export interface PredictionState {
  timestamp: number;
  ripForecasts: RipCurrentForecast[];
  waveForecasts: WaveRiskForecast[];
  crowdForecasts: CrowdRiskForecast[];
  distressForecasts: DistressForecast[];
  zoneForecasts: ZoneRiskForecast[];
  alerts: PredictiveAlert[];
  overallBeachRiskTrend: RiskTrend;
  modelConfidence: number;
}
