# Phase 13: Tee Box Gender-Specific Ratings

**Status**: COMPLETE (2025-12-25)
**Goal**: Fix data model to support gender-specific course ratings per tee box

## Background
In the World Handicap System (WHS), the **same physical tee box** has different ratings depending on the gender of the player:

**Example - Landeryd Classic Yellow Tees:**
| Gender | Course Rating | Slope Rating |
|--------|---------------|--------------|
| Men | 67.2 | 118 |
| Women | 69.5 | 122 |

This is because women typically have shorter driving distances, making the same course relatively longer/harder for them.

## Schema Solution

Chose Option B (separate ratings table) for flexibility and normalization:

```sql
CREATE TABLE course_tee_ratings (
  id INTEGER PRIMARY KEY,
  tee_id INTEGER NOT NULL REFERENCES course_tees(id) ON DELETE CASCADE,
  gender TEXT NOT NULL,          -- 'men', 'women'
  course_rating REAL NOT NULL,
  slope_rating INTEGER NOT NULL,
  UNIQUE(tee_id, gender)
);
```

## Completed Tasks
- [x] 13.1 Decide on schema approach - Chose Option B
- [x] 13.2 Create migration for course_tee_ratings table
- [x] 13.3 Update CourseTeeService to handle gender-specific ratings
- [x] 13.4 Update tee box API endpoints
- [x] 13.5 Update handicap calculation for gender-based CR/SR
- [x] 13.6 Update frontend tee box management UI for dual ratings
- [x] 13.7 Update existing tee box data with correct gender-specific ratings
- [x] 13.8 Write tests for gender-specific handicap calculations

## Implementation Notes

**Database migration created:**
- `src/database/migrations/033_add_course_tee_ratings.ts` - Creates table, migrates existing data to men's ratings

**Backend files modified:**
- `src/services/course-tee.service.ts` - Added 7 rating methods:
  - `getRatingsForTee(teeId)`, `getRatingByGender(teeId, gender)`
  - `upsertRating(teeId, data)`, `updateRating(id, data)`
  - `deleteRating(id)`, `deleteRatingByGender(teeId, gender)`
  - Updated `create()` to accept ratings array
- `src/api/courses.ts` - Added 5 new rating endpoints
- `src/utils/handicap.ts` - Added gender-based calculation utilities:
  - `getRatingForGender(ratings, gender, fallbackCR?, fallbackSR?)`
  - `calculateFullHandicapWithGender(handicapIndex, ratings, gender, par, strokeIndex)`
- `src/types/index.ts` - Added types:
  - `TeeRatingGender = "men" | "women"`
  - `CourseTeeRating`, `CreateCourseTeeRatingDto`, `UpdateCourseTeeRatingDto`

**Backend tests created:**
- `tests/course-tee-ratings.test.ts` - 24 tests for service and handicap utilities
- `tests/course-tee-ratings-api.test.ts` - 18 tests for API endpoints

**Frontend files modified:**
- `frontend/src/api/courses.ts` - Added types and hooks:
  - `useCourseTeeRatings(courseId, teeId)`
  - `useUpsertCourseTeeRating()`, `useDeleteCourseTeeRating()`
- `frontend/src/views/admin/Courses.tsx` - Updated tee management UI:
  - Separate Men's and Women's rating sections
  - Checkbox toggle to include women's rating
  - Displays both ratings in tee list

**Verification:**
- All 42 new tests pass (24 service + 18 API)
- All 30 existing course tee tests pass
- Frontend TypeScript compilation passes
- Backward compatible: legacy columns preserved
