import React from 'react';
import { CommandAuditEntry } from '../models/CommandAuditLog';
import { GitBranch, Clock, AlertTriangle, ShieldCheck, Terminal } from 'lucide-react';

interface AuditLogViewerProps {
  logs: CommandAuditEntry[];
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ logs }) => {
  const getSeverityBadge = (sev: CommandAuditEntry['severity']) => {
    switch (sev) {
      case 'CRITICAL':
        return <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/40">CRITICAL</span>;
      case 'ALERT':
        return <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">ALERT</span>;
      case 'WARNING':
        return <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">WARNING</span>;
      default:
        return <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-slate-800 text-slate-300">INFO</span>;
    }
  };

  return (
    <div className="bg-slate-900/85 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3 font-mono">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          Command Action & Safety Audit Log ({logs.length} Entries)
        </h3>
        <span className="text-[10px] text-slate-400">Append-Only Immutable Event Stream</span>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto pr-1 text-xs">
        {logs.map((log) => (
          <div
            key={log.id}
            className="p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-lg space-y-1 hover:border-slate-700 transition-colors"
          >
            <div className="flex items-center justify-between gap-2 text-[10px]">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">{log.timeDisplay}</span>
                {getSeverityBadge(log.severity)}
                <span className="font-bold text-cyan-300">{log.actor}</span>
              </div>
              <span className="text-slate-500 font-semibold">{log.beachName}</span>
            </div>

            <div className="text-slate-200 text-[11px] leading-relaxed">
              {log.summary}
            </div>

            {log.causalChain && log.causalChain.length > 0 && (
              <div className="text-[9px] text-slate-400 flex items-center gap-1 pt-0.5 opacity-80">
                <GitBranch className="w-3 h-3 text-cyan-500 flex-shrink-0" />
                <span>Causal Trail: {log.causalChain.join(' → ')}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
