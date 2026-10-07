import React from 'react';
import { VirtualDrone } from '../simulation/VirtualDrone';
import { DroneDetectionTrack } from '../vision/DroneVisionEngine';
import { Crosshair, Battery, Compass, ArrowUpRight, Radio, Eye } from 'lucide-react';

interface DroneCameraViewProps {
  drone: VirtualDrone;
  tracks: DroneDetectionTrack[];
  onClose?: () => void;
}

export const DroneCameraView: React.FC<DroneCameraViewProps> = ({ drone, tracks, onClose }) => {
  const droneTracks = tracks.filter((t) => t.droneId === drone.id);

  return (
    <div className="bg-slate-950 border border-cyan-500/40 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
      {/* HUD Header */}
      <div className="bg-slate-900/90 px-4 py-3 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
          <span className="font-bold text-slate-100 uppercase">{drone.name} • 4K LIVE FEED</span>
          <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] border border-cyan-500/30">
            {drone.status}
          </span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span>ALT: <strong className="text-cyan-400">{drone.altitude.toFixed(1)}m</strong></span>
          <span>SPD: <strong className="text-cyan-400">{drone.speed.toFixed(1)}m/s</strong></span>
          <span>HDG: <strong className="text-cyan-400">{drone.heading}°</strong></span>
          <span className="flex items-center gap-1">
            <Battery className="w-3.5 h-3.5 text-emerald-400" />
            <strong className="text-emerald-400">{drone.batteryLevel}%</strong>
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 text-[11px]"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Simulated Camera Viewport */}
      <div className="relative h-72 sm:h-96 bg-gradient-to-b from-sky-950/70 via-teal-950/60 to-emerald-950/70 flex items-center justify-center overflow-hidden">
        {/* Synthetic Horizon & Grid */}
        <div className="absolute inset-0 opacity-15 pointer-events-none grid grid-cols-6 grid-rows-4 border border-cyan-500/20">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="border border-cyan-500/20" />
          ))}
        </div>

        {/* Center Reticle */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative">
            <div className="w-24 h-24 border border-cyan-400/40 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            </div>
            <div className="absolute top-1/2 left-0 -translate-x-4 w-4 h-0.5 bg-cyan-400/60" />
            <div className="absolute top-1/2 right-0 translate-x-4 w-4 h-0.5 bg-cyan-400/60" />
            <div className="absolute top-0 left-1/2 -translate-y-4 w-0.5 h-4 bg-cyan-400/60" />
            <div className="absolute bottom-0 left-1/2 translate-y-4 w-0.5 h-4 bg-cyan-400/60" />
          </div>
        </div>

        {/* Dynamic Simulated Person Detection Bounding Boxes */}
        {drone.altitude >= 5 && (
          <div className="absolute inset-0 p-6 flex flex-wrap items-center justify-around">
            {droneTracks.length > 0 ? (
              droneTracks.map((track) => {
                const isDistressed = track.behavior === 'STRUGGLING' || track.behavior === 'SUBMERGING';
                return (
                  <div
                    key={track.trackId}
                    className={`relative p-2 rounded border font-mono text-[10px] backdrop-blur-sm transition-all ${
                      isDistressed
                        ? 'border-rose-500 bg-rose-950/60 text-rose-200 animate-pulse ring-2 ring-rose-500/50'
                        : track.behavior === 'DRIFTING'
                        ? 'border-amber-500 bg-amber-950/60 text-amber-200'
                        : 'border-emerald-500/70 bg-emerald-950/40 text-emerald-300'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between gap-2">
                      <span>{track.trackId}</span>
                      <span>{(track.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <div className="text-[9px] mt-0.5 opacity-90">
                      Behavior: <strong>{track.behavior}</strong>
                    </div>
                    <div className="text-[8px] opacity-75">
                      V-ID: {track.visitorId}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-slate-400 font-mono text-xs bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
                Scanning target sector... No swimmers in focal cone
              </div>
            )}
          </div>
        )}

        {/* Grounded warning if landed */}
        {drone.altitude < 5 && (
          <div className="text-center font-mono space-y-1">
            <span className="text-amber-400 font-bold text-sm block">UAV DOCKED ON CHARGING PAD</span>
            <span className="text-slate-400 text-xs">Camera in standby. Launch mission to engage aerial feed.</span>
          </div>
        )}

        {/* HUD Bottom Bar */}
        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between font-mono text-[11px] text-slate-300 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800">
          <div>
            PITCH: <strong>{drone.camera.orientation.pitch}°</strong> | ZOOM: <strong>{drone.camera.zoomLevel.toFixed(1)}x</strong>
          </div>
          <div>
            TARGETS TRACKED: <strong className="text-cyan-400">{droneTracks.length}</strong>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            ENCRYPTION: AES-256 GCS LINK
          </div>
        </div>
      </div>
    </div>
  );
};
