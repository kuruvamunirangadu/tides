// beach-safety-simulator/src/components/LifeguardTerminal.tsx
import React, { useState } from 'react';
import {
  ShieldAlert,
  LifeBuoy,
  Plane,
  Radio,
  MapPin,
  AlertTriangle,
  Volume2,
  Navigation,
  Compass,
  CheckCircle,
  Clock,
  Battery,
  Flame,
} from 'lucide-react';
import { Beach, BeachPresetId } from '../models/Beach';
import { Environment } from '../models/Environment';
import { Visitor } from '../models/Visitor';
import { Drone } from '../drones/models/Drone';
import { AudioAlerts } from './AudioAlerts';

export interface LifeguardTerminalProps {
  beachName?: string;
  activeFlag?: 'GREEN' | 'YELLOW' | 'RED' | 'BLACK';
  distressCount?: number;
  droneStatus?: 'STANDBY' | 'SORTIE_ACTIVE' | 'PAYLOAD_DEPLOYED' | 'RETURNING' | string;
  onTriggerSOS?: () => void;
  onDeployDrone?: () => void;
  // Full simulation state props for advanced dock
  beach?: Beach;
  environment?: Environment;
  visitors?: Visitor[];
  drones?: Drone[];
  selectedPreset?: BeachPresetId;
}

