# Phase 3: Tour Inline Competition Management

**Status**: COMPLETED
**Goal**: Enable creating/editing competitions directly within TourDetail without navigating away
**Completed**: 2025-12-29

## Background

Currently, the Competitions tab in TourDetail shows a list and an "Add Competition" button that navigates to `/admin/competitions?tour={tourId}`. This breaks the user's context and is confusing.

## Current Flow (Problem) - FIXED

```
TourDetail → Click "Add Competition" → Navigate to Competitions page →
Create competition → Need to navigate back to Tour
```

## Target Flow (Solution) - IMPLEMENTED

```
TourDetail → Click "Add Competition" → Modal opens →
Create competition → Modal closes → List updates
```

## Tasks

### 3.1 Create TourCompetitionList Component

**File**: `frontend/src/components/admin/tour/TourCompetitionList.tsx`

```typescript
interface TourCompetitionListProps {
  tourId: number;
  onEdit: (competition: TourCompetition) => void;
  onDelete: (competition: TourCompetition) => void;
}
```

Features:
- [x] Fetch competitions for tour using existing hook
- [x] Display competition cards with name, date, course, tee
- [x] Edit and delete action buttons
- [x] Empty state with helpful message
- [x] Loading state (handled by parent)

### 3.2 Create TourCompetitionModal Component

**File**: `frontend/src/components/admin/tour/TourCompetitionModal.tsx`

```typescript
interface TourCompetitionModalProps {
  tourId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competition?: Competition; // If provided, edit mode
  onSuccess?: () => void;
}
```

Features:
- [x] Modal dialog component
- [x] Create and edit modes
- [x] Form fields: name, date, course, tee, points multiplier, venue type, start mode
- [x] Course selection → Tee selection flow (resets tee when course changes)
- [x] Basic validation (name, date, course required)
- [x] Submit creates/updates via API
- [x] Close on success, show errors inline
- [x] Invalidates tour-competitions query on success

### 3.3 Update TourDetail Competitions Tab

**File**: `frontend/src/views/admin/TourDetail.tsx`

- [x] Replace link-based "Add Competition" with modal trigger
- [x] Add state for modal open/close
- [x] Add state for editing competition
- [x] Replace current list with TourCompetitionList
- [x] Wire up edit/delete handlers
- [x] Invalidate queries on mutation success

### 3.4 Add Delete Confirmation

- [x] Confirmation dialog before delete (using native confirm)
- [x] Show competition name in confirmation
- [x] Handle delete via existing useDeleteCompetition mutation

### 3.5 Create React Query Mutations (if needed)

**File**: `frontend/src/api/competitions.ts`

- [x] `useCreateCompetition` mutation exists
- [x] `useUpdateCompetition` mutation exists
- [x] `useDeleteCompetition` mutation exists
- [x] Manual invalidation of tour-competitions query added in modal

## Verification

- [x] Can open "Add Competition" modal from TourDetail
- [x] Modal shows all required fields
- [x] Can select course and tee
- [x] Competition created successfully
- [x] List updates after creation (no page refresh)
- [x] Can edit existing competition via modal
- [x] Can delete competition with confirmation
- [x] Never navigates away from TourDetail
- [x] TypeScript compilation passes
- [x] Modal is responsive

## API Endpoints Used

```
GET /api/tours/:id/competitions - List tour competitions
GET /api/competitions/:id - Get full competition for editing
POST /api/competitions - Create competition (with tour_id)
PUT /api/competitions/:id - Update competition
DELETE /api/competitions/:id - Delete competition
```

## Dependencies

- Phase 1 (Shared components) - Completed
- Phase 2 (TeeSelector) - Completed

## Files Created/Modified

```
frontend/src/components/admin/tour/TourCompetitionList.tsx (new)
frontend/src/components/admin/tour/TourCompetitionModal.tsx (new)
frontend/src/components/admin/tour/index.ts (new)
frontend/src/views/admin/TourDetail.tsx (modified)
```

## Implementation Notes

- Modal uses inline dialog pattern consistent with existing Document and Category dialogs
- TourCompetitionList uses TeeDisplay helper to show tee info
- useCompetition hook used to fetch full competition data when editing (TourCompetition type is lighter)
- Query invalidation done via queryClient.invalidateQueries in modal
- Delete confirmation uses native browser confirm() for simplicity
- Form validation is inline (no external validation library)

## Next Steps

Phase 4 will add category-to-tee mapping, allowing different categories to use different tees for the same competition.
