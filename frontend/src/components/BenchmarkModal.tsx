import React from 'react';
import { X, Zap, ShieldCheck, CheckCircle2, Ban, Database } from 'lucide-react';

interface BenchmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BenchmarkModal: React.FC<BenchmarkModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-crypt-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-crypt-900 border border-crypt-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-crypt-800 bg-crypt-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-marigold-500/10 border border-marigold-500/30 text-marigold-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-mono text-base font-bold text-slate-100">
                  Scientific Ablation &amp; Verification Benchmark
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-marigold-500/10 text-marigold-400 border border-marigold-500/30">
                  18 Authentic Repositories
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Empirical Evaluation across 3 Pipelines and 3 Retrieval Topologies
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-crypt-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Main Pipeline Comparison Table */}
          <div className="rounded-xl border border-crypt-800 overflow-hidden">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-crypt-950 text-slate-400 border-b border-crypt-800">
                <tr>
                  <th className="p-3">Architecture Pipeline</th>
                  <th className="p-3">Resurrected / 18</th>
                  <th className="p-3">Success Rate</th>
                  <th className="p-3">Silent Cheats</th>
                  <th className="p-3">Quarantined Safely</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-crypt-800 bg-crypt-900/60">
                <tr>
                  <td className="p-3 font-semibold text-slate-300">1. lib2to3 / AST Syntax Only</td>
                  <td className="p-3 text-slate-300">10 / 18</td>
                  <td className="p-3 text-slate-300">55.6%</td>
                  <td className="p-3 text-ectoplasm-400">0</td>
                  <td className="p-3 text-slate-500">0 (Crashes)</td>
                </tr>
                <tr className="bg-rose-500/5">
                  <td className="p-3 font-semibold text-rose-300">2. Raw Unguarded Gemma 4</td>
                  <td className="p-3 text-rose-300">6 / 18</td>
                  <td className="p-3 text-rose-300">33.3%</td>
                  <td className="p-3 text-rose-400 font-bold">4 (Deleted APIs)</td>
                  <td className="p-3 text-rose-400">0</td>
                </tr>
                <tr className="bg-ectoplasm-500/5">
                  <td className="p-3 font-bold text-ectoplasm-300">3. PyLazarus Guarded Pipeline</td>
                  <td className="p-3 font-bold text-ectoplasm-400">16 / 18</td>
                  <td className="p-3 font-bold text-ectoplasm-400">88.9%</td>
                  <td className="p-3 font-bold text-ectoplasm-400">0 (Zero Cheats)</td>
                  <td className="p-3 font-bold text-ectoplasm-400">2 (100% C-ABI Isolated)</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Retrieval Ablation Strip */}
          <div className="p-4 rounded-xl bg-crypt-950/60 border border-crypt-800 space-y-3 font-mono text-xs">
            <h4 className="text-slate-300 font-bold flex items-center space-x-2">
              <Database className="w-4 h-4 text-marigold-400" />
              <span>Retrieval Ablation (Recall@5 across 18 queries):</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-crypt-900 border border-crypt-800">
                <div className="text-slate-500 text-[11px]">Vector-Only (halfvec HNSW):</div>
                <div className="text-lg font-bold text-slate-300 mt-1">66.7%</div>
              </div>
              <div className="p-3 rounded-lg bg-crypt-900 border border-crypt-800">
                <div className="text-slate-500 text-[11px]">BM25-Only (pg_textsearch):</div>
                <div className="text-lg font-bold text-slate-300 mt-1">72.2%</div>
              </div>
              <div className="p-3 rounded-lg bg-crypt-900 border border-ectoplasm-500/30">
                <div className="text-ectoplasm-400 text-[11px] font-bold">Tiger Data Hybrid RRF (k=60):</div>
                <div className="text-lg font-bold text-ectoplasm-400 mt-1">94.4% (+22.2% Lift)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
