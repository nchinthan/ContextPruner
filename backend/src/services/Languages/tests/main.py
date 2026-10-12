# File: backend/src/services/Languages/tests/main.py
"""
================================================================================
UNIVERSAL LANGUAGE TEST SUITE DOCUMENTATION
================================================================================

## Directory Structure
Test inputs and configs must be organized under `backend/src/services/Languages/tests/data/`:
    backend/src/services/Languages/tests/data/
    ├── js/
    │   ├── tests.json        # Test suite configuration for JS
    │   ├── sample.js         # Sample code file to test
    │   └── result.json       # Generated test results
    └── python/
        ├── tests.json        # Test suite configuration for Python
        └── sample.py         # Sample code file to test

## How to Use the Test Suite
Run the test suite from your terminal by passing the target language flag (`--lang`):
    python backend/src/services/Languages/tests/main.py --lang js
    python backend/src/services/Languages/tests/main.py --lang python

## Input File Format (`tests.json`)
Each language directory must contain a `tests.json` file formatted as a JSON array 
of test case objects:

[
  {
    "type": "reconstruction",
    "file": "backend/src/services/Languages/tests/data/js/sample.js",
    "parent_path": []
  },
  {
    "type": "reconstruction",
    "file": "backend/src/services/Languages/tests/data/js/sample.js",
    "parent_path": ["functions", 0]
  }
]

### Field Descriptions:
- `type`: Must be `"reconstruction"` to trigger node reconstruction loss checking.
- `file`: Path to the source file (absolute, or relative to the project root directory).
- `parent_path` (Optional): A list of keys/indices used to traverse the AST hierarchy 
  via `File.get(parent_path)`. If omitted or empty `[]`, it tests the full file node.
================================================================================
"""

import sys
import argparse
from pathlib import Path

# Add project root to path
current_dir = Path(__file__).parent.resolve()
root_dir = current_dir.parent.parent.parent.parent
sys.path.append(str(root_dir))

from backend.src.services.Languages.tests import tester

# Import language init hooks and define custom normalizers
from backend.src.services.Languages.js import init as init_js
# from backend.src.services.Languages.python import init as init_python  # Example for future languages


def normalize_js_code(code: str) -> str:
    """Character stream normalization for JS (ignores whitespace/formatting differences)."""
    return ''.join(code.split())


# Registry of supported languages, their init hooks, and custom normalize functions
LANGUAGES = {
    "js": {
        "init": init_js,
        "normalize": normalize_js_code
    },
    # Add other languages here easily:
    # "python": {
    #     "init": init_python,
    #     "normalize": normalize_python_code
    # }
}


def main():
    parser = argparse.ArgumentParser(description="Run universal language parsing & reconstruction tests.")
    parser.add_argument(
        "--lang", 
        type=str, 
        required=True, 
        choices=list(LANGUAGES.keys()), 
        help="The language to test (e.g., js)"
    )
    args = parser.parse_args()

    lang_name = args.lang
    lang_config = LANGUAGES[lang_name]
    data_dir = current_dir / "data" / lang_name

    # Execute test suite via the universal tester
    tester.run_test_suite(
        language_name=lang_name,
        init_fn=lang_config["init"],
        normalize_code=lang_config["normalize"],
        data_dir=data_dir
    )


if __name__ == "__main__":
    main()