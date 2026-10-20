import React, { useState, useEffect } from 'react';
import {
  ReplayableIncidentDossier,
  ReplayLifecycleEvent,
  ReplayLifecycleEventType,
} from './types';
import { ReplayController } from './ReplayController';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  Clock,
  MapPin,
  LifeBuoy,
  Shield,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Radio,
  Eye,
  Send,
  Navigation,
  Check,
  Flame,
} from 'lucide-react';

interface IncidentTimelineProps {
  incident: ReplayableIncidentDossier;
}

const CANONICAL_STAGE_METADATA: Array<{
  stage: ReplayLifecycleEventType;
  label: string;
  shortName: string;
  icon: any;
}> = [
  { stage: 'HAZARD_OBSERVED', label: '1. Hazard Observed', shortName: 'Hazard', icon: Activity },
  { stage: 'DISTRESS_DETECTED', label: '2. Distress Detected', shortName: 'Detect', icon: Eye },
  { stage: 'ALERT_BROADCAST', label: '3. Alert Broadcast', shortName: 'Alert', icon: Radio },
  { stage: 'RESPONDER_ASSIGNED', label: '4. Responder Assigned', shortName: 'Assign', icon: Send },
  { stage: 'RESPONDER_DEPARTED', label: '5. Responder Departed', shortName: 'Depart', icon: Navigation },
  { stage: 'RESPONDER_ARRIVED', label: '6. Responder Arrived', shortName: 'Arrive', icon: MapPin },
  { stage: 'ASSISTANCE_BEGAN', label: '7. Assistance Began', shortName: 'Assist', icon: LifeBuoy },
  { stage: 'INCIDENT_RESOLVED', label: '8. Incident Resolved', shortName: 'Resolve', icon: Check },
];

