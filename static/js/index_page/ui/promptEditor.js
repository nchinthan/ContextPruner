class PromptEditor extends HTMLElement {
  constructor() {
    super();
    const EditorPlaceholder ="Write your prompt here... For example:\nPlease review this code structure:\nfile:src/dataInterface/API.js/ApiClient";
    this.className = "bg-gray-900 border border-gray-800 rounded-xl p-5 flex-1 flex flex-col shadow-lg relative";
    this.innerHTML = `
        <div class="flex justify-between items-center mb-3">
            <label class="text-sm font-medium text-gray-300">
                Prompt Editor
                <span class="text-xs font-normal text-gray-500">
                  (Type <code class="text-indigo-400 font-mono">file:</code> to trigger path autocomplete)
                </span>
            </label>
            <div class="prompt-copy-status text-xs font-medium text-emerald-400 hidden">Copied to clipboard!</div>
        </div>

        <div class="relative flex-1 flex flex-col">
            <textarea
                rows="14"
                placeholder="${EditorPlaceholder}"
                class="prompt-textarea w-full flex-1 bg-gray-950 border border-gray-700 rounded-lg p-4 font-mono text-sm text-gray-100 focus:outline-none focus:border-indigo-500 transition resize-none leading-relaxed"
            ></textarea>

            <ul
                class="prompt-autocomplete-dropdown absolute z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl max-h-56 overflow-y-auto hidden w-72 divide-y divide-gray-800 font-mono text-xs"
            ></ul>
        </div>

        <div class="mt-4 flex justify-between items-center pt-3 border-t border-gray-800">
            <span class="text-xs text-gray-500">
                Press <kbd class="px-1.5 py-0.5 bg-gray-800 rounded border border-gray-700">Tab</kbd> or
                <kbd class="px-1.5 py-0.5 bg-gray-800 rounded border border-gray-700">Enter</kbd> to select
                completion
            </span>

            <div class="flex items-center gap-3">
                <button
                    class="prompt-build-btn bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition flex items-center gap-2 shadow-md hover:shadow-indigo-500/20"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        ></path>
                    </svg>
                    Build
                </button>

                <button
                    class="prompt-copy-btn bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition flex items-center gap-2 shadow-md hover:shadow-emerald-500/20"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002-2h2a2 2 0 002 2m0 0h2a2 2 0 002 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                        ></path>
                    </svg>
                    Build and Copy
                </button>
            </div>
        </div>
    `;
    this.dropdown = this.querySelector('.prompt-autocomplete-dropdown');
    this.suggestions = [];
    this.selectedIndex = 0;
    this.activeFileMatch = null;
    this.activePromptMatch = null;
    this.promptBuildBtn = this.querySelector('.prompt-build-btn');
    this.promptCopyBtn = this.querySelector('.prompt-copy-btn');
  }

  get value() {
    const textarea = this.querySelector('.prompt-textarea');
    return textarea ? textarea.value : '';
  }

  set value(val) {
    const textarea = this.querySelector('.prompt-textarea');
    if (textarea) textarea.value = val;
  }

  // --- Exposed APIs for Event Listeners ---

  onBuild(callback) {
    const btn = this.querySelector('.prompt-build-btn');
    if (btn) btn.addEventListener('click', callback);
  }

  onCopy(callback) {
    const btn = this.querySelector('.prompt-copy-btn');
    if (btn) btn.addEventListener('click', callback);
  }

  onInput(callback) {
    const textarea = this.querySelector('.prompt-textarea');
    if (textarea) textarea.addEventListener('input', callback);
  }

  onKeydown(callback) {
    const textarea = this.querySelector('.prompt-textarea');
    if (textarea) textarea.addEventListener('keydown', callback);
  }

  // --- Helper API to get/set values or elements if needed ---

  getValue() {
    const textarea = this.querySelector('.prompt-textarea');
    return textarea ? textarea.value : '';
  }

  setValue(val) {
    const textarea = this.querySelector('.prompt-textarea');
    if (textarea) textarea.value = val;
  }

  showDropdown(items) {
    this.selectedIndex = 0;
    this.dropdown.innerHTML = "";
    
    items.forEach((item, index) => {
      const li = document.createElement("li");
      li.className = `px-3 py-2 cursor-pointer transition ${
        index === this.selectedIndex ? "bg-indigo-600 text-white" : "hover:bg-gray-800 text-gray-300"
      }`;
      li.textContent = item;
      li.onmousedown = (e) => {
        e.preventDefault();
        applySelection(item);
      };
      this.dropdown.appendChild(li);
    });

    this.dropdown.classList.remove("hidden");
    this.dropdown.style.left = `1rem`;
    this.dropdown.style.bottom = `4rem`;
  }

  hideDropdown() {
    this.dropdown.classList.add("hidden");
    this.suggestions = [];
    this.activeFileMatch = null;
    this.activePromptMatch = null;
  }

  updateSelectionVisuals() {
    const items = this.dropdown.querySelectorAll("li");
    items.forEach((li, idx) => {
      if (idx === this.selectedIndex) {
        li.className = "px-3 py-2 cursor-pointer bg-indigo-600 text-white";
        li.scrollIntoView({ block: "nearest" });
      } else {
        li.className = "px-3 py-2 cursor-pointer hover:bg-gray-800 text-gray-300";
      }
    });
  }

  showCopyStatus() {
    const status = this.querySelector('.prompt-copy-status');
    if (status) {
      status.classList.remove('hidden');
      setTimeout(() => {
        status.classList.add('hidden');
      }, 3000);
    }
  }
}
customElements.define("prompt-editor", PromptEditor);