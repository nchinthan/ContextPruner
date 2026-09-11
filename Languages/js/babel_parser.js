// babel_parser.js
const parser = require("@babel/parser");
const fs = require("fs");

// Read entire code payload from Python's stdin stream
let code = "";
process.stdin.on("data", (chunk) => {
    code += chunk;
});

process.stdin.on("end", () => {
    try {
        // Parse code supporting modern extensions, JSX, and TypeScript
        const ast = parser.parse(code, {
            sourceType: "module",
            plugins: ["typescript", "jsx", "classProperties", "decorators-legacy"]
        });
        
        // Return JSON representation to Python stdout
        console.log(JSON.stringify(ast.program.body));
    } catch (err) {
        // Return error message if syntax is broken
        console.error(err.message);
        process.exit(1);
    }
});