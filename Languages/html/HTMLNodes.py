# File: Languages/html/HtmlNodes.py
import re
import random
from TreeNode import TreeNode, File


def generate_unique_name(tag_name: str) -> str:
    """Generates a unique name like 'div.id48291'."""
    rand_id = random.randint(10000, 99999)
    return f"{tag_name}.id{rand_id}"


class HTMLTagNode(TreeNode):
    def __init__(self, name: str, script: str, outer_template: str = "{}\n{}"):
        # dead_end=False to allow lazy loading of deeper nested tags
        super().__init__(name, script, dead_end=False, language="html")
        self.outer_template = outer_template  # e.g. "<div id='app'>\n{}\n</div>"

    def load_children(self):
        """Lazy loads nested tags inside this tag's script content."""
        if not self.leaf or self.dead_end:
            return

        children, _ = parse_html_tokens(self.script)
        if children:
            self.children = children
            self.leaf = False

    def get_script(self) -> str:
        if self.leaf:
            return self.script
        else:
            inner_content = "\n".join(child.get_script() for child in self.children)
            return self.outer_template.format(inner_content)

    def get_children_recursive(self, prefix: str = "") -> list[str]:
        """
        Overridden for HTML element nodes to return the name of the node itself
        to avoid infinite recursion/lag issues in deep nested trees.
        """
        return [self.name]


def parse_html_tokens(html_script: str):
    """
    Simple HTML token parser:
    - Skips <!DOCTYPE ...>
    - Matches tags defined by [a-zA-Z0-9_-]+
    - Distinguishes self-closing/void tags <tag .../> from container tags <tag>...</tag>
    """
    # Pattern explanation:
    # Group 1: DOCTYPE tag
    # Group 2: Self-closing tag <tag ... />
    # Group 3: Opening tag <tag ...>
    # Group 4: Closing tag </tag>
    tag_pattern = re.compile(
        r"(<!DOCTYPE[^>]*>)|"
        r"<([a-zA-Z0-9_-]+)(?:\s+[^/>]*)?/\s*>|"
        r"<([a-zA-Z0-9_-]+)(?:\s+[^>]*)?>|"
        r"</([a-zA-Z0-9_-]+)\s*>",
        re.IGNORECASE | re.DOTALL
    )

    children = []
    idx = 0
    length = len(html_script)

    while idx < length:
        match = tag_pattern.search(html_script, idx)
        if not match:
            # Capture leftover text trailing at the end
            leftover = html_script[idx:]
            if leftover.strip():
                children.append(
                    TreeNode(
                        name=generate_unique_name("text"),
                        script=leftover,
                        dead_end=True,
                        language="html"
                    )
                )
            break

        start_pos, end_pos = match.span()

        # Capture text leading up to the matched tag
        if start_pos > idx:
            text_prefix = html_script[idx:start_pos]
            if text_prefix.strip():
                children.append(
                    TreeNode(
                        name=generate_unique_name("text"),
                        script=text_prefix,
                        dead_end=True,
                        language="html"
                    )
                )

        doctype, self_closing_tag, open_tag, close_tag = match.groups()

        # 1. Skip DOCTYPE completely
        if doctype:
            idx = end_pos
            continue

        # 2. Self-closing tag (<tag ... />)
        elif self_closing_tag:
            tag_script = html_script[start_pos:end_pos]
            tag_name = generate_unique_name(self_closing_tag)
            children.append(
                TreeNode(
                    name=tag_name,
                    script=tag_script,
                    dead_end=True,
                    language="html"
                )
            )
            idx = end_pos

        # 3. Standard opening tag (<tag ... >)
        elif open_tag:
            tag_name_str = open_tag
            open_tag_str = html_script[start_pos:end_pos]
            
            # Find matching closing tag </tag_name_str> balancing nested tags
            close_pattern = re.compile(
                rf"</?\s*{re.escape(tag_name_str)}(?:\s+[^>]*)?>",
                re.IGNORECASE
            )
            
            depth = 1
            search_idx = end_pos
            content_end = -1
            full_end = -1

            while depth > 0:
                c_match = close_pattern.search(html_script, search_idx)
                if not c_match:
                    break
                
                match_str = c_match.group(0)
                if match_str.startswith("</"):
                    depth -= 1
                    if depth == 0:
                        content_end = c_match.start()
                        full_end = c_match.end()
                else:
                    depth += 1
                search_idx = c_match.end()

            if full_end != -1:
                inner_html = html_script[end_pos:content_end]
                close_tag_str = html_script[content_end:full_end]
                
                # Outer template to rebuild the tag from children
                outer_template = f"{open_tag_str}\n{{}}\n{close_tag_str}"
                
                node_name = generate_unique_name(tag_name_str)
                html_node = HTMLTagNode(
                    name=node_name,
                    script=inner_html,
                    outer_template=outer_template
                )
                children.append(html_node)
                idx = full_end
            else:
                # Unmatched opening tag treated as a standalone tag node
                node_name = generate_unique_name(tag_name_str)
                children.append(
                    TreeNode(
                        name=node_name,
                        script=open_tag_str,
                        dead_end=True,
                        language="html"
                    )
                )
                idx = end_pos

        # 4. Stray closing tag (ignored / standalone)
        elif close_tag:
            idx = end_pos

    return children, html_script


class HTMLFile(File):
    def __init__(self, path_str: str, language: str = "html"):
        super().__init__(path_str, language=language)
        self.dead_end = False

    def load_children(self):
        if not self.script or not self.leaf:
            return

        children, _ = parse_html_tokens(self.script)
        if children:
            self.children = children
            self.leaf = False

    def get_children_recursive(self, prefix: str = "") -> list[str]:
        """Returns the filename itself as requested."""
        return [self.name]


def init():
    File.LANGUAGE_HOOKS['.html'] = HTMLFile
    File.LANGUAGE_HOOKS['.htm'] = HTMLFile
    File.LANGUAGE_HOOKS['html'] = HTMLFile
    File.LANGUAGE_HOOKS['htm'] = HTMLFile