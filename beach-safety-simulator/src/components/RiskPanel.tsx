import React, { useState } from 'react';
import { BeachRiskOverview, ZoneRiskAssessment, RiskCategory } from '../models/Risk';
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  Users,
  LifeBuoy,
  Zap,
  ChevronRight,
  Calculator,
  Waves,
  X,
  ArrowDownRight,
  Info,
  Sliders,
} from 'lucide-react';

interface RiskPanelProps {
  riskOverview?: BeachRiskOverview;
}

export const RiskPanel: React.FC<RiskPanelProps> = ({ riskOverview }) => {
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [showFormulaModal, setShowFormulaModal] = useState<boolean>(false);

  if (!riskOverview) return null;

  const currentZoneId = selectedZoneId || riskOverview.highestRiskZoneId || 'SZ-01';
  const assessment: ZoneRiskAssessment | undefined =
    riskOverview.zoneAssessments[currentZoneId] || Object.values(riskOverview.zoneAssessments)[0];

  const getRiskColor = (cat: RiskCategory) => {
    switch (cat) {
      case 'CRITICAL':
        return {
          badge: 'bg-red-950/90 text-red-400 border-red-600 animate-pulse',
          gaugeText: 'text-red-400',
          gaugeBar: 'bg-red-500',
          border: 'border-red-500/60',
          dot: '🔴',
        };
      case 'HIGH':
        return {
          badge: 'bg-orange-950/90 text-orange-400 border-orange-600',
          gaugeText: 'text-orange-400',
          gaugeBar: 'bg-orange-500',
          border: 'border-orange-500/50',
          dot: '🟠',
        };
      case 'MODERATE':
        return {
          badge: 'bg-amber-950/90 text-amber-400 border-amber-600',
          gaugeText: 'text-amber-400',
          gaugeBar: 'bg-amber-500',
          border: 'border-amber-500/40',
          dot: '🟡',
        };
      case 'LOW':
      default:
        return {
          badge: 'bg-emerald-950/90 text-emerald-400 border-emerald-600',
          gaugeText: 'text-emerald-400',
          gaugeBar: 'bg-emerald-500',
          border: 'border-emerald-500/40',
          dot: '🟢',
        };
    }
  };

  const currentColors = assessment ? getRiskColor(assessment.category) : getRiskColor('LOW');

  return (
    <div className={`bg-slate-900/90 border ${currentColors.border} rounded-xl p-3 sm:p-4 shadow-xl backdrop-blur-md space-y-3.5 transition-all`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            Operational Risk Engine
          </h3>
        </div>

        {/* Formula Explainer Button */}
        <button
          onClick={() => setShowFormulaModal(true)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-cyan-950 border border-cyan-700/60 text-cyan-300 text-[10px] font-mono font-bold hover:bg-cyan-900/50 transition-all cursor-pointer"
        >
          <Calculator className="w-3 h-3 text-cyan-400" />
          <span>FORMULA & HYDRODYNAMICS</span>
        </button>
      </div>

      {/* Zone Selector Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar font-mono text-[10px] pb-0.5">
        {Object.values(riskOverview.zoneAssessments).map((za) => (
          <button
            key={za.zoneId}
            onClick={() => setSelectedZoneId(za.zoneId)}
            className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all border whitespace-nowrap shrink-0 ${
              za.zoneId === currentZoneId
                ? 'bg-slate-800 text-white font-bold border-cyan-500 shadow-sm'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            {za.zoneId} ({za.overallScore})
          </button>
        ))}
      </div>

      {assessment && (
        <>
          {(() => {
            const currentImpact = riskOverview.currentImpact?.zoneImpacts[assessment.zoneId];
            if (!currentImpact?.affected) return null;
            return (
              <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-[10px] font-mono">
                <div className="flex items-center justify-between text-rose-300 uppercase font-bold">
                  <span>Current Influence</span>
                  <span>{currentImpact.category}</span>
                </div>
                <div className="mt-1 text-slate-300">
                  {currentImpact.influenceScore}/100 relative exposure · {currentImpact.visitorIds.length} visitor(s) in region
                </div>
                <div className="mt-1 text-slate-500">
                  {currentImpact.currentSpeedMps.toFixed(2)} m/s at {currentImpact.currentDirectionDeg.toFixed(0)}° · {currentImpact.source.toLowerCase()} model input
                </div>
              </div>
            );
          })()}

          {(() => {
            const forecast = riskOverview.forecast?.regions.find((region) => region.zoneId === assessment.zoneId);
            if (!forecast) return null;
            return (
              <div className="p-2.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-[10px] font-mono">
                <div className="flex items-center justify-between text-cyan-300 uppercase font-bold">
                  <span>Simulated Forecast</span>
                  <span>{forecast.source}</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 mt-2">
                  {forecast.points.map((point) => (
                    <div key={point.horizonSeconds} className="rounded-lg bg-slate-950/70 p-1.5 border border-slate-800">
                      <div className="text-slate-500">+{point.horizonSeconds / 60}m</div>
                      <div className="text-white font-bold">{point.status === 'AVAILABLE' ? point.category : 'N/A'}</div>
                      <div className="text-slate-400">{point.status === 'AVAILABLE' ? `${point.score}/100 · ${point.trend}` : point.reason}</div>
                    </div>
                  ))}
                </div>
                {riskOverview.forecast?.warnings.filter((warning) => warning.zoneId === assessment.zoneId).map((warning) => (
                  <div key={warning.id} className="mt-2 text-amber-300 border-t border-amber-500/20 pt-1.5">
                    Early warning: {warning.message} {warning.acknowledged ? '(acknowledged)' : ''}
                  </div>
                ))}
                <div className="mt-1.5 text-slate-500">Projection only: not calibrated oceanographic prediction.</div>
              </div>
            );
          })()}

          {/* Main Risk Output Score & Categorical Status */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <div>
              <div className="text-[10px] font-mono uppercase text-slate-400">
                Zone: <span className="text-cyan-300 font-bold">{assessment.zoneName}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2.5 py-1 rounded-md text-xs font-black uppercase font-mono border flex items-center gap-1.5 shadow ${currentColors.badge}`}>
                  <span>{currentColors.dot}</span>
                  {assessment.category}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Confidence: <strong className="text-emerald-400">{(assessment.confidence * 100).toFixed(0)}%</strong>
                </span>
              </div>
            </div>

            {/* Big Score Meter */}
            <div className="text-right">
              <div className="text-[10px] uppercase font-mono text-slate-400">Total Risk</div>
              <div className="flex items-baseline justify-end gap-1">
                <span className={`text-3xl font-black font-mono ${currentColors.gaugeText}`}>
                  {assessment.overallScore}
                </span>
                <span className="text-xs font-mono text-slate-500">/ 100</span>
              </div>
            </div>
          </div>

          {/* 4 Pillars Grid: Hazard, Exposure, Vulnerability, Response */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            {/* 1. Hazard */}
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                <Activity className="w-3 h-3 text-cyan-400" /> Hazard (H)
              </div>
              <div className="text-sm font-black text-cyan-300 mt-1 truncate">
                {assessment.hazardScore}/100
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                {assessment.primaryHazard.replace(/_/g, ' ')}
              </div>
            </div>

            {/* 2. Exposure */}
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                <Users className="w-3 h-3 text-purple-400" /> Exposure (E)
              </div>
              <div className="text-sm font-black text-purple-300 mt-1">
                {assessment.exposureScore}/100
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{assessment.swimmerCount} bathers</div>
            </div>

            {/* 3. Vulnerability */}
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" /> Vuln (V)
              </div>
              <div className="text-sm font-black text-amber-300 mt-1">
                {assessment.vulnerabilityScore}/100
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Grade: {assessment.vulnerabilityGrade}</div>
            </div>

            {/* 4. Response Capacity */}
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                <LifeBuoy className="w-3 h-3 text-emerald-400" /> Mitigation (R)
              </div>
              <div className="text-sm font-black text-emerald-300 mt-1">
                {assessment.responseScore}/100
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {assessment.lifeguardsAvailable}/{assessment.lifeguardsTotal} Stations
              </div>
            </div>
          </div>

          {/* Explainable Primary Reason */}
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono">
            <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">
              Operational Safety Assessment Reason:
            </div>
            <p className="text-slate-200 font-sans leading-relaxed text-xs">
              "{assessment.reason}"
            </p>
          </div>
        </>
      )}

      {/* Interactive Mathematical Formula & High Current Hydrodynamics Modal */}
      {showFormulaModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col p-4 sm:p-6 shadow-2xl space-y-4 text-left overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Mathematical Risk Formulation & High Current Hydrodynamics
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    4-Pillar Multi-Factor Risk Model ($H \times E \times V / R$) & Coastal Rip Physics
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFormulaModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. Core Mathematical Formula */}
            <div className="bg-slate-950 p-4 rounded-xl border border-cyan-500/30 space-y-2">
              <div className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>📐 1. Master Operational Risk Formula</span>
              </div>
              <div className="bg-slate-900 p-3 rounded-lg font-mono text-xs text-amber-300 text-center border border-slate-800">
                Operational Risk = Clamp<sub>0–100</sub>( (0.50·H + 0.35·E + 0.15·V) × [1 + (100 - R)/500] )
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Risk is a continuous synthesis of environmental marine threats (<strong>Hazard</strong>), crowd presence in the water (<strong>Exposure</strong>), human swimming ability and fatigue (<strong>Vulnerability</strong>), inversely damped by on-duty lifeguard stations and airborne UAV drones (<strong>Response Capacity</strong>).
              </p>
            </div>

            {/* 2. The 4 Mathematical Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <span className="font-bold text-cyan-400 flex items-center gap-1 text-[11px]">
                  <Activity className="w-3.5 h-3.5" /> Pillar 1: Hazard Score (H)
                </span>
                <p className="text-[11px] text-slate-400 font-mono">
                  H = w<sub>wave</sub>·H<sub>s</sub> + w<sub>rip</sub>·v<sub>rip</sub> + w<sub>tide</sub>·(dH/dt) + w<sub>shoal</sub>
                </p>
                <ul className="text-[10px] text-slate-300 list-disc pl-3 space-y-0.5">
                  <li>Wave height &gt; 1.8m spikes score by +35.</li>
                  <li>Rip current velocity &gt; 0.8 m/s adds +45.</li>
                  <li>Falling low tide narrows channels, amplifying outflow.</li>
                </ul>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <span className="font-bold text-purple-400 flex items-center gap-1 text-[11px]">
                  <Users className="w-3.5 h-3.5" /> Pillar 2: Exposure Score (E)
                </span>
                <p className="text-[11px] text-slate-400 font-mono">
                  E = (Swimmers / Capacity) × 70 + CrowdDensity × 30
                </p>
                <ul className="text-[10px] text-slate-300 list-disc pl-3 space-y-0.5">
                  <li>Zero bathers in water = Risk stays LOW regardless of waves.</li>
                  <li>Crowd clustered near rip channel increases exposure factor.</li>
                </ul>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <span className="font-bold text-amber-400 flex items-center gap-1 text-[11px]">
                  <Zap className="w-3.5 h-3.5" /> Pillar 3: Vulnerability (V)
                </span>
                <p className="text-[11px] text-slate-400 font-mono">
                  V = Σ [ (1 - Ability<sub>i</sub>) + 0.3·Fatigue<sub>i</sub> + Panic<sub>i</sub> ] / N
                </p>
                <ul className="text-[10px] text-slate-300 list-disc pl-3 space-y-0.5">
                  <li>Non-swimmers & children amplify vulnerability up to 95%.</li>
                  <li>Fatigue accumulation accelerates by 300% in currents.</li>
                </ul>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <span className="font-bold text-emerald-400 flex items-center gap-1 text-[11px]">
                  <LifeBuoy className="w-3.5 h-3.5" /> Pillar 4: Mitigation (R)
                </span>
                <p className="text-[11px] text-slate-400 font-mono">
                  R = (Active Lifeguards / Total) × UAV_Coverage
                </p>
                <ul className="text-[10px] text-slate-300 list-disc pl-3 space-y-0.5">
                  <li>Full lifeguard readiness dampens risk multiplier.</li>
                  <li>Station downtime or lifeguard fatigue amplifies total risk.</li>
                </ul>
              </div>
            </div>

            {/* 3. High Currents Occurrence & Simulation Dynamics */}
            <div className="bg-slate-950 p-4 rounded-xl border border-rose-500/30 space-y-2.5">
              <div className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                <Waves className="w-4 h-4 text-rose-400" />
                <span>🌊 2. High Current Occurrence & Influencing Factors in Simulation</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <strong className="text-cyan-300 block mb-1">A. Formation Cause</strong>
                  <p className="text-slate-300 text-[10px] leading-relaxed">
                    Breaking waves push excess water over submerged sandbars. Trapped water rushes seaward through narrow bathymetric trenches, creating rip currents of <strong>0.8 to 2.5 m/s</strong>.
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <strong className="text-amber-300 block mb-1">B. Swimmer Dynamics</strong>
                  <p className="text-slate-300 text-[10px] leading-relaxed">
                    Swimmers are pulled seaward at drift velocity v<sub>drift</sub>. Swimming against current drains stamina at <strong>3x speed</strong>, triggering fatigue and distress.
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <strong className="text-emerald-300 block mb-1">C. Safety Engine Response</strong>
                  <p className="text-slate-300 text-[10px] leading-relaxed">
                    Automatic Red Flag signboards activate. CCTV detects seaward drift, dispatching UAV-01 with buoyancy payload and alerting Jet Ski rescue units.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowFormulaModal(false)}
                className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-slate-950 text-xs font-bold transition-all cursor-pointer"
              >
                Close Formulation Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
