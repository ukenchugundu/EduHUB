const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '..', 'frontend', 'src');

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const target = '(import.meta.env.VITE_API_URL ?? "").replace(/\\/$/, "")';
      const replacement = '(import.meta.env.VITE_API_URL || "https://eduhub-backend-pf6o.onrender.com").replace(/\\/$/, "")';
      if (content.includes(target)) {
        content = content.replaceAll(target, replacement);
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated:', path.relative(srcDir, fullPath));
      }
    }
  }
}

walk(srcDir);
console.log('API_BASE update complete!');
