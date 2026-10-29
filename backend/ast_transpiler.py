"""
backend/ast_transpiler.py - Stage 1: Deterministic Python 2 -> Python 3 Syntax Transpiler

Executes mechanical, rule-based syntax modernization in <15ms with zero LLM calls.
Handles:
- print statements -> print() function
- except Exception, err -> except Exception as err
- xrange -> range
- dict.iteritems() / iterkeys() / itervalues() -> .items() / .keys() / .values()
- raw_input -> input
- unicode / basestring -> str
- urllib2 / commands / StringIO imports -> modern Python 3 equivalents
- <> inequality -> !=
- long literals (e.g. 100L) -> 100
- dict.has_key(k) -> (k in dict)
"""

from __future__ import annotations

import ast
import re
from typing import List, Tuple


def transpile_py2_syntax_deterministically(py2_code: str) -> Tuple[str, List[str]]:
    """
    Deterministically transforms Python 2 syntax into Python 3 compatible syntax.
    Returns:
        (transformed_code, list_of_applied_rules)
    """
    applied_rules: List[str] = []
    lines = py2_code.splitlines()
    transformed_lines: List[str] = []

    for line_idx, line in enumerate(lines, start=1):
        original_line = line
        modified = line

        # 1. Inequality operator: <> -> !=
        if "<>" in modified:
            modified = modified.replace("<>", "!=")
            if "REPLACE_DIAMOND_INEQUALITY" not in applied_rules:
                applied_rules.append("REPLACE_DIAMOND_INEQUALITY")

        # 2. print statement -> print() function (handling chevrons >> stream, trailing comma, and multi-arg)
        chevron_match = re.match(r"^(\s*)print\s+>>\s*([^,]+)(?:,\s*(.+))?$", modified)
        if chevron_match:
            indent = chevron_match.group(1)
            stream = chevron_match.group(2).strip()
            args = (chevron_match.group(3) or "").rstrip()
            if args.endswith(","):
                inner = args[:-1].strip()
                modified = f'{indent}print({inner}, end=" ", file={stream})' if inner else f'{indent}print(end=" ", file={stream})'
            elif args:
                modified = f"{indent}print({args}, file={stream})"
            else:
                modified = f"{indent}print(file={stream})"
            if "PRINT_CHEVRON_TO_FILE_ARG" not in applied_rules:
                applied_rules.append("PRINT_CHEVRON_TO_FILE_ARG")
        else:
            print_match = re.match(r"^(\s*)print\s+(?!\()(.+)$", modified)
            if print_match:
                indent = print_match.group(1)
                content = print_match.group(2).rstrip()
                if content.endswith(","):
                    # Trailing comma in Python 2 suppressed newline: print "x", -> print("x", end=" ")
                    inner = content[:-1].strip()
                    modified = f'{indent}print({inner}, end=" ")'
                else:
                    modified = f"{indent}print({content})"
                if "PRINT_STATEMENT_TO_FUNCTION" not in applied_rules:
                    applied_rules.append("PRINT_STATEMENT_TO_FUNCTION")

        # 2b. Octal integer literals: 0755 -> 0o755
        octal_match = re.search(r"(?<![\w\.])0([0-7]+)(?![\w\.])", modified)
        if octal_match and not modified.strip().startswith("#"):
            modified = re.sub(r"(?<![\w\.])0([0-7]+)(?![\w\.])", r"0o\1", modified)
            if "OCTAL_LITERAL_TO_0O" not in applied_rules:
                applied_rules.append("OCTAL_LITERAL_TO_0O")

        # 3. except Exception, err -> except Exception as err
        except_match = re.match(r"^(\s*except\s+[\w\.\(\)\,\s]+),\s*([a-zA-Z_]\w*)\s*:\s*(#.*)?$", modified)
        if except_match:
            base_except = except_match.group(1)
            err_var = except_match.group(2)
            comment = f" {except_match.group(3)}" if except_match.group(3) else ""
            modified = f"{base_except} as {err_var}:{comment}"
            if "EXCEPT_COMMA_TO_AS" not in applied_rules:
                applied_rules.append("EXCEPT_COMMA_TO_AS")

        # 4. xrange( -> range(
        if re.search(r"\bxrange\(", modified):
            modified = re.sub(r"\bxrange\(", "range(", modified)
            if "XRANGE_TO_RANGE" not in applied_rules:
                applied_rules.append("XRANGE_TO_RANGE")

        # 5. raw_input( -> input(
        if re.search(r"\braw_input\(", modified):
            modified = re.sub(r"\braw_input\(", "input(", modified)
            if "RAW_INPUT_TO_INPUT" not in applied_rules:
                applied_rules.append("RAW_INPUT_TO_INPUT")

        # 6. unicode( -> str( and basestring -> str
        if re.search(r"\bunicode\(", modified):
            modified = re.sub(r"\bunicode\(", "str(", modified)
            if "UNICODE_TO_STR" not in applied_rules:
                applied_rules.append("UNICODE_TO_STR")

        if re.search(r"\bbasestring\b", modified):
            modified = re.sub(r"\bbasestring\b", "str", modified)
            if "BASESTRING_TO_STR" not in applied_rules:
                applied_rules.append("BASESTRING_TO_STR")

        # 7. dict.iteritems() / .iterkeys() / .itervalues()
        if ".iteritems()" in modified:
            modified = modified.replace(".iteritems()", ".items()")
            if "ITERITEMS_TO_ITEMS" not in applied_rules:
                applied_rules.append("ITERITEMS_TO_ITEMS")

        if ".iterkeys()" in modified:
            modified = modified.replace(".iterkeys()", ".keys()")
            if "ITERKEYS_TO_KEYS" not in applied_rules:
                applied_rules.append("ITERKEYS_TO_KEYS")

        if ".itervalues()" in modified:
            modified = modified.replace(".itervalues()", ".values()")
            if "ITERVALUES_TO_VALUES" not in applied_rules:
                applied_rules.append("ITERVALUES_TO_VALUES")

        # 8. dict.has_key(k) -> (k in dict)
        has_key_match = re.search(r"(\b[\w\.]+)\.has_key\((.+?)\)", modified)
        if has_key_match:
            d_var = has_key_match.group(1)
            k_var = has_key_match.group(2)
            modified = modified.replace(has_key_match.group(0), f"({k_var} in {d_var})")
            if "HAS_KEY_TO_IN_OPERATOR" not in applied_rules:
                applied_rules.append("HAS_KEY_TO_IN_OPERATOR")

        # 9. Long literals: 100L or 0L -> 100 or 0
        long_match = re.search(r"\b(\d+)L\b", modified)
        if long_match:
            modified = re.sub(r"\b(\d+)L\b", r"\1", modified)
            if "STRIP_LONG_LITERAL_SUFFIX" not in applied_rules:
                applied_rules.append("STRIP_LONG_LITERAL_SUFFIX")

        # 10. Removed stdlib module rewrites:
        # urllib2 -> urllib.request
        if re.search(r"\bimport urllib2\b", modified):
            modified = re.sub(r"\bimport urllib2\b", "import urllib.request as urllib2", modified)
            if "URLLIB2_COMPAT_IMPORT" not in applied_rules:
                applied_rules.append("URLLIB2_COMPAT_IMPORT")

        # StringIO / cStringIO -> io.StringIO / io.BytesIO
        if re.search(r"\bimport (cStringIO|StringIO)\b", modified):
            modified = re.sub(r"\bimport (cStringIO|StringIO)\b", "import io as StringIO", modified)
            if "STRINGIO_TO_IO" not in applied_rules:
                applied_rules.append("STRINGIO_TO_IO")

        # commands.getstatusoutput -> subprocess
        if re.search(r"\bimport commands\b", modified):
            modified = re.sub(r"\bimport commands\b", "import subprocess as commands", modified)
            if "COMMANDS_TO_SUBPROCESS" not in applied_rules:
                applied_rules.append("COMMANDS_TO_SUBPROCESS")

        # HTMLParser -> html.parser
        if re.search(r"^\s*from HTMLParser import\b", modified):
            modified = re.sub(r"^\s*from HTMLParser import\b", "from html.parser import", modified)
            if "HTMLPARSER_COMPAT_IMPORT" not in applied_rules:
                applied_rules.append("HTMLPARSER_COMPAT_IMPORT")
        elif re.search(r"^\s*import HTMLParser\b", modified):
            modified = re.sub(r"^\s*import HTMLParser\b", "import html.parser as HTMLParser", modified)
            if "HTMLPARSER_COMPAT_IMPORT" not in applied_rules:
                applied_rules.append("HTMLPARSER_COMPAT_IMPORT")

        # Queue -> queue
        if re.search(r"^\s*from Queue import\b", modified):
            modified = re.sub(r"^\s*from Queue import\b", "from queue import", modified)
            if "QUEUE_COMPAT_IMPORT" not in applied_rules:
                applied_rules.append("QUEUE_COMPAT_IMPORT")
        elif re.search(r"^\s*import Queue\b", modified):
            modified = re.sub(r"^\s*import Queue\b", "import queue as Queue", modified)
            if "QUEUE_COMPAT_IMPORT" not in applied_rules:
                applied_rules.append("QUEUE_COMPAT_IMPORT")

        # urlparse -> urllib.parse
        if re.search(r"^\s*from urlparse import\b", modified):
            modified = re.sub(r"^\s*from urlparse import\b", "from urllib.parse import", modified)
            if "URLPARSE_COMPAT_IMPORT" not in applied_rules:
                applied_rules.append("URLPARSE_COMPAT_IMPORT")
        elif re.search(r"^\s*import urlparse\b", modified):
            modified = re.sub(r"^\s*import urlparse\b", "import urllib.parse as urlparse", modified)
            if "URLPARSE_COMPAT_IMPORT" not in applied_rules:
                applied_rules.append("URLPARSE_COMPAT_IMPORT")

        # ConfigParser -> configparser
        if re.search(r"^\s*from ConfigParser import\b", modified):
            modified = re.sub(r"^\s*from ConfigParser import\b", "from configparser import", modified)
            if "CONFIGPARSER_COMPAT_IMPORT" not in applied_rules:
                applied_rules.append("CONFIGPARSER_COMPAT_IMPORT")
        elif re.search(r"^\s*import ConfigParser\b", modified):
            modified = re.sub(r"^\s*import ConfigParser\b", "import configparser as ConfigParser", modified)
            if "CONFIGPARSER_COMPAT_IMPORT" not in applied_rules:
                applied_rules.append("CONFIGPARSER_COMPAT_IMPORT")

        transformed_lines.append(modified)

    result_code = "\n".join(transformed_lines)
    return result_code, applied_rules


def check_syntax_validity(code: str) -> Tuple[bool, Optional[str]]:
    """Checks whether the transformed code parses cleanly as Python 3 AST."""
    try:
        ast.parse(code)
        return True, None
    except (SyntaxError, ValueError) as e:
        err_msg = f"SyntaxError at line {getattr(e, 'lineno', '?')}: {getattr(e, 'msg', str(e))}" if isinstance(e, SyntaxError) else f"AST Parse Error: {e}"
        return False, err_msg
