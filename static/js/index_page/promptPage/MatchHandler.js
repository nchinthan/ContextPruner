// File: static/js/index_page/MatchHandler.js
export class MatchHandler {
  constructor() {
    // Regular expressions preserved exact behavior
    this.inlineCmdRegex = /(?:(?:\/\/ File: )|file:)?([^\s\n]+)\/(\$children(?:-recursive)?\(\)):(place|placeAsFile)/g;
    this.fileTriggerRegex = /file:([^\s]*)$/;
    this.promptTriggerRegex = /prompt:([^\s]*)$/;
    this.fileReferenceRegex = /file:([^\s]+)/g;
    this.promptReferenceRegex = /prompt:([^\s(]+)(?:\(([^)]*)\))?/g;
  }

  /**
   * Finds the first inline expansion command in the text.
   */
  findInlineCommand(text) {
    // Reset regex state for global regex
    this.inlineCmdRegex.lastIndex = 0;
    const match = this.inlineCmdRegex.exec(text);
    if (!match) return null;

    const fullMatchedStr = match[0];
    const targetPath = match[1];
    const method = match[2];
    const placementType = match[3];
    const matchStart = match.index;
    const matchEnd = matchStart + fullMatchedStr.length;

    const apiMethod = method === "$children-recursive()" ? "$children-recursive()" : "$children()";
    const reqPath = targetPath ? `${targetPath}/${apiMethod}` : apiMethod;

    return {
      fullMatchedStr,
      targetPath,
      method,
      placementType,
      matchStart,
      matchEnd,
      reqPath
    };
  }

  /**
   * Calculates the replacement string for an inline expansion match.
   */
  formatInlineReplacement(targetPath, placementType, data) {
    if (placementType === "place") {
      return data.map(child => `${targetPath}/${child}`).join("\n");
    } else if (placementType === "placeAsFile") {
      return data.map(child => `// File: ${targetPath}/${child}`).join("\n\n");
    }
    return "";
  }

  /**
   * Parses text up to cursor position for autocomplete triggers (file: or prompt:).
   */
  findAutocompleteTrigger(textUpToCursor, cursorPos) {
    const fileMatch = textUpToCursor.match(this.fileTriggerRegex);
    if (fileMatch) {
      return { type: "file", ...this._parseTriggerMatch(fileMatch, cursorPos) };
    }

    const promptMatch = textUpToCursor.match(this.promptTriggerRegex);
    if (promptMatch) {
      return { type: "prompt", ...this._parseTriggerMatch(promptMatch, cursorPos) };
    }

    return null;
  }

  /**
   * Helper to parse parentPath and filterPrefix for auto-suggestions.
   */
  _parseTriggerMatch(match, cursorPos) {
    const fullMatchStr = match[0];
    const typedPath = match[1];
    const startIdx = cursorPos - fullMatchStr.length;
    const lastSlashIdx = typedPath.lastIndexOf("/");

    let parentPath = "";
    let filterPrefix = typedPath;

    if (lastSlashIdx !== -1) {
      parentPath = typedPath.slice(0, lastSlashIdx);
      filterPrefix = typedPath.slice(lastSlashIdx + 1);
    }

    return { startIdx, endIdx: cursorPos, parentPath, filterPrefix };
  }

  /**
   * Extracts all file and prompt references for compiling the final prompt.
   */
  findAllReferences(rawPrompt) {
    const fileMatches = [...rawPrompt.matchAll(this.fileReferenceRegex)].map(m => ({
      fullMatch: m[0],
      path: m[1]
    }));

    const promptMatches = [...rawPrompt.matchAll(this.promptReferenceRegex)].map(m => ({
      fullMatch: m[0],
      promptPath: m[1],
      kwargs: this.parsePromptKwargs(m[2])
    }));

    const uniqueFilePaths = [...new Set(fileMatches.map(m => m.path))];

    return { fileMatches, promptMatches, uniqueFilePaths };
  }

  /**
   * Parses key-value argument strings like `arg1='val', arg2="val2"`.
   */
  parsePromptKwargs(rawKwargs) {
    const kwargs = {};
    if (!rawKwargs || !rawKwargs.trim()) return kwargs;

    for (const part of rawKwargs.split(",")) {
      const [key, ...valueParts] = part.split("=");
      if (!key || valueParts.length === 0) continue;

      let value = valueParts.join("=").trim();
      if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
        value = value.slice(1, -1);
      }
      kwargs[key.trim()] = value;
    }
    return kwargs;
  }
}