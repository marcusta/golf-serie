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