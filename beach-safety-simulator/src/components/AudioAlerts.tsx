import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Radio, Play, AlertCircle, Globe } from 'lucide-react';
import { BeachPresetId } from '../models/Beach';

interface AudioAlertsProps {
  beachPreset?: BeachPresetId;
  activeFlag?: string;
  hazardType?: string;
}

export const AudioAlerts: React.FC<AudioAlertsProps> = ({
  beachPreset = 'RUSHIKONDA_VIZAG',
  activeFlag = 'RED',
  hazardType = 'RIP_CURRENT',
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeLang, setActiveLang] = useState<'TE' | 'EN' | 'HI'>('TE');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const lastAutomaticAlert = useRef<string | null>(null);
  const isMounted = useRef(true);

  const isRushikonda = beachPreset === 'RUSHIKONDA_VIZAG';
  const beachNameTe = isRushikonda ? 'రుషికొండ బ్లూ ఫ్లాగ్ బీచ్' : 'సూర్యలంక / బాపట్ల బీచ్';
  const beachNameEn = isRushikonda ? 'Rushikonda Blue Flag Beach' : 'Suryalanka / Bapatla Beach';
  const beachNameHi = isRushikonda ? 'रुषिकोंडा ब्लू फ्लैग बीच' : 'सूर्यलंका / बापटला बीच';

  const audioScripts = {
    TE: `హెచ్చరిక! ${beachNameTe} వద్ద తీవ్రమైన రిప్ కరెంట్ మరియు అలల ఉధృతి ఉంది. దయచేసి ఎరుపు జెండా జోన్ నుండి వెంటనే ఒడ్డుకు రండి!`,
    EN: `Emergency Warning! Dangerous rip current active at ${beachNameEn}. Evacuate red flag zone immediately!`,
    HI: `चेतावनी! ${beachNameHi} में तेज रिप करंट और ऊंची लहरें हैं। कृपया लाल झंडे वाले क्षेत्र से तुरंत बाहर आएं!`,
  };

  const playSiren = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.6);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) {
      console.warn('AudioContext not allowed or supported', e);
    }
  };

  const speakAlert = useCallback((lang: 'TE' | 'EN' | 'HI') => {
    if (!soundEnabled) return;
    playSiren();

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const text = audioScripts[lang];
      const utterance = new SpeechSynthesisUtterance(text);

      if (lang === 'TE') {
        utterance.lang = 'te-IN';
        utterance.rate = 0.9;
      } else if (lang === 'HI') {
        utterance.lang = 'hi-IN';
        utterance.rate = 0.95;
      } else {
        utterance.lang = 'en-US';
        utterance.rate = 1.0;
      }

      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);

      window.speechSynthesis.speak(utterance);
    }
  }, [soundEnabled, audioScripts]);

  const speakAllLanguages = useCallback(() => {
    if (!soundEnabled || !('speechSynthesis' in window)) return;

    playSiren();
    window.speechSynthesis.cancel();
    const languages: Array<['TE' | 'EN' | 'HI', string]> = [
      ['TE', 'te-IN'],
      ['EN', 'en-IN'],
      ['HI', 'hi-IN'],
    ];
    let index = 0;

    const speakNext = () => {
      if (!isMounted.current || index >= languages.length) {
        setIsPlaying(false);
        return;
      }

      const [lang, locale] = languages[index++];
      setActiveLang(lang);
      const utterance = new SpeechSynthesisUtterance(audioScripts[lang]);
      utterance.lang = locale;
      utterance.rate = lang === 'TE' ? 0.9 : 0.95;
      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = speakNext;
      utterance.onerror = speakNext;
      window.speechSynthesis.speak(utterance);
    };

    speakNext();
  }, [soundEnabled, audioScripts]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    const critical = activeFlag === 'RED' || activeFlag === 'BLACK';
    const alertKey = `${activeFlag}:${hazardType}`;
    if (critical && lastAutomaticAlert.current !== alertKey) {
      lastAutomaticAlert.current = alertKey;
      speakAllLanguages();
    } else if (!critical) {
      lastAutomaticAlert.current = null;
    }
  }, [activeFlag, hazardType, speakAllLanguages]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-xl backdrop-blur-md space-y-2 text-left">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            🔊 Tri-Lingual Coastal Siren Broadcast (AP Safety)
          </span>
        </div>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`p-1 rounded-lg border text-xs cursor-pointer ${
            soundEnabled
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}
          title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Tri-Lingual Quick Broadcast Buttons */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          onClick={() => {
            setActiveLang('TE');
            speakAlert('TE');
          }}
          className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer border ${
            activeLang === 'TE' && isPlaying
              ? 'bg-rose-500 text-white border-rose-400 shadow-md animate-pulse'
              : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-slate-700'
          }`}
        >
          <span className="font-extrabold text-[11px]">తెలుగు (Telugu)</span>
          <span className="text-[9px] opacity-80">హెచ్చరిక సైరన్</span>
        </button>

        <button
          onClick={() => {
            setActiveLang('EN');
            speakAlert('EN');
          }}
          className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer border ${
            activeLang === 'EN' && isPlaying
              ? 'bg-rose-500 text-white border-rose-400 shadow-md animate-pulse'
              : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-slate-700'
          }`}
        >
          <span className="font-extrabold text-[11px]">English</span>
          <span className="text-[9px] opacity-80">Voice Siren</span>
        </button>

        <button
          onClick={() => {
            setActiveLang('HI');
            speakAlert('HI');
          }}
          className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer border ${
            activeLang === 'HI' && isPlaying
              ? 'bg-rose-500 text-white border-rose-400 shadow-md animate-pulse'
              : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-slate-700'
          }`}
        >
          <span className="font-extrabold text-[11px]">हिन्दी (Hindi)</span>
          <span className="text-[9px] opacity-80">आपातकालीन चेतावनी</span>
        </button>
      </div>

      {/* Script Preview Box */}
      <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 flex items-start gap-1.5">
        <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
        <p className="line-clamp-2">{audioScripts[activeLang]}</p>
      </div>
    </div>
  );
};
