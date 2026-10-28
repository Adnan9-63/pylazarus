-- ============================================================================
-- PyLazarus: Tiger Data (PostgreSQL 18 + TimescaleDB) Hybrid Search Schema
-- Combines pgvector halfvec(768), pg_textsearch BM25, and TimescaleDB Hypertables
-- ============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
CREATE EXTENSION IF NOT EXISTS vector CASCADE;
CREATE EXTENSION IF NOT EXISTS pg_textsearch CASCADE;

-- 2. Dead Repositories Table (The Software Crypt Catalog)
CREATE TABLE IF NOT EXISTS dead_repositories (
    id TEXT PRIMARY KEY,
    repo_name TEXT NOT NULL,
    original_author TEXT NOT NULL,
    last_commit_year INT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('syntax_bitrot', 'semantic_api_bitrot', 'unfixable_c_abi')),
    dead_py2_code TEXT NOT NULL,
    resurrected_py3_code TEXT,
    polyfill_code TEXT,
    golden_test_input TEXT NOT NULL,
    expected_stdout TEXT NOT NULL,
    sha256_original CHAR(64) NOT NULL,
    tabpfn_viability_score FLOAT NOT NULL DEFAULT 0.5,
    status TEXT NOT NULL DEFAULT 'IN_CRYPT' CHECK (status IN ('IN_CRYPT', 'RESURRECTED', 'QUARANTINED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Bitrot Archives Table (Hybrid Search Relational Table)
-- Stores excavated Wayback Machine snapshots, stdlib migration rules, and commit autopsies
CREATE TABLE IF NOT EXISTS bitrot_archives (
    id TEXT PRIMARY KEY,
    repo_id TEXT NOT NULL REFERENCES dead_repositories(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL CHECK (source_type IN ('wayback_snapshot', 'stdlib_migration', 'mailing_list', 'commit_autopsy')),
    title TEXT NOT NULL,
    snapshot_url TEXT,
    recorded_date TEXT NOT NULL,
    body TEXT NOT NULL,
    sha256_digest CHAR(64) NOT NULL,
    -- 768-dimensional vector matching EmbeddingGemma 2 in 16-bit half-precision
    embedding halfvec(768) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HNSW Cosine Distance Index on halfvec(768)
CREATE INDEX IF NOT EXISTS bitrot_archives_embedding_hnsw_idx
ON bitrot_archives USING hnsw (embedding halfvec_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- True BM25 Keyword Index via Tiger Data pg_textsearch
CREATE INDEX IF NOT EXISTS bitrot_archives_body_bm25_idx
ON bitrot_archives USING bm25 (body)
WITH (text_config = 'english');

-- B-Tree Index for Fast Repository Filtering
CREATE INDEX IF NOT EXISTS bitrot_archives_repo_id_idx ON bitrot_archives (repo_id);

-- 4. Vigil Lights Table (TimescaleDB Hypertable with Columnstore)
-- Tracks developer runs, forks, and vigil candles in the Social Arcade
CREATE TABLE IF NOT EXISTS vigil_lights (
    lit_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    repo_id TEXT NOT NULL REFERENCES dead_repositories(id) ON DELETE CASCADE,
    visitor_location TEXT NOT NULL DEFAULT 'Local Arcade',
    action_type TEXT NOT NULL CHECK (action_type IN ('candle_lit', 'browser_wasm_run', 'repo_forked')),
    gatekeeper_verified BOOLEAN NOT NULL DEFAULT TRUE
);

-- Convert vigil_lights into a Timescale Hypertable partitioned by 7-day chunks
SELECT create_hypertable('vigil_lights', by_range('lit_at', INTERVAL '7 days'), if_not_exists => TRUE);

-- Enable Columnstore compression segmented by repo_id
ALTER TABLE vigil_lights SET (
    timescaledb.enable_columnstore = true,
    timescaledb.segmentby = 'repo_id',
    timescaledb.orderby = 'lit_at DESC'
);

-- 5. Continuous Daily Aggregate for Community Vigil Telemetry
CREATE MATERIALIZED VIEW IF NOT EXISTS vigil_lights_daily
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', lit_at) AS bucket_day,
    repo_id,
    action_type,
    COUNT(*) AS event_count
FROM vigil_lights
GROUP BY bucket_day, repo_id, action_type
WITH NO DATA;

SELECT add_continuous_aggregate_policy('vigil_lights_daily',
    start_offset => INTERVAL '30 days',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '15 minutes',
    if_not_exists => TRUE
);

-- 6. Reciprocal Rank Fusion (RRF) Production Query Template
-- Parameters:
--   $1: repo_id (or NULL for cross-repository search)
--   $2: query_embedding::halfvec(768)
--   $3: raw_query_text
-- Transaction invariants to run prior to execution:
--   SET LOCAL hnsw.ef_search = 100;
--   SET LOCAL hnsw.iterative_scan = relaxed_order;
/*
WITH vector_arm AS (
    SELECT
        id,
        ROW_NUMBER() OVER (ORDER BY embedding <=> $2::halfvec(768)) AS vec_rank,
        (1.0 - (embedding <=> $2::halfvec(768))) AS cosine_sim
    FROM bitrot_archives
    WHERE ($1::text IS NULL OR repo_id = $1::text)
    ORDER BY embedding <=> $2::halfvec(768)
    LIMIT 20
),
bm25_arm AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            ORDER BY body <@> to_bm25query($3::text, 'bitrot_archives_body_bm25_idx') ASC,
            id DESC
        ) AS bm25_rank,
        -(body <@> to_bm25query($3::text, 'bitrot_archives_body_bm25_idx')) AS bm25_positive_score
    FROM bitrot_archives
    WHERE ($1::text IS NULL OR repo_id = $1::text)
      AND (body <@> to_bm25query($3::text, 'bitrot_archives_body_bm25_idx')) < 0
    ORDER BY body <@> to_bm25query($3::text, 'bitrot_archives_body_bm25_idx') ASC, id DESC
    LIMIT 20
)
SELECT
    b.id,
    b.repo_id,
    r.repo_name,
    b.source_type,
    b.title,
    b.snapshot_url,
    b.recorded_date,
    b.body,
    v.vec_rank,
    m.bm25_rank,
    COALESCE(v.cosine_sim, 0.0) AS cosine_similarity,
    COALESCE(m.bm25_positive_score, 0.0) AS bm25_score,
    (COALESCE(1.0 / (60 + v.vec_rank), 0.0) + COALESCE(1.0 / (60 + m.bm25_rank), 0.0)) AS rrf_score
FROM bitrot_archives b
JOIN dead_repositories r ON b.repo_id = r.id
LEFT JOIN vector_arm v ON b.id = v.id
LEFT JOIN bm25_arm m ON b.id = m.id
WHERE v.id IS NOT NULL OR m.id IS NOT NULL
ORDER BY rrf_score DESC, b.id ASC
LIMIT 5;
*/
