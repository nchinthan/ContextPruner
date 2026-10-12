from backend.src.services.TreeNode import TreeNode , File 
import ast
from .PythonClassNode import PythonClassNode 

class PythonFile(File):
    def __init__(self, path_str: str, language: str = "python"):
        super().__init__(path_str, language=language)
        self.dead_end = False 

    def load_children(self):
        """
        Parses the script using 'ast', mapping it to ordered structural 
        TreeNode children while retaining all interstitial comments, decorators, and spacing.
        """
        if not self.script:
            return

        try:
            tree = ast.parse(self.script)
        except SyntaxError:
            return

        lines = self.script.splitlines()

        def get_source_segment(start_line, end_line):
            if start_line > end_line or start_line < 1:
                return ""
            return "\n".join(lines[start_line - 1:end_line])

        def get_start_line(node):
            """Returns the starting line of a node, accounting for leading decorators."""
            if hasattr(node, "decorator_list") and node.decorator_list:
                return node.decorator_list[0].lineno
            return node.lineno

        self.children = []
        self.leaf = False

        # Group AST nodes into sequential structural blocks
        blocks = []
        current_block_type = None
        current_block_nodes = []

        for node in tree.body:
            if isinstance(node, (ast.Import, ast.ImportFrom)):
                node_type = "import"
            elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                node_type = "func"
            elif isinstance(node, ast.ClassDef):
                node_type = "class"
            else:
                node_type = "expression"

            if current_block_type and current_block_type != node_type:
                blocks.append((current_block_type, current_block_nodes))
                current_block_nodes = []

            current_block_type = node_type
            current_block_nodes.append(node)

        if current_block_type and current_block_nodes:
            blocks.append((current_block_type, current_block_nodes))

        # Process blocks and capture leading/trailing global comments continuously
        last_consumed_line = 0

        for block_idx, (b_type, b_nodes) in enumerate(blocks):
            is_last_block = (block_idx == len(blocks) - 1)

            if b_type in ("import", "expression"):
                end_ln = getattr(b_nodes[-1], "end_lineno", b_nodes[-1].lineno)
                if is_last_block:
                    end_ln = len(lines)

                block_script = get_source_segment(last_consumed_line + 1, end_ln)
                last_consumed_line = end_ln

                node_name = "imports" if b_type == "import" else "expression"
                self.add_child([], TreeNode(name=node_name, script=block_script, dead_end=True, language="python"))

            elif b_type == "func":
                for f_idx, func_node in enumerate(b_nodes):
                    f_end = getattr(func_node, "end_lineno", func_node.lineno)
                    if is_last_block and f_idx == len(b_nodes) - 1:
                        f_end = len(lines)

                    # Fix 1: Use get_start_line to capture top-level decorators
                    f_start = min(get_start_line(func_node), last_consumed_line + 1)
                    func_script = get_source_segment(f_start, f_end)
                    last_consumed_line = f_end

                    f_node = TreeNode(name=func_node.name, script=func_script, dead_end=True, language="python")
                    self.add_child([], f_node)

            elif b_type == "class":
                for c_idx, class_node in enumerate(b_nodes):
                    c_end = getattr(class_node, "end_lineno", class_node.lineno)
                    if is_last_block and c_idx == len(b_nodes) - 1:
                        c_end = len(lines)

                    # Fix 1: Use get_start_line to capture class decorators (@dataclass, etc.)
                    c_start = min(get_start_line(class_node), last_consumed_line + 1)
                    class_script = get_source_segment(c_start, c_end)

                    # Fix 2: Preserve full attribute path (e.g. ast.NodeVisitor) using ast.unparse
                    inherited_classes = [ast.unparse(base) for base in class_node.bases]

                    c_node = PythonClassNode(
                        name=class_node.name, 
                        script=class_script,
                        inherited_classes=inherited_classes
                    )

                    # Standard lineno points to the 'class' keyword line,
                    # ensuring inner body items start AFTER the class signature header.
                    last_class_line = class_node.lineno

                    for s_idx, sub_node in enumerate(class_node.body):
                        sub_end = getattr(sub_node, "end_lineno", sub_node.lineno)
                        if s_idx == len(class_node.body) - 1:
                            sub_end = c_end

                        # Handle method decorators inside class bodies
                        sub_start = min(get_start_line(sub_node), last_class_line + 1)
                        sub_script = get_source_segment(sub_start, sub_end)
                        last_class_line = sub_end

                        if isinstance(sub_node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                            method_node = TreeNode(name=sub_node.name, script=sub_script, dead_end=True, language="python")
                            c_node.add_child([], method_node)

                        elif isinstance(sub_node, (ast.Assign, ast.AnnAssign)):
                            target_name = "static_member"
                            if isinstance(sub_node, ast.Assign) and isinstance(sub_node.targets[0], ast.Name):
                                target_name = sub_node.targets[0].id
                            elif isinstance(sub_node, ast.AnnAssign) and isinstance(sub_node.target, ast.Name):
                                target_name = sub_node.target.id

                            member_node = TreeNode(name=target_name, script=sub_script, dead_end=True, language="python")
                            c_node.add_child([], member_node)

                        else:
                            expr_node = TreeNode(name="class_expression", script=sub_script, dead_end=True, language="python")
                            c_node.add_child([], expr_node)

                    last_consumed_line = c_end
                    self.add_child([], c_node)
