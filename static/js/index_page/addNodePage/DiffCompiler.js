// File: static/js/index_page/addNodePage/DiffCompiler.js

export class DiffCompiler {
  /**
   * Computes line differences between oldScript and newScript.
   * Returns array of line change objects.
   * @param {string} oldScript 
   * @param {string} newScript 
   * @returns {Array<{type: 'add'|'delete'|'unchanged', lineNumberOld?: number, lineNumberNew?: number, content: string}>}
   */
  static computeDiff(oldScript = "", newScript = "") {
    const oldLines = oldScript.split("\n");
    const newLines = newScript.split("\n");
    const diff = [];

    let i = 0;
    let j = 0;

    while (i < oldLines.length || j < newLines.length) {
      if (i < oldLines.length && j < newLines.length) {
        if (oldLines[i] === newLines[j]) {
          diff.push({
            type: 'unchanged',
            lineNumberOld: i + 1,
            lineNumberNew: j + 1,
            content: oldLines[i]
          });
          i++;
          j++;
        } else {
          // Check if line exists further ahead in newLines (addition) or oldLines (deletion)
          const futureNewIdx = newLines.slice(j).indexOf(oldLines[i]);
          const futureOldIdx = oldLines.slice(i).indexOf(newLines[j]);

          if (futureNewIdx !== -1 && (futureOldIdx === -1 || futureNewIdx <= futureOldIdx)) {
            diff.push({
              type: 'add',
              lineNumberNew: j + 1,
              content: newLines[j]
            });
            j++;
          } else {
            diff.push({
              type: 'delete',
              lineNumberOld: i + 1,
              content: oldLines[i]
            });
            i++;
          }
        }
      } else if (i < oldLines.length) {
        diff.push({
          type: 'delete',
          lineNumberOld: i + 1,
          content: oldLines[i]
        });
        i++;
      } else {
        diff.push({
          type: 'add',
          lineNumberNew: j + 1,
          content: newLines[j]
        });
        j++;
      }
    }

    return diff;
  }
}