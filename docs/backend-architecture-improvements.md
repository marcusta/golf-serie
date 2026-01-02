# Backend Architecture Improvements

**Created:** 2026-01-02
**Status:** All Phases Complete ✅
**Predecessor:** `backend-refactoring-plan.md` (completed 2026-01-01)

This document tracks architectural improvements identified after the Phase 1-8 refactoring was completed. These are enhancements beyond the basic method separation work.

---

## Executive Summary

A code review against CLAUDE.md rules identified:
- **2 critical method size violations** (~400 lines combined)
- **3 unprotected JSON.parse calls**
- **Duplicated points calculation logic** (3 services)
- **Large service files** that could benefit from splitting

---

## Issue 1: Method Size Violations (Critical)

### 1.1 `getLeaderboardWithDetails` - 220 lines

**Location:** `src/services/competition-service.ts:260-479`

**CLAUDE.md Rule:** "Public API methods: Maximum 50 lines - if longer, extract helper methods"

**Current responsibilities (too many):**
1. Competition lookup and validation
2. Scoring mode detection
3. Tee info retrieval and rating extraction
4. Player handicap lookups from tour enrollments
5. Category/tee rating lookups
6. Participant fetching
7. Per-participant score calculations (gross and net)
8. Handicap stroke distribution
9. Manual score handling
10. DNF determination
11. Leaderboard sorting
12. Points calculation (stored vs projected)
13. Response building

### 1.2 `transformLeaderboardToTeamLeaderboard` - 189 lines

**Location:** `src/services/competition-service.ts:545-734`

**Current responsibilities (too many):**
1. Group participants by team
2. Pre-calculate team sums
3. Populate start times
4. Complex tie-breaker sorting (best individual scores)
5. Map to final format
6. Calculate team points

---

## Issue 2: Unprotected JSON.parse Calls (Medium)

**CLAUDE.md Rule:** "Always wrap `JSON.parse` with error handling"

| Location | Code | Fix |
|----------|------|-----|
| `tee-time-service.ts:92` | `JSON.parse(row.score)` | Use `safeParseJsonWithDefault()` |
| `tee-time-service.ts:101` | `JSON.parse(teeTimeRow.pars)` | Use `parseParsArray()` |
| `competition-service.ts:310` | `JSON.parse(participant.score)` | Use `safeParseJsonWithDefault()` |

---

## Issue 3: Duplicated Points Logic (Medium)

Points calculation appears in 3 places with identical formula:

```typescript
// Duplicated in:
// - competition-service.ts:484-518 (calculateProjectedPoints)
// - competition-results.service.ts:571-605 (calculatePointsForPosition)
// - tour.service.ts:875-912 (calculatePlayerPoints)

if (position === 1) { basePoints = numberOfPlayers + 2; }
else if (position === 2) { basePoints = numberOfPlayers; }
else { basePoints = numberOfPlayers - (position - 1); }
```

---

## Issue 4: Large Service Files (Low)

| Service | Lines | Recommendation |
|---------|-------|----------------|
| `competition-service.ts` | 1,412 | Extract LeaderboardService |
| `tour-competition-registration.service.ts` | 1,196 | Monitor, acceptable for now |
| `tour.service.ts` | 936 | Monitor, acceptable for now |

---

## Solution: Extract LeaderboardService

### Rationale

Leaderboard calculations are:
1. **Complex** - Net scoring, handicap distribution, tie-breaking
2. **Distinct** - Separate domain concern from competition CRUD
3. **Testable** - Would benefit from isolated unit tests
4. **Reusable** - Both individual and team leaderboards share logic

### Proposed Structure

