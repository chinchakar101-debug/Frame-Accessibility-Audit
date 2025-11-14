# Persistent History System - Technical Architecture

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FIGMA PLUGIN                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐                           ┌──────────────┐    │
│  │              │                           │              │    │
│  │  code.ts     │◄──────messages──────────►│  ui.html     │    │
│  │  (Sandbox)   │                           │  (iframe)    │    │
│  │              │                           │              │    │
│  └──────┬───────┘                           └──────────────┘    │
│         │                                                        │
│         │ import                                                 │
│         ▼                                                        │
│  ┌──────────────────┐                                           │
│  │                  │                                            │
│  │ supabase-client  │                                            │
│  │    .ts           │                                            │
│  │                  │                                            │
│  └──────┬───────────┘                                            │
│         │                                                        │
└─────────┼────────────────────────────────────────────────────────┘
          │
          │ fetch (REST API)
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE BACKEND                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                     PostgreSQL Database                    │  │
│  │                                                             │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │  │
│  │  │    frame_    │  │    frame_    │  │  analysis_   │    │  │
│  │  │   analyses   │  │   changes    │  │   sessions   │    │  │
│  │  │              │  │              │  │              │    │  │
│  │  │ • id         │  │ • id         │  │ • id         │    │  │
│  │  │ • frame_id   │  │ • frame_id   │  │ • user_id    │    │  │
│  │  │ • user_id    │  │ • prev_hash  │  │ • start      │    │  │
│  │  │ • hash       │  │ • curr_hash  │  │ • end        │    │  │
│  │  │ • issues     │  │ • detected   │  │ • count      │    │  │
│  │  │ • analyzed   │  │ • resolved   │  │              │    │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │  │
│  │                                                             │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   Row Level Security (RLS)                 │  │
│  │  • Users can only access their own data                   │  │
│  │  • Enforced at database level                             │  │
│  │  • No application-level filtering needed                  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Helper Functions                        │  │
│  │  • get_latest_analysis()                                   │  │
│  │  • detect_frame_change()                                   │  │
│  │  • resolve_frame_changes()                                 │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. code.ts (Plugin Sandbox)

**Role**: Main plugin logic, accessibility analysis, Supabase integration

**Key Responsibilities**:
- Frame selection monitoring
- Content hash generation
- Change detection
- Analysis execution
- Cache management (3 levels)
- Supabase API calls

**Key Functions**:
```typescript
// Initialization
async function initializePlugin()
async function loadUnresolvedChanges()

// Change Detection
async function checkFrameForChanges(frame: FrameNode): Promise<boolean>
function generateContentHash(frame: FrameNode): string

// Persistent Storage
async function loadPersistentAnalysis(frame: FrameNode)
async function savePersistentAnalysis(frame: FrameNode, results)

// Local Cache
function getCachedAnalysis(frame: FrameNode)
function setCachedAnalysis(frame: FrameNode, results)
function isCacheValid(frame: FrameNode, cached: CachedAnalysis)
```

**State Management**:
```typescript
let supabaseClient: SupabaseClient | null = null;
let currentUserId: string;
let currentSessionId: string | null;
let sessionFrameCount: number = 0;
const analysisCache = new Map<string, CachedAnalysis>();
```

---

### 2. supabase-client.ts

**Role**: Supabase database abstraction layer

**Architecture Pattern**: Client wrapper with REST API calls

**Key Features**:
- Type-safe API methods
- Error handling
- Request/response transformation
- Authentication header injection

**Core Methods**:
```typescript
class SupabaseClient {
  // Low-level request handler
  private async request(path, method, body): Promise<any>

  // High-level API methods
  async saveAnalysis(analysis: AnalysisRecord)
  async getLatestAnalysis(frameId: string): Promise<LatestAnalysis | null>
  async detectFrameChange(frameId, prevHash, currHash): Promise<boolean>
  async resolveFrameChanges(frameId: string)
  async getAllAnalyses(limit?: number): Promise<any[]>
  async getFrameHistory(frameId: string): Promise<any[]>
  async getUnresolvedChanges(): Promise<any[]>
  async startSession(): Promise<string>
  async endSession(sessionId: string, count: number)
}
```

**Request Flow**:
```
Method Call
  → Build URL with path
  → Add auth headers
  → Serialize body to JSON
  → fetch()
  → Check response.ok
  → Parse JSON response
  → Return data
```

---

### 3. ui.html (Plugin UI)

**Role**: User interface with history browser

**Architecture**: Single-page application with tab-based navigation

