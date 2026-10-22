import { CoastalCurrentImpact } from './CurrentField';
import type { RiskForecastState } from './RiskForecast';

export type RiskCategory = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type LevelGrade = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface ZoneRiskAssessment {
  zoneId: string;
  zoneName: string;
  
  // 4 Core Pillars of Risk
  hazardGrade: LevelGrade;
  hazardScore: number;       // 0 - 100
  primaryHazard: string;

  exposureGrade: LevelGrade;
  exposureScore: number;     // 0 - 100
  swimmerCount: number;
  crowdDensity: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';

  vulnerabilityGrade: LevelGrade;
  vulnerabilityScore: number; // 0 - 100

  responseGrade: LevelGrade; // 'LOW' capacity = higher operational risk
  responseScore: number;     // 0 - 100 (coverage capacity)
  lifeguardsAvailable: number;
  lifeguardsTotal: number;

  // Synthesized Operational Risk
  overallScore: number;      // 0 - 100 (e.g. 87/100)
  category: RiskCategory;    // LOW, MODERATE, HIGH, CRITICAL
  confidence: number;        // e.g. 0.91
  reason: string;            // e.g. "Strong offshore current with high swimmer density"
  contributingFactors: string[];
}

export interface BeachRiskOverview {
  overallBeachRiskScore: number;
  overallCategory: RiskCategory;
  highestRiskZoneId: string;
  zoneAssessments: Record<string, ZoneRiskAssessment>;
  currentImpact?: CoastalCurrentImpact;
  forecast?: RiskForecastState;
  timestamp: string;
}
