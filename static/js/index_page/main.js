// File: static/js/index_page/main.js
import SocketInterface from "../commons/socketInterface.js";
import { CodebaseController } from "./codebaseController.js";
import { PromptController } from "./PromptController.js";
import { AddNodeController } from "./addNodePage/AddNodeController.js";

import '../commons/components/header.js';
import './ui/pageContainer.js'; 
import './promptPage/ui/outputModal.js';
import './ui/projectInitialize.js';
import './promptPage/ui/promptEditor.js';
import './promptPage/ui/snippetDrawer.js';
import './promptPage/ui/videoHolder.js';
import './codebasePage/ui/NodeViewerTreeView.js';
import './codebasePage/ui/NodeCodeEditor.js';
import './addNodePage/ui/AddNodeEditor.js';
import './addNodePage/ui/DiffViewerModal.js';
import '../commons/components/toast.js';

const STORAGE_KEY = "last_project_root_path";

document.addEventListener("DOMContentLoaded", () => { 
  const SocketObject = new SocketInterface();

  const appHeader = document.querySelector('app-header');
  const promptEditorEl = document.querySelector('prompt-editor');
  const outputModalEl = document.getElementById("output-modal");
  const treeViewEl = document.querySelector('node-viewer-tree-view');
  const codeEditorEl = document.querySelector('node-code-editor');

  // --- Add Node Page Elements ---
  const addNodeEditorEl = document.querySelector('add-node-editor');
  const diffViewerModalEl = document.querySelector('diff-viewer-modal');

  // --- Initialize Controllers ---
  let codebaseCtrl = null;
  if (treeViewEl && codeEditorEl) {
    codebaseCtrl = new CodebaseController(SocketObject, treeViewEl, codeEditorEl);
  }

  let promptCtrl = null;
  if (promptEditorEl) {
    promptCtrl = new PromptController(SocketObject, promptEditorEl, outputModalEl);
    window.applySelection = (item) => promptCtrl.applySelection(item);
  }

  let addNodeCtrl = null;
  if (addNodeEditorEl && diffViewerModalEl) {
    addNodeCtrl = new AddNodeController(SocketObject, addNodeEditorEl, diffViewerModalEl);
  }

  // Helper to trigger workspace load
  const initWorkspace = (path) => {
    if (!path) return;
    localStorage.setItem(STORAGE_KEY, path);
    const projInit = document.querySelector('project-init');
    if (projInit && projInit.rootPathInput) projInit.rootPathInput.value = path; 
    SocketObject.initSession(path);
  };

  // --- Socket Event Listeners ---
  SocketObject.onConnect(() => {
    if (appHeader) appHeader.setConnectionStatus(true);
    
    const cachedPath = localStorage.getItem(STORAGE_KEY);
    if (cachedPath) {
      initWorkspace(cachedPath);
    }
  });

  SocketObject.onDisconnect(() => {
    if (appHeader) appHeader.setConnectionStatus(false);
    if (promptCtrl) promptCtrl.setSessionReady(false);

    const msg = document.getElementById("session-message");
    if (msg) {
      msg.className = "text-xs mt-2 text-amber-400";
      msg.innerText = "Socket disconnected. Attempting to reconnect...";
    }
  });

  SocketObject.SessionInit.success(({ root }) => {
    if (promptCtrl) promptCtrl.setSessionReady(true);

    const msg = document.getElementById("session-message");
    if (msg) {
      msg.className = "text-xs mt-2 text-emerald-400";
      msg.innerText = `Workspace loaded successfully: ${root}`;
    }

    if (codebaseCtrl) {
      codebaseCtrl.loadRootTree();
    }
  });

  SocketObject.SessionInit.fail(({ message }) => {
    if (promptCtrl) promptCtrl.setSessionReady(false);

    const msg = document.getElementById("session-message");
    if (msg) {
      msg.className = "text-xs mt-2 text-red-400";
      msg.innerText = message || "Failed to load workspace.";
    }
  });

  // --- DOM Event Listeners ---
  window.addEventListener('project-init', (e) => {
    initWorkspace(e.detail.path);
  });
});