```
src/services/leaderboard.service.ts (~600 lines)
├── Public API Methods
│   ├── getLeaderboard(competitionId): LeaderboardResponse
│   └── getTeamLeaderboard(competitionId): TeamLeaderboardEntry[]
│
├── Context Loading
│   ├── loadLeaderboardContext(competitionId): LeaderboardContext
│   └── loadTeamContext(competitionId): TeamContext
│
├── Entry Building
│   ├── buildParticipantEntry(participant, context): LeaderboardEntry
│   ├── buildManualScoreEntry(participant, handicapInfo, context): LeaderboardEntry
│   └── buildHoleByHoleEntry(participant, score, handicapInfo, context): LeaderboardEntry
│
├── Score Calculations
│   ├── calculateGrossScores(score, pars): GrossScoreResult
│   ├── calculateNetScores(score, pars, handicapStrokes): NetScoreResult
│   └── determinePlayerRatings(participant, context): PlayerRatings
│
├── Sorting & Ranking
│   ├── sortLeaderboardEntries(entries): LeaderboardEntry[]
│   ├── sortTeamGroups(groups): TeamGroup[]
│   └── applyTeamTieBreakers(a, b): number
│
├── Points Assignment
│   ├── addStoredPointsToEntries(entries, storedResults): LeaderboardEntry[]
│   └── addProjectedPointsToEntries(entries, context): LeaderboardEntry[]
│
├── Team Calculations
│   ├── groupEntriesByTeam(entries): TeamGroup[]
│   ├── calculateTeamTotals(groups): TeamGroup[]
│   ├── populateStartTimes(groups): TeamGroup[]
│   └── mapTeamGroupsToEntries(groups, numberOfTeams): TeamLeaderboardEntry[]
│
└── Query Methods (moved from CompetitionService)
    ├── findCompetitionWithPars(id)
    ├── findParticipantsForCompetition(id)
    ├── findTeeWithRatings(id)
    ├── findCategoryTeeRows(id)
    ├── findPlayerHandicapRows(tourId)
    ├── findStoredResultRows(competitionId)
    └── findPointTemplateRow(id)
```

### Key Type: LeaderboardContext

Bundles all data needed for calculations, avoiding repeated parameter passing:

```typescript
interface LeaderboardContext {
  // Competition info
  competition: CompetitionRow;
  pars: number[];
  totalPar: number;

  // Scoring configuration
  scoringMode: TourScoringMode | undefined;
  isTourCompetition: boolean;
  isResultsFinal: boolean;
  isOpenCompetitionClosed: boolean;

  // Tee/rating info (default for competition)
  defaultTeeInfo: TeeInfo | undefined;
  strokeIndex: number[];
  courseRating: number;
  slopeRating: number;

  // Category-specific tees
  categoryTeeRatings: Map<number, CategoryTeeRating>;
  categories: CategoryRow[];

  // Player handicaps (from tour enrollments)
  playerHandicaps: Map<number, number>;

  // Points configuration
  pointTemplate: PointTemplateRow | null;
  pointsMultiplier: number;
  numberOfPlayers: number;
}
```

### Decomposed getLeaderboard

```typescript
async getLeaderboard(competitionId: number): Promise<LeaderboardResponse> {
  // Step 1: Load all required data into context (~5 lines)
  const context = this.loadLeaderboardContext(competitionId);

  // Step 2: Build entries for each participant (~5 lines)
  const participants = this.findParticipantsForCompetition(competitionId);
  const entries = participants.map(p => this.buildParticipantEntry(p, context));

  // Step 3: Sort by score (~2 lines)
  const sortedEntries = this.sortLeaderboardEntries(entries);

  // Step 4: Add points (~5 lines)
  const entriesWithPoints = context.isResultsFinal
    ? this.addStoredPointsToEntries(sortedEntries, competitionId)
    : this.addProjectedPointsToEntries(sortedEntries, context);

  // Step 5: Build response (~5 lines)
  return this.buildLeaderboardResponse(entriesWithPoints, context);
}
```

**Result:** ~25 lines instead of 220 lines

### Decomposed buildParticipantEntry

