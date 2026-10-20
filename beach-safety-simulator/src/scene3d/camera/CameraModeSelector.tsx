import React, { useEffect, useState } from 'react';
import { CameraDirector } from './CameraDirector';
import { CameraMode, CameraDirectorState } from './camera.types';
import {
  Video,
  Eye,
  Ship,
  Users,
  Crosshair,
  RotateCcw,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';

export const CameraModeSelector: React.FC = () => {
  const director = CameraDirector.getInstance();
  const [directorState, setDirectorState] = useState<CameraDirectorState>(director.getState());

  useEffect(() => {
    const unsub = director.subscribe((state) => {
      setDirectorState({ ...state });
    });
    return () => unsub();
  }, []);

  const handleSelectMode = (mode: CameraMode) => {
    director.setMode(mode);
  };

  const handleReset = () => {
    director.resetToOverview();
  };

  const MODES: { mode: CameraMode; label: string; icon: React.ReactNode; tooltip: string }[] = [
    {
      mode: 'OVERVIEW',
      label: 'Overview',
      icon: <Eye className="w-3.5 h-3.5" />,
      tooltip: 'Beach Overview — Elevated full oblique coastal perspective',
    },
    {
      mode: 'FOLLOW_SWIMMER',
      label: 'Swimmer',
      icon: <Users className="w-3.5 h-3.5" />,
      tooltip: 'Follow Swimmer — Dynamic tracking of swimmer in water or distress channel',
    },
    {
      mode: 'RESCUE_BOAT',
      label: 'Rescue Boat',
      icon: <Ship className="w-3.5 h-3.5" />,
      tooltip: 'Rescue Boat — Stern chase perspective following RB-01 rapid response craft',
    },
    {
      mode: 'LIFEGUARD',
      label: 'Lifeguard',
      icon: <Crosshair className="w-3.5 h-3.5" />,
      tooltip: 'Lifeguard — Beach station & responder chase perspective',
    },
    {
      mode: 'INCIDENT_FOCUS',
      label: 'Incident',
      icon: <ShieldAlert className="w-3.5 h-3.5" />,
      tooltip: 'Incident Focus — Co-framing of distress incident and responding resources',
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-xl border border-slate-700/80 shadow-2xl backdrop-blur-md font-mono text-xs select-none">
      <div className="flex items-center gap-1 text-cyan-400 font-extrabold px-1.5 border-r border-slate-800 pr-2">
        <Video className="w-3.5 h-3.5" />
        <span className="text-[10px] tracking-wider uppercase">CAM DIRECT:</span>
      </div>

      <div className="flex items-center gap-1">
        {MODES.map((item) => {
          const isSelected = directorState.currentMode === item.mode;
          return (
            <button
              key={item.mode}
              onClick={() => handleSelectMode(item.mode)}
              title={item.tooltip}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold ring-1 ring-cyan-300'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}

        <button
          onClick={handleReset}
          title="Reset Camera to Standard Perspective"
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer border-l border-slate-800 ml-0.5"
        >
          <RotateCcw className="w-3 h-3" />
          <span className="text-[10px]">Reset</span>
        </button>
      </div>

      {/* Target status indicator */}
      {!directorState.hasTarget && directorState.currentMode !== 'OVERVIEW' && (
        <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded text-[10px] text-amber-300 ml-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span className="truncate max-w-[120px]">Target Standby</span>
        </div>
      )}
    </div>
  );
};

