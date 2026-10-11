// File: static/js/index_page/PromptController.js
import { MatchHandler } from "./promptPage/MatchHandler.js";
import { PromptCompiler } from "./promptPage/PromptCompiler.js";
import { EditorUIHandler } from "./promptPage/EditorUIHandler.js";
import { showToast } from '../commons/components/toast.js';
export class PromptController {

  constructor(socketInterface, promptEditorEl, outputModalEl) {
    this.socket = socketInterface;
    this.modal = outputModalEl;
    this.isSessionReady = false;

    this.editorUi = new EditorUIHandler(promptEditorEl);
    this.matchHandler = new MatchHandler();
    this.compiler = new PromptCompiler(this.socket, this.matchHandler);

    this._bindEvents();
  }

  setSessionReady(isReady) {
    this.isSessionReady = isReady;
  }

  _bindEvents() {
    this.editorUi.onInput(() => this._onInput());
    this.editorUi.onKeydown((e) => this._onKeydown(e));
    this.editorUi.onBuild(() => this._buildPrompt());
    this.editorUi.onCopy(() => this._compileAndCopyPrompt());

    this.socket.onResponse((res) => this._handleSocketResponse(res));
  }

  async _onInput() {
    if (!this.isSessionReady) {
      console.warn("Session not ready. Please initialize a workspace first.");
      return;
    }
    await this._checkTriggerAndFetch();
  }

  _handleSocketResponse(res) {
    const activeMatch = this.editorUi.getActiveMatch();
    if (!activeMatch) return;

    if (res.status === "success" && Array.isArray(res.data) && res.path.endsWith("children")) {
      const items = [...res.data, "$children():place", "$children():placeAsFile", "$children-recursive():place", "$children-recursive():placeAsFile"];
      this.editorUi.setSuggestionsAndFilter(items, activeMatch.filterPrefix);
    }
  }

  async _checkTriggerAndFetch() {
    if (!this.editorUi.hasTextarea()) return;

    const cursorPos = this.editorUi.getCursorPosition();
    const currentText = this.editorUi.getValue();

    // Check for inline expansion commands
    const inlineCmd = this.matchHandler.findInlineCommand(currentText);
    if (inlineCmd) {
      const { fullMatchedStr, targetPath, placementType, matchStart, matchEnd, reqPath } = inlineCmd;

      try {
        const res = await this.socket.node._request("", reqPath);
        if (res.status === "success" && Array.isArray(res.data)) {
          const replacementText = this.matchHandler.formatInlineReplacement(targetPath, placementType, res.data);
          this.editorUi.replaceRange(matchStart, matchEnd, replacementText);
        }
      } catch (err) {
        console.error(`Failed to execute inline editor expansion: ${fullMatchedStr}`, err);
      }
      this.editorUi.hideDropdown();
      return;
    }

    // Standard Autocomplete Triggering
    const textUpToCursor = currentText.slice(0, cursorPos);
    const trigger = this.matchHandler.findAutocompleteTrigger(textUpToCursor, cursorPos);

    if (trigger) {
      if (trigger.type === "file") {
        await this._handleFileMatch(trigger);
      } else if (trigger.type === "prompt") {
        this._handlePromptMatch(trigger);
      }
      return;
    }

    this.editorUi.hideDropdown();
  }

  async _handleFileMatch(matchDetails) {
    const { startIdx, endIdx, parentPath, filterPrefix } = matchDetails;

    this.editorUi.setActiveFileMatch({ startIdx, endIdx, parentPath, filterPrefix });

    try {
      const res = await this.socket.node.getChildren(parentPath);
      const rawData = Array.isArray(res.data) ? res.data : [];
      const items = [...rawData, "$children():place", "$children():placeAsFile", "$children-recursive():place", "$children-recursive():placeAsFile"];

      this.editorUi.setSuggestionsAndFilter(items, filterPrefix);
    } catch (err) {
      this.editorUi.hideDropdown();
    }
  }

  _handlePromptMatch(matchDetails) {
    const { startIdx, endIdx, parentPath, filterPrefix } = matchDetails;

    const reqPath = parentPath ? `${parentPath}/children` : "children";

    this.editorUi.setActivePromptMatch({ startIdx, endIdx, parentPath, filterPrefix });

    this.socket.promptSocket(reqPath);
  }

  _applySelection(selectedItem) {
    this.editorUi.applySelection(selectedItem);
    this._checkTriggerAndFetch();
  }

  _onKeydown(e) {
    if (!this.editorUi.isDropdownOpen()) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      this.editorUi.navigateDropdown("down");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      this.editorUi.navigateDropdown("up");
    } else if (e.key === "Tab" || e.key === "Enter") {
      e.preventDefault();
      const suggestions = this.editorUi.getSuggestions();
      const selectedIndex = this.editorUi.getSelectedIndex();
      this._applySelection(suggestions[selectedIndex]);
    } else if (e.key === "Escape") {
      this.editorUi.hideDropdown();
    }
  }

  async generateCompiledPrompt() {
    if (!this.isSessionReady) {
      showToast("Please initialize a workspace session first.");
      return null;
    }

    return await this.compiler.compile(this.editorUi.getValue());
  }

  async _buildPrompt() {
    await this.editorUi.runWithButtonLoading("build", "Building...", async () => {
      try {
        const compiledText = await this.generateCompiledPrompt();
        if (compiledText !== null && this.modal) {
          this.modal.setContent(compiledText);
          this.modal.openModal();
        }
      } catch (err) {
        showToast("An error occurred while building prompt scripts.");
        console.error(err);
      }
    });
  }

  async _compileAndCopyPrompt() {
    await this.editorUi.runWithButtonLoading("copy", "Fetching Scripts...", async () => {
      try {
        const compiledText = await this.generateCompiledPrompt();
        if (compiledText !== null) {
          await this._copyToClipboard(compiledText);
        }
      } catch (err) {
        showToast("An error occurred while building prompt scripts.");
      }
    });
  }

  async _copyToClipboard(text) {
    await navigator.clipboard.writeText(text);
    this.editorUi.showCopyStatus();
  }
}