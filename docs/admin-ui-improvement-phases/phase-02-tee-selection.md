# Phase 2: Tee Box Selection in Competitions

**Status**: COMPLETED
**Goal**: Enable tee box selection when creating/editing competitions
**Completed**: 2025-12-29

## Background

The backend already supports `tee_id` on competitions (migration 029), and the `CompetitionService` validates that the tee belongs to the selected course. However, there is no UI to select a tee box.

## Current State

- `competitions` table has `tee_id` column (nullable)
- `course_tees` table stores tee definitions per course
- `CompetitionService.create()` validates `tee_id` if provided
- ~~Frontend has no tee selection in competition form~~ **Now implemented!**

## Tasks

### 2.1 Create TeeSelector Component

**File**: `frontend/src/components/admin/competition/TeeSelector.tsx`

```typescript
interface TeeSelectorProps {
  courseId: number | null;
  value: number | null;
  onChange: (teeId: number | null) => void;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
}
```

Features:
- [x] Fetch tees for selected course using `useCourseTees(courseId)`
- [x] Disabled state when no course selected
- [x] Show tee name and color indicator
- [x] Show ratings (CR/SR) in dropdown
- [x] Clear selection option ("No tee specified")
- [x] Loading state while fetching

### 2.2 Add React Query Hook for Course Tees (if not exists)

**File**: `frontend/src/api/courses.ts`

- [x] Check if `useCourseTees(courseId)` exists - **Already existed**
- [x] Hook fetches `GET /api/courses/:id/tees`
- [x] Includes tee name, color, ratings in response

### 2.3 Update Competitions.tsx Form

**File**: `frontend/src/views/admin/Competitions.tsx`

- [x] Import TeeSelector component
- [x] Add tee_id to form state
- [x] Reset tee_id when course changes
- [x] Include tee_id in create/update API calls
- [x] Show selected tee in competition list

### 2.4 Display Tee Info in Competition List

- [x] Show tee name next to course info in list (using TeeDisplay helper)
- [x] Tee color indicator via green Flag icon
- [x] Handle null tee gracefully (no display when unset)

### 2.5 Update API Types

**File**: `frontend/src/api/competitions.ts`

- [x] Add `tee_id` to `Competition` interface
- [x] Add `tee_id` to `CreateCompetitionDto`
- [x] Add `tee_id` to `UpdateCompetitionDto`
- [x] Add `tour_id` to DTOs (was missing)

## Verification

- [x] Can select a tee when creating competition
- [x] Tee dropdown only shows tees for selected course
- [x] Tee selection resets when course changes
- [x] Can edit existing competition and change tee
- [x] Can clear tee selection
- [x] Backend validates tee belongs to course (existing validation)
- [x] TypeScript compilation passes
- [x] Existing competitions without tee still work

## API Endpoints Used

```
GET /api/courses/:id/tees - List tees for a course
POST /api/competitions - Create with tee_id
PUT /api/competitions/:id - Update with tee_id
```

## Dependencies

- Phase 1 (CourseSelector component) - Completed

## Files Modified

```
frontend/src/components/admin/competition/TeeSelector.tsx (new)
frontend/src/components/admin/competition/index.ts (add export)
frontend/src/views/admin/Competitions.tsx (add tee selection)
frontend/src/api/competitions.ts (add tee_id types)
```

## Implementation Notes

- TeeSelector uses color indicators matching course tee colors
- Supports both legacy ratings and new gender-specific ratings
- TeeDisplay helper component in Competitions.tsx fetches tee info lazily
- React Query caches course tees, so multiple TeeDisplay components for same course share data
- Tee selection is optional (backward compatible with existing competitions)
