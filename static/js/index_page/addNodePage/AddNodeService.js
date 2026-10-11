// File: static/js/index_page/addNodePage/AddNodeService.js

export class AddNodeService {
  constructor(socketInterface) {
    if (!socketInterface) {
      throw new Error("AddNodeService requires a valid SocketInterface instance.");
    }
    this.socketInterface = socketInterface;
  }

  /**
   * Fetches current script content for a node/file path.
   * @param {string} path 
   * @returns {Promise<string>}
   */
  async fetchExistingScript(path) {
    try {
      const response = await this.socketInterface.node.getScript(path);
      return response.script || response.content || "";
    } catch (error) {
      // If node doesn't exist yet, return empty string for new file scenarios
      if (error.message && error.message.toLowerCase().includes("not found")) {
        return "";
      }
      console.error(`[AddNodeService] Error fetching script at "${path}":`, error);
      throw error;
    }
  }

  /**
   * Saves or creates a node script.
   * @param {string} path 
   * @param {string} script 
   * @returns {Promise<object>}
   */
  async saveNodeScript(path, script) {
    try {
      // First attempt to edit existing script
      return await this.socketInterface.node.editScript(path, script);
    } catch (error) {
      // Fallback: If node does not exist, add as child
      try {
        const pathSegments = path.replace(/^\/+|\/+$/g, "").split("/");
        const fileName = pathSegments.pop();
        const parentPath = pathSegments.join("/");

        return await this.socketInterface.node.addChild(parentPath, {
          name: fileName,
          script: script
        });
      } catch (addError) {
        console.error(`[AddNodeService] Failed saving node at "${path}":`, addError);
        throw addError;
      }
    }
  }
}