import React from 'react';
import { BeachGIS } from '../models/BeachGIS';

interface BeachSelectorProps {
  beaches: BeachGIS[];
  selectedBeach: BeachGIS;
  onSelectBeach: (beachId: string) => void;
}

export const BeachSelector: React.FC<BeachSelectorProps> = ({
  beaches,
  selectedBeach,
  onSelectBeach,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-xs shadow-xl backdrop-blur-sm space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 text-xs">
          <span>🏖️</span> Selected Geographic Beach
        </span>
        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/50 px-2 py-0.5 rounded">
          WGS84 EPSG:4326
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <select
          value={selectedBeach.id}
          onChange={(e) => onSelectBeach(e.target.value)}
          className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 font-semibold text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none flex-1"
        >
          {beaches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.district})
            </option>
          ))}
        </select>
      </div>

      {/* Beach Metadata Readout */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-800/80 font-mono text-[10px] text-slate-400">
        <div>
          Center:{' '}
          <strong className="text-slate-200 block">
            {selectedBeach.center.latitude.toFixed(4)}°N, {selectedBeach.center.longitude.toFixed(4)}°E
          </strong>
        </div>
        <div>
          Zones:{' '}
          <strong className="text-cyan-300 block">{selectedBeach.zones.length} GIS Polygons</strong>
        </div>
        <div>
          Lifeguards:{' '}
          <strong className="text-emerald-300 block">
            {selectedBeach.infrastructure.lifeguardStations.length} Towers
          </strong>
        </div>
        <div>
          Cameras:{' '}
          <strong className="text-purple-300 block">
            {selectedBeach.infrastructure.cameras.length} CCTV Units
          </strong>
        </div>
      </div>
    </div>
  );
};
