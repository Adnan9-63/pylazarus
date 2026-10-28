import React, { useState, useRef, useEffect } from 'react';
import { Repository } from '../types';
import { X, Volume2, Play, Pause, RotateCcw, Skull } from 'lucide-react';

interface AudioAutopsyPlayerProps {
  repo: Repository | null;
  onClose: () => void;
}

export const AudioAutopsyPlayer: React.FC<AudioAutopsyPlayerProps> = ({ repo, onClose }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!repo) return;
    setIsPlaying(false);
    setProgress(0);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    // Request audio stream from FastAPI backend
    setAudioUrl(`/api/audio/eulogy/${repo.id}`);
  }, [repo]);

  if (!repo) return null;

  const togglePlay = () => {
    if (isPlaying) {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      if (audioRef.current) audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      // Try playing audio file, with speech synthesis fallback
      if (audioRef.current) {
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            if ('speechSynthesis' in window) {
              const textToSpeak = repo.forensicEulogy || `Here lies ${repo.name}, written in ${repo.lastCommitYear}. After a decade in the dark, PyLazarus has rekindled its flame.`;
              const utter = new SpeechSynthesisUtterance(textToSpeak);
              utter.rate = 0.9;
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-crypt-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-crypt-900 border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-500/10 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-crypt-800 bg-crypt-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Skull className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-mono text-base font-bold text-slate-100">
                  Forensic Audio Autopsy: {repo.name}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30">
                  ElevenLabs eleven_v4
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Phonetic Code Normalization &bull; Día de los Muertos Memorial
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
        <div className="p-6 space-y-5">
          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
            />
          )}

          {/* Eulogy Text */}
          <div className="p-4 rounded-xl bg-crypt-950/60 border border-crypt-800 font-mono text-xs text-purple-200 leading-relaxed italic">
            &ldquo;{repo.forensicEulogy || `Here lies ${repo.name}, written by @${repo.originalAuthor} in ${repo.lastCommitYear}. After a decade in the cold dark of GitHub, PyLazarus has rekindled its flame.`}&rdquo;
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="w-full h-1.5 bg-crypt-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={togglePlay}
              className="p-4 rounded-full bg-purple-500 text-crypt-950 hover:bg-purple-400 transition-all shadow-lg shadow-purple-500/20 active:scale-95"
            >
              {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
