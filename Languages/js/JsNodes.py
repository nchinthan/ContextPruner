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
        
        if process.returncode != 0:
            return []
            
        return json.loads(stdout)
    except Exception:
        return []


class JSClassNode(TreeNode):
    INDENTATION = 4
    
    def __init__(self, name: str, script: str, inherited_classes: list = None, outer_script: str = None):
        super().__init__(name, script, False, 'javascript')
        self.inherited_classes = inherited_classes or []
        self.outer_script = outer_script or "class " + name + " {{\n{}\n}}"
        
    def get_script(self) -> str:
        indentation = ' ' * JSClassNode.INDENTATION
        child_script = super().get_script().replace('\t', indentation)
        
        if child_script:
            return self.outer_script.format(child_script)
        else:
            return self.outer_script.format("")


class JSFile(File):
    def __init__(self, path_str: str, language: str = "javascript"):
        super().__init__(path_str, language=language)
        self.dead_end = False

    def load_children(self):
        if not self.script:
            return

        ast_body = parse_js_with_babel(self.script)
        print(json.dumps(ast_body,indent=2))
        if not ast_body:
            return

        lines = self.script.splitlines()

        def get_expanded_node_loc(node):
            """Calculates line bounds including leading comments attached to the node."""
            start_line = node["loc"]["start"]["line"]
            end_line = node["loc"]["end"]["line"]

            for comment in node.get("leadingComments", []):
                if "loc" in comment:
                    start_line = min(start_line, comment["loc"]["start"]["line"])

            return {"line": start_line}, {"line": end_line}

        def get_source_segment(start_loc, end_loc):
            if not start_loc or not end_loc:
                return ""
            return "\n".join(lines[start_loc['line'] - 1 : end_loc['line']])

        def get_member_name(member):
            key = member.get("key", {})

            if key.get("type") == "Identifier":
                return key["name"]
            if key.get("type") == "PrivateName":
                return "#" + key["id"]["name"]
            if key.get("type") == "StringLiteral":
                return key["value"]
            if key.get("type") == "NumericLiteral":
                return str(key["value"])

            return "<computed>"

        def unwrap_ast_node(node):
            node_type = node.get("type")
            if node_type in ["ExportNamedDeclaration", "ExportDefaultDeclaration"]:
                declaration = node.get("declaration")
                if declaration and isinstance(declaration, dict):
                    inner_type = declaration.get("type")
                    if inner_type in ["ClassDeclaration", "FunctionDeclaration"]:
                        declaration["loc"] = node["loc"]
                        declaration["leadingComments"] = node.get("leadingComments", [])
                        return inner_type, declaration

            return node_type, node

        self.children = []
        self.leaf = False

        blocks = []
        current_block_type = None
        current_block_nodes = []

        # Step 1: Scan and group sequential AST elements
        for raw_node in ast_body:
            node_type, node = unwrap_ast_node(raw_node)
            
            if node_type in ["ImportDeclaration", "ExportNamedDeclaration", "ExportDefaultDeclaration"]:
                b_type = "import_export"
            elif node_type in ["FunctionDeclaration"]:
                b_type = "func"
            elif node_type in ["ClassDeclaration"]:
                b_type = "class"
            else:
                b_type = "expression"

            if current_block_type and current_block_type != b_type:
                blocks.append((current_block_type, current_block_nodes))
                current_block_nodes = []

            current_block_type = b_type
            current_block_nodes.append(node)

        if current_block_type and current_block_nodes:
            blocks.append((current_block_type, current_block_nodes))

        # Step 2: Convert structural blocks into TreeNodes
        for b_type, b_nodes in blocks:
            start_loc, _ = get_expanded_node_loc(b_nodes[0])
            _, end_loc = get_expanded_node_loc(b_nodes[-1])
            block_script = get_source_segment(start_loc, end_loc)

            if b_type == "import_export":
                self.add_child([], TreeNode("imports_exports", block_script, True, "javascript"))

            elif b_type == "expression":
                self.add_child([], TreeNode("expression", block_script, True, "javascript"))

            elif b_type == "func":
                for func_node in b_nodes:
                    f_start, f_end = get_expanded_node_loc(func_node)
                    f_name = func_node.get("id", {}).get("name") if func_node.get("id") else "default"
                    f_script = get_source_segment(f_start, f_end)
                    self.add_child([], TreeNode(f_name, f_script, True, "javascript"))

            elif b_type == "class":
                for class_node in b_nodes:
                    # IMPORTANT: Use unexpanded AST bounds for the class shell header/footer
                    raw_c_start = class_node["loc"]["start"]
                    raw_c_end = class_node["loc"]["end"]
                    c_script = get_source_segment(raw_c_start, raw_c_end)
                    
                    c_name = class_node.get("id", {}).get("name") if class_node.get("id") else "default"
                    
                    inherited = []
                    super_class = class_node.get("superClass")
                    if super_class and super_class.get("type") == "Identifier":
                        inherited.append(super_class["name"])
                    
                    first_brace_idx = c_script.find('{')
                    last_brace_idx = c_script.rfind('}')
                    
                    if first_brace_idx != -1 and last_brace_idx != -1:
                        header = c_script[:first_brace_idx + 1]
                        footer = c_script[last_brace_idx:]
                        outer_script = header.replace('{', '{{').replace('}', '}}') + "\n{}\n" + footer.replace('{', '{{').replace('}', '}}')
                        outer_script = outer_script.replace('{{}}', '{}')
                    else:
                        outer_script = c_script + "\n{{\n{}\n}}"

                    c_node = JSClassNode(c_name, c_script, inherited_classes=inherited, outer_script=outer_script)

                    class_body = class_node.get("body", {}).get("body", [])
                    
                    # Track lines occupied by members (and their leading comments)
                    occupied_line_ranges = []
                    for member in class_body:
                        m_start, m_end = get_expanded_node_loc(member)
                        occupied_line_ranges.append((m_start["line"], m_end["line"]))

                    # Collect unattached orphan comments in the class body
                    body_comments = class_node.get("body", {}).get("innerComments", [])
                    for comm in body_comments:
                        c_start_line = comm["loc"]["start"]["line"]
                        c_end_line = comm["loc"]["end"]["line"]
                        
                        is_attached = any(
                            r_start <= c_start_line and c_end_line <= r_end
                            for r_start, r_end in occupied_line_ranges
                        )
                        
                        if not is_attached:
                            comm_script = get_source_segment(comm["loc"]["start"], comm["loc"]["end"])
                            c_node.add_child([], TreeNode("comment", comm_script, True, "javascript"))

                    for member in class_body:
                        m_type = member.get("type")
                        m_start, m_end = get_expanded_node_loc(member)
                        m_script = get_source_segment(m_start, m_end)
                        
                        if m_type in ["ClassMethod", "ClassPrivateMethod"]:
                            m_name = get_member_name(member)
                            c_node.add_child([], TreeNode(m_name, m_script, True, "javascript"))

                        elif m_type in ["ClassProperty", "PropertyDefinition", "ClassPrivateProperty"]:
                            m_name = get_member_name(member)
                            c_node.add_child([], TreeNode(m_name, m_script, True, "javascript"))
                        else:
                            c_node.add_child([], TreeNode("class_expression", m_script, True, "javascript"))

                    self.add_child([], c_node)

def init():
    File.LANGUAGE_HOOKS['.js'] = JSFile
    File.LANGUAGE_HOOKS['.ts'] = JSFile
    File.LANGUAGE_HOOKS['js'] = JSFile
    File.LANGUAGE_HOOKS['ts'] = JSFile
    File.LANGUAGE_HOOKS['javascript'] = JSFile