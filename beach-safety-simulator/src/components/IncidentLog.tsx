import React, { useState } from 'react';

export interface AudioProps {
  activeWarning?: {
    te: string;
    en: string;
    hi: string;
  };
}

export const MultilingualPACabin: React.FC<AudioProps> = ({ activeWarning }) => {
  const [selectedLang, setSelectedLang] = useState<'te-IN' | 'en-IN' | 'hi-IN'>('te-IN');
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayVoice = (text: string, lang: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('Browser does not support Speech Synthesis');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.95; // Slightly slower for public intelligibility
    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    window.speechSynthesis.speak(utterance);
  };

  const defaultTe = 'హెచ్చరిక: బలమైన రిప్ కరెంట్ ప్రవాహం ఉంది. దయచేసి నీటిలోకి వెళ్లవద్దు.';
  const defaultEn = 'Warning: High-velocity rip currents detected offshore. Do not enter the water.';
  const defaultHi = 'चेतावनी: समुद्र में तेज लहरें और करंट है। कृपया पानी में न जाएं।';

  const currentText =
    selectedLang === 'te-IN'
      ? activeWarning?.te || defaultTe
      : selectedLang === 'hi-IN'
      ? activeWarning?.hi || defaultHi
      : activeWarning?.en || defaultEn;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 mt-3 text-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          Acoustic PA System (Andhra Pradesh)
        </span>
        <span className="text-[10px] text-slate-500 font-mono">TOWERS 1 & 2 ACTIVE</span>
      </div>

      <div className="flex gap-2 mb-2">
        {(['te-IN', 'en-IN', 'hi-IN'] as const).map((lang) => (
          <button
            key={lang}
            onClick={() => setSelectedLang(lang)}
            className={`px-2 py-1 rounded text-[11px] font-medium transition ${
              selectedLang === lang
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {lang === 'te-IN' ? 'తెలుగు (Telugu)' : lang === 'hi-IN' ? 'हिन्दी (Hindi)' : 'English'}
          </button>
        ))}
      </div>

      <div className="p-2 bg-slate-950 rounded border border-slate-800 text-slate-300 font-sans italic text-[11px] leading-relaxed mb-2">
        "{currentText}"
      </div>

      <button
        onClick={() => handlePlayVoice(currentText, selectedLang)}
        disabled={isPlaying}
        className={`w-full py-1.5 rounded font-mono font-bold text-center transition ${
          isPlaying
            ? 'bg-amber-500 text-slate-950 animate-pulse'
            : 'bg-red-600 hover:bg-red-500 text-white'
        }`}
      >
        {isPlaying ? '📢 BROADCASTING ACOUSTIC SIREN...' : '🔊 BROADCAST WARNING SIREN'}
      </button>
    </div>
  );
};

