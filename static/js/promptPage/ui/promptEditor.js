// File: ui/components/prompt_manager/promptEditor.js
class PromptScriptEditor extends HTMLElement {
  connectedCallback() {
    this.className = 'flex-1 flex flex-col p-6 min-h-0 bg-gray-950';
    this.innerHTML = `
            <div class="flex items-center justify-between mb-2"> 
                <label 
                    for="node-script-editor" 
                    class="text-xs font-semibold text-gray-400 uppercase tracking-wider block" 
                > 
                    Prompt Script Template 
                </label> 
                <span class="text-xs text-indigo-400 font-mono">Placeholders: {arg_name}</span> 
            </div> 

            <!-- Outer Box --> 
            <div class="relative flex-1 w-full overflow-hidden rounded-xl border border-gray-800 bg-gray-900 focus-within:border-indigo-500 transition"> 
                <!-- Backdrop --> 
                <div 
                    id="editor-backdrop" 
                    aria-hidden="true" 
                    class="absolute inset-0 p-4 font-mono text-sm leading-relaxed text-gray-100 whitespace-pre-wrap break-words overflow-auto pointer-events-none select-none box-border m-0 border-0" 
                ></div> 

                <!-- Textarea --> 
                <div class="absolute inset-0"> 
                    <textarea 
                        id="node-script-editor" 
                        class="w-full h-full p-4 font-mono text-sm leading-relaxed bg-transparent focus:outline-none resize-none overflow-auto whitespace-pre-wrap break-words box-border m-0 border-0" 
                        style="color: transparent; caret-color: #f3f4f6" 
                        placeholder="Write script content here... e.g. Hello {user_name}, welcome to {app_title}!" 
                    ></textarea> 
                </div> 
            </div>`;

    this._textarea = this.querySelector('#node-script-editor');
    this._backdrop = this.querySelector('#editor-backdrop');

    // Syntax highlighting is a pure presentation concern - it stays entirely
    // inside this component and never touches main.js.
    this._textarea.addEventListener('input', () => this._updateHighlights());
    this._textarea.addEventListener('scroll', () => this._syncScroll());

    this._updateHighlights();
  }

  // --- Public data API used by main.js ---

  get value() {
    return this._textarea.value;
  }

  set value(newValue) {
    this._textarea.value = newValue || '';
    this._updateHighlights();
    this._syncScroll();
  }

  focusEditor() {
    this._textarea.focus();
  }

  // --- Internal presentation helpers ---

  _escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  _updateHighlights() {
    const raw = this._textarea.value;
    const escaped = this._escapeHtml(raw);
    const highlighted = escaped.replace(
      /\{([^{}\s]+)\}/g,
      '<span class="text-indigo-400 bg-indigo-500/10 rounded px-0.5">{$1}</span>'
    );
    // Trailing newline keeps caret alignment consistent with the textarea.
    this._backdrop.innerHTML = highlighted + '\n';
  }

  _syncScroll() {
    this._backdrop.scrollTop = this._textarea.scrollTop;
    this._backdrop.scrollLeft = this._textarea.scrollLeft;
  }
}

customElements.define('prompt-script-editor', PromptScriptEditor);