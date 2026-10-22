import React, { useState } from 'react';
import { Environment } from '../../models/Environment';
import { TidalPhase } from './tidal.types';
import {
  Waves,
  ArrowUpRight,
  ArrowDownLeft,
  Activity,
  Droplets,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  Compass,
  AlertTriangle,
  MoveRight,
  Split,
  Eye,
} from 'lucide-react';

interface TidalFlowHUDProps {
  environment: Environment;
  isLayerVisible: boolean;
  onToggleLayer: () => void;
  isDyeTracerVisible: boolean;
  onToggleDyeTracer: () => void;
  isFeederVisible?: boolean;
  onToggleFeeder?: () => void;
  isRipCorridorVisible?: boolean;
  onToggleRipCorridor?: () => void;
  isPlumeVisible?: boolean;
  onTogglePlume?: () => void;
  onClose?: () => void;
}

export const TidalFlowHUD: React.FC<TidalFlowHUDProps> = ({
  environment,
  isLayerVisible,
  onToggleLayer,
  isDyeTracerVisible,
  onToggleDyeTracer,
  isFeederVisible = true,
  onToggleFeeder,
  isRipCorridorVisible = true,
  onToggleRipCorridor,
  isPlumeVisible = true,
  onTogglePlume,
  onClose,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const tideLevel = environment.tideLevel ?? 1.4;
  const tidePhase: TidalPhase = environment.tideStatus ?? (tideLevel > 1.4 ? 'RISING' : 'FALLING');
  const currentSpeed = environment.currentSpeed ?? environment.waterCurrent ?? 0.35;
  const currentDirDeg = environment.currentDirection ?? (tidePhase === 'RISING' ? 10 : 190);
  const waveHeight = environment.waveHeight ?? 1.2;

  // Rip Neck Acceleration (Image 2 reference: 1.8x acceleration through channel neck)
  const ripNeckSpeed = (currentSpeed * 1.8).toFixed(2);
  const isRipSevere = currentSpeed >= 0.7;

  // Flow intensity rating
  const getIntensityLabel = (speed: number) => {
    if (speed > 1.1) return { label: 'STRONG JET', color: 'text-lime-400 bg-lime-950/60 border-lime-500/40' };
    if (speed >= 0.5) return { label: 'MODERATE FLOW', color: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40' };
    return { label: 'GENTLE DRIFT', color: 'text-cyan-400 bg-cyan-950/60 border-cyan-500/40' };
  };

  const intensity = getIntensityLabel(currentSpeed);

  return (
    <div className="w-84 bg-slate-900/95 backdrop-blur-md rounded-2xl border border-cyan-500/30 shadow-2xl overflow-hidden font-mono text-xs select-none pointer-events-auto">
      {/* Header */}
      <div className="px-3.5 py-2.5 bg-gradient-to-r from-cyan-950/80 via-slate-900 to-slate-900 border-b border-cyan-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Waves className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="font-bold text-cyan-300 tracking-wider uppercase text-[11px]">
            Tidal Flow & Rip-Current Mapping
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
            title={isCollapsed ? 'Expand Panel' : 'Collapse Panel'}
          >
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition"
              title="Close HUD"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-3 space-y-3">
          {/* Telemetry Metrics Grid */}
          <div className="grid grid-cols-2 gap-2">
            {/* Tide Level Card */}
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">TIDE ELEVATION</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-base font-bold text-white">{tideLevel.toFixed(2)}m</span>
                <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${tidePhase === 'RISING' ? 'text-sky-400' : 'text-teal-400'}`}>
                  {tidePhase === 'RISING' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                  {tidePhase}
                </span>
              </div>
            </div>

            {/* Current Velocity Card */}
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">FLOW VELOCITY</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-base font-bold text-white">{currentSpeed.toFixed(2)}</span>
                <span className="text-[10px] text-slate-400">m/s</span>
                <span className={`ml-auto text-[9px] px-1 py-0.2 rounded border font-semibold ${intensity.color}`}>
                  {intensity.label}
                </span>
              </div>
            </div>
          </div>

          {/* Rip Current Hazard Alert Card (Phase 2) */}
          <div className={`p-2 rounded-xl border flex items-center justify-between text-[11px] ${
            isRipSevere
              ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
              : 'bg-slate-950/80 border-slate-800 text-slate-300'
          }`}>
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-4 h-4 ${isRipSevere ? 'text-amber-400 animate-bounce' : 'text-slate-400'}`} />
              <div>
                <span className="font-bold block text-[10px] uppercase tracking-wider">Rip Corridor (X=12m)</span>
                <span className="text-[10px] text-slate-400">Neck Velocity: <strong className="text-amber-300">{ripNeckSpeed} m/s</strong></span>
              </div>
            </div>
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
              isRipSevere ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
            }`}>
              {isRipSevere ? 'HAZARDOUS' : 'MONITORED'}
            </span>
          </div>

          {/* Flow Direction & Swell */}
          <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>Flow: <strong className="text-cyan-300">{currentDirDeg}° ({tidePhase === 'RISING' ? 'Shoreward' : 'Offshore'})</strong></span>
            </div>
            <div className="flex items-center gap-1 text-slate-400">
              <span>Wave: <strong className="text-white">{waveHeight.toFixed(1)}m</strong></span>
            </div>
          </div>

          {/* Interactive Layer Toggles */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              3D Hydrodynamic Overlays
            </span>

            {/* Toggle 1: Tidal Vectors */}
            <button
              onClick={onToggleLayer}
              className={`w-full py-1.5 px-2.5 rounded-xl border flex items-center justify-between text-left transition cursor-pointer ${
                isLayerVisible
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                  : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-400'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Directional Flow Vectors</span>
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isLayerVisible ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-500'}`}>
                {isLayerVisible ? 'ACTIVE' : 'OFF'}
              </span>
            </button>

            {/* Toggle 2: Fluorescent Dye Tracer */}
            <button
              onClick={onToggleDyeTracer}
              className={`w-full py-1.5 px-2.5 rounded-xl border flex items-center justify-between text-left transition cursor-pointer ${
                isDyeTracerVisible
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold'
                  : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-400'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5 text-emerald-400" />
                <span>Fluorescent Dye Tracer (Field Pilot)</span>
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isDyeTracerVisible ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-500'}`}>
                {isDyeTracerVisible ? 'SIMULATING' : 'OFF'}
              </span>
            </button>

            {/* Toggle 3: Longshore Feeder Channels (Phase 2) */}
            {onToggleFeeder && (
              <button
                onClick={onToggleFeeder}
                className={`w-full py-1.5 px-2.5 rounded-xl border flex items-center justify-between text-left transition cursor-pointer ${
                  isFeederVisible
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                    : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-400'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <MoveRight className="w-3.5 h-3.5 text-amber-400" />
                  <span>Longshore Feeder Channels</span>
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isFeederVisible ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-500'}`}>
                  {isFeederVisible ? 'CONVERGING' : 'OFF'}
                </span>
              </button>
            )}

            {/* Toggle 4: Rip Neck Corridor (Phase 2) */}
            {onToggleRipCorridor && (
              <button
                onClick={onToggleRipCorridor}
                className={`w-full py-1.5 px-2.5 rounded-xl border flex items-center justify-between text-left transition cursor-pointer ${
                  isRipCorridorVisible
                    ? 'bg-orange-500/20 text-orange-300 border-orange-500/50 font-bold'
                    : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-400'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-orange-400" />
                  <span>Rip Neck Corridor Jet (X=12m)</span>
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isRipCorridorVisible ? 'bg-orange-500 text-slate-950' : 'bg-slate-800 text-slate-500'}`}>
                  {isRipCorridorVisible ? 'ACCELERATED' : 'OFF'}
                </span>
              </button>
            )}

            {/* Toggle 5: Expanding Offshore Head Plume (Phase 2) */}
            {onTogglePlume && (
              <button
                onClick={onTogglePlume}
                className={`w-full py-1.5 px-2.5 rounded-xl border flex items-center justify-between text-left transition cursor-pointer ${
                  isPlumeVisible
                    ? 'bg-teal-500/20 text-teal-300 border-teal-500/50 font-bold'
                    : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-400'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Split className="w-3.5 h-3.5 text-teal-400" />
                  <span>Offshore Dispersal Plume & Eddies</span>
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isPlumeVisible ? 'bg-teal-500 text-slate-950' : 'bg-slate-800 text-slate-500'}`}>
                  {isPlumeVisible ? 'DISPERSING' : 'OFF'}
                </span>
              </button>
            )}
          </div>

          {/* Color Scale Legend */}
          <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Current Intensity Scale (Hydrodynamic Bathymetry)
            </span>
            <div className="grid grid-cols-4 gap-1 text-[9px] text-center font-bold">
              <div className="py-1 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
                &lt; 0.5<br /><span className="text-[8px] font-normal text-slate-400">Gentle</span>
              </div>
              <div className="py-1 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
                0.5-1.0<br /><span className="text-[8px] font-normal text-slate-400">Moderate</span>
              </div>
              <div className="py-1 rounded bg-amber-950/60 border border-amber-500/40 text-amber-300">
                1.0-1.4<br /><span className="text-[8px] font-normal text-slate-400">Feeder</span>
              </div>
              <div className="py-1 rounded bg-rose-950/60 border border-rose-500/40 text-rose-300">
                &gt; 1.4<br /><span className="text-[8px] font-normal text-slate-400">Rip Jet</span>
              </div>
            </div>
          </div>

          {/* Data Provenance Footer */}
          <div className="pt-1 text-[9px] text-slate-500 flex items-center justify-between border-t border-slate-800/80">
            <span>PROVENANCE:</span>
            <span className="text-cyan-400 font-semibold">AP Coastal Hydrodynamics Model</span>
          </div>
        </div>
      )}
    </div>
  );
};
