export default class PromptApi {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async _request(path = '', options = {}) {
    const url = path ? `${this.baseUrl}/node/${path}` : `${this.baseUrl}/node`;
    const res = await fetch(url, options);
    
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} ${res.statusText}`);
    }
    
    if (res.status === 204) return {};
    return await res.json();
  }

  async getNode(path = '') {
    return this._request(path);
  }

  async updateNodeScript(path, script) {
    return this._request(path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ script })
    });
  }

  async createNode(parentPath, name, script) {
    return this._request(parentPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, script })
    });
  }

  async deleteNode(path) {
    return this._request(path, { method: 'DELETE' });
  }

  /**
   * Reads the node data and removes it from its current parent
   */
  async moveOut(path) {
    const nodeData = await this.getNode(path);
    await this.deleteNode(path);
    return nodeData;
  }

  /**
   * Recreates the node under a new parent path
   */
  async moveIn(newParentPath, nodeData) {
    // Depending on your backend, you might also need to recursively move nested children
    // If the backend handles deep creation, we pass the script and name.
    return this.createNode(newParentPath, nodeData.name, nodeData.script || '');
  }
}