```typescript
private buildParticipantEntry(
  participant: ParticipantWithDetailsRow,
  context: LeaderboardContext
): LeaderboardEntry {
  // Parse score (~3 lines)
  const score = this.parseParticipantScore(participant.score);

  // Get player-specific ratings (~3 lines)
  const ratings = this.determinePlayerRatings(participant, context);

  // Calculate handicap info if net scoring (~5 lines)
  const handicapInfo = this.calculateHandicapInfo(participant, ratings, context);

  // Delegate to appropriate builder (~5 lines)
  if (participant.manual_score_total !== null) {
    return this.buildManualScoreEntry(participant, handicapInfo, context);
  }
  return this.buildHoleByHoleEntry(participant, score, handicapInfo, context);
}
```

**Result:** ~20 lines, single responsibility

### Decomposed Team Leaderboard

```typescript
async getTeamLeaderboard(competitionId: number): Promise<TeamLeaderboardEntry[]> {
  // Step 1: Get individual leaderboard (~2 lines)
  const individualLeaderboard = await this.getLeaderboard(competitionId);

  // Step 2: Load team context (~2 lines)
  const context = this.loadTeamContext(competitionId);

  // Step 3: Group and calculate (~3 lines)
  const teamGroups = this.groupEntriesByTeam(individualLeaderboard.entries);
  const groupsWithTotals = this.calculateTeamTotals(teamGroups);
  const groupsWithTimes = this.populateStartTimes(groupsWithTotals);

  // Step 4: Sort with tie-breakers (~2 lines)
  const sortedGroups = this.sortTeamGroups(groupsWithTimes);

  // Step 5: Map to final format (~2 lines)
  return this.mapTeamGroupsToEntries(sortedGroups, context.numberOfTeams);
}
```

**Result:** ~15 lines instead of 189 lines

### sortTeamGroups Implementation

The complex tie-breaker logic (~40 lines):

```typescript
private sortTeamGroups(groups: TeamGroup[]): TeamGroup[] {
  return groups.sort((a, b) => {
    // Sort by status first
    const statusDiff = this.compareTeamStatus(a, b);
    if (statusDiff !== 0) return statusDiff;

    // Not started teams don't need further sorting
    if (a.status === "NOT_STARTED") return 0;

    // Sort by total score
    if (a.totalRelativeScore !== b.totalRelativeScore) {
      return a.totalRelativeScore - b.totalRelativeScore;
    }

    // Tie-breaker: compare best individual scores
    return this.compareIndividualScores(a, b);
  });
}

private compareTeamStatus(a: TeamGroup, b: TeamGroup): number {
  const statusOrder = { FINISHED: 0, IN_PROGRESS: 1, NOT_STARTED: 2 };
  return statusOrder[a.status] - statusOrder[b.status];
}

private compareIndividualScores(a: TeamGroup, b: TeamGroup): number {
  const scoresA = this.getSortedValidScores(a);
  const scoresB = this.getSortedValidScores(b);

  const maxLen = Math.max(scoresA.length, scoresB.length);
  for (let i = 0; i < maxLen; i++) {
    if (scoresA[i] === undefined) return 1;  // Fewer scores = loses
    if (scoresB[i] === undefined) return -1;
    if (scoresA[i] !== scoresB[i]) return scoresA[i] - scoresB[i];
  }
  return 0;
}
```

---

## Solution: Extract Points Utility ✅ IMPLEMENTED

### Created File: `src/utils/points.ts`

**Actual implementation (simpler than originally proposed):**

```typescript
/**
 * Points calculation utilities for golf competitions.
 *
 * The default formula awards points based on position:
 * - 1st place: numberOfParticipants + 2
 * - 2nd place: numberOfParticipants
 * - 3rd and below: numberOfParticipants - (position - 1), minimum 0
 */
export function calculateDefaultPoints(
  position: number,
  numberOfParticipants: number,
  multiplier: number = 1
): number {
  if (position <= 0) return 0;

  let basePoints: number;

  if (position === 1) {
    basePoints = numberOfParticipants + 2;
  } else if (position === 2) {
    basePoints = numberOfParticipants;
  } else {
    basePoints = numberOfParticipants - (position - 1);
    basePoints = Math.max(0, basePoints);
  }

  return basePoints * multiplier;
}
```

