'use client';

import React from 'react';
import { Incident } from '@/lib/types';
import { Clock } from 'lucide-react';

interface IncidentTimelineProps {
  activeIncidents?: Incident[];
  recentIncidents?: Incident[];
}

export const IncidentTimeline: React.FC<IncidentTimelineProps> = ({
  activeIncidents = [],
  recentIncidents = [],
}) => {
  const combined = [...activeIncidents, ...recentIncidents.filter((r) => !activeIncidents.some((a) => a.id === r.id))];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-orange-400" />
          <h3 className="text-sm font-bold text-slate-100 tracking-wide uppercase">
            Incident Log & Latency Audit Trail
          </h3>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          {activeIncidents.length} Active / {combined.length} Total Logged
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300 font-mono">
          <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
            <tr>
              <th className="py-2 px-3">Incident ID</th>
              <th className="py-2 px-3">Type</th>
              <th className="py-2 px-3">Zone</th>
              <th className="py-2 px-3">Status</th>
              <th className="py-2 px-3">Detection Latency</th>
              <th className="py-2 px-3">Response Latency</th>
              <th className="py-2 px-3">Resolution Time</th>
              <th className="py-2 px-3">Dispatched Units</th>
              <th className="py-2 px-3">Outcome</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {combined.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-6 text-slate-500">
                  No active or past incidents recorded in current run
                </td>
              </tr>
            ) : (
              combined.map((inc) => (
                <tr key={inc.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-2 px-3 font-bold text-white">{inc.id}</td>
                  <td className="py-2 px-3 text-cyan-300">{inc.incident_type.replace(/_/g, ' ')}</td>
                  <td className="py-2 px-3">{inc.zone_id}</td>
                  <td className="py-2 px-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        inc.status === 'RESOLVED'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : inc.status === 'DISPATCHED'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {inc.status}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-emerald-400">
                    {inc.detection_latency_s !== undefined ? `${inc.detection_latency_s.toFixed(1)}s` : '--'}
                  </td>
                  <td className="py-2 px-3 text-purple-400">
                    {inc.response_latency_s !== undefined ? `${inc.response_latency_s.toFixed(1)}s` : '--'}
                  </td>
                  <td className="py-2 px-3 text-cyan-400">
                    {inc.resolution_duration_s !== undefined ? `${inc.resolution_duration_s.toFixed(1)}s` : 'In Progress'}
                  </td>
                  <td className="py-2 px-3 text-slate-300">
                    {inc.dispatched_resource_ids.length > 0 ? inc.dispatched_resource_ids.join(', ') : 'None'}
                  </td>
                  <td className="py-2 px-3 text-emerald-400 font-semibold">
                    {inc.outcome || 'Handling'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
