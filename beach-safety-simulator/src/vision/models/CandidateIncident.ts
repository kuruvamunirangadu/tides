export type CandidateIncidentStatus = 'CANDIDATE_UNVERIFIED' | 'OPERATOR_CONFIRMED' | 'OPERATOR_DISMISSED';

export interface CandidateIncident {
  id: string;
  candidateType: 'POSSIBLE_DISTRESS' | 'RESTRICTED_ZONE_INCURSION' | 'DRIFT_RISK';
  trackIds: string[];
  cameraIds: string[];
  location: { x: number; y: number };
  confidence: number;
  status: CandidateIncidentStatus;
  supportingEvidence: string[];
  uncertaintyReasons: string[];
  requiresOperatorAction: boolean;
  autoDispatched: boolean; // STRICT SAFETY RULE: Always false for raw CV
  timestamp: number;
  decisionNotes?: string;
}

