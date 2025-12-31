# Backend Refactoring Plan

**Created:** 2025-12-31
**Updated:** 2025-12-31
**Goal:** Refactor backend services to comply with new code quality rules in CLAUDE.md
**Safety Net:** 670+ integration tests must pass after each change

---

## Core Rule Reminder

> Within a service, a method contains EITHER a single SQL query OR business logic - never both.

**Method Categories:**
- **Query Methods** (private): Single SQL query, prefix `find*`, `get*`, `insert*`, `update*`, `delete*`
- **Logic Methods** (private): Pure business logic, no SQL, prefix `validate*`, `calculate*`, `build*`, `transform*`
- **Public API Methods**: Orchestration only - calls query and logic methods

---

## Principles

1. **Tests are the safety net** - Run `bun test` after every change
2. **One service at a time** - Never refactor multiple services in parallel
3. **Additive first** - Create new code before modifying existing code
4. **Behavior-preserving** - No functional changes during restructuring
5. **Bottom-up extraction** - Start with deepest/most isolated logic

---

## Phase 0: Foundation (Zero Risk)

Create supporting infrastructure before touching existing code.

### Step 0.1: Create Golf Constants
- [x] Create `src/constants/golf.ts`
- [x] Export `GOLF` object with all domain constants
- [x] Run tests: `bun test`

### Step 0.2: Create Parsing Utilities
- [x] Create `src/utils/parsing.ts`
- [x] Add `safeParseJson<T>()` utility
- [x] Add `parseScoreArray()` utility
- [x] Add `parseParsArray()` utility
- [x] Run tests: `bun test`

### Step 0.3: Verify Baseline
- [x] Run full test suite: `bun test` (677 pass, 1 skip - Playwright tests excluded)
- [x] Run type check: `bun run type-check` (new files pass, pre-existing issues in tests)
- [ ] Run linter: `bun run lint`
- [x] Phase 0 complete - foundation files created

---

## Phase 1: Simple Services

### 1.1 TeamService (`src/services/team-service.ts`)
**Complexity:** Low (~106 lines after refactoring)
**Tests:** `tests/teams.test.ts`

#### Completed (Type Safety Pass)
- [x] Fix `any` types - Fixed `values: any[]` to `values: (string | number)[]`

#### Completed (Method Separation) - 2025-12-31

**`create()` refactored:**
- [x] Extract `validateTeamName(name: string): void`
- [x] Extract `insertTeam(name: string): Team` (single INSERT query)
- [x] Extract `translateUniqueConstraintError(error: Error): Error`
- [x] Refactor `create()` to orchestration only

**`update()` refactored:**
- [x] Extract `validateTeamUpdate(data: UpdateTeamDto): void`
- [x] Extract `updateTeamRow(id: number, name: string): Team | null` (single UPDATE query)
- [x] Refactor `update()` to orchestration only

- [x] Run tests: `bun test tests/teams.test.ts` - 16 pass
- [x] Run full suite: `bun test`

---

### 1.2 DocumentService (`src/services/document-service.ts`)
**Complexity:** Low (~202 lines after refactoring)
**Tests:** `tests/documents.test.ts`

#### Completed (Type Safety Pass)
- [x] Fix `any` types - Fixed `values: any[]` to `values: (string | number)[]`

#### Completed (Method Separation) - 2025-12-31

**Logic methods extracted:**
- [x] Extract `validateCreateDocumentData(data: CreateDocumentDto): void`
- [x] Extract `validateUpdateDocumentData(data: UpdateDocumentDto): void`
- [x] Extract `extractTypes(rows: { type: string }[]): string[]`

**Query methods extracted:**
- [x] Extract `findSeriesExists(id: number): boolean`
- [x] Extract `insertDocument(data: CreateDocumentDto): Document`
- [x] Extract `findDocumentsBySeries(seriesId: number): Document[]`
- [x] Extract `findDocumentsBySeriesAndType(seriesId: number, type: string): Document[]`
- [x] Extract `findDistinctTypesBySeries(seriesId: number): { type: string }[]`
- [x] Extract `updateDocumentRow(id, title, content, type): Document`
- [x] Extract `deleteDocumentRow(id: number): void`

