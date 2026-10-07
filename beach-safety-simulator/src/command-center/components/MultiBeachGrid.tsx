import React from 'react';
import { BeachStatus } from '../models/BeachStatus';
import { MapPin, Users, AlertOctagon, LifeBuoy, Plane, TrendingUp } from 'lucide-react';

interface MultiBeachGridProps {
  beaches: BeachStatus[];
  selectedBeachId: string;
  onSelectBeach: (beachId: string) => void;
}

export const MultiBeachGrid: React.FC<MultiBeachGridProps> = ({
  beaches,
  selectedBeachId,
  onSelectBeach,
}) => {
  const getRiskBadge = (level: BeachStatus['riskLevel']) => {
    switch (level) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">🔴 CRITICAL</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40">🟠 HIGH</span>;
      case 'MODERATE':
        return <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">🟡 MODERATE</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">🟢 LOW</span>;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-cyan-400" />
          Monitored Coastal Sectors ({beaches.length} Beaches)
        </h3>
        <span className="text-xs font-mono text-slate-400">Click a sector to focus regional operations</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {beaches.map((beach) => {
          const isSelected = beach.beachId === selectedBeachId;
          return (
            <div
              key={beach.beachId}
              onClick={() => onSelectBeach(beach.beachId)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2.5 ${
                isSelected
                  ? 'bg-slate-900 border-cyan-500 ring-2 ring-cyan-500/40 shadow-xl'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Header */}
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-mono text-[10px] font-bold text-slate-400 uppercase">{beach.beachId}</span>
                  {getRiskBadge(beach.riskLevel)}
                </div>
                <h4 className="text-xs font-bold text-slate-100 line-clamp-1">{beach.name}</h4>
              </div>

              {/* Risk Score & Exposed */}
              <div className="grid grid-cols-2 gap-2 p-2 bg-slate-900/80 rounded-lg font-mono text-[10px]">
                <div>
                  <span className="text-slate-500 block">Risk Score</span>
                  <strong className={beach.riskScore > 70 ? 'text-rose-400 text-sm' : 'text-slate-200 text-sm'}>
                    {beach.riskScore}/100
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Exposed</span>
                  <strong className="text-cyan-300 text-sm">{beach.peopleExposed}</strong>
                </div>
              </div>

              {/* Resource Counts */}
              <div className="flex items-center justify-between font-mono text-[10px] text-slate-400 border-t border-slate-800/60 pt-1.5">
                <span className="flex items-center gap-1">
                  <LifeBuoy className="w-3 h-3 text-cyan-400" />
                  {beach.availableLifeguards}/{beach.totalLifeguards}
                </span>
                <span className="flex items-center gap-1">
                  <Plane className="w-3 h-3 text-orange-400" />
                  {beach.availableDrones}/{beach.totalDrones}
                </span>
                <span className="flex items-center gap-1 text-rose-300">
                  <AlertOctagon className="w-3 h-3 text-rose-400" />
                  {beach.activeIncidents} Inc
                </span>
              </div>

              {/* Prediction Tag */}
              {beach.predictedRisk && (
                <div className="p-1.5 bg-indigo-950/40 border border-indigo-500/30 rounded text-[9px] font-mono text-indigo-200 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                  <span className="truncate">{beach.predictedRisk}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