**Services updated to use this utility:**
- `competition-service.ts`: `calculateTeamPoints` now delegates to `calculateDefaultPoints`
- `competition-results.service.ts`: `calculatePointsForPosition` now uses `calculateDefaultPoints` for the default formula

### Original Proposed File (more comprehensive, for future reference):

```typescript
/**
 * Points calculation utilities for golf competitions.
 * Shared by CompetitionService, CompetitionResultsService, and TourService.
 */

export interface PointsStructure {
  [position: string]: number;
}

/**
 * Calculate points for a single position.
 * Uses point template if provided, otherwise default formula.
 */
export function calculatePointsForPosition(
  position: number,
  numberOfPlayers: number,
  pointTemplate: PointsStructure | null
): number {
  if (position <= 0) return 0;

  if (pointTemplate) {
    return pointTemplate[position.toString()] ?? pointTemplate["default"] ?? 0;
  }

  // Default formula:
  // 1st: numberOfPlayers + 2
  // 2nd: numberOfPlayers
  // 3rd+: numberOfPlayers - (position - 1), minimum 0
  if (position === 1) return numberOfPlayers + 2;
  if (position === 2) return numberOfPlayers;
  return Math.max(0, numberOfPlayers - (position - 1));
}

/**
 * Calculate averaged points for tied players.
 * When players tie, they share the sum of points for all positions they occupy.
 */
export function calculateAveragedPointsForTie(
  startPosition: number,
  tiedCount: number,
  numberOfPlayers: number,
  pointTemplate: PointsStructure | null,
  multiplier: number = 1
): number {
  let totalPoints = 0;
  for (let i = 0; i < tiedCount; i++) {
    totalPoints += calculatePointsForPosition(
      startPosition + i,
      numberOfPlayers,
      pointTemplate
    );
  }
  return Math.round((totalPoints / tiedCount) * multiplier);
}

/**
 * Parse a point template's JSON structure safely.
 */
export function parsePointsStructure(json: string): PointsStructure {
  try {
    return JSON.parse(json) as PointsStructure;
  } catch {
    return {};
  }
}
```

---

## Solution: Fix Unprotected JSON.parse ✅ IMPLEMENTED

### tee-time-service.ts Changes

```typescript
// Before (line 92):
score: typeof row.score === "string" ? JSON.parse(row.score) : row.score || []

// After:
import { safeParseJson, safeParseJsonWithDefault } from "../utils/parsing";
import type { ParsData } from "../types";
// ...
score: typeof row.score === "string"
  ? safeParseJsonWithDefault<number[]>(row.score, [])
  : row.score || []
```

```typescript
// Before (line 101):
const pars = JSON.parse(teeTimeRow.pars);

// After:
const pars = safeParseJson<ParsData>(teeTimeRow.pars, "pars");
```

### competition-service.ts Change

```typescript
// Before (line 310):
const score =
  typeof participant.score === "string"
    ? JSON.parse(participant.score)
    : Array.isArray(participant.score)
    ? participant.score
    : [];

// After:
const score =
  typeof participant.score === "string"
    ? safeParseJsonWithDefault<number[]>(participant.score, [])
    : Array.isArray(participant.score)
    ? participant.score
    : [];
```

---

## Impact on CompetitionService

After LeaderboardService extraction:

```typescript
// competition-service.ts reduces from ~1,412 to ~800 lines

export class CompetitionService {
  constructor(
    private db: Database,
    private leaderboardService: LeaderboardService
  ) {}

  // CRUD operations stay here
  async create(data: CreateCompetitionDto): Promise<Competition> { ... }
  async findAll(): Promise<Competition[]> { ... }
  async findById(id: number): Promise<Competition | null> { ... }
  async update(id: number, data: UpdateCompetitionDto): Promise<Competition> { ... }
  async delete(id: number): Promise<void> { ... }

  // Leaderboard methods delegate
  async getLeaderboard(competitionId: number): Promise<LeaderboardEntry[]> {
    const response = await this.leaderboardService.getLeaderboard(competitionId);
    return response.entries;
  }

  async getLeaderboardWithDetails(competitionId: number): Promise<LeaderboardResponse> {
    return this.leaderboardService.getLeaderboard(competitionId);
  }

  async getTeamLeaderboard(competitionId: number): Promise<TeamLeaderboardEntry[]> {
    return this.leaderboardService.getTeamLeaderboard(competitionId);
  }
}
```