**Public methods refactored to orchestration:**
- [x] `create()` - validation, series check, insert
- [x] `findBySeriesId()` - series check, query
- [x] `findBySeriesIdAndType()` - series check, query
- [x] `update()` - find existing, validation, merge fields, update
- [x] `delete()` - find existing, delete
- [x] `getDocumentTypes()` - series check, query, extract

- [x] Run tests: `bun test tests/documents.test.ts` - 22 pass
- [x] Run full suite: `bun test`

---

### 1.3 PointTemplateService (`src/services/point-template.service.ts`)
**Complexity:** Low (~144 lines after refactoring)
**Tests:** `tests/point-templates.test.ts`

#### Completed (Type Safety Pass)
- [x] Fix `any` types - Fixed `values: any[]` to `values: (string | number)[]`
- [x] Add safe JSON parsing - Using `safeParseJson()` for points_structure

#### Completed (Method Separation) - 2025-12-31

**Logic methods extracted:**
- [x] Extract `getPointsForPosition(structure: PointsStructure, position: number): number`

**Query methods extracted:**
- [x] Extract `insertPointTemplate(name, pointsStructureJson, createdBy): PointTemplate`
- [x] Extract `updatePointTemplateRow(id, name, pointsStructureJson): PointTemplate`

**Public methods refactored to orchestration:**
- [x] `create()` - serialize JSON, insert
- [x] `update()` - check exists, merge fields, update
- [x] `calculatePoints()` - get template, parse JSON, call logic method

- [x] Run tests: `bun test tests/point-templates.test.ts` - 17 pass
- [x] Run full suite: `bun test`

---

## Phase 2: Medium Services

### 2.1 CourseService (`src/services/course-service.ts`)
**Complexity:** Medium (~185 lines after refactoring)
**Tests:** `tests/courses.test.ts`

#### Completed (Constants & Parsing Pass)
- [x] Replace `18` with `GOLF.HOLES_PER_ROUND`
- [x] Replace par range checks with `GOLF.MIN_PAR`, `GOLF.MAX_PAR`
- [x] Fix `any` types - Fixed `values: any[]` to `values: (string | number)[]`
- [x] Add defensive JSON parsing - Using `parseParsArray()` for all pars

#### Completed (Method Separation) - 2025-12-31

**Logic methods extracted:**
- [x] Extract `calculatePars(pars: number[]): ParsData`
- [x] Extract `transformCourseRow(row: CourseRow): Course`
- [x] Extract `validateCourseName(name: string): void`
- [x] Extract `validateCourseNameNotEmpty(name: string): void`
- [x] Extract `validateParsArray(pars: number[]): void`

**Query methods extracted:**
- [x] Extract `insertCourseRow(name: string): CourseRow`
- [x] Extract `findAllCourseRows(): CourseRow[]`
- [x] Extract `findCourseRowById(id: number): CourseRow | null`
- [x] Extract `updateCourseNameRow(id: number, name: string): CourseRow`
- [x] Extract `updateCourseParsRow(id: number, pars: number[]): CourseRow`
- [x] Extract `findCompetitionsByCourse(courseId: number): { id: number }[]`
- [x] Extract `deleteCourseRow(id: number): void`

**Public methods refactored to orchestration:**
- [x] `create()` - validation, insert, transform
- [x] `findAll()` - query, transform each
- [x] `findById()` - query, transform
- [x] `update()` - check exists, validation, update, transform
- [x] `updateHoles()` - check exists, validation, update, transform
- [x] `delete()` - check exists, check competitions, delete

- [x] Run tests: `bun test tests/courses.test.ts` - 12 pass
- [x] Run full suite: `bun test`

---

