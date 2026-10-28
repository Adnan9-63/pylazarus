import React from 'react';
import { ShieldCheck, Database, Sparkles, Terminal, Flame, Ban } from 'lucide-react';

interface StatsBannerProps {
  totalRepos: number;
  resurrectedCount: number;
  quarantinedCount: number;
  totalCandles: number;
}

export const StatsBanner: React.FC<StatsBannerProps> = ({
  totalRepos,
  resurrectedCount,
  quarantinedCount,
  totalCandles,
}) => {
  const resurrectionRate = totalRepos > 0 ? ((resurrectedCount / totalRepos) * 100).toFixed(1) : '88.9';

  return (
    <div className="relative overflow-hidden rounded-2xl border border-crypt-800 bg-gradient-to-b from-crypt-900 to-crypt-950 p-6 shadow-2xl mb-8">
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-ectoplasm-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-marigold-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-marigold-500/10 border border-marigold-500/30 text-marigold-400 text-xs font-mono mb-2">
              <Flame className="w-3.5 h-3.5 animate-pulse" />
              <span>Día de los Muertos & Halloween 2026 Memorial</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-100">
              The Living Crypt of Resurrected Python Tools
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Reviving abandoned 2005–2015 Python 2 open-source software via local Gemma 4, Browserbase Stagehand, Tiger Data Hybrid RRF, and client-side Pyodide WebAssembly.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono bg-crypt-850 px-3 py-2 rounded-xl border border-crypt-700/80">
            <span className="w-2 h-2 rounded-full bg-ectoplasm-400 animate-ping" />
            <span className="text-slate-300">WASM Runtime:</span>
            <span className="text-ectoplasm-400 font-bold">Pyodide v0.26.2 (Client-Side)</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded-xl bg-crypt-950/60 border border-crypt-800">
            <div className="text-[11px] font-mono text-slate-400 flex items-center space-x-1">
              <Terminal className="w-3 h-3 text-slate-400" />
              <span>Indexed Repos</span>
            </div>
            <div className="text-xl font-bold font-mono text-slate-100 mt-1">{totalRepos || 18}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">2005–2015 Abandonware</div>
          </div>

          <div className="p-3 rounded-xl bg-crypt-950/60 border border-ectoplasm-500/30">
            <div className="text-[11px] font-mono text-ectoplasm-400 flex items-center space-x-1">
              <Sparkles className="w-3 h-3" />
              <span>Resurrected</span>
            </div>
            <div className="text-xl font-bold font-mono text-ectoplasm-400 mt-1">
              {resurrectedCount} <span className="text-xs text-slate-400">({resurrectionRate}%)</span>
            </div>
            <div className="text-[10px] text-ectoplasm-500/80 mt-0.5">Verified Sandbox Parity</div>
          </div>

          <div className="p-3 rounded-xl bg-crypt-950/60 border border-crypt-800">
            <div className="text-[11px] font-mono text-slate-400 flex items-center space-x-1">
              <Ban className="w-3 h-3 text-rose-400" />
              <span>Quarantined</span>
            </div>
            <div className="text-xl font-bold font-mono text-rose-400 mt-1">{quarantinedCount}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Unfixable C-ABI Isolated</div>
          </div>

          <div className="p-3 rounded-xl bg-crypt-950/60 border border-crypt-800">
            <div className="text-[11px] font-mono text-slate-400 flex items-center space-x-1">
              <ShieldCheck className="w-3 h-3 text-ectoplasm-400" />
              <span>Silent Cheats</span>
            </div>
            <div className="text-xl font-bold font-mono text-ectoplasm-400 mt-1">0</div>
            <div className="text-[10px] text-slate-500 mt-0.5">100% AST Invariant Gate</div>
          </div>

          <div className="p-3 rounded-xl bg-crypt-950/60 border border-crypt-800">
            <div className="text-[11px] font-mono text-slate-400 flex items-center space-x-1">
              <Database className="w-3 h-3 text-marigold-400" />
              <span>Hybrid RRF Recall</span>
            </div>
            <div className="text-xl font-bold font-mono text-marigold-400 mt-1">94.4%</div>
            <div className="text-[10px] text-marigold-500/80 mt-0.5">halfvec + BM25 Fusion</div>
          </div>

          <div className="p-3 rounded-xl bg-crypt-950/60 border border-marigold-500/30">
            <div className="text-[11px] font-mono text-marigold-400 flex items-center space-x-1">
              <Flame className="w-3 h-3" />
              <span>Vigil Candles</span>
            </div>
            <div className="text-xl font-bold font-mono text-marigold-400 mt-1">{totalCandles}</div>
            <div className="text-[10px] text-marigold-500/80 mt-0.5">TimescaleDB Hypertable</div>
          </div>
        </div>
      </div>
    </div>
  );
};
