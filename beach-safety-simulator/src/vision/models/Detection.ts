export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type DetectionProvenance = 'SIMULATED' | 'ACTUAL';

export interface DetectedPerson {
  id: string;
  trackId?: string;
  bbox: BoundingBox;
  confidence: number;
  className: 'PERSON';
  cameraId: string;
  timestamp: number;
  groundTruthVisitorId: string;
  worldPosition: { x: number; y: number };
  inWater: boolean;
  provenance?: DetectionProvenance;
  isValid?: boolean;
  rejectionReason?: string;
}