export const LifeguardTerminal: React.FC<LifeguardTerminalProps> = ({
  beachName,
  activeFlag,
  distressCount,
  droneStatus = 'STANDBY',
  onTriggerSOS,
  onDeployDrone,
  beach,
  environment,
  visitors = [],
  drones = [],
  selectedPreset = 'RUSHIKONDA_VIZAG',
}) => {
  const [sosSent, setSosSent] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'terminal' | 'broadcast'>('terminal');

  // Derived calculations if full beach/env props are provided
  const distressedVisitors = visitors.filter((v) => v.state === 'DISTRESS' || v.state === 'STRUGGLING');
  const fleeingVisitors = visitors.filter((v) => v.awarenessState === 'FLEEING');
  const activeRipSpeed = environment ? (environment.currentSpeed ?? environment.waterCurrent ?? 0.3) : 0.45;

  const currentFlag: 'GREEN' | 'YELLOW' | 'RED' | 'BLACK' =
    activeFlag ||
    (distressedVisitors.length > 0 || activeRipSpeed > 1.2 || (environment && environment.waveHeight > 2.5)
      ? 'RED'
      : activeRipSpeed > 0.6 || (environment && environment.waveHeight > 1.5)
      ? 'YELLOW'
      : 'GREEN');

  const currentDistressCount = distressCount !== undefined ? distressCount : distressedVisitors.length;
  const currentBeachName =
    beachName ||
    (beach?.name) ||
    (selectedPreset === 'RUSHIKONDA_VIZAG'
      ? 'Rushikonda Blue Flag Beach (Visakhapatnam)'
      : 'Suryalanka Beach (Bapatla Coast)');

  const flagColors = {
    GREEN: 'bg-emerald-500 text-slate-950',
    YELLOW: 'bg-amber-400 text-slate-950',
    RED: 'bg-rose-600 text-white animate-pulse',
    BLACK: 'bg-zinc-950 text-rose-500 border border-rose-500',
  };

  const isRushikonda = selectedPreset === 'RUSHIKONDA_VIZAG';
  const ripGPS = isRushikonda ? '17.7795°N, 83.3885°E' : '15.8345°N, 80.5051°E';

  const handleSOS = () => {
    setSosSent(true);
    if (onTriggerSOS) onTriggerSOS();
    setTimeout(() => setSosSent(false), 5000);
  };

  return (
    <div className="max-w-2xl mx-auto bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl font-sans text-left space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold block">
            AP Coastal Police & Lifeguard Handheld Terminal
          </span>
          <h2 className="text-base sm:text-lg font-bold text-white">{currentBeachName}</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2.5 py-1 rounded-lg">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>PATROL-04 [ON DUTY]</span>
          </div>
          <div className="flex items-center gap-1 text-xs font-mono text-slate-400 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
            <Battery className="w-3.5 h-3.5 text-emerald-400" />
            <span>94%</span>
          </div>
        </div>
      </div>

      {/* Flag Status Banner */}
      <div className={`w-full py-3.5 px-4 rounded-xl flex items-center justify-between shadow-md ${flagColors[currentFlag]}`}>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider block opacity-90">Current Beach Flag Status</span>
          <span className="text-xl font-black tracking-tight">{currentFlag} STATUS</span>
        </div>
        <div className="text-2xl">
          {currentFlag === 'GREEN' ? '🟢' : currentFlag === 'YELLOW' ? '🟡' : currentFlag === 'RED' ? '🚩' : '⬛'}
        </div>
      </div>

      {/* Critical Telemetry Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] font-mono text-slate-400 uppercase block">Active Distress Alerts</span>
          <span className={`text-2xl font-black font-mono ${currentDistressCount > 0 ? 'text-rose-500 animate-pulse' : 'text-slate-100'}`}>
            {currentDistressCount.toString().padStart(2, '0')}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Persons at Risk</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] font-mono text-slate-400 uppercase block">Rescue UAV Sortie</span>
          <span className="text-xs font-bold font-mono text-cyan-400 block mt-1.5 truncate">
            {drones.length > 0 ? drones[0].status : droneStatus}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Payload: Lifebuoy Unit</span>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] font-mono text-slate-400 uppercase block">Rip Surge Velocity</span>
          <span className="text-lg font-bold font-mono text-amber-400 block mt-1">
            {activeRipSpeed.toFixed(2)} m/s
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Ebb Channel Drag</span>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="space-y-2">
        <button
          onClick={onDeployDrone}
          className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 active:scale-[0.98] text-white rounded-xl font-bold font-mono text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
        >
          <span>🚁</span> Dispatch Autonomous SAR Drone
        </button>

        <button
          onClick={handleSOS}
          disabled={sosSent}
          className={`w-full py-3.5 rounded-xl font-black font-mono text-sm uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] cursor-pointer ${
            sosSent
              ? 'bg-amber-500 text-slate-950 animate-pulse'
              : 'bg-rose-600 hover:bg-rose-500 text-white'
          }`}
        >
          <span>⚠️</span> {sosSent ? 'EMERGENCY DISPATCH INITIATED' : '1-TAP EMERGENCY CALLOUT (SOS)'}
        </button>
      </div>

      {/* Live Swimmer Awareness Feed (if available) */}
      {distressedVisitors.length > 0 && (
        <div className="bg-rose-950/30 border border-rose-800/60 rounded-xl p-3 space-y-1.5">
          <span className="text-[10px] font-mono text-rose-300 font-bold uppercase block">
            Immediate Attention Victims
          </span>
          <div className="space-y-1">
            {distressedVisitors.map((v) => (
              <div key={v.id} className="flex items-center justify-between text-xs bg-slate-950/60 p-1.5 rounded border border-rose-900/40">
                <span className="font-mono text-rose-400 font-bold">{v.id}</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Pos: ({v.position.x.toFixed(0)}m, {v.position.y.toFixed(0)}m) • Depth: {v.localWaterDepth.toFixed(1)}m
                </span>
                <span className="text-[10px] font-bold text-rose-400 uppercase">{v.state}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tri-Lingual Audio Broadcaster Cabin */}
      <AudioAlerts
        beachPreset={selectedPreset}
        activeFlag={currentFlag}
        hazardType={activeRipSpeed > 0.8 ? 'RIP_CURRENT' : 'HIGH_WAVES'}
      />

      {/* GPS Coordinate Footprint */}
      <div className="mt-3 text-center border-t border-slate-900 pt-2">
        <span className="text-[10px] font-mono text-slate-500">
          GPS: {ripGPS} • Encrypted VHF/Mesh Connected (AP Coastal Police)
        </span>
      </div>
    </div>
  );
};
