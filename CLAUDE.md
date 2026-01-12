# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 📋 Table of Contents

### Backend Development
- [Development Commands](#backend-development-commands)
- [Architecture Patterns](#backend-architecture)
- [Service Layer Organization](#service-layer-code-organization)
- [Transaction Handling](#transaction-handling)
- [Code Quality Rules](#backend-code-quality-rules)
- [Testing Strategy](#backend-testing)
- [Feature Area Guides](#backend-feature-areas)

### Frontend Development
- [Development Commands](#frontend-development-commands)
- [Architecture Patterns](#frontend-architecture)
- [Design System & Visual Guidelines](#design-system--visual-guidelines)
- [Navigation Architecture](#frontend-navigation-architecture)
- [Testing Strategy](#frontend-testing)
- [Feature Area Guides](#frontend-feature-areas)

### General
- [Domain Model](#domain-model)
- [Database Management](#database-management)
- [Deployment Notes](#deployment-notes)
- [Important Constraints](#important-constraints)

---

# 📘 Backend Development

## Backend Development Commands

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

## Backend Testing

- In-memory SQLite database for each test file
- Comprehensive CRUD testing with validation scenarios
- API endpoint testing with proper HTTP status codes
- Business logic testing including calculations and constraints

## Backend Feature Areas

When working with specific backend features, consult these detailed guides for domain knowledge and implementation patterns:

- **Database Schema** → `docs/backend/database-schema.md` - Comprehensive table reference, relationships, and schema details
- **Authorization & Roles** → `docs/backend/authorization.md` - Role-based access control, admin tables, permission system
- **Tours & Enrollments** → `docs/backend/tours-and-enrollments.md` - Multi-competition championships with player enrollment
- **Competitions & Results** → `docs/backend/competitions-and-results.md` - Event management, leaderboards, finalization
- **Handicap System** → `docs/backend/handicap-system.md` - WHS calculations, course tees, gender-specific ratings
- **Player Profiles** → `docs/backend/player-profiles.md` - Extended profiles, handicap history tracking

---

# 📗 Frontend Development

## Frontend Development Commands

```bash
cd frontend

# Development server
npm run dev

# Production build
npm run build           # Build for production
npm run deploy         # Build and copy to ../frontend_dist/

# Testing
npm run test:e2e       # Playwright E2E tests

# Code quality
npm run lint           # ESLint checking
```

## Frontend Architecture

- **API Layer** (`frontend/src/api/`): React Query hooks for server state management
- **Components** (`frontend/src/components/`): Reusable UI with shadcn/ui + Radix
- **Views** (`frontend/src/views/`): Page-level components (admin/ and player/)
- **Router** (`frontend/src/router.tsx`): TanStack Router with file-based routing

### Key Frontend Patterns
- Custom React Query hooks for each entity (e.g., `useTeams()`, `useCreateTeam()`)
- Mobile-first responsive design with Tailwind CSS
- Dual interface: Admin panel for management, Player view for scorecards
- Real-time updates with automatic cache invalidation
- **Unified Topbar Architecture**: All player views use PlayerPageLayout for consistent navigation

## Design System & Visual Guidelines

**IMPORTANT**: Before creating or modifying any UI components, review these design system documents:

- **Visual Design Rules** → `docs/visual-design-rules.md`
  - Clean UI patterns avoiding "AI-generated template" look
  - One level of containment per visual group (no nested borders)
  - Use dividers between list items, not individual cards
  - Subtle hover states (background changes, not shadows/transforms)
  - Left accents for grouping instead of full borders

- **TapScore Style Guide** → `docs/STYLE_GUIDE.md`
  - Complete design system with brand colors, typography, component patterns
  - Golf-specific components (score displays, leaderboards, status indicators)
  - **Critical contrast guidelines** - maintain WCAG AA ratios
  - Tailwind CSS v4 configuration for custom colors and gradients
  - Mobile-first responsive patterns

### Key Design Principles
- One level of containment per visual group (no nested borders)
- Maintain WCAG AA contrast ratios (minimum 4.5:1 for text)
- Mobile-first with minimum 44px touch targets
- Use TapScore brand colors from style guide
- Follow established component patterns

## Frontend Testing

- Playwright for E2E testing
- Tests cover score entry, navigation, and critical user flows
- Mobile-responsive testing included

## Frontend Navigation Architecture

### Unified Topbar System

**CRITICAL**: All player views MUST use the unified topbar architecture for consistency.

#### Required Pattern for All Player Views
```tsx
export default function MyPlayerView() {
  return (
    <PlayerPageLayout
      title="Page Title"
      seriesId={seriesId}           // When available
      seriesName={seriesName}       // When available
      onBackClick={customHandler}   // When needed
      customActions={<Actions />}   // When needed
    >
      {/* Page content */}
    </PlayerPageLayout>
  );
}
```

**Key Components**:
- **PlayerPageLayout**: Main wrapper (`src/components/layout/PlayerPageLayout.tsx`)
- **CommonHeader**: Header with automatic HamburgerMenu (`src/components/navigation/CommonHeader.tsx`)
- **HamburgerMenu**: Context-aware navigation (`src/components/navigation/HamburgerMenu.tsx`)

**Full Documentation** → `docs/frontend/frontend-topbar-architecture.md`

## Frontend Feature Areas

When working with specific frontend features, consult these detailed guides:

- **Admin UI Patterns** → `docs/frontend/admin-ui.md` - Admin interface patterns and components
- **Player UI Patterns** → `docs/frontend/player-ui.md` - Player interface patterns and scorecard views

---

# 📚 Backend Architecture & Patterns

## Backend Architecture (Hexagonal/Clean)

- **API Layer** (`src/api/`): HTTP handlers using Hono framework
- **Service Layer** (`src/services/`): Business logic and domain operations
- **Database Layer** (`src/database/`): SQLite with custom migration system
- **Types** (`src/types/`): TypeScript interfaces and DTOs

### Key Backend Patterns
- Factory functions for API creation (e.g., `createCoursesApi()`)
- Service classes for business logic (e.g., `CourseService`)
- Custom migration system extending base `Migration` class
- Prepared statements for all database queries
- Comprehensive error handling with proper HTTP status codes

## Service Layer Code Organization

**Core Rule:** Within a service, a method contains EITHER a single SQL query OR business logic - never both.

#### Method Categories

**1. Query Methods** (private, single SQL statement)
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

**2. Logic Methods** (private, no SQL)
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

**Row-to-Domain Transform Methods**

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

**3. Public API Methods** (orchestration)
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

### Transaction Handling

SQLite transactions in Bun are synchronous and scoped to a callback. All query methods called within `db.transaction()` automatically participate in the same transaction.

#### Transaction Pattern

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

#### Key Principles
- **Transaction boundary** = `db.transaction(() => { ... })()`
- **Query methods join automatically** - they use the same `this.db` reference
- **Rollback on exception** - any error inside the callback triggers rollback
- **Validate before transaction** - fail fast without starting a transaction
- **Single-query operations** don't need explicit transactions (auto-commit)

#### Cross-Service Transactions
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

# 📚 General Information

## Domain Model

### Core Entities
- **Series**: Tournament series with multiple competitions
- **Competitions**: Individual golf events linked to courses and series
- **Courses**: Golf courses with 18-hole par configuration
- **Teams**: Participating teams in competitions
- **Tee Times**: Scheduled start times for groups
- **Participants**: Individual players/teams assigned to tee times
- **Documents**: Markdown content for series information

### Business Rules
- Courses must have exactly 18 holes with pars between 3-6
- Participants have scores as arrays (one per hole)
- Team names must be unique
- Competition dates must be in YYYY-MM-DD format
- Foreign key constraints are enforced

## Database Management

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

### Working with Production Database Copy

Use these commands to safely test migrations and changes against a copy of the production database:

1. **Fetch production database**: `bun run db:setup-prod`
   - Downloads current production database to `deploy-tmp/db.sqlite`
   - Creates backup before overwriting existing copy

2. **Test migrations**: `bun run db:migrate:prod`
   - Applies pending migrations to the production database copy
   - Uses `scripts/migrate.ts` with `DB_PATH=deploy-tmp/db.sqlite`
   - This is what you should run for local testing before deploying

3. **Verify database health**: `bun run db:health:prod`
   - Checks database connectivity and schema integrity
   - Uses `scripts/health.ts` with `DB_PATH=deploy-tmp/db.sqlite`
   - Useful after running migrations to ensure nothing broke

4. **Run server with prod data**: `bun run dev:prod`
   - Starts development server using production database copy
   - Sets `DB_PATH=deploy-tmp/db.sqlite` environment variable
   - Allows testing features with real production data structure

5. **Seed tour data (if needed)**: `bun run seed-tour:prod`
   - Populates tour-specific data into production database copy
   - Useful for testing tour-related features

**Important**:
- The `:prod` suffix commands work on a **copy** of the production database in `deploy-tmp/`, never directly on production
- The base commands (`db:migrate`, `db:health`) work on your local dev database
- During deployment, the deployment system calls `db:migrate` and `db:health` with `DB_PATH` already set to the downloaded production copy

## Development Guidelines

### When Adding New Features
1. **Backend**: Create service class → API factory → add routes to `app.ts` → write tests
2. **Frontend**: Create React Query hooks → implement UI components → add routes
3. **Database**: Create migration if schema changes needed
4. Always include comprehensive tests

### Code Quality Standards
- TypeScript strict mode enabled
- Use prepared statements for database queries
- Follow existing patterns (factory functions, service classes)
- Maintain separation of concerns between layers
- Write descriptive error messages
- Update tests when modifying existing functionality

### Git Commit Guidelines
- Use conventional commit format: `type(scope): description`
- Common types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`
- Write clear, descriptive commit messages with bullet points for multiple changes
- **NEVER include `Co-Authored-By` lines in commit messages**
- Stage only relevant files (exclude local config like `.claude/settings.local.json`)

---

# 🔧 Backend Code Quality Rules

These rules are inspired by McConnell's "Code Complete" and focus on managing complexity.

#### Method Size Limits

- **Logic methods:** Maximum 50 lines (excluding blanks and comments)
- **Query methods:** No strict line limit - SQL can be as long as needed for clarity, but keep wrapper logic minimal (just the query + type cast)
- **Public API methods:** Maximum 50 lines - if longer, extract helper methods

If a method exceeds these limits, decompose it into smaller single-purpose methods.

#### Control Flow Nesting

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

#### Golf Domain Constants

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

#### Defensive JSON Parsing

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

#### Variable Naming

- **Booleans:** Prefix with `is`, `has`, `should`, `can`
  - `isFinished`, `hasScores`, `shouldCalculateNet`

- **Collections:** Use plural nouns
  - `participants`, `scores`, `teeTimes`

- **Transformed data:** Name describes the transformation
  - `competitionWithCourse` not `competition`
  - `sortedLeaderboard` not `leaderboard`
  - `netAdjustedScores` not `scores`

- **Avoid generic names:** `data`, `result`, `item`, `temp`, `info`, `obj`

#### Type Safety

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

#### Error Handling
- Service layer throws descriptive `Error` objects
- API layer maps to appropriate HTTP status codes
- Frontend handles errors with user-friendly messages
- Always return JSON error responses: `{ error: "message" }`

---

# 🚀 Deployment Notes

### Backend
- Built with Bun.js runtime
- SQLite database file: `golf_series.db`
- Serves frontend static files from `frontend_dist/`
- Environment variables: `PORT`, `DATABASE_PATH`

### Frontend
- Built as static files copied to `frontend_dist/`
- Supports deployment under subpaths (e.g., `/golf-serie/`)
- Dynamic API base URL detection for dev/prod environments

---

# 📈 Active Improvement Plans

### Frontend Refactoring Plan
**Status**: In Progress
**Document**: `/docs/frontend-refactoring-plan.md`

Tracked improvements for frontend maintainability:
- Phase 0: Testing foundation (prerequisite - add tests before refactoring)
- Phase 1: Type system cleanup (shared types directory)
- Phase 2: Component barrel exports
- Phase 3: Styling constants consolidation
- Phase 4: Error boundaries
- Phase 5: LeaderboardComponent split
- Phase 6: CompetitionDetail split
- Phase 7: Documentation updates

When working on frontend, check this plan for context and update progress as phases complete.

---

# ⚠️ Important Constraints

### Backend
- Database migrations are one-way (no rollback implemented)
- Always use prepared statements for SQL queries (security)
- Maintain existing API contracts when making changes
- Backend serves as both API and static file server

### Frontend
- Never modify `frontend/` directory files unless explicitly requested
- **ALL player views MUST use PlayerPageLayout** - never use CommonHeader directly
- Mobile-first design principles must be maintained
- Follow TapScore design system (see `docs/STYLE_GUIDE.md` and `docs/visual-design-rules.md`)
- Maintain WCAG AA contrast ratios

---

# 📖 Documentation Structure

This file (CLAUDE.md) focuses on **patterns, conventions, and code mechanics**. For detailed feature documentation:

- **Backend Features**: See `docs/backend/` for domain-specific guides
- **Frontend Features**: See `docs/frontend/` for UI patterns and components
- **Design System**: See `docs/STYLE_GUIDE.md` and `docs/visual-design-rules.md`
- **Deployment**: See `docs/deployment/` for infrastructure guides
- **Refactoring Plans**: See `docs/frontend-refactoring-plan.md`