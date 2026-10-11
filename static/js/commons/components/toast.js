export class ToastNotification extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: fixed;
          bottom: 1.5rem;
          right: 1.5rem;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          pointer-events: none;
        }
        .toast {
          pointer-events: auto;
          min-width: 250px;
          max-width: 380px;
          padding: 0.75rem 1rem;
          border-radius: 0.375rem;
          font-family: ui-sans-serif, system-ui, sans-serif;
          font-size: 0.875rem;
          color: #fff;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          transition: all 0.2s ease-in-out;
          opacity: 0;
          transform: translateY(10px);
        }
        .toast.show {
          opacity: 1;
          transform: translateY(0);
        }
        .toast-success { background-color: #059669; }
        .toast-error { background-color: #dc2626; }
        .toast-warning { background-color: #d97706; }
        .toast-info { background-color: #2563eb; }
      </style>
      <div id="toast-container"></div>
    `;
  }

  show(message, type = 'info', duration = 3000) {
    const container = this.shadowRoot.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    // Trigger transition
    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
      toast.classList.remove('show');
      toast.addEventListener('transitionend', () => toast.remove());
    }, duration);
  }
}

customElements.define('toast-notification', ToastNotification);

// Global Toast Singleton API
let toastInstance = null;

export const showToast = (message, type = 'info', duration = 3000) => {
  if (!toastInstance) {
    toastInstance = document.querySelector('toast-notification');
    if (!toastInstance) {
      toastInstance = document.createElement('toast-notification');
      document.body.appendChild(toastInstance);
    }
  }
  toastInstance.show(message, type, duration);
};