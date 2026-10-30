# 📋 Hacktoberfest 2026 Submission Pre-Flight Checklist

Use this checklist before publishing the DEV.to post and submitting to the official challenge portal.

---

### Phase 1: Repository & Licensing
- [x] **Public GitHub Repository:** `https://github.com/Adnan9-63/pylazarus` is public.
- [x] **OSI-Approved License:** Root [`LICENSE`](../LICENSE) contains standard MIT license text.
- [x] **Creation Dates Validated:** First commit was made on **October 28, 2026** (well inside the Oct 26-31 Hacktoberfest Week 4 window).
- [x] **Zero Committed Secrets:** No API keys, passwords, or private certificates committed in git history (verified via automated scan).
- [x] **Clean .gitignore & .gitattributes:** Enforces LF line endings across platforms and ignores virtual environments and local databases.

---

### Phase 2: Open-Source AI Compliance
- [x] **No Closed-API Dependencies for Core Logic:** Runs with local `gemma4:e4b` (Ollama) or zero-latency offline Replay fixtures.
- [x] **Hardware Tiers Documented:** Includes low-RAM CPU fallback (`gemma2:2b`) and zero-RAM offline Replay Mode.
- [x] **Deterministic Anti-Cheating Invariants:** [`backend/gatekeeper.py`](../backend/gatekeeper.py) enforces AST symbol preservation and citation grounding.

---

### Phase 3: Reliability & Test Suite
- [x] **Startup Preflight Self-Check:** [`python backend/self_check.py`](../backend/self_check.py) exits 0 with all green checks.
- [x] **Unit & Security Tests:** `python -m unittest discover -s tests -p "test_*.py"` passes (35/35 tests passing).
- [x] **Hostile Penetration Suite:** `python -m unittest eval/stress_test_phase2.py` passes all 12 attack vectors (XSS, path traversal, concurrency).
- [x] **Automated CI Workflow:** [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) configured for GitHub Actions.
- [x] **Documented Incident Log:** [`BREAK_LOG.md`](../BREAK_LOG.md) documents all 6 real-world failure modes found during stress testing.

---

### Phase 4: Final Submission Actions (For Adnan)
- [x] **Complete Narrative Written:** All personal reflections and agent session stories are written and refined in [`/submission/POST_DRAFT.md`](POST_DRAFT.md).
- [ ] **Publish DEV Post:** Create new post on [dev.to/new](https://dev.to/new) using `POST_DRAFT.md` (or publish the staged draft via DevRelay) with tags `devchallenge` and `hf26challenge`.
- [ ] **Confirm Deadline:** Ensure post is published before **October 31, 2026 at 11:59 PM PDT**.
