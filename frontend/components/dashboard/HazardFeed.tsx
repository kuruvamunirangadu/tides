'use client';

import React from 'react';
import { HazardDetection } from '@/lib/types';
import { AlertOctagon, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface HazardFeedProps {
  hazards?: HazardDetection[];
}

export const HazardFeed: React.FC<HazardFeedProps> = ({ hazards = [] }) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur-md flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-slate-100 tracking-wide uppercase">
            Active Hazard Detections
          </h3>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-400">
          {hazards.length} Active
        </span>
      </div>

      <div className="space-y-2 overflow-y-auto max-h-56 pr-1 flex-1 text-xs">
        {hazards.length === 0 ? (
          <div className="text-center py-6 text-slate-500 flex flex-col items-center gap-1">
            <CheckCircle2 className="w-6 h-6 text-emerald-500/60" />
            <span>No active environmental hazards detected</span>
          </div>
        ) : (
          hazards.map((h) => {
            const severityColor =
              h.severity === 'CRITICAL'
                ? 'border-red-500/60 bg-red-950/30 text-red-300'
                : h.severity === 'HIGH'
                ? 'border-orange-500/60 bg-orange-950/30 text-orange-300'
                : 'border-amber-500/60 bg-amber-950/30 text-amber-300';

            return (
              <div
                key={h.id}
                className={`p-2.5 rounded-lg border ${severityColor} transition-all`}
              >
                <div className="flex justify-between items-start gap-1 mb-1">
                  <span className="font-bold tracking-tight flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {h.hazard_type.replace(/_/g, ' ')}
                  </span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700">
                    Conf: {(h.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mb-1.5">{h.reason}</p>
                <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                  <span>Zones: {h.affected_zones.join(', ')}</span>
                  <span>Sev: {h.severity}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
