// File: promptPage/main.js
import PromptApi from './promptApi.js';
import '../commons/components/header.js';
import './ui/PromptCreateModal.js';
import './ui/promptEditor.js';
import './ui/promptNode.js';
import './ui/treeView.js';

const API_BASE = '/prompts';
let activePath = '';

const promptApi = new PromptApi(API_BASE);
window.promptApi = promptApi;

let treeViewEl;
let createModalEl;
let scriptEditorEl;
let editorEmptyContainer;
let editorMainContainer;

function getEls() {
  treeViewEl = document.querySelector('tree-view');
  createModalEl = document.querySelector('prompt-create-modal');
  scriptEditorEl = document.querySelector('prompt-script-editor');
  
  editorEmptyContainer = document.getElementById('editor-empty');
  // Get the parent container surrounding the toolbar & editor component
  editorMainContainer = scriptEditorEl?.closest('div.hidden') || scriptEditorEl?.parentElement;
}

function setNodeHeaderInfo(data, path) {
  const nameEl = document.getElementById('current-node-name');
  const badgeEl = document.getElementById('current-node-badge');
  const pathEl = document.getElementById('current-node-path');

  if (nameEl) nameEl.innerText = data.name || 'Root';
  if (badgeEl) badgeEl.innerText = data.leaf ? 'Leaf' : `Branch (${data.children?.length || 0})`;
  if (pathEl) pathEl.innerText = path ? `/${path}` : '/ (Root)';
}

function showMainEditor() {
  if (editorEmptyContainer) editorEmptyContainer.classList.add('hidden');
  if (editorMainContainer) editorMainContainer.classList.remove('hidden');
}

function hideMainEditor() {
  if (editorMainContainer) editorMainContainer.classList.add('hidden');
  if (editorEmptyContainer) editorEmptyContainer.classList.remove('hidden');
}

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
    if (treeViewEl) treeViewEl.render(rootTree, activePath);
  } catch (err) {
    updateStatus('Disconnected', 'red');
    console.error('Failed to load tree', err);
  }
}

async function selectNode(path) {
  try {
    const data = await promptApi.getNode(path);
    activePath = path;

    showMainEditor();
    setNodeHeaderInfo(data, path);

    if (scriptEditorEl) {
      scriptEditorEl.value = data.script || '';
    }

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
  const newScript = scriptEditorEl ? scriptEditorEl.value : '';

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
    hideMainEditor();
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
    if (createModalEl) createModalEl.close();
    fetchTree();
    if (parentPath) selectNode(parentPath);
  } catch (err) {
    alert(err.message);
  }
}

function openCreateModalFromCurrent() {
  if (createModalEl) createModalEl.open(activePath);
}

async function moveNode(sourcePath, targetParentPath) {
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
  const appHeader = document.querySelector('app-header');
  if (appHeader && typeof appHeader.setConnectionStatus === 'function') {
    appHeader.setConnectionStatus(
      color !== 'red',
      text,
      `${
        color === 'yellow'
          ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/20'
          : color === 'red'
          ? 'bg-red-500/20 text-red-400 border border-red-500/20'
          : color === 'emerald'
          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
          : ''
      }`
    );
  }
}

function wireEvents() {
  document.addEventListener('node-select', (e) => selectNode(e.detail.path));
  document.addEventListener('node-add-child', (e) => createModalEl?.open(e.detail.path));
  document.addEventListener('node-move', (e) => moveNode(e.detail.sourcePath, e.detail.targetPath));
  document.addEventListener('tree-export', () => exportTreeJSON());
  document.addEventListener('node-create', (e) => {
    const { parentPath, name, script } = e.detail;
    submitNewNode(parentPath, name, script);
  });
}

function init() {
  getEls();
  wireEvents();

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

  const btnSave = document.getElementById('btn-save-script');
  if (btnSave) btnSave.addEventListener('click', saveCurrentNodeScript);

  const btnDelete = document.getElementById('btn-delete-node');
  if (btnDelete) btnDelete.addEventListener('click', deleteCurrentNode);

  const btnAddChild = document.getElementById('btn-add-child-current');
  if (btnAddChild) btnAddChild.addEventListener('click', openCreateModalFromCurrent);
  fetchTree();
}

document.addEventListener('DOMContentLoaded', init);