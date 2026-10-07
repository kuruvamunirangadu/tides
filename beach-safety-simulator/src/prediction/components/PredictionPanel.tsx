import React, { useState } from 'react';
import { PredictionState, ForecastHorizon } from '../models/PredictionTypes';
import { Beach } from '../../models/Beach';

interface PredictionPanelProps {
  predictionState: PredictionState | null;
  beach: Beach;
}

export const PredictionPanel: React.FC<PredictionPanelProps> = ({
  predictionState,
  beach,
}) => {
  const [selectedHorizon, setSelectedHorizon] = useState<ForecastHorizon>('30m');

  if (!predictionState) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500">
        AI Predictive Engine initializing... Awaiting hydrodynamic and visitor sensor streams.
      </div>
    );
  }

  const getTrendBadge = (trend: string) => {
    switch (trend) {
      case 'CRITICAL_SPIKE':
        return <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono font-bold text-[10px] border border-rose-500/30">▲ CRITICAL SPIKE</span>;
      case 'RISING':
        return <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold text-[10px] border border-amber-500/30">▲ RISING</span>;
      case 'FALLING':
        return <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[10px] border border-emerald-500/30">▼ FALLING</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-slate-700/50 text-slate-300 font-mono font-medium text-[10px] border border-slate-600">▬ STABLE</span>;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
      {/* Header */}
      <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              AI / ML Predictive Safety Engine
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono border border-indigo-500/30">
                Confidence: {(predictionState.modelConfidence * 100).toFixed(0)}%
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Multi-horizon forward projection: Rip currents, wave shoaling, crowd influx & distress probability
            </p>
          </div>
        </div>

        {/* Global Trend and Horizon Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Overall Beach Trend:</span>
            {getTrendBadge(predictionState.overallBeachRiskTrend)}
          </div>

          <div className="flex bg-slate-800/80 p-1 rounded-lg border border-slate-700/60 text-xs">
            {(['15m', '30m', '60m'] as ForecastHorizon[]).map((h) => (
              <button
                key={h}
                onClick={() => setSelectedHorizon(h)}
                className={`px-3 py-1 rounded font-medium font-mono transition-colors ${
                  selectedHorizon === h
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                +{h}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="p-4 space-y-5">
        {/* Proactive Early Warning Banners */}
        {predictionState.alerts.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>⚠</span> Proactive Early Warnings ({predictionState.alerts.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {predictionState.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-3 bg-rose-950/30 border border-rose-800/40 rounded-lg text-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-rose-300">{alert.zoneId}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-200 border border-rose-500/30 font-mono">
                        +{alert.leadTimeToSpikeMinutes}m Lead Time
                      </span>
                    </div>
                    <p className="mt-1 text-slate-300 font-medium">{alert.message}</p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-rose-900/40">
                    <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">Recommended Countermeasures:</span>
                    <ul className="text-[11px] text-slate-300 list-disc list-inside space-y-0.5">
                      {alert.preventativeMeasures.map((measure, idx) => (
                        <li key={idx}>{measure}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Zone Risk Trajectory Matrix */}
        <div>
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
            Zone Risk Trajectory & Forward Forecast Matrix
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/60 text-slate-400 font-mono text-[11px] border-b border-slate-800">
                  <th className="p-2.5">Zone</th>
                  <th className="p-2.5 text-center">Current</th>
                  <th className="p-2.5 text-center text-cyan-400">+15m</th>
                  <th className="p-2.5 text-center text-indigo-400">+30m</th>
                  <th className="p-2.5 text-center text-purple-400">+60m</th>
                  <th className="p-2.5 text-center">Trend</th>
                  <th className="p-2.5">Primary Threat Vector</th>
                  <th className="p-2.5">Proactive Directive</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {predictionState.zoneForecasts.map((zf) => (
                  <tr key={zf.zoneId} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-2.5 font-medium text-slate-200 font-mono">
                      {zf.zoneName}
                      <span className="text-[10px] text-slate-500 block">{zf.zoneId}</span>
                    </td>
                    <td className="p-2.5 text-center font-mono font-semibold text-slate-300">
                      {zf.currentRiskScore}
                    </td>
                    <td className="p-2.5 text-center font-mono font-semibold text-cyan-300 bg-cyan-950/10">
                      {zf.predictedRisk15m}
                    </td>
                    <td className="p-2.5 text-center font-mono font-bold text-indigo-300 bg-indigo-950/20">
                      {zf.predictedRisk30m}
                    </td>
                    <td className="p-2.5 text-center font-mono font-bold text-purple-300 bg-purple-950/10">
                      {zf.predictedRisk60m}
                    </td>
                    <td className="p-2.5 text-center">{getTrendBadge(zf.riskTrend)}</td>
                    <td className="p-2.5 text-slate-300 text-[11px] max-w-xs">{zf.primaryThreat}</td>
                    <td className="p-2.5 text-emerald-300 text-[11px] max-w-xs font-medium">
                      {zf.recommendedAction}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sub-Model Breakdowns Grid for Selected Horizon */}
        <div>
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
            Physics & Behavioral Sub-Model Projections (+{selectedHorizon})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Rip Current Sub-Model */}
            <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400">Rip Currents</span>
                <span className="text-[10px] font-mono text-slate-500">Hydrodynamics</span>
              </div>
              <div className="space-y-1.5 text-[11px]">
                {predictionState.ripForecasts
                  .filter((r) => r.horizon === selectedHorizon)
                  .map((rip) => (
                    <div key={rip.zoneId} className="flex items-center justify-between border-b border-slate-800/50 pb-1">
                      <span className="text-slate-300 font-mono">{rip.zoneId}</span>
                      <div className="text-right">
                        <span className={`font-mono font-semibold ${rip.probability > 0.6 ? 'text-rose-400' : 'text-slate-200'}`}>
                          {(rip.probability * 100).toFixed(0)}%
                        </span>
                        <span className="text-[9px] text-slate-500 ml-1">({rip.estimatedCurrentSpeedMs}m/s)</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Wave Risk Sub-Model */}
            <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-400">Wave & Shorebreak</span>
                <span className="text-[10px] font-mono text-slate-500">Swell Dynamics</span>
              </div>
              <div className="space-y-1.5 text-[11px]">
                {predictionState.waveForecasts
                  .filter((w) => w.horizon === selectedHorizon)
                  .map((wave) => (
                    <div key={wave.zoneId} className="flex items-center justify-between border-b border-slate-800/50 pb-1">
                      <span className="text-slate-300 font-mono">{wave.zoneId}</span>
                      <div className="text-right">
                        <span className="font-mono font-semibold text-indigo-300">
                          {wave.predictedWaveHeightM}m
                        </span>
                        <span className="text-[9px] text-slate-500 ml-1">({wave.shorebreakRisk})</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Crowd Influx Sub-Model */}
            <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400">Crowd Influx</span>
                <span className="text-[10px] font-mono text-slate-500">Diurnal Pattern</span>
              </div>
              <div className="space-y-1.5 text-[11px]">
                {predictionState.crowdForecasts
                  .filter((c) => c.horizon === selectedHorizon)
                  .map((crowd) => (
                    <div key={crowd.zoneId} className="flex items-center justify-between border-b border-slate-800/50 pb-1">
                      <span className="text-slate-300 font-mono">{crowd.zoneId}</span>
                      <div className="text-right">
                        <span className="font-mono font-semibold text-amber-300">
                          {crowd.predictedTotalVisitors} ppl
                        </span>
                        <span className="text-[9px] text-slate-500 ml-1">({crowd.predictedSwimmers} in water)</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Swimmer Distress Probability */}
            <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-400">Distress Forecast</span>
                <span className="text-[10px] font-mono text-slate-500">Kinematic Risk</span>
              </div>
              <div className="space-y-1.5 text-[11px]">
                {predictionState.distressForecasts
                  .filter((d) => d.horizon === selectedHorizon)
                  .map((distress) => (
                    <div key={distress.zoneId} className="flex items-center justify-between border-b border-slate-800/50 pb-1">
                      <span className="text-slate-300 font-mono">{distress.zoneId}</span>
                      <div className="text-right">
                        <span className="font-mono font-semibold text-rose-300">
                          {(distress.distressProbability * 100).toFixed(0)}%
                        </span>
                        <span className="text-[9px] text-slate-500 ml-1">
                          (~{distress.estimatedDistressIncidents} inc)
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
