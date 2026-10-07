import React, { useState } from 'react';
import { CacheStats } from '../cache/CacheStats';
import {
  Cpu,
  Zap,
  Activity,
  Layers,
  Trash2,
  Play,
  RotateCcw,
  CheckCircle2,
  BarChart3,
  Flame,
  ShieldCheck,
  TrendingUp,
  X,
  Clock,
  HardDrive,
} from 'lucide-react';

interface PerformanceMonitorProps {
  cacheStats?: CacheStats;
  performanceMetrics?: {
    fps: number;
    simTps: number;
    tickDurationMs: number;
    riskCalcDurationMs: number;
    renderDurationMs: number;
    cacheHitRate: number;
    savedCalculations: number;
    savedComputeTimeMs: number;
    activeCacheEntries: number;
  };
  totalVisitors: number;
  onClearCache: () => void;
  onRunBenchmark: (count: number) => any;
}

interface BenchmarkResult {
  population: number;
  fps: number;
  avgTickMs: number;
  riskCalcMs: number;
  cacheHitRate: number;
  savedCalculations: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D';
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  cacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    hitRate: 0,
    entryCount: 0,
    savedCalculations: 0,
    savedComputeTimeMs: 0,
    spatialHits: 0,
    riskHits: 0,
    hazardHits: 0,
    snapshotHits: 0,
  },
  performanceMetrics = {
    fps: 60,
    simTps: 60,
    tickDurationMs: 0.5,
    riskCalcDurationMs: 0.2,
    renderDurationMs: 0.5,
    cacheHitRate: 0,
    savedCalculations: 0,
    savedComputeTimeMs: 0,
    activeCacheEntries: 0,
  },
  totalVisitors,
  onClearCache,
  onRunBenchmark,
}) => {
  const [benchmarking, setBenchmarking] = useState<boolean>(false);
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkResult[]>([]);
  const [selectedPopTier, setSelectedPopTier] = useState<number>(250);

  const handleRunFullBenchmarkSuite = () => {
    setBenchmarking(true);
    const tiers = [50, 100, 250, 500, 1000, 2500];
    const results: BenchmarkResult[] = [];

    let delay = 0;
    tiers.forEach((count, idx) => {
      setTimeout(() => {
        const res = onRunBenchmark(count);
        if (res) {
          results.push(res);
          setBenchmarkResults([...results]);
        }
        if (idx === tiers.length - 1) {
          setBenchmarking(false);
        }
      }, delay);
      delay += 800;
    });
  };

  const handleRunSingleTier = (pop: number) => {
    setBenchmarking(true);
    setTimeout(() => {
      const res = onRunBenchmark(pop);
      if (res) {
        setBenchmarkResults((prev) => [res, ...prev.filter((r) => r.population !== pop)]);
      }
      setBenchmarking(false);
    }, 100);
  };

  const getGradeBadge = (grade: string) => {
    switch (grade) {
      case 'A+':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50';
      case 'A':
        return 'bg-teal-500/20 text-teal-300 border-teal-500/50';
      case 'B':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50';
      case 'C':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/50';
      case 'D':
      default:
        return 'bg-rose-500/20 text-rose-300 border-rose-500/50';
    }
  };

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl space-y-4 text-left">
      {/* 1. Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl text-slate-950 shadow-lg shadow-cyan-500/20 shrink-0 font-black">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black tracking-tight text-white uppercase">
                Temporary Simulation Cache & Performance Monitor
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-500/40 font-bold">
                RAM CACHE ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Version-invalidated memory cache eliminating redundant calculations & rendering transfer latency
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClearCache}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear In-Memory Cache
          </button>
        </div>
      </div>

      {/* 2. Top Metric Gauges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
            <Activity className="w-3 h-3 text-cyan-400" /> Frame Rate
          </span>
          <div className="text-lg sm:text-xl font-mono font-black text-cyan-300">
            {performanceMetrics.fps} <span className="text-xs font-normal text-slate-500">FPS</span>
          </div>
          <span className="text-[9px] text-slate-500 block">Canvas refresh cycle</span>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
            <Zap className="w-3 h-3 text-emerald-400" /> Cache Hit Rate
          </span>
          <div className="text-lg sm:text-xl font-mono font-black text-emerald-300">
            {cacheStats.hitRate.toFixed(1)}%
          </div>
          <span className="text-[9px] text-slate-500 block">{cacheStats.hits} hits / {cacheStats.misses} misses</span>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
            <Clock className="w-3 h-3 text-purple-400" /> Tick Duration
          </span>
          <div className="text-lg sm:text-xl font-mono font-black text-purple-300">
            {performanceMetrics.tickDurationMs.toFixed(2)} <span className="text-xs font-normal text-slate-500">ms</span>
          </div>
          <span className="text-[9px] text-slate-500 block">Physics loop execution</span>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-amber-400" /> Risk Calc Time
          </span>
          <div className="text-lg sm:text-xl font-mono font-black text-amber-300">
            {performanceMetrics.riskCalcDurationMs.toFixed(2)} <span className="text-xs font-normal text-slate-500">ms</span>
          </div>
          <span className="text-[9px] text-slate-500 block">4-pillar assessment</span>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
            <Layers className="w-3 h-3 text-blue-400" /> Saved Calcs
          </span>
          <div className="text-lg sm:text-xl font-mono font-black text-blue-300">
            {cacheStats.savedCalculations}
          </div>
          <span className="text-[9px] text-slate-500 block">~{cacheStats.savedComputeTimeMs.toFixed(0)}ms compute saved</span>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
            <HardDrive className="w-3 h-3 text-teal-400" /> Active Entries
          </span>
          <div className="text-lg sm:text-xl font-mono font-black text-teal-300">
            {cacheStats.entryCount} <span className="text-xs font-normal text-slate-500">keys</span>
          </div>
          <span className="text-[9px] text-slate-500 block">Auto LRU eviction</span>
        </div>
      </div>

      {/* 3. Cache Hits Breakdown by Subsystem */}
      <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            Subsystem Cache Hits & Version-Based Invalidation
          </span>
          <span className="font-mono text-xs text-slate-400">
            Target Capacity: <strong className="text-cyan-300">3,500 Map Entries</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
            <div className="text-slate-400 text-[10px]">Hazard Cache Hits</div>
            <div className="text-base font-mono font-bold text-amber-300">{cacheStats.hazardHits}</div>
            <div className="text-[10px] text-slate-500">Key: env_version + visitor_pop</div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
            <div className="text-slate-400 text-[10px]">Risk Engine Cache Hits</div>
            <div className="text-base font-mono font-bold text-emerald-300">{cacheStats.riskHits}</div>
            <div className="text-[10px] text-slate-500">Key: env_v + hazard_v + exp_v</div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
            <div className="text-slate-400 text-[10px]">Render Snapshot Hits</div>
            <div className="text-base font-mono font-bold text-cyan-300">{cacheStats.snapshotHits}</div>
            <div className="text-[10px] text-slate-500">Key: snapshot_version (stripped)</div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
            <div className="text-slate-400 text-[10px]">Spatial Grid Hits</div>
            <div className="text-base font-mono font-bold text-purple-300">{cacheStats.spatialHits}</div>
            <div className="text-[10px] text-slate-500">Key: grid_x_y + spatial_v</div>
          </div>
        </div>
      </div>

      {/* 4. Automated Stress Testing & Population Benchmarking Suite */}
      <div className="bg-slate-950/70 p-3 sm:p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
          <div>
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-400" />
              Crowd Scalability & Cache Stress Testing (50 → 5,000 Visitors)
            </span>
            <p className="text-[11px] text-slate-400">
              Evaluates execution speed and memory efficiency under massive crowd density
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunFullBenchmarkSuite}
              disabled={benchmarking}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-slate-950 text-xs font-bold transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {benchmarking ? 'Benchmarking...' : 'Run Full Benchmark Suite'}
            </button>
          </div>
        </div>

        {/* Quick Tier Selectors */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400 text-[11px] mr-1">Quick Tier Test:</span>
          {[50, 100, 250, 500, 1000, 2500, 5000].map((pop) => (
            <button
              key={pop}
              onClick={() => handleRunSingleTier(pop)}
              disabled={benchmarking}
              className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                totalVisitors === pop
                  ? 'bg-cyan-500 text-slate-950 shadow'
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {pop} Bathers
            </button>
          ))}
        </div>

        {/* Benchmark Results Table */}
        {benchmarkResults.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Recorded Benchmark Evidence
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left font-mono">
                <thead className="bg-slate-900/80 text-slate-400 text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-2">Population</th>
                    <th className="p-2">Estimated FPS</th>
                    <th className="p-2">Avg Tick (ms)</th>
                    <th className="p-2">Risk Calc (ms)</th>
                    <th className="p-2">Cache Hit Rate</th>
                    <th className="p-2">Saved Operations</th>
                    <th className="p-2 text-right">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {benchmarkResults.map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/40">
                      <td className="p-2 font-bold text-white flex items-center gap-1">
                        <UsersIcon className="w-3.5 h-3.5 text-purple-400" />
                        {r.population} Visitors
                      </td>
                      <td className="p-2 font-bold text-cyan-300">{r.fps} FPS</td>
                      <td className="p-2 text-slate-300">{r.avgTickMs} ms</td>
                      <td className="p-2 text-amber-300">{r.riskCalcMs} ms</td>
                      <td className="p-2 text-emerald-300 font-bold">{r.cacheHitRate.toFixed(1)}%</td>
                      <td className="p-2 text-slate-400">{r.savedCalculations}</td>
                      <td className="p-2 text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getGradeBadge(r.grade)}`}>
                          Grade {r.grade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const UsersIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
