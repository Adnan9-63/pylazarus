"""
backend/gatekeeper.py - Stage 3: Deterministic Resurrection Gatekeeper

Enforces 4 strict Invariants before accepting any AI resurrection patch:
1. AST Symbol Preservation Invariant: Verifies that 100% of function and class names
   from the original Python 2 source remain intact in the patch (catching "LLM Cheating"
   where failing functions/tests are silently deleted).
2. Zero-Forbidden-Syscall Security Guard: Walks the AST to reject eval, exec, os.system,
   os.popen, or subprocess with shell=True.
3. Citation & 5-Char Content Stem Grounding Invariant: Verifies that every diagnostic claim
   cites an authentic source ([W1], [P1]), contains a character-for-character verbatim quote
   (>=8 chars), exact numbers/years/versions, and achieves G(c_i) >= 0.85 stem grounding.
   Hallucinations are rendered with <del class="claim-struck">.
4. Sandboxed Execution & Golden Output Parity: Runs the patched code in an isolated
   subprocess sandbox against test inputs to verify returncode == 0 and golden stdout match.
"""

from __future__ import annotations

import ast
import os
import re
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple

from backend.storage import ArchiveExcerpt

# Allowed technical framing words that do not require source text appearance
ALLOWED_TECHNICAL_FRAMING: Set[str] = {
    "deprecated", "replaced", "module", "function", "python", "polyfill",
    "resurrected", "snapshot", "line", "import", "version", "syntax",
    "removed", "builtin", "stdlib", "library", "release", "archived",
    "package", "method", "class", "attribute", "error", "exception"
}

FORBIDDEN_CALLS: Set[str] = {
    "eval", "exec", "os.system", "os.popen", "posix.system"
}


@dataclass
class DiagnosticClaim:
    text: str
    source_id: str
    verbatim_quote: str
    line_number: int = 1


@dataclass
class ASTVerificationResult:
    passed: bool
    original_functions: List[str]
    surviving_functions: List[str]
    missing_functions: List[str]
    original_classes: List[str]
    surviving_classes: List[str]
    missing_classes: List[str]
    forbidden_calls: List[str]
    syntax_error: Optional[str] = None


@dataclass
class SandboxTestResult:
    passed: bool
    returncode: int
    stdout: str
    stderr: str
    expected_stdout: str
    execution_ms: float
    timed_out: bool = False


@dataclass
class ClaimAuditResult:
    claim: DiagnosticClaim
    passed: bool
    grounding_score: float
    failure_reasons: List[str] = field(default_factory=list)
    unverified_tokens: List[str] = field(default_factory=list)
    html_rendered: str = ""


@dataclass
class GatekeeperVerdict:
    passed: bool
    status: str  # "VERIFIED", "REJECTED_CHEAT", "REJECTED_HALLUCINATION", "QUARANTINED"
    ast_check: ASTVerificationResult
    sandbox_check: SandboxTestResult
    rendered_audit_html: str
    claims_total: int
    claims_verified: int
    claims_struck: int
    retry_feedback_prompt: Optional[str] = None
    claim_audits: List[ClaimAuditResult] = field(default_factory=list)


def _normalize_text_for_quote(text: str) -> str:
    """Normalizes whitespace and punctuation for character-accurate quote verification."""
    cleaned = re.sub(r"[^\w\s]", " ", text.lower())
    return re.sub(r"\s+", " ", cleaned).strip()


def _stem5(word: str) -> str:
    """Deterministic prefix stemmer stripping common English suffixes."""
    w = re.sub(r"[^\w]", "", word.lower())
    for suffix in ("ingly", "edly", "ments", "ment", "ness", "tion", "sion", "ing", "ed", "es", "s"):
        if len(w) > len(suffix) + 3 and w.endswith(suffix):
            w = w[:-len(suffix)]
            break
    return w[:5]


def _extract_numbers_and_versions(text: str) -> Set[str]:
    """Extracts numbers, versions (e.g. 2.7, 3.12), and HTTP status codes."""
    matches = re.findall(r"\b\d+(?:\.\d+)*\b", text)
    return set(matches)


# ============================================================================
# Check 1: AST Structural Verification & Security Guard
# ============================================================================

