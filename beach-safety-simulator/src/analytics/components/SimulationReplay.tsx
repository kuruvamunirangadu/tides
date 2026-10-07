import React, { useState, useEffect } from 'react';
import { ReplayEngine } from '../replay/ReplayEngine';
import { ReplayFrame } from '../replay/ReplayState';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  SkipBack,
  SkipForward,
  Film,
  Activity,
  AlertTriangle,
  LifeBuoy,
} from 'lucide-react';

interface SimulationReplayProps {
  replayEngine: ReplayEngine;
  onFrameChange?: (frame: ReplayFrame) => void;
}

export const SimulationReplay: React.FC<SimulationReplayProps> = ({ replayEngine, onFrameChange }) => {
  const [frames, setFrames] = useState<ReplayFrame[]>([]);
  const [currentFrame, setCurrentFrame] = useState<ReplayFrame | undefined>(undefined);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);

  useEffect(() => {
    const fList = replayEngine.getFrames();
    setFrames(fList);
    const curr = replayEngine.getCurrentFrame();
    setCurrentFrame(curr);
  }, [replayEngine]);

  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        const next = replayEngine.stepForward();
        if (next) {
          setCurrentFrame(next);
          if (onFrameChange) onFrameChange(next);
        } else {
          setIsPlaying(false);
          replayEngine.pauseReplay();
        }
      }, 1000 / speed);
    }
    return () => clearInterval(timer);
  }, [isPlaying, speed, replayEngine, onFrameChange]);

  const handleSeek = (idx: number) => {
    const frame = replayEngine.seekToIndex(idx);
    setCurrentFrame(frame);
    if (frame && onFrameChange) onFrameChange(frame);
  };

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      replayEngine.pauseReplay();
    } else {
      setIsPlaying(true);
      replayEngine.startReplay();
    }
  };

  const handleRewind = () => {
    const frame = replayEngine.seekToIndex(0);
    setCurrentFrame(frame);
    if (frame && onFrameChange) onFrameChange(frame);
  };

  if (frames.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-400 text-left">
        Recording simulation session frames... Replay will become available after recording starts.
      </div>
    );
  }

  const currentIndex = currentFrame ? currentFrame.frameIndex : 0;

  return (
    <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 text-left">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-cyan-400" />
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Simulation Replay & Event Inspector
          </h4>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
          <span>
            Frame: {currentIndex + 1} / {frames.length}
          </span>
          <span className="text-cyan-400 font-bold">{currentFrame?.timeDisplay}</span>
        </div>
      </div>

      {/* Scrub Bar */}
      <div className="space-y-1">
        <input
          type="range"
          min={0}
          max={Math.max(0, frames.length - 1)}
          value={currentIndex}
          onChange={(e) => handleSeek(Number(e.target.value))}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
        />
        <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
          <span>{frames[0]?.timeDisplay}</span>
          <span>{frames[frames.length - 1]?.timeDisplay}</span>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleRewind}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
            title="Rewind to start"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleSeek(currentIndex - 1)}
            disabled={currentIndex <= 0}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-all cursor-pointer"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={togglePlay}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlaying ? 'PAUSE' : 'PLAY REPLAY'}</span>
          </button>
          <button
            onClick={() => handleSeek(currentIndex + 1)}
            disabled={currentIndex >= frames.length - 1}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-all cursor-pointer"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60">
          <FastForward className="w-3 h-3 text-slate-400 ml-1 mr-0.5" />
          {[1, 2, 5, 10].map((s) => (
            <button
              key={s}
              onClick={() => {
                setSpeed(s);
                replayEngine.setSpeed(s);
              }}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer ${
                speed === s ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Snapshot State Inspector */}
      {currentFrame && (
        <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs space-y-1.5">
          <div className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider">
            Replay Frame Snapshot State
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-slate-300">
            <div>
              <span className="text-slate-400 block">Waves / Current</span>
              <span>
                {currentFrame.state.environment.waveHeight}m / {currentFrame.state.environment.waterCurrent}m/s
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Active Incidents</span>
              <span className="text-rose-400 font-bold">{currentFrame.state.emergencyIncidents.length}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Risk Level</span>
              <span className="text-amber-400 font-bold">
                {currentFrame.state.riskOverview?.overallCategory || 'LOW'} (
                {currentFrame.state.riskOverview?.overallBeachRiskScore || 0}/100)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
