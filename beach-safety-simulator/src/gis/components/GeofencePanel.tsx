import React from 'react';
import { Geofence, GeofenceBreachEvent } from '../models/Geofence';

interface GeofencePanelProps {
  geofences: Geofence[];
  recentBreaches: GeofenceBreachEvent[];
  onAcknowledge?: (eventId: string) => void;
  onToggleGeofence?: (geofenceId: string) => void;
}

export const GeofencePanel: React.FC<GeofencePanelProps> = ({
  geofences,
  recentBreaches,
  onAcknowledge,
  onToggleGeofence,
}) => {
  const criticalBreaches = recentBreaches.filter((b) => b.ruleTriggered.severity === 'CRITICAL' && !b.acknowledged);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 text-xs shadow-xl backdrop-blur-sm space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-200 uppercase tracking-wider text-xs flex items-center gap-1.5">
            <span>🛡️</span> Geofence Engine & Breaches
          </span>
          {criticalBreaches.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-mono font-bold text-[10px] animate-pulse">
              {criticalBreaches.length} CRITICAL
            </span>
          )}
        </div>
        <span className="text-[10px] font-mono text-slate-400">
          {geofences.filter((g) => g.active).length} Active Geofences
        </span>
      </div>

      {/* Geofence Breach Stream */}
      <div className="space-y-2">
        <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Live Breach & Containment Events
        </h4>

        {recentBreaches.length === 0 ? (
          <div className="p-4 rounded-lg border border-dashed border-slate-800 text-center text-slate-500 text-[11px]">
            No geofence breach events recorded in active time window.
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {recentBreaches.map((evt) => {
              const isCrit = evt.ruleTriggered.severity === 'CRITICAL';
              const isHigh = evt.ruleTriggered.severity === 'HIGH';

              return (
                <div
                  key={evt.id}
                  className={`p-2.5 rounded-lg border flex items-start justify-between gap-2 transition-all ${
                    isCrit
                      ? 'bg-rose-950/40 border-rose-800/60 text-rose-200'
                      : isHigh
                      ? 'bg-amber-950/30 border-amber-800/50 text-amber-200'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[10px] uppercase px-1.5 py-0.2 rounded bg-black/40 border border-white/10">
                        {evt.eventType}
                      </span>
                      <span className="font-semibold text-slate-100">{evt.geofenceName}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-medium">
                      Visitor ID: <span className="font-mono text-cyan-300">{evt.visitorId}</span> —{' '}
                      {evt.ruleTriggered.description}
                    </p>
                    <div className="text-[9px] font-mono text-slate-400 flex items-center gap-3">
                      <span>Action: {evt.ruleTriggered.action}</span>
                      <span>
                        GPS: {evt.location.latitude.toFixed(5)}°N, {evt.location.longitude.toFixed(5)}°E
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="font-mono text-[9px] text-slate-400">{evt.timeDisplay}</span>
                    {onAcknowledge && !evt.acknowledged && (
                      <button
                        onClick={() => onAcknowledge(evt.id)}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[9px] font-mono transition-colors"
                      >
                        Ack
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Geofence Definitions */}
      <div className="pt-2 border-t border-slate-800/80">
        <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
          Configured Spatial Geofences
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {geofences.map((gf) => (
            <div
              key={gf.id}
              className="p-1.5 bg-slate-950/50 border border-slate-800 rounded flex items-center justify-between text-[10px]"
            >
              <div className="flex items-center gap-1.5 truncate">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: gf.color || '#38bdf8' }}
                />
                <span className="truncate font-medium text-slate-300">{gf.name}</span>
              </div>
              <span className="font-mono text-slate-500 text-[9px] uppercase px-1 rounded bg-slate-900 border border-slate-800">
                {gf.type}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
