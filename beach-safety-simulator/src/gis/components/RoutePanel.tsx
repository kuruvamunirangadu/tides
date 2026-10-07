import React, { useState } from 'react';
import { BeachGIS } from '../models/BeachGIS';
import { EvacuationRouteGIS } from '../models/EvacuationRouteGIS';
import { EmergencyDispatchRoute } from '../routing/EmergencyRouter';

interface RoutePanelProps {
  beach: BeachGIS;
  onToggleBlockage?: (routeId: string) => void;
  onCalculateAmbulanceRoute?: (lat: number, lng: number) => EmergencyDispatchRoute;
}

export const RoutePanel: React.FC<RoutePanelProps> = ({
  beach,
  onToggleBlockage,
  onCalculateAmbulanceRoute,
}) => {
  const [selectedZoneId, setSelectedZoneId] = useState<string>(beach.zones[0]?.id || 'SZ-01');
  const [activeAmbulanceRoute, setActiveAmbulanceRoute] = useState<EmergencyDispatchRoute | null>(null);

  const handleTestAmbulance = () => {
    if (onCalculateAmbulanceRoute) {
      const route = onCalculateAmbulanceRoute(beach.center.latitude - 0.001, beach.center.longitude);
      setActiveAmbulanceRoute(route);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 text-xs shadow-xl backdrop-blur-sm space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="font-bold text-slate-200 uppercase tracking-wider text-xs flex items-center gap-1.5">
          <span>🚦</span> Dynamic Routing & Evacuation Network
        </span>
        <span className="text-[10px] font-mono text-emerald-400">
          {beach.evacuationRoutes.filter((r) => r.status !== 'BLOCKED').length}/{beach.evacuationRoutes.length} Routes Clear
        </span>
      </div>

      {/* Evacuation Corridors */}
      <div className="space-y-2">
        <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Beach Evacuation Routes & Assembly Muster Points
        </h4>

        <div className="space-y-2">
          {beach.evacuationRoutes.map((route) => {
            const isBlocked = route.status === 'BLOCKED';
            const isRec = route.status === 'RECOMMENDED';

            return (
              <div
                key={route.id}
                className={`p-2.5 rounded-lg border transition-all ${
                  isBlocked
                    ? 'bg-rose-950/30 border-rose-800/50'
                    : isRec
                    ? 'bg-emerald-950/30 border-emerald-800/50'
                    : 'bg-slate-950/60 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                        isBlocked
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : isRec
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-700/50 text-slate-300 border border-slate-600'
                      }`}
                    >
                      {route.status}
                    </span>
                    <span className="font-semibold text-slate-200">{route.name}</span>
                  </div>

                  {onToggleBlockage && (
                    <button
                      onClick={() => onToggleBlockage(route.id)}
                      className={`px-2 py-0.5 rounded text-[9px] font-mono transition-colors ${
                        isBlocked
                          ? 'bg-emerald-800 hover:bg-emerald-700 text-emerald-100'
                          : 'bg-rose-900/80 hover:bg-rose-800 text-rose-200'
                      }`}
                    >
                      {isBlocked ? 'Clear Path' : 'Simulate Blockage'}
                    </button>
                  )}
                </div>

                <div className="mt-1.5 grid grid-cols-3 gap-2 text-[10px] font-mono text-slate-400 border-t border-slate-800/60 pt-1.5">
                  <div>
                    Distance: <strong className="text-slate-200">{route.distanceMeters}m</strong>
                  </div>
                  <div>
                    Egress ETA: <strong className="text-cyan-300">{route.estimatedTimeSeconds}s</strong>
                  </div>
                  <div>
                    Destination: <strong className="text-emerald-300">{route.destinationId}</strong>
                  </div>
                </div>

                {isBlocked && route.blockageReason && (
                  <div className="mt-1 text-[10px] text-rose-300 font-medium">
                    ⚠️ Blockage: {route.blockageReason} — Automated reroute active.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Emergency Vehicle Dispatch Simulator */}
      <div className="pt-2 border-t border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Emergency Vehicle Road Response
          </h4>
          <button
            onClick={handleTestAmbulance}
            className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-[10px] font-medium transition-colors"
          >
            🚑 Test Dispatch Route
          </button>
        </div>

        {activeAmbulanceRoute && (
          <div className="p-2.5 bg-indigo-950/30 border border-indigo-800/40 rounded-lg text-[11px] space-y-1">
            <div className="flex items-center justify-between text-indigo-200 font-semibold">
              <span>{activeAmbulanceRoute.originName} ➔ Incident Zone</span>
              <span className="font-mono text-cyan-300">ETA: {activeAmbulanceRoute.estimatedArrivalSeconds}s</span>
            </div>
            <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
              <span>Transit Distance: {activeAmbulanceRoute.distanceMeters}m</span>
              <span>Speed: 40 km/h (Emergency Siren)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
