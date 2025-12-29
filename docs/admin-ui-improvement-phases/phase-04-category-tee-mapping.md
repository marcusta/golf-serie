# Phase 4: Category-to-Tee Mapping for Tours

**Status**: COMPLETED
**Goal**: Allow different tee boxes for different player categories in tour competitions

## Background

Tours have categories (e.g., "Men 0-12", "Men 12-24", "Women") and each category may play from a different tee box. For example:
- Men 0-12 → White tees
- Men 12-24 → Yellow tees
- Women → Red tees

This requires a new database table and UI for mapping categories to tees per competition.

## Database Schema

### New Table: competition_category_tees

```sql
CREATE TABLE competition_category_tees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES tour_categories(id) ON DELETE CASCADE,
  tee_id INTEGER NOT NULL REFERENCES course_tees(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(competition_id, category_id)
);

CREATE INDEX idx_competition_category_tees_competition
  ON competition_category_tees(competition_id);
```

## Tasks

### 4.1 Create Database Migration ✅

**File**: `src/database/migrations/035_add_competition_category_tees.ts`

- [x] Create `competition_category_tees` table
- [x] Add index on `competition_id`
- [x] Test migration runs successfully

### 4.2 Create TypeScript Types ✅

**File**: `src/types/index.ts`

```typescript
interface CompetitionCategoryTee {
  id: number;
  competition_id: number;
  category_id: number;
  category_name?: string;
  tee_id: number;
  tee_name?: string;
  tee_color?: string;
}
```

- [x] Add interface to types file
- [x] Export from index

### 4.3 Create CompetitionCategoryTeeService ✅

**File**: `src/services/competition-category-tee.service.ts`

```typescript
class CompetitionCategoryTeeService {
  getByCompetition(competitionId: number): CompetitionCategoryTee[]
  setForCompetition(competitionId: number, mappings: {categoryId: number, teeId: number}[]): void
  deleteForCompetition(competitionId: number): void
  getTeeForCategory(competitionId: number, categoryId: number): number | null
}
```

Features:
- [x] Get all category-tee mappings for a competition
- [x] Set/replace all mappings for a competition (upsert pattern)
- [x] Delete all mappings when competition deleted (handled by CASCADE)
- [x] Join with category names and tee info for display

### 4.4 Add API Endpoints ✅

**File**: `src/api/competition-category-tees.ts`

```
GET  /api/competitions/:id/category-tees    - Get category-tee mappings
PUT  /api/competitions/:id/category-tees    - Set category-tee mappings
```

- [x] Get endpoint returns mappings with names
- [x] Put endpoint accepts array of {categoryId, teeId}
- [x] Validate competition belongs to a tour
- [x] Validate categories belong to the tour
- [x] Validate tees belong to the competition's course

### 4.5 Write Backend Tests ✅

**File**: `tests/competition-category-tee.test.ts`

- [x] Service tests for CRUD operations (16 tests)
- [x] API tests for endpoints (7 tests)
- [x] Validation tests (wrong category, wrong tee, etc.)
- [x] Cascade delete tests

### 4.6 Add React Query Hooks ✅

**File**: `frontend/src/api/competitions.ts`

```typescript
useCompetitionCategoryTees(competitionId: number)
useSetCompetitionCategoryTees()
```

- [x] Query hook for fetching mappings
- [x] Mutation hook for updating mappings
- [x] Invalidate on mutation success

### 4.7 Create CategoryTeeAssignment Component ✅

**File**: `frontend/src/components/admin/competition/CategoryTeeAssignment.tsx`

```typescript
interface CategoryTeeAssignmentProps {
  tourId: number;
  courseId: number | null;
  mappings: CategoryTeeMapping[];
  onChange: (mappings: CategoryTeeMapping[]) => void;
  disabled?: boolean;
}
```

