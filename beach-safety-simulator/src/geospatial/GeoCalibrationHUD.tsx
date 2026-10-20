import React, { useState } from 'react';
import {
  Globe,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Compass,
  Layers,
  ChevronDown,
  ChevronUp,
  Info,
  ExternalLink,
  Target,
  Maximize2,
  X,
} from 'lucide-react';
import { RUSHIKONDA_CALIBRATION_PROFILE } from './BeachCalibrationProfile';
import { GeoControlPointRegistry, GeoControlPoint, CalibrationResiduals } from './GeoControlPointRegistry';
import { GeoCoordinateTransform } from './GeoCoordinateTransform';

interface GeoCalibrationHUDProps {
  isOpen: boolean;
  onClose: () => void;
  is3DPinsVisible: boolean;
  onToggle3DPins: () => void;
  onSelectControlPoint?: (point: GeoControlPoint) => void;
}

export const GeoCalibrationHUD: React.FC<GeoCalibrationHUDProps> = ({
  isOpen,
  onClose,
  is3DPinsVisible,
  onToggle3DPins,
  onSelectControlPoint,
}) => {
  const [selectedPointId, setSelectedPointId] = useState<string>('CP-04');
  const [showLimitations, setShowLimitations] = useState<boolean>(false);
  const [inspectX, setInspectX] = useState<number>(0);
  const [inspectZ, setInspectZ] = useState<number>(0);

  if (!isOpen) return null;

  const registry = GeoControlPointRegistry.getInstance();
  const transform = GeoCoordinateTransform.getInstance();
  const profile = RUSHIKONDA_CALIBRATION_PROFILE;

  const points = registry.getAllControlPoints();
  const residuals: CalibrationResiduals = registry.calculateResiduals();
  const selectedPoint = points.find((p) => p.id === selectedPointId) || points[0];

  // Inspect coordinate translation
  const inspectedGPS = transform.threeToWgs84({ x: inspectX, y: 0, z: inspectZ });
  const inspectedPixels = transform.wgs84ToPixel(inspectedGPS);

  const formatDMS = (dec: number, isLat: boolean): string => {
    const dir = isLat ? (dec >= 0 ? 'N' : 'S') : dec >= 0 ? 'E' : 'W';
    const abs = Math.abs(dec);
    const d = Math.floor(abs);
    const m = Math.floor((abs - d) * 60);
    const s = ((abs - d - m / 60) * 3600).toFixed(1);
    return `${d}°${m}'${s}"${dir}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-cyan-500/50 rounded-2xl shadow-2xl shadow-cyan-950/50 text-slate-100 overflow-hidden font-sans text-xs">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-800/80 border-b border-slate-700/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-cyan-400 animate-spin-slow" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-sm tracking-wide">
                  Geographic Digital Twin Calibration (1 km Coastal Reach)
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-700/60">
                  {profile.calibrationVersion}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                {profile.siteName} • {profile.geographicDatum} • {profile.projectedCrs}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggle3DPins}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                is3DPinsVisible
                  ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-extrabold shadow-lg shadow-cyan-500/20'
                  : 'bg-slate-800 text-cyan-300 border-cyan-700/50 hover:bg-slate-700'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>{is3DPinsVisible ? 'Hide 3D Survey Pins' : 'Show 3D Survey Pins'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 1. Summary Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-mono block">Alongshore Reach</span>
              <div className="text-base font-extrabold text-cyan-300 font-mono mt-0.5">
                {profile.alongshoreCurvedLengthMeters.toFixed(1)} m
              </div>
              <span className="text-[9px] text-slate-500">True curved crescent length</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-mono block">Control Points</span>
              <div className="text-base font-extrabold text-emerald-400 font-mono mt-0.5">
                {points.length} Points
              </div>
              <span className="text-[9px] text-emerald-500/80">6 Surveyed • 2 Checkpoints</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-mono block">Registration RMSE</span>
              <div className="text-base font-extrabold text-amber-300 font-mono mt-0.5">
                {residuals.overallRmseMeters.toFixed(2)} m
              </div>
              <span className="text-[9px] text-amber-400/80 font-mono">
                {residuals.isWithinTolerance ? '✓ Within < 2.5m tolerance' : '⚠ High residual'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-mono block">Local Origin Datum</span>
              <div className="text-xs font-bold text-white font-mono mt-0.5 truncate">
                {profile.localOriginWGS84.latitude.toFixed(4)}°N, {profile.localOriginWGS84.longitude.toFixed(4)}°E
              </div>
              <span className="text-[9px] text-cyan-400 truncate block">Promenade Flagpole Datum</span>
            </div>
          </div>

          {/* 2. Interactive Ground Control Points Registry Table */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-300 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-cyan-400" />
                Surveyed Ground Control Points & Independent Checkpoints
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Click a row to focus</span>
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
              <table className="w-full text-left font-mono text-[10px]">
                <thead className="bg-slate-800/60 text-slate-400 uppercase text-[9px] border-b border-slate-800">
                  <tr>
                    <th className="py-2 px-2.5">ID</th>
                    <th className="py-2 px-2.5">Feature Name</th>
                    <th className="py-2 px-2.5">Category</th>
                    <th className="py-2 px-2.5">WGS84 GPS (Lat, Lon)</th>
                    <th className="py-2 px-2.5">3D Pos (X, Y, Z)</th>
                    <th className="py-2 px-2.5">Residual</th>
                    <th className="py-2 px-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {points.map((p) => {
                    const res = residuals.pointResiduals.get(p.id);
                    const isSelected = p.id === selectedPointId;

                    return (
                      <tr
                        key={p.id}
                        onClick={() => {
                          setSelectedPointId(p.id);
                          setInspectX(p.local3DPosition.x);
                          setInspectZ(p.local3DPosition.z);
                          if (onSelectControlPoint) onSelectControlPoint(p);
                        }}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-cyan-950/60 text-cyan-200 font-semibold'
                            : 'hover:bg-slate-800/40 text-slate-300'
                        }`}
                      >
                        <td className="py-2 px-2.5 font-bold text-cyan-400">{p.id}</td>
                        <td className="py-2 px-2.5 font-sans font-medium text-slate-200">{p.name}</td>
                        <td className="py-2 px-2.5 text-slate-400 text-[9px]">{p.category}</td>
                        <td className="py-2 px-2.5 text-slate-300">
                          {p.coordinatesWGS84.latitude.toFixed(6)}°, {p.coordinatesWGS84.longitude.toFixed(6)}°
                        </td>
                        <td className="py-2 px-2.5 text-slate-400">
                          [{p.local3DPosition.x.toFixed(1)}, {p.local3DPosition.y.toFixed(1)}, {p.local3DPosition.z.toFixed(1)}]
                        </td>
                        <td className="py-2 px-2.5 font-bold text-amber-300">
                          {res ? `${res.residualMeters.toFixed(2)}m` : '—'}
                        </td>
                        <td className="py-2 px-2.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                              p.verificationStatus === 'VERIFIED'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50'
                                : 'bg-cyan-950 text-cyan-300 border border-cyan-700/50'
                            }`}
                          >
                            {p.verificationStatus === 'VERIFIED' ? 'VERIFIED' : 'CHECKPOINT'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Selected Control Point Inspector & Real-time Coordinate Translator */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Left: Selected Point Details */}
            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <span className="font-bold text-cyan-300 uppercase tracking-wider text-[11px]">
                  Point Dossier: {selectedPoint.name} ({selectedPoint.id})
                </span>
                <span className="text-[9px] text-slate-400 font-mono">
                  Uncertainty: ±{selectedPoint.uncertaintyMeters}m
                </span>
              </div>

              <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                {selectedPoint.description}
              </p>

              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1">
                <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                  <div className="text-slate-400 text-[9px]">DMS NOTATION</div>
                  <div className="text-cyan-300">
                    {formatDMS(selectedPoint.coordinatesWGS84.latitude, true)}
                  </div>
                  <div className="text-cyan-300">
                    {formatDMS(selectedPoint.coordinatesWGS84.longitude, false)}
                  </div>
                </div>

                <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                  <div className="text-slate-400 text-[9px]">AERIAL IMAGE PIXELS</div>
                  <div className="text-white">
                    U: {selectedPoint.imagePixels?.u ?? '—'} px
                  </div>
                  <div className="text-white">
                    V: {selectedPoint.imagePixels?.v ?? '—'} px
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Interactive 3D World <-> GPS Inspector */}
            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <span className="font-bold text-emerald-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-emerald-400" />
                  Real-time Coordinate Inspector
                </span>
                <span className="text-[9px] text-slate-400 font-mono">WGS84 / 3D World</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] text-slate-400 uppercase font-mono block mb-1">
                    3D Alongshore X (-100 to +100):
                  </label>
                  <input
                    type="range"
                    min="-95"
                    max="95"
                    step="1"
                    value={inspectX}
                    onChange={(e) => setInspectX(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <div className="text-right font-mono text-cyan-300 text-[10px]">{inspectX}m</div>
                </div>

                <div>
                  <label className="text-[9px] text-slate-400 uppercase font-mono block mb-1">
                    3D Cross-shore Z (-70 to +60):
                  </label>
                  <input
                    type="range"
                    min="-65"
                    max="55"
                    step="1"
                    value={inspectZ}
                    onChange={(e) => setInspectZ(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <div className="text-right font-mono text-cyan-300 text-[10px]">{inspectZ}m</div>
                </div>
              </div>

              <div className="p-2 rounded bg-slate-900 border border-slate-800 font-mono text-[10px] space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">GPS LATITUDE:</span>
                  <span className="text-emerald-300 font-bold">{inspectedGPS.latitude.toFixed(6)}° N</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">GPS LONGITUDE:</span>
                  <span className="text-emerald-300 font-bold">{inspectedGPS.longitude.toFixed(6)}° E</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">IMAGE RECON PIXELS:</span>
                  <span className="text-cyan-300 font-bold">u={inspectedPixels.u}, v={inspectedPixels.v}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Accuracy Limitations Collapsible Accordion */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/30">
            <button
              onClick={() => setShowLimitations(!showLimitations)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-800/40 hover:bg-slate-800/60 text-slate-300 text-[11px] font-semibold transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 text-amber-300">
                <Info className="w-4 h-4 text-amber-400" />
                <span>Data Provenance & Geodetic Limitations</span>
              </div>
              {showLimitations ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showLimitations && (
              <div className="p-3 space-y-1.5 text-[10px] text-slate-400 font-sans border-t border-slate-800">
                {profile.accuracyLimitations.map((lim, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-amber-400 shrink-0 font-mono">•</span>
                    <span>{lim}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-2.5 bg-slate-800/80 border-t border-slate-700/80 flex items-center justify-between text-slate-400 text-[10px] font-mono shrink-0">
          <span>Source: {profile.sourceImagery.provenance}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-colors cursor-pointer"
          >
            Close Calibration Inspector
          </button>
        </div>
      </div>
    </div>
  );
};

