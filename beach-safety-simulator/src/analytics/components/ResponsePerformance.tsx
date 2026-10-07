import React from 'react';
import { IncidentEventChain } from '../EventStore';
import { SimulationMetrics } from '../metrics/Types';
import { Clock, AlertTriangle, CheckCircle2, TrendingDown } from 'lucide-react';

interface ResponsePerformanceProps {
  chains: IncidentEventChain[];
  bottleneck?: SimulationMetrics['bottleneck'];
}

export const ResponsePerformance: React.FC<ResponsePerformanceProps> = ({ chains, bottleneck }) => {
  return (
    <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 text-left">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Incident Response Latency Performance Table
          </h4>
        </div>
        <span className="text-[10px] font-mono text-slate-400">{chains.length} Tracked Incidents</span>
      </div>

      {/* Bottleneck Analysis Banner */}
      {bottleneck && (
        <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-start gap-2 text-xs">
          <TrendingDown className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-cyan-300">Simulated Bottleneck Identified: </span>
            <span className="text-slate-200">{bottleneck.description}</span>
          </div>
        </div>
      )}

      {/* Latency Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] text-slate-400 font-mono uppercase">
              <th className="py-2 px-2">Incident</th>
              <th className="py-2 px-2">Detection</th>
              <th className="py-2 px-2">Decision</th>
              <th className="py-2 px-2">Dispatch</th>
              <th className="py-2 px-2">Arrival</th>
              <th className="py-2 px-2">Rescue</th>
              <th className="py-2 px-2 font-bold text-slate-200">Total</th>
              <th className="py-2 px-2 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {chains.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-4 text-center text-slate-500 text-xs font-sans">
                  No emergency missions completed in current run yet.
                </td>
              </tr>
            ) : (
              chains.map((c) => (
                <tr key={c.incidentId} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2 px-2 font-bold text-cyan-300">{c.incidentId}</td>
                  <td className="py-2 px-2 text-slate-300">{c.latencies.detectionSec}s</td>
                  <td className="py-2 px-2 text-slate-300">{c.latencies.decisionSec}s</td>
                  <td className="py-2 px-2 text-slate-300">{c.latencies.dispatchSec}s</td>
                  <td className="py-2 px-2 text-slate-300">{c.latencies.arrivalSec}s</td>
                  <td className="py-2 px-2 text-rose-300">{c.latencies.rescueSec}s</td>
                  <td className="py-2 px-2 font-bold text-emerald-300">{c.latencies.totalResponseSec}s</td>
                  <td className="py-2 px-2 text-right font-sans">
                    {c.resolution ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300">
                        RESOLVED
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300">
                        ACTIVE
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
