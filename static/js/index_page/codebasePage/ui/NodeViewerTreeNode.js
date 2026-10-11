// File: static/js/codebase_page/components/NodeViewerTreeNode.js
import { BaseTreeNode } from '../../../commons/components/treeView/BaseTreeNode.js';

export class NodeViewerTreeNode extends BaseTreeNode {
  constructor() {
    super();
    this.isExpanded = false;
    this.isLoading = false;
    this.hasLoadedChildren = false;
    this._clickTimer = null;
  }

  get childTagName() {
    return 'node-viewer-tree-node';
  }

  render() {
    const isFolder = this.nodeData?.isFolder ?? true;
    const isSelected = this.activePath && this.activePath === this.path;

    this.innerHTML = `
      <div class="node-row group flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer hover:bg-gray-800/60 transition ${
        isSelected ? 'bg-indigo-900/40 text-indigo-300 font-medium' : 'text-gray-300'
      }">
        <div class="node-label flex items-center gap-2 flex-1 min-w-0">
          ${
            isFolder
              ? `<span class="toggle-icon text-xs text-gray-500 w-4 text-center select-none">
                  ${this.isLoading ? '⌛' : this.isExpanded ? '▼' : '▶'}
                </span>`
              : `<span class="w-4"></span>`
          }
          <span class="truncate text-sm">${this._escapeHtml(this.nodeData?.name || this.path || 'Root')}</span>
        </div>
        <div class="node-actions hidden group-hover:flex items-center gap-1">
          <button type="button" class="add-child-btn p-1 text-xs text-gray-400 hover:text-emerald-400 hover:bg-gray-700/50 rounded" title="Add Child">
            ➕
          </button>
        </div>
      </div>
      <div class="node-children ml-4 border-l border-gray-800 pl-2 ${this.isExpanded ? 'block' : 'hidden'}"></div>
    `;

    this._attachEvents();
    this.attachDragAndDrop(this.querySelector('.node-row'));
  }

  _attachEvents() {
    const row = this.querySelector('.node-row');
    const addBtn = this.querySelector('.add-child-btn');

    row?.addEventListener('click', (e) => {
      e.stopPropagation();
      // Delay single click execution to allow double click detection
      if (this._clickTimer) clearTimeout(this._clickTimer);
      this._clickTimer = setTimeout(() => {
        this.toggleExpand();
        this._clickTimer = null;
      }, 250);
    });

    row?.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      if (this._clickTimer) {
        clearTimeout(this._clickTimer);
        this._clickTimer = null;
      }
      // Single click expands/collapses, double click selects to open script
      this.dispatchSelect();
    });

    addBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dispatchAddChild();
    });
  }

  async toggleExpand() {
    const isFolder = this.nodeData?.isFolder ?? true;
    if (!isFolder) return;

    if (!this.hasLoadedChildren && !this.isExpanded) {
      this.isLoading = true;
      this.render();

      // Emit event so the Logic Controller handles API lazy loading
      this.dispatchEvent(
        new CustomEvent('node-request-children', {
          detail: { path: this.path, nodeElement: this },
          bubbles: true,
          composed: true
        })
      );
      return;
    }

    this.isExpanded = !this.isExpanded;
    this.render();
    this.renderChildren();
  }

  /** Public method called by controller once lazy children are loaded */
  populateChildren(childrenNodes) {
    this.nodeData.childNodes = childrenNodes;
    this.hasLoadedChildren = true;
    this.isLoading = false;
    this.isExpanded = true;
    this.render();
    this.renderChildren();
  }

  _escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

customElements.define('node-viewer-tree-node', NodeViewerTreeNode);