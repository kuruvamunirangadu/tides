import { Zone } from '../models/Zone';
import { LifeguardStation } from '../models/LifeguardStation';
import { EmergencyPoint } from '../models/EmergencyPoint';

export const INITIAL_ZONES: Zone[] = [
  // 1. Dry Land Beach Zones (Top half: y = 0 to 240)
  {
    id: 'BZ-01',
    name: 'Zone A (North Beach)',
    type: 'BEACH_ZONE',
    x: 40,
    y: 110,
    width: 250,
    height: 120,
    status: 'OPEN',
    color: '#e2d4b7',
  },
  {
    id: 'BZ-02',
    name: 'Zone B (Central Beach)',
    type: 'BEACH_ZONE',
    x: 320,
    y: 110,
    width: 320,
    height: 120,
    status: 'OPEN',
    color: '#e2d4b7',
  },
  {
    id: 'BZ-03',
    name: 'Zone C (South Beach)',
    type: 'BEACH_ZONE',
    x: 670,
    y: 110,
    width: 250,
    height: 120,
    status: 'OPEN',
    color: '#e2d4b7',
  },

  // 2. Shoreline Strip (y = 230 to 270)
  {
    id: 'SL-01',
    name: 'Shoreline Intertidal',
    type: 'SHORELINE',
    x: 0,
    y: 235,
    width: 960,
    height: 35,
    status: 'OPEN',
    color: '#c9b79c',
  },

  // 3. Swimming Zones (In water: y = 280 to 450)
  {
    id: 'SZ-01',
    name: 'North Swimming Zone',
    type: 'SWIMMING',
    x: 60,
    y: 280,
    width: 280,
    height: 160,
    status: 'OPEN',
    color: '#38bdf8',
  },
  {
    id: 'SZ-02',
    name: 'Central Swimming Zone',
    type: 'SWIMMING',
    x: 380,
    y: 280,
    width: 280,
    height: 160,
    status: 'OPEN',
    color: '#38bdf8',
  },

  // 4. Restricted Danger Zone (In water: y = 280 to 520)
  {
    id: 'RZ-01',
    name: 'South Restricted Reef Zone',
    type: 'RESTRICTED',
    x: 700,
    y: 280,
    width: 220,
    height: 220,
    status: 'CLOSED',
    color: '#f87171',
  },

  // 5. Deep Outer Water Area (y = 450 to 560)
  {
    id: 'WA-01',
    name: 'Outer Water Area',
    type: 'WATER_AREA',
    x: 0,
    y: 450,
    width: 680,
    height: 110,
    status: 'OPEN',
    color: '#0284c7',
  },
];

export const INITIAL_LIFEGUARD_STATIONS: LifeguardStation[] = [
  {
    id: 'LG-01',
    name: 'Station 1 (North Tower)',
    position: { x: 180, y: 220 },
    status: 'ACTIVE',
    coverageRadius: 180,
  },
  {
    id: 'LG-02',
    name: 'Station 2 (Central Tower)',
    position: { x: 520, y: 220 },
    status: 'ACTIVE',
    coverageRadius: 180,
  },
  {
    id: 'LG-03',
    name: 'Station 3 (South Tower)',
    position: { x: 810, y: 220 },
    status: 'ACTIVE',
    coverageRadius: 180,
  },
];

export const INITIAL_EMERGENCY_POINTS: EmergencyPoint[] = [
  {
    id: 'EP-01',
    name: 'First Aid Post',
    type: 'FIRST_AID',
    x: 120,
    y: 45,
  },
  {
    id: 'EP-02',
    name: 'Ambulance Access Bay',
    type: 'AMBULANCE_ACCESS',
    x: 480,
    y: 40,
  },
  {
    id: 'EP-03',
    name: 'Rescue Equipment Depot',
    type: 'RESCUE_EQUIPMENT',
    x: 840,
    y: 45,
  },
];