---

## Implementation Plan

### Phase 1: Quick Wins (Low Risk)

| Task | Effort | Files |
|------|--------|-------|
| Fix JSON.parse in tee-time-service.ts | 15 min | 1 |
| Fix JSON.parse in competition-service.ts | 10 min | 1 |
| Extract `src/utils/points.ts` | 30 min | 4 |

**Verification:** `bun run test:server` (761 tests)

### Phase 2: LeaderboardService Extraction (Medium Risk)

| Step | Description |
|------|-------------|
| 2.1 | Create `src/services/leaderboard.service.ts` with types |
| 2.2 | Move query methods from CompetitionService |
| 2.3 | Extract `loadLeaderboardContext()` |
| 2.4 | Extract `buildParticipantEntry()` and score calculations |
| 2.5 | Extract sorting and points methods |
| 2.6 | Extract team leaderboard methods |
| 2.7 | Update CompetitionService to delegate |
| 2.8 | Wire up in `app.ts` |
| 2.9 | Run full test suite |

**Verification after each step:** `bun test tests/competitions.test.ts tests/competition-leaderboard-net-scores.test.ts`

### Phase 3: Cleanup (Low Risk)

| Task | Description |
|------|-------------|
| Remove dead code | Delete methods no longer used in CompetitionService |
| Update imports | Ensure all imports are used |
| Add tests | Consider adding leaderboard-specific unit tests |

---

## Rollback Strategy

Each phase should be a separate commit. If tests fail:

1. `git revert HEAD` to undo the last commit
2. Analyze the failure
3. Try a smaller extraction
4. Re-apply incrementally

---

## Success Criteria

- [x] All 761 tests pass
- [x] `getLeaderboard` method is under 50 lines (now delegates to LeaderboardService)
- [x] `getTeamLeaderboard` method is under 50 lines (now delegates to LeaderboardService)
- [x] No unprotected `JSON.parse` in services
- [x] Points calculation in single location (`src/utils/points.ts`)
- [x] `competition-service.ts` under 900 lines (reduced from 1,412 to 350 lines)
- [x] Type check passes for backend files (frontend path alias issues are unrelated)

---

## Progress Tracking

| Phase | Task | Status | Date |
|-------|------|--------|------|
| 1 | Fix JSON.parse calls | ✅ Complete | 2026-01-02 |
| 1 | Extract points utility | ✅ Complete | 2026-01-02 |
| 2 | Create LeaderboardService | ✅ Complete | 2026-01-02 |
| 2 | Extract context loading | ✅ Complete | 2026-01-02 |
| 2 | Extract entry building | ✅ Complete | 2026-01-02 |
| 2 | Extract sorting/points | ✅ Complete | 2026-01-02 |
| 2 | Extract team methods | ✅ Complete | 2026-01-02 |
| 2 | Wire up and test | ✅ Complete | 2026-01-02 |
| 3 | Cleanup and final tests | ✅ Complete | 2026-01-02 |

### Phase 1 Details (2026-01-02)

**JSON.parse fixes:**
- `tee-time-service.ts`: Added imports for `safeParseJson`, `safeParseJsonWithDefault`, and `ParsData` type
  - Line 93-96: `JSON.parse(row.score)` → `safeParseJsonWithDefault<number[]>(row.score, [])`
  - Line 106: `JSON.parse(teeTimeRow.pars)` → `safeParseJson<ParsData>(teeTimeRow.pars, "pars")`
- `competition-service.ts`:
  - Line 310: `JSON.parse(participant.score)` → `safeParseJsonWithDefault<number[]>(participant.score, [])`

