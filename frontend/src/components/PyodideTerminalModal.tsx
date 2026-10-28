import React, { useState, useEffect, useRef } from 'react';
import { Repository } from '../types';
import { X, Play, RotateCcw, Terminal, CheckCircle2, AlertTriangle, ShieldCheck, Cpu } from 'lucide-react';

interface PyodideTerminalModalProps {
  repo: Repository | null;
  onClose: () => void;
}

declare global {
  interface Window {
    loadPyodide?: any;
    _pyodideInstance?: any;
  }
}

export const PyodideTerminalModal: React.FC<PyodideTerminalModalProps> = ({
  repo,
  onClose,
}) => {
  const [output, setOutput] = useState<string>('');
  const [editableCode, setEditableCode] = useState<string>('');
  const [cliInput, setCliInput] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [pyodideLoaded, setPyodideLoaded] = useState<boolean>(false);
  const [pyodideStatus, setPyodideStatus] = useState<string>('Initializing WebAssembly runtime...');
  const [execDurationMs, setExecDurationMs] = useState<number | null>(null);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!repo) return;
    setEditableCode(repo.resurrectedPy3Code || '');
    setCliInput(repo.goldenInput || '');
    setOutput(`[PyLazarus WASM Arcade]\nReady to execute ${repo.name} in Pyodide (Python 3.12 WebAssembly).\nClick 'Execute in WASM' to run.`);
    setExecDurationMs(null);

    // Initialize Pyodide
    const initPyodide = async () => {
      try {
        if (!window.loadPyodide) {
          setPyodideStatus('Loading Pyodide v0.26.2 script from CDN...');
          // Check if script tag is loaded
          const checkInterval = setInterval(() => {
            if (window.loadPyodide) {
              clearInterval(checkInterval);
              initPyodide();
            }
          }, 300);
          return;
        }

        if (!window._pyodideInstance) {
          setPyodideStatus('Compiling Python 3.12 WebAssembly module...');
          window._pyodideInstance = await window.loadPyodide({
            indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/',
          });
        }
        setPyodideLoaded(true);
        setPyodideStatus('Pyodide v0.26.2 WebAssembly Ready');
      } catch (err: any) {
        setPyodideStatus(`Failed to initialize Pyodide: ${err.message}`);
      }
    };

    initPyodide();
  }, [repo]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [output]);

  if (!repo) return null;

  const handleRunWasm = async () => {
    if (!pyodideLoaded || !window._pyodideInstance) {
      setOutput((prev) => prev + '\n[Error] Pyodide WebAssembly is still initializing. Please wait...');
      return;
    }

    setIsRunning(true);
    const startTime = performance.now();
    const pyodide = window._pyodideInstance;
    let stdoutAccumulator = '';

    try {
      // Setup stdout/stderr capturing
      pyodide.setStdout({
        batched: (msg: string) => {
          stdoutAccumulator += msg + '\n';
        },
      });
      pyodide.setStderr({
        batched: (msg: string) => {
          stdoutAccumulator += `[STDERR] ${msg}\n`;
        },
      });

      // Isolate Python memory: invalidate cached polyfills and reset path
      const purgeScript = `
import sys
for mod in list(sys.modules.keys()):
    if mod == '_lazarus_polyfill' or mod.startswith('_lazarus_'):
        del sys.modules[mod]
if '/' not in sys.path:
    sys.path.insert(0, '/')
`;
      await pyodide.runPythonAsync(purgeScript);

      // If polyfill code exists, write it into virtual FS, otherwise clean up previous file
      if (repo.polyfillCode) {
        pyodide.FS.writeFile('/_lazarus_polyfill.py', repo.polyfillCode);
      } else {
        try {
          pyodide.FS.unlink('/_lazarus_polyfill.py');
        } catch (_) {}
      }

      // Configure sys.argv
      const args = cliInput.trim() ? cliInput.trim().split(/\s+/) : [];
      const setupScript = `
import sys
sys.argv = ['${repo.name}'] + ${JSON.stringify(args)}
`;
      await pyodide.runPythonAsync(setupScript);

      // Execute code
      await pyodide.runPythonAsync(editableCode);

      const elapsed = Math.round(performance.now() - startTime);
      setExecDurationMs(elapsed);

      setOutput(
        `$ python ${repo.name}.py ${cliInput}\n` +
        stdoutAccumulator +
        `\n[Exit Code: 0] Completed client-side in ${elapsed}ms inside Pyodide WASM sandbox.`
      );
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - startTime);
      setExecDurationMs(elapsed);
      const errMsg = err?.message || String(err);

      // Gracefully handle clean sys.exit(0) or sys.exit()
      if (
        errMsg.includes('SystemExit: 0') ||
        errMsg.includes('SystemExit: None') ||
        errMsg.endsWith('SystemExit:')
      ) {
        setOutput(
          `$ python ${repo.name}.py ${cliInput}\n` +
          stdoutAccumulator +
          `\n[Exit Code: 0] Clean termination (sys.exit) in ${elapsed}ms inside Pyodide WASM sandbox.`
        );
      } else {
        setOutput(
          `$ python ${repo.name}.py ${cliInput}\n` +
          stdoutAccumulator +
          `[Execution Error]:\n${errMsg}\n` +
          `\n[Terminated with Error in ${elapsed}ms]`
        );
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleResetCode = () => {
    setEditableCode(repo.resurrectedPy3Code || '');
    setCliInput(repo.goldenInput || '');
    setOutput('[Code restored to verified Gatekeeper snapshot]');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-crypt-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-5xl h-[88vh] bg-crypt-900 border border-crypt-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-crypt-800 bg-crypt-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-ectoplasm-500/10 border border-ectoplasm-500/30 text-ectoplasm-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-mono text-base font-bold text-slate-100">
                  {repo.name} &mdash; WebAssembly Arcade
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-ectoplasm-500/10 text-ectoplasm-400 border border-ectoplasm-500/30">
                  Pyodide v0.26.2
                </span>
              </div>
              <p className="text-xs text-slate-400">
                100% Client-Side In-Browser Sandbox &bull; Zero Server Compute Used
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-2 text-xs font-mono text-slate-400">
              <span className={`w-2 h-2 rounded-full ${pyodideLoaded ? 'bg-ectoplasm-400' : 'bg-marigold-400 animate-ping'}`} />
              <span>{pyodideStatus}</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-crypt-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Split View */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-crypt-800 overflow-hidden">
          {/* Left: Code & Args Editor */}
          <div className="flex flex-col h-full bg-crypt-950/40 p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-slate-400 font-semibold flex items-center space-x-1.5">
                <span>Resurrected Python 3 Code</span>
                {repo.polyfillCode && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30">
                    + _lazarus_polyfill.py
                  </span>
                )}
              </span>
              <button
                onClick={handleResetCode}
                className="text-xs font-mono text-slate-400 hover:text-slate-200 flex items-center space-x-1"
                title="Reset to default resurrected code"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            <textarea
              value={editableCode}
              onChange={(e) => setEditableCode(e.target.value)}
              spellCheck={false}
              className="flex-1 w-full bg-crypt-900 border border-crypt-800 rounded-xl p-3 font-mono text-xs text-slate-200 resize-none focus:outline-none focus:border-ectoplasm-500/50 leading-relaxed overflow-y-auto"
            />

            {/* CLI Argument Input */}
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-mono text-slate-400">
                  Command Line Arguments (sys.argv):
                </label>
                <div className="flex items-center space-x-1.5">
                  {repo.goldenInput && (
                    <button
                      onClick={() => setCliInput(repo.goldenInput || '')}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-crypt-850 hover:bg-crypt-800 text-ectoplasm-400 border border-crypt-700"
                    >
                      Default Test Input
                    </button>
                  )}
                  <button
                    onClick={() => setCliInput('--help')}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-crypt-850 hover:bg-crypt-800 text-slate-400 border border-crypt-700"
                  >
                    --help
                  </button>
                  <button
                    onClick={() => setCliInput('')}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-crypt-850 hover:bg-crypt-800 text-slate-500 border border-crypt-700"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={cliInput}
                onChange={(e) => setCliInput(e.target.value)}
                placeholder="e.g. --help, file.txt, or sample inputs"
                className="w-full bg-crypt-900 border border-crypt-800 rounded-lg px-3 py-1.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-ectoplasm-500/50"
              />
            </div>
          </div>

          {/* Right: CRT Terminal Display */}
          <div className="flex flex-col h-full bg-crypt-950 p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-ectoplasm-400 font-semibold flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-ectoplasm-400 animate-pulse" />
                <span>Virtual Phosphor Terminal</span>
              </span>
              {execDurationMs !== null && (
                <span className="text-xs font-mono text-slate-400">
                  Latency: <span className="text-ectoplasm-400 font-bold">{execDurationMs}ms</span>
                </span>
              )}
            </div>

            <div className="flex-1 crt-screen border border-crypt-800 rounded-xl p-4 overflow-y-auto font-mono text-xs text-ectoplasm-400 leading-relaxed whitespace-pre-wrap select-text">
              {output}
              <div ref={terminalEndRef} />
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="text-[11px] font-mono text-slate-500 hidden sm:block">
                Subprocess isolated from host filesystem
              </div>
              <button
                onClick={handleRunWasm}
                disabled={isRunning || !pyodideLoaded}
                className="w-full sm:w-auto px-6 py-2 rounded-xl font-mono text-xs font-bold bg-ectoplasm-500 text-crypt-950 hover:bg-ectoplasm-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2 shadow-lg shadow-ectoplasm-500/10 ml-auto"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{isRunning ? 'Executing in WASM...' : 'Execute in WASM'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
