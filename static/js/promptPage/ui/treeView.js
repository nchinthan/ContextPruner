// File: ui/components/prompt_manager/treeView.js
class TreeViewSideBar extends HTMLElement {
  connectedCallback() {
    this.className = 'w-80 border-r border-gray-800 bg-gray-900/50 flex flex-col shrink-0';
    this.innerHTML = `
      <div class="p-3 border-b border-gray-800 bg-gray-900 flex justify-between items-center">
         <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Tree Navigation
         </span>
         <button id="btn-export-tree" type="button" class="text-xs text-indigo-400 hover:underline">
            Export JSON
         </button>
      </div>
      <div id="tree-container" class="flex-1 overflow-y-auto p-3 font-mono text-sm space-y-1"></div>
    `;

    this._container = this.querySelector('#tree-container');

    this.querySelector('#btn-export-tree').addEventListener('click', () => {
      this.dispatchEvent(
        new CustomEvent('tree-export', {
          bubbles: true,
          composed: true,
        })
      );
    });
  }

  render(rootTree, activePath = '') {
    this.clear();
    if (!rootTree || !this._container) return;

    const rootNodeEl = document.createElement('prompt-node');
    const ul = document.createElement('ul');
    ul.className = 'space-y-1';
    ul.appendChild(rootNodeEl);
    this._container.appendChild(ul);

    rootNodeEl.setData(rootTree, activePath);
  }

  clear() {
    if (this._container) this._container.innerHTML = '';
  }
}

customElements.define('tree-view', TreeViewSideBar);