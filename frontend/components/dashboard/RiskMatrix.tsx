'use client';

import React from 'react';
import { ZoneRiskAssessment, BeachZone } from '@/lib/types';
import { ShieldCheck, Users, Waves, Flag } from 'lucide-react';

interface RiskMatrixProps {
  assessments?: Record<string, ZoneRiskAssessment>;
  zones?: BeachZone[];
}

export const RiskMatrix: React.FC<RiskMatrixProps> = ({ assessments = {}, zones = [] }) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-slate-100 tracking-wide uppercase">
            Zone Risk Assessment Matrix
          </h3>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          Model: Hazard × Exposure + Vulnerability
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {zones.map((zone) => {
          const risk = assessments[zone.id];
          if (!risk) return null;

          const flagBadgeColor =
            risk.recommended_flag === 'RED'
              ? 'bg-red-500/20 text-red-400 border-red-500/50'
              : risk.recommended_flag === 'YELLOW'
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
              : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';

          const totalRiskPct = Math.round(risk.total_risk_score * 100);
          const hazardPct = Math.round(risk.hazard_score * 100);
          const exposurePct = Math.round(risk.exposure_score * 100);

          return (
            <div
              key={zone.id}
              className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3 flex flex-col justify-between hover:border-slate-700 transition-all"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-1 mb-2">
                <div>
                  <h4 className="font-bold text-xs text-white">{zone.name.split(' - ')[0]}</h4>
                  <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{zone.description}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${flagBadgeColor}`}>
                  <Flag className="w-2.5 h-2.5" /> {risk.recommended_flag}
                </span>
              </div>

              {/* Progress Bars */}
              <div className="space-y-2 my-2 text-[11px]">
                {/* Combined Operational Risk */}
                <div>
                  <div className="flex justify-between items-center text-xs font-semibold mb-1">
                    <span className="text-slate-300">Operational Risk:</span>
                    <span className={totalRiskPct >= 70 ? 'text-red-400' : totalRiskPct >= 40 ? 'text-amber-400' : 'text-emerald-400'}>
                      {totalRiskPct}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        totalRiskPct >= 70 ? 'bg-red-500' : totalRiskPct >= 40 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${totalRiskPct}%` }}
                    />
                  </div>
                </div>

                {/* Hazard Level */}
                <div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 mb-0.5">
                    <span className="flex items-center gap-1"><Waves className="w-3 h-3 text-cyan-400" /> Env Hazard:</span>
                    <span className="font-mono text-cyan-300">{hazardPct}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                    <div className="bg-cyan-500 h-full" style={{ width: `${hazardPct}%` }} />
                  </div>
                </div>

                {/* Exposure Level */}
                <div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 mb-0.5">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3 text-purple-400" /> Human Exposure:</span>
                    <span className="font-mono text-purple-300">{exposurePct}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                    <div className="bg-purple-500 h-full" style={{ width: `${exposurePct}%` }} />
                  </div>
                </div>
              </div>

              {/* Crowd & Distress Counts */}
              <div className="flex justify-between items-center text-[10px] font-mono border-t border-slate-800/80 pt-2 text-slate-400">
                <span>Bathers: <strong className="text-white">{risk.visitor_count}</strong></span>
                <span>Swimmers: <strong className="text-cyan-300">{risk.swimmer_count}</strong></span>
                <span>Distress: <strong className={risk.distressed_count > 0 ? 'text-red-400 animate-pulse' : 'text-slate-500'}>{risk.distressed_count}</strong></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
