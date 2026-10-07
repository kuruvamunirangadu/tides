import { Beach } from '../models/Beach';
import { Environment } from '../models/Environment';
import { EmergencyResource } from '../emergency/models/EmergencyResource';
import { BoardDisplayState } from '../emergency/communication/WarningBoardManager';
import { Camera } from '../vision/models/Camera';
import { Drone } from '../drones/models/Drone';
import { DroneCoverage } from '../drones/models/DroneCoverage';
import { RiskCategory } from '../models/Risk';

export interface RenderVisitorSnapshot {
  id: string;
  x: number;
  y: number;
  state: string;
  type: string;
  color?: string;
  speed?: number;
  vulnerability?: number;
  currentZone?: string;
}

export interface RenderHazardSnapshot {
  id: string;
  type: string;
  name: string;
  severity: string;
  affectedZoneIds: string[];
  description: string;
  reason: string;
  detectedAt: string;
  confidence: number;
  active: boolean;
}

export interface RenderZoneSnapshot {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  status: 'OPEN' | 'CAUTION' | 'CLOSED';
  riskScore: number;
  riskCategory: RiskCategory;
}

export interface RenderSnapshot {
  simulationTime: number;
  timeDisplay: string;
  snapshotVersion: number;
  beach: Beach;
  environment: Environment;
  visitors: RenderVisitorSnapshot[];
  hazards: RenderHazardSnapshot[];
  zones: RenderZoneSnapshot[];
  emergencyResources: EmergencyResource[];
  boardStates: BoardDisplayState[];
  cameras: Camera[];
  drones: Drone[];
  droneCoverages: DroneCoverage[];
  isNightMode: boolean;
  selectedVisitorId?: string;
  metrics: {
    fps: number;
    simTps: number;
    tickDurationMs: number;
    riskCalcDurationMs: number;
    renderDurationMs: number;
    cacheHitRate: number;
    totalVisitors: number;
    distressedCount: number;
  };
}