### 2.2 CourseTeeService (`src/services/course-tee.service.ts`)
**Complexity:** High (~548 lines after refactoring) - Originally marked Medium, actually complex
**Tests:** `tests/course-tees.test.ts`, `tests/course-tee-ratings.test.ts`, `tests/course-tee-ratings-api.test.ts`

#### Completed (Constants & Parsing Pass)
- [x] Replace `113` with `GOLF.STANDARD_SLOPE_RATING`
- [x] Replace rating range checks with `GOLF.MIN_COURSE_RATING`, `GOLF.MAX_COURSE_RATING`, `GOLF.MIN_SLOPE_RATING`, `GOLF.MAX_SLOPE_RATING`
- [x] Replace `18` checks with `GOLF.HOLES_PER_ROUND`
- [x] Replace par range checks with `GOLF.MIN_PAR`, `GOLF.MAX_PAR`
- [x] Add defensive JSON parsing - Using `parseStrokeIndex()` and `parseParsArray()`

#### Completed (Method Separation) - 2025-12-31

**Critical fix: `parseRow()` → `transformTeeRow()` (pure, no SQL)**
- [x] Renamed to `transformTeeRow()` - pure transformation, no SQL calls
- [x] Ratings loading now explicit in each public method

**Logic methods extracted:**
- [x] `transformTeeRow(row: CourseTeeRow): CourseTee`
- [x] `transformRatingRow(row: CourseTeeRatingRow): CourseTeeRating`
- [x] `validateRatingGender(gender: string): void`
- [x] `validateCourseRating(courseRating: number): void`
- [x] `validateSlopeRating(slopeRating: number): void`
- [x] `validateTeeName(name: string): void`
- [x] `validateTeeNameNotEmpty(name: string): void`
- [x] `validateStrokeIndexArray(strokeIndex: number[]): void`
- [x] `validateParsArray(pars: number[]): void`
- [x] `validateRatingsArray(ratings: CreateCourseTeeRatingDto[]): void`
- [x] `determineCourseAndSlopeRating(data: CreateCourseTeeDto): { courseRating, slopeRating }`

**Query methods extracted:**
- [x] `findTeeRowById(id: number): CourseTeeRow | null`
- [x] `findTeeRowsByCourse(courseId: number): CourseTeeRow[]`
- [x] `findRatingRowsByTee(teeId: number): CourseTeeRatingRow[]`
- [x] `findRatingRowById(id: number): CourseTeeRatingRow | null`
- [x] `findRatingRowByGender(teeId, gender): CourseTeeRatingRow | null`
- [x] `findCourseExists(courseId: number): boolean`
- [x] `findDuplicateTee(courseId, name): boolean`
- [x] `findDuplicateTeeExcluding(courseId, name, excludeId): boolean`
- [x] `findCompetitionsByTee(teeId: number): { id: number }[]`
- [x] `insertTeeRow(...): CourseTeeRow`
- [x] `upsertRatingRow(...): CourseTeeRatingRow`
- [x] `updateRatingRow(...): CourseTeeRatingRow`
- [x] `updateTeeRow(...): CourseTeeRow`
- [x] `deleteRatingRow(id: number): void`
- [x] `deleteRatingRowByGender(teeId, gender): void`
- [x] `deleteTeeRow(id: number): void`
- [x] `findTeeRowsByCourseWithDetails(courseId): (CourseTeeRow & { course_name })`

**Public methods refactored to orchestration:**
- [x] `getRatingsForTee()` - query, transform each
- [x] `getRatingByGender()` - query, transform
- [x] `getRatingById()` - query, transform
- [x] `upsertRating()` - check tee exists, validation, upsert, transform
- [x] `updateRating()` - check exists, validation, merge, update, transform
- [x] `deleteRating()` - check exists, delete
- [x] `deleteRatingByGender()` - delete
- [x] `findByCourse()` - query rows, transform each, load ratings
- [x] `findById()` - query, transform, load ratings
- [x] `create()` - validations, determine ratings, insert, create ratings, return with ratings
- [x] `update()` - check exists, validations, merge values, update, return with ratings
- [x] `delete()` - check exists, check competitions, delete
- [x] `findByCourseWithDetails()` - query, transform each, load ratings