export const IncidentTimeline: React.FC<IncidentTimelineProps> = ({ incident }) => {
  const controller = ReplayController.getInstance();
  const [, setTick] = useState<number>(0);

  // Synchronize with ReplayController on mount and when incident changes
  useEffect(() => {
    controller.selectIncident(incident.incidentId);
    const unsub = controller.subscribe(() => {
      setTick((t) => t + 1);
    });
    return () => unsub();
  }, [incident.incidentId]);

  const events = incident.events || [];
  const isPlaying = controller.isPlaybackRunning();
  const playSpeed = controller.getPlaybackSpeed();
  const currentSimTime = controller.getCurrentSimTime();
  const minTime = controller.getMinSimTime();
  const maxTime = controller.getMaxSimTime();
  const currentScene = controller.getCurrentScene();
  const activeEvents = controller.getActiveEvents();
  const activeEvent: ReplayLifecycleEvent | undefined = controller.getLatestActiveEvent() || events[0];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl text-slate-200 font-mono text-xs space-y-4">
      {/* 1. Header & Replay Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-sm text-slate-100">
              SYNCHRONIZED INCIDENT REPLAY: {incident.incidentId}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                currentScene === 1
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : currentScene === 2
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}
            >
              {currentScene === 1
                ? 'SCENE 1: INCIDENT DETECTED'
                : currentScene === 2
                ? 'SCENE 2: RESPONSE DISPATCHED'
                : 'SCENE 3: ASSISTANCE & RESOLUTION'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400">
            {activeEvents.length} of {events.length} recorded events played |{' '}
            <span className="text-purple-300 font-bold">REPLAY-LOCAL CLOCK (SIMULATION ENGINE UNTOUCHED)</span>
            {incident.missingStages.length > 0 && (
              <span className="text-amber-400 ml-2">
                ({incident.missingStages.length} canonical stages unrecorded)
              </span>
            )}
          </p>
        </div>

        {/* Playback Button Bar */}
        <div className="flex items-center gap-2">
          {/* Speed Selector */}
          <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800">
            {[0.5, 1, 2, 5].map((s) => (
              <button
                key={s}
                onClick={() => controller.setSpeed(s)}
                className={`px-1.5 py-0.5 rounded text-[10px] cursor-pointer ${
                  playSpeed === s ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          <button
            onClick={() => controller.reset()}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
            title="Rewind to Inception"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => controller.stepBackward()}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
            title="Step Backward"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => controller.togglePlay()}
            disabled={events.length === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all shadow-md shadow-cyan-500/20 active:scale-95 cursor-pointer disabled:opacity-40"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            onClick={() => controller.stepForward()}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
            title="Step Forward"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Interactive Scrubber Slider */}
      <div className="space-y-1">
        <input
          type="range"
          min={minTime}
          max={maxTime > minTime ? maxTime : minTime + 10}
          step={0.5}
          value={currentSimTime}
          onChange={(e) => controller.seek(parseFloat(e.target.value))}
          className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
        />
        <div className="flex justify-between text-[10px] text-slate-500">
          <span>Onset ({incident.startTimeDisplay || '08:00:00'})</span>
          <span>
            Current Replay Clock:{' '}
            <strong className="text-cyan-300">
              {controller.getFormattedCurrentTime()}
            </strong>
          </span>
          <span>Resolution ({incident.endTimeDisplay || '08:04:22'})</span>
        </div>
      </div>

      {/* 3. 8 Canonical Lifecycle Stages Horizontal Grid */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] text-slate-400 pb-1">
          <span className="font-bold text-slate-300">CANONICAL LIFECYCLE AUDIT PIPELINE</span>
          <span>Green/Blue: Recorded Fact · Amber/Red: Unrecorded Gap</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5">
          {CANONICAL_STAGE_METADATA.map((stg) => {
            const recordedEvt = events.find((e) => e.eventType === stg.stage);
            const isRecorded = !!recordedEvt;
            const Icon = stg.icon;
            const isPassed = recordedEvt && recordedEvt.simTimeSeconds <= currentSimTime;
            const isSelected = activeEvent?.eventType === stg.stage;

            return (
              <div
                key={stg.stage}
                onClick={() => {
                  if (recordedEvt) {
                    controller.seek(recordedEvt.simTimeSeconds);
                  }
                }}
                className={`p-2 rounded-xl border text-center transition-all ${
                  isSelected
                    ? 'ring-2 ring-cyan-400 bg-cyan-950/60 border-cyan-400 shadow-lg'
                    : isPassed
                    ? 'bg-slate-900 border-cyan-500/50 cursor-pointer'
                    : isRecorded
                    ? 'bg-slate-950/80 border-slate-800 hover:border-slate-700 cursor-pointer opacity-75'
                    : 'bg-rose-950/20 border-rose-900/40 opacity-70'
                }`}
              >
                <div className="flex justify-center mb-1">
                  <Icon
                    className={`w-3.5 h-3.5 ${
                      isSelected
                        ? 'text-cyan-300'
                        : isPassed
                        ? 'text-cyan-400'
                        : isRecorded
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  />
                </div>
                <span className="font-bold text-[10px] block truncate text-slate-200">
                  {stg.shortName}
                </span>

                {isRecorded ? (
                  <span className="text-[9px] text-emerald-400 font-mono block mt-0.5">
                    +{Math.round(recordedEvt.simTimeSeconds - incident.onsetSimTime)}s
                  </span>
                ) : (
                  <span className="text-[8px] text-rose-400 font-semibold block mt-0.5">
                    UNRECORDED
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Active Milestone Event Detail Inspector */}
      {activeEvent ? (
        <div className="bg-slate-950/90 rounded-xl border border-cyan-500/30 p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-900 pb-2">
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  activeEvent.severity === 'CRITICAL'
                    ? 'bg-rose-600 text-white'
                    : activeEvent.severity === 'WARNING'
                    ? 'bg-amber-600 text-slate-950'
                    : 'bg-cyan-600/40 text-cyan-300'
                }`}
              >
                {activeEvent.eventType}
              </span>
              <span className="font-bold text-sm text-slate-100">{activeEvent.title}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] border border-emerald-500/30 font-bold">
                ✓ RECORDED FACT
              </span>
              <span className="text-[10px] text-cyan-400 font-mono font-bold">
                {activeEvent.timeDisplay} (T+{Math.round(activeEvent.simTimeSeconds - incident.onsetSimTime)}s)
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">{activeEvent.description}</p>

          {/* Metadata Inspector Chips */}
          <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-900 text-[10px] text-slate-400">
            <span className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded">
              <Shield className="w-3 h-3 text-cyan-400" /> Source: {activeEvent.sourceComponent}
            </span>

            {activeEvent.responderName && (
              <span className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded">
                <Activity className="w-3 h-3 text-indigo-400" /> Asset: {activeEvent.responderName} (
                {activeEvent.responderType})
              </span>
            )}

            {activeEvent.visitorId && (
              <span className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded">
                <LifeBuoy className="w-3 h-3 text-amber-400" /> Victim: {activeEvent.visitorId}
              </span>
            )}

            {activeEvent.coordinates && (
              <span className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded">
                <MapPin className="w-3 h-3 text-rose-400" /> Coordinates: (
                {Math.round(activeEvent.coordinates.x)}, {Math.round(activeEvent.coordinates.y)})
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 bg-slate-950/60 rounded-xl text-center text-slate-500">
          No events available in this incident dossier.
        </div>
      )}

      {/* 5. Chronological Event Feed List */}
      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
        {events.map((evt, idx) => {
          const isPassed = evt.simTimeSeconds <= currentSimTime;
          const isSelected = activeEvent?.eventId === evt.eventId;
          const isCrit = evt.severity === 'CRITICAL';

          return (
            <button
              key={evt.eventId}
              onClick={() => {
                controller.seek(evt.simTimeSeconds);
              }}
              className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-cyan-950/50 border-cyan-400 text-white ring-1 ring-cyan-400'
                  : isPassed
                  ? 'bg-slate-900/60 border-slate-700 text-slate-300 hover:bg-slate-800/40'
                  : 'bg-slate-950/40 border-slate-800 text-slate-500 hover:bg-slate-800/20'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isSelected ? 'bg-cyan-400 scale-125' : isCrit ? 'bg-rose-500' : isPassed ? 'bg-emerald-400' : 'bg-slate-600'
                  }`}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[11px]">{evt.title}</span>
                    <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-400 font-mono">
                      {evt.eventType}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 block truncate max-w-md">
                    {evt.description}
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] font-mono text-slate-300 block">{evt.timeDisplay}</span>
                <span className="text-[9px] text-slate-500 block">
                  +{(evt.simTimeSeconds - incident.onsetSimTime).toFixed(0)}s
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
