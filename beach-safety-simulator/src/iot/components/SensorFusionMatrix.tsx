import React from 'react';
import { FusedEnvironmentState, FusedReading } from '../models/FusedReading';

interface SensorFusionMatrixProps {
  fusedState: FusedEnvironmentState | null;
}

export const SensorFusionMatrix: React.FC<SensorFusionMatrixProps> = ({ fusedState }) => {
  if (!fusedState) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 text-center text-slate-400 font-mono">
        Waiting for initial sensor fusion telemetry cycle...
      </div>
    );
  }

  const conflicts = fusedState.fusedParameters.filter((p) => p.conflictDetected);

  const getQualityBadge = (quality: FusedReading['quality']) => {
    switch (quality) {
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">HIGH</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">MEDIUM</span>;
      case 'LOW':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">LOW</span>;
      case 'DEGRADED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">DEGRADED</span>;
    }
  };

  return (
    <div className="bg-slate-900/85 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
      {/* Matrix Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-bold tracking-wide uppercase text-slate-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
            Real-Time Multi-Sensor Fusion Matrix
          </h3>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Confidence-weighted Kalman/Bayesian syntheses across physical and virtual telemetry streams
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-mono uppercase block">Overall State Confidence</span>
            <span className="text-base font-mono font-extrabold text-cyan-300">
              {(fusedState.overallConfidence * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Conflict Anomaly Warning Banner */}
      {conflicts.length > 0 && (
        <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-lg text-amber-200 text-xs font-mono flex items-start gap-2.5">
          <span className="text-amber-400 text-base">⚠️</span>
          <div className="space-y-1">
            <div className="font-bold uppercase tracking-wider text-amber-300">
              Sensor Divergence Conflict Detected ({conflicts.length})
            </div>
            {conflicts.map((c, idx) => (
              <div key={idx} className="text-[11px] text-amber-200/90">
                • <strong>{c.parameter}</strong>: {c.conflictDetails || 'Conflicting readings between sensor arrays'}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fused Parameters Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
              <th className="pb-2 font-semibold">Parameter</th>
              <th className="pb-2 font-semibold">Fused Value</th>
              <th className="pb-2 font-semibold">Quality</th>
              <th className="pb-2 font-semibold">Confidence</th>
              <th className="pb-2 font-semibold">Contributing Sensors</th>
              <th className="pb-2 font-semibold text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {fusedState.fusedParameters.map((param, index) => {
              const displayVal = typeof param.value === 'number' ? param.value.toFixed(2) : String(param.value);
              return (
                <tr key={index} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 font-bold text-slate-200">{param.parameter}</td>
                  <td className="py-2.5">
                    <span className="text-cyan-300 font-bold text-sm">{displayVal}</span>{' '}
                    <span className="text-slate-400 text-[11px]">{param.unit}</span>
                  </td>
                  <td className="py-2.5">{getQualityBadge(param.quality)}</td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            param.confidence > 0.8
                              ? 'bg-emerald-400'
                              : param.confidence > 0.5
                              ? 'bg-amber-400'
                              : 'bg-rose-400'
                          }`}
                          style={{ width: `${param.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-300">{(param.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {param.contributingSensors.map((sId) => (
                        <span key={sId} className="px-1.5 py-0.5 bg-slate-800 rounded text-[9px] text-slate-300 border border-slate-700">
                          {sId}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2.5 text-right">
                    {param.conflictDetected ? (
                      <span className="text-rose-400 font-semibold text-[10px]">CONFLICT</span>
                    ) : (
                      <span className="text-emerald-400 font-semibold text-[10px]">OPTIMAL</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