**Key Sections**:
1. **Header**: Branding, version info
2. **Tabs**: Analyze, History
3. **Analyze Tab**:
   - Frame selection status
   - Analysis configuration
   - Results display
   - Cache status bar
4. **History Tab**:
   - All analyses list
   - Frame-specific history
   - Unresolved changes list

**State Management**:
```javascript
// Analysis state
let isAnalyzing = false;
let showOverlay = false;

// History state
let currentHistory = [];
let unresolvedChanges = [];
```

**Key Functions**:
```javascript
// History Management
function loadHistory()
function displayHistory(analyses)
function displayFrameHistory(history)
function displayUnresolvedChanges(changes)

// UI Helpers
function getTimeAgo(date)
function showNotification(message, type)
function displayIssues(groupedIssues)
```

---

## Data Flow Diagrams

### Analysis with Persistent Save

```
┌─────────┐
│  User   │
└────┬────┘
     │ 1. Selects frame
     ▼
┌──────────────┐
│   code.ts    │
└──────┬───────┘
       │ 2. frame selected event
       │
       ├─────► 3. checkFrameForChanges()
       │          └─► getLatestAnalysis()
       │                └─► Supabase query
       │
       ├─────► 4. getCachedAnalysis()
       │          └─► Check memory
       │              └─► Check PluginData
       │                  └─► loadPersistentAnalysis()
       │                      └─► Supabase query
       │
       │ 5. User clicks "Analyze"
       │
       ├─────► 6. analyzeFrame()
       │          └─► Check each element
       │              └─► Generate issues[]
       │
       ├─────► 7. setCachedAnalysis()
       │          └─► Memory cache
       │              └─► PluginData
       │
       ├─────► 8. savePersistentAnalysis()
       │          └─► supabaseClient.saveAnalysis()
       │              └─► POST /frame_analyses
       │                  └─► Database INSERT
       │
       └─────► 9. resolveFrameChanges()
                  └─► UPDATE frame_changes
                      SET is_resolved = true
```

### Loading History Tab

```
┌─────────┐
│  User   │
└────┬────┘
     │ 1. Clicks "History" tab
     ▼
┌──────────────┐
│   ui.html    │
└──────┬───────┘
       │ 2. loadHistory()
       │    └─► postMessage('get-all-analyses')
       │
       ▼
┌──────────────┐
│   code.ts    │
└──────┬───────┘
       │ 3. onmessage handler
       │    └─► supabaseClient.getAllAnalyses(50)
       │        └─► GET /frame_analyses?order=analyzed_at.desc&limit=50
       │
       ▼
┌──────────────┐
│  Supabase    │
└──────┬───────┘
       │ 4. Query executes
       │    └─► RLS filters by user_id
       │        └─► ORDER BY analyzed_at DESC
       │            └─► LIMIT 50
       │
       │ 5. Returns JSON array
       ▼
┌──────────────┐
│   code.ts    │
└──────┬───────┘
       │ 6. postMessage('all-analyses', data)
       │
       ▼
┌──────────────┐
│   ui.html    │
└──────┬───────┘
       │ 7. displayHistory(analyses)
       │    └─► For each analysis:
       │        └─► Create history-card
       │            └─► Check unresolvedChanges
       │                └─► Add change badge if needed
       │                    └─► Append to historyList
```

---

## Database Schema Details

### frame_analyses

**Primary Key**: `id` (uuid)

**Indexes**:
- `idx_frame_analyses_frame_id` on `frame_id`
- `idx_frame_analyses_user_id` on `user_id`
- `idx_frame_analyses_content_hash` on `content_hash`
- `idx_frame_analyses_analyzed_at` on `analyzed_at DESC`
- `idx_frame_analyses_user_frame` on `(user_id, frame_id)`

**Rationale**:
- `frame_id` index: Fast lookups when selecting a frame
- `user_id` index: Filter user's analyses quickly
- `content_hash` index: Quick hash comparisons
- `analyzed_at` index: Chronological ordering
- Composite index: Optimizes most common query pattern

**JSONB Structure** (`analysis_data`):
```json
{
  "issues": [
    {
      "elementId": "123:456",
      "elementName": "Button",
      "issueType": "Color Contrast",
      "severity": "fail",
      "wcagLevel": "AA",
      "currentValue": "3.2:1",
      "requiredValue": "4.5:1",
      "suggestion": "Change text color to #000000",
      "suggestedFix": { "type": "textColor", "value": {...} },
      "bounds": { "x": 100, "y": 200, "width": 150, "height": 40 }
    }
  ],
  "plugin_version": "1.0.0"
}
```

