class NodeInterface {
  constructor(socketInterface) {
    this.socketInterface = socketInterface;
  }

  /**
   * Helper to format path strings: joins node path with the action method
   */
  _buildPath(path, method) {
    const cleanPath = path ? path.replace(/^\/+|\/+$/g, "") : "";
    return cleanPath ? `${cleanPath}/${method}` : method;
  }

  /**
   * Core request/response handler that wraps Socket events into Promises
   */
  _request(path, method, payload = {}) {
    return new Promise((resolve, reject) => {
      const fullPath = this._buildPath(path, method);

      const handler = (res) => {
        if (res.path === fullPath) {
          this.socketInterface.off("response", handler);
          if (res.status === "success") {
            resolve(res);
          } else {
            reject(new Error(res.message || `Failed executing ${method}`));
          }
        }
      };

      this.socketInterface.onResponse(handler);
      this.socketInterface.executePath(fullPath, payload);
    });
  }

  // --- Endpoint Methods ---

  getChildren(path = "") {
    return this._request(path, "children");
  }

  getScript(path = "") {
    return this._request(path, "script");
  }

  editScript(path = "", newScript) {
    return this._request(path, "edit_script", { new_script: newScript });
  }

  addChild(path = "", childNode) {
    return this._request(path, "add_child", { child_node: childNode });
  }

  deleteChild(path = "", childName) {
    return this._request(path, "delete_child", { child_name: childName });
  }
}

export default class SocketInterface {
  constructor(url = `${window.location.protocol}//${window.location.hostname}:5000`) {
    this.socket = io(url);
    this.handlers = {
      sessionInit: { success: [], fail: [] }
    };
    
    // Attach the domain child interface
    this.node = new NodeInterface(this);

    this._setupInternalListeners();
  }

  _setupInternalListeners() {
    this.socket.on("session_initialized", (res) => {
      const isSuccess = res.status === "success";
      const targetHandlers = isSuccess 
        ? this.handlers.sessionInit.success 
        : this.handlers.sessionInit.fail;

      targetHandlers.forEach(fn => fn({ root: res.root, message: res.message, raw: res }));
    });
  }

  onConnect(callback) { this.socket.on("connect", callback); }
  onDisconnect(callback) { this.socket.on("disconnect", callback); }
  on(event, oneventfunc) { this.socket.on(event, oneventfunc); }
  off(event, handler) { this.socket.off(event, handler); }
  emit(event, data) { this.socket.emit(event, data); }

  SessionInit = {
    success: (fn) => this.handlers.sessionInit.success.push(fn),
    fail: (fn) => this.handlers.sessionInit.fail.push(fn)
  };

  initSession(rootPath) {
    this.emit("init_session", { root_path: rootPath });
  }

  executePath(path, extraData = {}) {
    this.emit("execute_path", { path, ...extraData });
  }

  promptSocket(path, kwargs = null) {
    const payload = { path };
    if (kwargs) payload.kwargs = kwargs;
    this.emit("prompt_socket", payload);
  }

  onResponse(callback) {
    this.on("response", callback);
  }
}