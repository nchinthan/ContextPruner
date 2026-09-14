export class BaseTreeView extends HTMLElement {
  constructor() {
    super();
    this._container = null;
  }

  /**
   * Defines which node tag is rendered at the root level.
   * Override in sub-class if different.
   */
  get nodeTagName() {
    return 'base-tree-node';
  }

  connectedCallback() {
    this.renderLayout();
    this._container = this.querySelector('[data-tree-container]') || this;
  }

  /**
   * Renders the outer UI wrapper (toolbars, headers, export buttons).
   * Must contain an element with `data-tree-container` attribute.
   */
  renderLayout() {
    this.innerHTML = `<div data-tree-container></div>`;
  }

  render(rootTree, activePath = '') {
    this.clear();
    if (!rootTree || !this._container) return;

    const rootNodeEl = document.createElement(this.nodeTagName);
    const ul = document.createElement('ul');
    ul.className = 'space-y-1';
    ul.appendChild(rootNodeEl);
    this._container.appendChild(ul);

    rootNodeEl.setData(rootTree, activePath);
  }

  clear() {
    if (this._container) this._container.innerHTML = '';
  }
}