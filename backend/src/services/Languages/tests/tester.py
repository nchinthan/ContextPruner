# File: backend/src/services/Languages/tests/tester.py
import sys
import json
from pathlib import Path

# Determine project root directory
tester_dir = Path(__file__).parent.resolve()
# Adjust based on depth: backend/src/services/Languages/tests -> root
root_dir = tester_dir.parent.parent.parent.parent

from backend.src.services.TreeNode import File 

def run_reconstruction_test(test_config: dict, root_dir: Path, normalize_code) -> tuple[bool, str | dict | None]:
    file_path_str = test_config.get("file")
    parent_path = test_config.get("parent_path", [])
    
    file_path = Path(file_path_str)
    if not file_path.is_absolute():
        file_path = (root_dir / file_path).resolve()

    if not file_path.exists():
        msg = f"File not found -> {file_path}"
        print(f"❌ FAIL: {msg}")
        return False, msg

    # Instantiate File object for the target language
    file_obj = File(str(file_path))

    # Determine target node based on parent_path
    if not parent_path:
        target_node = file_obj
    else:
        target_node = file_obj.get(parent_path)
        if target_node is None:
            msg = f"Path {parent_path} not found in {file_path.name}"
            print(f"❌ FAIL: {msg}")
            return False, msg

    # Extract original code segment or entire file
    original_script = target_node.get_script() 
    
    # Load children forces reconstruction from children nodes
    target_node.load_children() 
    
    # Trigger dynamic reconstruction
    reconstructed_script = target_node.get_script()

    norm_original = normalize_code(original_script)
    norm_reconstructed = normalize_code(reconstructed_script)

    if norm_original == norm_reconstructed:
        target_desc = f"path '{' -> '.join(map(str, parent_path))}'" if parent_path else "Full File"
        print(f"✅ PASS: [{file_path.name}] ({target_desc}) reconstructed from ({len(target_node.children)}) children")
        return True, None
    else:
        print(f"❌ FAIL Reconstruction Mismatch: [{file_path.name}] (Path: {parent_path})")
        return False, {
            'original_script': original_script,
            'reconstructed_script': reconstructed_script
        }


def run_test_suite(language_name: str, init_fn, normalize_code, data_dir: Path = None):
    """Universal runner for any registered language test suite."""
    if init_fn:
        init_fn()

    if data_dir is None:
        data_dir = tester_dir / "data" / language_name
    
    config_file = data_dir / "tests.json"
    if not config_file.exists():
        print(f"Error: Test configuration file not found at {config_file}")
        sys.exit(1)

    with open(config_file, "r", encoding="utf-8") as f:
        tests = json.load(f)

    print(f"Running {len(tests)} test(s) for language '{language_name}' from {config_file}...\n")
    
    passed = []
    failed = []

    for idx, test in enumerate(tests, 1):
        test_type = test.get("type")
        if test_type == "reconstruction":
            status, diff = run_reconstruction_test(test, root_dir, normalize_code)
            if status:
                passed.append(test.get('file'))
            else:
                failed.append({
                    'file': test.get('file'),
                    'parent_path': test.get('parent_path', []),
                    'diff': diff
                })
        else:
            print(f"⚠️ SKIPPED: Unknown test type '{test_type}' in test #{idx}")

    print(f"\nResults for [{language_name.upper()}]: {len(passed)} Passed, {len(failed)} Failed.")
    
    output = {
        'language': language_name,
        'passed': passed, 
        'failed': failed
    }
    
    result_file = data_dir / 'result.json'
    with open(result_file, 'w', encoding="utf-8") as fp: 
        json.dump(output, fp, indent=2)
        print(f"Output written to {result_file}")
     
    if len(failed) > 0:
        sys.exit(1)