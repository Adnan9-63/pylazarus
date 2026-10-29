# BREAK_LOG.md - PyLazarus QA & Reliability Audit Log

This document records every vulnerability, edge case, and crash vector discovered during the Phase 2 hostile penetration pass, along with root-cause analysis, the deterministic fix implemented, and the regression test guarding it.

---

### Incident 1: Windows Directory Traversal Arbitrary File Read (CWE-22 / CWE-23)
- **Component:** `backend/app.py` (`stream_audio_file` on `/api/audio/stream/{filename}`)
- **Vulnerability:** High / Security.
- **How It Broke:** Requesting `/api/audio/stream/..%5C..%5Cbackend%5Capp.py` escaped the `data/audio_cache/` directory on Windows systems, returning HTTP 200 with the full source code of `backend/app.py` and sensitive environment configurations.
- **Root Cause:** `os.path.join("data/audio_cache", filename)` did not sanitize backslashes (`\`) or verify that `os.path.abspath(file_path).startswith(cache_dir)`.
- **Fix:** Enforced `safe_name = os.path.basename(filename.replace("\\", "/"))`, required the `.mp3` extension, and asserted `os.path.abspath(file_path).startswith(cache_dir)`. Rejected traversal attempts with HTTP 400 Bad Request.
- **Regression Guard:** `eval/stress_test_phase2.py::Phase2HostileAttackSuite::test_attack_path_traversal_audio_stream`.

---

### Incident 2: Attribute Mismatch on Social Vigil Candle Lighting (HTTP 500)
- **Component:** `backend/app.py` (`feed_light_candle` on `/api/feed/light-candle/{repo_id}`)
- **Vulnerability:** Medium / Reliability & User Crash.
- **How It Broke:** Clicking "Light Vigil Candle" in the Social Crypt feed triggered an unhandled `AttributeError: 'SQLiteStorageEngine' object has no attribute 'record_vigil_light'`, causing an HTTP 500 error on the live interface.
- **Root Cause:** `app.py` called `storage.record_vigil_light(...)`, but the method in `storage.py` was named `log_vigil_action(...)`.
- **Fix:** Updated `app.py` to call `storage.log_vigil_action(...)` and added `record_vigil_light` as an alias on `StorageEngine`, `SQLiteStorageEngine`, and `PostgresTigerStorageEngine`.
- **Regression Guard:** `eval/stress_test_phase2.py::Phase2HostileAttackSuite::test_rapid_burst_vigil_candles`.

---

### Incident 3: Unhandled ValueError on Null-Byte Injections in AST Parser (DoS / 500)
- **Component:** `backend/gatekeeper.py` (`verify_ast_integrity`) and `backend/ast_transpiler.py` (`check_syntax_validity`)
- **Vulnerability:** Medium / Stability & Denial-of-Service.
- **How It Broke:** Passing strings containing null bytes (`\x00`) to the AST verifier or transpiler caused an unhandled `ValueError: source code cannot contain null bytes`, returning an unhandled HTTP 500 instead of a clean verification rejection.
- **Root Cause:** Both functions only trapped `except SyntaxError:` during `ast.parse()`, failing to catch `ValueError`.
- **Fix:** Extended exception handling to `except (SyntaxError, ValueError) as e:` and treated null-byte payloads as deterministic AST parse rejections (`passed=False`).
- **Regression Guard:** `eval/stress_test_phase2.py::Phase2HostileAttackSuite::test_attack_null_bytes`.

---

### Incident 4: Quoted CLI Arguments Broken in Subprocess Sandbox
- **Component:** `backend/gatekeeper.py` (`verify_sandbox_execution`)
- **Vulnerability:** Low / Functional Correctness.
- **How It Broke:** When `golden_test_input` contained quoted arguments (e.g. `--message "hello world"`), the string split naively into `['--message', '"hello', 'world"']`, causing CLI argument parsers (`argparse`, `sys.argv`) to misparse arguments.
- **Root Cause:** `golden_test_input.strip().split()` splits unconditionally on whitespace, disregarding POSIX shell quoting semantics.
- **Fix:** Switched argument splitting to `shlex.split(golden_test_input.strip())` with a graceful fallback to `.split()`.
- **Regression Guard:** `eval/stress_test_phase2.py::Phase2HostileAttackSuite::test_quoted_cli_arguments_in_sandbox`.

---

### Incident 5: HTML Injection / Reflected XSS Risk in Epistemic Audit HTML
- **Component:** `backend/gatekeeper.py` (`verify_claims_deterministically`)
- **Vulnerability:** Medium / Security (XSS).
- **How It Broke:** Diagnostic claim text and failure reason badges were interpolated directly into raw HTML strings (`rendered_audit_html`) without character escaping. Any payload with `<script>` or `<img onerror=...>` would be reflected downstream.
- **Root Cause:** Missing `html.escape()` sanitization before string formatting.
- **Fix:** Sanitized all claim text and failure reason strings with `html.escape()` prior to assembling the HTML audit string.
- **Regression Guard:** `eval/stress_test_phase2.py::Phase2HostileAttackSuite::test_attack_xss_in_claim_audit`.

---

### Incident 6: Unbounded Request Body Size (Memory Exhaustion / DoS)
- **Component:** `backend/app.py` (Pydantic schemas)
- **Vulnerability:** Medium / DoS.
- **How It Broke:** No upper length constraints were specified on Pydantic request models (`SandboxExecuteRequest`, `GatekeeperVerifyRequest`, `ResurrectRequest`), allowing unbounded multi-megabyte payloads to be parsed into memory.
- **Root Cause:** Unconstrained `str` types without Pydantic `Field(..., max_length=...)`.
- **Fix:** Bound code inputs to 1 MB max, argument strings to 10 KB max, and clamped execution timeouts strictly between 0.5s and 10.0s.
- **Regression Guard:** `eval/stress_test_phase2.py::Phase2HostileAttackSuite::test_attack_oversized_payload_rejected`.
