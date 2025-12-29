# Phase 7: Simplify Standalone Competitions

**Status**: NOT STARTED
**Goal**: Refocus Competitions.tsx for standalone competitions only

## Background

After Phases 3-5, competitions belonging to Tours and Series are managed inline within their respective detail views. The main Competitions page should now focus on standalone competitions (those with no tour_id and no series_id).

## Current State

- Competitions.tsx shows ALL competitions
- Can filter by series or tour via URL params
- Can create competitions linked to series or tour
- Form has series/tour selector

## Target State

- Competitions.tsx shows only standalone competitions
- No series/tour filter (handled in detail views)
- Simplified form without series/tour selector
- Clear messaging about what standalone competitions are for

## Tasks

### 7.1 Filter to Standalone Only

**File**: `frontend/src/views/admin/Competitions.tsx`

- [ ] Modify query to fetch only competitions where tour_id IS NULL AND series_id IS NULL
- [ ] Or filter client-side if API doesn't support
- [ ] Remove URL param handling for series/tour

### 7.2 Simplify Form

**File**: `frontend/src/views/admin/Competitions.tsx`

- [ ] Remove series selector from form
- [ ] Remove tour selector from form
- [ ] Always create with tour_id = null and series_id = null
- [ ] Simplify form layout

### 7.3 Add Contextual Help

- [ ] Add header explaining standalone competitions
- [ ] Example: "One-off events not part of a tour or series"
- [ ] Link to Tours and Series pages for organized events

### 7.4 Update Navigation

**File**: Various admin navigation files

- [ ] Update any "Add Competition" links that pointed here with tour/series params
- [ ] Ensure Tour and Series detail views are the entry points for their competitions
- [ ] Consider renaming page to "Standalone Competitions" in nav

### 7.5 Integrate Shared Components

- [ ] Use CourseSelector from Phase 1
- [ ] Use TeeSelector from Phase 2
- [ ] Use CompetitionCard from Phase 1
- [ ] Reduce duplicate code

### 7.6 API Endpoint for Standalone Competitions

**File**: `src/api/competitions.ts`

- [ ] Add filter option: `GET /api/competitions?standalone=true`
- [ ] Returns only competitions with no tour_id and no series_id
- [ ] Or modify existing endpoint with optional filters

## Verification

- [ ] Competitions page shows only standalone competitions
- [ ] Creating competition doesn't offer tour/series selection
- [ ] New competition has tour_id = null and series_id = null
- [ ] Tour competitions appear only in TourDetail
- [ ] Series competitions appear only in SeriesDetail
- [ ] Can still edit/delete standalone competitions
- [ ] Navigation is clear and consistent
- [ ] TypeScript compilation passes

## API Changes

```
GET /api/competitions?standalone=true - Only standalone competitions
```

## Dependencies

- Phase 1 (Shared components)
- Phase 2 (TeeSelector)
- Phase 3 (Tour inline management - so competitions have a home)
- Phase 5 (Series inline management - so competitions have a home)

## Files Modified

```
frontend/src/views/admin/Competitions.tsx (modify)
src/api/competitions.ts (possibly modify)
frontend/src/router.tsx (possibly modify - nav labels)
```

## UI Mockup

```
┌─────────────────────────────────────────────────────────────┐
│ Standalone Competitions                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ℹ️ One-off events not part of a tour or series.             │
│    For organized events, manage competitions within         │
│    Tours or Series.                                         │
│                                                             │
│ Competitions (2)                    [+ Add Competition]     │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Club Championship - Landeryd GK            2025-06-01   │ │
│ │ White Tee                                  [Edit] [Del] │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Charity Tournament - Hooks GK              2025-07-15   │ │
│ │ Yellow Tee                                 [Edit] [Del] │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ Looking for Tour or Series competitions?                    │
│ [Go to Tours →]  [Go to Series →]                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Simplified Form

```
┌─────────────────────────────────────────────────────────────┐
│ Add Standalone Competition                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Competition Name *                                          │
│ [Club Championship                                    ]     │
│                                                             │
│ Date *                                                      │
│ [2025-06-01                                           ]     │
│                                                             │
│ Course *                                                    │
│ [Landeryd GK                                         ▼]     │
│                                                             │
│ Tee Box                                                     │
│ [White - CR 70.1 / SR 125                            ▼]     │
│                                                             │
│ Venue Type                                                  │
│ [Outdoor                                             ▼]     │
│                                                             │
│                              [Cancel] [Create]              │
└─────────────────────────────────────────────────────────────┘
```

## Notes

- This is a simplification, not a removal of functionality
- All competition features still available
- Just removing the confusing tour/series selector
- Focus is on quick creation of one-off events
