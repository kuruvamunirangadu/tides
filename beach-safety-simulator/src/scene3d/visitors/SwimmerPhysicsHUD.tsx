import React, { useState, useEffect } from 'react';
import { Waves, Activity, Compass, ShieldAlert, CheckCircle2, ChevronDown, ChevronUp, Droplets, Info } from 'lucide-react';
import { SwimmerMotionAdapter, SwimmerMotionStateInfo } from './SwimmerMotionAdapter';
import { Visitor } from '../../models/Visitor';
import { Beach } from '../../models/Beach';
import { Environment } from '../../models/Environment';
import { RipCurrentSimulator } from '../hazards/RipCurrentSimulator';

interface SwimmerPhysicsHUDProps {
  visitors: Visitor[];
  beach: Beach;
  environment: Environment;
  isNight?: boolean;
}

export const SwimmerPhysicsHUD: React.FC<SwimmerPhysicsHUDProps> = ({
  visitors,
  beach,
  environment,
  isNight = false,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [selectedSwimmerId, setSelectedSwimmerId] = useState<string | null>(null);
  const [motions, setMotions] = useState<SwimmerMotionStateInfo[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const adapter = SwimmerMotionAdapter.getInstance();
      const all = Array.from(adapter.getAllMotions().values());
      setMotions(all);
    }, 250);

    return () => clearInterval(interval);
  }, []);

  const adapter = SwimmerMotionAdapter.getInstance();

  // Aggregate breakdown
  const dryCount = motions.filter((m) => m.depthZone === 'DRY_BEACH').length;
  const shallowCount = motions.filter((m) => m.depthZone === 'SHALLOW_WATER').length;
  const wadeCount = motions.filter((m) => m.depthZone === 'WADEABLE_WATER').length;
  const swimCount = motions.filter((m) => m.depthZone === 'SWIMMING_WATER').length;
  const hazardCount = motions.filter((m) => m.depthZone === 'HAZARD_ZONE' || m.isInCurrentZone).length;

  const currentSpeed = environment.waterCurrent ?? environment.currentSpeed ?? 0.35;
  const waveHeight = environment.waveHeight ?? 1.2;

  // Handlers for controlled physical scenario injections
  const handleTestLateralEscape = () => {
    const candidate = visitors.find((v) => v.state === 'SWIMMING' || v.position.y > 280) || visitors[0];
    if (candidate) {
      candidate.position = { x: 540, y: 320 }; // inside rip channel
      candidate.swimmingAbility = 0.88;
      candidate.awarenessState = 'FLEEING';
      candidate.fatigue = 0.2;
      candidate.state = 'SWIMMING';
      setSelectedSwimmerId(candidate.id);

      // Trigger entrainment in rip simulator
      RipCurrentSimulator.getInstance().triggerRipScenario(visitors, beach);
    }
  };

  const handleTestDeepWaterNoPanic = () => {
    const candidate = visitors.find((v) => v.id !== selectedSwimmerId && (v.state === 'SWIMMING' || v.position.y > 270)) || visitors[1] || visitors[0];
    if (candidate) {
      candidate.position = { x: 320, y: 380 }; // Deep ocean (depth > 2.5m) outside rip
      candidate.swimmingAbility = 0.8;
      candidate.fatigue = 0.15;
      candidate.distressLevel = 0;
      candidate.state = 'SWIMMING';
      candidate.awarenessState = 'UNAWARE';
      setSelectedSwimmerId(candidate.id);
    }
  };

  const handleTestWadingResistance = () => {
    const candidate = visitors[2] || visitors[0];
    if (candidate) {
      candidate.position = { x: 420, y: 295 }; // Knee-deep swash
      candidate.state = 'WATER_ENTRY';
      candidate.fatigue = 0.1;
      setSelectedSwimmerId(candidate.id);
    }
  };

  return (
    <div
      className={`fixed top-16 right-4 z-40 w-96 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300 font-sans text-xs ${
        isNight
          ? 'bg-slate-900/90 border-slate-700/80 text-slate-100 shadow-indigo-950/40'
          : 'bg-slate-900/85 border-cyan-800/60 text-slate-100 shadow-cyan-950/30'
      }`}
    >
      {/* Header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-3.5 py-2.5 cursor-pointer border-b border-slate-800/80 bg-slate-800/40 hover:bg-slate-800/60 rounded-t-xl transition-colors"
      >
        <div className="flex items-center gap-2">
          <Waves className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="font-bold tracking-wide text-cyan-300 uppercase text-[11px]">
            Hydrodynamic Swimmer Physics
          </span>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-950/80 text-cyan-400 border border-cyan-700/50">
            M13
          </span>
        </div>
        <button className="text-slate-400 hover:text-white">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isOpen && (
        <div className="p-3 space-y-3 max-h-[80vh] overflow-y-auto">
          {/* Hydrodynamic Telemetry */}
          <div className="grid grid-cols-3 gap-1.5 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 font-mono text-[10px]">
            <div>
              <div className="text-slate-400 text-[9px]">WATER CURRENT</div>
              <div className="font-bold text-cyan-300">{currentSpeed.toFixed(2)} m/s</div>
            </div>
            <div>
              <div className="text-slate-400 text-[9px]">WAVE SWELL</div>
              <div className="font-bold text-teal-300">{waveHeight.toFixed(1)}m · {environment.wavePeriod ?? 8}s</div>
            </div>
            <div>
              <div className="text-slate-400 text-[9px]">TIDE ELEVATION</div>
              <div className="font-bold text-amber-300">{(environment.tideLevel ?? 1.2).toFixed(2)}m</div>
            </div>
          </div>

          {/* Depth Zone Breakdown */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
              <span>BATHYMETRIC STRATIFICATION</span>
              <span className="font-mono text-cyan-400">{motions.length} Bathers</span>
            </div>
            <div className="grid grid-cols-5 gap-1 text-center font-mono text-[10px]">
              <div className="p-1 rounded bg-amber-950/30 border border-amber-800/40 text-amber-300">
                <div className="text-[8px] text-slate-400">DRY</div>
                <div className="font-bold">{dryCount}</div>
              </div>
              <div className="p-1 rounded bg-teal-950/30 border border-teal-800/40 text-teal-300">
                <div className="text-[8px] text-slate-400">SWASH</div>
                <div className="font-bold">{shallowCount}</div>
              </div>
              <div className="p-1 rounded bg-cyan-950/30 border border-cyan-800/40 text-cyan-300">
                <div className="text-[8px] text-slate-400">WADING</div>
                <div className="font-bold">{wadeCount}</div>
              </div>
              <div className="p-1 rounded bg-blue-950/30 border border-blue-800/40 text-blue-300">
                <div className="text-[8px] text-slate-400">SWIM</div>
                <div className="font-bold">{swimCount}</div>
              </div>
              <div className="p-1 rounded bg-red-950/30 border border-red-800/40 text-red-300">
                <div className="text-[8px] text-slate-400">RIP/HAZ</div>
                <div className="font-bold">{hazardCount}</div>
              </div>
            </div>
          </div>

          {/* Interactive Physics Scenarios */}
          <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
            <div className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
              Physical Test Scenarios
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={handleTestLateralEscape}
                className="px-2 py-1.5 rounded bg-cyan-900/40 hover:bg-cyan-800/60 border border-cyan-700/60 text-cyan-200 text-[10px] font-medium transition-all"
                title="Entrain experienced swimmer in rip channel who swims perpendicular to escape seaward jet"
              >
                Lateral Escape
              </button>
              <button
                onClick={handleTestDeepWaterNoPanic}
                className="px-2 py-1.5 rounded bg-blue-900/40 hover:bg-blue-800/60 border border-blue-700/60 text-blue-200 text-[10px] font-medium transition-all"
                title="Verify swimmer in 2.5m water stays calm without false distress triggers"
              >
                Deep Water (Calm)
              </button>
              <button
                onClick={handleTestWadingResistance}
                className="px-2 py-1.5 rounded bg-teal-900/40 hover:bg-teal-800/60 border border-teal-700/60 text-teal-200 text-[10px] font-medium transition-all"
                title="Observe high-knee wading kinematics and water drag in swash zone"
              >
                Wading Drag
              </button>
            </div>
          </div>

          {/* Active Swimmers Table */}
          <div className="space-y-1 pt-1 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="font-semibold uppercase tracking-wider">Live Hydrodynamic Inspectors</span>
              <span className="text-[9px] text-slate-400">Top Active</span>
            </div>

            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
              {motions.slice(0, 6).map((m) => (
                <div
                  key={m.visitorId}
                  onClick={() => setSelectedSwimmerId(m.visitorId)}
                  className={`p-1.5 rounded border transition-all cursor-pointer flex items-center justify-between text-[10px] ${
                    selectedSwimmerId === m.visitorId
                      ? 'bg-cyan-950/80 border-cyan-500 text-white'
                      : 'bg-slate-950/40 border-slate-800/70 hover:bg-slate-800/40 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-cyan-400 font-bold">#{m.visitorId.slice(-4)}</span>
                    <span
                      className={`px-1 py-0.2 rounded text-[8px] font-semibold ${
                        m.motionState === 'DISTRESS'
                          ? 'bg-red-950 text-red-300 border border-red-700/60'
                          : m.motionState === 'STRUGGLING'
                          ? 'bg-amber-950 text-amber-300 border border-amber-700/60'
                          : m.motionState === 'LATERAL_ESCAPE_ATTEMPT'
                          ? 'bg-teal-950 text-teal-300 border border-teal-700/60'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {m.motionState.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[9px] text-slate-400">
                    <span>{m.localDepthMeters.toFixed(1)}m</span>
                    <span className="text-cyan-300">{m.animationState.toUpperCase()}</span>
                    {m.isInCurrentZone && (
                      <span className="text-red-400 font-bold">RIP</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Model Attribution Note */}
          <div className="p-2 rounded bg-slate-950/40 border border-slate-800/60 text-[9px] text-slate-400 flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
            <span>
              Demonstration bathymetric profile calibrated to Rushikonda Bay cross-shore geometry. Swimmer displacement combines individual propulsion, wave swash, and hydrodynamic current drag.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
