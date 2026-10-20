/**
 * src/regional/components/BeachDetailModal.tsx
 * Detail drawer/modal for inspecting a selected Andhra Pradesh coastal monitoring location.
 * Provides clear "Launch 3D Simulator" for Rushikonda, and explicit "DEMO / NOT CONNECTED" for demonstration sites.
 */

import React from 'react';
import { RegionalBeachRecord, RegionalRiskObservation } from '../types';
import {
  MapPin,
  Waves,
  Shield,
  Radio,
  Clock,
  Compass,
  AlertTriangle,
  Play,
  X,
  ExternalLink,
  Info,
} from 'lucide-react';

interface BeachDetailModalProps {
  beach: RegionalBeachRecord;
  riskObservation?: RegionalRiskObservation;
  isOpen: boolean;
  onClose: () => void;
  onLaunchSimulator?: () => void;
}

export const BeachDetailModal: React.FC<BeachDetailModalProps> = ({
  beach,
  riskObservation,
  isOpen,
  onClose,
  onLaunchSimulator,
}) => {
  if (!isOpen) return null;

  const isRushikonda = beach.beachId === 'RUSHIKONDA';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200 font-mono text-xs select-none">
      <div className="bg-slate-900 border-2 border-cyan-500/60 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl border ${
                isRushikonda
                  ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-cyan-400 font-extrabold uppercase tracking-widest flex items-center gap-2">
                <span>{beach.coastSector}</span>
                <span className="text-slate-500">•</span>
                <span>{beach.district} District</span>
              </div>
              <h2 className="text-white text-base font-bold">{beach.name}</h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Site Connection Banner */}
          {isRushikonda ? (
            <div className="p-4 bg-cyan-950/40 border border-cyan-800/80 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-900 text-cyan-200 text-[10px] font-extrabold border border-cyan-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  CONNECTED DIGITAL TWIN • 3D ENGINE ACTIVE
                </span>
                <span className="text-emerald-400 font-bold text-[10px]">
                  Real-Time Bi-Directional Sync
                </span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Rushikonda Beach serves as the operational anchor pilot for the Andhra Pradesh Beach Safety Digital Twin.
                Live hydrodynamic rip current engines, visitor multi-agent behavior, rescue fleet coordinates, and multi-camera CV perception are fully active.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-slate-950/70 border border-amber-500/40 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 text-[10px] font-extrabold border border-amber-800 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-400" />
                  DEMONSTRATION SITE • SIMULATOR NOT CONNECTED
                </span>
                <span className="text-slate-400 text-[10px]">Isolated Demo Sector</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                This location is an explicitly labeled regional demonstration site.
                To prevent false claims of coastal coverage, this site does NOT connect to an external live camera feed or duplicate Rushikonda's simulation engine.
              </p>
            </div>
          )}

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Operational Status</div>
              <div className="text-base font-black text-white">{beach.status}</div>
              <div className="text-[9px] text-slate-500">Flag Category</div>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Data Provenance</div>
              <div className="text-base font-black text-cyan-300">{beach.provenance}</div>
              <div className="text-[9px] text-slate-500">Classification</div>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Active Incidents</div>
              <div className="text-base font-black text-rose-300">{beach.activeIncidentsCount}</div>
              <div className="text-[9px] text-slate-500">In Progress</div>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Assigned Fleet</div>
              <div className="text-base font-black text-emerald-300">
                {beach.availableResourcesCount} / {beach.totalResourcesCount}
              </div>
              <div className="text-[9px] text-slate-500">Available Assets</div>
            </div>
          </div>

          {/* Oceanographic Telemetry Observation */}
          <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2.5">
            <h3 className="text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <Waves className="w-4 h-4 text-cyan-400" />
              <span>Current Oceanographic Telemetry</span>
            </h3>

            {riskObservation ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px]">
                <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[10px]">Wave Height & Period:</span>
                  <div className="font-bold text-white text-sm">
                    {typeof riskObservation.waveHeightM === 'number' ? `${riskObservation.waveHeightM.toFixed(1)} m` : 'NO DATA'}
                  </div>
                  <span className="text-slate-500 text-[9px]">
                    Period: {typeof riskObservation.wavePeriodS === 'number' ? `${riskObservation.wavePeriodS.toFixed(1)}s` : 'N/A'}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[10px]">Rip Current Velocity:</span>
                  <div className="font-bold text-amber-300 text-sm">
                    {typeof riskObservation.ripVelocityMps === 'number'
                      ? `${riskObservation.ripVelocityMps.toFixed(2)} m/s`
                      : 'UNKNOWN'}
                  </div>
                  <span className="text-slate-500 text-[9px]">Risk: {riskObservation.ripCurrentRisk || 'N/A'}</span>
                </div>

                <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[10px]">Wind & Direction:</span>
                  <div className="font-bold text-white text-sm">
                    {typeof riskObservation.windSpeedMps === 'number'
                      ? `${riskObservation.windSpeedMps.toFixed(1)} m/s`
                      : 'NO DATA'}
                  </div>
                  <span className="text-slate-500 text-[9px]">
                    Heading: {riskObservation.windDirectionDeg ? `${riskObservation.windDirectionDeg.toFixed(0)}°` : 'N/A'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-slate-500">No telemetry record available.</div>
            )}

            {riskObservation?.forecastSummary && (
              <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-800 text-[10px] text-slate-300">
                <strong className="text-cyan-400">Forecast Horizon: </strong>
                {riskObservation.forecastSummary}
              </div>
            )}
          </div>

          {/* Geographic Coordinates & Metadata */}
          <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
            <div>
              <span>Coordinates: </span>
              <strong className="text-white">
                {beach.location
                  ? `${beach.location.latitude.toFixed(4)}°N, ${beach.location.longitude.toFixed(4)}°E`
                  : 'Unsurveyed'}
              </strong>
            </div>
            <div>
              <span>Telemetry Freshness: </span>
              <strong className="text-cyan-300">{beach.dataFreshness}</strong>
            </div>
          </div>
        </div>

        {/* Modal Footer / Action CTA */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/80">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all cursor-pointer"
          >
            Back to Regional Map
          </button>

          {isRushikonda ? (
            <button
              onClick={() => {
                onClose();
                if (onLaunchSimulator) onLaunchSimulator();
              }}
              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>Launch Rushikonda 3D Simulator</span>
            </button>
          ) : (
            <div className="text-[10px] text-slate-500 italic">
              Demonstration entry only — live 3D twin unavailable for this site.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
