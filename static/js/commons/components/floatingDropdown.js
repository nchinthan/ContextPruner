// File: js/commons/components/floatingDropdown.js

export class FloatingDropdown extends HTMLElement {
  constructor() {
    super();
    this._items = [];
    this._selectedIndex = 0;
    this.innerHTML = `
      <ul class="floating-dropdown-menu fixed z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl max-h-56 overflow-y-auto hidden divide-y divide-gray-800 font-mono text-xs"></ul>
    `;
  }

  connectedCallback() {
    // Hide when clicking outside
    this._onDocumentClick = (e) => {
      if (!this.contains(e.target)) {
        this.hide();
      }
    };
    document.addEventListener("click", this._onDocumentClick);
  }

  disconnectedCallback() {
    document.removeEventListener("click", this._onDocumentClick);
  }

  get menu() {
    return this.querySelector(".floating-dropdown-menu");
  }

  // --- Getters & Setters ---

  get items() {
    return this._items;
  }

  set items(val) {
    this._items = Array.isArray(val) ? val : [];
    this._selectedIndex = 0;
    this.render();
  }

  get selectedIndex() {
    return this._selectedIndex;
  }

  set selectedIndex(index) {
    if (this._items.length === 0) {
      this._selectedIndex = 0;
      return;
    }
    // Wrap-around bounds logic
    this._selectedIndex = (index + this._items.length) % this._items.length;
    this.updateSelectionVisuals();
  }

  get selectedItem() {
    return this._items[this._selectedIndex] || null;
  }

  get visible() {
    return !this.menu.classList.contains("hidden");
  }

  // --- Public APIs ---

  show(items = null) {
    if (items) this.items = items;
    if (this._items.length === 0) {
      this.hide();
      return;
    }
    this.menu.classList.remove("hidden");
    this.dispatchEvent(new CustomEvent("dropdown-show"));
  }

  hide() {
    this.menu.classList.add("hidden");
    this._selectedIndex = 0;
    this.dispatchEvent(new CustomEvent("dropdown-hide"));
  }

  setPosition(x, y) {
    this.menu.style.left = `${x}px`;
    this.menu.style.top = `${y}px`;
  }

  /**
   * Position dropdown right beneath the current text cursor in a textarea
   */
  setPositionAtCaret(textarea) {
    if (!textarea) return;
    const { left, top, height } = this._getCaretCoordinates(textarea);
    const rect = textarea.getBoundingClientRect();
    
    // Position menu relative to viewport
    const posX = rect.left + left - textarea.scrollLeft;
    const posY = rect.top + top - textarea.scrollTop + height;
    
    this.setPosition(posX, posY);
  }

  moveSelection(direction) {
    if (!this.visible || this._items.length === 0) return;
    this.selectedIndex += direction;
  }

  confirmSelection() {
    if (!this.visible || this._items.length === 0) return null;
    const selected = this.selectedItem;
    this.dispatchEvent(new CustomEvent("select", { detail: { item: selected, index: this._selectedIndex } }));
    this.hide();
    return selected;
  }

  // --- Event Listener Binding Helper APIs ---

  onSelect(callback) {
    this.addEventListener("select", (e) => callback(e.detail.item, e.detail.index, e));
  }

  onShow(callback) {
    this.addEventListener("dropdown-show", callback);
  }

  onHide(callback) {
    this.addEventListener("dropdown-hide", callback);
  }

  // --- Internal Rendering Methods ---

  render() {
    const menu = this.menu;
    menu.innerHTML = "";

    this._items.forEach((item, index) => {
      const li = document.createElement("li");
      li.className = `px-3 py-2 cursor-pointer transition ${
        index === this._selectedIndex ? "bg-indigo-600 text-white" : "hover:bg-gray-800 text-gray-300"
      }`;
      li.textContent = typeof item === "object" ? item.label || item.value : item;

      li.addEventListener("mousedown", (e) => {
        e.preventDefault();
        this._selectedIndex = index;
        this.confirmSelection();
      });

      menu.appendChild(li);
    });
  }

  updateSelectionVisuals() {
    const listItems = this.menu.querySelectorAll("li");
    listItems.forEach((li, idx) => {
      if (idx === this._selectedIndex) {
        li.className = "px-3 py-2 cursor-pointer bg-indigo-600 text-white";
        li.scrollIntoView({ block: "nearest" });
      } else {
        li.className = "px-3 py-2 cursor-pointer hover:bg-gray-800 text-gray-300";
      }
    });
  }

  // Helper calculation for textarea cursor position
  _getCaretCoordinates(element) {
    const div = document.createElement("div");
    const style = getComputedStyle(element);
    
    for (const prop of style) {
      div.style[prop] = style[prop];
    }
    div.style.position = "absolute";
    div.style.visibility = "hidden";
    div.style.whiteSpace = "pre-wrap";
    
    const text = element.value.substring(0, element.selectionStart);
    div.textContent = text;
    
    const span = document.createElement("span");
    span.textContent = element.value.substring(element.selectionStart) || ".";
    div.appendChild(span);
    
    document.body.appendChild(div);
    const coordinates = {
      left: span.offsetLeft,
      top: span.offsetTop,
      height: parseInt(style.lineHeight) || 18
    };
    document.body.removeChild(div);
    return coordinates;
  }
}

customElements.define("floating-dropdown", FloatingDropdown);