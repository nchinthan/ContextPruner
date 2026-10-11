# File: Languages/python/tests/result_view.py
import sys
from pathlib import Path

py_test_dir = Path(__file__).parent.resolve()
root_dir = py_test_dir.parent.parent.parent
sys.path.insert(0, str(root_dir / "Languages" / "common_tests"))

from result_view import launch_viewer

if __name__ == "__main__":
    launch_viewer(py_test_dir / "result.json")