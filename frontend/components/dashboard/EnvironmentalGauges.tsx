'use client';

import React from 'react';
import { EnvironmentalState } from '@/lib/types';
import { Waves, Wind, Droplets, Eye, Activity, Cpu } from 'lucide-react';

interface EnvironmentalGaugesProps {
  env?: EnvironmentalState;
}

export const EnvironmentalGauges: React.FC<EnvironmentalGaugesProps> = ({ env }) => {
  if (!env) return null;

  const ripSeverity =
    env.rip_current_speed_mps >= 0.6
      ? 'text-red-400 bg-red-950/40 border-red-800'
      : env.rip_current_speed_mps >= 0.35
      ? 'text-amber-400 bg-amber-950/40 border-amber-800'
      : 'text-emerald-400 bg-emerald-950/40 border-emerald-800';

  const waveSeverity =
    env.wave_height_m >= 2.0
      ? 'text-red-400 bg-red-950/40 border-red-800'
      : env.wave_height_m >= 1.2
      ? 'text-amber-400 bg-amber-950/40 border-amber-800'
      : 'text-emerald-400 bg-emerald-950/40 border-emerald-800';

  const tideRateFormatted = (env.tide_rate_of_change_m_hr >= 0 ? '+' : '') + env.tide_rate_of_change_m_hr.toFixed(2);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Wave Height & Period */}
      <div className={`p-3 rounded-xl border ${waveSeverity} backdrop-blur-md flex flex-col justify-between transition-all`}>
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1 font-semibold uppercase tracking-wider">
            <Waves className="w-3.5 h-3.5" /> Wave Energy
          </span>
          <span className="font-mono text-[10px]">{env.wave_period_s.toFixed(1)}s Tp</span>
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-2xl font-black font-mono">{env.wave_height_m.toFixed(2)}</span>
          <span className="text-xs text-slate-400">m Hs</span>
        </div>
        <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
          <span>Dir: {env.wave_direction_deg.toFixed(0)}°</span>
          <span>{env.wave_height_m > 1.8 ? '⚠️ Heavy Surf' : 'Moderate'}</span>
        </div>
      </div>

      {/* 2. Rip Current Velocity */}
      <div className={`p-3 rounded-xl border ${ripSeverity} backdrop-blur-md flex flex-col justify-between transition-all`}>
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1 font-semibold uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5" /> Rip Velocity
          </span>
          <span className="font-mono text-[10px]">{env.rip_current_channel_zone}</span>
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-2xl font-black font-mono">{env.rip_current_speed_mps.toFixed(2)}</span>
          <span className="text-xs text-slate-400">m/s</span>
        </div>
        <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
          <span>Status: {env.rip_current_active ? '⚡ ACTIVE' : 'Dormant'}</span>
          <span>{env.rip_current_speed_mps > 0.4 ? 'Danger' : 'Normal'}</span>
        </div>
      </div>

      {/* 3. Tidal Dynamics */}
      <div className="p-3 rounded-xl border border-slate-700 bg-slate-900/60 backdrop-blur-md flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1 font-semibold uppercase tracking-wider">
            <Droplets className="w-3.5 h-3.5 text-cyan-400" /> Sea Level / Tide
          </span>
          <span className="font-mono text-[10px] text-cyan-400 uppercase">{env.tide_direction}</span>
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-2xl font-black font-mono text-cyan-300">{env.tide_level_m.toFixed(2)}</span>
          <span className="text-xs text-slate-400">m Datum</span>
        </div>
        <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
          <span>Rate:</span>
          <span className="font-mono text-cyan-400 font-semibold">{tideRateFormatted} m/hr</span>
        </div>
      </div>

      {/* 4. Wind & Gusts */}
      <div className="p-3 rounded-xl border border-slate-700 bg-slate-900/60 backdrop-blur-md flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1 font-semibold uppercase tracking-wider">
            <Wind className="w-3.5 h-3.5 text-blue-400" /> Wind Velocity
          </span>
          <span className="font-mono text-[10px] text-blue-400">{env.wind_direction_deg.toFixed(0)}°</span>
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-2xl font-black font-mono text-blue-300">{env.wind_speed_knots.toFixed(1)}</span>
          <span className="text-xs text-slate-400">knots</span>
        </div>
        <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
          <span>Sea Temp:</span>
          <span className="font-mono text-slate-300">{env.water_temperature_c.toFixed(1)}°C</span>
        </div>
      </div>

      {/* 5. Weather & Visibility */}
      <div className="p-3 rounded-xl border border-slate-700 bg-slate-900/60 backdrop-blur-md flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1 font-semibold uppercase tracking-wider">
            <Eye className="w-3.5 h-3.5 text-purple-400" /> Weather
          </span>
          <span className="font-mono text-[10px] text-purple-300 uppercase">{env.weather}</span>
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-2xl font-black font-mono text-purple-300">{(env.visibility_m / 1000).toFixed(1)}</span>
          <span className="text-xs text-slate-400">km Vis</span>
        </div>
        <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
          <span>Air: {env.temperature_c.toFixed(1)}°C</span>
          <span className="text-purple-400 font-semibold">{env.weather === 'squall' ? '⚠️ SQUALL' : 'Clear'}</span>
        </div>
      </div>

      {/* 6. Sensor Health Matrix */}
      <div className="p-3 rounded-xl border border-slate-700 bg-slate-900/60 backdrop-blur-md flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1 font-semibold uppercase tracking-wider">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" /> Sensors
          </span>
          <span className="text-[10px] text-emerald-400 font-mono">4/4 Nodes</span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] font-mono">
          {Object.entries(env.sensor_statuses).map(([key, s]) => (
            <div key={key} className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${s.status === 'failed' ? 'bg-red-500 animate-pulse' : s.status === 'degraded' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              <span className="text-slate-300 truncate">{key.replace('_01', '')}</span>
            </div>
          ))}
        </div>
        <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
          <span>Reliability:</span>
          <span className="text-emerald-400 font-semibold">99.8%</span>
        </div>
      </div>
    </div>
  );
};
