# ⚡ Command Reference

## 🚀 Essential Commands

### Build & Development
```bash
# One-time build
npm run build

# Watch mode (auto-rebuild on save)
npm run watch

# Clean build
rm -rf dist/ node_modules/
npm install
npm run build
```

### Figma Plugin Management
```
# Load plugin
Figma → Plugins → Development → Import plugin from manifest...

# Reload plugin (after rebuild)
Figma → Plugins → Development → Your Plugin → ⟳ Reload

# Unload plugin
Figma → Plugins → Development → Your Plugin → Remove
```

---

## 🔍 Debugging Commands

### Check Build Output
```bash
# List built files
ls -lh dist/

# Should show:
# code.js (TypeScript compiled to JavaScript)
# ui.html (Copied from root)
```

### Verify Cache Storage (Figma DevTools Console)
```javascript
// Get selected frame's cache
const frame = figma.currentPage.selection[0];
const cacheData = frame.getPluginData('a11y-analysis');
console.log('Has cache:', !!cacheData);
if (cacheData) {
  const parsed = JSON.parse(cacheData);
  console.log('Cached at:', new Date(parsed.timestamp));
  console.log('Issues:', parsed.results.length);
}
```

### List All Cached Frames (Figma DevTools Console)
```javascript
// Find all frames with cache
const allFrames = figma.currentPage.findAll(n => n.type === 'FRAME');
allFrames.forEach(frame => {
  const cache = frame.getPluginData('a11y-analysis');
  if (cache) {
    const data = JSON.parse(cache);
    console.log(`"${frame.name}": ${data.results.length} issues, ${Math.round((Date.now() - data.timestamp) / 60000)}m ago`);
  }
});
```

### Clear All Caches Manually (Figma DevTools Console)
```javascript
// Nuclear option - clear all plugin data
const allFrames = figma.currentPage.findAll(n => n.type === 'FRAME');
allFrames.forEach(frame => {
  frame.setPluginData('a11y-analysis', '');
});
console.log('All caches cleared');
```

---

## 🐛 Troubleshooting Commands

### Fix: Build Fails
```bash
# Remove everything and start fresh
rm -rf dist/ node_modules/
npm cache clean --force
npm install
npm run build
```

### Fix: Plugin Won't Load
```bash
# Check manifest.json exists
cat manifest.json

# Check dist folder exists
ls dist/

# Rebuild
npm run build
```

### Fix: Changes Not Appearing
```
# In Figma:
1. Plugins → Development → Your Plugin → Remove
2. Rebuild: npm run build
3. Plugins → Development → Import plugin from manifest...
```

---

## 📊 Diagnostic Commands

### Check Node.js Version
```bash
node -v
# Should be v14 or higher
```

### Check npm Version
```bash
npm -v
# Should be v6 or higher
```

### Check TypeScript Compiler
```bash
npx tsc --version
# Should match version in package.json
```

### Verify File Structure
```bash
# List all important files
ls -1 code.ts ui.html manifest.json package.json tsconfig.json

# Check dist after build
ls -lh dist/
```

---

## 🎯 Testing Commands

### Test Cache Age Calculation (Browser Console in Plugin UI)
```javascript
// Test getCacheAge function
const testTimestamp = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago
console.log('Age:', getCacheAge(testTimestamp)); // Should show "2h ago"
```

### Test Content Hash (Figma DevTools Console)
```javascript
// Get content hash for selected frame
const frame = figma.currentPage.selection[0];
console.log('Frame ID:', frame.id);
console.log('Children:', frame.children.length);
// Hash is internal, but you can see if frame changes affect it
```

---

## 🔧 Package.json Scripts

```json
{
  "scripts": {
    "build": "tsc && npm run copy-ui",
    "copy-ui": "node -e \"require('fs').copyFileSync('ui.html', 'dist/ui.html')\"",
    "watch": "tsc --watch"
  }
}
```

### What Each Script Does

**`npm run build`**
- Compiles TypeScript (`tsc`)
- Copies UI file to dist (`copy-ui`)
- Creates `dist/code.js` and `dist/ui.html`

**`npm run copy-ui`**
- Uses Node.js to copy `ui.html` to `dist/`
- Cross-platform (works on Windows, macOS, Linux)

