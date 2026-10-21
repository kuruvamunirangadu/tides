/**
 * SwimmerFeelingFlowPanel.tsx
 * 
 * TIDES Track B — Swimmer Perception & Closed-Loop System Control Interface
 * 
 * Renders:
 * 1. Current Feeling State & Psychological Sensation for the selected swimmer/band
 * 2. 4-Stage Closed-Loop System Control Flow Pipeline
 * 3. 1-Tap Flow Simulators (Simulate Feeling Unsafe, Escalate to SOS, Stabilize & Recover)
 * 4. Active Suffering & Distress Roster with verifiable Timestamps, Swimmer IDs, and SLA tracking
 */

import React, { useState, useEffect } from 'react';
import {
  Heart,
  Activity,
  AlertTriangle,
  LifeBuoy,
  Shield,
  Zap,
  CheckCircle2,
  Clock,
  Radio,
  ArrowRight,
  TrendingDown,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  SwimmerFeelingControlManager,
  SwimmerFeelingState,
  SwimmerDistressLogEntry,
  SwimmerSafetyFeeling,
  SystemControlStage,
} from '../feeling/SwimmerFeelingControlManager';

interface SwimmerFeelingFlowPanelProps {
  selectedWristbandId: string;
  onSelectWristband?: (id: string) => void;
  compact?: boolean;
}

