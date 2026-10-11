import os
import shutil
from pathlib import Path

'''
set checkpoints 
get checkpoints 
check stateless 

currently ensure clean read / prevent dirty read 

for each read : check staleness  
'''

class TreeNode:
    def __init__(self, name: str, script: str, dead_end: bool, language: str):
        self.name = name 
        self.script = script
        self.dead_end = dead_end
        self.leaf = True
        self.language = language
        self.children = []
    
    def __str__(self):
        return f'{self.name} : \n{self.script}'

    def __repr__(self):
        return self.__str__()
    
    def get_children(self)->list[str]:
        if self.leaf and not self.dead_end : self.load_children()
        return [i.name for i in self.children] 
    
    def get_children_recursive(self, prefix: str = "") -> list[str]:
        """Recursively returns relative paths for all nested descendant nodes."""
        if self.leaf and not self.dead_end:
            self.load_children()

        results = []
        for child in self.children:
            # Build relative child path
            child_rel_path = f"{prefix}/{child.name}" if prefix else child.name
            results.append(child_rel_path)
            
            # Recurse down if child has or can have descendants
            if not child.dead_end:
                results.extend(child.get_children_recursive(prefix=child_rel_path))
                
        return results

    def load_children(self):
        """
        To be implemented by inherited child classes to parse 
        self.script and populate self.children.
        """
        pass 
    
    def get_script(self) -> str:
        """
        Returns the script. If it's not a leaf node, dynamically 
        reconstructs the script by joining all children's scripts.
        """
        if self.leaf:
            return self.script
        else:
            return '\n\n'.join(child.get_script() for child in self.children)

    def get(self, path: list) -> "TreeNode" or None: # type: ignore
        """
        Recursively traverses down the path to find and return the matching TreeNode object.
        """
        if not path:
            return None
                    
        target_name = path[0]
        
        # If this node is currently a leaf but we have deeper paths to resolve:
        if self.leaf:
            if self.dead_end:
                print("dead end ")
                return None  # Cannot parse further
            else:
                self.load_children()  # Lazy load / parse children if possible
        # Find the matching child node by name
        found_child = None
        for child in self.children:
            if child.name == target_name:
                found_child = child
                break
                
        if found_child:
            # If we reached the end of the query path, return the target node itself
            if len(path) == 1:
                return found_child
            # Otherwise, keep digging down the tree
            return found_child.get(path[1:])
            
        return None

    def set(self, path: list, new_script: str) -> bool:
        """
        Recursively traverses down the path to find a specific node and update its script.
        Returns True if successful, False otherwise.
        """
        if not path:
            self.script = new_script
            return True
            
        target_name = path[0]
        
        if self.leaf:
            if self.dead_end:
                return False
            else:
                self.load_children()

        found_child = None
        for child in self.children:
            if child.name == target_name:
                found_child = child
                break
                
        if found_child:
            if len(path) == 1:
                found_child.script = new_script
                # Reset leaf status if we modify the core script of a branch
                if not found_child.leaf:
                    found_child.leaf = True
                    found_child.children = []
                return True
            return found_child.set(path[1:], new_script)
            
        return False

    def add_child(self, path: list, child_node: "TreeNode") -> bool:
        """
        Navigates down the path to the designated parent node and adds the child_node to it.
        If path is empty, adds the child directly to this node.
        """
        # If we reached the destination parent node
        if not path:
            self.children.append(child_node)
            self.leaf = False  # It has children now, so it is no longer a leaf
            return True

        target_name = path[0]

        if self.leaf:
            if self.dead_end:
                return False
            else:
                self.load_children()

        found_child = None
        for child in self.children:
            if child.name == target_name:
                found_child = child
                break

        if found_child:
            # Recursively descend to add the child
            return found_child.add_child(path[1:], child_node)

        return False

    def delete_child(self, path: list) -> bool:
        """
        Traverses down the path to find the target node and deletes it from its parent.
        Returns True if deletion succeeded, False otherwise.
        """
        if not path:
            return False

        target_name = path[0]

        if self.leaf:
            if self.dead_end:
                return False
            else:
                self.load_children()

        # If the target child to delete is a direct child of this node
        if len(path) == 1:
            for index, child in enumerate(self.children):
                if child.name == target_name:
                    self.children.pop(index)
                    if not self.children:
                        self.leaf = True  # Revert to leaf status if no children remain
                    return True
            return False

        # Otherwise, find the intermediate child and recurse down
        found_child = None
        for child in self.children:
            if child.name == target_name:
                found_child = child
                break

        if found_child:
            return found_child.delete_child(path[1:])

        return False

