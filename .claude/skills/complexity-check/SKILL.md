---
name: complexity-check
description: Enforce code complexity limits and quality standards in TapScore backend. Use when writing or reviewing backend code to ensure method size limits, nesting depth, naming conventions, and use of domain constants are followed.
---

# TapScore Code Complexity Check Skill

This skill enforces code complexity limits from "Code Complete" principles. Use when writing or reviewing ANY backend code.

---

## Complexity Check Workflow

Copy this checklist and track your progress:

```
Code Complexity Checklist:
- [ ] Step 1: Check method size limits
- [ ] Step 2: Verify nesting depth (max 3 levels)
- [ ] Step 3: Validate naming conventions
- [ ] Step 4: Replace magic numbers with constants
- [ ] Step 5: Ensure type safety
```

---

## Step 1: Check Method Size Limits

**Rules**:
- Logic methods: Max 50 lines (excluding blanks/comments)
- Public API methods: Max 50 lines
- Query methods: No strict limit (SQL can be long)

**When too long**: Extract helper methods

```typescript
// ❌ TOO LONG - 80 lines of logic
calculateLeaderboard(participants: Participant[]): LeaderboardEntry[] {
  // Complex logic all in one method
}

// ✅ FIX - Extract focused methods
calculateLeaderboard(participants: Participant[]): LeaderboardEntry[] {
  const entries = participants.map(p => this.calculateEntry(p, pars));
  const sorted = this.sortByScore(entries);
  return this.assignRanks(sorted);
}

private calculateEntry(p: Participant, pars: number[]): LeaderboardEntry {
  // 15 lines - focused
}

private sortByScore(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  // 10 lines - single purpose
}
```

---

## Step 2: Verify Nesting Depth (Max 3 Levels)

**CRITICAL**: Maximum 3 levels of nesting. Use early returns.

```typescript
// ❌ TOO DEEP - 4 levels
for (const participant of participants) {  // Level 1
  if (participant.player_id) {  // Level 2
    for (const score of scores) {  // Level 3
      if (score > 0) {  // Level 4 - TOO DEEP!
        // ...
      }
    }
  }
}

// ✅ FLATTENED - Max 2 levels
for (const participant of participants) {  // Level 1
  if (!participant.player_id) continue;  // Early exit

  for (const score of scores) {  // Level 2
    if (score <= 0) continue;  // Early exit
    this.processValidScore(score);  // At level 2
  }
}
```

**Flattening techniques**:
- Early returns: `if (!condition) return;`
- Early continue: `if (!valid) continue;`
- Guard clauses at method start
- Extract methods for nested blocks

---

## Step 3: Validate Naming Conventions

### Booleans: Prefix with `is`, `has`, `should`, `can`

```typescript
// ✅ CORRECT
const isFinished = competition.is_finished;
const hasScores = scores.length > 0;
const shouldCalculateNet = participant.handicap_index !== null;

// ❌ WRONG
const finished = competition.is_finished;  // Unclear type
const calculateNet = participant.handicap_index !== null;  // Sounds like function
```

### Collections: Use plural nouns

```typescript
// ✅ CORRECT
const participants: Participant[] = [];
const scores: number[] = [];

// ❌ WRONG
const participant: Participant[] = [];  // Singular
const scoreList: number[] = [];  // Redundant "List"
```

### Transformed Data: Name describes transformation

```typescript
// ✅ CORRECT
const competitionWithCourse = { ...competition, course };
const sortedLeaderboard = leaderboard.sort(...);

// ❌ WRONG
const competition = { ...competition, course };  // Name collision
```

### Avoid Generic Names

**NEVER use**: `data`, `result`, `item`, `temp`, `info`, `obj`

Use descriptive domain names instead.

---

## Step 4: Replace Magic Numbers with Constants

### Import and use GOLF constants

```typescript
import { GOLF } from "../constants/golf";

// ✅ CORRECT - Uses constants
if (holesPlayed === GOLF.HOLES_PER_ROUND) {
  const rating = tee.course_rating || GOLF.STANDARD_COURSE_RATING;
  const slope = tee.slope_rating || GOLF.STANDARD_SLOPE_RATING;
}

if (par < GOLF.MIN_PAR || par > GOLF.MAX_PAR) {
  throw new Error(`Invalid par: ${par}`);
}

if (score === GOLF.UNREPORTED_HOLE) return null;

// ❌ WRONG - Magic numbers
if (holesPlayed === 18) {  // What's 18?
  const rating = tee.course_rating || 72;  // What's 72?
  const slope = tee.slope_rating || 113;  // What's 113?
}

if (par < 3 || par > 6) {  // Why 3 and 6?
  throw new Error(`Invalid par: ${par}`);
}

if (score === -1) {  // What's -1?
  return null;
}
```

