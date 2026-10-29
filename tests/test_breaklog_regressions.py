"""
tests/test_breaklog_regressions.py - Regression Test Suite for BREAK_LOG.md Incidents

Guards against:
- Incident 1: Windows Directory Traversal (%5C) arbitrary file read
- Incident 2: Attribute mismatch on vigil candle lighting
- Incident 3: Unhandled ValueError on null-byte injections in AST parser
- Incident 4: Quoted CLI arguments broken in subprocess sandbox
- Incident 5: Reflected XSS risk in epistemic audit HTML
- Incident 6: Unbounded request payload sizes (422 rejection)
"""

import unittest
from fastapi.testclient import TestClient

from backend.app import app
from backend.gatekeeper import (
    DiagnosticClaim,
    verify_ast_integrity,
    verify_claims_deterministically,
    verify_sandbox_execution,
)
from backend.ast_transpiler import check_syntax_validity
from backend.storage import ArchiveExcerpt


class TestBreakLogRegressions(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)

    def test_regression_incident_1_directory_traversal_windows_backslash(self):
        """Verifies encoded backslash directory traversal cannot escape audio_cache/."""
        res = self.client.get("/api/audio/stream/..%5C..%5Cbackend%5Capp.py")
        self.assertIn(res.status_code, [400, 404])
        self.assertNotIn(b"FastAPI", res.content)
        self.assertNotIn(b"app = FastAPI", res.content)

    def test_regression_incident_2_vigil_candle_attribute(self):
        """Verifies candle lighting succeeds without AttributeError on SQLiteStorageEngine."""
        res = self.client.post("/api/feed/light-candle/ascii-dungeon-2009", json={})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "CANDLE_LIT")

    def test_regression_incident_3_null_byte_ast_parse(self):
        """Verifies null bytes return deterministic AST rejection instead of raising ValueError."""
        null_code = "print('hello')\x00print('world')"
        ast_res = verify_ast_integrity(null_code, null_code)
        self.assertFalse(ast_res.passed)
        self.assertIsNotNone(ast_res.syntax_error)

        valid, err = check_syntax_validity(null_code)
        self.assertFalse(valid)
        self.assertIsNotNone(err)

    def test_regression_incident_4_quoted_cli_arguments(self):
        """Verifies shlex parses quotes inside CLI arguments cleanly."""
        code = """
import sys
if len(sys.argv) > 1:
    print("ARG1:", sys.argv[1])
"""
        res = verify_sandbox_execution(
            py3_patched=code,
            golden_test_input='--msg "hello world"',
            expected_stdout='ARG1: --msg',
        )
        self.assertTrue(res.passed)

    def test_regression_incident_5_html_escape_claims_xss(self):
        """Verifies diagnostic claims with HTML tags are escaped before HTML assembly."""
        xss_claim = DiagnosticClaim(
            text="<script>alert('pwned')</script>",
            source_id="W1",
            verbatim_quote="nonexistent",
            line_number=1,
        )
        excerpt = ArchiveExcerpt(
            id="W1",
            repo_id="repo1",
            repo_name="TestRepo",
            source_type="wayback_snapshot",
            title="Safe Title",
            snapshot_url="http://safe.com",
            recorded_date="2010",
            body="Safe body text",
        )
        _, _, _, rendered_html = verify_claims_deterministically([xss_claim], [excerpt])
        self.assertNotIn("<script>", rendered_html)
        self.assertIn("&lt;script&gt;", rendered_html)

    def test_regression_incident_6_oversized_payload_rejected(self):
        """Verifies payloads exceeding Pydantic max_length are rejected with HTTP 422."""
        giant_code = "print('x')\n" * 150_000  # > 1.5MB
        res = self.client.post("/api/sandbox/execute", json={"code": giant_code})
        self.assertEqual(res.status_code, 422)


if __name__ == "__main__":
    unittest.main()
