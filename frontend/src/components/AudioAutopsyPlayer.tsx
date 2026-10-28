import React, { useState, useRef, useEffect } from 'react';
import { Repository } from '../types';
import { X, Volume2, Play, Pause, Skull, Sparkles, BookOpen, ShieldAlert, Cpu } from 'lucide-react';

interface AudioAutopsyPlayerProps {
  repo: Repository | null;
  onClose: () => void;
}

export const AudioAutopsyPlayer: React.FC<AudioAutopsyPlayerProps> = ({ repo, onClose }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [speechRate, setSpeechRate] = useState<number>(0.9);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!repo) return;
    setIsPlaying(false);
    setProgress(0);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setAudioUrl(`/api/audio/eulogy/${repo.id}`);
  }, [repo]);

  if (!repo) return null;

  const narrativeText = repo.forensicEulogy || `Here lies ${repo.name}, created in ${repo.lastCommitYear} by @${repo.originalAuthor}. After a decade in the cold dark of GitHub, PyLazarus has rekindled its flame.`;

  const togglePlay = () => {
    if (isPlaying) {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      if (audioRef.current) audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      if (audioRef.current) {
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            if ('speechSynthesis' in window) {
              window.speechSynthesis.cancel();
              const utter = new SpeechSynthesisUtterance(narrativeText);
              utter.rate = speechRate;
              utter.pitch = 0.85;
              utter.onend = () => setIsPlaying(false);
              window.speechSynthesis.speak(utter);
            }
          });
      }
    }
  };

  const handleClose = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (audioRef.current) audioRef.current.pause();
    onClose();
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    const duration = audioRef.current.duration || 1;
    setProgress((current / duration) * 100);
  };

  const causeOfDeath = repo.category === 'syntax_bitrot'
    ? 'Python 2 to 3 syntax incompatibility (print statement, xrange, dictionary iteritems, octal literals).'
    : repo.category === 'semantic_api_bitrot'
    ? 'Sunset upstream REST APIs or removed standard library modules (sgmllib, commands, urllib2, Yahoo/Twitter v1.0).'
    : 'Direct C-extension ABI bindings with unfixable native dependencies (quarantined by Gatekeeper).';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-crypt-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-3xl max-h-[92vh] bg-crypt-900 border border-purple-500/40 rounded-2xl shadow-2xl shadow-purple-500/10 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-crypt-800 bg-crypt-950/70">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Skull className={`w-5 h-5 ${isPlaying ? 'animate-bounce text-purple-300' : 'animate-pulse'}`} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-mono text-base font-bold text-slate-100">
                  Forensic Audio Autopsy Station: {repo.name}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  ElevenLabs eleven_v4
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Phonetic Code Normalization &bull; Día de los Muertos Memorial Narration
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-crypt-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Player Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
            />
          )}

          {/* Three-Phase Technical Autopsy Dossier */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-crypt-950/70 border border-crypt-800">
              <div className="flex items-center space-x-1.5 text-slate-400 mb-1">
                <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-bold">1. Artifact Heritage</span>
              </div>
              <div className="text-slate-200 mt-1">@{repo.originalAuthor}</div>
              <div className="text-[11px] text-slate-500">Born ~{repo.lastCommitYear} &bull; {repo.originalLicense}</div>
            </div>

            <div className="p-3 rounded-xl bg-crypt-950/70 border border-crypt-800">
              <div className="flex items-center space-x-1.5 text-rose-400 mb-1">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span className="font-bold">2. Cause of Death</span>
              </div>
              <div className="text-rose-300 text-[11px] leading-snug line-clamp-2">
                {causeOfDeath}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-crypt-950/70 border border-crypt-800">
              <div className="flex items-center space-x-1.5 text-ectoplasm-400 mb-1">
                <Cpu className="w-3.5 h-3.5 text-ectoplasm-400" />
                <span className="font-bold">3. Resurrection</span>
              </div>
              <div className="text-ectoplasm-300 text-[11px]">
                {repo.status === 'QUARANTINED' ? 'Quarantined Safely' : 'WebAssembly Pyodide Verified'}
              </div>
              <div className="text-[10px] text-slate-500">Gatekeeper 0 Cheats</div>
            </div>
          </div>

          {/* Audio Waveform Animation & Soundwave */}
          <div className="p-4 rounded-xl bg-crypt-950/60 border border-purple-500/20 flex flex-col items-center justify-center space-y-3">
            <div className="flex items-end justify-center space-x-1.5 h-10 w-full max-w-sm">
              {[18, 35, 60, 24, 75, 45, 90, 30, 80, 50, 70, 35, 95, 40, 65, 20, 85, 30].map((h, i) => (
                <div
                  key={i}
                  className={`w-1.5 rounded-full transition-all duration-150 ${
                    isPlaying
                      ? 'bg-gradient-to-t from-purple-600 to-purple-400 animate-pulse'
                      : 'bg-crypt-800'
                  }`}
                  style={{
                    height: isPlaying ? `${Math.max(15, (h * (i % 2 === 0 ? 1 : 0.7)))}%` : '20%',
                    animationDelay: `${i * 70}ms`,
                  }}
                />
              ))}
            </div>

            {/* Play/Pause Button */}
            <div className="flex items-center space-x-4">
              <button
                onClick={togglePlay}
                className="px-6 py-2.5 rounded-xl font-mono text-xs font-bold bg-purple-500 text-crypt-950 hover:bg-purple-400 active:scale-95 transition-all flex items-center space-x-2 shadow-lg shadow-purple-500/25"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Pause Narration</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Play Forensic Narration</span>
                  </>
                )}
              </button>

              <div className="flex items-center space-x-1 text-[11px] font-mono text-slate-400 bg-crypt-850 px-2.5 py-1 rounded-lg border border-crypt-700">
                <span>Speed:</span>
                {[0.8, 1.0, 1.2].map((r) => (
                  <button
                    key={r}
                    onClick={() => setSpeechRate(r)}
                    className={`px-1.5 py-0.5 rounded text-[10px] ${
                      speechRate === r ? 'bg-purple-500 text-crypt-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {r}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Full Narrative Transcript with Highlighting */}
          <div className="p-4 rounded-xl bg-crypt-950/80 border border-crypt-800 font-mono text-xs leading-relaxed text-slate-200">
            <div className="text-[11px] text-purple-400 font-bold uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <Volume2 className="w-3.5 h-3.5" />
              <span>Full Historical Autopsy Transcript:</span>
            </div>
            <p className="italic text-purple-100/90 leading-relaxed text-xs">
              &ldquo;{narrativeText}&rdquo;
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
