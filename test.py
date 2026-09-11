from parser import *
# 1. Root folder initialization

with open("dummyOriginal.py", "r") as f:
    content = f.read()
with open("dummy.py", "w") as f:
    f.write(content)

folder = Folder('D:\projects_current\Coding_prompt_builder')
file = folder.get(['dummy.py'])
file.load_children()
print(file.children)

with open("dummy.py", "r") as f:
    content2 = f.read()
    if content == content2 : 
        print('Success')
    else:
        print('Failed')


