# File: Languages/js/JsNodes.py
import json
import subprocess
from pathlib import Path
from TreeNode import TreeNode, File

def parse_js_with_babel(script_content: str) -> list:
    parser_path = Path(__file__).parent / "babel_parser.js"
    try:
        process = subprocess.Popen(
            ["node", str(parser_path)],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8"
        )
        stdout, stderr = process.communicate(input=script_content)
        return json.loads(stdout) if process.returncode == 0 else []
    except Exception:
        return []


def get_bounds(node):
    """Extracts 0-indexed start and end (line, column) positions from Babel AST loc."""
    loc = node["loc"]
    return (
        loc["start"]["line"] - 1, loc["start"]["column"],
        loc["end"]["line"] - 1, loc["end"]["column"]
    )


def extract_segment(lines, start_row, start_col, end_row, end_col):
    """Slices source lines from (start_row, start_col) up to (end_row, end_col)."""
    if start_row == end_row:
        return lines[start_row][start_col:end_col]
    
    segment = [lines[start_row][start_col:]]
    for r in range(start_row + 1, end_row):
        segment.append(lines[r])
    segment.append(lines[end_row][:end_col])
    return "\n".join(segment)


def parse_node(node, lines, curr_row, curr_col):
    """
    1. Method to parse normal nodes.
    Captures text from current cursor position through node's end position.
    This guarantees comments/formatting before and inside the node are included.
    """
    _, _, end_row, end_col = get_bounds(node)
    script = extract_segment(lines, curr_row, curr_col, end_row, end_col)
    return script, end_row , end_col 


def parse_class(node, lines, curr_row, curr_col):
    """
    2. Method to parse class nodes.
    Parses class shell, splits around opening '{', recurses over children, and captures closing '}'.
    """
    start_row, start_col, end_row, end_col = get_bounds(node)
    
    # 1. Capture text up to opening '{' of the class body
    header_raw = extract_segment(lines, curr_row, curr_col, start_row, start_col)
    body_loc = node["body"]["loc"]
    body_start_r, body_start_c = body_loc["start"]["line"] - 1, body_loc["start"]["column"]
    
    class_head = extract_segment(lines, start_row, start_col, body_start_r, body_start_c + 1)
    
    # Outer template shell
    outer_script = (header_raw + class_head).replace('{', '{{').replace('}', '}}') + "\n{}\n}}"
    
    # Advance cursor right past '{'
    c_row, c_col = body_start_r, body_start_c + 1
    
    # 2. Parse class members recursively using parse_node
    children_nodes = []
    class_members = node.get("body", {}).get("body", [])
    
    for child in class_members:
        m_type = child.get("type")
        key = child.get("key", {})
        m_name = key.get("name") or key.get("value") or "member"
        
        child_script, c_row, c_col = parse_node(child, lines, c_row, c_col)
        children_nodes.append(TreeNode(m_name, child_script, True, "javascript"))
        
    # 3. Capture remaining body text up to closing '}'
    body_end_r, body_end_c = body_loc["end"]["line"] - 1, body_loc["end"]["column"]
    trailer = extract_segment(lines, c_row, c_col, body_end_r, body_end_c-1)
    
    if trailer.strip():
        children_nodes.append(TreeNode('trailing_comments',trailer,True,''))
    
    return children_nodes, outer_script, body_end_r, body_end_c


class JSClassNode(TreeNode):
    INDENTATION = 4
    
    def __init__(self, name: str, script: str, inherited_classes: list = None, outer_script: str = None):
        super().__init__(name, script, False, 'javascript')
        self.inherited_classes = inherited_classes or []
        self.outer_script = outer_script or "class " + name + " {{\n{}\n}}"
        
    def get_script(self) -> str:
        indentation = ' ' * JSClassNode.INDENTATION
        child_script = super().get_script().replace('\t', indentation)
        return self.outer_script.format(child_script if child_script else "")


class JSFile(File):
    def __init__(self, path_str: str, language: str = "javascript"):
        super().__init__(path_str, language=language)
        self.dead_end = False

    def load_children(self):
        if not self.script:
            return

        ast_body = parse_js_with_babel(self.script)
        if not ast_body:
            return

        lines = self.script.splitlines()
        self.children = []
        self.leaf = False

        curr_row = 0
        curr_col = 0
        
        pending_misc_script = ""

        for node in ast_body:
            n_type = node.get("type")
            
            # Unwrap exports
            if n_type in ["ExportNamedDeclaration", "ExportDefaultDeclaration"] and node.get("declaration"):
                inner = node["declaration"]
                if inner.get("type") in ["ClassDeclaration", "FunctionDeclaration"]:
                    node = inner
                    n_type = node.get("type")

            if n_type == "ClassDeclaration":
                # Flush non-class/non-function segment collected prior
                if pending_misc_script:
                    self.add_child([], TreeNode("expressions", pending_misc_script, True, "javascript"))
                    pending_misc_script = ""

                c_name = node.get("id", {}).get("name", "default") if node.get("id") else "default"
                children_nodes, outer_script, curr_row, curr_col = parse_class(node, lines, curr_row, curr_col)
                
                c_node = JSClassNode(c_name, "", outer_script=outer_script)
                c_node.children = children_nodes
                c_node.leaf = len(children_nodes) == 0
                self.add_child([], c_node)

            elif n_type == "FunctionDeclaration":
                if pending_misc_script:
                    self.add_child([], TreeNode("expressions", pending_misc_script, True, "javascript"))
                    pending_misc_script = ""

                f_name = node.get("id", {}).get("name", "default") if node.get("id") else "default"
                f_script, curr_row, curr_col = parse_node(node, lines, curr_row, curr_col)
                self.add_child([], TreeNode(f_name, f_script, True, "javascript"))

            else:
                chunk, curr_row, curr_col = parse_node(node, lines, curr_row, curr_col)
                pending_misc_script += chunk

        # Capture any leftover text at end of file
        if curr_row < len(lines):
            rest = extract_segment(lines, curr_row, curr_col, len(lines) - 1, len(lines[-1]))
            pending_misc_script += rest

        if pending_misc_script:
            self.add_child([], TreeNode("expressions", pending_misc_script, True, "javascript"))


def init():
    File.LANGUAGE_HOOKS['.js'] = JSFile
    File.LANGUAGE_HOOKS['.ts'] = JSFile
    File.LANGUAGE_HOOKS['js'] = JSFile
    File.LANGUAGE_HOOKS['ts'] = JSFile
    File.LANGUAGE_HOOKS['javascript'] = JSFile