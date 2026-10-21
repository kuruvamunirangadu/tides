/**
 * RealTimeRiskProgressionChart.tsx
 * 
 * Interactive Real-Time Risk Progression Curve & Multi-Pillar Attribution Telemetry
 * Provides:
 * - High-precision SVG Area Spline Curve with color threshold gradients
 * - Histogram Bars view with guaranteed visible min-height & flex-end alignment
 * - 4-Pillars Multi-Curve overlay (Hazard, Exposure, Vulnerability, Overall Risk)
 * - Real-time KPI summary (Current, Peak, Average, Trend slope)
 * - Interactive mouse scrubber crosshair with deep telemetry tooltip
 * - Sample window selector (Last 30, Last 60, All 120 samples)
 */

import React, { useState, useRef } from 'react';
import {
  TrendingUp,
  Activity,
  BarChart2,
  Waves,
  Users,
  ShieldAlert,
  Zap,
  Info,
} from 'lucide-react';

export interface RiskHistoryEntry {
  time: string;
  timestamp: number;
  riskScore: number;
  hazardScore: number;
  exposureScore: number;
  vulnerabilityScore: number;
  responseScore: number;
  primaryCause: string;
  activeSwimmers: number;
  distressedCount: number;
}

interface RealTimeRiskProgressionChartProps {
  riskHistory?: RiskHistoryEntry[];
  compact?: boolean;
}

