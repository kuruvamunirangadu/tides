import React, { useState } from 'react';
import { Environment } from '../models/Environment';
import { BeachRiskOverview, RiskCategory } from '../models/Risk';
import {
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Waves,
  Zap,
  Wind,
  Eye,
  Users,
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  Activity,
  Flame,
  LifeBuoy,
  Radio,
  CheckCircle2,
  RefreshCw,
  Compass,
} from 'lucide-react';

import { BeachPresetId } from '../models/Beach';
import { COASTAL_BEACH_PRESETS } from '../data/beachPresets';

interface ExperimentControlLabProps {
  environment: Environment;
  riskOverview?: BeachRiskOverview;
  riskHistory?: Array<{
    time: string;
    timestamp: number;
    riskScore: number;
    hazardScore: number;
    exposureScore: number;
    vulnerabilityScore: number;
    responseScore: number;
    primaryCause: string;
    activeSwimmers: number;
    distressedCount: number;
  }>;
  selectedBeachPreset?: BeachPresetId;
  onSelectBeachPreset?: (preset: BeachPresetId) => void;
  safetyInterventionsActive?: boolean;
  isManualEnvironmentActive?: boolean;
  totalVisitors: number;
  activeSwimmersCount: number;
  running: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSetManualEnvironment: (overrides: Partial<Environment>) => void;
  onResetManualEnvironment: () => void;
  onSetVisitorPopulation: (count: number, swimmerRatio?: number, riskTakerRatio?: number) => void;
  onSetSafetyInterventionsActive: (active: boolean) => void;
  onInjectHazardScenario: (type: 'HIGH_WAVES' | 'STRONG_CURRENT' | 'RIP_CURRENT' | 'RAPID_TIDE' | 'POOR_VISIBILITY' | 'STORM_SQUALL' | 'CROWD_SURGE' | 'RESTRICTED_BREACH' | 'COMPOUND_CRISIS') => void;
  onRunRiskProgression: (presetKey: 'CALM_TO_CRISIS' | 'STORM_SURGE' | 'MASS_RESCUE') => void;
}

