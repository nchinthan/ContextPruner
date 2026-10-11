// File: static/js/index_page/addNodePage/ui/AddNodeEditor.js

const addNodeEditorHtml = `
  <div class="flex flex-col gap-4 h-full">
    <!-- Header Controls -->
    <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-gray-900 border border-gray-800 p-4 rounded-xl shadow-lg">
      <div class="flex-1 flex flex-col gap-1">
        <label class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Target Node / File Path</label>
        <div class="relative flex items-center">
          <span class="absolute left-3 text-gray-500 font-mono text-sm">/</span>
          <input 
            type="text" 
            class="node-path-input w-full bg-gray-950 border border-gray-700 focus:border-indigo-500 text-gray-100 text-sm font-mono rounded-lg pl-7 pr-4 py-2 outline-none transition"
            placeholder="src/components/MyNewNode.js"
          />
        </div>
      </div>
      <div class="flex items-end gap-3">
        <button 
          class="fetch-btn bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 text-sm font-medium px-4 py-2 rounded-lg transition flex items-center gap-2"
        >
          <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          Fetch Existing
        </button>
      </div>
    </div>

    <!-- Code Editor Section -->
    <div class="flex-1 flex flex-col bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg min-h-[400px]">
      <div class="flex justify-between items-center mb-3">
        <label class="text-sm font-medium text-gray-300 flex items-center gap-2">
          <svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
          </svg>
          New Node Code Editor
        </label>
        <span class="status-indicator text-xs font-mono text-gray-500">Ready</span>
      </div>

      <textarea
        class="code-textarea w-full flex-1 bg-gray-950 border border-gray-800 rounded-lg p-4 font-mono text-sm text-gray-100 focus:outline-none focus:border-indigo-500 transition resize-none leading-relaxed"
        placeholder="// Write or paste your module code here..."
        spellcheck="false"
      ></textarea>

      <!-- Action Footer -->
      <div class="mt-4 flex justify-between items-center pt-3 border-t border-gray-800">
        <span class="text-xs text-gray-500">
          Press <kbd class="px-1.5 py-0.5 bg-gray-800 rounded border border-gray-700 text-gray-300">Ctrl</kbd> + <kbd class="px-1.5 py-0.5 bg-gray-800 rounded border border-gray-700 text-gray-300">Enter</kbd> to Compare & Save
        </span>
        <button 
          class="review-diff-btn bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition flex items-center gap-2 shadow-md hover:shadow-indigo-500/20"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 002-2h2a2 2 0 002 2m0 0h2a2 2 0 002 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
          </svg>
          Compare & Save
        </button>
      </div>
    </div>
  </div>
`;

export class AddNodeEditor extends HTMLElement {
  constructor() {
    super();
    this.className = "w-full h-full block";
    this.innerHTML = addNodeEditorHtml;
  }

  connectedCallback() {
    this.fetchBtn?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('fetch-requested', {
        bubbles: true,
        composed: true,
        detail: { path: this.getPath() }
      }));
    });

    this.reviewBtn?.addEventListener('click', () => {
      this.triggerReview();
    });

    this.codeTextarea?.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.triggerReview();
      }
    });
  }

  get pathInput() { return this.querySelector('.node-path-input'); }
  get codeTextarea() { return this.querySelector('.code-textarea'); }
  get fetchBtn() { return this.querySelector('.fetch-btn'); }
  get reviewBtn() { return this.querySelector('.review-diff-btn'); }
  get statusEl() { return this.querySelector('.status-indicator'); }

  getPath() { return this.pathInput ? this.pathInput.value.trim() : ''; }
  setPath(val) { if (this.pathInput) this.pathInput.value = val; }

  getCode() { return this.codeTextarea ? this.codeTextarea.value : ''; }
  setCode(val) { if (this.codeTextarea) this.codeTextarea.value = val; }

  setStatus(msg, isError = false) {
    if (this.statusEl) {
      this.statusEl.textContent = msg;
      this.statusEl.className = `status-indicator text-xs font-mono ${isError ? 'text-red-400' : 'text-emerald-400'}`;
    }
  }

  triggerReview() {
    const path = this.getPath();
    const code = this.getCode();

    if (!path) {
      window.alert("Please provide a target file or node path.");
      return;
    }

    this.dispatchEvent(new CustomEvent('review-requested', {
      bubbles: true,
      composed: true,
      detail: { path, code }
    }));
  }
}

customElements.define('add-node-editor', AddNodeEditor);