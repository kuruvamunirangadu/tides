'use client';

import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Flame,
  AlertTriangle,
  Zap,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';
import { ScenarioMeta } from '@/lib/types';
import {
  postSimulationControl,
  postSetSpeed,
  postLoadScenario,
  postInjectEvent,
} from '@/lib/api';

interface SimulationControlsProps {
  isRunning: boolean;
  isPaused: boolean;
  speed: number;
  simClock: string;
  tick: number;
  currentScenarioId: string;
  scenarios: ScenarioMeta[];
  onScenarioChange?: (id: string) => void;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  isRunning,
  isPaused,
  speed,
  simClock,
  tick,
  currentScenarioId,
  scenarios,
  onScenarioChange,
}) => {
  const [loading, setLoading] = useState(false);

  const handlePlayPause = async () => {
    setLoading(true);
    try {
      if (isPaused) {
        await postSimulationControl('resume');
      } else if (isRunning) {
        await postSimulationControl('pause');
      } else {
        await postSimulationControl('start');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      await postSimulationControl('reset');
    } finally {
      setLoading(false);
    }
  };

  const handleStep = async () => {
    setLoading(true);
    try {
      await postSimulationControl('step');
    } finally {
      setLoading(false);
    }
  };

  const handleSpeedChange = async (s: number) => {
    await postSetSpeed(s);
  };

  const handleSelectScenario = async (id: string) => {
    setLoading(true);
    try {
      await postLoadScenario(id);
      if (onScenarioChange) onScenarioChange(id);
    } finally {
      setLoading(false);
    }
  };

  const handleInjectDistress = async () => {
    await postInjectEvent('emergency_distress', { zone_id: 'ZONE_B' });
  };

  const handleInjectRipSpike = async () => {
    await postInjectEvent('rip_current_spike', { value: 0.85 });
  };

  const handleInjectSensorFault = async () => {
    await postInjectEvent('sensor_failure', { sensor_id: 'wave_sensor_01' });
  };

  const handleChaosTest = async () => {
    await handleSelectScenario('chaos_mode');
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur-md space-y-4">
      {/* Top Header: Clock & Playback */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        {/* Simulation Clock & Ticks */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-black font-mono text-emerald-400">{simClock}</span>
            <span className="text-[10px] text-slate-500 font-mono">T+{tick}s</span>
          </div>
        </div>

        {/* Playback Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePlayPause}
            disabled={loading}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-md ${
              isPaused || !isRunning
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-amber-600 hover:bg-amber-500 text-white'
            }`}
          >
            {isPaused || !isRunning ? (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> Resume
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" /> Pause
              </>
            )}
          </button>

          <button
            onClick={handleStep}
            disabled={loading}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1"
          >
            <FastForward className="w-3.5 h-3.5" /> Step
          </button>

          <button
            onClick={handleReset}
            disabled={loading}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>

          {/* Speed Multipliers */}
          <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800 ml-2">
            {[1, 2, 5, 10].map((s) => (
              <button
                key={s}
                onClick={() => handleSpeedChange(s)}
                className={`px-2 py-1 rounded text-[11px] font-mono font-bold transition-all ${
                  speed === s
                    ? 'bg-cyan-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Middle Row: Scenario Selector */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-300 font-semibold">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>Active Scenario:</span>
        </div>
        <select
          value={currentScenarioId}
          onChange={(e) => handleSelectScenario(e.target.value)}
          className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500 font-mono w-full md:w-auto"
        >
          {scenarios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.category})
            </option>
          ))}
        </select>
      </div>

      {/* Bottom Row: Manual Injections & Chaos Button */}
      <div className="border-t border-slate-800/80 pt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-400" /> Quick Injections:
        </span>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleInjectDistress}
            className="px-2.5 py-1 bg-red-950/60 border border-red-800 hover:bg-red-900/60 text-red-300 text-xs rounded-md flex items-center gap-1 font-mono transition-all"
          >
            <Flame className="w-3 h-3 text-red-400" /> Swimmer Distress
          </button>

          <button
            onClick={handleInjectRipSpike}
            className="px-2.5 py-1 bg-amber-950/60 border border-amber-800 hover:bg-amber-900/60 text-amber-300 text-xs rounded-md flex items-center gap-1 font-mono transition-all"
          >
            <Activity className="w-3 h-3 text-amber-400" /> Rip Spike (+0.85m/s)
          </button>

          <button
            onClick={handleInjectSensorFault}
            className="px-2.5 py-1 bg-purple-950/60 border border-purple-800 hover:bg-purple-900/60 text-purple-300 text-xs rounded-md flex items-center gap-1 font-mono transition-all"
          >
            <AlertTriangle className="w-3 h-3 text-purple-400" /> Wave Sensor Failure
          </button>

          <button
            onClick={handleChaosTest}
            className="px-3 py-1 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold text-xs rounded-md flex items-center gap-1 shadow-lg transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" /> RUN CHAOS TEST
          </button>
        </div>
      </div>
    </div>
  );
};
