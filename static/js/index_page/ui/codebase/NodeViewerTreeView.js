// File: static/js/codebase_page/components/NodeViewerTreeView.js
import { BaseTreeView } from '../../../commons/components/treeView/BaseTreeView.js';
import './NodeViewerTreeNode.js';

export class NodeViewerTreeView extends BaseTreeView {
  get nodeTagName() {
    return 'node-viewer-tree-node';
  }

  renderLayout() {
    this.className = 'flex flex-col h-full bg-gray-950 border-r border-gray-800 w-72 select-none';
    this.innerHTML = `
      <div class="flex items-center justify-between p-3 border-b border-gray-800 bg-gray-900/50">
        <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">Workspace Tree</span>
        <button id="refresh-tree-btn" class="p-1 text-xs text-gray-400 hover:text-indigo-400 transition" title="Refresh">
          🔄
        </button>
      </div>
      <div data-tree-container class="flex-1 overflow-y-auto p-2"></div>
    `;

    this.querySelector('#refresh-tree-btn')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('tree-refresh-requested', { bubbles: true, composed: true }));
    });
  }
}

customElements.define('node-viewer-tree-view', NodeViewerTreeView);