---
name: service-audit
description: Enforce TapScore backend service layer organization and code quality standards. Use when implementing or modifying service classes, business logic, or database operations. Ensures compliance with service layer patterns from BACKEND_GUIDE.md.
---

# TapScore Service Layer Audit Skill

This skill enforces TapScore's backend service layer organization and code quality standards. Use for ANY backend service work: new services, business logic, database operations, or refactoring.

---

## Implementation Workflow

Copy this checklist and track your progress:

```
Service Implementation Progress:
- [ ] Step 1: Read backend architecture patterns
- [ ] Step 2: Organize methods by category
- [ ] Step 3: Implement following separation rules
- [ ] Step 4: Validate service layer compliance
- [ ] Step 5: Check code quality metrics
```

---

## Step 1: Read Backend Architecture Patterns

**MANDATORY - Read this file before coding:**

```bash
cat docs/backend/BACKEND_GUIDE.md    # Service layer organization patterns
```

**What to extract:**
- Service layer organization (query vs logic vs public methods)
- Transaction handling patterns
- Method naming conventions
- Transform patterns (Row to Domain types)

---

## Step 2: Organize Methods by Category

### Core Rule
**A method contains EITHER a single SQL query OR business logic - never both.**

### Method Categories

**1. Query Methods** (private, single SQL statement):
- **Prefix**: `find*`, `get*`, `insert*`, `update*`, `delete*`
- **Contains**: Exactly one SQL query
- **Transformation**: Minimal (JSON.parse, type casting only)
- **Transaction**: Automatically joins active transaction

```typescript
// ✅ CORRECT - Single query, minimal transform
private findCompetitionById(id: number): Competition | null {
  return this.db.prepare("SELECT * FROM competitions WHERE id = ?")
    .get(id) as Competition | null;
}

// ❌ WRONG - Query + business logic mixed
private findCompetitionById(id: number): Competition | null {
  const comp = this.db.prepare("SELECT * FROM competitions WHERE id = ?")
    .get(id) as Competition | null;

  if (comp && comp.is_finished) {
    // Business logic doesn't belong here
    this.calculateFinalStandings(comp.id);
  }
  return comp;
}
```

**2. Logic Methods** (private, no SQL):
- **Prefix**: `calculate*`, `build*`, `validate*`, `process*`, `transform*`
- **Contains**: Pure business logic only
- **Database access**: None (calls logic methods only, never query methods)
- **Testing**: Easily unit-testable without database

```typescript
// ✅ CORRECT - Pure logic, no database
private calculateRelativeToPar(score: number[], pars: number[]): number {
  return score.reduce((rel, shots, i) =>
    shots > 0 ? rel + (shots - pars[i]) : rel, 0);
}

// ❌ WRONG - Logic method accessing database
private calculateLeaderboard(competitionId: number): LeaderboardEntry[] {
  const participants = this.db.prepare("SELECT * FROM participants...")
    .all() as Participant[];  // Database access in logic method

  return participants.map(p => this.processEntry(p));
}
```

**3. Transform Methods** (private, Row to Domain):
- **Purpose**: Convert database rows to domain types
- **Must have**: Explicit return type annotations
- **Handles**: Type conversions (0/1 → boolean, JSON strings → arrays)

```typescript
// ✅ CORRECT - Explicit return type, handles conversions
private transformParticipantRow(row: ParticipantRow): Participant {
  return {
    ...row,
    score: JSON.parse(row.score),        // JSON string → array
    is_locked: Boolean(row.is_locked),   // SQLite 0/1 → boolean
  };
}

// ❌ WRONG - No return type, missing conversions
private transformParticipantRow(row: ParticipantRow) {
  return row;  // Returns raw database representation
}
```

**4. Public API Methods** (orchestration):
- **Purpose**: Combines query + logic methods
- **Defines**: Transaction boundaries
- **Validates**: Input before starting transactions

