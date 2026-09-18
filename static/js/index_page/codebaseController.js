// File: static/js/codebase_page/codebaseController.js
export class CodebaseController {
  constructor(socketInterface, treeViewEl, editorEl) {
    this.socket = socketInterface;
    this.treeView = treeViewEl;
    this.editor = editorEl;

    this._bindEvents();
  }

  _bindEvents() {
    // Tree view event listeners
    this.treeView.addEventListener('node-select', (e) => this._onNodeSelect(e));
    this.treeView.addEventListener('node-request-children', (e) => this._onLazyLoadChildren(e));
    this.treeView.addEventListener('node-add-child', (e) => this._onAddChild(e));
    this.treeView.addEventListener('tree-refresh-requested', () => this.loadRootTree());

    // Editor event listeners
    this.editor.addEventListener('editor-save-script', (e) => this._onSaveScript(e));
    this.editor.addEventListener('editor-delete-node', (e) => this._onDeleteNode(e));
  }

  async loadRootTree() {
    try {
      const res = await this.socket.node.getChildren('');
      const childNodes = (res.data || []).map((name) => ({
        name,
        path: name,
        isFolder: true,
        childNodes: []
      }));

      const rootTree = { path: '', name: 'Root', childNodes };
      this.treeView.render(rootTree);
    } catch (err) {
      console.error('Failed to load root tree:', err);
      alert(`Error loading tree: ${err.message}`);
    }
  }

  async _onLazyLoadChildren(e) {
    const { path, nodeElement } = e.detail;
    try {
      const res = await this.socket.node.getChildren(path);
      const children = (res.data || []).map((childName) => ({
        name: childName,
        path: path ? `${path}/${childName}` : childName,
        isFolder: true,
        childNodes: []
      }));

      nodeElement.populateChildren(children);
    } catch (err) {
      console.error(`Failed loading children for ${path}:`, err);
      alert(`Failed loading node children: ${err.message}`);
      nodeElement.populateChildren([]);
    }
  }

  async _onNodeSelect(e) {
    const { path } = e.detail;
    if (!path) return;

    try {
      this.editor.setNodePath(path);
      const res = await this.socket.node.getScript(path);
      this.editor.value = res.data || '';
    } catch (err) {
      console.error(`Failed to fetch script for ${path}:`, err);
      alert(`Error opening node script: ${err.message}`);
    }
  }

  async _onSaveScript(e) {
    const { path, script } = e.detail;
    try {
      await this.socket.node.editScript(path, script);
      alert(`Script saved successfully for node "${path}"!`);
    } catch (err) {
      console.error(`Failed saving script for ${path}:`, err);
      alert(`Save error: ${err.message}`);
    }
  }

  async _onAddChild(e) {
    const { path } = e.detail;
    const childName = prompt(`Enter name for new child node under "${path || 'Root'}":`);
    if (!childName || !childName.trim()) return;

    try {
      await this.socket.node.addChild(path, childName.trim());
      alert(`Child "${childName}" added successfully!`);
      this.loadRootTree();
    } catch (err) {
      console.error(`Failed adding child under ${path}:`, err);
      alert(`Add child failed: ${err.message}`);
    }
  }

  async _onDeleteNode(e) {
    const { path } = e.detail;
    const pathParts = path.split('/');
    const childName = pathParts.pop();
    const parentPath = pathParts.join('/');

    try {
      await this.socket.node.deleteChild(parentPath, childName);
      alert(`Node "${path}" deleted.`);
      this.editor.setNodePath('');
      this.editor.value = '';
      this.loadRootTree();
    } catch (err) {
      console.error(`Failed deleting node ${path}:`, err);
      alert(`Delete failed: ${err.message}`);
    }
  }
}