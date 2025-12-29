# Phase 8: Series Admin Enhancements

**Status**: NOT STARTED
**Goal**: Bring Series admin capabilities closer to Tours (optional enhancements)

## Background

Tours have richer admin features than Series:
- Tour Admins (multi-admin support)
- Categories (player classification)
- Enrollments (player management)

Some of these may make sense for Series too, particularly admin management.

## Scope Assessment

### Likely Valuable for Series

| Feature | Value | Complexity | Recommendation |
|---------|-------|------------|----------------|
| Series Admins | High | Low | **Implement** |
| Documents | Already exists | - | Done |
| Banner/Landing | Already exists | - | Done |

### Probably NOT Needed for Series

| Feature | Reason |
|---------|--------|
| Enrollments | Series use teams, not individual enrollments |
| Categories | Teams don't have handicap categories |
| Scoring Mode | Series typically use gross only |

## Tasks (Series Admins Only)

### 8.1 Create Database Migration

**File**: `src/database/migrations/XXX_add_series_admins.ts`

```sql
CREATE TABLE series_admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  series_id INTEGER NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(series_id, user_id)
);

CREATE INDEX idx_series_admins_series_id ON series_admins(series_id);
```

- [ ] Create migration file
- [ ] Test migration

### 8.2 Create SeriesAdminService

**File**: `src/services/series-admin.service.ts`

```typescript
class SeriesAdminService {
  getAdmins(seriesId: number): SeriesAdmin[]
  addAdmin(seriesId: number, userId: number): SeriesAdmin
  removeAdmin(seriesId: number, userId: number): void
  isAdmin(seriesId: number, userId: number): boolean
}
```

- [ ] Implement service methods
- [ ] Follow TourAdminService patterns

### 8.3 Add API Endpoints

**File**: `src/api/series.ts`

```
GET    /api/series/:id/admins           - List series admins
POST   /api/series/:id/admins           - Add series admin
DELETE /api/series/:id/admins/:userId   - Remove series admin
```

- [ ] Implement endpoints
- [ ] Add authorization checks

### 8.4 Write Backend Tests

**File**: `tests/series-admin.test.ts`

- [ ] Service tests
- [ ] API tests
- [ ] Authorization tests

### 8.5 Add React Query Hooks

**File**: `frontend/src/api/series.ts`

```typescript
useSeriesAdmins(seriesId: number)
useAddSeriesAdmin()
useRemoveSeriesAdmin()
```

- [ ] Query hook for fetching
- [ ] Mutation hooks for add/remove

### 8.6 Add Admins Tab to SeriesDetail

**File**: `frontend/src/views/admin/SeriesDetail.tsx`

- [ ] Add "Admins" tab
- [ ] Reuse/adapt AdminList component from TourDetail
- [ ] User selector for adding admins
- [ ] Remove button for each admin
- [ ] Show series owner

## Verification

- [ ] Migration creates table
- [ ] Can add admin to series via API
- [ ] Can remove admin via API
- [ ] SeriesDetail shows Admins tab
- [ ] Can add/remove admins via UI
- [ ] Owner always shown, cannot be removed
- [ ] All tests pass
- [ ] TypeScript compilation passes

## Dependencies

- Phase 5 (SeriesDetail changes)

## Files Created/Modified

```
src/database/migrations/XXX_add_series_admins.ts (new)
src/services/series-admin.service.ts (new)
src/api/series.ts (modify)
tests/series-admin.test.ts (new)
frontend/src/api/series.ts (modify)
frontend/src/views/admin/SeriesDetail.tsx (modify)
```

## UI Mockup

```
┌─────────────────────────────────────────────────────────────┐
│ SeriesDetail - Admins Tab                                   │
├─────────────────────────────────────────────────────────────┤
│ [Competitions] [Teams] [Documents] [Admins] [Settings]      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Series Admins                                               │
│                                                             │
│ Add Admin                                                   │
│ [Select user...                                      ▼]     │
│ [Add Admin]                                                 │
│                                                             │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ Current Admins                                              │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 👑 Marcus T.                              Owner          │ │
│ │    marcus@example.com                                   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Johan S.                                    [Remove]     │ │
│ │ johan@example.com                                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ℹ️ Admins have full control over this series including      │
│    managing competitions, teams, and settings.              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Alternative: Skip This Phase

If Series admin management is not needed:
- Skip this phase entirely
- Series owner (creator) is the only admin
- Simpler model, less code to maintain

## Future Enhancements (Out of Scope)

- Series categories (if team-based categories needed)
- Series enrollments (if individual tracking needed)
- Series point templates
- Series-specific scoring modes

## Notes

- This phase is optional/lower priority
- Only implement if multi-admin for Series is actually needed
- Can be deferred indefinitely without blocking other work
- Consider user feedback before implementing
