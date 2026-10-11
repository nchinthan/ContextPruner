// File: static/js/index_page/promptPage/EditorUIHandler.js
export class EditorUIHandler {
  constructor(editorElement) {
    this.editor = editorElement;
  }

  // --- Event Bindings ---

  onInput(callback) {
    this.editor.onInput(callback);
  }

  onKeydown(callback) {
    this.editor.onKeydown(callback);
  }

  onBuild(callback) {
    this.editor.onBuild(callback);
  }

  onCopy(callback) {
    this.editor.onCopy(callback);
  }

  // --- State & Text Queries ---

  getValue() {
    return this.editor.value;
  }

  getCursorPosition() {
    const textarea = this.editor.querySelector('.prompt-textarea');
    return textarea ? textarea.selectionStart : 0;
  }

  hasTextarea() {
    return !!this.editor.querySelector('.prompt-textarea');
  }

  getActiveMatch() {
    return this.editor.activePromptMatch || this.editor.activeFileMatch;
  }

  isDropdownOpen() {
    return !this.editor.dropdown.classList.contains("hidden") && this.editor.suggestions.length > 0;
  }

  getSuggestions() {
    return this.editor.suggestions || [];
  }

  getSelectedIndex() {
    return this.editor.selectedIndex;
  }

  // --- Match State Mutators ---

  setActiveFileMatch(match) {
    this.editor.activeFileMatch = match;
    this.editor.activePromptMatch = null;
  }

  setActivePromptMatch(match) {
    this.editor.activePromptMatch = match;
    this.editor.activeFileMatch = null;
  }

  // --- Dropdown & Suggestion UI ---

  setSuggestionsAndFilter(items, prefix) {
    const lowerPrefix = prefix.toLowerCase();
    const filtered = items.filter(item => item.toLowerCase().startsWith(lowerPrefix));
    this.editor.suggestions = filtered;

    if (filtered.length > 0) {
      this.editor.showDropdown(filtered);
    } else {
      this.editor.hideDropdown();
    }
  }

  hideDropdown() {
    this.editor.hideDropdown();
  }

  navigateDropdown(direction) {
    const length = this.editor.suggestions.length;
    if (length === 0) return;

    if (direction === "down") {
      this.editor.selectedIndex = (this.editor.selectedIndex + 1) % length;
    } else if (direction === "up") {
      this.editor.selectedIndex = (this.editor.selectedIndex - 1 + length) % length;
    }
    this.editor.updateSelectionVisuals();
  }

  // --- Text Replacements & Cursor Updates ---

  replaceRange(startIdx, endIdx, replacementText) {
    const textarea = this.editor.querySelector('.prompt-textarea');
    const currentValue = this.editor.value;
    const before = currentValue.slice(0, startIdx);
    const after = currentValue.slice(endIdx);

    this.editor.value = before + replacementText + after;

    if (textarea) {
      const newCursorPos = startIdx + replacementText.length;
      textarea.selectionStart = textarea.selectionEnd = newCursorPos;
    }
  }

  applySelection(selectedItem) {
    const activeMatch = this.getActiveMatch();
    if (!activeMatch) return;

    const prefixType = this.editor.activeFileMatch ? "file:" : "prompt:";
    const { startIdx, endIdx, parentPath } = activeMatch;
    const completePath = parentPath ? `${parentPath}/${selectedItem}` : selectedItem;
    const replacement = `${prefixType}${completePath}`;

    this.replaceRange(startIdx, endIdx, replacement);
    this.hideDropdown();
  }

  // --- Button Loading State Management ---

  async runWithButtonLoading(buttonType, loadingText, action) {
    const button = buttonType === "build" ? this.editor.promptBuildBtn : this.editor.promptCopyBtn;
    const originalText = button.innerHTML;

    try {
      button.disabled = true;
      button.innerText = loadingText;
      await action();
    } finally {
      button.disabled = false;
      button.innerHTML = originalText;
    }
  }

  showCopyStatus() {
    this.editor.showCopyStatus();
  }
}