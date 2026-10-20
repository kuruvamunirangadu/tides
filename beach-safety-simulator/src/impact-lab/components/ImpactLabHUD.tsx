import React, { useState } from 'react';
import { useTelemetry } from '../hooks/useTelemetry';
import {
  Activity,
  Download,
  Play,
  Pause,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Radio,
  Clock,
  Database,
  LifeBuoy,
  FileJson,
  ShieldAlert,
} from 'lucide-react';

interface ImpactLabHUDProps {
  onOpenDemo?: (demoKey: 'DEMO_A' | 'DEMO_B' | 'DEMO_C') => void;
}

export const ImpactLabHUD: React.FC<ImpactLabHUDProps> = ({ onOpenDemo }) => {
  const {
    session,
    latestSnapshot,
    snapshotCount,
    events,
    startRecording,
    pauseRecording,
    newSession,
    exportTelemetryJSON,
  } = useTelemetry();

  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'>('ALL');

  const filteredEvents = events.filter((e) => {
    if (filterSeverity === 'ALL') return true;
    return e.severity === filterSeverity;
  });

  const handleDownloadJSON = () => {
    const jsonStr = exportTelemetryJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tides-telemetry-${session.runId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl shadow-xl backdrop-blur-md overflow-hidden text-slate-200 text-xs font-mono">
      {/* Top Bar Summary Strip */}
      <div className="p-2 sm:p-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400/50" />
          <span className="font-bold text-[11px] sm:text-xs text-cyan-300 tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            IMPACT LAB TELEMETRY OBSERVER
          </span>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
              session.isRecording
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
            }`}
          >
            {session.isRecording ? 'LIVE RECORDING' : 'RECORDING PAUSED'}
          </span>
        </div>

        {/* Action Controls & Metric Badges */}
        <div className="flex items-center gap-2">
          {/* Quick Demo Shortcuts */}
          {onOpenDemo && (
            <div className="hidden md:flex items-center gap-1">
              <button
                onClick={() => onOpenDemo('DEMO_A')}
                className="px-2 py-1 rounded bg-indigo-900/40 hover:bg-indigo-800/60 text-indigo-300 border border-indigo-500/40 text-[10px] font-bold transition-all cursor-pointer"
                title="Demo A: Rip Current Forecast Lab"
              >
                🌊 Demo A: Forecast
              </button>
              <button
                onClick={() => onOpenDemo('DEMO_B')}
                className="px-2 py-1 rounded bg-amber-900/40 hover:bg-amber-800/60 text-amber-300 border border-amber-500/40 text-[10px] font-bold transition-all cursor-pointer"
                title="Demo B: Sensor Reliability & Quality"
              >
                📡 Demo B: Reliability
              </button>
              <button
                onClick={() => onOpenDemo('DEMO_C')}
                className="px-2 py-1 rounded bg-rose-900/40 hover:bg-rose-800/60 text-rose-300 border border-rose-500/40 text-[10px] font-bold transition-all cursor-pointer"
                title="Demo C: Swimmer Incident Replay"
              >
                🛟 Demo C: Replay
              </button>
            </div>
          )}

          {/* Buffer Capacity Metric */}
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800/80 border border-slate-700 text-[10px] text-slate-300">
            <Database className="w-3 h-3 text-cyan-400" />
            <span>
              Snapshots: <strong className="text-white">{snapshotCount}</strong>/1800
            </span>
          </div>

          {/* Events Count Metric */}
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800/80 border border-slate-700 text-[10px] text-slate-300">
            <ShieldAlert className="w-3 h-3 text-amber-400" />
            <span>
              Events: <strong className="text-amber-300">{events.length}</strong>
            </span>
          </div>

          {/* Record / Pause Toggle */}
          <button
            onClick={() => (session.isRecording ? pauseRecording() : startRecording())}
            className={`p-1.5 rounded cursor-pointer transition-all ${
              session.isRecording
                ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
            }`}
            title={session.isRecording ? 'Pause Recording' : 'Resume Recording'}
          >
            {session.isRecording ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          {/* Reset / New Session */}
          <button
            onClick={() => newSession(session.beachId, session.beachName)}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer transition-all"
            title="Reset Telemetry Session"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Export JSON */}
          <button
            onClick={handleDownloadJSON}
            className="flex items-center gap-1 px-2 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold cursor-pointer transition-all text-[10px]"
            title="Download Telemetry Run as JSON"
          >
            <Download className="w-3 h-3" />
            <span className="hidden sm:inline">Export JSON</span>
          </button>

          {/* Expand/Collapse Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 cursor-pointer transition-all"
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Telemetry Inspector & Ground Truth Event Feed */}
      {isExpanded && (
        <div className="p-3 bg-slate-950/90 space-y-3">
          {/* Telemetry Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-[11px]">
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[9px]">SESSION RUN ID</span>
              <span className="text-cyan-400 font-bold truncate block">{session.runId}</span>
            </div>
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[9px]">SIM CLOCK</span>
              <span className="text-slate-200 font-bold flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-400" />
                {latestSnapshot?.timeDisplay || '00:00:00'}
              </span>
            </div>
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[9px]">MAX RIP VELOCITY</span>
              <span
                className={`font-bold ${
                  (latestSnapshot?.maxRipVelocity || 0) > 1.5
                    ? 'text-rose-400'
                    : (latestSnapshot?.maxRipVelocity || 0) > 0.8
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {latestSnapshot?.maxRipVelocity ? `${latestSnapshot.maxRipVelocity.toFixed(2)} m/s` : '0.00 m/s'}
              </span>
            </div>
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[9px]">DISTRESSED SWIMMERS</span>
              <span
                className={`font-bold ${
                  (latestSnapshot?.visitors.distressed || 0) > 0 ? 'text-rose-400' : 'text-slate-300'
                }`}
              >
                {latestSnapshot?.visitors.distressed || 0} active
              </span>
            </div>
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[9px]">ACTIVE RESCUES</span>
              <span className="text-indigo-400 font-bold">
                {latestSnapshot?.emergency.resourcesOnScene || 0} on scene
              </span>
            </div>
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[9px]">SENSORS ONLINE</span>
              <span className="text-emerald-400 font-bold">
                {latestSnapshot?.sensorHealth.overallSensorsOnlineRatio
                  ? `${Math.round(latestSnapshot.sensorHealth.overallSensorsOnlineRatio * 100)}%`
                  : '100%'}
              </span>
            </div>
          </div>

          {/* Real-Time Ground Truth Event Log Stream */}
          <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-2.5 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileJson className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-xs font-bold text-slate-300">
                  GROUND-TRUTH LIFECYCLE EVENT STREAM ({filteredEvents.length})
                </span>
              </div>
              {/* Severity Filter Tabs */}
              <div className="flex items-center gap-1 text-[10px]">
                {(['ALL', 'CRITICAL', 'WARNING', 'INFO'] as const).map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setFilterSeverity(sev)}
                    className={`px-2 py-0.5 rounded cursor-pointer transition-all ${
                      filterSeverity === sev
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-slate-200 bg-slate-800/60'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            {/* Event List */}
            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
              {filteredEvents.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-[11px]">
                  No events recorded yet under current filter. Run the simulation or trigger a scenario to observe events.
                </div>
              ) : (
                filteredEvents
                  .slice()
                  .reverse()
                  .map((evt) => {
                    const isCrit = evt.severity === 'CRITICAL';
                    const isWarn = evt.severity === 'WARNING';
                    return (
                      <div
                        key={evt.id}
                        className={`p-2 rounded-lg border text-[11px] flex items-start justify-between gap-2 transition-all ${
                          isCrit
                            ? 'bg-rose-950/30 border-rose-800/60 text-rose-200'
                            : isWarn
                            ? 'bg-amber-950/30 border-amber-800/60 text-amber-200'
                            : 'bg-slate-800/40 border-slate-700/60 text-slate-300'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                isCrit
                                  ? 'bg-rose-600 text-white'
                                  : isWarn
                                  ? 'bg-amber-600 text-slate-950'
                                  : 'bg-cyan-600/40 text-cyan-300'
                              }`}
                            >
                              {evt.eventType}
                            </span>
                            <span className="font-bold text-slate-100">{evt.title}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-relaxed">{evt.description}</p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[9px] text-slate-500 block">{evt.timeDisplay}</span>
                          <span className="text-[8px] text-slate-600 block">{evt.sourceComponent}</span>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

