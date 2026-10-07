import React from 'react';
import { ZoneMetrics } from '../metrics/Types';
import { MapPin, AlertTriangle, ShieldCheck, Users } from 'lucide-react';

interface ZoneRiskMapProps {
  zones: ZoneMetrics[];
}

export const ZoneRiskMap: React.FC<ZoneRiskMapProps> = ({ zones }) => {
  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'CRITICAL':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">🔴 CRITICAL</span>;
      case 'HIGH':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">🟠 HIGH</span>;
      case 'MODERATE':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">🟡 MODERATE</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">🟢 LOW</span>;
    }
  };

  return (
    <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 text-left">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-cyan-400" />
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Beach Zone Risk Heatmap Matrix
          </h4>
        </div>
        <span className="text-[10px] font-mono text-slate-400">{zones.length} Monitored Sectors</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
        {zones.map((z) => (
          <div
            key={z.zoneId}
            className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60 flex flex-col justify-between space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="font-bold text-xs text-slate-200">{z.zoneName}</div>
              <div>{getCategoryBadge(z.currentRisk)}</div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono border-y border-slate-700/40 py-1.5">
              <div>
                <span className="text-slate-400 block">Current Score</span>
                <span className="text-xs font-bold text-cyan-300">{z.currentScore}/100</span>
              </div>
              <div>
                <span className="text-slate-400 block">Peak Score</span>
                <span className="text-xs font-bold text-rose-400">{z.peakScore}/100</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3 text-purple-400" />
                {z.peopleExposed} Exposed
              </span>
              <span>
                Critical: <span className="font-mono text-rose-300">{z.timeAtCriticalRiskSeconds}s</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
