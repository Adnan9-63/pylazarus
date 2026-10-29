"""
backend/storage.py - Dual-Engine Persistence & Hybrid Search Adapter

Provides seamless abstraction between:
1. Production: Tiger Data (PostgreSQL 18 + pgvector halfvec(768) + pg_textsearch BM25 + TimescaleDB)
2. Offline / Local Fallback: Zero-config SQLite engine implementing exact 768-d cosine math,
   Okapi BM25 ranking (k1=1.2, b=0.75), and Reciprocal Rank Fusion (k=60).
"""

from __future__ import annotations

import json
import math
import os
import re
import sqlite3
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False


@dataclass
class ArchiveExcerpt:
    id: str
    repo_id: str
    repo_name: str
    source_type: str
    title: str
    snapshot_url: Optional[str]
    recorded_date: str
    body: str
    vec_rank: Optional[int] = None
    bm25_rank: Optional[int] = None
    cosine_sim: float = 0.0
    bm25_score: float = 0.0
    rrf_score: float = 0.0


@dataclass
class DeadRepositoryRecord:
    id: str
    repo_name: str
    original_author: str
    last_commit_year: int
    category: str
    dead_py2_code: str
    resurrected_py3_code: Optional[str]
    polyfill_code: Optional[str]
    golden_test_input: str
    expected_stdout: str
    sha256_original: str
    tabpfn_viability_score: float
    status: str
    created_at: str


class StorageEngine:
    """Base interface for PyLazarus persistence engines."""

    def initialize_schema(self) -> None:
        raise NotImplementedError

    def get_repository(self, repo_id: str) -> Optional[DeadRepositoryRecord]:
        raise NotImplementedError

    def list_repositories(self) -> List[DeadRepositoryRecord]:
        raise NotImplementedError

    def upsert_repository(self, repo: DeadRepositoryRecord) -> None:
        raise NotImplementedError

    def upsert_archive_excerpt(
        self,
        excerpt_id: str,
        repo_id: str,
        source_type: str,
        title: str,
        snapshot_url: Optional[str],
        recorded_date: str,
        body: str,
        sha256_digest: str,
        embedding: List[float],
    ) -> None:
        raise NotImplementedError

    def hybrid_search(
        self,
        repo_id: Optional[str],
        query_text: str,
        query_embedding: List[float],
        top_k: int = 5,
    ) -> List[ArchiveExcerpt]:
        raise NotImplementedError

    def log_vigil_action(
        self,
        repo_id: str,
        action_type: str,
        visitor_location: str = "Local Sanctuary",
        verified: bool = True,
    ) -> None:
        raise NotImplementedError

    def record_vigil_light(
        self,
        repo_id: str,
        action_type: str = "candle_lit",
        visitor_location: str = "Local Sanctuary",
        verified: bool = True,
    ) -> None:
        """Alias for log_vigil_action."""
        return self.log_vigil_action(repo_id, action_type, visitor_location, verified)

    def get_vigil_counts(self, repo_id: Optional[str] = None) -> Dict[str, int]:
        raise NotImplementedError


# ============================================================================
# SQLite Offline Fallback Engine (Zero-Config, Exact Math)
# ============================================================================

def _cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """Computes exact cosine similarity between two 768-d vectors."""
    if len(vec_a) != len(vec_b) or not vec_a:
        return 0.0
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)


def _tokenize(text: str) -> List[str]:
    """Tokenizes text for BM25 ranking (lowercasing, 2+ alphanumeric chars)."""
    return re.findall(r"\b[a-zA-Z0-9_]{2,}\b", text.lower())