---

### frame_changes

**Primary Key**: `id` (uuid)

**Indexes**:
- `idx_frame_changes_frame_id` on `frame_id`
- `idx_frame_changes_is_resolved` on `is_resolved`
- `idx_frame_changes_frame_unresolved` on `(frame_id, is_resolved)`

**Lifecycle**:
1. **Created**: When hash mismatch detected
2. **Pending**: `is_resolved = false`
3. **Resolved**: Set to `true` when frame re-analyzed
4. **Archived**: (future) After 30 days

---

### analysis_sessions

**Primary Key**: `id` (uuid)

**Indexes**:
- `idx_analysis_sessions_user_id` on `user_id`
- `idx_analysis_sessions_start` on `session_start DESC`

**Use Cases**:
- Usage analytics
- Session tracking
- Billing metrics (future)

---

## Security Architecture

### Row Level Security (RLS)

**Philosophy**: Defense in depth - security enforced at database level

**Implementation**:
```sql
-- Example policy structure
CREATE POLICY "policy_name"
  ON table_name
  FOR operation          -- SELECT, INSERT, UPDATE, DELETE
  TO role                -- authenticated, anon, public
  USING (condition)      -- Row filter for SELECT/UPDATE/DELETE
  WITH CHECK (condition) -- Row filter for INSERT/UPDATE
```

**User Identification**:
```sql
auth.jwt()->>'sub'  -- Extracts user_id from JWT token
```

**Policy Pattern**:
- **SELECT**: User can read if `user_id = auth.jwt()->>'sub'`
- **INSERT**: User can create if `user_id = auth.jwt()->>'sub'`
- **UPDATE**: User can modify if `user_id = auth.jwt()->>'sub'`
- **DELETE**: User can remove if `user_id = auth.jwt()->>'sub'`

**Benefits**:
- Cannot bypass with application code
- Works even if plugin code compromised
- SQL injection protection
- Multi-tenancy built-in

---

## Caching Strategy

### Three-Level Cache Hierarchy

```
┌─────────────────────────────────────────┐
│         Level 1: Memory Cache           │
│  • Fastest (O(1) Map lookup)            │
│  • Session-scoped                       │
│  • Lost on plugin reload                │
└─────────────────────────────────────────┘
              │ (miss)
              ▼
┌─────────────────────────────────────────┐
│     Level 2: Figma PluginData           │
│  • Fast (local storage)                 │
│  • Document-scoped                      │
│  • Persists across plugin reloads       │
│  • Tied to frame node                   │
└─────────────────────────────────────────┘
              │ (miss)
              ▼
┌─────────────────────────────────────────┐
│     Level 3: Supabase Database          │
│  • Slowest (network request)            │
│  • User-scoped                          │
│  • Persists across sessions/devices     │
│  • Searchable and queryable             │
└─────────────────────────────────────────┘
```

### Cache Invalidation Rules

**Automatic Invalidation**:
1. Content hash mismatch
2. Cache age > 7 days
3. Plugin version change

**Manual Invalidation**:
1. User clicks "Clear Cache" button
2. User clicks "Re-analyze" button
3. Developer clears all caches

**Propagation**:
- Memory → PluginData → Supabase (write)
- Supabase → PluginData → Memory (read)

---

## Change Detection Algorithm

### Content Fingerprinting

**Tracked Properties**:
```typescript
interface ContentFingerprint {
  childCount: number;      // Detects: Added/removed elements
  texts: string[];         // Detects: Text content changes
  colors: string[];        // Detects: Color changes
}
```

**Hash Function**:
```typescript
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;  // hash * 31 + char
    hash = hash & hash;                   // Convert to 32-bit int
  }
  return Math.abs(hash).toString(36);    // Base-36 encoding
}
```

**Algorithm**:
```
1. Serialize fingerprint to JSON
2. Compute hash
3. Compare with stored hash
4. If different:
   a. Record change in database
   b. Mark as unresolved
   c. Show visual indicator
5. If same:
   a. Check for existing unresolved changes
   b. Show indicator if found
```

**Properties NOT Tracked** (intentionally):
- Element positions (x, y)
- Layer order (z-index)
- Opacity/visibility
- Rotation/scale
- Effects (shadows, blurs)

**Rationale**: Focus on content changes that affect accessibility, not visual presentation.

---

## Performance Considerations

### Bottlenecks

1. **Network Latency**: Supabase calls over internet
   - **Mitigation**: Aggressive caching, async calls

