import json
from backend.src.services.TreeNode import TreeNode
from config import prompt_snippet_file
import re

class PromptNode(TreeNode):
    def __init__(
        self,
        name: str,
        data: dict,
        dead_end: bool = False,
        language: str = "en",
    ):
        script = data.get("$Prompt", "")
        super().__init__(
            name=name, script=script, dead_end=dead_end, language=language
        )
        self._data = data

    def load_children(self):
        """
        Parses cached JSON data to construct child PromptNodes,
        then flushes self._data to conserve memory.
        """
        if not self._data:
            return

        for key, value in self._data.items():
            if key == "$Prompt" or not isinstance(value, dict):
                continue

            child_node = PromptNode(
                name=key,
                data=value,
                dead_end=self.dead_end,
                language=self.language,
            )
            self.children.append(child_node)

        self.leaf = len(self.children) == 0
        self._data = None

    def set(self, path: list, new_script: str) -> bool:
        """
        Recursively traverses down the path to update a target node's script
        without clearing or resetting its child nodes.
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
                return True
            return found_child.set(path[1:], new_script)
            
        return False

    def buildPrompt(self, **kwargs) -> str:
        """
        Formats the node's script template with keyword arguments.
        Replaces only placeholders of the pattern '{[a-zA-Z0-9_]+}' matching kwargs.
        """
        pattern = r'\{([a-zA-Z0-9_]+)\}'
        
        def replace_match(match):
            key = match.group(1)
            # Replace if key exists in kwargs; otherwise leave placeholder untouched
            return str(kwargs.get(key, match.group(0)))

        return re.sub(pattern, replace_match, self.script)

    def getJson(self) -> dict:
        """
        Recursively reconstructs and returns the full JSON representation of this node
        and all its descendant nodes.
        """
        # Ensure unloaded children are fetched prior to export
        if self.leaf and not self.dead_end and self._data is not None:
            self.load_children()

        result = {}

        # Preserve the script attribute if it exists
        if self.script:
            result["$Prompt"] = self.script

        # If children haven't been loaded yet but raw data still exists
        if self.children:
            for child in self.children:
                result[child.name] = child.getJson()

        return result


class PromptLoader(TreeNode):
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(
        self,
        name: str = "root",
        dead_end: bool = False,
        language: str = "en",
    ):
        if getattr(self, "_initialized", False):
            return

        self._initialized = True
        self.file_path = prompt_snippet_file
        self._raw_data = None

        with open(prompt_snippet_file, "r", encoding="utf-8") as f:
            self._raw_data = json.load(f)

        super().__init__(
            name=name, script="", dead_end=dead_end, language=language
        )

    def set(self, path: list, new_script: str) -> bool:
        """
        Delegate set calls to the PromptNode tree navigation without clearing children.
        """
        return PromptNode.set(self, path, new_script)
    
    def addPrompt(self, path, name, script=None):
        data = {}

        if script is not None:
            data["$Prompt"] = script

        new_node = PromptNode(
            name=name,
            data=data,
            dead_end=self.dead_end,
            language=self.language
        )

        self.add_child(path, new_node)
    
    def load_children(self):
        """
        Instantiates root PromptNode children from loaded JSON script,
        then flushes raw data to clear memory usage.
        """
        if not self._raw_data:
            return

        for key, value in self._raw_data.items():
            if isinstance(value, dict):
                child_node = PromptNode(
                    name=key,
                    data=value,
                    dead_end=self.dead_end,
                    language=self.language,
                )
                self.children.append(child_node)

        self.leaf = len(self.children) == 0
        self.script = ""
        self._raw_data = None

    def getJson(self) -> dict:
        """
        Collects all root child nodes and converts the full tree back to a JSON dict.
        """
        if self.leaf and not self.dead_end and self._raw_data is not None:
            self.load_children()

        full_json = {}
        for child in self.children:
            full_json[child.name] = child.getJson()

        return full_json

    def save(self, target_path: str = None, indent: int = 4):
        """
        Traverses all loaded/unloaded child nodes, reconstructs the tree, 
        and writes the updated JSON back to a file.
        
        If target_path is not specified, it overwrites the original input file.
        """
        out_path = target_path if target_path else self.file_path
        data_to_save = self.getJson()

        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(data_to_save, f, indent=indent, ensure_ascii=False)
