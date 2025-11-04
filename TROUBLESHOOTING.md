# 🔧 Comprehensive Troubleshooting Guide

## 📋 Issues Analyzed from Figma Log

### ✅ RESOLVED: VS Code Build Error

**Error:**
```
'cp' is not recognized as an internal or external command
```

**Fix Applied:**
Updated `package.json` to use Node.js cross-platform file copy instead of Unix `cp` command.

**Before:**
```json
"copy-ui": "cp ui.html dist/ui.html"
```

**After:**
```json
"copy-ui": "node -e \"require('fs').copyFileSync('ui.html', 'dist/ui.html')\""
```

**Test:** Run `npm run build` - should work on Windows, macOS, and Linux now.

---

## 🟢 NO ACTION NEEDED: Figma Platform Warnings

The following errors in your log are **NOT from your plugin** and can be safely ignored:

### 1. Gravatar CORS Errors
```
Access to image at 'https://www.gravatar.com/avatar/...' blocked by CORS policy
```
- **Source:** Figma trying to load user avatars
- **Impact:** None on your plugin
- **Action:** Ignore

### 2. StyleQ Warnings
```
styleq: kzqmXN typeof undefined is not "string" or "null"
```
- **Source:** Figma's internal CSS library
- **Impact:** None on your plugin
- **Action:** Ignore

### 3. Permissions Policy Violations
```
[Violation] camera/microphone/clipboard-write/display-capture is not allowed
```
- **Source:** Browser security warnings
- **Impact:** None (these APIs are blocked by design)
- **Action:** Ignore (expected behavior)

---

## 🔴 ACTION REQUIRED: DeepSeek API Error

### Error Details
```
api.deepseek.com/v1/chat/completions: 402 (Payment Required)
DeepSeek API error: 402
```

### What This Means
- HTTP 402 = Payment Required
- Your DeepSeek API account needs funding or has expired
- AI-enhanced suggestions won't work until fixed

### Solutions

#### Option 1: Fix DeepSeek Billing (Keep AI Features)

1. **Visit DeepSeek Dashboard:**
   - Go to: https://platform.deepseek.com/
   - Log in with your account

2. **Check Billing:**
   - Navigate to **Billing** or **Usage** section
   - Check account balance
   - Check API quota remaining

3. **Add Funds:**
   - Add payment method if not set
   - Add credits to account
   - Typical cost: ~$0.001 per API call

4. **Verify API Key:**
   - Go to **API Keys** section
   - Copy your valid API key
   - Test in plugin

5. **Test in Plugin:**
   - Open plugin in Figma
   - Go to Settings tab
   - Paste API key
   - Enable "Use AI"
   - Run analysis
   - Check for "✨ AI suggestions applied!" notification

#### Option 2: Remove DeepSeek Code (Recommended if not using AI)

If you don't need AI features, remove this code:

**File: `code.ts`**

**Remove lines 288-291:**
```typescript
if (msg.useAI && msg.apiKey) {
  console.log('AI enhancement enabled');
  await enhanceWithAI(currentIssues, msg.apiKey);
}
```

**Remove lines 361-375:**
```typescript
if (msg.type === 'save-settings') {
  await figma.clientStorage.setAsync('deepseek_api_key', msg.apiKey);
  await figma.clientStorage.setAsync('use_ai', msg.useAI);
  figma.ui.postMessage({ type: 'settings-saved' });
}

if (msg.type === 'load-settings') {
  const apiKey = await figma.clientStorage.getAsync('deepseek_api_key');
  const useAI = await figma.clientStorage.getAsync('use_ai');
  figma.ui.postMessage({
    type: 'settings-loaded',
    apiKey: apiKey || '',
    useAI: useAI || false
  });
}
```

**Remove lines 661-713 (entire function):**
```typescript
async function enhanceWithAI(issues: AccessibilityIssue[], apiKey: string) {
  // ... entire function ...
}
```

**File: `ui.html`**

Remove the Settings tab HTML section (search for "Settings" in the tabs section).

**After Removal:**
```bash
npm run build
```

Plugin will work perfectly without AI features.

---

## 🐛 Cache System Troubleshooting

### Symptom: Cache Not Working

#### Debug Step 1: Check Console Logs

1. Open Figma
2. Right-click → **Inspect Element**
3. Go to **Console** tab
4. Run plugin and analyze a frame
5. Look for these logs:

**Expected on first analysis:**
```
Analysis started
Analyzing frame: [Name] with [N] elements
Analysis complete. Issues found: [N]
✓ Cached analysis for: [Name] ID: [ID]
```

**Expected on second analysis (cache hit):**
```
✓ Using valid cache for: [Name]
⚡ Using cached results
```

**If cache invalidated:**
```
✗ Cache invalid for: [Name]
Running fresh analysis
```

#### Debug Step 2: Verify Cache Storage

Paste this in Figma DevTools Console:
```javascript
const frame = figma.currentPage.selection[0];
const cacheData = frame.getPluginData('a11y-analysis');
console.log('Cache exists:', !!cacheData);
if (cacheData) {
  const parsed = JSON.parse(cacheData);
  console.log('Cache age:', new Date(parsed.timestamp));
  console.log('Results count:', parsed.results.length);
}
```