export const ExperimentControlLab: React.FC<ExperimentControlLabProps> = ({
  environment,
  riskOverview,
  riskHistory = [],
  selectedBeachPreset = 'RUSHIKONDA_VIZAG',
  onSelectBeachPreset,
  safetyInterventionsActive = true,
  isManualEnvironmentActive = false,
  totalVisitors,
  activeSwimmersCount,
  running,
  onStart,
  onPause,
  onReset,
  onSetManualEnvironment,
  onResetManualEnvironment,
  onSetVisitorPopulation,
  onSetSafetyInterventionsActive,
  onInjectHazardScenario,
  onRunRiskProgression,
}) => {
  const [swimmerPct, setSwimmerPct] = useState<number>(60);
  const [riskTakerPct, setRiskTakerPct] = useState<number>(15);
  const [activeTab, setActiveTab] = useState<'sliders' | 'hazard_injection' | 'progression' | 'attribution'>('sliders');

  const currentRiskScore = riskOverview?.overallBeachRiskScore || 15;
  const currentCategory: RiskCategory = riskOverview?.overallCategory || 'LOW';

  const getRiskBadgeColor = (cat: RiskCategory) => {
    switch (cat) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-400 border-red-500/60';
      case 'HIGH':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/60';
      case 'MODERATE':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/60';
      case 'LOW':
      default:
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/60';
    }
  };

  // Attribution Factor breakdown
  const currentSpeed = environment.currentSpeed ?? environment.waterCurrent ?? 0.3;
  const waveHeight = environment.waveHeight ?? 0.8;
  const windSpeed = environment.windSpeed ?? 12;

  // Normalized contributor weights for explainability (sum to 100%)
  const currentWeight = Math.min(40, Math.round((currentSpeed / 2.0) * 40));
  const waveWeight = Math.min(30, Math.round((waveHeight / 3.0) * 30));
  const crowdWeight = Math.min(25, Math.round((activeSwimmersCount / 120) * 25));
  const windWeight = Math.min(15, Math.round((windSpeed / 60) * 15));
  const rawSum = currentWeight + waveWeight + crowdWeight + windWeight;
  const normFactor = rawSum > 0 ? 100 / rawSum : 1;

  const currentPct = Math.round(currentWeight * normFactor);
  const wavePct = Math.round(waveWeight * normFactor);
  const crowdPct = Math.round(crowdWeight * normFactor);
  const windPct = Math.max(0, 100 - currentPct - wavePct - crowdPct);

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-3 sm:p-5 shadow-2xl backdrop-blur-xl space-y-4 text-left">
      {/* 1. Header Bar with Simulation Mode, Beach Preset Selector & Live Risk Metric */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500 via-purple-600 to-cyan-500 rounded-xl text-white shadow-lg shadow-indigo-500/20 shrink-0">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black tracking-tight text-white uppercase">
                Simulation Experiment & Risk Control Lab
              </h2>
              {isManualEnvironmentActive && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono border border-amber-500/40 animate-pulse">
                  MANUAL OVERRIDES ACTIVE
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-xs text-slate-400">Target Beach Preset:</span>
              <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                <button
                  onClick={() => onSelectBeachPreset && onSelectBeachPreset('RUSHIKONDA_VIZAG')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                    selectedBeachPreset === 'RUSHIKONDA_VIZAG'
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  🏖️ Rushikonda Blue Flag (Vizag)
                </button>
                <button
                  onClick={() => onSelectBeachPreset && onSelectBeachPreset('SURYALANKA_BAPATLA')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                    selectedBeachPreset === 'SURYALANKA_BAPATLA'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  🌊 Suryalanka / Bapatla Beach
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Directly manipulate underlying marine conditions and observe causal chain reaction
            </p>
          </div>
        </div>

        {/* Risk Output Summary Meter */}
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${getRiskBadgeColor(currentCategory)}`}>
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <div>
              <div className="text-[9px] uppercase font-mono tracking-wider">Dynamic Risk Score</div>
              <div className="text-sm font-black font-mono leading-none">{currentRiskScore}/100 [{currentCategory}]</div>
            </div>
          </div>

          {/* Safety System Active / Passive Toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
            <button
              onClick={() => onSetSafetyInterventionsActive(true)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                safetyInterventionsActive
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>INTERVENTIONS ACTIVE</span>
            </button>
            <button
              onClick={() => onSetSafetyInterventionsActive(false)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                !safetyInterventionsActive
                  ? 'bg-rose-500 text-white shadow-sm animate-pulse'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>PASSIVE (NO RESCUES)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Mode Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-slate-800/80 pb-2 text-xs">
        <button
          onClick={() => setActiveTab('sliders')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'sliders'
              ? 'bg-cyan-500 text-slate-950 shadow-sm'
              : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>1. Runtime Environment Sliders</span>
        </button>

        <button
          onClick={() => setActiveTab('hazard_injection')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'hazard_injection'
              ? 'bg-purple-500 text-white shadow-sm'
              : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>2. Hazard Injection Lab (9 Scenarios)</span>
        </button>

        <button
          onClick={() => setActiveTab('progression')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'progression'
              ? 'bg-indigo-500 text-white shadow-sm'
              : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-cyan-300" />
          <span>3. Automated Risk Progression Presets</span>
        </button>

        <button
          onClick={() => setActiveTab('attribution')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'attribution'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>4. Real-time Risk Graph & Attribution</span>
        </button>
      </div>

      {/* Tab 1: Dynamic Sliders for Every Major Environmental & Crowd Condition */}
      {activeTab === 'sliders' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Wave Height Slider */}
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Waves className="w-3.5 h-3.5 text-cyan-400" /> Wave Height (Hs)
                </span>
                <span className="font-mono font-black text-cyan-300 text-sm">{environment.waveHeight.toFixed(1)} m</span>
              </div>
              <input
                type="range"
                min={0.4}
                max={4.0}
                step={0.1}
                value={environment.waveHeight}
                onChange={(e) => onSetManualEnvironment({ waveHeight: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0.4m (Calm)</span>
                <span>1.8m (Warning)</span>
                <span>4.0m (Hazardous Surf)</span>
              </div>
            </div>

            {/* Wave Period Slider */}
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Waves className="w-3.5 h-3.5 text-teal-400" /> Wave Period (Tp)
                </span>
                <span className="font-mono font-black text-teal-300 text-sm">{(environment.wavePeriod ?? 8).toFixed(1)} s</span>
              </div>
              <input
                type="range"
                min={4.0}
                max={18.0}
                step={0.5}
                value={environment.wavePeriod ?? 8}
                onChange={(e) => onSetManualEnvironment({ wavePeriod: parseFloat(e.target.value) })}
                className="w-full accent-teal-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>4.0s (Wind Chop)</span>
                <span>10.0s (Moderate)</span>
                <span>18.0s (High Energy Swell)</span>
              </div>
            </div>

            {/* Current Speed Slider */}
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" /> Current Speed (v_rip)
                </span>
                <span className="font-mono font-black text-amber-300 text-sm">
                  {(environment.currentSpeed ?? environment.waterCurrent).toFixed(2)} m/s
                </span>
              </div>
              <input
                type="range"
                min={0.1}
                max={2.5}
                step={0.05}
                value={environment.currentSpeed ?? environment.waterCurrent}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onSetManualEnvironment({
                    waterCurrent: val,
                    currentSpeed: val,
                    ripProbability: val > 0.8 ? 0.9 : 0.3,
                  });
                }}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0.1 m/s (Mild)</span>
                <span>0.8 m/s (Rip Threshold)</span>
                <span>2.5 m/s (Severe Outflow)</span>
              </div>
            </div>

            {/* Current Direction Slider */}
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-purple-400" /> Current Direction
                </span>
                <span className="font-mono font-black text-purple-300 text-sm">
                  {environment.currentDirection ?? 180}° (Seaward)
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={360}
                step={15}
                value={environment.currentDirection ?? 180}
                onChange={(e) => onSetManualEnvironment({ currentDirection: parseInt(e.target.value) })}
                className="w-full accent-purple-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>90° (Alongshore)</span>
                <span>180° (Seaward Rip)</span>
                <span>270° (Alongshore)</span>
              </div>
            </div>

            {/* Tide Level Slider */}
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Waves className="w-3.5 h-3.5 text-sky-400" /> Tide Level & Status
                </span>
                <span className="font-mono font-black text-sky-300 text-sm">
                  {environment.tideLevel.toFixed(2)} m ({environment.tideStatus ?? 'MID'})
                </span>
              </div>
              <input
                type="range"
                min={0.2}
                max={2.6}
                step={0.05}
                value={environment.tideLevel}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onSetManualEnvironment({
                    tideLevel: val,
                    tideStatus: val < 0.6 ? 'LOW' : val > 1.8 ? 'HIGH' : 'RISING',
                  });
                }}
                className="w-full accent-sky-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0.2m (Low Tide Chute)</span>
                <span>1.3m (Mid-Tide)</span>
                <span>2.6m (High Inundation)</span>
              </div>
            </div>

            {/* Wind Speed Slider */}
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Wind className="w-3.5 h-3.5 text-blue-400" /> Wind Speed
                </span>
                <span className="font-mono font-black text-blue-300 text-sm">{environment.windSpeed.toFixed(0)} km/h</span>
              </div>
              <input
                type="range"
                min={5}
                max={85}
                step={2}
                value={environment.windSpeed}
                onChange={(e) => onSetManualEnvironment({ windSpeed: parseFloat(e.target.value) })}
                className="w-full accent-blue-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>5 km/h (Breeze)</span>
                <span>35 km/h (Moderate)</span>
                <span>85 km/h (Gale Squall)</span>
              </div>
            </div>

            {/* Visibility Slider */}
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-indigo-400" /> Visibility & Weather
                </span>
                <span className="font-mono font-black text-indigo-300 text-sm">
                  {environment.visibility.toFixed(1)} km ({environment.weather})
                </span>
              </div>
              <input
                type="range"
                min={0.3}
                max={15}
                step={0.5}
                value={environment.visibility}
                onChange={(e) => {
                  const vis = parseFloat(e.target.value);
                  onSetManualEnvironment({
                    visibility: vis,
                    weather: vis < 2 ? 'FOG' : vis < 6 ? 'RAIN' : 'CLEAR',
                  });
                }}
                className="w-full accent-indigo-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0.3 km (Dense Fog)</span>
                <span>5.0 km (Rain)</span>
                <span>15.0 km (Clear)</span>
              </div>
            </div>

            {/* Water Temperature Slider */}
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-orange-400" /> Water Temperature
                </span>
                <span className="font-mono font-black text-orange-300 text-sm">
                  {(environment.waterTemperature ?? 24).toFixed(1)}°C
                </span>
              </div>
              <input
                type="range"
                min={12}
                max={32}
                step={0.5}
                value={environment.waterTemperature ?? 24}
                onChange={(e) => onSetManualEnvironment({ waterTemperature: parseFloat(e.target.value) })}
                className="w-full accent-orange-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>12°C (Cold Shock)</span>
                <span>22°C (Comfortable)</span>
                <span>32°C (Tropical)</span>
              </div>
            </div>

            {/* Marine Wildlife / Stinger Hazard Slider */}
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> Marine Wildlife / Stingers
                </span>
                <span className="font-mono font-black text-rose-300 text-sm">
                  {((environment.marineHazardLevel ?? 0) * 100).toFixed(0)}% Risk
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1.0}
                step={0.05}
                value={environment.marineHazardLevel ?? 0}
                onChange={(e) => onSetManualEnvironment({ marineHazardLevel: parseFloat(e.target.value) })}
                className="w-full accent-rose-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0% (Safe)</span>
                <span>40% (Advisory)</span>
                <span>100% (Critical Infestation)</span>
              </div>
            </div>
          </div>

          {/* Crowd & Demographic Density Controls */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                Crowd Density & Demographic Vulnerability Controls
              </span>
              <span className="text-xs font-mono text-purple-300 font-bold">
                {totalVisitors} Active Visitors ({activeSwimmersCount} in water)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 block">Total Beach Population</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={20}
                    max={250}
                    step={10}
                    value={totalVisitors}
                    onChange={(e) => onSetVisitorPopulation(parseInt(e.target.value), swimmerPct / 100, riskTakerPct / 100)}
                    className="w-full accent-purple-400 cursor-pointer"
                  />
                  <span className="text-xs font-mono font-bold text-white w-10">{totalVisitors}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 block">Swimmer Ratio (%)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={10}
                    max={90}
                    step={5}
                    value={swimmerPct}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setSwimmerPct(val);
                      onSetVisitorPopulation(totalVisitors, val / 100, riskTakerPct / 100);
                    }}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <span className="text-xs font-mono font-bold text-cyan-300 w-10">{swimmerPct}%</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 block">Risk-Taker / Intruders (%)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={35}
                    step={5}
                    value={riskTakerPct}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setRiskTakerPct(val);
                      onSetVisitorPopulation(totalVisitors, swimmerPct / 100, val / 100);
                    }}
                    className="w-full accent-rose-400 cursor-pointer"
                  />
                  <span className="text-xs font-mono font-bold text-rose-300 w-10">{riskTakerPct}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Reset Action */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={onResetManualEnvironment}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset All Environmental Sliders to Automatic Defaults
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Hazard Injection Matrix (9 Controlled Test Scenarios) */}
      {activeTab === 'hazard_injection' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            Click any hazard card to inject precise, realistic marine stress conditions and test how the safety engine responds:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            <button
              onClick={() => onInjectHazardScenario('HIGH_WAVES')}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/60 text-left transition-all cursor-pointer group shadow-sm active:scale-[0.98]"
            >
              <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs mb-1">
                <Waves className="w-4 h-4 text-cyan-400" />
                <span>1. High Breaking Waves (2.8m)</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Wave Height: 2.8m | Period: 14s &rarr; Shorebreak hazard and swimming zone closure.
              </p>
            </button>

            <button
              onClick={() => onInjectHazardScenario('STRONG_CURRENT')}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/60 text-left transition-all cursor-pointer group shadow-sm active:scale-[0.98]"
            >
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs mb-1">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>2. Strong Lateral Currents (1.5 m/s)</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Current Speed: 1.5 m/s &rarr; Alongshore drift and fatigue acceleration.
              </p>
            </button>

            <button
              onClick={() => onInjectHazardScenario('RIP_CURRENT')}
              className="p-3 rounded-xl bg-slate-950 border border-rose-500/30 hover:border-rose-500 text-left transition-all cursor-pointer group shadow-sm active:scale-[0.98]"
            >
              <div className="flex items-center gap-2 text-rose-300 font-bold text-xs mb-1">
                <Flame className="w-4 h-4 text-rose-400" />
                <span>3. Seaward Rip Current Outflow</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Rip Chute Speed: 1.9 m/s &rarr; Victim swept offshore + UAV buoy drop dispatch.
              </p>
            </button>

            <button
              onClick={() => onInjectHazardScenario('RAPID_TIDE')}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-teal-500/60 text-left transition-all cursor-pointer group shadow-sm active:scale-[0.98]"
            >
              <div className="flex items-center gap-2 text-teal-300 font-bold text-xs mb-1">
                <Waves className="w-4 h-4 text-teal-400" />
                <span>4. Extreme Low Tide Drainage</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Tide drops to 0.45m &rarr; Exposed sandbars concentrate water velocity in chutes.
              </p>
            </button>

            <button
              onClick={() => onInjectHazardScenario('POOR_VISIBILITY')}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/60 text-left transition-all cursor-pointer group shadow-sm active:scale-[0.98]"
            >
              <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs mb-1">
                <Eye className="w-4 h-4 text-indigo-400" />
                <span>5. Dense Marine Fog (0.8km)</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Visibility: 800m &rarr; CCTV tracking confidence drops, thermal UAV patrol activated.
              </p>
            </button>

            <button
              onClick={() => onInjectHazardScenario('STORM_SQUALL')}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-blue-500/60 text-left transition-all cursor-pointer group shadow-sm active:scale-[0.98]"
            >
              <div className="flex items-center gap-2 text-blue-300 font-bold text-xs mb-1">
                <Wind className="w-4 h-4 text-blue-400" />
                <span>6. Storm Squall (58 km/h Wind)</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Wind: 58 km/h + Storm Rain &rarr; Mandatory beach clearance PA sirens.
              </p>
            </button>

            <button
              onClick={() => onInjectHazardScenario('CROWD_SURGE')}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-purple-500/60 text-left transition-all cursor-pointer group shadow-sm active:scale-[0.98]"
            >
              <div className="flex items-center gap-2 text-purple-300 font-bold text-xs mb-1">
                <Users className="w-4 h-4 text-purple-400" />
                <span>7. Mass Crowd Surge (180 Swimmers)</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                180 bathers in Zone A &rarr; Extreme exposure pillar multiplying operational risk.
              </p>
            </button>

            <button
              onClick={() => onInjectHazardScenario('RESTRICTED_BREACH')}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-rose-500/60 text-left transition-all cursor-pointer group shadow-sm active:scale-[0.98]"
            >
              <div className="flex items-center gap-2 text-rose-300 font-bold text-xs mb-1">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>8. Restricted Rocky Shoal Breach</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Risk-takers enter rocky breakwater &rarr; Immediate geofence breach alert & whistle.
              </p>
            </button>

            <button
              onClick={() => onInjectHazardScenario('COMPOUND_CRISIS')}
              className="p-3 rounded-xl bg-gradient-to-br from-rose-950/60 to-purple-950/60 border border-rose-500 text-left transition-all cursor-pointer group shadow-lg active:scale-[0.98]"
            >
              <div className="flex items-center gap-2 text-rose-200 font-bold text-xs mb-1">
                <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>9. Compound Multi-Hazard Crisis</span>
              </div>
              <p className="text-[10px] text-rose-100/80 leading-relaxed">
                Waves (2.7m) + Rip (1.7 m/s) + 150 Crowd + Low Visibility &rarr; Multi-agency escalation.
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Automated Risk Progression Presets */}
      {activeTab === 'progression' && (
        <div className="space-y-4">
          <div className="p-3.5 bg-slate-950 rounded-xl border border-indigo-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                Automated Step-by-Step Risk Progression Timeline
              </span>
              <button
                onClick={() => onRunRiskProgression('CALM_TO_CRISIS')}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-500/25 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                ▶ RUN PROGRESSION (CALM ➔ CRISIS)
              </button>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Watch the entire simulation evolve step-by-step from peaceful morning conditions to hazardous rip outflow, swimmer drift, and automated multi-agency rescue interventions.
            </p>
          </div>

          {/* 5-Stage Visual Progression Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-emerald-500/40 space-y-1">
              <div className="text-emerald-400 font-bold text-[11px]">STAGE 1: 00:00</div>
              <div className="text-[10px] text-slate-300">🟢 CALM BASELINE</div>
              <p className="text-[9px] text-slate-400">Wave: 0.7m | Current: 0.2 m/s | Crowd: 45</p>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-amber-500/40 space-y-1">
              <div className="text-amber-400 font-bold text-[11px]">STAGE 2: 03:00</div>
              <div className="text-[10px] text-slate-300">🟡 CURRENT RISING</div>
              <p className="text-[9px] text-slate-400">Wave: 1.2m | Current: 0.65 m/s | Crowd: 80</p>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-orange-500/40 space-y-1">
              <div className="text-orange-400 font-bold text-[11px]">STAGE 3: 06:00</div>
              <div className="text-[10px] text-slate-300">🟠 RIP CHUTE FORMING</div>
              <p className="text-[9px] text-slate-400">Wave: 1.9m | Rip: 1.35 m/s | Swimmer Drift</p>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-red-500/50 space-y-1">
              <div className="text-red-400 font-bold text-[11px]">STAGE 4: 09:00</div>
              <div className="text-[10px] text-slate-300">🔴 DISTRESS TRIGGERED</div>
              <p className="text-[9px] text-slate-400">Fatigue &gt; 90% | Seaward Drowning Risk</p>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-cyan-500/50 space-y-1">
              <div className="text-cyan-400 font-bold text-[11px]">STAGE 5: 12:00</div>
              <div className="text-[10px] text-slate-300">🛟 INTERVENTION</div>
              <p className="text-[9px] text-slate-400">UAV Buoy Drop + Lifeguard Rescue</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Real-time Risk Curve & "What Caused the Risk?" Attribution Breakdown */}
      {activeTab === 'attribution' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Live Attribution Bars */}
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  What Caused the Risk? (Attribution Factor)
                </span>
                <span className="text-[11px] font-mono text-cyan-300 font-bold">100% Total Risk</span>
              </div>

              <div className="space-y-2.5 text-xs font-mono">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-amber-300">🌊 Current Speed & Rip Velocity</span>
                    <span className="font-bold text-white">{currentPct}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${currentPct}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-purple-300">👥 Swimmer Exposure & Density</span>
                    <span className="font-bold text-white">{crowdPct}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-400 rounded-full transition-all" style={{ width: `${crowdPct}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-cyan-300">🌊 Wave Height & Period</span>
                    <span className="font-bold text-white">{wavePct}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-400 rounded-full transition-all" style={{ width: `${wavePct}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-blue-300">💨 Wind Stress & Visibility Factor</span>
                    <span className="font-bold text-white">{windPct}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${windPct}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Real-time Risk History Curve */}
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Real-time Risk Progression Curve
                </span>
                <span className="text-[10px] font-mono text-slate-400">{riskHistory.length} Samples</span>
              </div>

              {riskHistory.length > 0 ? (
                <div className="h-32 flex items-end gap-1 pt-4 px-1 border-b border-l border-slate-800">
                  {riskHistory.slice(-25).map((entry, idx) => {
                    const heightPct = Math.min(100, Math.max(5, entry.riskScore));
                    const barColor =
                      entry.riskScore >= 80 ? 'bg-red-500' : entry.riskScore >= 60 ? 'bg-orange-500' : entry.riskScore >= 40 ? 'bg-amber-400' : 'bg-emerald-400';
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div
                          className={`w-full ${barColor} rounded-t transition-all`}
                          style={{ height: `${heightPct}%` }}
                        />
                        {/* Hover Tooltip */}
                        <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-900 border border-slate-700 text-[9px] font-mono text-white p-1 rounded whitespace-nowrap z-30 shadow-lg">
                          {entry.time}: {entry.riskScore}/100 ({entry.primaryCause})
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-slate-500 font-mono text-xs">
                  Run simulation to record real-time risk progression curve...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
