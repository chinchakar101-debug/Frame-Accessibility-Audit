# Cache System Testing Guide

## Prerequisites
- Plugin loaded in Figma
- Figma DevTools Console open (Right-click → Inspect)

## Test Sequence

### Test 1: First Analysis (Should Create Cache)
1. Select a frame in Figma
2. Click "Start Analysis" in plugin
3. **Watch Console for:**
   ```
   Analysis started
   Analyzing frame: [Frame Name] with [N] elements
   Analysis complete. Issues found: [N]
   ✓ Cached analysis for: [Frame Name] ID: [ID]
   ```
4. **Expected UI:** Results display normally (no cache badge yet)

### Test 2: Cache Hit (Should Load from Cache)
1. Select a DIFFERENT frame
2. Select the ORIGINAL frame again
3. **Expected Console Output:**
   ```
   ✓ Using valid cache for: [Frame Name]
   ⚡ Using cached results
   ```
4. **Expected UI:**
   - Blue cache status banner appears: "💾 Analysis from just now"
   - Results header shows: "💾 just now"
   - Results load instantly (< 500ms)

### Test 3: Cache Invalidation (Should Detect Changes)
1. Analyze a frame (cache created)
2. **Modify the frame** (change text or color)
3. Click "Start Analysis" again
4. **Expected Console Output:**
   ```
   ✗ Cache invalid for: [Frame Name]
   Running fresh analysis
   ```
5. **Expected:** Fresh analysis runs, new cache created

### Test 4: Manual Cache Clear
1. With cached frame selected
2. Click 🗑️ button (Clear Cache)
3. **Expected UI:**
   - Notification: "✓ Cache cleared for this frame"
   - Cache banner disappears
   - Next analysis will be fresh

### Test 5: Persistent Cache (Cross-Session)
1. Analyze a frame
2. Close plugin completely
3. Reopen plugin
4. Select the same frame
5. **Expected:** Cache still available, banner shows age (e.g., "5m ago")

## Common Issues & Solutions

### Issue: No cache console logs appear
**Cause:** Plugin not reloaded after build
**Fix:**
```
Figma → Plugins → Development → [Your Plugin] → ⟳ Reload
```

### Issue: Cache never hits
**Possible Causes:**
1. Frame ID changing (unlikely)
2. Content hash always different
3. Cache storage failing

**Debug:**
Add this temporary code to `code.ts` after line 84:
```typescript
console.log('✓ Cached analysis for:', frame.name, 'ID:', frame.id);
console.log('Cache data:', JSON.stringify(cached).substring(0, 200)); // First 200 chars
```

### Issue: Cache clears immediately
**Cause:** Content hash calculation might be too sensitive
**Check:** Are you modifying frame properties unintentionally?

### Issue: "Cache available" banner never shows
**Check UI Console:** (Browser DevTools on plugin UI)
```javascript
// In ui.html, find the message handler and add:
console.log('Received message:', msg.type, msg);
```

Look for:
- `cache-available` message
- `cache-info` message

## Expected Performance Metrics

| Scenario | Expected Time |
|----------|---------------|
| First analysis (50 elements) | 2-5 seconds |
| Cached load (50 elements) | < 500ms |
| First analysis (200 elements) | 8-12 seconds |
| Cached load (200 elements) | < 500ms |

## Cache Storage Verification

### Check if cache is being stored:
1. Select frame
2. Run this in Figma DevTools Console:
```javascript
// Get selected frame
const frame = figma.currentPage.selection[0];

// Check if cache exists
const cacheData = frame.getPluginData('a11y-analysis');
console.log('Cache exists:', !!cacheData);
console.log('Cache data:', cacheData ? JSON.parse(cacheData) : 'none');
```

### Manual cache inspection:
```javascript
// See all cached frames on page
const allFrames = figma.currentPage.findAll(n => n.type === 'FRAME');
allFrames.forEach(frame => {
  const cache = frame.getPluginData('a11y-analysis');
  if (cache) {
    console.log(`Frame "${frame.name}" has cache:`, JSON.parse(cache).timestamp);
  }
});
```

## Success Indicators

✅ Console shows cache logs
✅ Blue cache banner appears on second analysis
✅ Results load instantly (< 500ms)
✅ Cache age updates correctly
✅ Re-analyze button forces fresh scan
✅ Clear cache button removes cache
✅ Cache persists after plugin close/reopen