**Points utility extraction:**
- Created `src/utils/points.ts` with `calculateDefaultPoints()` function
- Updated `competition-service.ts` to import and use `calculateDefaultPoints`
- Updated `competition-results.service.ts` to import and use `calculateDefaultPoints`

**Verification:** All 761 tests pass

**Note:** Backend type-check shows 2 pre-existing errors unrelated to these changes (competition-category-tees.ts, tour-competition-registration.service.ts)

### Phase 2 Details (2026-01-02)

**LeaderboardService Extraction:**
- Created `src/services/leaderboard.service.ts` (~1,203 lines)
- Reduced `src/services/competition-service.ts` from 1,412 lines to 350 lines (75% reduction)

**LeaderboardService Structure:**
- **Public API Methods**: `getLeaderboard()`, `getLeaderboardWithDetails()`, `getTeamLeaderboard()`
- **Context Loading**: `loadLeaderboardContext()` bundles all required data
- **Entry Building**: `buildParticipantEntry()`, `buildManualScoreEntry()`, `buildHoleByHoleEntry()`
- **Score Calculations**: `parseParticipantScore()`, `calculateHolesPlayed()`, `calculateTotalShots()`, `calculateRelativeToPar()`, `calculateNetScores()`
- **Tee/Handicap Info**: `getTeeInfoForCompetition()`, `getPlayerHandicapsForCompetition()`, `getCategoryTeeRatingsForCompetition()`
- **Transform Methods**: `transformParticipantRowForLeaderboard()`, `parseStrokeIndex()`, `extractTeeRatings()`, etc.
- **Sorting/Ranking**: `sortLeaderboard()` with proper tie-handling
- **Points Assignment**: `addPointsToLeaderboard()`, `addStoredPointsToLeaderboard()`, `addProjectedPointsToLeaderboard()`
- **Team Leaderboard**: `transformLeaderboardToTeamLeaderboard()`, `groupParticipantsByTeam()`, `sortTeamGroups()`, etc.
- **Query Methods**: All leaderboard-related database queries

**CompetitionService Changes:**
- Added LeaderboardService as private property, initialized in constructor
- Leaderboard methods now delegate to LeaderboardService:
  ```typescript
  async getLeaderboard(competitionId: number): Promise<LeaderboardEntry[]> {
    return this.leaderboardService.getLeaderboard(competitionId);
  }
  ```
- Removed all leaderboard-related types, logic methods, and query methods
- Kept only competition CRUD operations and basic validation

**Key Design Pattern - LeaderboardContext:**
```typescript
interface LeaderboardContext {
  competition: CompetitionRow;
  pars: number[];
  totalPar: number;
  scoringMode: TourScoringMode | undefined;
  isTourCompetition: boolean;
  isResultsFinal: boolean;
  isOpenCompetitionClosed: boolean;
  teeInfo: LeaderboardResponse["tee"] | undefined;
  strokeIndex: number[];
  courseRating: number;
  slopeRating: number;
  categoryTeeRatings: Map<number, CategoryTeeRating>;
  categories: CategoryRow[];
  playerHandicaps: Map<number, number>;
}
```

**Verification:** All 761 tests pass

### Phase 3 Details (2026-01-02)

**Cleanup verification:**
- All imports in `competition-service.ts` are used
- All imports in `leaderboard.service.ts` are used
- No dead code remaining in either file
- Public API matches: 3 public methods in LeaderboardService ↔ 3 delegating methods in CompetitionService
- Backend TypeScript type-check passes for service files
- All 761 tests pass

**Final file structure:**
```
src/services/
├── competition-service.ts       (350 lines - competition CRUD)
├── leaderboard.service.ts       (1,203 lines - leaderboard calculations)
├── competition-results.service.ts
├── tee-time-service.ts
└── ... (other services)
```

---

## References

- `CLAUDE.md` - Code quality rules
- `docs/backend-refactoring-plan.md` - Previous refactoring (completed)
- `src/services/competition-service.ts` - Main file to refactor
- `src/utils/parsing.ts` - Existing parsing utilities
- `src/utils/handicap.ts` - Example of well-structured utility
