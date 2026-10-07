import React from 'react';
import { HazardSample } from '../metrics/Types';
import { Activity, Waves, Wind } from 'lucide-react';

interface HazardHistoryChartProps {
  samples: HazardSample[];
}

export const HazardHistoryChart: React.FC<HazardHistoryChartProps> = ({ samples }) => {
  if (samples.length < 2) {
    return (
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-400 text-left">
        Collecting hazard telemetry samples...
      </div>
    );
  }

  const width = 450;
  const height = 140;
  const padding = 25;

  const maxWave = Math.max(...samples.map((s) => s.waveHeight), 3.0);
  const maxCurrent = Math.max(...samples.map((s) => s.waterCurrent), 2.0);

  const getWaveY = (val: number) => height - padding - (val / maxWave) * (height - 2 * padding);
  const getCurrentY = (val: number) => height - padding - (val / maxCurrent) * (height - 2 * padding);
  const getX = (idx: number) => padding + (idx / (samples.length - 1)) * (width - 2 * padding);

  const wavePoints = samples.map((s, idx) => `${getX(idx)},${getWaveY(s.waveHeight)}`).join(' ');
  const currentPoints = samples.map((s, idx) => `${getX(idx)},${getCurrentY(s.waterCurrent)}`).join(' ');

  const lastSample = samples[samples.length - 1];

  return (
    <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 text-left">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Waves className="w-4 h-4 text-sky-400" />
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Hazard Evolution Over Time
          </h4>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <span className="flex items-center gap-1 text-sky-300">
            <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />
            Waves: {lastSample.waveHeight}m
          </span>
          <span className="flex items-center gap-1 text-indigo-300">
            <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />
            Current: {lastSample.waterCurrent} m/s
          </span>
          <span className="flex items-center gap-1 text-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            Rip Prob: {Math.round(lastSample.ripProbability * 100)}%
          </span>
        </div>
      </div>

      <div className="relative overflow-hidden w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-36">
          {/* Background Grid Lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#334155" strokeDasharray="2,2" strokeWidth="0.8" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#334155" strokeDasharray="2,2" strokeWidth="0.8" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#475569" strokeWidth="1" />

          {/* Wave Height Polyline (Sky Blue) */}
          <polyline fill="none" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" points={wavePoints} />

          {/* Current Speed Polyline (Indigo) */}
          <polyline fill="none" stroke="#818cf8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" points={currentPoints} />

          {/* Start & End Time Labels */}
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
