// File: ui/components/prompt_manager/promptEditor.js
class PromptScriptEditor extends HTMLElement {
  constructor() {
    super();
    this._pendingValue = '';
    this._textarea = null;
    this._backdrop = null;
  }

  connectedCallback() {
    this.className = 'flex-1 flex flex-col p-6 min-h-0 bg-gray-950';
    this.innerHTML = `
      <div class="flex items-center justify-between mb-2"> 
          <label for="node-script-editor" class="text-xs font-semibold text-gray-400 uppercase tracking-wider block"> 
              Prompt Script Template 
          </label> 
          <span class="text-xs text-indigo-400 font-mono">Placeholders: {arg_name}</span> 
      </div> 

      <div class="relative flex-1 w-full overflow-hidden rounded-xl border border-gray-800 bg-gray-900 focus-within:border-indigo-500 transition"> 
          <div id="editor-backdrop" aria-hidden="true" class="absolute inset-0 p-4 font-mono text-sm leading-relaxed text-gray-100 whitespace-pre-wrap break-words overflow-auto pointer-events-none select-none box-border m-0 border-0"></div> 
          <div class="absolute inset-0"> 
              <textarea id="node-script-editor" class="w-full h-full p-4 font-mono text-sm leading-relaxed bg-transparent focus:outline-none resize-none overflow-auto whitespace-pre-wrap break-words box-border m-0 border-0" style="color: transparent; caret-color: #f3f4f6" placeholder="Write script content here... e.g. Hello {user_name}!"></textarea> 
          </div> 
      </div>`;

    this._textarea = this.querySelector('#node-script-editor');
    this._backdrop = this.querySelector('#editor-backdrop');

    this._textarea.addEventListener('input', () => this._updateHighlights());
    this._textarea.addEventListener('scroll', () => this._syncScroll());

    if (this._pendingValue !== undefined) {
      this.value = this._pendingValue;
    } else {
      this._updateHighlights();
    }
  }

  get value() {
    return this._textarea ? this._textarea.value : this._pendingValue;
  }

  set value(newValue) {
    const val = newValue || '';
    this._pendingValue = val;

    if (this._textarea) {
      this._textarea.value = val;
      this._updateHighlights();
      this._syncScroll();
    }
  }

  focusEditor() {
    if (this._textarea) this._textarea.focus();
  }

  _escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  _updateHighlights() {
    if (!this._textarea || !this._backdrop) return;
    const raw = this._textarea.value;
    const escaped = this._escapeHtml(raw);
    const highlighted = escaped.replace(
      /\{([^{}\s]+)\}/g,
      '<span class="text-indigo-400 bg-indigo-500/10 rounded px-0.5">{$1}</span>'
    );
    this._backdrop.innerHTML = highlighted + '\n';
  }

  _syncScroll() {
    if (!this._textarea || !this._backdrop) return;
    this._backdrop.scrollTop = this._textarea.scrollTop;
    this._backdrop.scrollLeft = this._textarea.scrollLeft;
  }
}

customElements.define('prompt-script-editor', PromptScriptEditor);