# Backend Refactoring Plan

**Created:** 2025-12-31
**Goal:** Refactor backend services to comply with new code quality rules in CLAUDE.md
**Safety Net:** 670+ integration tests must pass after each change

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

```typescript
// src/constants/golf.ts
export const GOLF = {
  HOLES_PER_ROUND: 18,
  FRONT_NINE_START: 1,
  BACK_NINE_START: 10,

  // WHS Standard Values
  STANDARD_SLOPE_RATING: 113,
  STANDARD_COURSE_RATING: 72,

  // Valid Ranges
  MIN_PAR: 3,
  MAX_PAR: 6,
  MIN_COURSE_RATING: 50,
  MAX_COURSE_RATING: 90,
  MIN_SLOPE_RATING: 55,
  MAX_SLOPE_RATING: 155,
  MIN_HANDICAP_INDEX: -10,
  MAX_HANDICAP_INDEX: 54,

  // Score Markers
  UNREPORTED_HOLE: -1,
} as const;
```

### Step 0.2: Create Parsing Utilities
- [x] Create `src/utils/parsing.ts`
- [x] Add `safeParseJson<T>()` utility
- [x] Add `parseScoreArray()` utility
- [x] Add `parseParsArray()` utility
- [x] Run tests: `bun test`

```typescript
// src/utils/parsing.ts
export function safeParseJson<T>(json: string, fieldName: string): T {
  try {
    return JSON.parse(json) as T;
  } catch (e) {
    throw new Error(`Invalid ${fieldName} format: ${e instanceof Error ? e.message : 'parse error'}`);
  }
}

export function parseScoreArray(json: string): number[] {
  const parsed = safeParseJson<unknown>(json, 'score');
  if (!Array.isArray(parsed)) {
    throw new Error('Score must be an array');
  }
  return parsed as number[];
}

export function parseParsArray(json: string): number[] {
  const parsed = safeParseJson<unknown>(json, 'pars');
  if (!Array.isArray(parsed)) {
    throw new Error('Pars must be an array');
  }
  return parsed as number[];
}
```

### Step 0.3: Verify Baseline
- [x] Run full test suite: `bun test` (677 pass, 1 skip - Playwright tests excluded)
- [x] Run type check: `bun run type-check` (new files pass, pre-existing issues in tests)
- [ ] Run linter: `bun run lint`
- [x] Phase 0 complete - foundation files created

---

## Phase 1: Simple Services

Refactor simple CRUD services first to build confidence.

### 1.1 TeamService (`src/services/team-service.ts`)
**Complexity:** Low (~80 lines)
**Tests:** `tests/teams.test.ts`

- [ ] Replace magic numbers with `GOLF.*` constants (if any)
- [ ] Extract query methods with proper naming
- [ ] Extract validation logic methods
- [ ] Fix any `any` types
- [ ] Run tests: `bun test tests/teams.test.ts`
- [ ] Run full suite: `bun test`

### 1.2 DocumentService (`src/services/document-service.ts`)
**Complexity:** Low
**Tests:** `tests/documents.test.ts`

- [ ] Replace magic numbers with `GOLF.*` constants (if any)
- [ ] Extract query methods
- [ ] Extract validation logic
- [ ] Fix any `any` types
- [ ] Run tests: `bun test tests/documents.test.ts`
- [ ] Run full suite: `bun test`

### 1.3 PointTemplateService (`src/services/point-template.service.ts`)
**Complexity:** Low
**Tests:** `tests/point-templates.test.ts`

- [ ] Extract query methods
- [ ] Extract validation logic
- [ ] Fix any `any` types
- [ ] Run tests: `bun test tests/point-templates.test.ts`
- [ ] Run full suite: `bun test`

---

## Phase 2: Medium Services

### 2.1 CourseService (`src/services/course-service.ts`)
**Complexity:** Medium
**Tests:** `tests/courses.test.ts`