class _SymbolAndSyscallVisitor(ast.NodeVisitor):
    def __init__(self):
        self.functions: List[str] = []
        self.classes: List[str] = []
        self.forbidden_calls: List[str] = []

    def visit_FunctionDef(self, node: ast.FunctionDef):
        self.functions.append(node.name)
        self.generic_visit(node)

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef):
        self.functions.append(node.name)
        self.generic_visit(node)

    def visit_ClassDef(self, node: ast.ClassDef):
        self.classes.append(node.name)
        self.generic_visit(node)

    def visit_Call(self, node: ast.Call):
        # Detect forbidden calls like eval(), exec(), os.system()
        call_name = ""
        if isinstance(node.func, ast.Name):
            call_name = node.func.id
        elif isinstance(node.func, ast.Attribute):
            val = node.func.value
            if isinstance(val, ast.Name):
                call_name = f"{val.id}.{node.func.attr}"
            else:
                call_name = node.func.attr

        if call_name in FORBIDDEN_CALLS:
            self.forbidden_calls.append(call_name)

        # Detect subprocess with shell=True
        if call_name.startswith("subprocess.") or call_name == "subprocess.Popen":
            for kw in node.keywords:
                if kw.arg == "shell" and isinstance(kw.value, ast.Constant) and kw.value.value is True:
                    self.forbidden_calls.append(f"{call_name}(shell=True)")

        self.generic_visit(node)


def verify_ast_integrity(py2_source: str, py3_patched: str) -> ASTVerificationResult:
    """
    Parses both ASTs and verifies that:
    1. py3_patched parses cleanly.
    2. Zero function or class definitions were deleted.
    3. Zero forbidden syscalls were introduced.
    """
    try:
        py3_tree = ast.parse(py3_patched)
    except SyntaxError as e:
        return ASTVerificationResult(
            passed=False,
            original_functions=[],
            surviving_functions=[],
            missing_functions=[],
            original_classes=[],
            surviving_classes=[],
            missing_classes=[],
            forbidden_calls=[],
            syntax_error=f"SyntaxError at line {e.lineno}: {e.msg}",
        )

    # Extract symbols from py2_source (falling back to regex if py2 has syntax errors under py3)
    orig_functions: List[str] = []
    orig_classes: List[str] = []
    try:
        py2_tree = ast.parse(py2_source)
        v_orig = _SymbolAndSyscallVisitor()
        v_orig.visit(py2_tree)
        orig_functions = v_orig.functions
        orig_classes = v_orig.classes
    except SyntaxError:
        # Regex extraction fallback for un-transpiled Python 2 source
        orig_functions = re.findall(r"^\s*def\s+([a-zA-Z_]\w*)\s*\(", py2_source, re.MULTILINE)
        orig_classes = re.findall(r"^\s*class\s+([a-zA-Z_]\w*)\s*[\(:]", py2_source, re.MULTILINE)

    v_patched = _SymbolAndSyscallVisitor()
    v_patched.visit(py3_tree)

    surviving_funcs = v_patched.functions
    missing_funcs = [f for f in orig_functions if f not in surviving_funcs]

    surviving_classes = v_patched.classes
    missing_classes = [c for c in orig_classes if c not in surviving_classes]

    forbidden = v_patched.forbidden_calls

    passed = (len(missing_funcs) == 0 and len(missing_classes) == 0 and len(forbidden) == 0)

    return ASTVerificationResult(
        passed=passed,
        original_functions=orig_functions,
        surviving_functions=surviving_funcs,
        missing_functions=missing_funcs,
        original_classes=orig_classes,
        surviving_classes=surviving_classes,
        missing_classes=missing_classes,
        forbidden_calls=forbidden,
        syntax_error=None,
    )


# ============================================================================
# Check 2 & 3: Citation Grounding & Lexical Stem Verification
# ============================================================================

