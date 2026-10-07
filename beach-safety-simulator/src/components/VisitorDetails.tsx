import React from 'react';
import { User, Activity, Zap, Compass, AlertOctagon, X, HeartPulse } from 'lucide-react';
import { Visitor } from '../models/Visitor';

interface VisitorDetailsProps {
  visitor?: Visitor;
  onClose: () => void;
  onSendWarning?: (visitorId: string) => void;
}

export const VisitorDetails: React.FC<VisitorDetailsProps> = ({
  visitor,
  onClose,
  onSendWarning,
}) => {
  if (!visitor) return null;

  return (
    <div className="absolute bottom-6 left-6 z-20 w-80 bg-slate-900/95 backdrop-blur-md rounded-xl border border-cyan-500/40 p-4 shadow-2xl text-left animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="flex items-start justify-between border-b border-slate-800 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <User className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <span>{visitor.id}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
                {visitor.type}
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">Profile: {visitor.behavior.name}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/50">
          <span className="text-[10px] text-slate-400 block">State</span>
          <span className={`font-semibold ${
            visitor.state === 'DISTRESS' ? 'text-rose-400 animate-pulse' :
            visitor.state === 'IN_RESTRICTED_ZONE' ? 'text-amber-400' :
            visitor.state === 'SWIMMING' ? 'text-cyan-400' : 'text-slate-200'
          }`}>
            {visitor.state}
          </span>
        </div>

        <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/50">
          <span className="text-[10px] text-slate-400 block">Current Zone</span>
          <span className="font-semibold text-slate-200">{visitor.currentZone}</span>
        </div>

        <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/50">
          <span className="text-[10px] text-slate-400 block">Swimming Ability</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="flex-1 bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-cyan-400 h-full rounded-full"
                style={{ width: `${Math.round(visitor.swimmingAbility * 100)}%` }}
              />
            </div>
            <span className="text-[11px] font-mono text-slate-300">
              {Math.round(visitor.swimmingAbility * 100)}%
            </span>
          </div>
        </div>

        <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/50">
          <span className="text-[10px] text-slate-400 block">Fatigue Level</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="flex-1 bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-400 h-full rounded-full"
                style={{ width: `${Math.round(visitor.fatigue * 100)}%` }}
              />
            </div>
            <span className="text-[11px] font-mono text-slate-300">
              {Math.round(visitor.fatigue * 100)}%
            </span>
          </div>
        </div>

        <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/50">
          <span className="text-[10px] text-slate-400 block">Risk Tolerance</span>
          <span className="font-semibold text-slate-200">
            {Math.round(visitor.riskTolerance * 100)}%
          </span>
        </div>

        <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/50">
          <span className="text-[10px] text-slate-400 block">Warning Response</span>
          <span className="font-semibold text-slate-200">
            {Math.round(visitor.warningResponse * 100)}%
          </span>
        </div>
      </div>

      {visitor.distressState && (
        <div className="mb-3 p-2.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-xs text-rose-200">
          <div className="flex items-center gap-1.5 font-bold mb-1">
            <HeartPulse className="w-4 h-4 text-rose-400 animate-bounce" />
            <span>CRITICAL DISTRESS ACTIVE</span>
          </div>
          <p className="text-[11px] text-rose-300">
            Cause: {visitor.distressState.cause} | Level: {Math.round(visitor.distressState.level * 100)}%
          </p>
        </div>
      )}

      {visitor.groupId && (
        <div className="mb-3 p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 flex items-center justify-between">
          <span>Group: {visitor.groupId}</span>
          <span className="text-[10px] font-mono">{visitor.isLeader ? '👑 Leader' : 'Member'}</span>
        </div>
      )}

      {onSendWarning && (
        <button
          onClick={() => onSendWarning(visitor.id)}
          className="w-full py-1.5 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
        >
          <AlertOctagon className="w-3.5 h-3.5" />
          Transmit Safety Warning to Entity
        </button>
      )}
    </div>
  );
};
