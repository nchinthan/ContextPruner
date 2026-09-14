import { BaseTreeView } from '../../commons/components/treeView/BaseTreeView.js';

export class TreeViewSideBar extends BaseTreeView {
  get nodeTagName() {
    return 'prompt-node';
  }

  renderLayout() {
    this.className = 'w-80 border-r border-gray-800 bg-gray-900/50 flex flex-col shrink-0';
    this.innerHTML = `
      <div class="p-3 border-b border-gray-800 bg-gray-900 flex justify-between items-center">
         <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tree Navigation</span>
         <button id="btn-export-tree" type="button" class="text-xs text-indigo-400 hover:underline">Export JSON</button>
      </div>
      <div data-tree-container class="flex-1 overflow-y-auto p-3 font-mono text-sm space-y-1"></div>
    `;

    this.querySelector('#btn-export-tree').addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('tree-export', { bubbles: true, composed: true }));
    });
  }
}

customElements.define('tree-view', TreeViewSideBar);