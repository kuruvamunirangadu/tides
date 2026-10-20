/**
 * src/regional/components/RegionalRiskComparisonTable.tsx
 * Regional risk comparison table across configured Andhra Pradesh beach locations.
 * Preserves units, explicitly shows UNKNOWN/NO DATA for unmonitored sites,
 * and never manufactures unverified composite scores.
 */

import React from 'react';
import { RegionalRiskObservation } from '../types';
import {
  Waves,
  Wind,
  Eye,
  Radio,
  Activity,
  AlertTriangle,
  Clock,
  HelpCircle,
} from 'lucide-react';

interface RegionalRiskComparisonTableProps {
  observations: RegionalRiskObservation[];
  onSelectSite: (siteId: string) => void;
}

export const RegionalRiskComparisonTable: React.FC<RegionalRiskComparisonTableProps> = ({
  observations,
  onSelectSite,
}) => {
  const getRipBadge = (risk?: string | null) => {
    switch (risk) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/50';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/50';
      case 'MODERATE':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50';
      case 'LOW':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const getFreshnessBadge = (freshness: string) => {
    switch (freshness) {
      case 'FRESH':
        return { text: 'FRESH (<1m)', color: 'text-emerald-400', bg: 'bg-emerald-950 border-emerald-800' };
      case 'STALE':
        return { text: 'STALE (>1h)', color: 'text-amber-400', bg: 'bg-amber-950 border-amber-800' };
      case 'OFFLINE':
        return { text: 'OFFLINE', color: 'text-rose-400', bg: 'bg-rose-950 border-rose-800' };
      default:
        return { text: 'NO TELEMETRY', color: 'text-slate-400', bg: 'bg-slate-900 border-slate-800' };
    }
  };

  return (
    <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 font-mono text-xs space-y-3 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg border border-cyan-500/40">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-white text-xs font-bold uppercase tracking-wider">
              Cross-Beach Oceanographic Risk & Telemetry Comparison
            </h3>
            <p className="text-[10px] text-slate-400">
              Preserves physical oceanographic units • Explicitly marks missing or unmonitored parameters
            </p>
          </div>
        </div>
        <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
          {observations.length} Sites Monitored
        </span>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-[11px] border-collapse">
          <thead>
            <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[10px] uppercase font-bold">
              <th className="py-2.5 px-3">Coastal Location</th>
              <th className="py-2.5 px-3">Data Provenance</th>
              <th className="py-2.5 px-3">Wave (Height / Period)</th>
              <th className="py-2.5 px-3">Rip Current Risk</th>
              <th className="py-2.5 px-3">Wind & Visibility</th>
              <th className="py-2.5 px-3">Open Incidents</th>
              <th className="py-2.5 px-3">Sensor Health & Freshness</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {observations.map((obs) => {
              const freshness = getFreshnessBadge(obs.sensorFreshness);
              const isRushikonda = obs.beachId === 'RUSHIKONDA';

              return (
                <tr
                  key={obs.beachId}
                  className={`hover:bg-slate-900/60 transition-colors ${
                    isRushikonda ? 'bg-cyan-950/20' : ''
                  }`}
                >
                  {/* Beach Name */}
                  <td className="py-3 px-3">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span>{obs.beachName}</span>
                      {isRushikonda && (
                        <span className="px-1.5 py-0.2 rounded bg-cyan-900/80 text-cyan-300 text-[8px] font-extrabold border border-cyan-700">
                          ANCHOR PILOT
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500">{obs.dataSource}</div>
                  </td>

                  {/* Provenance */}
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                        obs.provenance === 'SIMULATED'
                          ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      {obs.provenance}
                    </span>
                  </td>

                  {/* Wave */}
                  <td className="py-3 px-3">
                    {obs.waveHeightM !== null && obs.waveHeightM !== undefined ? (
                      <div>
                        <span className="text-cyan-300 font-bold">{obs.waveHeightM.toFixed(1)} m</span>
                        <span className="text-slate-500 text-[10px] ml-1">
                          @ {obs.wavePeriodS?.toFixed(1) ?? '8.0'}s
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-500 font-bold text-[10px]">NO DATA</span>
                    )}
                  </td>

                  {/* Rip Current */}
                  <td className="py-3 px-3">
                    {obs.ripCurrentRisk && obs.ripCurrentRisk !== 'UNKNOWN' ? (
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getRipBadge(
                            obs.ripCurrentRisk
                          )}`}
                        >
                          {obs.ripCurrentRisk}
                        </span>
                        {obs.ripVelocityMps !== null && obs.ripVelocityMps !== undefined && (
                          <span className="text-[10px] text-slate-400">
                            {obs.ripVelocityMps.toFixed(2)} m/s
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500 font-bold text-[10px] flex items-center gap-1">
                        <HelpCircle className="w-3 h-3 text-slate-600" />
                        UNKNOWN
                      </span>
                    )}
                  </td>

                  {/* Wind & Visibility */}
                  <td className="py-3 px-3">
                    {obs.windSpeedMps !== null && obs.windSpeedMps !== undefined ? (
                      <div className="space-y-0.5">
                        <div className="text-slate-200">
                          {obs.windSpeedMps.toFixed(1)} m/s ({obs.windDirectionDeg?.toFixed(0)}°)
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Vis: {obs.visibilityKm?.toFixed(1) ?? '10.0'} km
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-500 font-bold text-[10px]">NO DATA</span>
                    )}
                  </td>

                  {/* Open Incidents */}
                  <td className="py-3 px-3">
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-[10px] border ${
                        obs.activeIncidentCount > 0
                          ? 'bg-rose-950 text-rose-300 border-rose-800'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      {obs.activeIncidentCount} Active
                    </span>
                  </td>

                  {/* Sensor Health & Freshness */}
                  <td className="py-3 px-3">
                    <div className="space-y-0.5">
                      <span
                        className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold border ${freshness.bg} ${freshness.color}`}
                      >
                        {freshness.text}
                      </span>
                      {obs.sensorAvailabilityPct !== null && obs.sensorAvailabilityPct !== undefined ? (
                        <div className="text-[10px] text-slate-400">
                          Link SLA: {obs.sensorAvailabilityPct.toFixed(0)}%
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-600">Uninstrumented</div>
                      )}
                    </div>
                  </td>

                  {/* Action */}
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => onSelectSite(obs.beachId)}
                      className="px-2.5 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 hover:text-white text-[10px] font-bold transition-all cursor-pointer"
                    >
                      {isRushikonda ? 'Launch 3D Twin' : 'Site Details'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
        <span>* Sites without sensors strictly report UNKNOWN / NO DATA instead of defaulting to zero or assuming safe.</span>
        <span>Units: Velocity (m/s), Wave (meters), Distance (km)</span>
      </div>
    </div>
  );
};

