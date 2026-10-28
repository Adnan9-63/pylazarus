import React, { useState, useEffect } from 'react';
import { Repository } from '../types';
import { X, Cpu, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';

interface TabPFNModalProps {
  repo: Repository | null;
  onClose: () => void;
}

export const TabPFNModal: React.FC<TabPFNModalProps> = ({ repo, onClose }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!repo) return;
    const fetchTriage = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/viability/triage/${repo.id}`);
        if (res.ok) {
          setData(await res.json());
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchTriage();
  }, [repo]);

  if (!repo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-crypt-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-crypt-900 border border-crypt-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-crypt-800 bg-crypt-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-ectoplasm-500/10 border border-ectoplasm-500/30 text-ectoplasm-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-mono text-base font-bold text-slate-100">
                  TabPFN Viability Assessment: {repo.name}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-ectoplasm-500/10 text-ectoplasm-400 border border-ectoplasm-500/30">
                  12-Feature Prior-Fitted Network
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Prior-Data Fitted Classifier predicting resurrection probability in &lt;100ms
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-crypt-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="py-12 text-center text-slate-400 font-mono text-xs">
              <div className="w-8 h-8 mx-auto mb-3 border-2 border-ectoplasm-500 border-t-transparent rounded-full animate-spin" />
              Extracting 12 AST bitrot features &amp; evaluating TabPFN...
            </div>
          ) : (
            <>
              {/* Score strip */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-crypt-950/60 border border-crypt-800">
                  <div className="text-xs font-mono text-slate-400">TabPFN Viability Score</div>
                  <div className="text-2xl font-bold font-mono text-ectoplasm-400 mt-1">
                    {((data?.viability_score ?? repo.viabilityScore) * 100).toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">High Confidence Prediction</div>
                </div>

                <div className="p-4 rounded-xl bg-crypt-950/60 border border-crypt-800">
                  <div className="text-xs font-mono text-slate-400">Triage Verdict</div>
                  <div className="text-lg font-bold font-mono text-slate-200 mt-1">
                    {data?.verdict || (repo.status === 'QUARANTINED' ? 'UNFIXABLE_C_ABI_QUARANTINE' : 'HIGH_VIABILITY')}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Automated Pre-LLM Filter</div>
                </div>
              </div>

              {/* 12 Features List */}
              <div className="p-4 rounded-xl bg-crypt-950/40 border border-crypt-800">
                <h4 className="text-xs font-mono font-bold text-slate-300 mb-3 flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-blue-400" />
                  <span>12 Extracted AST Bitrot Features:</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                  {data?.features ? (
                    Object.entries(data.features).map(([k, v]: [string, any]) => (
                      <div key={k} className="p-2 rounded bg-crypt-900 border border-crypt-800 flex justify-between">
                        <span className="text-slate-400 truncate text-[11px]">{k}:</span>
                        <span className="text-ectoplasm-400 font-bold ml-1">{String(v)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500 text-xs">Features extracted during ingestion.</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
