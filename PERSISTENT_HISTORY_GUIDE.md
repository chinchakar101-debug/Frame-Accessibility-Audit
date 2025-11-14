# Persistent Analysis History with Change Detection

## Overview

Your Figma Accessibility Audit plugin now includes a complete persistent history system with intelligent change detection. This system stores all analysis results in a Supabase database, automatically detects frame modifications, and provides visual indicators for frames that have changed since their last analysis.

---

## Key Features

### 1. Persistent Storage
- **Cross-Session Persistence**: All analysis results are saved to Supabase and persist across plugin sessions
- **Automatic Sync**: Results sync automatically when you analyze a frame
- **Frame-Specific History**: Each frame maintains its complete analysis history

### 2. Change Detection
- **Content Fingerprinting**: Uses a sophisticated hashing algorithm that tracks:
  - Child element count
  - All text content
  - Color values
- **Automatic Detection**: Compares current frame state with last analysis when you select a frame
- **Change Tracking**: Records all detected changes with timestamps

### 3. Visual Indicators
- **Change Badges**: Pulsing amber badges on frames that have been modified
- **Status Messages**: Clear indicators in the UI showing frame status
- **History Tab**: Dedicated interface for browsing all analyses

---

## User Experience Flow

### Scenario 1: First Analysis
```
1. User selects Frame A
2. UI shows: "Select a frame to begin analysis"
3. User clicks "Start Analysis"
4. Analysis runs and results are displayed
5. Results saved to:
   - Local cache (fast re-access)
   - Supabase database (persistent storage)
```

### Scenario 2: Returning to Analyzed Frame
```
1. User selects Frame B (previously analyzed, unchanged)
2. Plugin checks Supabase for existing analysis
3. UI shows: "Analysis from 2h ago"
4. Cached results load instantly (no re-analysis needed)
5. User can view previous results immediately
```

### Scenario 3: Frame Has Changed
```
1. User selects Frame C (previously analyzed, but modified)
2. Plugin detects content hash mismatch
3. UI shows: "⚠ Frame changed - re-analyze recommended"
4. History tab shows change badge
5. User can:
   - View previous analysis (outdated but still accessible)
   - Re-analyze to get current results
```

### Scenario 4: Browsing History
```
1. User clicks "History" tab
2. UI displays:
   - All analyzed frames (most recent first)
   - Issue counts (total, fails, warnings)
   - Time since analysis
   - Change indicators (if frame modified)
3. User clicks any history card
4. Plugin navigates to that frame
5. Switches back to Analyze tab automatically
```

---

## Technical Implementation

### Data Model

#### `frame_analyses` Table
```sql
{
  id: uuid,
  frame_id: text,              // Figma frame ID
  frame_name: text,            // Human-readable name
  user_id: text,               // User identifier
  content_hash: text,          // Frame fingerprint
  total_issues: integer,       // Total accessibility issues
  fail_count: integer,         // AA/AAA failures
  warning_count: integer,      // Warnings
  analysis_data: jsonb,        // Complete results
  plugin_version: text,        // Plugin version
  analyzed_at: timestamp,      // Analysis timestamp
  created_at: timestamp,
  updated_at: timestamp
}
```

#### `frame_changes` Table
```sql
{
  id: uuid,
  frame_id: text,              // Figma frame ID
  previous_hash: text,         // Hash before change
  current_hash: text,          // Hash after change
  change_detected_at: timestamp,
  is_resolved: boolean,        // Re-analyzed?
  created_at: timestamp
}
```

#### `analysis_sessions` Table
```sql
{
  id: uuid,
  user_id: text,
  session_start: timestamp,
  session_end: timestamp,
  frames_analyzed: integer,
  created_at: timestamp
}
```

### Change Detection Algorithm

```typescript
// 1. Generate content fingerprint
function generateContentHash(frame: FrameNode): string {
  const fingerprint = {
    childCount: frame.children.length,
    texts: collectTextContent(frame),      // All text
    colors: collectColors(frame)           // All colors
  };
  return simpleHash(JSON.stringify(fingerprint));
}

// 2. Compare with stored hash
async function checkFrameForChanges(frame: FrameNode): Promise<boolean> {
  const latestAnalysis = await supabaseClient.getLatestAnalysis(frame.id);
  const currentHash = generateContentHash(frame);

  if (currentHash !== latestAnalysis.content_hash) {
    // Record change
    await supabaseClient.detectFrameChange(
      frame.id,
      latestAnalysis.content_hash,
      currentHash
    );
    return true;
  }

  return false;
}

// 3. Mark as resolved when re-analyzed
await supabaseClient.resolveFrameChanges(frame.id);
```

