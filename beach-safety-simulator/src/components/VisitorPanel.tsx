import React from 'react';
import { Users, Waves, ShieldAlert, Baby, Globe, HeartPulse, UserCheck } from 'lucide-react';
import { Visitor } from '../models/Visitor';

interface VisitorPanelProps {
  stats: {
    total: number;
    beach: number;
    swimming: number;
    water: number;
    restricted: number;
    children?: number;
    tourists?: number;
    distressed?: number;
    groups?: number;
  };
  visitors?: Visitor[];
}

export const VisitorPanel: React.FC<VisitorPanelProps> = ({ stats, visitors = [] }) => {
  const childrenCount = stats.children ?? visitors.filter((v) => v.type === 'CHILD').length;
  const touristsCount = stats.tourists ?? visitors.filter((v) => v.type === 'TOURIST').length;
  const distressedCount = stats.distressed ?? visitors.filter((v) => v.state === 'DISTRESS' || v.state === 'STRUGGLING').length;
  const restrictedCount = stats.restricted ?? visitors.filter((v) => v.state === 'IN_RESTRICTED_ZONE').length;

  const crowdLevel =
    stats.total > 180 ? 'EXTREME' : stats.total > 100 ? 'HIGH' : stats.total > 40 ? 'MODERATE' : 'LOW';

  return (
    <div className="bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-800 p-4 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-200">Crowd & Visitor Engine</h3>
              <p className="text-[11px] text-slate-400">Demographics & spatial presence</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                crowdLevel === 'EXTREME'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : crowdLevel === 'HIGH'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {crowdLevel} DENSITY
            </span>
          </div>
        </div>

        {/* Big Numbers Grid */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50 text-center">
            <span className="text-[10px] text-slate-400 font-medium block">Total Crowd</span>
            <span className="text-xl font-bold text-slate-100">{stats.total}</span>
          </div>
          <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50 text-center">
            <div className="flex items-center justify-center gap-1 text-[10px] text-cyan-400 font-medium">
              <Waves className="w-3 h-3" />
              <span>In Water</span>
            </div>
            <span className="text-xl font-bold text-cyan-400">{stats.water}</span>
          </div>
          <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50 text-center">
            <span className="text-[10px] text-amber-400 font-medium block">On Beach</span>
            <span className="text-xl font-bold text-amber-300">{stats.beach}</span>
          </div>
        </div>

        {/* Breakdown Items */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40 border border-slate-700/30">
            <div className="flex items-center gap-2 text-slate-300">
              <Baby className="w-3.5 h-3.5 text-purple-400" />
              <span>Children & Dependents</span>
            </div>
            <span className="font-mono font-bold text-purple-300">{childrenCount}</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40 border border-slate-700/30">
            <div className="flex items-center gap-2 text-slate-300">
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span>Tourists & Visitors</span>
            </div>
            <span className="font-mono font-bold text-amber-300">{touristsCount}</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40 border border-slate-700/30">
            <div className="flex items-center gap-2 text-slate-300">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Restricted Zone Intruders</span>
            </div>
            <span className={`font-mono font-bold ${restrictedCount > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`}>
              {restrictedCount}
            </span>
          </div>

          {distressedCount > 0 && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-200 animate-pulse">
              <div className="flex items-center gap-2 font-semibold">
                <HeartPulse className="w-4 h-4 text-rose-400" />
                <span>Distressed Swimmers</span>
              </div>
              <span className="font-mono font-bold text-rose-300 text-sm">{distressedCount}</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Families / Groups: {stats.groups || 3}</span>
        <span className="text-cyan-400 font-mono">Behavior Model Active</span>
      </div>
    </div>
  );
};
