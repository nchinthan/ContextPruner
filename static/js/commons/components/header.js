class AppHeader extends HTMLElement {
  connectedCallback() {
    const title = this.getAttribute('title') || 'Prompt Workspace';
    const currentPath = window.location.pathname;

    const isEditorActive = currentPath === '/' || currentPath === '/index.html';
    const isManagerActive = currentPath.includes('/prompt-manager');

    // 1. Move slotted/child nodes out temporarily into an array
    const customActions = Array.from(this.children);

    // 2. Render internal structure
    this.innerHTML = `
      <header class="h-14 border-b border-gray-800 bg-gray-900 px-6 flex items-center justify-between shadow-md shrink-0">
        <div class="flex items-center gap-6">
          <h1 class="text-base font-semibold text-gray-100 flex items-center gap-2">
            <svg class="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
            </svg>
            ${title}
          </h1>
          <nav class="flex items-center gap-2">
            <a href="/" class="px-3 py-1.5 text-xs font-medium rounded-lg transition ${isEditorActive ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-gray-300 hover:bg-gray-800 bg-gray-800/60'}">Editor</a>
            <a href="/prompt-manager" class="px-3 py-1.5 text-xs font-medium rounded-lg transition flex items-center gap-1.5 ${isManagerActive ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-gray-300 hover:bg-gray-800 bg-gray-800/60'}">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
              Manage Prompts
            </a>
            <button id="suggestions-toggle" type="button" class="px-3 py-1.5 text-xs font-medium rounded-lg text-gray-300 hover:bg-gray-800 bg-gray-800/60 transition">Suggestions</button>
          </nav>
        </div>
        <div id="header-actions" class="flex items-center gap-3"></div>
      </header>
    `;

    // 3. Append safely without infinite while loops
    const targetContainer = this.querySelector('#header-actions');
    customActions.forEach(el => targetContainer.appendChild(el));

    const suggestionsToggle = this.querySelector('#suggestions-toggle');
    const suggestionForm = document.createElement('form');
    suggestionForm.className = 'hidden fixed right-6 top-16 z-10 flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900 p-2 shadow-lg';
    suggestionForm.innerHTML = `
      <input name="suggestion" type="text" required placeholder="Share a suggestion..." class="w-64 rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-100 outline-none focus:border-indigo-500">
      <button type="submit" class="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500">Send</button>
    `;
    this.appendChild(suggestionForm);

    suggestionsToggle.addEventListener('click', () => {
      suggestionForm.classList.toggle('hidden');
      if (!suggestionForm.classList.contains('hidden')) {
        suggestionForm.elements.suggestion.focus();
      }
    });

    suggestionForm.addEventListener('submit', async event => {
      event.preventDefault();
      const input = suggestionForm.elements.suggestion;
      const button = suggestionForm.querySelector('button[type="submit"]');
      button.disabled = true;
      try {
        const response = await fetch('/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ suggestion: input.value })
        });
        if (!response.ok) throw new Error('Request failed');
        input.value = '';
        suggestionForm.classList.add('hidden');
      } catch (error) {
        alert('Unable to send suggestion.');
      } finally {
        button.disabled = false;
      }
    });
  }
}

customElements.define('app-header', AppHeader);