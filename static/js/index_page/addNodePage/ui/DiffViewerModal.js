// File: static/js/index_page/addNodePage/ui/DiffViewerModal.js

const diffModalHtml = `
  <div class="modal-backdrop fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden">
    <div class="bg-gray-900 border border-gray-800 rounded-xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-950">
        <div>
          <h3 class="text-base font-semibold text-gray-100 flex items-center gap-2">
            <svg class="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
            </svg>
            Review Changes
          </h3>
          <p class="diff-target-path text-xs font-mono text-gray-400 mt-0.5"></p>
        </div>
        <button class="close-modal-btn text-gray-400 hover:text-white text-lg">✕</button>
      </div>

      <!-- Diff Container -->
      <div class="diff-body flex-1 overflow-y-auto p-4 font-mono text-xs bg-gray-950 leading-relaxed divide-y divide-gray-900">
      </div>

      <!-- Footer Buttons -->
      <div class="px-6 py-4 border-t border-gray-800 bg-gray-900 flex justify-end items-center gap-3">
        <button class="cancel-btn px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg text-sm transition">
          Cancel
        </button>
        <button class="approve-save-btn px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-sm transition flex items-center gap-2 shadow-md hover:shadow-emerald-500/20">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          Approve & Save
        </button>
      </div>
    </div>
  </div>
`;

export class DiffViewerModal extends HTMLElement {
  constructor() {
    super();
    this.innerHTML = diffModalHtml;
    this.pendingPayload = null;
  }

  connectedCallback() {
    this.querySelector('.close-modal-btn')?.addEventListener('click', () => this.hide());
    this.querySelector('.cancel-btn')?.addEventListener('click', () => this.hide());
    this.querySelector('.approve-save-btn')?.addEventListener('click', () => {
      if (this.pendingPayload) {
        this.dispatchEvent(new CustomEvent('approve-save', {
          bubbles: true,
          composed: true,
          detail: this.pendingPayload
        }));
        this.hide();
      }
    });
  }

  show(path, oldScript, newScript, diffData) {
    this.pendingPayload = { path, script: newScript };
    
    const targetPathEl = this.querySelector('.diff-target-path');
    if (targetPathEl) targetPathEl.textContent = `Target: ${path}`;

    const diffBody = this.querySelector('.diff-body');
    if (diffBody) {
      diffBody.innerHTML = '';
      if (!diffData || diffData.length === 0) {
        diffBody.innerHTML = `<div class="p-4 text-gray-500 text-center">No changes detected.</div>`;
      } else {
        diffData.forEach(line => {
          const row = document.createElement('div');
          let bgClass = "hover:bg-gray-900/50 text-gray-300";
          let symbol = " ";
          
          if (line.type === 'add') {
            bgClass = "bg-emerald-950/40 text-emerald-300 font-medium";
            symbol = "+";
          } else if (line.type === 'delete') {
            bgClass = "bg-rose-950/40 text-rose-300 line-through opacity-80";
            symbol = "-";
          }

          row.className = `flex items-center px-2 py-0.5 ${bgClass}`;
          row.innerHTML = `
            <span class="w-8 select-none text-gray-600 text-right pr-2">${line.lineNumberOld || ''}</span>
            <span class="w-8 select-none text-gray-600 text-right pr-2">${line.lineNumberNew || ''}</span>
            <span class="w-4 select-none font-bold text-center">${symbol}</span>
            <span class="whitespace-pre-wrap break-all flex-1 pl-2">${this._escapeHtml(line.content)}</span>
          `;
          diffBody.appendChild(row);
        });
      }
    }

    this.querySelector('.modal-backdrop')?.classList.remove('hidden');
  }

  hide() {
    this.querySelector('.modal-backdrop')?.classList.add('hidden');
    this.pendingPayload = null;
  }

  _escapeHtml(str) {
    return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}

customElements.define('diff-viewer-modal', DiffViewerModal);