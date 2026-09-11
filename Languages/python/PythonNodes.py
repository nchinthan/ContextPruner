from TreeNode import TreeNode , File 
import ast

class PythonClassNode(TreeNode):
    INDENTATION = 4 
    def __init__(self,name,script,inherited_classes=[]):
        super().__init__(name,script,False,'python')
        self.inherited_classes = inherited_classes
    
    def get_script(self):
        inherited = '' if len(self.inherited_classes) == 0 else f'({','.join(self.inherited_classes)})'
        indentation = ' '*PythonClassNode.INDENTATION
        script = super().get_script().replace('\t',indentation)
        class_script = f'''
class {self.name}{inherited}:
{script}'''
        return class_script

class PythonFile(File):
    def __init__(self, path_str: str, language: str = "python"):
        super().__init__(path_str, language=language)
        # Code files are not structural dead ends anymore once they can unpack their declarations
        self.dead_end = False 

    def load_children(self):
        """
        Parses the script using 'ast', mapping it to ordered structural 
        TreeNode children while retaining interstitial comments and spacing.
        """
        if not self.script:
            return

        try:
            tree = ast.parse(self.script)
        except SyntaxError:
            return

        lines = self.script.splitlines()

        def get_source_segment(start_line, end_line):
            return "\n".join(lines[start_line - 1:end_line])

        self.children = []
        self.leaf = False

        # 1. Group AST nodes into sequential blocks
        blocks = []
        current_block_type = None
        current_block_nodes = []

        for node in tree.body:
            if isinstance(node, (ast.Import, ast.ImportFrom)):
                node_type = "import"
            elif isinstance(node, ast.FunctionDef):
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

        # 2. Process blocks, capturing everything up to the end of the block
        last_consumed_line = 0

        for idx, (b_type, b_nodes) in enumerate(blocks):
            # Calculate where this structural block ends
            end_ln = getattr(b_nodes[-1], "end_lineno", b_nodes[-1].lineno)
            
            # If it's the absolute last block, grab all the remaining lines in the file
            # (This catches trailing comments at the very end of the file)
            if idx == len(blocks) - 1:
                end_ln = len(lines)
                
            # Grab everything from the end of the last block to the end of this block
            # This cleanly sweeps up leading comments and whitespace!
            block_script = get_source_segment(last_consumed_line + 1, end_ln)
            last_consumed_line = end_ln

            if b_type == "import":
                import_node = TreeNode(name="imports", script=block_script, dead_end=True, language="python")
                self.add_child([], import_node)

            elif b_type == "expression":
                expr_node = TreeNode(name="expression", script=block_script, dead_end=True, language="python")
                self.add_child([], expr_node)

            elif b_type == "func":
                # For multiple functions grouped, we split them but give the first one the leading comments
                for f_idx, func_node in enumerate(b_nodes):
                    f_end = getattr(func_node, "end_lineno", func_node.lineno)
                    if f_idx == 0:
                        # Grab the block chunk we already calculated (includes leading comments)
                        func_script = get_source_segment(last_consumed_line - len(block_script.splitlines()) + 1, f_end)
                    else:
                        func_script = get_source_segment(func_node.lineno, f_end)
                    
                    f_node = TreeNode(name=func_node.name, script=func_script, dead_end=True, language="python")
                    self.add_child([], f_node)

            elif b_type == "class":
                for class_node in b_nodes:
                    c_end = getattr(class_node, "end_lineno", class_node.lineno)
                    class_script = get_source_segment(class_node.lineno, c_end)

                    c_node = PythonClassNode(
                        name=class_node.name, 
                        script=class_script,
                        inherited_classes=[
                            base.id if isinstance(base, ast.Name) else base.attr # Simplification for display
                            for base in class_node.bases if hasattr(base, 'id') or hasattr(base, 'attr')
                        ]
                    )
                    
                    # --- FIX FOR INTERNAL CLASS NODES ---
                    last_class_line = class_node.lineno # Track where the header ends
                    
                    for s_idx, sub_node in enumerate(class_node.body):
                        sub_end = getattr(sub_node, "end_lineno", sub_node.lineno)
                        
                        # Catch comments right above this sub-node inside the class
                        if s_idx == len(class_node.body) - 1:
                            sub_end = c_end # Last sub-node swallows trailing class comments
                        
                        sub_script = get_source_segment(last_class_line + 1, sub_end)
                        last_class_line = sub_end
                        
                        if isinstance(sub_node, ast.FunctionDef):
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
                            
                    self.add_child([], c_node)    

def init():
    File.LANGUAGE_HOOKS['py'] = PythonFile
    File.LANGUAGE_HOOKS['python'] = PythonFile
