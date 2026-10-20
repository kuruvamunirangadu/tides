/**
 * src/calibration/components/DiscrepancyMonitorSubPanel.tsx
 * 
 * TIDES — Phase 9: Digital Twin Calibration & Real-Time Synchronization
 * 
 * Discrepancy Monitoring and Operator Review Sub-Panel.
 * Surfaces differences between physical sensor telemetry and digital-twin simulation state.
 * 
 * Life Safety Policy:
 * Discrepancies do NOT automatically override deterministic hazard calculations,
 * cancel localized warnings, or trigger rescue dispatches. Operator review is required.
 */

import React, { useState } from 'react';
import { DigitalTwinDiscrepancyMonitor } from '../DigitalTwinDiscrepancyMonitor';
import {
  DigitalTwinDiscrepancy,
  DiscrepancyClassification,
} from '../digitalTwinObservation.types';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  Eye,
  Info,
  Search,
  Filter,
} from 'lucide-react';

export const DiscrepancyMonitorSubPanel: React.FC = () => {
  const monitor = DigitalTwinDiscrepancyMonitor.getInstance();

  const [discrepancies, setDiscrepancies] = useState<DigitalTwinDiscrepancy[]>(monitor.getAllDiscrepancies());
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedDiscrepancy, setSelectedDiscrepancy] = useState<DigitalTwinDiscrepancy | null>(null);

  const refreshList = () => {
    setDiscrepancies(
      monitor.getAllDiscrepancies(statusFilter !== 'ALL' ? { reviewStatus: statusFilter } : undefined)
    );
  };

  const handleUpdateStatus = (id: string, status: 'ACKNOWLEDGED' | 'INVESTIGATING' | 'RESOLVED') => {
    monitor.updateReviewStatus(id, status, 'OP-COMMAND-LEAD', `Operator reviewed and marked ${status}.`);
    refreshList();
    if (selectedDiscrepancy?.discrepancyId === id) {
      setSelectedDiscrepancy(monitor.getDiscrepancy(id) || null);
    }
  };

  const getClassificationBadge = (c: DiscrepancyClassification) => {
    switch (c) {
      case 'WITHIN_TOLERANCE':
        return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">WITHIN_TOLERANCE</span>;
      case 'EXPECTED_VARIATION':
        return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-blue-950 text-blue-300 border border-blue-800">EXPECTED_VARIATION</span>;
      case 'POTENTIAL_SENSOR_FAULT':
        return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-rose-950 text-rose-300 border border-rose-800">POTENTIAL_SENSOR_FAULT</span>;
      case 'STALE_TWIN_STATE':
        return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-950 text-amber-300 border border-amber-800">STALE_TWIN_STATE</span>;
      case 'UNEXPECTED_DIVERGENCE':
        return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-950 text-purple-300 border border-purple-800">UNEXPECTED_DIVERGENCE</span>;
      case 'INSUFFICIENT_EVIDENCE':
        return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-900 text-slate-400 border border-slate-700">INSUFFICIENT_EVIDENCE</span>;
    }
  };

  const getReviewStatusBadge = (s: string) => {
    switch (s) {
      case 'PENDING_REVIEW':
        return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-950 text-amber-300 border border-amber-800">PENDING_REVIEW</span>;
      case 'ACKNOWLEDGED':
        return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-blue-950 text-blue-300 border border-blue-800">ACKNOWLEDGED</span>;
      case 'INVESTIGATING':
        return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-950 text-purple-300 border border-purple-800">INVESTIGATING</span>;
      case 'RESOLVED':
        return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">RESOLVED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-900 text-slate-400 border border-slate-700">{s}</span>;
    }
  };

  return (
    <div className="space-y-4 font-mono text-xs select-none">
      {/* 1. Life Safety Policy Notice */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-start gap-3 text-slate-300">
        <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-white block font-bold text-xs uppercase tracking-wider">
            Digital Twin Discrepancy Triage Policy
          </strong>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Divergences between observed physical telemetry and digital-twin simulation state are tracked with explicit error formulas. Under strict safety invariants, a discrepancy does <span className="underline font-bold text-slate-200">NOT</span> automatically override deterministic hazard thresholds, cancel localized warnings, or alter rescue dispatches. Discrepancies are logged for human operator investigation.
          </p>
        </div>
      </div>

      {/* 2. Discrepancies Table & Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left (8 cols): Discrepancies List */}
        <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Identified State Discrepancies
              </h4>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setDiscrepancies(
                  monitor.getAllDiscrepancies(e.target.value !== 'ALL' ? { reviewStatus: e.target.value } : undefined)
                );
              }}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-[10px] text-slate-300"
            >
              <option value="ALL">All Review Statuses</option>
              <option value="PENDING_REVIEW">PENDING_REVIEW</option>
              <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
              <option value="INVESTIGATING">INVESTIGATING</option>
              <option value="RESOLVED">RESOLVED</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800 text-[10px] uppercase">
                  <th className="pb-2 font-bold">ID / Entity</th>
                  <th className="pb-2 font-bold">Variable</th>
                  <th className="pb-2 font-bold">Observed</th>
                  <th className="pb-2 font-bold">Simulated</th>
                  <th className="pb-2 font-bold">Difference</th>
                  <th className="pb-2 font-bold">Classification</th>
                  <th className="pb-2 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {discrepancies.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-500">
                      Zero unmitigated state discrepancies detected. All validated telemetry matches digital twin within tolerance.
                    </td>
                  </tr>
                ) : (
                  discrepancies.map((d) => (
                    <tr
                      key={d.discrepancyId}
                      onClick={() => setSelectedDiscrepancy(d)}
                      className={`hover:bg-slate-900/60 transition-colors cursor-pointer ${
                        selectedDiscrepancy?.discrepancyId === d.discrepancyId ? 'bg-cyan-950/40' : ''
                      }`}
                    >
                      <td className="py-2.5 font-bold text-white whitespace-nowrap">
                        <div>{d.discrepancyId}</div>
                        <span className="text-[9px] text-slate-500 font-normal">{d.entityId}</span>
                      </td>
                      <td className="py-2.5 text-slate-300 font-bold">{d.variable}</td>
                      <td className="py-2.5 text-cyan-300 font-bold">{d.observedValue} {d.units}</td>
                      <td className="py-2.5 text-slate-400">{d.simulatedValue} {d.units}</td>
                      <td className="py-2.5 text-rose-300 font-bold">
                        {d.absoluteDifference} {d.units} ({d.relativeDifferencePct}%)
                      </td>
                      <td className="py-2.5">{getClassificationBadge(d.classification)}</td>
                      <td className="py-2.5">{getReviewStatusBadge(d.reviewStatus)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right (4 cols): Discrepancy Detail & Triage Action */}
        <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
            <Eye className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Discrepancy Inspection</h4>
          </div>

          {selectedDiscrepancy ? (
            <div className="space-y-3 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs">{selectedDiscrepancy.discrepancyId}</span>
                {getClassificationBadge(selectedDiscrepancy.classification)}
              </div>

              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Target Entity:</span>
                  <span className="text-white font-bold">{selectedDiscrepancy.entityId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Variable:</span>
                  <span className="text-cyan-300 font-bold">{selectedDiscrepancy.variable}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Physical Reading:</span>
                  <span className="text-white font-bold">{selectedDiscrepancy.observedValue} {selectedDiscrepancy.units}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Digital Twin State:</span>
                  <span className="text-white font-bold">{selectedDiscrepancy.simulatedValue} {selectedDiscrepancy.units}</span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-800 pt-1">
                  <span className="text-slate-400">Abs / Rel Difference:</span>
                  <span className="text-rose-300 font-bold">{selectedDiscrepancy.absoluteDifference} {selectedDiscrepancy.units} ({selectedDiscrepancy.relativeDifferencePct}%)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Allowed Tolerance:</span>
                  <span className="text-slate-300">±{selectedDiscrepancy.applicableTolerance} {selectedDiscrepancy.units}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Uncertainty:</span>
                  <span className="text-slate-300">±{selectedDiscrepancy.measurementUncertainty} {selectedDiscrepancy.units}</span>
                </div>
              </div>

              {selectedDiscrepancy.reviewNotes && (
                <div className="text-[10px] text-slate-400 bg-slate-900/40 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block mb-0.5">Operator Notes:</span>
                  {selectedDiscrepancy.reviewNotes}
                </div>
              )}

              {/* Operator Action Buttons */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <span className="text-[10px] text-slate-400 block font-bold">Operator Triage Actions:</span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => handleUpdateStatus(selectedDiscrepancy.discrepancyId, 'ACKNOWLEDGED')}
                    className="py-1 rounded-lg bg-blue-900/80 hover:bg-blue-800 text-blue-200 text-[10px] font-bold cursor-pointer"
                  >
                    Acknowledge
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedDiscrepancy.discrepancyId, 'INVESTIGATING')}
                    className="py-1 rounded-lg bg-purple-900/80 hover:bg-purple-800 text-purple-200 text-[10px] font-bold cursor-pointer"
                  >
                    Investigate
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedDiscrepancy.discrepancyId, 'RESOLVED')}
                    className="py-1 rounded-lg bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 text-[10px] font-bold cursor-pointer"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500 text-xs">
              Select a discrepancy from the table to inspect details and assign triage actions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

