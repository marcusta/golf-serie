# SQL Query Refactoring Strategy

This document outlines the current state of SQL query duplication in the backend, the refactoring strategy to address it, and guidelines for preventing future duplication.

---

## Current State Analysis

### Overview

An audit of the backend services revealed significant SQL query duplication and inconsistency patterns. The same logic is implemented multiple times across different services, leading to:

- Maintenance burden (changes must be made in multiple places)
- Inconsistent behavior (slight variations between implementations)
- Bug risk (fixes applied to one location but not others)

### Identified Duplication Patterns

#### 1. Golf Score Calculations (6+ duplications)

**Functions duplicated across services:**

| Function | Locations |
|----------|-----------|
| `calculateHolesPlayed()` | `leaderboard.service.ts:446`, `competition-results.service.ts:325`, `tour-competition-registration.service.ts:582`, `game-score.service.ts:343` |
| `calculateRelativeToPar()` | `leaderboard.service.ts:454`, `competition-results.service.ts:333`, `tour.service.ts:431`, `stroke-play.ts:111`, `tour-competition-registration.service.ts:586` |
| `calculateGrossScore()` | `competition-results.service.ts:329`, `leaderboard.service.ts` (inline) |

**Problem:** Nearly identical implementations with minor variations. When a bug is found, it must be fixed in 5+ places.

#### 2. Player Display Name Resolution (10+ duplications)

**SQL pattern appearing across services:**

```sql
-- 2-level fallback (inconsistent)
COALESCE(pp.display_name, pl.name) as player_name

-- 3-level fallback (correct)
COALESCE(pp.display_name, pl.name, p.player_names) as player_name
```

**Locations:**
- `tour.service.ts:199, 227, 256`
- `leaderboard.service.ts:1183`
- `tour-competition-registration.service.ts:199, 211, 351, 411`
- `game-score.service.ts:95, 132`

**Problem:** Inconsistent fallback levels. Some queries miss the `player_names` fallback for participants without linked players, causing display issues.

**Existing utility not used:** `src/utils/player-display.ts` defines helpers for this pattern, but only `game.service.ts` imports them.

#### 3. Standings/Ranking Logic (5+ duplications)

**Pattern appearing in multiple services:**

```typescript
let currentPosition = 1;
let previousValue = [initial];
items.forEach((item, index) => {
  if (item.value !== previousValue) {
    currentPosition = index + 1;
  }
  item.position = currentPosition;
  previousValue = item.value;
});
```

**Locations:**
- `tour.service.ts:351` - `sortAndRankStandings()`
- `tour.service.ts:885` - inline ranking
- `series-service.ts:257` - `sortAndRankTeamStandings()`
- `competition-results.service.ts:542, 599` - `assignStandingPositions()`
- `leaderboard.service.ts:843` - inline ranking
- `stroke-play.ts:169` - inline ranking

**Problem:** Same algorithm copy-pasted with different field names. Should be a generic utility.

#### 4. Competition + Course JOIN (5+ duplications)

**SQL pattern:**

```sql
SELECT c.*, co.name as course_name, co.pars
FROM competitions c
JOIN courses co ON c.course_id = co.id
WHERE [conditions]
```

**Locations:**
- `competition-service.ts:294-303`
- `leaderboard.service.ts:1143-1150`
- `tour.service.ts:565-573`
- `series-service.ts:369-382`
- `tee-time-service.ts:159-167`

**Variations:** Some include participant count subquery, some include stroke_index, some include tee ratings.

#### 5. Handicap Lookup from Tour Enrollments (3+ duplications)

**SQL pattern:**

```sql
SELECT COALESCE(te.playing_handicap, p.handicap) as handicap_index
FROM tour_enrollments te
LEFT JOIN players p ON te.player_id = p.id
WHERE te.tour_id = ? AND te.player_id IS NOT NULL AND te.status = 'active'
```

**Locations:**
- `participant-service.ts:336-341`
- `leaderboard.service.ts:1170-1176`
- `tour-enrollment.service.ts:237` (inline)

#### 6. Tour Enrollment with Details (3 near-identical queries)

**Locations in `tour-enrollment.service.ts`:**
- `findEnrollmentsByTour()` (lines 230-245)
- `findEnrollmentsByTourAndStatus()` (lines 252-267)
- `getEnrollmentByEmail()` (lines 416-429)

**Problem:** Three methods with 90% identical SQL, differing only in WHERE clause.

---

## Refactoring Strategy

### Phase 1: Create Shared Utilities (High Priority)

#### 1.1 Create `src/utils/golf-scoring.ts`

Extract duplicated score calculation logic:

