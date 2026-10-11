# File: Languages/common_tests/runner_base.py
import sys
import json
from pathlib import Path
from typing import Callable

def run_reconstruction_test(
    test_config: dict, 
    root_dir: Path, 
    file_class, 
    normalize_code_fn: Callable[[str], str]
) -> tuple[bool, dict | str | None]:
    file_path_str = test_config.get("file")
    parent_path = test_config.get("parent_path", [])
    
    file_path = Path(file_path_str)
    if not file_path.is_absolute():
        file_path = (root_dir / file_path).resolve()

    if not file_path.exists():
        msg = f"File not found -> {file_path}"
        print(f"❌ FAIL: {msg}")
        return False, msg

    target_node = file_class(str(file_path))

    if parent_path:
        target_node = target_node.get(parent_path)
        if target_node is None:
            msg = f"Path {parent_path} not found in {file_path.name}"
            print(f"❌ FAIL: {msg}")
            return False, msg

    original_script = target_node.get_script()
    target_node.load_children()
    reconstructed_script = target_node.get_script()

    norm_original = normalize_code_fn(original_script)
    norm_reconstructed = normalize_code_fn(reconstructed_script)

    if norm_original == norm_reconstructed:
        target_desc = f"path '{' -> '.join(parent_path)}'" if parent_path else "Full File"
        print(f"✅ PASS: [{file_path.name}] ({target_desc}) reconstructed from ({len(target_node.children)} children)")
        return True, None
    else:
        print(f"❌ FAIL Reconstruction Mismatch: [{file_path.name}] (Path: {parent_path})")
        return False, {
            'original_script': original_script,
            'reconstructed_script': reconstructed_script
        }


def execute_suite(test_dir: Path, root_dir: Path, file_class, normalize_code_fn: Callable[[str], str]):
    config_file = test_dir / "tests.json"
    
    if not config_file.exists():
        print(f"Error: Test configuration file not found at {config_file}")
        sys.exit(1)

    with open(config_file, "r", encoding="utf-8") as f:
        tests = json.load(f)

    print(f"Running {len(tests)} test(s) from {config_file.name}...\n")
    
    passed = []
    failed = []

    for idx, test in enumerate(tests, 1):
        test_type = test.get("type")
        if test_type == "reconstruction":
            status, diff = run_reconstruction_test(test, root_dir, file_class, normalize_code_fn)
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

    print(f"\nResults: {len(passed)} Passed, {len(failed)} Failed.")
    
    output = {'passed': passed, 'failed': failed}
    with open(test_dir / 'result.json', 'w', encoding="utf-8") as fp: 
        json.dump(output, fp, indent=2)
     
    if len(failed) > 0:
        sys.exit(1)