def verify_claims_deterministically(
    claims: List[DiagnosticClaim],
    excerpts: List[ArchiveExcerpt],
    min_stem_ratio: float = 0.85,
) -> Tuple[List[ClaimAuditResult], int, int, str]:
    """
    Verifies every LLM claim against retrieved Wayback and migration excerpts.
    Returns:
        (audits, claims_verified, claims_struck, rendered_html)
    """
    if not claims:
        return [], 0, 0, "<p class='no-claims'><em>No diagnostic claims submitted.</em></p>"

    excerpt_map: Dict[str, ArchiveExcerpt] = {e.id: e for e in excerpts}
    all_source_text = " ".join(f"{e.title} {e.body}" for e in excerpts)
    source_stems: Set[str] = {
        _stem5(tok) for tok in re.findall(r"\b\w{3,}\b", all_source_text)
    }

    audits: List[ClaimAuditResult] = []
    html_parts: List[str] = []

    for claim in claims:
        reasons: List[str] = []
        bad_tokens: List[str] = []

        source_excerpt = excerpt_map.get(claim.source_id)

        # Check 2a: Valid Citation ID
        if source_excerpt is None:
            reasons.append(f"CITED_MISSING_SOURCE_ID:{claim.source_id}")
        else:
            # Check 2b: Verbatim Quote Substring Match
            norm_quote = _normalize_text_for_quote(claim.verbatim_quote)
            norm_source = _normalize_text_for_quote(f"{source_excerpt.title} {source_excerpt.body}")
            if len(norm_quote) < 8 or norm_quote not in norm_source:
                reasons.append("VERBATIM_QUOTE_NOT_FOUND_IN_SOURCE")
                bad_tokens.append(claim.verbatim_quote)

            # Check 3a: Numerical & Version Exactness
            claim_nums = _extract_numbers_and_versions(claim.text)
            source_nums = _extract_numbers_and_versions(f"{source_excerpt.title} {source_excerpt.body} {source_excerpt.recorded_date}")
            unverified_nums = claim_nums - source_nums
            if unverified_nums:
                reasons.append(f"UNVERIFIED_NUMBERS:{sorted(unverified_nums)}")
                bad_tokens.extend(sorted(unverified_nums))

            # Check 3b: 5-Character Content Word Stem Grounding Ratio
            content_words = [
                w for w in re.findall(r"\b[a-zA-Z]{4,}\b", claim.text.lower())
                if w not in ALLOWED_TECHNICAL_FRAMING and _stem5(w) not in {_stem5(fw) for fw in ALLOWED_TECHNICAL_FRAMING}
            ]
            matched_words = [w for w in content_words if _stem5(w) in source_stems]
            unmatched_words = [w for w in content_words if _stem5(w) not in source_stems]
            stem_ratio = (len(matched_words) / len(content_words)) if content_words else 1.0

            if stem_ratio < min_stem_ratio:
                reasons.append(f"LOW_STEM_GROUNDING:{stem_ratio:.2f}<{min_stem_ratio}")
                bad_tokens.extend(unmatched_words)
        stem_ratio_val = stem_ratio if 'stem_ratio' in locals() else 0.0

        passed = (len(reasons) == 0)

        if passed and source_excerpt is not None:
            rendered = (
                f"<span class='claim-verified'>{claim.text.strip()} "
                f"<span class='citation-badge' data-source='{source_excerpt.id}'>[{source_excerpt.id}]</span></span>"
            )
        else:
            reason_badge = ", ".join(reasons)
            rendered = (
                f"<del class='claim-struck' title='Blocked by Gatekeeper: {reason_badge}'>"
                f"{claim.text.strip()}</del> <span class='gatekeeper-flag'>[Gatekeeper Struck: {reason_badge}]</span>"
            )

        html_parts.append(rendered)
        audits.append(ClaimAuditResult(
            claim=claim,
            passed=passed,
            grounding_score=round(stem_ratio_val, 3),
            failure_reasons=reasons,
            unverified_tokens=bad_tokens,
            html_rendered=rendered,
        ))

    claims_verified = sum(1 for a in audits if a.passed)
    claims_struck = len(audits) - claims_verified
    rendered_audit_html = " ".join(html_parts)

    return audits, claims_verified, claims_struck, rendered_audit_html


# ============================================================================
# Check 4: Sandboxed Execution & Golden Output Parity
# ============================================================================

