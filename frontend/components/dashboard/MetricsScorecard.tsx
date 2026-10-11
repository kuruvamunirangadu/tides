'use client';

import React from 'react';
import { EvaluationMetrics } from '@/lib/types';
import { Timer } from 'lucide-react';

interface MetricsScorecardProps {
  metrics?: EvaluationMetrics;
}

export const MetricsScorecard: React.FC<MetricsScorecardProps> = ({ metrics }) => {
  if (!metrics) return null;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-slate-100 tracking-wide uppercase">
            Simulation Latency & Operational Evaluation Scorecard
          </h3>
        </div>
        <span className="text-[11px] font-mono text-emerald-400">
          Accuracy: {typeof metrics.detection_accuracy_pct === 'number' ? `${metrics.detection_accuracy_pct.toFixed(1)}%` : '--'}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* Detection Latency */}
        <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-lg">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Detection Latency</div>
          <div className="text-xl font-black font-mono text-emerald-400 mt-1">
            {typeof metrics.avg_detection_latency_s === 'number' ? `${metrics.avg_detection_latency_s.toFixed(1)}s` : '--'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Sensor to Hazard ID</div>
        </div>

        {/* Decision Latency */}
        <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-lg">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Decision Latency</div>
          <div className="text-xl font-black font-mono text-cyan-400 mt-1">
            {typeof metrics.avg_decision_latency_s === 'number' ? `${metrics.avg_decision_latency_s.toFixed(1)}s` : '--'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Rule / Action formulation</div>
        </div>

        {/* Warning Latency */}
        <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-lg">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Warning Latency</div>
          <div className="text-xl font-black font-mono text-amber-400 mt-1">
            {typeof metrics.avg_warning_latency_s === 'number' ? `${metrics.avg_warning_latency_s.toFixed(1)}s` : '--'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">PA & LED Board update</div>
        </div>

        {/* Dispatch Latency */}
        <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-lg">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Dispatch Latency</div>
          <div className="text-xl font-black font-mono text-purple-400 mt-1">
            {typeof metrics.avg_dispatch_latency_s === 'number' ? `${metrics.avg_dispatch_latency_s.toFixed(1)}s` : '--'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Lifeguard/Drone deploy</div>
        </div>

        {/* Safety Funnel: Exposed vs Warned vs Rescued */}
        <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-lg">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Safety Funnel</div>
          <div className="text-xs font-mono text-slate-200 mt-1 space-y-0.5">
            <div>Exposed: <strong className="text-amber-400">{metrics.people_exposed_to_hazard}</strong></div>
            <div>Rescued: <strong className="text-emerald-400">{metrics.people_rescued}</strong></div>
          </div>
        </div>

        {/* Resource Utilization */}
        <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-lg">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Resource Load</div>
          <div className="text-xs font-mono text-slate-200 mt-1 space-y-0.5">
            <div>Lifeguards: <strong className="text-cyan-400">{metrics.lifeguard_utilization_pct}%</strong></div>
            <div>Drones: <strong className="text-blue-400">{metrics.drone_utilization_pct}%</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
};