#### Debug Step 3: Check UI Message Handler

Open Browser DevTools on plugin UI:
1. Right-click inside plugin UI → **Inspect**
2. Console tab
3. Add temporary log in `ui.html` around line 500:
```javascript
window.addEventListener('message', (event) => {
  console.log('UI received:', event.data.pluginMessage);
  // ... rest of code
});
```

Look for:
- `cache-available` messages
- `cache-info` messages
- `fromCache: true` in analysis results

#### Common Cache Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| No cache logs | Plugin not reloaded | Reload plugin in Figma |
| Cache never hits | Frame ID changing | Check if you're duplicating frames |
| Cache clears immediately | Content hash too sensitive | Check if frame auto-updates |
| Banner doesn't show | UI message not received | Check browser console for errors |
| Cache persists after changes | Hash not detecting changes | Content hash may need tuning |

### Symptom: Cache UI Not Appearing

#### Check 1: CSS Loaded Correctly
Verify `.cache-status` styles exist in `ui.html`:
```css
.cache-status {
  display: none;
  /* ... */
}
.cache-status.show {
  display: flex;
}
```

#### Check 2: Message Handler Working
In `ui.html`, find:
```javascript
if (msg.type === 'cache-available') {
  cacheStatus.textContent = `Analysis from ${msg.age}`;
  cacheStatus.classList.add('show');
}
```

Add temporary log:
```javascript
if (msg.type === 'cache-available') {
  console.log('Cache UI should show:', msg.age);
  cacheStatus.textContent = `Analysis from ${msg.age}`;
  cacheStatus.classList.add('show');
}
```

#### Check 3: Element Exists
In browser console (on plugin UI):
```javascript
const cacheStatus = document.getElementById('cacheStatus');
console.log('Cache element exists:', !!cacheStatus);
console.log('Has show class:', cacheStatus.classList.contains('show'));
```

---

## 🚀 Quick Reference: Build & Deploy

### Development Workflow

```bash
# 1. Make code changes
# Edit code.ts or ui.html

# 2. Build
npm run build

# 3. Reload plugin in Figma
# Figma → Plugins → Development → Your Plugin → ⟳ Reload

# 4. Test
# Select frame → Run plugin
```

### Watch Mode (Auto-rebuild)
```bash
npm run watch
```
Leave this running while developing. Still need to manually reload in Figma.

### Full Clean Build
```bash
rm -rf dist/
npm run build
```

---

## 🎯 Expected Behavior Checklist

### After Fixing All Issues

✅ Build completes without errors
✅ Plugin loads in Figma without errors
✅ First analysis runs successfully
✅ Cache console logs appear
✅ Second analysis loads from cache (< 500ms)
✅ Cache banner appears in UI (blue, shows age)
✅ Re-analyze button forces fresh scan
✅ Clear cache button works
✅ Cache persists after plugin restart
✅ No DeepSeek errors (if removed or API fixed)
✅ No blocking errors in console (Gravatar/StyleQ warnings are OK)

---

## 📞 Still Having Issues?

### Information to Gather

1. **Environment:**
   - OS: Windows / macOS / Linux
   - Node.js version: `node -v`
   - npm version: `npm -v`

2. **Build Output:**
   ```bash
   npm run build
   # Copy full output
   ```

3. **Console Logs:**
   - Figma DevTools Console (Right-click → Inspect)
   - Browser Console on plugin UI (Right-click inside plugin → Inspect)

4. **Test Results:**
   - Which cache tests pass/fail from CACHE_TESTING_GUIDE.md
   - Screenshots of cache UI (working or not working)

5. **File Verification:**
   ```bash
   ls -la dist/
   # Should show:
   # - code.js
   # - ui.html
   ```

### Debug Mode

Add this to top of `code.ts` for verbose logging:
```typescript
const DEBUG = true;

function log(...args: any[]) {
  if (DEBUG) console.log('[A11Y Debug]', ...args);
}

// Replace console.log with log() for debug-only logs
```

---

## 📚 Additional Resources

- **Figma Plugin API:** https://www.figma.com/plugin-docs/
- **TypeScript Handbook:** https://www.typescriptlang.org/docs/
- **WCAG 2.2 Guidelines:** https://www.w3.org/WAI/WCAG22/quickref/

---

## ✅ Quick Wins

### Most Common Issues (90% of problems)

1. **Not reloading plugin after rebuild**
   - Fix: Figma → Plugins → Development → ⟳ Reload

2. **Build script fails on Windows**
   - Fix: Already fixed in package.json (cross-platform copy command)

3. **DeepSeek 402 error**
   - Fix: Remove AI code (lines specified above) or add billing

4. **Cache seems broken but just needs testing**
   - Fix: Follow CACHE_TESTING_GUIDE.md step-by-step

5. **Console filled with warnings**
   - Fix: Ignore Gravatar/StyleQ/Permissions warnings (not your plugin)
