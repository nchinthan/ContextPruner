class OutputModal extends HTMLElement {
  constructor() {
    super();
    this.id = "output-modal";
    this.className = "fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden";

    this.innerHTML = `
      <div class="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl">
          <div class="flex justify-between items-center p-4 border-b border-gray-800">
              <div class="flex items-center gap-3">
                  <h3 class="text-base font-medium text-gray-200">Compiled Prompt Output</h3>
                  <span id="modal-word-count" class="text-xs font-mono bg-gray-800 text-gray-400 px-2.5 py-1 rounded-full border border-gray-700">
                      0 words
                  </span>
              </div>
              <div class="flex items-center gap-3">
                  <span id="modal-copy-status" class="text-xs font-medium text-emerald-400 hidden">Copied!</span>
                  <button id="btn-close-x" class="text-gray-400 hover:text-gray-200">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                  </button>
              </div>
          </div>
          <div class="p-4 flex-1 flex flex-col">
              <textarea
                  id="modal-editor"
                  class="w-full flex-1 bg-gray-950 border border-gray-700 rounded-lg p-4 font-mono text-sm text-gray-100 focus:outline-none focus:border-indigo-500 transition resize-none leading-relaxed"
              ></textarea>
          </div>
          <div class="p-4 border-t border-gray-800 flex justify-end gap-3">
              <button
                  id="btn-close"
                  class="bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium px-4 py-2 rounded-lg text-sm transition"
              >
                  Close
              </button>
              <button
                  id="btn-copy"
                  class="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-2 rounded-lg text-sm transition flex items-center gap-2"
              >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002-2h2a2 2 0 002 2m0 0h2a2 2 0 002 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
                  </svg>
                  Copy Text
              </button>
          </div>
      </div>
    `;
  }

  // --- Element Getters (cached per DOM query on demand inside component scope) ---
  get editor() { return this.querySelector('#modal-editor'); }
  get wordCountBadge() { return this.querySelector('#modal-word-count'); }
  get copyStatus() { return this.querySelector('#modal-copy-status'); }
  get btnClose() { return this.querySelector('#btn-close'); }
  get btnCloseX() { return this.querySelector('#btn-close-x'); }
  get btnCopy() { return this.querySelector('#btn-copy'); }

  connectedCallback() {
    // Attach scoped event listeners after component mounts
    this.btnClose?.addEventListener("click", () => this.closeModal());
    this.btnCloseX?.addEventListener("click", () => this.closeModal());
    this.btnCopy?.addEventListener("click", () => this.copyModalContent());

    // Recalculate word count live if user edits inside the textarea
    this.editor?.addEventListener("input", (e) => this.updateWordCountDisplay(e.target.value));
  }

  openModal() {
    this.classList.remove("hidden");
  }

  closeModal() {
    this.classList.add("hidden");
    const status = this.copyStatus;
    if (status) status.classList.add("hidden");
  }

  calculateWordCount(text) {
    if (!text) return 0;
    return text.replace(/[^a-zA-Z0-9]/g, " ").split(/\s+/).filter(Boolean).length;
  }

  updateWordCountDisplay(text) {
    const count = this.calculateWordCount(text);
    const badge = this.wordCountBadge;

    if (badge) {
      badge.classList.remove(
        "text-green-400",
        "text-yellow-400",
        "text-orange-400",
        "text-red-400",
        "text-purple-400"
      );

      let colorClass;
      let label;

      if (count < 500) {
        colorClass = "text-green-400";
        label = "Short";
      } else if (count < 1000) {
        colorClass = "text-yellow-400";
        label = "Moderate";
      } else if (count < 2500) {
        colorClass = "text-orange-400";
        label = "Long";
      } else if (count < 5000) {
        colorClass = "text-red-400";
        label = "Very long";
      } else {
        colorClass = "text-purple-400";
        label = "Extremely long";
      }

      badge.classList.add(colorClass);
      badge.textContent = `${count.toLocaleString()} ${count === 1 ? "word" : "words"} · ${label}`;
    }
  }

  setContent(text) {
    const textarea = this.editor;
    if (textarea) {
      textarea.value = text;
      this.updateWordCountDisplay(text);
    }
  }

  async copyModalContent() {
    const textarea = this.editor;
    const text = textarea ? textarea.value : "";
    
    await navigator.clipboard.writeText(text);

    const status = this.copyStatus;
    if (status) {
      status.classList.remove("hidden");
      setTimeout(() => status.classList.add("hidden"), 3000);
    }
  }
}

customElements.define("output-modal", OutputModal);