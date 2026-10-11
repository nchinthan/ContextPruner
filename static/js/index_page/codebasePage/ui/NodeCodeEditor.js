// File: static/js/codebase_page/components/NodeCodeEditor.js
import AbstractHighlightedEditor from '../../../commons/components/AbstractHighlightedEditor.js';
import { showToast } from '../../../commons/components/toast.js';

export class NodeCodeEditor extends AbstractHighlightedEditor {
  constructor() {
    super();
    this._currentPath = '';
  }

  setNodePath(path) {
    this._currentPath = path;
    const labelEl = this.querySelector('label');
    if (labelEl) {
      labelEl.textContent = path ? `Editing: ${path}` : this._defaultLabel();
    }
  }

  connectedCallback() {
    super.connectedCallback();

    // Inject action buttons into the header
    const header = this.querySelector('.flex.items-center.justify-between');
    if (header) {
      const actions = document.createElement('div');
      actions.className = 'flex items-center gap-2';
      actions.innerHTML = `
        <button id="delete-node-btn" class="px-2 py-1 text-xs bg-red-950/60 text-red-400 border border-red-800 rounded hover:bg-red-900 transition">
          Delete Node
        </button>
        <button id="save-script-btn" class="px-3 py-1 text-xs bg-indigo-600 text-white rounded font-medium hover:bg-indigo-500 transition shadow">
          Save Script
        </button>
      `;
      header.appendChild(actions);

      actions.querySelector('#save-script-btn')?.addEventListener('click', () => {
        if (!this._currentPath) {
          showToast('No node selected to save.');
          return;
        }
        this.dispatchEvent(
          new CustomEvent('editor-save-script', {
            detail: { path: this._currentPath, script: this.value },
            bubbles: true,
            composed: true
          })
        );
      });

      actions.querySelector('#delete-node-btn')?.addEventListener('click', () => {
        if (!this._currentPath) {
          showToast('No node selected to delete.');
          return;
        }
        if (confirm(`Are you sure you want to delete node: "${this._currentPath}"?`)) {
          this.dispatchEvent(
            new CustomEvent('editor-delete-node', {
              detail: { path: this._currentPath },
              bubbles: true,
              composed: true
            })
          );
        }
      });
    }
  }

  _defaultLabel() {
    return 'Node Script Editor';
  }

  _defaultHint() {
    return 'Auto-saves via socket';
  }

  _defaultPlaceholder() {
    return 'Select a node from the tree sidebar to edit its script…';
  }

  _getHighlightedHtml(escapedText) {
    // Basic syntax highlighting for code
    return escapedText
  }
}

customElements.define('node-code-editor', NodeCodeEditor);