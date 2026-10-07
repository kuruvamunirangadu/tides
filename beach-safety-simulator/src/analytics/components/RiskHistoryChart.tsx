import React from 'react';
import { RiskSample } from '../metrics/Types';
import { ShieldAlert, TrendingUp } from 'lucide-react';

interface RiskHistoryChartProps {
  samples: RiskSample[];
}

export const RiskHistoryChart: React.FC<RiskHistoryChartProps> = ({ samples }) => {
  if (samples.length < 2) {
    return (
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-400 text-left">
        Collecting risk assessment time series...
      </div>
    );
  }

  const width = 450;
  const height = 140;
  const padding = 25;

  const getScoreY = (score: number) => height - padding - (score / 100) * (height - 2 * padding);
  const getX = (idx: number) => padding + (idx / (samples.length - 1)) * (width - 2 * padding);

  const riskPoints = samples.map((s, idx) => `${getX(idx)},${getScoreY(s.overallScore)}`).join(' ');
  const lastSample = samples[samples.length - 1];

  const getRiskColor = (score: number) => {
    if (score >= 80) return '#f43f5e'; // Rose / Critical
    if (score >= 60) return '#f59e0b'; // Amber / High
    if (score >= 40) return '#eab308'; // Yellow / Moderate
    return '#10b981'; // Emerald / Low
  };

  return (
    <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 text-left">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-rose-400" />
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Beach Risk Score Progression (0 - 100)
          </h4>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span
            className="px-2 py-0.5 rounded font-bold"
            style={{
              backgroundColor: `${getRiskColor(lastSample.overallScore)}20`,
              color: getRiskColor(lastSample.overallScore),
              border: `1px solid ${getRiskColor(lastSample.overallScore)}40`,
            }}
          >
            {lastSample.overallCategory}: {lastSample.overallScore}/100
          </span>
        </div>
      </div>

      <div className="relative overflow-hidden w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-36">
          {/* Threshold Lines */}
          <line x1={padding} y1={getScoreY(80)} x2={width - padding} y2={getScoreY(80)} stroke="#f43f5e33" strokeDasharray="3,3" strokeWidth="1" />
          <text x={width - padding - 45} y={getScoreY(80) - 3} fill="#f43f5e88" fontSize="8" fontFamily="monospace">
            CRITICAL (80)
          </text>

          <line x1={padding} y1={getScoreY(60)} x2={width - padding} y2={getScoreY(60)} stroke="#f59e0b33" strokeDasharray="3,3" strokeWidth="1" />
          <text x={width - padding - 35} y={getScoreY(60) - 3} fill="#f59e0b88" fontSize="8" fontFamily="monospace">
            HIGH (60)
          </text>

          {/* Risk Polyline */}
          <polyline
            fill="none"
            stroke={getRiskColor(lastSample.overallScore)}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={riskPoints}
          />

          {/* Time Labels */}
          <text x={padding} y={height - 8} fill="#64748b" fontSize="9" fontFamily="monospace">
            {samples[0].timeDisplay}
          </text>
          <text x={width - padding - 35} y={height - 8} fill="#64748b" fontSize="9" fontFamily="monospace">
            {lastSample.timeDisplay}
          </text>
        </svg>
      </div>
    </div>
  );
};
