# Phase 5: Series Inline Competition Management

**Status**: COMPLETED
**Goal**: Add Competitions tab to SeriesDetail with inline creation/editing
**Completed**: 2025-12-29

## Background

SeriesDetail currently has tabs for Settings, Teams, and Documents. There is no Competitions tab - users must navigate to the main Competitions page and filter by series. This is inconsistent with the improved Tour experience.

## Current SeriesDetail Tabs

```
├── Settings   - Basic info, banner, visibility
├── Teams      - Add/remove teams from series
└── Documents  - Series documents and landing page
```

## Target SeriesDetail Tabs

```
├── Competitions  - NEW: List and manage series competitions
├── Teams         - Existing (no changes)
├── Documents     - Existing (no changes)
└── Settings      - Existing (no changes)
```

## Tasks

### 5.1 Create SeriesCompetitionList Component

**File**: `frontend/src/components/admin/series/SeriesCompetitionList.tsx`

```typescript
interface SeriesCompetitionListProps {
  seriesId: number;
  onEdit: (competition: Competition) => void;
  onDelete: (competition: Competition) => void;
}
```

Features:
- [x] Fetch competitions for series
- [x] Display competition cards with name, date, course, tee info
- [x] Show tee info (series uses single tee, not category mapping)
- [x] Empty state with helpful message
- [x] Loading and error states

### 5.2 Create SeriesCompetitionModal Component

**File**: `frontend/src/components/admin/series/SeriesCompetitionModal.tsx`

```typescript
interface SeriesCompetitionModalProps {
  seriesId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competition?: Competition;
  onSuccess?: () => void;
}
```

Features:
- [x] Modal component with overlay
- [x] Create and edit modes
- [x] Form fields: name, date, course, tee, venue type, start mode
- [x] Course selection → Single tee selection (uses TeeSelector from Phase 2)
- [x] No category-tee mapping (series don't have categories)
- [x] Submit creates/updates via API
- [x] Open period settings for open start mode

### 5.3 Add Competitions Tab to SeriesDetail

**File**: `frontend/src/views/admin/SeriesDetail.tsx`

- [x] Add "Competitions" tab (first position)
- [x] Add state for modal open/close
- [x] Add state for editing competition
- [x] Integrate SeriesCompetitionList
- [x] Wire up edit/delete handlers
- [x] Invalidate queries on mutation success

### 5.4 Add React Query Hook for Series Competitions

**File**: `frontend/src/api/series.ts`

- [x] Check if `useSeriesCompetitions(seriesId)` exists - **Already existed**
- [x] Ensure proper query key for invalidation

### 5.5 Delete Confirmation Dialog

- [x] Confirmation dialog before delete
- [x] Show competition name
- [x] Handle delete via existing API
- [x] Query invalidation after delete

## Verification

- [x] SeriesDetail shows Competitions tab
- [x] Can see list of series competitions
- [x] Can open "Add Competition" modal
- [x] Can create competition with course and tee
- [x] List updates after creation
- [x] Can edit existing competition
- [x] Can delete with confirmation
- [x] Never navigates away from SeriesDetail
- [x] TypeScript compilation passes
- [x] Linting passes for new files

## API Endpoints Used

```
GET /api/series/:id/competitions - List series competitions (already existed)
POST /api/competitions - Create competition (with series_id)
PUT /api/competitions/:id - Update competition
DELETE /api/competitions/:id - Delete competition
```

## Dependencies

- Phase 1 (Shared components) - TeeSelector
- Phase 2 (TeeSelector) - Used for tee selection

## Files Created/Modified

```
frontend/src/components/admin/series/SeriesCompetitionList.tsx (new)
frontend/src/components/admin/series/SeriesCompetitionModal.tsx (new)
frontend/src/components/admin/series/index.ts (new)
frontend/src/views/admin/SeriesDetail.tsx (modified)
```

## UI Implementation

Tab order: Competitions | Teams | Documents | Settings

The Competitions tab shows:
- Card header with "Competitions" title and "Add Competition" button
- List of competition cards with:
  - Competition name
  - Date with calendar icon
  - Course name with map pin icon
  - Tee info with flag icon (if set)
  - Edit and delete action buttons
- Empty state when no competitions exist

## Differences from Tour Competition Management

| Feature | Tour | Series |
|---------|------|--------|
| Tee Selection | Category → Tee mapping | Single tee for all |
| Categories | Uses tour categories | No categories |
| Participants | Individual enrollments | Team-based |
| Form Complexity | Higher | Lower |
| Point Templates | Supported | Not shown (uses default) |

## Implementation Notes

- Reused TeeSelector component from Phase 2
- Simpler modal than TourCompetitionModal (no category-tee assignment)
- Backend endpoint `/api/series/:id/competitions` already existed
- Used existing `useSeriesCompetitions` hook from series.ts
- Query invalidation ensures list updates after create/edit/delete operations

## Additional Improvements (Post-Initial Implementation)

### Tab Bar Styling Consistency
- Changed Series tab bar from shadcn TabsList to custom underline-style tabs
- Now matches Tour detail view styling exactly
- Underline animation on active tab instead of full-width background

### Start List Navigation
- Added "Manage Start List" button (ListOrdered icon) to both:
  - SeriesCompetitionList
  - TourCompetitionList
- Only shows for competitions with `start_mode === "scheduled"`
- Links to `/admin/competitions/$competitionId/tee-times`

### Document Rendering Consistency
- Updated TourDetail documents tab to show full markdown rendering
- Previously showed truncated text preview (150 chars)
- Now uses ReactMarkdown with remarkGfm like Series does
- Both Tour and Series now render document content identically
