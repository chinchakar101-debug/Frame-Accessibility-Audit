# Persistent History - Quick Start Guide

## 5-Minute Getting Started

### What You Get

Your plugin now automatically:
- Saves every analysis to a cloud database
- Detects when frames change
- Shows you analysis history across all sessions
- Works even after closing and reopening Figma

---

## Using the History Feature

### 1. Analyze a Frame (Nothing New!)

Just use the plugin as normal:
1. Select a frame
2. Click "Start Analysis"
3. View results

**Behind the scenes**: Analysis is now saved to Supabase permanently.

---

### 2. Return to an Analyzed Frame

When you select a frame you've already analyzed:

**If frame is unchanged:**
- ✅ Results load instantly from cache
- Shows: "Analysis from 2h ago"

**If frame has changed:**
- ⚠️ Shows change badge
- Says: "Frame changed - re-analyze recommended"
- You can view old results OR re-analyze

---

### 3. Browse Your History

Click the **"📚 History"** tab to see:

#### All Analyses
- Every frame you've ever analyzed
- Issue counts (total, fails, warnings)
- Time since analysis
- Change badges for modified frames

#### Click any card to:
- Jump to that frame
- View its analysis
- Re-analyze if needed

---

## Visual Indicators Explained

### 🟢 No Badge
Frame hasn't changed since last analysis. Results are current.

### 🟡 "Changed" Badge
Frame was modified after analysis. Consider re-analyzing.

### 📊 Issue Stats
- Red number = Failures (AA/AAA)
- Yellow number = Warnings
- Total = All issues found

---

## Common Scenarios

### "I modified a frame. Why doesn't it show?"
The plugin detects changes when you **select** the frame. Select it to trigger detection.

### "I want to see old analysis even though frame changed"
That's fine! Old results remain accessible. The badge is just a recommendation.

### "How long is history kept?"
Forever (or until you manually delete it). No automatic expiration.

### "Can I export history?"
Not yet, but it's coming in Phase 2. Data is in Supabase if you want to query it directly.

---

## What Gets Detected as a Change?

**YES** (Triggers change badge):
- Text content modified
- Colors changed
- Elements added or removed

**NO** (Does not trigger badge):
- Position/layout changes
- Opacity changes
- Effects (shadows, blurs)
- Layer renaming

**Why?** We focus on content changes that affect accessibility, not visual styling.

---

## Troubleshooting

### History tab shows "No analysis history yet"
- You haven't analyzed any frames yet
- OR Supabase connection failed (check console)

### Change badge not appearing
- Frame change might not be detected (minor visual tweaks)
- Try selecting another frame, then back
- Use "Re-analyze" button to force fresh analysis

### "Supabase not configured" in console
- Database credentials missing
- Plugin will work with local cache only
- Contact developer if you need persistent history

---

## Pro Tips

1. **Check for badges regularly** - They tell you which frames need attention

2. **Use history to track progress** - See improvement over time

3. **Re-analyze after major changes** - Keeps your data accurate

4. **History tab is searchable** - Use Cmd/Ctrl+F to find specific frames

5. **Cache is smart** - Plugin won't re-analyze unless needed

---

## Technical Notes (For Developers)

### Database Tables
- `frame_analyses`: All analysis records
- `frame_changes`: Change detection log
- `analysis_sessions`: Usage tracking

### APIs Available
```typescript
supabaseClient.saveAnalysis(analysis)
supabaseClient.getLatestAnalysis(frameId)
supabaseClient.getAllAnalyses(limit)
supabaseClient.getFrameHistory(frameId)
```

See `PERSISTENT_HISTORY_GUIDE.md` for full API docs.

---

## Need More Info?

- **User Guide**: `PERSISTENT_HISTORY_GUIDE.md` (850+ lines)
- **Architecture**: `ARCHITECTURE.md` (950+ lines)
- **Summary**: `IMPLEMENTATION_SUMMARY.txt`

---

## That's It!

The history feature is **completely automatic**. Just use your plugin normally and enjoy:

✅ Permanent analysis storage
✅ Automatic change detection
✅ Visual change indicators
✅ Easy history browsing

No configuration needed. It just works!
