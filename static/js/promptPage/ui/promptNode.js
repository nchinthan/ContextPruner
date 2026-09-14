// File: ui/components/prompt_manager/promptNode.js
import { BaseTreeNode } from '../../commons/components/treeView/BaseTreeNode.js';

export class PromptNode extends BaseTreeNode {
  get childTagName() {
    return 'prompt-node';
  }

  render() {
    const nodeName = this.nodeData.name || 'Root';
    const isLeaf = Boolean(this.nodeData.leaf);
    const isActive = this.activePath === this.path;

    // Corrected standard SVG path strings
  const fileIconPath = 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
  const folderIconPath = 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z'; // Updated valid SVG path

    this.className = 'block w-full';
    this.innerHTML = `
      <div 
      class="node-row flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-gray-800/60 cursor-pointer group transition ${
        isActive ? 'bg-indigo-600/20 text-indigo-400 font-medium' : 'text-gray-300'
      }"
    >
      <div class="flex items-center gap-2 overflow-hidden pointer-events-none">
        <svg class="w-4 h-4 shrink-0 ${isLeaf ? 'text-gray-500' : 'text-indigo-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${isLeaf ? fileIconPath : folderIconPath}"></path>
        </svg>
        <span class="truncate">${nodeName}</span>
      </div>
      <button type="button" class="btn-add-child opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition" title="Add child">
        +
      </button>
    </div>
      <div class="node-children pl-4 border-l border-gray-800 ml-3 my-1 space-y-1"></div>
    `;

    const rowEl = this.querySelector('.node-row');
    const addBtn = this.querySelector('.btn-add-child');

    rowEl.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dispatchSelect();
    });

    addBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dispatchAddChild();
    });

    // Attach base drag and drop listeners to row element
    this.attachDragAndDrop(rowEl);
  }
}

customElements.define('prompt-node', PromptNode);
