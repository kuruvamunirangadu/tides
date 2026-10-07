import { Beach, BeachPresetId } from '../models/Beach';
import { DEFAULT_BEACH } from './beachConfig';

export interface CoastalPresetMeta {
  id: BeachPresetId;
  name: string;
  district: string;
  coordinates: { lat: number; lng: number };
  bathymetryType: 'EMBEDDED_TRENCH_REEF' | 'WIDE_FLAT_SHELF';
  description: string;
  trenchDepthMeters: number;
  ripChannels: Array<{ xStart: number; xEnd: number; intensity: number }>;
  defaultTideAmplitude: number;
  layout: Beach;
}

export const COASTAL_BEACH_PRESETS: Record<BeachPresetId, CoastalPresetMeta> = {
  RUSHIKONDA_VIZAG: {
    id: 'RUSHIKONDA_VIZAG',
    name: 'Rushikonda Blue Flag Beach',
    district: 'Visakhapatnam, Andhra Pradesh',
    coordinates: { lat: 17.7795, lng: 83.3885 },
    bathymetryType: 'EMBEDDED_TRENCH_REEF',
    description: 'Crescent cove flanked by rocky headlands with submerged reef trenches causing structural rip currents.',
    trenchDepthMeters: 3.8,
    ripChannels: [
      { xStart: 320, xEnd: 520, intensity: 1.2 },
    ],
    defaultTideAmplitude: 1.45,
    layout: {
      ...DEFAULT_BEACH,
      id: 'AP-RUSHIKONDA-01',
      presetId: 'RUSHIKONDA_VIZAG',
      name: 'Rushikonda Blue Flag Beach',
      locationName: 'Rushikonda Cove (17.7795°N, 83.3885°E)',
      coordinates: { lat: 17.7795, lng: 83.3885 },
      bathymetryType: 'EMBEDDED_TRENCH_REEF',
      trenchDepthMeters: 3.8,
    },
  },
  SURYALANKA_BAPATLA: {
    id: 'SURYALANKA_BAPATLA',
    name: 'Suryalanka / Bapatla Beach',
    district: 'Bapatla District, Andhra Pradesh',
    coordinates: { lat: 15.8345, lng: 80.5051 },
    bathymetryType: 'WIDE_FLAT_SHELF',
    description: 'Wide flat continental shelf with severe spring tidal recession and sudden bore runup over sand spits.',
    trenchDepthMeters: 1.8,
    ripChannels: [
      { xStart: 220, xEnd: 360, intensity: 0.8 },
    ],
    defaultTideAmplitude: 2.10,
    layout: {
      ...DEFAULT_BEACH,
      id: 'AP-SURYALANKA-02',
      presetId: 'SURYALANKA_BAPATLA',
      name: 'Suryalanka Beach (Bapatla Coast)',
      locationName: 'Bapatla Shelf (15.8345°N, 80.5051°E)',
      coordinates: { lat: 15.8345, lng: 80.5051 },
      bathymetryType: 'WIDE_FLAT_SHELF',
      trenchDepthMeters: 1.8,
    },
  },
};

