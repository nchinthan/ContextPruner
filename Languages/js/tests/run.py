# File: Languages/js/test/run_tests.py
import sys
import json
import difflib
from pathlib import Path

# Add project root to path so modules can be imported
js_test_dir = Path(__file__).parent.resolve()
js_nodes_dir = js_test_dir.parent
root_dir = js_nodes_dir.parent.parent

sys.path.insert(0, str(root_dir))
sys.path.insert(0, str(js_nodes_dir))

from JsNodes import File, init as init_js_nodes

# Register language hooks
init_js_nodes()
##################################
# file = File("D:/projects_current/chowka bara/ui.js")
# sys.stdout = open(js_test_dir / 'output.txt', 'w')

# file.load_children()
# exit()
####################################


def normalize_code(code: str) -> str:
    """charactar stream as any amount of space doesnt give much effect on js output"""
    return ''.join(code.split())


def run_reconstruction_test(test_config: dict) -> tuple[bool, str | None]:
    file_path_str = test_config.get("file")
    parent_path = test_config.get("parent_path", [])
    
    file_path = Path(file_path_str)
    if not file_path.is_absolute():
        file_path = (root_dir / file_path).resolve()

    if not file_path.exists():
        msg = f"File not found -> {file_path}"
        print(f"❌ FAIL: {msg}")
        return False, msg

    # Instantiate JSFile without writing or modifying files
    js_file = File(str(file_path))

    # Determine target node based on parent_path
    if not parent_path:
        target_node = js_file
    else:
        target_node = js_file.get(parent_path)
        if target_node is None:
            msg = f"Path {parent_path} not found in {file_path.name}"
            print(f"❌ FAIL: {msg}")
            return False, msg

    # Extract original code segment or entire file
    original_script = target_node.get_script() 
    
    target_node.load_children() # load children forces get script to construct script from children 
    
    # Trigger dynamic reconstruction via children
    reconstructed_script = target_node.get_script()

    norm_original = normalize_code(original_script)
    norm_reconstructed = normalize_code(reconstructed_script)

    if norm_original == norm_reconstructed:
        target_desc = f"path '{' -> '.join(parent_path)}'" if parent_path else "Full File"
        print(f"✅ PASS: [{file_path.name}] ({target_desc}) reconstructed from ({len(target_node.children)})")
        return True, None
    else:
        print(f"❌ FAIL Reconstruction Mismatch: [{file_path.name}] (Path: {parent_path})")
        return False, {'original_script':original_script,'reconstructed_script':reconstructed_script}


def main():
    config_file = js_test_dir / "tests.json"
    
    if not config_file.exists():
        print(f"Error: Test configuration file not found at {config_file}")
        sys.exit(1)

    with open(config_file, "r", encoding="utf-8") as f:
        tests = json.load(f)

    print(f"Running {len(tests)} test(s) from tests.json...\n")
    
    passed = []
    failed = []

    for idx, test in enumerate(tests, 1):
        test_type = test.get("type")
        if test_type == "reconstruction":
            status, diff = run_reconstruction_test(test)
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
    
    output = {
        'passed': passed, 
        'failed': failed
    }
    with open(js_test_dir / 'result.json', 'w', encoding="utf-8") as fp: 
        json.dump(output, fp, indent=2)
        print('output to',js_test_dir / 'result.json')
     
    if len(failed) > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()