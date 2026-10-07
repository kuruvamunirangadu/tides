import React from 'react';
import { Waves, Shield, Clock, Activity, Radio, Cpu } from 'lucide-react';

interface SimulationHeaderProps {
  timeDisplay: string;
  isRunning: boolean;
  resilienceScore?: number;
  activeLevel?: string;
}

export const SimulationHeader: React.FC<SimulationHeaderProps> = ({
  timeDisplay,
  isRunning,
  resilienceScore = 100,
  activeLevel = 'FULL_CAPABILITY',
}) => {
  return (
    <header className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/95 border border-slate-800 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 shadow-xl backdrop-blur-md">
      {/* Brand & Coastal Jurisdiction */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div className="p-2 sm:p-2.5 bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 rounded-xl text-white shadow-lg shadow-cyan-500/20 shrink-0">
          <Shield className="w-4 h-4 sm:w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <h1 className="text-sm sm:text-base md:text-lg font-black tracking-tight text-white truncate">
              COASTAL BEACH SAFETY
            </h1>
            <span className="px-1.5 sm:px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-700/60 text-[9px] sm:text-[10px] font-mono text-cyan-300 font-bold">
              AP DISASTER MGMT
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-400 truncate">
            Integrated Multi-Beach Safety & UAV Command Platform
          </p>
        </div>
      </div>

      {/* Telemetry Status Badges */}
      <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 font-mono text-xs pt-1 sm:pt-0 border-t border-slate-800/80 sm:border-0">
        {/* Resilience Pill */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px]">
          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-slate-400">Resilience:</span>
          <span className="font-bold text-emerald-400">{resilienceScore}%</span>
        </div>

        {/* Engine Mode Pill */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px]">
          <Radio className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400">Mode:</span>
          <span className="font-bold text-cyan-300">{activeLevel}</span>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-slate-950 border border-slate-800">
          <span
            className={`w-2 h-2 rounded-full ${
              isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <span className="text-[11px] sm:text-xs font-bold text-slate-200">
            {isRunning ? 'RUNNING' : 'PAUSED'}
          </span>
        </div>

        {/* Clock */}
        <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-slate-950 border border-slate-800">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs sm:text-sm font-bold text-cyan-400">{timeDisplay}</span>
        </div>
      </div>
    </header>
  );
};
