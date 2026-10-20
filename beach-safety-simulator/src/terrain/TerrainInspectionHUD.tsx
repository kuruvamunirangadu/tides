/**
 * src/terrain/TerrainInspectionHUD.tsx
 * 
 * TIDES Milestone 15: Real-World Terrain & Bathymetry Inspection HUD.
 * 
 * Provides interactive inspection, dataset provenance, and diagnostic controls:
 * - Real-time point probe (3D X, Y, Z, WGS84 GPS, Elevation/Depth, Quality Status)
 * - Quick-preset jump to surveyed landmarks (Promenade Datum, Rip Trench, Basalt Headlands)
 * - 3D Depth Contours (Isobaths) toggle
 * - Reversible toggle between 'Calibrated Bathymetry' and 'Legacy Procedural' terrain
 * - Wireframe diagnostic mode
 * - Full metadata dossier (CRS, Vertical Datum MSL/CD, GSD Resolution, Provenance)
 */

import React, { useState } from 'react';
import {
  Mountain,
  Layers,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Info,
  Maximize2,
  X,
  Compass,
  Eye,
  Sliders,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { RUSHIKONDA_TERRAIN_PROFILE } from './TerrainDataProfile';
import { BathymetryElevationProvider, TerrainElevationMode, TerrainPointInspection } from './BathymetryElevationProvider';
import { RealShorelineProvider, ShorelineGeometryMode } from './RealShorelineProvider';

interface TerrainInspectionHUDProps {
  isOpen: boolean;
  onClose: () => void;
  isContoursVisible: boolean;
  onToggleContours: () => void;
  isWireframeVisible: boolean;
  onToggleWireframe: () => void;
  onFocusCoordinates?: (coords: { x: number; y: number; z: number }) => void;
}

export const TerrainInspectionHUD: React.FC<TerrainInspectionHUDProps> = ({
  isOpen,
  onClose,
  isContoursVisible,
  onToggleContours,
  isWireframeVisible,
  onToggleWireframe,
  onFocusCoordinates,
}) => {
  const [probeX, setProbeX] = useState<number>(35.5);
  const [probeZ, setProbeZ] = useState<number>(-22.0);
  const [showMetadataDrawer, setShowMetadataDrawer] = useState<boolean>(false);

  if (!isOpen) return null;

  const elevationProvider = BathymetryElevationProvider.getInstance();
  const shorelineProvider = RealShorelineProvider.getInstance();
  const profile = RUSHIKONDA_TERRAIN_PROFILE;

  const inspection: TerrainPointInspection = elevationProvider.inspectPoint(probeX, probeZ);
  const currentMode = elevationProvider.getMode();

  const handleToggleMode = () => {
    const newMode: TerrainElevationMode =
      currentMode === 'CALIBRATED_BATHYMETRY' ? 'LEGACY_PROCEDURAL' : 'CALIBRATED_BATHYMETRY';
    elevationProvider.setMode(newMode);
    shorelineProvider.setMode(
      newMode === 'CALIBRATED_BATHYMETRY' ? 'CALIBRATED_SURVEYED' : 'LEGACY_PROCEDURAL'
    );
  };

  const formatDMS = (dec: number, isLat: boolean): string => {
    const dir = isLat ? (dec >= 0 ? 'N' : 'S') : dec >= 0 ? 'E' : 'W';
    const abs = Math.abs(dec);
    const d = Math.floor(abs);
    const m = Math.floor((abs - d) * 60);
    const s = ((abs - d - m / 60) * 3600).toFixed(1);
    return `${d}°${m}'${s}"${dir}`;
  };

  const quickPresets = [
    { name: 'Rip Trench Thalweg', x: 35.5, z: -22.0, tag: '-3.8m Scour' },
    { name: 'Promenade Datum', x: 0.0, z: 0.0, tag: '+3.5m Origin' },
    { name: 'South Basalt Reef', x: -81.7, z: -23.9, tag: '+4.8m Reef' },
    { name: 'North Headland Cape', x: 107.8, z: -9.8, tag: '+6.2m Bluff' },
    { name: 'Bathing Crescent Apex', x: -34.4, z: 5.4, tag: '+1.2m Swash' },
    { name: 'Offshore Shelf Basin', x: 0.0, z: -65.0, tag: '-7.5m Deep' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-teal-500/50 rounded-2xl shadow-2xl shadow-teal-950/60 text-slate-100 overflow-hidden font-sans text-xs">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-800/80 border-b border-slate-700/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <Mountain className="w-5 h-5 text-teal-400" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-sm tracking-wide">
                  Real-World Terrain & Seabed Bathymetry Inspector
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-950 text-teal-300 border border-teal-600/50 uppercase tracking-wider">
                  Milestone 15
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Site: {profile.siteName} • 1 km Coastal Reach (1,006.2m) • Datum: MSL / Chart Datum
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleMode}
              title="Toggle between Calibrated Bathymetry and Legacy Procedural Mode"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                currentMode === 'CALIBRATED_BATHYMETRY'
                  ? 'bg-teal-600 text-white border-teal-400'
                  : 'bg-amber-950/80 text-amber-300 border-amber-600/60'
              }`}
            >
              Mode: {currentMode === 'CALIBRATED_BATHYMETRY' ? 'Calibrated Bathymetry' : 'Legacy Procedural'}
            </button>

            <button
              onClick={onClose}
              title="Close Terrain Inspector"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 1. Control Toolbar: Contours & Wireframe Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2">
              <button
                onClick={onToggleContours}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs border transition-all cursor-pointer ${
                  isContoursVisible
                    ? 'bg-sky-500 text-slate-950 border-sky-300 font-extrabold shadow-lg shadow-sky-950'
                    : 'bg-slate-800 text-sky-400 border-sky-500/40 hover:bg-slate-700'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{isContoursVisible ? 'Hide Depth Contours' : '3D Depth Contours (Isobaths)'}</span>
              </button>

              <button
                onClick={onToggleWireframe}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs border transition-all cursor-pointer ${
                  isWireframeVisible
                    ? 'bg-amber-500 text-slate-950 border-amber-300 font-extrabold shadow-lg shadow-amber-950'
                    : 'bg-slate-800 text-amber-400 border-amber-500/40 hover:bg-slate-700'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{isWireframeVisible ? 'Hide Wireframe' : 'Diagnostic Wireframe'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Surveyed</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <span>NHO Chart 3002</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Synthetic Swash</span>
              </span>
            </div>
          </div>

          {/* 2. Interactive Point Probe Console */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-teal-300 uppercase tracking-wider text-xs flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-teal-400" />
                <span>Terrain & Bathymetric Point Probe</span>
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                    inspection.quality === 'SURVEYED'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/50'
                      : inspection.quality === 'INTERPOLATED'
                      ? 'bg-sky-950 text-sky-300 border border-sky-600/50'
                      : 'bg-amber-950 text-amber-300 border border-amber-600/50'
                  }`}
                >
                  {inspection.quality}
                </span>
                <span className="text-slate-400 text-[10px] font-mono">
                  Station: [{inspection.x3d.toFixed(1)}, {inspection.z3d.toFixed(1)}]
                </span>
              </div>
            </div>

            {/* Quick-Jump Presets */}
            <div className="space-y-1">
              <div className="text-[10px] text-slate-400 font-medium">Quick-Probe Coastal Landmarks:</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
                {quickPresets.map((qp) => (
                  <button
                    key={qp.name}
                    onClick={() => {
                      setProbeX(qp.x);
                      setProbeZ(qp.z);
                      if (onFocusCoordinates) {
                        const y = elevationProvider.getElevation(qp.x, qp.z);
                        onFocusCoordinates({ x: qp.x, y, z: qp.z });
                      }
                    }}
                    className={`p-1.5 rounded-lg text-left border transition-all cursor-pointer ${
                      Math.abs(probeX - qp.x) < 2 && Math.abs(probeZ - qp.z) < 2
                        ? 'bg-teal-900/60 border-teal-400 text-teal-200'
                        : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="font-bold truncate text-[10px]">{qp.name}</div>
                    <div className="text-[9px] text-teal-400 font-mono">{qp.tag}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Coordinate Scrubbers / Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-slate-400">Alongshore Coordinate (X):</span>
                  <span className="text-teal-300 font-bold">{probeX.toFixed(1)} units ({(probeX * 5.0).toFixed(0)}m)</span>
                </div>
                <input
                  type="range"
                  min="-105"
                  max="105"
                  step="0.5"
                  value={probeX}
                  onChange={(e) => setProbeX(parseFloat(e.target.value))}
                  className="w-full accent-teal-400 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-slate-400">Cross-shore Coordinate (Z):</span>
                  <span className="text-cyan-300 font-bold">
                    {probeZ.toFixed(1)} units ({probeZ < 0 ? `${(-probeZ * 5.0).toFixed(0)}m seaward` : `${(probeZ * 5.0).toFixed(0)}m inland`})
                  </span>
                </div>
                <input
                  type="range"
                  min="-75"
                  max="45"
                  step="0.5"
                  value={probeZ}
                  onChange={(e) => setProbeZ(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Probe Telemetry Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono pt-1">
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-slate-400 text-[9px]">SURFACE ELEVATION (MSL)</div>
                <div className={`text-base font-extrabold ${inspection.elevationMetersMSL >= 0 ? 'text-emerald-400' : 'text-sky-400'}`}>
                  {inspection.elevationMetersMSL >= 0 ? `+${inspection.elevationMetersMSL.toFixed(2)}m` : `${inspection.elevationMetersMSL.toFixed(2)}m`}
                </div>
                <div className="text-[9px] text-slate-500">Relative to Mean Sea Level</div>
              </div>

              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-slate-400 text-[9px]">WATER DEPTH</div>
                <div className={`text-base font-extrabold ${inspection.waterDepthMeters > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                  {inspection.waterDepthMeters > 0 ? `${inspection.waterDepthMeters.toFixed(2)}m` : '0.00m (Dry Land)'}
                </div>
                <div className="text-[9px] text-slate-500">{inspection.nearestIsobath}</div>
              </div>

              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-slate-400 text-[9px]">WGS84 GPS (LAT, LON)</div>
                <div className="text-teal-300 font-semibold text-[11px] truncate">
                  {inspection.coordinatesWGS84.latitude.toFixed(6)}° N
                </div>
                <div className="text-teal-300 font-semibold text-[11px] truncate">
                  {inspection.coordinatesWGS84.longitude.toFixed(6)}° E
                </div>
              </div>

              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-slate-400 text-[9px]">ZONE & PROVENANCE</div>
                <div className="text-white font-bold text-[11px] truncate">{inspection.zoneType}</div>
                <div className="text-slate-400 text-[9px] truncate">{inspection.provenance}</div>
              </div>
            </div>
          </div>

          {/* 3. Calibrated Isobaths Reference Table */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-sky-400" />
                <span>Standard Coastal Isobath Contours</span>
              </span>
              <span className="text-[10px] text-slate-400">Vertical Datum: Mean Sea Level (MSL = 0.0m)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {profile.isobaths.map((iso) => (
                <div
                  key={iso.depthMeters}
                  className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-start gap-2"
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 mt-0.5 border border-white/20"
                    style={{ backgroundColor: iso.colorHex }}
                  />
                  <div className="space-y-0.5 overflow-hidden">
                    <div className="font-bold text-white text-[10px] truncate">{iso.label}</div>
                    <div className="text-[9px] text-slate-400 leading-tight">{iso.significance}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Dataset Provenance & Metadata Collapsible Drawer */}
          <div className="rounded-xl bg-slate-950/60 border border-slate-800 overflow-hidden">
            <button
              onClick={() => setShowMetadataDrawer((prev) => !prev)}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors cursor-pointer"
            >
              <span className="font-bold text-slate-300 text-xs flex items-center gap-1.5">
                <Info className="w-4 h-4 text-teal-400" />
                <span>Dataset Metadata, Vertical Datums & Provenance Dossier</span>
              </span>
              {showMetadataDrawer ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showMetadataDrawer && (
              <div className="p-3.5 border-t border-slate-800 space-y-3 bg-slate-900/60">
                {profile.datasets.map((ds) => (
                  <div key={ds.datasetId} className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-teal-300 text-[11px]">{ds.name}</span>
                        <span className="text-slate-500 text-[9px] font-mono">({ds.datasetId})</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {ds.qualityLevel}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[9px] font-mono text-slate-300">
                      <div>
                        <span className="text-slate-500">AUTHORITY: </span>
                        <span>{ds.sourceAuthority}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">CRS: </span>
                        <span>{ds.crsHorizontal}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">DATUM: </span>
                        <span>{ds.verticalDatum} (Offset: {ds.datumOffsetToMSLMeters}m)</span>
                      </div>
                      <div>
                        <span className="text-slate-500">RESOLUTION: </span>
                        <span>{ds.spatialResolutionMeters}m</span>
                      </div>
                    </div>

                    <p className="text-[9px] text-slate-400 font-sans">
                      <strong className="text-slate-300">Method:</strong> {ds.processingMethod}
                    </p>

                    <div className="text-[9px] text-amber-400/90 font-sans">
                      <strong>Limitations:</strong> {ds.limitations.join(' ')}
                    </div>
                  </div>
                ))}

                <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/40 text-[10px] text-amber-200/90 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Scientific Rigor & Simulation Non-Interference Statement</span>
                  </div>
                  <p className="leading-relaxed">
                    This terrain and bathymetry layer visualizes verified coastal ground control, aerial imagery boundaries,
                    and nautical depth contours without modifying the underlying hydrodynamic simulation formulas, visitor
                    decision trees, or rescue dispatch rules. Deep bay areas beyond acoustic sounding coverage are labelled
                    as synthetic/interpolated and are not claimed as direct high-resolution sonar measurements.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-800/80 border-t border-slate-700/80 flex items-center justify-between text-[10px] text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span>Coastal Azimuth: <strong>{profile.coastalAzimuthDegrees}°</strong></span>
            <span>•</span>
            <span>Spring Tide Range: <strong>±0.75m</strong></span>
            <span>•</span>
            <span>Curved Reach: <strong>{profile.coastalReachLengthMeters}m</strong></span>
          </div>

          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white font-bold cursor-pointer transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};

