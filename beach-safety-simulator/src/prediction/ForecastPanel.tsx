import React, { useState, useEffect } from 'react';
import { ForecastEngine } from './ForecastEngine';
import { ForecastEvaluator } from './ForecastEvaluator';
import { ExposureForecast } from './ExposureForecast';
import { RescueReadinessAnalyzer } from './RescueReadinessAnalyzer';
import { RescueCoordinator } from '../scene3d/rescue/RescueCoordinator';
import { Visitor } from '../models/Visitor';
import { Beach } from '../models/Beach';
import { Environment } from '../models/Environment';
import {
  ForecastMethodId,
  PredictionRecord,
  EvaluationMetricsSummary,
} from './ForecastTypes';
import {
  TrendingUp,
  Clock,
  ShieldAlert,
  AlertTriangle,
  Activity,
  Layers,
  CheckCircle2,
  Users,
  Ship,
  Eye,
  Sliders,
  ChevronRight,
  HelpCircle,
  X,
} from 'lucide-react';

interface ForecastPanelProps {
  beach: Beach;
  environment: Environment;
  visitors: Visitor[];
  onToggleVisual3D?: (show: boolean) => void;
  className?: string;
}

export const ForecastPanel: React.FC<ForecastPanelProps> = ({
  beach,
  environment,
  visitors,
  onToggleVisual3D,
  className = '',
}) => {
  const engine = ForecastEngine.getInstance();
  const evaluator = ForecastEvaluator.getInstance();
  const coordinator = RescueCoordinator.getInstance();

  const [method, setMethod] = useState<ForecastMethodId>('TREND_BASELINE');
  const [selectedHorizon, setSelectedHorizon] = useState<number>(3); // 3 minutes default
  const [show3DOverlay, setShow3DOverlay] = useState<boolean>(true);
  const [nowSec, setNowSec] = useState<number>(performance.now() / 1000);

  // Ingest current observation into ForecastEngine every 2 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      const t = performance.now() / 1000;
      setNowSec(t);

      const ripVel = environment.waterCurrent ?? 1.9;
      const waveHt = environment.waveHeight ?? 1.2;

      engine.recordObservation({
        timestamp: t,
        ripVelocity: ripVel,
        waveHeight: waveHt,
        zoneId: 'SZ-02',
      });
    }, 2000);

    return () => clearInterval(timer);
  }, [environment]);

  const predictions = engine.generateForecast(method, nowSec);
  const activePred =
    predictions.find((p) => p.horizonMinutes === selectedHorizon) || predictions[1] || predictions[0];

  const exposure = ExposureForecast.evaluateExposure(visitors, beach, activePred, selectedHorizon);
  const readiness = RescueReadinessAnalyzer.analyzeReadiness(coordinator, activePred);
  const evalSummary: EvaluationMetricsSummary = evaluator.getSummary();

  const handleToggleOverlay = () => {
    const next = !show3DOverlay;
    setShow3DOverlay(next);
    onToggleVisual3D?.(next);
  };

  return (
    <div className={`bg-slate-900/95 border border-slate-700/80 rounded-2xl p-4 shadow-2xl backdrop-blur-xl font-mono text-xs text-left select-none space-y-3.5 ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-amber-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              <span>Milestone 6</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300">Predictive Intelligence</span>
            </div>
            <h3 className="text-white font-bold text-xs">Coastal Hazard & Exposure Forecaster</h3>
          </div>
        </div>

        {/* Method Switcher */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          {(
            [
              { id: 'TREND_BASELINE', label: 'Trend' },
              { id: 'MOVING_AVERAGE', label: 'Moving Avg' },
              { id: 'PERSISTENCE_BASELINE', label: 'Persistence' },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                method === m.id
                  ? 'bg-amber-500 text-slate-950 font-extrabold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Horizon Selector & 3D Layer Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-400 mr-1">Horizon:</span>
          {[1, 3, 5].map((h) => (
            <button
              key={h}
              onClick={() => setSelectedHorizon(h)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                selectedHorizon === h
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-extrabold'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              +{h} min
            </button>
          ))}
        </div>

        <button
          onClick={handleToggleOverlay}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
            show3DOverlay
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}
        >
          <Eye className="w-3 h-3" />
          <span>3D Forecast Overlay</span>
        </button>
      </div>

      {/* Main Forecast Card: Observed vs Forecast */}
      {activePred ? (
        <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-400">Target Time: +{activePred.horizonMinutes}m ({activePred.targetTimestamp.toFixed(0)}s)</span>
            <span
              className={`px-1.5 py-0.5 rounded font-bold text-[9px] ${
                activePred.status === 'VALID'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              {activePred.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            {/* Current Observation */}
            <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[9px] text-slate-400 block font-bold">CURRENT OBSERVED</span>
              <div className="text-lg font-black text-cyan-300">
                {activePred.observedValue.toFixed(2)} {activePred.units}
              </div>
              <span className="text-[9px] text-slate-500">Live Ocean Current</span>
            </div>

            {/* Predicted Horizon */}
            <div className="bg-slate-900/90 p-2.5 rounded-lg border border-amber-500/40">
              <span className="text-[9px] text-amber-400 block font-bold">
                FORECAST (+{activePred.horizonMinutes}M)
              </span>
              <div className="text-lg font-black text-amber-300">
                {activePred.predictedValue.toFixed(2)} {activePred.units}
              </div>
              <span className="text-[9px] text-slate-400">
                Uncertainty: [{activePred.uncertaintyBand.min}, {activePred.uncertaintyBand.max}]
              </span>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 italic">
            Limitations: {activePred.limitations}
          </p>
        </div>
      ) : (
        <div className="p-4 bg-slate-950/40 rounded-xl text-center text-slate-500">
          Awaiting observation stream...
        </div>
      )}

      {/* Future Visitor Exposure Card */}
      <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1.5">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-white font-bold flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>Visitor Exposure Projection</span>
          </span>
          <span className="text-slate-400">+{exposure.horizonMinutes}m Horizon</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center pt-0.5">
          <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
            <div className="text-[9px] text-slate-400">CURRENTLY EXPOSED</div>
            <strong className="text-cyan-300 text-sm">{exposure.currentlyExposedVisitorsCount}</strong>
          </div>

          <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
            <div className="text-[9px] text-slate-400">PREDICTED EXPOSED</div>
            <strong className="text-amber-300 text-sm">{exposure.predictedExposedVisitorsCount}</strong>
          </div>
        </div>

        <p className="text-[9px] text-slate-400 leading-tight pt-1">
          {exposure.assumptions}
        </p>
      </div>

      {/* Advisory Rescue Readiness Card */}
      <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1.5">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-white font-bold flex items-center gap-1.5">
            <Ship className="w-3.5 h-3.5 text-amber-400" />
            <span>Advisory Rescue Readiness</span>
          </span>
          <span className="text-emerald-400 font-bold">{readiness.readinessScore}% READINESS</span>
        </div>

        <div className="space-y-1 pt-0.5">
          {readiness.recommendations.map((rec) => (
            <div
              key={rec.id}
              className={`p-2 rounded-lg border text-[10px] space-y-0.5 ${
                rec.severity === 'CRITICAL'
                  ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                  : rec.severity === 'WARNING'
                  ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                  : 'bg-slate-900 border-slate-800 text-slate-300'
              }`}
            >
              <div className="font-bold flex items-center gap-1">
                <span>{rec.title}</span>
              </div>
              <p className="text-[9px] text-slate-400">{rec.description}</p>
              <div className="text-[9px] text-cyan-300 font-bold pt-0.5">
                Action: {rec.recommendedAction}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ground-Truth Evaluation Scorecard */}
      <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1.5">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-slate-300 font-bold">Forecast Evaluation Scorecard</span>
          <span className="text-slate-500">{evalSummary.totalForecastsEvaluated} Evaluated</span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-center pt-0.5">
          <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
            <span className="text-[8px] text-slate-400">MAE (m/s)</span>
            <div className="font-bold text-white text-xs">
              {evalSummary.meanAbsoluteError != null ? `${evalSummary.meanAbsoluteError}` : 'N/A'}
            </div>
          </div>

          <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
            <span className="text-[8px] text-slate-400">FALSE ALARM</span>
            <div className="font-bold text-emerald-400 text-xs">
              {evalSummary.falseAlarmRatePercentage}%
            </div>
          </div>

          <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
            <span className="text-[8px] text-slate-400">LEAD TIME</span>
            <div className="font-bold text-cyan-300 text-xs">
              {evalSummary.averageLeadTimeSeconds != null ? `${evalSummary.averageLeadTimeSeconds}s` : 'N/A'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

