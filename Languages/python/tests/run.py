# File: Languages/python/tests/run.py
import sys
import tokenize
import io
from pathlib import Path

py_test_dir = Path(__file__).parent.resolve()
py_nodes_dir = py_test_dir.parent
root_dir = py_nodes_dir.parent.parent

sys.path.insert(0, str(root_dir))
sys.path.insert(0, str(py_nodes_dir))
sys.path.insert(0, str(py_nodes_dir.parent / "common_tests"))

from PythonNodes import File, init as init_py_nodes
from runner_base import execute_suite

init_py_nodes()

def normalize_code_python(code: str) -> str:
    """
    Python: Normalizes indentation and strips comments/blank lines using tokenization
    to account for whitespace significance in Python syntax.
    """
    try:
        tokens = tokenize.generate_tokens(io.StringIO(code).readline)
        result = []
        for toknum, tokval, _, _, _ in tokens:
            if toknum not in (tokenize.COMMENT, tokenize.NL, tokenize.NEWLINE):
                result.append(tokval)
        return "".join(result)
    except Exception:
        # Fallback to standard line whitespace normalization if tokenizer fails
        return "\n".join(line.strip() for line in code.splitlines() if line.strip())

if __name__ == "__main__":
    execute_suite(py_test_dir, root_dir, File, normalize_code_python)