Features:
- [x] Fetch tour categories
- [x] Fetch course tees (when course selected)
- [x] Grid/table showing category → tee dropdown
- [ ] "Apply default to all" button (deferred - not essential)
- [x] Visual indicators for unassigned categories (uses "Use default tee" option)
- [x] Disabled when no course selected

### 4.8 Integrate into TourCompetitionModal ✅

**File**: `frontend/src/components/admin/tour/TourCompetitionModal.tsx`

- [x] Add CategoryTeeAssignment component
- [x] Track category-tee mappings in form state
- [x] Save mappings after competition created/updated
- [x] Load existing mappings when editing

### 4.9 Show Category-Tee Summary in List

**File**: `frontend/src/components/admin/tour/TourCompetitionList.tsx`

- [ ] Fetch category-tee mappings for each competition (deferred - optional enhancement)
- [ ] Show summary (e.g., "3 categories configured")
- [ ] Tooltip or expandable with full mapping

## Verification

- [x] Migration creates table successfully
- [x] Can set category-tee mappings via API
- [x] Can retrieve mappings with category/tee names
- [x] Validation prevents invalid mappings
- [x] UI shows all tour categories
- [x] Can assign different tee to each category
- [x] Mappings saved when creating competition
- [x] Mappings loaded when editing competition
- [x] Cascade delete works (competition deleted → mappings deleted)
- [x] All backend tests pass (23 tests)
- [x] Frontend builds successfully

## API Request/Response Examples

### GET /api/competitions/:id/category-tees

```json
{
  "categoryTees": [
    {
      "id": 1,
      "competition_id": 5,
      "category_id": 1,
      "category_name": "Men 0-12",
      "tee_id": 2,
      "tee_name": "White",
      "tee_color": "#FFFFFF"
    },
    {
      "id": 2,
      "competition_id": 5,
      "category_id": 2,
      "category_name": "Men 12-24",
      "tee_id": 1,
      "tee_name": "Yellow",
      "tee_color": "#FFFF00"
    }
  ]
}
```

### PUT /api/competitions/:id/category-tees

```json
{
  "mappings": [
    { "categoryId": 1, "teeId": 2 },
    { "categoryId": 2, "teeId": 1 },
    { "categoryId": 3, "teeId": 3 }
  ]
}
```

## Dependencies

- Phase 1 (Shared components)
- Phase 2 (TeeSelector)
- Phase 3 (TourCompetitionModal)

## Files Created/Modified

```
src/database/migrations/035_add_competition_category_tees.ts (new)
src/database/db.ts (modify - add migration import)
src/services/competition-category-tee.service.ts (new)
src/api/competition-category-tees.ts (new)
src/app.ts (modify - add routes)
src/types/index.ts (modify)
tests/competition-category-tee.test.ts (new)
frontend/src/api/competitions.ts (modify - add hooks and types)
frontend/src/components/admin/competition/CategoryTeeAssignment.tsx (new)
frontend/src/components/admin/competition/index.ts (modify - add export)
frontend/src/components/admin/tour/TourCompetitionModal.tsx (modify)
```

## UI Mockup

```
┌─────────────────────────────────────────────────────────────┐
│ Category Tee Assignment                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Assign tee boxes for each player category:                  │
│                                                             │
│ ┌───────────────────┬───────────────────────────────────┐   │
│ │ Category          │ Tee Box                           │   │
│ ├───────────────────┼───────────────────────────────────┤   │
│ │ Men 0-12          │ [⚪ White - CR 70.1 / SR 125  ▼]  │   │
│ │ Men 12-24         │ [🟡 Yellow - CR 68.2 / SR 121 ▼]  │   │
│ │ Women             │ [🔴 Red - CR 65.4 / SR 118    ▼]  │   │
│ └───────────────────┴───────────────────────────────────┘   │
│                                                             │
│ [Apply Yellow to all]                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Notes

- Categories come from tour, not competition
- Tees come from selected course
- Unassigned categories should fall back to competition's default tee
- Consider showing handicap recommendations for tee selection
