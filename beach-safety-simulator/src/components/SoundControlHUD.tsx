import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX, Waves, Bell, Sparkles } from 'lucide-react';
import { soundEngine, SoundEngineState } from '../audio/BeachSoundEngine';

export const SoundControlHUD: React.FC = () => {
  const [audioState, setAudioState] = useState<SoundEngineState>(soundEngine.getState());
  const [showVolumeMenu, setShowVolumeMenu] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = soundEngine.subscribe((state) => {
      setAudioState(state);
    });
    return unsubscribe;
  }, []);

  const handleStartAudio = async () => {
    await soundEngine.initAudio();
  };

  const handleToggleMute = () => {
    soundEngine.toggleMute();
  };

  const handlePlayWhistle = () => {
    soundEngine.playLifeguardWhistle();
  };

  const handlePlaySiren = () => {
    soundEngine.playWarningSiren();
  };

  return (
    <div className="relative inline-flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 rounded-xl p-1 shadow-xl backdrop-blur-md text-xs pointer-events-auto">
      {/* 1. If Audio Not Yet Started By User Interaction */}
      {!audioState.isInitialized ? (
        <button
          onClick={handleStartAudio}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold shadow-md shadow-cyan-900/30 transition-all cursor-pointer animate-pulse"
          title="Click to start realistic ocean wave sound and safety audio effects"
        >
          <Waves className="w-3.5 h-3.5" />
          <span>🔊 Enable Ocean Sound & SFX</span>
        </button>
      ) : (
        <>
          {/* 2. Ambient Wave Flowing Sound Indicator / Toggle */}
          <button
            onClick={() => soundEngine.toggleAmbience()}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg font-medium transition-all cursor-pointer border ${
              audioState.activeAmbience && !audioState.isMuted
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                : 'bg-slate-800 text-slate-400 border-slate-700/60'
            }`}
            title={audioState.activeAmbience ? 'Mute Ocean Wave Ambience' : 'Play Ocean Wave Ambience'}
          >
            <Waves className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Waves Sound</span>
            {audioState.activeAmbience && !audioState.isMuted && (
              <span className="flex items-center gap-0.5 ml-0.5">
                <span className="w-1 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:0ms]"></span>
                <span className="w-1 h-3.5 bg-cyan-300 rounded-full animate-bounce [animation-delay:150ms]"></span>
                <span className="w-1 h-2.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:300ms]"></span>
              </span>
            )}
          </button>

          {/* 3. Quick Whistle SFX Button */}
          <button
            onClick={handlePlayWhistle}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-all cursor-pointer shadow-sm active:scale-95"
            title="Sound Acme Thunderer Lifeguard Whistle"
          >
            <Bell className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline font-bold">Whistle</span>
          </button>

          {/* 4. Quick Seagull Beach Bird Sound Button */}
          <button
            onClick={() => soundEngine.playSeagullCall()}
            className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-slate-800 hover:bg-sky-950/40 text-sky-300 border border-slate-700 hover:border-sky-500/50 transition-all cursor-pointer active:scale-95"
            title="Play Coastal Seabird / Seagull Cry"
          >
            <span>🐦</span>
            <span className="hidden md:inline font-bold">Seagulls</span>
          </button>

          {/* 5. Quick Siren SFX Button */}
          <button
            onClick={handlePlaySiren}
            className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-rose-300 border border-slate-700 hover:border-rose-500/50 transition-all cursor-pointer active:scale-95"
            title="Sound Red-Flag Safety Alert Siren"
          >
            <Sparkles className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden md:inline font-bold">Siren</span>
          </button>

          {/* 5. Master Mute / Unmute & Volume */}
          <div className="relative">
            <button
              onClick={handleToggleMute}
              onContextMenu={(e) => {
                e.preventDefault();
                setShowVolumeMenu(!showVolumeMenu);
              }}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                audioState.isMuted
                  ? 'bg-rose-950/30 text-rose-400 border-rose-800'
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:text-cyan-300'
              }`}
              title={audioState.isMuted ? 'Unmute Audio' : 'Mute Master Audio'}
            >
              {audioState.isMuted ? (
                <VolumeX className="w-3.5 h-3.5" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Quick Volume Slider Popover on Click/Right-Click */}
            {showVolumeMenu && (
              <div className="absolute right-0 top-full mt-2 bg-slate-900 border border-slate-700 p-2 rounded-xl shadow-2xl z-50 w-36 flex flex-col gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Wave Volume</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={audioState.oceanVolume}
                  onChange={(e) => soundEngine.setOceanVolume(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 cursor-pointer bg-slate-800 rounded-lg"
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

