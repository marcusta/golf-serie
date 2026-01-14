# Backend Development Guide

**For Backend Sub-Agent Use Only**

This guide contains all backend-specific rules, patterns, and conventions. When you receive a backend task, follow these guidelines strictly.

---

## 📋 Table of Contents

- [Development Commands](#development-commands)
- [Architecture Patterns](#architecture-patterns)
- [Service Layer Organization](#service-layer-organization)
- [Transaction Handling](#transaction-handling)
- [Code Quality Rules](#code-quality-rules)
- [Testing Strategy](#testing-strategy)
- [Database Patterns](#database-patterns)
- [Player Display Names Pattern](#player-display-names-pattern)

---

## Development Commands

```bash
# Development server with auto-reload
bun run dev

# Production build and run
bun run build
bun run prod

# Testing
bun run test:server     # Run server tests only (recommended)
bun test                # Run all tests (includes frontend)
bun test --watch        # Watch mode

# Database
bun run migrate         # Run database migrations
bun run setup          # Install deps + migrate + seed data

# Code quality
bun run type-check      # TypeScript type checking
bun run lint           # ESLint checking
```

---

## Architecture Patterns

### Hexagonal/Clean Architecture

- **API Layer** (`src/api/`): HTTP handlers using Hono framework
- **Service Layer** (`src/services/`): Business logic and domain operations
- **Database Layer** (`src/database/`): SQLite with custom migration system
- **Types** (`src/types/`): TypeScript interfaces and DTOs

### Key Backend Patterns

- Factory functions for API creation (e.g., `createCoursesApi()`)
- Service classes for business logic (e.g., `CourseService`)
- Strategy pattern for game types (e.g., `StrokePlayStrategy`, `StablefordStrategy`) - see `docs/backend/game-types.md`
- Custom migration system extending base `Migration` class
- Prepared statements for all database queries
- Comprehensive error handling with proper HTTP status codes

---

## Service Layer Organization

**Core Rule:** Within a service, a method contains EITHER a single SQL query OR business logic - never both.

### Method Categories

#### 1. Query Methods (private, single SQL statement)

- Prefix: `find*`, `get*`, `insert*`, `update*`, `delete*`
- Contains exactly one SQL query
- Minimal transformation (e.g., JSON.parse for stored data)
- Transaction-unaware (automatically joins any active transaction)

```typescript
private findCompetitionById(id: number): Competition | null {
  return this.db.prepare("SELECT * FROM competitions WHERE id = ?")
    .get(id) as Competition | null;
}

private insertCompetition(data: CreateCompetitionDto): Competition {
  return this.db.prepare(`
    INSERT INTO competitions (name, date, course_id)
    VALUES (?, ?, ?) RETURNING *
  `).get(data.name, data.date, data.course_id) as Competition;
}
```

#### 2. Logic Methods (private, no SQL)

- Prefix: `calculate*`, `build*`, `validate*`, `process*`, `transform*`
- Pure business logic, no database access
- Calls other logic methods, never query methods
- Easily unit-testable without database

```typescript
private calculateRelativeToPar(score: number[], pars: number[]): number {
  return score.reduce((rel, shots, i) =>
    shots > 0 ? rel + (shots - pars[i]) : rel, 0);
}

private validateCompetitionData(data: CreateCompetitionDto): void {
  if (!data.name?.trim()) throw new Error("Name required");
}
```

#### Row-to-Domain Transform Methods

Transform methods convert database rows to domain types. They must:
- Have explicit return type annotations (enforces compile-time checking)
- Use separate Row interface (not extending domain type) when representations differ
- Handle type conversions: SQLite booleans (0/1 → boolean), JSON strings → arrays, null handling

```typescript
// Row type: database representation (uses null, number for bools, JSON strings)
interface ParticipantRow {
  id: number;
  score: string;           // JSON string in DB
  is_locked: number;       // SQLite boolean (0/1)
  player_id: number | null;
}

// Domain type: application representation (uses boolean, parsed arrays)
interface Participant {
  id: number;
  score: number[];         // Parsed array
  is_locked: boolean;      // Proper boolean
  player_id: number | null;
}

// Transform with EXPLICIT return type - catches missing fields at compile time
private transformParticipantRow(row: ParticipantRow): Participant {
  return {
    ...row,
    score: JSON.parse(row.score),
    is_locked: Boolean(row.is_locked),
  };
}
```

If `Participant` gains a new required field, TypeScript will error because the spread won't include it. This catches schema drift between Row and Domain types.

#### 3. Public API Methods (orchestration)

- Combines query methods and logic methods
- Defines transaction boundaries when needed
- Validates input before starting transactions

```typescript
async getLeaderboard(competitionId: number): Promise<LeaderboardEntry[]> {
  const competition = this.findCompetitionById(competitionId);
  if (!competition) throw new Error("Competition not found");

  const participants = this.findParticipantsByCompetition(competitionId);
  const pars = JSON.parse(competition.pars);

  return participants
    .map(p => this.calculateEntryScore(p, pars))
    .sort((a, b) => a.relativeToPar - b.relativeToPar);
}
```

---

## Transaction Handling

SQLite transactions in Bun are synchronous and scoped to a callback. All query methods called within `db.transaction()` automatically participate in the same transaction.

### Transaction Pattern

```typescript
createCompetitionWithTeeTimes(data: CreateCompetitionDto, teeTimes: string[]) {
  // Validation OUTSIDE transaction (fail fast)
  this.validateCompetitionData(data);

  // Transaction boundary - all query methods inside automatically join
  return this.db.transaction(() => {
    const competition = this.insertCompetition(data);

    const createdTeeTimes = teeTimes.map(time =>
      this.insertTeeTime(competition.id, time)
    );

    return { competition, teeTimes: createdTeeTimes };
  })();
}
```

### Key Principles

- **Transaction boundary** = `db.transaction(() => { ... })()`
- **Query methods join automatically** - they use the same `this.db` reference
- **Rollback on exception** - any error inside the callback triggers rollback
- **Validate before transaction** - fail fast without starting a transaction
- **Single-query operations** don't need explicit transactions (auto-commit)

### Cross-Service Transactions

When a transaction spans multiple services, create an orchestrator method:

```typescript
// All services share the same db instance, so they join the transaction
createFullCompetition(data: FullCompetitionDto) {
  return this.db.transaction(() => {
    const comp = this.competitionService.insertCompetition(data);
    const times = this.teeTimeService.createTeeTimes(comp.id, data.teeTimes);
    return { comp, times };
  })();
}
```

---

## Code Quality Rules

These rules are inspired by McConnell's "Code Complete" and focus on managing complexity.

### Method Size Limits

- **Logic methods:** Maximum 50 lines (excluding blanks and comments)
- **Query methods:** No strict line limit - SQL can be as long as needed for clarity, but keep wrapper logic minimal (just the query + type cast)
- **Public API methods:** Maximum 50 lines - if longer, extract helper methods

If a method exceeds these limits, decompose it into smaller single-purpose methods.

### Control Flow Nesting

Maximum **3 levels** of nesting. Use early returns to flatten code:

```typescript
// Bad - 4 levels deep
if (competition) {
  if (participant) {
    for (const score of scores) {
      if (score > 0) { /* too deep */ }
    }
  }
}

// Good - max 2 levels
if (!competition) return null;
if (!participant) return null;

for (const score of scores) {
  if (score <= 0) continue;
  // Process at level 2
}
```

### Golf Domain Constants

Use constants from `src/constants/golf.ts` instead of magic numbers:

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

```typescript
// Bad
if (holesPlayed === 18) { ... }
const slopeRating = tee.slope_rating || 113;

// Good
import { GOLF } from "../constants/golf";
if (holesPlayed === GOLF.HOLES_PER_ROUND) { ... }
const slopeRating = tee.slope_rating || GOLF.STANDARD_SLOPE_RATING;
```

### Defensive JSON Parsing

Always wrap `JSON.parse` with error handling:

```typescript
// Bad - cryptic error if invalid JSON
const pars = JSON.parse(competition.pars);

// Good - descriptive error
private parseParsArray(json: string): number[] {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) {
      throw new Error("Pars must be an array");
    }
    return parsed;
  } catch (e) {
    throw new Error(`Invalid pars format: ${e instanceof Error ? e.message : 'unknown error'}`);
  }
}
```

Consider adding shared utilities to `src/utils/parsing.ts`.

### Variable Naming

- **Booleans:** Prefix with `is`, `has`, `should`, `can`
  - `isFinished`, `hasScores`, `shouldCalculateNet`

- **Collections:** Use plural nouns
  - `participants`, `scores`, `teeTimes`

- **Transformed data:** Name describes the transformation
  - `competitionWithCourse` not `competition`
  - `sortedLeaderboard` not `leaderboard`
  - `netAdjustedScores` not `scores`

- **Avoid generic names:** `data`, `result`, `item`, `temp`, `info`, `obj`

### Type Safety

- **Never use `any`** in service layer code
- Define explicit return types for all methods
- Use type guards or validation before type assertions

```typescript
// Bad
getCompetitions(tourId: number): any[] { ... }
const row = stmt.get(id) as any;

// Good
getCompetitions(tourId: number): CompetitionWithCourse[] { ... }
const row = stmt.get(id) as CompetitionRow | null;
```

### Error Handling

- Service layer throws descriptive `Error` objects
- API layer maps to appropriate HTTP status codes
- Frontend handles errors with user-friendly messages
- Always return JSON error responses: `{ error: "message" }`

---

## Testing Strategy

- In-memory SQLite database for each test file
- Comprehensive CRUD testing with validation scenarios
- API endpoint testing with proper HTTP status codes
- Business logic testing including calculations and constraints

---

## Database Patterns

### Always Use Prepared Statements

```typescript
// Bad - SQL injection risk
const results = db.exec(`SELECT * FROM users WHERE name = '${name}'`);

// Good - Safe from injection
const results = db.prepare("SELECT * FROM users WHERE name = ?").all(name);
```

### Migration System

- Migrations are in `src/database/migrations/`
- Each migration extends base `Migration` class
- Tracked in `migrations` table with version and timestamp
- Use `columnExists()` helper for conditional schema changes

### Key Database Commands

```bash
# Local development database
bun run migrate         # Apply pending migrations to local db (src/database/migrate.ts)
bun run db:migrate      # Run migration script on local dev db (scripts/migrate.ts)
bun run db:health       # Run health check on local dev db (scripts/health.ts)

# Production database workflow (local testing)
bun run db:setup-prod   # Fetch production db to deploy-tmp/db.sqlite
bun run db:migrate:prod # Run migrations on prod db copy
bun run db:health:prod  # Check prod db copy health and schema
bun run dev:prod        # Run dev server with prod db copy
bun run seed-tour:prod  # Seed tour data into prod db copy
```

---

## Player Display Names Pattern

**CRITICAL RULE:** Whenever displaying a player name in the UI, always use `player_profiles.display_name` first, then fall back to `players.name`.

### Helper Function (use this for consistency)

```typescript
import { getPlayerDisplayName } from "../utils/player-display";

// In transform methods:
const displayName = getPlayerDisplayName(row.player_display_name, row.player_name);
```

### Database Query Pattern (use this in all player queries)

```sql
SELECT
  t.*,
  p.name as player_name,
  pp.display_name as player_display_name
FROM your_table t
LEFT JOIN players p ON t.player_id = p.id
LEFT JOIN player_profiles pp ON p.id = pp.player_id
```

**Why:**
- `display_name` is the user's preferred name (set in their profile)
- `name` is the system name (from user registration)
- Always respect the user's display preference

**Location:** `src/utils/player-display.ts` contains helper functions and SQL fragments

---

## Business Rules

### Core Entities

- **Series**: Tournament series with multiple competitions
- **Competitions**: Individual golf events linked to courses and series
- **Courses**: Golf courses with 18-hole par configuration
- **Teams**: Participating teams in competitions
- **Tee Times**: Scheduled start times for groups
- **Participants**: Individual players/teams assigned to tee times
- **Documents**: Markdown content for series information

### Constraints

- Courses must have exactly 18 holes with pars between 3-6
- Participants have scores as arrays (one per hole)
- Team names must be unique
- Competition dates must be in YYYY-MM-DD format
- Foreign key constraints are enforced

---

## Git Commit Guidelines

- Use conventional commit format: `type(scope): description`
- Common types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`
- Write clear, descriptive commit messages with bullet points for multiple changes
- **NEVER include `Co-Authored-By` lines in commit messages**
- Stage only relevant files (exclude local config like `.claude/settings.local.json`)

---

## Important Constraints

- Database migrations are one-way (no rollback implemented)
- Always use prepared statements for SQL queries (security)
- Maintain existing API contracts when making changes
- Backend serves as both API and static file server

---

## Feature Area Documentation

When working with specific backend features, consult these detailed guides:

- **Database Schema** → `docs/backend/database-schema.md` - Comprehensive table reference, relationships, and schema details
- **Authorization & Roles** → `docs/backend/authorization.md` - Role-based access control, admin tables, permission system
- **Game Type System** → `docs/backend/game-types.md` - Strategy pattern for multiple golf formats (Stroke Play, Stableford, Scramble, etc.), backend architecture, and frontend extension points
