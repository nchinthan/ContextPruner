import  AbstractHighlightedEditor from '../../commons/components/AbstractHighlightedEditor.js';

class PromptScriptEditor extends AbstractHighlightedEditor {
  _defaultLabel() {
    return 'Prompt Script Template';
  }

  _defaultHint() {
    return 'Placeholders: {arg_name}';
  }

  _defaultPlaceholder() {
    return 'Write script content here... e.g. Hello {user_name}!';
  }

  _getHighlightedHtml(escapedText) {
    // Highlight {placeholders}
    return escapedText.replace(
      /\{([^{}\s]+)\}/g,
      '<span class="text-indigo-400 bg-indigo-500/10 rounded px-0.5">{$1}</span>'
    );
  }
}

customElements.define('prompt-script-editor', PromptScriptEditor);