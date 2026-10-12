import re
from backend.src.services.TreeNode import TreeNode

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
            return str(kwargs.get(key, match.group(0)))

        return re.sub(pattern, replace_match, self.script)

    def getJson(self) -> dict:
        """
        Recursively reconstructs and returns the full dictionary representation of this node
        and all its descendant nodes.
        """
        if self.leaf and not self.dead_end and self._data is not None:
            self.load_children()

        result = {}

        if self.script:
            result["$Prompt"] = self.script

        if self.children:
            for child in self.children:
                result[child.name] = child.getJson()

        return result


