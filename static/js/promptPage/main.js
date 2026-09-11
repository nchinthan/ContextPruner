// File: promptPage/main.js
import PromptApi from './promptApi.js';
import '../commons/components/header.js';
import './ui/PromptCreateModal.js';
import './ui/promptEditor.js';
import './ui/promptNode.js';
import './ui/treeView.js';

const API_BASE = '/prompts';
let activePath = '';

// Instantiate API service
const promptApi = new PromptApi(API_BASE);
window.promptApi = promptApi; // Kept for debugging only - UI components no longer touch this

// --- Element handles (plain markup, not custom elements, so getElementById is fine) ---
let treeViewEl;
let createModalEl;
let scriptEditorEl;

function getEls() {
  treeViewEl = document.querySelector('tree-view');
  createModalEl = document.getElementById('create-modal');
  scriptEditorEl = document.querySelector('prompt-script-editor');
}

// --- Data layer: builds a fully-resolved tree so UI never has to call the API itself ---

async function fetchNodeTree(path) {
  const data = await promptApi.getNode(path);
  const node = { ...data, path };

  node.childNodes = [];
  if (Array.isArray(data.children) && data.children.length > 0) {
    for (const childName of data.children) {
      const childPath = path ? `${path}/${childName}` : childName;
      try {
        const childTree = await fetchNodeTree(childPath);
        node.childNodes.push(childTree);
      } catch (err) {
        console.warn(`Could not load child node at ${childPath}`, err);
      }
    }
  }

  return node;
}

async function fetchTree() {
  try {
    const rootTree = await fetchNodeTree('');
    updateStatus('Connected', 'emerald');
    treeViewEl.render(rootTree, activePath);
  } catch (err) {
    updateStatus('Disconnected', 'red');
    console.error('Failed to load tree', err);
  }
}

window.fetchTree = fetchTree; // Kept for debugging

// --- Business actions ---

async function selectNode(path) {
  try {
    const data = await promptApi.getNode(path);
    activePath = path;

    document.getElementById('editor-empty').classList.add('hidden');
    document.getElementById('editor-container').classList.remove('hidden');

    document.getElementById('current-node-name').innerText = data.name || 'Root';
    document.getElementById('current-node-path').innerText = path ? `/${path}` : '/ (Root)';
    document.getElementById('current-node-badge').innerText = data.leaf ? 'Leaf' : `Branch (${data.children?.length || 0})`;
    scriptEditorEl.value = data.script || '';

    // Re-render the tree so the newly active node gets highlighted
    fetchTree();
  } catch (err) {
    alert('Error loading target node: ' + err.message);
  }
}

async function saveCurrentNodeScript() {
  if (!activePath) {
    alert('Root configuration script updates not allowed via path operation.');
    return;
  }
  const newScript = scriptEditorEl.value;

  try {
    await promptApi.updateNodeScript(activePath, newScript);
    alert('Prompt script updated successfully!');
    fetchTree();
  } catch (err) {
    alert('Update failed: ' + err.message);
  }
}

async function deleteCurrentNode() {
  if (!activePath) {
    alert('Cannot delete root node.');
    return;
  }

  if (!confirm(`Are you sure you want to delete /${activePath}?`)) return;

  try {
    await promptApi.deleteNode(activePath);

    document.getElementById('editor-container').classList.add('hidden');
    document.getElementById('editor-empty').classList.remove('hidden');
    activePath = '';
    fetchTree();
  } catch (err) {
    alert(err.message);
  }
}

async function submitNewNode(parentPath, name, script) {
  if (!name) {
    alert('Node Name is required');
    return;
  }

  try {
    await promptApi.createNode(parentPath, name, script);

    createModalEl.close();
    fetchTree();
    if (parentPath) selectNode(parentPath);
  } catch (err) {
    alert(err.message);
  }
}

function openCreateModalFromCurrent() {
  createModalEl.open(activePath);
}

async function moveNode(sourcePath, targetParentPath) {
  // Tree-hierarchy validation lives here, not in the UI component.
  if (!sourcePath) return;
  if (sourcePath === targetParentPath) return;
  if (targetParentPath.startsWith(sourcePath + '/')) {
    alert('Cannot drop a folder into its own child.');
    return;
  }

  try {
    updateStatus('Moving node...', 'yellow');
    const movedNodeData = await promptApi.moveOut(sourcePath);
    await promptApi.moveIn(targetParentPath, movedNodeData);
    fetchTree();
  } catch (err) {
    alert('Drag and drop failed: ' + err.message);
    updateStatus('Move Failed', 'red');
  }
}

function exportTreeJSON() {
  fetchNodeTree('')
    .then((rootTree) => {
      const blob = new Blob([JSON.stringify(rootTree, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'prompt-tree.json';
      a.click();
      URL.revokeObjectURL(url);
    })
    .catch((err) => alert('Export failed: ' + err.message));
}

function updateStatus(text, color) {
  const el = document.getElementById('api-status');
  el.innerText = text;
  el.className = `text-xs px-2 py-0.5 rounded-full bg-${color}-500/10 text-${color}-400 border border-${color}-500/20`;
}

window.updateStatus = updateStatus; // Kept for debugging

// --- Wiring: translate UI events into business actions ---

function wireEvents() {
  // Delegated on document so it works regardless of where in the tree
  // the event originated (dynamically-created prompt-node elements included).
  document.addEventListener('node-select', (e) => {
    selectNode(e.detail.path);
  });

  document.addEventListener('node-add-child', (e) => {
    createModalEl.open(e.detail.path);
  });

  document.addEventListener('node-move', (e) => {
    moveNode(e.detail.sourcePath, e.detail.targetPath);
  });

  document.addEventListener('tree-export', () => {
    exportTreeJSON();
  });

  document.addEventListener('node-create', (e) => {
    const { parentPath, name, script } = e.detail;
    submitNewNode(parentPath, name, script);
  });
}

// --- Init ---

function init() {
  document.getElementById("btn-refresh-tree")?.addEventListener("click", () => {
    if (typeof fetchTree === "function") {
      fetchTree();
    }
  });

  // Bind New Root Prompt button
  document.getElementById("btn-new-root")?.addEventListener("click", () => {
    const modal = document.getElementById("create-modal");
    if (modal && typeof modal.open === "function") {
      modal.open("");
    }
  });

  // Bind Add Sub-node button
  document.getElementById("add-child-btn")?.addEventListener("click", () => {
    if (typeof openCreateModalFromCurrent === "function") {
      openCreateModalFromCurrent();
    }
  });

  // Bind Delete Node button
  document.getElementById("btn-delete-node")?.addEventListener("click", () => {
    if (typeof deleteCurrentNode === "function") {
      deleteCurrentNode();
    }
  });

  // Bind Save Changes button
  document.getElementById("btn-save-script")?.addEventListener("click", () => {
    if (typeof saveCurrentNodeScript === "function") {
      saveCurrentNodeScript();
    }
  });

  getEls();
  wireEvents();

  const btnSave = document.getElementById('btn-save-script');
  if (btnSave) btnSave.addEventListener('click', saveCurrentNodeScript);

  const btnDelete = document.getElementById('btn-delete-node');
  if (btnDelete) btnDelete.addEventListener('click', deleteCurrentNode);

  const btnAddChild = document.getElementById('btn-add-child-current');
  if (btnAddChild) btnAddChild.addEventListener('click', openCreateModalFromCurrent);

  fetchTree();
}

document.addEventListener('DOMContentLoaded', init);