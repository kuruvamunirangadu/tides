export type BehaviorCategory =
  | 'CAUTIOUS'
  | 'NORMAL'
  | 'RISK_TAKING'
  | 'UNAWARE'
  | 'DISTRESSED'
  | 'WARNING_IGNORER';

export interface BehaviorProfile {
  category: BehaviorCategory;
  name: string;
  riskTolerance: number; // 0.0 - 1.0
  warningResponse: number; // 0.0 - 1.0 (Higher = more compliant)
  restrictedEntryProbability: number; // 0.0 - 1.0
  warningIgnoreProbability: number; // 0.0 - 1.0
  distressProbability: number; // 0.0 - 1.0
  swimmingPreference: number; // 0.0 (beach only) to 1.0 (avid swimmer)
  awareness: number; // 0.0 (oblivious) to 1.0 (highly observant)
}