export const RealTimeRiskProgressionChart: React.FC<RealTimeRiskProgressionChartProps> = ({
  riskHistory = [],
  compact = false,
}) => {
  const [viewMode, setViewMode] = useState<'spline' | 'bars' | 'pillars'>('spline');
  const [sampleWindow, setSampleWindow] = useState<number>(compact ? 30 : 60);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Filter window of samples
  const samples =
    sampleWindow === 0 || sampleWindow >= riskHistory.length
      ? riskHistory
      : riskHistory.slice(-sampleWindow);

  const sampleCount = riskHistory.length;
  const latest = samples[samples.length - 1] || null;

  // Key KPI stats
  const currentScore = latest ? latest.riskScore : 0;
  const peakScore = samples.length > 0 ? Math.max(...samples.map((s) => s.riskScore)) : 0;
  const avgScore =
    samples.length > 0
      ? Math.round(samples.reduce((acc, s) => acc + s.riskScore, 0) / samples.length)
      : 0;

  // Trend slope calculation (first half vs second half of active window)
  let trendText = 'Stable →';
  let trendColor = 'text-slate-400';
  if (samples.length >= 6) {
    const mid = Math.floor(samples.length / 2);
    const firstAvg = samples.slice(0, mid).reduce((a, b) => a + b.riskScore, 0) / mid;
    const secondAvg =
      samples.slice(mid).reduce((a, b) => a + b.riskScore, 0) / (samples.length - mid);
    const diff = Math.round(secondAvg - firstAvg);
    if (diff > 1) {
      trendText = `Rising (+${diff}%) ↗`;
      trendColor = 'text-rose-400 font-bold';
    } else if (diff < -1) {
      trendText = `Easing (${diff}%) ↘`;
      trendColor = 'text-emerald-400 font-bold';
    }
  }

  const getRiskColor = (score: number) => {
    if (score >= 80) return { hex: '#ef4444', text: 'text-red-400', bg: 'bg-red-500/20 border-red-500/60', name: 'CRITICAL' };
    if (score >= 60) return { hex: '#f97316', text: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-500/60', name: 'HIGH' };
    if (score >= 40) return { hex: '#eab308', text: 'text-amber-400', bg: 'bg-amber-500/20 border-amber-500/60', name: 'MODERATE' };
    return { hex: '#10b981', text: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/60', name: 'LOW' };
  };

  const currentLevel = getRiskColor(currentScore);

  // SVG dimensions & scales
  const svgWidth = 540;
  const svgHeight = compact ? 130 : 160;
  const padLeft = 32;
  const padRight = 14;
  const padTop = 14;
  const padBottom = 22;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;
  const baseY = padTop + plotHeight;

  const getX = (idx: number, count: number) => {
    if (count <= 1) return padLeft + plotWidth / 2;
    return padLeft + (idx / (count - 1)) * plotWidth;
  };

  const getY = (score: number) => {
    const clamped = Math.min(100, Math.max(0, score));
    return padTop + (1 - clamped / 100) * plotHeight;
  };

  // Generate smooth cubic Catmull-Rom Bezier spline curve
  const generateSplinePath = (pts: Array<{ x: number; y: number }>) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y} L ${pts[0].x + 2} ${pts[0].y}`;
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = i > 0 ? pts[i - 1] : pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = i < pts.length - 2 ? pts[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  };

  // Build points for overall risk
  const riskPts = samples.map((s, idx) => ({
    x: getX(idx, samples.length),
    y: getY(s.riskScore),
  }));

  // Build points for 4-pillars
  const hazardPts = samples.map((s, idx) => ({
    x: getX(idx, samples.length),
    y: getY(s.hazardScore),
  }));
  const exposurePts = samples.map((s, idx) => ({
    x: getX(idx, samples.length),
    y: getY(s.exposureScore),
  }));
  const vulnPts = samples.map((s, idx) => ({
    x: getX(idx, samples.length),
    y: getY(s.vulnerabilityScore),
  }));

  const riskSplineD = generateSplinePath(riskPts);
  const hazardSplineD = generateSplinePath(hazardPts);
  const exposureSplineD = generateSplinePath(exposurePts);
  const vulnSplineD = generateSplinePath(vulnPts);

  const riskAreaD =
    riskPts.length > 0
      ? `${riskSplineD} L ${riskPts[riskPts.length - 1].x.toFixed(1)} ${baseY} L ${riskPts[0].x.toFixed(1)} ${baseY} Z`
      : '';

  // Interactive mouse move tracking
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || samples.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const normX = (mouseX / rect.width) * svgWidth;

    if (normX < padLeft || normX > svgWidth - padRight) {
      setHoveredIdx(null);
      return;
    }

    const relX = normX - padLeft;
    const fraction = Math.max(0, Math.min(1, relX / plotWidth));
    const closestIdx = Math.round(fraction * (samples.length - 1));
    setHoveredIdx(closestIdx);
  };

  const handleMouseLeave = () => {
    setHoveredIdx(null);
  };

  const activeHoverSample = hoveredIdx !== null && samples[hoveredIdx] ? samples[hoveredIdx] : null;
  const activeHoverPoint = hoveredIdx !== null && riskPts[hoveredIdx] ? riskPts[hoveredIdx] : null;

  return (
    <div className="bg-slate-950 rounded-xl border border-slate-800 p-3.5 space-y-3 text-left w-full shadow-inner">
      {/* Top Header & Interactive Mode Selectors */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <TrendingUp className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              Real-time Risk Progression Curve
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" title="Live Telemetry 3 Hz Active" />
            </h4>
            <p className="text-[10px] text-slate-400 font-mono">
              Continuous empirical hazard density & swimmer vulnerability timeline
            </p>
          </div>
        </div>

        {/* View Mode & Sample Window Selectors */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* View Mode Pills */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10px] font-bold">
            <button
              onClick={() => setViewMode('spline')}
              className={`px-2 py-0.5 rounded cursor-pointer transition ${
                viewMode === 'spline' ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Smooth SVG continuous area curve"
            >
              Spline
            </button>
            <button
              onClick={() => setViewMode('bars')}
              className={`px-2 py-0.5 rounded cursor-pointer transition ${
                viewMode === 'bars' ? 'bg-indigo-500 text-white font-extrabold shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Vertical histogram risk density bars"
            >
              Bars
            </button>
            <button
              onClick={() => setViewMode('pillars')}
              className={`px-2 py-0.5 rounded cursor-pointer transition ${
                viewMode === 'pillars' ? 'bg-purple-500 text-white font-extrabold shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="4-Pillars Multi-Component Overlay"
            >
              4-Pillars
            </button>
          </div>

          {/* Sample Range Filter */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[9px] font-mono">
            <button
              onClick={() => setSampleWindow(30)}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition ${
                sampleWindow === 30 ? 'bg-slate-700 text-white font-bold' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              30s
            </button>
            <button
              onClick={() => setSampleWindow(60)}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition ${
                sampleWindow === 60 ? 'bg-slate-700 text-white font-bold' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              60s
            </button>
            <button
              onClick={() => setSampleWindow(0)}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition ${
                sampleWindow === 0 ? 'bg-slate-700 text-white font-bold' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              All ({sampleCount})
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
        <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <span className="text-[10px] text-slate-400">Current Risk:</span>
          <span className={`px-1.5 py-0.2 rounded font-bold text-[11px] border ${currentLevel.bg} ${currentLevel.text}`}>
            {currentScore}/100 ({currentLevel.name})
          </span>
        </div>
        <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <span className="text-[10px] text-slate-400">Peak in Window:</span>
          <span className="font-bold text-amber-300 text-[11px]">{peakScore}/100</span>
        </div>
        <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <span className="text-[10px] text-slate-400">Window Avg:</span>
          <span className="font-bold text-cyan-300 text-[11px]">{avgScore}/100</span>
        </div>
        <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <span className="text-[10px] text-slate-400">Trend:</span>
          <span className={`text-[11px] ${trendColor}`}>{trendText}</span>
        </div>
      </div>

      {/* 4-Pillars Legend if in Pillars view */}
      {viewMode === 'pillars' && (
        <div className="flex items-center gap-3 text-[10px] font-mono px-1 flex-wrap border-b border-slate-800 pb-1.5">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2.5 h-0.5 bg-emerald-400 inline-block" /> Overall Risk
          </span>
          <span className="flex items-center gap-1 text-cyan-400">
            <span className="w-2.5 h-0.5 bg-cyan-400 inline-block" /> 🌊 Hazard
          </span>
          <span className="flex items-center gap-1 text-amber-400">
            <span className="w-2.5 h-0.5 bg-amber-400 inline-block" /> 👥 Exposure
          </span>
          <span className="flex items-center gap-1 text-rose-400">
            <span className="w-2.5 h-0.5 bg-rose-400 inline-block" /> 🩹 Vulnerability
          </span>
        </div>
      )}

      {/* Main Graph Viewport */}
      {samples.length === 0 ? (
        <div className="h-40 flex flex-col items-center justify-center text-slate-500 font-mono text-xs gap-2 p-4 text-center border border-dashed border-slate-800 rounded-lg">
          <div className="w-6 h-6 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
          <p className="text-slate-300 font-semibold text-xs">Collecting Live Risk Progression Telemetry...</p>
          <p className="text-[10px] text-slate-500">
            Real-time simulation snapshots are recording at ~3 Hz. Telemetry points will appear shortly.
          </p>
        </div>
      ) : viewMode === 'bars' ? (
        /* Histogram Bars View (Protected with h-full and min-height) */
        <div className="relative">
          <div className="h-40 flex items-end gap-1 pt-4 px-2 border-b border-l border-slate-800 bg-slate-900/40 rounded-lg">
            {samples.map((entry, idx) => {
              const heightPct = Math.min(100, Math.max(6, entry.riskScore));
              const barColor =
                entry.riskScore >= 80
                  ? 'bg-red-500'
                  : entry.riskScore >= 60
                  ? 'bg-orange-500'
                  : entry.riskScore >= 40
                  ? 'bg-amber-400'
                  : 'bg-emerald-400';
              const isHovered = hoveredIdx === idx;
              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer"
                >
                  <div
                    className={`w-full ${barColor} rounded-t transition-all ${
                      isHovered ? 'brightness-125 ring-1 ring-white' : 'opacity-90 hover:opacity-100'
                    }`}
                    style={{ height: `${heightPct}%`, minHeight: '6px' }}
                  />
                  {/* Tooltip on bar */}
                  <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-900 border border-slate-700 text-[9px] font-mono text-white p-2 rounded-lg whitespace-nowrap z-40 shadow-xl pointer-events-none">
                    <div className="font-bold text-cyan-300">{entry.time}</div>
                    <div>Risk: <span className="font-bold text-white">{entry.riskScore}/100</span> ({entry.primaryCause})</div>
                    <div className="text-[8px] text-slate-400">Swimmers: {entry.activeSwimmers} | Distress: {entry.distressedCount}</div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Axis time stamps */}
          <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-1 px-1">
            <span>{samples[0]?.time}</span>
            <span>{samples[Math.floor(samples.length / 2)]?.time}</span>
            <span className="text-cyan-400 font-bold">{latest?.time}</span>
          </div>
        </div>
      ) : (
        /* Spline Curve & 4-Pillars View */
        <div className="relative overflow-visible w-full">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="w-full h-44 cursor-crosshair select-none"
          >
            <defs>
              {/* Area Gradient Fill */}
              <linearGradient id="riskAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={currentLevel.hex} stopOpacity="0.4" />
                <stop offset="50%" stopColor="#eab308" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.01" />
              </linearGradient>

              {/* Stroke Gradient */}
              <linearGradient id="riskLineGrad" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="40%" stopColor="#eab308" />
                <stop offset="70%" stopColor="#f97316" />
                <stop offset="90%" stopColor="#ef4444" />
              </linearGradient>
            </defs>

            {/* Threshold Reference Lines & Axis Labels */}
            {/* 80 Critical */}
            <line x1={padLeft} y1={getY(80)} x2={svgWidth - padRight} y2={getY(80)} stroke="#ef4444" strokeOpacity="0.3" strokeDasharray="3,3" strokeWidth="1" />
            <text x={padLeft - 4} y={getY(80) + 3} textAnchor="end" fill="#ef4444" fontSize="8" fontFamily="monospace">80</text>

            {/* 60 High */}
            <line x1={padLeft} y1={getY(60)} x2={svgWidth - padRight} y2={getY(60)} stroke="#f97316" strokeOpacity="0.25" strokeDasharray="3,3" strokeWidth="1" />
            <text x={padLeft - 4} y={getY(60) + 3} textAnchor="end" fill="#f97316" fontSize="8" fontFamily="monospace">60</text>

            {/* 40 Moderate */}
            <line x1={padLeft} y1={getY(40)} x2={svgWidth - padRight} y2={getY(40)} stroke="#eab308" strokeOpacity="0.2" strokeDasharray="3,3" strokeWidth="1" />
            <text x={padLeft - 4} y={getY(40) + 3} textAnchor="end" fill="#eab308" fontSize="8" fontFamily="monospace">40</text>

            {/* 20 Low */}
            <line x1={padLeft} y1={getY(20)} x2={svgWidth - padRight} y2={getY(20)} stroke="#10b981" strokeOpacity="0.15" strokeDasharray="3,3" strokeWidth="1" />
            <text x={padLeft - 4} y={getY(20) + 3} textAnchor="end" fill="#10b981" fontSize="8" fontFamily="monospace">20</text>

            {/* Baseline X Axis */}
            <line x1={padLeft} y1={baseY} x2={svgWidth - padRight} y2={baseY} stroke="#334155" strokeWidth="1.2" />

            {/* Area Gradient Fill under main curve */}
            {viewMode === 'spline' && riskAreaD && (
              <path d={riskAreaD} fill="url(#riskAreaGrad)" />
            )}

            {/* 4-Pillar Lines if selected */}
            {viewMode === 'pillars' && (
              <>
                <path d={hazardSplineD} fill="none" stroke="#06b6d4" strokeWidth="1.6" strokeOpacity="0.85" />
                <path d={exposureSplineD} fill="none" stroke="#a855f7" strokeWidth="1.6" strokeOpacity="0.85" />
                <path d={vulnSplineD} fill="none" stroke="#f43f5e" strokeWidth="1.6" strokeOpacity="0.85" />
              </>
            )}

            {/* Main Risk Spline Curve */}
            <path
              d={riskSplineD}
              fill="none"
              stroke="url(#riskLineGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Latest Sample Pulsing Ring & Dot */}
            {riskPts.length > 0 && (
              <g>
                <circle
                  cx={riskPts[riskPts.length - 1].x}
                  cy={riskPts[riskPts.length - 1].y}
                  r="6"
                  fill="none"
                  stroke={currentLevel.hex}
                  strokeWidth="1.5"
                  className="animate-ping"
                  opacity="0.75"
                />
                <circle
                  cx={riskPts[riskPts.length - 1].x}
                  cy={riskPts[riskPts.length - 1].y}
                  r="4"
                  fill={currentLevel.hex}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              </g>
            )}

            {/* Hover Crosshair & Data Indicator */}
            {activeHoverPoint && activeHoverSample && (
              <g>
                {/* Vertical Scrubber Line */}
                <line
                  x1={activeHoverPoint.x}
                  y1={padTop}
                  x2={activeHoverPoint.x}
                  y2={baseY}
                  stroke="#38bdf8"
                  strokeWidth="1.2"
                  strokeDasharray="2,2"
                />
                {/* Hover Dot */}
                <circle
                  cx={activeHoverPoint.x}
                  cy={activeHoverPoint.y}
                  r="5"
                  fill="#38bdf8"
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="shadow-lg"
                />
              </g>
            )}

            {/* Time Axis Labels */}
            <text x={padLeft} y={svgHeight - 6} fill="#64748b" fontSize="8" fontFamily="monospace">
              {samples[0]?.time}
            </text>
            {samples.length > 2 && (
              <text x={padLeft + plotWidth / 2} y={svgHeight - 6} textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">
                {samples[Math.floor(samples.length / 2)]?.time}
              </text>
            )}
            <text x={svgWidth - padRight} y={svgHeight - 6} textAnchor="end" fill="#38bdf8" fontSize="8" fontFamily="monospace" fontWeight="bold">
              {latest?.time}
            </text>
          </svg>

          {/* Floating Hover Tooltip Card */}
          {activeHoverSample && activeHoverPoint && (
            <div
              className="absolute top-2 pointer-events-none bg-slate-900/95 border border-cyan-500/50 backdrop-blur-md rounded-lg p-2 text-[10px] font-mono shadow-2xl z-40 space-y-1 transition-all"
              style={{
                left: `${Math.min(70, Math.max(10, (activeHoverPoint.x / svgWidth) * 100))}%`,
                transform: 'translateX(-50%)',
              }}
            >
              <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1">
                <span className="font-bold text-cyan-300">{activeHoverSample.time}</span>
                <span className={`px-1.5 py-0.2 rounded font-bold text-[9px] border ${getRiskColor(activeHoverSample.riskScore).bg} ${getRiskColor(activeHoverSample.riskScore).text}`}>
                  {activeHoverSample.riskScore}/100 ({getRiskColor(activeHoverSample.riskScore).name})
                </span>
              </div>
              <div className="text-slate-300">
                Primary Cause: <span className="text-amber-300 font-bold">{activeHoverSample.primaryCause}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px] text-slate-400">
                <div>🌊 Hazard: <span className="text-cyan-300 font-bold">{activeHoverSample.hazardScore}%</span></div>
                <div>👥 Density: <span className="text-amber-300 font-bold">{activeHoverSample.exposureScore}%</span></div>
                <div>🩹 Vuln: <span className="text-rose-300 font-bold">{activeHoverSample.vulnerabilityScore}%</span></div>
                <div>⏱️ Resp: <span className="text-emerald-300 font-bold">{activeHoverSample.responseScore}%</span></div>
              </div>
              <div className="text-[9px] text-slate-400 pt-0.5 border-t border-slate-800 flex justify-between">
                <span>Active Swimmers: {activeHoverSample.activeSwimmers}</span>
                <span className={activeHoverSample.distressedCount > 0 ? 'text-rose-400 font-bold animate-pulse' : 'text-slate-400'}>
                  Distress: {activeHoverSample.distressedCount}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

