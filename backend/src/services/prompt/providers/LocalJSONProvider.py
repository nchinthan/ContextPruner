# File: backend/src/services/prompt/providers/LocalJSONProvider.py
import json
from .BasePromptProvider import BasePromptProvider

class LocalJSONProvider(BasePromptProvider):
    def __init__(self, file_path: str, indent: int = 4):
        self.file_path = file_path
        self.indent = indent

    def load_data(self) -> dict:
        try:
            with open(self.file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except FileNotFoundError:
            return {}

    def save_data(self, data: dict) -> None:
        with open(self.file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=self.indent, ensure_ascii=False)