class ProjectInit extends HTMLElement {
  constructor() {
    super();
    this.className = "bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg";
    this.innerHTML = `
      <label class="block text-sm font-medium text-gray-300 mb-2">Project Root Path</label>
      <div class="flex gap-3">
          <input
              type="text"
              id="root-path-input"
              placeholder="e.g., C:/Projects/my-app or /home/user/project"
              class="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-500 transition"
          />
          <button
              id="init-btn"
              class="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2 rounded-lg text-sm transition shadow-md hover:shadow-indigo-500/20"
          >
              Initialize Workspace
          </button>
      </div>
      <p id="session-message" class="text-xs mt-2 text-gray-400"></p>
    `;
  }

  // --- Element Getters ---
  get rootPathInput() { return this.querySelector('#root-path-input'); }
  get initBtn() { return this.querySelector('#init-btn'); }
  get sessionMessage() { return this.querySelector('#session-message'); }

  connectedCallback() {
    this.initBtn?.addEventListener('click', () => {
      const path = this.rootPathInput?.value.trim() || "";
      window.dispatchEvent(new CustomEvent("project-init", {
        detail: { path },
        bubbles: true,
        composed: true
      }));
    });
  }
}

customElements.define("project-init", ProjectInit);