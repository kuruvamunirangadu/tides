import React, { useEffect, useState } from 'react';
import { IncidentReplay3DController } from './IncidentReplay3DController';
import { ReplayState3D } from './replay.types';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Clock,
  Radio,
  CheckCircle2,
  AlertTriangle,
  History,
  X,
  ChevronRight,
  Shield,
  LifeBuoy,
} from 'lucide-react';

export const IncidentReplayOverlay3D: React.FC = () => {
  const controller = IncidentReplay3DController.getInstance();
  const [replayState, setReplayState] = useState<ReplayState3D>(controller.getState());
  const [incidents, setIncidents] = useState(controller.getAvailableIncidents());
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  useEffect(() => {
    const unsub = controller.subscribe((state) => {
      setReplayState({ ...state });
      setIncidents(controller.getAvailableIncidents());
    });
    return () => unsub();
  }, []);

  const handleToggleMode = () => {
    const nextMode = replayState.viewMode === 'LIVE' ? 'REPLAY' : 'LIVE';
    controller.setViewMode(nextMode);
    if (nextMode === 'REPLAY') {
      setIsExpanded(true);
    }
  };

  const handleSelectIncident = (e: React.ChangeEvent<HTMLSelectElement>) => {
    controller.selectIncident(e.target.value);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    controller.seekToPercent(parseFloat(e.target.value));
  };

  const STAGE_JUMPS = [
    { label: 'Distress', type: 'DISTRESS_DETECTED', icon: AlertTriangle, color: 'text-rose-400' },
    { label: 'Alert', type: 'ALERT_BROADCAST', icon: Radio, color: 'text-amber-400' },
    { label: 'Dispatch', type: 'RESPONDER_ASSIGNED', icon: LifeBuoy, color: 'text-cyan-400' },
    { label: 'Arrival', type: 'RESPONDER_ARRIVED', icon: FastForward, color: 'text-indigo-400' },
    { label: 'Assist', type: 'ASSISTANCE_BEGAN', icon: Shield, color: 'text-emerald-400' },
    { label: 'Resolved', type: 'INCIDENT_RESOLVED', icon: CheckCircle2, color: 'text-teal-400' },
  ];

  return (
    <div className="absolute bottom-3 right-3 z-30 font-mono text-xs select-none pointer-events-auto max-w-xl">
      {/* 1. Mode Pill / Toggle */}
      <div className="flex items-center gap-1.5 justify-end">
        <button
          onClick={handleToggleMode}
          title={
            replayState.viewMode === 'LIVE'
              ? 'Switch to Incident Replay Mode'
              : 'Return to Live Simulation Mode'
          }
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold shadow-2xl backdrop-blur-md border transition-all cursor-pointer ${
            replayState.viewMode === 'REPLAY'
              ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold ring-2 ring-amber-400/50'
              : 'bg-slate-900/90 text-slate-300 border-slate-700/80 hover:text-white hover:bg-slate-800'
          }`}
        >
          {replayState.viewMode === 'REPLAY' ? (
            <>
              <History className="w-4 h-4 animate-spin text-slate-950" />
              <span>INCIDENT REPLAY MODE</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>LIVE OPERATIONS</span>
              <span className="text-[10px] text-slate-400 border-l border-slate-700 pl-1.5">
                Replay ({incidents.length})
              </span>
            </>
          )}
        </button>
      </div>

      {/* 2. Interactive Replay Console (Visible when in REPLAY mode) */}
      {replayState.viewMode === 'REPLAY' && isExpanded && (
        <div className="mt-2 bg-slate-950/95 border-2 border-amber-500/80 rounded-2xl p-3 shadow-2xl backdrop-blur-xl space-y-2.5 text-left animate-in slide-in-from-bottom-2 duration-200">
          {/* Header Warning & Incident Selector */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-extrabold uppercase">
                HISTORICAL REPLAY • READ-ONLY
              </span>

              {incidents.length > 0 && (
                <select
                  value={replayState.selectedIncidentId}
                  onChange={handleSelectIncident}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-white text-[11px] font-bold focus:outline-none focus:ring-1 focus:ring-amber-400"
                >
                  {incidents.map((inc) => (
                    <option key={inc.incidentId} value={inc.incidentId}>
                      {inc.incidentId} - {inc.title} ({inc.severity})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <button
              onClick={() => controller.setViewMode('LIVE')}
              title="Exit Replay and Return to Live View"
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Timeline Scrubber */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-300">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Sim Time:</span>
                <strong className="text-amber-300 font-mono">{replayState.currentSimTime.toFixed(1)}s</strong>
              </span>
              <span className="text-slate-400">
                Range: {replayState.minSimTime.toFixed(0)}s &rarr; {replayState.maxSimTime.toFixed(0)}s
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              step="0.5"
              value={replayState.progressPercent}
              onChange={handleSliderChange}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
          </div>

          {/* Controls: Play/Pause, Speeds, and Stage Jumps */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
            {/* Playback Controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => controller.togglePlay()}
                className={`p-1.5 rounded-lg font-bold text-xs shadow transition-all cursor-pointer flex items-center gap-1 ${
                  replayState.isPlaying
                    ? 'bg-amber-500 text-slate-950 font-extrabold'
                    : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                }`}
              >
                {replayState.isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{replayState.isPlaying ? 'Pause' : 'Play'}</span>
              </button>

              {/* Speed Buttons */}
              {[0.5, 1.0, 2.0, 4.0].map((spd) => (
                <button
                  key={spd}
                  onClick={() => controller.setSpeed(spd)}
                  className={`px-1.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    replayState.playbackSpeed === spd
                      ? 'bg-slate-700 text-amber-300 ring-1 ring-amber-400/50'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            {/* Canonical Stage Jump Buttons */}
            <div className="flex items-center gap-1">
              {STAGE_JUMPS.map((stage) => {
                const Icon = stage.icon;
                return (
                  <button
                    key={stage.type}
                    onClick={() => controller.jumpToStage(stage.type)}
                    title={`Jump directly to ${stage.label} timestamp`}
                    className="flex items-center gap-1 px-1.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-[9px] text-slate-300 hover:text-white transition-all cursor-pointer"
                  >
                    <Icon className={`w-3 h-3 ${stage.color}`} />
                    <span>{stage.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Event Log at current time */}
          {replayState.currentEvent && (
            <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800 text-[10px] space-y-0.5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-bold text-amber-300">{replayState.currentEvent.eventType}</span>
                <span>{replayState.currentEvent.timeDisplay}</span>
              </div>
              <p className="text-slate-200 line-clamp-1">{replayState.currentEvent.description}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

