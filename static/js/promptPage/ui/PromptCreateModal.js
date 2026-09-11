// File: ui/components/prompt_manager/PromptCreateModal.js
class PromptCreateModal extends HTMLElement {
  connectedCallback() {
    this.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden';
    this.innerHTML = `
         <div class="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-5 shadow-2xl">
            <div class="flex justify-between items-center mb-4">
               <h3 class="text-base font-semibold text-gray-200">
                  Create New Prompt Node
               </h3>
               <button id="btn-close-x" type="button" class="text-gray-400 hover:text-gray-200">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
               </button>
            </div>

            <div class="space-y-4">
               <div>
                  <label class="block text-xs font-medium text-gray-400 mb-1">Parent Path</label>
                  <input type="text" id="modal-parent-path" class="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-gray-300" readonly />
               </div>
               <div>
                  <label class="block text-xs font-medium text-gray-400 mb-1">Node Name *</label>
                  <input type="text" id="modal-node-name" placeholder="e.g. system_prompt" class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-500" />
               </div>
               <div>
                  <label class="block text-xs font-medium text-gray-400 mb-1">Initial Script (Optional)</label>
                  <textarea id="modal-node-script" rows="4" placeholder="Enter initial prompt code..." class="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 font-mono text-xs text-gray-100 focus:outline-none focus:border-indigo-500 resize-none"></textarea>
               </div>
            </div>

            <div class="mt-6 flex justify-end gap-3">
               <button id="btn-close-cancel" type="button" class="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg text-xs font-medium transition">
                  Cancel
               </button>
               <button id="btn-submit-node" type="button" class="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-medium transition shadow-md">
                  Create Node
               </button>
            </div>
         </div>`;

    // Scoped event listeners bound to this instance
    this.querySelector('#btn-close-x').addEventListener('click', () => this.close());
    this.querySelector('#btn-close-cancel').addEventListener('click', () => this.close());
    this.querySelector('#btn-submit-node').addEventListener('click', (e) => {
      e.preventDefault();
      this.submit();
    });
  }

  // --- Public UI-state API (presentation only, no business logic) ---

  open(path) {
    this.querySelector('#modal-parent-path').value = path || '';
    this.querySelector('#modal-node-name').value = '';
    this.querySelector('#modal-node-script').value = '';
    this.classList.remove('hidden');
  }

  close() {
    this.classList.add('hidden');
  }

  // --- Internal: turn a DOM interaction into a semantic event ---

  submit() {
    const parentPath = this.querySelector('#modal-parent-path').value;
    const name = this.querySelector('#modal-node-name').value.trim();
    const script = this.querySelector('#modal-node-script').value;

    // The modal doesn't know or care what "creating a node" means -
    // it just reports the user's intent and lets main.js decide.
    this.dispatchEvent(new CustomEvent('node-create', {
      detail: { parentPath, name, script },
      bubbles: true,
      composed: true,
    }));
  }
}

customElements.define('prompt-create-modal', PromptCreateModal);