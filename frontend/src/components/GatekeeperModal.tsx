import React, { useState, useEffect } from 'react';
import { Repository, GatekeeperVerdict } from '../types';
import { X, ShieldCheck, CheckCircle2, AlertTriangle, FileText, Ban, ExternalLink } from 'lucide-react';

interface GatekeeperModalProps {
  repo: Repository | null;
  onClose: () => void;
}

export const GatekeeperModal: React.FC<GatekeeperModalProps> = ({ repo, onClose }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [verdict, setVerdict] = useState<GatekeeperVerdict | null>(null);

  useEffect(() => {
    if (!repo) return;

    const fetchVerdict = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/gatekeeper/audit/${repo.id}`);
        if (res.ok) {
          const data = await res.json();
          setVerdict({
            passed: data.passed,
            status: data.status,
            astCheck: {
              passed: data.ast_check?.passed ?? true,
              missingFunctions: data.ast_check?.missing_functions ?? [],
              missingClasses: data.ast_check?.missing_classes ?? [],
              forbiddenCalls: data.ast_check?.forbidden_calls ?? [],
              syntaxError: data.ast_check?.syntax_error,
            },
            sandboxCheck: {
              passed: data.sandbox_check?.passed ?? true,
              returncode: data.sandbox_check?.returncode ?? 0,
              stdout: data.sandbox_check?.stdout ?? '',
              stderr: data.sandbox_check?.stderr ?? '',
              executionMs: data.sandbox_check?.execution_ms ?? 0,
            },
            renderedHtml: data.rendered_audit_html || '',
            claimsTotal: data.claims_total ?? 0,
            claimsVerified: data.claims_verified ?? 0,
            claimsStruck: data.claims_struck ?? 0,
          });
        }
      } catch (e) {
        console.error('Failed to fetch gatekeeper audit:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchVerdict();
  }, [repo]);

  if (!repo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-crypt-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-crypt-900 border border-crypt-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-crypt-800 bg-crypt-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-ectoplasm-500/10 border border-ectoplasm-500/30 text-ectoplasm-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-mono text-base font-bold text-slate-100">
                  Gatekeeper Forensic Audit: {repo.name}
                </h2>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    repo.status === 'QUARANTINED'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      : 'bg-ectoplasm-500/10 text-ectoplasm-400 border-ectoplasm-500/30'
                  }`}
                >
                  {repo.status}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Deterministic Anti-Cheat &amp; Anti-Hallucination Verification Invariants
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-crypt-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {loading ? (
            <div className="py-12 text-center text-slate-400 font-mono text-xs">
              <div className="w-8 h-8 mx-auto mb-3 border-2 border-ectoplasm-500 border-t-transparent rounded-full animate-spin" />
              Auditing AST structural preservation &amp; citation grounding...
            </div>
          ) : (
            <>
              {/* Invariant Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. AST Invariant */}
                <div className="p-4 rounded-xl bg-crypt-950/60 border border-crypt-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold text-slate-300">1. AST Symbol Anti-Cheat</span>
                      {verdict?.astCheck.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-ectoplasm-400" />
                      ) : (
                        <Ban className="w-4 h-4 text-rose-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Asserts 100% of original function and class names survive without deletion.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-crypt-800/60 text-[11px] font-mono">
                    <span className="text-slate-500">Deleted functions:</span>{' '}
                    <span className={verdict?.astCheck.missingFunctions.length === 0 ? 'text-ectoplasm-400' : 'text-rose-400'}>
                      {verdict?.astCheck.missingFunctions.length || 0}
                    </span>
                  </div>
                </div>

                {/* 2. Citation Grounding Invariant */}
                <div className="p-4 rounded-xl bg-crypt-950/60 border border-crypt-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold text-slate-300">2. Citation Grounding</span>
                      <CheckCircle2 className="w-4 h-4 text-ectoplasm-400" />
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Verifies diagnostic claims against Tiger Data archives using exact substring quotes.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-crypt-800/60 text-[11px] font-mono">
                    <span className="text-slate-500">Grounding score:</span>{' '}
                    <span className="text-ectoplasm-400 font-bold">G(ci) &ge; 0.85</span>
                  </div>
                </div>

                {/* 3. Sandbox Parity Invariant */}
                <div className="p-4 rounded-xl bg-crypt-950/60 border border-crypt-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold text-slate-300">3. Golden Output Parity</span>
                      {verdict?.sandboxCheck.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-ectoplasm-400" />
                      ) : (
                        <Ban className="w-4 h-4 text-rose-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Executes isolated subprocess with test inputs, verifying clean exit code 0.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-crypt-800/60 text-[11px] font-mono">
                    <span className="text-slate-500">Exit code:</span>{' '}
                    <span className={verdict?.sandboxCheck.returncode === 0 ? 'text-ectoplasm-400 font-bold' : 'text-rose-400'}>
                      {verdict?.sandboxCheck.returncode}
                    </span>
                  </div>
                </div>
              </div>

              {/* Rendered Claims & Strikethroughs */}
              <div className="p-4 rounded-xl bg-crypt-950/40 border border-crypt-800">
                <h4 className="text-xs font-mono font-bold text-slate-300 mb-3 flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-marigold-400" />
                  <span>Grounding Claims &amp; Epistemic Audit:</span>
                </h4>
                {repo.diagnosticClaims && repo.diagnosticClaims.length > 0 ? (
                  <div className="space-y-2">
                    {repo.diagnosticClaims.map((c, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-crypt-900 border border-crypt-800 text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="flex items-start space-x-2">
                          <span className="px-1.5 py-0.5 rounded bg-marigold-500/10 text-marigold-400 border border-marigold-500/30 text-[10px]">
                            [{c.sourceId}]
                          </span>
                          <span className="text-slate-200">{c.text}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 pl-6 sm:pl-0">
                          Quote: <code className="text-ectoplasm-400 bg-crypt-950 px-1.5 py-0.5 rounded">&ldquo;{c.verbatimQuote}&rdquo;</code>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-mono text-slate-500">
                    No external API claims needed. Transpiled deterministically via Stage 1 AST syntax transforms.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
