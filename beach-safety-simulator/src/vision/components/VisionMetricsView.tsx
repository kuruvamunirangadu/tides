import React from 'react';
import { VisionMetrics } from '../evaluation/VisionMetrics';

interface VisionMetricsViewProps {
  metrics: VisionMetrics;
}

export const VisionMetricsView: React.FC<VisionMetricsViewProps> = ({
  metrics,
}) => {
  const precisionPct = (metrics.precision || 0).toFixed(1);
  const recallPct = (metrics.recall || 0).toFixed(1);
  const f1Pct = (metrics.f1Score || 0).toFixed(1);
  const coveragePct = (metrics.coveragePercentage || 0).toFixed(1);

  return (
    <div className="space-y-4">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
          <div className="text-[11px] font-medium text-slate-400">PRECISION</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">{precisionPct}%</div>
          <div className="text-[10px] text-slate-500 mt-0.5">TP / (TP + FP)</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
          <div className="text-[11px] font-medium text-slate-400">RECALL (SENSITIVITY)</div>
          <div className="text-xl font-bold font-mono text-cyan-400 mt-0.5">{recallPct}%</div>
          <div className="text-[10px] text-slate-500 mt-0.5">TP / (TP + FN)</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
          <div className="text-[11px] font-medium text-slate-400">F1 CONFIDENCE SCORE</div>
          <div className="text-xl font-bold font-mono text-indigo-400 mt-0.5">{f1Pct}%</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Harmonic Mean</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
          <div className="text-[11px] font-medium text-slate-400">FOV COVERAGE</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">{coveragePct}%</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Active Beach Area</div>
        </div>
      </div>

      {/* Ground Truth vs Detection Confusion Breakdown */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4">
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
          Ground Truth vs Computer Vision Inference
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-800/40">
            <div className="text-lg font-bold font-mono text-emerald-400">{metrics.truePositives || 0}</div>
            <div className="text-[11px] text-emerald-300 font-medium">True Positives</div>
            <div className="text-[10px] text-slate-500">Correctly Detected</div>
          </div>

          <div className="p-2.5 rounded bg-amber-950/40 border border-amber-800/40">
            <div className="text-lg font-bold font-mono text-amber-400">{metrics.falsePositives || 0}</div>
            <div className="text-[11px] text-amber-300 font-medium">False Positives</div>
            <div className="text-[10px] text-slate-500">Ghost / Noise Artifacts</div>
          </div>

          <div className="p-2.5 rounded bg-rose-950/40 border border-rose-800/40">
            <div className="text-lg font-bold font-mono text-rose-400">{metrics.falseNegatives || 0}</div>
            <div className="text-[11px] text-rose-300 font-medium">False Negatives</div>
            <div className="text-[10px] text-slate-500">Missed in Camera FOV</div>
          </div>

          <div className="p-2.5 rounded bg-purple-950/40 border border-purple-800/40">
            <div className="text-lg font-bold font-mono text-purple-400">{metrics.peopleInBlindZones || 0}</div>
            <div className="text-[11px] text-purple-300 font-medium">Blind Zones</div>
            <div className="text-[10px] text-slate-500">Outside Camera Range</div>
          </div>
        </div>

        {/* Breakdown details */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400">
          <div>
            Ground Truth Visitors: <span className="font-mono font-semibold text-slate-200">{metrics.totalPeopleInBeach || 0}</span>
          </div>
          <div>
            Inside Camera FOV: <span className="font-mono font-semibold text-slate-200">{metrics.peopleInCameraCoverage || 0}</span>
          </div>
          <div>
            Active Multi-Object Tracks: <span className="font-mono font-semibold text-cyan-400">{metrics.activeTrackCount || 0}</span>
          </div>
          <div>
            Distress Detection Rate: <span className="font-mono font-semibold text-rose-400">{(metrics.distressDetectionRate || 0).toFixed(0)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
