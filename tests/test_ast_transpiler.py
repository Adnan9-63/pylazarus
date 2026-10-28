"""
tests/test_ast_transpiler.py - Unit tests for deterministic Python 2 -> 3 syntax transforms
"""

import ast
import unittest
from backend.ast_transpiler import transpile_py2_syntax_deterministically, check_syntax_validity


class TestASTTranspiler(unittest.TestCase):

    def test_print_statement_conversion(self):
        py2 = 'print "Hello world"'
        py3, rules = transpile_py2_syntax_deterministically(py2)
        self.assertEqual(py3, 'print("Hello world")')
        self.assertIn("PRINT_STATEMENT_TO_FUNCTION", rules)

    def test_print_multi_argument_and_trailing_comma(self):
        py2 = 'print "Count:", x,'
        py3, rules = transpile_py2_syntax_deterministically(py2)
        self.assertEqual(py3, 'print("Count:", x, end=" ")')

    def test_except_comma_syntax(self):
        py2 = "try:\n    pass\nexcept ValueError, err:\n    pass"
        py3, rules = transpile_py2_syntax_deterministically(py2)
        self.assertIn("except ValueError as err:", py3)
        self.assertIn("EXCEPT_COMMA_TO_AS", rules)

    def test_xrange_conversion(self):
        py2 = "for i in xrange(10):\n    pass"
        py3, rules = transpile_py2_syntax_deterministically(py2)
        self.assertIn("range(10)", py3)
        self.assertIn("XRANGE_TO_RANGE", rules)

    def test_raw_input_conversion(self):
        py2 = 'name = raw_input("Enter name: ")'
        py3, rules = transpile_py2_syntax_deterministically(py2)
        self.assertIn('input("Enter name: ")', py3)
        self.assertIn("RAW_INPUT_TO_INPUT", rules)

    def test_dict_iteration_methods(self):
        py2 = "for k, v in data.iteritems():\n    pass\nfor k in data.iterkeys():\n    pass\nfor v in data.itervalues():\n    pass"
        py3, rules = transpile_py2_syntax_deterministically(py2)
        self.assertIn(".items():", py3)
        self.assertIn(".keys():", py3)
        self.assertIn(".values():", py3)
        self.assertIn("ITERITEMS_TO_ITEMS", rules)

    def test_has_key_replacement(self):
        py2 = 'if config.has_key("debug"):\n    pass'
        py3, rules = transpile_py2_syntax_deterministically(py2)
        self.assertIn('("debug" in config):', py3)
        self.assertIn("HAS_KEY_TO_IN_OPERATOR", rules)

    def test_unicode_and_basestring(self):
        py2 = "x = unicode(s)\nif isinstance(y, basestring):\n    pass"
        py3, rules = transpile_py2_syntax_deterministically(py2)
        self.assertIn("x = str(s)", py3)
        self.assertIn("isinstance(y, str):", py3)
        self.assertIn("UNICODE_TO_STR", rules)
        self.assertIn("BASESTRING_TO_STR", rules)

    def test_long_literal_and_inequality(self):
        py2 = "val = 1048576L\nif a <> b:\n    pass"
        py3, rules = transpile_py2_syntax_deterministically(py2)
        self.assertIn("val = 1048576", py3)
        self.assertIn("a != b:", py3)
        self.assertIn("STRIP_LONG_LITERAL_SUFFIX", rules)
        self.assertIn("REPLACE_DIAMOND_INEQUALITY", rules)

    def test_compat_stdlib_imports(self):
        py2 = "import urllib2\nimport StringIO\nimport commands"
        py3, rules = transpile_py2_syntax_deterministically(py2)
        self.assertIn("import urllib.request as urllib2", py3)
        self.assertIn("import io as StringIO", py3)
        self.assertIn("import subprocess as commands", py3)

    def test_print_chevron_syntax(self):
        py2 = 'print >> sys.stderr, "Fatal error:", err'
        py3, rules = transpile_py2_syntax_deterministically(py2)
        self.assertEqual(py3, 'print("Fatal error:", err, file=sys.stderr)')
        self.assertIn("PRINT_CHEVRON_TO_FILE_ARG", rules)

        py2_trailing = 'print >> sys.stderr, "Partial...",'
        py3_trailing, _ = transpile_py2_syntax_deterministically(py2_trailing)
        self.assertEqual(py3_trailing, 'print("Partial...", end=" ", file=sys.stderr)')

    def test_octal_literal_syntax(self):
        py2 = "permissions = 0755\numask = 0022"
        py3, rules = transpile_py2_syntax_deterministically(py2)
        self.assertIn("0o755", py3)
        self.assertIn("0o022", py3)
        self.assertIn("OCTAL_LITERAL_TO_0O", rules)

    def test_additional_stdlib_imports(self):
        py2 = "from HTMLParser import HTMLParser\nfrom Queue import Queue\nfrom urlparse import urlparse"
        py3, rules = transpile_py2_syntax_deterministically(py2)
        self.assertIn("from html.parser import HTMLParser", py3)
        self.assertIn("from queue import Queue", py3)
        self.assertIn("from urllib.parse import urlparse", py3)
        self.assertIn("HTMLPARSER_COMPAT_IMPORT", rules)
        self.assertIn("QUEUE_COMPAT_IMPORT", rules)
        self.assertIn("URLPARSE_COMPAT_IMPORT", rules)

    def test_full_script_transpilation_ast_validity(self):
        py2_script = """
import urllib2
import StringIO

def fetch_data(url):
    try:
        response = urllib2.urlopen(url)
        content = response.read()
        return unicode(content)
    except urllib2.URLError, e:
        print "Fetch failed:", e
        return None

def process_batch(items):
    out = []
    for idx in xrange(len(items)):
        if items[idx] <> 0L:
            out.append(items[idx])
    return out
"""
        py3_script, rules = transpile_py2_syntax_deterministically(py2_script)
        valid, err = check_syntax_validity(py3_script)
        self.assertTrue(valid, f"Transpiled code failed Python 3 AST parse: {err}")
        self.assertGreaterEqual(len(rules), 4)


if __name__ == "__main__":
    unittest.main()