def verify_sandbox_execution(
    py3_patched: str,
    golden_test_input: str,
    expected_stdout: str,
    timeout: float = 4.0,
) -> SandboxTestResult:
    """
    Executes py3_patched inside a restricted subprocess sandbox with timeout.
    Asserts returncode == 0 and expected_stdout is present in stdout.
    """
    start_time = time.perf_counter()
    with tempfile.TemporaryDirectory(prefix="lazarus_sandbox_") as tmp_dir:
        script_path = os.path.join(tmp_dir, "resurrected_tool.py")
        with open(script_path, "w", encoding="utf-8") as f:
            f.write(py3_patched)

        # Build clean environment with sandboxed PYTHONPATH
        env = os.environ.copy()
        env["PYTHONDONTWRITEBYTECODE"] = "1"
        env["PYTHONIOENCODING"] = "utf-8"

        cmd = [sys.executable, "-I", script_path]
        if golden_test_input.strip():
            cmd.extend(golden_test_input.strip().split())

        try:
            proc = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout,
                cwd=tmp_dir,
                env=env,
            )
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            stdout_clean = proc.stdout.strip()
            expected_clean = expected_stdout.strip()

            passed = (proc.returncode == 0 and expected_clean in stdout_clean)
            return SandboxTestResult(
                passed=passed,
                returncode=proc.returncode,
                stdout=stdout_clean,
                stderr=proc.stderr.strip(),
                expected_stdout=expected_clean,
                execution_ms=round(elapsed_ms, 2),
                timed_out=False,
            )
        except subprocess.TimeoutExpired:
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            return SandboxTestResult(
                passed=False,
                returncode=-1,
                stdout="",
                stderr=f"Execution timed out after {timeout} seconds",
                expected_stdout=expected_stdout.strip(),
                execution_ms=round(elapsed_ms, 2),
                timed_out=True,
            )
        except Exception as e:
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            return SandboxTestResult(
                passed=False,
                returncode=-1,
                stdout="",
                stderr=str(e),
                expected_stdout=expected_stdout.strip(),
                execution_ms=round(elapsed_ms, 2),
                timed_out=False,
            )


# ============================================================================
# Main Gatekeeper Auditor
# ============================================================================

def audit_resurrection(
    py2_source: str,
    py3_patched: str,
    claims: List[DiagnosticClaim],
    excerpts: List[ArchiveExcerpt],
    golden_test_input: str,
    expected_stdout: str,
) -> GatekeeperVerdict:
    """
    Executes the complete 4-stage Gatekeeper verification suite.
    """
    # 1. AST Structural Verification
    ast_res = verify_ast_integrity(py2_source, py3_patched)
    if not ast_res.passed:
        failure_msg = ""
        if ast_res.missing_functions:
            failure_msg = f"CHEAT_DETECTED_DELETED_FUNCTIONS:{ast_res.missing_functions}"
        elif ast_res.missing_classes:
            failure_msg = f"CHEAT_DETECTED_DELETED_CLASSES:{ast_res.missing_classes}"
        elif ast_res.forbidden_calls:
            failure_msg = f"FORBIDDEN_SYSCALL_DETECTED:{ast_res.forbidden_calls}"
        elif ast_res.syntax_error:
            failure_msg = f"SYNTAX_ERROR:{ast_res.syntax_error}"

        return GatekeeperVerdict(
            passed=False,
            status="REJECTED_CHEAT",
            ast_check=ast_res,
            sandbox_check=SandboxTestResult(False, -1, "", failure_msg, expected_stdout, 0.0),
            rendered_audit_html=f"<p class='gatekeeper-cheat-alert'><strong>Blocked by Gatekeeper:</strong> {failure_msg}</p>",
            claims_total=len(claims),
            claims_verified=0,
            claims_struck=len(claims),
            retry_feedback_prompt=f"Do NOT delete any original functions or classes. You deleted: {ast_res.missing_functions or ast_res.missing_classes}.",
            claim_audits=[],
        )

    # 2. Citation & Lexical Stem Grounding Verification
    audits, claims_verified, claims_struck, rendered_html = verify_claims_deterministically(claims, excerpts)
    if claims and claims_struck > 0:
        # Prompt feedback hint for retry
        retry_hint = f"Your draft contained {claims_struck} unverified claim(s). Copy ONLY exact substrings into verbatim_quote."
    else:
        retry_hint = None

    # 3. Sandbox Execution Verification
    sandbox_res = verify_sandbox_execution(py3_patched, golden_test_input, expected_stdout)

    overall_passed = ast_res.passed and sandbox_res.passed and (claims_struck == 0 or len(claims) == 0)
    status = "VERIFIED" if overall_passed else ("REJECTED_HALLUCINATION" if claims_struck > 0 else "QUARANTINED")

    return GatekeeperVerdict(
        passed=overall_passed,
        status=status,
        ast_check=ast_res,
        sandbox_check=sandbox_res,
        rendered_audit_html=rendered_html,
        claims_total=len(claims),
        claims_verified=claims_verified,
        claims_struck=claims_struck,
        retry_feedback_prompt=retry_hint,
        claim_audits=audits,
    )
