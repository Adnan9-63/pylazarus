import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Terminal } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error inside PyLazarus UI:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-crypt-950 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-xl w-full bg-crypt-900 border border-red-500/40 rounded-2xl p-8 shadow-2xl space-y-6">
            <div className="flex items-center space-x-3 text-red-400">
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-xl font-bold font-mono">Forensic Crash Protection Intercepted</h1>
                <p className="text-xs text-slate-400">Deterministic UI Error Boundary</p>
              </div>
            </div>

            <p className="text-sm text-slate-300">
              An unexpected client-side rendering exception was trapped by the PyLazarus Guard.
              The underlying WASM runtime and server APIs remain safe.
            </p>

            <div className="p-4 rounded-xl bg-crypt-950 border border-crypt-800 font-mono text-xs text-red-300 overflow-x-auto max-h-48">
              <div className="font-bold text-red-400 mb-1 flex items-center space-x-2">
                <Terminal className="w-4 h-4" />
                <span>{this.state.error?.name || 'Error'}: {this.state.error?.message}</span>
              </div>
              {this.state.errorInfo?.componentStack && (
                <pre className="text-[11px] text-slate-500 whitespace-pre-wrap mt-2">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500 font-mono">PyLazarus v1.0.0</span>
              <button
                onClick={this.handleReset}
                className="flex items-center space-x-2 px-4 py-2 bg-ectoplasm-500 hover:bg-ectoplasm-400 text-crypt-950 font-semibold font-mono text-xs rounded-xl shadow-lg transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Crypt Workspace</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