- [x] Run tests: `bun test tests/course-tees.test.ts tests/course-tee-ratings.test.ts tests/course-tee-ratings-api.test.ts` - 72 pass
- [x] Run full suite: `bun test`

---

### 2.3 TeeTimeService (`src/services/tee-time-service.ts`)
**Complexity:** Medium (~337 lines after refactoring)
**Tests:** `tests/tee-times.test.ts`

#### Completed (Method Separation) - 2025-12-31

**Logic methods extracted:**
- [x] `validateTeeTimeRequired(teetime: string): void`
- [x] `validateTeeTimeNotEmpty(teetime: string): void`
- [x] `validateCreateForVenueType(data, venueType): void`
- [x] `validateUpdateForVenueType(data, venueType): void`
- [x] `transformParticipantRow(row): ParticipantWithTeamRow`
- [x] `transformTeeTimeWithParticipants(teeTimeRow, participantRows): TeeTimeWithParticipants`
- [x] `validateParticipantIds(newOrder, validIds): void`

**Query methods extracted:**
- [x] `findCompetitionVenueInfo(competitionId): CompetitionVenueInfo | null`
- [x] `findCompetitionExists(competitionId): boolean`
- [x] `insertTeeTimeRow(...): TeeTime`
- [x] `findTeeTimeRowsByCompetition(competitionId): TeeTime[]`
- [x] `findTeeTimeRowsWithCourseByCompetition(competitionId): TeeTimeWithCourseRow[]`
- [x] `findTeeTimeRowById(id): TeeTime | null`
- [x] `findTeeTimeRowWithCourse(id): TeeTimeWithCourseRow | null`
- [x] `findParticipantRowsByTeeTime(teeTimeId): ParticipantWithTeamRow[]`
- [x] `findParticipantIdsByTeeTime(teeTimeId): number[]`
- [x] `updateTeeTimeRow(...): TeeTime`
- [x] `deleteTeeTimeRow(id): void`
- [x] `updateParticipantOrderRow(participantId, order): void`

**Public methods refactored to orchestration:**
- [x] `create()` - validation, get venue info, validate for venue type, insert
- [x] `findAllForCompetition()` - check exists, query
- [x] `findAllForCompetitionWithParticipants()` - check exists, query, transform each with participants
- [x] `findById()` - query
- [x] `findByIdWithParticipants()` - query with course, get participants, transform
- [x] `update()` - check exists, validation, get venue info, validate for venue type, merge, update
- [x] `delete()` - check exists, delete
- [x] `updateParticipantsOrder()` - check exists, validate ids, update each, return with participants

**Type safety fixed:**
- [x] Fixed `any[]` type to proper typed interfaces

- [x] Run tests: `bun test tests/tee-times.test.ts` - 15 pass
- [x] Run full suite: `bun test`

---

## Phase 3: Complex Services

### 3.1 ParticipantService (`src/services/participant-service.ts`)
**Complexity:** High
**Tests:** `tests/participants.test.ts`

- [ ] Replace `18` with `GOLF.HOLES_PER_ROUND`
- [ ] Replace `-1` with `GOLF.UNREPORTED_HOLE`
- [ ] Analyze method violations
- [ ] Extract query methods
- [ ] Extract logic methods
- [ ] Add defensive JSON parsing
- [ ] Fix any `any` types
- [ ] Run tests: `bun test tests/participants.test.ts`
- [ ] Run full suite: `bun test`

### 3.2 SeriesService (`src/services/series-service.ts`)
**Complexity:** High (has standings calculation)
**Tests:** `tests/series.test.ts`

- [ ] Analyze method violations
- [ ] Extract query methods
- [ ] Extract standings calculation logic
- [ ] Fix any `any` types (especially `getTeams(): any[]`)
- [ ] Run tests: `bun test tests/series.test.ts`
- [ ] Run full suite: `bun test`

