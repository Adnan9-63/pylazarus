import React, { useState } from 'react';
import { Repository } from '../types';
import { X, Clock, Archive, Sparkles, Copy, Check, Volume2, VolumeX } from 'lucide-react';

interface DiffViewerModalProps {
  repo: Repository | null;
  onClose: () => void;
}

export const DiffViewerModal: React.FC<DiffViewerModalProps> = ({ repo, onClose }) => {
  const [copiedPane, setCopiedPane] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  if (!repo) return null;

  const handleClose = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    onClose();
  };

  const toggleVoiceTour = () => {
    if (isSpeaking) {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const textToSpeak = repo.forensicEulogy || `Analyzing code triangulation for ${repo.name}. Python 2 source compared against Wayback excavation schemas and resurrected Python 3 output.`;
        const utter = new SpeechSynthesisUtterance(textToSpeak);
        utter.rate = 0.9;
        utter.pitch = 0.85;
        utter.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utter);
      }
    }
  };

  const copyToClipboard = (text: string, paneId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPane(paneId);
    setTimeout(() => setCopiedPane(null), 2000);
  };

  const waybackSnapshot = repo.category === 'semantic_api_bitrot'
    ? `[ARCHIVED WAYBACK MACHINE CDX SNAPSHOT: ${repo.lastCommitYear}-11-04]
Source: web.archive.org/web/${repo.lastCommitYear}1104.../api/${repo.name}
Response Schema: HTTP 200 OK
Content-Type: application/json; charset=utf-8

{
  "status": "deprecated_upstream",
  "endpoint_retired_year": 2013,
  "migration_notice": "Migrate to modern JSON API v1.1 or use Lazarus polyfill."
}`
    : `[PYTHON STANDARD LIBRARY MIGRATION RECORD]
Source: docs.python.org/3/whatsnew/3.0.html
Status: Syntax & stdlib module refactored in Python 3.0.
- print statement converted to print() function
- xrange() unified into range()
- dictionary .iteritems() replaced with .items() view`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-crypt-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-6xl h-[88vh] bg-crypt-900 border border-crypt-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-crypt-800 bg-crypt-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-mono text-base font-bold text-slate-100">
                Time-Travel Triangulation: {repo.name}
              </h2>
              <p className="text-xs text-slate-400">
                2005–2015 Python 2 Source &rarr; Wayback Machine Archive &rarr; 2026 Resurrected Python 3
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={toggleVoiceTour}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all flex items-center space-x-1.5 ${
                isSpeaking
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 animate-pulse'
                  : 'bg-crypt-850 text-slate-300 border-crypt-700 hover:text-slate-100 hover:border-slate-500'
              }`}
            >
              {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-purple-400" /> : <Volume2 className="w-3.5 h-3.5 text-purple-400" />}
              <span>{isSpeaking ? 'Mute Voice Tour' : '🎙️ Narrate Code Autopsy'}</span>
            </button>

            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-crypt-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 3-Pane Triangulation Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-crypt-800 overflow-hidden">
          {/* Pane 1: Original Python 2 */}
          <div className="flex flex-col h-full bg-crypt-950/60 p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-rose-400 font-semibold flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                <span>Original ({repo.lastCommitYear} Python 2)</span>
              </span>
              <button
                onClick={() => copyToClipboard(repo.deadPy2Code, 'py2')}
                className="text-xs font-mono text-slate-400 hover:text-slate-200 flex items-center space-x-1"
              >
                {copiedPane === 'py2' ? <Check className="w-3 h-3 text-ectoplasm-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedPane === 'py2' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="flex-1 w-full bg-crypt-900/90 border border-crypt-800 rounded-xl p-3 font-mono text-xs text-rose-300/90 overflow-y-auto leading-relaxed select-text">
              {repo.deadPy2Code}
            </pre>
          </div>

          {/* Pane 2: Wayback Excavation / Doc Schema */}
          <div className="flex flex-col h-full bg-crypt-950/40 p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-marigold-400 font-semibold flex items-center space-x-1.5">
                <Archive className="w-3.5 h-3.5" />
                <span>Wayback Excavation (Stagehand)</span>
              </span>
              <button
                onClick={() => copyToClipboard(waybackSnapshot, 'wayback')}
                className="text-xs font-mono text-slate-400 hover:text-slate-200 flex items-center space-x-1"
              >
                {copiedPane === 'wayback' ? <Check className="w-3 h-3 text-ectoplasm-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedPane === 'wayback' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="flex-1 w-full bg-crypt-900/90 border border-crypt-800 rounded-xl p-3 font-mono text-xs text-marigold-300/90 overflow-y-auto leading-relaxed select-text whitespace-pre-wrap">
              {waybackSnapshot}
            </pre>
          </div>

          {/* Pane 3: Resurrected Python 3 */}
          <div className="flex flex-col h-full bg-crypt-950/60 p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-ectoplasm-400 font-semibold flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Resurrected (2026 Python 3)</span>
              </span>
              <button
                onClick={() => copyToClipboard(repo.resurrectedPy3Code || '', 'py3')}
                className="text-xs font-mono text-slate-400 hover:text-slate-200 flex items-center space-x-1"
              >
                {copiedPane === 'py3' ? <Check className="w-3 h-3 text-ectoplasm-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedPane === 'py3' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="flex-1 w-full bg-crypt-900/90 border border-crypt-800 rounded-xl p-3 font-mono text-xs text-ectoplasm-300 overflow-y-auto leading-relaxed select-text">
              {repo.resurrectedPy3Code || '# Quarantined: Unfixable C-extension ABI incompatible with WebAssembly'}
              {repo.polyfillCode ? `\n\n# --- _lazarus_polyfill.py ---\n${repo.polyfillCode}` : ''}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
