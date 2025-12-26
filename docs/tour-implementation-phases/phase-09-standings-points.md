# Phase 9: Tour Standings & Points

**Status**: COMPLETE (2025-12-24)
**Goal**: Complete the standings calculation for tours

## Tasks
- [x] 9.1 Implement proper `TourService.getStandings()`:
  - Aggregate player results across tour competitions
  - Calculate points using point_template or default formula
  - Handle ties appropriately
- [x] 9.2 Add point_template_id to tours table (optional)
- [x] 9.3 Create standings display component
- [x] 9.4 Write tests for standings calculation

## Implementation Notes

**Database migration created:**
- `src/database/migrations/026_add_tour_point_template.ts` - Adds `point_template_id` to tours table

**Backend files modified:**
- `src/services/tour.service.ts` - Complete rewrite with proper standings calculation
  - Added `getFullStandings()` for detailed competition breakdown per player
  - Calculates points using point template or default formula
  - Handles ties properly
  - Aggregates across multiple competitions
  - Only counts finished players (is_locked and valid scores)
- `src/api/tours.ts` - Updated standings endpoint to return full standings by default
  - Supports `?format=simple` query param for backward compatibility
- `src/types/index.ts` - Added `TourStandings`, `TourPlayerStanding` interfaces

**Backend tests created:**
- `tests/tour-standings.test.ts` - 14 comprehensive tests covering:
  - Empty tour scenarios
  - Single competition standings
  - Multiple competition aggregation
  - Tie handling
  - Point template usage
  - Default formula calculation
  - Manual scores support
  - Competition breakdown details
  - Legacy method compatibility

**Frontend files created:**
- `frontend/src/views/player/TourStandings.tsx` - Full standings page with:
  - Top 3 performers highlight cards
  - Expandable player details with competition breakdown
  - Score relative to par display
  - Share and export functionality
  - Loading and error states
- Added `useTourStandings()` hook to `frontend/src/api/tours.ts`
- Added standings link to `TourDetail.tsx` quick access cards
- Added route `/player/tours/$tourId/standings` to router.tsx

**Points calculation:**
- With point template: Uses custom points_structure (e.g., "1": 100, "2": 75, "default": 10)
- Default formula: 1st = N+2, 2nd = N, 3rd+ = N-(pos-1), min 0 (where N = number of enrolled players)

**Verification:**
- All 33 tour-related tests pass (14 standings + 19 existing)
- Frontend builds successfully
- No TypeScript errors
