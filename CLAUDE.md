# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend (Bun.js)
```bash
# Development server with auto-reload
bun run dev

# Production build and run
bun run build
bun run prod

# Testing
bun test                # Run all tests
bun test --watch        # Watch mode
bun test --concurrency 1  # Run tests sequentially

# Database
bun run migrate         # Run database migrations
bun run setup          # Install deps + migrate + seed data

# Code quality
bun run type-check      # TypeScript type checking
bun run lint           # ESLint checking
```

### Frontend (React + Vite)
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

## Architecture Overview

This is a full-stack golf series management application with clean separation between backend and frontend.

### Backend Architecture (Hexagonal/Clean Architecture)
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

### Service Layer Code Organization

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

### Frontend Architecture (React + TanStack)
- **API Layer** (`src/api/`): React Query hooks for server state
- **Components** (`src/components/`): Reusable UI with shadcn/ui + Radix
- **Views** (`src/views/`): Page-level components (admin/ and player/)
- **Router** (`src/router.tsx`): TanStack Router with file-based routing

### Key Frontend Patterns
- Custom React Query hooks for each entity (e.g., `useTeams()`, `useCreateTeam()`)
- Mobile-first responsive design with Tailwind CSS
- Dual interface: Admin panel for management, Player view for scorecards
- Real-time updates with automatic cache invalidation
- **Unified Topbar Architecture**: All player views use PlayerPageLayout for consistent navigation

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
bun run migrate         # Apply pending migrations
bun run src/database/migrate.ts  # Direct migration run
```

## Testing Strategy

### Backend Testing
- In-memory SQLite database for each test file
- Comprehensive CRUD testing with validation scenarios
- API endpoint testing with proper HTTP status codes
- Business logic testing including calculations and constraints

### Frontend Testing
- Playwright for E2E testing
- Tests cover score entry, navigation, and critical user flows
- Mobile-responsive testing included

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

### Backend Code Quality Rules

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

### Error Handling
- Service layer throws descriptive `Error` objects
- API layer maps to appropriate HTTP status codes
- Frontend handles errors with user-friendly messages
- Always return JSON error responses: `{ error: "message" }`

## Deployment Notes

### Backend
- Built with Bun.js runtime
- SQLite database file: `golf_series.db`
- Serves frontend static files from `frontend_dist/`
- Environment variables: `PORT`, `DATABASE_PATH`

### Frontend
- Built as static files copied to `frontend_dist/`
- Supports deployment under subpaths (e.g., `/golf-serie/`)
- Dynamic API base URL detection for dev/prod environments

## Frontend Navigation Architecture

### Unified Topbar System
**Implementation Date**: 2025-01-28

All player views MUST use the unified topbar architecture for consistency:

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

#### Architecture Components
- **PlayerPageLayout**: Main wrapper for all player views (`src/components/layout/PlayerPageLayout.tsx`)
- **CommonHeader**: Enhanced header with automatic HamburgerMenu (`src/components/navigation/CommonHeader.tsx`)
- **HamburgerMenu**: Context-aware navigation menu with improved contrast (`src/components/navigation/HamburgerMenu.tsx`)

#### Key Benefits
- **Automatic hamburger menu** on all player views with context-aware navigation
- **Improved accessibility** with light icons (`text-scorecard`) on dark backgrounds
- **Consistent UX** across all views with unified navigation patterns
- **Easy maintenance** through single source of truth for header behavior

#### Implementation Status
✅ **All 10 player views successfully converted**:
- Competitions.tsx, Series.tsx, SeriesCompetitions.tsx
- SeriesDetail.tsx, SeriesDocumentDetail.tsx, SeriesDocuments.tsx  
- SeriesStandings.tsx, CompetitionDetail.tsx, CompetitionRound.tsx
- TeeTimeDetail.tsx

**Documentation**: See `/docs/frontend-topbar-architecture.md` for complete implementation guide.

## Important Constraints

- Never modify files in the `frontend/` directory unless explicitly requested
- **ALL player views must use PlayerPageLayout** - never use CommonHeader directly
- Backend serves as API and static file server for the frontend
- Database migrations are one-way (no rollback implemented)
- Mobile-first design principles must be maintained
- Maintain existing API contract when making changes