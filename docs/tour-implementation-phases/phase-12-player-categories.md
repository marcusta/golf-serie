# Phase 12: Player Categories/Classes

**Status**: COMPLETE (2025-12-25)
**Goal**: Support different player groups within a tour, each with separate standings

## Background
Tours often need to segment players into categories for fairer competition:
- Gender: Men's, Women's
- Age: Seniors (55+), Juniors (under 18)
- Handicap ranges: A-Class (0-12), B-Class (13-24), C-Class (25+)
- Mixed: "Senior Women", "Junior Boys", etc.

Each category has its own leaderboard and points calculation, but all play the same competitions.

## Database Changes

```sql
-- Tour categories table
CREATE TABLE tour_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tour_id INTEGER NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tour_id, name)
);

-- Add category to enrollments
ALTER TABLE tour_enrollments ADD COLUMN category_id INTEGER REFERENCES tour_categories(id) ON DELETE SET NULL;
```

## Completed Tasks

### Backend
- [x] 12.1 Create migration 031 for `tour_categories` table
- [x] 12.2 Create migration 032 for `category_id` on tour_enrollments
- [x] 12.3 Add TypeScript types
- [x] 12.4 Create `TourCategoryService`
- [x] 12.5 Add category API endpoints
- [x] 12.6 Update enrollment endpoints to accept/return category_id
- [x] 12.7 Update `TourService.getFullStandings()` with category filter
- [x] 12.8 Update standings API with category parameter
- [x] 12.9 Write tests (46 tests total)

### Frontend Admin
- [x] 12.10 Add Categories tab in tour admin detail
- [x] 12.11 Category management UI (create/edit/delete/reorder)
- [x] 12.12 Add category selector in enrollment management
- [x] 12.13 Bulk category assignment

### Frontend Player
- [x] 12.14 Update TourStandings with category tabs/filter

## Deferred Tasks
- [ ] 12.15 Show category name on player cards in standings
- [ ] 12.16 Update TourDetail to show categories overview
- [ ] 12.17 Competition leaderboard category filter

## Implementation Notes

**Database migrations created:**
- `src/database/migrations/031_add_tour_categories.ts`
- `src/database/migrations/032_add_enrollment_category.ts`

**Backend files created/modified:**
- `src/services/tour-category.service.ts` - Full CRUD service with:
  - `create`, `update`, `delete`, `findById`, `findByTour`
  - `reorder(tourId, categoryIds)` - Update sort order
  - `assignToEnrollment`, `bulkAssign`, `getEnrollmentsByCategory`
- `src/api/tours.ts` - Added 7 new category endpoints
- `src/services/tour-enrollment.service.ts` - Include category_name via JOIN
- `src/services/tour.service.ts` - Updated `getFullStandings()` with categoryId filter
- `src/types/index.ts` - Added TourCategory types

**Backend tests created:**
- `tests/tour-category-service.test.ts` - 27 tests
- `tests/tour-api-categories.test.ts` - 19 tests

**Frontend files modified:**
- `frontend/src/api/tours.ts` - Added 8 React Query hooks for categories
- `frontend/src/views/admin/TourDetail.tsx` - Added Categories tab
- `frontend/src/views/player/TourStandings.tsx` - Added category filter tabs

**Key implementation details:**
- Route ordering fix: `/categories/reorder` before `/:categoryId`
- Category deletion sets `category_id` to NULL on enrollments
- Standings returns `categories` array with `selected_category_id`
- Player standings include `category_id` and `category_name`

**Verification:**
- All 46 new category tests pass
- All 550+ backend tests pass
- Frontend TypeScript compilation passes
