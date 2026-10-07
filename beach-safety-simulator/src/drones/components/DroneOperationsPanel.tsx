import React from 'react';
import { VirtualDrone } from '../simulation/VirtualDrone';
import { PatrolRoute } from '../models/DroneMission';
import { Battery, Plane, ShieldAlert, Video, RefreshCw } from 'lucide-react';

interface DroneOperationsPanelProps {
  drones: VirtualDrone[];
  patrolRoutes: PatrolRoute[];
  selectedDroneId?: string;
  onSelectDrone: (droneId: string) => void;
  onDispatchPatrol: (droneId: string, routeId: string) => void;
  onAbortReturn: (droneId: string) => void;
  onToggleCamera: (droneId: string) => void;
}

export const DroneOperationsPanel: React.FC<DroneOperationsPanelProps> = ({
  drones,
  patrolRoutes,
  selectedDroneId,
  onSelectDrone,
  onDispatchPatrol,
  onAbortReturn,
  onToggleCamera,
}) => {
  const getStatusColor = (status: VirtualDrone['status']) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'PATROLLING':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30 animate-pulse';
      case 'TRACKING':
      case 'SEARCHING':
      case 'DISPATCHED':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse';
      case 'RETURNING':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'CHARGING':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default:
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    }
  };

  return (
    <div className="bg-slate-900/85 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
            <Plane className="w-4 h-4 text-cyan-400" />
            Autonomous Drone Fleet Operations ({drones.length} UAVs)
          </h3>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Real-time flight kinematics, battery health, and mission state dispatch
          </p>
        </div>
      </div>

      {/* Fleet Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {drones.map((drone) => {
          const isSelected = drone.id === selectedDroneId;
          return (
            <div
              key={drone.id}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-800/80 border-cyan-500 ring-1 ring-cyan-500/50 shadow-lg'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
              onClick={() => onSelectDrone(drone.id)}
            >
              {/* Drone Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-extrabold text-xs text-cyan-300">{drone.id}</span>
                  <span className="text-xs font-semibold text-slate-200 line-clamp-1">{drone.name}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] border ${getStatusColor(drone.status)}`}>
                  ● {drone.status}
                </span>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-2 my-2.5 p-2 bg-slate-900/60 rounded-lg font-mono text-[11px] text-slate-300">
                <div>
                  <span className="text-slate-500 text-[10px] block">Altitude</span>
                  <strong className="text-cyan-300">{drone.altitude.toFixed(0)}m</strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Speed</span>
                  <strong className="text-cyan-300">{drone.speed.toFixed(1)}m/s</strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Battery</span>
                  <div className="flex items-center gap-1">
                    <Battery className={`w-3.5 h-3.5 ${drone.batteryLevel > 30 ? 'text-emerald-400' : 'text-rose-400'}`} />
                    <strong className={drone.batteryLevel > 30 ? 'text-emerald-300' : 'text-rose-300'}>
                      {drone.batteryLevel}%
                    </strong>
                  </div>
                </div>
              </div>

              {/* Active Mission Notes */}
              {drone.currentMission && (
                <div className="p-2 bg-cyan-950/30 border border-cyan-500/30 rounded-lg text-[10px] font-mono text-cyan-200 mb-2.5">
                  <span className="font-bold uppercase tracking-wider block text-cyan-400">
                    Mission: {drone.currentMission.type}
                  </span>
                  {drone.currentMission.notes}
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/60 font-mono text-[10px]">
                {drone.status === 'AVAILABLE' || drone.status === 'CHARGING' ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDispatchPatrol(drone.id, patrolRoutes[0]?.id || 'ROUTE-SZ-COASTAL');
                    }}
                    className="flex-1 py-1 px-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-colors text-center"
                  >
                    Launch Patrol
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAbortReturn(drone.id);
                    }}
                    className="flex-1 py-1 px-2 rounded bg-rose-600/80 hover:bg-rose-500 text-white font-bold transition-colors text-center"
                  >
                    Abort (Return Home)
                  </button>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleCamera(drone.id);
                  }}
                  className="py-1 px-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1"
                >
                  <Video className="w-3 h-3" />
                  Cam ({drone.camera.status})
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
