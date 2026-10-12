from backend.src.services.TreeNode import TreeNode  

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
