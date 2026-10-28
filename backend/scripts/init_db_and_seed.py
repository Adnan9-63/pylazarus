"""
backend/scripts/init_db_and_seed.py - Database Initializer & Seed Script

Populates the storage engine (Tiger Data PostgreSQL or local SQLite) with:
- 18 Authentic Python 2 Dead Repositories (2008-2015)
- Standard Library Migration Rules (P1) and Wayback Machine Snapshots (W1)
- Initial Community Vigil lights and candle telemetry
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone

from backend.inference import InferenceRouter
from backend.stagehand_excavator import WaybackStagehandExcavator
from backend.storage import DeadRepositoryRecord, get_storage_engine


# Canonical authoritative bodies for P1 (stdlib migration patterns)
STDLIB_PATTERNS: dict[str, str] = {
    "ascii-dungeon-2009": "In Python 2, the xrange function was replaced by range in Python 3.0.",
    "markov-haiku-2010": "Long integer literal suffix L was removed in Python 3 where int is arbitrary precision.",
    "rsa-keygen-cli-2011": "Print statements with commas were converted to print functions in Python 3.",
    "csv-pivot-2011": "dict.has_key was removed in Python 3 in favor of the in operator.",
    "cron-humanizer-2012": "The diamond inequality operator <> was removed in Python 3.0 in favor of !=.",
    "hex-hexdump-2010": "In Python 3, ord(c) calls were normalized because Python 3 bytes indexing returns integers directly instead of 1-character strings.",
    "twit-sentiment-2011": "urllib2 was split into urllib.request and urllib.error in Python 3.0. Twitter v1 search API was sunset in 2013 and replaced by authenticated v1.1.",
    "yahoo-weather-bar-2012": "urllib2 was split into urllib.request in Python 3.0. weather.yahooapis.com was deprecated in 2019 and retired.",
    "html-table-scraper-2010": "The sgmllib was removed in Python 3.0 and migrated to html.parser.",
    "unix-proc-tree-2009": "The commands module was removed in Python 3.0 and superseded by subprocess.",
    "bencode-torrent-inspector-2011": "Bencode strings were normalized for Python 3 str and bytes handling.",
    "google-code-issue-export-2013": "Google Code project hosting was closed in 2016.",
    "md5-rainbow-check-2010": "The hashlib update requires bytes in Python 3 instead of str.",
    "ini-config-linter-2011": "The ConfigParser was renamed to lowercase configparser in Python 3.0.",
    "log-ip-geolocator-2012": "freegeoip.net service was retired in 2018.",
    "git-stats-sparkline-2013": "Unicode literal prefix u is unnecessary in Python 3 as strings are unicode by default.",
    "openssl-098-c-binding-2008": "SSLv2_method was permanently removed from OpenSSL due to DROWN security vulnerabilities.",
    "linux-26-ioctl-nic-probe-2009": "SIOCGIFCONF socket ioctl requires Linux root capabilities not available in unprivileged WebAssembly.",
}


def seed_database():
    print("[PyLazarus Seed] Initializing database storage engine...")
    storage = get_storage_engine()
    storage.initialize_schema()

    fixtures_path = os.path.join(os.path.dirname(__file__), "..", "..", "data", "fixtures", "benchmark_18_repos.json")
    if not os.path.exists(fixtures_path):
        print(f"[PyLazarus Seed] Error: Fixtures file not found at {fixtures_path}")
        return

    with open(fixtures_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    repos_dict = data.get("repositories", {})
    router = InferenceRouter()
    excavator = WaybackStagehandExcavator()

    print(f"[PyLazarus Seed] Seeding {len(repos_dict)} repositories...")
    for repo_id, r in repos_dict.items():
        repo_record = DeadRepositoryRecord(
            id=r["id"],
            repo_name=r["repo_name"],
            original_author=r["original_author"],
            last_commit_year=r["last_commit_year"],
            category=r["category"],
            dead_py2_code=r["dead_py2_code"],
            resurrected_py3_code=r.get("resurrected_py3_code"),
            polyfill_code=r.get("polyfill_code"),
            golden_test_input=r.get("golden_test_input", ""),
            expected_stdout=r.get("expected_stdout", ""),
            sha256_original=r["sha256_original"],
            tabpfn_viability_score=r["tabpfn_viability_score"],
            status=r["status"],
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        storage.upsert_repository(repo_record)

        # Seed P1 (stdlib migration rule)
        p1_body = STDLIB_PATTERNS.get(repo_id, f"Standard library pattern for {r['repo_name']}.")
        p1_vec = router.embed_text(p1_body, task_prefix=f"title: {r['repo_name']} | text: ", force_replay=True, repo_id=repo_id)
        storage.upsert_archive_excerpt(
            excerpt_id=f"{repo_id}_P1",
            repo_id=repo_id,
            source_type="stdlib_migration",
            title=f"Python Migration Pattern P1: {r['repo_name']}",
            snapshot_url=None,
            recorded_date=str(r["last_commit_year"]),
            body=p1_body,
            sha256_digest=r["sha256_original"],
            embedding=p1_vec,
        )

        # Seed W1 (Wayback Machine authentic snapshot)
        snaps = excavator.excavate_historical_context(r["repo_name"], "doc", r["last_commit_year"], force_replay=True)
        if snaps:
            w1_snap = snaps[0]
            w1_vec = router.embed_text(w1_snap.extracted_text, task_prefix=f"title: {r['repo_name']} | text: ", force_replay=True, repo_id=repo_id)
            storage.upsert_archive_excerpt(
                excerpt_id=f"{repo_id}_W1",
                repo_id=repo_id,
                source_type="wayback_snapshot",
                title=f"Archived Wayback Snapshot W1: {r['repo_name']}",
                snapshot_url=w1_snap.snapshot_url,
                recorded_date=str(r["last_commit_year"]),
                body=w1_snap.extracted_text,
                sha256_digest=w1_snap.sha256_digest,
                embedding=w1_vec,
            )

        # Seed initial vigil action
        storage.log_vigil_action(
            repo_id=repo_id,
            action_type="candle_lit",
            visitor_location="Sanctuary Crypt",
            verified=True,
        )

    print("[PyLazarus Seed] Seeding complete! Repositories, archives (P1 & W1), and vigil lights ready.")


if __name__ == "__main__":
    seed_database()