### 3.3 AuthService (`src/services/auth.service.ts`)
**Complexity:** Medium
**Tests:** `tests/auth-auto-enrollment.test.ts`

- [ ] Extract session expiry to named constant
- [ ] Analyze method violations
- [ ] Extract query methods
- [ ] Fix any `any` types
- [ ] Run tests: `bun test tests/auth-auto-enrollment.test.ts`
- [ ] Run full suite: `bun test`

---

## Phase 4: Tour Services

### 4.1 TourService (`src/services/tour.service.ts`)
**Complexity:** Very High (~755 lines, has `getFullStandings()`)
**Tests:** `tests/tours.test.ts`, `tests/tour-standings.test.ts`

- [ ] Replace all magic numbers with `GOLF.*` constants
- [ ] Map `getFullStandings()` structure (document what each section does)
- [ ] Extract query methods:
  - [ ] `findTourById()`
  - [ ] `findCompetitionsForTour()`
  - [ ] `findEnrollmentsForTour()`
  - [ ] `findStoredResults()`
- [ ] Extract logic methods:
  - [ ] `calculatePlayerPoints()`
  - [ ] `rankPlayersByScore()`
  - [ ] `getCompetitionPlayerResults()`
- [ ] Add defensive JSON parsing
- [ ] Fix `getCompetitions(): any[]` return type
- [ ] Run tests: `bun test tests/tours.test.ts tests/tour-standings.test.ts`
- [ ] Run full suite: `bun test`

### 4.2 TourEnrollmentService (`src/services/tour-enrollment.service.ts`)
**Complexity:** Medium
**Tests:** `tests/tour-enrollment-service.test.ts`, `tests/tour-api-enrollments.test.ts`

- [ ] Analyze method violations
- [ ] Extract query methods
- [ ] Fix any `any` types
- [ ] Run tests
- [ ] Run full suite: `bun test`

### 4.3 TourCompetitionRegistrationService
**Complexity:** High
**Tests:** `tests/tour-competition-registration.test.ts`

- [ ] Replace `18` with `GOLF.HOLES_PER_ROUND`
- [ ] Analyze method violations
- [ ] Extract query methods
- [ ] Extract logic methods
- [ ] Fix any `any` types
- [ ] Run tests
- [ ] Run full suite: `bun test`

### 4.4 Other Tour Services
- [ ] `tour-admin.service.ts`
- [ ] `tour-category.service.ts`
- [ ] `tour-document.service.ts`

---

## Phase 5: CompetitionService (The Big One)

**File:** `src/services/competition-service.ts`
**Complexity:** Highest (~1136 lines)
**Critical Method:** `getLeaderboardWithDetails()` (530 lines)
**Tests:** `tests/competitions.test.ts`, `tests/competition-leaderboard-net-scores.test.ts`

### 5.1 Document Current Structure

Before touching code, map what `getLeaderboardWithDetails()` does:

```
Lines 317-330:   Load competition with course
Lines 336-341:   Get scoring mode from tour
Lines 344-399:   Get tee info
Lines 413-427:   Get handicaps from enrollments
Lines 430-450:   Get participants
Lines 453-465:   Get categories
Lines 476-547:   Get category tee ratings
Lines 549-555:   Parse course pars
Lines 563-700:   Calculate leaderboard entries
Lines 703-724:   Sort leaderboard
Lines 727-747:   Build category tees response
Lines 750-833:   Add points for tour competitions
Lines 835-844:   Return response
```

### 5.2 Extract Query Methods (one at a time)

- [ ] `findCompetitionWithCourse(id: number)`
- [ ] `findTourScoringMode(tourId: number)`
- [ ] `findTeeWithRatings(teeId: number)`
- [ ] `findPlayerHandicaps(tourId: number)`
- [ ] `findParticipantsForCompetition(competitionId: number)`
- [ ] `findCategoriesForCompetition(tourId: number, competitionId: number)`
- [ ] `findCategoryTeeRatings(competitionId: number)`
- [ ] `findStoredResults(competitionId: number)`
- [ ] Run tests after EACH extraction

