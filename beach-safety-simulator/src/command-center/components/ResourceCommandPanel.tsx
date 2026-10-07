import React from 'react';
import { EmergencyResource } from '../../emergency/models/EmergencyResource';
import { VirtualDrone } from '../../drones/simulation/VirtualDrone';
import { LifeBuoy, Plane, Truck, Shield, Ship } from 'lucide-react';

interface ResourceCommandPanelProps {
  resources: EmergencyResource[];
  drones: VirtualDrone[];
}

export const ResourceCommandPanel: React.FC<ResourceCommandPanelProps> = ({
  resources,
  drones,
}) => {
  const lifeguards = resources.filter((r) => r.type === 'LIFEGUARD');
  const boats = resources.filter((r) => r.type === 'RESCUE_BOAT');
  const ambulances = resources.filter((r) => r.type === 'AMBULANCE');
  const police = resources.filter((r) => r.type === 'POLICE');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">AVAILABLE</span>;
      case 'DISPATCHED':
      case 'INTERVENING':
      case 'PATROLLING':
      case 'TRACKING':
        return <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse">ACTIVE</span>;
      case 'CHARGING':
        return <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">CHARGING</span>;
      default:
        return <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">OFFLINE</span>;
    }
  };

  return (
    <div className="bg-slate-900/85 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
          <LifeBuoy className="w-4 h-4 text-cyan-400" />
          Multi-Agency Resource & Asset Fleet
        </h3>
        <span className="text-xs font-mono text-slate-400">Total: {resources.length + drones.length} Units</span>
      </div>

      {/* Fleet Sub-Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Lifeguards & Water Rescue */}
        <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <LifeBuoy className="w-3.5 h-3.5 text-cyan-400" />
              Lifeguard Water Squad ({lifeguards.length})
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">
              {lifeguards.filter((l) => l.status === 'AVAILABLE').length} Available
            </span>
          </div>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {lifeguards.map((lg) => (
              <div key={lg.id} className="p-1.5 bg-slate-900/80 rounded border border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                <div>
                  <span className="font-bold text-slate-200">{lg.id}</span>
                  <span className="text-slate-400 ml-1">({lg.name})</span>
                </div>
                {getStatusBadge(lg.status)}
              </div>
            ))}
          </div>
        </div>

        {/* Aerial UAV Drones */}
        <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Plane className="w-3.5 h-3.5 text-orange-400" />
              UAV Aerial Squad ({drones.length})
            </span>
            <span className="text-[10px] font-mono text-orange-400 font-bold">
              {drones.filter((d) => d.status === 'AVAILABLE').length} Ready
            </span>
          </div>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {drones.map((drone) => (
              <div key={drone.id} className="p-1.5 bg-slate-900/80 rounded border border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                <div>
                  <span className="font-bold text-slate-200">{drone.id}</span>
                  <span className="text-slate-400 ml-1">({drone.altitude.toFixed(0)}m • {drone.batteryLevel}%)</span>
                </div>
                {getStatusBadge(drone.status)}
              </div>
            ))}
          </div>
        </div>

        {/* Ambulances & EMS */}
        <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-rose-400" />
              Emergency Medical Ambulances ({ambulances.length || 3})
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">Standby Ready</span>
          </div>
          <div className="space-y-1.5 text-[10px] font-mono text-slate-300">
            <div className="p-1.5 bg-slate-900/80 rounded border border-slate-800/80 flex items-center justify-between">
              <span>AMB-01 (KGH Trauma Base)</span>
              {getStatusBadge('AVAILABLE')}
            </div>
            <div className="p-1.5 bg-slate-900/80 rounded border border-slate-800/80 flex items-center justify-between">
              <span>AMB-02 (Promenade Station)</span>
              {getStatusBadge('AVAILABLE')}
            </div>
          </div>
        </div>

        {/* Coastal Police & Wardens */}
        <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              Marine Police & Beach Wardens
            </span>
            <span className="text-[10px] font-mono text-blue-400 font-bold">Active Patrols</span>
          </div>
          <div className="space-y-1.5 text-[10px] font-mono text-slate-300">
            <div className="p-1.5 bg-slate-900/80 rounded border border-slate-800/80 flex items-center justify-between">
              <span>POLICE-01 (Zone A Patrol)</span>
              {getStatusBadge('AVAILABLE')}
            </div>
            <div className="p-1.5 bg-slate-900/80 rounded border border-slate-800/80 flex items-center justify-between">
              <span>POLICE-02 (Rocky Shoal Warden)</span>
              {getStatusBadge('AVAILABLE')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
