// File: static/js/index_page/ui/snippetDrawer.js

class SnippetDrawer extends HTMLElement {
  constructor() {
    super();
    this.storageKey = "app_text_snippets";
    this.truncateLength = 250;
  }

  connectedCallback() {
    this.side = this.getAttribute("side") || "left";
    this.render();
    this.loadSnippets();
    
    // Listen for storage changes across instances/tabs
    window.addEventListener("storage-snippet-updated", () => this.loadSnippets());
  }

  render() {
    this.className = "w-64 bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col h-[520px] shadow-lg";
    this.innerHTML = `
      <div class="flex justify-between items-center pb-3 border-b border-gray-800 mb-3">
        <h3 class="text-xs font-semibold text-gray-300 uppercase tracking-wider">
          Snippets
        </h3>
        <button class="add-btn text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded transition">
          + Save Current
        </button>
      </div>
      <div class="snippets-container flex-1 overflow-y-auto space-y-2 pr-1"></div>
    `;

    this.querySelector(".add-btn").addEventListener("click", () => this.saveFromEditor());
  }

  getStorage() {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey)) || [];
    } catch {
      return [];
    }
  }

  setStorage(snippets) {
    localStorage.setItem(this.storageKey, JSON.stringify(snippets));
    window.dispatchEvent(new Event("storage-snippet-updated"));
  }

  loadSnippets() {
    const container = this.querySelector(".snippets-container");
    const snippets = this.getStorage();

    if (snippets.length === 0) {
      container.innerHTML = `<p class="text-xs text-gray-500 italic text-center mt-4">No snippets saved</p>`;
      return;
    }

    container.innerHTML = "";
    snippets.forEach((snippet) => {
      const card = document.createElement("div");
      card.className = "group relative bg-gray-950 border border-gray-800 hover:border-indigo-500/50 p-2.5 rounded-lg cursor-pointer transition flex flex-col justify-between";
      
      const truncated = snippet.text.length > this.truncateLength 
        ? snippet.text.substring(0, this.truncateLength) + "..." 
        : snippet.text;

      card.innerHTML = `
        <p class="text-xs font-mono text-gray-300 whitespace-pre-wrap break-words leading-relaxed select-none">${this.escapeHtml(truncated)}</p>
        <div class="flex justify-between items-center mt-2 pt-2 border-t border-gray-800/60">
          <span class="text-[10px] text-gray-500 font-mono">${snippet.text.length} chars</span>
          <button class="delete-btn text-xs text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition px-1" title="Delete snippet">
            ✕
          </button>
        </div>
      `;

      // Click card to insert text into editor
      card.addEventListener("click", (e) => {
        if (e.target.closest(".delete-btn")) return;
        this.insertIntoEditor(snippet.text);
      });

      // Delete action
      card.querySelector(".delete-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        this.deleteSnippet(snippet.id);
      });

      container.appendChild(card);
    });
  }

  saveFromEditor() {
    const editor = document.querySelector("prompt-editor");
    if (!editor) return;

    const textarea = editor.querySelector(".prompt-textarea");
    const selection = textarea?.value.substring(textarea.selectionStart, textarea.selectionEnd).trim();
    const textToSave = selection || editor.value.trim();

    if (!textToSave) {
      alert("Please enter or select text in the editor to save as a snippet.");
      return;
    }

    const snippets = this.getStorage();
    snippets.unshift({
      id: Date.now().toString(),
      text: textToSave,
      timestamp: new Date().toISOString()
    });

    this.setStorage(snippets);
  }

  deleteSnippet(id) {
    const snippets = this.getStorage().filter((item) => item.id !== id);
    this.setStorage(snippets);
  }

  insertIntoEditor(text) {
    const editor = document.querySelector("prompt-editor");
    if (!editor) return;

    const textarea = editor.querySelector(".prompt-textarea");
    if (!textarea) {
      editor.value += text;
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = editor.value;

    // Append at cursor or replace selection
    editor.value = currentVal.substring(0, start) + text + currentVal.substring(end);
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
    
    // Trigger input event for autocomplete engine
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  escapeHtml(str) {
    return str.replace(/[&<>"']/g, (m) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[m]));
  }
}

customElements.define("snippet-drawer", SnippetDrawer);