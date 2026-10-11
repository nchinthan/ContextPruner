// File: static/js/index_page/promptPage/PromptCompiler.js
export class PromptCompiler {
  /**
   * @param {Object} socketInterface - Socket object for socket & API requests
   * @param {MatchHandler} matchHandler - Instance of MatchHandler for parsing references
   */
  constructor(socketInterface, matchHandler) {
    this.socket = socketInterface;
    this.matchHandler = matchHandler;
  }

  /**
   * Compiles the raw prompt text by fetching and substituting file and prompt references.
   * @param {string} rawPrompt 
   * @returns {Promise<string>}
   */
  async compile(rawPrompt) {
    const { fileMatches, promptMatches, uniqueFilePaths } = this.matchHandler.findAllReferences(rawPrompt);

    if (fileMatches.length === 0 && promptMatches.length === 0) {
      return rawPrompt;
    }

    const scriptMap = {};
    const promptMap = {};

    // Fetch dynamic prompt templates via socket events
    await Promise.all(
      promptMatches.map(item => {
        const { fullMatch, promptPath, kwargs } = item;

        return new Promise(resolve => {
          const apiPath = `${promptPath}/build_prompt`;
          const handler = (res) => {
            if (res.path !== apiPath) return;
            this.socket.off("response", handler);
            promptMap[fullMatch] = res.status === "success" ? res.data : `[Error building prompt: ${promptPath}]`;
            resolve();
          };

          this.socket.onResponse(handler);
          this.socket.promptSocket(apiPath, kwargs);
        });
      })
    );

    // Fetch script contents via node API
    await Promise.all(
      uniqueFilePaths.map(async (path) => {
        try {
          const res = await this.socket.node.getScript(path);
          scriptMap[path] = res.data;
        } catch (err) {
          scriptMap[path] = `[Error reading: ${path}]`;
        }
      })
    );

    // Perform replacements preserving original formatting logic
    let compiledPrompt = rawPrompt;
    fileMatches.forEach(item => {
      const filePath = item.path;
      const scriptContent = scriptMap[filePath] || "";
      const formattedContent = `\n\`\`\`\n// File: ${filePath}\n${scriptContent}\n\`\`\`\n`;
      compiledPrompt = compiledPrompt.replace(item.fullMatch, formattedContent);
    });

    promptMatches.forEach(item => {
      const formattedPrompt = promptMap[item.fullMatch] || `[Error building prompt: ${item.promptPath}]`;
      compiledPrompt = compiledPrompt.replace(item.fullMatch, formattedPrompt);
    });

    return compiledPrompt;
  }
}