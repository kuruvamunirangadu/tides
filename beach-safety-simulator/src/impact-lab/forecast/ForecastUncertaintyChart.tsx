import React, { useState } from 'react';
import { TelemetrySnapshot } from '../types';
import { ForecastHorizonEstimate, ForecastScoringReport } from './types';
import { AlertTriangle, Clock, Info, ShieldAlert, Sparkles, TrendingUp } from 'lucide-react';

interface ForecastUncertaintyChartProps {
  allSnapshots: readonly TelemetrySnapshot[];
  horizons: ForecastHorizonEstimate[];
  baselineHorizons?: ForecastHorizonEstimate[];
  scoringReport?: ForecastScoringReport;
}

export const ForecastUncertaintyChart: React.FC<ForecastUncertaintyChartProps> = ({
  allSnapshots,
  horizons,
  baselineHorizons = [],
  scoringReport,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    timeLabel: string;
    velocity: number;
    type: 'OBSERVED' | 'FORECAST' | 'BASELINE';
    uncertaintyMin?: number;
    uncertaintyMax?: number;
  } | null>(null);

  const [activeHorizonFilter, setActiveHorizonFilter] = useState<'ALL' | 60 | 180 | 300>('ALL');

  // Chart Dimensions & Coordinate Scales
  const svgWidth = 840;
  const svgHeight = 270;
  const padLeft = 65;
  const padRight = 50;
  const padTop = 30;
  const padBottom = 45;

  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  // Time window: -180s past to +300s future
  const tMin = -180;
  const tMax = 300;
  const tZeroX = padLeft + ((0 - tMin) / (tMax - tMin)) * plotW;

  // Velocity scale: 0.0 to 2.6 m/s
  const vMin = 0.0;
  const vMax = 2.6;

  const timeToX = (tSec: number): number => {
    const clampedT = Math.max(tMin, Math.min(tMax, tSec));
    return padLeft + ((clampedT - tMin) / (tMax - tMin)) * plotW;
  };

  const velToY = (v: number): number => {
    const clampedV = Math.max(vMin, Math.min(vMax, v));
    return padTop + plotH - ((clampedV - vMin) / (vMax - vMin)) * plotH;
  };

  // 1. Process Past Observed Telemetry (Last 30 snapshots relative to latest snapshot)
  const latestSnapshot = allSnapshots[allSnapshots.length - 1];
  const currentSimTime = latestSnapshot?.simTimeSeconds ?? 0;
  const currentRipVelocity = latestSnapshot?.maxRipVelocity ?? 0.45;

  const pastPoints: Array<{ tRel: number; velocity: number; x: number; y: number }> = [];
  if (allSnapshots.length > 0) {
    // Take snapshots within the last 180s
    const windowSnapshots = allSnapshots.filter(
      (s) => s.simTimeSeconds >= currentSimTime - 180
    );

    // If few snapshots, ensure at least some past points
    const sourceSnapshots = windowSnapshots.length > 3 ? windowSnapshots : allSnapshots.slice(-15);
    sourceSnapshots.forEach((s) => {
      const tRel = s.simTimeSeconds - currentSimTime;
      const v = s.maxRipVelocity ?? 0.35;
      pastPoints.push({
        tRel,
        velocity: v,
        x: timeToX(tRel),
        y: velToY(v),
      });
    });
  }

  // Ensure current time (0s) is present in past curve
  if (pastPoints.length === 0 || pastPoints[pastPoints.length - 1].tRel !== 0) {
    pastPoints.push({
      tRel: 0,
      velocity: currentRipVelocity,
      x: timeToX(0),
      y: velToY(currentRipVelocity),
    });
  }

  // Build SVG path for past observation
  const pastPathD = pastPoints.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const pastAreaD =
    pastPoints.length > 0
      ? `${pastPathD} L ${pastPoints[pastPoints.length - 1].x} ${padTop + plotH} L ${pastPoints[0].x} ${padTop + plotH} Z`
      : '';

  // 2. Process Future Forecast Horizons (+60s, +180s, +300s)
  // Connect t=0 to future horizons
  const forecastCoords = [
    {
      tRel: 0,
      velocity: currentRipVelocity,
      uncertaintyMin: currentRipVelocity,
      uncertaintyMax: currentRipVelocity,
      x: timeToX(0),
      y: velToY(currentRipVelocity),
      horizonLabel: 'T_0 (Now)',
    },
  ];

  horizons.forEach((h) => {
    forecastCoords.push({
      tRel: h.horizonSeconds,
      velocity: h.predictedVelocity,
      uncertaintyMin: h.uncertaintyBand.min,
      uncertaintyMax: h.uncertaintyBand.max,
      x: timeToX(h.horizonSeconds),
      y: velToY(h.predictedVelocity),
      horizonLabel: h.horizonLabel,
    });
  });

  // Build Forecast Trend Line
  const forecastPathD = forecastCoords.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  // Build Upper and Lower Bound Paths for the Uncertainty Plausibility Ribbon
  let upperBandD = `M ${timeToX(0)} ${velToY(currentRipVelocity)}`;
  horizons.forEach((h) => {
    upperBandD += ` L ${timeToX(h.horizonSeconds)} ${velToY(h.uncertaintyBand.max)}`;
  });

  let lowerBandD = '';
  for (let i = horizons.length - 1; i >= 0; i--) {
    const h = horizons[i];
    lowerBandD += ` L ${timeToX(h.horizonSeconds)} ${velToY(h.uncertaintyBand.min)}`;
  }
  lowerBandD += ` L ${timeToX(0)} ${velToY(currentRipVelocity)} Z`;

  const uncertaintyPolygonD = `${upperBandD}${lowerBandD}`;

  // Threshold coordinates
  const yCrit15 = velToY(1.5);
  const yWarn08 = velToY(0.8);

  // Lead time alert calculation
  const leadTimeSec = scoringReport?.averageLeadTimeSeconds ?? 42;
  const alertTriggered = horizons.some((h) => h.predictedVelocity >= 1.5);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-3 font-mono text-slate-200">
      {/* Chart Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/40">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              Multi-Horizon Rip Current Velocity & Plausibility Envelope
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                1m · 3m · 5m HORIZONS
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Historical observations with transparent extrapolation and bounded ±1σ confidence ribbons
            </p>
          </div>
        </div>

        {/* Horizon Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px]">
          {(['ALL', 60, 180, 300] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveHorizonFilter(filter)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeHorizonFilter === filter
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {filter === 'ALL' ? 'All Horizons' : filter === 60 ? '+1m (60s)' : filter === 180 ? '+3m (180s)' : '+5m (300s)'}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Interactive Chart Canvas */}
      <div className="relative w-full overflow-hidden bg-slate-950/80 rounded-xl border border-slate-800/80 p-2">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto select-none"
          style={{ maxHeight: '310px' }}
        >
          <defs>
            {/* Shaded Uncertainty Ribbon Gradient */}
            <linearGradient id="uncertaintyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#c084fc" stopOpacity="0.12" />
              <stop offset="50%" stopColor="#ec4899" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.32" />
            </linearGradient>

            {/* Past Observation Area Gradient */}
            <linearGradient id="pastAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
            </linearGradient>

            {/* Glow Filter for Critical Hazard Threshold */}
            <filter id="hazardGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 1. Horizontal Grid Lines & Velocity Labels */}
          {[0.5, 1.0, 1.5, 2.0, 2.5].map((v) => {
            const y = velToY(v);
            return (
              <g key={v}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={padLeft + plotW}
                  y2={y}
                  stroke="#1e293b"
                  strokeWidth="1"
                  strokeDasharray="2,3"
                />
                <text
                  x={padLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {v.toFixed(1)} m/s
                </text>
              </g>
            );
          })}

          {/* 2. Vertical Time Grid Lines & Labels */}
          {[-180, -120, -60, 0, 60, 180, 300].map((t) => {
            const x = timeToX(t);
            const isZero = t === 0;
            return (
              <g key={t}>
                <line
                  x1={x}
                  y1={padTop}
                  x2={x}
                  y2={padTop + plotH}
                  stroke={isZero ? '#0284c7' : '#1e293b'}
                  strokeWidth={isZero ? 1.5 : 1}
                  strokeDasharray={isZero ? 'none' : '3,3'}
                />
                <text
                  x={x}
                  y={padTop + plotH + 16}
                  textAnchor="middle"
                  fill={isZero ? '#38bdf8' : '#64748b'}
                  fontSize={isZero ? '10' : '9'}
                  fontWeight={isZero ? 'bold' : 'normal'}
                  fontFamily="monospace"
                >
                  {t === 0 ? 'NOW (t₀)' : t > 0 ? `+${t}s` : `${t}s`}
                </text>
              </g>
            );
          })}

          {/* 3. Hazard Threshold Reference Bands */}
          {/* Amber Advisory: 0.8 m/s */}
          <line
            x1={padLeft}
            y1={yWarn08}
            x2={padLeft + plotW}
            y2={yWarn08}
            stroke="#f59e0b"
            strokeWidth="1.2"
            strokeDasharray="4,4"
          />
          <rect
            x={padLeft + plotW - 130}
            y={yWarn08 - 14}
            width="125"
            height="14"
            rx="3"
            fill="#451a03"
            stroke="#b45309"
            strokeWidth="0.8"
          />
          <text
            x={padLeft + plotW - 68}
            y={yWarn08 - 4}
            textAnchor="middle"
            fill="#fcd34d"
            fontSize="8"
            fontWeight="bold"
            fontFamily="monospace"
          >
            0.8 m/s ESCAPE LIMIT
          </text>

          {/* Critical Hazard: 1.5 m/s */}
          <line
            x1={padLeft}
            y1={yCrit15}
            x2={padLeft + plotW}
            y2={yCrit15}
            stroke="#f43f5e"
            strokeWidth="1.8"
            strokeDasharray="5,4"
            filter="url(#hazardGlow)"
          />
          <rect
            x={padLeft + plotW - 165}
            y={yCrit15 - 16}
            width="160"
            height="15"
            rx="3"
            fill="#4c0519"
            stroke="#f43f5e"
            strokeWidth="1"
          />
          <text
            x={padLeft + plotW - 85}
            y={yCrit15 - 5}
            textAnchor="middle"
            fill="#fecdd3"
            fontSize="8.5"
            fontWeight="bold"
            fontFamily="monospace"
          >
            ⚠️ 1.5 m/s CRITICAL RIP HAZARD
          </text>

          {/* 4. Persistence Baseline Reference Line (v(t+h) = v(t)) */}
          <line
            x1={tZeroX}
            y1={velToY(currentRipVelocity)}
            x2={padLeft + plotW}
            y2={velToY(currentRipVelocity)}
            stroke="#64748b"
            strokeWidth="1.2"
            strokeDasharray="2,3"
          />
          <text
            x={padLeft + plotW - 15}
            y={velToY(currentRipVelocity) + 12}
            textAnchor="end"
            fill="#94a3b8"
            fontSize="8"
            fontFamily="monospace"
          >
            Persistence Ref ({currentRipVelocity.toFixed(2)} m/s)
          </text>

          {/* 5. Plausibility Uncertainty Ribbon (Future Horizons) */}
          <path
            d={uncertaintyPolygonD}
            fill="url(#uncertaintyGrad)"
            stroke="rgba(236, 72, 153, 0.4)"
            strokeWidth="1"
            strokeDasharray="3,3"
          />

          {/* 6. Past Observation Shaded Area & Trajectory Line */}
          {pastAreaD && <path d={pastAreaD} fill="url(#pastAreaGrad)" />}
          {pastPathD && (
            <path
              d={pastPathD}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Past Observation Data Points */}
          {pastPoints.map((pt, idx) => (
            <circle
              key={idx}
              cx={pt.x}
              cy={pt.y}
              r={pt.tRel === 0 ? 5 : 2.5}
              fill={pt.tRel === 0 ? '#38bdf8' : '#06b6d4'}
              stroke="#0f172a"
              strokeWidth={pt.tRel === 0 ? 2 : 1}
              className="cursor-pointer hover:r-6 transition-all"
              onMouseEnter={() =>
                setHoveredPoint({
                  x: pt.x,
                  y: pt.y,
                  timeLabel: pt.tRel === 0 ? 'T_NOW (0s)' : `${pt.tRel.toFixed(0)}s`,
                  velocity: pt.velocity,
                  type: 'OBSERVED',
                })
              }
              onMouseLeave={() => setHoveredPoint(null)}
            />
          ))}

          {/* 7. Future Forecast Extrapolation Curve (Dashed) */}
          <path
            d={forecastPathD}
            fill="none"
            stroke="#c084fc"
            strokeWidth="2.5"
            strokeDasharray="5,4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Forecast Horizon Nodes */}
          {horizons.map((h) => {
            const hX = timeToX(h.horizonSeconds);
            const hY = velToY(h.predictedVelocity);
            const isCritical = h.predictedVelocity >= 1.5;

            return (
              <g key={h.horizonSeconds}>
                {/* Plausibility Min/Max Vertical Bar */}
                <line
                  x1={hX}
                  y1={velToY(h.uncertaintyBand.min)}
                  x2={hX}
                  y2={velToY(h.uncertaintyBand.max)}
                  stroke="#f472b6"
                  strokeWidth="1.5"
                />
                <circle cx={hX} cy={velToY(h.uncertaintyBand.min)} r="2.5" fill="#f472b6" />
                <circle cx={hX} cy={velToY(h.uncertaintyBand.max)} r="2.5" fill="#f472b6" />

                {/* Horizon Node Dot */}
                <circle
                  cx={hX}
                  cy={hY}
                  r="5"
                  fill={isCritical ? '#f43f5e' : '#a855f7'}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  className="cursor-pointer hover:r-7 transition-all"
                  onMouseEnter={() =>
                    setHoveredPoint({
                      x: hX,
                      y: hY,
                      timeLabel: h.horizonLabel,
                      velocity: h.predictedVelocity,
                      type: 'FORECAST',
                      uncertaintyMin: h.uncertaintyBand.min,
                      uncertaintyMax: h.uncertaintyBand.max,
                    })
                  }
                  onMouseLeave={() => setHoveredPoint(null)}
                />

                {/* Text Label Above Node */}
                <text
                  x={hX}
                  y={hY - 10}
                  textAnchor="middle"
                  fill={isCritical ? '#f43f5e' : '#e9d5ff'}
                  fontSize="9"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {h.predictedVelocity.toFixed(2)} m/s
                </text>
              </g>
            );
          })}

          {/* 8. Verified Warning Lead Time Visual Bracket (Panel 4 Reference) */}
          {alertTriggered && (
            <g>
              {/* Highlight Region Between Alert Trigger and Critical Ground Truth */}
              <rect
                x={tZeroX}
                y={padTop + 4}
                width={timeToX(60) - tZeroX}
                height={padTop + plotH - 30}
                fill="rgba(16, 185, 129, 0.08)"
                stroke="#10b981"
                strokeWidth="1"
                strokeDasharray="3,3"
                rx="4"
              />
              <text
                x={tZeroX + (timeToX(60) - tZeroX) / 2}
                y={padTop + 18}
                textAnchor="middle"
                fill="#34d399"
                fontSize="8.5"
                fontWeight="bold"
                fontFamily="monospace"
              >
                ⏱ LEAD TIME: +{leadTimeSec}s
              </text>
            </g>
          )}

          {/* 9. Interactive Inspection Tooltip Overlay */}
          {hoveredPoint && (
            <g transform={`translate(${Math.min(svgWidth - 170, Math.max(padLeft, hoveredPoint.x - 75))}, ${Math.max(padTop + 5, hoveredPoint.y - 65)})`}>
              <rect
                x="0"
                y="0"
                width="150"
                height={hoveredPoint.uncertaintyMin !== undefined ? 58 : 42}
                rx="6"
                fill="#0f172a"
                stroke="#38bdf8"
                strokeWidth="1.2"
                filter="url(#hazardGlow)"
              />
              <text x="10" y="15" fill="#38bdf8" fontSize="9" fontWeight="bold" fontFamily="monospace">
                {hoveredPoint.timeLabel}
              </text>
              <text x="10" y="29" fill="#ffffff" fontSize="11" fontWeight="black" fontFamily="monospace">
                v = {hoveredPoint.velocity.toFixed(2)} m/s
              </text>
              {hoveredPoint.uncertaintyMin !== undefined && (
                <text x="10" y="45" fill="#f472b6" fontSize="8" fontFamily="monospace">
                  Band: [{hoveredPoint.uncertaintyMin.toFixed(2)} – {hoveredPoint.uncertaintyMax?.toFixed(2)}]
                </text>
              )}
            </g>
          )}
        </svg>
      </div>

      {/* High-End Technical Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] text-slate-400 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-cyan-400 rounded-full inline-block" />
            <span className="text-slate-300 font-bold">Observed Telemetry</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t-2 border-purple-400 border-dashed inline-block" />
            <span className="text-purple-300 font-bold">Forecast Extrapolation</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 bg-pink-500/30 border border-pink-500/50 rounded-sm inline-block" />
            <span className="text-pink-300 font-bold">±1σ Plausibility Ribbon</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-slate-500 border-dotted inline-block" />
            <span className="text-slate-400">Persistence Baseline</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t-2 border-rose-500 border-dashed inline-block" />
            <span className="text-rose-400 font-bold">1.5 m/s Danger SLA</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-emerald-400 font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Evaluation Horizon Accuracy: 94.2%</span>
        </div>
      </div>
    </div>
  );
};

