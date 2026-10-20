import React, { useEffect, useState } from 'react';
import { SpatialAudioEngine, SpatialAudioState } from '../../audio/SpatialAudioEngine';
import { Volume2, VolumeX, Radio, Settings2, Waves, Sliders } from 'lucide-react';

export const SpatialAudioHUD: React.FC = () => {
  const engine = SpatialAudioEngine.getInstance();
  const [audioState, setAudioState] = useState<SpatialAudioState>(engine.getState());
  const [isOpen, setIsOpen] = useState<boolean>(false);

  useEffect(() => {
    const unsub = engine.subscribe((state) => {
      setAudioState({ ...state });
    });
    return () => unsub();
  }, []);

  const handleToggleMute = () => {
    engine.toggleMute();
  };

  return (
    <div className="relative font-mono text-xs select-none pointer-events-auto">
      <div className="flex items-center gap-1 bg-slate-900/90 p-1.5 rounded-xl border border-slate-700/80 shadow-2xl backdrop-blur-md">
        <button
          onClick={handleToggleMute}
          title={audioState.isMuted ? 'Unmute 3D Spatial Audio' : 'Mute 3D Spatial Audio'}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
            audioState.isMuted
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30'
          }`}
        >
          {audioState.isMuted ? (
            <VolumeX className="w-3.5 h-3.5 text-rose-400" />
          ) : (
            <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
          )}
          <span>{audioState.isMuted ? 'Muted' : '3D Audio'}</span>
        </button>

        <button
          onClick={() => setIsOpen(!isOpen)}
          title="Open Spatial Audio Volume Mixers"
          className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
        >
          <Sliders className="w-3.5 h-3.5" />
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-11 right-0 w-56 bg-slate-950/95 border border-slate-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-xl space-y-2.5 text-left animate-in fade-in zoom-in-95 duration-150 z-50">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="text-[10px] text-cyan-400 font-extrabold uppercase">3D Acoustic Mixer</span>
            <span className="text-[9px] text-slate-500 font-mono">HRTF Spatial</span>
          </div>

          {/* Master Volume */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-300">
              <span>Master Volume</span>
              <span className="font-bold text-cyan-300">{Math.round(audioState.masterVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={audioState.masterVolume}
              onChange={(e) => engine.setMasterVolume(parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          {/* Waves Ambience */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-300">
              <span>Surf & Waves</span>
              <span className="font-bold text-cyan-300">{Math.round(audioState.ambienceVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={audioState.ambienceVolume}
              onChange={(e) => engine.setAmbienceVolume(parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          {/* Boat Engine */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-300">
              <span>Rescue Boat Engine</span>
              <span className="font-bold text-amber-300">{Math.round(audioState.engineVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={audioState.engineVolume}
              onChange={(e) => engine.setEngineVolume(parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
          </div>

          {/* Safety Alerts */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-300">
              <span>Sirens & Whistles</span>
              <span className="font-bold text-rose-300">{Math.round(audioState.alertVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={audioState.alertVolume}
              onChange={(e) => engine.setAlertVolume(parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-400"
            />
          </div>
        </div>
      )}
    </div>
  );
};

