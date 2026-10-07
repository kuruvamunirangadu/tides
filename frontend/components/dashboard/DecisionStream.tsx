'use client';

import React from 'react';
import { Decision } from '@/lib/types';
import { Cpu, ArrowRight, ShieldAlert, CheckCircle } from 'lucide-react';

interface DecisionStreamProps {
  decisions?: Decision[];
}

export const DecisionStream: React.FC<DecisionStreamProps> = ({ decisions = [] }) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur-md flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-slate-100 tracking-wide uppercase">
            Safety Decision & Dispatch Directives
          </h3>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400">
          {decisions.length} Directives
        </span>
      </div>

      <div className="space-y-2 overflow-y-auto max-h-56 pr-1 flex-1 text-xs">
        {decisions.length === 0 ? (
          <div className="text-center py-6 text-slate-500 flex flex-col items-center gap-1">
            <CheckCircle className="w-6 h-6 text-cyan-500/60" />
            <span>Normal patrolled surveillance state</span>
          </div>
        ) : (
          decisions.map((d) => (
            <div
              key={d.decision_id}
              className="p-2.5 rounded-lg border border-cyan-500/30 bg-slate-950/70 hover:border-cyan-500/60 transition-all"
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-cyan-300 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
                  {d.hazard_type.replace(/_/g, ' ')}
                </span>
                <span className="font-mono text-[10px] text-slate-400">{d.affected_zone}</span>
              </div>
              <p className="text-[11px] text-slate-300 mb-2">{d.reason}</p>
              
              {/* Action badges */}
              <div className="flex flex-wrap gap-1">
                {d.recommended_actions.map((act, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-800 text-[10px] font-mono text-cyan-200"
                  >
                    <ArrowRight className="w-2.5 h-2.5 text-cyan-400" />
                    {act.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