```typescript
// src/utils/golf-scoring.ts

import { GOLF } from "../constants";

/**
 * Calculate how many holes have been played (have a score > 0 or UNREPORTED_HOLE)
 */
export function calculateHolesPlayed(scores: number[]): number {
  return scores.filter((s) => s > 0 || s === GOLF.UNREPORTED_HOLE).length;
}

/**
 * Calculate gross score (sum of all positive scores)
 */
export function calculateGrossScore(scores: number[]): number {
  return scores.reduce((sum, s) => sum + (s > 0 ? s : 0), 0);
}

/**
 * Calculate score relative to par for played holes
 */
export function calculateRelativeToPar(scores: number[], pars: number[]): number {
  let relativeToPar = 0;
  for (let i = 0; i < scores.length && i < pars.length; i++) {
    if (scores[i] > 0) {
      relativeToPar += scores[i] - pars[i];
    }
  }
  return relativeToPar;
}

/**
 * Check if any hole has an invalid/unreported score
 */
export function hasInvalidHole(scores: number[]): boolean {
  return scores.includes(GOLF.UNREPORTED_HOLE);
}

/**
 * Calculate all score metrics at once
 */
export interface ScoreMetrics {
  holesPlayed: number;
  grossScore: number;
  relativeToPar: number;
  hasInvalidHole: boolean;
}

export function calculateScoreMetrics(scores: number[], pars: number[]): ScoreMetrics {
  return {
    holesPlayed: calculateHolesPlayed(scores),
    grossScore: calculateGrossScore(scores),
    relativeToPar: calculateRelativeToPar(scores, pars),
    hasInvalidHole: hasInvalidHole(scores),
  };
}
```

**Migration:** Update all 6 services to import from this utility.

#### 1.2 Create `src/utils/ranking.ts`

Extract standings ranking logic:

```typescript
// src/utils/ranking.ts

/**
 * Assign positions to a sorted array, handling ties correctly.
 * Items with equal values get the same position.
 *
 * @param items - Pre-sorted array (must be sorted by ranking criteria)
 * @param getValue - Function to extract the comparison value
 * @param setPosition - Function to set the position on the item
 * @returns The same array with positions assigned
 *
 * @example
 * const standings = [{ points: 100 }, { points: 100 }, { points: 80 }];
 * assignPositionsWithTies(
 *   standings,
 *   (s) => s.points,
 *   (s, pos) => s.position = pos
 * );
 * // Result: positions are 1, 1, 3 (not 1, 2, 3)
 */
export function assignPositionsWithTies<T>(
  items: T[],
  getValue: (item: T) => number | string,
  setPosition: (item: T, position: number) => void
): T[] {
  if (items.length === 0) return items;

  let currentPosition = 1;
  let previousValue = getValue(items[0]);
  setPosition(items[0], currentPosition);

  for (let i = 1; i < items.length; i++) {
    const currentValue = getValue(items[i]);
    if (currentValue !== previousValue) {
      currentPosition = i + 1;
    }
    setPosition(items[i], currentPosition);
    previousValue = currentValue;
  }

  return items;
}

/**
 * Sort and rank in one operation
 */
export function sortAndRank<T>(
  items: T[],
  compareFn: (a: T, b: T) => number,
  getValue: (item: T) => number | string,
  setPosition: (item: T, position: number) => void
): T[] {
  const sorted = [...items].sort(compareFn);
  return assignPositionsWithTies(sorted, getValue, setPosition);
}
```

**Migration:** Update 5+ ranking implementations to use this utility.

### Phase 2: Standardize Player Name Resolution (High Priority)

#### 2.1 Update existing utility

Enhance `src/utils/player-display.ts`:

```typescript
// src/utils/player-display.ts

/**
 * RULE: Always use 3-level fallback for player names:
 * 1. display_name from player_profiles (user's preferred name)
 * 2. name from players table (registration name)
 * 3. player_names from participants (for unlinked participants)
 */

/**
 * Standard SQL fragment for player name with full fallback chain.
 * Use with PLAYER_NAME_JOINS or PLAYER_NAME_JOINS_FROM_PARTICIPANT.
 */
export const PLAYER_NAME_COALESCE =
  "COALESCE(pp.display_name, pl.name) as player_name";

/**
 * SQL fragment for participant context (includes player_names fallback)
 */
export const PARTICIPANT_NAME_COALESCE =
  "COALESCE(pp.display_name, pl.name, p.player_names) as player_name";

/**
 * SQL JOINs for player name resolution from a player_id column
 */
export function playerNameJoins(playerIdColumn: string, playerAlias = "pl", profileAlias = "pp"): string {
  return `
    LEFT JOIN players ${playerAlias} ON ${playerIdColumn} = ${playerAlias}.id
    LEFT JOIN player_profiles ${profileAlias} ON ${playerAlias}.id = ${profileAlias}.player_id
  `.trim();
}

/**
 * Get display name in JavaScript (for post-query processing)
 */
export function getPlayerDisplayName(
  displayName: string | null | undefined,
  playerName: string | null | undefined,
  fallbackName?: string
): string {
  return displayName?.trim() || playerName?.trim() || fallbackName || "Unknown";
}
```

#### 2.2 Migrate all services

Update all 10+ locations to use consistent 3-level fallback.