### 5.3 Extract Logic Methods (one at a time)

- [ ] `parseTeeInfo(tee: TeeRow): TeeInfo`
- [ ] `parseStrokeIndex(json: string): number[]`
- [ ] `calculateEntryScore(participant, pars, handicapInfo): LeaderboardEntry`
- [ ] `calculateNetScore(grossScore, handicapStrokes, pars): NetScoreResult`
- [ ] `sortLeaderboard(entries: LeaderboardEntry[]): LeaderboardEntry[]`
- [ ] `calculateProjectedPoints(position, numPlayers, template, multiplier)`
- [ ] `buildLeaderboardResponse(entries, competition, teeInfo, ...)`
- [ ] Run tests after EACH extraction

### 5.4 Refactor Other Methods

- [ ] `create()` - extract validation
- [ ] `update()` - extract dynamic SQL building
- [ ] `getTeamLeaderboard()` - extract team grouping logic
- [ ] `transformLeaderboardToTeamLeaderboard()` - break into smaller methods

### 5.5 Final Verification

- [ ] Run: `bun test tests/competitions.test.ts`
- [ ] Run: `bun test tests/competition-leaderboard-net-scores.test.ts`
- [ ] Run full suite: `bun test`
- [ ] Run type check: `bun run type-check`

---

## Phase 6: Competition Results Service

**File:** `src/services/competition-results.service.ts`
**Tests:** Related competition tests

- [ ] Replace magic numbers with `GOLF.*` constants
- [ ] Analyze method violations
- [ ] Extract query methods
- [ ] Extract calculation logic
- [ ] Run full suite: `bun test`

---

## Phase 7: Player Services

### 7.1 PlayerService (`src/services/player.service.ts`)
- [ ] Analyze method violations
- [ ] Fix any `any` types
- [ ] Extract query methods
- [ ] Run tests

### 7.2 PlayerProfileService (`src/services/player-profile.service.ts`)
- [ ] Replace handicap range with `GOLF.*` constants
- [ ] Replace `72` default par with `GOLF.STANDARD_COURSE_RATING`
- [ ] Analyze method violations
- [ ] Extract query methods
- [ ] Fix any `any` types
- [ ] Run tests

---

## Phase 8: Final Cleanup

- [ ] Remove unused imports across all refactored files
- [ ] Run full test suite: `bun test`
- [ ] Run type check: `bun run type-check`
- [ ] Run linter: `bun run lint`
- [ ] Update `docs/opus-backend-review.md` with completion status

---

## Progress Tracking

| Phase | Status | Date Started | Date Completed |
|-------|--------|--------------|----------------|
| Phase 0: Foundation | Complete | 2025-12-31 | 2025-12-31 |
| Phase 1: Simple Services | **Complete** | 2025-12-31 | 2025-12-31 |
| Phase 2: Medium Services | **Complete** | 2025-12-31 | 2025-12-31 |
| Phase 3: Complex Services | Not Started | | |
| Phase 4: Tour Services | Not Started | | |
| Phase 5: CompetitionService | Not Started | | |
| Phase 6: CompetitionResultsService | Not Started | | |
| Phase 7: Player Services | Not Started | | |
| Phase 8: Final Cleanup | Not Started | | |

---

## Rollback Strategy

If tests fail after an extraction:

1. `git stash` or `git checkout -- <file>` to revert
2. Analyze why the extraction broke behavior
3. Try a smaller, more isolated extraction
4. Consider if the extraction accidentally changed logic

---

## Commands Reference

```bash
# Run all tests
bun test

# Run specific test file
bun test tests/competitions.test.ts

# Run tests matching pattern
bun test --grep "leaderboard"

# Type check
bun run type-check

# Lint
bun run lint
```

---

## Notes

- Each phase can be a separate PR for easier review
- Never skip running tests after an extraction
- If unsure about an extraction, make it smaller
- The goal is structure change, not behavior change
- **Method separation is the core work** - type fixes and constants were just preparation
