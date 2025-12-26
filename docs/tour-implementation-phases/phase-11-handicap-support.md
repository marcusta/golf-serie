# Phase 11: Handicap Support

**Status**: PARTIALLY COMPLETE (2025-12-25)
**Goal**: Allow tours to use gross, net, or both scoring modes

## Background
Golf handicaps allow players of different skill levels to compete fairly. Net score = Gross score - Handicap strokes (distributed across holes based on stroke index).

**Swedish/WHS System:**
- Players have a **Handicap Index** (e.g., 15.4)
- Courses have **Course Rating** (CR) and **Slope Rating** (SR)
- **Course Handicap** = Handicap Index x (Slope Rating / 113) + (Course Rating - Par)
- Course handicap is then distributed to holes based on stroke index

## Database Changes

```sql
-- Add scoring mode to tours
ALTER TABLE tours ADD COLUMN scoring_mode TEXT NOT NULL DEFAULT 'gross';
  -- 'gross': Raw scores only (current behavior)
  -- 'net': Net scores only (gross - handicap)
  -- 'both': Track and display both, points can be awarded for either

-- Tee boxes table (each course has multiple tee sets with different ratings)
CREATE TABLE course_tees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,              -- "Championship", "Men", "Ladies", "Senior"
  color TEXT,                       -- "white", "yellow", "red", "blue"
  course_rating REAL NOT NULL,      -- CR - expected score for scratch golfer
  slope_rating INTEGER NOT NULL DEFAULT 113,  -- SR - relative difficulty 55-155
  stroke_index TEXT,                -- JSON array [1-18] hole difficulty order
  pars TEXT,                        -- JSON array of pars (if different from course default)
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(course_id, name)
);

-- Link competitions to specific tee box
ALTER TABLE competitions ADD COLUMN tee_id INTEGER REFERENCES course_tees(id);

-- Track playing handicap per enrollment (may differ from profile handicap)
ALTER TABLE tour_enrollments ADD COLUMN playing_handicap REAL;
```

## Completed Tasks

### Backend - Database
- [x] 11.1 Create migration 027 for `scoring_mode` on tours
- [x] 11.2 Create migration 028 for `course_tees` table
- [x] 11.3 Create migration 029 for `tee_id` on competitions
- [x] 11.4 Create migration 030 for `playing_handicap` on tour_enrollments
- [x] 11.5 Add TypeScript types

### Backend - Handicap Utilities
- [x] 11.6 Create `src/utils/handicap.ts` with calculation functions
- [x] 11.7 Write comprehensive tests for handicap calculations (36 tests)

### Backend - Services & API
- [x] 11.8 Create `CourseTeeService` with CRUD operations
- [x] 11.9 Add tee box API endpoints
- [x] 11.10 Update competition create/update to accept `tee_id`
- [x] 11.11 Update `TourService.getFullStandings()` to include scoring_mode

### Frontend Admin
- [x] 11.14 Add scoring_mode selector in tour create/edit form
- [x] 11.15 Create tee box management UI for courses

## Remaining Tasks (Deferred)
- [ ] 11.12 Update competition leaderboard API to return both gross and net when applicable
- [ ] 11.13 Add player handicap update endpoint
- [ ] 11.16 Add tee box selector in competition create/edit form
- [ ] 11.17 Add playing_handicap field in enrollment management
- [ ] 11.18-11.24 Frontend player handicap display features

## Implementation Notes

**Database migrations created:**
- `src/database/migrations/027_add_tour_scoring_mode.ts`
- `src/database/migrations/028_add_course_tees.ts`
- `src/database/migrations/029_add_competition_tee_id.ts`
- `src/database/migrations/030_add_enrollment_playing_handicap.ts`

**Backend files created:**
- `src/utils/handicap.ts` - Comprehensive handicap calculation utilities:
  - `calculateCourseHandicap()` - WHS formula implementation
  - `distributeHandicapStrokes()` - Distributes handicap strokes to holes
  - `calculateNetScores()` - Per-hole net score calculation
  - `calculateNetTotal()` - Simple total calculation
  - `calculateFullNetScoreResult()` - Combined calculation
  - `getDefaultStrokeIndex()` - Standard 1-18 stroke index
- `src/services/course-tee.service.ts` - Full CRUD service with validation

**Backend files modified:**
- `src/api/courses.ts` - Added 5 new tee box endpoints
- `src/services/competition-service.ts` - Added tee_id validation
- `src/services/tour.service.ts` - Added scoring_mode handling
- `src/types/index.ts` - Added CourseTee, TourScoringMode interfaces

**Backend tests created:**
- `tests/handicap-utils.test.ts` - 36 comprehensive tests
- `tests/course-tees.test.ts` - 30 tests for CourseTeeService and API

**Frontend files modified:**
- `frontend/src/api/tours.ts` - Added TourScoringMode type
- `frontend/src/api/courses.ts` - Added CourseTee types and CRUD hooks
- `frontend/src/views/admin/Tours.tsx` - Added scoring_mode selector
- `frontend/src/views/admin/TourDetail.tsx` - Added scoring_mode in Settings
- `frontend/src/views/admin/Courses.tsx` - Added tee box management dialog

**Verification:**
- All 36 handicap utility tests pass
- All 30 course tee tests pass
- All 14 tour standings tests pass
- Frontend TypeScript compilation passes