### Phase 3: Create Query Fragment Library (Medium Priority)

Create a structured location for reusable SQL fragments:

```
src/db/
├── queries/
│   ├── index.ts              # Re-exports all fragments
│   ├── player.queries.ts     # Player/profile patterns
│   ├── competition.queries.ts # Competition + course patterns
│   ├── enrollment.queries.ts  # Tour enrollment patterns
│   └── participant.queries.ts # Participant patterns
└── ...
```

Example `competition.queries.ts`:

```typescript
// src/db/queries/competition.queries.ts

/**
 * Base SELECT fields for competition with course info
 */
export const COMPETITION_WITH_COURSE_SELECT = `
  c.*,
  co.name as course_name,
  co.pars
`;

/**
 * Extended SELECT with stroke index
 */
export const COMPETITION_WITH_COURSE_EXTENDED_SELECT = `
  ${COMPETITION_WITH_COURSE_SELECT},
  co.stroke_index
`;

/**
 * Standard JOIN for competition + course
 */
export const COMPETITION_COURSE_JOIN = `
  JOIN courses co ON c.course_id = co.id
`;

/**
 * Subquery for participant count
 */
export function participantCountSubquery(competitionIdColumn = "c.id"): string {
  return `
    (SELECT COUNT(*)
     FROM participants p
     JOIN tee_times t ON p.tee_time_id = t.id
     WHERE t.competition_id = ${competitionIdColumn}) as participant_count
  `;
}
```

### Phase 4: Consolidate Enrollment Queries (Low Priority)

Refactor `tour-enrollment.service.ts` to reduce the 3 near-identical queries:

```typescript
// Before: 3 separate methods with 90% identical SQL
findEnrollmentsByTour(tourId)
findEnrollmentsByTourAndStatus(tourId, status)
getEnrollmentByEmail(tourId, email)

// After: Single parameterized method
findEnrollments(tourId, options?: { status?: string; email?: string })
```

---

## Prevention Guidelines

### Rule 1: Check Before Writing

Before writing any SQL query or calculation logic, check these locations:

| Pattern Type | Check Location |
|--------------|----------------|
| Score calculations | `src/utils/golf-scoring.ts` |
| Handicap calculations | `src/utils/handicap.ts` |
| Player name resolution | `src/utils/player-display.ts` |
| Ranking/positions | `src/utils/ranking.ts` |
| Common SQL fragments | `src/db/queries/` |

### Rule 2: Consistent Player Name Fallback

**Always use 3-level fallback** for participant contexts:

```sql
-- CORRECT: Full fallback chain
COALESCE(pp.display_name, pl.name, p.player_names) as player_name

-- WRONG: Missing fallback for unlinked participants
COALESCE(pp.display_name, pl.name) as player_name
```

For non-participant contexts (just player + profile):

```sql
COALESCE(pp.display_name, pl.name) as player_name
```

### Rule 3: Extract After 2 Uses

If you write similar code twice, extract it:

- **Utility function**: For TypeScript logic
- **Query fragment**: For SQL patterns
- **Service method**: For complete queries

### Rule 4: Document New Patterns

When creating a new shared pattern, add it to this document and to the appropriate guide (`BACKEND_GUIDE.md`).

---

## Migration Checklist

### High Priority

- [ ] Create `src/utils/golf-scoring.ts`
- [ ] Migrate `leaderboard.service.ts` to use golf-scoring utility
- [ ] Migrate `competition-results.service.ts` to use golf-scoring utility
- [ ] Migrate `tour.service.ts` to use golf-scoring utility
- [ ] Migrate `tour-competition-registration.service.ts` to use golf-scoring utility
- [ ] Migrate `game-score.service.ts` to use golf-scoring utility
- [ ] Migrate `stroke-play.ts` to use golf-scoring utility
- [ ] Standardize all COALESCE patterns to 3-level fallback

### Medium Priority

- [ ] Create `src/utils/ranking.ts`
- [ ] Migrate `tour.service.ts` ranking logic
- [ ] Migrate `series-service.ts` ranking logic
- [ ] Migrate `competition-results.service.ts` ranking logic
- [ ] Migrate `leaderboard.service.ts` ranking logic
- [ ] Migrate `stroke-play.ts` ranking logic
- [ ] Create `src/db/queries/` structure

### Low Priority

- [ ] Consolidate tour enrollment queries
- [ ] Create competition query fragments
- [ ] Create participant query fragments

---

## Metrics

Track these metrics to measure progress:

| Metric | Before | Target |
|--------|--------|--------|
| `calculateHolesPlayed` implementations | 4 | 1 |
| `calculateRelativeToPar` implementations | 5 | 1 |
| Ranking algorithm implementations | 5 | 1 |
| Inconsistent COALESCE patterns | 4 | 0 |
| Services importing golf-scoring.ts | 0 | 6 |
| Services importing ranking.ts | 0 | 5 |

---

*Last updated: 2025-01-15*
