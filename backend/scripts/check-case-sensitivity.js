const fs = require("fs");
const path = require("path");

function checkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      checkDir(fullPath);
    } else if (file.endsWith(".ts") || file.endsWith(".js")) {
      const content = fs.readFileSync(fullPath, "utf8");
      const importRegex = /(?:from\s+["']|require\(["'])([\.\/][^"']+)["']/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        const dirOfFile = path.dirname(fullPath);
        let resolved = path.resolve(dirOfFile, importPath);
        if (!fs.existsSync(resolved)) {
          if (fs.existsSync(resolved + ".ts")) resolved += ".ts";
          else if (fs.existsSync(resolved + ".js")) resolved += ".js";
          else if (fs.existsSync(path.join(resolved, "index.ts"))) resolved = path.join(resolved, "index.ts");
          else if (fs.existsSync(path.join(resolved, "index.js"))) resolved = path.join(resolved, "index.js");
        }

        if (fs.existsSync(resolved)) {
          const actualDir = path.dirname(resolved);
          const actualName = path.basename(resolved);
          const entries = fs.readdirSync(actualDir);
          if (!entries.includes(actualName)) {
            console.error(`CASE MISMATCH in ${fullPath} -> import: "${importPath}" actual on disk: "${entries.find(e => e.toLowerCase() === actualName.toLowerCase())}"`);
          }
        } else {
          console.error(`MISSING IMPORT in ${fullPath} -> "${importPath}"`);
        }
      }
    }
  }
}

checkDir(path.resolve(__dirname, "..", "src"));
checkDir(path.resolve(__dirname, "..", "tests"));
console.log("Case sensitivity check complete.");
