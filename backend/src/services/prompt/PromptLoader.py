from .PromptNode import PromptNode 
from backend.src.services.TreeNode import TreeNode
from .providers.BasePromptProvider import BasePromptProvider

class PromptLoader(TreeNode):
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(
        self,
        provider: BasePromptProvider,
        name: str = "root",
        dead_end: bool = False,
        language: str = "en",
    ):
        if getattr(self, "_initialized", False):
            return

        self._initialized = True
        self.provider = provider
        self._raw_data = self.provider.load_data()

        super().__init__(
            name=name, script="", dead_end=dead_end, language=language
        )

    def set(self, path: list, new_script: str) -> bool:
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
        if self.leaf and not self.dead_end and self._raw_data is not None:
            self.load_children()

        full_json = {}
        for child in self.children:
            full_json[child.name] = child.getJson()

        return full_json

    def save(self):
        """
        Delegates the persistence of the reconstructed tree data back to the provider.
        """
        data_to_save = self.getJson()
        self.provider.save_data(data_to_save)