**`npm run watch`**
- Watches for TypeScript changes
- Auto-recompiles on save
- Doesn't auto-copy UI (run `copy-ui` manually if needed)

---

## 🚨 Emergency Commands

### Plugin Completely Broken?
```bash
# Nuclear option - reset everything
rm -rf node_modules/ dist/ package-lock.json
npm install
npm run build

# In Figma:
# Remove and re-import plugin
```

### Console Flooded with Errors?
```javascript
// Filter console in browser DevTools
// Type in filter box:
-gravatar -styleq -Permissions

// Or suppress warnings (temporary):
const originalWarn = console.warn;
console.warn = (...args) => {
  const msg = args.join(' ');
  if (msg.includes('Permissions-Policy')) return;
  originalWarn.apply(console, args);
};
```

### Cache Corrupted?
```javascript
// In Figma DevTools Console
// Clear all plugin data from all frames
figma.currentPage.findAll(n => n.type === 'FRAME').forEach(f => {
  f.setPluginData('a11y-analysis', '');
});
figma.notify('All caches cleared');
```

---

## 📦 Git Commands (Optional)

### Initialize Repository
```bash
git init
git add .
git commit -m "Initial commit - Figma accessibility plugin"
```

### Create .gitignore
```bash
cat > .gitignore << 'EOF'
node_modules/
dist/
.DS_Store
*.log
EOF

git add .gitignore
git commit -m "Add gitignore"
```

---

## 🎨 VS Code Shortcuts (Helpful)

### While Editing
```
Ctrl/Cmd + S         → Save file
Ctrl/Cmd + Shift + B → Run build task
Ctrl/Cmd + `         → Open integrated terminal
Ctrl/Cmd + P         → Quick file open
```

### Terminal in VS Code
```
Ctrl/Cmd + `         → Toggle terminal
Ctrl/Cmd + Shift + ` → New terminal
```

---

## 📝 Quick Copy-Paste Commands

### Complete Setup (from scratch)
```bash
# Navigate to project folder
cd /path/to/figma-plugin

# Install and build
npm install
npm run build

# Open in Figma and import manifest.json
```

### Daily Development Workflow
```bash
# Start watch mode
npm run watch

# In another terminal, after UI changes:
npm run copy-ui
```

### Pre-Commit Check
```bash
# Ensure everything builds
npm run build

# Check output
ls -lh dist/
```

---

## 🔗 Useful URLs

### Development
- **Figma Plugin Docs:** https://www.figma.com/plugin-docs/
- **TypeScript Handbook:** https://www.typescriptlang.org/docs/
- **Node.js Docs:** https://nodejs.org/docs/

### WCAG Resources
- **WCAG 2.2 Quick Ref:** https://www.w3.org/WAI/WCAG22/quickref/
- **Contrast Checker:** https://webaim.org/resources/contrastchecker/
- **Color Contrast:** https://contrast-ratio.com/

### Your Plugin
- **DeepSeek Platform:** https://platform.deepseek.com/ (if using AI)

---

## 💡 Pro Tips

### Speed Up Development
```bash
# Keep watch mode running in one terminal
npm run watch

# Use another terminal for other commands
npm run copy-ui
git status
```

### Better Logging
```typescript
// Add to code.ts for debug mode
const DEBUG = process.env.NODE_ENV !== 'production';

function log(...args: any[]) {
  if (DEBUG) console.log('[Plugin]', ...args);
}
```

### Quick Cache Status Check
```javascript
// Add to browser console bookmarks
(() => {
  const frame = figma.currentPage.selection[0];
  if (!frame) return alert('No frame selected');
  const cache = frame.getPluginData('a11y-analysis');
  alert(cache ? 'Has cache ✓' : 'No cache ✗');
})();
```

---

## ✅ Daily Checklist

### Before Starting Work
- [ ] `npm run watch` running
- [ ] Figma open with plugin loaded
- [ ] DevTools console open (Right-click → Inspect)

### After Making Changes
- [ ] Save files (Ctrl/Cmd + S)
- [ ] Wait for watch to rebuild (if watch mode)
- [ ] Reload plugin in Figma (⟳ Reload)
- [ ] Test changes

### Before Committing
- [ ] `npm run build` succeeds
- [ ] Plugin loads without errors
- [ ] Cache system works
- [ ] No console errors
- [ ] All tests pass

---

**Keep this file handy for quick reference!** 🚀
