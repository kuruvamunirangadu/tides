import React, { useState } from 'react';
import { BENCHMARK_SCENARIOS } from '../scenarios/ScenarioComparator';
import { ScenarioRunSummary } from '../scenarios/ScenarioMetrics';
import { Layers, TrendingUp, ShieldAlert, Zap } from 'lucide-react';

interface ScenarioComparisonProps {
  currentRunSummary?: ScenarioRunSummary;
}

export const ScenarioComparison: React.FC<ScenarioComparisonProps> = ({ currentRunSummary }) => {
  const [selectedMetric, setSelectedMetric] = useState<'response' | 'exposure' | 'utilization'>('response');

  const allScenarios: ScenarioRunSummary[] = currentRunSummary
    ? [...BENCHMARK_SCENARIOS, currentRunSummary]
    : BENCHMARK_SCENARIOS;

  const maxResponseTime = Math.max(...allScenarios.map((s) => s.totalResponseTimeSec), 140);
  const maxExposure = Math.max(...allScenarios.map((s) => s.peopleExposed), 100);

  return (
    <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 text-left">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-400" />
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Controlled Scenario Comparison Matrix
          </h4>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSelectedMetric('response')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
              selectedMetric === 'response'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Response Time
          </button>
          <button
            onClick={() => setSelectedMetric('exposure')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
              selectedMetric === 'exposure'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Exposure & Incidents
          </button>
          <button
            onClick={() => setSelectedMetric('utilization')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
              selectedMetric === 'utilization'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Fleet Load & Escalations
          </button>
        </div>
      </div>

      {/* Visual Bar Comparison */}
      <div className="space-y-2.5 pt-1">
        {allScenarios.map((sc) => {
          const isLive = sc.scenarioId === 'CURRENT_LIVE_RUN';
          return (
            <div
              key={sc.scenarioId}
              className={`p-2.5 rounded-lg border text-xs space-y-1.5 ${
                isLive
                  ? 'bg-cyan-500/10 border-cyan-500/40 shadow-sm'
                  : 'bg-slate-800/60 border-slate-700/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-200 mr-2">{sc.scenarioName}</span>
                  <span className="text-[10px] text-slate-400">{sc.conditionDescription}</span>
                </div>
                {sc.fallbackActivated && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    FALLBACK ACTIVE
                  </span>
                )}
              </div>

              {selectedMetric === 'response' && (
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 mb-1">
                    <span>
                      Detect: <strong className="text-cyan-300">{sc.detectionLatencySec}s</strong> | Dispatch:{' '}
                      <strong className="text-blue-300">{sc.dispatchLatencySec}s</strong>
                    </span>
                    <span className="font-bold text-rose-400">Total: {sc.totalResponseTimeSec}s</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-rose-400 rounded-full transition-all duration-500"
                      style={{ width: `${(sc.totalResponseTimeSec / maxResponseTime) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {selectedMetric === 'exposure' && (
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 mb-1">
                    <span>
                      Exposed: <strong className="text-purple-300">{sc.peopleExposed}</strong> | Warned:{' '}
                      <strong className="text-emerald-300">{sc.peopleWarned}</strong>
                    </span>
                    <span className="font-bold text-amber-400">Incidents: {sc.incidents}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-400 rounded-full transition-all duration-500"
                      style={{ width: `${(sc.peopleExposed / maxExposure) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {selectedMetric === 'utilization' && (
                <div className="grid grid-cols-3 gap-2 text-[10px] font-mono pt-1">
                  <div>
                    <span className="text-slate-400 block">Lifeguard Load</span>
                    <span className="font-bold text-emerald-300">{sc.lifeguardUtilization}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Drone Load</span>
                    <span className="font-bold text-cyan-300">{sc.droneUtilization}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Escalations</span>
                    <span className="font-bold text-rose-400">{sc.escalationsRequired}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
