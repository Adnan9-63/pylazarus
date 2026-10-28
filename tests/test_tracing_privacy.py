"""
tests/test_tracing_privacy.py - Unit test asserting zero source code or secrets leak to Sentry
"""

import unittest
from backend.observability import _scrub_sentry_event, FORBIDDEN_PII_KEYS


class TestObservabilityPrivacy(unittest.TestCase):

    def test_scrub_pii_removes_forbidden_keys_from_spans(self):
        sample_event = {
            "spans": [
                {
                    "op": "gen_ai.chat",
                    "data": {
                        "gen_ai.request.model": "gemma4:e4b",
                        "prompt": "SELECT * FROM users WHERE password = 'secret'",
                        "dead_py2_code": "print 'sensitive code'",
                        "api_key": "sk-12345",
                        "gen_ai.usage.input_tokens": 100,
                    },
                }
            ],
            "extra": {
                "raw_text_or_audio_path": "/path/to/private/file.py",
                "safe_metadata": "all_good",
            },
        }

        cleaned = _scrub_sentry_event(sample_event, {})

        span_data = cleaned["spans"][0]["data"]
        for key in FORBIDDEN_PII_KEYS:
            self.assertNotIn(key, span_data, f"Forbidden key {key} found in scrubbed span data!")

        self.assertIn("gen_ai.request.model", span_data)
        self.assertIn("gen_ai.usage.input_tokens", span_data)
        self.assertEqual(cleaned["extra"]["safe_metadata"], "all_good")
        self.assertNotIn("raw_text_or_audio_path", cleaned["extra"])


if __name__ == "__main__":
    unittest.main()
