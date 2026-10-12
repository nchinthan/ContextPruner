# File: backend/src/services/prompt/providers/BasePromptProvider.py
from abc import ABC, abstractmethod

class BasePromptProvider(ABC):
    @abstractmethod
    def load_data(self) -> dict:
        """Loads and returns the full nested dictionary representing the prompt tree."""
        pass

    @abstractmethod
    def save_data(self, data: dict) -> None:
        """Persists the full nested dictionary back to the data store."""
        pass