class Folder(TreeNode):
    def __init__(self, path_str: str):
        # Folder names are their full path string. 
        # A folder is never a dead_end, and it starts as a leaf until loaded.
        self.path = Path(path_str)
        super().__init__(name=self.path.name, script="", dead_end=False, language="directory")
    
    def get(self,path)->TreeNode:
        # append filepath as naming for folders and file is as such
        return super().get(path)

    def get_script(self) -> str:
        """
        For folders, the script is a concatenation of all children's scripts.
        """
        if self.leaf:
            self.load_children()
        out = ''
        for child in self.children:
            script = child.get_script()
            if type(child) != type(self): # tree node is a not a folder
                out += str(child.path) + '\n' 
            out += script + '\n'
        return out

    def load_children(self):
        """Scans the disk path and populates the folder's children."""
        if not self.path.exists() or not self.path.is_dir():
            return

        self.children = []
        try:
            for entry in self.path.iterdir():
                if entry.is_dir():
                    # Subdirectories are child folders
                    self.children.append(Folder(str(entry)))
                elif entry.is_file():
                    # Supported script languages
                    ext = entry.suffix.lower()
                    self.children.append(File(str(entry), language=ext))
            
            if self.children:
                self.leaf = False
        except PermissionError:
            pass  # Handle locked or restricted folders gracefully

    def add_child(self, path: list, child_node: TreeNode) -> bool:
        """Overrides base to physically create files/folders on disk during addition."""
        success = super().add_child(path, child_node)
        if success:
            child_path = Path(child_node.name)
            if isinstance(child_node, Folder):
                child_path.mkdir(parents=True, exist_ok=True)
            elif isinstance(child_node, File):
                child_path.parent.mkdir(parents=True, exist_ok=True)
                child_path.write_text(child_node.script, encoding="utf-8")
        return success

    def delete_child(self, path: list) -> bool:
        """Overrides base to physically erase files/folders from disk during deletion."""
        # Find the target node first so we know its path string before deleting it from memory
        target_node = self.get(path)
        if not target_node:
            return False

        disk_path = Path(target_node.name)
        success = super().delete_child(path)
        
        if success and disk_path.exists():
            if disk_path.is_dir():
                shutil.rmtree(disk_path)  # Delete folder and contents recursively
            else:
                disk_path.unlink()  # Delete single file
        return success

class File(TreeNode):
    LANGUAGE_HOOKS = {}
    def __new__(cls, path_str: str, language: str = "python"):
        """
        Factory pattern: Inspects the file type and returns an instance
        of the specialized subclass.
        """
        path = Path(path_str)
        ext = path.suffix.lower()
        
        if ext in File.LANGUAGE_HOOKS:
            return super().__new__(File.LANGUAGE_HOOKS[ext])
        if language in File.LANGUAGE_HOOKS:
            return super().__new__(File.LANGUAGE_HOOKS[language])
        
        return super().__new__(File) # type: ignore

    def __init__(self, path_str: str, language: str = "unknown"):
        self.path = Path(path_str)
        file_script = ""
        if self.path.exists() and self.path.is_file():
            try:
                file_script = self.path.read_text(encoding="utf-8")
            except Exception:
                file_script = ""

        # Base files are dead_ends until subclasses parse them
        super().__init__(name=self.path.name, script=file_script, dead_end=True, language=language)

    def save(self):
        """Compiles the tree state back to code text and writes it to disk."""
        compiled_script = self.get_script()
        self.script = compiled_script 
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(compiled_script, encoding="utf-8")


if __name__ == '__main__':
    base = File(r'D:\projects_current\Coding_prompt_builder\TreeNode.py')
    (base.load_children())
    print(base.children)