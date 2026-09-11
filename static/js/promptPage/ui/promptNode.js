// File: ui/components/prompt_manager/promptNode.js
class PromptNode extends HTMLElement {
  constructor() {
    super();
    this.nodeData = null;
    this.path = '';
    this.activePath = '';
  }

  /**
   * Public render API. `nodeTree` must already contain resolved children
   * (nodeTree.childNodes: same shape, recursively) - this component never
   * fetches data itself, it only draws what it's given.
   *
   * Expected shape:
   * {
   *   path: string,
   *   name: string,
   *   leaf: boolean,
   *   children: string[]   // original child names, only used for the count badge
   *   childNodes: [ ...same shape... ]
   * }
   */
  setData(nodeTree, activePath = '') {
    this.nodeData = nodeTree;
    this.path = nodeTree.path ?? '';
    this.activePath = activePath;
    this.render();
    this.renderChildren();
  }

  render() {
    const nodeName = this.nodeData.name || 'Root';
    const isLeaf = Boolean(this.nodeData.leaf);
    const isActive = this.activePath === this.path;

    this.className = 'block w-full';
    this.innerHTML = `
      <div 
        class="node-row flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-gray-800/60 cursor-pointer group transition ${
          isActive ? 'bg-indigo-600/20 text-indigo-400 font-medium' : 'text-gray-300'
        }"
        draggable="${this.path !== ''}" 
      >
        <div class="flex items-center gap-2 overflow-hidden pointer-events-none">
          <svg class="w-4 h-4 shrink-0 ${isLeaf ? 'text-gray-500' : 'text-indigo-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            ${
              isLeaf
                ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>'
                : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>'
            }
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
      this.dispatchEvent(new CustomEvent('node-select', {
        detail: { path: this.path },
        bubbles: true,
        composed: true,
      }));
    });

    addBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dispatchEvent(new CustomEvent('node-add-child', {
        detail: { path: this.path },
        bubbles: true,
        composed: true,
      }));
    });

    if (this.path !== '') {
      rowEl.addEventListener('dragstart', this.handleDragStart.bind(this));
    }
    rowEl.addEventListener('dragover', this.handleDragOver.bind(this));
    rowEl.addEventListener('dragleave', this.handleDragLeave.bind(this));
    rowEl.addEventListener('drop', this.handleDrop.bind(this));
  }

  renderChildren() {
    const childNodes = this.nodeData.childNodes;
    if (!Array.isArray(childNodes) || childNodes.length === 0) return;

    const childrenContainer = this.querySelector('.node-children');

    for (const childTree of childNodes) {
      const childNodeEl = document.createElement('prompt-node');
      childrenContainer.appendChild(childNodeEl);
      childNodeEl.setData(childTree, this.activePath);
    }
  }

  // --- Drag & Drop: purely reports intent, no path-hierarchy business rules ---

  handleDragStart(e) {
    e.stopPropagation();
    e.dataTransfer.setData('application/json', JSON.stringify({ path: this.path, name: this.nodeData.name }));
    e.dataTransfer.effectAllowed = 'move';
  }

  handleDragOver(e) {
    e.preventDefault(); // Necessary to allow dropping
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    this.querySelector('.node-row').classList.add('bg-indigo-900/30', 'ring-1', 'ring-indigo-500');
  }

  handleDragLeave(e) {
    e.stopPropagation();
    this.querySelector('.node-row').classList.remove('bg-indigo-900/30', 'ring-1', 'ring-indigo-500');
  }

  handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    this.querySelector('.node-row').classList.remove('bg-indigo-900/30', 'ring-1', 'ring-indigo-500');

    let sourceData;
    try {
      sourceData = JSON.parse(e.dataTransfer.getData('application/json'));
    } catch (err) {
      return; // Not a drag payload we understand
    }

    if (!sourceData || !sourceData.path) return;

    // Report the raw intent; main.js owns the tree-hierarchy validation
    // (e.g. "can't drop a folder into its own child") and the API calls.
    this.dispatchEvent(new CustomEvent('node-move', {
      detail: { sourcePath: sourceData.path, targetPath: this.path },
      bubbles: true,
      composed: true,
    }));
  }
}

customElements.define('prompt-node', PromptNode);