```typescript
// ✅ CORRECT - Orchestrates query and logic methods
async getLeaderboard(competitionId: number): Promise<LeaderboardEntry[]> {
  // Query method
  const competition = this.findCompetitionById(competitionId);
  if (!competition) throw new Error("Competition not found");

  // Query method
  const participants = this.findParticipantsByCompetition(competitionId);

  // Logic method
  const pars = this.parseParsArray(competition.pars);

  // Logic method + sorting
  return participants
    .map(p => this.calculateEntryScore(p, pars))
    .sort((a, b) => a.relativeToPar - b.relativeToPar);
}
```

---

## Step 3: Implement Following Separation Rules

### Transaction Handling

**Pattern**: Validate OUTSIDE transaction, execute INSIDE

```typescript
// ✅ CORRECT - Validation before transaction
createCompetitionWithTeeTimes(data: CreateDto, teeTimes: string[]) {
  // Fail fast - validate before starting transaction
  this.validateCompetitionData(data);
  this.validateTeeTimes(teeTimes);

  // Transaction boundary - all query methods inside automatically join
  return this.db.transaction(() => {
    const competition = this.insertCompetition(data);
    const createdTeeTimes = teeTimes.map(time =>
      this.insertTeeTime(competition.id, time)
    );
    return { competition, teeTimes: createdTeeTimes };
  })();
}

// ❌ WRONG - Validation inside transaction
createCompetitionWithTeeTimes(data: CreateDto, teeTimes: string[]) {
  return this.db.transaction(() => {
    // Wasted transaction if validation fails
    this.validateCompetitionData(data);
    this.validateTeeTimes(teeTimes);

    const competition = this.insertCompetition(data);
    // ...
  })();
}
```

### Player Display Names

**CRITICAL**: Always prefer `player_profiles.display_name` over `players.name`

```typescript
// ✅ CORRECT - Query includes display_name with fallback
private findParticipantsWithPlayers(competitionId: number): ParticipantRow[] {
  return this.db.prepare(`
    SELECT
      p.*,
      pl.name as player_name,
      pp.display_name as player_display_name
    FROM participants p
    LEFT JOIN players pl ON p.player_id = pl.id
    LEFT JOIN player_profiles pp ON pl.id = pp.player_id
    WHERE p.competition_id = ?
  `).all(competitionId) as ParticipantRow[];
}

// Transform uses helper
import { getPlayerDisplayName } from "../utils/player-display";

private transformParticipantRow(row: ParticipantRow): Participant {
  return {
    ...row,
    playerName: getPlayerDisplayName(
      row.player_display_name,
      row.player_name
    ),
  };
}
```

### Use Golf Constants

```typescript
import { GOLF } from "../constants/golf";

// ✅ CORRECT - Uses constants
if (holesPlayed === GOLF.HOLES_PER_ROUND) {
  const slopeRating = tee.slope_rating || GOLF.STANDARD_SLOPE_RATING;
  // ...
}

// ❌ WRONG - Magic numbers
if (holesPlayed === 18) {
  const slopeRating = tee.slope_rating || 113;
  // ...
}
```

---

## Step 4: Validate Service Layer Compliance

**Method Organization**:
- [ ] Query methods are private and contain exactly one SQL query
- [ ] Query methods have prefixes: `find*`, `get*`, `insert*`, `update*`, `delete*`
- [ ] Logic methods are private and contain NO database access
- [ ] Logic methods have prefixes: `calculate*`, `build*`, `validate*`, `process*`, `transform*`
- [ ] Transform methods have explicit return type annotations
- [ ] Public API methods orchestrate query + logic methods
- [ ] Public API methods define transaction boundaries

**Transaction Handling**:
- [ ] Validation happens BEFORE `db.transaction()`
- [ ] All related queries within single `db.transaction(() => { ... })()`
- [ ] Transaction used only when multiple queries need atomicity
- [ ] Single-query operations don't use explicit transactions (auto-commit)

**Data Patterns**:
- [ ] Player queries include `player_profiles.display_name`
- [ ] Display names use `getPlayerDisplayName()` helper
- [ ] Used `GOLF` constants instead of magic numbers
- [ ] JSON.parse wrapped with error handling

---

## Step 5: Check Code Quality Metrics

**Method Size Limits**:
- [ ] Logic methods under 50 lines (excluding blanks/comments)
- [ ] Public API methods under 50 lines
- [ ] Query methods: no strict limit (SQL can be long, wrapper minimal)

