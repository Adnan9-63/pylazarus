import React, { useState } from 'react';
import { Repository } from '../types';
import { Play, Eye, ShieldCheck, Volume2, Flame, GitFork, AlertTriangle, CheckCircle2, Ban } from 'lucide-react';

interface RepositoryCardProps {
  repo: Repository;
  onRunWasm: (repo: Repository) => void;
  onOpenDiff: (repo: Repository) => void;
  onOpenGatekeeper: (repo: Repository) => void;
  onPlayAudio: (repo: Repository) => void;
  onOpenTabPFN: (repo: Repository) => void;
  onLightCandle: (repoId: string) => void;
}

export const RepositoryCard: React.FC<RepositoryCardProps> = ({
  repo,
  onRunWasm,
  onOpenDiff,
  onOpenGatekeeper,
  onPlayAudio,
  onOpenTabPFN,
  onLightCandle,
}) => {
  const [isCandleLighting, setIsCandleLighting] = useState(false);

  const handleCandleClick = () => {
    setIsCandleLighting(true);
    onLightCandle(repo.id);
    setTimeout(() => setIsCandleLighting(false), 1200);
  };

  const isQuarantined = repo.status === 'QUARANTINED' || repo.category === 'unfixable_c_abi';

  const categoryLabel = {
    syntax_bitrot: 'Syntax Bitrot (AST Upgraded)',
    semantic_api_bitrot: 'Semantic API Bitrot (Wayback + RRF)',
    unfixable_c_abi: 'Unfixable C-ABI (Quarantined)',
  }[repo.category] || 'Resurrected Artifact';

  const domainTag = {
    'ascii-dungeon-2009': 'Roguelike / Game',
    'markov-haiku-2010': 'NLP / Poetry',
    'rsa-keygen-cli-2011': 'Crypto / Keygen',
    'csv-pivot-2011': 'Data / Pivot',
    'cron-humanizer-2012': 'DevOps / Cron',
    'hex-hexdump-2010': 'Binary / Hex',
    'twit-sentiment-2011': 'Social / Twitter v1',
    'yahoo-weather-bar-2012': 'Weather / Yahoo RSS',
    'html-table-scraper-2010': 'Web / sgmllib Scraper',
    'unix-proc-tree-2009': 'OS / Process Tree',
    'bencode-torrent-inspector-2011': 'P2P / BitTorrent',
    'google-code-issue-export-2013': 'Archive / Google Code',
    'md5-rainbow-check-2010': 'Security / Hash Audit',
    'ini-config-linter-2011': 'DevOps / INI Linter',
    'log-ip-geolocator-2012': 'GeoIP / MaxMind',
    'git-stats-sparkline-2013': 'Terminal / Sparkline',
    'openssl-098-c-binding-2008': 'C-ABI / SSLv2 Crypto',
    'linux-26-ioctl-nic-probe-2009': 'Kernel / ioctl Socket',
  }[repo.id] || 'Utility';

  return (
    <div
      className={`group relative rounded-2xl border transition-all duration-300 p-5 flex flex-col justify-between ${
        isQuarantined
          ? 'bg-crypt-950/70 border-rose-900/40 hover:border-rose-700/60'
          : 'bg-crypt-900/80 border-crypt-800 hover:border-crypt-700 hover:shadow-xl hover:shadow-ectoplasm-500/5'
      }`}
    >
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center space-x-1.5 overflow-hidden">
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-md border truncate ${
                repo.category === 'syntax_bitrot'
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                  : repo.category === 'semantic_api_bitrot'
                  ? 'bg-ectoplasm-500/10 text-ectoplasm-400 border-ectoplasm-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}
            >
              {categoryLabel}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-crypt-850 text-slate-400 border border-crypt-700/80 hidden sm:inline">
              {domainTag}
            </span>
          </div>

          <button
            onClick={() => onOpenTabPFN(repo)}
            title="Inspect TabPFN Viability Assessment"
            className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-crypt-850 text-slate-400 border border-crypt-700 hover:text-slate-200 hover:border-slate-500 transition-colors flex items-center space-x-1 shrink-0"
          >
            <span>TabPFN:</span>
            <span
              className={
                repo.viabilityScore >= 0.8
                  ? 'text-ectoplasm-400 font-bold'
                  : repo.viabilityScore >= 0.5
                  ? 'text-marigold-400 font-bold'
                  : 'text-rose-400 font-bold'
              }
            >
              {(repo.viabilityScore * 100).toFixed(0)}%
            </span>
          </button>
        </div>

        {/* Title & Metadata */}
        <div className="mb-2">
          <h3 className="font-mono text-base font-bold text-slate-100 group-hover:text-ectoplasm-300 transition-colors">
            {repo.name}
          </h3>
          <div className="flex items-center space-x-3 text-xs text-slate-500 font-mono mt-1">
            <span>By @{repo.originalAuthor}</span>
            <span>*</span>
            <span>{repo.lastCommitYear}</span>
            <span>*</span>
            <span>{repo.originalLicense}</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
          {repo.description}
        </p>
      </div>

      {/* Forensic Verdict Strip */}
      <div>
        <div className="pt-3 border-t border-crypt-800/80 mb-4 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-1.5">
            {isQuarantined ? (
              <>
                <Ban className="w-4 h-4 text-rose-400" />
                <span className="text-rose-400 font-semibold">Quarantined</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-ectoplasm-400" />
                <span className="text-ectoplasm-400 font-semibold">Resurrected & Verified</span>
              </>
            )}
          </div>

          {/* Candle button */}
          <button
            onClick={handleCandleClick}
            disabled={isCandleLighting}
            title="Light a Día de los Muertos vigil candle"
            className={`flex items-center space-x-1.5 px-2 py-1 rounded-lg border transition-all ${
              isCandleLighting
                ? 'bg-marigold-500/30 border-marigold-400 text-marigold-200 scale-105'
                : 'bg-crypt-850 border-crypt-700/80 text-marigold-400 hover:border-marigold-500/50'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${isCandleLighting ? 'animate-bounce text-marigold-300' : ''}`} />
            <span className="font-bold">{repo.vigilCandlesCount}</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {!isQuarantined ? (
            <button
              onClick={() => onRunWasm(repo)}
              className="w-full col-span-2 py-2 px-3 rounded-xl font-mono text-xs font-bold bg-ectoplasm-500 text-crypt-950 hover:bg-ectoplasm-400 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 shadow-lg shadow-ectoplasm-500/10"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run in WASM (Pyodide)</span>
            </button>
          ) : (
            <div className="w-full col-span-2 py-2 px-3 rounded-xl font-mono text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 text-center">
              Isolated from Browser WASM Execution
            </div>
          )}

          <button
            onClick={() => onOpenDiff(repo)}
            className="py-1.5 px-2.5 rounded-lg font-mono text-xs bg-crypt-850 hover:bg-crypt-800 border border-crypt-700 text-slate-300 hover:text-slate-100 transition-colors flex items-center justify-center space-x-1.5"
          >
            <Eye className="w-3.5 h-3.5 text-blue-400" />
            <span>Time Diff</span>
          </button>

          <button
            onClick={() => onOpenGatekeeper(repo)}
            className="py-1.5 px-2.5 rounded-lg font-mono text-xs bg-crypt-850 hover:bg-crypt-800 border border-crypt-700 text-slate-300 hover:text-slate-100 transition-colors flex items-center justify-center space-x-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-ectoplasm-400" />
            <span>Gatekeeper</span>
          </button>

          {repo.audioAutopsyUrl && (
            <button
              onClick={() => onPlayAudio(repo)}
              className="col-span-2 py-1.5 px-2.5 rounded-lg font-mono text-xs bg-crypt-850 hover:bg-crypt-800 border border-crypt-700 text-purple-300 hover:text-purple-200 transition-colors flex items-center justify-center space-x-1.5"
            >
              <Volume2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Listen to Autopsy (ElevenLabs)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
