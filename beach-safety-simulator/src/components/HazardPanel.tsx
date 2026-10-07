import React from 'react';
import { Hazard, HazardSeverity } from '../models/Hazard';
import { AlertTriangle, ShieldCheck, AlertOctagon, Flame, Eye, Waves, Activity } from 'lucide-react';

interface HazardPanelProps {
  hazards: Hazard[];
}

export const HazardPanel: React.FC<HazardPanelProps> = ({ hazards }) => {
  const getSeverityBadge = (sev: HazardSeverity) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-red-950/80 text-red-400 border-red-700 animate-pulse';
      case 'HIGH':
        return 'bg-orange-950/80 text-orange-400 border-orange-700';
      case 'MODERATE':
        return 'bg-amber-950/80 text-amber-400 border-amber-700';
      case 'LOW':
        return 'bg-blue-950/80 text-blue-400 border-blue-700';
      default:
        return 'bg-slate-900 text-slate-400 border-slate-700';
    }
  };

  const getHazardIcon = (type: string) => {
    switch (type) {
      case 'HIGH_WAVES':
      case 'DANGEROUS_SHOREBREAK':
        return <Waves className="w-4 h-4 text-cyan-400" />;
      case 'STRONG_CURRENTS':
      case 'RIP_CURRENT':
        return <Activity className="w-4 h-4 text-amber-400" />;
      case 'RESTRICTED_AREA_EXPOSURE':
        return <Flame className="w-4 h-4 text-red-400" />;
      case 'POOR_VISIBILITY':
      case 'WEATHER_HAZARD':
        return <Eye className="w-4 h-4 text-purple-400" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur-md flex flex-col h-full space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
            Hazard Detection Engine
          </h3>
        </div>
        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
            hazards.length > 0
              ? 'bg-amber-950/80 text-amber-300 border-amber-800'
              : 'bg-slate-950 text-slate-400 border-slate-800'
          }`}
        >
          {hazards.length} Active Hazard{hazards.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Hazard Feed List */}
      <div className="space-y-2.5 overflow-y-auto max-h-64 pr-1 flex-1 text-xs">
        {hazards.length === 0 ? (
          <div className="text-center py-6 text-slate-500 flex flex-col items-center gap-1.5 font-mono">
            <ShieldCheck className="w-7 h-7 text-emerald-500/60" />
            <span className="text-xs text-slate-400 font-semibold">Conditions Within Safe Thresholds</span>
            <span className="text-[10px]">No active environmental hazards detected</span>
          </div>
        ) : (
          hazards.map((h) => (
            <div
              key={h.id + h.type}
              className={`p-2.5 rounded-lg border bg-slate-950/80 transition-all ${
                h.severity === 'CRITICAL'
                  ? 'border-red-500/60 shadow-lg shadow-red-950/30'
                  : h.severity === 'HIGH'
                  ? 'border-orange-500/50'
                  : 'border-amber-500/40'
              }`}
            >
              {/* Top Row: Icon + Title + Severity */}
              <div className="flex items-start justify-between gap-1 mb-1">
                <span className="font-bold text-white flex items-center gap-1.5">
                  {getHazardIcon(h.type)}
                  {h.name}
                </span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase font-mono border ${getSeverityBadge(h.severity)}`}>
                  {h.severity}
                </span>
              </div>

              {/* Physical Reasoning */}
              <p className="text-[11px] text-slate-300 font-sans mb-1.5 leading-relaxed">
                {h.reason}
              </p>

              {/* Footer Meta */}
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-slate-800/80 pt-1.5">
                <span>Zones: <strong className="text-cyan-300">{h.affectedZoneIds.join(', ')}</strong></span>
                <span>Conf: <strong className="text-emerald-400">{(h.confidence * 100).toFixed(0)}%</strong></span>
                <span>At: {h.detectedAt}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
