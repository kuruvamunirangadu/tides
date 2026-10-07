import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  LifeBuoy,
  Ship,
  Zap,
  AlertOctagon,
  ShieldCheck,
  Radio,
  AlertTriangle,
} from 'lucide-react';

interface SimulationControlsProps {
  running: boolean;
  speed: number;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSetSpeed: (speed: number) => void;
  // Phase 7 Failure & Resilience Scenarios
  onScenarioP7CompoundCrisis: () => void;
  onScenarioP7SensorConflict: () => void;
  onScenarioP7GPSDrift: () => void;
  onScenarioP7CommBlackout: () => void;
  onTriggerChaosMonkey: () => void;
  onRunAutomatedSuite: (key: 'COMPOUND' | 'CONFLICT' | 'GPS' | 'COMM') => void;
  // Phase 6 Emergency Response Scenarios
  onScenarioP6SwimmerRescue: () => void;
  onScenarioP6DeepWaterBoat: () => void;
  onScenarioP6SimultaneousEmergencies: () => void;
  onScenarioP6ResourceExhaustion: () => void;
  // Phase 5 Baseline Scenarios
  onScenarioP5Low: () => void;
  onScenarioP5Mod: () => void;
  onScenarioP5High: () => void;
  // Validation Tests
  onTestCaseA: () => void;
  onTestCaseB: () => void;
  onTestCaseC: () => void;
  // Environmental triggers
  onTriggerWaveSpike: () => void;
  onTriggerCurrentSpike: () => void;
  onTriggerSquall: () => void;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  running,
  speed,
  onStart,
  onPause,
  onReset,
  onSetSpeed,
  onScenarioP7CompoundCrisis,
  onScenarioP7SensorConflict,
  onScenarioP7GPSDrift,
  onScenarioP7CommBlackout,
  onTriggerChaosMonkey,
  onRunAutomatedSuite,
  onScenarioP6SwimmerRescue,
  onScenarioP6DeepWaterBoat,
  onScenarioP6SimultaneousEmergencies,
  onScenarioP6ResourceExhaustion,
  onScenarioP5Low,
  onScenarioP5Mod,
  onScenarioP5High,
  onTestCaseA,
  onTestCaseB,
  onTestCaseC,
  onTriggerWaveSpike,
  onTriggerCurrentSpike,
  onTriggerSquall,
}) => {
  const [activeTab, setActiveTab] = useState<'failure_scenarios' | 'emergency_scenarios' | 'decision_scenarios' | 'validation' | 'manual'>('failure_scenarios');

  return (
    <div className="bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-800 p-4 shadow-xl">
      {/* Top Play/Pause/Reset row */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          {running ? (
            <button
              onClick={onPause}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Pause className="w-4 h-4" />
              PAUSE SIMULATION
            </button>
          ) : (
            <button
              onClick={onStart}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              RUN SIMULATION
            </button>
          )}

          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            RESET
          </button>
        </div>

        {/* Speed Multiplier */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700/60">
          <FastForward className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-0.5" />
          {[1, 2, 5, 10].map((s) => (
            <button
              key={s}
              onClick={() => onSetSpeed(s)}
              className={`px-2 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                speed === s
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('failure_scenarios')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'failure_scenarios'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          🔥 Phase 7 Failure & Chaos Tests
        </button>
        <button
          onClick={() => setActiveTab('emergency_scenarios')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'emergency_scenarios'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          🚨 Phase 6 Emergency Operations
        </button>
        <button
          onClick={() => setActiveTab('decision_scenarios')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'decision_scenarios'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          🤖 Phase 5 Decision Policies
        </button>
        <button
          onClick={() => setActiveTab('validation')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'validation'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          🧪 3-Case Validation Matrix
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'manual'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          ⚡ Environmental Controls
        </button>
      </div>

      {/* Tab 0: Phase 7 Failure & Resilience Scenarios */}
      {activeTab === 'failure_scenarios' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <button
            onClick={onScenarioP7CompoundCrisis}
            className="p-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-purple-500/60 text-left transition-all cursor-pointer group shadow-sm active:scale-[0.98]"
          >
            <div className="flex items-center gap-1.5 text-purple-300 font-bold text-xs mb-1">
              <Zap className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>1. Flagship Compound Crisis</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Wave sensor out + Low visibility + 120 crowd + 2 distresses &rarr; Fallback & Coast Guard
            </p>
          </button>

          <button
            onClick={onScenarioP7SensorConflict}
            className="p-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/60 text-left transition-all cursor-pointer group shadow-sm active:scale-[0.98]"
          >
            <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-xs mb-1">
              <Radio className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>2. Sensor Conflict & Consensus</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Buoy (2.3m) vs Sensor 2 (0.8m) vs Vision (2.1m) &rarr; Weighted Consensus
            </p>
          </button>

          <button
            onClick={onScenarioP7GPSDrift}
            className="p-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/60 text-left transition-all cursor-pointer group shadow-sm active:scale-[0.98]"
          >
            <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>3. GPS Drift & Uncertainty</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              &plusmn;35m spatial uncertainty ring &rarr; Visual sweep pattern search
            </p>
          </button>

          <button
            onClick={onScenarioP7CommBlackout}
            className="p-3 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-left transition-all cursor-pointer group shadow-sm active:scale-[0.98]"
          >
            <div className="flex items-center gap-1.5 text-rose-200 font-bold text-xs mb-1">
              <AlertOctagon className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>4. Comms Blackout (Failsafe)</span>
            </div>
            <p className="text-[10px] text-rose-100/80 leading-relaxed">
              Network offline &rarr; Autonomous station standalone sirens
            </p>
          </button>
        </div>
      )}

      {/* Tab 1: Phase 6 Emergency Response Scenarios */}
      {activeTab === 'emergency_scenarios' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <button
            onClick={onScenarioP6SwimmerRescue}
            className="p-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-rose-500/60 text-left transition-all cursor-pointer group shadow-sm active:scale-[0.98]"
          >
            <div className="flex items-center gap-1.5 text-rose-300 font-bold text-xs mb-1">
              <LifeBuoy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>1. Complete Swimmer Rescue</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Locate &rarr; Dispatch LG+Drone &rarr; Intervene &rarr; Paramedic &rarr; Metrics
            </p>
          </button>

          <button
            onClick={onScenarioP6DeepWaterBoat}
            className="p-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-blue-500/60 text-left transition-all cursor-pointer group shadow-sm active:scale-[0.98]"
          >
            <div className="flex items-center gap-1.5 text-blue-300 font-bold text-xs mb-1">
              <Ship className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>2. Deep-Water Boat Rescue</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Victim swept 480m offshore &rarr; Rescue Boat rapid deployment
            </p>
          </button>

          <button
            onClick={onScenarioP6SimultaneousEmergencies}
            className="p-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-purple-500/60 text-left transition-all cursor-pointer group shadow-sm active:scale-[0.98]"
          >
            <div className="flex items-center gap-1.5 text-purple-300 font-bold text-xs mb-1">
              <Zap className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>3. Multi-Agency Emergencies</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Swimmer (Zone A) + Missing Child (Zone B) + Intrusion (Zone C)
            </p>
          </button>

          <button
            onClick={onScenarioP6ResourceExhaustion}
            className="p-3 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-left transition-all cursor-pointer group shadow-sm active:scale-[0.98]"
          >
            <div className="flex items-center gap-1.5 text-rose-200 font-bold text-xs mb-1">
              <AlertOctagon className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>4. Resource Conflict & Escalation</span>
            </div>
            <p className="text-[10px] text-rose-100/80 leading-relaxed">
              2 Distressed Swimmers, 1 Lifeguard &rarr; Coast Guard Escalation
            </p>
          </button>
        </div>
      )}

      {/* Tab 2: Phase 5 Decision Policies */}
      {activeTab === 'decision_scenarios' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            onClick={onScenarioP5Low}
            className="p-3 rounded-lg bg-slate-800/70 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 text-left transition-all cursor-pointer active:scale-[0.98]"
          >
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs mb-1">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Low Risk Policy</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">Routine surveillance & standard patrol flag</p>
          </button>

          <button
            onClick={onScenarioP5Mod}
            className="p-3 rounded-lg bg-slate-800/70 hover:bg-slate-800 border border-slate-700 hover:border-yellow-500/50 text-left transition-all cursor-pointer active:scale-[0.98]"
          >
            <div className="flex items-center gap-1.5 text-yellow-400 font-bold text-xs mb-1">
              <Radio className="w-3.5 h-3.5 shrink-0" />
              <span>Moderate Risk Policy</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">Yellow matrix signboard & PA safety broadcasts</p>
          </button>

          <button
            onClick={onScenarioP5High}
            className="p-3 rounded-lg bg-slate-800/70 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 text-left transition-all cursor-pointer active:scale-[0.98]"
          >
            <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs mb-1">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>High Risk Policy</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">Red Flag + UAV Standby + Mandatory Buffer</p>
          </button>
        </div>
      )}

      {/* Tab 3: 3-Case Validation Matrix */}
      {activeTab === 'validation' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          <button
            onClick={onTestCaseA}
            className="p-3 rounded-lg bg-slate-800/70 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/60 text-left transition-all cursor-pointer active:scale-[0.98]"
          >
            <div className="text-xs font-bold text-cyan-300 mb-1">
              Case A: 0 Swimmers
            </div>
            <div className="text-[11px] text-slate-300 space-y-0.5">
              <div>🌊 Strong Current: 1.4 m/s</div>
              <div>👤 Swimmers: 0</div>
              <div className="font-bold text-emerald-400 pt-1">&rarr; Hazard: HIGH, Risk: LOW</div>
            </div>
          </button>

          <button
            onClick={onTestCaseB}
            className="p-3 rounded-lg bg-slate-800/70 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/60 text-left transition-all cursor-pointer active:scale-[0.98]"
          >
            <div className="text-xs font-bold text-amber-300 mb-1">
              Case B: 80 Swimmers
            </div>
            <div className="text-[11px] text-slate-300 space-y-0.5">
              <div>🌊 Strong Current: 1.4 m/s</div>
              <div>👤 Swimmers: 80 in Zone A</div>
              <div className="font-bold text-amber-400 pt-1">&rarr; Hazard: HIGH, Risk: HIGH</div>
            </div>
          </button>

          <button
            onClick={onTestCaseC}
            className="p-3 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-left transition-all cursor-pointer active:scale-[0.98]"
          >
            <div className="text-xs font-bold text-rose-300 mb-1">
              Case C: 87 Swimmers + Low Ability
            </div>
            <div className="text-[11px] text-rose-100 space-y-0.5">
              <div>🌊 Current: 1.4 m/s | Waves: 2.1m</div>
              <div>🛟 1/3 Lifeguards Active</div>
              <div className="font-bold text-rose-400 pt-1">&rarr; Hazard: HIGH, Risk: 🔴 CRITICAL (87/100)</div>
            </div>
          </button>
        </div>
      )}

      {/* Tab 4: Environmental Controls */}
      {activeTab === 'manual' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            onClick={onTriggerWaveSpike}
            className="p-3 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-semibold text-sky-300 text-left transition-all cursor-pointer active:scale-[0.98]"
          >
            🌊 Trigger Wave Spike (2.3m)
          </button>

          <button
            onClick={onTriggerCurrentSpike}
            className="p-3 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-semibold text-indigo-300 text-left transition-all cursor-pointer active:scale-[0.98]"
          >
            ⚡ Trigger Rip Current (0.85 m/s)
          </button>

          <button
            onClick={onTriggerSquall}
            className="p-3 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-semibold text-purple-300 text-left transition-all cursor-pointer active:scale-[0.98]"
          >
            🌪️ Trigger Storm Squall (38 km/h)
          </button>
        </div>
      )}
    </div>
  );
};
