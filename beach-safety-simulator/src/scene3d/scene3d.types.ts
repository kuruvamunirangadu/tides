import { Beach } from '../models/Beach';
import { Environment } from '../models/Environment';
import { Hazard } from '../models/Hazard';
import { Visitor } from '../models/Visitor';
import { BeachRiskOverview } from '../models/Risk';

export type CameraPresetType = 'overview' | 'shoreline' | 'ocean' | 'topdown';

export interface CameraPresetConfig {
  position: [number, number, number];
  target: [number, number, number];
  label: string;
  icon: string;
  description: string;
}

export interface Scene3DProps {
  beach: Beach;
  environment: Environment;
  isNightMode?: boolean;
  hazards?: Hazard[];
  visitors?: Visitor[];
  riskOverview?: BeachRiskOverview | null;
  className?: string;
  onExit3D?: () => void;
}

