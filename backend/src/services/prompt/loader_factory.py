import os
from config import prompt_data_json_loc
from .PromptLoader import PromptLoader
from .providers.LocalJSONProvider import LocalJSONProvider

def create_prompt_loader(provider_type='local_json') -> PromptLoader:
    """
    Factory function to instantiate PromptLoader with the appropriate 
    provider based on environment variables. The server remains completely
    unaware of which database or file system is being used.
    """
    if provider_type == "local_json":
        # Fallback to local JSON file provider
        file_path =  prompt_data_json_loc
        provider = LocalJSONProvider(file_path=file_path)

    return PromptLoader(provider=provider)