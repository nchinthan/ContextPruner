import json
import subprocess
from pathlib import Path
from TreeNode import TreeNode, File

def parse_js_with_babel(script_content: str) -> list:
    """
    Spawns a Node.js process to run babel_parser.js, passing code via stdin
    and reading back the AST JSON representation.
    """
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
            # Syntax error or crash in Node worker
            return []
            
        return json.loads(stdout)
    except FileNotFoundError:
        print("Error: 'node' executable not found. Please ensure Node.js is installed.")
        return []
    except Exception:
        return []


class JSClassNode(TreeNode):
    INDENTATION = 4
    
    def __init__(self, name: str, script: str, inherited_classes: list = None): # pyright: ignore[reportArgumentType]
        super().__init__(name, script, False, 'javascript')
        self.inherited_classes = inherited_classes or []
        
    def get_script(self) -> str:
        # Reconstruct inheritance syntax using 'extends'
        extends_clause = f" extends {', '.join(self.inherited_classes)}" if self.inherited_classes else ""
        indentation = ' ' * JSClassNode.INDENTATION
        
        # Compile child methods/fields and match the user-defined indentation spacing
        child_script = super().get_script().replace('\t', indentation)
        
        class_script = f"class {self.name}{extends_clause} {{\n{child_script}\n}}"
        return class_script


class JSFile(File):
    def __init__(self, path_str: str, language: str = "javascript"):
        super().__init__(path_str, language=language)
        self.dead_end = False

    def load_children(self):
        """
        Processes JavaScript/TypeScript files by mapping Babel AST statement blocks
        into sequential TreeNodes.
        """
        if not self.script:
            return

        ast_body = parse_js_with_babel(self.script)
        if not ast_body:
            return  # Kept as leaf node if parsing yields an empty body or fails

        lines = self.script.splitlines()

        def get_source_segment(start_loc, end_loc):
            # Babel provides 1-based indexing for line numbers
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

        self.children = []
        self.leaf = False

        blocks = []
        current_block_type = None
        current_block_nodes = []

        # Step 1: Scan and group sequential AST elements into types
        for node in ast_body:
            node_type = node.get("type")
            
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
            start_loc = b_nodes[0]["loc"]["start"]
            end_loc = b_nodes[-1]["loc"]["end"]
            block_script = get_source_segment(start_loc, end_loc)

            if b_type == "import_export":
                self.add_child([], TreeNode("imports_exports", block_script, True, "javascript"))

            elif b_type == "expression":
                self.add_child([], TreeNode("expression", block_script, True, "javascript"))

            elif b_type == "func":
                for func_node in b_nodes:
                    f_name = func_node["id"]["name"]
                    f_script = get_source_segment(func_node["loc"]["start"], func_node["loc"]["end"])
                    self.add_child([], TreeNode(f_name, f_script, True, "javascript"))

            elif b_type == "class":
                for class_node in b_nodes:
                    c_name = class_node["id"]["name"]
                    c_script = get_source_segment(class_node["loc"]["start"], class_node["loc"]["end"])
                    
                    # Track inheritance chain (superclasses)
                    inherited = []
                    super_class = class_node.get("superClass")
                    if super_class:
                        if super_class.get("type") == "Identifier":
                            inherited.append(super_class["name"])
                    
                    c_node = JSClassNode(c_name, c_script, inherited_classes=inherited)

                    # Extract methods, constructors, and static features inside the body
                    class_body = class_node.get("body", {}).get("body", [])
                    for member in class_body:
                        m_type = member.get("type")
                        m_script = get_source_segment(member["loc"]["start"], member["loc"]["end"])
                        
                        if m_type in ["ClassMethod","ClassPrivateMethod"]:
                            m_name = get_member_name(member)
                            c_node.add_child([], TreeNode(m_name, m_script, True, "javascript"))

                        elif m_type in ["ClassProperty", "PropertyDefinition","ClassPrivateProperty"]:
                            m_name = get_member_name(member)
                            c_node.add_child([], TreeNode(m_name, m_script, True, "javascript"))
                        else:
                            print(m_script)
                            c_node.add_child([], TreeNode("class_expression", m_script, True, "javascript"))

                    self.add_child([], c_node)

def init():
    # Hook the language factory registers
    File.LANGUAGE_HOOKS['js'] = JSFile
    File.LANGUAGE_HOOKS['ts'] = JSFile
    File.LANGUAGE_HOOKS['javascript'] = JSFile