---

## UI Components

### 1. History Tab

**Location**: Second tab in plugin UI

**Features**:
- **Analysis History**: Chronological list of all analyses
- **Selected Frame History**: Version history for currently selected frame
- **Frames with Changes**: Quick access to modified frames

**Interactions**:
- Click any card to navigate to that frame
- Auto-switches back to Analyze tab
- Real-time change indicators

### 2. Change Badges

**Visual Design**:
- Amber/yellow color (`#f59e0b`)
- Pulsing animation (2s cycle)
- Text: "Changed" or "⚠ Re-analyze"

**Locations**:
- Cache status bar (when frame has changes)
- History cards (for modified frames)
- Changes section (dedicated list)

### 3. Cache Status Bar

**States**:
1. **No Cache**: Hidden
2. **Cache Available**: "Analysis from 2h ago"
3. **Cache + Changes**: "Analysis from 2h ago ⚠ Changed"
4. **Persistent Load**: "Analysis from 2h ago" (logged as persistent)

---

## Database Security

### Row Level Security (RLS)

All tables use RLS policies to ensure users only access their own data:

```sql
-- Users can only view their own analyses
CREATE POLICY "Users can view own analyses"
  ON frame_analyses FOR SELECT
  TO authenticated
  USING (user_id = auth.jwt()->>'sub');

-- Users can only insert their own analyses
CREATE POLICY "Users can insert own analyses"
  ON frame_analyses FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.jwt()->>'sub');
```

### Data Isolation
- Each user gets a unique `user_id` (format: `figma-user-{timestamp}`)
- All queries automatically filter by `user_id`
- No cross-user data access possible

---

## API Reference

### Supabase Client Methods

#### `saveAnalysis(analysis: AnalysisRecord)`
Saves a new analysis to the database.

```typescript
await supabaseClient.saveAnalysis({
  frame_id: frame.id,
  frame_name: frame.name,
  user_id: currentUserId,
  content_hash: generateContentHash(frame),
  total_issues: 15,
  fail_count: 10,
  warning_count: 5,
  analysis_data: { issues: [...] },
  plugin_version: '1.0.0'
});
```

#### `getLatestAnalysis(frameId: string)`
Retrieves the most recent analysis for a frame.

```typescript
const analysis = await supabaseClient.getLatestAnalysis(frame.id);
// Returns: { id, frame_id, content_hash, total_issues, ..., has_changes }
```

#### `detectFrameChange(frameId, previousHash, currentHash)`
Records a detected change.

```typescript
const hasChanged = await supabaseClient.detectFrameChange(
  frame.id,
  storedHash,
  currentHash
);
```

#### `resolveFrameChanges(frameId: string)`
Marks all changes as resolved after re-analysis.

```typescript
await supabaseClient.resolveFrameChanges(frame.id);
```

#### `getAllAnalyses(limit?: number)`
Gets all analyses for the current user.

```typescript
const analyses = await supabaseClient.getAllAnalyses(50);
// Returns array of analysis records, sorted by date (newest first)
```

#### `getFrameHistory(frameId: string)`
Gets complete history for a specific frame.

```typescript
const history = await supabaseClient.getFrameHistory(frame.id);
// Returns array of all analyses for this frame, chronological
```

#### `getUnresolvedChanges()`
Gets all frames with pending changes.

```typescript
const changes = await supabaseClient.getUnresolvedChanges();
// Returns array of frame_changes records where is_resolved = false
```

---

## Performance Optimizations

### 1. Multi-Level Caching
```
Level 1: Memory cache (Map<string, CachedAnalysis>)
  ↓ (miss)
Level 2: Figma PluginData (setPluginData/getPluginData)
  ↓ (miss)
Level 3: Supabase database (persistent)
```

