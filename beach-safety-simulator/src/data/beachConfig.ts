import { Beach } from '../models/Beach';
import { INITIAL_ZONES, INITIAL_LIFEGUARD_STATIONS, INITIAL_EMERGENCY_POINTS } from './zones';

export const DEFAULT_BEACH: Beach = {
  id: 'BEACH-AP-01',
  name: 'Digital Beach 2D Simulation',
  width: 960,
  height: 560,
  shorelineY: 250,
  zones: INITIAL_ZONES,
  lifeguardStations: INITIAL_LIFEGUARD_STATIONS,
  emergencyPoints: INITIAL_EMERGENCY_POINTS,
};
