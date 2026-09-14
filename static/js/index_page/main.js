// File: static/js/index_page/main.js
import SocketInterface from "../commons/socketInterface.js";
import '../commons/components/header.js';
import './ui/outputModal.js';
import './ui/projectInitialize.js';
import './ui/promptEditor.js';
import './ui/snippetDrawer.js';
import './ui/pageContainer.js'; 

document.addEventListener("DOMContentLoaded", () => { 
  const SocketObject = new SocketInterface();
  let isSessionReady = false;

  const editor = document.querySelector('prompt-editor');

  const appHeader = document.querySelector('app-header');

  SocketObject.onConnect(() => {
    appHeader.setConnectionStatus(true);
  });

  SocketObject.onDisconnect(() => {
    appHeader.setConnectionStatus(false);
    isSessionReady = false;
  });
  
  SocketObject.SessionInit.success(({ root }) => {
    isSessionReady = true;
    const msg = document.getElementById("session-message");
    msg.className = "text-xs mt-2 text-emerald-400";
    msg.innerText = `Workspace loaded successfully: ${root}`;
  });

  SocketObject.SessionInit.fail(({ message }) => {
    const msg = document.getElementById("session-message");
    msg.className = "text-xs mt-2 text-red-400";
    msg.innerText = message || "Failed to load workspace.";
  });

  window.addEventListener('project-init', (e) => {
    SocketObject.initSession(e.detail.path);
  });

  // --- Autocomplete & Dropdown Engine ---
  editor.onInput(() => {
    if (!isSessionReady) {
      console.warn("Session not ready. Please initialize a workspace first.");
      return;
    }
    checkTriggerAndFetch();
  });

  SocketObject.onResponse((res) => {
    const activeMatch = editor.activePromptMatch || editor.activeFileMatch;
    if (!activeMatch){
      return;
    }

    if (res.status === "success" && Array.isArray(res.data) && res.path.endsWith("children")) {
      const prefix = activeMatch.filterPrefix.toLowerCase();
      editor.suggestions = res.data.filter(item => item.toLowerCase().startsWith(prefix));

      if (editor.suggestions.length > 0) {
        editor.showDropdown(editor.suggestions);
      } else {
        editor.hideDropdown();
      }
    }
  });

  async function checkTriggerAndFetch() {
    const textarea = editor.querySelector('.prompt-textarea');
    if (!textarea) {
      console.error("Textarea not found in prompt-editor.");
      return;
    }

    const cursorPos = textarea.selectionStart;
    const textUpToCursor = editor.value.slice(0, cursorPos);

    const fileMatch = textUpToCursor.match(/file:([^\s]*)$/);
    if (fileMatch) {
      const fullMatchStr = fileMatch[0];
      const typedPath = fileMatch[1];
      const startIdx = cursorPos - fullMatchStr.length;
      const lastSlashIdx = typedPath.lastIndexOf("/");

      let parentPath = "";
      let filterPrefix = typedPath;

      if (lastSlashIdx !== -1) {
        parentPath = typedPath.slice(0, lastSlashIdx);
        filterPrefix = typedPath.slice(lastSlashIdx + 1);
      }

      editor.activeFileMatch = { startIdx, endIdx: cursorPos, parentPath, filterPrefix };
      editor.activePromptMatch = null;

      try {
        const res = await SocketObject.node.getChildren(parentPath);
        const prefix = filterPrefix.toLowerCase();
        editor.suggestions = res.data.filter(item => item.toLowerCase().startsWith(prefix));

        if (editor.suggestions.length > 0) {
          editor.showDropdown(editor.suggestions);
        } else {
          editor.hideDropdown();
        }
      } catch (err) {
        editor.hideDropdown();
      }
      return;
    }

    const promptMatch = textUpToCursor.match(/prompt:([^\s]*)$/);
    if (promptMatch) {
      const fullMatchStr = promptMatch[0];
      const typedPath = promptMatch[1];
      const startIdx = cursorPos - fullMatchStr.length;
      const lastSlashIdx = typedPath.lastIndexOf("/");

      let parentPath = "";
      let filterPrefix = typedPath;

      if (lastSlashIdx !== -1) {
        parentPath = typedPath.slice(0, lastSlashIdx);
        filterPrefix = typedPath.slice(lastSlashIdx + 1);
      }

      const reqPath = parentPath ? `${parentPath}/children` : "children";

      editor.activePromptMatch = { startIdx, endIdx: cursorPos, parentPath, filterPrefix };
      editor.activeFileMatch = null;

      SocketObject.promptSocket(reqPath);
      return;
    }

    editor.hideDropdown();
  }

  function applySelection(selectedItem) {
    const activeMatch = editor.activeFileMatch || editor.activePromptMatch;
    if (!activeMatch) return;

    const textarea = editor.querySelector('.prompt-textarea');
    if (!textarea) return;

    const prefixType = editor.activeFileMatch ? "file:" : "prompt:";
    const { startIdx, endIdx, parentPath } = activeMatch;
    const completePath = parentPath ? `${parentPath}/${selectedItem}` : selectedItem;
    const replacement = `${prefixType}${completePath}`;

    const textBefore = editor.value.slice(0, startIdx);
    const textAfter = editor.value.slice(endIdx);

    editor.value = textBefore + replacement + textAfter;
    textarea.selectionStart = textarea.selectionEnd = startIdx + replacement.length;

    editor.hideDropdown();
    checkTriggerAndFetch();
  }

  window.applySelection = applySelection;

  editor.onKeydown((e) => {
    if (editor.dropdown.classList.contains("hidden") || editor.suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      editor.selectedIndex = (editor.selectedIndex + 1) % editor.suggestions.length;
      editor.updateSelectionVisuals();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      editor.selectedIndex = (editor.selectedIndex - 1 + editor.suggestions.length) % editor.suggestions.length;
      editor.updateSelectionVisuals();
    } else if (e.key === "Tab" || e.key === "Enter") {
      e.preventDefault();
      applySelection(editor.suggestions[editor.selectedIndex]);
    } else if (e.key === "Escape") {
      editor.hideDropdown();
    }
  });

  function parsePromptKwargs(rawKwargs) {
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

  async function generateCompiledPrompt() {
    if (!isSessionReady) {
      alert("Please initialize a workspace session first.");
      return null;
    }

    const rawPrompt = editor.value;
    const matches = [...rawPrompt.matchAll(/file:([^\s]+)/g)];
    const promptMatches = [...rawPrompt.matchAll(/prompt:([^\s(]+)(?:\(([^)]*)\))?/g)];

    if (matches.length === 0 && promptMatches.length === 0) {
      return rawPrompt;
    }

    const uniquePaths = [...new Set(matches.map(m => m[1]))];
    const scriptMap = {};
    const promptMap = {};

    await Promise.all(
      promptMatches.map(match => {
        const promptPath = match[1];
        const kwargs = parsePromptKwargs(match[2]);

        return new Promise(resolve => {
          const apiPath = `${promptPath}/build_prompt`;
          const handler = (res) => {
            if (res.path !== apiPath) return;
            SocketObject.off("response", handler);
            promptMap[match[0]] = res.status === "success" ? res.data : `[Error building prompt: ${promptPath}]`;
            resolve();
          };

          SocketObject.onResponse(handler);
          SocketObject.promptSocket(apiPath, kwargs);
        });
      })
    );

    await Promise.all(
      uniquePaths.map(async (path) => {
        try {
          const res = await SocketObject.node.getScript(path);
          scriptMap[path] = res.data;
        } catch (err) {
          scriptMap[path] = `[Error reading: ${path}]`;
        }
      })
    );

    let compiledPrompt = rawPrompt;
    matches.forEach(m => {
      const filePath = m[1];
      const scriptContent = scriptMap[filePath] || "";
      const formattedContent = `\n\`\`\`\n// File: ${filePath}\n${scriptContent}\n\`\`\`\n`;
      compiledPrompt = compiledPrompt.replace(m[0], formattedContent);
    });

    promptMatches.forEach(match => {
      const formattedPrompt = promptMap[match[0]] || `[Error building prompt: ${match[1]}]`;
      compiledPrompt = compiledPrompt.replace(match[0], formattedPrompt);
    });

    return compiledPrompt;
  }

  async function buildPrompt() {
    const button = editor.promptBuildBtn;
    const modal = document.getElementById("output-modal");
    const originalText = button.innerHTML;

    try {
      button.disabled = true;
      button.innerText = "Building...";

      const compiledText = await generateCompiledPrompt();
      if (compiledText !== null && modal) {
        modal.setContent(compiledText);
        modal.openModal();
      }
    } catch (err) {
      alert("An error occurred while building prompt scripts.");
      console.error(err);
    } finally {
      button.disabled = false;
      button.innerHTML = originalText;
    }
  }

  async function compileAndCopyPrompt() {
    const button = editor.promptCopyBtn;
    const originalText = button.innerHTML;

    try {
      button.disabled = true;
      button.innerText = "Fetching Scripts...";

      const compiledText = await generateCompiledPrompt();
      if (compiledText !== null) {
        await copyToClipboard(compiledText);
      }
    } catch (err) {
      alert("An error occurred while building prompt scripts.");
    } finally {
      button.disabled = false;
      button.innerHTML = originalText;
    }
  } 

  editor.onBuild(buildPrompt);
  editor.onCopy(compileAndCopyPrompt);

  async function copyToClipboard(text) {
    await navigator.clipboard.writeText(text);
    editor.showCopyStatus();
  }
});