/**
 * SelectedDroneCard.tsx
 * 
 * TIDES Drone Phase 2: Selected Drone Inspector Card
 * 
 * Compact, tactical floating HUD widget displayed when a drone is selected
 * in the 3D viewport or from the fleet panel:
 * - Callsign, model, role badge, operational status
 * - Live battery gauge and voltage
 * - 3D world coordinates, altitude AGL, speed, and heading
 * - Telemetry freshness and data provenance ([SIM] vs [HW])
 * - One-click Camera Focus & Deselect actions
 */

import React from 'react';
import { DroneRecord, DroneRole, DroneOperationalStatus } from '../foundation/drone.types';
import { DroneMissionManager } from '../missions/DroneMissionManager';
import {
  X,
  Crosshair,
  Battery,
  Compass,
  Wind,
  Clock,
  Layers,
  Radio,
  Eye,
} from 'lucide-react';

interface SelectedDroneCardProps {
  drone: DroneRecord | null;
  onClose: () => void;
  onFocus: (droneId: string, position3D: { x: number; y: number; z: number }) => void;
  onOpenLiveCamera?: (droneId: string) => void;
}

export const SelectedDroneCard: React.FC<SelectedDroneCardProps> = ({
  drone,
  onClose,
  onFocus,
  onOpenLiveCamera,
}) => {
  if (!drone) return null;

  const batt = drone.battery.percentage;
  const battColor = batt <= 20 ? 'text-red-400' : batt <= 40 ? 'text-amber-400' : 'text-emerald-400';

  let roleColor = 'text-cyan-400 border-cyan-800 bg-cyan-950/80';
  if (drone.role === 'RESCUE_ASSISTANCE') {
    roleColor = 'text-amber-400 border-amber-800 bg-amber-950/80';
  } else if (drone.role === 'MULTI_ROLE') {
    roleColor = 'text-purple-400 border-purple-800 bg-purple-950/80';
  }

  return (
    <div className="absolute top-16 right-4 z-30 w-80 bg-slate-950/95 border border-cyan-500/50 rounded-2xl shadow-2xl backdrop-blur-xl p-4 font-sans animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-white text-sm">{drone.droneId}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${roleColor}`}>
                {drone.role}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">{drone.callsign}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Deselect Drone"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 my-3 text-xs font-mono">
        {/* Status */}
        <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] text-slate-500 block">STATUS</span>
          <div className="flex items-center justify-between">
            <strong className="text-cyan-300 text-xs">{drone.status}</strong>
            <span className="text-[9px] font-mono font-bold px-1 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
              {drone.movementState ?? 'STATIONARY'}
            </span>
          </div>
        </div>

        {/* Battery */}
        <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] text-slate-500 block">BATTERY</span>
          <div className="flex items-center gap-1 font-bold">
            <Battery className={`w-3.5 h-3.5 ${battColor}`} />
            <span className={battColor}>{batt}%</span>
          </div>
        </div>

        {/* Altitude */}
        <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] text-slate-500 block">ALTITUDE AGL</span>
          <strong className="text-white text-xs">{drone.position3D.y.toFixed(1)}m</strong>
        </div>

        {/* Speed */}
        <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] text-slate-500 block">SPEED</span>
          <strong className="text-white text-xs">{drone.speedMps.toFixed(1)} m/s</strong>
        </div>
      </div>

      {/* Detailed Position & Telemetry */}
      <div className="space-y-1.5 text-xs text-slate-400 border-t border-slate-800/80 pt-2.5 font-mono text-[11px]">
        <div className="flex justify-between">
          <span>GPS (WGS84):</span>
          <strong className="text-cyan-300">
            {drone.positionGeo
              ? `${drone.positionGeo.latitude.toFixed(5)}°N, ${drone.positionGeo.longitude.toFixed(5)}°E`
              : 'CALCULATING...'}
          </strong>
        </div>
        <div className="flex justify-between">
          <span>Heading:</span>
          <strong className="text-slate-200">{drone.headingDegrees}°</strong>
        </div>
        <div className="flex justify-between">
          <span>Coordinates [X, Z]:</span>
          <strong className="text-slate-200">[{drone.position3D.x.toFixed(1)}, {drone.position3D.z.toFixed(1)}]</strong>
        </div>
        <div className="flex justify-between">
          <span>Telemetry Freshness:</span>
          <strong className={drone.isStale ? 'text-amber-400' : 'text-emerald-400'}>
            {drone.telemetryFreshnessSeconds.toFixed(1)}s ({drone.isStale ? 'STALE' : 'FRESH'})
          </strong>
        </div>
        <div className="flex justify-between">
          <span>Provenance:</span>
          <strong className="text-slate-200">{drone.provenance}</strong>
        </div>
        {drone.currentMissionId && (
          <div className="mt-2 p-2 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
            <div className="flex justify-between items-center text-amber-300">
              <span>Mission:</span>
              <strong>{drone.currentMissionId}</strong>
            </div>
            {(() => {
              const m = DroneMissionManager.getInstance().getMission(drone.currentMissionId!);
              if (!m) return null;
              return (
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>{m.type} • {m.status}</span>
                    <span className="text-cyan-300">{m.progressPercent}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400"
                      style={{ width: `${m.progressPercent}%` }}
                    />
                  </div>
                  <div className="flex gap-1.5 pt-1">
                    {(m.status === 'ACTIVE' || m.status === 'PAUSED') && (
                      <button
                        onClick={() => DroneMissionManager.getInstance().requestReturnToBase(m.missionId, 'Operator recall')}
                        className="flex-1 py-1 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 text-[10px] font-bold"
                      >
                        Recall Base
                      </button>
                    )}
                    {m.status !== 'COMPLETED' && m.status !== 'CANCELLED' && m.status !== 'FAILED' && (
                      <button
                        onClick={() => DroneMissionManager.getInstance().cancelMission(m.missionId, 'Cancelled from Inspector')}
                        className="flex-1 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-[10px] font-bold"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center gap-2">
        <button
          onClick={() => onFocus(drone.droneId, drone.position3D)}
          className="flex-1 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-950/50 transition-colors cursor-pointer"
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span>Focus</span>
        </button>
        {onOpenLiveCamera && (
          <button
            onClick={() => onOpenLiveCamera(drone.droneId)}
            className="py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-purple-950/50 transition-colors cursor-pointer"
            title="Open Live Simulated Camera Feed"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Live Cam</span>
          </button>
        )}
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
        >
          Deselect
        </button>
      </div>
    </div>
  );
};

