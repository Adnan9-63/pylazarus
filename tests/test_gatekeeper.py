"""
tests/test_gatekeeper.py - Unit tests for the Deterministic Resurrection Gatekeeper
"""

import unittest
from backend.gatekeeper import (
    DiagnosticClaim,
    verify_ast_integrity,
    verify_claims_deterministically,
    verify_sandbox_execution,
    audit_resurrection,
)
from backend.storage import ArchiveExcerpt


class TestGatekeeper(unittest.TestCase):

    def test_ast_symbol_preservation_success(self):
        py2 = "def parse_header(line):\n    return line.strip()\n\nclass PacketReader:\n    pass\n"
        py3 = "def parse_header(line):\n    return line.strip()\n\nclass PacketReader:\n    pass\n"
        res = verify_ast_integrity(py2, py3)
        self.assertTrue(res.passed)
        self.assertEqual(len(res.missing_functions), 0)
        self.assertEqual(len(res.missing_classes), 0)

    def test_ast_detects_cheating_deleted_functions(self):
        py2 = "def parse_header(line):\n    return line.strip()\n\ndef validate_checksum(data):\n    raise NotImplementedError()\n"
        # LLM deleted validate_checksum to pass pytest silently!
        py3 = "def parse_header(line):\n    return line.strip()\n"
        res = verify_ast_integrity(py2, py3)
        self.assertFalse(res.passed)
        self.assertIn("validate_checksum", res.missing_functions)

    def test_ast_detects_forbidden_syscalls(self):
        py2 = "def run():\n    pass\n"
        # LLM inserted dangerous eval
        py3_eval = "def run():\n    return eval('2 + 2')\n"
        res_eval = verify_ast_integrity(py2, py3_eval)
        self.assertFalse(res_eval.passed)
        self.assertIn("eval", res_eval.forbidden_calls)

        # LLM inserted subprocess with shell=True
        py3_sub = "import subprocess\ndef run():\n    subprocess.run('ls', shell=True)\n"
        res_sub = verify_ast_integrity(py2, py3_sub)
        self.assertFalse(res_sub.passed)
        self.assertTrue(any("shell=True" in call for call in res_sub.forbidden_calls))

    def test_claims_verification_grounded_success(self):
        excerpts = [
            ArchiveExcerpt(
                id="W1",
                repo_id="repo1",
                repo_name="TestRepo",
                source_type="wayback_snapshot",
                title="Python 2.7 Documentation for urllib2",
                snapshot_url="http://web.archive.org/web/2011/urllib2",
                recorded_date="2011-04-12",
                body="urllib2 was split across several modules in Python 3 named urllib.request and urllib.error.",
            )
        ]
        claims = [
            DiagnosticClaim(
                text="In Python 3, urllib2 was split across several modules named urllib.request and urllib.error.",
                source_id="W1",
                verbatim_quote="split across several modules in Python 3",
                line_number=1,
            )
        ]
        audits, passed_cnt, struck_cnt, html = verify_claims_deterministically(claims, excerpts)
        self.assertEqual(passed_cnt, 1)
        self.assertEqual(struck_cnt, 0)
        self.assertTrue(audits[0].passed)
        self.assertIn("claim-verified", html)

    def test_claims_verification_catches_unverified_quote(self):
        excerpts = [
            ArchiveExcerpt(
                id="W1",
                repo_id="repo1",
                repo_name="TestRepo",
                source_type="wayback_snapshot",
                title="Archived Docs",
                snapshot_url=None,
                recorded_date="2012-01-01",
                body="commands.getstatusoutput is deprecated and replaced by subprocess.getstatusoutput.",
            )
        ]
        claims = [
            DiagnosticClaim(
                text="The API was deprecated in version 2.7.",
                source_id="W1",
                # Quote not in source body!
                verbatim_quote="this phrase does not exist in source at all",
                line_number=1,
            )
        ]
        audits, passed_cnt, struck_cnt, html = verify_claims_deterministically(claims, excerpts)
        self.assertEqual(passed_cnt, 0)
        self.assertEqual(struck_cnt, 1)
        self.assertFalse(audits[0].passed)
        self.assertIn("VERBATIM_QUOTE_NOT_FOUND_IN_SOURCE", audits[0].failure_reasons)
        self.assertIn("claim-struck", html)

    def test_claims_verification_catches_hallucinated_year(self):
        excerpts = [
            ArchiveExcerpt(
                id="W1",
                repo_id="repo1",
                repo_name="TestRepo",
                source_type="wayback_snapshot",
                title="Archived Docs",
                snapshot_url=None,
                recorded_date="2011-05-01",
                body="Released in version 1.2 with Python 2.6 support.",
            )
        ]
        claims = [
            DiagnosticClaim(
                text="The software was updated in 2024 for Python 3.12.",
                source_id="W1",
                verbatim_quote="Released in version 1.2",
                line_number=1,
            )
        ]
        audits, passed_cnt, struck_cnt, html = verify_claims_deterministically(claims, excerpts)
        self.assertEqual(passed_cnt, 0)
        self.assertEqual(struck_cnt, 1)
        self.assertTrue(any("UNVERIFIED_NUMBERS" in r for r in audits[0].failure_reasons))

    def test_sandbox_execution_success(self):
        code = 'print("ASCII DUNGEON LEVEL 1 COMPLETE")'
        res = verify_sandbox_execution(code, "", "ASCII DUNGEON LEVEL 1 COMPLETE", timeout=3.0)
        self.assertTrue(res.passed)
        self.assertEqual(res.returncode, 0)
        self.assertIn("ASCII DUNGEON", res.stdout)

    def test_sandbox_execution_failure_on_syntax(self):
        code = 'def invalid_syntax('
        res = verify_sandbox_execution(code, "", "OK", timeout=3.0)
        self.assertFalse(res.passed)
        self.assertNotEqual(res.returncode, 0)

    def test_audit_resurrection_end_to_end(self):
        py2 = "def calculate_crc(payload):\n    return sum(ord(c) for c in payload)\n\nprint calculate_crc('HELLO')"
        py3 = "def calculate_crc(payload):\n    return sum(ord(c) for c in payload)\n\nprint(calculate_crc('HELLO'))"
        verdict = audit_resurrection(
            py2_source=py2,
            py3_patched=py3,
            claims=[],
            excerpts=[],
            golden_test_input="",
            expected_stdout="372",
        )
        self.assertTrue(verdict.passed)
        self.assertEqual(verdict.status, "VERIFIED")


if __name__ == "__main__":
    unittest.main()
