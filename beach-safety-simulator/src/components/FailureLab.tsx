import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  WifiOff,
  Radio,
  EyeOff,
  Navigation,
  CloudLightning,
  Moon,
  Users,
  Flame,
  RotateCcw,
  Zap,
  CheckCircle2,
  Cpu,
  Layers,
} from 'lucide-react';
import { FailureEvent, DegradationLevel, FailureType } from '../failures/types/FailureTypes';
import { FallbackStrategy } from '../failures/fallback/FallbackEngine';
import { ResilienceDimensions } from '../failures/metrics/ResilienceMetrics';

interface FailureLabProps {
  activeFailures: FailureEvent[];
  fallbackStrategy: FallbackStrategy;
  resilience: ResilienceDimensions;
  onInjectFailure: (type: FailureType, name: string, description: string, severity?: any, targetId?: string, duration?: number, params?: any) => void;
  onRemoveFailure: (id: string) => void;
  onClearAllFailures: () => void;
  onTriggerChaosMonkey: () => void;
}

export const FailureLab: React.FC<FailureLabProps> = ({
  activeFailures,
  fallbackStrategy,
  resilience,
  onInjectFailure,
  onRemoveFailure,
  onClearAllFailures,
  onTriggerChaosMonkey,
}) => {
  const [activeTab, setActiveTab] = useState<'injection' | 'strategy' | 'resilience'>('injection');

  const getDegradationBadge = (level: DegradationLevel) => {
    switch (level) {
      case 'ESCALATED':
        return <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/50 animate-pulse">🚨 ESCALATED</span>;
      case 'FAILSAFE':
        return <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">🛡️ FAILSAFE MODE</span>;
      case 'LIMITED':
        return <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">⚠️ LIMITED ASSETS</span>;
      case 'DEGRADED':
        return <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">🟡 DEGRADED SENSORS</span>;
      case 'FULL_CAPABILITY':
      default:
        return <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">🟢 FULL CAPABILITY</span>;
    }
  };

  const isTypeActive = (type: FailureType, targetId?: string) => {
    return activeFailures.some((f) => f.type === type && (!targetId || f.targetId === targetId));
  };

  const toggleFailure = (type: FailureType, name: string, description: string, targetId?: string, params?: any) => {
    const existing = activeFailures.find((f) => f.type === type && (!targetId || f.targetId === targetId));
    if (existing) {
      onRemoveFailure(existing.id);
    } else {
      onInjectFailure(type, name, description, 'HIGH', targetId, undefined, params);
    }
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-800 p-4 shadow-xl flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Flame className="w-4 h-4 text-purple-400 animate-pulse" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-200">Failure & Resilience Lab</h3>
              <p className="text-[11px] text-slate-400">Phase 7: Fault injection, uncertainty & fallback testing</p>
            </div>
          </div>
          <div>{getDegradationBadge(fallbackStrategy.activeLevel)}</div>
        </div>

        {/* Tab Navigation & Chaos Button */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveTab('injection')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'injection'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Fault Matrix ({activeFailures.length})
            </button>
            <button
              onClick={() => setActiveTab('strategy')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'strategy'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Fallback Plan
            </button>
            <button
              onClick={() => setActiveTab('resilience')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'resilience'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Resilience Score ({resilience.overallResilienceIndex}%)
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onTriggerChaosMonkey}
              className="px-2 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
              title="Inject random multi-component failures"
            >
              <Zap className="w-3 h-3 text-rose-400 fill-current" />
              CHAOS MONKEY
            </button>
            {activeFailures.length > 0 && (
              <button
                onClick={onClearAllFailures}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                title="Recover all systems back to nominal"
              >
                <RotateCcw className="w-3 h-3" />
                RESET
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Interactive Fault Injection Matrix */}
        {activeTab === 'injection' && (
          <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1 text-left">
            {/* Sensor & Positioning Faults */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Sensory & Positioning Failures
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => toggleFailure('CAMERA_FAILURE', 'AI Optical Camera Offline', 'CCTV vision model unavailable', 'CCTV-01')}
                  className={`p-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                    isTypeActive('CAMERA_FAILURE')
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 font-bold'
                      : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Camera Vision Offline</span>
                  </div>
                  <p className="text-[9px] text-slate-400">Forces fallback to secondary tracking</p>
                </button>

                <button
                  onClick={() => toggleFailure('GPS_ERROR', 'GPS Coordinate Uncertainty', 'Simulated GPS drift error radius of 35m', undefined, { errorRadius: 35 })}
                  className={`p-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                    isTypeActive('GPS_ERROR')
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 font-bold'
                      : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Navigation className="w-3.5 h-3.5" />
                    <span>GPS Drift (±35m Error)</span>
                  </div>
                  <p className="text-[9px] text-slate-400">Adds spatial uncertainty ring</p>
                </button>

                <button
                  onClick={() => toggleFailure('SENSOR_FAILURE', 'Wave Acoustic Buoy Failure', 'Acoustic wave sensor data missing', 'WAVE_SENSOR')}
                  className={`p-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                    isTypeActive('SENSOR_FAILURE', 'WAVE_SENSOR')
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 font-bold'
                      : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Radio className="w-3.5 h-3.5" />
                    <span>Wave Sensor Outage</span>
                  </div>
                  <p className="text-[9px] text-slate-400">Missing wave data $\rightarrow$ model fallback</p>
                </button>

                <button
                  onClick={() => toggleFailure('CONFLICTING_SENSORS', 'Sensor Telemetry Conflict', 'Disagreement between acoustic buoy & optical radar')}
                  className={`p-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                    isTypeActive('CONFLICTING_SENSORS')
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 font-bold'
                      : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Conflicting Sensors</span>
                  </div>
                  <p className="text-[9px] text-slate-400">Resolves via weighted consensus</p>
                </button>
              </div>
            </div>

            {/* Communication & Asset Failures */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Communication & Fleet Failures
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => toggleFailure('DRONE_FAILURE', 'UAV Lifesaver Drone Failure', 'Motor stall / battery exhaustion on DRONE-01', 'DRONE-01')}
                  className={`p-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                    isTypeActive('DRONE_FAILURE')
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 font-bold'
                      : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Cpu className="w-3.5 h-3.5" />
                    <span>Drone Mechanical Failure</span>
                  </div>
                  <p className="text-[9px] text-slate-400">Forces Lifeguard/Boat fallback</p>
                </button>

                <button
                  onClick={() => toggleFailure('NETWORK_FAILURE', 'Degraded Cellular Network', 'High latency & 40% packet loss on telemetry bus', undefined, { condition: 'DEGRADED' })}
                  className={`p-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                    isTypeActive('NETWORK_FAILURE')
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 font-bold'
                      : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <WifiOff className="w-3.5 h-3.5" />
                    <span>Network Latency (1200ms)</span>
                  </div>
                  <p className="text-[9px] text-slate-400">Delays emergency dispatches</p>
                </button>
              </div>
            </div>

            {/* Environmental & Stress Multipliers */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Environmental Stress Multipliers
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => toggleFailure('NIGHT_MODE', 'Nighttime Zero-Light Mode', 'Visibility drops to 1.5km; optical cameras degraded')}
                  className={`p-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                    isTypeActive('NIGHT_MODE')
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 font-bold'
                      : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Moon className="w-3.5 h-3.5" />
                    <span>Night Operation Mode</span>
                  </div>
                  <p className="text-[9px] text-slate-400">Searchlight beams & higher risk</p>
                </button>

                <button
                  onClick={() => toggleFailure('CROWD_SURGE', 'Extreme Crowd Surge', '500 beachgoers with 280 in water')}
                  className={`p-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                    isTypeActive('CROWD_SURGE')
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                      : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>Extreme Crowd Surge</span>
                  </div>
                  <p className="text-[9px] text-slate-400">Massive exposure stress test</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Explainable Fallback Strategy */}
        {activeTab === 'strategy' && (
          <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1 text-left">
            <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700 text-xs">
              <div className="font-bold text-cyan-300 mb-1 flex items-center justify-between">
                <span>System Fallback Directive</span>
                <span className="font-mono text-[10px] text-slate-400">{fallbackStrategy.activeLevel}</span>
              </div>
              <p className="text-[11px] text-slate-200 leading-relaxed font-sans mb-2">
                {fallbackStrategy.explanation}
              </p>

              <div className="border-t border-slate-700/60 pt-2 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Active Fallback Measures:
                </div>
                {fallbackStrategy.fallbackActions.length === 0 ? (
                  <p className="text-[11px] text-slate-400">None required (System operating normally)</p>
                ) : (
                  fallbackStrategy.fallbackActions.map((act, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-[11px] text-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{act}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Multidimensional Resilience Metrics */}
        {activeTab === 'resilience' && (
          <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1 text-left">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-800/70 border border-slate-700">
                <span className="text-[10px] text-slate-400 block">Failure Detection Rate</span>
                <div className="text-base font-bold text-cyan-300 font-mono mt-0.5">
                  {resilience.failureDetectionRate}%
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-800/70 border border-slate-700">
                <span className="text-[10px] text-slate-400 block">Fallback Activation</span>
                <div className="text-base font-bold text-emerald-300 font-mono mt-0.5">
                  {resilience.fallbackActivationRate}%
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-800/70 border border-slate-700">
                <span className="text-[10px] text-slate-400 block">Response Continuity</span>
                <div className="text-base font-bold text-amber-300 font-mono mt-0.5">
                  {resilience.responseContinuityRate}%
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-800/70 border border-slate-700">
                <span className="text-[10px] text-slate-400 block">Resource Recovery</span>
                <div className="text-base font-bold text-purple-300 font-mono mt-0.5">
                  {resilience.resourceRecoveryRate}%
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs">
              <div className="flex items-center justify-between font-bold text-emerald-300 mb-1">
                <span>Overall Resilience Index</span>
                <span className="text-sm font-mono">{resilience.overallResilienceIndex} / 100</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${resilience.overallResilienceIndex}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-purple-400">
          <Layers className="w-3.5 h-3.5" />
          Failure Injection Lab Ready
        </span>
        <span className="font-mono text-[10px] text-slate-400">
          Active Faults: {activeFailures.length}
        </span>
      </div>
    </div>
  );
};