export const SwimmerFeelingFlowPanel: React.FC<SwimmerFeelingFlowPanelProps> = ({
  selectedWristbandId,
  onSelectWristband,
  compact = false,
}) => {
  const manager = SwimmerFeelingControlManager.getInstance();
  const [feeling, setFeeling] = useState<SwimmerFeelingState>(
    manager.getSwimmerFeeling(selectedWristbandId)
  );
  const [distressLogs, setDistressLogs] = useState<SwimmerDistressLogEntry[]>(
    manager.getDistressLog()
  );
  const [activeSufferingCount, setActiveSufferingCount] = useState<number>(
    manager.getActiveSufferingCount()
  );
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      setFeeling(manager.getSwimmerFeeling(selectedWristbandId));
      setDistressLogs([...manager.getDistressLog()]);
      setActiveSufferingCount(manager.getActiveSufferingCount());
    };
    update();
    const interval = setInterval(update, 800);
    return () => clearInterval(interval);
  }, [selectedWristbandId]);

  const handleSimulateUnsafe = () => {
    const updated = manager.simulateFeelingUnsafe(selectedWristbandId, 'Sudden Seaward Rip Outflow');
    setFeeling({ ...updated });
    setDistressLogs([...manager.getDistressLog()]);
    setActiveSufferingCount(manager.getActiveSufferingCount());
    setNotice(`⚡ Swimmer ${updated.visitorName} (${updated.wristbandId}) is feeling UNSAFE. Automated downlink advisory initiated.`);
    setTimeout(() => setNotice(null), 5000);
  };

  const handleSimulateSOS = () => {
    const updated = manager.simulateSOSDistress(selectedWristbandId);
    setFeeling({ ...updated });
    setDistressLogs([...manager.getDistressLog()]);
    setActiveSufferingCount(manager.getActiveSufferingCount());
    setNotice(`🚨 Swimmer ${updated.visitorName} (${updated.wristbandId}) in CRITICAL PANIC. Autonomous UAV buoy drop & rescue boat dispatched!`);
    setTimeout(() => setNotice(null), 5000);
  };

  const handleStabilize = () => {
    const updated = manager.stabilizeSwimmer(selectedWristbandId);
    setFeeling({ ...updated });
    setDistressLogs([...manager.getDistressLog()]);
    setActiveSufferingCount(manager.getActiveSufferingCount());
    setNotice(`✓ Swimmer ${updated.visitorName} (${updated.wristbandId}) STABILIZED & RECOVERED! Closed-loop control successfully completed.`);
    setTimeout(() => setNotice(null), 5000);
  };

  const getFeelingBadge = (f: SwimmerSafetyFeeling) => {
    switch (f) {
      case 'CRITICAL_PANIC':
        return {
          title: 'CRITICAL PANIC (Submersion Risk)',
          color: 'text-rose-400',
          bg: 'bg-rose-950/70 border-rose-500/80 animate-pulse',
          dot: 'bg-rose-500 animate-ping',
        };
      case 'UNSAFE':
        return {
          title: 'UNSAFE (Severe Rip Struggle)',
          color: 'text-orange-400',
          bg: 'bg-orange-950/60 border-orange-500/80',
          dot: 'bg-orange-500',
        };
      case 'APPREHENSIVE':
        return {
          title: 'APPREHENSIVE (Undertow Discomfort)',
          color: 'text-amber-400',
          bg: 'bg-amber-950/60 border-amber-500/70',
          dot: 'bg-amber-400',
        };
      case 'STABILIZED':
        return {
          title: 'STABILIZED (Buoy Secured / Relief)',
          color: 'text-teal-300',
          bg: 'bg-teal-950/60 border-teal-500/70',
          dot: 'bg-teal-400',
        };
      case 'SAFE':
      default:
        return {
          title: 'SAFE (Comfortable & Confident)',
          color: 'text-emerald-400',
          bg: 'bg-emerald-950/40 border-emerald-500/50',
          dot: 'bg-emerald-400',
        };
    }
  };

  const badge = getFeelingBadge(feeling.feeling);

  const getStageIndicator = (targetStage: SystemControlStage) => {
    const order: Record<SystemControlStage, number> = {
      MONITORING_SAFE: 0,
      ADVISORY_DOWNLINK: 1,
      WARNING_INTERVENTION: 2,
      EMERGENCY_DISPATCH: 3,
      CLOSED_LOOP_RECOVERED: 4,
    };
    const currentNum = order[feeling.systemControlStage] || 0;
    const targetNum = order[targetStage];

    if (currentNum > targetNum) {
      return 'bg-emerald-500 text-slate-950 border-emerald-400 font-black';
    }
    if (currentNum === targetNum && currentNum > 0) {
      return 'bg-amber-400 text-slate-950 border-amber-300 font-black animate-pulse shadow-md shadow-amber-400/40';
    }
    return 'bg-slate-900 text-slate-500 border-slate-800';
  };

  return (
    <div className="bg-slate-950/90 rounded-2xl border border-teal-500/40 p-3 space-y-3 text-left font-mono text-xs shadow-2xl">
      {/* Notice Banner */}
      {notice && (
        <div className="p-2 rounded-xl bg-teal-950 border border-teal-500/60 text-teal-300 text-[10px] font-bold animate-in fade-in flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-teal-400 hover:text-white px-1">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/30">
            <Heart className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
              Swimmer Perception & Closed-Loop Control Flow
            </h4>
            <span className="text-[9px] text-slate-400 block font-sans">
              Real-time psychological distress, physiological fatigue & autonomous system interventions
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span
            className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
              activeSufferingCount > 0
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            }`}
          >
            {activeSufferingCount > 0 ? `⚠️ ${activeSufferingCount} Suffering Active` : '✓ All Swimmers Safe'}
          </span>
        </div>
      </div>

      {/* 1. Selected Swimmer Feeling Card */}
      <div className={`p-3 rounded-xl border space-y-2.5 transition-all ${badge.bg}`}>
        <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${badge.dot}`} />
              <strong className="text-white text-xs">{feeling.wristbandId}</strong>
              <span className="text-slate-300 text-[11px] font-bold">({feeling.visitorName})</span>
            </div>
            <span className="text-[9px] text-slate-400 block mt-0.5">
              Swimmer ID: <span className="text-cyan-300 font-bold">{feeling.visitorId}</span> • Zone: <span className="text-amber-300">{feeling.zoneId}</span>
            </span>
          </div>

          <div className="text-right shrink-0">
            <span className={`px-2 py-0.5 rounded font-black text-[10px] uppercase border ${badge.bg} ${badge.color}`}>
              {badge.title}
            </span>
            <span className="text-[8px] text-slate-400 block mt-0.5 font-mono">
              Since {feeling.feelingStartedAt}
            </span>
          </div>
        </div>

        {/* Physical Sensation Description */}
        <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800 space-y-1">
          <span className="text-[9px] text-slate-400 uppercase font-bold flex items-center gap-1">
            <Activity className="w-3 h-3 text-cyan-400" /> Human Psychological & Sensory State:
          </span>
          <p className="text-[10px] text-slate-200 font-sans leading-relaxed italic">
            "{feeling.sensationDescription}"
          </p>
        </div>

        {/* Biometrics & Physiological Telemetry */}
        <div className="grid grid-cols-3 gap-1.5 text-[9px] text-slate-300">
          <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-slate-400 block">Muscle Fatigue:</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    feeling.fatiguePercent >= 75 ? 'bg-rose-500' : feeling.fatiguePercent >= 50 ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${feeling.fatiguePercent}%` }}
                />
              </div>
              <span className="font-bold text-white">{feeling.fatiguePercent}%</span>
            </div>
          </div>

          <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-slate-400 block">Heart Rate:</span>
            <span className={`text-[11px] font-bold ${feeling.heartRateBpm > 130 ? 'text-rose-400 animate-pulse' : 'text-cyan-300'}`}>
              ❤️ {feeling.heartRateBpm} bpm
            </span>
          </div>

          <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-slate-400 block">Struggle Index:</span>
            <span
              className={`px-1 py-0.2 rounded font-black text-[9px] inline-block mt-0.5 ${
                feeling.struggleIndex === 'CRITICAL'
                  ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50 animate-pulse'
                  : feeling.struggleIndex === 'HIGH'
                  ? 'bg-orange-500/20 text-orange-300'
                  : feeling.struggleIndex === 'MODERATE'
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-emerald-500/20 text-emerald-300'
              }`}
            >
              {feeling.struggleIndex}
            </span>
          </div>
        </div>

        {/* Live Active System Control Action */}
        <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-850 flex items-center justify-between text-[9px]">
          <span className="text-slate-400">System Intervention:</span>
          <span className="text-teal-300 font-bold truncate max-w-[260px]">
            {feeling.activeIntervention}
          </span>
        </div>
      </div>

      {/* 2. 4-Stage Closed-Loop System Control Flow Pipeline */}
      <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
        <span className="text-[10px] text-slate-300 uppercase font-bold tracking-wider flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-teal-400" />
          Closed-Loop System Control Flow
        </span>

        <div className="grid grid-cols-4 gap-1 text-[8px] text-center font-mono font-bold">
          <div className={`p-1.5 rounded-lg border ${getStageIndicator('ADVISORY_DOWNLINK')}`}>
            <span className="block text-[7px] opacity-75">STAGE 1</span>
            <span>1. SENSATION DETECTED</span>
          </div>
          <div className={`p-1.5 rounded-lg border ${getStageIndicator('WARNING_INTERVENTION')}`}>
            <span className="block text-[7px] opacity-75">STAGE 2</span>
            <span>2. HAPTIC DOWNLINK</span>
          </div>
          <div className={`p-1.5 rounded-lg border ${getStageIndicator('EMERGENCY_DISPATCH')}`}>
            <span className="block text-[7px] opacity-75">STAGE 3</span>
            <span>3. FLEET DISPATCH</span>
          </div>
          <div className={`p-1.5 rounded-lg border ${getStageIndicator('CLOSED_LOOP_RECOVERED')}`}>
            <span className="block text-[7px] opacity-75">STAGE 4</span>
            <span>4. STABILIZED SAFE</span>
          </div>
        </div>
      </div>

      {/* 3. Interactive Simulation Triggers */}
      <div className="grid grid-cols-3 gap-1.5 pt-0.5">
        <button
          onClick={handleSimulateUnsafe}
          className="py-1.5 px-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-[9px] transition cursor-pointer flex items-center justify-center gap-1"
          title="Simulate swimmer being caught in rip current undertow"
        >
          <Zap className="w-3 h-3 text-amber-400" />
          <span>Simulate Unsafe</span>
        </button>

        <button
          onClick={handleSimulateSOS}
          className="py-1.5 px-2 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/50 font-black text-[9px] transition cursor-pointer flex items-center justify-center gap-1 shadow-md shadow-rose-950 animate-pulse"
          title="Simulate swimmer panicking and engaging 1-Tap SOS"
        >
          <AlertTriangle className="w-3 h-3 text-rose-400" />
          <span>Escalate to SOS</span>
        </button>

        <button
          onClick={handleStabilize}
          className="py-1.5 px-2 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 font-bold text-[9px] transition cursor-pointer flex items-center justify-center gap-1"
          title="Autonomous buoy drop / rescue completed; swimmer safely recovered"
        >
          <CheckCircle2 className="w-3 h-3 text-teal-400" />
          <span>Stabilize & Safe</span>
        </button>
      </div>

      {/* 4. Active Suffering & Distress Roster with Timestamps & IDs */}
      <div className="space-y-1.5 pt-1 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-300 uppercase font-bold tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            Distress & Suffering Log (Timestamps & Swimmer IDs)
          </span>
          <span className="text-[9px] text-slate-500">{distressLogs.length} Events</span>
        </div>

        <div className="space-y-1 max-h-44 overflow-y-auto pr-0.5 scrollbar-thin">
          {distressLogs.length === 0 ? (
            <div className="p-3 text-center text-slate-500 text-[10px] italic">
              No active distress or suffering logged
            </div>
          ) : (
            distressLogs.map((entry) => (
              <div
                key={entry.id}
                onClick={() => onSelectWristband && onSelectWristband(entry.wristbandId)}
                className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                  entry.status === 'SUFFERING_ACTIVE'
                    ? 'bg-rose-950/40 border-rose-500/60 shadow-md shadow-rose-950/40'
                    : entry.status === 'SYSTEM_INTERVENING'
                    ? 'bg-amber-950/40 border-amber-500/50'
                    : 'bg-slate-900/70 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-1 text-[9px]">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-cyan-300 font-mono">[{entry.timestamp}]</span>
                    <strong className="text-white">{entry.swimmerName}</strong>
                    <span className="text-slate-400">({entry.swimmerId} • {entry.wristbandId})</span>
                  </div>
                  <span
                    className={`px-1.5 py-0.2 rounded font-bold text-[8px] ${
                      entry.status === 'SUFFERING_ACTIVE'
                        ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50 animate-pulse'
                        : entry.status === 'SYSTEM_INTERVENING'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {entry.status === 'SUFFERING_ACTIVE'
                      ? 'SUFFERING'
                      : entry.status === 'SYSTEM_INTERVENING'
                      ? 'INTERVENING'
                      : 'STABILIZED'}
                  </span>
                </div>

                <div className="text-[9px] text-slate-300 mt-1">
                  Cause: <span className="text-amber-300 font-bold">{entry.hazardCause}</span> • Fatigue: <span className="text-rose-300">{entry.fatiguePercent}%</span> • HR: <span className="text-cyan-300">{entry.heartRateBpm} bpm</span>
                </div>

                <p className="text-[8px] text-slate-400 font-sans italic mt-0.5 truncate">
                  "{entry.sensationDetails}"
                </p>

                <div className="flex items-center justify-between text-[8px] text-slate-500 pt-1 border-t border-slate-800/60 mt-1">
                  <span>Action: {entry.systemControlAction.slice(0, 35)}...</span>
                  <span className="text-emerald-400 font-bold">
                    {entry.resolvedAt ? `Resolved in ${entry.resolutionLatencySec}s (SLA ✓)` : 'Golden Window: Active'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