- [ ] Replace `18` with `GOLF.HOLES_PER_ROUND`
- [ ] Replace par range checks with `GOLF.MIN_PAR`, `GOLF.MAX_PAR`
- [ ] Extract query methods
- [ ] Extract `validatePars()` logic method
- [ ] Add defensive JSON parsing for pars
- [ ] Run tests: `bun test tests/courses.test.ts`
- [ ] Run full suite: `bun test`

### 2.2 CourseTeeService (`src/services/course-tee.service.ts`)
**Complexity:** Medium (has rating validation)
**Tests:** `tests/course-tees.test.ts`, `tests/course-tee-ratings.test.ts`

- [ ] Replace `113` with `GOLF.STANDARD_SLOPE_RATING`
- [ ] Replace `72` with `GOLF.STANDARD_COURSE_RATING`
- [ ] Replace rating range checks with `GOLF.*` constants
- [ ] Replace `18` checks with `GOLF.HOLES_PER_ROUND`
- [ ] Extract query methods
- [ ] Extract validation logic methods
- [ ] Add defensive JSON parsing for stroke_index
- [ ] Fix any `any` types
- [ ] Run tests: `bun test tests/course-tees.test.ts tests/course-tee-ratings.test.ts`
- [ ] Run full suite: `bun test`

### 2.3 TeeTimeService (`src/services/tee-time-service.ts`)
**Complexity:** Medium
**Tests:** `tests/tee-times.test.ts`

- [ ] Replace `1` and `10` with `GOLF.FRONT_NINE_START`, `GOLF.BACK_NINE_START`
- [ ] Extract query methods
- [ ] Extract validation logic
- [ ] Fix any `any` types
- [ ] Run tests: `bun test tests/tee-times.test.ts`
- [ ] Run full suite: `bun test`

---

## Phase 3: Complex Services

### 3.1 ParticipantService (`src/services/participant-service.ts`)
**Complexity:** High
**Tests:** `tests/participants.test.ts`

- [ ] Replace `18` with `GOLF.HOLES_PER_ROUND`
- [ ] Replace `-1` with `GOLF.UNREPORTED_HOLE`
- [ ] Extract query methods:
  - [ ] `findParticipantById()`
  - [ ] `findParticipantsByTeeTime()`
  - [ ] `insertParticipant()`
  - [ ] `updateParticipantScore()`
- [ ] Extract logic methods:
  - [ ] `validateScore()`
  - [ ] `calculateScoreTotal()`
- [ ] Add defensive JSON parsing
- [ ] Fix any `any` types
- [ ] Run tests: `bun test tests/participants.test.ts`
- [ ] Run full suite: `bun test`

### 3.2 SeriesService (`src/services/series-service.ts`)
**Complexity:** High (has standings calculation)
**Tests:** `tests/series.test.ts`

- [ ] Extract query methods
- [ ] Extract standings calculation logic
- [ ] Fix any `any` types (especially `getTeams(): any[]`)
- [ ] Run tests: `bun test tests/series.test.ts`
- [ ] Run full suite: `bun test`

### 3.3 AuthService (`src/services/auth.service.ts`)
**Complexity:** Medium
**Tests:** `tests/auth-auto-enrollment.test.ts`

- [ ] Extract session expiry to named constant
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

- [ ] Extract query methods
- [ ] Fix any `any` types
- [ ] Run tests
- [ ] Run full suite: `bun test`

### 4.3 TourCompetitionRegistrationService
**Complexity:** High
**Tests:** `tests/tour-competition-registration.test.ts`

- [ ] Replace `18` with `GOLF.HOLES_PER_ROUND`
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
- [ ] Extract query methods
- [ ] Extract calculation logic
- [ ] Run full suite: `bun test`

---

## Phase 7: Player Services

### 7.1 PlayerService (`src/services/player.service.ts`)
- [ ] Fix any `any` types
- [ ] Extract query methods
- [ ] Run tests

### 7.2 PlayerProfileService (`src/services/player-profile.service.ts`)
- [ ] Replace handicap range with `GOLF.*` constants
- [ ] Replace `72` default par with `GOLF.STANDARD_COURSE_RATING`
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
| Phase 1: Simple Services | Not Started | | |
| Phase 2: Medium Services | Not Started | | |
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