**Control Flow Nesting**:
- [ ] Maximum 3 levels of nesting
- [ ] Used early returns to flatten code

**Variable Naming**:
- [ ] Booleans prefixed: `is*`, `has*`, `should*`, `can*`
- [ ] Collections are plural: `participants`, `scores`, `teeTimes`
- [ ] Transformed data named descriptively: `competitionWithCourse`, `sortedLeaderboard`
- [ ] No generic names: `data`, `result`, `item`, `temp`

**Type Safety**:
- [ ] NO use of `any` type
- [ ] Explicit return types on all methods
- [ ] Type guards or validation before type assertions

---

## Common Anti-Patterns to Avoid

1. ❌ **Mixed query + logic in one method**
   - Query methods should contain ONLY SQL + type cast
   - Logic methods should contain NO database access

2. ❌ **Validation inside transactions**
   - Always validate BEFORE starting transaction
   - Fail fast to avoid wasted transaction overhead

3. ❌ **Missing return type annotations**
   - Transform methods MUST have explicit return types
   - Catches schema drift at compile time

4. ❌ **Calling query methods from logic methods**
   - Logic methods should only call other logic methods
   - Maintains testability without database

5. ❌ **Using player name without display_name fallback**
   - Always query both `players.name` and `player_profiles.display_name`
   - Always prefer display_name when available

6. ❌ **Magic numbers instead of GOLF constants**
   - Use `GOLF.HOLES_PER_ROUND` not `18`
   - Use `GOLF.STANDARD_SLOPE_RATING` not `113`

7. ❌ **Naked JSON.parse without error handling**
   - Wrap JSON.parse in try/catch
   - Provide descriptive error messages

8. ❌ **Deeply nested control flow** (> 3 levels)
   - Use early returns: `if (!condition) return;`
   - Extract complex logic to helper methods

---

## Examples from BACKEND_GUIDE.md

**Good Service Organization**:
```typescript
class CompetitionService {
  // Query method - single SQL query
  private findCompetitionById(id: number): Competition | null {
    return this.db.prepare("SELECT * FROM competitions WHERE id = ?")
      .get(id) as Competition | null;
  }

  // Logic method - pure calculation
  private calculateRelativeToPar(score: number[], pars: number[]): number {
    return score.reduce((rel, shots, i) =>
      shots > 0 ? rel + (shots - pars[i]) : rel, 0);
  }

  // Transform method - explicit return type
  private transformCompetitionRow(row: CompetitionRow): Competition {
    return {
      ...row,
      pars: JSON.parse(row.pars),
      is_finished: Boolean(row.is_finished),
    };
  }

  // Public API method - orchestrates
  async getLeaderboard(id: number): Promise<LeaderboardEntry[]> {
    const comp = this.findCompetitionById(id);
    if (!comp) throw new Error("Competition not found");

    const participants = this.findParticipantsByCompetition(id);
    const pars = JSON.parse(comp.pars);

    return participants
      .map(p => this.calculateEntryScore(p, pars))
      .sort((a, b) => a.relativeToPar - b.relativeToPar);
  }
}
```

**Good Transaction Pattern**:
```typescript
createCompetitionWithTeeTimes(data: CreateDto, teeTimes: string[]) {
  // Validation OUTSIDE transaction
  this.validateCompetitionData(data);

  return this.db.transaction(() => {
    const competition = this.insertCompetition(data);
    const createdTeeTimes = teeTimes.map(time =>
      this.insertTeeTime(competition.id, time)
    );
    return { competition, teeTimes: createdTeeTimes };
  })();
}
```

---

## Summary

**TapScore service layer approach**: Clear separation between queries and logic, explicit transaction boundaries, and rigorous type safety. Quality through **organization and discipline**.

**Every service implementation must**:
- Read BACKEND_GUIDE.md first
- Separate query methods from logic methods
- Validate before transactions
- Use explicit return types on transforms
- Follow naming conventions
- Use GOLF constants
- Handle player display names correctly
- Stay under method size limits
- Keep nesting under 3 levels

Build services that are maintainable, testable, and reliable.
