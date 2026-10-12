from .PythonFile import PythonFile
from backend.src.services.TreeNode import File  

def init():
    File.LANGUAGE_HOOKS['.py'] = PythonFile
    File.LANGUAGE_HOOKS['py'] = PythonFile
    File.LANGUAGE_HOOKS['python'] = PythonFile
