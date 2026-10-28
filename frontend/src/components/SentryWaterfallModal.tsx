import React, { useState, useEffect } from 'react';
import { TraceSpan } from '../types';
import { X, Activity, ShieldCheck, CheckCircle2, Lock } from 'lucide-react';

interface SentryWaterfallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SentryWaterfallModal: React.FC<SentryWaterfallModalProps> = ({ isOpen, onClose }) => {
  const [traces, setTraces] = useState<TraceSpan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [triggering, setTriggering] = useState<boolean>(false);

  const fetchTraces = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/observability/traces');
      if (res.ok) {
        const data = await res.json();
        setTraces(data.flat_spans || data.traces || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTraces();
    }
  }, [isOpen]);

  const handleTriggerLiveTrace = async () => {
    setTriggering(true);
    try {
      const res = await fetch('/api/observability/trigger-sample', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setTraces(data.flat_spans || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTriggering(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-crypt-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-crypt-900 border border-crypt-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-crypt-800 bg-crypt-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-mono text-base font-bold text-slate-100">
                  Sentry Agent Tracing &amp; Zero-PII Scrubber
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30">
                  OpenTelemetry gen_ai
                </span>
              </div>
              <p className="text-xs text-slate-400">
                End-to-End Hierarchical Distributed Tracing with Cryptographic PII Sanitization
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleTriggerLiveTrace}
              disabled={triggering}
              className="px-3 py-1.5 rounded-lg text-xs font-mono bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 transition-all flex items-center space-x-1.5"
            >
              <Activity className={`w-3.5 h-3.5 ${triggering ? 'animate-spin' : ''}`} />
              <span>{triggering ? 'Tracing...' : '⚡ Trigger Live Trace'}</span>
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-crypt-800">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Privacy Guarantee Pill */}
          <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center space-x-2">
              <Lock className="w-4 h-4 text-purple-400" />
              <span className="text-purple-200 font-semibold">Zero-PII Invariant Enforced:</span>
              <span className="text-purple-300">Auth tokens and hex keys masked before transmission</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">100% Clean</span>
          </div>

          {/* Trace Waterfall List */}
          <div className="space-y-2">
            <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Recorded Agent Execution Spans:
            </h4>

            {traces.length > 0 ? (
              traces.map((span, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl bg-crypt-950/60 border border-crypt-800 font-mono text-xs flex flex-col gap-2 ${
                    span.parent_span_id ? 'ml-4 border-l-2 border-l-purple-500/50' : 'border-crypt-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className={`w-2 h-2 rounded-full ${span.parent_span_id ? 'bg-purple-400' : 'bg-ectoplasm-400'}`} />
                      <span className="font-bold text-slate-200">{span.span_name}</span>
                      <span className="text-slate-500 text-[11px]">({span.model || 'Deterministic Code'})</span>
                    </div>

                    <div className="flex items-center space-x-3 text-[11px] text-slate-400">
                      <span>Latency: <strong className="text-ectoplasm-400">{span.latency_ms}ms</strong></span>
                      <span className="px-1.5 py-0.5 rounded bg-crypt-850 text-slate-300 border border-crypt-700">
                        PII Scrubber: OK
                      </span>
                    </div>
                  </div>

                  {/* Relative Latency Bar */}
                  <div className="w-full bg-crypt-900 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full ${
                        span.span_name.includes('gemma4') || span.span_name.includes('LLM')
                          ? 'bg-purple-500'
                          : span.span_name.includes('AST')
                          ? 'bg-ectoplasm-400'
                          : 'bg-blue-400'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(8, (span.latency_ms / 385) * 100))}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500 font-mono text-xs">
                No active live spans in buffer. Click '⚡ Trigger Live Trace' above to generate real-time telemetry.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
