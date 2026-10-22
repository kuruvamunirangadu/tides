import React, { useState } from 'react';
import { Environment } from '../../models/Environment';
import { ShoalingHydroMetrics, BreakerType } from './shoaling.types';
import {
  Waves,
  Activity,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
  Gauge,
  Sliders,
  ShieldAlert,
  ArrowDownToLine,
  Flame,
  Info,
} from 'lucide-react';

interface WaveShoalingHUDProps {
  environment: Environment;
  metrics: ShoalingHydroMetrics;
  isLayerVisible: boolean;
  onToggleLayer: () => void;
  isShoalingMeshVisible: boolean;
  onToggleShoalingMesh: () => void;
  isBreakerLinesVisible: boolean;
  onToggleBreakerLines: () => void;
  isFoamRollersVisible: boolean;
  onToggleFoamRollers: () => void;
  isRipGapVisible: boolean;
  onToggleRipGap: () => void;
  isBreakerDemarcationVisible: boolean;
  onToggleBreakerDemarcation: () => void;
  onSelectSwellPreset?: (height: number, period: number) => void;
  onClose?: () => void;
}

export const WaveShoalingHUD: React.FC<WaveShoalingHUDProps> = ({
  environment,
  metrics,
  isLayerVisible,
  onToggleLayer,
  isShoalingMeshVisible,
  onToggleShoalingMesh,
  isBreakerLinesVisible,
  onToggleBreakerLines,
  isFoamRollersVisible,
  onToggleFoamRollers,
  isRipGapVisible,
  onToggleRipGap,
  isBreakerDemarcationVisible,
  onToggleBreakerDemarcation,
  onSelectSwellPreset,
  onClose,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [showInfo, setShowInfo] = useState<boolean>(false);

  // Breaker regime styling
  const getRegimeBadge = (type: BreakerType) => {
    switch (type) {
      case 'SPILLING':
        return {
          label: 'SPILLING BREAKER',
          badge: 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40',
          desc: 'Gentle slope; gradual crest foam sliding',
        };
      case 'PLUNGING':
        return {
          label: 'PLUNGING BREAKER',
          badge: 'bg-amber-950/80 text-amber-400 border-amber-500/40',
          desc: 'Curled wave tube; violent impact onto bar',
        };
      case 'SURGING':
        return {
          label: 'SURGING BREAKER',
          badge: 'bg-rose-950/80 text-rose-400 border-rose-500/40',
          desc: 'Steep headland; wave surges without break',
        };
    }
  };

  const regime = getRegimeBadge(metrics.breakerType);

  return (
    <div className="w-88 bg-slate-900/95 backdrop-blur-md rounded-2xl border border-sky-500/30 shadow-2xl overflow-hidden font-mono text-xs select-none pointer-events-auto">
      {/* Header */}
      <div className="px-3.5 py-2.5 bg-gradient-to-r from-sky-950/90 via-slate-900 to-slate-900 border-b border-sky-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Waves className="w-4 h-4 text-sky-400 animate-pulse" />
          <span className="font-bold text-sky-300 tracking-wider uppercase text-[11px]">
            Wave Shoaling & Breaker Dynamics
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowInfo((prev) => !prev)}
            className={`p-1 rounded transition ${showInfo ? 'text-sky-300 bg-sky-900/40' : 'text-slate-400 hover:text-white'}`}
            title="Coastal Science Notes"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
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

      {/* Main Body */}
      {!isCollapsed && (
        <div className="p-3.5 space-y-3">
          {/* Regime Badge & Master Toggle */}
          <div className="flex items-center justify-between">
            <div className={`px-2 py-0.5 rounded border text-[10px] font-bold tracking-wide ${regime.badge}`}>
              {regime.label}
            </div>
            <button
              onClick={onToggleLayer}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition flex items-center gap-1.5 ${
                isLayerVisible
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              <Activity className="w-3 h-3" />
              {isLayerVisible ? '3D LAYER: ON' : '3D LAYER: OFF'}
            </button>
          </div>

          {/* Educational Callout if Open */}
          {showInfo && (
            <div className="p-2.5 bg-sky-950/40 border border-sky-500/30 rounded-xl space-y-1.5 text-[10px] text-slate-300">
              <div className="font-bold text-sky-300 flex items-center gap-1">
                <Info className="w-3 h-3 text-sky-400" />
                Physical Coastal Mechanics
              </div>
              <p className="text-slate-400 leading-relaxed">
                • <strong>Green's Law Shoaling</strong>: As depth <em>h</em> shallows, wave energy flux is conserved, causing wave height <em>H</em> to steepen.
              </p>
              <p className="text-slate-400 leading-relaxed">
                • <strong>McCowan Breaking (&gamma; = 0.78)</strong>: Waves become unstable and break into turbulent foam rollers when <em>H / h &ge; 0.78</em>.
              </p>
              <p className="text-amber-300 leading-relaxed">
                • <strong>Rip Gap Hazard</strong>: Over the rip current trench (3.8m depth), deeper water prevents waves from breaking. Swimmers mistake this dark foam-free channel for "calm water" and enter the rip trap!
              </p>
            </div>
          )}

          {/* Live Telemetry Grid */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            {/* Deep Water Swell */}
            <div className="p-2 bg-slate-800/60 rounded-xl border border-slate-700/50 space-y-1">
              <div className="text-slate-400 text-[10px] uppercase flex items-center gap-1">
                <Waves className="w-3 h-3 text-sky-400" />
                Deep Swell (H₀)
              </div>
              <div className="text-base font-bold text-white flex items-baseline gap-1">
                {metrics.deepWaterWaveHeight.toFixed(1)} <span className="text-xs font-normal text-slate-400">m</span>
                <span className="text-[10px] text-sky-400 ml-1 font-mono">@{metrics.wavePeriod.toFixed(1)}s</span>
              </div>
              <div className="text-[9px] text-slate-400">
                Wavelength: <span className="text-slate-300">{metrics.deepWaterWavelengthMeters}m</span>
              </div>
            </div>

            {/* Breaker Zone */}
            <div className="p-2 bg-slate-800/60 rounded-xl border border-slate-700/50 space-y-1">
              <div className="text-slate-400 text-[10px] uppercase flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-400" />
                Breaker (H_b)
              </div>
              <div className="text-base font-bold text-amber-300 flex items-baseline gap-1">
                {metrics.breakerWaveHeight.toFixed(2)} <span className="text-xs font-normal text-slate-400">m</span>
                <span className="text-[10px] text-emerald-400 ml-1 font-mono">+{Math.round((metrics.maxShoalingFactor - 1) * 100)}%</span>
              </div>
              <div className="text-[9px] text-slate-400">
                Break Depth: <span className="text-slate-300">{metrics.breakerDepthMeters}m</span>
              </div>
            </div>
          </div>

          {/* Hydrodynamic Indices */}
          <div className="p-2.5 bg-slate-800/40 rounded-xl border border-slate-700/40 space-y-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Surf Zone Width:</span>
              <span className="font-bold text-sky-300">{metrics.surfZoneWidthMeters} meters</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Iribarren Number (&xi;):</span>
              <span className="font-bold text-slate-200">{metrics.iribarrenNumber} ({metrics.breakerType})</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">McCowan Breaker Ratio:</span>
              <span className="font-bold text-emerald-400">&gamma; = {metrics.breakerIndexGamma}</span>
            </div>
          </div>

          {/* Rip Current Gap Callout */}
          <div className="p-2.5 bg-gradient-to-r from-amber-950/40 to-slate-900 border border-amber-500/40 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-300 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                RIP CURRENT GAP HAZARD
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300">
                {metrics.ripGap.isBreakerSuppressed ? 'GAP ACTIVE' : 'BREAKING'}
              </span>
            </div>
            <p className="text-[9px] text-slate-300 leading-tight">
              Trench depth: <strong className="text-amber-200">{metrics.ripGap.centerDepthMeters.toFixed(1)}m</strong> vs sandbar{' '}
              <strong className="text-sky-200">{metrics.ripGap.sandbarDepthMeters.toFixed(1)}m</strong>. Deep channel suppresses wave breaks, creating a false "calm water" illusion.
            </p>
          </div>

          {/* Subsystem Toggles */}
          <div className="space-y-1.5 pt-1">
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
              3D Display Subsystems
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={onToggleShoalingMesh}
                className={`px-2 py-1.5 rounded-lg border text-left transition flex items-center justify-between text-[10px] ${
                  isShoalingMeshVisible
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                    : 'bg-slate-800/60 text-slate-500 border-slate-700/40'
                }`}
              >
                <span>Shoaling Mesh</span>
                <span className="font-bold">{isShoalingMeshVisible ? 'ON' : 'OFF'}</span>
              </button>

              <button
                onClick={onToggleBreakerLines}
                className={`px-2 py-1.5 rounded-lg border text-left transition flex items-center justify-between text-[10px] ${
                  isBreakerLinesVisible
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                    : 'bg-slate-800/60 text-slate-500 border-slate-700/40'
                }`}
              >
                <span>Breaker Crests</span>
                <span className="font-bold">{isBreakerLinesVisible ? 'ON' : 'OFF'}</span>
              </button>

              <button
                onClick={onToggleFoamRollers}
                className={`px-2 py-1.5 rounded-lg border text-left transition flex items-center justify-between text-[10px] ${
                  isFoamRollersVisible
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                    : 'bg-slate-800/60 text-slate-500 border-slate-700/40'
                }`}
              >
                <span>Foam Rollers</span>
                <span className="font-bold">{isFoamRollersVisible ? 'ON' : 'OFF'}</span>
              </button>

              <button
                onClick={onToggleRipGap}
                className={`px-2 py-1.5 rounded-lg border text-left transition flex items-center justify-between text-[10px] ${
                  isRipGapVisible
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800/60 text-slate-500 border-slate-700/40'
                }`}
              >
                <span>Rip Gap Marker</span>
                <span className="font-bold">{isRipGapVisible ? 'ON' : 'OFF'}</span>
              </button>
            </div>

            <button
              onClick={onToggleBreakerDemarcation}
              className={`w-full px-2 py-1.5 rounded-lg border text-left transition flex items-center justify-between text-[10px] mt-1 ${
                isBreakerDemarcationVisible
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-slate-800/60 text-slate-500 border-slate-700/40'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <ArrowDownToLine className="w-3 h-3 text-rose-400" />
                Breaker Limit Contour (Demarcation Line)
              </span>
              <span className="font-bold">{isBreakerDemarcationVisible ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          {/* Quick Swell Presets */}
          {onSelectSwellPreset && (
            <div className="space-y-1 pt-1 border-t border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                Swell Simulation Scenarios
              </div>
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => onSelectSwellPreset(0.8, 6.5)}
                  className="px-1.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[9px] text-slate-300 border border-slate-700 transition"
                  title="Calm Swell (0.8m, 6.5s)"
                >
                  Calm (0.8m)
                </button>
                <button
                  onClick={() => onSelectSwellPreset(1.6, 9.0)}
                  className="px-1.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[9px] text-sky-300 border border-slate-700 transition"
                  title="Moderate Surf (1.6m, 9.0s)"
                >
                  Moderate (1.6m)
                </button>
                <button
                  onClick={() => onSelectSwellPreset(2.6, 11.5)}
                  className="px-1.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[9px] text-amber-300 border border-slate-700 transition"
                  title="Monsoon Rough (2.6m, 11.5s)"
                >
                  Rough (2.6m)
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

