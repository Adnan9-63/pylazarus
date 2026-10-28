export interface Repository {
  id: string;
  name: string;
  category: 'syntax_bitrot' | 'semantic_api_bitrot' | 'unfixable_c_abi';
  originalAuthor: string;
  originalLicense: string;
  lastCommitYear: number;
  starsAtAbandonment: number;
  description: string;
  deadPy2Code: string;
  resurrectedPy3Code: string | null;
  polyfillCode?: string;
  status: 'RESURRECTED' | 'QUARANTINED' | 'UNDER_AUTOPSY';
  viabilityScore: number;
  resurrectionDurationMs: number;
  vigilCandlesCount: number;
  audioAutopsyUrl?: string;
  forensicEulogy?: string;
  goldenInput?: string;
  expectedStdout?: string;
  diagnosticClaims?: Array<{
    text: string;
    sourceId: string;
    verbatimQuote: string;
    lineNumber: number;
  }>;
}

export interface GatekeeperVerdict {
  passed: boolean;
  status: 'VERIFIED' | 'REJECTED_CHEAT' | 'REJECTED_HALLUCINATION' | 'QUARANTINED';
  astCheck: {
    passed: boolean;
    missingFunctions: string[];
    missingClasses: string[];
    forbiddenCalls: string[];
    syntaxError?: string;
  };
  sandboxCheck: {
    passed: boolean;
    returncode: number;
    stdout: string;
    stderr: string;
    executionMs: number;
  };
  renderedHtml: string;
  claimsTotal: number;
  claimsVerified: number;
  claimsStruck: number;
}

export interface TraceSpan {
  trace_id: string;
  span_name: string;
  parent_span_id: string | null;
  model: string;
  latency_ms: number;
  pii_sanitized: boolean;
  status: string;
}

export interface TemporalDrill {
  status: string;
  drill_type: string;
  target_workflow: string;
  crash_timestamp_iso: string;
  recovery_timestamp_iso: string;
  checkpoint_resumed: number;
  duplicated_db_writes: number;
  verification_parity: string;
}
