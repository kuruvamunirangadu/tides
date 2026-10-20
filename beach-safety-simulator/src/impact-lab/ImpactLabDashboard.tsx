import React, { useState } from 'react';
import { useTelemetry } from './hooks/useTelemetry';
import { ForecastComparisonPanel } from './forecast/ForecastComparisonPanel';
import { ReliabilityPanel } from './reliability/ReliabilityPanel';
import { IncidentReplayPanel } from './replay/IncidentReplayPanel';
import { ImpactLabHUD } from './components/ImpactLabHUD';
import {
  Activity,
  Waves,
  Radio,
  LifeBuoy,
  Download,
  FileText,
  ShieldCheck,
  Cpu,
} from 'lucide-react';

interface ImpactLabDashboardProps {
  onTriggerRipScenario?: () => void;
  onTriggerRescueScenario?: () => void;
  initialDemoTab?: 'DEMO_A' | 'DEMO_B' | 'DEMO_C';
}

export const ImpactLabDashboard: React.FC<ImpactLabDashboardProps> = ({
  onTriggerRipScenario,
  onTriggerRescueScenario,
  initialDemoTab = 'DEMO_A',
}) => {
  const [activeTab, setActiveTab] = useState<'DEMO_A' | 'DEMO_B' | 'DEMO_C'>(initialDemoTab);
  const { session, snapshotCount, events, exportTelemetryJSON } = useTelemetry();

  const handleExportEvaluationReport = () => {
    const jsonStr = exportTelemetryJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TIDES-EVALUATION-DOSSIER-${session.runId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full space-y-4 font-mono text-slate-100">
      {/* Evaluation Committee Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/30 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold tracking-wider">
                BEACH SAFETY INNOVATION CHALLENGE
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold tracking-wider">
                EVALUATION COMMITTEE DEMOS
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-white tracking-wide flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
              TIDES IMPACT LAB: THREE HIGH-IMPACT CAPABILITIES
            </h1>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              Read-only telemetry observer, future rip hazard forecasting, sensor fault tolerance, and incident replay. Operates cleanly alongside the existing 60 FPS simulation without polluting ground-truth physics or risk thresholds.
            </p>
          </div>

          {/* Export Evidence Dossier Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportEvaluationReport}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs transition-all shadow-lg shadow-cyan-500/25 active:scale-95 cursor-pointer"
              title="Download structured JSON evidence dossier"
            >
              <Download className="w-4 h-4" />
              <span>EXPORT EVIDENCE DOSSIER</span>
            </button>
          </div>
        </div>

        {/* 3 Core Demonstration Tab Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mt-4 pt-3 border-t border-slate-800/80">
          {/* Demo A Tab */}
          <button
            onClick={() => setActiveTab('DEMO_A')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeTab === 'DEMO_A'
                ? 'bg-indigo-950/60 border-indigo-400 text-white shadow-lg shadow-indigo-900/30 ring-1 ring-indigo-400'
                : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold mb-1">
              <span className="flex items-center gap-1.5 text-cyan-300">
                <Waves className="w-3.5 h-3.5" />
                DEMO A — PREDICT
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-200">
                1m / 3m / 5m
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-medium">Rip-Current Intensification Forecast</p>
            <span className="text-[10px] text-slate-500 block mt-1">
              MAE verification & lead-time measurement (t_event - t_alert)
            </span>
          </button>

          {/* Demo B Tab */}
          <button
            onClick={() => setActiveTab('DEMO_B')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeTab === 'DEMO_B'
                ? 'bg-amber-950/60 border-amber-400 text-white shadow-lg shadow-amber-900/30 ring-1 ring-amber-400'
                : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold mb-1">
              <span className="flex items-center gap-1.5 text-amber-300">
                <Radio className="w-3.5 h-3.5" />
                DEMO B — REMAIN RELIABLE
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-200">
                Data Quality
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-medium">Sensor & Camera Failure Detection</p>
            <span className="text-[10px] text-slate-500 block mt-1">
              Separates AI detection confidence from feed reliability
            </span>
          </button>

          {/* Demo C Tab */}
          <button
            onClick={() => setActiveTab('DEMO_C')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeTab === 'DEMO_C'
                ? 'bg-rose-950/60 border-rose-400 text-white shadow-lg shadow-rose-900/30 ring-1 ring-rose-400'
                : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold mb-1">
              <span className="flex items-center gap-1.5 text-rose-300">
                <LifeBuoy className="w-3.5 h-3.5" />
                DEMO C — COORDINATE
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/30 text-rose-200">
                Incident Replay
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-medium">Distressed-Swimmer Rescue Audit</p>
            <span className="text-[10px] text-slate-500 block mt-1">
              Golden Window (180s) timeline & bottleneck analytics
            </span>
          </button>
        </div>
      </div>

      {/* Embedded Live Telemetry Observer Status Strip */}
      <ImpactLabHUD onOpenDemo={(demoKey) => setActiveTab(demoKey)} />

      {/* Active Demonstration Module View */}
      {activeTab === 'DEMO_A' && (
        <ForecastComparisonPanel onTriggerRipScenario={onTriggerRipScenario} />
      )}
      {activeTab === 'DEMO_B' && <ReliabilityPanel />}
      {activeTab === 'DEMO_C' && (
        <IncidentReplayPanel onTriggerRescueScenario={onTriggerRescueScenario} />
      )}
    </div>
  );
};
