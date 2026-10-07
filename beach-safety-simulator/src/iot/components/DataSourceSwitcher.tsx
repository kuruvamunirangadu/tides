import React from 'react';
import { DataSourceMode } from '../IoTManager';

interface DataSourceSwitcherProps {
  mode: DataSourceMode;
  onModeChange: (mode: DataSourceMode) => void;
}

export const DataSourceSwitcher: React.FC<DataSourceSwitcherProps> = ({
  mode,
  onModeChange,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-xl space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="font-bold text-slate-200 uppercase tracking-wider text-xs flex items-center gap-1.5">
          <span>⚙️</span> Operational Ingestion Mode
        </span>
        <span className="text-[10px] font-mono text-cyan-400">Standard Sensor Interface</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          onClick={() => onModeChange('SIMULATION')}
          className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
            mode === 'SIMULATION'
              ? 'bg-cyan-950/60 border-cyan-500 ring-1 ring-cyan-500 text-cyan-200 shadow-md'
              : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <div className="font-bold text-xs flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            SIMULATION MODE
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Pure mathematical simulation physics feeding the Safety Engine.
          </p>
        </button>

        <button
          onClick={() => onModeChange('HYBRID')}
          className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
            mode === 'HYBRID'
              ? 'bg-emerald-950/60 border-emerald-500 ring-1 ring-emerald-500 text-emerald-200 shadow-md'
              : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <div className="font-bold text-xs flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            HYBRID MODE (RECOMMENDED)
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Real wave/tide/weather physical sensors + simulated visitor dynamics.
          </p>
        </button>

        <button
          onClick={() => onModeChange('REAL')}
          className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
            mode === 'REAL'
              ? 'bg-purple-950/60 border-purple-500 ring-1 ring-purple-500 text-purple-200 shadow-md'
              : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <div className="font-bold text-xs flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            FULL REAL MODE
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            100% physical telemetry from IoT Gateways, AIS GPS & live CCTV.
          </p>
        </button>
      </div>
    </div>
  );
};
