# ⚡ Quick Start Guide

## 🎯 5-Minute Migration

### 1️⃣ Copy Files to VS Code (2 min)
```
Your VS Code Project Folder/
├── code.ts          ← Copy from Bolt
├── ui.html          ← Copy from Bolt
├── manifest.json    ← Copy from Bolt
├── package.json     ← Copy from Bolt ⚠️ USE UPDATED VERSION
└── tsconfig.json    ← Copy from Bolt
```

### 2️⃣ Install & Build (2 min)
```bash
npm install
npm run build
```

### 3️⃣ Load in Figma (1 min)
```
Figma → Plugins → Development → Import plugin from manifest...
→ Select manifest.json from your project folder
```

### 4️⃣ Test Cache System (30 sec)
1. Select a frame
2. Click "Start Analysis"
3. Select different frame
4. Select original frame again
5. See blue cache banner ✅
6. Click "Start Analysis" → Instant results! ⚡

---

## 🔴 ONE REAL ERROR TO FIX

### DeepSeek API 402 Error

**Quick Fix Option 1:** Remove AI code (5 min)
- See `TROUBLESHOOTING.md` → "Option 2: Remove DeepSeek Code"
- Delete 3 code blocks from `code.ts`
- Remove Settings tab from `ui.html`
- Rebuild: `npm run build`

**Quick Fix Option 2:** Add billing (10 min)
- Visit: https://platform.deepseek.com/
- Go to Billing → Add credits
- Test API key in plugin Settings tab

---

## 🟢 IGNORE THESE "ERRORS"

✅ Gravatar CORS errors → Figma's user avatars (not your plugin)
✅ StyleQ warnings → Figma's internal CSS library (not your plugin)
✅ Permissions violations → Expected browser warnings (not real errors)

**None of these affect your plugin!**

---

## 📚 Full Documentation

- **`MIGRATION_SUMMARY.md`** - Complete migration guide
- **`CACHE_TESTING_GUIDE.md`** - Test cache step-by-step
- **`TROUBLESHOOTING.md`** - Fix all issues

---

## 🆘 Emergency Commands

### Build failing?
```bash
rm -rf dist/ node_modules/
npm install
npm run build
```

### Plugin not reloading?
```
Figma → Plugins → Development → Your Plugin → ⟳ Reload
```

### Need to see console logs?
```
Right-click in Figma → Inspect → Console tab
```

---

## ✅ Success Indicators

- ✅ Build completes without errors
- ✅ `dist/code.js` and `dist/ui.html` exist
- ✅ Plugin loads in Figma
- ✅ Analysis runs successfully
- ✅ Cache banner appears on second analysis
- ✅ Results load instantly (< 500ms)

---

**That's it! You're ready to go!** 🚀

For detailed troubleshooting, see `TROUBLESHOOTING.md`.
