"""
tests/test_api_security.py - Security, Concurrency, and Endpoint Verification
"""

import unittest
from fastapi.testclient import TestClient
from backend.app import app


class TestAPISecurityAndHardening(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)

    def test_sandbox_safe_code_passes(self):
        payload = {
            "code": "print('SAFE_RUN')\n",
            "input_args": "",
            "expected_stdout": "SAFE_RUN\n",
            "timeout_sec": 2.0,
        }
        res = self.client.post("/api/sandbox/execute", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["passed"])
        self.assertIn("SAFE_RUN", data["stdout"])

    def test_sandbox_rejects_forbidden_os_system(self):
        payload = {
            "code": "import os\nos.system('whoami')\n",
            "input_args": "",
            "expected_stdout": "",
            "timeout_sec": 2.0,
        }
        res = self.client.post("/api/sandbox/execute", json=payload)
        self.assertEqual(res.status_code, 400)
        data = res.json()
        self.assertIn("os.system", data["detail"])

    def test_sandbox_rejects_forbidden_eval(self):
        payload = {
            "code": "x = eval('__import__(\"sys\").exit(1)')\n",
            "input_args": "",
            "expected_stdout": "",
            "timeout_sec": 2.0,
        }
        res = self.client.post("/api/sandbox/execute", json=payload)
        self.assertEqual(res.status_code, 400)
        data = res.json()
        self.assertIn("eval", data["detail"])

    def test_sandbox_rejects_subprocess_shell_true(self):
        payload = {
            "code": "import subprocess\nsubprocess.Popen('dir', shell=True)\n",
            "input_args": "",
            "expected_stdout": "",
            "timeout_sec": 2.0,
        }
        res = self.client.post("/api/sandbox/execute", json=payload)
        self.assertEqual(res.status_code, 400)
        data = res.json()
        self.assertIn("shell=True", data["detail"])

    def test_audio_eulogy_endpoint(self):
        res = self.client.get("/api/audio/eulogy/shorturl_cli")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.headers["content-type"], "audio/mpeg")


if __name__ == "__main__":
    unittest.main()
