import React, { useState, useEffect } from 'react';
import { Repository } from './types';
import { Navbar } from './components/Navbar';
import { StatsBanner } from './components/StatsBanner';
import { RepositoryCard } from './components/RepositoryCard';
import { PyodideTerminalModal } from './components/PyodideTerminalModal';
import { DiffViewerModal } from './components/DiffViewerModal';
import { GatekeeperModal } from './components/GatekeeperModal';
import { AudioAutopsyPlayer } from './components/AudioAutopsyPlayer';
import { TabPFNModal } from './components/TabPFNModal';
import { SentryWaterfallModal } from './components/SentryWaterfallModal';
import { TemporalDrillModal } from './components/TemporalDrillModal';
import { BenchmarkModal } from './components/BenchmarkModal';
import { Filter, Search, Ghost, Heart } from 'lucide-react';

export const App: React.FC = () => {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active Modals
  const [activeWasmRepo, setActiveWasmRepo] = useState<Repository | null>(null);
  const [activeDiffRepo, setActiveDiffRepo] = useState<Repository | null>(null);
  const [activeGatekeeperRepo, setActiveGatekeeperRepo] = useState<Repository | null>(null);
  const [activeAudioRepo, setActiveAudioRepo] = useState<Repository | null>(null);
  const [activeTabPFNRepo, setActiveTabPFNRepo] = useState<Repository | null>(null);
  const [isSentryOpen, setIsSentryOpen] = useState<boolean>(false);
  const [isTemporalOpen, setIsTemporalOpen] = useState<boolean>(false);
  const [isBenchmarkOpen, setIsBenchmarkOpen] = useState<boolean>(false);

  useEffect(() => {
    const fetchCryptFeed = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/feed/crypt');
        if (res.ok) {
          const data = await res.json();
          const items: Repository[] = (data.items || []).map((item: any) => ({
            id: item.id,
            name: item.name,
            category: item.category,
            originalAuthor: item.original_author || item.originalAuthor,
            originalLicense: item.original_license || item.originalLicense,
            lastCommitYear: item.last_commit_year || item.lastCommitYear,
            starsAtAbandonment: item.stars_at_abandonment || item.starsAtAbandonment || 0,
            description: item.description,
            deadPy2Code: item.dead_py2_code || item.deadPy2Code,
            resurrectedPy3Code: item.resurrected_py3_code ?? item.resurrectedPy3Code ?? null,
            polyfillCode: item.polyfill_code || item.polyfillCode,
            status: item.status,
            viabilityScore: item.viability_score ?? item.viabilityScore ?? 0.85,
            resurrectionDurationMs: item.resurrection_duration_ms ?? item.resurrectionDurationMs ?? 250,
            vigilCandlesCount: item.vigil_candles_count ?? item.vigilCandlesCount ?? 0,
            audioAutopsyUrl: item.audio_autopsy_url || item.audioAutopsyUrl,
            forensicEulogy: item.forensic_eulogy || item.forensicEulogy,
            goldenInput: item.golden_test_input || item.goldenInput,
            expectedStdout: item.expected_stdout || item.expectedStdout,
            diagnosticClaims: (item.diagnostic_claims || []).map((c: any) => ({
              text: c.text,
              sourceId: c.source_id || c.sourceId,
              verbatimQuote: c.verbatim_quote || c.verbatimQuote,
              lineNumber: c.line_number || c.lineNumber || 1,
            })),
          }));
          setRepos(items);
        }
      } catch (err) {
        console.error('Error fetching crypt feed:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCryptFeed();
  }, []);

  const handleLightCandle = async (repoId: string) => {
    // Optimistic UI update
    setRepos((prev) =>
      prev.map((r) =>
        r.id === repoId ? { ...r, vigilCandlesCount: r.vigilCandlesCount + 1 } : r
      )
    );

    try {
      await fetch(`/api/feed/light-candle/${repoId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prayer_text: 'Honored in the Día de los Muertos Living Crypt 2026',
        }),
      });
    } catch (e) {
      console.error('Failed to persist candle to TimescaleDB:', e);
    }
  };

  const filteredRepos = repos.filter((r) => {
    const matchesCategory =
      filterCategory === 'all' || r.category === filterCategory;
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.originalAuthor.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalCandles = repos.reduce((acc, r) => acc + (r.vigilCandlesCount || 0), 0);
  const resurrectedCount = repos.filter((r) => r.status === 'RESURRECTED').length;
  const quarantinedCount = repos.filter((r) => r.status === 'QUARANTINED').length;

  return (
    <div className="min-h-screen flex flex-col bg-crypt-950 text-slate-100">
      <Navbar
        onOpenSentry={() => setIsSentryOpen(true)}
        onOpenTemporal={() => setIsTemporalOpen(true)}
        onOpenBenchmark={() => setIsBenchmarkOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <StatsBanner
          totalRepos={repos.length}
          resurrectedCount={resurrectedCount}
          quarantinedCount={quarantinedCount}
          totalCandles={totalCandles}
        />

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 sm:pb-0">
            {[
              { id: 'all', label: 'All Artifacts (18)' },
              { id: 'syntax_bitrot', label: 'Syntax Bitrot (8)' },
              { id: 'semantic_api_bitrot', label: 'Semantic API Bitrot (8)' },
              { id: 'unfixable_c_abi', label: 'Quarantined C-ABI (2)' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterCategory(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono whitespace-nowrap transition-all border ${
                  filterCategory === tab.id
                    ? 'bg-ectoplasm-500/10 text-ectoplasm-400 border-ectoplasm-500/40 font-bold'
                    : 'bg-crypt-900 text-slate-400 border-crypt-800 hover:text-slate-200 hover:border-crypt-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search repository or author..."
              className="w-full bg-crypt-900 border border-crypt-800 rounded-xl pl-9 pr-4 py-1.5 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-ectoplasm-500/50"
            />
          </div>
        </div>

        {/* Repositories Grid */}
        {loading ? (
          <div className="py-24 text-center text-slate-400 font-mono text-xs">
            <Ghost className="w-8 h-8 text-ectoplasm-400 mx-auto mb-3 animate-bounce" />
            Summoning resurrected artifacts from Tiger Data PostgreSQL...
          </div>
        ) : filteredRepos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRepos.map((repo) => (
              <RepositoryCard
                key={repo.id}
                repo={repo}
                onRunWasm={setActiveWasmRepo}
                onOpenDiff={setActiveDiffRepo}
                onOpenGatekeeper={setActiveGatekeeperRepo}
                onPlayAudio={setActiveAudioRepo}
                onOpenTabPFN={setActiveTabPFNRepo}
                onLightCandle={handleLightCandle}
              />
            ))}
          </div>
        ) : (
          <div className="py-24 text-center text-slate-500 font-mono text-xs">
            No repositories found matching current filters.
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-crypt-800 py-8 bg-crypt-950/80 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Ghost className="w-4 h-4 text-ectoplasm-400" />
            <span className="text-slate-400">PyLazarus &mdash; Hacktoberfest 2026 Week 4 (&ldquo;Ghost in the Machine&rdquo;)</span>
          </div>
          <div className="flex items-center space-x-1 text-slate-400">
            <span>Built with local Gemma 4, Stagehand, Tiger Data, TabPFN &amp; Temporal</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <PyodideTerminalModal
        repo={activeWasmRepo}
        onClose={() => setActiveWasmRepo(null)}
      />

      <DiffViewerModal
        repo={activeDiffRepo}
        onClose={() => setActiveDiffRepo(null)}
      />

      <GatekeeperModal
        repo={activeGatekeeperRepo}
        onClose={() => setActiveGatekeeperRepo(null)}
      />

      <AudioAutopsyPlayer
        repo={activeAudioRepo}
        onClose={() => setActiveAudioRepo(null)}
      />

      <TabPFNModal
        repo={activeTabPFNRepo}
        onClose={() => setActiveTabPFNRepo(null)}
      />

      <SentryWaterfallModal
        isOpen={isSentryOpen}
        onClose={() => setIsSentryOpen(false)}
      />

      <TemporalDrillModal
        isOpen={isTemporalOpen}
        onClose={() => setIsTemporalOpen(false)}
      />

      <BenchmarkModal
        isOpen={isBenchmarkOpen}
        onClose={() => setIsBenchmarkOpen(false)}
      />
    </div>
  );
};

export default App;