### 2. Lazy Loading
- History tab only loads when activated
- Change detection runs on selection (non-blocking)
- Database queries debounced and batched

### 3. Smart Invalidation
- Cache invalidated only when:
  - Content hash changes
  - Cache expires (7 days)
  - Plugin version changes
  - Manual clear triggered

---

## Message Flow

### Frame Selection with Change Detection
```mermaid
User selects frame
  → figma.on('selectionchange')
  → checkFrameForChanges(frame)
  → Query Supabase for latest analysis
  → Generate current hash
  → Compare hashes
  → If different:
      → Save change record
      → Send 'frame-has-changes' message to UI
  → UI displays change badge
```

### Loading Persistent Analysis
```mermaid
User selects analyzed frame
  → Check memory cache (miss)
  → Check PluginData (miss)
  → loadPersistentAnalysis(frame)
  → Query Supabase
  → Verify hash matches
  → If match:
      → Cache in memory + PluginData
      → Send 'cache-available' to UI
  → If mismatch:
      → Return null (re-analysis needed)
```

---

## Troubleshooting

### Issue: History Not Showing

**Possible Causes**:
1. Supabase connection failed
2. No analyses performed yet
3. Database credentials incorrect

**Solutions**:
1. Check browser console for Supabase errors
2. Verify `.env` file has correct credentials
3. Run an analysis on any frame to populate history

### Issue: Changes Not Detected

**Possible Causes**:
1. Content hash unchanged (minor visual tweaks)
2. Hash algorithm doesn't capture the change type
3. Frame not properly loaded

**Solutions**:
1. Use "Re-analyze" button to force fresh analysis
2. Make substantive changes (text, colors, structure)
3. Refresh plugin and re-select frame

### Issue: "Supabase not configured" Message

**Cause**: Database credentials missing or invalid

**Solution**:
1. Check `supabase-client.ts` has correct URL and anon key
2. Rebuild plugin: `npm run build`
3. Reload plugin in Figma

---

## Best Practices

### For Users
1. **Check for Changes**: Always look for change badges before using cached results
2. **Re-analyze When Needed**: If frame shows "Changed", re-analyze for accurate results
3. **Use History Tab**: Browse past analyses to track improvements over time
4. **Regular Analysis**: Analyze frames periodically to maintain fresh history

### For Developers
1. **Test Change Detection**: Modify frames in various ways to verify detection
2. **Monitor Performance**: Watch console for slow Supabase queries
3. **Handle Errors Gracefully**: All Supabase calls wrapped in try/catch
4. **Maintain Backward Compatibility**: Version field allows schema evolution

---

## Future Enhancements

### Planned Features
- [ ] Export history to CSV/JSON
- [ ] Comparison view (before/after)
- [ ] Team collaboration (shared analyses)
- [ ] Trend analysis (improvement over time)
- [ ] Automated re-analysis scheduling
- [ ] Conflict resolution (multiple analysts)

### Database Migrations
All future schema changes will use versioned migrations:
```sql
-- Example: Adding a new field
ALTER TABLE frame_analyses
ADD COLUMN IF NOT EXISTS accessibility_score integer;
```

---

## Support & Resources

### Documentation
- [Supabase Documentation](https://supabase.com/docs)
- [Figma Plugin API](https://www.figma.com/plugin-docs/)
- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)

### Code Examples
See `code.ts` for implementation details:
- Lines 49-183: Persistent history functions
- Lines 343-390: Selection change handler with detection
- Lines 454-455: Save to persistent storage

See `ui.html` for UI implementation:
- Lines 1076-1104: History tab HTML
- Lines 636-710: Change indicator styles
- Lines 1245-1420: History JavaScript functions

---

## Summary

You now have a fully-functional persistent history system that:

✅ **Stores** all analysis results permanently in Supabase
✅ **Detects** frame changes automatically using content fingerprinting
✅ **Displays** visual indicators for modified frames
✅ **Provides** a dedicated History tab for browsing past analyses
✅ **Maintains** frame-specific version history
✅ **Tracks** unresolved changes for quick access
✅ **Secures** data with Row Level Security
✅ **Optimizes** performance with multi-level caching

The system seamlessly integrates with your existing accessibility analysis workflow, providing valuable context and historical tracking without disrupting the user experience.
