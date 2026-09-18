// Abstract base class for highlighted script/template editors.
// Subclasses only need to override `_getHighlightedHtml(escapedText)`
// (and optionally the label / placeholder via attributes or by overriding
// `_renderChrome()`).

export default class AbstractHighlightedEditor extends HTMLElement {
  constructor() {
    super();
    this._pendingValue = '';
    this._textarea = null;
    this._backdrop = null;
  }

  // ── Public API ──────────────────────────────────────────────────────────

  get value() {
    return this._textarea ? this._textarea.value : this._pendingValue;
  }

  set value(newValue) {
    const val = newValue ?? '';
    this._pendingValue = val;
    if (this._textarea) {
      this._textarea.value = val;
      this._updateHighlights();
      this._syncScroll();
    }
  }

  focusEditor() {
    this._textarea?.focus();
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────

  connectedCallback() {
    // Allow subclasses / attributes to customise chrome
    const label = this.getAttribute('label') ?? this._defaultLabel();
    const hint  = this.getAttribute('hint')  ?? this._defaultHint();
    const placeholder = this.getAttribute('placeholder') ?? this._defaultPlaceholder();

    this.className = this.className || 'flex-1 flex flex-col p-6 min-h-0 bg-gray-950';

    this.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <label class="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
          ${this._escapeHtml(label)}
        </label>
        ${hint ? `<span class="text-xs text-indigo-400 font-mono">${this._escapeHtml(hint)}</span>` : ''}
      </div>
      <div class="relative flex-1 w-full overflow-hidden rounded-xl border border-gray-800 bg-gray-900 focus-within:border-indigo-500 transition">
        <div id="editor-backdrop"
             aria-hidden="true"
             class="absolute inset-0 p-4 font-mono text-sm leading-relaxed text-gray-100 whitespace-pre-wrap break-words overflow-auto pointer-events-none select-none box-border m-0 border-0"></div>
        <div class="absolute inset-0">
          <textarea id="node-script-editor"
                    class="w-full h-full p-4 font-mono text-sm leading-relaxed bg-transparent focus:outline-none resize-none overflow-auto whitespace-pre-wrap break-words box-border m-0 border-0"
                    style="color: transparent; caret-color: #f3f4f6"
                    placeholder="${this._escapeHtml(placeholder)}"></textarea>
        </div>
      </div>`;

    this._textarea = this.querySelector('#node-script-editor');
    this._backdrop = this.querySelector('#editor-backdrop');

    this._textarea.addEventListener('input',  () => this._updateHighlights());
    this._textarea.addEventListener('scroll', () => this._syncScroll());

    // Apply any value that was set before the element was connected
    if (this._pendingValue !== undefined) {
      this.value = this._pendingValue;
    } else {
      this._updateHighlights();
    }
  }

  // ── Hooks for subclasses ────────────────────────────────────────────────

  /** Override to change the default label text */
  _defaultLabel() {
    return 'Script / Template';
  }

  /** Override to change the default right-hand hint */
  _defaultHint() {
    return '';
  }

  /** Override to change the default placeholder */
  _defaultPlaceholder() {
    return 'Write content here…';
  }

  /**
   * Core extension point.
   * Receive already-escaped text and return HTML that will be injected
   * into the backdrop.  Must preserve whitespace and line-breaks.
   *
   * @param {string} escapedText  HTML-escaped original content
   * @returns {string}            HTML with <span> highlights etc.
   */
  _getHighlightedHtml(escapedText) {
    // Default: no highlighting – just echo the escaped text
    return escapedText;
  }

  // ── Internal helpers ────────────────────────────────────────────────────

  _escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  _updateHighlights() {
    if (!this._textarea || !this._backdrop) return;

    const raw = this._textarea.value;
    const escaped = this._escapeHtml(raw);
    const highlighted = this._getHighlightedHtml(escaped);

    // trailing newline keeps the last line visible when scrolling
    this._backdrop.innerHTML = highlighted + '\n';
  }

  _syncScroll() {
    if (!this._textarea || !this._backdrop) return;
    this._backdrop.scrollTop  = this._textarea.scrollTop;
    this._backdrop.scrollLeft = this._textarea.scrollLeft;
  }
}

// Optional: register a bare abstract element (rarely used directly)
customElements.define('abstract-highlighted-editor', AbstractHighlightedEditor);
