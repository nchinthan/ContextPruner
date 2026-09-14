export class BaseTreeNode extends HTMLElement {
  constructor() {
    super();
    this.nodeData = null;
    this.path = '';
    this.activePath = '';
  }

  /**
   * Defines which custom element tag is used for rendering child nodes.
   * Override in subclass if using a different custom element name.
   */
  get childTagName() {
    return this.tagName.toLowerCase();
  }

  setData(nodeTree, activePath = '') {
    this.nodeData = nodeTree;
    this.path = nodeTree.path ?? '';
    this.activePath = activePath;
    this.render();
    this.renderChildren();
  }

  /**
   * Subclasses MUST override this method to render node UI and attach custom events.
   */
  render() {
    throw new Error("BaseTreeNode sub-classes must implement render()");
  }

  /**
   * Instantiates child elements using `childTagName` and populates `.node-children` container.
   */
  renderChildren() {
    const childNodes = this.nodeData?.childNodes;
    const childrenContainer = this.querySelector('.node-children');
    
    if (!Array.isArray(childNodes) || childNodes.length === 0 || !childrenContainer) return;

    for (const childTree of childNodes) {
      const childNodeEl = document.createElement(this.childTagName);
      childrenContainer.appendChild(childNodeEl);
      childNodeEl.setData(childTree, this.activePath);
    }
  }

  // --- Helper Event Dispatchers ---
  dispatchSelect() {
    this.dispatchEvent(new CustomEvent('node-select', {
      detail: { path: this.path, nodeData: this.nodeData },
      bubbles: true,
      composed: true
    }));
  }

  dispatchAddChild() {
    this.dispatchEvent(new CustomEvent('node-add-child', {
      detail: { path: this.path, nodeData: this.nodeData },
      bubbles: true,
      composed: true
    }));
  }

  // --- Drag & Drop Hooks (Extend or Override if needed) ---
  attachDragAndDrop(draggableElement) {
    if (this.path !== '') {
      draggableElement.setAttribute('draggable', 'true');
      draggableElement.addEventListener('dragstart', this.handleDragStart.bind(this));
    }
    draggableElement.addEventListener('dragover', this.handleDragOver.bind(this));
    draggableElement.addEventListener('dragleave', this.handleDragLeave.bind(this));
    draggableElement.addEventListener('drop', this.handleDrop.bind(this));
  }

  handleDragStart(e) {
    e.stopPropagation();
    e.dataTransfer.setData('application/json', JSON.stringify({ path: this.path, data: this.nodeData }));
    e.dataTransfer.effectAllowed = 'move';
  }

  handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    this.onDragOverState(true);
  }

  handleDragLeave(e) {
    e.stopPropagation();
    this.onDragOverState(false);
  }

  handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    this.onDragOverState(false);

    let sourceData;
    try {
      sourceData = JSON.parse(e.dataTransfer.getData('application/json'));
    } catch {
      return;
    }

    if (!sourceData || sourceData.path === undefined) return;

    this.dispatchEvent(new CustomEvent('node-move', {
      detail: { sourcePath: sourceData.path, targetPath: this.path },
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Visual feedback hook for drag states. Override for custom styling.
   */
  onDragOverState(isHovered) {
    const row = this.querySelector('.node-row');
    if (row) {
      row.classList.toggle('bg-indigo-900/30', isHovered);
      row.classList.toggle('ring-1', isHovered);
      row.classList.toggle('ring-indigo-500', isHovered);
    }
  }
}