class SQLiteStorageEngine(StorageEngine):
    """
    Local-first SQLite storage adapter implementing exact pgvector cosine
    and BM25 scoring in Python with identical RRF math.
    """

    def __init__(self, db_path: str = "data/local_crypt.db"):
        self.db_path = db_path
        os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)
        self.initialize_schema()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=30.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        conn.execute("PRAGMA foreign_keys=ON;")
        return conn

    def initialize_schema(self) -> None:
        with self._get_connection() as conn:
            cur = conn.cursor()
            cur.execute("""
                CREATE TABLE IF NOT EXISTS dead_repositories (
                    id TEXT PRIMARY KEY,
                    repo_name TEXT NOT NULL,
                    original_author TEXT NOT NULL,
                    last_commit_year INTEGER NOT NULL,
                    category TEXT NOT NULL,
                    dead_py2_code TEXT NOT NULL,
                    resurrected_py3_code TEXT,
                    polyfill_code TEXT,
                    golden_test_input TEXT NOT NULL,
                    expected_stdout TEXT NOT NULL,
                    sha256_original TEXT NOT NULL,
                    tabpfn_viability_score REAL NOT NULL DEFAULT 0.5,
                    status TEXT NOT NULL DEFAULT 'IN_CRYPT',
                    created_at TEXT NOT NULL
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS bitrot_archives (
                    id TEXT PRIMARY KEY,
                    repo_id TEXT NOT NULL,
                    source_type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    snapshot_url TEXT,
                    recorded_date TEXT NOT NULL,
                    body TEXT NOT NULL,
                    sha256_digest TEXT NOT NULL,
                    embedding_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (repo_id) REFERENCES dead_repositories(id) ON DELETE CASCADE
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS vigil_lights (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    lit_at TEXT NOT NULL,
                    repo_id TEXT NOT NULL,
                    visitor_location TEXT NOT NULL,
                    action_type TEXT NOT NULL,
                    gatekeeper_verified INTEGER NOT NULL DEFAULT 1,
                    FOREIGN KEY (repo_id) REFERENCES dead_repositories(id) ON DELETE CASCADE
                );
            """)
            cur.execute("SELECT COUNT(*) FROM dead_repositories")
            if cur.fetchone()[0] == 0:
                self._auto_seed_from_fixtures(cur)
            conn.commit()

    def _auto_seed_from_fixtures(self, cur: sqlite3.Cursor) -> None:
        fixtures_path = os.path.join(os.path.dirname(__file__), "..", "data", "fixtures", "benchmark_18_repos.json")
        if not os.path.exists(fixtures_path):
            return
        try:
            with open(fixtures_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            repos = data.get("repositories", {})
            now = datetime.now(timezone.utc).isoformat()
            for r_id, r in repos.items():
                cur.execute("""
                    INSERT OR REPLACE INTO dead_repositories
                    (id, repo_name, original_author, last_commit_year, category, dead_py2_code,
                     resurrected_py3_code, polyfill_code, golden_test_input, expected_stdout,
                     sha256_original, tabpfn_viability_score, status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    r_id,
                    r.get("repo_name", r_id),
                    r.get("original_author", "unknown"),
                    r.get("last_commit_year", 2011),
                    r.get("category", "syntax_bitrot"),
                    r.get("dead_py2_code", ""),
                    r.get("resurrected_py3_code", ""),
                    r.get("polyfill_code", ""),
                    r.get("golden_test_input", ""),
                    r.get("expected_stdout", ""),
                    r.get("sha256_original", "0000"),
                    r.get("tabpfn_viability_score", 0.5),
                    r.get("status", "IN_CRYPT"),
                    now,
                ))
                # Seed initial vigil candle
                cur.execute("""
                    INSERT INTO vigil_lights (lit_at, repo_id, visitor_location, action_type, gatekeeper_verified)
                    VALUES (?, ?, ?, ?, 1)
                """, (now, r_id, "Crypt Cryptographer", "candle_lit"))
        except Exception:
            pass

    def get_repository(self, repo_id: str) -> Optional[DeadRepositoryRecord]:
        with self._get_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT * FROM dead_repositories WHERE id = ?", (repo_id,))
            row = cur.fetchone()
            if not row:
                return None
            return DeadRepositoryRecord(
                id=row["id"],
                repo_name=row["repo_name"],
                original_author=row["original_author"],
                last_commit_year=row["last_commit_year"],
                category=row["category"],
                dead_py2_code=row["dead_py2_code"],
                resurrected_py3_code=row["resurrected_py3_code"],
                polyfill_code=row["polyfill_code"],
                golden_test_input=row["golden_test_input"],
                expected_stdout=row["expected_stdout"],
                sha256_original=row["sha256_original"],
                tabpfn_viability_score=row["tabpfn_viability_score"],
                status=row["status"],
                created_at=row["created_at"],
            )

    def list_repositories(self) -> List[DeadRepositoryRecord]:
        with self._get_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT * FROM dead_repositories ORDER BY last_commit_year ASC, repo_name ASC")
            rows = cur.fetchall()
            return [
                DeadRepositoryRecord(
                    id=row["id"],
                    repo_name=row["repo_name"],
                    original_author=row["original_author"],
                    last_commit_year=row["last_commit_year"],
                    category=row["category"],
                    dead_py2_code=row["dead_py2_code"],
                    resurrected_py3_code=row["resurrected_py3_code"],
                    polyfill_code=row["polyfill_code"],
                    golden_test_input=row["golden_test_input"],
                    expected_stdout=row["expected_stdout"],
                    sha256_original=row["sha256_original"],
                    tabpfn_viability_score=row["tabpfn_viability_score"],
                    status=row["status"],
                    created_at=row["created_at"],
                )
                for row in rows
            ]

    def upsert_repository(self, repo: DeadRepositoryRecord) -> None:
        with self._get_connection() as conn:
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO dead_repositories (
                    id, repo_name, original_author, last_commit_year, category,
                    dead_py2_code, resurrected_py3_code, polyfill_code,
                    golden_test_input, expected_stdout, sha256_original,
                    tabpfn_viability_score, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    repo_name=excluded.repo_name,
                    original_author=excluded.original_author,
                    last_commit_year=excluded.last_commit_year,
                    category=excluded.category,
                    dead_py2_code=excluded.dead_py2_code,
                    resurrected_py3_code=excluded.resurrected_py3_code,
                    polyfill_code=excluded.polyfill_code,
                    golden_test_input=excluded.golden_test_input,
                    expected_stdout=excluded.expected_stdout,
                    sha256_original=excluded.sha256_original,
                    tabpfn_viability_score=excluded.tabpfn_viability_score,
                    status=excluded.status;
            """, (
                repo.id, repo.repo_name, repo.original_author, repo.last_commit_year, repo.category,
                repo.dead_py2_code, repo.resurrected_py3_code, repo.polyfill_code,
                repo.golden_test_input, repo.expected_stdout, repo.sha256_original,
                repo.tabpfn_viability_score, repo.status, repo.created_at
            ))
            conn.commit()

    def upsert_archive_excerpt(
        self,
        excerpt_id: str,
        repo_id: str,
        source_type: str,
        title: str,
        snapshot_url: Optional[str],
        recorded_date: str,
        body: str,
        sha256_digest: str,
        embedding: List[float],
    ) -> None:
        with self._get_connection() as conn:
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO bitrot_archives (
                    id, repo_id, source_type, title, snapshot_url,
                    recorded_date, body, sha256_digest, embedding_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    title=excluded.title,
                    snapshot_url=excluded.snapshot_url,
                    recorded_date=excluded.recorded_date,
                    body=excluded.body,
                    sha256_digest=excluded.sha256_digest,
                    embedding_json=excluded.embedding_json;
            """, (
                excerpt_id, repo_id, source_type, title, snapshot_url,
                recorded_date, body, sha256_digest, json.dumps(embedding),
                datetime.now(timezone.utc).isoformat()
            ))
            conn.commit()

    def hybrid_search(
        self,
        repo_id: Optional[str],
        query_text: str,
        query_embedding: List[float],
        top_k: int = 5,
    ) -> List[ArchiveExcerpt]:
        """
        Executes dual-arm Vector + BM25 search in SQLite, fusing candidate rankings
        via Reciprocal Rank Fusion: RRF = 1/(60 + vec_rank) + 1/(60 + bm25_rank).
        """
        with self._get_connection() as conn:
            cur = conn.cursor()
            query = """
                SELECT b.id, b.repo_id, r.repo_name, b.source_type, b.title,
                       b.snapshot_url, b.recorded_date, b.body, b.embedding_json
                FROM bitrot_archives b
                JOIN dead_repositories r ON b.repo_id = r.id
            """
            params: List[Any] = []
            if repo_id:
                query += " WHERE b.repo_id = ?"
                params.append(repo_id)

            cur.execute(query, tuple(params))
            rows = cur.fetchall()

            if not rows:
                return []

            # 1. Vector Search Arm (Cosine Similarity)
            vector_candidates: List[Tuple[float, Any]] = []
            for row in rows:
                emb = json.loads(row["embedding_json"])
                sim = _cosine_similarity(query_embedding, emb)
                vector_candidates.append((sim, row))

            vector_candidates.sort(key=lambda x: x[0], reverse=True)
            vec_rank_map: Dict[str, Tuple[int, float]] = {}
            for rank, (sim, row) in enumerate(vector_candidates[:20], start=1):
                vec_rank_map[row["id"]] = (rank, sim)

            # 2. BM25 Search Arm (Okapi BM25: k1=1.2, b=0.75)
            query_tokens = _tokenize(query_text)
            doc_tokens_map = {row["id"]: _tokenize(row["body"] + " " + row["title"]) for row in rows}
            total_docs = len(rows)
            avg_doc_len = sum(len(toks) for toks in doc_tokens_map.values()) / max(total_docs, 1)

            # IDF computation: log(1 + (N - n + 0.5)/(n + 0.5))
            idf_map: Dict[str, float] = {}
            for qt in set(query_tokens):
                n = sum(1 for toks in doc_tokens_map.values() if qt in toks)
                idf = math.log(1.0 + (total_docs - n + 0.5) / (n + 0.5))
                idf_map[qt] = max(0.01, idf)

            bm25_candidates: List[Tuple[float, Any]] = []
            k1 = 1.2
            b = 0.75

            for row in rows:
                doc_id = row["id"]
                toks = doc_tokens_map[doc_id]
                doc_len = len(toks)
                score = 0.0
                for qt in query_tokens:
                    if qt in toks:
                        tf = toks.count(qt)
                        idf = idf_map.get(qt, 0.0)
                        denom = tf + k1 * (1.0 - b + b * (doc_len / max(avg_doc_len, 1.0)))
                        score += idf * (tf * (k1 + 1.0)) / denom
                if score > 0.0:
                    bm25_candidates.append((score, row))

            bm25_candidates.sort(key=lambda x: x[0], reverse=True)
            bm25_rank_map: Dict[str, Tuple[int, float]] = {}
            for rank, (score, row) in enumerate(bm25_candidates[:20], start=1):
                bm25_rank_map[row["id"]] = (rank, score)

            # 3. Reciprocal Rank Fusion (RRF with k = 60)
            all_candidate_ids = set(vec_rank_map.keys()) | set(bm25_rank_map.keys())
            fused_results: List[ArchiveExcerpt] = []

            for row in rows:
                row_id = row["id"]
                if row_id not in all_candidate_ids:
                    continue

                v_rank, cos_sim = vec_rank_map.get(row_id, (None, 0.0))
                b_rank, b_score = bm25_rank_map.get(row_id, (None, 0.0))

                rrf = 0.0
                if v_rank is not None:
                    rrf += 1.0 / (60.0 + v_rank)
                if b_rank is not None:
                    rrf += 1.0 / (60.0 + b_rank)

                fused_results.append(ArchiveExcerpt(
                    id=row_id,
                    repo_id=row["repo_id"],
                    repo_name=row["repo_name"],
                    source_type=row["source_type"],
                    title=row["title"],
                    snapshot_url=row["snapshot_url"],
                    recorded_date=row["recorded_date"],
                    body=row["body"],
                    vec_rank=v_rank,
                    bm25_rank=b_rank,
                    cosine_sim=round(cos_sim, 4),
                    bm25_score=round(b_score, 4),
                    rrf_score=round(rrf, 6),
                ))

            fused_results.sort(key=lambda x: x.rrf_score, reverse=True)
            return fused_results[:top_k]

    def log_vigil_action(
        self,
        repo_id: str,
        action_type: str,
        visitor_location: str = "Local Sanctuary",
        verified: bool = True,
    ) -> None:
        with self._get_connection() as conn:
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO vigil_lights (lit_at, repo_id, visitor_location, action_type, gatekeeper_verified)
                VALUES (?, ?, ?, ?, ?)
            """, (
                datetime.now(timezone.utc).isoformat(),
                repo_id,
                visitor_location,
                action_type,
                1 if verified else 0
            ))
            conn.commit()

    def record_vigil_light(
        self,
        repo_id: str,
        action_type: str = "candle_lit",
        visitor_location: str = "Local Sanctuary",
        verified: bool = True,
    ) -> None:
        """Alias for log_vigil_action."""
        self.log_vigil_action(repo_id, action_type, visitor_location, verified)

    def get_vigil_counts(self, repo_id: Optional[str] = None) -> Dict[str, int]:
        with self._get_connection() as conn:
            cur = conn.cursor()
            if repo_id:
                cur.execute("""
                    SELECT action_type, COUNT(*) as cnt
                    FROM vigil_lights
                    WHERE repo_id = ?
                    GROUP BY action_type
                """, (repo_id,))
            else:
                cur.execute("""
                    SELECT action_type, COUNT(*) as cnt
                    FROM vigil_lights
                    GROUP BY action_type
                """)
            counts = {row["action_type"]: row["cnt"] for row in cur.fetchall()}
            return {
                "candle_lit": counts.get("candle_lit", 0),
                "browser_wasm_run": counts.get("browser_wasm_run", 0),
                "repo_forked": counts.get("repo_forked", 0),
                "total": sum(counts.values()),
            }


# ============================================================================
# Tiger Data (PostgreSQL 18 + pgvector + pg_textsearch) Engine
# ============================================================================

class TigerPostgresStorageEngine(StorageEngine):
    """
    Production Tiger Data engine running on PostgreSQL 18 with native
    halfvec(768) HNSW cosine distance and pg_textsearch BM25 indexing.
    """

    def __init__(self, connection_url: str):
        if not PSYCOPG2_AVAILABLE:
            raise RuntimeError("psycopg2 is required for Tiger Data PostgreSQL engine.")
        self.connection_url = connection_url
        self.initialize_schema()

    def _get_connection(self):
        return psycopg2.connect(self.connection_url, cursor_factory=RealDictCursor)

    def initialize_schema(self) -> None:
        schema_path = os.path.join(os.path.dirname(__file__), "..", "sql", "01_schema_and_hybrid_search.sql")
        if os.path.exists(schema_path):
            with open(schema_path, "r", encoding="utf-8") as f:
                sql_script = f.read()
            with self._get_connection() as conn:
                with conn.cursor() as cur:
                    # Strip out commented query blocks at the bottom
                    clean_sql = re.sub(r"/\*.*?\*/", "", sql_script, flags=re.DOTALL)
                    cur.execute(clean_sql)
                conn.commit()

    def get_repository(self, repo_id: str) -> Optional[DeadRepositoryRecord]:
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM dead_repositories WHERE id = %s", (repo_id,))
                row = cur.fetchone()
                if not row:
                    return None
                return DeadRepositoryRecord(**row)

    def list_repositories(self) -> List[DeadRepositoryRecord]:
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM dead_repositories ORDER BY last_commit_year ASC, repo_name ASC")
                return [DeadRepositoryRecord(**row) for row in cur.fetchall()]

    def upsert_repository(self, repo: DeadRepositoryRecord) -> None:
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO dead_repositories (
                        id, repo_name, original_author, last_commit_year, category,
                        dead_py2_code, resurrected_py3_code, polyfill_code,
                        golden_test_input, expected_stdout, sha256_original,
                        tabpfn_viability_score, status, created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT(id) DO UPDATE SET
                        repo_name=EXCLUDED.repo_name,
                        original_author=EXCLUDED.original_author,
                        last_commit_year=EXCLUDED.last_commit_year,
                        category=EXCLUDED.category,
                        dead_py2_code=EXCLUDED.dead_py2_code,
                        resurrected_py3_code=EXCLUDED.resurrected_py3_code,
                        polyfill_code=EXCLUDED.polyfill_code,
                        golden_test_input=EXCLUDED.golden_test_input,
                        expected_stdout=EXCLUDED.expected_stdout,
                        sha256_original=EXCLUDED.sha256_original,
                        tabpfn_viability_score=EXCLUDED.tabpfn_viability_score,
                        status=EXCLUDED.status;
                """, (
                    repo.id, repo.repo_name, repo.original_author, repo.last_commit_year, repo.category,
                    repo.dead_py2_code, repo.resurrected_py3_code, repo.polyfill_code,
                    repo.golden_test_input, repo.expected_stdout, repo.sha256_original,
                    repo.tabpfn_viability_score, repo.status, repo.created_at
                ))
            conn.commit()

    def upsert_archive_excerpt(
        self,
        excerpt_id: str,
        repo_id: str,
        source_type: str,
        title: str,
        snapshot_url: Optional[str],
        recorded_date: str,
        body: str,
        sha256_digest: str,
        embedding: List[float],
    ) -> None:
        vec_literal = "[" + ",".join(str(x) for x in embedding) + "]"
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO bitrot_archives (
                        id, repo_id, source_type, title, snapshot_url,
                        recorded_date, body, sha256_digest, embedding, created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::halfvec(768), NOW())
                    ON CONFLICT(id) DO UPDATE SET
                        title=EXCLUDED.title,
                        snapshot_url=EXCLUDED.snapshot_url,
                        recorded_date=EXCLUDED.recorded_date,
                        body=EXCLUDED.body,
                        sha256_digest=EXCLUDED.sha256_digest,
                        embedding=EXCLUDED.embedding;
                """, (
                    excerpt_id, repo_id, source_type, title, snapshot_url,
                    recorded_date, body, sha256_digest, vec_literal
                ))
            conn.commit()

    def hybrid_search(
        self,
        repo_id: Optional[str],
        query_text: str,
        query_embedding: List[float],
        top_k: int = 5,
    ) -> List[ArchiveExcerpt]:
        vec_literal = "[" + ",".join(str(x) for x in query_embedding) + "]"
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                # Crucial performance & correctness session flags
                cur.execute("SET LOCAL hnsw.ef_search = 100;")
                cur.execute("SET LOCAL hnsw.iterative_scan = relaxed_order;")

                cur.execute("""
                    WITH vector_arm AS (
                        SELECT
                            id,
                            ROW_NUMBER() OVER (ORDER BY embedding <=> %s::halfvec(768)) AS vec_rank,
                            (1.0 - (embedding <=> %s::halfvec(768))) AS cosine_sim
                        FROM bitrot_archives
                        WHERE (%s::text IS NULL OR repo_id = %s::text)
                        ORDER BY embedding <=> %s::halfvec(768)
                        LIMIT 20
                    ),
                    bm25_arm AS (
                        SELECT
                            id,
                            ROW_NUMBER() OVER (
                                ORDER BY body <@> to_bm25query(%s::text, 'bitrot_archives_body_bm25_idx') ASC,
                                id DESC
                            ) AS bm25_rank,
                            -(body <@> to_bm25query(%s::text, 'bitrot_archives_body_bm25_idx')) AS bm25_positive_score
                        FROM bitrot_archives
                        WHERE (%s::text IS NULL OR repo_id = %s::text)
                          AND (body <@> to_bm25query(%s::text, 'bitrot_archives_body_bm25_idx')) < 0
                        ORDER BY body <@> to_bm25query(%s::text, 'bitrot_archives_body_bm25_idx') ASC, id DESC
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
                    LIMIT %s;
                """, (
                    vec_literal, vec_literal, repo_id, repo_id, vec_literal,
                    query_text, query_text, repo_id, repo_id, query_text, query_text,
                    top_k
                ))
                rows = cur.fetchall()
                return [
                    ArchiveExcerpt(
                        id=row["id"],
                        repo_id=row["repo_id"],
                        repo_name=row["repo_name"],
                        source_type=row["source_type"],
                        title=row["title"],
                        snapshot_url=row["snapshot_url"],
                        recorded_date=str(row["recorded_date"]),
                        body=row["body"],
                        vec_rank=row["vec_rank"],
                        bm25_rank=row["bm25_rank"],
                        cosine_sim=round(float(row["cosine_similarity"]), 4),
                        bm25_score=round(float(row["bm25_score"]), 4),
                        rrf_score=round(float(row["rrf_score"]), 6),
                    )
                    for row in rows
                ]

    def log_vigil_action(
        self,
        repo_id: str,
        action_type: str,
        visitor_location: str = "Local Sanctuary",
        verified: bool = True,
    ) -> None:
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO vigil_lights (lit_at, repo_id, visitor_location, action_type, gatekeeper_verified)
                    VALUES (NOW(), %s, %s, %s, %s)
                """, (repo_id, visitor_location, action_type, verified))
            conn.commit()

    def record_vigil_light(
        self,
        repo_id: str,
        action_type: str = "candle_lit",
        visitor_location: str = "Local Sanctuary",
        verified: bool = True,
    ) -> None:
        """Alias for log_vigil_action."""
        self.log_vigil_action(repo_id, action_type, visitor_location, verified)

    def get_vigil_counts(self, repo_id: Optional[str] = None) -> Dict[str, int]:
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                if repo_id:
                    cur.execute("""
                        SELECT action_type, COUNT(*) as cnt
                        FROM vigil_lights
                        WHERE repo_id = %s
                        GROUP BY action_type
                    """, (repo_id,))
                else:
                    cur.execute("""
                        SELECT action_type, COUNT(*) as cnt
                        FROM vigil_lights
                        GROUP BY action_type
                    """)
                counts = {row["action_type"]: row["cnt"] for row in cur.fetchall()}
                return {
                    "candle_lit": counts.get("candle_lit", 0),
                    "browser_wasm_run": counts.get("browser_wasm_run", 0),
                    "repo_forked": counts.get("repo_forked", 0),
                    "total": sum(counts.values()),
                }


# ============================================================================
# Factory Method
# ============================================================================

def get_storage_engine() -> StorageEngine:
    """
    Returns the Tiger Data PostgreSQL engine if TIGER_DATABASE_URL is set,
    otherwise automatically falls back to SQLite with exact mathematical parity.
    """
    db_url = os.environ.get("TIGER_DATABASE_URL", "").strip()
    if db_url and PSYCOPG2_AVAILABLE:
        try:
            return TigerPostgresStorageEngine(db_url)
        except Exception:
            # Fall back to SQLite if PostgreSQL connection fails
            pass
    return SQLiteStorageEngine()
