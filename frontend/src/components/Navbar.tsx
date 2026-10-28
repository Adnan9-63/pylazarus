import React from 'react';
import { Ghost, ShieldCheck, Activity, Cpu, Sparkles, ExternalLink, Zap } from 'lucide-react';

interface NavbarProps {
  onOpenSentry: () => void;
  onOpenTemporal: () => void;
  onOpenBenchmark: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSentry,
  onOpenTemporal,
  onOpenBenchmark,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-crypt-800 bg-crypt-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ectoplasm-500/20 to-marigold-500/20 border border-ectoplasm-500/40 flex items-center justify-center shadow-lg shadow-ectoplasm-500/10">
              <Ghost className="w-5 h-5 text-ectoplasm-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-display text-xl font-bold tracking-wider text-slate-100">
                  Py<span className="text-ectoplasm-400">Lazarus</span>
                </span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-ectoplasm-500/10 text-ectoplasm-400 border border-ectoplasm-500/30">
                  WASM Arcade
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Open-Source Abandonware Resurrection Engine
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={onOpenBenchmark}
              className="px-3 py-1.5 rounded-lg text-xs font-mono bg-crypt-900 border border-crypt-700 text-slate-300 hover:text-slate-100 hover:border-slate-500 transition-colors flex items-center space-x-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-marigold-400" />
              <span>Ablation Benchmark</span>
            </button>

            <button
              onClick={onOpenTemporal}
              className="px-3 py-1.5 rounded-lg text-xs font-mono bg-crypt-900 border border-crypt-700 text-slate-300 hover:text-slate-100 hover:border-slate-500 transition-colors flex items-center space-x-1.5"
            >
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
              <span>Temporal Drill</span>
            </button>

            <button
              onClick={onOpenSentry}
              className="px-3 py-1.5 rounded-lg text-xs font-mono bg-crypt-900 border border-crypt-700 text-slate-300 hover:text-slate-100 hover:border-slate-500 transition-colors flex items-center space-x-1.5"
            >
              <Activity className="w-3.5 h-3.5 text-purple-400" />
              <span>Sentry Tracing</span>
            </button>

            <a
              href="https://dev.to"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg text-xs font-mono bg-gradient-to-r from-ectoplasm-500/20 to-ectoplasm-600/20 border border-ectoplasm-500/40 text-ectoplasm-300 hover:text-ectoplasm-200 transition-all flex items-center space-x-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden md:inline">#HF26 Week 4</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};
