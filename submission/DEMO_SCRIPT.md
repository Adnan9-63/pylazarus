# 🎬 PyLazarus 60-90s Video Demo Script

This script provides an exact, reproducible 90-second walk-through for judging review, social showcase, or live hackathon demo.

---

### Timing Breakdown (Total: 75 Seconds)

#### 0:00 - 0:15 | The Hook (The Ghost in the Machine)
- **Visual:** Open browser to `http://127.0.0.1:8000`. The **Living Crypt** feed is visible with dark tombstone cards, glowing neon green ("Ectoplasm"), and candle counts.
- **Action:** Scroll through the 18 abandoned repositories (showing dates: 2008, 2009, 2011).
- **Voiceover:**
  > *"Between 2005 and 2015, thousands of brilliant open-source Python tools were created. When Python 2 died, they became ghosts trapped in bitrot. This is PyLazarus: the abandonware resurrection engine and living WebAssembly arcade."*

#### 0:15 - 0:35 | The Resurrection & The Gatekeeper
- **Visual:** Hover over `ascii-dungeon-2009` or `shorturl_cli`.
- **Action:** Click **"Inspect Time Diff & AST Surgery"**.
- **Visual:** Modal opens showing the original Python 2 code side-by-side with the resurrected Python 3 code. Point out the Stage 1 deterministic AST syntax transform (`print` statements and `urllib2` imports).
- **Action:** Click **"View Gatekeeper Invariants"**. Show the 4 green invariant checks: AST symbol preservation (0 functions deleted), Zero forbidden syscalls, and Citation Grounding.
- **Voiceover:**
  > *"We don't trust LLMs to rewrite code unverified. Our 3-stage pipeline uses deterministic AST transpilation in under 15ms, Tiger Data hybrid vector retrieval, and local Gemma 4 open-weights. The Deterministic Gatekeeper guarantees not a single original function or test assertion is deleted."*

#### 0:35 - 0:55 | The WebAssembly Arcade (Zero Server Compute)
- **Visual:** Click **"Execute in WebAssembly (Pyodide)"**.
- **Visual:** Terminal modal opens displaying Pyodide v0.26.2.
- **Action:** Click the preset button `--seed 42` or type custom CLI flags.
- **Action:** Click **"Run in Pyodide WASM"**. The terminal instantly displays the executed game output / CLI results with `[Exit Code: 0]` in under 20ms.
- **Voiceover:**
  > *"Because PyLazarus embeds Pyodide—Python 3.12 compiled to WebAssembly—visitors can run, edit, fork, and remix 15-year-old software directly inside their browser at zero server compute cost."*

#### 0:55 - 1:15 | Community Vigil & Audio Autopsy
- **Visual:** Click **"Audio Autopsy"** on the card.
- **Action:** Hear the solemn technical narrative explaining the historical autopsy of why the tool died in 2011.
- **Action:** Click **"Light Vigil Candle"**. The candle counter increments live in SQLite WAL storage.
- **Voiceover:**
  > *"Visitors can hear an audio autopsy narrated by ElevenLabs and light a vigil candle to honor software history. 100% open-weight, fully reproducible, and built for Hacktoberfest 2026."*

---

### Plan B: Live Demo Fallback Matrix

If presenting live on stage or over a conference call with flaky internet:

| Failure Mode | Root Cause | Instant Fallback Action |
| :--- | :--- | :--- |
| **Ollama daemon offline** | Laptop restarted or low RAM | Leave `DEFAULT_REPLAY_MODE=true` in `.env`. Pre-computed 768-d vectors and Gemma 4 drafts execute live through the Gatekeeper with `<40ms` latency. |
| **Pyodide WASM CDN fails to load** | Strict corporate firewall or offline Wi-Fi | The UI displays an informative notice; switch to the server-side **"Sandbox Pytest Parity"** tab which executes inside the local Python 3 subprocess sandbox in 12ms. |
| **Microphone or Audio playback issue** | Browser audio permissions blocked | The forensic eulogy is displayed in full text inside the modal; browser native `speechSynthesis` operates without external network. |
| **Hard Hardware Crash** | Laptop battery dies | Show the pre-recorded 1080p demonstration video stored at `/assets/demo_recording.mp4` or your YouTube unlisted link. |
