import React from 'react';

export interface TelemetryBadgeProps {
  isLiveHardware: boolean;
  stationId?: string;
}

export const TelemetryStatusBadge: React.FC<TelemetryBadgeProps> = ({ isLiveHardware, stationId }) => {
  return (
    <div className="flex items-center space-x-2 text-xs font-mono px-3 py-1.5 rounded bg-slate-900 border border-slate-800">
      <span className={`w-2.5 h-2.5 rounded-full ${isLiveHardware ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
      <span className="text-slate-300">
        Source:{' '}
        <strong className={isLiveHardware ? 'text-emerald-400' : 'text-amber-400'}>
          {isLiveHardware ? `LIVE IOT BUOY (${stationId || 'INCOIS-BUOY-VIZAG-01'})` : 'SYNTHETIC PHYSICS FALLBACK'}
        </strong>
      </span>
    </div>
  );
};

