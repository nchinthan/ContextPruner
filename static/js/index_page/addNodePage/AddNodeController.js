// File: static/js/index_page/addNodePage/AddNodeController.js

import { AddNodeService } from './AddNodeService.js';
import { DiffCompiler } from './DiffCompiler.js';

export class AddNodeController {
  /**
   * @param {import('../../commons/socketInterface.js').default} socketInterface 
   * @param {import('./ui/AddNodeEditor.js').AddNodeEditor} editorComponent 
   * @param {import('./ui/DiffViewerModal.js').DiffViewerModal} modalComponent 
   */
  constructor(socketInterface, editorComponent, modalComponent) {
    this.service = new AddNodeService(socketInterface);
    this.editor = editorComponent;
    this.modal = modalComponent;

    this.currentFetchedScript = "";

    this.initListeners();
  }

  initListeners() {
    if (!this.editor || !this.modal) return;

    // Handle Fetch Request from UI
    this.editor.addEventListener('fetch-requested', async (e) => {
      const { path } = e.detail;
      if (!path) {
        window.alert("Please enter a file path to fetch.");
        return;
      }
      try {
        const script = await this.service.fetchExistingScript(path);
        this.currentFetchedScript = script;
        if (!this.editor.getCode()) {
          this.editor.setCode(script);
        }
        this.editor.setStatus("Current script fetched successfully.");
      } catch (err) {
        window.alert(`Error fetching node script: ${err.message}`);
        this.editor.setStatus("Fetch failed.", true);
      }
    });

    // Handle Review Request
    this.editor.addEventListener('review-requested', async (e) => {
      const { path, code } = e.detail;
      try {
        // Fetch fresh state to compare accurately
        const existingScript = await this.service.fetchExistingScript(path);
        this.currentFetchedScript = existingScript;

        const diffs = DiffCompiler.computeDiff(existingScript, code);
        this.modal.show(path, existingScript, code, diffs);
      } catch (err) {
        window.alert(`Failed to prepare comparison: ${err.message}`);
      }
    });

    // Handle Approve and Save Request from Modal
    this.modal.addEventListener('approve-save', async (e) => {
      const { path, script } = e.detail;
      try {
        await this.service.saveNodeScript(path, script);
        this.currentFetchedScript = script;
        this.editor.setStatus("Saved successfully!");
        window.alert(`Node at "${path}" saved successfully.`);
      } catch (err) {
        window.alert(`Failed to save node script: ${err.message}`);
        this.editor.setStatus("Save failed.", true);
      }
    });
  }
}