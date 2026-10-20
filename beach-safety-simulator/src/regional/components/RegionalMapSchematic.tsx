/**
 * src/regional/components/RegionalMapSchematic.tsx
 * Geographically honest schematic map of Andhra Pradesh coastline.
 * Plots configured beaches according to verified latitude/longitude coordinates.
 * Strictly avoids communicating status by color alone (uses icons & text badges).
 */

import React from 'react';
import { RegionalBeachRecord } from '../types';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Radio,
  HelpCircle,
  Shield,
  Layers,
  MapPin,
} from 'lucide-react';

interface RegionalMapSchematicProps {
  beaches: RegionalBeachRecord[];
  selectedBeachId: string;
  onSelectBeach: (beachId: string) => void;
}

export const RegionalMapSchematic: React.FC<RegionalMapSchematicProps> = ({
  beaches,
  selectedBeachId,
  onSelectBeach,
}) => {
  // AP Coastline bounding box roughly:
  // Lat: 13.5°N to 19.5°N (Span: 6.0 deg)
  // Lon: 79.5°E to 85.0°E (Span: 5.5 deg)
  const minLat = 13.5;
  const maxLat = 19.0;
  const minLon = 79.5;
  const maxLon = 84.5;

  // Project lat/lon to percentage inside SVG box
  // Note: Latitude increases upwards (Y = 100 - normLat), Longitude increases rightwards (X = normLon)
  const project = (lat: number, lon: number) => {
    const xPct = ((lon - minLon) / (maxLon - minLon)) * 100;
    const yPct = (1 - (lat - minLat) / (maxLat - minLat)) * 100;
    return {
      x: Math.max(10, Math.min(90, xPct)),
      y: Math.max(10, Math.min(90, yPct)),
    };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { icon: CheckCircle2, text: 'ACTIVE', color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/40' };
      case 'CAUTION':
        return { icon: AlertTriangle, text: 'CAUTION', color: 'text-amber-400', bg: 'bg-amber-500/20 border-amber-500/40' };
      case 'RESTRICTED':
        return { icon: XCircle, text: 'RESTRICTED', color: 'text-rose-400', bg: 'bg-rose-500/20 border-rose-500/40' };
      case 'EVACUATION':
        return { icon: AlertTriangle, text: 'EVACUATION', color: 'text-purple-400', bg: 'bg-purple-500/20 border-purple-500/40' };
      case 'OFFLINE':
        return { icon: Radio, text: 'OFFLINE', color: 'text-slate-400', bg: 'bg-slate-700/30 border-slate-600' };
      default:
        return { icon: HelpCircle, text: 'UNKNOWN', color: 'text-slate-500', bg: 'bg-slate-800/40 border-slate-700' };
    }
  };

  return (
    <div className="relative bg-slate-950/90 border border-slate-800 rounded-2xl p-4 overflow-hidden font-mono text-xs select-none shadow-xl">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg border border-cyan-500/40">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-white text-xs font-bold uppercase tracking-wider">
              Andhra Pradesh Coastal Sector Map
            </h3>
            <p className="text-[10px] text-slate-400">
              Honest Lat/Lon Schematic • 974 km Bay of Bengal Littoral Zone
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-700 text-cyan-300 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Rushikonda Connected
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
            7 Demo Sites
          </span>
        </div>
      </div>

      {/* SVG Map Container */}
      <div className="relative w-full h-80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-xl border border-slate-800/80 overflow-hidden flex items-center justify-center">
        {/* Background Grid Lines representing latitude/longitude parallels */}
        <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 pointer-events-none opacity-15">
          {Array.from({ length: 36 }).map((_, i) => (
            <div key={i} className="border-r border-b border-cyan-500/30" />
          ))}
        </div>

        {/* Schematic Coastline Curve of Andhra Pradesh (running from North-East Srikakulam down to South Nellore) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="apCoastGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#0284c7" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          {/* Stylized Bay of Bengal ocean wash on the right */}
          <path
            d="M 85 10 L 80 20 L 76 30 L 70 45 L 60 60 L 52 75 L 42 90 L 100 90 L 100 10 Z"
            fill="url(#apCoastGrad)"
            opacity="0.3"
          />
          {/* AP Shoreline Path */}
          <path
            d="M 85 10 Q 78 25 76 30 T 70 45 T 60 60 T 52 75 T 42 90"
            fill="none"
            stroke="#0891b2"
            strokeWidth="1.2"
            strokeDasharray="2 1"
          />
        </svg>

        {/* Geographic Compass Rose */}
        <div className="absolute top-3 right-3 p-2 bg-slate-900/80 border border-slate-800 rounded-xl text-[9px] text-slate-400 space-y-0.5 text-center pointer-events-none">
          <div className="text-cyan-400 font-bold">▲ N</div>
          <div>BAY OF BENGAL</div>
          <div className="text-[8px] text-slate-500">EAST COAST OF INDIA</div>
        </div>

        {/* Coastal Sector Labels */}
        <div className="absolute top-6 left-4 text-[9px] text-cyan-400/60 font-bold uppercase pointer-events-none">
          North AP Sector (Srikakulam / Vizag)
        </div>
        <div className="absolute top-36 left-4 text-[9px] text-cyan-400/60 font-bold uppercase pointer-events-none">
          Central AP Sector (Godavari / Krishna)
        </div>
        <div className="absolute bottom-6 left-4 text-[9px] text-cyan-400/60 font-bold uppercase pointer-events-none">
          South AP Sector (Bapatla / Nellore)
        </div>

        {/* Beach Marker Points */}
        {beaches.map((b) => {
          if (!b.location) return null;
          const { x, y } = project(b.location.latitude, b.location.longitude);
          const isSelected = b.beachId === selectedBeachId;
          const isRushikonda = b.beachId === 'RUSHIKONDA';
          const badge = getStatusBadge(b.status);
          const Icon = badge.icon;

          return (
            <div
              key={b.beachId}
              style={{ left: `${x}%`, top: `${y}%` }}
              onClick={() => onSelectBeach(b.beachId)}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-20"
            >
              {/* Pulse ripple for selected or connected beach */}
              {(isSelected || isRushikonda) && (
                <span
                  className={`absolute -inset-2 rounded-full animate-ping opacity-35 ${
                    isRushikonda ? 'bg-cyan-400' : 'bg-amber-400'
                  }`}
                />
              )}

              {/* Marker pin */}
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-xl transition-all shadow-lg ${
                  isSelected
                    ? 'bg-cyan-500 text-slate-950 font-black ring-2 ring-cyan-300 scale-110 z-30'
                    : isRushikonda
                    ? 'bg-slate-900 border-2 border-cyan-400 text-white hover:scale-105'
                    : 'bg-slate-900/90 border border-slate-700 text-slate-200 hover:border-slate-500 hover:scale-105'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${
                    isSelected ? 'text-slate-950' : badge.color
                  }`}
                />
                <span className="text-[10px] font-bold whitespace-nowrap">
                  {b.beachId === 'RUSHIKONDA' ? '★ Rushikonda' : b.name.split(',')[0]}
                </span>
                {isRushikonda && (
                  <span className="px-1 py-0.2 rounded bg-cyan-900 text-cyan-200 text-[8px] font-bold">
                    LIVE TWIN
                  </span>
                )}
                {!isRushikonda && (
                  <span className="px-1 py-0.2 rounded bg-slate-800 text-slate-400 text-[8px]">
                    DEMO
                  </span>
                )}
              </div>

              {/* Accessible tooltip on hover */}
              <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-40 text-[10px] pointer-events-none">
                <div className="font-bold text-white">{b.name}</div>
                <div className="text-slate-400">{b.district} District</div>
                <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-800">
                  <span className={badge.color}>{badge.text}</span>
                  <span className="text-slate-500">
                    {b.location.latitude.toFixed(2)}°N, {b.location.longitude.toFixed(2)}°E
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Map Legend (Accessible, non-color alone) */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-800 text-[10px] text-slate-400">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>ACTIVE (Open)</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>CAUTION (Rip Advisory)</span>
          </div>
          <div className="flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>RESTRICTED (Danger)</span>
          </div>
          <div className="flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 text-slate-400" />
            <span>OFFLINE (No Comms)</span>
          </div>
          <div className="flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            <span>UNKNOWN (Unmonitored)</span>
          </div>
        </div>
        <div className="text-slate-500 text-[9px]">
          Click any beach marker to inspect telemetry & fleet status.
        </div>
      </div>
    </div>
  );
};