### Available GOLF Constants

See `src/constants/golf.ts` for complete list:

```typescript
export const GOLF = {
  HOLES_PER_ROUND: 18,
  FRONT_NINE_START: 1,
  BACK_NINE_START: 10,
  STANDARD_SLOPE_RATING: 113,
  STANDARD_COURSE_RATING: 72,
  MIN_PAR: 3,
  MAX_PAR: 6,
  MIN_COURSE_RATING: 50,
  MAX_COURSE_RATING: 90,
  MIN_SLOPE_RATING: 55,
  MAX_SLOPE_RATING: 155,
  MIN_HANDICAP_INDEX: -10,
  MAX_HANDICAP_INDEX: 54,
  UNREPORTED_HOLE: -1,
} as const;
```

**If new constant needed**: Add to `src/constants/golf.ts`

---

## Step 5: Ensure Type Safety

### Never use `any`

```typescript
// ❌ WRONG
getCompetitions(tourId: number): any[] {
  return this.db.prepare("...").all(tourId);
}

// ✅ CORRECT
getCompetitions(tourId: number): Competition[] {
  return this.db.prepare("...").all(tourId) as Competition[];
}
```

### Explicit return types on all methods

```typescript
// ❌ WRONG - Inferred
calculateRelativeToPar(scores: number[], pars: number[]) {
  return scores.reduce(...);
}

// ✅ CORRECT - Explicit
calculateRelativeToPar(scores: number[], pars: number[]): number {
  return scores.reduce(...);
}
```

### Type guards before assertions

```typescript
// ❌ WRONG
const competition = stmt.get(id) as Competition;

// ✅ BETTER
const row = stmt.get(id);
if (!row) return null;
if (!this.isValidCompetition(row)) {
  throw new Error("Invalid competition data");
}
return row as Competition;
```

---

## Validation Checklist

Before merging code:

### Method Size
- [ ] Logic methods under 50 lines
- [ ] Public API methods under 50 lines
- [ ] Extracted helpers for complex logic

### Nesting Depth
- [ ] Maximum 3 levels of nesting
- [ ] Used early returns/continue
- [ ] Extracted methods to reduce nesting

### Naming Conventions
- [ ] Booleans: `is*`, `has*`, `should*`, `can*`
- [ ] Collections: plural nouns
- [ ] Transformed data: descriptive names
- [ ] NO generic names: `data`, `result`, `temp`

### Constants
- [ ] Used `GOLF` constants for domain values
- [ ] NO magic numbers (18, 113, 72, -1, etc.)
- [ ] Imported from `src/constants/golf`

### Type Safety
- [ ] NO `any` type
- [ ] Explicit return types on all methods
- [ ] Type guards before assertions
- [ ] Proper query result casting

---

## Example: Well-Structured Code

```typescript
import { GOLF } from "../constants/golf";

class LeaderboardService {
  // Under 50 lines, max 2 levels, good names, uses constants
  calculateLeaderboard(competitionId: number): LeaderboardEntry[] {
    const competition = this.findCompetitionById(competitionId);
    if (!competition) return [];

    const participants = this.findParticipantsByCompetition(competitionId);
    if (participants.length === 0) return [];

    const pars = this.parseParsArray(competition.pars);
    const entries = participants
      .map(p => this.calculateEntry(p, pars))
      .filter(e => e.totalScore > 0);

    return this.sortByScore(entries);
  }

  private calculateEntry(participant: Participant, pars: number[]): LeaderboardEntry {
    const scores = JSON.parse(participant.score);
    const holesPlayed = scores.filter(s => s > 0).length;

    if (holesPlayed !== GOLF.HOLES_PER_ROUND) return null;

    const totalScore = scores.reduce((sum, s) => sum + s, 0);
    const relativeToPar = scores.reduce((rel, shots, i) => {
      if (shots === GOLF.UNREPORTED_HOLE) return rel;
      return rel + (shots - pars[i]);
    }, 0);

    return { participantId: participant.id, totalScore, relativeToPar };
  }
}
```

---

## Summary

**Every code change must**:
- Keep methods under 50 lines (except query methods)
- Maintain max 3 levels of nesting
- Use convention-following names
- Replace magic numbers with GOLF constants
- Avoid `any` and use explicit types

For detailed patterns, see `docs/backend/BACKEND_GUIDE.md`.
