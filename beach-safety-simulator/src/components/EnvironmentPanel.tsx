import React from 'react';
import { Environment } from '../models/Environment';
import { Waves, Wind, Droplets, Eye, Activity, Sun, Cloud, CloudRain, CloudLightning, CloudFog } from 'lucide-react';
import { TelemetryStatusBadge } from './EnvironmentalGauges';

interface EnvironmentPanelProps {
  environment: Environment;
  isLiveHardware?: boolean;
  stationId?: string;
}

export const EnvironmentPanel: React.FC<EnvironmentPanelProps> = ({ environment, isLiveHardware = false, stationId = 'INCOIS-BUOY-VIZAG-01' }) => {
  const getWeatherIcon = (weather: string) => {
    switch (weather) {
      case 'CLEAR':
        return <Sun className="w-4 h-4 text-amber-400" />;
      case 'CLOUDY':
        return <Cloud className="w-4 h-4 text-slate-300" />;
      case 'RAIN':
        return <CloudRain className="w-4 h-4 text-blue-400" />;
      case 'STORM':
        return <CloudLightning className="w-4 h-4 text-purple-400" />;
      case 'FOG':
        return <CloudFog className="w-4 h-4 text-slate-400" />;
      default:
        return <Sun className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur-md space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
          <Droplets className="w-4 h-4" /> Environmental State
        </h3>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
          Continuous
        </span>
      </div>

      <TelemetryStatusBadge isLiveHardware={isLiveHardware} stationId={stationId} />

      <div className="space-y-2.5 text-xs font-mono">
        {/* Tide Level */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Droplets className="w-3.5 h-3.5 text-cyan-400" /> Tide Level:
          </span>
          <span className="text-cyan-300 font-bold">{environment.tideLevel.toFixed(2)} m</span>
        </div>

        {/* Wave Height */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Waves className="w-3.5 h-3.5 text-blue-400" /> Wave Height:
          </span>
          <span className="text-blue-300 font-bold">{environment.waveHeight.toFixed(2)} m</span>
        </div>

        {/* Wind Speed */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Wind className="w-3.5 h-3.5 text-emerald-400" /> Wind Speed:
          </span>
          <span className="text-emerald-300 font-bold">{environment.windSpeed.toFixed(1)} km/h</span>
        </div>

        {/* Weather */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <span className="text-slate-400 flex items-center gap-1.5">
            {getWeatherIcon(environment.weather)} Weather:
          </span>
          <span className="text-white font-bold">{environment.weather}</span>
        </div>

        {/* Visibility */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-purple-400" /> Visibility:
          </span>
          <span className="text-purple-300 font-bold">{environment.visibility} km</span>
        </div>

        {/* Water Current */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-amber-400" /> Water Current:
          </span>
          <span className="text-amber-300 font-bold">{environment.waterCurrent.toFixed(2)} m/s</span>
        </div>
      </div>
    </div>
  );
};
