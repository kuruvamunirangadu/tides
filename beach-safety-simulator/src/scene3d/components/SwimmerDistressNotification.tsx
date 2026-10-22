import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Heart,
  Activity,
  Crosshair,
  Compass,
  X,
  ChevronRight,
  ChevronLeft,
  Minimize2,
  Maximize2,
  Radio,
} from 'lucide-react';
import {
  SwimmerFeelingControlManager,
  SwimmerFeelingState,
} from '../../wristbands/feeling/SwimmerFeelingControlManager';

interface SwimmerDistressNotificationProps {
  onLocateSwimmer: (visitorId: string) => void;
  onOpenDeck?: (wristbandId: string) => void;
}

export const SwimmerDistressNotification: React.FC<SwimmerDistressNotificationProps> = ({
  onLocateSwimmer,
  onOpenDeck,
}) => {
  const manager = SwimmerFeelingControlManager.getInstance();
  const [distressedList, setDistressedList] = useState<SwimmerFeelingState[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [acknowledgedWbIds, setAcknowledgedWbIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const poll = () => {
      const all = manager.getAllFeelings();
      const suffering = all.filter(
        (f) => f.isSuffering && (f.feeling === 'UNSAFE' || f.feeling === 'CRITICAL_PANIC')
      );
      setDistressedList(suffering);
      if (currentIndex >= suffering.length && suffering.length > 0) {
        setCurrentIndex(0);
      }
    };

    poll();
    const interval = setInterval(poll, 700);

    const handleCustomDistress = (e: any) => {
      if (e?.detail?.wristbandId) {
        const state = manager.getSwimmerFeeling(e.detail.wristbandId);
        Object.assign(state, e.detail);
      }
      poll();
      setIsMinimized(false);
    };

    window.addEventListener('tides:swimmer-distress', handleCustomDistress);
    window.addEventListener('tides:feeling-updated', handleCustomDistress);

    return () => {
      clearInterval(interval);
      window.removeEventListener('tides:swimmer-distress', handleCustomDistress);
      window.removeEventListener('tides:feeling-updated', handleCustomDistress);
    };
  }, [currentIndex]);

  if (distressedList.length === 0) {
    return null;
  }

  const current = distressedList[currentIndex] || distressedList[0];
  const isPanic = current.feeling === 'CRITICAL_PANIC';
  const isCurrentAcknowledged = acknowledgedWbIds.has(current.wristbandId);

  const handleLocate = () => {
    onLocateSwimmer(current.visitorId);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('tides:locate-swimmer', {
          detail: { visitorId: current.visitorId, wristbandId: current.wristbandId },
        })
      );
    }
  };

  const handleAcknowledge = () => {
    setAcknowledgedWbIds((prev) => new Set(prev).add(current.wristbandId));
    setIsMinimized(true);
  };

  const handleDismiss = () => {
    setIsMinimized(true);
  };

  if (isMinimized) {
    return (
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
        <button
          onClick={() => setIsMinimized(false)}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full ${
            isCurrentAcknowledged ? 'bg-amber-700/95 border-amber-400' : 'bg-orange-600/95 border-amber-300 animate-pulse'
          } text-white font-mono text-xs font-bold shadow-2xl border-2 transition cursor-pointer`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
          <span>
            {isCurrentAcknowledged ? '👁️ [ACKNOWLEDGED]' : '⚠️'} {distressedList.length} Swimmer(s) in Danger ({current.wristbandId})
          </span>
          <span className="text-[10px] bg-black/40 px-1.5 py-0.5 rounded font-black">EXPAND</span>
        </button>
      </div>
    );
  }

  return (
    <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-xl pointer-events-auto select-none animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="bg-slate-950/95 backdrop-blur-md rounded-2xl border-2 border-orange-500 shadow-2xl shadow-orange-950/60 overflow-hidden font-mono text-xs">
        {/* Header Bar */}
        <div className="px-3.5 py-2 bg-gradient-to-r from-orange-950 via-slate-900 to-slate-900 border-b border-orange-500/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500" />
            </span>
            <span className="font-extrabold text-orange-400 tracking-wider uppercase text-[11px] flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-orange-400 animate-bounce" />
              DISTRESS ALERT: SWIMMER IN DANGER (SUFFOCATING)
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-orange-500 text-slate-950">
              {current.wristbandId}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {distressedList.length > 1 && (
              <div className="flex items-center gap-1 mr-2 text-[10px] text-slate-400">
                <button
                  onClick={() => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : distressedList.length - 1))}
                  className="p-1 hover:text-white rounded hover:bg-slate-800"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span>
                  {currentIndex + 1}/{distressedList.length}
                </span>
                <button
                  onClick={() => setCurrentIndex((prev) => (prev < distressedList.length - 1 ? prev + 1 : 0))}
                  className="p-1 hover:text-white rounded hover:bg-slate-800"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
              title="Minimize"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDismiss}
              className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-3 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                <strong className="text-white text-sm">{current.visitorName}</strong>
                <span className="text-slate-400 text-xs">({current.visitorId})</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Zone: <strong className="text-amber-300">{current.zoneId}</strong> • State:{' '}
                <strong className="text-orange-400 uppercase">
                  {isPanic ? 'CRITICAL PANIC / SUBMERSION' : 'SEVERE RIP STRUGGLE (SUFFOCATING)'}
                </strong>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-2 text-right">
              <div className="px-2 py-1 rounded-xl bg-slate-900 border border-slate-800 text-[10px]">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="text-slate-400 block text-[8px]">HEART RATE</span>
                  <span className="text-[7px] text-cyan-400 font-mono">SIM</span>
                </div>
                <span className="text-rose-400 font-bold flex items-center gap-1">
                  <Heart className="w-3 h-3 animate-pulse" /> {current.heartRateBpm} bpm
                </span>
              </div>
              <div className="px-2 py-1 rounded-xl bg-slate-900 border border-slate-800 text-[10px]">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="text-slate-400 block text-[8px]">FATIGUE</span>
                  <span className="text-[7px] text-cyan-400 font-mono">SIM</span>
                </div>
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  <Activity className="w-3 h-3" /> {current.fatiguePercent}%
                </span>
              </div>
            </div>
          </div>

          {/* Sensation Quote */}
          <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-200 italic font-sans flex items-center gap-2">
            <span className="text-orange-400 font-bold not-italic shrink-0">⚠️ Sensation:</span>
            <span>"{current.sensationDescription}"</span>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              Highlighted in 3D with <strong className="text-orange-400">Orange Beacon & Rings</strong>
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={handleLocate}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-extrabold text-[11px] shadow-lg shadow-orange-950 transition cursor-pointer flex items-center gap-1.5"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>LOCATE IN 3D (Orange Marker)</span>
              </button>

              <button
                onClick={handleAcknowledge}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40 text-[10px] font-bold transition cursor-pointer"
                title="Acknowledge alert without marking safe"
              >
                Acknowledge
              </button>

              {onOpenDeck && (
                <button
                  onClick={() => onOpenDeck(current.wristbandId)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold transition cursor-pointer"
                >
                  Open Deck
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

