// File: static/js/index_page/ui/pageContainer.js

class PageElement extends HTMLElement {
  connectedCallback() {
    // Hide pages by default; page-container will manage visibility
    this.style.display = "none";
    this.classList.add("w-full");
  }

  get name() {
    return this.getAttribute("name") || "Untitled";
  }
}

class PageContainer extends HTMLElement {
  connectedCallback() {
    // Wait for light DOM children to render
    setTimeout(() => this.initTabs(), 0);
  }

  initTabs() {
    // Collect both <page> and <page-element> tags safely
    this.pages = Array.from(this.querySelectorAll("page, page-element"));
    if (this.pages.length === 0) return;

    // Apply basic hiding logic manually to native/unregistered <page> tags
    this.pages.forEach((page) => {
      page.style.display = "none";
      page.classList.add("w-full");
    });

    // Create Navigation Bar (VS Code tab style)
    const navBar = document.createElement("div");
    navBar.className = "flex items-center bg-gray-900 border-b border-gray-800 -mx-6 -mt-6 mb-6 px-4 overflow-x-auto text-xs font-mono select-none";

    this.pages.forEach((page, index) => {
      const pageName = page.getAttribute("name") || `Page ${index + 1}`;
      
      const tab = document.createElement("button");
      tab.dataset.targetName = pageName;
      tab.type = "button";
      tab.className = `px-4 py-2.5 border-t-2 font-medium flex items-center gap-2 transition-all outline-none whitespace-nowrap ${
        index === 0
          ? "border-indigo-500 bg-gray-950 text-indigo-300"
          : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
      }`;

      // Tab text and icon
      tab.innerHTML = `
        <svg class="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        <span>${pageName}</span>
      `;

      tab.addEventListener("click", () => this.setActivePage(pageName));
      navBar.appendChild(tab);
    });

    // Insert tab bar at the top of page-container
    this.insertBefore(navBar, this.firstChild);
    this.tabsContainer = navBar;

    // Set first page active by default
    const firstPageName = this.pages[0].getAttribute("name");
    this.setActivePage(firstPageName);
  }

  setActivePage(targetName) {
    // Toggle content visibility
    this.pages.forEach((page) => {
      if (page.getAttribute("name") === targetName) {
        page.style.display = "block";
      } else {
        page.style.display = "none";
      }
    });

    // Update Visual Tab State
    if (this.tabsContainer) {
      const tabs = Array.from(this.tabsContainer.children);
      tabs.forEach((tab) => {
        if (tab.dataset.targetName === targetName) {
          tab.className = "px-4 py-2.5 border-t-2 border-indigo-500 bg-gray-950 text-indigo-300 font-medium flex items-center gap-2 transition-all outline-none whitespace-nowrap";
        } else {
          tab.className = "px-4 py-2.5 border-t-2 border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 font-medium flex items-center gap-2 transition-all outline-none whitespace-nowrap";
        }
      });
    }
  }
}

// Custom element names MUST contain a hyphen (-)
customElements.define("page-element", PageElement);
customElements.define("page-container", PageContainer);