2. **Hash Computation**: Recursive tree traversal
   - **Mitigation**: Memoization, throttled recomputation

3. **Database Queries**: Complex joins, aggregations
   - **Mitigation**: Indexes, query optimization, RPC functions

### Optimizations

**Database**:
- Indexes on all foreign keys
- Composite indexes for common queries
- JSONB for flexible storage
- RPC functions for complex logic

**Application**:
- Lazy loading (history tab)
- Debounced event handlers
- Batch queries where possible
- Message passing (non-blocking)

**UI**:
- Virtual scrolling (future, for large history)
- Progressive rendering
- CSS animations (GPU-accelerated)
- Minimal DOM manipulations

---

## Error Handling

### Strategy: Graceful Degradation

**Supabase Connection Fails**:
```typescript
try {
  supabaseClient = createSupabaseClient(userId);
  if (supabaseClient) {
    // Persistent history enabled
  }
} catch (error) {
  console.error('Supabase init failed:', error);
  // Fall back to local cache only
  supabaseClient = null;
}
```

**Database Query Fails**:
```typescript
try {
  const analyses = await supabaseClient.getAllAnalyses();
  displayHistory(analyses);
} catch (error) {
  console.error('Failed to load history:', error);
  // Show error message, but plugin still functional
  showHistoryError('Unable to load history. Check connection.');
}
```

**Hash Generation Fails**:
```typescript
try {
  const hash = generateContentHash(frame);
} catch (error) {
  console.warn('Hash generation failed:', error);
  // Use fallback hash (timestamp-based)
  const hash = Date.now().toString(36);
}
```

---

## Testing Strategy

### Unit Tests (Recommended)

```typescript
describe('generateContentHash', () => {
  it('should generate same hash for identical frames', () => {
    const frame1 = mockFrame({ /* ... */ });
    const frame2 = mockFrame({ /* ... */ });
    expect(generateContentHash(frame1)).toBe(generateContentHash(frame2));
  });

  it('should generate different hash when text changes', () => {
    const frame1 = mockFrame({ text: 'Hello' });
    const frame2 = mockFrame({ text: 'World' });
    expect(generateContentHash(frame1)).not.toBe(generateContentHash(frame2));
  });
});
```

### Integration Tests

```typescript
describe('Persistent History Integration', () => {
  it('should save and retrieve analysis', async () => {
    const frame = mockFrame();
    const issues = [/* ... */];

    await savePersistentAnalysis(frame, issues);
    const loaded = await loadPersistentAnalysis(frame);

    expect(loaded.results).toEqual(issues);
  });
});
```

### Manual Testing Checklist

- [ ] Analyze a frame → Check Supabase for record
- [ ] Modify frame → Verify change badge appears
- [ ] Switch frames → Confirm auto-load works
- [ ] Open History tab → See all analyses
- [ ] Click history card → Navigate to frame
- [ ] Re-analyze changed frame → Badge clears
- [ ] Reload plugin → History persists
- [ ] Clear cache → Database unchanged

---

## Deployment Considerations

### Prerequisites
- Supabase project created
- Database migrations applied
- Credentials configured
- Plugin built (`npm run build`)

### Rollout Strategy
1. **Phase 1**: Internal testing (dev only)
2. **Phase 2**: Beta users (opt-in)
3. **Phase 3**: General availability

### Monitoring
- Track Supabase usage metrics
- Monitor error rates in console
- Collect user feedback
- Watch database growth

### Rollback Plan
If issues arise:
1. Set `supabaseClient = null` (disable persistent history)
2. Push hotfix build
3. Plugin continues with local cache only
4. No data loss (database preserved)

---

## Future Architecture Evolution

### Planned Enhancements

**Real-Time Sync**:
- Use Supabase Realtime subscriptions
- Live updates when team members analyze
- Presence indicators

**Offline Support**:
- Queue failed requests
- Retry with exponential backoff
- Sync when connection restored

**Data Export**:
- Generate CSV/JSON reports
- Historical trend charts
- Accessibility score metrics

**Collaboration**:
- Shared team workspaces
- Comment threads on issues
- Assignment workflow

---

## Conclusion

This architecture provides:

✅ **Scalability**: Handles thousands of analyses per user
✅ **Reliability**: Graceful degradation, error handling
✅ **Security**: RLS at database level
✅ **Performance**: Multi-level caching, optimized queries
✅ **Maintainability**: Clear separation of concerns
✅ **Extensibility**: Easy to add new features

The system is production-ready and designed for long-term growth.
