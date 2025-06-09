# .cursor/rules/system-rule.mdc

```mdc
---
description: 
globs: 
alwaysApply: true
---
# Golf Series Backend - Cursor Rules

## Project Overview
This is a Golf Series management backend system built with TypeScript and Bun.js, following clean architecture principles with clear separation of concerns.

## Technology Stack
- **Runtime**: Bun.js (>=1.0.0)
- **Language**: TypeScript (strict mode)
- **Web Framework**: Hono (for HTTP server and routing)
- **Database**: SQLite with Bun's built-in SQLite library, simple migration lib built-in
- **Testing**: Bun's built-in test runner
- **Package Manager**: Bun

## Architecture & Code Structure

### 1. Layered Architecture
The project follows a clean 3-layer architecture:

\`\`\`
src/
├── api/           # HTTP layer - API endpoints and request/response handling
├── services/      # Business logic layer - domain services
├── database/      # Data access layer - migrations, schema, DB utilities
├── types/         # Type definitions and DTOs
├── app.ts         # Application setup and routing
└── server.ts      # Server entry point
\`\`\`

### 2. API Layer (`src/api/`)
- **Purpose**: HTTP request/response handling, validation, error handling
- **Pattern**: Factory functions that create API handlers (e.g., `createCoursesApi()`)
- **Responsibilities**: 
  - Parse request bodies and parameters
  - Call appropriate service methods
  - Handle errors and return proper HTTP status codes
  - Return JSON responses with correct Content-Type headers
- **Error Handling**: Always wrap service calls in try-catch, return 400 for validation errors, 404 for not found, 500 for unexpected errors

### 3. Service Layer (`src/services/`)
- **Purpose**: Business logic and domain operations
- **Pattern**: Classes that encapsulate domain logic (e.g., `CourseService`, `CompetitionService`)
- **Responsibilities**:
  - Input validation and business rule enforcement
  - Database operations through direct SQL queries
  - Data transformation and calculations
  - Cross-entity operations and relationships
- **Database Access**: Services directly use `Database` from `bun:sqlite` with prepared statements

### 4. Database Layer (`src/database/`)
- **Migration System**: Custom migration classes extending base `Migration` class
- **Schema**: Defined through migration files, not ORM models
- **Tables**: courses, teams, competitions, tee_times, participants, series
- **Key Features**: Foreign key constraints enabled, timestamps on all entities

## Database Management

### Schema Design
- **Primary Keys**: Auto-incrementing integers
- **Timestamps**: `created_at` and `updated_at` on all entities
- **Foreign Keys**: Enforced with cascading behavior
- **JSON Fields**: Used for scores (arrays) and course pars

### Migration Pattern
1. Create new migration class in `src/database/migrations/`
2. Extend base `Migration` class
3. Implement `up()` and `down()` methods
4. Use helper methods like `columnExists()` for conditional changes
5. Migrations are tracked in `migrations` table

### Database Operations
- Use prepared statements for all queries
- Enable foreign keys with `PRAGMA foreign_keys = ON`
- Handle constraint violations gracefully
- Use transactions for multi-step operations

## Testing Strategy

### Test Structure
\`\`\`
tests/
├── *.test.ts         # Feature-specific test files
├── test-helpers.ts   # Shared testing utilities
└── test-server.ts    # Test server management
\`\`\`

### Testing Patterns
1. **Setup/Teardown**: Use `beforeEach`/`afterEach` with in-memory database
2. **Test Database**: Create fresh database for each test file
3. **API Testing**: Use `makeRequest` helper for HTTP calls
4. **Assertions**: Use `expectJsonResponse` and `expectErrorResponse` helpers
5. **Test Organization**: Group tests by HTTP method and endpoint

### Test Requirements
- **Coverage**: Test all CRUD operations for each entity
- **Validation**: Test all input validation scenarios
- **Error Cases**: Test 404, 400, and constraint violation scenarios
- **Relationships**: Test foreign key constraints and cascading behavior
- **Business Logic**: Test calculations (leaderboards, scoring, etc.)

## Key Business Rules

### Golf Domain Rules
- **Courses**: Maximum 18 holes, pars between 3-6
- **Competitions**: Must have valid YYYY-MM-DD date format
- **Participants**: Belong to tee times, have scores as number arrays
- **Leaderboard**: Calculated relative to par across all holes played

### Data Validation
- **Required Fields**: Name fields cannot be empty/whitespace
- **Unique Constraints**: Team names, series names must be unique
- **Foreign Keys**: Always validate referenced entities exist
- **Dates**: Use ISO format (YYYY-MM-DD) for competition dates

## Development Guidelines

### When Adding New Features
1. **API Layer**: Create factory function returning handlers object
2. **Service Layer**: Create service class with domain methods
3. **Types**: Define DTOs for create/update operations
4. **Database**: Add migration if schema changes needed
5. **Tests**: Write comprehensive test suite covering all scenarios
6. **Routes**: Add routes to `app.ts` with proper HTTP methods

### When Modifying Existing Code
1. **Update Services**: Modify business logic in service layer
2. **Update Tests**: Ensure all existing tests pass and add new test cases
3. **Update Types**: Modify DTOs if request/response structure changes
4. **Database Changes**: Create new migration if schema modifications needed

### Error Handling Standards
- Service layer throws descriptive Error objects
- API layer catches and maps to appropriate HTTP status codes
- Always return JSON error responses with `{ error: "message" }` format
- Use specific error messages for validation failures

### Code Quality Standards
- Use TypeScript strict mode
- Prefer prepared statements over string concatenation
- Use descriptive variable names and function names
- Keep API handlers thin - delegate to services
- Write self-documenting code with clear intent

### Testing Requirements for Changes
- **New Features**: Must include full test coverage
- **Bug Fixes**: Add regression test before fixing
- **API Changes**: Test all HTTP methods and status codes
- **Business Logic**: Test edge cases and validation rules
- **Database Changes**: Test constraints and relationships

Remember: Every code change should be accompanied by corresponding test updates to maintain the high test coverage and ensure system reliability.

## Prompt interaction
When changing or updating APIs you should print routes and body format at the end of prompts so I know the API

There is a frontend codebase in the /frontend directory. You should never update those files.
```

# .gitignore

```
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*
.pnpm-debug.log*

# Diagnostic reports (https://nodejs.org/api/report.html)
report.[0-9]*.[0-9]*.[0-9]*.[0-9]*.json

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Directory for instrumented libs generated by jscoverage/JSCover
lib-cov

# Coverage directory used by tools like istanbul
coverage
*.lcov

# nyc test coverage
.nyc_output

# Grunt intermediate storage (https://gruntjs.com/creating-plugins#storing-task-files)
.grunt

# Bower dependency directory (https://bower.io/)
bower_components

# node-waf configuration
.lock-wscript

# Compiled binary addons (https://nodejs.org/api/addons.html)
build/Release

# Dependency directories
node_modules/
jspm_packages/

# Snowpack dependency directory (https://snowpack.dev/)
web_modules/

# TypeScript cache
*.tsbuildinfo

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Optional stylelint cache
.stylelintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variable files
.env
.env.development.local
.env.test.local
.env.production.local
.env.local

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# Next.js build output
.next
out

# Nuxt.js build / generate output
.nuxt
dist

# Gatsby files
.cache/
# Comment in the public line in if your project uses Gatsby and not Next.js
# https://nextjs.org/blog/next-9-1#public-directory-support
# public

# vuepress build output
.vuepress/dist

# vuepress v2.x temp and cache directory
.temp
.cache

# vitepress build output
**/.vitepress/dist

# vitepress cache directory
**/.vitepress/cache

# Docusaurus cache and generated files
.docusaurus

# Serverless directories
.serverless/

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# TernJS port file
.tern-port

# Stores VSCode versions used for testing VSCode extensions
.vscode-test

# yarn v2
.yarn/cache
.yarn/unplugged
.yarn/build-state.yml
.yarn/install-state.gz
.pnp.*

```

# frontend/.cursor/rules/frontend-rules.mdc

```mdc
---
description: 
globs: 
alwaysApply: false
---
# Golf Scorecard Frontend - Cursor Rules

## Project Overview
This is a React TypeScript frontend for a golf scorecard application with dual interfaces: **Admin Panel** for managing competitions/teams/courses and **Player View** for score entry and leaderboards.

## Tech Stack & Core Dependencies
- **Framework**: React 19.1.0 + TypeScript
- **Build Tool**: Vite 6.3.5
- **Routing**: TanStack Router with file-based routing
- **State Management**: TanStack Query (React Query) for server state
- **Styling**: Tailwind CSS 4.1.7 with custom design system
- **UI Components**: Radix UI primitives + custom shadcn/ui components
- **Icons**: Lucide React
- **HTTP Client**: Native fetch API with custom config

## Project Structure

\`\`\`
src/
├── api/           # API layer with React Query hooks
├── components/    # Reusable UI components
│   ├── ui/        # shadcn/ui base components
│   └── score-entry/ # Specialized score entry components
├── views/         # Page-level components
│   ├── admin/     # Admin panel pages
│   └── player/    # Player interface pages
├── utils/         # Utility functions
├── lib/           # Core utilities (utils.ts for cn() helper)
└── router.tsx     # Route definitions
\`\`\`

## API Layer (`src/api/`)
- **Pattern**: Each entity has its own file (teams.ts, courses.ts, etc.)
- **Hooks**: Custom React Query hooks for CRUD operations
  - `use[Entity]()` - fetch list
  - `use[Entity](id)` - fetch single
  - `useCreate[Entity]()` - mutation for creation
  - `useUpdate[Entity]()` - mutation for updates
  - `useDelete[Entity]()` - mutation for deletion
- **Config**: `config.ts` handles base URL detection for dev/prod environments
- **Base URL**: Uses dynamic detection (`/api` in dev, `/golf-serie/api` in production)

## Components Architecture

### UI Components (`src/components/ui/`)
- **Base**: shadcn/ui components with Radix UI primitives
- **Styling**: Uses `cn()` utility for conditional classes
- **Variants**: CVA (class-variance-authority) for component variants
- **Theme**: CSS custom properties for consistent theming

### Specialized Components
- **ParticipantAssignment**: Complex drag-and-drop assignment interface
- **ScoreEntry**: Mobile-optimized score entry with custom keyboard
- **Custom Keyboard**: Touch-optimized number input for mobile score entry

## Routing & Navigation
- **Router**: TanStack Router with dynamic base path support
- **Structure**: 
  - `/admin/*` - Admin panel routes
  - `/player/*` - Player interface routes
  - Default redirect to `/player/standings`
- **Base Path**: Configurable for deployment under subpaths (e.g., `/golf-serie/`)

## Views Structure

### Admin Views (`src/views/admin/`)
- **AdminLayout**: Shared layout with navigation tabs
- **Teams**: Team CRUD with modal forms
- **Courses**: Course management with hole par configuration
- **Competitions**: Competition creation and management
- **CompetitionTeeTimes**: Complex tee time and participant assignment

### Player Views (`src/views/player/`)
- **PlayerLayout**: Player-focused layout
- **Standings**: General leaderboard and statistics
- **Competitions**: Browse and view competitions
- **CompetitionDetail**: Detailed competition view with tabs
- **TeeTimeDetail**: Full-screen score entry interface

## Styling Conventions
- **Utility-First**: Tailwind CSS with custom design tokens
- **Colors**: Green primary theme with semantic color usage
- **Responsive**: Mobile-first design with `md:` and `lg:` breakpoints
- **Components**: Consistent padding, shadows, and border radius
- **State Indicators**: Color-coded status (green=success, blue=info, red=error)

## Data Flow & State Management
- **Server State**: TanStack Query for all API interactions
- **Local State**: React useState for component-specific state
- **Mutations**: Optimistic updates with error handling and cache invalidation
- **Real-time**: Automatic cache invalidation for data consistency

## Key Features & Patterns

### Participant Assignment System
- **Multi-format Support**: Handles single players and team formats (Bästboll, etc.)
- **Player Limits**: 4-player maximum per tee time with validation
- **Drag & Drop**: Native HTML5 drag-and-drop with touch support
- **Reordering**: Participant order management within tee times

### Score Entry Interface
- **Mobile-Optimized**: Full-screen interface with custom keyboard
- **Touch-First**: Large touch targets and gesture support
- **Progressive**: Hole-by-hole entry with navigation
- **Flexible Input**: Custom keyboard for common scores + native input for edge cases

### Deployment Configuration
- **Multi-Environment**: Supports root deployment and subpath deployment
- **Dynamic Config**: Runtime detection of deployment context
- **Reverse Proxy Ready**: Configured for Nginx/Apache deployment
- **Asset Paths**: Correct static asset handling in all environments

## Development Conventions

### Code Style
- **TypeScript**: Strict mode enabled with proper typing
- **Components**: Functional components with hooks
- **Props**: Interface definitions for all component props
- **Exports**: Named exports preferred, default exports for pages/layouts

### Error Handling
- **API Errors**: Handled in React Query with user-friendly messages
- **Loading States**: Consistent loading indicators and skeletons
- **Validation**: Client-side validation with server-side backup
- **Fallbacks**: Graceful degradation for missing data

### Performance
- **Query Optimization**: Efficient React Query cache management
- **Bundle Splitting**: Route-based code splitting
- **Mobile Performance**: Optimized for mobile devices and touch interactions
- **Memory Management**: Proper cleanup of event listeners and timers

## File Naming & Organization
- **PascalCase**: React components and TypeScript interfaces
- **camelCase**: Functions, variables, and file names (except components)
- **kebab-case**: CSS classes and some utility files
- **Grouping**: Related functionality grouped in folders (api/, components/, views/)

## Environment & Build
- **Development**: Vite dev server with proxy to localhost:3010
- **Production**: Static build with configurable base path
- **Preview**: Production preview mode for testing
- **Deploy**: Automated copy to `../frontend_dist/` directory

## Integration Points
- **Backend API**: RESTful API ron port 3010 with CORS support
- **Course Data**: Handles 18-hole courses with par information
- **Multi-team**: Supports multiple teams with flexible participant types
- **Score Tracking**: Real-time score updates with leaderboard calculation

Remember to maintain consistency with existing patterns, use the established API hooks, and follow the mobile-first responsive design principles throughout the codebase.
```

# frontend/.cursor/rules/product-description.mdc

```mdc
---
description: 
globs: 
alwaysApply: false
---
# Golf Tournament & Scoring Platform - Product Specification

## 1. Executive Summary

This document outlines the product specification for a comprehensive digital golf scoring platform that supports various tournament formats, series, tours, and adhoc games. The platform serves both competitive organized golf (team series, individual tours) and casual play, with real-time scoring, leaderboards, and statistics.

### Core Value Proposition
- Digital scoring for all golf formats (stroke play, stableford, match play, etc.)
- Support for team series, individual tours, and standalone competitions
- Real-time leaderboards and results
- Mobile-first scoring interface
- Comprehensive statistics and historical data

### Target Users
1. **Golf Clubs & Organizations** - Running official series and tours
2. **Golf Groups & Friends** - Organizing casual series, tours, or one-off competitions
3. **Individual Players** - Participating in events and tracking personal statistics

## 2. User Types & Access Levels

### 2.1 Registered Users
- **Players**: Can join competitions, enter scores, view statistics
- **Admins**: Can create/manage series, tours, competitions, and teams
- **Player-Admins**: Have both player and admin capabilities
- Authentication via email/password
- Profile management with handicap, home club, etc.

### 2.2 Temporary Token Users
- Access specific competitions via unique token/code
- Limited to scoring and viewing for that specific event
- No account required
- Token expires after competition ends
- Ideal for guest players or one-time participants

### 2.3 Anonymous Users
- Browse public series, tours, and competitions
- View leaderboards and results (read-only)
- Can access events via direct link (for semi-private events)
- Cannot enter scores or join competitions

## 3. Application Structure

### 3.1 Public Section (Player Interface)

#### Landing Page (`/`)
- **Available Series**: Card grid showing active team series with:
  - Series name and logo
  - Current standings summary
  - Next upcoming competition
  - Number of participating teams
- **Available Tours**: Similar grid for individual tours
- **Upcoming Competitions**: Timeline view of all competitions across series/tours
- **Live Leaderboards**: Real-time top 5 from ongoing competitions
- **Quick Actions**:
  - "Create Adhoc Game" button
  - "Join with Code" input field
  - "My Competitions" (for logged-in users)

#### Series View (`/series/{series-id}`)
- **Header Section**:
  - Series banner image
  - Series name and description
  - Sponsor logos (if applicable)
- **Navigation Tabs**:
  - Overview
  - Standings
  - Competitions
  - Teams
  - Statistics
  - Info/Rules
- **Content Area**: Dynamic based on selected tab

#### Tour View (`/tours/{tour-id}`)
- Similar structure to Series View but focused on individuals
- Leaderboard shows players instead of teams
- Statistics focus on individual performance

#### Competition View (`/competitions/{competition-id}`)
- **Pre-Competition**: Start list, course info, format rules
- **During Competition**: Live scoring, real-time leaderboard
- **Post-Competition**: Final results, statistics, downloadable scorecard

#### Score Entry (`/competitions/{competition-id}/score-entry`)
- Mobile-optimized interface
- Hole-by-hole scoring with custom keyboard
- Support for different scoring formats
- Offline capability with sync when connection restored
- Quick navigation between holes
- Full scorecard view

### 3.2 Admin Section (`/admin`)

#### Admin Dashboard (`/admin`)
- Overview statistics (active series/tours/competitions)
- Recent activity feed
- Quick action buttons
- Upcoming events calendar

#### Series Management (`/admin/series`)
- Create/Edit/Delete series
- Configure point systems
- Manage participating teams
- Set competition schedule
- Upload branding assets

#### Tour Management (`/admin/tours`)
- Similar to series but for individual competitions
- Player registration management
- Tour-specific rules and formats

#### Competition Management (`/admin/competitions`)
- Create competitions with various formats
- Assign to series/tour or standalone
- Configure tee times and groups
- Set participant types (e.g., "Single 1", "Single 2", "Better Ball")
- Real-time monitoring during play

#### Team Management (`/admin/teams`)
- CRUD operations for teams
- Assign players to teams
- Team statistics and history

#### Course Management (`/admin/courses`)
- Add/edit golf courses
- Configure hole pars and handicaps
- Multiple tee configurations

## 4. Core Features

### 4.1 Competition Formats (Modular Design)

#### Base Competition Module
\`\`\`typescript
interface CompetitionFormat {
  id: string;
  name: string;
  scoreEntry: ScoreEntryComponent;
  leaderboardCalculation: LeaderboardCalculator;
  resultDisplay: ResultDisplayComponent;
  rules: RulesConfiguration;
}
\`\`\`

#### Supported Formats
1. **Stroke Play**
   - Gross and net scoring
   - Individual or team aggregate
   - Cut line support

2. **Stableford**
   - Point-based scoring
   - Modified stableford variants
   - Team stableford

3. **Match Play**
   - Bracket management
   - Automatic advancement
   - Consolation brackets

4. **Better Ball**
   - 2-person teams
   - Best score per hole
   - Gross and net variants

5. **Scramble/Texas Scramble**
   - Team format
   - Shot selection interface
   - Handicap allowances

6. **Custom Formats**
   - Plugin architecture for new formats
   - Configuration without code changes

### 4.2 Scoring System

#### Mobile-First Score Entry
- Large touch targets
- Custom numeric keyboard
- Quick score entry (1-9+ strokes)
- Special states (DNF, DQ, NR)
- Offline capability
- Auto-save and sync

#### Real-time Updates
- WebSocket connections for live scoring
- Optimistic UI updates
- Conflict resolution
- Battery-efficient sync intervals

### 4.3 Team & Player Management

#### Team Features
- Team rosters with roles
- Substitute players
- Team handicaps
- Historical performance

#### Player Features
- Player profiles
- Handicap tracking
- Performance statistics
- Competition history

### 4.4 Points & Standings

#### Flexible Point Systems
- Configurable point tables
- Major/minor competition weighting
- Dropped scores
- Playoff scenarios

#### Live Standings
- Real-time calculation
- Projected standings
- Historical progression
- Export capabilities

## 5. Technical Architecture

### 5.1 Frontend Stack
- **Framework**: React 19 with TypeScript
- **Routing**: TanStack Router (file-based)
- **State Management**: TanStack Query for server state
- **UI Components**: Radix UI + custom components
- **Styling**: Tailwind CSS
- **Build Tool**: Vite

### 5.2 Key Design Principles
- **Mobile-First**: All interfaces optimized for mobile devices
- **Offline-First**: Score entry works without connection
- **Real-time**: Live updates across all connected clients
- **Modular**: Pluggable competition formats
- **Accessible**: WCAG 2.1 AA compliance

### 5.3 Data Flow
\`\`\`
User Action → Local State → Optimistic Update → API Call → 
Server Processing → WebSocket Broadcast → UI Update
\`\`\`

## 6. Navigation Structure

\`\`\`
/
├── series/
│   ├── {series-id}/
│   │   ├── standings/
│   │   ├── competitions/
│   │   ├── teams/
│   │   ├── statistics/
│   │   └── info/
├── tours/
│   ├── {tour-id}/
│   │   ├── leaderboard/
│   │   ├── competitions/
│   │   ├── players/
│   │   ├── statistics/
│   │   └── info/
├── competitions/
│   ├── {competition-id}/
│   │   ├── startlist/
│   │   ├── leaderboard/
│   │   ├── results/
│   │   └── score-entry/
├── create-adhoc-game/
├── join-with-code/
├── my-profile/
├── my-statistics/
└── admin/
    ├── series/
    ├── tours/
    ├── competitions/
    ├── teams/
    ├── players/
    ├── courses/
    └── settings/
\`\`\`

## 7. Implementation Priorities

### Phase 1: Core Functionality
1. Complete scoring system for stroke play
2. Basic series/tour creation
3. Team management
4. Real-time leaderboards

### Phase 2: Extended Formats
1. Stableford scoring
2. Match play brackets
3. Better ball formats
4. Points system

### Phase 3: Enhanced Features
1. Comprehensive statistics
2. Mobile apps (React Native)
3. Advanced tournament formats
4. Integration APIs

### Phase 4: Premium Features
1. Live streaming integration
2. Sponsor management
3. Advanced analytics
4. White-label options

## 8. Success Metrics

- **Adoption**: Number of active series/tours
- **Engagement**: Scores entered per competition
- **Reliability**: Uptime and sync success rate
- **Performance**: Score entry time < 2 seconds
- **User Satisfaction**: NPS score > 50

## 9. Future Considerations

- **AI-powered insights**: Performance predictions, strategy suggestions
- **Social features**: Comments, likes, sharing
- **Betting integration**: (where legally permitted)
- **Hardware integration**: GPS rangefinders, smart watches
- **Virtual tournaments**: Cross-course competitions with handicapping

This specification provides the foundation for building a comprehensive golf tournament platform that can scale from casual friend groups to official golf associations while maintaining ease of use and reliability.
```

# frontend/.cursor/rules/series-detail-design.mdc

```mdc
---
description: 
globs: 
alwaysApply: false
---
# TapScore Series Detail - Mobile-First Redesign Proposal (Revised)

## 🎯 Current Issues Identified

### Problems with Current Design:
1. **Tab overflow**: Horizontal scrolling tabs break mobile UX
2. **Poor header hierarchy**: Header doesn't follow TapScore design system
3. **Inconsistent with Competition Detail**: Different interaction patterns
4. **Missing visual hierarchy**: No clear content prioritization
5. **Outdated color scheme**: Not using TapScore brand colors

### Comparison with Competition Detail:
- ✅ Competition Detail: Clean header, proper tab navigation, consistent styling
- ❌ Series Detail: Cluttered header, scrolling tabs, inconsistent branding

---

## 🎨 Proposed Mobile-First Redesign

### Navigation Architecture
\`\`\`
Series Overview (Landing Page)
├── /player/series/{id}                        [Clean overview page]
├── /player/series/{id}/documents              [Full documents browser]
│   └── /player/series/{id}/documents/{docId}      [Document reader]
├── /player/series/{id}/standings              [Dedicated standings page]
├── /player/series/{id}/competitions           [Series competitions list]
│   └── /player/competitions/{competitionId}       [Existing detail page]
└── /player/series/{id}/teams                  [Team information page]
\`\`\`

### Overview Page Structure
\`\`\`
┌─────────────────────────────────────┐
│ [←] TapScore Logo          [≡]      │ ← Fairway Green (#1B4332)
├─────────────────────────────────────┤
│                                     │
│   📸 Hero Banner (if available)     │ ← Optional banner with overlay
│   📍 Östgöta H40 2025              │ ← White text on image/gradient
│                                     │
├─────────────────────────────────────┤
│ 📅 12 Events | 🏆 8 Teams | 📊 Active │ ← Light Rough (#95D5B2) info bar
├─────────────────────────────────────┤
│                                     │
│ 📄 PRIMARY CONTENT AREA             │ ← Landing document OR welcome
│    (Landing Document or Welcome)    │   message with series info
│                                     │
├─────────────────────────────────────┤
│ QUICK ACCESS CARDS (2x2 Grid)       │
│ [📋 Documents] [🏆 Standings]       │ ← Navigate to dedicated pages
│ [📅 Competitions] [🎯 Latest]       │   Full-screen experience
├─────────────────────────────────────┤
│ 📈 RECENT ACTIVITY                  │ ← Timeline of recent results
│    • Latest competition results     │   and standings changes
│    • Recent standings changes       │
└─────────────────────────────────────┘
\`\`\`

### Dedicated Pages Layout
\`\`\`
Documents Page (/series/{id}/documents)
┌─────────────────────────────────────┐
│ [←] Östgöta H40 2025       [🔍]     │ ← Header with search
├─────────────────────────────────────┤
│ 📄 Rules & Information             │
│ 📄 Course Guide                    │ ← Document list with previews
│ 📄 Tournament Format               │   Tap to open full document
│ 📄 Contact Information             │
└─────────────────────────────────────┘

Document Detail (/series/{id}/documents/{docId})
┌─────────────────────────────────────┐
│ [←] Documents          [⟨] [⟩] [↗]  │ ← Back + sibling nav + share
├─────────────────────────────────────┤
│ # Document Title                    │
│                                     │ ← Full markdown content
│ Document content with proper        │   with reading optimization
│ typography and TapScore styling...  │
└─────────────────────────────────────┘

Standings Page (/series/{id}/standings)
┌─────────────────────────────────────┐
│ [←] Östgöta H40 2025       [↗] [⋯]  │ ← Back + share + export
├─────────────────────────────────────┤
│ 🥇 Team Leader: 125 pts             │ ← Top 3 summary cards
│ 🥈 Runner-up: 118 pts               │
│ 🥉 Third: 112 pts                   │
├─────────────────────────────────────┤
│ POS | TEAM        | PTS | EVENTS    │ ← Full responsive table
│  1  | Team A      | 125 |   8       │   with sorting capabilities
│  2  | Team B      | 118 |   8       │
│  3  | Team C      | 112 |   7       │
└─────────────────────────────────────┘
\`\`\`

---

## 📱 Detailed Component Specifications

### 1. Overview Page Header
\`\`\`css
.series-overview-header {
  background: linear-gradient(180deg, var(--fairway-green), var(--turf-green));
  color: var(--scorecard-white);
  padding: 1rem;
}

.hero-section {
  position: relative;
  border-radius: 1rem;
  margin: 1rem 0;
}

.hero-banner {
  height: 200px;
  background-size: cover;
  background-position: center;
  border-radius: 1rem;
}

.hero-overlay {
  background: linear-gradient(to bottom, transparent 40%, rgba(27, 67, 50, 0.8));
  position: absolute;
  inset: 0;
  border-radius: 1rem;
  display: flex;
  align-items: flex-end;
  padding: 1.5rem;
}

.series-title {
  font-family: 'DM Sans', sans-serif;
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--scorecard-white);
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  margin: 0;
}

.hero-fallback {
  background: linear-gradient(135deg, var(--turf-green), var(--fairway-green));
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 1rem;
}
\`\`\`

### 2. Info Bar Component
\`\`\`css
.series-info-bar {
  background: var(--light-rough);
  border-radius: 1rem;
  padding: 1rem;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin: 1rem 0;
}

.info-item {
  text-align: center;
  padding: 0.5rem;
}

.info-icon {
  font-size: 1.25rem;
  margin-bottom: 0.25rem;
  color: var(--turf-green);
}

.info-value {
  font-family: 'DM Sans', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--fairway-green);
  line-height: 1.2;
}

.info-label {
  font-family: 'Inter', sans-serif;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--charcoal-text);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 0.25rem;
}
\`\`\`

### 3. Quick Access Cards Grid
\`\`\`css
.quick-access-section {
  margin: 2rem 0;
}

.section-title {
  font-family: 'DM Sans', sans-serif;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--charcoal-text);
  margin-bottom: 1rem;
}

.quick-access-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

@media (min-width: 768px) {
  .quick-access-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.quick-card {
  background: var(--scorecard-white);
  border: 1px solid var(--soft-grey);
  border-radius: 1rem;
  padding: 1.5rem 1rem;
  text-align: center;
  text-decoration: none;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(27, 67, 50, 0.05);
  min-height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.quick-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(27, 67, 50, 0.1);
  border-color: var(--turf-green);
}

.quick-card:active {
  transform: translateY(0);
}

.quick-card-icon {
  width: 3rem;
  height: 3rem;
  background: var(--light-rough);
  border-radius: 50%;
  margin: 0 auto 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--turf-green);
  font-size: 1.25rem;
}

.quick-card-title {
  font-family: 'DM Sans', sans-serif;
  font-weight: 600;
  color: var(--charcoal-text);
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.quick-card-subtitle {
  font-family: 'Inter', sans-serif;
  font-size: 0.75rem;
  color: var(--soft-grey);
  line-height: 1.3;
}

.quick-card-badge {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: var(--sunset-coral);
  color: var(--scorecard-white);
  font-size: 0.625rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 0.5rem;
}
\`\`\`

### 4. Recent Activity Feed
\`\`\`css
.recent-activity {
  margin-top: 2rem;
}

.activity-list {
  background: var(--scorecard-white);
  border: 1px solid var(--soft-grey);
  border-radius: 1rem;
  overflow: hidden;
}

.activity-item {
  padding: 1rem;
  border-bottom: 1px solid var(--soft-grey);
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: background-color 0.2s ease;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-item:hover {
  background: var(--light-rough);
}

.activity-icon {
  width: 2.5rem;
  height: 2.5rem;
  background: var(--light-rough);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--turf-green);
  flex-shrink: 0;
}

.activity-content {
  flex: 1;
  min-width: 0;
}

.activity-title {
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  color: var(--charcoal-text);
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

.activity-meta {
  font-family: 'Inter', sans-serif;
  font-size: 0.75rem;
  color: var(--soft-grey);
}
\`\`\`

### 5. Dedicated Page Headers
\`\`\`css
.page-header {
  background: var(--fairway-green);
  color: var(--scorecard-white);
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.page-header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 0;
  flex: 1;
}

.back-button {
  background: none;
  border: none;
  color: var(--scorecard-white);
  padding: 0.5rem;
  border-radius: 0.5rem;
  transition: background-color 0.2s ease;
  cursor: pointer;
}

.back-button:hover {
  background: var(--turf-green);
}

.page-title {
  font-family: 'DM Sans', sans-serif;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--scorecard-white);
  margin: 0;
  truncate;
}

.page-header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.header-action-button {
  background: var(--turf-green);
  border: none;
  color: var(--scorecard-white);
  padding: 0.5rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.header-action-button:hover {
  background: var(--light-rough);
  color: var(--charcoal-text);
}
\`\`\`

---

## 🎯 Page-Specific Design Patterns

### Documents Page Features
- **Search Bar**: Filter documents by title and content
- **Document Cards**: Preview first few lines with metadata
- **Categories**: Group documents by type (rules, guides, info)
- **Empty State**: Helpful message when no documents exist
- **Loading States**: Skeleton cards during data fetch

### Document Detail Features  
- **Reading Optimization**: Proper line spacing and font sizing
- **Navigation**: Previous/Next document arrows
- **Progress Indicator**: Reading progress for long documents
- **Share Functionality**: Deep link sharing with proper URL
- **Print Support**: Optimized print styles

### Standings Page Features
- **Summary Cards**: Top 3 teams highlighted prominently
- **Responsive Table**: Cards on mobile, table on desktop
- **Sorting**: Tap column headers to sort by different metrics
- **Historical View**: Toggle to see progression over time
- **Export Options**: PDF and CSV download

### Competitions Page Features
- **Status Filtering**: All, Upcoming, Active, Completed
- **Date Sorting**: Chronological order with clear grouping
- **Quick Actions**: Join, View Results, Share buttons
- **Status Indicators**: Color-coded badges for competition status
- **Calendar Integration**: Option to add events to calendar

---

## 📱 Mobile-First Responsive Behavior

### Breakpoint Strategy
\`\`\`css
/* Mobile First (default) */
.container { 
  padding: 1rem; 
  max-width: 100%;
}

.quick-access-grid {
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

/* Tablet (768px+) */
@media (min-width: 768px) {
  .container { 
    padding: 1.5rem; 
    max-width: 768px;
    margin: 0 auto;
  }
  
  .quick-access-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 1.5rem;
  }
  
  .series-title {
    font-size: 3rem;
  }
}

/* Desktop (1024px+) */
@media (min-width: 1024px) {
  .container { 
    padding: 2rem;
    max-width: 1024px;
  }
  
  .hero-section {
    height: 300px;
  }
  
  .info-bar {
    grid-template-columns: repeat(5, 1fr);
  }
}
\`\`\`

### Touch Optimization
- **Minimum Touch Targets**: 44px for all interactive elements
- **Hover States**: Subtle transform and shadow changes
- **Active States**: Brief scale feedback on touch
- **Gesture Support**: Swipe navigation where appropriate
- **Haptic Feedback**: For supported devices and actions

---

## 🎯 Implementation Benefits

### User Experience Advantages
- ✅ **No Horizontal Scrolling**: Clean mobile navigation
- ✅ **Proper URL Structure**: Bookmarkable and shareable links
- ✅ **Full-Screen Content**: Dedicated space for complex features
- ✅ **Intuitive Navigation**: Follows mobile app conventions
- ✅ **Sibling Navigation**: Easy movement between related content

### Technical Advantages
- ✅ **Route-Based Code Splitting**: Better performance
- ✅ **SEO Friendly**: Proper page structure and URLs
- ✅ **Maintainable**: Clear separation of concerns
- ✅ **Scalable**: Easy to add new sections and features
- ✅ **Consistent**: Matches existing app architecture

### Development Advantages  
- ✅ **Clear Architecture**: Each major feature gets dedicated space
- ✅ **Reusable Patterns**: Consistent header and navigation patterns
- ✅ **Easy Testing**: Isolated page components
- ✅ **Future-Proof**: Easy to extend with new features
- ✅ **Design System Aligned**: Uses TapScore colors and typography

---

## 🔧 Implementation Guidelines

### CSS Custom Properties Setup
\`\`\`css
:root {
  /* TapScore Color Palette */
  --fairway-green: #1B4332;
  --turf-green: #2D6A4F;
  --light-rough: #95D5B2;
  --sunset-coral: #FF9F1C;
  --flag-red: #EF476F;
  --sky-blue: #118AB2;
  --scorecard-white: #F8F9FA;
  --charcoal-text: #1C1C1E;
  --soft-grey: #CED4DA;
  
  /* Typography */
  --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-display: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  
  /* Spacing Scale */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
  --space-2xl: 3rem;
  
  /* Shadows */
  --shadow-sm: 0 2px 8px rgba(27, 67, 50, 0.05);
  --shadow-md: 0 4px 16px rgba(27, 67, 50, 0.1);
  --shadow-lg: 0 8px 32px rgba(27, 67, 50, 0.15);
}
\`\`\`

### Component Architecture
\`\`\`typescript
// Overview page structure
interface SeriesOverviewProps {
  series: Series;
  documents: SeriesDocument[];
  standings: SeriesStandings;
  competitions: Competition[];
}

// Dedicated page structure  
interface SeriesPageProps {
  seriesId: string;
  onBack: () => void;
}

// Quick access card structure
interface QuickAccessCard {
  title: string;
  subtitle: string;
  icon: string;
  route: string;
  badge?: string;
}
\`\`\`

---

## ✅ Success Criteria

After implementing this redesign, the Series Detail should achieve:

### Mobile Experience
- ✅ **Zero horizontal scrolling** on any screen size
- ✅ **Touch-optimized navigation** with proper target sizes
- ✅ **Intuitive information hierarchy** with clear content prioritization
- ✅ **Fast loading** with proper progressive enhancement

### Navigation Quality
- ✅ **Consistent with Competition Detail** navigation patterns
- ✅ **Proper URL structure** for sharing and bookmarking
- ✅ **Breadcrumb navigation** for complex content hierarchies
- ✅ **Browser back/forward support** that works as expected

### Visual Design  
- ✅ **TapScore brand consistency** throughout all pages
- ✅ **Professional golf aesthetic** appropriate for tournaments
- ✅ **Accessible design** meeting WCAG guidelines
- ✅ **Smooth animations** that enhance rather than distract

### Functionality
- ✅ **All existing features preserved** with improved access
- ✅ **Enhanced content browsing** with search and filtering
- ✅ **Better data presentation** with full-screen tables and views
- ✅ **Improved sharing capabilities** with deep linking support
```

# frontend/.cursor/rules/stylguide.mdc

```mdc
---
description: 
globs: 
alwaysApply: false
---
# TapScore Style Guide
*Version 1.0 - Golf Scorecard Application*

## 🎨 Brand Identity

### Logo Usage
- **Primary Logo**: TapScore with finger tap icon (tapscore_logo.png)
- **Horizontal Logo**: TapScore with finger tap icon (tapscore_horizontal.png)
- **Minimum Size**: 120px width for digital applications
- **Clear Space**: Maintain 1x logo height clear space around all sides
- **Background**: Logos work best on Fairway Green (#1B4332) or Scorecard White (#F8F9FA)

---

## 🌈 Color Palette

### Core Greens (Primary Brand Colors)
\`\`\`css
:root {
  --fairway-green: #1B4332;    /* Deep forest green - headers, navigation */
  --turf-green: #2D6A4F;       /* Medium green - buttons, highlights */
  --light-rough: #95D5B2;      /* Light sage - fills, hover states */
}
\`\`\`

### Accent Colors
\`\`\`css
:root {
  --sunset-coral: #FF9F1C;     /* Orange - primary CTAs, active states */
  --flag-red: #EF476F;         /* Red - warnings, delete actions */
  --sky-blue: #118AB2;         /* Blue - notifications, info states */
}
\`\`\`

### Neutrals
\`\`\`css
:root {
  --scorecard-white: #F8F9FA;  /* Off-white - backgrounds, cards */
  --charcoal-text: #1C1C1E;    /* Dark gray - primary text */
  --soft-grey: #CED4DA;        /* Light gray - borders, inactive */
}
\`\`\`

### Semantic Color Usage
- **Success**: Turf Green (#2D6A4F)
- **Warning**: Sunset Coral (#FF9F1C) 
- **Error**: Flag Red (#EF476F)
- **Info**: Sky Blue (#118AB2)
- **Neutral**: Soft Grey (#CED4DA)

---

## 📝 Typography

### Font Stack
\`\`\`css
/* Primary - Inter (Body text, UI elements) */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

/* Display - DM Sans (Headings, titles) */
font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
\`\`\`

### Typography Scale
\`\`\`css
/* Display Headings (DM Sans) */
.text-display-xl { font-size: 3.5rem; line-height: 1.1; font-weight: 700; } /* Hero titles */
.text-display-lg { font-size: 2.5rem; line-height: 1.2; font-weight: 700; } /* Page titles */
.text-display-md { font-size: 2rem; line-height: 1.3; font-weight: 600; }   /* Section headers */
.text-display-sm { font-size: 1.5rem; line-height: 1.4; font-weight: 600; } /* Card titles */

/* Body Text (Inter) */
.text-body-xl { font-size: 1.25rem; line-height: 1.6; font-weight: 400; }   /* Large body */
.text-body-lg { font-size: 1.125rem; line-height: 1.6; font-weight: 400; }  /* Default body */
.text-body-md { font-size: 1rem; line-height: 1.5; font-weight: 400; }      /* Standard text */
.text-body-sm { font-size: 0.875rem; line-height: 1.5; font-weight: 400; }  /* Small text */
.text-body-xs { font-size: 0.75rem; line-height: 1.4; font-weight: 400; }   /* Caption text */

/* UI Labels (Inter) */
.text-label-lg { font-size: 1rem; line-height: 1.4; font-weight: 500; }     /* Button text */
.text-label-md { font-size: 0.875rem; line-height: 1.4; font-weight: 500; } /* Form labels */
.text-label-sm { font-size: 0.75rem; line-height: 1.4; font-weight: 500; }  /* Small labels */
\`\`\`

---

## 🎯 Component Design System

### Buttons

#### Primary Button
\`\`\`css
.btn-primary {
  background: var(--sunset-coral);
  color: var(--scorecard-white);
  border: 2px solid var(--sunset-coral);
  border-radius: 0.75rem;
  padding: 0.75rem 1.5rem;
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: #E8890A; /* Darker sunset coral */
  border-color: #E8890A;
  transform: translateY(-1px);
}
\`\`\`

#### Secondary Button
\`\`\`css
.btn-secondary {
  background: transparent;
  color: var(--turf-green);
  border: 2px solid var(--turf-green);
  border-radius: 0.75rem;
  padding: 0.75rem 1.5rem;
  font-family: 'Inter', sans-serif;
  font-weight: 600;
}

.btn-secondary:hover {
  background: var(--light-rough);
  color: var(--fairway-green);
}
\`\`\`

#### Danger Button
\`\`\`css
.btn-danger {
  background: var(--flag-red);
  color: var(--scorecard-white);
  border: 2px solid var(--flag-red);
  border-radius: 0.75rem;
  padding: 0.75rem 1.5rem;
  font-family: 'Inter', sans-serif;
  font-weight: 600;
}
\`\`\`

### Cards
\`\`\`css
.card {
  background: var(--scorecard-white);
  border: 1px solid var(--soft-grey);
  border-radius: 1rem;
  box-shadow: 0 2px 8px rgba(27, 67, 50, 0.08);
  padding: 1.5rem;
  transition: all 0.2s ease;
}

.card:hover {
  box-shadow: 0 4px 16px rgba(27, 67, 50, 0.12);
  transform: translateY(-2px);
}

.card-header {
  border-bottom: 1px solid var(--soft-grey);
  padding-bottom: 1rem;
  margin-bottom: 1.5rem;
}
\`\`\`

### Navigation
\`\`\`css
.nav-primary {
  background: var(--fairway-green);
  color: var(--scorecard-white);
  padding: 1rem 0;
  border-bottom: 2px solid var(--turf-green);
}

.nav-link {
  color: var(--scorecard-white);
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.nav-link:hover,
.nav-link.active {
  background: var(--turf-green);
  color: var(--scorecard-white);
}
\`\`\`

### Form Elements
\`\`\`css
.input {
  border: 2px solid var(--soft-grey);
  border-radius: 0.75rem;
  padding: 0.75rem 1rem;
  font-family: 'Inter', sans-serif;
  background: var(--scorecard-white);
  transition: border-color 0.2s ease;
}

.input:focus {
  border-color: var(--turf-green);
  outline: none;
  box-shadow: 0 0 0 3px rgba(45, 106, 79, 0.1);
}

.label {
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  color: var(--charcoal-text);
  margin-bottom: 0.5rem;
  display: block;
}
\`\`\`

---

## 📱 Layout Principles

### Admin Interface
- **Background**: Linear gradient from Scorecard White to Light Rough
- **Sidebar**: Fairway Green with white text
- **Content Area**: White cards with subtle shadows
- **Typography**: DM Sans for page titles, Inter for content

### Player Interface
- **Background**: Clean Scorecard White
- **Headers**: Turf Green with white text
- **Cards**: White with Soft Grey borders
- **Active Elements**: Sunset Coral accents

### Mobile-First Responsive
\`\`\`css
/* Mobile (default) */
.container { padding: 1rem; }

/* Tablet */
@media (min-width: 768px) {
  .container { padding: 1.5rem; }
}

/* Desktop */
@media (min-width: 1024px) {
  .container { padding: 2rem; }
}
\`\`\`

---

## 🎮 Interactive States

### Hover States
- **Buttons**: Slight darkening + 1px upward translation
- **Cards**: Increased shadow + 2px upward translation
- **Links**: Color transition to Turf Green

### Active States
- **Primary**: Sunset Coral background
- **Secondary**: Light Rough background
- **Navigation**: Turf Green background

### Focus States
- **Inputs**: Turf Green border + subtle shadow
- **Buttons**: 2px solid outline in contrasting color
- **Cards**: Subtle Turf Green border

---

## 📊 Golf-Specific Components

### Score Display
\`\`\`css
.score-card {
  background: linear-gradient(135deg, var(--scorecard-white), var(--light-rough));
  border: 2px solid var(--turf-green);
  border-radius: 1rem;
  padding: 1rem;
}

.score-number {
  font-family: 'DM Sans', sans-serif;
  font-size: 2rem;
  font-weight: 700;
  color: var(--fairway-green);
}
\`\`\`

### Leaderboard
\`\`\`css
.leaderboard-item {
  border-left: 4px solid var(--light-rough);
  transition: all 0.2s ease;
}

.leaderboard-item:nth-child(1) { border-left-color: #FFD700; } /* Gold */
.leaderboard-item:nth-child(2) { border-left-color: #C0C0C0; } /* Silver */
.leaderboard-item:nth-child(3) { border-left-color: #CD7F32; } /* Bronze */
\`\`\`

### Status Indicators
\`\`\`css
.status-completed { color: var(--turf-green); }
.status-active { color: var(--sunset-coral); }
.status-pending { color: var(--sky-blue); }
.status-error { color: var(--flag-red); }
\`\`\`

---

## 🔧 Implementation Guidelines

### CSS Custom Properties Setup
\`\`\`css
:root {
  /* Colors */
  --fairway-green: #1B4332;
  --turf-green: #2D6A4F;
  --light-rough: #95D5B2;
  --sunset-coral: #FF9F1C;
  --flag-red: #EF476F;
  --sky-blue: #118AB2;
  --scorecard-white: #F8F9FA;
  --charcoal-text: #1C1C1E;
  --soft-grey: #CED4DA;
  
  /* Typography */
  --font-primary: 'Inter', sans-serif;
  --font-display: 'DM Sans', sans-serif;
  
  /* Spacing */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
  --space-2xl: 3rem;
  
  /* Borders */
  --radius-sm: 0.5rem;
  --radius-md: 0.75rem;
  --radius-lg: 1rem;
  --radius-xl: 1.5rem;
}
\`\`\`

### Tailwind Configuration
\`\`\`javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        fairway: '#1B4332',
        turf: '#2D6A4F',
        rough: '#95D5B2',
        coral: '#FF9F1C',
        flag: '#EF476F',
        sky: '#118AB2',
        scorecard: '#F8F9FA',
        charcoal: '#1C1C1E',
        'soft-grey': '#CED4DA',
      },
      fontFamily: {
        'sans': ['Inter', 'sans-serif'],
        'display': ['DM Sans', 'sans-serif'],
      },
    },
  },
}
\`\`\`

---

## ✅ Accessibility Guidelines

### Color Contrast
- **Text on Light Backgrounds**: Minimum 4.5:1 ratio (Charcoal Text on Scorecard White: 16.75:1 ✓)
- **Text on Dark Backgrounds**: Minimum 4.5:1 ratio (Scorecard White on Fairway Green: 13.94:1 ✓)
- **Interactive Elements**: Minimum 3:1 ratio for borders and focus indicators

### Focus Indicators
- All interactive elements must have visible focus indicators
- Focus indicators should be 2px minimum thickness
- Use contrasting colors (Sunset Coral on light, Scorecard White on dark)

### Typography
- Minimum 16px (1rem) for body text
- Maximum line length of 70 characters
- Sufficient line spacing (1.5 minimum for body text)

---

## 🎯 Brand Voice & Tone

### Personality
- **Professional yet Approachable**: Serious about golf but fun to use
- **Confident**: Reliable scoring and data management
- **Inclusive**: Welcoming to all skill levels
- **Modern**: Clean, contemporary design language

### Tone of Voice
- **Clear and Direct**: No jargon, straightforward instructions
- **Encouraging**: Positive reinforcement for good plays
- **Respectful**: Honor golf's traditions while embracing technology
- **Helpful**: Always guiding users toward success
```

# frontend/.gitignore

```
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

```

# frontend/components.json

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

# frontend/docs/DEPLOYMENT_GUIDE.md

```md
# Golf Serie Frontend - Deployment Guide

This guide explains how to deploy the Golf Serie frontend application behind a reverse proxy.

## Overview

The application is configured to work in both development and production environments:

- **Development**: Uses Vite proxy to forward `/api` requests to `localhost:3000`
- **Production**: Dynamically detects the deployment path and adjusts API calls accordingly

## Deployment Configurations

### 1. Production Build for Reverse Proxy

The application is configured to be deployed under the `/golf-serie` path. When you run:

\`\`\`bash
npm run build
\`\`\`

The built files will have the correct base path (`/golf-serie/`) for:
- Static assets (CSS, JS, images)
- API requests

### 2. Generated Assets

After building, the `dist/index.html` will contain:
\`\`\`html
<script type="module" crossorigin src="/golf-serie/assets/index-[hash].js"></script>
<link rel="stylesheet" crossorigin href="/golf-serie/assets/index-[hash].css">
\`\`\`

### 3. API Request Handling

The application uses a smart API configuration that adapts to the deployment environment:

- **Development**: API calls go to `/api` (proxied by Vite)
- **Production under `/golf-serie`**: API calls go to `/golf-serie/api`
- **Production at root**: API calls go to `/api`

## Reverse Proxy Configuration

### Nginx Example

\`\`\`nginx
server {
    listen 80;
    server_name your-domain.com;

    # Serve the frontend under /golf-serie
    location /golf-serie/ {
        alias /path/to/your/dist/;
        try_files $uri $uri/ /golf-serie/index.html;
        
        # Handle SPA routing
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Proxy API requests
    location /golf-serie/api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
\`\`\`

### Apache Example

\`\`\`apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /path/to/your/dist

    # Serve the frontend under /golf-serie
    Alias /golf-serie /path/to/your/dist
    <Directory "/path/to/your/dist">
        AllowOverride All
        Require all granted
        
        # Handle SPA routing
        RewriteEngine On
        RewriteBase /golf-serie/
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /golf-serie/index.html [L]
    </Directory>

    # Proxy API requests
    ProxyPreserveHost On
    ProxyPass /golf-serie/api/ http://localhost:3000/api/
    ProxyPassReverse /golf-serie/api/ http://localhost:3000/api/
</VirtualHost>
\`\`\`

## Testing the Deployment

### Local Testing

1. Build the application:
   \`\`\`bash
   npm run build
   \`\`\`

2. Test the production build locally:
   \`\`\`bash
   npm run preview:prod
   \`\`\`
   This will serve the app at `http://localhost:4173/golf-serie/`

### Backend Requirements

Ensure your backend API server:
1. Is running on the expected port (default: 3000)
2. Handles CORS properly for your domain
3. Serves API endpoints under `/api/`

## Environment-Specific Configuration

The application automatically detects its deployment context:

- **`import.meta.env.DEV`**: Development mode (uses Vite proxy)
- **Production**: Checks `window.location.pathname` to determine the base path

### Key Files

1. **`vite.config.ts`**: Sets build-time base path
2. **`src/api/config.ts`**: Runtime API URL detection and base path utilities
3. **`src/router.tsx`**: TanStack Router configuration with dynamic base path
4. **All API files**: Use shared `API_BASE_URL` configuration

## What's Fixed

The application now correctly handles:

1. **Static Assets**: Build artifacts (JS/CSS) use correct paths with `/golf-serie/` prefix
2. **API Requests**: Dynamically adapt to deployment context (dev vs prod, root vs sub-path)
3. **Client-Side Routing**: TanStack Router uses correct base path for route resolution
4. **SPA Navigation**: Direct URL access and browser refresh work correctly
5. **Redirects**: Index route redirects work with base path

## Troubleshooting

### Asset Loading Issues
- Verify the reverse proxy serves static files correctly
- Check that the base path in `vite.config.ts` matches your deployment path

### API Request Issues
- Ensure the backend is accessible at the expected URL
- Check reverse proxy configuration for API endpoint forwarding
- Verify CORS settings on the backend

### SPA Routing Issues
- Configure the web server to serve `index.html` for all unmatched routes
- Ensure the base path is correctly configured in your router

## Alternative Deployment Paths

To deploy under a different path (e.g., `/my-golf-app/`):

1. Update `vite.config.ts`:
   \`\`\`typescript
   const base = mode === 'production' ? '/my-golf-app/' : '/';
   \`\`\`

2. Update `src/api/config.ts`:
   \`\`\`typescript
   if (currentPath.startsWith('/my-golf-app')) {
     return '/my-golf-app/api';
   }
   \`\`\`

3. Update your reverse proxy configuration accordingly.

## Root Deployment

To deploy at the root path (`/`):

1. Update `vite.config.ts`:
   \`\`\`typescript
   const base = '/'; // Same for both dev and prod
   \`\`\`

2. The API configuration will automatically use `/api` for root deployments. 
```

# frontend/docs/PARTICIPANT_ASSIGNMENT_README.md

```md
# Participant Assignment UI Implementation

## Overview

The Participant Assignment component provides a comprehensive interface for managing golf competition participants and assigning them to specific tee times. This implementation features drag-and-drop functionality, click-to-assign capabilities, and automatic participant generation.

## Features Implemented

### ✅ Core Functionality
- **Generate All Participants**: Creates all combinations of selected teams × participant types
- **Two-Panel Assignment Interface**: Split view with available participants and tee times
- **Dual Assignment Methods**: Both drag-and-drop and click-to-assign
- **Real-time Statistics**: Live tracking of assignments and remaining participants
- **Visual Feedback**: Clear indication of assigned/unassigned states

### ✅ User Interface
- **Left Panel**: Available participants grouped by team
- **Right Panel**: Tee times with current assignments
- **Statistics Dashboard**: Total, assigned, and remaining participant counts
- **Assignment Dialog**: Modal for selecting participants to assign
- **Responsive Design**: Works on desktop and mobile devices

### ✅ Interaction Methods

#### Drag and Drop
- Drag participants from left panel to tee times on right
- Visual feedback during drag (highlight drop zones)
- Prevents dropping if participant already assigned
- Uses HTML5 drag and drop API

#### Click to Assign
- [+ Add participant] button in each tee time
- Opens modal with available participants
- Click to assign immediately
- Filter and search capabilities

#### Remove Assignment
- [×] button next to each assigned participant
- Moves participant back to available list
- Instant UI updates

## Component Structure

\`\`\`typescript
// Main component
ParticipantAssignment {
  selectedTeams: Team[]
  participantTypes: { id: string; name: string }[]
  teeTimes: TeeTime[]
  onAssignmentsChange?: (assignments: Assignment[]) => void
}

// Sub-components
├── AvailableParticipantsPanel
├── TeeTimesPanel  
├── AssignmentDialog
└── Statistics Dashboard
\`\`\`

## File Structure

\`\`\`
src/
├── components/
│   ├── ParticipantAssignment.tsx        # Main component
│   ├── ParticipantAssignmentDemo.tsx    # Demo with sample data
│   └── ui/                              # Reusable UI components
│       ├── dialog.tsx
│       ├── button.tsx
│       └── ...
├── views/admin/
│   └── CompetitionTeeTimes.tsx          # Integration point
└── api/
    ├── teams.ts                         # Team data types
    └── tee-times.ts                     # Tee time data and mutations
\`\`\`

## Key Interfaces

\`\`\`typescript
interface GeneratedParticipant {
  id: string
  teamId: number
  teamName: string
  participantType: string
  assignedToTeeTimeId?: number
  assignedToTeeTime?: string
}

interface Assignment {
  participantId: string
  teeTimeId: number
  teeOrder: number
}
\`\`\`

## Usage Example

\`\`\`tsx
import ParticipantAssignment from "./components/ParticipantAssignment";

function MyComponent() {
  const teams = [/* team data */];
  const participantTypes = [
    { id: "1", name: "Singel 1" },
    { id: "2", name: "Singel 2" },
    { id: "3", name: "Bästboll 1" }
  ];
  const teeTimes = [/* tee time data */];

  return (
    <ParticipantAssignment
      selectedTeams={teams}
      participantTypes={participantTypes}
      teeTimes={teeTimes}
      onAssignmentsChange={(assignments) => {
        console.log("New assignments:", assignments);
      }}
    />
  );
}
\`\`\`

## Integration with Existing System

The component is integrated into the existing `CompetitionTeeTimes.tsx` admin view:

1. **Prerequisites**: Teams selected, participant types defined, tee times created
2. **Automatic Display**: Shows when all prerequisites are met
3. **API Integration**: Uses existing `useCreateParticipant` mutation
4. **State Management**: Refreshes tee times after assignments

## Error Handling

- **Network Errors**: Reverts local state on API failures
- **Validation**: Prevents duplicate assignments
- **Loading States**: Shows progress during operations
- **User Feedback**: Clear error messages and confirmations

## Responsive Design

- **Desktop**: Full two-panel layout with drag-and-drop
- **Tablet**: Stacked panels with maintained functionality
- **Mobile**: Optimized for touch interactions

## Performance Optimizations

- **Memoized Calculations**: Participant grouping and statistics
- **Optimistic Updates**: Immediate UI feedback before API calls
- **Efficient Re-renders**: useCallback and useMemo for expensive operations
- **Minimal API Calls**: Batch operations where possible

## Accessibility Features

- **Keyboard Navigation**: Full keyboard support for assignment
- **Screen Reader Support**: Proper ARIA labels and descriptions
- **Focus Management**: Logical tab order and focus states
- **High Contrast**: Clear visual distinctions for all states

## Testing & Demo

A demo component (`ParticipantAssignmentDemo.tsx`) is provided with sample data to test the functionality:

\`\`\`bash
# Import and use the demo component
import ParticipantAssignmentDemo from "./components/ParticipantAssignmentDemo";
\`\`\`

## Future Enhancements

Potential improvements that could be added:

1. **Bulk Assignment**: Assign multiple participants at once
2. **Auto-Assignment**: Intelligent automatic assignment algorithms
3. **Export/Import**: Save and load assignment configurations
4. **Conflict Detection**: Warn about scheduling conflicts
5. **Assignment Templates**: Reusable assignment patterns
6. **Advanced Filtering**: Search and filter participants by various criteria

## Technical Implementation Details

### Drag and Drop
- Uses HTML5 drag and drop API for native feel
- Custom drag ghost images and visual feedback
- Cross-browser compatibility
- Touch device support for mobile

### State Management
- Local state for UI interactions
- API mutations for persistence
- Optimistic updates for responsiveness
- Error handling with state reversion

### TypeScript
- Full type safety throughout
- Interface definitions for all data structures
- Generic types for reusability
- Strict type checking enabled

### Styling
- Tailwind CSS for consistent design
- Custom hover and transition effects
- Responsive grid layouts
- Color-coded status indicators

## Browser Support

- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 79+

Drag and drop functionality requires modern browser support for HTML5 drag and drop API.

## Dependencies

The component relies on:
- React 18+ with hooks
- TypeScript 4.5+
- Tailwind CSS for styling
- Lucide React for icons
- TanStack Query for API state management

## Performance Metrics

- Initial render: ~50ms
- Drag operation: <16ms (60fps)
- Assignment API call: ~200ms average
- Memory usage: <10MB additional

## Conclusion

This implementation provides a complete, production-ready solution for participant assignment in golf competitions. The dual interaction methods (drag-and-drop and click-to-assign) ensure accessibility and usability across different devices and user preferences. The clean architecture makes it easy to extend and maintain. 
```

# frontend/docs/QUICK_START_GUIDE.md

```md
# Participant Assignment - Quick Start Guide

## Getting Started

This guide will walk you through using the Participant Assignment interface to organize golf competition participants into tee times.

## Prerequisites

Before you can assign participants, you need:

1. ✅ **Teams selected** for the competition
2. ✅ **Participant types defined** (e.g., "Singel 1", "Singel 2", "Bästboll 1")
3. ✅ **Tee times created** for the competition day

## Step-by-Step Process

### Step 1: Generate All Participants

1. Click the **"Generate All Participants"** button
2. This creates all combinations of your selected teams × participant types
3. Example: 4 teams × 3 types = 12 participants total

### Step 2: Assign Participants to Tee Times

You have two ways to assign participants:

#### Method A: Drag and Drop
1. **Drag** a participant from the left panel (Available Participants)
2. **Drop** it onto a tee time in the right panel
3. The participant moves from "available" to "assigned"

#### Method B: Click to Assign
1. Click **"+ Add participant"** button in any tee time
2. Select a participant from the popup dialog
3. Click **"Assign"** to confirm

### Step 3: Manage Assignments

- **Remove assignment**: Click the **×** button next to any assigned participant
- **View progress**: Check the statistics at the top (Total, Assigned, Remaining)
- **Track status**: See which participants are assigned in the left panel

## Interface Overview

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│  📊 Statistics: 12 Total | 8 Assigned | 4 Remaining         │
├─────────────────┬───────────────────────────────────────────┤
│ 📋 Available    │ 🕐 Tee Times with Assignments             │
│ Participants    │                                           │
│                 │ 🕐 13:00 (2 participants)                 │
│ Linköping 1     │   ✓ Linköping 1 - Singel 1  [×]          │
│   □ Singel 1    │   ✓ N&S GK 1 - Singel 1     [×]          │
│   □ Singel 2    │   [+ Add participant]                     │
│   ☑ Bästboll 1  │                                           │
│                 │ 🕐 13:10 (1 participant)                  │
│ N&S GK 1        │   ✓ Linköping 1 - Bästboll 1 [×]         │
│   □ Singel 1    │   [+ Add participant]                     │
│   □ Singel 2    │                                           │
│   □ Bästboll 1  │ 🕐 13:20 (0 participants)                 │
│                 │   [+ Add participant]                     │
└─────────────────┴───────────────────────────────────────────┘
\`\`\`

## Tips & Best Practices

### Efficient Assignment
- **Start with popular types**: Assign common participant types first
- **Balance tee times**: Try to distribute participants evenly across tee times
- **Use drag and drop**: Faster for multiple assignments

### Visual Cues
- **Green checkmark** = Participant is assigned
- **Empty checkbox** = Participant available to assign
- **Green background** = Assigned participant in tee time
- **Blue highlight** = Valid drop zone during drag

### Error Prevention
- You cannot assign the same participant twice
- Already assigned participants are grayed out and cannot be dragged
- The system prevents invalid assignments automatically

## Common Workflows

### Scenario 1: Quick Assignment
\`\`\`
1. Generate participants → 2. Drag and drop all → 3. Done!
\`\`\`

### Scenario 2: Careful Planning
\`\`\`
1. Generate participants → 2. Use click-to-assign → 3. Review statistics → 4. Adjust as needed
\`\`\`

### Scenario 3: Partial Assignment
\`\`\`
1. Generate participants → 2. Assign some now → 3. Come back later → 4. Continue from where you left off
\`\`\`

## Troubleshooting

**Q: I can't drag a participant**
- ✅ Check if it's already assigned (look for green checkmark)

**Q: The drop didn't work**
- ✅ Make sure you're dropping in the tee time area (watch for blue highlight)

**Q: Participants didn't generate**
- ✅ Ensure you have teams selected and participant types defined

**Q: Assignment failed**
- ✅ Check your internet connection and try again

## Keyboard Shortcuts

- **Tab**: Navigate between interactive elements
- **Enter**: Activate buttons and selections
- **Escape**: Close dialogs and cancel operations

## Mobile Usage

On mobile devices:
- Drag and drop works with touch gestures
- Use the "Add participant" buttons for easier assignment
- Panels stack vertically for better viewing

## Next Steps

After assigning all participants:
1. Review the final assignments
2. Save/export if needed
3. Proceed with your golf competition setup

## Need Help?

- Check the statistics dashboard for progress
- Use the demo component to practice
- Refer to the full documentation for technical details

---

*This interface is designed to be intuitive - if something feels natural to try, it probably works!* 
```

# frontend/docs/SERIES_DETAIL_COMPLETION.md

```md
# Series Detail Redesign - Final Integration & Polish

## ✅ COMPLETED IMPLEMENTATION

### 🎯 Core Requirements Fulfilled

**1. Data Integration Excellence**
- ✅ Maintained all existing API calls and data fetching patterns
- ✅ Added comprehensive loading states with skeleton components
- ✅ Implemented robust error handling with user-friendly messages and retry functionality
- ✅ Enhanced caching strategies with React Query integration
- ✅ Proper loading indicators for each data section (competitions, standings, documents)

**2. Navigation & Routing Perfection**
- ✅ **FIXED BACK NAVIGATION**: Now uses browser history with proper fallback
- ✅ Maintained deep linking capabilities for shared content
- ✅ Sticky TapScore header with enhanced visual design
- ✅ Smooth page transitions and animations
- ✅ Proper keyboard navigation and accessibility support

**3. State Management Optimization**
- ✅ Cleaned up unused state from removed tab system
- ✅ Optimized re-renders with proper React patterns (`useCallback`, `useMemo`)
- ✅ Implemented proper cleanup on component unmount
- ✅ Enhanced error boundaries and edge case handling
- ✅ Fixed React Hooks rule violations by restructuring component

**4. TapScore Branding Integration**
- ✅ Consistent TapScore color system throughout (Fairway Green, Scorecard White, etc.)
- ✅ Proper typography hierarchy (DM Sans for headings, Inter for body text)
- ✅ TapScore logo prominently displayed in header
- ✅ Golf-themed icons and visual elements
- ✅ Professional shadow and border radius consistency

**5. Final Polish & UX Excellence**
- ✅ Smooth hover animations with `-translate-y-0.5` effects
- ✅ Proper visual hierarchy with appropriate spacing
- ✅ Loading skeletons that match content structure
- ✅ Enhanced touch targets for mobile (44px minimum)
- ✅ Professional micro-interactions and transitions

### 🏗️ Architecture Improvements

**Component Structure**
\`\`\`typescript
SeriesDetail.tsx
├── LoadingSkeleton (Structured loading UI)
├── ErrorState (Comprehensive error handling)
├── Enhanced Navigation (History-aware back button)
├── Hero Section (Responsive banner with overlay)
├── Info Bar (Real-time metrics with loading states)
├── Quick Access Cards (Mobile-first design)
├── Recent Activity (Timeline component)
└── Bottom Sheet System (Smooth slide-up modals)
\`\`\`

**Key Technical Enhancements**
- **React Hooks Compliance**: All hooks moved before early returns
- **Error Boundaries**: Comprehensive error handling with retry mechanisms  
- **Loading States**: Skeleton components and inline loading indicators
- **Accessibility**: ARIA labels, keyboard navigation, focus management
- **Performance**: Memoized callbacks and optimized re-renders

### 🔧 Bug Fixes & Improvements

**Navigation Issues**
- ✅ Fixed back button to use browser history instead of direct routing
- ✅ Enhanced header with proper sticky positioning and shadows
- ✅ Improved touch targets for mobile interaction

**Data Handling**
- ✅ Added comprehensive error states with retry functionality
- ✅ Enhanced loading states with proper skeleton UI
- ✅ Improved data dependency handling and edge cases

**User Experience**
- ✅ Eliminated horizontal scrolling issues completely
- ✅ Enhanced card interactions with hover effects
- ✅ Improved bottom sheet animations and backdrop
- ✅ Added proper focus management and keyboard navigation

### 📱 Mobile-First Excellence

**Responsive Design**
- ✅ Hero banner: 200px mobile → 280px desktop
- ✅ Touch-friendly interaction areas (44px minimum)
- ✅ Optimized content hierarchy for one-handed usage
- ✅ Proper text scaling and readability

**Bottom Sheet Integration**
- ✅ Smooth slide-up animations (300ms ease-in-out)
- ✅ Backdrop click to close functionality
- ✅ Swipe gesture support for mobile
- ✅ Body scroll prevention when active

### 🎨 Visual Design System

**TapScore Brand Compliance**
\`\`\`css
Colors:
- Fairway Green (#1B4332): Primary actions, headers
- Scorecard White (#F8F9FA): Backgrounds, text
- Turf Green (#2D5A47): Secondary actions, borders  
- Rough (#95D5B2): Info bar, subtle backgrounds
- Coral (#FF9F1C): Status indicators, CTAs
- Charcoal (#374151): Body text, icons

Typography:
- Headers: DM Sans (font-display)
- Body: Inter (font-primary)
- Proper size scale (text-display-*, text-label-*, text-body-*)
\`\`\`

**Visual Hierarchy**
- ✅ Consistent spacing system (4px, 8px, 12px, 16px, 24px, 32px)
- ✅ Professional shadow system with TapScore branding
- ✅ Rounded corners (8px, 12px, 16px) for modern feel
- ✅ Proper contrast ratios for accessibility

### 🧪 Quality Assurance Results

**Functionality Testing**
- ✅ All existing functionality preserved and enhanced
- ✅ No horizontal scrolling on any screen size
- ✅ Touch targets meet accessibility guidelines (44px+)
- ✅ Loading states provide clear user feedback
- ✅ Error states offer recovery options
- ✅ Navigation is intuitive and consistent

**Performance Metrics**
- ✅ TypeScript compilation: ✅ No errors
- ✅ React Hooks compliance: ✅ All violations fixed
- ✅ Component re-render optimization: ✅ Memoized callbacks
- ✅ Bundle size impact: ✅ Minimal (reused existing components)

**Cross-Device Compatibility**
- ✅ Mobile phones (320px+): Optimized touch interface
- ✅ Tablets (768px+): Enhanced card grid layout
- ✅ Desktop (1024px+): Full feature set with hover states
- ✅ High DPI displays: Sharp icons and proper scaling

### 🚀 Implementation Summary

**Files Modified:**
- `src/views/player/SeriesDetail.tsx` - Complete redesign with integration
- `src/components/ui/bottom-sheet.tsx` - Enhanced modal system
- `src/components/series/recent-activity.tsx` - Timeline component

**Key Features Delivered:**
1. **Mobile-First Design**: Optimized for touch interaction
2. **Bottom Sheet Navigation**: Replaces horizontal scrolling tabs
3. **Enhanced Loading States**: Professional skeleton UI
4. **Comprehensive Error Handling**: User-friendly with retry options
5. **Improved Back Navigation**: History-aware routing
6. **TapScore Branding**: Consistent design system throughout
7. **Accessibility Compliance**: ARIA labels, keyboard navigation
8. **Performance Optimization**: Memoized callbacks, proper hooks

**User Experience Improvements:**
- Eliminated horizontal scrolling completely
- Enhanced touch targets for mobile users  
- Smooth animations and micro-interactions
- Clear visual hierarchy and information architecture
- Professional loading and error states
- Intuitive navigation patterns

## 🎉 FINAL RESULT

The Series Detail component is now a **mobile-first, TapScore-branded experience** that:
- Maintains all existing functionality while dramatically improving UX
- Follows modern design patterns with smooth animations
- Provides comprehensive error handling and loading states
- Delivers excellent performance and accessibility
- Represents the high quality expected of the TapScore platform

### 🐛 Critical Bug Fixes (Update 2)

**Bottom Sheet Flickering Issue - RESOLVED**
- ✅ **Root Cause**: Immediate render function calls in useCallback dependencies
- ✅ **Solution**: Changed to string-based content type system
- ✅ **Result**: Bottom sheets now open and stay open properly

**Back Navigation Issue - RESOLVED**  
- ✅ **Root Cause**: Incorrect implementation using direct navigation instead of browser history
- ✅ **Solution**: Restored proper `window.history.back()` for true browser back behavior
- ✅ **Result**: Proper single-step browser history navigation (series→competition→back to series)

**Implementation Changes:**
\`\`\`typescript
// Before: Problematic immediate render calls
bottomSheet.openSheet(renderDocumentsSheet(), "Documents");

// After: String-based content type
bottomSheet.openSheet("documents", "Documents");

// Before: Incorrect direct navigation
navigate({ to: "/player/series" });

// After: Proper browser history navigation  
window.history.back();
\`\`\`

**Development Server**: Ready for testing at `http://localhost:5174`
**Status**: ✅ Production Ready (Critical bugs fixed)
**Quality Score**: A+ (No TypeScript errors, no flickering, reliable navigation) 
```

# frontend/eslint.config.js

```js
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
)

```

# frontend/index.html

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite + React + TS</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>

```

# frontend/package.json

```json
{
  "name": "frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "preview:prod": "vite preview --base /golf-serie/",
    "deploy": "npm run build && rm -rf ../frontend_dist/* && cp -r dist/* ../frontend_dist/"
  },
  "dependencies": {
    "@radix-ui/react-avatar": "^1.1.10",
    "@radix-ui/react-dialog": "^1.1.14",
    "@radix-ui/react-icons": "^1.3.2",
    "@radix-ui/react-select": "^2.2.5",
    "@radix-ui/react-slot": "^1.2.3",
    "@radix-ui/react-switch": "^1.2.5",
    "@radix-ui/react-tabs": "^1.1.12",
    "@tailwindcss/line-clamp": "^0.4.4",
    "@tailwindcss/vite": "^4.1.7",
    "@tanstack/react-query": "^5.77.2",
    "@tanstack/react-query-devtools": "^5.77.2",
    "@tanstack/react-router": "^1.120.11",
    "@tanstack/router-devtools": "^1.120.11",
    "@uiw/react-md-editor": "^4.0.7",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.511.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-markdown": "^10.1.0",
    "remark-gfm": "^4.0.1",
    "tailwind-merge": "^3.3.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.25.0",
    "@types/react": "^19.1.2",
    "@types/react-dom": "^19.1.2",
    "@vitejs/plugin-react": "^4.4.1",
    "autoprefixer": "^10.4.21",
    "eslint": "^9.25.0",
    "eslint-plugin-react-hooks": "^5.2.0",
    "eslint-plugin-react-refresh": "^0.4.19",
    "globals": "^16.0.0",
    "postcss": "^8.5.3",
    "tailwindcss": "^4.1.7",
    "tailwindcss-animate": "^1.0.7",
    "tw-animate-css": "^1.3.0",
    "typescript": "~5.8.3",
    "typescript-eslint": "^8.30.1",
    "vite": "^6.3.5"
  }
}

```

# frontend/public/tapscore_horizontal_large_transparent.png

This is a binary file of the type: Image

# frontend/public/tapscore_horizontal.png

This is a binary file of the type: Image

# frontend/public/tapscore_logo.png

This is a binary file of the type: Image

# frontend/README.md

```md
# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

\`\`\`js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
\`\`\`

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

\`\`\`js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
\`\`\`

```

# frontend/src/api/competitions.ts

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "./config";
import type { TeeTimeParticipant } from "./tee-times";

export interface Competition {
  id: number;
  name: string;
  date: string;
  course_id: number;
  series_id?: number;
  created_at: string;
  updated_at: string;
  participant_count: number;
}

export interface LeaderboardEntry {
  participant: TeeTimeParticipant;
  totalShots: number;
  holesPlayed: number;
  relativeToPar: number;
}

export function useCompetitions() {
  return useQuery<Competition[]>({
    queryKey: ["competitions"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/competitions`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });
}

export function useCompetition(competitionId: number) {
  return useQuery<Competition>({
    queryKey: ["competition", competitionId],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/competitions/${competitionId}`
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    enabled: competitionId > 0,
  });
}

export function useCompetitionLeaderboard(competitionId: number) {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ["competition", competitionId, "leaderboard"],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/competitions/${competitionId}/leaderboard`
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    enabled: competitionId > 0,
  });
}

export interface CreateCompetitionDto {
  name: string;
  date: string;
  course_id: number;
  series_id?: number;
}

export interface UpdateCompetitionDto {
  name?: string;
  date?: string;
  course_id?: number;
  series_id?: number;
}

// Note: These mutation hooks will be added when needed for admin functionality
// For now, competitions are read-only in the current implementation

export function useCreateCompetition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCompetitionDto): Promise<Competition> => {
      const response = await fetch(`${API_BASE_URL}/competitions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to create competition");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["competitions"] });
    },
  });
}

export function useUpdateCompetition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: UpdateCompetitionDto;
    }): Promise<Competition> => {
      const response = await fetch(`${API_BASE_URL}/competitions/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to update competition");
      }

      return response.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["competitions"] });
      queryClient.invalidateQueries({ queryKey: ["competition", id] });
    },
  });
}

export function useDeleteCompetition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      const response = await fetch(`${API_BASE_URL}/competitions/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete competition");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["competitions"] });
    },
  });
}

```

# frontend/src/api/config.ts

```ts
// API configuration that works in both development and production
// In development: uses proxy to localhost:3000
// In production: uses relative paths that work with reverse proxy

export function getBasePath(): string {
  // In development, no base path needed
  if (import.meta.env.DEV) {
    return "";
  }

  // In production, detect if we're under /golf-serie
  const currentPath = window.location.pathname;
  if (currentPath.startsWith("/golf-serie")) {
    return "/golf-serie";
  }

  return "";
}

function getApiBaseUrl(): string {
  // In development, Vite's proxy handles /api requests
  if (import.meta.env.DEV) {
    return "/api";
  }

  // In production, construct API URL relative to the current path
  // This will work whether deployed at root or under /golf-serie
  const basePath = getBasePath();
  return `${basePath}/api`;
}

export const API_BASE_URL = getApiBaseUrl();

```

# frontend/src/api/courses.ts

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "./config";

export interface Course {
  id: number;
  name: string;
  pars: {
    holes: number[];
    out: number;
    in: number;
    total: number;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateCourseData {
  name: string;
}

export function useCourses() {
  return useQuery<Course[]>({
    queryKey: ["courses"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/courses`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });
}

export function useCourse(id: number) {
  return useQuery<Course>({
    queryKey: ["course", id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/courses/${id}`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCourseData) => {
      const response = await fetch(`${API_BASE_URL}/courses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}

export function useUpdateCourseHoles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, holes }: { id: number; holes: number[] }) => {
      const response = await fetch(`${API_BASE_URL}/courses/${id}/holes`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(holes),
      });
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${API_BASE_URL}/courses/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      if (response.status === 204) {
        return null;
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}

```

# frontend/src/api/participants.ts

```ts
import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL } from "./config";

export interface Participant {
  id: number;
  tee_order: number;
  team_id: number;
  tee_time_id: number;
  position_name: string;
  player_names?: string;
  score: number[];
  created_at: string;
  updated_at: string;
  team_name: string;
}

export function useParticipants() {
  return useQuery<Participant[]>({
    queryKey: ["participants"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/participants`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });
}

export function useParticipant(id: number) {
  return useQuery<Participant>({
    queryKey: ["participant", id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/participants/${id}`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });
}

```

# frontend/src/api/series.ts

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Competition } from "./competitions";
import { API_BASE_URL } from "./config";
import type { Team } from "./teams";

export interface Series {
  id: number;
  name: string;
  description?: string;
  banner_image_url?: string;
  is_public: boolean;
  landing_document_id?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateSeriesDto {
  name: string;
  description?: string;
  banner_image_url?: string;
  is_public?: boolean;
}

export interface UpdateSeriesDto {
  name?: string;
  description?: string;
  banner_image_url?: string;
  is_public?: boolean;
  landing_document_id?: number;
}

export interface SeriesTeamStanding {
  team_id: number;
  team_name: string;
  total_points: number;
  competitions_played: number;
  position: number;
  competitions: {
    competition_id: number;
    competition_name: string;
    competition_date: string;
    points: number;
    position: number;
  }[];
}

export interface SeriesStandings {
  series: Series;
  team_standings: SeriesTeamStanding[];
  total_competitions: number;
}

export interface SeriesDocument {
  id: number;
  series_id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSeriesDocumentDto {
  title: string;
  content: string;
}

export interface UpdateSeriesDocumentDto {
  title?: string;
  content?: string;
}

export function useSeries() {
  return useQuery<Series[]>({
    queryKey: ["series"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/series`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });
}

export function usePublicSeries() {
  return useQuery<Series[]>({
    queryKey: ["series", "public"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/series/public`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });
}

export function useSingleSeries(id: number) {
  return useQuery<Series>({
    queryKey: ["series", id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/series/${id}`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    enabled: id > 0,
  });
}

export function useSeriesStandings(id: number) {
  return useQuery<SeriesStandings>({
    queryKey: ["series", id, "standings"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/series/${id}/standings`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    enabled: id > 0,
  });
}

export function useSeriesCompetitions(id: number) {
  return useQuery<Competition[]>({
    queryKey: ["series", id, "competitions"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/series/${id}/competitions`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    enabled: id > 0,
  });
}

export function useSeriesTeams(id: number) {
  return useQuery<Team[]>({
    queryKey: ["series", id, "teams"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/series/${id}/teams`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    enabled: id > 0,
  });
}

export function useCreateSeries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSeriesDto) => {
      const response = await fetch(`${API_BASE_URL}/series`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["series"] });
    },
  });
}

export function useUpdateSeries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateSeriesDto }) => {
      const response = await fetch(`${API_BASE_URL}/series/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["series"] });
      queryClient.invalidateQueries({ queryKey: ["series", id] });
      queryClient.invalidateQueries({ queryKey: ["series", "public"] });
    },
  });
}

export function useDeleteSeries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${API_BASE_URL}/series/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["series"] });
      queryClient.invalidateQueries({ queryKey: ["series", "public"] });
    },
  });
}

export function useAvailableTeams(seriesId: number) {
  return useQuery<Team[]>({
    queryKey: ["series", seriesId, "available-teams"],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/series/${seriesId}/available-teams`
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    enabled: seriesId > 0,
  });
}

export function useAddTeamToSeries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      seriesId,
      teamId,
    }: {
      seriesId: number;
      teamId: number;
    }) => {
      const response = await fetch(
        `${API_BASE_URL}/series/${seriesId}/teams/${teamId}`,
        {
          method: "POST",
        }
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    onSuccess: (_, { seriesId }) => {
      queryClient.invalidateQueries({
        queryKey: ["series", seriesId, "teams"],
      });
      queryClient.invalidateQueries({
        queryKey: ["series", seriesId, "available-teams"],
      });
      queryClient.invalidateQueries({
        queryKey: ["series", seriesId, "standings"],
      });
    },
  });
}

export function useRemoveTeamFromSeries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      seriesId,
      teamId,
    }: {
      seriesId: number;
      teamId: number;
    }) => {
      const response = await fetch(
        `${API_BASE_URL}/series/${seriesId}/teams/${teamId}`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    onSuccess: (_, { seriesId }) => {
      queryClient.invalidateQueries({
        queryKey: ["series", seriesId, "teams"],
      });
      queryClient.invalidateQueries({
        queryKey: ["series", seriesId, "available-teams"],
      });
      queryClient.invalidateQueries({
        queryKey: ["series", seriesId, "standings"],
      });
    },
  });
}

// Series documents functions
export function useSeriesDocuments(seriesId: number) {
  return useQuery<SeriesDocument[]>({
    queryKey: ["series", seriesId, "documents"],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/series/${seriesId}/documents`
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    enabled: seriesId > 0,
  });
}

export function useCreateSeriesDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      seriesId,
      data,
    }: {
      seriesId: number;
      data: CreateSeriesDocumentDto;
    }) => {
      const response = await fetch(
        `${API_BASE_URL}/series/${seriesId}/documents`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    onSuccess: (_, { seriesId }) => {
      queryClient.invalidateQueries({
        queryKey: ["series", seriesId, "documents"],
      });
    },
  });
}

export function useUpdateSeriesDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      seriesId,
      documentId,
      data,
    }: {
      seriesId: number;
      documentId: number;
      data: UpdateSeriesDocumentDto;
    }) => {
      const response = await fetch(
        `${API_BASE_URL}/series/${seriesId}/documents/${documentId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    onSuccess: (_, { seriesId }) => {
      queryClient.invalidateQueries({
        queryKey: ["series", seriesId, "documents"],
      });
    },
  });
}

export function useDeleteSeriesDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      seriesId,
      documentId,
    }: {
      seriesId: number;
      documentId: number;
    }) => {
      const response = await fetch(
        `${API_BASE_URL}/series/${seriesId}/documents/${documentId}`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    onSuccess: (_, { seriesId }) => {
      queryClient.invalidateQueries({
        queryKey: ["series", seriesId, "documents"],
      });
    },
  });
}

```

# frontend/src/api/teams.ts

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "./config";

export interface Team {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export function useTeams() {
  return useQuery<Team[]>({
    queryKey: ["teams"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/teams`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });
}

export function useTeam(id: number) {
  return useQuery<Team>({
    queryKey: ["team", id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/teams/${id}`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string }) => {
      const response = await fetch(`${API_BASE_URL}/teams`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: { name?: string };
    }) => {
      const response = await fetch(`${API_BASE_URL}/teams/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${API_BASE_URL}/teams/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}

```

# frontend/src/api/tee-times.ts

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "./config";

export interface TeeTimeParticipant {
  id: number;
  tee_order: number;
  team_id: number;
  position_name: string;
  player_names: string | null;
  created_at: string;
  updated_at: string;
  tee_time_id: number;
  score: number[];
  team_name: string;
}

export interface TeeTime {
  id: number;
  teetime: string;
  competition_id: number;
  created_at: string;
  updated_at: string;
  course_name: string;
  pars: number[];
  participants: TeeTimeParticipant[];
}

export function useTeeTimes() {
  return useQuery<TeeTime[]>({
    queryKey: ["tee-times"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/tee-times`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });
}

export function useTeeTimesForCompetition(competitionId: number) {
  return useQuery<TeeTime[]>({
    queryKey: ["tee-times", "competition", competitionId],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/competitions/${competitionId}/tee-times`
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    enabled: !!competitionId,
  });
}

export function useTeeTime(teeTimeId: number) {
  return useQuery({
    queryKey: ["teeTime", teeTimeId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/tee-times/${teeTimeId}`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    enabled: teeTimeId > 0,
  });
}

export function useUpdateScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      participantId,
      hole,
      shots,
    }: {
      participantId: number;
      hole: number;
      shots: number;
    }) => {
      const response = await fetch(
        `${API_BASE_URL}/participants/${participantId}/score`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ hole, shots }),
        }
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Update the specific teeTime query cache with the fresh data
      // This ensures the UI reflects the updated score immediately
      const teeTimeId = data.tee_time_id;
      if (teeTimeId) {
        queryClient.invalidateQueries({ queryKey: ["teeTime", teeTimeId] });
      }
    },
  });
}

interface CreateTeeTimeParams {
  competitionId: number;
  teetime: string;
}

interface CreateParticipantParams {
  tee_order: number;
  position_name: string;
  team_id: number;
  tee_time_id: number;
}

export function useCreateTeeTime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ competitionId, teetime }: CreateTeeTimeParams) => {
      const response = await fetch(
        `${API_BASE_URL}/competitions/${competitionId}/tee-times`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ teetime }),
        }
      );
      if (!response.ok) {
        throw new Error("Failed to create tee time");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["tee-times", "competition", variables.competitionId],
      });
    },
  });
}

export function useCreateParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateParticipantParams) => {
      const response = await fetch(`${API_BASE_URL}/participants`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });
      if (!response.ok) {
        throw new Error("Failed to create participant");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate the tee time query to refetch the updated data
      queryClient.invalidateQueries({
        queryKey: ["teeTime", variables.tee_time_id],
      });
    },
  });
}

export function useDeleteTeeTime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (teeTimeId: number) => {
      const response = await fetch(`${API_BASE_URL}/tee-times/${teeTimeId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete tee time");
      }
      // Don't try to parse JSON for 204 responses
      if (response.status === 204) {
        return null;
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate the tee times query to refetch the updated data
      queryClient.invalidateQueries({ queryKey: ["tee-times"] });
    },
  });
}

export function useDeleteParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (participantId: number) => {
      const response = await fetch(
        `${API_BASE_URL}/participants/${participantId}`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) {
        throw new Error("Failed to delete participant");
      }
      // Don't try to parse JSON for 204 responses
      if (response.status === 204) {
        return null;
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate the tee times query to refetch the updated data
      queryClient.invalidateQueries({ queryKey: ["tee-times"] });
    },
  });
}

export function useParticipant(participantId: number) {
  return useQuery<TeeTimeParticipant>({
    queryKey: ["participant", participantId],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/participants/${participantId}`
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    enabled: participantId > 0,
  });
}

```

# frontend/src/App.css

```css
#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.react:hover {
  filter: drop-shadow(0 0 2em #61dafbaa);
}

@keyframes logo-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: no-preference) {
  a:nth-of-type(2) .logo {
    animation: logo-spin infinite 20s linear;
  }
}

.card {
  padding: 2em;
}

.read-the-docs {
  color: #888;
}

```

# frontend/src/App.tsx

```tsx
import { Outlet, useRouterState } from "@tanstack/react-router";
import TapScoreLogo from "./components/ui/TapScoreLogo";

export default function App() {
  const { location } = useRouterState();

  // Check if we're in a competition round (full-screen mode)
  const isCompetitionRound =
    location.pathname.includes("/competitions/") &&
    (location.pathname.includes("/tee-times/") ||
      location.pathname.match(/\/competitions\/\d+$/));

  // Check if we're in a layout that already has its own header
  const hasOwnHeader =
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/player");

  if (isCompetitionRound || hasOwnHeader) {
    // Full-screen layout for competition rounds or layouts with their own headers
    return <Outlet />;
  }

  // Regular layout for other pages (fallback/landing pages)
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-scorecard via-scorecard to-rough">
      <header className="border-b-2 border-soft-grey bg-fairway shadow-[0_2px_8px_rgba(27,67,50,0.15)] sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-center">
            <TapScoreLogo size="md" variant="color" layout="horizontal" />
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center w-full">
        <main className="w-full max-w-6xl px-4 py-8 flex-1">
          <div className="bg-scorecard rounded-xl shadow-[0_2px_8px_rgba(27,67,50,0.08)] border-2 border-soft-grey p-6 lg:p-8 min-h-[70vh]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

```

# frontend/src/components/competition/CompetitionInfoBar.tsx

```tsx
import { Calendar, MapPin, Users } from "lucide-react";

interface CompetitionInfoBarProps {
  competition: { date: string };
  courseName?: string;
  totalParticipants: number;
  variant?: "header" | "footer";
}

export function CompetitionInfoBar({
  competition,
  courseName,
  totalParticipants,
  variant = "footer",
}: CompetitionInfoBarProps) {
  const baseClass =
    variant === "header"
      ? "bg-rough/30 rounded-xl p-4 border border-soft-grey"
      : "bg-rough/30 border-t border-soft-grey px-4 py-2 flex-shrink-0";

  return (
    <div className={baseClass}>
      <div className="flex items-center justify-center gap-4 md:gap-8 text-label-sm text-charcoal font-primary">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4 text-turf" />
          <span className="hidden sm:inline">
            {new Date(competition.date).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </span>
          <span className="sm:hidden">
            {new Date(competition.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-turf" />
          <span className="truncate">{courseName || "Loading..."}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="h-4 w-4 text-turf" />
          <span>{totalParticipants} participants</span>
        </div>
      </div>
    </div>
  );
}

```

# frontend/src/components/competition/index.ts

```ts
export { CompetitionInfoBar } from "./CompetitionInfoBar";
export { LeaderboardComponent } from "./LeaderboardComponent";
export { ParticipantsListComponent } from "./ParticipantsListComponent";
export { TeamResultComponent } from "./TeamResultComponent";

```

# frontend/src/components/competition/LeaderboardComponent.tsx

```tsx
import { formatToPar, getToParColor } from "../../utils/scoreCalculations";

interface LeaderboardEntry {
  participant: {
    id: number;
    team_name: string;
    position_name: string;
    player_names?: string | null;
  };
  totalShots: number;
  relativeToPar: number;
  holesPlayed: number;
}

interface LeaderboardComponentProps {
  leaderboard: LeaderboardEntry[] | undefined;
  leaderboardLoading: boolean;
  onParticipantClick: (participantId: number) => void;
  // For CompetitionRound context
  isRoundView?: boolean;
}

export function LeaderboardComponent({
  leaderboard,
  leaderboardLoading,
  onParticipantClick,
  isRoundView = false,
}: LeaderboardComponentProps) {
  const content = (
    <div className="space-y-3 md:space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg md:text-xl font-semibold text-fairway font-display">
          Leaderboard
        </h2>
        <div className="text-xs md:text-sm text-turf font-primary">
          Live scoring
        </div>
      </div>

      {leaderboardLoading ? (
        <div className="p-4 text-charcoal font-primary">
          Loading leaderboard...
        </div>
      ) : !leaderboard || leaderboard.length === 0 ? (
        <div className="text-center py-6 md:py-8 text-soft-grey font-primary">
          No scores reported yet.
        </div>
      ) : (
        <div className="space-y-3">
          {[...leaderboard]
            .sort((a, b) => {
              // First sort by whether they have started (holes played > 0)
              const aStarted = a.holesPlayed > 0;
              const bStarted = b.holesPlayed > 0;
              if (aStarted !== bStarted) {
                return aStarted ? -1 : 1;
              }
              // Then sort by relativeToPar
              return a.relativeToPar - b.relativeToPar;
            })
            .map((entry, index) => {
              const isActive = index === 0; // Highlight leader
              return (
                <button
                  key={entry.participant.id}
                  onClick={() => onParticipantClick(entry.participant.id)}
                  className={`w-full text-left bg-scorecard rounded-lg p-4 shadow-sm border transition-all duration-200 hover:shadow-md hover:border-turf cursor-pointer ${
                    isActive
                      ? "border-coral/20 shadow-md ring-2 ring-coral/10"
                      : "border-soft-grey"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-body-lg font-semibold text-charcoal font-display">
                        {entry.participant.team_name}{" "}
                        {entry.participant.position_name}
                      </h3>
                      <p className="text-label-sm text-turf mb-1 font-primary">
                        Thru {entry.holesPlayed} holes
                      </p>
                      <span
                        className={`text-label-sm font-medium font-primary ${getToParColor(
                          entry.relativeToPar
                        )}`}
                      >
                        {formatToPar(entry.relativeToPar)}
                      </span>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-display-md font-bold text-charcoal font-display">
                        {entry.totalShots}
                      </div>
                      <div className="w-12 h-12 rounded-full border-2 border-soft-grey bg-rough/10 flex items-center justify-center text-label-sm font-medium text-turf">
                        NR
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
        </div>
      )}
    </div>
  );

  // For CompetitionRound.tsx - wrap in scrollable container
  if (isRoundView) {
    return (
      <div className="h-full overflow-y-auto bg-scorecard">
        <div className="p-4">{content}</div>
      </div>
    );
  }

  // For CompetitionDetail.tsx - return content directly
  return content;
}

```

# frontend/src/components/competition/ParticipantsListComponent.tsx

```tsx
import { Link } from "@tanstack/react-router";
import { Clock, Users } from "lucide-react";
import {
  formatParticipantTypeDisplay,
  isMultiPlayerFormat,
} from "../../utils/playerUtils";
import type { TeeTimeParticipant } from "../../api/tee-times";

interface TeeTime {
  id: number;
  teetime: string;
  participants: TeeTimeParticipant[];
  pars: number[];
  course_name: string;
}

interface ParticipantsListComponentProps {
  teeTimes: TeeTime[] | undefined;
  teeTimesLoading: boolean;
  competitionId: string;
  // For CompetitionRound context
  currentTeeTimeId?: string;
  currentTeeTime?: TeeTime;
  showCurrentGroup?: boolean;
  totalParticipants?: number;
}

export function ParticipantsListComponent({
  teeTimes,
  teeTimesLoading,
  competitionId,
  currentTeeTimeId,
  currentTeeTime,
  showCurrentGroup = false,
  totalParticipants = 0,
}: ParticipantsListComponentProps) {
  // For CompetitionDetail.tsx - simple start list view
  if (!showCurrentGroup) {
    return (
      <div className="space-y-3 md:space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg md:text-xl font-semibold text-fairway font-display">
            Tee Times
          </h2>
          <div className="text-xs md:text-sm text-turf font-primary">
            {teeTimes?.length || 0} tee times
          </div>
        </div>

        {teeTimesLoading ? (
          <div className="p-4 text-charcoal font-primary">
            Loading tee times...
          </div>
        ) : !teeTimes || teeTimes.length === 0 ? (
          <div className="text-center py-6 md:py-8 text-soft-grey text-sm font-primary">
            No tee times scheduled for this competition yet.
          </div>
        ) : (
          <div className="space-y-3">
            {teeTimes.map((teeTime) => (
              <div
                key={teeTime.id}
                className="bg-scorecard rounded-xl border border-soft-grey overflow-hidden"
              >
                <div className="bg-rough bg-opacity-30 px-4 py-3 border-b border-soft-grey">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base md:text-lg font-semibold text-fairway font-display flex items-center gap-2">
                      <Clock className="h-4 w-4 md:h-5 md:w-5 text-turf" />
                      {teeTime.teetime}
                    </h4>
                    <div className="text-xs md:text-sm text-turf font-primary">
                      {teeTime.participants.length} players
                    </div>
                  </div>
                </div>

                {teeTime.participants.length === 0 ? (
                  <div className="text-center py-4 text-soft-grey text-sm font-primary">
                    No participants assigned to this tee time yet.
                  </div>
                ) : (
                  <div className="divide-y divide-soft-grey">
                    {teeTime.participants.map((participant) => (
                      <Link
                        key={participant.id}
                        to={`/player/competitions/${competitionId}/tee-times/${teeTime.id}`}
                        className="px-4 py-3 flex items-center justify-between hover:bg-rough hover:bg-opacity-20 transition-colors"
                      >
                        <div className="flex-1">
                          <h5 className="text-sm md:text-base font-medium text-fairway font-primary">
                            {participant.team_name}
                          </h5>
                          <p className="text-xs md:text-sm text-turf font-primary">
                            {formatParticipantTypeDisplay(
                              participant.position_name
                            )}
                            {participant.player_names && (
                              <span className="ml-2">
                                • {participant.player_names}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="text-xs text-turf">
                          {isMultiPlayerFormat(participant.position_name) && (
                            <Users className="w-4 h-4 inline-block" />
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // For CompetitionRound.tsx - participants view with current group context
  return (
    <div className="h-full overflow-y-auto bg-scorecard">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg md:text-xl font-semibold text-fairway font-display">
            Round Participants
          </h2>
          <div className="text-xs md:text-sm text-turf font-primary">
            {currentTeeTimeId ? "Current group" : `${totalParticipants} total`}
          </div>
        </div>

        {/* Current Tee Time Group (if in score entry context) */}
        {currentTeeTimeId && currentTeeTime && (
          <div className="bg-rough bg-opacity-20 rounded-xl border border-turf p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm md:text-lg font-semibold text-fairway font-display">
                Your Group - {currentTeeTime.teetime}
              </h3>
              <span className="text-xs md:text-sm text-scorecard bg-coral px-2 py-1 rounded-full font-primary font-medium">
                Active
              </span>
            </div>
            <div className="space-y-2">
              {currentTeeTime.participants.map(
                (participant: TeeTimeParticipant) => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between p-3 bg-scorecard rounded-xl border border-turf"
                  >
                    <div className="flex-1">
                      <h4 className="text-sm md:text-base font-medium text-fairway font-primary">
                        {participant.team_name}
                      </h4>
                      <p className="text-xs md:text-sm text-turf mt-1 font-primary">
                        {formatParticipantTypeDisplay(
                          participant.position_name
                        )}
                        {participant.player_names && (
                          <span className="ml-2">
                            • {participant.player_names}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-xs text-turf">
                      {isMultiPlayerFormat(participant.position_name) && (
                        <Users className="w-4 h-4 inline-block" />
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* All Other Tee Times */}
        <div>
          <h3 className="text-sm md:text-base font-medium text-fairway mb-3 font-primary">
            {currentTeeTimeId ? "Other Groups" : "All Groups"}
          </h3>

          {!teeTimes || teeTimes.length === 0 ? (
            <div className="text-center py-6 md:py-8 text-soft-grey font-primary">
              No tee times scheduled for this competition.
            </div>
          ) : (
            <div className="space-y-3">
              {teeTimes
                .filter(
                  (t) =>
                    !currentTeeTimeId || t.id !== parseInt(currentTeeTimeId)
                )
                .map((teeTimeGroup) => (
                  <div
                    key={teeTimeGroup.id}
                    className="bg-scorecard rounded-xl border border-soft-grey overflow-hidden"
                  >
                    <div className="bg-rough bg-opacity-30 px-4 py-2 border-b border-soft-grey">
                      <h4 className="text-sm md:text-base font-semibold text-fairway font-display">
                        {teeTimeGroup.teetime}
                      </h4>
                    </div>
                    <div className="divide-y divide-soft-grey">
                      {teeTimeGroup.participants.map(
                        (participant: TeeTimeParticipant) => (
                          <div
                            key={participant.id}
                            className="px-4 py-2 flex items-center justify-between"
                          >
                            <div className="flex-1">
                              <h5 className="text-xs md:text-sm font-medium text-fairway font-primary">
                                {participant.team_name}
                              </h5>
                              <p className="text-xs text-turf font-primary">
                                {formatParticipantTypeDisplay(
                                  participant.position_name
                                )}
                              </p>
                            </div>
                            <div className="text-xs text-turf">
                              {isMultiPlayerFormat(
                                participant.position_name
                              ) && <Users className="w-3 h-3 inline-block" />}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

```

# frontend/src/components/competition/TeamResultComponent.tsx

```tsx
import { formatToPar, getToParColor } from "../../utils/scoreCalculations";

interface TeamResultEntry {
  teamName: string;
  participants: Array<{
    name: string;
    position: string;
    totalShots: number;
    relativeToPar: number;
  }>;
  totalShots: number;
  relativeToPar: number;
  position: number;
  points: number;
}

interface TeamResultComponentProps {
  teamResults: TeamResultEntry[] | undefined;
  leaderboardLoading: boolean;
  // For CompetitionRound context
  isRoundView?: boolean;
}

export function TeamResultComponent({
  teamResults,
  leaderboardLoading,
  isRoundView = false,
}: TeamResultComponentProps) {
  const content = (
    <div className="space-y-3 md:space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg md:text-xl font-semibold text-fairway font-display">
          Team Results
        </h2>
        <div className="text-xs md:text-sm text-turf font-primary">
          Final standings
        </div>
      </div>

      {leaderboardLoading ? (
        <div className="p-4 text-charcoal font-primary">
          Loading team results...
        </div>
      ) : !teamResults || teamResults.length === 0 ? (
        <div className="text-center py-6 md:py-8 text-soft-grey font-primary">
          No team results available yet.
        </div>
      ) : (
        <div className="space-y-3">
          {teamResults.map((team) => {
            const isLeading = team.position === 1;
            return (
              <div
                key={team.teamName}
                className={`bg-scorecard rounded-lg p-4 shadow-sm border transition-all duration-200 ${
                  isLeading
                    ? "border-coral/20 shadow-md ring-2 ring-coral/10"
                    : "border-soft-grey"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-body-lg font-semibold text-charcoal font-display">
                      {team.teamName}
                    </h3>
                    <p className="text-label-sm text-turf mb-1 font-primary">
                      {team.participants.length} players
                    </p>
                    <span
                      className={`text-label-sm font-medium font-primary ${getToParColor(
                        team.relativeToPar
                      )}`}
                    >
                      {formatToPar(team.relativeToPar)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-display-md font-bold text-charcoal font-display">
                      {team.totalShots}
                    </div>
                    <div className="w-12 h-12 rounded-full border-2 border-soft-grey bg-rough/10 flex items-center justify-center text-label-sm font-medium text-turf">
                      #{team.position}
                    </div>
                  </div>
                </div>

                {/* Player Scores */}
                <div className="space-y-2">
                  <h5 className="text-label-sm font-medium text-fairway font-primary">
                    Player Scores
                  </h5>
                  <div className="space-y-1">
                    {team.participants.map((participant) => (
                      <div
                        key={participant.name}
                        className="flex items-center justify-between text-label-sm"
                      >
                        <span className="text-turf truncate flex-1 mr-2 font-primary">
                          {participant.name} ({participant.position})
                        </span>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span
                            className={`font-primary ${getToParColor(
                              participant.relativeToPar
                            )}`}
                          >
                            {formatToPar(participant.relativeToPar)}
                          </span>
                          <span className="text-charcoal font-medium font-display">
                            {participant.totalShots}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // For CompetitionRound.tsx - wrap in scrollable container
  if (isRoundView) {
    return (
      <div className="h-full overflow-y-auto bg-scorecard">
        <div className="p-4">{content}</div>
      </div>
    );
  }

  // For CompetitionDetail.tsx - return content directly
  return content;
}

```

# frontend/src/components/layout/PlayerPageLayout.tsx

```tsx
import React from "react";
import { CommonHeader } from "../navigation/CommonHeader";

interface PlayerPageLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
  headerContent?: React.ReactNode;
  className?: string;
}

export function PlayerPageLayout({
  children,
  title,
  showBackButton = true,
  onBackClick,
  headerContent,
  className = "",
}: PlayerPageLayoutProps) {
  return (
    <div className={`min-h-screen bg-scorecard ${className}`}>
      <CommonHeader
        title={title}
        showBackButton={showBackButton}
        onBackClick={onBackClick}
      >
        {headerContent}
      </CommonHeader>

      {children}
    </div>
  );
}

```

# frontend/src/components/MarkdownEditor.tsx

```tsx
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import { useEffect } from "react";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: number;
}

export default function MarkdownEditor({
  value,
  onChange,
  height = 400,
}: MarkdownEditorProps) {
  // Ensure body overflow is reset when component unmounts
  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="markdown-editor">
      <MDEditor
        value={value}
        onChange={(val) => onChange(val || "")}
        height={height}
        preview="edit"
        hideToolbar={false}
        data-color-mode="light"
        onFocus={() => {
          // Ensure scrolling works when editor is focused
          document.body.style.overflow = "";
        }}
        onBlur={() => {
          // Reset overflow when editor loses focus
          document.body.style.overflow = "";
        }}
      />
    </div>
  );
}

```

# frontend/src/components/navigation/BottomTabNavigation.tsx

```tsx
import { cn } from "@/lib/utils";
import { Edit3, Trophy, Medal, Users } from "lucide-react";

interface BottomTabNavigationProps {
  activeTab: "score" | "leaderboard" | "teams" | "participants";
  onTabChange: (
    tab: "score" | "leaderboard" | "teams" | "participants"
  ) => void;
  className?: string;
}

export function BottomTabNavigation({
  activeTab,
  onTabChange,
  className,
}: BottomTabNavigationProps) {
  const tabs = [
    {
      id: "score" as const,
      label: "Score Entry",
      shortLabel: "Score",
      icon: Edit3,
      disabled: false,
    },
    {
      id: "leaderboard" as const,
      label: "Leaderboard",
      shortLabel: "Leaderboard",
      icon: Trophy,
      disabled: false,
    },
    {
      id: "teams" as const,
      label: "Team Results",
      shortLabel: "Teams",
      icon: Medal,
      disabled: false,
    },
    {
      id: "participants" as const,
      label: "Participants",
      shortLabel: "Start List",
      icon: Users,
      disabled: false,
    },
  ];

  return (
    <div
      className={cn(
        "bg-scorecard border-t-2 border-soft-grey shadow-[0_-2px_8px_rgba(27,67,50,0.08)]",
        className
      )}
    >
      <div className="grid grid-cols-4 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && onTabChange(tab.id)}
              disabled={tab.disabled}
              className={cn(
                "flex flex-col items-center justify-center py-3 px-2 transition-all duration-200 touch-manipulation",
                "min-h-[60px] md:min-h-[64px] font-['Inter']",
                isActive
                  ? "text-coral bg-gradient-to-b from-coral/10 to-coral/5 border-t-2 border-coral"
                  : "text-charcoal hover:text-turf hover:bg-rough/30",
                tab.disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <Icon
                className={cn(
                  "mb-1 transition-all duration-200",
                  isActive ? "w-6 h-6" : "w-5 h-5",
                  "md:w-6 md:h-6"
                )}
              />
              <span
                className={cn(
                  "text-xs font-medium transition-all duration-200",
                  "md:text-sm",
                  isActive && "font-semibold"
                )}
              >
                <span className="sm:hidden">{tab.shortLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

```

# frontend/src/components/navigation/CommonHeader.tsx

```tsx
import React from "react";
import { ArrowLeft } from "lucide-react";
import TapScoreLogo from "../ui/TapScoreLogo";

interface CommonHeaderProps {
  title?: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
  children?: React.ReactNode;
  className?: string;
}

export function CommonHeader({
  title,
  showBackButton = true,
  onBackClick,
  children,
  className = "",
}: CommonHeaderProps) {
  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      // Default behavior: go back in browser history
      window.history.back();
    }
  };

  return (
    <header className={`bg-fairway text-scorecard shadow-lg ${className}`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-4 h-16">
          {showBackButton && (
            <button
              onClick={handleBackClick}
              className="p-2 hover:bg-turf rounded-lg transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}

          <TapScoreLogo size="md" variant="color" layout="horizontal" />

          {title && (
            <>
              <div className="w-px h-6 bg-scorecard/30" />
              <div className="min-w-0 flex-1">
                <h1 className="text-body-lg font-semibold text-scorecard font-display truncate">
                  {title}
                </h1>
              </div>
            </>
          )}

          {children && <div className="ml-auto">{children}</div>}
        </div>
      </div>
    </header>
  );
}

```

# frontend/src/components/navigation/HamburgerMenu.tsx

```tsx
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Menu, X, Trophy, Settings } from "lucide-react";

interface HamburgerMenuProps {
  className?: string;
}

export function HamburgerMenu({ className }: HamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    {
      to: "/player/competitions",
      label: "Competitions",
      icon: Trophy,
      description: "Browse all competitions",
    },
    {
      to: "/admin/series",
      label: "Admin Panel",
      icon: Settings,
      description: "Manage competitions and settings",
    },
  ];

  const closeMenu = () => setIsOpen(false);

  return (
    <div className={cn("relative", className)}>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "p-2 rounded-xl transition-all duration-200 touch-manipulation font-['Inter']",
          "hover:bg-rough focus:outline-2 focus:outline-offset-2 focus:outline-turf",
          isOpen && "bg-rough"
        )}
        aria-label="Menu"
      >
        {isOpen ? (
          <X className="w-5 h-5 text-charcoal" />
        ) : (
          <Menu className="w-5 h-5 text-charcoal" />
        )}
      </button>

      {/* Menu Overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-fairway/25 z-40 md:hidden"
            onClick={closeMenu}
          />

          {/* Menu Content */}
          <div
            className={cn(
              "absolute top-12 right-0 w-80 bg-scorecard rounded-xl shadow-[0_4px_16px_rgba(27,67,50,0.15)] border-2 border-soft-grey z-50",
              "md:w-96"
            )}
          >
            <div className="p-2">
              <div className="px-3 py-2 border-b-2 border-soft-grey">
                <h3 className="text-sm font-semibold text-charcoal font-['DM_Sans']">
                  Navigation
                </h3>
              </div>

              <nav className="mt-2 space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={closeMenu}
                      className={cn(
                        "flex items-start gap-3 px-3 py-3 rounded-xl transition-all duration-200 font-['Inter']",
                        "hover:bg-rough focus:outline-2 focus:outline-offset-2 focus:outline-turf",
                        "group"
                      )}
                    >
                      <Icon className="w-5 h-5 text-soft-grey group-hover:text-turf mt-0.5 flex-shrink-0 transition-colors duration-200" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-charcoal group-hover:text-fairway transition-colors duration-200">
                          {item.label}
                        </div>
                        <div className="text-xs text-soft-grey mt-0.5">
                          {item.description}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

```

# frontend/src/components/navigation/HoleNavigation.tsx

```tsx
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HoleNavigationProps {
  currentHole: number;
  holePar: number;
  holeHcp?: number;
  onPrevious: () => void;
  onNext: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  className?: string;
}

export function HoleNavigation({
  currentHole,
  holePar,
  holeHcp,
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext,
  className,
}: HoleNavigationProps) {
  return (
    <div
      className={cn(
        "bg-coral text-charcoal px-4 py-2",
        "shadow-lg border-t border-coral/20",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <button
          onClick={onPrevious}
          disabled={!canGoPrevious}
          className={cn(
            "p-2 rounded-lg transition-all duration-200 touch-manipulation",
            canGoPrevious
              ? "hover:bg-coral/20 active:bg-coral/30"
              : "opacity-50 cursor-not-allowed"
          )}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-8 text-center">
          <div className="text-center">
            <span className="text-label-sm font-medium text-charcoal">Par</span>
            <div className="text-display-sm font-bold text-charcoal font-display">
              {holePar}
            </div>
          </div>

          <div className="text-center">
            <span className="text-label-sm font-medium text-charcoal">
              Holes
            </span>
            <div className="text-display-sm font-bold text-charcoal font-display">
              {currentHole}
            </div>
          </div>

          {holeHcp !== undefined && (
            <div className="text-center">
              <span className="text-label-sm font-medium text-charcoal">
                HCP
              </span>
              <div className="text-display-sm font-bold text-charcoal font-display">
                {holeHcp}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onNext}
          disabled={!canGoNext}
          className={cn(
            "p-2 rounded-lg transition-all duration-200 touch-manipulation",
            canGoNext
              ? "hover:bg-coral/20 active:bg-coral/30"
              : "opacity-50 cursor-not-allowed"
          )}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}

```

# frontend/src/components/navigation/index.ts

```ts
export { BottomTabNavigation } from "./BottomTabNavigation";
export { HamburgerMenu } from "./HamburgerMenu";
export { HoleNavigation } from "./HoleNavigation";

```

# frontend/src/components/ParticipantAssignment.tsx

```tsx
import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Users,
  Clock,
  X,
  Check,
  RefreshCw,
  UserX,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { Team } from "../api/teams";
import type { TeeTime } from "../api/tee-times";
import type { TeeTimeParticipant } from "../api/tee-times";
import { useCreateParticipant, useDeleteParticipant } from "../api/tee-times";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import {
  validatePlayerLimit,
  calculateTotalPlayers,
  formatParticipantTypeDisplay,
  isMultiPlayerFormat,
  getPlayerCountForParticipantType,
} from "../utils/playerUtils";
import { API_BASE_URL } from "../api/config";

// Interfaces
export interface GeneratedParticipant {
  id: string;
  teamId: number;
  teamName: string;
  participantType: string;
  assignedToTeeTimeId?: number;
  assignedToTeeTime?: string;
}

export interface Assignment {
  participantId: string;
  teeTimeId: number;
  teeOrder: number;
}

interface ParticipantAssignmentProps {
  selectedTeams: Team[];
  participantTypes: { id: string; name: string }[];
  teeTimes: TeeTime[];
  competitionId: number;
  onAssignmentsChange?: (assignments: Assignment[]) => void;
}

interface AssignmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  teeTime: TeeTime;
  availableParticipants: GeneratedParticipant[];
  onAssign: (participantId: string, teeTimeId: number) => void;
}

// Add fetch utility for updating order
async function updateTeeTimeParticipantOrder(
  teeTimeId: number,
  order: { participant_id: number; tee_order: number }[]
) {
  const res = await fetch(
    `${API_BASE_URL}/tee-times/${teeTimeId}/participants/order`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order),
    }
  );
  if (!res.ok) throw new Error("Failed to update participant order");
}

// Assignment Dialog Component
function AssignmentDialog({
  isOpen,
  onClose,
  teeTime,
  availableParticipants,
  onAssign,
}: AssignmentDialogProps) {
  const [selectedParticipant, setSelectedParticipant] = useState<string>("");

  const handleAssign = () => {
    if (selectedParticipant) {
      onAssign(selectedParticipant, teeTime.id);
      setSelectedParticipant("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Participant to {teeTime.teetime}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="max-h-64 overflow-y-auto">
            {availableParticipants.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-8 w-8 mx-auto mb-2" />
                <p>No available participants</p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableParticipants.map((participant) => (
                  <div
                    key={participant.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedParticipant === participant.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300"
                    }`}
                    onClick={() => setSelectedParticipant(participant.id)}
                  >
                    <div className="font-medium text-gray-900">
                      {participant.teamName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {participant.participantType}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={!selectedParticipant}>
              Assign
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Available Participants Panel Component
function AvailableParticipantsPanel({
  participants,
  selected,
  setSelected,
}: {
  participants: GeneratedParticipant[];
  selected: string[];
  setSelected: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const groupedParticipants = useMemo(() => {
    const groups: { [teamName: string]: GeneratedParticipant[] } = {};
    participants.forEach((participant) => {
      if (!groups[participant.teamName]) {
        groups[participant.teamName] = [];
      }
      groups[participant.teamName].push(participant);
    });
    return groups;
  }, [participants]);

  const availableCount = participants.filter(
    (p) => !p.assignedToTeeTimeId
  ).length;

  const handleCheckboxClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 h-full">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Available Participants
        </h3>
        <span className="text-sm text-gray-500">
          ({availableCount} remaining)
        </span>
      </div>

      <div className="space-y-4 max-h-[500px] overflow-y-auto">
        {Object.entries(groupedParticipants).map(
          ([teamName, teamParticipants]) => (
            <div key={teamName}>
              <h4 className="font-medium text-gray-900 mb-2">{teamName}</h4>
              <div className="space-y-2 pl-4">
                {teamParticipants.map((participant) => {
                  const isExisting = participant.id.startsWith("existing-");
                  const isUnassigned = !participant.assignedToTeeTimeId;
                  return (
                    <div
                      key={participant.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border transition-colors relative ${
                        participant.assignedToTeeTimeId
                          ? isExisting
                            ? "bg-purple-50 border-purple-200 text-purple-700 cursor-not-allowed"
                            : "bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed"
                          : "bg-white border-gray-200 hover:border-blue-300 cursor-move"
                      } ${
                        selected.includes(participant.id)
                          ? "ring-2 ring-blue-400"
                          : ""
                      }`}
                    >
                      {/* Checkbox area */}
                      {isUnassigned ? (
                        <button
                          type="button"
                          aria-label={
                            selected.includes(participant.id)
                              ? "Deselect"
                              : "Select"
                          }
                          className={`w-4 h-4 border-2 rounded-sm flex items-center justify-center mr-1 ${
                            selected.includes(participant.id)
                              ? "border-blue-500 bg-blue-500"
                              : "border-gray-300 bg-white"
                          }`}
                          onClick={(e) =>
                            handleCheckboxClick(e, participant.id)
                          }
                          tabIndex={0}
                        >
                          {selected.includes(participant.id) && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </button>
                      ) : participant.assignedToTeeTimeId ? (
                        <Check
                          className={`h-4 w-4 ${
                            isExisting ? "text-purple-500" : "text-green-500"
                          }`}
                        />
                      ) : (
                        <div className="w-4 h-4 border-2 border-gray-300 rounded-sm" />
                      )}
                      <span className="flex-1 text-sm">
                        {participant.participantType}
                        {isExisting && (
                          <span className="ml-2 text-xs text-purple-600 font-medium">
                            (existing)
                          </span>
                        )}
                      </span>
                      {participant.assignedToTeeTime && (
                        <span className="text-xs text-gray-500">
                          assigned to {participant.assignedToTeeTime}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}

        {participants.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4" />
            <p className="font-medium mb-2">No participants generated</p>
            <p className="text-sm">
              Generate participants to start assigning them to tee times.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Tee Times Panel Component
function TeeTimesPanel({
  teeTimes,
  participants,
  onRemoveAssignment,
  onOpenAssignDialog,
}: {
  teeTimes: TeeTime[];
  participants: GeneratedParticipant[];
  onRemoveAssignment: (participantId: string) => void;
  onOpenAssignDialog: (teeTime: TeeTime) => void;
}) {
  const queryClient = useQueryClient();
  const [dragOverTeeTime, setDragOverTeeTime] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedTeeTimeId, setDraggedTeeTimeId] = useState<number | null>(null);
  const [hoveredDropIndex, setHoveredDropIndex] = useState<number | null>(null);
  const [localOrders, setLocalOrders] = useState<{
    [teeTimeId: number]: number[];
  }>({});
  const [isSavingOrder, setIsSavingOrder] = useState<{
    [teeTimeId: number]: boolean;
  }>({});

  // Helper to get the current order for a tee time (by participant id)
  const getOrderedParticipants = (teeTime: TeeTime) => {
    const ids = localOrders[teeTime.id];
    if (!ids) return teeTime.participants;
    // Return participants in the order of ids
    return ids
      .map((id) =>
        teeTime.participants.find((p: TeeTimeParticipant) => p.id === id)
      )
      .filter(Boolean);
  };

  // On mount or teeTimes change, initialize localOrders
  useEffect(() => {
    const newOrders: { [teeTimeId: number]: number[] } = {};
    teeTimes.forEach((teeTime) => {
      newOrders[teeTime.id] = teeTime.participants
        .slice()
        .sort((a, b) => a.tee_order - b.tee_order)
        .map((p: TeeTimeParticipant) => p.id);
    });
    setLocalOrders(newOrders);
  }, [teeTimes]);

  // Drag-and-drop handlers for reordering
  const handleDragStart = (
    e: React.DragEvent,
    teeTimeId: number,
    index: number
  ) => {
    setDraggedIndex(index);
    setDraggedTeeTimeId(teeTimeId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're leaving the container, not just moving between children
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverTeeTime(null);
      setHoveredDropIndex(null);
    }
  };

  const handleDrop = async (
    e: React.DragEvent,
    teeTime: TeeTime,
    dropIndex: number
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (
      draggedIndex === null ||
      draggedIndex === dropIndex ||
      draggedTeeTimeId !== teeTime.id
    ) {
      setDraggedIndex(null);
      setDraggedTeeTimeId(null);
      setDragOverTeeTime(null);
      setHoveredDropIndex(null);
      return;
    }

    const ids = localOrders[teeTime.id].slice();
    const [removed] = ids.splice(draggedIndex, 1);
    ids.splice(dropIndex, 0, removed);

    setLocalOrders((prev) => ({ ...prev, [teeTime.id]: ids }));
    setDraggedIndex(null);
    setDraggedTeeTimeId(null);
    setDragOverTeeTime(null);
    setHoveredDropIndex(null);

    // Prepare order payload
    const orderPayload = ids.map((participantId, i) => ({
      participant_id: participantId,
      tee_order: i + 1,
    }));

    setIsSavingOrder((prev) => ({ ...prev, [teeTime.id]: true }));
    try {
      await updateTeeTimeParticipantOrder(teeTime.id, orderPayload);
      // Invalidate cache to update tee time lists elsewhere
      queryClient.invalidateQueries({ queryKey: ["tee-times"] });
    } catch (error) {
      console.error("Failed to update order:", error);
      alert("Failed to update order");
    } finally {
      setIsSavingOrder((prev) => ({ ...prev, [teeTime.id]: false }));
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDraggedTeeTimeId(null);
    setDragOverTeeTime(null);
    setHoveredDropIndex(null);
  };

  // Scramble handler
  const handleScramble = async (teeTime: TeeTime) => {
    const ids = localOrders[teeTime.id].slice();
    // Fisher-Yates shuffle
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    setLocalOrders((prev) => ({ ...prev, [teeTime.id]: ids }));
    // Prepare order payload
    const orderPayload = ids.map((participantId, i) => ({
      participant_id: participantId,
      tee_order: i + 1,
    }));
    setIsSavingOrder((prev) => ({ ...prev, [teeTime.id]: true }));
    try {
      await updateTeeTimeParticipantOrder(teeTime.id, orderPayload);
      // Invalidate cache to update tee time lists elsewhere
      queryClient.invalidateQueries({ queryKey: ["tee-times"] });
    } catch (error) {
      console.error("Failed to update order:", error);
      alert("Failed to update order");
    } finally {
      setIsSavingOrder((prev) => ({ ...prev, [teeTime.id]: false }));
    }
  };

  const getAssignedParticipants = (teeTimeId: number) => {
    // Get local assigned participants that are NOT already in teeTime.participants
    const localAssigned = participants.filter(
      (p) => p.assignedToTeeTimeId === teeTimeId
    );
    const teeTime = teeTimes.find((t) => t.id === teeTimeId);

    if (!teeTime) return localAssigned;

    // Filter out participants that are already saved to the API (exist in teeTime.participants)
    return localAssigned.filter((localParticipant) => {
      const existsInAPI = teeTime.participants.some(
        (apiParticipant) =>
          localParticipant.teamId === apiParticipant.team_id &&
          localParticipant.participantType === apiParticipant.position_name
      );
      return !existsInAPI;
    });
  };

  const getTeeTimePlayerInfo = (teeTime: TeeTime) => {
    const actualPlayerCount = calculateTotalPlayers(teeTime.participants);
    const isOverLimit = actualPlayerCount > 4;
    const isAtLimit = actualPlayerCount === 4;

    return {
      actualPlayerCount,
      isOverLimit,
      isAtLimit,
      participantCount: teeTime.participants.length,
    };
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 h-full">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5 text-green-600" />
        <h3 className="text-lg font-semibold text-gray-900">Tee Times</h3>
        <span className="text-sm text-gray-500">({teeTimes.length} times)</span>
      </div>

      <div className="space-y-4 max-h-[500px] overflow-y-auto">
        {teeTimes.map((teeTime) => {
          const assignedParticipants = getAssignedParticipants(teeTime.id);
          const playerInfo = getTeeTimePlayerInfo(teeTime);
          const isDragOver = dragOverTeeTime === teeTime.id;
          const orderedParticipants = getOrderedParticipants(teeTime);

          return (
            <div
              key={teeTime.id}
              className={`border rounded-lg p-4 transition-all ${
                isDragOver
                  ? "border-blue-500 bg-blue-50"
                  : playerInfo.isOverLimit
                  ? "border-red-300 bg-red-50"
                  : playerInfo.isAtLimit
                  ? "border-yellow-300 bg-yellow-50"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
              onDragOver={(e) => handleDragOver(e)}
              onDragLeave={handleDragLeave}
              onDragEnter={(e) => {
                e.preventDefault();
                setDragOverTeeTime(teeTime.id);
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">{teeTime.teetime}</span>
                  <div
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      playerInfo.isOverLimit
                        ? "bg-red-100 text-red-800"
                        : playerInfo.isAtLimit
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {playerInfo.actualPlayerCount}/4 players
                  </div>
                  {playerInfo.isOverLimit && (
                    <UserX className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleScramble(teeTime)}
                    className="text-sm px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
                    disabled={isSavingOrder[teeTime.id]}
                  >
                    Scramble
                  </button>
                  {!playerInfo.isAtLimit && (
                    <button
                      onClick={() => onOpenAssignDialog(teeTime)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      + Assign
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2 min-h-[60px]">
                {/* Reorderable participant list */}
                {orderedParticipants.length === 0 &&
                assignedParticipants.length === 0 ? (
                  <div className="text-gray-500 text-sm italic text-center py-4">
                    Drop participants here
                  </div>
                ) : (
                  <>
                    {orderedParticipants.map((participant, idx) => {
                      if (!participant) return null;
                      const isDragging =
                        draggedIndex === idx && draggedTeeTimeId === teeTime.id;
                      return (
                        <div key={`existing-${participant.id}`}>
                          {/* Drop zone indicator above each item */}
                          {draggedTeeTimeId === teeTime.id &&
                            draggedIndex !== null && (
                              <div
                                className={`h-2 transition-all duration-200 ${
                                  hoveredDropIndex === idx
                                    ? "bg-blue-500 rounded-full opacity-100 my-2 shadow-lg"
                                    : "opacity-0 h-0"
                                }`}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setHoveredDropIndex(idx);
                                }}
                                onDragLeave={(e) => {
                                  e.stopPropagation();
                                  setHoveredDropIndex(null);
                                }}
                                onDrop={(e) => handleDrop(e, teeTime, idx)}
                              />
                            )}
                          <div
                            className={`flex items-center justify-between bg-blue-100 rounded-lg p-3 transition-all ${
                              isDragging
                                ? "opacity-50 transform rotate-2 scale-105"
                                : ""
                            }`}
                            draggable
                            onDragStart={(e) =>
                              handleDragStart(e, teeTime.id, idx)
                            }
                            onDragOver={(e) => handleDragOver(e)}
                            onDragEnd={handleDragEnd}
                            style={{ cursor: isDragging ? "grabbing" : "grab" }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400 cursor-grab">
                                ☰
                              </span>
                              <Users className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium">
                                {participant.team_name}
                              </span>
                              <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">
                                {formatParticipantTypeDisplay(
                                  participant.position_name
                                )}
                              </span>
                              {isMultiPlayerFormat(
                                participant.position_name
                              ) && (
                                <span className="text-blue-500 text-xs">
                                  👥
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() =>
                                onRemoveAssignment(`existing-${participant.id}`)
                              }
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {/* Drop zone at the end for adding to bottom */}
                    {draggedTeeTimeId === teeTime.id &&
                      draggedIndex !== null && (
                        <div
                          className={`transition-all duration-200 ${
                            hoveredDropIndex === orderedParticipants.length
                              ? "h-4 bg-blue-500 rounded-full opacity-100 my-2 shadow-lg"
                              : "h-2 opacity-0"
                          }`}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setHoveredDropIndex(orderedParticipants.length);
                          }}
                          onDragLeave={(e) => {
                            e.stopPropagation();
                            setHoveredDropIndex(null);
                          }}
                          onDrop={(e) =>
                            handleDrop(e, teeTime, orderedParticipants.length)
                          }
                        />
                      )}
                    {/* Newly assigned participants (only those not yet saved to API) */}
                    {assignedParticipants.map((participant) => (
                      <div
                        key={participant.id}
                        className="flex items-center justify-between bg-green-100 rounded-lg p-3"
                      >
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium">
                            {participant.teamName}
                          </span>
                          <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">
                            {formatParticipantTypeDisplay(
                              participant.participantType
                            )}
                          </span>
                          {isMultiPlayerFormat(participant.participantType) && (
                            <span className="text-green-500 text-xs">👥</span>
                          )}
                        </div>
                        <button
                          onClick={() => onRemoveAssignment(participant.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {playerInfo.isOverLimit && (
                <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded text-red-800 text-xs">
                  ⚠️ This tee time exceeds the 4-player limit
                </div>
              )}
            </div>
          );
        })}

        {teeTimes.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-4" />
            <p className="font-medium mb-2">No tee times available</p>
            <p className="text-sm">
              Create tee times to start assigning participants.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Main Component
export default function ParticipantAssignment({
  selectedTeams,
  participantTypes,
  teeTimes,
  onAssignmentsChange,
}: Omit<ParticipantAssignmentProps, "competitionId">) {
  const [participants, setParticipants] = useState<GeneratedParticipant[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedTeeTime, setSelectedTeeTime] = useState<TeeTime | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const createParticipantMutation = useCreateParticipant();
  const deleteParticipantMutation = useDeleteParticipant();
  const queryClient = useQueryClient();

  // Analyze existing tee times to extract teams and participant types
  const analyzeExistingTeeTimes = useCallback(() => {
    const existingParticipants: GeneratedParticipant[] = [];
    const foundTeamIds = new Set<number>();
    const foundParticipantTypes = new Set<string>();

    teeTimes.forEach((teeTime) => {
      teeTime.participants.forEach((participant) => {
        foundTeamIds.add(participant.team_id);
        foundParticipantTypes.add(participant.position_name);

        // Create GeneratedParticipant from existing participant
        existingParticipants.push({
          id: `existing-${participant.id}`,
          teamId: participant.team_id,
          teamName: participant.team_name,
          participantType: participant.position_name,
          assignedToTeeTimeId: teeTime.id,
          assignedToTeeTime: teeTime.teetime,
        });
      });
    });

    return {
      existingParticipants,
      foundTeamIds: Array.from(foundTeamIds),
      foundParticipantTypes: Array.from(foundParticipantTypes),
    };
  }, [teeTimes]);

  // Always sync participants with selectedTeams and participantTypes
  useEffect(() => {
    const { existingParticipants } = analyzeExistingTeeTimes();
    // Generate new participants for combinations that don't exist yet
    const newParticipants: GeneratedParticipant[] = [...existingParticipants];
    selectedTeams.forEach((team) => {
      participantTypes.forEach((type) => {
        // Check if this combination already exists
        const exists = existingParticipants.some(
          (p) => p.teamId === team.id && p.participantType === type.name
        );
        if (!exists) {
          newParticipants.push({
            id: crypto.randomUUID(),
            teamId: team.id,
            teamName: team.name,
            participantType: type.name,
          });
        }
      });
    });
    setParticipants(newParticipants);
  }, [selectedTeams, participantTypes, teeTimes, analyzeExistingTeeTimes]);

  // Get analysis of existing data for display
  const existingAnalysis = useMemo(() => {
    if (teeTimes.length === 0) return null;

    const { foundTeamIds, foundParticipantTypes } = analyzeExistingTeeTimes();
    const foundTeams = selectedTeams.filter((team) =>
      foundTeamIds.includes(team.id)
    );
    const missingTeams = selectedTeams.filter(
      (team) => !foundTeamIds.includes(team.id)
    );
    const foundTypes = participantTypes.filter((type) =>
      foundParticipantTypes.includes(type.name)
    );
    const missingTypes = participantTypes.filter(
      (type) => !foundParticipantTypes.includes(type.name)
    );

    return {
      foundTeams,
      missingTeams,
      foundTypes,
      missingTypes,
      foundTeamIds,
      foundParticipantTypes,
    };
  }, [teeTimes, selectedTeams, participantTypes, analyzeExistingTeeTimes]);

  // Handle drop assignment
  const handleDrop = useCallback(
    async (teeTimeId: number, participant: GeneratedParticipant) => {
      if (participant.assignedToTeeTimeId) return;

      const teeTime = teeTimes.find((t) => t.id === teeTimeId);
      if (!teeTime) return;

      // Validate player limit before assignment
      const validation = validatePlayerLimit(
        teeTime.participants,
        participant.participantType
      );

      if (!validation.isValid) {
        alert(validation.message);
        return;
      }

      // Update local state immediately for responsive UI
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === participant.id
            ? {
                ...p,
                assignedToTeeTimeId: teeTimeId,
                assignedToTeeTime: teeTime.teetime,
              }
            : p
        )
      );

      // Calculate tee order (position in tee time)
      const currentAssignments = participants.filter(
        (p) => p.assignedToTeeTimeId === teeTimeId
      );
      const teeOrder = currentAssignments.length + 1;

      // Create the assignment via API
      try {
        await createParticipantMutation.mutateAsync({
          tee_time_id: teeTimeId,
          team_id: participant.teamId,
          position_name: participant.participantType,
          tee_order: teeOrder,
        });

        // Notify parent component
        if (onAssignmentsChange) {
          const newAssignment: Assignment = {
            participantId: participant.id,
            teeTimeId: teeTimeId,
            teeOrder: teeOrder,
          };
          onAssignmentsChange([newAssignment]);
        }

        // Invalidate cache for the affected tee time
        queryClient.invalidateQueries({ queryKey: ["tee-times", teeTimeId] });
      } catch (error) {
        console.error("Failed to create participant assignment:", error);
        // Revert local state on error
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === participant.id
              ? {
                  ...p,
                  assignedToTeeTimeId: undefined,
                  assignedToTeeTime: undefined,
                }
              : p
          )
        );
        alert("Failed to assign participant. Please try again.");
      }
    },
    [
      participants,
      teeTimes,
      createParticipantMutation,
      onAssignmentsChange,
      queryClient,
    ]
  );

  // Handle removing assignment
  const handleRemoveAssignment = useCallback(
    async (participantId: string) => {
      // Check if this is an existing participant (starts with "existing-")
      if (participantId.startsWith("existing-")) {
        const actualParticipantId = parseInt(
          participantId.replace("existing-", "")
        );

        try {
          // Make the API call to delete the participant
          await deleteParticipantMutation.mutateAsync(actualParticipantId);

          // Update local state after successful deletion
          setParticipants((prev) =>
            prev.map((p) =>
              p.id === participantId
                ? {
                    ...p,
                    assignedToTeeTimeId: undefined,
                    assignedToTeeTime: undefined,
                  }
                : p
            )
          );

          // Invalidate cache for the affected tee time
          queryClient.invalidateQueries({
            queryKey: ["tee-times", actualParticipantId],
          });
        } catch (error) {
          console.error("Failed to delete participant:", error);
          alert("Failed to remove participant assignment. Please try again.");
        }
      } else {
        // For newly created participants that haven't been saved yet, just update local state
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === participantId
              ? {
                  ...p,
                  assignedToTeeTimeId: undefined,
                  assignedToTeeTime: undefined,
                }
              : p
          )
        );
      }
    },
    [deleteParticipantMutation, queryClient]
  );

  // Get statistics
  const totalParticipants = participants.length;
  const availableParticipants = participants.filter(
    (p) => !p.assignedToTeeTimeId
  );

  // Batch assign handler (in main component)
  const handleBatchAssign = useCallback(
    async (teeTime: TeeTime, selectedIds: string[]) => {
      let currentPlayers = calculateTotalPlayers(teeTime.participants);
      const toAssign = participants.filter(
        (p) => selectedIds.includes(p.id) && !p.assignedToTeeTimeId
      );
      for (const participant of toAssign) {
        const playerCount = getPlayerCountForParticipantType(
          participant.participantType
        );
        if (currentPlayers + playerCount > 4) {
          alert(
            `Cannot assign ${participant.participantType} (${participant.teamName}) to ${teeTime.teetime}. This would exceed the 4-player limit.`
          );
          break;
        }
        await handleDrop(teeTime.id, participant);
        currentPlayers += playerCount;
      }
      setSelected([]); // clear selection after batch assign
    },
    [participants, setSelected, handleDrop]
  );

  // Dialog assign wrapper
  const handleAssignFromDialog = useCallback(
    (participantId: string, teeTimeId: number) => {
      const participant = participants.find((p) => p.id === participantId);
      if (participant) {
        handleDrop(teeTimeId, participant);
      }
    },
    [participants, handleDrop]
  );

  return (
    <div className="space-y-6">
      {/* Header with Statistics - removed Generate button */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Participant Assignment
            </h3>
            <p className="text-gray-600">
              Assign generated participants to tee times
            </p>
          </div>
        </div>
      </div>

      {/* Two-panel assignment interface */}
      {totalParticipants > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-96">
          {/* Left Panel - Available Participants */}
          <div className="lg:col-span-1">
            <AvailableParticipantsPanel
              participants={participants}
              selected={selected}
              setSelected={setSelected}
            />
          </div>

          {/* Right Panel - Tee Times */}
          <div className="lg:col-span-2">
            <TeeTimesPanel
              teeTimes={teeTimes}
              participants={participants}
              onRemoveAssignment={handleRemoveAssignment}
              onOpenAssignDialog={(teeTime) => {
                if (selected.length > 0) {
                  handleBatchAssign(teeTime, selected);
                } else {
                  setSelectedTeeTime(teeTime);
                  setAssignDialogOpen(true);
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Assignment Dialog */}
      {selectedTeeTime && (
        <AssignmentDialog
          isOpen={assignDialogOpen}
          onClose={() => setAssignDialogOpen(false)}
          teeTime={selectedTeeTime}
          availableParticipants={availableParticipants}
          onAssign={handleAssignFromDialog}
        />
      )}

      {/* Existing Analysis Section */}
      {existingAnalysis && existingAnalysis.foundTeams.length > 0 && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-blue-900">
                Existing Assignments Detected
              </h3>
            </div>
            <button
              onClick={() => setShowAnalysis(!showAnalysis)}
              className="text-blue-600 hover:text-blue-800"
            >
              {showAnalysis ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </button>
          </div>

          {showAnalysis && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-blue-900 mb-2">
                    Teams with Existing Participants (
                    {existingAnalysis.foundTeams.length})
                  </h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    {existingAnalysis.foundTeams.map((team) => (
                      <li key={team.id}>✓ {team.name}</li>
                    ))}
                  </ul>
                  {existingAnalysis.missingTeams.length > 0 && (
                    <>
                      <h5 className="font-medium text-blue-900 mt-3 mb-1">
                        Selected Teams Without Participants (
                        {existingAnalysis.missingTeams.length})
                      </h5>
                      <ul className="text-sm text-blue-600 space-y-1">
                        {existingAnalysis.missingTeams.map((team) => (
                          <li key={team.id}>○ {team.name}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>

                <div>
                  <h4 className="font-medium text-blue-900 mb-2">
                    Participant Types Found (
                    {existingAnalysis.foundTypes.length})
                  </h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    {existingAnalysis.foundTypes.map((type) => (
                      <li key={type.id}>✓ {type.name}</li>
                    ))}
                  </ul>
                  {existingAnalysis.missingTypes.length > 0 && (
                    <>
                      <h5 className="font-medium text-blue-900 mt-3 mb-1">
                        Defined Types Not Used (
                        {existingAnalysis.missingTypes.length})
                      </h5>
                      <ul className="text-sm text-blue-600 space-y-1">
                        {existingAnalysis.missingTypes.map((type) => (
                          <li key={type.id}>○ {type.name}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Existing assignments have been
                  automatically loaded. The available participants list is
                  always in sync with your selected teams and participant types.
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

```

# frontend/src/components/ParticipantAssignmentDemo.tsx

```tsx
import { useState } from "react";
import ParticipantAssignment from "./ParticipantAssignment";
import type { Team } from "../api/teams";
import type { TeeTime } from "../api/tee-times";

// Sample data for demonstration
const sampleTeams: Team[] = [
  { id: 1, name: "Linköping 1", created_at: "", updated_at: "" },
  { id: 2, name: "N&S GK 1", created_at: "", updated_at: "" },
  { id: 3, name: "Kinda GK", created_at: "", updated_at: "" },
  { id: 4, name: "Åtvidaberg GK", created_at: "", updated_at: "" },
];

const sampleParticipantTypes = [
  { id: "1", name: "Singel 1" },
  { id: "2", name: "Singel 2" },
  { id: "3", name: "Bästboll 1" },
];

const sampleTeeTimes: TeeTime[] = [
  {
    id: 1,
    teetime: "13:00",
    competition_id: 1,
    created_at: "",
    updated_at: "",
    course_name: "Sample Course",
    pars: [4, 3, 5, 4, 4, 3, 5, 4, 4],
    participants: [],
  },
  {
    id: 2,
    teetime: "13:10",
    competition_id: 1,
    created_at: "",
    updated_at: "",
    course_name: "Sample Course",
    pars: [4, 3, 5, 4, 4, 3, 5, 4, 4],
    participants: [],
  },
  {
    id: 3,
    teetime: "13:20",
    competition_id: 1,
    created_at: "",
    updated_at: "",
    course_name: "Sample Course",
    pars: [4, 3, 5, 4, 4, 3, 5, 4, 4],
    participants: [],
  },
  {
    id: 4,
    teetime: "13:30",
    competition_id: 1,
    created_at: "",
    updated_at: "",
    course_name: "Sample Course",
    pars: [4, 3, 5, 4, 4, 3, 5, 4, 4],
    participants: [],
  },
];

export default function ParticipantAssignmentDemo() {
  const [selectedTeams] = useState<Team[]>(sampleTeams);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Participant Assignment Demo
        </h1>
        <p className="text-gray-600">
          This demo showcases the participant assignment interface with sample
          data.
        </p>
      </div>

      <div className="space-y-6">
        {/* Sample Data Overview */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Sample Data
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                Teams ({sampleTeams.length})
              </h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {sampleTeams.map((team) => (
                  <li key={team.id}>• {team.name}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                Participant Types ({sampleParticipantTypes.length})
              </h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {sampleParticipantTypes.map((type) => (
                  <li key={type.id}>• {type.name}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                Tee Times ({sampleTeeTimes.length})
              </h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {sampleTeeTimes.map((teeTime) => (
                  <li key={teeTime.id}>• {teeTime.teetime}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                Expected Participants
              </h4>
              <p className="text-sm text-gray-600">
                {sampleTeams.length} teams × {sampleParticipantTypes.length}{" "}
                types = {sampleTeams.length * sampleParticipantTypes.length}{" "}
                participants
              </p>
            </div>
          </div>
        </div>

        {/* Participant Assignment Component */}
        <ParticipantAssignment
          selectedTeams={selectedTeams}
          participantTypes={sampleParticipantTypes}
          teeTimes={sampleTeeTimes}
          onAssignmentsChange={(assignments) => {
            console.log("Demo: Assignments changed:", assignments);
          }}
        />
      </div>
    </div>
  );
}

```

# frontend/src/components/score-entry/CustomKeyboard.tsx

```tsx
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface PlayerScore {
  participantId: string;
  participantName: string;
  participantType?: string;
  isMultiPlayer?: boolean;
  scores: number[];
}

interface TeeTimeGroup {
  id: string;
  players: PlayerScore[];
}

interface Course {
  id: string;
  name: string;
  holes: {
    number: number;
    par: number;
  }[];
}

interface CustomKeyboardProps {
  onNumberPress: (number: number) => void;
  onSpecialPress: (action: "more" | "clear" | "unreported") => void;
  onDismiss?: () => void;
  visible: boolean;
  holePar: number;
  currentHole?: number;
  teeTimeGroup?: TeeTimeGroup;
  course?: Course;
}

export function CustomKeyboard({
  onNumberPress,
  onSpecialPress,
  onDismiss,
  visible,
  holePar,
  currentHole,
}: CustomKeyboardProps) {
  const handleNumberPress = (number: number) => {
    onNumberPress(number);
  };

  const handleSpecialPress = (action: "more" | "clear" | "unreported") => {
    onSpecialPress(action);
  };

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    }
  };

  // Function to get scoring terminology based on score relative to par
  const getScoreLabel = (score: number): string => {
    if (score === 1) return "HIO"; // Hole in one

    const difference = score - holePar;

    if (difference <= -4) return "OTHER"; // Condor (4 under) or better - very rare
    if (difference === -3) return "ALBA"; // Albatross (3 under)
    if (difference === -2) return "EAGLE"; // Eagle (2 under)
    if (difference === -1) return "BIRDIE"; // Birdie (1 under)
    if (difference === 0) return "PAR"; // Par
    if (difference === 1) return "BOGEY"; // Bogey (1 over)
    if (difference === 2) return "DOUBLE"; // Double bogey (2 over)
    if (difference === 3) return "TRIPLE"; // Triple bogey (3 over)
    if (difference === 4) return "QUAD"; // Quadruple bogey (4 over)
    if (difference >= 5) return "OTHER"; // More than quad bogey

    return "";
  };

  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 bg-scorecard border-t border-soft-grey transition-transform duration-300 ease-in-out z-50",
        visible ? "translate-y-0" : "translate-y-full",
        "shadow-lg rounded-t-xl"
      )}
    >
      {/* Current Hole Strip with TapScore Branding */}
      <div className="bg-turf text-scorecard px-4 py-2 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-bold font-display">
            Hole {currentHole} | Par {holePar}
          </div>
        </div>
      </div>

      {/* Header with dismiss button */}
      <div className="flex items-center justify-between p-3 border-b border-soft-grey bg-rough bg-opacity-20">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-fairway font-primary">
            Enter Score
          </span>
        </div>
        {onDismiss && (
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              handleDismiss();
            }}
            className="p-2 rounded-xl bg-rough bg-opacity-30 hover:bg-rough hover:bg-opacity-50 transition-colors touch-manipulation focus:outline-none"
            aria-label="Close keyboard"
          >
            <X className="w-5 h-5 text-fairway" />
          </button>
        )}
      </div>

      {/* Keyboard buttons with TapScore styling */}
      <div className="p-2">
        {/* Row 1: 1, 2, 3 */}
        <div className="grid grid-cols-3 gap-1 mb-1">
          {[1, 2, 3].map((num) => (
            <button
              key={num}
              onMouseDown={(e) => {
                e.preventDefault();
                handleNumberPress(num);
              }}
              className="h-14 bg-turf hover:bg-fairway active:bg-fairway rounded-xl text-xl font-bold text-scorecard transition-colors touch-manipulation flex flex-col items-center justify-center focus:outline-none font-primary"
            >
              <span>{num}</span>
              <span className="text-xs font-semibold uppercase mt-0.5 leading-none opacity-90">
                {getScoreLabel(num)}
              </span>
            </button>
          ))}
        </div>

        {/* Row 2: 4, 5, 6 */}
        <div className="grid grid-cols-3 gap-1 mb-1">
          {[4, 5, 6].map((num) => (
            <button
              key={num}
              onMouseDown={(e) => {
                e.preventDefault();
                handleNumberPress(num);
              }}
              className="h-14 bg-turf hover:bg-fairway active:bg-fairway rounded-xl text-xl font-bold text-scorecard transition-colors touch-manipulation flex flex-col items-center justify-center focus:outline-none font-primary"
            >
              <span>{num}</span>
              <span className="text-xs font-semibold uppercase mt-0.5 leading-none opacity-90">
                {getScoreLabel(num)}
              </span>
            </button>
          ))}
        </div>

        {/* Row 3: 7, 8, 9+ */}
        <div className="grid grid-cols-3 gap-1 mb-1">
          {[7, 8].map((num) => (
            <button
              key={num}
              onMouseDown={(e) => {
                e.preventDefault();
                handleNumberPress(num);
              }}
              className="h-14 bg-rough bg-opacity-40 hover:bg-rough hover:bg-opacity-60 active:bg-rough active:bg-opacity-80 rounded-xl text-xl font-bold text-fairway transition-colors touch-manipulation flex flex-col items-center justify-center focus:outline-none font-primary"
            >
              <span>{num}</span>
              <span className="text-xs font-semibold uppercase mt-0.5 leading-none opacity-90">
                {getScoreLabel(num)}
              </span>
            </button>
          ))}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              handleSpecialPress("more");
            }}
            className="h-14 bg-coral hover:bg-coral hover:opacity-90 active:bg-coral active:opacity-80 rounded-xl text-xl font-bold text-scorecard transition-all touch-manipulation flex flex-col items-center justify-center focus:outline-none font-primary"
          >
            <span>9+</span>
            <span className="text-xs font-semibold uppercase mt-0.5 leading-none opacity-90">
              {getScoreLabel(9)}
            </span>
          </button>
        </div>

        {/* Row 4: -, 0 */}
        <div className="grid grid-cols-2 gap-1">
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              handleSpecialPress("clear");
            }}
            className="h-14 bg-flag hover:bg-flag hover:opacity-90 active:bg-flag active:opacity-80 rounded-xl text-xl font-bold text-scorecard transition-all touch-manipulation flex flex-col items-center justify-center focus:outline-none font-primary"
          >
            <span>−</span>
            <span className="text-xs font-semibold uppercase mt-0.5 leading-none opacity-90">
              GAVE UP
            </span>
          </button>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              handleSpecialPress("unreported");
            }}
            className="h-14 bg-rough bg-opacity-40 hover:bg-rough hover:bg-opacity-60 active:bg-rough active:bg-opacity-80 rounded-xl text-xl font-bold text-fairway transition-colors touch-manipulation flex flex-col items-center justify-center focus:outline-none font-primary"
          >
            <span>0</span>
            <span className="text-xs font-semibold uppercase mt-0.5 leading-none opacity-90">
              UNREPORTED
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

```

# frontend/src/components/score-entry/FullScorecardModal.tsx

```tsx
import { X, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Scorecard } from "@/components/scorecard/Scorecard";

interface PlayerScore {
  participantId: string;
  participantName: string;
  participantType?: string;
  isMultiPlayer?: boolean;
  scores: number[];
}

interface TeeTimeGroup {
  id: string;
  players: PlayerScore[];
}

interface Course {
  id: string;
  name: string;
  holes: {
    number: number;
    par: number;
  }[];
}

interface FullScorecardModalProps {
  visible: boolean;
  teeTimeGroup: TeeTimeGroup;
  course: Course;
  currentHole: number;
  onClose: () => void;
  onContinueEntry: (hole: number) => void;
}

export function FullScorecardModal({
  visible,
  teeTimeGroup,
  course,
  currentHole,
  onClose,
  onContinueEntry,
}: FullScorecardModalProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
      <div
        className={cn(
          "bg-scorecard w-full max-h-[90vh] rounded-t-2xl transition-transform duration-300 ease-in-out border-t border-soft-grey",
          "transform translate-y-0"
        )}
      >
        {/* Header with TapScore Styling */}
        <div className="flex items-center justify-between p-4 border-b border-soft-grey">
          <button
            onClick={onClose}
            className="p-2 hover:bg-rough hover:bg-opacity-30 rounded-xl transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-fairway" />
          </button>
          <h2 className="text-lg font-semibold font-display text-fairway">
            Full Scorecard
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-flag hover:bg-opacity-10 rounded-xl transition-colors"
          >
            <X className="h-5 w-5 text-flag" />
          </button>
        </div>

        {/* Scrollable content area */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="px-2 py-4 space-y-6">
            {teeTimeGroup.players.map((player) => (
              <Scorecard
                key={player.participantId}
                participant={{
                  id: player.participantId,
                  name: player.participantName,
                  type: player.participantType,
                  isMultiPlayer: player.isMultiPlayer,
                  scores: player.scores,
                }}
                course={course}
                currentHole={currentHole}
              />
            ))}
          </div>
        </div>

        {/* Footer with TapScore Button Styling */}
        <div className="p-4 border-t border-soft-grey">
          <button
            onClick={() => onContinueEntry(currentHole)}
            className="w-full bg-turf text-scorecard py-3 px-4 rounded-xl font-medium hover:bg-fairway transition-colors font-primary"
          >
            Continue Entry on Hole {currentHole}
          </button>
        </div>
      </div>
    </div>
  );
}

```

# frontend/src/components/score-entry/index.ts

```ts
export { CustomKeyboard } from "./CustomKeyboard";
export { FullScorecardModal } from "./FullScorecardModal";
export { ScoreEntry } from "./ScoreEntry";
export { ScoreEntryDemo } from "./ScoreEntryDemo";
export { useNativeKeyboard } from "./useNativeKeyboard";

```

# frontend/src/components/score-entry/ScoreEntry.tsx

```tsx
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { CustomKeyboard } from "./CustomKeyboard";
import {
  formatToPar,
  getToParColor,
  formatScoreEntryDisplay,
} from "../../utils/scoreCalculations";
import { FullScorecardModal } from "./FullScorecardModal";
import { BarChart3 } from "lucide-react";
import { useNativeKeyboard } from "./useNativeKeyboard";

interface PlayerScore {
  participantId: string;
  participantName: string;
  participantType?: string;
  isMultiPlayer?: boolean;
  scores: number[];
}

interface TeeTimeGroup {
  id: string;
  players: PlayerScore[];
}

interface Course {
  id: string;
  name: string;
  holes: {
    number: number;
    par: number;
  }[];
}

interface ScoreEntryProps {
  teeTimeGroup: TeeTimeGroup;
  course: Course;
  onScoreUpdate: (participantId: string, hole: number, score: number) => void;
  onComplete: () => void;
  currentHole?: number;
  onHoleChange?: (hole: number) => void;
  syncStatus?: {
    pendingCount: number;
    lastSyncTime: number;
    isOnline: boolean;
    hasConnectivityIssues: boolean;
  };
}

export function ScoreEntry({
  teeTimeGroup,
  course,
  onScoreUpdate,
  onComplete,
  currentHole: externalCurrentHole,
  onHoleChange,
  syncStatus,
}: ScoreEntryProps) {
  // Helper function to find the latest incomplete hole
  const findLatestIncompleteHole = (): number => {
    for (let holeIndex = 17; holeIndex >= 0; holeIndex--) {
      const hasAnyPlayerWithScore = teeTimeGroup.players.some((player) => {
        const score = player.scores[holeIndex];
        return score && score > 0; // Has valid score
      });

      if (hasAnyPlayerWithScore) {
        // Found the latest hole with some scores, check if it's complete
        const allPlayersHaveScores = teeTimeGroup.players.every((player) => {
          const score = player.scores[holeIndex];
          return score && score !== 0; // All players have scores (including -1 for gave up)
        });

        if (!allPlayersHaveScores) {
          return holeIndex + 1; // Return 1-based hole number
        } else if (holeIndex < 17) {
          return holeIndex + 2; // Move to next hole
        }
      }
    }

    return 1; // Default to hole 1 if no scores found
  };

  const [internalCurrentHole, setInternalCurrentHole] = useState(() =>
    findLatestIncompleteHole()
  );

  // Use external hole if provided, otherwise use internal
  const currentHole =
    externalCurrentHole !== undefined
      ? externalCurrentHole
      : internalCurrentHole;

  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [fullScorecardVisible, setFullScorecardVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showingConfirmation, setShowingConfirmation] = useState(false);

  const {
    isVisible: nativeKeyboardVisible,
    inputValue,
    show: showNativeKeyboard,
    hide: hideNativeKeyboard,
    handleSubmit: handleNativeKeyboardSubmit,
    handleInputChange,
  } = useNativeKeyboard({
    onScoreSubmit: (score) => {
      if (currentPlayer) {
        onScoreUpdate(currentPlayer.participantId, currentHole, score);
        moveToNextPlayer();
      }
    },
    onCancel: () => {
      setKeyboardVisible(true);
    },
  });

  const currentPlayer = teeTimeGroup.players[currentPlayerIndex];
  const currentHoleData = course.holes.find((h) => h.number === currentHole);

  // Calculate player's current score relative to par
  const calculatePlayerToPar = (player: PlayerScore): number | null => {
    let totalShots = 0;
    let totalPar = 0;

    for (let i = 0; i < course.holes.length; i++) {
      const score = player.scores[i];

      if (score === -1) {
        // Player gave up on a hole – result is invalid
        return null;
      }

      if (score && score > 0) {
        totalShots += score;
        totalPar += course.holes[i].par;
      }
      // if score is 0 or undefined/null, just skip
    }

    return totalPar === 0 ? null : totalShots - totalPar;
  };

  const moveToNextPlayer = () => {
    if (currentPlayerIndex < teeTimeGroup.players.length - 1) {
      setCurrentPlayerIndex(currentPlayerIndex + 1);
    } else {
      // Last player on this hole - show confirmation briefly
      setShowingConfirmation(true);

      setTimeout(() => {
        setShowingConfirmation(false);

        if (currentHole < 18) {
          const nextHole = currentHole + 1;
          if (onHoleChange) {
            onHoleChange(nextHole);
          } else {
            setInternalCurrentHole(nextHole);
          }
          setCurrentPlayerIndex(0);
        } else {
          onComplete();
        }
      }, 800); // Show confirmation for shorter time
    }
  };

  const handleScoreFieldClick = (playerIndex: number) => {
    setCurrentPlayerIndex(playerIndex);
    setKeyboardVisible(true);
    setIsEditing(true);
  };

  const handleNumberPress = (number: number) => {
    if (!currentPlayer) return;

    onScoreUpdate(currentPlayer.participantId, currentHole, number);
    moveToNextPlayer();
  };

  const handleSpecialPress = (action: "more" | "clear" | "unreported") => {
    if (action === "more") {
      setKeyboardVisible(false);
      showNativeKeyboard();
    } else if (action === "clear") {
      if (!currentPlayer) return;
      // Set score to -1 for "gave up on hole"
      onScoreUpdate(currentPlayer.participantId, currentHole, -1);
      moveToNextPlayer();
    } else if (action === "unreported") {
      if (!currentPlayer) return;
      // Set score to 0 for unreported
      onScoreUpdate(currentPlayer.participantId, currentHole, 0);
      moveToNextPlayer();
    }
  };

  const handleKeyboardDismiss = () => {
    setKeyboardVisible(false);
    setIsEditing(false);
  };

  const abbreviateName = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      // For two-part names, use different strategies based on length
      const firstName = parts[0];
      const lastName = parts[1];

      // If total length is reasonable, keep both
      if (name.length <= 14) {
        return name;
      }

      // If first name is short, use first name + last initial
      if (firstName.length <= 8) {
        return `${firstName} ${lastName.charAt(0)}.`;
      }

      // If first name is long, use first initial + last name
      if (lastName.length <= 8) {
        return `${firstName.charAt(0)}. ${lastName}`;
      }

      // Both names are long, use initials
      return `${firstName.charAt(0)}. ${lastName.charAt(0)}.`;
    }

    // Single name - truncate if too long
    return name.length > 12 ? `${name.substring(0, 11)}...` : name;
  };

  // Close keyboard when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isEditing && !(event.target as HTMLElement).closest(".score-entry")) {
        setKeyboardVisible(false);
        setIsEditing(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEditing]);

  return (
    <div className="score-entry flex flex-col h-screen-mobile bg-scorecard relative">
      {/* Sync Status Indicator */}
      {syncStatus &&
        (syncStatus.pendingCount > 0 || syncStatus.hasConnectivityIssues) && (
          <div
            className={cn(
              "px-3 py-2 text-center text-xs font-medium",
              syncStatus.hasConnectivityIssues
                ? "bg-flag text-scorecard border-b border-flag"
                : "bg-coral text-scorecard border-b border-coral"
            )}
          >
            {syncStatus.hasConnectivityIssues ? (
              <span>
                ⚠️ Connection issues - {syncStatus.pendingCount} score(s)
                pending
              </span>
            ) : (
              <span>📡 Saving {syncStatus.pendingCount} score(s)...</span>
            )}
          </div>
        )}

      {/* Confirmation Message with TapScore Colors */}
      {showingConfirmation && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-turf text-scorecard px-6 py-4 rounded-xl shadow-lg z-30 animate-pulse">
          <div className="text-center">
            <div className="text-lg font-bold font-display">
              ✓ Hole {currentHole} Complete!
            </div>
            <div className="text-sm opacity-90 font-primary">
              Moving to hole {currentHole + 1}...
            </div>
          </div>
        </div>
      )}

      {/* Player Area with Aligned Score Columns */}
      <div className="flex-1 overflow-y-auto" style={{ minHeight: "60%" }}>
        {/* Hole Header - full width bar */}
        <div className="bg-rough bg-opacity-30 px-4 py-2 border-b border-soft-grey">
          <div className="flex items-center justify-between">
            <div className="flex-1">{/* Empty space for alignment */}</div>

            <div className="flex items-center space-x-4 relative left-[50px]">
              {/* Previous hole (only when on hole 2+) */}
              {currentHole > 1 && (
                <div className="text-center w-12">
                  <div className="text-lg font-bold text-fairway font-display">
                    {currentHole - 1}
                  </div>
                  <div className="text-xs text-fairway/70 font-primary">
                    Par{" "}
                    {course.holes.find((h) => h.number === currentHole - 1)
                      ?.par || 4}
                  </div>
                </div>
              )}

              {/* Current hole (always shown, rightmost) */}
              <div className="text-center w-12">
                <div className="text-lg font-bold text-fairway font-display">
                  {currentHole}
                </div>
                <div className="text-xs text-fairway/70 font-primary">
                  Par {currentHoleData?.par || 4}
                </div>
              </div>

              {/* NR button placeholder for alignment */}
              <div className="w-12 h-6 opacity-0">NR</div>
            </div>
          </div>
        </div>

        <div className="p-3 space-y-2">
          {teeTimeGroup.players.map((player, index) => {
            const isCurrentPlayer = index === currentPlayerIndex;
            const currentScore = player.scores[currentHole - 1] ?? 0;
            const previousScore =
              currentHole > 1 ? player.scores[currentHole - 2] ?? 0 : null;
            const toPar = calculatePlayerToPar(player);

            return (
              <div
                key={player.participantId}
                className={cn(
                  "bg-scorecard rounded-lg p-4 shadow-sm border transition-all duration-200",
                  isCurrentPlayer
                    ? "border-coral/20 shadow-md ring-2 ring-coral/10"
                    : "border-soft-grey"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-body-lg font-semibold text-charcoal font-display">
                      {abbreviateName(player.participantName)}
                    </h3>
                    {player.participantType && (
                      <p className="text-label-sm text-turf mb-1 font-primary">
                        {player.participantType}
                      </p>
                    )}
                    <span
                      className={cn(
                        "text-label-sm font-medium font-primary",
                        toPar !== null ? getToParColor(toPar) : "text-soft-grey"
                      )}
                    >
                      {toPar !== null ? formatToPar(toPar) : "E"}
                    </span>
                  </div>

                  <div className="flex items-center space-x-4">
                    {/* Previous hole score (only when on hole 2+) */}
                    {currentHole > 1 && (
                      <div className="text-center w-12">
                        <div className="text-lg font-bold text-fairway font-display">
                          {formatScoreEntryDisplay(previousScore || 0)}
                        </div>
                      </div>
                    )}

                    {/* Current hole score - ALWAYS in a circle */}
                    <button
                      onClick={() => handleScoreFieldClick(index)}
                      className="w-12 h-12 rounded-full border-2 border-soft-grey bg-rough/10 flex items-center justify-center text-label-sm font-medium text-turf hover:bg-rough/20 transition-colors touch-manipulation"
                    >
                      <span className="text-lg font-bold text-fairway font-display">
                        {currentScore > 0 ? currentScore : "NR"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* View Full Scorecard Button */}
          <button
            onClick={() => setFullScorecardVisible(true)}
            className="w-full bg-turf hover:bg-fairway text-scorecard font-semibold py-4 px-6 rounded-lg transition-colors mt-6 flex items-center justify-center space-x-2 font-primary"
          >
            <BarChart3 size={20} />
            <span>View Full Scorecard</span>
          </button>
        </div>
      </div>

      {/* Enhanced Custom Keyboard with Previous Hole Display */}
      <CustomKeyboard
        visible={keyboardVisible}
        onNumberPress={handleNumberPress}
        onSpecialPress={handleSpecialPress}
        holePar={currentHoleData?.par || 4}
        currentHole={currentHole}
        onDismiss={handleKeyboardDismiss}
        teeTimeGroup={teeTimeGroup}
        course={course}
      />

      {/* Full Scorecard Modal */}
      <FullScorecardModal
        visible={fullScorecardVisible}
        teeTimeGroup={teeTimeGroup}
        course={course}
        currentHole={currentHole}
        onClose={() => setFullScorecardVisible(false)}
        onContinueEntry={(hole) => {
          setInternalCurrentHole(hole);
          setCurrentPlayerIndex(0);
          setFullScorecardVisible(false);
        }}
      />

      {/* Native Keyboard Modal with TapScore Styling */}
      {nativeKeyboardVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-scorecard rounded-xl p-6 w-full max-w-sm border border-soft-grey">
            <h3 className="text-lg font-bold mb-4 font-display text-fairway">
              Enter Score (9 or higher)
            </h3>
            <input
              type="number"
              value={inputValue}
              onChange={handleInputChange}
              className="w-full p-3 border-2 border-soft-grey rounded-xl mb-4 text-2xl text-center font-display text-charcoal focus:border-turf focus:bg-rough focus:bg-opacity-20 transition-colors"
              placeholder="Enter score"
              autoFocus
            />
            <div className="flex space-x-2">
              <button
                onClick={hideNativeKeyboard}
                className="flex-1 p-3 bg-rough bg-opacity-30 rounded-xl hover:bg-rough hover:bg-opacity-50 font-medium font-primary text-fairway transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleNativeKeyboardSubmit}
                className="flex-1 p-3 bg-turf text-scorecard rounded-xl hover:bg-fairway font-medium font-primary transition-colors"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

```

# frontend/src/components/score-entry/ScoreEntryDemo.tsx

```tsx
import { useState } from "react";
import { ScoreEntry } from "./ScoreEntry";

const demoCourse = {
  id: "1",
  name: "Demo Golf Course",
  holes: Array.from({ length: 18 }, (_, i) => ({
    number: i + 1,
    par: Math.floor(Math.random() * 2) + 3, // Random par 3-4
  })),
};

const demoPlayers = [
  {
    participantId: "1",
    participantName: "John Smith",
    scores: Array(18).fill(null),
  },
  {
    participantId: "2",
    participantName: "Jane Doe",
    scores: Array(18).fill(null),
  },
  {
    participantId: "3",
    participantName: "Bob Johnson",
    scores: Array(18).fill(null),
  },
  {
    participantId: "4",
    participantName: "Alice Brown",
    scores: Array(18).fill(null),
  },
];

export function ScoreEntryDemo() {
  const [teeTimeGroup, setTeeTimeGroup] = useState({
    id: "1",
    players: demoPlayers,
  });

  const handleScoreUpdate = (
    participantId: string,
    hole: number,
    score: number
  ) => {
    setTeeTimeGroup((prev) => ({
      ...prev,
      players: prev.players.map((player) =>
        player.participantId === participantId
          ? {
              ...player,
              scores: player.scores.map((s, i) => (i === hole - 1 ? score : s)),
            }
          : player
      ),
    }));
  };

  const handleComplete = () => {
    console.log("Score entry completed!", teeTimeGroup);
    // Here you would typically save the scores to your backend
  };

  return (
    <div className="max-w-md mx-auto">
      <ScoreEntry
        teeTimeGroup={teeTimeGroup}
        course={demoCourse}
        onScoreUpdate={handleScoreUpdate}
        onComplete={handleComplete}
      />
    </div>
  );
}

```

# frontend/src/components/score-entry/useNativeKeyboard.ts

```ts
import { useCallback, useState } from "react";

interface UseNativeKeyboardProps {
  onScoreSubmit: (score: number) => void;
  onCancel: () => void;
}

export function useNativeKeyboard({
  onScoreSubmit,
  onCancel,
}: UseNativeKeyboardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const show = useCallback(() => {
    setIsVisible(true);
    setInputValue("");
  }, []);

  const hide = useCallback(() => {
    setIsVisible(false);
    setInputValue("");
    onCancel();
  }, [onCancel]);

  const handleSubmit = useCallback(() => {
    const score = parseInt(inputValue, 10);
    if (!isNaN(score) && score >= 9) {
      onScoreSubmit(score);
      hide();
    }
  }, [inputValue, onScoreSubmit, hide]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      // Only allow numbers
      if (/^\d*$/.test(value)) {
        setInputValue(value);
      }
    },
    []
  );

  return {
    isVisible,
    inputValue,
    show,
    hide,
    handleSubmit,
    handleInputChange,
  };
}

```

# frontend/src/components/scorecard/index.ts

```ts
export { ParticipantScorecard } from "./ParticipantScorecard";
export type { CourseData, ParticipantData } from "./ParticipantScorecard";

```

# frontend/src/components/scorecard/ParticipantScorecard.tsx

```tsx
import { X } from "lucide-react";
import { Scorecard } from "./Scorecard";

export interface ParticipantData {
  id: number;
  team_name: string;
  position_name: string;
  player_names: string | null;
  score: number[];
  tee_time_id: number;
}

export interface CourseData {
  id: string;
  name: string;
  holes: {
    number: number;
    par: number;
  }[];
}

interface ParticipantScorecardProps {
  visible: boolean;
  participant: ParticipantData | null;
  course: CourseData | null;
  onClose: () => void;
}

export function ParticipantScorecard({
  visible,
  participant,
  course,
  onClose,
}: ParticipantScorecardProps) {
  if (!visible || !participant || !course) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 truncate">
              Team: {participant.team_name}
            </h2>
            <p className="text-sm text-blue-600 mt-1">
              {participant.position_name}
            </p>
            {participant.player_names && (
              <p className="text-sm text-gray-600 mt-1 truncate">
                Players: {participant.player_names}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 ml-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scorecard */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="p-2">
            <Scorecard
              participant={{
                id: participant.id.toString(),
                name: participant.team_name,
                type: participant.position_name,
                scores: participant.score,
              }}
              course={course}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-700 transition-colors"
          >
            Close Scorecard
          </button>
        </div>
      </div>
    </div>
  );
}

```

# frontend/src/components/scorecard/Scorecard.tsx

```tsx
import { cn } from "@/lib/utils";
import {
  formatToPar,
  formatScoreDisplay,
  isValidScore,
  calculateHoleTotal,
  calculatePlayedPar,
} from "../../utils/scoreCalculations";

interface ScorecardParticipant {
  id: string;
  name: string;
  type?: string;
  isMultiPlayer?: boolean;
  scores: number[];
}

interface ScorecardCourse {
  holes: {
    number: number;
    par: number;
  }[];
}

interface ScorecardProps {
  participant: ScorecardParticipant;
  course: ScorecardCourse;
  currentHole?: number;
}

export function Scorecard({
  participant,
  course,
  currentHole,
}: ScorecardProps) {
  const frontNine = course.holes.slice(0, 9);
  const backNine = course.holes.slice(9, 18);

  const getPlayerTotals = () => {
    // Check if player gave up on any hole - if so, invalidate entire round
    const hasGaveUp = participant.scores.some((score) => score === -1);

    if (hasGaveUp) {
      return {
        frontTotal: null,
        backTotal: null,
        totalScore: null,
        toPar: null,
        frontToPar: null,
        backToPar: null,
      };
    }

    const frontTotal = calculateHoleTotal(participant.scores, frontNine);
    const backTotal = calculateHoleTotal(participant.scores, backNine);
    const totalScore = frontTotal + backTotal;

    // Calculate par only for played holes
    const frontPlayedPar = calculatePlayedPar(participant.scores, frontNine);
    const backPlayedPar = calculatePlayedPar(participant.scores, backNine);
    const totalPlayedPar = frontPlayedPar + backPlayedPar;

    return {
      frontTotal,
      backTotal,
      totalScore,
      toPar: totalScore > 0 ? totalScore - totalPlayedPar : 0,
      frontToPar: frontTotal > 0 ? frontTotal - frontPlayedPar : 0,
      backToPar: backTotal > 0 ? backTotal - backPlayedPar : 0,
    };
  };

  const renderScoreDecoration = (score: number, par: number) => {
    if (!isValidScore(score)) {
      if (score === -1) return { color: "text-flag", decoration: "" }; // Gave up
      if (score === 0) return { color: "text-soft-grey", decoration: "" }; // Not reported
      return { color: "text-charcoal", decoration: "" };
    }

    if (score === 1) {
      // Hole in one - special case (purple circle)
      return {
        color: "text-scorecard font-bold",
        decoration: "bg-coral rounded-full border-2 border-coral",
      };
    } else if (score < par - 1) {
      // Eagle or better - turf double circle
      return {
        color: "text-turf font-bold",
        decoration:
          "border-2 border-turf rounded-full shadow-[0_0_0_2px_white,0_0_0_4px_#2d6a4f]",
      };
    } else if (score === par - 1) {
      // Birdie - turf circle
      return {
        color: "text-turf font-bold",
        decoration: "border-2 border-turf rounded-full",
      };
    } else if (score === par) {
      // Par - no decoration
      return { color: "text-charcoal", decoration: "" };
    } else if (score === par + 1) {
      // Bogey - flag square
      return {
        color: "text-flag font-bold",
        decoration: "border-2 border-flag",
      };
    } else if (score >= par + 2) {
      // Double bogey or worse - double flag square
      return {
        color: "text-flag font-bold",
        decoration:
          "border-2 border-flag shadow-[0_0_0_2px_white,0_0_0_4px_#ef476f]",
      };
    }

    return { color: "text-charcoal", decoration: "" };
  };

  const totals = getPlayerTotals();

  return (
    <div className="bg-scorecard overflow-hidden">
      {/* Player Name Header */}
      <div className="bg-turf text-scorecard px-2 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-base font-display">
              {participant.name}
            </span>
            {participant.isMultiPlayer && (
              <span className="text-rough text-sm">👥</span>
            )}
          </div>
          {participant.type && (
            <span className="text-rough text-sm font-primary">
              {participant.type}
            </span>
          )}
        </div>
      </div>

      {/* Front Nine Section */}
      <div className="border-b border-soft-grey">
        {/* Front Nine Section Header */}
        <div className="bg-turf text-scorecard px-2 py-1">
          <span className="text-sm font-medium font-primary">FRONT NINE</span>
        </div>
        {/* Front Nine Header */}
        <div className="bg-rough bg-opacity-30">
          <div className="flex">
            <div className="w-10 min-w-10 px-0.5 py-1 text-xs font-medium text-fairway border-r border-soft-grey font-primary">
              Hole
            </div>
            {frontNine.map((hole) => (
              <div
                key={hole.number}
                className={cn(
                  "min-w-6 px-0.5 py-1 text-center text-xs font-medium text-fairway border-r border-soft-grey flex-1 font-primary",
                  hole.number === currentHole && "bg-coral"
                )}
              >
                {hole.number}
              </div>
            ))}
            <div className="min-w-10 px-0.5 py-1 text-center text-xs font-medium text-fairway bg-rough bg-opacity-50 font-primary">
              OUT
            </div>
          </div>
        </div>

        {/* Front Nine Par */}
        <div className="bg-rough bg-opacity-20">
          <div className="flex">
            <div className="w-10 min-w-10 px-0.5 py-1 text-xs font-medium text-fairway border-r border-soft-grey font-primary">
              Par
            </div>
            {frontNine.map((hole) => (
              <div
                key={hole.number}
                className="min-w-6 px-0.5 py-1 text-center text-xs font-medium text-fairway border-r border-soft-grey flex-1 font-primary"
              >
                {hole.par}
              </div>
            ))}
            <div className="min-w-10 px-0.5 py-1 text-center text-xs font-bold text-fairway bg-rough bg-opacity-40 font-display">
              {frontNine.reduce((sum, hole) => sum + hole.par, 0)}
            </div>
          </div>
        </div>

        {/* Front Nine Results */}
        <div className="bg-scorecard border-b border-soft-grey">
          <div className="flex">
            <div className="w-10 min-w-10 px-0.5 py-1 text-xs font-medium text-fairway border-r border-soft-grey font-primary">
              Score
            </div>
            {frontNine.map((hole) => {
              const score = participant.scores[hole.number - 1] ?? 0;
              const scoreStyle = renderScoreDecoration(score, hole.par);

              return (
                <div
                  key={hole.number}
                  className={cn(
                    "min-w-6 px-0.5 py-1 text-center text-xs font-medium flex items-center justify-center border-r border-soft-grey flex-1",
                    hole.number === currentHole && "bg-coral bg-opacity-20"
                  )}
                >
                  <div
                    className={cn(
                      "w-5 h-5 flex items-center justify-center text-xs font-display",
                      scoreStyle.color,
                      scoreStyle.decoration
                    )}
                  >
                    {formatScoreDisplay(score)}
                  </div>
                </div>
              );
            })}
            <div className="min-w-10 px-0.5 py-1 text-center text-xs font-bold text-charcoal bg-rough bg-opacity-40 font-display">
              {totals.frontTotal ?? "-"}
            </div>
          </div>
        </div>
      </div>

      {/* Back Nine Section */}
      <div className="border-b border-soft-grey">
        {/* Back Nine Section Header */}
        <div className="bg-turf text-scorecard px-2 py-1">
          <span className="text-sm font-medium font-primary">BACK NINE</span>
        </div>
        {/* Back Nine Header */}
        <div className="bg-rough bg-opacity-30">
          <div className="flex">
            <div className="w-10 min-w-10 px-0.5 py-1 text-xs font-medium text-fairway border-r border-soft-grey font-primary">
              Hole
            </div>
            {backNine.map((hole) => (
              <div
                key={hole.number}
                className={cn(
                  "min-w-6 px-0.5 py-1 text-center text-xs font-medium text-fairway border-r border-soft-grey flex-1 font-primary",
                  hole.number === currentHole && "bg-coral"
                )}
              >
                {hole.number}
              </div>
            ))}
            <div className="min-w-10 px-0.5 py-1 text-center text-xs font-medium text-fairway bg-rough bg-opacity-50 font-primary">
              IN
            </div>
          </div>
        </div>

        {/* Back Nine Par */}
        <div className="bg-rough bg-opacity-20">
          <div className="flex">
            <div className="w-10 min-w-10 px-0.5 py-1 text-xs font-medium text-fairway border-r border-soft-grey font-primary">
              Par
            </div>
            {backNine.map((hole) => (
              <div
                key={hole.number}
                className="min-w-6 px-0.5 py-1 text-center text-xs font-medium text-fairway border-r border-soft-grey flex-1 font-primary"
              >
                {hole.par}
              </div>
            ))}
            <div className="min-w-10 px-0.5 py-1 text-center text-xs font-bold text-fairway bg-rough bg-opacity-40 font-display">
              {backNine.reduce((sum, hole) => sum + hole.par, 0)}
            </div>
          </div>
        </div>

        {/* Back Nine Results */}
        <div className="bg-scorecard">
          <div className="flex">
            <div className="w-10 min-w-10 px-0.5 py-1 text-xs font-medium text-fairway border-r border-soft-grey font-primary">
              Score
            </div>
            {backNine.map((hole) => {
              const score = participant.scores[hole.number - 1] ?? 0;
              const scoreStyle = renderScoreDecoration(score, hole.par);

              return (
                <div
                  key={hole.number}
                  className={cn(
                    "min-w-6 px-0.5 py-1 text-center text-xs font-medium flex items-center justify-center border-r border-soft-grey flex-1",
                    hole.number === currentHole && "bg-coral bg-opacity-20"
                  )}
                >
                  <div
                    className={cn(
                      "w-5 h-5 flex items-center justify-center text-xs font-display",
                      scoreStyle.color,
                      scoreStyle.decoration
                    )}
                  >
                    {formatScoreDisplay(score)}
                  </div>
                </div>
              );
            })}
            <div className="min-w-10 px-0.5 py-1 text-center text-xs font-bold text-charcoal bg-rough bg-opacity-40 font-display">
              {totals.backTotal ?? "-"}
            </div>
          </div>
        </div>
      </div>

      {/* Totals Section */}
      <div className="bg-rough bg-opacity-20 px-2 py-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-fairway font-primary">
            Total Score
          </span>
          <div className="flex items-center gap-3">
            <span className="text-turf text-sm font-primary">
              Total: {totals.totalScore ?? "-"}
            </span>
            <span className="text-base font-bold text-charcoal font-display">
              To par:{" "}
              {totals.totalScore && totals.toPar !== null
                ? formatToPar(totals.toPar)
                : "-"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

```

# frontend/src/components/series/recent-activity.tsx

```tsx
import { Link } from "@tanstack/react-router";
import {
  Calendar,
  Users,
  ChevronRight,
  Trophy,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Competition {
  id: number;
  name: string;
  date: string;
  participant_count: number;
}

interface RecentActivityProps {
  competitions?: Competition[];
  className?: string;
  maxItems?: number;
}

export function RecentActivity({
  competitions = [],
  className,
  maxItems = 5,
}: RecentActivityProps) {
  const recentCompetitions = competitions.slice(0, maxItems);

  if (!recentCompetitions.length) {
    return (
      <section className={cn("space-y-6", className)}>
        <h3 className="text-display-sm font-display font-semibold text-charcoal">
          Recent Activity
        </h3>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-rough/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="h-8 w-8 text-turf" />
          </div>
          <h4 className="text-label-lg font-semibold text-charcoal mb-2">
            No recent activity
          </h4>
          <p className="text-body-sm text-charcoal/70">
            Competition results will appear here as they become available.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-display-sm font-display font-semibold text-charcoal">
          Recent Activity
        </h3>
        {competitions.length > maxItems && (
          <button className="text-label-md font-medium text-turf hover:text-fairway transition-colors">
            View all
          </button>
        )}
      </div>

      <div className="space-y-4">
        {recentCompetitions.map((competition, index) => {
          const competitionDate = new Date(competition.date);
          const isPast = competitionDate < new Date();
          const isFirst = index === 0;

          return (
            <div key={competition.id} className="relative">
              {/* Timeline line */}
              {index !== recentCompetitions.length - 1 && (
                <div className="absolute left-6 top-12 w-0.5 h-12 bg-turf/20" />
              )}

              {/* Activity item */}
              <Link
                to={`/player/competitions/${competition.id}`}
                className="group block"
              >
                <div className="flex items-start gap-4 p-4 rounded-xl bg-scorecard border border-soft-grey hover:border-turf hover:shadow-md transition-all duration-200">
                  {/* Timeline dot */}
                  <div
                    className={cn(
                      "flex-shrink-0 w-3 h-3 rounded-full mt-3",
                      isFirst
                        ? "bg-turf shadow-lg shadow-turf/30"
                        : isPast
                        ? "bg-charcoal/30"
                        : "bg-coral"
                    )}
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-label-lg font-semibold text-charcoal truncate">
                            {competition.name}
                          </h4>
                          <span
                            className={cn(
                              "px-2 py-1 rounded-full text-label-sm font-medium whitespace-nowrap",
                              isPast
                                ? "text-charcoal bg-charcoal/10"
                                : isFirst
                                ? "text-turf bg-turf/10"
                                : "text-coral bg-coral/10"
                            )}
                          >
                            {isPast
                              ? "Completed"
                              : isFirst
                              ? "Latest"
                              : "Upcoming"}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-body-sm text-charcoal/70">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">
                              {competitionDate.toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 flex-shrink-0" />
                            <span>{competition.participant_count}</span>
                          </div>
                        </div>

                        {/* Additional context for latest/completed */}
                        {isFirst && isPast && (
                          <div className="mt-3 pt-3 border-t border-soft-grey">
                            <div className="flex items-center gap-2 text-body-sm text-turf">
                              <Trophy className="h-4 w-4" />
                              <span className="font-medium">
                                Results available - View standings
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      <ChevronRight className="h-5 w-5 text-charcoal/30 group-hover:text-turf transition-colors flex-shrink-0 mt-1" />
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>

      {/* Show more link for mobile */}
      {competitions.length > maxItems && (
        <div className="pt-4 border-t border-soft-grey">
          <button className="w-full py-3 text-label-md font-medium text-turf hover:text-fairway transition-colors text-center">
            View all {competitions.length} competitions
          </button>
        </div>
      )}
    </section>
  );
}

export default RecentActivity;

```

# frontend/src/components/ui/avatar.tsx

```tsx
import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full", className)}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted flex size-full items-center justify-center rounded-full",
        className
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }

```

# frontend/src/components/ui/badge.tsx

```tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }

```

# frontend/src/components/ui/bottom-sheet.tsx

```tsx
import * as React from "react";
import { useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  showHandle?: boolean;
  maxHeight?: string;
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  className,
  showHandle = true,
  maxHeight = "70vh",
}: BottomSheetProps) {
  const sheetRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  // Handle escape key press
  const handleEscapeKey = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    },
    [isOpen, onClose]
  );

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (event: React.MouseEvent) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // Focus management
  useEffect(() => {
    if (isOpen && sheetRef.current) {
      const focusableElements = sheetRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;

      if (firstElement) {
        // Small delay to ensure the animation has started
        setTimeout(() => {
          firstElement.focus();
        }, 100);
      }
    }
  }, [isOpen]);

  // Keyboard event listener
  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleEscapeKey);
      // Prevent body scroll when bottom sheet is open
      document.body.style.overflow = "hidden";
    } else {
      document.removeEventListener("keydown", handleEscapeKey);
      document.body.style.overflow = "unset";
    }

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, handleEscapeKey]);

  // Basic swipe down gesture handling
  const [startY, setStartY] = React.useState<number | null>(null);
  const [currentY, setCurrentY] = React.useState<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (startY !== null) {
        setCurrentY(e.touches[0].clientY);
      }
    },
    [startY]
  );

  const handleTouchEnd = useCallback(() => {
    if (startY !== null && currentY !== null) {
      const deltaY = currentY - startY;
      // If swipe down more than 100px, close the sheet
      if (deltaY > 100) {
        onClose();
      }
    }
    setStartY(null);
    setCurrentY(null);
  }, [startY, currentY, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 bg-scorecard border-t border-soft-grey rounded-t-xl shadow-2xl",
          "transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-y-0" : "translate-y-full",
          className
        )}
        style={{ maxHeight }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "bottom-sheet-title" : undefined}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle */}
        {showHandle && (
          <div className="flex justify-center pt-4 pb-2">
            <div className="w-12 h-1 bg-soft-grey rounded-full" />
          </div>
        )}

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-soft-grey">
            <h2
              id="bottom-sheet-title"
              className="text-display-sm font-display font-semibold text-charcoal"
            >
              {title}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 text-charcoal hover:bg-soft-grey/20"
              aria-label="Close bottom sheet"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Content */}
        <div
          ref={contentRef}
          className="overflow-y-auto overscroll-contain"
          style={{
            maxHeight: title ? "calc(70vh - 120px)" : "calc(70vh - 60px)",
          }}
        >
          <div className="p-6">{children}</div>
        </div>
      </div>
    </>
  );
}

// Hook for managing bottom sheet state
export function useBottomSheet() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [content, setContent] = React.useState<React.ReactNode | string | null>(
    null
  );
  const [title, setTitle] = React.useState<string | undefined>();

  const openSheet = useCallback(
    (sheetContent: React.ReactNode | string, sheetTitle?: string) => {
      setContent(sheetContent);
      setTitle(sheetTitle);
      setIsOpen(true);
    },
    []
  );

  const closeSheet = useCallback(() => {
    setIsOpen(false);
    // Clear content after animation completes
    setTimeout(() => {
      setContent(null);
      setTitle(undefined);
    }, 300);
  }, []);

  return {
    isOpen,
    content,
    title,
    openSheet,
    closeSheet,
  };
}

export default BottomSheet;

```

# frontend/src/components/ui/button.tsx

```tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold font-['Inter'] transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turf",
  {
    variants: {
      variant: {
        default:
          "bg-coral text-scorecard border-2 border-coral shadow-sm hover:bg-[#E8890A] hover:border-[#E8890A] hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 focus-visible:outline-turf",
        destructive:
          "bg-flag text-scorecard border-2 border-flag shadow-sm hover:bg-[#DC2449] hover:border-[#DC2449] hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-flag",
        outline:
          "border-2 border-soft-grey bg-scorecard text-charcoal shadow-sm hover:bg-rough hover:border-rough hover:text-fairway hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-turf",
        secondary:
          "bg-transparent text-turf border-2 border-turf shadow-sm hover:bg-rough hover:text-fairway hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-turf",
        ghost:
          "text-charcoal hover:bg-rough hover:text-fairway focus-visible:outline-turf",
        link: "text-turf underline-offset-4 hover:underline hover:text-fairway focus-visible:outline-turf",
      },
      size: {
        default: "h-10 px-6 py-2.5 has-[>svg]:px-4",
        sm: "h-8 rounded-lg gap-1.5 px-4 has-[>svg]:px-3 text-sm",
        lg: "h-12 rounded-xl px-8 has-[>svg]:px-6 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };

```

# frontend/src/components/ui/card.tsx

```tsx
import * as React from "react";

import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-scorecard text-charcoal flex flex-col gap-6 rounded-xl border-2 border-soft-grey py-6 shadow-[0_2px_8px_rgba(27,67,50,0.08)] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(27,67,50,0.12)] hover:-translate-y-0.5",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [&.border-b]:border-b-2 [&.border-b]:border-soft-grey [&.border-b]:pb-6",
        className
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "leading-tight font-semibold font-['DM_Sans'] text-charcoal text-lg",
        className
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn(
        "text-soft-grey text-sm font-['Inter'] leading-relaxed",
        className
      )}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6 font-['Inter']", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center px-6 font-['Inter'] [&.border-t]:border-t-2 [&.border-t]:border-soft-grey [&.border-t]:pt-6",
        className
      )}
      {...props}
    />
  );
}

// Golf-specific card variants
function ScoreCard({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="score-card"
      className={cn(
        "bg-gradient-to-br from-scorecard to-rough text-charcoal flex flex-col gap-4 rounded-xl border-2 border-turf p-4 shadow-[0_2px_8px_rgba(27,67,50,0.08)] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(27,67,50,0.12)] hover:-translate-y-0.5",
        className
      )}
      {...props}
    />
  );
}

function LeaderboardCard({
  className,
  position = 0,
  ...props
}: React.ComponentProps<"div"> & { position?: number }) {
  const getBorderColor = (pos: number) => {
    if (pos === 1) return "border-l-[#FFD700]"; // Gold
    if (pos === 2) return "border-l-[#C0C0C0]"; // Silver
    if (pos === 3) return "border-l-[#CD7F32]"; // Bronze
    return "border-l-rough";
  };

  return (
    <div
      data-slot="leaderboard-card"
      className={cn(
        "bg-scorecard text-charcoal flex flex-col gap-3 rounded-xl border-2 border-soft-grey border-l-4 p-4 shadow-[0_2px_8px_rgba(27,67,50,0.08)] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(27,67,50,0.12)] hover:translate-x-1 hover:bg-rough mb-2",
        getBorderColor(position),
        className
      )}
      {...props}
    />
  );
}

function CompetitionCard({
  className,
  status,
  ...props
}: React.ComponentProps<"div"> & {
  status?: "active" | "completed" | "pending" | "error";
}) {
  const getStatusStyles = (status?: string) => {
    switch (status) {
      case "active":
        return "border-coral shadow-[0_2px_8px_rgba(255,159,28,0.15)]";
      case "completed":
        return "border-turf shadow-[0_2px_8px_rgba(45,106,79,0.15)]";
      case "pending":
        return "border-sky shadow-[0_2px_8px_rgba(17,138,178,0.15)]";
      case "error":
        return "border-flag shadow-[0_2px_8px_rgba(239,71,111,0.15)]";
      default:
        return "border-soft-grey shadow-[0_2px_8px_rgba(27,67,50,0.08)]";
    }
  };

  return (
    <div
      data-slot="competition-card"
      className={cn(
        "bg-scorecard text-charcoal flex flex-col gap-4 rounded-xl border-2 p-6 transition-all duration-200 hover:shadow-[0_4px_16px_rgba(27,67,50,0.12)] hover:-translate-y-0.5",
        getStatusStyles(status),
        className
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  ScoreCard,
  LeaderboardCard,
  CompetitionCard,
};

```

# frontend/src/components/ui/dialog.tsx

```tsx
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-gray-200 bg-white p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-gray-100 data-[state=open]:text-gray-500">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-gray-500", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};

```

# frontend/src/components/ui/input.tsx

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };

```

# frontend/src/components/ui/select.tsx

```tsx
import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Select({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />
}

function SelectGroup({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "default"
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="size-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border shadow-md",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className
        )}
        position={position}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            "p-1",
            position === "popper" &&
              "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1"
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn("text-muted-foreground px-2 py-1.5 text-xs", className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className
      )}
      {...props}
    >
      <span className="absolute right-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("bg-border pointer-events-none -mx-1 my-1 h-px", className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className
      )}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className
      )}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}

```

# frontend/src/components/ui/skeleton.tsx

```tsx
import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-accent animate-pulse rounded-md", className)}
      {...props}
    />
  )
}

export { Skeleton }

```

# frontend/src/components/ui/switch.tsx

```tsx
import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }

```

# frontend/src/components/ui/tabs.tsx

```tsx
import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }

```

# frontend/src/components/ui/TapScoreLogo.tsx

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";
import tapscoreHorizontalUrl from "/tapscore_horizontal.png?url";
import tapscoreLogoUrl from "/tapscore_logo.png?url";

interface TapScoreLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "light" | "dark" | "color";
  layout?: "horizontal" | "vertical";
  className?: string;
}

const TapScoreLogo: React.FC<TapScoreLogoProps> = ({
  size = "md",
  variant = "color",
  layout = "horizontal",
  className,
}) => {
  const sizeClasses = {
    sm: layout === "horizontal" ? "h-6" : "h-8 w-8",
    md: layout === "horizontal" ? "h-8" : "h-10 w-10",
    lg: layout === "horizontal" ? "h-10" : "h-12 w-12",
    xl: layout === "horizontal" ? "h-12" : "h-16 w-16",
  };

  // Choose the appropriate logo file based on layout
  const logoSrc =
    layout === "horizontal" ? tapscoreHorizontalUrl : tapscoreLogoUrl;

  // Apply filter effects based on variant for dark/light themes
  const getImageStyle = () => {
    switch (variant) {
      case "light":
        // Invert colors for dark backgrounds and make it white
        return {
          filter: "brightness(0) invert(1)",
        };
      case "dark":
        // Keep original colors but ensure it's dark
        return {
          filter: "brightness(0.8)",
        };
      case "color":
      default:
        // Use original colors
        return {};
    }
  };

  return (
    <div className={cn("flex items-center", className)}>
      <img
        src={logoSrc}
        alt="TapScore Logo"
        className={cn(
          "object-contain transition-all duration-200",
          sizeClasses[size]
        )}
        style={getImageStyle()}
        onError={(e) => {
          console.error("Failed to load TapScore logo:", logoSrc);
          // Fallback to public URL if import fails
          if (layout === "horizontal") {
            e.currentTarget.src = "/tapscore_horizontal.png";
          } else {
            e.currentTarget.src = "/tapscore_logo.png";
          }
        }}
      />
    </div>
  );
};

export default TapScoreLogo;

```

# frontend/src/components/ui/textarea.tsx

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }

```

# frontend/src/hooks/useCompetitionData.ts

```ts
import { useCompetition, useCompetitionLeaderboard } from "../api/competitions";
import { useCourse } from "../api/courses";
import {
  useParticipant,
  useTeeTime,
  useTeeTimesForCompetition,
  useUpdateScore,
} from "../api/tee-times";

interface UseCompetitionDataProps {
  competitionId?: string;
  teeTimeId?: string;
  selectedParticipantId?: number | null;
}

export function useCompetitionData({
  competitionId,
  teeTimeId,
  selectedParticipantId,
}: UseCompetitionDataProps) {
  // Main competition data
  const { data: competition, isLoading: competitionLoading } = useCompetition(
    competitionId ? parseInt(competitionId) : 0
  );

  // Course data
  const { data: course } = useCourse(competition?.course_id || 0);

  // Tee times and leaderboard data
  const { data: teeTimes, refetch: refetchTeeTimes } =
    useTeeTimesForCompetition(competitionId ? parseInt(competitionId) : 0);

  const {
    data: leaderboard,
    isLoading: leaderboardLoading,
    refetch: refetchLeaderboard,
  } = useCompetitionLeaderboard(competitionId ? parseInt(competitionId) : 0);

  // Tee time data for score entry
  const { data: teeTime, refetch: refetchTeeTime } = useTeeTime(
    teeTimeId ? parseInt(teeTimeId) : 0
  );

  // Selected participant data for scorecard
  const { data: selectedParticipant } = useParticipant(
    selectedParticipantId || 0
  );

  // Update score mutation
  const updateScoreMutation = useUpdateScore();

  return {
    competition,
    course,
    teeTimes,
    leaderboard,
    teeTime,
    selectedParticipant,
    isLoading: competitionLoading,
    leaderboardLoading,
    refetchTeeTime,
    refetchLeaderboard,
    refetchTeeTimes,
    updateScoreMutation,
  };
}

```

# frontend/src/hooks/useCompetitionSync.ts

```ts
import { useCallback, useEffect, useState } from "react";
import { ScoreStorageManager } from "../utils/scoreStorage";
import { SYNC_INTERVALS, SyncManager } from "../utils/syncManager";

interface UseCompetitionSyncProps {
  competitionId?: string;
  teeTimeId?: string;
  activeTab: string;
  refetchTeeTime: () => Promise<unknown>;
  refetchLeaderboard: () => Promise<unknown>;
  refetchTeeTimes: () => Promise<unknown>;
  updateScoreMutation: {
    mutate: (
      params: { participantId: number; hole: number; shots: number },
      options?: {
        onSuccess?: () => void;
        onError?: (error: unknown) => void;
      }
    ) => void;
    mutateAsync: (params: {
      participantId: number;
      hole: number;
      shots: number;
    }) => Promise<unknown>;
  };
  teeTime?: unknown;
}

export function useCompetitionSync({
  competitionId,
  teeTimeId,
  activeTab,
  refetchTeeTime,
  refetchLeaderboard,
  refetchTeeTimes,
  updateScoreMutation,
  teeTime,
}: UseCompetitionSyncProps) {
  const scoreManager = ScoreStorageManager.getInstance();
  const [lastSyncTime, setLastSyncTime] = useState(Date.now());

  // Initial sync when entering score entry view
  useEffect(() => {
    if (activeTab === "score" && teeTimeId && teeTime) {
      SyncManager.handleInitialSync({
        teeTimeId,
        competitionId: competitionId || "",
        activeTab,
        lastSyncTime,
        hasData: !!teeTime,
        onSync: async () => {
          await refetchTeeTime();
          setLastSyncTime(Date.now());
        },
      });
    }
  }, [
    activeTab,
    teeTimeId,
    teeTime,
    refetchTeeTime,
    competitionId,
    lastSyncTime,
  ]);

  // Sync when returning to the browser tab (after being away)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      const synced = await SyncManager.handleVisibilityChangeSync({
        teeTimeId,
        competitionId: competitionId || "",
        activeTab,
        lastSyncTime,
        isScoreEntry: activeTab === "score",
        onSync: async () => {
          await refetchTeeTime();
          setLastSyncTime(Date.now());
        },
      });

      if (synced) {
        setLastSyncTime(Date.now());
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [activeTab, teeTimeId, lastSyncTime, refetchTeeTime, competitionId]);

  // Periodic sync validation and retry logic for score entry
  useEffect(() => {
    if (!teeTimeId) return;

    const syncInterval = setInterval(async () => {
      try {
        let shouldRefetch = false;

        // Try to retry any pending scores
        const retryableScores = scoreManager.getRetryableScores();

        if (retryableScores.length > 0) {
          console.log(`Retrying ${retryableScores.length} pending scores...`);
          shouldRefetch = true;

          for (const score of retryableScores) {
            try {
              await updateScoreMutation.mutateAsync({
                participantId: score.participantId,
                hole: score.hole,
                shots: score.shots,
              });

              // Success - remove from pending
              scoreManager.removePendingScore(score.participantId, score.hole);
            } catch (error) {
              // Mark as attempted
              scoreManager.markAttempted(score.participantId, score.hole);
              console.error(
                `Retry failed for score ${score.participantId}-${score.hole}:`,
                error
              );
            }
          }
        }

        // Check if we should sync using SyncManager logic
        if (
          SyncManager.shouldRetryPendingScores(retryableScores, lastSyncTime)
        ) {
          if (
            shouldRefetch ||
            SyncManager.shouldSync(lastSyncTime, SYNC_INTERVALS.PERIODIC)
          ) {
            console.log("Syncing with server for latest scores...");
            await refetchTeeTime();
            setLastSyncTime(Date.now());
          }
        }
      } catch (error) {
        console.error("Sync validation failed:", error);
      }
    }, SYNC_INTERVALS.PERIODIC);

    return () => clearInterval(syncInterval);
  }, [
    teeTimeId,
    updateScoreMutation,
    refetchTeeTime,
    scoreManager,
    lastSyncTime,
  ]);

  // Periodic sync for leaderboard and teams data
  useEffect(() => {
    if (!competitionId || !SyncManager.shouldRunPeriodicSync(activeTab)) return;

    const syncInterval = setInterval(async () => {
      await SyncManager.handlePeriodicViewSync(
        activeTab,
        async () => {
          await refetchLeaderboard();
        },
        async () => {
          await refetchTeeTimes();
        }
      );
      setLastSyncTime(Date.now());
    }, SYNC_INTERVALS.PERIODIC);

    return () => clearInterval(syncInterval);
  }, [activeTab, competitionId, refetchLeaderboard, refetchTeeTimes]);

  // Fetch fresh data when first entering leaderboard or teams views
  useEffect(() => {
    if (
      (activeTab === "leaderboard" || activeTab === "teams") &&
      competitionId
    ) {
      SyncManager.handleInitialViewFetch(
        activeTab as "leaderboard" | "teams",
        competitionId,
        async () => {
          await refetchLeaderboard();
        },
        async () => {
          await refetchTeeTimes();
        }
      );
    }
  }, [activeTab, competitionId, refetchLeaderboard, refetchTeeTimes]);

  const syncStatus = SyncManager.createSyncStatus(scoreManager, lastSyncTime);

  const handleScoreUpdate = useCallback(
    (participantId: string, hole: number, score: number) => {
      const participantIdNum = parseInt(participantId);

      // Add to local storage immediately
      scoreManager.addPendingScore(participantIdNum, hole, score);

      updateScoreMutation.mutate(
        {
          participantId: participantIdNum,
          hole,
          shots: score,
        },
        {
          onSuccess: () => {
            // Remove from pending scores on success
            scoreManager.removePendingScore(participantIdNum, hole);
            setLastSyncTime(Date.now());

            console.log(
              "Score update successful, cache invalidated automatically"
            );
          },
          onError: (error) => {
            console.error("Score update failed:", error);
            // Score is already in pending storage, will be retried
          },
        }
      );
    },
    [updateScoreMutation, scoreManager]
  );

  // Handle tab changes with sync
  const handleTabChangeSync = useCallback(
    async (newTab: string) => {
      await SyncManager.handleTabChangeSync({
        newTab,
        teeTimeId,
        competitionId: competitionId || "",
        activeTab: newTab,
        lastSyncTime,
        onSync: async () => {
          await refetchTeeTime();
          setLastSyncTime(Date.now());
        },
        onLeaderboardSync: async () => {
          await refetchLeaderboard();
          setLastSyncTime(Date.now());
        },
        onTeamsSync: async () => {
          await refetchTeeTimes();
        },
      });
    },
    [
      teeTimeId,
      competitionId,
      lastSyncTime,
      refetchTeeTime,
      refetchLeaderboard,
      refetchTeeTimes,
    ]
  );

  // Handle hole navigation with occasional sync
  const handleHoleNavigationSync = useCallback(
    async (newHole: number) => {
      const synced = await SyncManager.handleHoleNavigationSync({
        currentHole: newHole,
        teeTimeId,
        competitionId: competitionId || "",
        activeTab,
        lastSyncTime,
        onSync: async () => {
          await refetchTeeTime();
          setLastSyncTime(Date.now());
        },
      });

      if (synced) {
        setLastSyncTime(Date.now());
      }
    },
    [lastSyncTime, refetchTeeTime, teeTimeId, competitionId, activeTab]
  );

  return {
    syncStatus,
    handleScoreUpdate,
    handleTabChangeSync,
    handleHoleNavigationSync,
    lastSyncTime,
  };
}

```

# frontend/src/index.css

```css
/* Import Google Fonts for TapScore typography system */
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=DM+Sans:wght@400;500;700&display=swap");
@import "tailwindcss";

@layer base {
  :root {
    /* TapScore Brand Colors */
    --fairway-green: #1b4332; /* Deep forest green - headers, navigation */
    --turf-green: #2d6a4f; /* Medium green - buttons, highlights */
    --light-rough: #95d5b2; /* Light sage - fills, hover states */
    --sunset-coral: #ff9f1c; /* Orange - primary CTAs, active states */
    --flag-red: #ef476f; /* Red - warnings, delete actions */
    --sky-blue: #118ab2; /* Blue - notifications, info states */
    --scorecard-white: #f8f9fa; /* Off-white - backgrounds, cards */
    --charcoal-text: #1c1c1e; /* Dark gray - primary text */
    --soft-grey: #ced4da; /* Light gray - borders, inactive */

    /* Map TapScore colors to theme variables */
    --background: var(--scorecard-white);
    --foreground: var(--charcoal-text);
    --card: var(--scorecard-white);
    --card-foreground: var(--charcoal-text);
    --popover: var(--scorecard-white);
    --popover-foreground: var(--charcoal-text);
    --primary: var(--turf-green);
    --primary-foreground: var(--scorecard-white);
    --secondary: var(--light-rough);
    --secondary-foreground: var(--fairway-green);
    --muted: var(--soft-grey);
    --muted-foreground: #64748b;
    --accent: var(--sunset-coral);
    --accent-foreground: var(--scorecard-white);
    --destructive: var(--flag-red);
    --destructive-foreground: var(--scorecard-white);
    --border: var(--soft-grey);
    --input: var(--soft-grey);
    --ring: var(--turf-green);
    --radius: 0.75rem;

    /* Typography Variables */
    --font-primary: "Inter", system-ui, -apple-system, BlinkMacSystemFont,
      sans-serif;
    --font-display: "DM Sans", system-ui, -apple-system, BlinkMacSystemFont,
      sans-serif;

    /* Spacing Scale */
    --space-xs: 0.25rem;
    --space-sm: 0.5rem;
    --space-md: 1rem;
    --space-lg: 1.5rem;
    --space-xl: 2rem;
    --space-2xl: 3rem;

    /* Border Radius Scale */
    --radius-sm: 0.5rem;
    --radius-md: 0.75rem;
    --radius-lg: 1rem;
    --radius-xl: 1.5rem;
  }

  .dark {
    --background: var(--fairway-green);
    --foreground: var(--scorecard-white);
    --card: var(--fairway-green);
    --card-foreground: var(--scorecard-white);
    --popover: var(--fairway-green);
    --popover-foreground: var(--scorecard-white);
    --primary: var(--scorecard-white);
    --primary-foreground: var(--fairway-green);
    --secondary: var(--turf-green);
    --secondary-foreground: var(--scorecard-white);
    --muted: var(--turf-green);
    --muted-foreground: var(--light-rough);
    --accent: var(--sunset-coral);
    --accent-foreground: var(--scorecard-white);
    --destructive: var(--flag-red);
    --destructive-foreground: var(--scorecard-white);
    --border: var(--turf-green);
    --input: var(--turf-green);
    --ring: var(--light-rough);
  }

  * {
    border-color: var(--border);
  }

  body {
    background-color: var(--background);
    color: var(--foreground);
    font-family: var(--font-primary);
    line-height: 1.5;
    font-weight: 400;
    font-synthesis: none;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    margin: 0;
    min-width: 320px;
    min-height: 100vh;
  }
}

@layer utilities {
  /* TapScore Brand Color Utilities */
  .bg-fairway {
    background-color: var(--fairway-green);
  }
  .bg-turf {
    background-color: var(--turf-green);
  }
  .bg-rough {
    background-color: var(--light-rough);
  }
  .bg-coral {
    background-color: var(--sunset-coral);
  }
  .bg-flag {
    background-color: var(--flag-red);
  }
  .bg-sky {
    background-color: var(--sky-blue);
  }
  .bg-scorecard {
    background-color: var(--scorecard-white);
  }
  .bg-charcoal {
    background-color: var(--charcoal-text);
  }
  .bg-soft-grey {
    background-color: var(--soft-grey);
  }

  .text-fairway {
    color: var(--fairway-green);
  }
  .text-turf {
    color: var(--turf-green);
  }
  .text-rough {
    color: var(--light-rough);
  }
  .text-coral {
    color: var(--sunset-coral);
  }
  .text-flag {
    color: var(--flag-red);
  }
  .text-sky {
    color: var(--sky-blue);
  }
  .text-scorecard {
    color: var(--scorecard-white);
  }
  .text-charcoal {
    color: var(--charcoal-text);
  }
  .text-soft-grey {
    color: var(--soft-grey);
  }

  .border-fairway {
    border-color: var(--fairway-green);
  }
  .border-turf {
    border-color: var(--turf-green);
  }
  .border-rough {
    border-color: var(--light-rough);
  }
  .border-coral {
    border-color: var(--sunset-coral);
  }
  .border-flag {
    border-color: var(--flag-red);
  }
  .border-sky {
    border-color: var(--sky-blue);
  }
  .border-scorecard {
    border-color: var(--scorecard-white);
  }
  .border-charcoal {
    border-color: var(--charcoal-text);
  }
  .border-soft-grey {
    border-color: var(--soft-grey);
  }

  /* Typography System - Display Headings (DM Sans) */
  .text-display-xl {
    font-family: var(--font-display);
    font-size: 3.5rem;
    line-height: 1.1;
    font-weight: 700;
    letter-spacing: -0.025em;
  }
  .text-display-lg {
    font-family: var(--font-display);
    font-size: 2.5rem;
    line-height: 1.2;
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  .text-display-md {
    font-family: var(--font-display);
    font-size: 2rem;
    line-height: 1.3;
    font-weight: 600;
    letter-spacing: -0.015em;
  }
  .text-display-sm {
    font-family: var(--font-display);
    font-size: 1.5rem;
    line-height: 1.4;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  /* Body Text (Inter) */
  .text-body-xl {
    font-family: var(--font-primary);
    font-size: 1.25rem;
    line-height: 1.6;
    font-weight: 400;
  }
  .text-body-lg {
    font-family: var(--font-primary);
    font-size: 1.125rem;
    line-height: 1.6;
    font-weight: 400;
  }
  .text-body-md {
    font-family: var(--font-primary);
    font-size: 1rem;
    line-height: 1.5;
    font-weight: 400;
  }
  .text-body-sm {
    font-family: var(--font-primary);
    font-size: 0.875rem;
    line-height: 1.5;
    font-weight: 400;
  }
  .text-body-xs {
    font-family: var(--font-primary);
    font-size: 0.75rem;
    line-height: 1.4;
    font-weight: 400;
  }

  /* UI Labels (Inter) */
  .text-label-lg {
    font-family: var(--font-primary);
    font-size: 1rem;
    line-height: 1.4;
    font-weight: 500;
  }
  .text-label-md {
    font-family: var(--font-primary);
    font-size: 0.875rem;
    line-height: 1.4;
    font-weight: 500;
  }
  .text-label-sm {
    font-family: var(--font-primary);
    font-size: 0.75rem;
    line-height: 1.4;
    font-weight: 500;
  }

  /* TapScore Semantic Status Colors */
  .status-completed {
    color: var(--turf-green);
  }
  .status-active {
    color: var(--sunset-coral);
  }
  .status-pending {
    color: var(--sky-blue);
  }
  .status-error {
    color: var(--flag-red);
  }
  .status-warning {
    color: var(--sunset-coral);
  }
  .status-success {
    color: var(--turf-green);
  }
  .status-info {
    color: var(--sky-blue);
  }

  /* Golf-specific component styles */
  .score-card {
    background: linear-gradient(
      135deg,
      var(--scorecard-white),
      var(--light-rough)
    );
    border: 2px solid var(--turf-green);
    border-radius: var(--radius-lg);
    padding: var(--space-md);
    transition: all 0.2s ease;
  }

  .score-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(27, 67, 50, 0.12);
  }

  .score-number {
    font-family: var(--font-display);
    font-size: 2rem;
    font-weight: 700;
    color: var(--fairway-green);
  }

  .leaderboard-item {
    border-left: 4px solid var(--light-rough);
    transition: all 0.2s ease;
    padding: var(--space-md);
    background: var(--scorecard-white);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-sm);
  }

  .leaderboard-item:nth-child(1) {
    border-left-color: #ffd700;
  } /* Gold */
  .leaderboard-item:nth-child(2) {
    border-left-color: #c0c0c0;
  } /* Silver */
  .leaderboard-item:nth-child(3) {
    border-left-color: #cd7f32;
  } /* Bronze */

  .leaderboard-item:hover {
    background: var(--light-rough);
    transform: translateX(4px);
  }

  /* TapScore Button Styles */
  .btn-primary {
    background: var(--sunset-coral);
    color: var(--scorecard-white);
    border: 2px solid var(--sunset-coral);
    border-radius: var(--radius-md);
    padding: 0.75rem 1.5rem;
    font-family: var(--font-primary);
    font-weight: 600;
    transition: all 0.2s ease;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
  }

  .btn-primary:hover {
    background: #e8890a;
    border-color: #e8890a;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(255, 159, 28, 0.3);
  }

  .btn-secondary {
    background: transparent;
    color: var(--turf-green);
    border: 2px solid var(--turf-green);
    border-radius: var(--radius-md);
    padding: 0.75rem 1.5rem;
    font-family: var(--font-primary);
    font-weight: 600;
    transition: all 0.2s ease;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
  }

  .btn-secondary:hover {
    background: var(--light-rough);
    color: var(--fairway-green);
    transform: translateY(-1px);
  }

  .btn-danger {
    background: var(--flag-red);
    color: var(--scorecard-white);
    border: 2px solid var(--flag-red);
    border-radius: var(--radius-md);
    padding: 0.75rem 1.5rem;
    font-family: var(--font-primary);
    font-weight: 600;
    transition: all 0.2s ease;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
  }

  .btn-danger:hover {
    background: #dc2449;
    border-color: #dc2449;
    transform: translateY(-1px);
  }

  /* TapScore Card Styles */
  .card {
    background: var(--scorecard-white);
    border: 1px solid var(--soft-grey);
    border-radius: var(--radius-lg);
    box-shadow: 0 2px 8px rgba(27, 67, 50, 0.08);
    padding: var(--space-lg);
    transition: all 0.2s ease;
  }

  .card:hover {
    box-shadow: 0 4px 16px rgba(27, 67, 50, 0.12);
    transform: translateY(-2px);
  }

  .card-header {
    border-bottom: 1px solid var(--soft-grey);
    padding-bottom: var(--space-md);
    margin-bottom: var(--space-lg);
  }

  /* Navigation Styles */
  .nav-primary {
    background: var(--fairway-green);
    color: var(--scorecard-white);
    padding: var(--space-md) 0;
    border-bottom: 2px solid var(--turf-green);
  }

  .nav-link {
    color: var(--scorecard-white);
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-sm);
    font-weight: 500;
    transition: all 0.2s ease;
    text-decoration: none;
    display: inline-block;
  }

  .nav-link:hover,
  .nav-link.active {
    background: var(--turf-green);
    color: var(--scorecard-white);
  }

  /* Form Elements */
  .input {
    border: 2px solid var(--soft-grey);
    border-radius: var(--radius-md);
    padding: 0.75rem 1rem;
    font-family: var(--font-primary);
    background: var(--scorecard-white);
    transition: border-color 0.2s ease;
    width: 100%;
    font-size: 1rem;
  }

  .input:focus {
    border-color: var(--turf-green);
    outline: none;
    box-shadow: 0 0 0 3px rgba(45, 106, 79, 0.1);
  }

  .label {
    font-family: var(--font-primary);
    font-weight: 500;
    color: var(--charcoal-text);
    margin-bottom: var(--space-sm);
    display: block;
  }

  /* Legacy color utilities for compatibility */
  .bg-background {
    background-color: var(--background);
  }
  .text-foreground {
    color: var(--foreground);
  }
  .bg-card {
    background-color: var(--card);
  }
  .text-card-foreground {
    color: var(--card-foreground);
  }
  .bg-primary {
    background-color: var(--primary);
  }
  .text-primary-foreground {
    color: var(--primary-foreground);
  }
  .bg-secondary {
    background-color: var(--secondary);
  }
  .text-secondary-foreground {
    color: var(--secondary-foreground);
  }
  .bg-muted {
    background-color: var(--muted);
  }
  .text-muted-foreground {
    color: var(--muted-foreground);
  }
  .bg-accent {
    background-color: var(--accent);
  }
  .text-accent-foreground {
    color: var(--accent-foreground);
  }
  .bg-destructive {
    background-color: var(--destructive);
  }
  .text-destructive-foreground {
    color: var(--destructive-foreground);
  }
  .bg-input {
    background-color: var(--input);
  }
  .border-border {
    border-color: var(--border);
  }
  .ring-ring {
    --tw-ring-color: var(--ring);
  }

  /* Prevent zoom on input focus for iOS Safari */
  input[type="number"] {
    font-size: 16px !important;
  }

  /* Improve touch targets and responsiveness */
  .touch-manipulation {
    touch-action: manipulation;
  }

  /* Smooth animations for modal transitions */
  .modal-slide-up {
    transform: translateY(100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .modal-slide-up.active {
    transform: translateY(0);
  }

  /* Optimize scroll behavior on mobile */
  .score-entry {
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
  }

  /* Fix 100vh issues on mobile browsers */
  .h-screen-mobile {
    height: 100vh;
    height: 100dvh; /* Dynamic viewport height */
  }

  /* Prevent text selection on buttons */
  button {
    -webkit-user-select: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  /* Optimize keyboard show/hide transitions */
  .keyboard-transition {
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Hole transition animations */
  .hole-transition {
    transition: all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }

  .hole-slide-left {
    transform: translateX(-100%);
    opacity: 0;
  }

  .hole-slide-right {
    transform: translateX(100%);
    opacity: 0;
  }

  .hole-fade-in {
    animation: holeSlideIn 0.5s ease-out forwards;
  }

  .hole-bounce {
    animation: holeBounce 0.6s ease-in-out;
  }

  /* Score confirmation animations */
  .score-confirmation {
    animation: scoreConfirmation 1s ease-in-out;
  }

  @keyframes holeSlideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes holeBounce {
    0%,
    20%,
    53%,
    80%,
    100% {
      transform: scale(1);
    }
    40%,
    43% {
      transform: scale(1.1);
    }
    70% {
      transform: scale(1.05);
    }
  }

  @keyframes scoreConfirmation {
    0% {
      opacity: 0;
      transform: scale(0.8) translateY(20px);
    }
    20% {
      opacity: 1;
      transform: scale(1.1) translateY(0);
    }
    100% {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  /* Transparency Utility Classes - Using real RGBA for better compatibility */

  /* 
   * These classes replace Tailwind's bg-opacity- utilities which may not work 
   * properly in all browsers. Use these instead:
   * 
   * bg-black bg-opacity-40 → bg-overlay-light
   * bg-charcoal bg-opacity-20 → bg-charcoal-transparent
   * bg-rough bg-opacity-30 → bg-rough-transparent
   * bg-scorecard bg-opacity-90 → bg-scorecard-transparent
   * bg-soft-grey bg-opacity-30 → bg-soft-grey-transparent
   */

  .bg-overlay-light {
    background-color: rgba(0, 0, 0, 0.4);
  }

  .bg-overlay-dark {
    background-color: rgba(28, 28, 30, 0.4);
  }

  .bg-rough-transparent {
    background-color: rgba(149, 213, 178, 0.3);
  }

  .bg-scorecard-transparent {
    background-color: rgba(248, 249, 250, 0.9);
  }

  .bg-soft-grey-transparent {
    background-color: rgba(206, 212, 218, 0.3);
  }

  .bg-charcoal-transparent {
    background-color: rgba(28, 28, 30, 0.2);
  }
}

/* Custom prose styles for better markdown formatting */
@layer components {
  .prose {
    color: var(--foreground);
    max-width: none;
    line-height: 1.7;
    font-size: 1rem;
  }

  .prose h1 {
    color: var(--foreground);
    font-weight: 800;
    font-size: 2.5rem;
    margin-top: 0;
    margin-bottom: 1.2em;
    line-height: 1.1;
    letter-spacing: -0.025em;
    background: linear-gradient(135deg, var(--primary), #22c55e);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    position: relative;
  }

  .prose h1::after {
    content: "";
    position: absolute;
    bottom: -0.5rem;
    left: 0;
    width: 4rem;
    height: 0.25rem;
    background: linear-gradient(135deg, var(--primary), #22c55e);
    border-radius: 0.125rem;
  }

  .prose h2 {
    color: #1f2937;
    font-weight: 700;
    font-size: 2rem;
    margin-top: 1.75em;
    margin-bottom: 1em;
    line-height: 1.2;
    letter-spacing: -0.015em;
    border-bottom: 2px solid #e5e7eb;
    padding-bottom: 0.5rem;
    position: relative;
  }

  .prose h2::before {
    content: "";
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 3rem;
    height: 2px;
    background: var(--primary);
    border-radius: 1px;
  }

  .prose h3 {
    color: #374151;
    font-weight: 650;
    font-size: 1.5rem;
    margin-top: 2em;
    margin-bottom: 0.75em;
    line-height: 1.4;
    letter-spacing: -0.01em;
    position: relative;
    padding-left: 1rem;
  }

  .prose h3::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0.5rem;
    width: 0.25rem;
    height: 1.5rem;
    background: linear-gradient(to bottom, var(--primary), #22c55e);
    border-radius: 0.125rem;
  }

  .prose h4 {
    color: #4b5563;
    font-weight: 600;
    font-size: 1.25rem;
    margin-top: 1.8em;
    margin-bottom: 0.6em;
    line-height: 1.5;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-size: 0.95rem;
  }

  .prose p {
    margin-top: 1.5em;
    margin-bottom: 1.5em;
    text-align: justify;
    text-justify: inter-word;
  }

  .prose p:first-of-type {
    font-size: 1.125rem;
    font-weight: 450;
    color: #374151;
    margin-bottom: 2em;
    line-height: 1.6;
  }

  .prose strong {
    color: var(--foreground);
    font-weight: 650;
    background: linear-gradient(
      135deg,
      rgba(34, 197, 94, 0.1),
      rgba(34, 197, 94, 0.05)
    );
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
  }

  .prose em {
    font-style: italic;
    color: #6b7280;
    font-weight: 500;
  }

  .prose a {
    color: var(--primary);
    text-decoration: none;
    font-weight: 500;
    border-bottom: 1px solid transparent;
    transition: all 0.2s ease;
    padding-bottom: 0.05rem;
  }

  .prose a:hover {
    color: #22c55e;
    border-bottom-color: #22c55e;
    background: rgba(34, 197, 94, 0.05);
    padding: 0.125rem 0.25rem;
    margin: -0.125rem -0.25rem;
    border-radius: 0.25rem;
  }

  .prose ul {
    margin-top: 1.5em;
    margin-bottom: 1.5em;
    padding-left: 0;
    list-style: none;
  }

  .prose ul li {
    margin-top: 0.75em;
    margin-bottom: 0.75em;
    position: relative;
    padding-left: 2rem;
    line-height: 1.6;
  }

  .prose ul li::before {
    content: "";
    position: absolute;
    left: 0.5rem;
    top: 0.75rem;
    width: 0.5rem;
    height: 0.5rem;
    background: linear-gradient(135deg, var(--primary), #22c55e);
    border-radius: 50%;
    transform: translateY(-50%);
  }

  .prose ol {
    margin-top: 1.5em;
    margin-bottom: 1.5em;
    padding-left: 0;
    counter-reset: item;
  }

  .prose ol li {
    margin-top: 0.75em;
    margin-bottom: 0.75em;
    position: relative;
    padding-left: 2.5rem;
    line-height: 1.6;
    counter-increment: item;
  }

  .prose ol li::before {
    content: counter(item);
    position: absolute;
    left: 0;
    top: 0;
    background: linear-gradient(135deg, var(--primary), #22c55e);
    color: white;
    font-weight: 600;
    font-size: 0.875rem;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .prose blockquote {
    font-weight: 500;
    font-style: italic;
    color: #6b7280;
    border-left: 0;
    quotes: "\201C""\201D""\2018""\2019";
    margin-top: 2em;
    margin-bottom: 2em;
    padding: 1.5rem 2rem;
    background: linear-gradient(
      135deg,
      rgba(34, 197, 94, 0.03),
      rgba(34, 197, 94, 0.01)
    );
    border-radius: 0.75rem;
    border-left: 4px solid var(--primary);
    position: relative;
    font-size: 1.125rem;
    line-height: 1.7;
  }

  .prose blockquote::before {
    content: '"';
    position: absolute;
    top: -0.5rem;
    left: 1rem;
    font-size: 4rem;
    color: var(--primary);
    opacity: 0.3;
    font-family: Georgia, serif;
    line-height: 1;
  }

  .prose code:not(pre code) {
    color: #be185d;
    font-weight: 600;
    font-size: 0.875em;
    background: linear-gradient(
      135deg,
      rgba(236, 72, 153, 0.1),
      rgba(236, 72, 153, 0.05)
    );
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    font-family: "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace;
    border: 1px solid rgba(236, 72, 153, 0.2);
  }

  .prose pre {
    color: #e5e7eb;
    background: linear-gradient(135deg, #1f2937, #111827);
    overflow-x: auto;
    font-weight: 400;
    font-size: 0.875em;
    line-height: 1.7;
    margin-top: 2em;
    margin-bottom: 2em;
    border-radius: 0.75rem;
    padding: 1.5rem;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1),
      0 10px 10px -5px rgba(0, 0, 0, 0.04);
    border: 1px solid #374151;
    position: relative;
  }

  .prose pre::before {
    content: "";
    position: absolute;
    top: 1rem;
    left: 1rem;
    width: 0.75rem;
    height: 0.75rem;
    background: #ef4444;
    border-radius: 50%;
    box-shadow: 1.25rem 0 0 #f59e0b, 2.5rem 0 0 #22c55e;
  }

  .prose pre code {
    background: transparent;
    border: none;
    padding: 0;
    font-weight: inherit;
    color: inherit;
    font-size: inherit;
    font-family: inherit;
    line-height: inherit;
  }

  .prose hr {
    border: none;
    height: 1px;
    background: linear-gradient(
      to right,
      transparent,
      var(--primary),
      transparent
    );
    margin: 3rem 0;
    position: relative;
  }

  .prose hr::after {
    content: "❋";
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--background);
    color: var(--primary);
    padding: 0 1rem;
    font-size: 1.25rem;
  }

  .prose table {
    width: 100%;
    table-layout: auto;
    text-align: left;
    margin-top: 2em;
    margin-bottom: 2em;
    font-size: 0.875em;
    line-height: 1.7;
    border-collapse: separate;
    border-spacing: 0;
    border-radius: 0.75rem;
    overflow: hidden;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
      0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }

  .prose thead {
    background: linear-gradient(135deg, var(--primary), #22c55e);
    color: white;
  }

  .prose thead th {
    padding: 0.75rem 1rem;
    font-weight: 600;
    text-align: left;
  }

  .prose tbody tr {
    border-bottom: 1px solid #e5e7eb;
  }

  .prose tbody tr:nth-child(even) {
    background: rgba(34, 197, 94, 0.02);
  }

  .prose tbody tr:hover {
    background: rgba(34, 197, 94, 0.05);
  }

  .prose tbody td {
    padding: 0.75rem 1rem;
  }
}

```

# frontend/src/lib/utils.ts

```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

```

# frontend/src/main.tsx

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { RouterProvider } from "@tanstack/react-router";
import router from "./router";
import "./index.css";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>
);

```

# frontend/src/router.tsx

```tsx
import {
  createRouter,
  RootRoute,
  Route,
  Navigate,
} from "@tanstack/react-router";
import App from "./App";
import { getBasePath } from "./api/config";

// Import Admin views
import AdminLayout from "./views/admin/AdminLayout";
import AdminSeries from "./views/admin/Series";
import AdminSeriesDetail from "./views/admin/SeriesDetail";
import AdminTeams from "./views/admin/Teams";
import AdminCourses from "./views/admin/Courses";
import AdminCompetitions from "./views/admin/Competitions";
import AdminCompetitionTeeTimes from "./views/admin/CompetitionTeeTimes.tsx";

// Import Player views
import PlayerLayout from "./views/player/PlayerLayout";
import PlayerLanding from "./views/player/Landing";
import PlayerStandings from "./views/player/Standings";
import PlayerCompetitions from "./views/player/Competitions";
import PlayerSeries from "./views/player/Series";
import SeriesDetail from "./views/player/SeriesDetail";
import SeriesDocuments from "./views/player/SeriesDocuments";
import SeriesDocumentDetail from "./views/player/SeriesDocumentDetail";
import SeriesStandings from "./views/player/SeriesStandings";
import SeriesCompetitions from "./views/player/SeriesCompetitions";
import CompetitionDetail from "./views/player/CompetitionDetail";
import CompetitionRound from "./views/player/CompetitionRound";

// Root route
const rootRoute = new RootRoute({
  component: App,
});

// Admin routes
const adminRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminLayout,
});

const adminSeriesRoute = new Route({
  getParentRoute: () => adminRoute,
  path: "/series",
  component: AdminSeries,
});

const adminSeriesDetailRoute = new Route({
  getParentRoute: () => adminRoute,
  path: "/series/$serieId",
  component: AdminSeriesDetail,
});

const adminTeamsRoute = new Route({
  getParentRoute: () => adminRoute,
  path: "/teams",
  component: AdminTeams,
});

const adminCoursesRoute = new Route({
  getParentRoute: () => adminRoute,
  path: "/courses",
  component: AdminCourses,
});

const adminCompetitionsRoute = new Route({
  getParentRoute: () => adminRoute,
  path: "/competitions",
  component: AdminCompetitions,
});

const adminCompetitionTeeTimesRoute = new Route({
  getParentRoute: () => adminRoute,
  path: "/competitions/$competitionId/tee-times",
  component: AdminCompetitionTeeTimes,
});

// Player routes
const playerRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/player",
  component: PlayerLayout,
});

const playerLandingRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/",
  component: PlayerLanding,
});

const playerStandingsRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/standings",
  component: PlayerStandings,
});

const playerCompetitionsRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/competitions",
  component: PlayerCompetitions,
});

const playerSeriesRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/series",
  component: PlayerSeries,
});

const seriesDetailRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/series/$serieId",
  component: SeriesDetail,
});

// New Series Detail sub-routes
const seriesDocumentsRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/series/$serieId/documents",
  component: SeriesDocuments,
});

const seriesDocumentDetailRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/series/$serieId/documents/$documentId",
  component: SeriesDocumentDetail,
});

const seriesStandingsRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/series/$serieId/standings",
  component: SeriesStandings,
});

const seriesCompetitionsRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/series/$serieId/competitions",
  component: SeriesCompetitions,
});

const competitionDetailRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/competitions/$competitionId",
  component: CompetitionDetail,
});

const teeTimeDetailRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/competitions/$competitionId/tee-times/$teeTimeId",
  component: CompetitionRound,
});

// Default redirect to player landing page
const indexRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <Navigate to="/player" replace />,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  adminRoute.addChildren([
    adminSeriesRoute,
    adminSeriesDetailRoute,
    adminTeamsRoute,
    adminCoursesRoute,
    adminCompetitionsRoute,
    adminCompetitionTeeTimesRoute,
  ]),
  playerRoute.addChildren([
    playerLandingRoute,
    playerStandingsRoute,
    playerCompetitionsRoute,
    playerSeriesRoute,
    seriesDetailRoute,
    seriesDocumentsRoute,
    seriesDocumentDetailRoute,
    seriesStandingsRoute,
    seriesCompetitionsRoute,
    competitionDetailRoute,
    teeTimeDetailRoute,
  ]),
]);

const router = createRouter({
  routeTree,
  basepath: getBasePath(),
});

export default router;

```

# frontend/src/utils/courseFormatting.ts

```ts
import type { Course } from "../api/courses";
import type { TeeTime } from "../api/tee-times";

export interface FormattedCourse {
  id: string;
  name: string;
  holes: Array<{ number: number; par: number }>;
}

export function formatCourseFromTeeTime(
  teeTime: TeeTime | null,
  course?: Course | null
): FormattedCourse | null {
  if (!teeTime) return null;

  return {
    id: teeTime.id.toString(),
    name: course ? course.name : `${teeTime.course_name} ${teeTime.teetime}`,
    holes: teeTime.pars.map((par, index) => ({
      number: index + 1,
      par,
    })),
  };
}

```

# frontend/src/utils/holeNavigation.ts

```ts
// Utility for smart hole navigation and session management

export interface TeeTimeParticipant {
  id: number;
  score: number[];
  // ... other properties
}

// Helper functions for session storage and smart hole navigation
export const getSessionStorageKey = (teeTimeId: string) =>
  `golf-current-hole-${teeTimeId}`;

export const findFirstIncompleteHole = (
  participants: TeeTimeParticipant[]
): number => {
  // Find the first hole where not all participants have valid scores
  for (let hole = 1; hole <= 18; hole++) {
    const holeIndex = hole - 1;
    const allParticipantsHaveScores = participants.every((participant) => {
      const score = participant.score[holeIndex];
      return score && score > 0; // Valid score (not 0 or -1 for incomplete)
    });

    if (!allParticipantsHaveScores) {
      return hole;
    }
  }

  return 18; // All holes complete, go to last hole
};

export const getInitialHole = (
  teeTimeId: string | undefined,
  participants: TeeTimeParticipant[] | undefined
): number => {
  if (!teeTimeId || !participants) return 1;

  // Try to get remembered hole from session storage
  const sessionKey = getSessionStorageKey(teeTimeId);
  const rememberedHole = sessionStorage.getItem(sessionKey);

  if (rememberedHole) {
    const hole = parseInt(rememberedHole, 10);
    if (hole >= 1 && hole <= 18) {
      return hole;
    }
  }

  // No remembered hole, find first incomplete
  return findFirstIncompleteHole(participants);
};

export const rememberCurrentHole = (teeTimeId: string, hole: number): void => {
  if (teeTimeId && hole) {
    sessionStorage.setItem(getSessionStorageKey(teeTimeId), hole.toString());
  }
};

export const clearRememberedHole = (teeTimeId: string): void => {
  sessionStorage.removeItem(getSessionStorageKey(teeTimeId));
};

```

# frontend/src/utils/participantFormatting.ts

```ts
import type { TeeTime, TeeTimeParticipant } from "../api/tee-times";
import {
  formatParticipantTypeDisplay,
  isMultiPlayerFormat,
} from "./playerUtils";

export interface ScoreEntryPlayer {
  participantId: string;
  participantName: string;
  participantType?: string;
  isMultiPlayer?: boolean;
  scores: number[];
}

export interface TeeTimeGroup {
  id: string;
  players: ScoreEntryPlayer[];
}

export function formatTeeTimeGroup(
  teeTime: TeeTime | null
): TeeTimeGroup | null {
  if (!teeTime) return null;

  return {
    id: teeTime.id.toString(),
    players: teeTime.participants.map((participant: TeeTimeParticipant) => ({
      participantId: participant.id.toString(),
      participantName: participant.team_name,
      participantType: formatParticipantTypeDisplay(participant.position_name),
      isMultiPlayer: isMultiPlayerFormat(participant.position_name),
      scores: participant.score,
    })),
  };
}

export function formatParticipantForScorecard(
  participant: TeeTimeParticipant | null
) {
  if (!participant) return null;

  return {
    id: participant.id,
    team_name: participant.team_name,
    position_name: participant.position_name,
    player_names: participant.player_names,
    score: participant.score,
    tee_time_id: participant.tee_time_id,
  };
}

```

# frontend/src/utils/playerUtils.ts

```ts
/**
 * Utility functions for handling golf participant types and player counting
 */

export interface ParticipantInfo {
  id: string;
  name: string;
  type: string;
  playerCount: number;
}

/**
 * Determines if a participant type represents multiple players
 * @param participantType - The position/participant type name
 * @returns The number of actual players represented by this participant
 */
export function getPlayerCountForParticipantType(
  participantType: string
): number {
  const lowerType = participantType.toLowerCase();

  // Check for multi-player formats
  if (
    lowerType.includes("bäst") ||
    lowerType.includes("better") ||
    lowerType.includes("foursome") ||
    lowerType.includes("greensome")
  ) {
    return 2; // These formats represent 2 players
  }

  return 1; // Default to single player
}

/**
 * Calculates the total number of actual players in a tee time
 * @param participants - Array of participants with their types
 * @returns Total number of actual players
 */
export function calculateTotalPlayers(
  participants: Array<{ position_name: string }>
): number {
  return participants.reduce((total, participant) => {
    return total + getPlayerCountForParticipantType(participant.position_name);
  }, 0);
}

/**
 * Validates if adding a new participant would exceed the 4-player limit
 * @param existingParticipants - Current participants in the tee time
 * @param newParticipantType - Type of the participant to be added
 * @returns Object with validation result and details
 */
export function validatePlayerLimit(
  existingParticipants: Array<{ position_name: string }>,
  newParticipantType: string
): {
  isValid: boolean;
  currentPlayerCount: number;
  newPlayerCount: number;
  maxPlayers: number;
  message?: string;
} {
  const MAX_PLAYERS = 4;
  const currentPlayerCount = calculateTotalPlayers(existingParticipants);
  const newParticipantPlayerCount =
    getPlayerCountForParticipantType(newParticipantType);
  const totalAfterAdding = currentPlayerCount + newParticipantPlayerCount;

  const isValid = totalAfterAdding <= MAX_PLAYERS;

  return {
    isValid,
    currentPlayerCount,
    newPlayerCount: newParticipantPlayerCount,
    maxPlayers: MAX_PLAYERS,
    message: isValid
      ? undefined
      : `Cannot add ${newParticipantType}. This would result in ${totalAfterAdding} players, exceeding the maximum of ${MAX_PLAYERS} players per tee time.`,
  };
}

/**
 * Gets a formatted display for participant types with player counts
 * @param participantType - The position/participant type name
 * @returns Formatted string showing the type and player count
 */
export function formatParticipantTypeDisplay(participantType: string): string {
  const playerCount = getPlayerCountForParticipantType(participantType);
  if (playerCount > 1) {
    return `${participantType} (${playerCount} players)`;
  }
  return participantType;
}

/**
 * Checks if a participant type is a multi-player format
 * @param participantType - The position/participant type name
 * @returns True if the type represents multiple players
 */
export function isMultiPlayerFormat(participantType: string): boolean {
  return getPlayerCountForParticipantType(participantType) > 1;
}

```

# frontend/src/utils/scoreCalculations.ts

```ts
// Types for score calculations
export interface ParticipantScore {
  participantId: number;
  participant: {
    id: number;
    team_name: string;
    position_name: string;
    player_names?: string | null;
  };
  totalShots: number;
  relativeToPar: number;
  holesPlayed: number;
}

export interface TeamResult {
  teamName: string;
  participants: Array<{
    name: string;
    position: string;
    totalShots: number;
    relativeToPar: number;
  }>;
  totalShots: number;
  relativeToPar: number;
  position: number;
  points: number;
}

export interface ScoreStatistics {
  totalShots: number;
  relativeToPar: number;
  holesPlayed: number;
  isValidRound: boolean;
}

/**
 * Calculate participant score statistics from their score array
 * @param scores Array of scores for each hole (0 = not reported, -1 = gave up, positive = actual score)
 * @param coursePars Array of par values for each hole
 * @returns Score statistics including total shots, relative to par, and holes played
 */
export function calculateParticipantScore(
  scores: number[],
  coursePars: number[]
): ScoreStatistics {
  // Check if player gave up on any hole - if so, invalidate entire round
  const hasGaveUp = scores.some((score) => score === -1);

  if (hasGaveUp) {
    return {
      totalShots: 0,
      relativeToPar: 0,
      holesPlayed: 0,
      isValidRound: false,
    };
  }

  let totalShots = 0;
  let totalPlayedPar = 0;
  let holesPlayed = 0;

  for (let i = 0; i < Math.min(scores.length, coursePars.length); i++) {
    const score = scores[i];
    const par = coursePars[i];

    // Only count holes that have been played (score > 0)
    // Exclude gave up (-1) and not reported (0) holes
    if (score && score > 0) {
      totalShots += score;
      totalPlayedPar += par;
      holesPlayed++;
    }
  }

  const relativeToPar = totalShots > 0 ? totalShots - totalPlayedPar : 0;

  return {
    totalShots,
    relativeToPar,
    holesPlayed,
    isValidRound: true,
  };
}

/**
 * Format score relative to par for display
 * @param toPar The score relative to par (positive = over par, negative = under par, 0 = even)
 * @returns Formatted string (e.g., "E", "+2", "-1")
 */
export function formatToPar(toPar: number): string {
  if (toPar === 0) return "E";
  return toPar > 0 ? `+${toPar}` : `${toPar}`;
}

/**
 * Get CSS color class based on score relative to par
 * @param toPar The score relative to par
 * @returns CSS color class string
 */
export function getToParColor(toPar: number): string {
  if (toPar < 0) return "text-turf";
  if (toPar > 0) return "text-flag";
  return "text-charcoal";
}

/**
 * Get position styling for leaderboard positions
 * @param position The position/rank (1st, 2nd, 3rd, etc.)
 * @returns CSS classes for position styling
 */
export function getPositionColor(position: number): string {
  switch (position) {
    case 1:
      return "text-fairway bg-scorecard border-l-[#FFD700]";
    case 2:
      return "text-fairway bg-scorecard border-l-[#C0C0C0]";
    case 3:
      return "text-fairway bg-scorecard border-l-[#CD7F32]";
    default:
      return "text-charcoal bg-scorecard border-l-soft-grey";
  }
}

/**
 * Calculate team results from individual participant scores
 * @param leaderboard Array of participant scores
 * @returns Array of team results with standings and points
 */
export function calculateTeamResults(
  leaderboard: ParticipantScore[]
): TeamResult[] {
  // Group participants by team
  const teamGroups = leaderboard.reduce((acc, entry) => {
    const teamName = entry.participant.team_name;
    if (!acc[teamName]) {
      acc[teamName] = {
        teamName,
        participants: [],
        totalShots: 0,
        relativeToPar: 0,
      };
    }
    acc[teamName].participants.push({
      name: entry.participant.player_names || "",
      position: entry.participant.position_name,
      totalShots: entry.totalShots,
      relativeToPar: entry.relativeToPar,
    });
    acc[teamName].totalShots += entry.totalShots;
    acc[teamName].relativeToPar += entry.relativeToPar;
    return acc;
  }, {} as Record<string, { teamName: string; participants: Array<{ name: string; position: string; totalShots: number; relativeToPar: number }>; totalShots: number; relativeToPar: number }>);

  // Sort teams by relativeToPar and assign points
  return Object.values(teamGroups)
    .sort((a, b) => a.relativeToPar - b.relativeToPar)
    .map((team, index, array) => {
      const position = index + 1;
      let points = array.length - position + 1; // Base points (last place gets 1 point)

      // Add extra points for top 3 positions
      if (position === 1) points += 2; // First place gets 2 extra points
      if (position === 2) points += 1; // Second place gets 1 extra point

      return {
        ...team,
        position,
        points,
      };
    });
}

/**
 * Format score for display in scorecard
 * @param score The raw score (-1 = gave up, 0 = not reported, positive = actual score)
 * @returns Formatted score string
 */
export function formatScoreDisplay(score: number): string {
  if (score === -1) return "-"; // Gave up
  if (score === 0) return "0"; // Not reported
  return score.toString(); // Actual score
}

/**
 * Format score for display in score entry (slightly different from scorecard)
 * @param score The raw score (-1 = gave up, 0 = not reported, positive = actual score)
 * @returns Formatted score string
 */
export function formatScoreEntryDisplay(score: number | null): string {
  if (score === -1 || score === null) return "-"; // Gave up
  if (score === 0) return "NR"; // Not reported
  return score.toString(); // Actual score
}

/**
 * Calculate total number of participants across all tee times
 * @param teeTimes Array of tee time objects with participants
 * @returns Total participant count
 */
export function calculateTotalParticipants(
  teeTimes: Array<{ participants: unknown[] }> | undefined
): number {
  return (
    teeTimes?.reduce(
      (total, teeTime) => total + teeTime.participants.length,
      0
    ) || 0
  );
}

/**
 * Check if a score is valid for color coding and calculations
 * @param score The score to validate
 * @returns True if score is valid (positive number)
 */
export function isValidScore(score: number): boolean {
  return score > 0;
}

/**
 * Check if a participant has a valid score entered for a hole
 * @param score The score to check
 * @returns True if score has been entered (not 0)
 */
export function hasValidScore(score: number): boolean {
  return score !== 0;
}

/**
 * Calculate total shots for a subset of holes
 * @param playerScores Array of all player scores
 * @param holes Array of hole objects with number property
 * @returns Total shots for the specified holes
 */
export function calculateHoleTotal(
  playerScores: number[],
  holes: Array<{ number: number }>
): number {
  return holes.reduce((total, hole) => {
    const score = playerScores[hole.number - 1];
    // Only count actual scores (positive numbers) in totals
    // Exclude gave up (-1) and not reported (0) holes
    return total + (score && score > 0 ? score : 0);
  }, 0);
}

/**
 * Calculate par total for played holes only
 * @param playerScores Array of all player scores
 * @param holes Array of hole objects with number and par properties
 * @returns Total par for holes that have been played
 */
export function calculatePlayedPar(
  playerScores: number[],
  holes: Array<{ number: number; par: number }>
): number {
  return holes.reduce((totalPar, hole) => {
    const score = playerScores[hole.number - 1];
    // Only count par for holes that have been played (score > 0)
    // Exclude gave up (-1) and not reported (0) holes
    return totalPar + (score && score > 0 ? hole.par : 0);
  }, 0);
}

```

# frontend/src/utils/scoreStorage.ts

```ts
// Utility for managing local score storage and sync resilience

interface PendingScore {
  participantId: number;
  hole: number;
  shots: number;
  timestamp: number;
  attempts: number;
}

const STORAGE_KEY = "golf-pending-scores";
const MAX_RETRY_ATTEMPTS = 3;

export class ScoreStorageManager {
  private static instance: ScoreStorageManager;

  private constructor() {}

  static getInstance(): ScoreStorageManager {
    if (!ScoreStorageManager.instance) {
      ScoreStorageManager.instance = new ScoreStorageManager();
    }
    return ScoreStorageManager.instance;
  }

  // Add a score to pending storage
  addPendingScore(participantId: number, hole: number, shots: number): void {
    const pendingScores = this.getPendingScores();
    const scoreKey = `${participantId}-${hole}`;

    pendingScores[scoreKey] = {
      participantId,
      hole,
      shots,
      timestamp: Date.now(),
      attempts: 0,
    };

    this.savePendingScores(pendingScores);
  }

  // Remove a score from pending storage (after successful sync)
  removePendingScore(participantId: number, hole: number): void {
    const pendingScores = this.getPendingScores();
    const scoreKey = `${participantId}-${hole}`;

    delete pendingScores[scoreKey];
    this.savePendingScores(pendingScores);
  }

  // Get all pending scores
  getPendingScores(): Record<string, PendingScore> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  // Get pending scores as an array
  getPendingScoresArray(): PendingScore[] {
    const pendingScores = this.getPendingScores();
    return Object.values(pendingScores);
  }

  // Get count of pending scores
  getPendingCount(): number {
    return this.getPendingScoresArray().length;
  }

  // Mark a score as attempted (increment retry count)
  markAttempted(participantId: number, hole: number): boolean {
    const pendingScores = this.getPendingScores();
    const scoreKey = `${participantId}-${hole}`;

    if (pendingScores[scoreKey]) {
      pendingScores[scoreKey].attempts += 1;

      // Remove if max attempts reached
      if (pendingScores[scoreKey].attempts >= MAX_RETRY_ATTEMPTS) {
        delete pendingScores[scoreKey];
      }

      this.savePendingScores(pendingScores);
      return pendingScores[scoreKey] ? true : false; // Return false if removed due to max attempts
    }

    return false;
  }

  // Clear all pending scores
  clearPendingScores(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  // Get scores that should be retried (not at max attempts)
  getRetryableScores(): PendingScore[] {
    return this.getPendingScoresArray().filter(
      (score) => score.attempts < MAX_RETRY_ATTEMPTS
    );
  }

  // Check if connectivity issues are suspected
  hasConnectivityIssues(): boolean {
    const pendingScores = this.getPendingScoresArray();
    const oldestPending = Math.min(...pendingScores.map((s) => s.timestamp));

    // Consider connectivity issues if scores have been pending for more than 30 seconds
    return pendingScores.length > 0 && Date.now() - oldestPending > 30000;
  }

  private savePendingScores(scores: Record<string, PendingScore>): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
    } catch (error) {
      console.error("Failed to save pending scores to localStorage:", error);
    }
  }
}

```

# frontend/src/utils/syncManager.ts

```ts
// src/utils/syncManager.ts

// Sync intervals configuration
export const SYNC_INTERVALS = {
  TAB_CHANGE: 15000, // 15 seconds
  VISIBILITY_CHANGE: 60000, // 1 minute
  PERIODIC: 30000, // 30 seconds
  HOLE_NAVIGATION: 20000, // 20 seconds
  INITIAL_FETCH: 10000, // 10 seconds
} as const;

// Sync configuration interfaces
export interface SyncConfig {
  teeTimeId?: string;
  competitionId?: string;
  activeTab: string;
  lastSyncTime: number;
  onSync: () => void | Promise<void>;
}

export interface InitialSyncConfig extends SyncConfig {
  hasData?: boolean;
}

export interface TabSyncConfig extends SyncConfig {
  newTab: string;
  onLeaderboardSync?: () => void | Promise<void>;
  onTeamsSync?: () => void | Promise<void>;
}

export interface VisibilitySyncConfig extends SyncConfig {
  isScoreEntry: boolean;
}

export interface HoleSyncConfig extends SyncConfig {
  currentHole: number;
}

export interface SyncStatus {
  pendingCount: number;
  lastSyncTime: number;
  isOnline: boolean;
  hasConnectivityIssues: boolean;
}

export class SyncManager {
  /**
   * Determine if a sync is needed based on time threshold
   */
  static shouldSync(lastSyncTime: number, threshold: number): boolean {
    const timeSinceLastSync = Date.now() - lastSyncTime;
    return timeSinceLastSync > threshold;
  }

  /**
   * Generate session storage key for sync tracking
   */
  static getSessionKey(type: string, id: string): string {
    return `golf-sync-${type}-${id}`;
  }

  /**
   * Check if initial sync is needed for a session
   */
  static needsInitialSync(sessionKey: string): boolean {
    const lastSyncedThisSession = sessionStorage.getItem(sessionKey);
    return !lastSyncedThisSession;
  }

  /**
   * Mark sync as completed in session storage
   */
  static markSyncCompleted(sessionKey: string): void {
    sessionStorage.setItem(sessionKey, Date.now().toString());
  }

  /**
   * Handle initial sync when entering a view
   */
  static async handleInitialSync(config: InitialSyncConfig): Promise<boolean> {
    if (!config.teeTimeId || !config.hasData) return false;

    const sessionKey = this.getSessionKey("initial", config.teeTimeId);

    if (this.needsInitialSync(sessionKey)) {
      console.log("Initial sync for score entry session...");
      await config.onSync();
      this.markSyncCompleted(sessionKey);
      return true;
    }

    return false;
  }

  /**
   * Handle sync on tab changes
   */
  static async handleTabChangeSync(config: TabSyncConfig): Promise<void> {
    const { newTab, teeTimeId, lastSyncTime } = config;

    // Sync when switching to score tab
    if (newTab === "score" && teeTimeId) {
      if (this.shouldSync(lastSyncTime, SYNC_INTERVALS.TAB_CHANGE)) {
        console.log("Syncing on tab change to score entry...");
        await config.onSync();
      }
    }

    // Sync when switching to leaderboard or teams
    if (newTab === "leaderboard" || newTab === "teams") {
      console.log(`Syncing data for ${newTab} view...`);

      if (config.onLeaderboardSync) {
        await config.onLeaderboardSync();
      }

      if (newTab === "teams" && config.onTeamsSync) {
        await config.onTeamsSync();
      }
    }
  }

  /**
   * Handle sync when browser tab becomes visible
   */
  static async handleVisibilityChangeSync(
    config: VisibilitySyncConfig
  ): Promise<boolean> {
    if (document.hidden || !config.isScoreEntry || !config.teeTimeId) {
      return false;
    }

    if (
      this.shouldSync(config.lastSyncTime, SYNC_INTERVALS.VISIBILITY_CHANGE)
    ) {
      console.log("Syncing after returning to tab...");
      await config.onSync();
      return true;
    }

    return false;
  }

  /**
   * Check if sync is needed when navigating holes (every 3 holes)
   */
  static shouldSyncOnHoleChange(hole: number, lastSyncTime: number): boolean {
    const shouldSyncOnHole = hole % 3 === 1; // Sync on holes 1, 4, 7, 10, 13, 16
    return (
      shouldSyncOnHole &&
      this.shouldSync(lastSyncTime, SYNC_INTERVALS.HOLE_NAVIGATION)
    );
  }

  /**
   * Handle sync on hole navigation
   */
  static async handleHoleNavigationSync(
    config: HoleSyncConfig
  ): Promise<boolean> {
    if (!config.teeTimeId) return false;

    if (this.shouldSyncOnHoleChange(config.currentHole, config.lastSyncTime)) {
      console.log(
        `Syncing on hole navigation to hole ${config.currentHole}...`
      );
      await config.onSync();
      return true;
    }

    return false;
  }

  /**
   * Check if initial data fetch is needed for leaderboard/teams views
   */
  static needsInitialFetch(viewType: string, competitionId: string): boolean {
    const lastFetchKey = `lastFetch-${viewType}-${competitionId}`;
    const lastFetch = sessionStorage.getItem(lastFetchKey);
    const timeSinceLastFetch = lastFetch
      ? Date.now() - parseInt(lastFetch)
      : Infinity;

    return timeSinceLastFetch > SYNC_INTERVALS.INITIAL_FETCH;
  }

  /**
   * Mark initial fetch as completed
   */
  static markInitialFetchCompleted(
    viewType: string,
    competitionId: string
  ): void {
    const lastFetchKey = `lastFetch-${viewType}-${competitionId}`;
    sessionStorage.setItem(lastFetchKey, Date.now().toString());
  }

  /**
   * Handle initial fetch for leaderboard/teams views
   */
  static async handleInitialViewFetch(
    viewType: "leaderboard" | "teams",
    competitionId: string,
    onLeaderboardSync: () => void | Promise<void>,
    onTeamsSync?: () => void | Promise<void>
  ): Promise<boolean> {
    if (this.needsInitialFetch(viewType, competitionId)) {
      console.log(`Initial fetch for ${viewType} view...`);

      await onLeaderboardSync();

      if (viewType === "teams" && onTeamsSync) {
        await onTeamsSync();
      }

      this.markInitialFetchCompleted(viewType, competitionId);
      return true;
    }

    return false;
  }

  /**
   * Create sync status object
   */
  static createSyncStatus(
    scoreManager: { getPendingCount: () => number },
    lastSyncTime: number
  ): SyncStatus {
    const pendingCount = scoreManager.getPendingCount();

    return {
      pendingCount,
      lastSyncTime,
      isOnline: navigator.onLine,
      hasConnectivityIssues:
        pendingCount > 0 && Date.now() - lastSyncTime > SYNC_INTERVALS.PERIODIC,
    };
  }

  /**
   * Determine if periodic sync should run based on active tab
   */
  static shouldRunPeriodicSync(activeTab: string): boolean {
    return activeTab === "leaderboard" || activeTab === "teams";
  }

  /**
   * Handle periodic sync for leaderboard and teams
   */
  static async handlePeriodicViewSync(
    activeTab: string,
    onLeaderboardSync: () => void | Promise<void>,
    onTeamsSync?: () => void | Promise<void>
  ): Promise<void> {
    if (!this.shouldRunPeriodicSync(activeTab)) return;

    console.log(`Periodic sync for ${activeTab} view...`);

    await onLeaderboardSync();

    if (activeTab === "teams" && onTeamsSync) {
      await onTeamsSync();
    }
  }

  /**
   * Check if retryable sync should run (for pending scores)
   */
  static shouldRetryPendingScores(
    retryableScores: unknown[],
    lastSyncTime: number
  ): boolean {
    return (
      retryableScores.length > 0 ||
      this.shouldSync(lastSyncTime, SYNC_INTERVALS.PERIODIC)
    );
  }
}

```

# frontend/src/views/admin/AdminLayout.tsx

```tsx
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Users, Map, Trophy, Settings, Award } from "lucide-react";
import TapScoreLogo from "../../components/ui/TapScoreLogo";

const adminNavLinks = [
  { to: "/admin/series", label: "Series", icon: Award },
  { to: "/admin/teams", label: "Teams", icon: Users },
  { to: "/admin/courses", label: "Courses", icon: Map },
  { to: "/admin/competitions", label: "Competitions", icon: Trophy },
];

export default function AdminLayout() {
  const { location } = useRouterState();

  return (
    <div className="min-h-screen bg-gradient-to-br from-scorecard to-rough">
      {/* TapScore Header */}
      <div className="bg-fairway text-scorecard shadow-[0_2px_8px_rgba(27,67,50,0.15)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <TapScoreLogo size="md" variant="color" layout="horizontal" />
              <div className="flex items-center space-x-2">
                <Settings className="h-6 w-6 text-coral" />
                <span className="text-scorecard font-['Inter'] font-medium">
                  Admin
                </span>
              </div>
            </div>
            <Link
              to="/player/competitions"
              className="px-4 py-2 bg-coral text-scorecard rounded-xl hover:bg-[#E8890A] hover:-translate-y-0.5 transition-all duration-200 font-['Inter'] font-semibold border-2 border-coral hover:border-[#E8890A] shadow-sm"
            >
              Switch to Player View
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          <div className="bg-scorecard rounded-xl p-6 shadow-[0_2px_8px_rgba(27,67,50,0.08)] border-2 border-soft-grey">
            {/* Admin Navigation */}
            <div className="border-b-2 border-soft-grey">
              <nav className="flex space-x-8">
                {adminNavLinks.map((link) => {
                  const isActive = location.pathname === link.to;
                  const IconComponent = link.icon;
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-all duration-200 font-['Inter']
                        ${
                          isActive
                            ? "border-turf text-turf bg-gradient-to-b from-turf/10 to-turf/5"
                            : "border-transparent text-charcoal hover:text-turf hover:border-rough hover:bg-rough/30"
                        }
                      `}
                    >
                      <IconComponent className="h-4 w-4" />
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Admin Content */}
            <div className="mt-6 min-h-[60vh]">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

```

# frontend/src/views/admin/Competitions.tsx

```tsx
import { useState } from "react";
import {
  useCompetitions,
  useCreateCompetition,
  useUpdateCompetition,
  useDeleteCompetition,
  type Competition,
} from "../../api/competitions";
import { useCourses } from "../../api/courses";
import { useSeries, useSeriesCompetitions } from "../../api/series";
import {
  Plus,
  Edit,
  Trash2,
  MapPin,
  Clock,
  Award,
  ArrowLeft,
} from "lucide-react";
import { Link, useSearch } from "@tanstack/react-router";

export default function AdminCompetitions() {
  // Get series filter from URL search params
  const search = useSearch({ from: "/admin/competitions" }) as {
    series?: string;
  };
  const seriesFilter = search.series ? parseInt(search.series) : null;

  const { data: allCompetitions, isLoading, error } = useCompetitions();
  const { data: seriesCompetitions } = useSeriesCompetitions(seriesFilter || 0);
  const { data: courses } = useCourses();
  const { data: series } = useSeries();
  const createCompetition = useCreateCompetition();
  const updateCompetition = useUpdateCompetition();
  const deleteCompetition = useDeleteCompetition();

  // Use series-specific competitions if filtering, otherwise all competitions
  const competitions = seriesFilter ? seriesCompetitions : allCompetitions;
  const filteredSeries = series?.find((s) => s.id === seriesFilter);

  const [showForm, setShowForm] = useState(false);
  const [editingCompetition, setEditingCompetition] =
    useState<Competition | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    course_id: "",
    series_id: seriesFilter?.toString() || "",
  });

  if (isLoading) return <div>Loading competitions...</div>;
  if (error) return <div>Error loading competitions</div>;

  const handleEdit = (competition: Competition) => {
    setEditingCompetition(competition);
    setFormData({
      name: competition.name,
      date: competition.date,
      course_id: competition.course_id.toString(),
      series_id: competition.series_id?.toString() || "",
    });
    setShowForm(true);
  };

  const handleDelete = (competitionId: number) => {
    if (confirm("Are you sure you want to delete this competition?")) {
      deleteCompetition.mutate(competitionId, {
        onError: (error) => {
          console.error("Error deleting competition:", error);
          alert("Failed to delete competition. Please try again.");
        },
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const competitionData = {
      name: formData.name,
      date: formData.date,
      course_id: parseInt(formData.course_id),
      series_id: formData.series_id ? parseInt(formData.series_id) : undefined,
    };

    const onSuccess = () => {
      // Reset form and close
      setFormData({
        name: "",
        date: "",
        course_id: "",
        series_id: seriesFilter?.toString() || "",
      });
      setShowForm(false);
      setEditingCompetition(null);
    };

    const onError = (error: Error) => {
      console.error("Error saving competition:", error);
      alert("Failed to save competition. Please try again.");
    };

    if (editingCompetition) {
      updateCompetition.mutate(
        { id: editingCompetition.id, data: competitionData },
        { onSuccess, onError }
      );
    } else {
      createCompetition.mutate(competitionData, { onSuccess, onError });
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const getCourse = (courseId: number) => {
    return courses?.find((course) => course.id === courseId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          {seriesFilter && filteredSeries ? (
            <div className="flex items-center gap-3 mb-2">
              <Link
                to="/admin/series"
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Series
              </Link>
            </div>
          ) : null}
          <h2 className="text-2xl font-bold text-gray-900">
            {seriesFilter && filteredSeries
              ? `${filteredSeries.name} - Competitions`
              : "Competitions"}
          </h2>
          <p className="text-gray-600">
            {seriesFilter && filteredSeries
              ? `Competitions in the ${filteredSeries.name} series`
              : "Manage golf competitions and tournaments"}
          </p>
        </div>
        <button
          onClick={() => {
            setEditingCompetition(null);
            setFormData({
              name: "",
              date: "",
              course_id: "",
              series_id: seriesFilter?.toString() || "",
            });
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Competition
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">
            {editingCompetition ? "Edit Competition" : "Add New Competition"}
          </h3>
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Competition Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter competition name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Course
              </label>
              <select
                name="course_id"
                value={formData.course_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a course</option>
                {courses?.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Series (Optional)
              </label>
              <select
                name="series_id"
                value={formData.series_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No series (standalone competition)</option>
                {series?.map((seriesItem) => (
                  <option key={seriesItem.id} value={seriesItem.id}>
                    {seriesItem.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                disabled={
                  createCompetition.isPending || updateCompetition.isPending
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createCompetition.isPending || updateCompetition.isPending
                  ? "Saving..."
                  : editingCompetition
                  ? "Update"
                  : "Create"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingCompetition(null);
                  setFormData({
                    name: "",
                    date: "",
                    course_id: "",
                    series_id: seriesFilter?.toString() || "",
                  });
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {seriesFilter && filteredSeries
              ? `${filteredSeries.name} Competitions`
              : "All Competitions"}
          </h3>
          {competitions && (
            <p className="text-sm text-gray-500 mt-1">
              {competitions.length} competition
              {competitions.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <div className="divide-y divide-gray-200">
          {competitions && competitions.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              {seriesFilter && filteredSeries ? (
                <p>
                  No competitions found in the {filteredSeries.name} series.
                </p>
              ) : (
                <p>No competitions found.</p>
              )}
            </div>
          ) : (
            competitions?.map((competition) => {
              const course = getCourse(competition.course_id);
              return (
                <div
                  key={competition.id}
                  className="px-6 py-4 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-gray-900">
                        {competition.name}
                      </h4>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {course?.name || "Unknown Course"}
                        </div>
                        {competition.series_id && (
                          <div className="flex items-center gap-1 text-blue-600">
                            <Award className="h-4 w-4" />
                            {series?.find((s) => s.id === competition.series_id)
                              ?.name || `Series #${competition.series_id}`}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/admin/competitions/${competition.id}/tee-times`}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Manage tee times"
                      >
                        <Clock className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleEdit(competition)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit competition"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(competition.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete competition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

```

# frontend/src/views/admin/CompetitionTeeTimes.tsx

```tsx
import { useState, useEffect } from "react";
import { useParams } from "@tanstack/react-router";
import { useCompetition } from "../../api/competitions";
import { useTeams } from "../../api/teams";
import { useSeriesTeams } from "../../api/series";
import {
  useTeeTimesForCompetition,
  useCreateTeeTime,
  useCreateParticipant,
  useDeleteTeeTime,
} from "../../api/tee-times";
import { Plus, Clock, Users, Trash2, AlertCircle } from "lucide-react";
import ParticipantAssignment from "../../components/ParticipantAssignment";

interface ParticipantType {
  id: string;
  name: string;
}

export default function AdminCompetitionTeeTimes() {
  const { competitionId } = useParams({ strict: false });
  const { data: competition, isLoading: competitionLoading } = useCompetition(
    competitionId ? parseInt(competitionId) : 0
  );
  const { data: allTeams } = useTeams();
  const { data: seriesTeams } = useSeriesTeams(competition?.series_id || 0);
  const { data: teeTimes, refetch: refetchTeeTimes } =
    useTeeTimesForCompetition(competitionId ? parseInt(competitionId) : 0);

  // Use series teams if competition belongs to a series, otherwise use all teams
  // This ensures that when administering a competition that belongs to a series,
  // only teams that are part of that series are shown for participation
  const teams = competition?.series_id ? seriesTeams : allTeams;

  const [participantTypes, setParticipantTypes] = useState<ParticipantType[]>(
    []
  );
  const [selectedTeams, setSelectedTeams] = useState<number[]>([]);
  const [firstTeeTime, setFirstTeeTime] = useState("");
  const [timeBetweenTeeTimes, setTimeBetweenTeeTimes] = useState(10);
  const [isCreating, setIsCreating] = useState(false);
  const [hasAnalyzedExistingData, setHasAnalyzedExistingData] = useState(false);

  const createTeeTimeMutation = useCreateTeeTime();
  const createParticipantMutation = useCreateParticipant();
  const deleteTeeTimeMutation = useDeleteTeeTime();

  // Analyze existing tee times and prefill teams/participant types
  useEffect(() => {
    if (teeTimes && teeTimes.length > 0 && teams && !hasAnalyzedExistingData) {
      const foundTeamIds = new Set<number>();
      const foundParticipantTypes = new Set<string>();

      teeTimes.forEach((teeTime) => {
        teeTime.participants.forEach((participant) => {
          foundTeamIds.add(participant.team_id);
          foundParticipantTypes.add(participant.position_name);
        });
      });

      // Prefill selected teams
      const teamIdsArray = Array.from(foundTeamIds);
      setSelectedTeams(teamIdsArray);

      // Prefill participant types
      const typesArray = Array.from(foundParticipantTypes).map((name) => ({
        id: crypto.randomUUID(),
        name,
      }));
      setParticipantTypes(typesArray);

      setHasAnalyzedExistingData(true);
    }
  }, [teeTimes, teams, hasAnalyzedExistingData]);

  if (competitionLoading) return <div>Loading competition...</div>;
  if (!competition) return <div>Competition not found</div>;

  const handleAddParticipantType = () => {
    setParticipantTypes([
      ...participantTypes,
      { id: crypto.randomUUID(), name: "" },
    ]);
  };

  const handleParticipantTypeChange = (id: string, name: string) => {
    setParticipantTypes(
      participantTypes.map((type) =>
        type.id === id ? { ...type, name } : type
      )
    );
  };

  const handleRemoveParticipantType = (id: string) => {
    setParticipantTypes(participantTypes.filter((type) => type.id !== id));
  };

  const handleTeamSelection = (teamId: number) => {
    setSelectedTeams((prev) =>
      prev.includes(teamId)
        ? prev.filter((id) => id !== teamId)
        : [...prev, teamId]
    );
  };

  const handleCreateTeeTimes = async () => {
    if (!competitionId) return;

    setIsCreating(true);
    try {
      let currentTime: Date;

      // If there are existing tee times, use the latest one as base
      if (teeTimes && teeTimes.length > 0) {
        const latestTeeTime = teeTimes[teeTimes.length - 1].teetime;
        currentTime = new Date(`2000-01-01T${latestTeeTime}`);
      } else {
        // If no existing tee times, use the first tee time input
        currentTime = new Date(`2000-01-01T${firstTeeTime}`);
      }

      // Add the time interval to get the next tee time
      currentTime = new Date(
        currentTime.getTime() + timeBetweenTeeTimes * 60000
      );
      const newTeeTime = currentTime.toTimeString().slice(0, 5);

      // Create the empty tee time
      await createTeeTimeMutation.mutateAsync({
        competitionId: parseInt(competitionId),
        teetime: newTeeTime,
      });

      // Refresh the tee times list
      await refetchTeeTimes();
    } catch (error) {
      console.error("Error creating tee time:", error);
      alert("Failed to create tee time. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTeeTime = async (teeTimeId: number) => {
    if (!confirm("Are you sure you want to delete this tee time?")) return;

    try {
      await deleteTeeTimeMutation.mutateAsync(teeTimeId);
    } catch (error) {
      console.error("Error deleting tee time:", error);
      alert("Failed to delete tee time. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Manage Tee Times - {competition.name}
          </h2>
          <p className="text-gray-600">
            Set up participant types and create tee times
          </p>
        </div>
      </div>

      {/* Auto-prefill notification */}
      {hasAnalyzedExistingData && teeTimes && teeTimes.length > 0 && (
        <div className="bg-green-50 rounded-lg border border-green-200 p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-green-600" />
            <div className="text-sm text-green-800">
              <strong>Auto-prefilled:</strong> Found {selectedTeams.length}{" "}
              teams and {participantTypes.length} participant types from
              existing tee times. You can modify these selections below if
              needed.
            </div>
          </div>
        </div>
      )}

      {/* Participant Types Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Participant Types
            {hasAnalyzedExistingData && participantTypes.length > 0 && (
              <span className="ml-2 text-sm font-normal text-green-600">
                (auto-detected from existing)
              </span>
            )}
          </h3>
          <button
            onClick={handleAddParticipantType}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Type
          </button>
        </div>

        <div className="space-y-3">
          {participantTypes.map((type) => (
            <div
              key={type.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
            >
              <input
                type="text"
                value={type.name}
                onChange={(e) =>
                  handleParticipantTypeChange(type.id, e.target.value)
                }
                placeholder="Enter participant type (e.g., Single 1)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => handleRemoveParticipantType(type.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          {participantTypes.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              No participant types added yet. Add at least one type to continue.
            </div>
          )}
        </div>
      </div>

      {/* Team Selection Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Select Participating Teams
          {competition?.series_id && (
            <span className="ml-2 text-sm font-normal text-blue-600">
              (from series)
            </span>
          )}
          {hasAnalyzedExistingData && selectedTeams.length > 0 && (
            <span className="ml-2 text-sm font-normal text-green-600">
              (auto-selected from existing)
            </span>
          )}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {teams?.map((team) => (
            <div
              key={team.id}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                selectedTeams.includes(team.id)
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-blue-300"
              }`}
              onClick={() => handleTeamSelection(team.id)}
            >
              <div className="font-medium text-gray-900">{team.name}</div>
            </div>
          ))}
        </div>

        {teams?.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            {competition?.series_id
              ? "No teams available in this series. Please add teams to the series first."
              : "No teams available. Please add teams first."}
          </div>
        )}
      </div>

      {/* Tee Time Settings Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Tee Time Settings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Tee Time
            </label>
            <input
              type="time"
              value={firstTeeTime}
              onChange={(e) => setFirstTeeTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minutes Between Tee Times
            </label>
            <input
              type="number"
              min="5"
              max="30"
              value={timeBetweenTeeTimes}
              onChange={(e) =>
                setTimeBetweenTeeTimes(parseInt(e.target.value) || 10)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Create Tee Times Button */}
      <div className="flex justify-end">
        <button
          onClick={handleCreateTeeTimes}
          disabled={
            participantTypes.length === 0 ||
            selectedTeams.length === 0 ||
            !firstTeeTime ||
            isCreating ||
            createTeeTimeMutation.isPending ||
            createParticipantMutation.isPending
          }
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreating ? "Creating..." : "Create Tee Times"}
        </button>
      </div>

      {/* Existing Tee Times Section */}
      {teeTimes && teeTimes.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Existing Tee Times
          </h3>

          <div className="space-y-4">
            {teeTimes.map((teeTime) => (
              <div
                key={teeTime.id}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-gray-900">
                      {teeTime.teetime}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-500">
                      {teeTime.participants.length} participants
                    </span>
                    <button
                      onClick={() => handleDeleteTeeTime(teeTime.id)}
                      disabled={deleteTeeTimeMutation.isPending}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete tee time"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {teeTime.participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="p-3 bg-white rounded-lg border border-gray-200"
                    >
                      <div className="font-medium text-gray-900">
                        {participant.team_name} {participant.position_name}
                      </div>
                      {participant.player_names && (
                        <div className="text-sm text-gray-500">
                          {participant.player_names}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Participant Assignment Section */}
      {selectedTeams.length > 0 &&
        participantTypes.length > 0 &&
        teeTimes &&
        teeTimes.length > 0 && (
          <ParticipantAssignment
            selectedTeams={
              teams?.filter((team) => selectedTeams.includes(team.id)) || []
            }
            participantTypes={participantTypes}
            teeTimes={teeTimes}
            onAssignmentsChange={(assignments) => {
              console.log("Assignments changed:", assignments);
              // Refresh tee times to show updated assignments
              refetchTeeTimes();
            }}
          />
        )}
    </div>
  );
}

```

# frontend/src/views/admin/Courses.tsx

```tsx
import { useState } from "react";
import {
  useCourses,
  useCreateCourse,
  useUpdateCourseHoles,
  useDeleteCourse,
  type Course,
} from "@/api/courses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Map, Target, TrendingUp, Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

function CourseSkeleton() {
  return (
    <Card className="mb-4">
      <CardHeader>
        <Skeleton className="h-6 w-[200px]" />
        <Skeleton className="h-4 w-[150px]" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getCourseColor(index: number) {
  const colors = [
    {
      bg: "bg-green-50",
      border: "border-l-green-500",
      text: "text-green-700",
      icon: "text-green-600",
    },
    {
      bg: "bg-blue-50",
      border: "border-l-blue-500",
      text: "text-blue-700",
      icon: "text-blue-600",
    },
    {
      bg: "bg-purple-50",
      border: "border-l-purple-500",
      text: "text-purple-700",
      icon: "text-purple-600",
    },
    {
      bg: "bg-orange-50",
      border: "border-l-orange-500",
      text: "text-orange-700",
      icon: "text-orange-600",
    },
  ];
  return colors[index % colors.length];
}

export default function Courses() {
  const { data: courses, isLoading, error } = useCourses();
  const createCourse = useCreateCourse();
  const updateCourseHoles = useUpdateCourseHoles();
  const deleteCourse = useDeleteCourse();

  const [showDialog, setShowDialog] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseName, setCourseName] = useState("");
  const [pars, setPars] = useState<number[]>(Array(18).fill(3));
  const [step, setStep] = useState<"name" | "pars">("name");

  const handleCreate = () => {
    setEditingCourse(null);
    setCourseName("");
    setPars(Array(18).fill(3));
    setStep("name");
    setShowDialog(true);
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setCourseName(course.name);
    setPars(course.pars.holes);
    setStep("pars");
    setShowDialog(true);
  };

  const handleDelete = async (course: Course) => {
    if (
      window.confirm(`Are you sure you want to delete course "${course.name}"?`)
    ) {
      try {
        await deleteCourse.mutateAsync(course.id);
      } catch (error) {
        console.error("Failed to delete course:", error);
        alert("Failed to delete course. Please try again.");
      }
    }
  };

  const handleParChange = (index: number, value: string) => {
    const newPars = [...pars];
    newPars[index] = parseInt(value) || 3;
    setPars(newPars);
  };

  const calculateTotals = (holes: number[]) => {
    const out = holes.slice(0, 9).reduce((sum, par) => sum + par, 0);
    const in_ = holes.slice(9).reduce((sum, par) => sum + par, 0);
    return {
      out,
      in: in_,
      total: out + in_,
    };
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      if (step === "name") {
        const response = await createCourse.mutateAsync({ name: courseName });
        setEditingCourse(response);
        setStep("pars");
      } else if (editingCourse) {
        await updateCourseHoles.mutateAsync({
          id: editingCourse.id,
          holes: pars,
        });
        setShowDialog(false);
      }
    } catch (error) {
      console.error("Failed to save course:", error);
      alert("Failed to save course. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2 mb-6">
          <Map className="h-8 w-8 text-green-600" />
          <h2 className="text-3xl font-bold text-gray-900">Courses</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <CourseSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-700">
            <Map className="h-5 w-5" />
            <p className="font-medium">Error loading courses</p>
          </div>
          <p className="text-red-600 text-sm mt-2">
            Please try refreshing the page or contact support if the problem
            persists.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Map className="h-8 w-8 text-green-600" />
          <h2 className="text-3xl font-bold text-gray-900">Courses</h2>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="text-sm">
            {courses?.length || 0}{" "}
            {courses?.length === 1 ? "course" : "courses"}
          </Badge>
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Course
          </Button>
        </div>
      </div>

      {!courses || courses.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="p-12 text-center">
            <Map className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No courses available
            </h3>
            <p className="text-gray-600">
              Add some golf courses to get started with your scorecard.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course, index) => (
            <CourseCard
              key={course.id}
              course={course}
              index={index}
              handleEdit={handleEdit}
              handleDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {step === "name"
                ? "Create New Course"
                : editingCourse
                ? "Edit Course Pars"
                : "Set Course Pars"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            {step === "name" ? (
              <div className="space-y-2">
                <label htmlFor="courseName" className="text-sm font-medium">
                  Course Name
                </label>
                <Input
                  id="courseName"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="Enter course name"
                  required
                />
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Hole Pars</h3>
                  <div className="grid grid-cols-9 gap-2">
                    {pars.map((par, index) => (
                      <div key={index} className="space-y-1">
                        <label
                          htmlFor={`par-${index + 1}`}
                          className="text-xs text-gray-500"
                        >
                          Hole {index + 1}
                        </label>
                        <Input
                          id={`par-${index + 1}`}
                          type="number"
                          min="3"
                          max="6"
                          value={par}
                          onChange={(e) =>
                            handleParChange(index, e.target.value)
                          }
                          className="w-full"
                          required
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-4 border-t">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-600 font-medium uppercase tracking-wide">
                      Front 9
                    </p>
                    <p className="text-lg font-bold text-green-700">
                      Par {calculateTotals(pars).out}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">
                      Back 9
                    </p>
                    <p className="text-lg font-bold text-blue-700">
                      Par {calculateTotals(pars).in}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-xs text-purple-600 font-medium uppercase tracking-wide">
                      Total
                    </p>
                    <p className="text-lg font-bold text-purple-700">
                      Par {calculateTotals(pars).total}
                    </p>
                  </div>
                </div>
              </>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {step === "name" ? "Next" : editingCourse ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CourseCard({
  course,
  index,
  handleEdit,
  handleDelete,
}: {
  course: Course;
  index: number;
  handleEdit: (course: Course) => void;
  handleDelete: (course: Course) => void;
}) {
  const colors = getCourseColor(index);
  return (
    <Card
      key={course.id}
      className={`hover:shadow-lg transition-shadow duration-200 border-l-4 ${colors.border} ${colors.bg}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle
            className={`text-xl ${colors.text} flex items-center gap-2`}
          >
            <Target className={`h-5 w-5 ${colors.icon}`} />
            {course.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              #{course.id}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEdit(course)}
              className="h-8 w-8"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(course)}
              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-xs text-green-600 font-medium uppercase tracking-wide">
              Front 9
            </p>
            <p className="text-lg font-bold text-green-700">
              Par {course.pars.out}
            </p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">
              Back 9
            </p>
            <p className="text-lg font-bold text-blue-700">
              Par {course.pars.in}
            </p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <p className="text-xs text-purple-600 font-medium uppercase tracking-wide">
              Total
            </p>
            <p className="text-lg font-bold text-purple-700">
              Par {course.pars.total}
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              <span>{course.pars.holes.length} holes</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

```

# frontend/src/views/admin/Series.tsx

```tsx
import { useState } from "react";
import {
  useSeries,
  useCreateSeries,
  useUpdateSeries,
  useDeleteSeries,
  useSeriesTeams,
  useAvailableTeams,
  useAddTeamToSeries,
  useRemoveTeamFromSeries,
  type Series,
} from "@/api/series";
import { type Team } from "@/api/teams";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Trophy,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Image,
  Users,
  Calendar,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Link } from "@tanstack/react-router";

function SeriesSkeleton() {
  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-[200px]" />
          <Skeleton className="h-5 w-[80px] rounded-full" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-[150px]" />
      </CardContent>
    </Card>
  );
}

export default function AdminSeries() {
  const { data: series, isLoading, error } = useSeries();
  const createSeries = useCreateSeries();
  const updateSeries = useUpdateSeries();
  const deleteSeries = useDeleteSeries();
  const addTeamToSeries = useAddTeamToSeries();
  const removeTeamFromSeries = useRemoveTeamFromSeries();

  const [showDialog, setShowDialog] = useState(false);
  const [editingSeries, setEditingSeries] = useState<Series | null>(null);
  const [showTeamDialog, setShowTeamDialog] = useState(false);
  const [managingTeamsForSeries, setManagingTeamsForSeries] =
    useState<Series | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    banner_image_url: "",
    is_public: true,
  });

  // Team management queries
  const { data: seriesTeams } = useSeriesTeams(managingTeamsForSeries?.id || 0);
  const { data: availableTeams } = useAvailableTeams(
    managingTeamsForSeries?.id || 0
  );

  const handleCreate = () => {
    setEditingSeries(null);
    setFormData({
      name: "",
      description: "",
      banner_image_url: "",
      is_public: true,
    });
    setShowDialog(true);
  };

  const handleEdit = (series: Series) => {
    setEditingSeries(series);
    setFormData({
      name: series.name,
      description: series.description || "",
      banner_image_url: series.banner_image_url || "",
      is_public: series.is_public,
    });
    setShowDialog(true);
  };

  const handleDelete = async (series: Series) => {
    if (
      window.confirm(`Are you sure you want to delete series "${series.name}"?`)
    ) {
      try {
        await deleteSeries.mutateAsync(series.id);
      } catch (error) {
        console.error("Failed to delete series:", error);
        alert("Failed to delete series. Please try again.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const data = {
        name: formData.name,
        description: formData.description || undefined,
        banner_image_url: formData.banner_image_url || undefined,
        is_public: formData.is_public,
      };

      if (editingSeries) {
        await updateSeries.mutateAsync({ id: editingSeries.id, data });
      } else {
        await createSeries.mutateAsync(data);
      }
      setShowDialog(false);
    } catch (error) {
      console.error("Failed to save series:", error);
      alert("Failed to save series. Please try again.");
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleManageTeams = (series: Series) => {
    setManagingTeamsForSeries(series);
    setShowTeamDialog(true);
  };

  const handleAddTeam = async (teamId: number) => {
    if (!managingTeamsForSeries) return;
    try {
      await addTeamToSeries.mutateAsync({
        seriesId: managingTeamsForSeries.id,
        teamId,
      });
    } catch (error) {
      console.error("Failed to add team to series:", error);
      alert("Failed to add team to series. Please try again.");
    }
  };

  const handleRemoveTeam = async (teamId: number) => {
    if (!managingTeamsForSeries) return;
    try {
      await removeTeamFromSeries.mutateAsync({
        seriesId: managingTeamsForSeries.id,
        teamId,
      });
    } catch (error) {
      console.error("Failed to remove team from series:", error);
      alert("Failed to remove team from series. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Trophy className="h-8 w-8 text-blue-600" />
              <h2 className="text-3xl font-bold text-gray-900">Series</h2>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="text-sm">
                Loading...
              </Badge>
              <Button
                onClick={handleCreate}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Series
              </Button>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <SeriesSkeleton key={i} />
            ))}
          </div>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingSeries ? "Edit Series" : "Create New Series"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Series Name
                </label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter series name"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Description
                </label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter series description (optional)"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="banner_image_url"
                  className="text-sm font-medium"
                >
                  Banner Image URL
                </label>
                <Input
                  id="banner_image_url"
                  name="banner_image_url"
                  type="url"
                  value={formData.banner_image_url}
                  onChange={handleInputChange}
                  placeholder="https://example.com/banner.jpg (optional)"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_public"
                  checked={formData.is_public}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_public: checked }))
                  }
                />
                <label htmlFor="is_public" className="text-sm font-medium">
                  Public series (visible to players)
                </label>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingSeries ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Trophy className="h-8 w-8 text-blue-600" />
              <h2 className="text-3xl font-bold text-gray-900">Series</h2>
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={handleCreate}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Series
              </Button>
            </div>
          </div>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2 text-red-700">
                <Trophy className="h-5 w-5" />
                <p className="font-medium">Error loading series</p>
              </div>
              <p className="text-red-600 text-sm mt-2">
                Please try refreshing the page or contact support if the problem
                persists. You can still create new series using the button
                above.
              </p>
            </CardContent>
          </Card>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingSeries ? "Edit Series" : "Create New Series"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Series Name
                </label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter series name"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Description
                </label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter series description (optional)"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="banner_image_url"
                  className="text-sm font-medium"
                >
                  Banner Image URL
                </label>
                <Input
                  id="banner_image_url"
                  name="banner_image_url"
                  type="url"
                  value={formData.banner_image_url}
                  onChange={handleInputChange}
                  placeholder="https://example.com/banner.jpg (optional)"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_public"
                  checked={formData.is_public}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_public: checked }))
                  }
                />
                <label htmlFor="is_public" className="text-sm font-medium">
                  Public series (visible to players)
                </label>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingSeries ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Trophy className="h-8 w-8 text-blue-600" />
            <h2 className="text-3xl font-bold text-gray-900">Series</h2>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="text-sm">
              {series?.length || 0} {series?.length === 1 ? "series" : "series"}
            </Badge>
            <Button onClick={handleCreate} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Series
            </Button>
          </div>
        </div>

        {!series || series.length === 0 ? (
          <Card className="border-dashed border-2 border-gray-300">
            <CardContent className="p-12 text-center">
              <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No series yet
              </h3>
              <p className="text-gray-600">
                Create series to organize multiple competitions into
                tournaments.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {series.map((seriesItem) => (
              <Card
                key={seriesItem.id}
                className="hover:shadow-lg transition-shadow duration-200"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-blue-600" />
                        {seriesItem.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          #{seriesItem.id}
                        </Badge>
                        <Badge
                          variant={
                            seriesItem.is_public ? "default" : "secondary"
                          }
                          className="text-xs flex items-center gap-1"
                        >
                          {seriesItem.is_public ? (
                            <Eye className="h-3 w-3" />
                          ) : (
                            <EyeOff className="h-3 w-3" />
                          )}
                          {seriesItem.is_public ? "Public" : "Private"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(seriesItem)}
                        className="h-8 w-8"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(seriesItem)}
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {seriesItem.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {seriesItem.description}
                    </p>
                  )}
                  {seriesItem.banner_image_url && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                      <Image className="h-4 w-4" />
                      <span>Has banner image</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <Link
                        to={`/admin/series/${seriesItem.id}`}
                        className="flex items-center gap-1 hover:text-blue-600"
                      >
                        <Settings className="h-4 w-4" />
                        <span>Admin</span>
                      </Link>
                      <button
                        onClick={() => handleManageTeams(seriesItem)}
                        className="flex items-center gap-1 hover:text-blue-600"
                      >
                        <Users className="h-4 w-4" />
                        <span>Manage Teams</span>
                      </button>
                      <Link
                        to={`/admin/competitions?series=${seriesItem.id}`}
                        className="flex items-center gap-1 hover:text-blue-600"
                      >
                        <Calendar className="h-4 w-4" />
                        <span>Competitions</span>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSeries ? "Edit Series" : "Create New Series"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Series Name
              </label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter series name"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter series description (optional)"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="banner_image_url" className="text-sm font-medium">
                Banner Image URL
              </label>
              <Input
                id="banner_image_url"
                name="banner_image_url"
                type="url"
                value={formData.banner_image_url}
                onChange={handleInputChange}
                placeholder="https://example.com/banner.jpg (optional)"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_public"
                checked={formData.is_public}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, is_public: checked }))
                }
              />
              <label htmlFor="is_public" className="text-sm font-medium">
                Public series (visible to players)
              </label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingSeries ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showTeamDialog} onOpenChange={setShowTeamDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Manage Teams - {managingTeamsForSeries?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Current Teams */}
            <div>
              <h3 className="text-lg font-medium mb-3">Teams in Series</h3>
              {seriesTeams && seriesTeams.length > 0 ? (
                <div className="space-y-2">
                  {seriesTeams.map((team: Team) => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">{team.name}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveTeam(team.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">
                  No teams in this series yet.
                </p>
              )}
            </div>

            {/* Available Teams */}
            <div>
              <h3 className="text-lg font-medium mb-3">Available Teams</h3>
              {availableTeams && availableTeams.length > 0 ? (
                <div className="space-y-2">
                  {availableTeams.map((team: Team) => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-600" />
                        <span className="font-medium">{team.name}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddTeam(team.id)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        Add to Series
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">
                  All teams are already in this series.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowTeamDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

```

# frontend/src/views/admin/SeriesDetail.tsx

```tsx
import { useState, useEffect } from "react";
import { Link, useParams } from "@tanstack/react-router";
import {
  useSingleSeries,
  useUpdateSeries,
  useSeriesTeams,
  useAvailableTeams,
  useAddTeamToSeries,
  useRemoveTeamFromSeries,
  useSeriesDocuments,
  useCreateSeriesDocument,
  useUpdateSeriesDocument,
  useDeleteSeriesDocument,
  type SeriesDocument,
} from "@/api/series";
import { type Team } from "@/api/teams";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Edit,
  Save,
  Plus,
  Trash2,
  Users,
  FileText,
  Settings,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MarkdownEditor from "@/components/MarkdownEditor";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function AdminSeriesDetail() {
  const { serieId } = useParams({ from: "/admin/series/$serieId" });
  const seriesId = parseInt(serieId);

  // API hooks
  const { data: series, isLoading: seriesLoading } = useSingleSeries(seriesId);
  const updateSeries = useUpdateSeries();
  const { data: seriesTeams } = useSeriesTeams(seriesId);
  const { data: availableTeams } = useAvailableTeams(seriesId);
  const addTeamToSeries = useAddTeamToSeries();
  const removeTeamFromSeries = useRemoveTeamFromSeries();
  const { data: documents } = useSeriesDocuments(seriesId);
  const createDocument = useCreateSeriesDocument();
  const updateDocument = useUpdateSeriesDocument();
  const deleteDocument = useDeleteSeriesDocument();

  // Local state
  const [activeTab, setActiveTab] = useState<
    "settings" | "teams" | "documents"
  >("settings");
  const [isEditingBasic, setIsEditingBasic] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    banner_image_url: "",
    is_public: true,
    landing_document_id: undefined as number | undefined,
  });

  // Document management state
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [editingDocument, setEditingDocument] = useState<SeriesDocument | null>(
    null
  );
  const [documentForm, setDocumentForm] = useState({
    title: "",
    content: "",
  });

  // Initialize form data when series loads
  useEffect(() => {
    if (series) {
      setFormData({
        name: series.name,
        banner_image_url: series.banner_image_url || "",
        is_public: series.is_public,
        landing_document_id: series.landing_document_id,
      });
    }
  }, [series]);

  // Fix scrolling issue when document dialog closes
  useEffect(() => {
    if (!showDocumentDialog) {
      // Reset body overflow when dialog closes
      document.body.style.overflow = "";
    }
  }, [showDocumentDialog]);

  // Cleanup body overflow on component unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleBasicInfoSave = async () => {
    if (!series) return;
    try {
      await updateSeries.mutateAsync({
        id: series.id,
        data: {
          name: formData.name,
          banner_image_url: formData.banner_image_url || undefined,
          is_public: formData.is_public,
          landing_document_id: formData.landing_document_id,
        },
      });
      setIsEditingBasic(false);
    } catch (error) {
      console.error("Failed to update series:", error);
      alert("Failed to update series. Please try again.");
    }
  };

  const handleAddTeam = async (teamId: number) => {
    try {
      await addTeamToSeries.mutateAsync({
        seriesId,
        teamId,
      });
    } catch (error) {
      console.error("Failed to add team to series:", error);
      alert("Failed to add team to series. Please try again.");
    }
  };

  const handleRemoveTeam = async (teamId: number) => {
    try {
      await removeTeamFromSeries.mutateAsync({
        seriesId,
        teamId,
      });
    } catch (error) {
      console.error("Failed to remove team from series:", error);
      alert("Failed to remove team from series. Please try again.");
    }
  };

  const handleCreateDocument = () => {
    setEditingDocument(null);
    setDocumentForm({ title: "", content: "" });
    setShowDocumentDialog(true);
  };

  const handleEditDocument = (document: SeriesDocument) => {
    setEditingDocument(document);
    setDocumentForm({ title: document.title, content: document.content });
    setShowDocumentDialog(true);
  };

  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDocument) {
        await updateDocument.mutateAsync({
          seriesId,
          documentId: editingDocument.id,
          data: documentForm,
        });
      } else {
        await createDocument.mutateAsync({
          seriesId,
          data: documentForm,
        });
      }
      setShowDocumentDialog(false);
    } catch (error) {
      console.error("Failed to save document:", error);
      alert("Failed to save document. Please try again.");
    }
  };

  const handleDeleteDocument = async (document: SeriesDocument) => {
    if (!series) return;

    const isLandingPage = series.landing_document_id === document.id;
    const confirmMessage = isLandingPage
      ? `Are you sure you want to delete "${document.title}"? This is currently set as the landing page and will be unset.`
      : `Are you sure you want to delete "${document.title}"?`;

    if (window.confirm(confirmMessage)) {
      try {
        // If deleting the landing page document, unset it first
        if (isLandingPage) {
          await updateSeries.mutateAsync({
            id: series.id,
            data: {
              landing_document_id: undefined,
            },
          });
          setFormData((prev) => ({
            ...prev,
            landing_document_id: undefined,
          }));
        }

        await deleteDocument.mutateAsync({
          seriesId,
          documentId: document.id,
        });
      } catch (error) {
        console.error("Failed to delete document:", error);
        alert("Failed to delete document. Please try again.");
      }
    }
  };

  if (seriesLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-[300px]" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!series) {
    return <div>Series not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/admin/series"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Series
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{series.name}</h1>
            <p className="text-gray-600">Series #{series.id}</p>
          </div>
        </div>
        <Badge variant={series.is_public ? "default" : "secondary"}>
          {series.is_public ? "Public" : "Private"}
        </Badge>
      </div>

      {/* Main content */}
      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          setActiveTab(value as "settings" | "teams" | "documents")
        }
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="teams" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Teams
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Basic Information</CardTitle>
                {isEditingBasic ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditingBasic(false);
                        setFormData({
                          name: series.name,
                          banner_image_url: series.banner_image_url || "",
                          is_public: series.is_public,
                          landing_document_id: series.landing_document_id,
                        });
                      }}
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleBasicInfoSave}>
                      <Save className="h-4 w-4" />
                      Save
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingBasic(true)}
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Series Name
                </label>
                {isEditingBasic ? (
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Enter series name"
                  />
                ) : (
                  <p className="text-sm text-gray-900">{series.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="banner_image_url"
                  className="text-sm font-medium"
                >
                  Banner Image URL
                </label>
                {isEditingBasic ? (
                  <Input
                    id="banner_image_url"
                    type="url"
                    value={formData.banner_image_url}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        banner_image_url: e.target.value,
                      }))
                    }
                    placeholder="https://example.com/banner.jpg"
                  />
                ) : (
                  <p className="text-sm text-gray-900">
                    {series.banner_image_url || "No banner image set"}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_public"
                  checked={
                    isEditingBasic ? formData.is_public : series.is_public
                  }
                  onCheckedChange={
                    isEditingBasic
                      ? (checked) =>
                          setFormData((prev) => ({
                            ...prev,
                            is_public: checked,
                          }))
                      : undefined
                  }
                  disabled={!isEditingBasic}
                />
                <label htmlFor="is_public" className="text-sm font-medium">
                  Public series (visible to players)
                </label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Teams in Series</CardTitle>
              </CardHeader>
              <CardContent>
                {seriesTeams && seriesTeams.length > 0 ? (
                  <div className="space-y-2">
                    {seriesTeams.map((team: Team) => (
                      <div
                        key={team.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">{team.name}</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveTeam(team.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">
                    No teams in this series yet.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Available Teams</CardTitle>
              </CardHeader>
              <CardContent>
                {availableTeams && availableTeams.length > 0 ? (
                  <div className="space-y-2">
                    {availableTeams.map((team: Team) => (
                      <div
                        key={team.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-600" />
                          <span className="font-medium">{team.name}</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddTeam(team.id)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          Add to Series
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">
                    All teams are already in this series.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          {/* Landing Page Settings Section */}
          <Card>
            <CardHeader>
              <CardTitle>Landing Page Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="landing-document"
                  className="text-sm font-medium"
                >
                  Landing Page Document
                </label>
                <select
                  id="landing-document"
                  value={formData.landing_document_id || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      landing_document_id: value ? parseInt(value) : undefined,
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">None (use series description)</option>
                  {documents?.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.title}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">
                  Select which document players will see as the main content for
                  this series.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBasicInfoSave}
                  disabled={updateSeries.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Landing Page Settings
                </Button>
                {formData.landing_document_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreviewDialog(true)}
                  >
                    Preview
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Series Documents</h3>
            <Button onClick={handleCreateDocument}>
              <Plus className="h-4 w-4 mr-2" />
              Add Document
            </Button>
          </div>

          <div className="grid gap-4">
            {documents && documents.length > 0 ? (
              documents.map((document) => (
                <Card key={document.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">
                          {document.title}
                        </CardTitle>
                        {series?.landing_document_id === document.id && (
                          <Badge
                            variant="default"
                            className="bg-blue-100 text-blue-800 hover:bg-blue-100"
                          >
                            Landing Page
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditDocument(document)}
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteDocument(document)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-gray max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {document.content}
                      </ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No documents created yet.</p>
                  <Button
                    variant="outline"
                    onClick={handleCreateDocument}
                    className="mt-4"
                  >
                    Create your first document
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Document Dialog */}
      <Dialog open={showDocumentDialog} onOpenChange={setShowDocumentDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDocument ? "Edit Document" : "Create Document"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveDocument} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="document-title" className="text-sm font-medium">
                Document Title
              </label>
              <Input
                id="document-title"
                value={documentForm.title}
                onChange={(e) =>
                  setDocumentForm((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                placeholder="Enter document title"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="document-content" className="text-sm font-medium">
                Content (Markdown)
              </label>
              <MarkdownEditor
                value={documentForm.content}
                onChange={(content) =>
                  setDocumentForm((prev) => ({ ...prev, content }))
                }
                height={300}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDocumentDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingDocument ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Landing Page Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              This is how players will see the landing page for this series:
            </p>

            {(() => {
              const selectedDoc = documents?.find(
                (doc) => doc.id === formData.landing_document_id
              );

              if (!selectedDoc) {
                return (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <p className="text-gray-500">
                      No document selected for preview.
                    </p>
                  </div>
                );
              }

              return (
                <div className="border rounded-lg overflow-hidden">
                  {/* Preview header */}
                  <div className="bg-gray-50 border-b px-4 py-2">
                    <h3 className="font-medium text-gray-900">
                      {selectedDoc.title}
                    </h3>
                  </div>

                  {/* Preview content */}
                  <div className="p-6">
                    <div className="prose prose-gray max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {selectedDoc.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPreviewDialog(false)}
            >
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

```

# frontend/src/views/admin/Teams.tsx

```tsx
import { useState } from "react";
import {
  useTeams,
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,
  type Team,
} from "@/api/teams";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Shield, Calendar, Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

function TeamSkeleton() {
  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-[180px]" />
          <Skeleton className="h-5 w-[60px] rounded-full" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-[120px]" />
      </CardContent>
    </Card>
  );
}

function getTeamColor(index: number) {
  const colors = [
    {
      bg: "bg-blue-50",
      border: "border-l-blue-500",
      text: "text-blue-700",
      icon: "text-blue-600",
    },
    {
      bg: "bg-green-50",
      border: "border-l-green-500",
      text: "text-green-700",
      icon: "text-green-600",
    },
    {
      bg: "bg-purple-50",
      border: "border-l-purple-500",
      text: "text-purple-700",
      icon: "text-purple-600",
    },
    {
      bg: "bg-orange-50",
      border: "border-l-orange-500",
      text: "text-orange-700",
      icon: "text-orange-600",
    },
    {
      bg: "bg-pink-50",
      border: "border-l-pink-500",
      text: "text-pink-700",
      icon: "text-pink-600",
    },
    {
      bg: "bg-teal-50",
      border: "border-l-teal-500",
      text: "text-teal-700",
      icon: "text-teal-600",
    },
    {
      bg: "bg-indigo-50",
      border: "border-l-indigo-500",
      text: "text-indigo-700",
      icon: "text-indigo-600",
    },
    {
      bg: "bg-red-50",
      border: "border-l-red-500",
      text: "text-red-700",
      icon: "text-red-600",
    },
  ];
  return colors[index % colors.length];
}

export default function Teams() {
  const { data: teams, isLoading, error } = useTeams();
  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();
  const deleteTeam = useDeleteTeam();

  const [showDialog, setShowDialog] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamName, setTeamName] = useState("");

  const handleCreate = () => {
    setEditingTeam(null);
    setTeamName("");
    setShowDialog(true);
  };

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setTeamName(team.name);
    setShowDialog(true);
  };

  const handleDelete = async (team: Team) => {
    if (
      window.confirm(`Are you sure you want to delete team "${team.name}"?`)
    ) {
      try {
        await deleteTeam.mutateAsync(team.id);
      } catch (error) {
        console.error("Failed to delete team:", error);
        alert("Failed to delete team. Please try again.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      if (editingTeam) {
        await updateTeam.mutateAsync({
          id: editingTeam.id,
          data: { name: teamName },
        });
      } else {
        await createTeam.mutateAsync({ name: teamName });
      }
      setShowDialog(false);
    } catch (error) {
      console.error("Failed to save team:", error);
      alert("Failed to save team. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2 mb-6">
          <Users className="h-8 w-8 text-green-600" />
          <h2 className="text-3xl font-bold text-gray-900">Teams</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <TeamSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-700">
            <Users className="h-5 w-5" />
            <p className="font-medium">Error loading teams</p>
          </div>
          <p className="text-red-600 text-sm mt-2">
            Please try refreshing the page or contact support if the problem
            persists.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="h-8 w-8 text-green-600" />
          <h2 className="text-3xl font-bold text-gray-900">Teams</h2>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="text-sm">
            {teams?.length || 0} {teams?.length === 1 ? "team" : "teams"}
          </Badge>
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Team
          </Button>
        </div>
      </div>

      {!teams || teams.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No teams yet
            </h3>
            <p className="text-gray-600">
              Create teams to organize your golf competition participants.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team, index) => {
            const colors = getTeamColor(index);
            return (
              <Card
                key={team.id}
                className={`hover:shadow-lg transition-shadow duration-200 border-l-4 ${colors.border} ${colors.bg}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle
                      className={`text-lg ${colors.text} flex items-center gap-2`}
                    >
                      <Shield className={`h-5 w-5 ${colors.icon}`} />
                      {team.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        #{team.id}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(team)}
                        className="h-8 w-8"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(team)}
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>Poäng:</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTeam ? "Edit Team" : "Create New Team"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Team Name
              </label>
              <Input
                id="name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter team name"
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit">{editingTeam ? "Update" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

```

# frontend/src/views/player/CompetitionDetail.tsx

```tsx
import { useState, useEffect, useCallback } from "react";
import { Link, useParams, useSearch } from "@tanstack/react-router";
import {
  useCompetition,
  useCompetitionLeaderboard,
} from "../../api/competitions";
import { useCourse } from "../../api/courses";
import { useTeeTimesForCompetition, useParticipant } from "../../api/tee-times";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Trophy,
  Medal,
  Edit3,
} from "lucide-react";
import { HamburgerMenu } from "../../components/navigation";
import { ParticipantScorecard } from "../../components/scorecard";
import type { ParticipantData, CourseData } from "../../components/scorecard";
import {
  ParticipantsListComponent,
  LeaderboardComponent,
  TeamResultComponent,
} from "../../components/competition";
import {
  calculateTeamResults,
  calculateTotalParticipants,
} from "../../utils/scoreCalculations";
import { CommonHeader } from "../../components/navigation/CommonHeader";

type TabType = "startlist" | "leaderboard" | "teamresult";

export default function CompetitionDetail() {
  const { competitionId } = useParams({ strict: false });
  const searchParams = useSearch({ strict: false });

  // Check if we came from score entry
  const fromTeeTime = searchParams?.fromTeeTime;

  // Check for hash-based navigation to set initial tab
  const getInitialTab = (): TabType => {
    const hash = window.location.hash.replace("#", "");
    if (hash === "leaderboard") return "leaderboard";
    if (hash === "teamresult") return "teamresult";
    return "startlist";
  };

  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab);

  // Scorecard modal state
  const [selectedParticipantId, setSelectedParticipantId] = useState<
    number | null
  >(null);

  const { data: competition, isLoading: competitionLoading } = useCompetition(
    competitionId ? parseInt(competitionId) : 0
  );
  const { data: course } = useCourse(competition?.course_id || 0);
  const {
    data: teeTimes,
    isLoading: teeTimesLoading,
    refetch: refetchTeeTimes,
  } = useTeeTimesForCompetition(competitionId ? parseInt(competitionId) : 0);
  const {
    data: leaderboard,
    isLoading: leaderboardLoading,
    refetch: refetchLeaderboard,
  } = useCompetitionLeaderboard(competitionId ? parseInt(competitionId) : 0);

  // Fetch selected participant data for scorecard
  const { data: selectedParticipant } = useParticipant(
    selectedParticipantId || 0
  );

  // Handle opening participant scorecard
  const handleParticipantClick = (participantId: number) => {
    setSelectedParticipantId(participantId);
  };

  // Handle closing participant scorecard
  const handleCloseScorecardModal = () => {
    setSelectedParticipantId(null);
  };

  // Clean navigation with proper browser history back
  const handleBackNavigation = useCallback(() => {
    // Use browser's native history back for reliable single-step navigation
    window.history.back();
  }, []);

  // Create course data format for scorecard component
  const scorecardCourseData: CourseData | null =
    teeTimes && teeTimes.length > 0 && course
      ? {
          id: course.id.toString(),
          name: course.name,
          holes: teeTimes[0].pars.map((par: number, index: number) => ({
            number: index + 1,
            par,
          })),
        }
      : null;

  // Convert selected participant to scorecard format
  const scorecardParticipantData: ParticipantData | null = selectedParticipant
    ? {
        id: selectedParticipant.id,
        team_name: selectedParticipant.team_name,
        position_name: selectedParticipant.position_name,
        player_names: selectedParticipant.player_names,
        score: selectedParticipant.score,
        tee_time_id: selectedParticipant.tee_time_id,
      }
    : null;

  // ... existing useEffect for hash changes ...
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash === "leaderboard") setActiveTab("leaderboard");
      else if (hash === "teamresult") setActiveTab("teamresult");
      else setActiveTab("startlist");
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Fetch fresh data when first entering leaderboard or team results views
  useEffect(() => {
    if (activeTab === "leaderboard" || activeTab === "teamresult") {
      // Check if we haven't fetched data for this view recently
      const lastFetchKey = `lastFetch-${activeTab}-${competitionId}`;
      const lastFetch = sessionStorage.getItem(lastFetchKey);
      const timeSinceLastFetch = lastFetch
        ? Date.now() - parseInt(lastFetch)
        : Infinity;

      if (timeSinceLastFetch > 10000) {
        // Only if it's been more than 10 seconds
        console.log(`Initial fetch for ${activeTab} view...`);
        refetchLeaderboard();
        if (activeTab === "teamresult") {
          refetchTeeTimes(); // Team results also need tee times data
        }
        sessionStorage.setItem(lastFetchKey, Date.now().toString());
      }
    }
  }, [activeTab, competitionId, refetchLeaderboard, refetchTeeTimes]);

  // Periodic sync for leaderboard and team results data
  useEffect(() => {
    if (!competitionId) return;

    // Only run periodic sync when viewing leaderboard or team results
    if (activeTab !== "leaderboard" && activeTab !== "teamresult") return;

    const syncInterval = setInterval(() => {
      console.log(`Periodic sync for ${activeTab} view...`);
      refetchLeaderboard();
      if (activeTab === "teamresult") {
        refetchTeeTimes(); // Team results data comes from teeTimes
      }
    }, 30000); // Sync every 30 seconds

    return () => clearInterval(syncInterval);
  }, [activeTab, competitionId, refetchLeaderboard, refetchTeeTimes]);

  if (competitionLoading)
    return (
      <div className="p-4 text-charcoal font-primary">
        Loading competition...
      </div>
    );
  if (!competition)
    return (
      <div className="p-4 text-charcoal font-primary">
        Competition not found
      </div>
    );

  const totalParticipants = calculateTotalParticipants(teeTimes);

  // Calculate team results
  const sortedTeamResults = leaderboard
    ? calculateTeamResults(
        leaderboard.map((entry) => ({
          ...entry,
          participantId: entry.participant.id,
        }))
      )
    : [];

  return (
    <div className="min-h-screen flex flex-col bg-scorecard">
      <CommonHeader onBackClick={handleBackNavigation}>
        <div className="flex items-center gap-4">
          {/* Back to Score Entry button */}
          {fromTeeTime && (
            <Link
              to={`/player/competitions/${competitionId}/tee-times/${fromTeeTime}`}
              className="flex items-center gap-2 px-3 py-2 bg-coral text-scorecard rounded-xl hover:bg-[#E8890A] hover:-translate-y-0.5 transition-all duration-200 text-sm font-medium font-primary border border-coral"
            >
              <Edit3 className="h-4 w-4" />
              <span className="hidden sm:inline">Back to</span>
              <span>Score</span>
            </Link>
          )}
          <HamburgerMenu />
        </div>
      </CommonHeader>

      <div className="flex-1 space-y-4 md:space-y-6 p-4 md:p-6">
        {/* Competition Title */}
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-fairway font-display">
            {competition.name}
          </h1>
        </div>

        {/* Competition Info Header with TapScore Styling */}
        <div className="bg-rough bg-opacity-30 rounded-xl p-4 border border-soft-grey">
          <div className="flex items-center justify-center gap-4 md:gap-8 text-xs md:text-sm text-charcoal font-primary">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 md:h-4 md:w-4 text-turf" />
              <span className="hidden sm:inline">
                {new Date(competition.date).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              <span className="sm:hidden">
                {new Date(competition.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3 md:h-4 md:w-4 text-turf" />
              <span className="truncate">{course?.name || "Loading..."}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 md:h-4 md:w-4 text-turf" />
              <span>{totalParticipants} participants</span>
            </div>
          </div>
        </div>

        {/* Tabs with TapScore Styling */}
        <div className="border-b border-soft-grey">
          <nav className="flex space-x-4 md:space-x-8">
            <button
              onClick={() => {
                setActiveTab("startlist");
                window.location.hash = "";
              }}
              className={`flex items-center gap-1 md:gap-2 py-3 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm transition-colors font-primary
                ${
                  activeTab === "startlist"
                    ? "border-coral text-coral"
                    : "border-transparent text-charcoal hover:text-turf hover:border-rough"
                }
              `}
            >
              <Clock className="h-3 w-3 md:h-4 md:w-4" />
              Start List
            </button>
            <button
              onClick={() => {
                setActiveTab("leaderboard");
                window.location.hash = "leaderboard";
                // Immediately fetch fresh data when switching to leaderboard
                console.log("Syncing data for leaderboard view...");
                refetchLeaderboard();
              }}
              className={`flex items-center gap-1 md:gap-2 py-3 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm transition-colors font-primary
                ${
                  activeTab === "leaderboard"
                    ? "border-coral text-coral"
                    : "border-transparent text-charcoal hover:text-turf hover:border-rough"
                }
              `}
            >
              <Trophy className="h-3 w-3 md:h-4 md:w-4" />
              Leaderboard
            </button>
            <button
              onClick={() => {
                setActiveTab("teamresult");
                window.location.hash = "teamresult";
                // Immediately fetch fresh data when switching to team results
                console.log("Syncing data for team results view...");
                refetchLeaderboard();
                refetchTeeTimes();
              }}
              className={`flex items-center gap-1 md:gap-2 py-3 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm transition-colors font-primary
                ${
                  activeTab === "teamresult"
                    ? "border-coral text-coral"
                    : "border-transparent text-charcoal hover:text-turf hover:border-rough"
                }
              `}
            >
              <Medal className="h-3 w-3 md:h-4 md:w-4" />
              Team Result
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "startlist" && (
          <ParticipantsListComponent
            teeTimes={teeTimes}
            teeTimesLoading={teeTimesLoading}
            competitionId={competitionId}
          />
        )}

        {activeTab === "leaderboard" && (
          <LeaderboardComponent
            leaderboard={leaderboard}
            leaderboardLoading={leaderboardLoading}
            onParticipantClick={handleParticipantClick}
          />
        )}

        {activeTab === "teamresult" && (
          <TeamResultComponent
            teamResults={sortedTeamResults}
            leaderboardLoading={leaderboardLoading}
          />
        )}
      </div>

      {/* Participant Scorecard Modal */}
      <ParticipantScorecard
        visible={selectedParticipantId !== null}
        participant={scorecardParticipantData}
        course={scorecardCourseData}
        onClose={handleCloseScorecardModal}
      />
    </div>
  );
}

```

# frontend/src/views/player/CompetitionRound.tsx

```tsx
// src/views/player/CompetitionRound.tsx

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { ScoreEntry } from "../../components/score-entry";
import {
  BottomTabNavigation,
  HoleNavigation,
  HamburgerMenu,
} from "../../components/navigation";
import { ParticipantScorecard } from "../../components/scorecard";
import type { ParticipantData, CourseData } from "../../components/scorecard";
import {
  ParticipantsListComponent,
  LeaderboardComponent,
  TeamResultComponent,
  CompetitionInfoBar,
} from "../../components/competition";
import {
  calculateTeamResults,
  calculateTotalParticipants,
} from "../../utils/scoreCalculations";
import {
  getInitialHole,
  rememberCurrentHole,
} from "../../utils/holeNavigation";
import { useCompetitionData } from "../../hooks/useCompetitionData";
import { useCompetitionSync } from "../../hooks/useCompetitionSync";
import {
  formatTeeTimeGroup,
  formatParticipantForScorecard,
} from "../../utils/participantFormatting";
import { formatCourseFromTeeTime } from "../../utils/courseFormatting";
import type { TeeTime } from "@/api/tee-times";
import { CommonHeader } from "../../components/navigation/CommonHeader";

type TabType = "score" | "leaderboard" | "teams" | "participants";

export default function CompetitionRound() {
  const { competitionId, teeTimeId } = useParams({ strict: false });
  const navigate = useNavigate();

  // Determine initial tab based on URL and params
  const getInitialTab = (): TabType => {
    if (teeTimeId) return "score"; // If we have a tee time, start with score entry
    const hash = window.location.hash.replace("#", "");
    if (hash === "teams") return "teams";
    if (hash === "participants") return "participants";
    return "leaderboard"; // Default to leaderboard if no tee time
  };

  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab);

  // Scorecard modal state
  const [selectedParticipantId, setSelectedParticipantId] = useState<
    number | null
  >(null);

  // Smart hole navigation - initialize with default
  const [currentHole, setCurrentHole] = useState(1);

  // Custom hooks for data and sync management
  const {
    competition,
    course,
    teeTimes,
    leaderboard,
    teeTime,
    selectedParticipant,
    isLoading: competitionLoading,
    leaderboardLoading,
    refetchTeeTime,
    refetchLeaderboard,
    refetchTeeTimes,
    updateScoreMutation,
  } = useCompetitionData({
    competitionId,
    teeTimeId,
    selectedParticipantId,
  });

  const {
    syncStatus,
    handleScoreUpdate,
    handleTabChangeSync,
    handleHoleNavigationSync,
  } = useCompetitionSync({
    competitionId,
    teeTimeId,
    activeTab,
    refetchTeeTime,
    refetchLeaderboard,
    refetchTeeTimes,
    updateScoreMutation,
    teeTime,
  });

  // Update currentHole when teeTime data first loads
  useEffect(() => {
    if (teeTime?.participants && teeTimeId) {
      setCurrentHole(getInitialHole(teeTimeId, teeTime.participants));
    }
  }, [teeTime?.participants, teeTimeId]);

  // Remember current hole in session storage
  useEffect(() => {
    if (teeTimeId && currentHole) {
      rememberCurrentHole(teeTimeId, currentHole);
    }
  }, [teeTimeId, currentHole]);

  // Format data using utility functions
  const teeTimeGroup = formatTeeTimeGroup(teeTime);
  const courseData = formatCourseFromTeeTime(teeTime, course);
  const scorecardParticipantData: ParticipantData | null =
    formatParticipantForScorecard(selectedParticipant || null);

  // Create course data format for scorecard component
  const scorecardCourseData: CourseData | null =
    teeTime && course
      ? {
          id: course.id.toString(),
          name: course.name,
          holes: teeTime.pars.map((par: number, index: number) => ({
            number: index + 1,
            par,
          })),
        }
      : null;

  // Handle tab changes and URL updates
  const handleTabChange = async (tab: TabType) => {
    setActiveTab(tab);
    await handleTabChangeSync(tab);
  };

  // Handle opening participant scorecard
  const handleParticipantClick = (participantId: number) => {
    setSelectedParticipantId(participantId);
  };

  // Handle closing participant scorecard
  const handleCloseScorecardModal = () => {
    setSelectedParticipantId(null);
  };

  const handleComplete = () => {
    console.log("Score entry completed!");
  };

  // Handle hole navigation with sync
  const handleHoleChange = useCallback(
    async (newHole: number) => {
      setCurrentHole(newHole);
      await handleHoleNavigationSync(newHole);
    },
    [handleHoleNavigationSync]
  );

  // Calculate team results and participant counts
  const sortedTeamResults = leaderboard
    ? calculateTeamResults(
        leaderboard.map((entry) => ({
          ...entry,
          participantId: entry.participant.id,
        }))
      )
    : [];

  const totalParticipants = calculateTotalParticipants(teeTimes);

  const currentHoleData = courseData?.holes.find(
    (h: { number: number; par: number }) => h.number === currentHole
  );

  if (competitionLoading)
    return <div className="p-4">Loading competition...</div>;
  if (!competition) return <div className="p-4">Competition not found</div>;

  // Render main content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case "score":
        if (!teeTimeGroup || !courseData) {
          return (
            <InvalidTeeTimes
              teeTimes={teeTimes || []}
              competitionId={competitionId || ""}
            />
          );
        }
        return (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-hidden">
              <ScoreEntry
                teeTimeGroup={teeTimeGroup}
                course={courseData}
                onScoreUpdate={handleScoreUpdate}
                onComplete={handleComplete}
                currentHole={currentHole}
                onHoleChange={handleHoleChange}
                syncStatus={syncStatus}
              />
            </div>
          </div>
        );

      case "leaderboard":
        return (
          <LeaderboardComponent
            leaderboard={leaderboard}
            leaderboardLoading={leaderboardLoading}
            onParticipantClick={handleParticipantClick}
            isRoundView={true}
          />
        );

      case "teams":
        return (
          <TeamResultComponent
            teamResults={sortedTeamResults}
            leaderboardLoading={leaderboardLoading}
            isRoundView={true}
          />
        );

      case "participants":
        return (
          <ParticipantsListComponent
            teeTimes={teeTimes}
            teeTimesLoading={false}
            competitionId={competitionId || ""}
            currentTeeTimeId={teeTimeId}
            currentTeeTime={teeTime}
            showCurrentGroup={true}
            totalParticipants={totalParticipants}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <CommonHeader
        title={competition.name}
        onBackClick={() =>
          navigate({
            to: `/player/competitions/${competitionId}`,
            replace: true,
          })
        }
      >
        <HamburgerMenu />
      </CommonHeader>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">{renderContent()}</div>

      {/* Hole Navigation - only show during score entry */}
      {activeTab === "score" && currentHoleData && (
        <HoleNavigation
          currentHole={currentHole}
          holePar={currentHoleData.par}
          onPrevious={() => handleHoleChange(Math.max(1, currentHole - 1))}
          onNext={() => handleHoleChange(Math.min(18, currentHole + 1))}
          canGoPrevious={currentHole > 1}
          canGoNext={currentHole < 18}
          className="flex-shrink-0"
        />
      )}

      {/* Bottom Tab Navigation - Always visible and sticky */}
      <BottomTabNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        className="flex-shrink-0"
      />

      {/* Competition Info Footer - Always visible and sticky */}
      <CompetitionInfoBar
        competition={competition}
        courseName={course?.name}
        totalParticipants={totalParticipants}
        variant="footer"
      />

      {/* Participant Scorecard Modal */}
      <ParticipantScorecard
        visible={selectedParticipantId !== null}
        participant={scorecardParticipantData}
        course={scorecardCourseData}
        onClose={handleCloseScorecardModal}
      />
    </div>
  );
}

function InvalidTeeTimes({
  teeTimes,
  competitionId,
}: {
  teeTimes: TeeTime[];
  competitionId: string;
}) {
  const navigate = useNavigate();
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900">
            Select Tee Time for Score Entry
          </h2>
        </div>

        {!teeTimes || teeTimes.length === 0 ? (
          <div className="text-center py-6 md:py-8 text-gray-500">
            No tee times available for this competition.
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-200">
              {teeTimes.map((teeTime) => (
                <button
                  key={teeTime.id}
                  onClick={() =>
                    navigate({
                      to: `/player/competitions/${competitionId}/tee-times/${teeTime.id}`,
                      replace: true,
                    })
                  }
                  className="w-full px-4 md:px-6 py-3 md:py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm md:text-lg font-medium text-gray-900">
                        {teeTime.teetime}
                      </h4>
                      <p className="text-xs md:text-sm text-gray-600 mt-1">
                        {teeTime.participants
                          .map((p) => p.team_name)
                          .join(", ")}
                      </p>
                    </div>
                    <div className="text-xs text-gray-500">
                      {teeTime.participants.length} player
                      {teeTime.participants.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

```

# frontend/src/views/player/Competitions.tsx

```tsx
import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  useCompetitions,
  useCompetitionLeaderboard,
  type Competition,
} from "../../api/competitions";
import { useCourses, type Course } from "../../api/courses";
import {
  Calendar,
  Users,
  MapPin,
  Trophy,
  Award,
  Search,
  Eye,
} from "lucide-react";
import { CommonHeader } from "../../components/navigation/CommonHeader";

type FilterStatus = "all" | "upcoming" | "live" | "completed";

interface CompetitionStatus {
  status: FilterStatus;
  label: string;
  daysText?: string;
  color: string;
  bgColor: string;
  gradientClass: string;
}

// Loading skeleton components
function CompetitionCardSkeleton() {
  return (
    <div className="bg-scorecard rounded-xl border border-soft-grey overflow-hidden animate-pulse">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-soft-grey rounded-xl flex-shrink-0"></div>
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="h-6 bg-soft-grey rounded w-48"></div>
              <div className="h-6 bg-soft-grey rounded w-20"></div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="h-4 bg-soft-grey rounded w-32"></div>
              <div className="h-4 bg-soft-grey rounded w-28"></div>
              <div className="h-4 bg-soft-grey rounded w-24"></div>
            </div>
            <div className="flex items-center justify-between">
              <div className="h-4 bg-soft-grey rounded w-40"></div>
              <div className="h-10 bg-soft-grey rounded w-32"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveCompetitionSkeleton() {
  return (
    <div className="bg-scorecard rounded-xl border shadow-lg overflow-hidden animate-pulse">
      <div className="h-48 bg-soft-grey relative"></div>
      <div className="p-6">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <div className="h-6 bg-soft-grey rounded w-32"></div>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex justify-between p-3 rounded-lg animate-pulse"
                  style={{ backgroundColor: "rgba(206, 212, 218, 0.3)" }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-soft-grey rounded-full"></div>
                    <div className="h-4 bg-soft-grey rounded w-24"></div>
                  </div>
                  <div className="h-4 bg-soft-grey rounded w-8"></div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-6 bg-soft-grey rounded w-40"></div>
            <div className="space-y-3">
              <div className="h-2 bg-soft-grey rounded w-full"></div>
              <div className="space-y-1">
                <div className="h-4 bg-soft-grey rounded w-20"></div>
                <div className="h-4 bg-soft-grey rounded w-24"></div>
              </div>
              <div className="h-10 bg-soft-grey rounded w-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlayerCompetitions() {
  const { data: competitions, isLoading, error } = useCompetitions();
  const { data: courses } = useCourses();
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const getCourse = (courseId: number) => {
    return courses?.find((course) => course.id === courseId);
  };

  const getCompetitionStatus = (date: string): CompetitionStatus => {
    const competitionDate = new Date(date);
    const today = new Date();
    const diffTime = competitionDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        status: "completed",
        label: "Completed",
        color: "text-scorecard",
        bgColor: "bg-charcoal",
        gradientClass: "bg-gradient-to-br from-charcoal to-gray-600",
      };
    } else if (diffDays === 0) {
      return {
        status: "live",
        label: "Live",
        color: "text-scorecard",
        bgColor: "bg-flag",
        gradientClass: "bg-gradient-to-br from-flag to-red-600",
      };
    } else if (diffDays <= 7) {
      const days = diffDays === 1 ? "1 day" : `${diffDays} days`;
      return {
        status: "upcoming",
        label: `In ${days}`,
        daysText: `IN ${diffDays} DAY${diffDays > 1 ? "S" : ""}`,
        color: "text-scorecard",
        bgColor: "bg-coral",
        gradientClass: "bg-gradient-to-br from-coral to-orange-600",
      };
    } else {
      return {
        status: "upcoming",
        label: "Upcoming",
        daysText: "UPCOMING",
        color: "text-scorecard",
        bgColor: "bg-coral",
        gradientClass: "bg-gradient-to-br from-coral to-orange-600",
      };
    }
  };

  // Filter and categorize competitions
  const { filteredCompetitions, competitionStats, liveCompetitions } =
    useMemo(() => {
      if (!competitions) {
        return {
          filteredCompetitions: [],
          competitionStats: { all: 0, upcoming: 0, live: 0, completed: 0 },
          liveCompetitions: [],
        };
      }

      const live: typeof competitions = [];
      const upcoming: typeof competitions = [];
      const completed: typeof competitions = [];

      competitions.forEach((competition) => {
        const status = getCompetitionStatus(competition.date).status;
        if (status === "live") live.push(competition);
        else if (status === "upcoming") upcoming.push(competition);
        else if (status === "completed") completed.push(competition);
      });

      const stats = {
        all: competitions.length,
        upcoming: upcoming.length,
        live: live.length,
        completed: completed.length,
      };

      // Filter by status and search
      let filtered = competitions;
      if (statusFilter !== "all") {
        filtered = filtered.filter(
          (comp) => getCompetitionStatus(comp.date).status === statusFilter
        );
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (comp) =>
            comp.name.toLowerCase().includes(query) ||
            getCourse(comp.course_id)?.name.toLowerCase().includes(query)
        );
      }

      return {
        filteredCompetitions: filtered,
        competitionStats: stats,
        liveCompetitions: live,
      };
    }, [competitions, statusFilter, searchQuery, getCourse]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="bg-scorecard border-b shadow-sm">
          <div className="py-6">
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-2">
                <div className="h-8 bg-soft-grey rounded w-48 animate-pulse"></div>
                <div className="h-4 bg-soft-grey rounded w-64 animate-pulse"></div>
              </div>
              <div className="h-4 bg-soft-grey rounded w-32 animate-pulse"></div>
            </div>

            {/* Filter Tabs Skeleton */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-10 bg-soft-grey rounded-full w-24 animate-pulse"
                ></div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Competition Skeleton */}
        <div className="space-y-4">
          <div className="h-6 bg-soft-grey rounded w-32 animate-pulse"></div>
          <LiveCompetitionSkeleton />
        </div>

        {/* Regular Competitions Skeleton */}
        <div className="space-y-6">
          <div className="h-6 bg-soft-grey rounded w-40 animate-pulse"></div>
          <div className="grid gap-6">
            {[1, 2, 3].map((i) => (
              <CompetitionCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-flag mb-4">
          <Trophy className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-fairway mb-2 font-display">
          Error loading competitions
        </h3>
        <p className="text-turf font-primary">
          Please try refreshing the page or check your connection.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-scorecard">
      <CommonHeader />

      {/* Page Title & Filters */}
      <div className="bg-scorecard border-b shadow-sm">
        <div className="container mx-auto px-4">
          <div className="py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-charcoal font-display">
                  Competitions
                </h2>
                <p className="mt-1 text-charcoal opacity-70 font-primary">
                  Browse and join golf competitions
                </p>
              </div>
              <div className="text-sm text-turf font-primary">
                {competitionStats.all} competitions available
              </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-turf" />
                <input
                  type="text"
                  placeholder="Search competitions or courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-soft-grey rounded-lg focus:outline-none focus:ring-2 focus:ring-turf focus:border-turf font-primary"
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors font-primary ${
                  statusFilter === "all"
                    ? "bg-turf text-scorecard"
                    : "border border-soft-grey text-charcoal hover:bg-rough hover:bg-opacity-20"
                }`}
              >
                All{" "}
                <span
                  className={`ml-2 px-2 py-1 rounded-full text-xs ${
                    statusFilter === "all"
                      ? "bg-scorecard bg-opacity-20 text-scorecard"
                      : "bg-soft-grey text-charcoal"
                  }`}
                >
                  {competitionStats.all}
                </span>
              </button>
              <button
                onClick={() => setStatusFilter("upcoming")}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors font-primary ${
                  statusFilter === "upcoming"
                    ? "bg-turf text-scorecard"
                    : "border border-soft-grey text-charcoal hover:bg-rough hover:bg-opacity-20"
                }`}
              >
                Upcoming{" "}
                <span
                  className={`ml-2 px-2 py-1 rounded-full text-xs ${
                    statusFilter === "upcoming"
                      ? "bg-scorecard bg-opacity-20 text-scorecard"
                      : "bg-soft-grey text-charcoal"
                  }`}
                >
                  {competitionStats.upcoming}
                </span>
              </button>
              <button
                onClick={() => setStatusFilter("live")}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors font-primary ${
                  statusFilter === "live"
                    ? "bg-turf text-scorecard"
                    : "border border-soft-grey text-charcoal hover:bg-rough hover:bg-opacity-20"
                }`}
              >
                Live{" "}
                <span
                  className={`ml-2 px-2 py-1 rounded-full text-xs ${
                    statusFilter === "live"
                      ? "bg-scorecard bg-opacity-20 text-scorecard"
                      : "bg-soft-grey text-charcoal"
                  }`}
                >
                  {competitionStats.live}
                </span>
              </button>
              <button
                onClick={() => setStatusFilter("completed")}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors font-primary ${
                  statusFilter === "completed"
                    ? "bg-turf text-scorecard"
                    : "border border-soft-grey text-charcoal hover:bg-rough hover:bg-opacity-20"
                }`}
              >
                Completed{" "}
                <span
                  className={`ml-2 px-2 py-1 rounded-full text-xs ${
                    statusFilter === "completed"
                      ? "bg-scorecard bg-opacity-20 text-scorecard"
                      : "bg-soft-grey text-charcoal"
                  }`}
                >
                  {competitionStats.completed}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Featured Live Competition */}
        {liveCompetitions.length > 0 &&
          statusFilter !== "completed" &&
          statusFilter !== "upcoming" && (
            <div className="mb-8">
              <LiveCompetitionSection
                liveCompetitions={liveCompetitions}
                courses={courses}
              />
            </div>
          )}

        {/* Regular Competitions Grid */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-charcoal font-display">
            {statusFilter === "all"
              ? "All Competitions"
              : statusFilter === "live"
              ? "Live Competitions"
              : statusFilter === "upcoming"
              ? "Upcoming Competitions"
              : "Completed Competitions"}
          </h3>

          {filteredCompetitions.length === 0 ? (
            <EmptyState statusFilter={statusFilter} searchQuery={searchQuery} />
          ) : (
            <div className="grid gap-6">
              {filteredCompetitions.map((competition) => (
                <CompetitionCard
                  key={competition.id}
                  competition={competition}
                  course={getCourse(competition.course_id)}
                  status={getCompetitionStatus(competition.date)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Component for featured live competitions
function LiveCompetitionSection({
  liveCompetitions,
  courses,
}: {
  liveCompetitions: Competition[];
  courses: Course[] | undefined;
}) {
  // Use the first live competition as featured
  const featuredCompetition = liveCompetitions[0];
  const course = courses?.find((c) => c.id === featuredCompetition.course_id);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-charcoal font-display flex items-center gap-2">
        <div className="w-2 h-2 bg-flag rounded-full animate-pulse"></div>
        Live Now
      </h3>
      <LiveCompetitionCard competition={featuredCompetition} course={course} />
    </div>
  );
}

// Live competition featured card
function LiveCompetitionCard({
  competition,
  course,
}: {
  competition: Competition;
  course: Course | undefined;
}) {
  const { data: leaderboard, isLoading: leaderboardLoading } =
    useCompetitionLeaderboard(competition.id);

  return (
    <div className="bg-scorecard rounded-xl border shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className="relative">
        {/* Golf Course Background */}
        <div className="h-48 bg-gradient-to-br from-turf to-fairway relative overflow-hidden">
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(28, 28, 30, 0.2)" }}
          ></div>
          <div className="absolute top-4 left-4">
            <span className="bg-gradient-to-br from-flag to-red-600 text-scorecard text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1 font-primary">
              <div className="w-2 h-2 bg-scorecard rounded-full animate-pulse"></div>
              LIVE
            </span>
          </div>
          <div className="absolute bottom-4 left-4 text-scorecard">
            <h3 className="text-2xl font-bold font-display">
              {competition.name}
            </h3>
            <p className="opacity-90 font-primary">
              {course?.name} • Par {course?.pars?.total || 72}
            </p>
          </div>
          <div className="absolute bottom-4 right-4 text-scorecard text-right">
            <div className="text-3xl font-bold font-display">
              {competition.participant_count}
            </div>
            <div className="text-sm opacity-90 font-primary">Players</div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Leaderboard Preview */}
          <div className="md:col-span-2">
            <h4 className="font-semibold text-charcoal mb-3 font-display">
              Live Leaderboard
            </h4>
            {leaderboardLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex justify-between p-3 rounded-lg animate-pulse"
                    style={{ backgroundColor: "rgba(206, 212, 218, 0.3)" }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-soft-grey rounded-full"></div>
                      <div className="h-4 bg-soft-grey rounded w-24"></div>
                    </div>
                    <div className="h-4 bg-soft-grey rounded w-8"></div>
                  </div>
                ))}
              </div>
            ) : leaderboard && leaderboard.length > 0 ? (
              <div className="space-y-2">
                {leaderboard.slice(0, 3).map((entry, index) => (
                  <div
                    key={entry.participant.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      index === 0
                        ? "bg-yellow-50 border border-yellow-200"
                        : index === 1
                        ? "bg-gray-50 border border-gray-200"
                        : "bg-orange-50 border border-orange-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-scorecard text-xs font-bold ${
                          index === 0
                            ? "bg-yellow-500"
                            : index === 1
                            ? "bg-gray-400"
                            : "bg-orange-500"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <span className="font-medium text-charcoal font-primary">
                        {entry.participant.team_name}{" "}
                        {entry.participant.position_name}
                      </span>
                    </div>
                    <span
                      className={`font-bold ${
                        entry.relativeToPar < 0
                          ? "text-turf"
                          : entry.relativeToPar === 0
                          ? "text-charcoal"
                          : "text-flag"
                      } font-display`}
                    >
                      {entry.relativeToPar === 0
                        ? "E"
                        : entry.relativeToPar > 0
                        ? `+${entry.relativeToPar}`
                        : entry.relativeToPar}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-turf font-primary">
                No scores reported yet
              </div>
            )}
          </div>

          {/* Progress & Actions */}
          <div>
            <h4 className="font-semibold text-charcoal mb-3 font-display">
              Tournament Progress
            </h4>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm text-turf mb-1 font-primary">
                  <span>Completion</span>
                  <span>65%</span>
                </div>
                <div className="w-full bg-soft-grey rounded-full h-2">
                  <div
                    className="bg-turf h-2 rounded-full"
                    style={{ width: "65%" }}
                  ></div>
                </div>
              </div>
              <div className="text-sm text-turf font-primary">
                <div className="flex justify-between">
                  <span>Started:</span>
                  <span>
                    {new Date(competition.date).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Est. Finish:</span>
                  <span>15:30</span>
                </div>
              </div>
              <Link
                to={`/player/competitions/${competition.id}`}
                className="w-full bg-turf text-scorecard py-2 rounded-lg font-medium hover:bg-fairway transition-colors text-center block font-primary"
              >
                <Eye className="inline w-4 h-4 mr-2" />
                Watch Live
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Regular competition card
function CompetitionCard({
  competition,
  course,
  status,
}: {
  competition: Competition;
  course: Course | undefined;
  status: CompetitionStatus;
}) {
  const { data: leaderboard } = useCompetitionLeaderboard(competition.id);

  const getIconForStatus = (status: FilterStatus) => {
    switch (status) {
      case "live":
        return "🔴";
      case "upcoming":
        return "📅";
      case "completed":
        return "🏆";
      default:
        return "⛳";
    }
  };

  const getCompetitionLink = () => {
    if (status.status === "live") {
      return `/player/competitions/${competition.id}?view=teams#leaderboard`;
    } else if (status.status === "completed") {
      return `/player/competitions/${competition.id}?view=teams#teamresult`;
    } else {
      return `/player/competitions/${competition.id}?view=teams#`;
    }
  };

  const getActionButton = () => {
    if (status.status === "live") {
      return {
        text: "Watch Live",
        icon: Eye,
        className: "bg-flag hover:bg-red-600",
      };
    } else if (status.status === "completed") {
      return {
        text: "View Results",
        icon: Trophy,
        className: "bg-turf hover:bg-fairway",
      };
    } else {
      return {
        text: "Join Competition",
        icon: Users,
        className: "bg-coral hover:bg-orange-600",
      };
    }
  };

  const actionButton = getActionButton();

  return (
    <div className="bg-scorecard rounded-xl border border-soft-grey overflow-hidden hover:shadow-lg hover:-translate-y-1 hover:border-turf transition-all duration-300">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div
            className={`w-16 h-16 ${status.gradientClass} rounded-xl flex items-center justify-center flex-shrink-0`}
          >
            <span className="text-2xl">{getIconForStatus(status.status)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-3">
              <h3 className="text-xl font-bold text-charcoal font-display">
                {competition.name}
              </h3>
              <span
                className={`${status.color} ${status.bgColor} text-xs font-semibold px-3 py-1 rounded-full font-primary`}
              >
                {status.daysText || status.label}
              </span>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center gap-2 text-sm text-charcoal opacity-70 font-primary">
                <Calendar className="w-4 h-4" />
                {new Date(competition.date).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
              <div className="flex items-center gap-2 text-sm text-charcoal opacity-70 font-primary">
                <MapPin className="w-4 h-4" />
                {course?.name || "Course TBD"}
              </div>
              <div className="flex items-center gap-2 text-sm text-charcoal opacity-70 font-primary">
                <Users className="w-4 h-4" />
                {competition.participant_count} participants
              </div>
            </div>

            {/* Leaderboard preview for completed/live competitions */}
            {(status.status === "completed" || status.status === "live") &&
              leaderboard &&
              leaderboard.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-charcoal mb-3 font-display">
                    {status.status === "completed"
                      ? "Final Results"
                      : "Live Leaderboard"}
                  </h4>
                  <div className="space-y-2">
                    {leaderboard.slice(0, 3).map((entry, index) => (
                      <div
                        key={entry.participant.id}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`${
                              index === 0
                                ? "text-yellow-500"
                                : index === 1
                                ? "text-gray-400"
                                : "text-orange-500"
                            }`}
                          >
                            {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                          </span>
                          <span className="text-sm font-medium font-primary">
                            {entry.participant.team_name}{" "}
                            {entry.participant.position_name}
                          </span>
                        </div>
                        <span
                          className={`text-sm font-bold ${
                            status.status === "completed"
                              ? "text-turf"
                              : entry.relativeToPar < 0
                              ? "text-turf"
                              : entry.relativeToPar === 0
                              ? "text-charcoal"
                              : "text-flag"
                          } font-display`}
                        >
                          {status.status === "completed"
                            ? `${entry.totalShots} pts`
                            : entry.relativeToPar === 0
                            ? "E"
                            : entry.relativeToPar > 0
                            ? `+${entry.relativeToPar}`
                            : entry.relativeToPar}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            <div className="flex items-center justify-between">
              <div className="text-sm text-charcoal font-primary">
                <span className="font-medium">Course:</span> Par{" "}
                {course?.pars?.total || 72} • 18 holes
              </div>
              <Link
                to={getCompetitionLink()}
                className={`${actionButton.className} text-scorecard px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 font-primary`}
              >
                <actionButton.icon className="w-4 h-4" />
                {actionButton.text}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Empty state component
function EmptyState({
  statusFilter,
  searchQuery,
}: {
  statusFilter: FilterStatus;
  searchQuery: string;
}) {
  if (searchQuery.trim()) {
    return (
      <div className="text-center py-12">
        <div className="text-turf mb-4">
          <Search className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-fairway mb-2 font-display">
          No competitions found
        </h3>
        <p className="text-turf font-primary">
          Try adjusting your search or filter criteria.
        </p>
      </div>
    );
  }

  const emptyMessages = {
    all: {
      icon: Calendar,
      title: "No competitions available",
      message: "Check back later for upcoming golf competitions.",
    },
    upcoming: {
      icon: Calendar,
      title: "No upcoming competitions",
      message: "All competitions have either started or finished.",
    },
    live: {
      icon: Trophy,
      title: "No live competitions",
      message: "No competitions are currently in progress.",
    },
    completed: {
      icon: Award,
      title: "No completed competitions",
      message: "No competitions have finished yet.",
    },
  };

  const config = emptyMessages[statusFilter];
  const IconComponent = config.icon;

  return (
    <div className="text-center py-12">
      <div className="text-turf mb-4">
        <IconComponent className="h-12 w-12 mx-auto" />
      </div>
      <h3 className="text-lg font-medium text-fairway mb-2 font-display">
        {config.title}
      </h3>
      <p className="text-turf font-primary">{config.message}</p>
    </div>
  );
}

```

# frontend/src/views/player/Landing.tsx

```tsx
import { Link } from "@tanstack/react-router";
import { useCompetitions } from "../../api/competitions";
import { usePublicSeries } from "../../api/series";
import { useCourses } from "../../api/courses";
import {
  Calendar,
  Trophy,
  ChevronRight,
  Smartphone,
  BarChart3,
  Zap,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useMemo } from "react";

interface SkeletonProps {
  className?: string;
}

function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

function StatsBarSkeleton() {
  return (
    <div
      className="py-8 border-b border-soft-grey"
      style={{ backgroundColor: "var(--light-rough)" }}
    >
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-8 w-16 mx-auto" />
              <Skeleton className="h-4 w-20 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HeroSkeleton() {
  return (
    <div
      className="bg-fairway text-scorecard min-h-[60vh] flex items-center"
      style={{
        background:
          "linear-gradient(135deg, var(--fairway-green), var(--turf-green))",
      }}
    >
      <div className="container mx-auto px-4">
        <div className="text-center max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-48 mx-auto bg-white/20" />
          <Skeleton className="h-16 w-full max-w-2xl mx-auto bg-white/20" />
          <Skeleton className="h-6 w-full max-w-3xl mx-auto bg-white/20" />
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Skeleton className="h-12 w-48 bg-white/20" />
            <Skeleton className="h-12 w-32 bg-white/20" />
          </div>
        </div>
      </div>
    </div>
  );
}

function CompetitionsSkeleton() {
  return (
    <div className="py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <Skeleton className="h-8 w-64 mx-auto mb-4" />
          <Skeleton className="h-6 w-96 mx-auto" />
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-scorecard rounded-xl p-6 border border-soft-grey"
            >
              <Skeleton className="h-6 w-32 mb-4" />
              <Skeleton className="h-8 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-4" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-scorecard to-rough flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <AlertCircle className="h-16 w-16 text-flag mx-auto mb-4" />
        <h2 className="text-display-sm text-fairway mb-4">
          Something went wrong
        </h2>
        <p className="text-body-md text-charcoal mb-6">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 bg-coral hover:bg-[#E8890A] text-scorecard px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}

export default function PlayerLanding() {
  const {
    data: competitions,
    isLoading: competitionsLoading,
    error: competitionsError,
    refetch: refetchCompetitions,
  } = useCompetitions();
  const {
    data: series,
    isLoading: seriesLoading,
    error: seriesError,
    refetch: refetchSeries,
  } = usePublicSeries();
  const { data: courses, isLoading: coursesLoading } = useCourses();

  const { liveCompetitions, upcomingCompetitions, recentCompetitions, stats } =
    useMemo(() => {
      if (!competitions) {
        return {
          liveCompetitions: [],
          upcomingCompetitions: [],
          recentCompetitions: [],
          stats: {
            totalCompetitions: 0,
            activeSeries: 0,
            totalParticipants: 0,
            roundsScored: 0,
          },
        };
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const live = competitions.filter((comp) => {
        const compDate = new Date(comp.date);
        const compDay = new Date(
          compDate.getFullYear(),
          compDate.getMonth(),
          compDate.getDate()
        );
        return compDay.getTime() === today.getTime();
      });

      const upcoming = competitions
        .filter((comp) => {
          const compDate = new Date(comp.date);
          const compDay = new Date(
            compDate.getFullYear(),
            compDate.getMonth(),
            compDate.getDate()
          );
          return compDay.getTime() > today.getTime();
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 2);

      const recent = competitions
        .filter((comp) => {
          const compDate = new Date(comp.date);
          const compDay = new Date(
            compDate.getFullYear(),
            compDate.getMonth(),
            compDate.getDate()
          );
          return compDay.getTime() < today.getTime();
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 2);

      const totalParticipants = competitions.reduce(
        (sum, comp) => sum + comp.participant_count,
        0
      );
      const roundsScored = Math.floor(totalParticipants * 1.5);

      return {
        liveCompetitions: live,
        upcomingCompetitions: upcoming,
        recentCompetitions: recent,
        stats: {
          totalCompetitions: competitions.length,
          activeSeries: series?.length || 0,
          totalParticipants,
          roundsScored,
        },
      };
    }, [competitions, series]);

  const getCourse = (courseId: number) => {
    return courses?.find((course) => course.id === courseId);
  };

  const getTimeUntilCompetition = (date: string) => {
    const compDate = new Date(date);
    const now = new Date();
    const diffTime = compDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    return `In ${diffDays} days`;
  };

  const getCompetitionLink = (competition: {
    id: number;
    date: string;
    series_id?: number;
  }) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const compDate = new Date(competition.date);
    const compDay = new Date(
      compDate.getFullYear(),
      compDate.getMonth(),
      compDate.getDate()
    );

    const isSeriesCompetition = !!competition.series_id;
    const isToday = compDay.getTime() === today.getTime();
    const isPast = compDay.getTime() < today.getTime();
    const isFuture = compDay.getTime() > today.getTime();

    // If series competition and already played → Team result
    if (isSeriesCompetition && isPast) {
      return `/player/competitions/${competition.id}?view=teams#teamresult`;
    }

    // If ongoing (today) → Leaderboard for both series and non-series
    if (isToday) {
      return `/player/competitions/${competition.id}?view=teams#leaderboard`;
    }

    // If upcoming → Start list for both series and non-series
    if (isFuture) {
      return `/player/competitions/${competition.id}?view=teams#`;
    }

    // If non-series competition and past → Leaderboard
    if (!isSeriesCompetition && isPast) {
      return `/player/competitions/${competition.id}?view=teams#leaderboard`;
    }

    // Default fallback
    return `/player/competitions/${competition.id}?view=teams#`;
  };

  if (competitionsError && seriesError) {
    return (
      <ErrorState
        message="Unable to load competitions and series data. Please check your connection and try again."
        onRetry={() => {
          refetchCompetitions();
          refetchSeries();
        }}
      />
    );
  }

  const isLoading = competitionsLoading || seriesLoading || coursesLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-scorecard to-rough">
      {/* Hero Section */}
      {isLoading ? (
        <HeroSkeleton />
      ) : (
        <section
          className="bg-fairway text-scorecard min-h-[60vh] flex items-center"
          style={{
            background:
              "linear-gradient(135deg, var(--fairway-green), var(--turf-green))",
          }}
        >
          <div className="container mx-auto px-4 py-8 sm:py-0">
            <div className="text-center max-w-4xl mx-auto">
              {/* Logo */}
              <div className="mb-8">
                <div className="flex items-center justify-center">
                  <img
                    src="/tapscore_horizontal_large_transparent.png"
                    alt="TapScore Logo"
                    className="w-72 md:w-96 lg:w-[500px] h-auto"
                  />
                </div>
              </div>

              {/* Hero Content */}
              <h2
                className="text-display-lg md:text-display-xl mb-6"
                style={{ color: "var(--scorecard-white)" }}
              >
                Golf Scoring
                <span style={{ color: "var(--sunset-coral)" }}>
                  {" "}
                  Made Simple
                </span>
              </h2>
              <p
                className="text-body-lg md:text-body-xl mb-8 max-w-2xl mx-auto"
                style={{ color: "var(--light-rough)" }}
              >
                Digital scoring for golf competitions, series, and casual
                rounds. Real-time leaderboards, mobile-first scoring, and
                comprehensive statistics.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-6 sm:gap-4 justify-center mb-8 sm:mb-0 px-4 sm:px-0">
                <Link
                  to="/player/series"
                  className="px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 inline-flex items-center justify-center"
                  style={{
                    backgroundColor: "var(--sunset-coral)",
                    color: "var(--scorecard-white)",
                  }}
                  onMouseEnter={(e) =>
                    ((e.target as HTMLElement).style.backgroundColor =
                      "#E8890A")
                  }
                  onMouseLeave={(e) =>
                    ((e.target as HTMLElement).style.backgroundColor =
                      "var(--sunset-coral)")
                  }
                >
                  View Series
                </Link>
                <Link
                  to="/player/competitions"
                  className="border-2 px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 inline-flex items-center justify-center"
                  style={{
                    borderColor: "var(--scorecard-white)",
                    color: "var(--scorecard-white)",
                    backgroundColor: "transparent",
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.backgroundColor =
                      "var(--scorecard-white)";
                    (e.target as HTMLElement).style.color =
                      "var(--fairway-green)";
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.backgroundColor =
                      "transparent";
                    (e.target as HTMLElement).style.color =
                      "var(--scorecard-white)";
                  }}
                >
                  Browse Competitions
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Stats Bar */}
      {isLoading ? (
        <StatsBarSkeleton />
      ) : (
        <section
          className="py-8 border-b border-soft-grey"
          style={{ backgroundColor: "var(--light-rough)" }}
        >
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div className="space-y-2">
                <div className="text-display-md text-fairway">
                  {stats.activeSeries}
                </div>
                <div className="text-label-sm text-charcoal/70 uppercase tracking-wide">
                  Active Series
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-display-md text-fairway">
                  {stats.totalCompetitions}
                </div>
                <div className="text-label-sm text-charcoal/70 uppercase tracking-wide">
                  Total Competitions
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-display-md text-fairway">
                  {stats.totalParticipants}
                </div>
                <div className="text-label-sm text-charcoal/70 uppercase tracking-wide">
                  Active Players
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-display-md text-fairway">
                  {stats.roundsScored > 1000
                    ? `${(stats.roundsScored / 1000).toFixed(1)}k`
                    : stats.roundsScored}
                </div>
                <div className="text-label-sm text-charcoal/70 uppercase tracking-wide">
                  Rounds Scored
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Live Activity Section */}
      {isLoading ? (
        <CompetitionsSkeleton />
      ) : (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h3 className="text-display-md text-charcoal mb-4">
                Live Tournament Action
              </h3>
              <p className="text-body-lg text-charcoal/70">
                See what's happening right now in TapScore competitions
              </p>
            </div>

            {/* Competitions Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {/* Live Competitions */}
              {liveCompetitions.map((competition) => {
                const course = getCourse(competition.course_id);
                return (
                  <Link
                    key={competition.id}
                    to={getCompetitionLink(competition)}
                    className="md:col-span-2 lg:col-span-1 bg-gradient-to-br from-scorecard to-rough/10 rounded-xl p-6 border border-soft-grey hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-3 h-3 bg-flag rounded-full animate-pulse"></div>
                      <span className="text-label-sm text-flag uppercase tracking-wide font-semibold">
                        Live Now
                      </span>
                    </div>
                    <h4 className="text-body-xl font-bold text-charcoal mb-2">
                      {competition.name}
                    </h4>
                    <p className="text-charcoal/70 mb-4">
                      {competition.participant_count} players •{" "}
                      {course?.name || "Golf Course"}
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-body-sm text-charcoal/60">
                          Status:
                        </span>
                        <span className="font-semibold text-turf">
                          In Progress
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-turf h-2 rounded-full"
                          style={{ width: "65%" }}
                        ></div>
                      </div>
                      <div className="text-label-xs text-charcoal/50">
                        Competition ongoing
                      </div>
                    </div>
                  </Link>
                );
              })}

              {/* Upcoming Competitions */}
              {upcomingCompetitions.map((competition) => {
                const course = getCourse(competition.course_id);
                const timeUntil = getTimeUntilCompetition(competition.date);
                return (
                  <Link
                    key={competition.id}
                    to={getCompetitionLink(competition)}
                    className="bg-gradient-to-br from-scorecard to-rough/10 rounded-xl p-6 border border-soft-grey hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-coral/10 rounded-full flex items-center justify-center">
                        <Calendar className="h-4 w-4 text-coral" />
                      </div>
                      <span className="text-label-sm text-coral uppercase tracking-wide font-semibold">
                        {timeUntil}
                      </span>
                    </div>
                    <h4 className="text-body-lg font-bold text-charcoal mb-2">
                      {competition.name}
                    </h4>
                    <p className="text-charcoal/70 mb-4">
                      {competition.participant_count} registered •{" "}
                      {course?.name || "Golf Course"}
                    </p>
                    <div className="w-full bg-turf text-scorecard py-2 rounded-lg font-medium transition-colors text-center hover:bg-turf/90">
                      View Competition
                    </div>
                  </Link>
                );
              })}

              {/* Recent Results */}
              {recentCompetitions.map((competition) => {
                return (
                  <Link
                    key={competition.id}
                    to={getCompetitionLink(competition)}
                    className="bg-gradient-to-br from-scorecard to-rough/10 rounded-xl p-6 border border-soft-grey hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-turf/10 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-turf" />
                      </div>
                      <span className="text-label-sm text-turf uppercase tracking-wide font-semibold">
                        Completed
                      </span>
                    </div>
                    <h4 className="text-body-lg font-bold text-charcoal mb-2">
                      {competition.name}
                    </h4>
                    <p className="text-charcoal/70 mb-4">
                      {competition.participant_count} players •{" "}
                      {new Date(competition.date).toLocaleDateString()}
                    </p>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-body-sm">
                          🏆 Results Available
                        </span>
                        <ChevronRight className="h-4 w-4 text-charcoal/40" />
                      </div>
                    </div>
                  </Link>
                );
              })}

              {/* Show empty state only if no competitions at all */}
              {!liveCompetitions.length &&
                !upcomingCompetitions.length &&
                !recentCompetitions.length && (
                  <div className="md:col-span-2 lg:col-span-3 text-center py-12">
                    <Calendar className="h-12 w-12 text-charcoal/40 mx-auto mb-4" />
                    <h4 className="text-body-lg font-medium text-charcoal mb-2">
                      No competitions available
                    </h4>
                    <p className="text-charcoal/70">
                      Check back later for upcoming golf competitions.
                    </p>
                  </div>
                )}
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="bg-gray-100 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-display-md text-charcoal mb-4">
              Everything You Need
            </h3>
            <p className="text-body-lg text-charcoal/70">
              Powerful features for every type of golf competition
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-scorecard rounded-xl p-6 border border-soft-grey hover:shadow-lg transition-all duration-300 hover:-translate-y-1 text-center">
              <div className="w-12 h-12 bg-sky/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Smartphone className="h-6 w-6 text-sky" />
              </div>
              <h4 className="text-body-lg font-bold text-charcoal mb-2">
                Mobile Scoring
              </h4>
              <p className="text-charcoal/60 text-body-sm">
                Real-time score entry optimized for mobile devices
              </p>
            </div>

            <div className="bg-scorecard rounded-xl p-6 border border-soft-grey hover:shadow-lg transition-all duration-300 hover:-translate-y-1 text-center">
              <div className="w-12 h-12 bg-turf/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="h-6 w-6 text-turf" />
              </div>
              <h4 className="text-body-lg font-bold text-charcoal mb-2">
                Live Leaderboards
              </h4>
              <p className="text-charcoal/60 text-body-sm">
                Follow the action with instant leaderboard updates
              </p>
            </div>

            <div className="bg-scorecard rounded-xl p-6 border border-soft-grey hover:shadow-lg transition-all duration-300 hover:-translate-y-1 text-center">
              <div className="w-12 h-12 bg-coral/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-6 w-6 text-coral" />
              </div>
              <h4 className="text-body-lg font-bold text-charcoal mb-2">
                Series Management
              </h4>
              <p className="text-charcoal/60 text-body-sm">
                Organize multi-event series with point systems
              </p>
            </div>

            <div className="bg-scorecard rounded-xl p-6 border border-soft-grey hover:shadow-lg transition-all duration-300 hover:-translate-y-1 text-center">
              <div className="w-12 h-12 bg-coral/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-6 w-6 text-coral" />
              </div>
              <h4 className="text-body-lg font-bold text-charcoal mb-2">
                Statistics
              </h4>
              <p className="text-charcoal/60 text-body-sm">
                Comprehensive performance tracking and analytics
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        className="py-16"
        style={{
          background:
            "linear-gradient(135deg, var(--fairway-green), var(--turf-green))",
        }}
      >
        <div className="container mx-auto px-4 text-center">
          <h3
            className="text-display-md mb-4"
            style={{ color: "var(--scorecard-white)" }}
          >
            Ready to Improve Your Golf Experience?
          </h3>
          <p
            className="text-body-xl mb-8 max-w-2xl mx-auto"
            style={{ color: "var(--light-rough)" }}
          >
            Join thousands of golfers using TapScore for better tournament
            management
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/player/series"
              className="px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 inline-flex items-center justify-center"
              style={{
                backgroundColor: "var(--sunset-coral)",
                color: "var(--scorecard-white)",
              }}
            >
              Get Started Today
            </Link>
            <Link
              to="/player/competitions"
              className="border-2 px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 inline-flex items-center justify-center"
              style={{
                borderColor: "var(--scorecard-white)",
                color: "var(--scorecard-white)",
                backgroundColor: "transparent",
              }}
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

```

# frontend/src/views/player/PlayerLayout.tsx

```tsx
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { List, Trophy } from "lucide-react";
import TapScoreLogo from "../../components/ui/TapScoreLogo";

const playerNavLinks = [
  { to: "/player/competitions", label: "Competitions", icon: List },
  { to: "/player/series", label: "Series", icon: Trophy },
];

export default function PlayerLayout() {
  const { location } = useRouterState();

  // Hide navigation for detailed views and landing page (they have their own navigation)
  const isDetailView =
    location.pathname === "/player" ||
    location.pathname === "/player/" || // Landing page
    location.pathname === "/player/competitions" || // Full-screen competitions page
    location.pathname === "/player/series" || // Full-screen series page
    (location.pathname.includes("/competitions/") &&
      (location.pathname.includes("/tee-times/") ||
        location.pathname.match(/\/competitions\/\d+$/))) ||
    location.pathname.match(/\/series\/\d+/); // This includes all series detail routes

  if (isDetailView) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-scorecard to-rough">
      {/* TapScore Header */}
      <div className="bg-fairway text-scorecard shadow-[0_2px_8px_rgba(27,67,50,0.15)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-16">
            <TapScoreLogo size="md" variant="color" layout="horizontal" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          <div className="bg-scorecard rounded-xl p-6 shadow-[0_2px_8px_rgba(27,67,50,0.08)] border-2 border-soft-grey">
            {/* Player Navigation */}
            <div className="border-b-2 border-soft-grey">
              <nav className="flex space-x-8">
                {playerNavLinks.map((link) => {
                  const isActive =
                    location.pathname === link.to ||
                    (link.to === "/player/series" &&
                      location.pathname.startsWith("/player/series")) ||
                    (link.to === "/player/competitions" &&
                      location.pathname.startsWith("/player/competitions"));
                  const IconComponent = link.icon;
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-all duration-200 font-['Inter']
                        ${
                          isActive
                            ? "border-turf text-turf bg-gradient-to-b from-turf/10 to-turf/5"
                            : "border-transparent text-charcoal hover:text-turf hover:border-rough hover:bg-rough/30"
                        }
                      `}
                    >
                      <IconComponent className="h-4 w-4" />
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Player Content */}
            <div className="mt-6 min-h-[60vh]">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

```

# frontend/src/views/player/Series.tsx

```tsx
import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  usePublicSeries,
  useSeriesStandings,
  useSeriesCompetitions,
  type Series,
} from "../../api/series";
import {
  Trophy,
  Users,
  Crown,
  AlertTriangle,
  Star,
  Eye,
  ChevronRight,
  Mail,
} from "lucide-react";
import { CommonHeader } from "../../components/navigation/CommonHeader";

// Types for enhanced series data
interface SeriesStats {
  totalSeries: number;
  activeSeries: number;
  totalTeams: number;
  totalPlayers: number;
}

// Simplified interface without mock data fields
interface EnhancedSeries extends Series {
  teamCount: number;
}

// Loading skeleton components
function SeriesCardSkeleton() {
  return (
    <div className="bg-scorecard rounded-xl border border-soft-grey overflow-hidden">
      <div className="h-32 bg-soft-grey animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-soft-grey rounded animate-pulse" />
        <div className="h-3 bg-soft-grey rounded w-3/4 animate-pulse" />
        <div className="space-y-2">
          <div className="h-2 bg-soft-grey rounded animate-pulse" />
          <div className="h-2 bg-soft-grey rounded w-1/2 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="h-8 bg-soft-grey rounded animate-pulse" />
          <div className="h-8 bg-soft-grey rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function FeaturedSeriesSkeleton() {
  return (
    <div className="bg-scorecard rounded-xl border border-soft-grey overflow-hidden">
      <div className="h-48 bg-soft-grey animate-pulse" />
      <div className="p-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="h-5 bg-soft-grey rounded animate-pulse" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 bg-soft-grey rounded animate-pulse"
                />
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-5 bg-soft-grey rounded animate-pulse" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-4 bg-soft-grey rounded animate-pulse"
                />
              ))}
            </div>
            <div className="space-y-2">
              <div className="h-8 bg-soft-grey rounded animate-pulse" />
              <div className="h-8 bg-soft-grey rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlayerSeries() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: series, isLoading, error } = usePublicSeries();

  // Calculate real series statistics
  const seriesStats: SeriesStats = useMemo(() => {
    if (!series) {
      return {
        totalSeries: 0,
        activeSeries: 0,
        totalTeams: 0,
        totalPlayers: 0,
      };
    }

    const activeSeries = series.filter((s) => s.is_public).length;
    return {
      totalSeries: series.length,
      activeSeries,
      totalTeams: 0, // Will be calculated from actual standings data
      totalPlayers: 0, // Will be calculated from actual standings data
    };
  }, [series]);

  // Use only real series data without mock enhancements
  const enhancedSeries: EnhancedSeries[] = useMemo(() => {
    if (!series) return [];

    return series.map((serie) => ({
      ...serie,
      teamCount: 0, // Will be filled from standings data
    }));
  }, [series]);

  // Filter series based on search
  const filteredSeries = enhancedSeries.filter(
    (serie) =>
      serie.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (serie.description &&
        serie.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Find featured series (first public series with standings)
  const featuredSeries = enhancedSeries.find((s) => s.is_public);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-scorecard">
        <CommonHeader />

        {/* Hero Skeleton */}
        <div
          className="text-scorecard py-12"
          style={{
            background:
              "linear-gradient(135deg, var(--fairway-green), var(--turf-green))",
          }}
        >
          <div className="container mx-auto px-4 text-center">
            <div
              className="h-8 rounded mx-auto mb-4 w-64 animate-pulse"
              style={{ backgroundColor: "rgba(248, 249, 250, 0.2)" }}
            />
            <div
              className="h-6 rounded mx-auto mb-8 w-96 animate-pulse"
              style={{ backgroundColor: "rgba(248, 249, 250, 0.2)" }}
            />
            <div className="grid grid-cols-3 gap-6 max-w-md mx-auto">
              {[1, 2, 3].map((i) => (
                <div key={i} className="text-center">
                  <div
                    className="h-8 rounded mb-2 animate-pulse"
                    style={{ backgroundColor: "rgba(248, 249, 250, 0.2)" }}
                  />
                  <div
                    className="h-4 rounded animate-pulse"
                    style={{ backgroundColor: "rgba(248, 249, 250, 0.2)" }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content Loading */}
        <main className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="h-6 bg-soft-grey rounded mb-6 w-48 animate-pulse" />
            <FeaturedSeriesSkeleton />
          </div>

          <div className="space-y-6">
            <div className="h-6 bg-soft-grey rounded w-32 animate-pulse" />
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <SeriesCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-scorecard">
        <CommonHeader />

        <main className="container mx-auto px-4 py-12">
          <div className="text-center">
            <AlertTriangle className="h-16 w-16 text-flag mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-charcoal mb-4 font-display">
              Error Loading Series
            </h2>
            <p className="text-charcoal opacity-70 mb-8 font-primary">
              Unable to load golf series. Please try again later.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-turf text-scorecard px-6 py-3 rounded-lg font-medium hover:bg-fairway transition-colors font-primary"
            >
              Try Again
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-scorecard">
      <CommonHeader />

      {/* Hero Section */}
      <div
        className="text-scorecard py-12 relative"
        style={{
          background: `linear-gradient(135deg, var(--fairway-green), var(--turf-green))`,
        }}
      >
        <div className="container mx-auto px-4 text-center relative z-10">
          <h1 className="text-4xl font-bold mb-4 font-display">Golf Series</h1>
          <p className="text-xl opacity-90 mb-8 font-primary">
            Discover competitive golf series and track your team's progress
          </p>
          <div className="grid grid-cols-3 gap-6 max-w-md mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold font-display">
                {seriesStats.activeSeries}
              </div>
              <div className="text-sm opacity-90 font-primary">
                Active Series
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold font-display">
                {seriesStats.totalTeams}
              </div>
              <div className="text-sm opacity-90 font-primary">Total Teams</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold font-display">
                {seriesStats.totalPlayers}
              </div>
              <div className="text-sm opacity-90 font-primary">
                Total Players
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Series */}
      <main className="container mx-auto px-4 py-8">
        {featuredSeries && (
          <div className="mb-8">
            <h3 className="text-xl font-bold font-display mb-6 text-charcoal flex items-center gap-2">
              <Star className="w-5 h-5 text-coral" />
              Featured Series
            </h3>

            <FeaturedSeriesCard series={featuredSeries} />
          </div>
        )}

        {/* Search and All Series */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold font-display text-charcoal">
              All Series
            </h3>
            <div className="text-sm text-turf font-primary">
              {filteredSeries.length} series available
            </div>
          </div>

          {/* Search Bar */}
          <div className="max-w-md">
            <div className="relative">
              <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-turf" />
              <input
                type="text"
                placeholder="Search series..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-soft-grey rounded-lg focus:outline-none focus:ring-2 focus:ring-turf focus:border-turf font-primary"
              />
            </div>
          </div>

          {filteredSeries.length === 0 ? (
            <EmptyState searchQuery={searchQuery} />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSeries.map((serie) => (
                <SeriesCard key={serie.id} series={serie} />
              ))}
            </div>
          )}
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <div
            className="text-scorecard rounded-xl p-8 mx-4"
            style={{
              background:
                "linear-gradient(135deg, var(--fairway-green), var(--turf-green))",
            }}
          >
            <h3 className="text-2xl font-bold mb-4 font-display">
              Want to create your own series?
            </h3>
            <p className="text-lg text-scorecard mb-6 font-primary">
              TapScore makes it easy to organize and manage golf series for your
              club or group
            </p>
            <button className="bg-coral text-scorecard px-8 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors flex items-center gap-2 mx-auto font-primary">
              <Mail className="w-5 h-5" />
              Contact Us
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

// Featured Series Card Component
function FeaturedSeriesCard({ series }: { series: EnhancedSeries }) {
  const { data: standings } = useSeriesStandings(series.id);
  const { data: competitions } = useSeriesCompetitions(series.id);

  const nextCompetition = competitions?.[0];
  const topThree = standings?.team_standings?.slice(0, 3) || [];
  const teamCount = standings?.team_standings?.length || 0;

  return (
    <div className="bg-scorecard rounded-xl border border-soft-grey overflow-hidden shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div className="relative">
        {series.banner_image_url ? (
          <div className="h-48 relative overflow-hidden">
            <img
              src={series.banner_image_url}
              alt={series.name}
              className="w-full h-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
            ></div>
            <div className="absolute top-4 left-4">
              <span className="bg-scorecard text-coral text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1 font-primary shadow-lg">
                <Trophy className="w-3 h-3" />
                FEATURED
              </span>
            </div>
            <div className="absolute bottom-4 left-4 text-scorecard">
              <h3 className="text-2xl font-bold font-display">{series.name}</h3>
              <p className="opacity-90 font-primary">
                {series.description || "Championship series"}
              </p>
            </div>
            <div className="absolute bottom-4 right-4 text-scorecard text-right">
              <div className="text-3xl font-bold font-display">{teamCount}</div>
              <div className="text-sm opacity-90 font-primary">Teams</div>
            </div>
          </div>
        ) : (
          <div
            className="h-48 relative"
            style={{
              background:
                "linear-gradient(135deg, var(--sunset-coral), #ea580c)",
            }}
          >
            <div className="absolute top-4 left-4">
              <span
                className="text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1 font-primary shadow-lg"
                style={{
                  backgroundColor: "rgba(248, 249, 250, 0.9)",
                  color: "var(--sunset-coral)",
                }}
              >
                <Trophy className="w-3 h-3" />
                FEATURED
              </span>
            </div>
            <div className="absolute bottom-4 left-4 text-scorecard">
              <h3 className="text-2xl font-bold font-display">{series.name}</h3>
              <p className="opacity-90 font-primary">
                {series.description || "Championship series"}
              </p>
            </div>
            <div className="absolute bottom-4 right-4 text-scorecard text-right">
              <div className="text-3xl font-bold font-display">{teamCount}</div>
              <div className="text-sm opacity-90 font-primary">Teams</div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-scorecard p-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Current Standings Preview */}
          <div>
            <h4 className="font-semibold text-charcoal mb-3 font-display">
              Current Standings
            </h4>
            {topThree.length > 0 ? (
              <div className="space-y-2">
                {topThree.map((standing, index) => (
                  <div
                    key={standing.team_id}
                    className={`flex items-center justify-between p-2 rounded-lg ${
                      index === 0
                        ? "bg-yellow-50 border border-yellow-200"
                        : index === 1
                        ? "bg-gray-50 border border-gray-200"
                        : "bg-orange-50 border border-orange-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          index === 0
                            ? "text-yellow-500"
                            : index === 1
                            ? "text-gray-400"
                            : "text-orange-500"
                        }
                      >
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                      </span>
                      <span className="text-sm font-medium font-primary">
                        {standing.team_name}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-turf font-display">
                      {standing.total_points} pts
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-charcoal opacity-70 font-primary">
                No standings available yet
              </div>
            )}
          </div>

          {/* Series Info */}
          <div>
            <h4 className="font-semibold text-charcoal mb-3 font-display">
              Series Information
            </h4>
            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-charcoal opacity-70 font-primary">
                  Total Competitions:
                </span>
                <span className="font-medium font-primary">
                  {standings?.total_competitions || 0}
                </span>
              </div>
              {nextCompetition && (
                <div className="flex justify-between text-sm">
                  <span className="text-charcoal opacity-70 font-primary">
                    Next Event:
                  </span>
                  <span className="font-medium font-primary">
                    {new Date(nextCompetition.date).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric" }
                    )}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-charcoal opacity-70 font-primary">
                  Teams:
                </span>
                <span className="font-medium font-primary">{teamCount}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Link
                to={`/player/series/${series.id}`}
                className="w-full bg-turf text-scorecard py-2 rounded-lg font-medium hover:bg-fairway transition-colors text-center block font-primary"
              >
                View Series Details
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Series Card Component
function SeriesCard({ series }: { series: EnhancedSeries }) {
  const { data: standings } = useSeriesStandings(series.id);
  const { data: competitions } = useSeriesCompetitions(series.id);

  const teamCount = standings?.team_standings?.length || 0;
  const champion = standings?.team_standings?.[0];
  const hasCompetitions = competitions && competitions.length > 0;

  return (
    <div className="bg-scorecard rounded-xl border border-soft-grey overflow-hidden hover:shadow-lg hover:-translate-y-1 hover:border-turf transition-all duration-300">
      <div className="relative">
        {series.banner_image_url ? (
          <div className="h-32 relative overflow-hidden">
            <img
              src={series.banner_image_url}
              alt={series.name}
              className="w-full h-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
            ></div>
            <div className="absolute bottom-3 left-3 text-scorecard">
              <h4 className="text-lg font-bold font-display">{series.name}</h4>
            </div>
            <div className="absolute bottom-3 right-3 text-scorecard text-right">
              <div className="text-2xl font-bold font-display">{teamCount}</div>
              <div className="text-xs opacity-90 font-primary">Teams</div>
            </div>
          </div>
        ) : (
          <div
            className="h-32 relative"
            style={{
              background:
                hasCompetitions && champion
                  ? "linear-gradient(135deg, var(--charcoal-text), #374151)"
                  : hasCompetitions
                  ? "linear-gradient(135deg, var(--turf-green), var(--fairway-green))"
                  : "linear-gradient(135deg, var(--sky-blue), #0ea5e9)",
            }}
          >
            {hasCompetitions && champion && (
              <div className="absolute top-3 left-3">
                <span
                  className="text-xs font-semibold px-2 py-1 rounded-full font-primary"
                  style={{
                    backgroundColor: "rgba(248, 249, 250, 0.9)",
                    color: "var(--charcoal-text)",
                  }}
                >
                  COMPLETED
                </span>
              </div>
            )}
            {hasCompetitions && !champion && (
              <div className="absolute top-3 left-3">
                <span
                  className="text-xs font-semibold px-2 py-1 rounded-full font-primary"
                  style={{
                    backgroundColor: "rgba(248, 249, 250, 0.9)",
                    color: "var(--turf-green)",
                  }}
                >
                  ACTIVE
                </span>
              </div>
            )}
            {!hasCompetitions && (
              <div className="absolute top-3 left-3">
                <span
                  className="text-xs font-semibold px-2 py-1 rounded-full font-primary"
                  style={{
                    backgroundColor: "rgba(248, 249, 250, 0.9)",
                    color: "var(--sky-blue)",
                  }}
                >
                  UPCOMING
                </span>
              </div>
            )}
            <div className="absolute bottom-3 left-3 text-scorecard">
              <h4 className="text-lg font-bold font-display">{series.name}</h4>
            </div>
            <div className="absolute bottom-3 right-3 text-scorecard text-right">
              <div className="text-2xl font-bold font-display">{teamCount}</div>
              <div className="text-xs opacity-90 font-primary">Teams</div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4">
        <p className="text-sm text-charcoal opacity-70 mb-4 font-primary line-clamp-2">
          {series.description || "Golf competition series for teams."}
        </p>

        {hasCompetitions && champion && (
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-charcoal opacity-70 font-primary">
                CHAMPION
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-bold text-charcoal font-primary">
                {champion.team_name}
              </span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Link
            to={`/player/series/${series.id}`}
            className="w-full bg-turf text-scorecard py-2 px-3 rounded-lg text-sm font-medium hover:bg-fairway transition-colors text-center block font-primary"
          >
            {hasCompetitions && champion ? (
              <>
                <Trophy className="inline w-4 h-4 mr-1" />
                View Results
              </>
            ) : hasCompetitions ? (
              <>
                <ChevronRight className="inline w-4 h-4 mr-1" />
                View Details
              </>
            ) : (
              <>
                <Eye className="inline w-4 h-4 mr-1" />
                Learn More
              </>
            )}
          </Link>
        </div>
      </div>
    </div>
  );
}

// Empty State Component
function EmptyState({ searchQuery }: { searchQuery: string }) {
  if (searchQuery.trim()) {
    return (
      <div className="text-center py-12">
        <div className="text-turf mb-4">
          <Users className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-charcoal mb-2 font-display">
          No series found
        </h3>
        <p className="text-charcoal opacity-70 font-primary">
          Try adjusting your search criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <div className="text-turf mb-4">
        <Trophy className="h-12 w-12 mx-auto" />
      </div>
      <h3 className="text-lg font-medium text-charcoal mb-2 font-display">
        No series available
      </h3>
      <p className="text-charcoal opacity-70 font-primary">
        Check back later for upcoming golf series.
      </p>
    </div>
  );
}

```

# frontend/src/views/player/SeriesCompetitions.tsx

```tsx
import { Link, useParams } from "@tanstack/react-router";
import { useSingleSeries, useSeriesCompetitions } from "@/api/series";
import { useCourses } from "@/api/courses";
import {
  Calendar,
  Users,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  MapPin,
  Filter,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CommonHeader } from "@/components/navigation/CommonHeader";

type FilterStatus = "all" | "upcoming" | "active" | "completed";

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-scorecard animate-pulse">
      <div className="bg-fairway h-16" />
      <div className="container mx-auto px-4 py-6 space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function ErrorState({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="min-h-screen bg-scorecard flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="w-16 h-16 bg-flag/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="h-8 w-8 text-flag" />
        </div>
        <h1 className="text-display-md font-display font-bold text-charcoal mb-4">
          {title}
        </h1>
        <p className="text-body-lg text-charcoal/70 mb-8">{message}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {onRetry && (
            <Button
              onClick={onRetry}
              className="bg-turf hover:bg-fairway text-scorecard"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="border-soft-grey text-charcoal hover:bg-rough/20"
          >
            Back to Series
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SeriesCompetitions() {
  const { serieId } = useParams({
    from: "/player/series/$serieId/competitions",
  });
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");

  const seriesId = parseInt(serieId);
  const {
    data: series,
    isLoading: seriesLoading,
    error: seriesError,
  } = useSingleSeries(seriesId);

  const {
    data: competitions,
    isLoading: competitionsLoading,
    error: competitionsError,
    refetch: refetchCompetitions,
  } = useSeriesCompetitions(seriesId);

  const { data: courses } = useCourses();

  // Filter competitions based on status
  const now = new Date();
  const filteredCompetitions = competitions?.filter((competition) => {
    const competitionDate = new Date(competition.date);
    const isPast = competitionDate < now;
    const isToday = competitionDate.toDateString() === now.toDateString();

    switch (statusFilter) {
      case "upcoming":
        return !isPast && !isToday;
      case "active":
        return isToday;
      case "completed":
        return isPast;
      default:
        return true;
    }
  });

  // Group competitions by status for stats
  const competitionStats = competitions?.reduce(
    (acc, competition) => {
      const competitionDate = new Date(competition.date);
      const isPast = competitionDate < now;
      const isToday = competitionDate.toDateString() === now.toDateString();

      if (isPast) acc.completed++;
      else if (isToday) acc.active++;
      else acc.upcoming++;

      return acc;
    },
    { upcoming: 0, active: 0, completed: 0 }
  ) || { upcoming: 0, active: 0, completed: 0 };

  if (seriesLoading || competitionsLoading) return <LoadingSkeleton />;

  if (seriesError) {
    return (
      <ErrorState
        title="Series Not Found"
        message="The series you're looking for doesn't exist or may have been removed."
      />
    );
  }

  if (competitionsError) {
    return (
      <ErrorState
        title="Error Loading Competitions"
        message="Unable to load competitions. Please try again."
        onRetry={() => refetchCompetitions()}
      />
    );
  }

  if (!series) {
    return (
      <ErrorState
        title="Series Unavailable"
        message="This series is currently unavailable. Please try again later."
      />
    );
  }

  if (!competitions || competitions.length === 0) {
    return (
      <div className="min-h-screen bg-scorecard">
        <CommonHeader title={series.name} />

        {/* Sub-header with Page Title */}
        <div className="bg-scorecard border-b border-soft-grey shadow-sm">
          <div className="container mx-auto px-4">
            <div className="py-4">
              <h2 className="text-xl font-semibold font-display text-charcoal">
                Competitions
              </h2>
              <p className="text-sm text-charcoal/70 font-primary mt-1">
                Browse series competitions and events
              </p>
            </div>
          </div>
        </div>

        <main className="container mx-auto px-4 py-12">
          <div className="text-center">
            <Calendar className="h-16 w-16 text-charcoal/30 mx-auto mb-6" />
            <h2 className="text-display-sm font-display font-semibold text-charcoal mb-4">
              No Competitions Available
            </h2>
            <p className="text-body-lg text-charcoal/70 mb-8">
              Competitions will be added to this series soon.
            </p>
            <Button
              onClick={() => window.history.back()}
              className="bg-turf hover:bg-fairway text-scorecard"
            >
              Back to Series Overview
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-scorecard">
      <CommonHeader title={series.name} />

      {/* Sub-header with Page Title and Filter */}
      <div className="bg-scorecard border-b border-soft-grey shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div>
              <h2 className="text-xl font-semibold font-display text-charcoal">
                Competitions
              </h2>
              <p className="text-sm text-charcoal/70 font-primary mt-1">
                Browse series competitions and events
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-charcoal/60" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Filter Tabs */}
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[
              { key: "all", label: "All", count: competitions.length },
              {
                key: "upcoming",
                label: "Upcoming",
                count: competitionStats.upcoming,
              },
              {
                key: "active",
                label: "Active",
                count: competitionStats.active,
              },
              {
                key: "completed",
                label: "Completed",
                count: competitionStats.completed,
              },
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setStatusFilter(filter.key as FilterStatus)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  statusFilter === filter.key
                    ? "bg-turf text-scorecard shadow-lg"
                    : "bg-scorecard border border-soft-grey text-charcoal hover:border-turf hover:bg-rough/20"
                }`}
              >
                {filter.label}
                <span
                  className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    statusFilter === filter.key
                      ? "bg-scorecard/20 text-scorecard"
                      : "bg-charcoal/10 text-charcoal/70"
                  }`}
                >
                  {filter.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Competitions List */}
        {filteredCompetitions?.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 text-charcoal/30 mx-auto mb-6" />
            <h2 className="text-display-sm font-display font-semibold text-charcoal mb-4">
              No {statusFilter !== "all" ? statusFilter : ""} Competitions
            </h2>
            <p className="text-body-lg text-charcoal/70 mb-8">
              {statusFilter === "all"
                ? "No competitions are available."
                : `No ${statusFilter} competitions found.`}
            </p>
            <Button
              onClick={() => setStatusFilter("all")}
              className="bg-turf hover:bg-fairway text-scorecard"
            >
              Show All Competitions
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-display-sm font-display font-semibold text-charcoal">
                {statusFilter === "all"
                  ? "All"
                  : statusFilter.charAt(0).toUpperCase() +
                    statusFilter.slice(1)}{" "}
                Competitions
              </h2>
              <span className="text-body-sm text-charcoal/70">
                {filteredCompetitions?.length || 0} competition
                {(filteredCompetitions?.length || 0) !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="grid gap-4">
              {filteredCompetitions?.map((competition) => {
                const competitionDate = new Date(competition.date);
                const course = courses?.find(
                  (c) => c.id === competition.course_id
                );
                const isPast = competitionDate < new Date();
                const isToday =
                  competitionDate.toDateString() === new Date().toDateString();

                return (
                  <Link
                    key={competition.id}
                    to="/player/competitions/$competitionId"
                    params={{ competitionId: competition.id.toString() }}
                    className="block p-6 rounded-xl border border-soft-grey hover:border-turf hover:shadow-lg transition-all duration-200 group bg-scorecard"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-rough rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-turf/20 transition-colors">
                        <Calendar className="h-6 w-6 text-turf group-hover:text-fairway transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <h3 className="text-label-lg font-semibold text-charcoal group-hover:text-fairway transition-colors">
                            {competition.name}
                          </h3>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              isPast
                                ? "bg-charcoal/10 text-charcoal/70"
                                : isToday
                                ? "bg-coral text-scorecard"
                                : "bg-turf/20 text-turf"
                            }`}
                          >
                            {isPast
                              ? "Completed"
                              : isToday
                              ? "Today"
                              : "Upcoming"}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-body-sm text-charcoal/70 mb-3">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {competitionDate.toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                          {course && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {course.name}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {competition.participant_count} participant
                            {competition.participant_count !== 1 ? "s" : ""}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-charcoal/30 flex-shrink-0 group-hover:text-turf transition-colors" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

```

# frontend/src/views/player/SeriesDetail.tsx

```tsx
import { useCallback } from "react";
import { Link, useParams } from "@tanstack/react-router";
import {
  useSingleSeries,
  useSeriesStandings,
  useSeriesCompetitions,
  useSeriesDocuments,
} from "@/api/series";
import {
  Calendar,
  Trophy,
  FileText,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { CommonHeader } from "@/components/navigation/CommonHeader";
import RecentActivity from "@/components/series/recent-activity";

// Loading skeleton components
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-scorecard animate-pulse">
      <div className="bg-fairway h-16" />
      <div className="h-[200px] bg-gray-300" />
      <div className="bg-rough p-6">
        <div className="container mx-auto grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="text-center space-y-2">
              <div className="h-8 bg-gray-300 rounded" />
              <div className="h-4 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
      <div className="container mx-auto px-4 py-6 space-y-8">
        <div className="h-32 bg-gray-200 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl" />
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

function ErrorState({
  title,
  message,
  onRetry,
  showBackButton = true,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
  showBackButton?: boolean;
}) {
  return (
    <div className="min-h-screen bg-scorecard flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="w-16 h-16 bg-flag/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="h-8 w-8 text-flag" />
        </div>
        <h1 className="text-display-md font-display font-bold text-charcoal mb-4">
          {title}
        </h1>
        <p className="text-body-lg text-charcoal/70 mb-8">{message}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {onRetry && (
            <Button
              onClick={onRetry}
              className="bg-turf hover:bg-fairway text-scorecard"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
          {showBackButton && (
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="border-soft-grey text-charcoal hover:bg-rough/20"
            >
              Go Back
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SeriesDetail() {
  const { serieId } = useParams({ from: "/player/series/$serieId" });

  const seriesId = parseInt(serieId);
  const {
    data: series,
    isLoading: seriesLoading,
    error: seriesError,
    refetch: refetchSeries,
  } = useSingleSeries(seriesId);

  const { data: standings, isLoading: standingsLoading } =
    useSeriesStandings(seriesId);

  const { data: competitions, isLoading: competitionsLoading } =
    useSeriesCompetitions(seriesId);

  const { data: documents, isLoading: documentsLoading } =
    useSeriesDocuments(seriesId);

  // Calculate key metrics for info bar
  const totalCompetitions = competitions?.length || 0;
  const activeTeams = standings?.team_standings?.length || 0;
  const latestCompetition = competitions?.[0];

  // Find the landing document
  const landingDocument = series?.landing_document_id
    ? documents?.find((doc) => doc.id === series.landing_document_id)
    : null;

  // Clean navigation with proper browser history back
  const handleBackNavigation = useCallback(() => {
    window.history.back();
  }, []);

  // Enhanced error handling
  if (seriesLoading && !series) return <LoadingSkeleton />;

  if (seriesError) {
    return (
      <ErrorState
        title="Series Not Found"
        message="The series you're looking for doesn't exist or may have been removed."
        onRetry={() => refetchSeries()}
      />
    );
  }

  if (!series) {
    return (
      <ErrorState
        title="Series Unavailable"
        message="This series is currently unavailable. Please try again later."
        onRetry={() => refetchSeries()}
      />
    );
  }

  // Main content
  const renderMainContent = () => {
    return (
      <div className="space-y-8">
        {/* Primary Content Area */}
        {landingDocument ? (
          <section>
            <div className="prose prose-gray max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {landingDocument.content}
              </ReactMarkdown>
            </div>
          </section>
        ) : (
          series.description && (
            <section>
              <h2 className="text-display-sm font-display font-semibold text-charcoal mb-6">
                About This Series
              </h2>
              <div className="prose prose-gray max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {series.description}
                </ReactMarkdown>
              </div>
            </section>
          )
        )}

        {/* Quick Access Cards */}
        <section>
          <h3 className="text-display-sm font-display font-semibold text-charcoal mb-6">
            Quick Access
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Team Standings Card */}
            <Link
              to="/player/series/$serieId/standings"
              params={{ serieId }}
              className="bg-scorecard border border-soft-grey rounded-xl p-6 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-turf group block"
            >
              <div className="w-12 h-12 bg-rough rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-turf/20 transition-colors">
                <Trophy className="h-6 w-6 text-turf group-hover:text-fairway transition-colors" />
              </div>
              <h4 className="text-label-lg font-display font-semibold text-charcoal mb-2 group-hover:text-fairway transition-colors">
                Team Standings
              </h4>
              <p className="text-body-sm text-charcoal/70">
                {standingsLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading...
                  </span>
                ) : (
                  `${activeTeams} teams competing`
                )}
              </p>
            </Link>

            {/* All Competitions Card */}
            <Link
              to="/player/series/$serieId/competitions"
              params={{ serieId }}
              className="bg-scorecard border border-soft-grey rounded-xl p-6 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-turf group block"
            >
              <div className="w-12 h-12 bg-rough rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-turf/20 transition-colors">
                <Calendar className="h-6 w-6 text-turf group-hover:text-fairway transition-colors" />
              </div>
              <h4 className="text-label-lg font-display font-semibold text-charcoal mb-2 group-hover:text-fairway transition-colors">
                All Competitions
              </h4>
              <p className="text-body-sm text-charcoal/70">
                {competitionsLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading...
                  </span>
                ) : (
                  `Browse ${totalCompetitions} competitions`
                )}
              </p>
            </Link>

            {/* Documents Card */}
            {documents && documents.length > 0 && (
              <Link
                to="/player/series/$serieId/documents"
                params={{ serieId }}
                className="bg-scorecard border border-soft-grey rounded-xl p-6 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-turf group block"
              >
                <div className="w-12 h-12 bg-rough rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-turf/20 transition-colors">
                  <FileText className="h-6 w-6 text-turf group-hover:text-fairway transition-colors" />
                </div>
                <h4 className="text-label-lg font-display font-semibold text-charcoal mb-2 group-hover:text-fairway transition-colors">
                  Documents
                </h4>
                <p className="text-body-sm text-charcoal/70">
                  {documentsLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    `View ${documents.length} document${
                      documents.length !== 1 ? "s" : ""
                    }`
                  )}
                </p>
              </Link>
            )}
          </div>
        </section>

        {/* Recent Activity Section */}
        <RecentActivity competitions={competitions} maxItems={3} />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-scorecard">
      <CommonHeader onBackClick={handleBackNavigation} />

      {/* Hero Section */}
      <section className="relative">
        {/* Hero Banner */}
        {series.banner_image_url ? (
          <div className="relative h-[200px] md:h-[280px] overflow-hidden">
            <img
              src={series.banner_image_url}
              alt={`${series.name} banner`}
              className="w-full h-full object-cover"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-fairway/70" />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
              <h1 className="text-display-md md:text-display-lg font-display font-bold text-scorecard drop-shadow-lg">
                {series.name}
              </h1>
              {series.description && (
                <p className="text-body-lg text-scorecard/90 mt-2 drop-shadow-md line-clamp-2">
                  {series.description}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-fairway to-turf p-6 md:p-8">
            <h1 className="text-display-md md:text-display-lg font-display font-bold text-scorecard">
              {series.name}
            </h1>
            {series.description && (
              <p className="text-body-lg text-scorecard/90 mt-2">
                {series.description}
              </p>
            )}
          </div>
        )}

        {/* Info Bar */}
        <div className="bg-rough p-4 md:p-6 border-b border-soft-grey">
          <div className="container mx-auto">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <div className="text-display-sm font-display font-bold text-fairway">
                  {competitionsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  ) : (
                    totalCompetitions
                  )}
                </div>
                <div className="text-label-sm font-medium text-charcoal uppercase tracking-wide">
                  {totalCompetitions === 1 ? "Competition" : "Competitions"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-display-sm font-display font-bold text-fairway">
                  {standingsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  ) : (
                    activeTeams
                  )}
                </div>
                <div className="text-label-sm font-medium text-charcoal uppercase tracking-wide">
                  Active Teams
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-display-sm font-display font-bold text-fairway">
                  {competitionsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  ) : latestCompetition ? (
                    "Recent"
                  ) : (
                    "None"
                  )}
                </div>
                <div className="text-label-sm font-medium text-charcoal uppercase tracking-wide">
                  Latest Result
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content Area */}
      <main className="container mx-auto px-4 py-6">{renderMainContent()}</main>
    </div>
  );
}

```

# frontend/src/views/player/SeriesDocumentDetail.tsx

```tsx
import { Link, useParams } from "@tanstack/react-router";
import { useSingleSeries, useSeriesDocuments } from "@/api/series";
import {
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  Share,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import TapScoreLogo from "@/components/ui/TapScoreLogo";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-scorecard animate-pulse">
      <div className="bg-fairway h-16" />
      <div className="container mx-auto px-4 py-6 space-y-4">
        <div className="h-8 bg-gray-300 rounded w-3/4" />
        <div className="space-y-3">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

function ErrorState({
  title,
  message,
  onRetry,
  serieId,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
  serieId: string;
}) {
  return (
    <div className="min-h-screen bg-scorecard flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="w-16 h-16 bg-flag/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="h-8 w-8 text-flag" />
        </div>
        <h1 className="text-display-md font-display font-bold text-charcoal mb-4">
          {title}
        </h1>
        <p className="text-body-lg text-charcoal/70 mb-8">{message}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {onRetry && (
            <Button
              onClick={onRetry}
              className="bg-turf hover:bg-fairway text-scorecard"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
          <Link
            to="/player/series/$serieId/documents"
            params={{ serieId }}
            className="inline-flex items-center gap-2 px-4 py-2 border border-soft-grey text-charcoal hover:bg-rough/20 hover:border-turf rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Documents
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SeriesDocumentDetail() {
  const { serieId, documentId } = useParams({
    from: "/player/series/$serieId/documents/$documentId",
  });

  const seriesId = parseInt(serieId);
  const docId = parseInt(documentId);

  const {
    data: series,
    isLoading: seriesLoading,
    error: seriesError,
  } = useSingleSeries(seriesId);

  const {
    data: documents,
    isLoading: documentsLoading,
    error: documentsError,
    refetch: refetchDocuments,
  } = useSeriesDocuments(seriesId);

  // Find the current document and siblings for navigation
  const currentDocument = documents?.find((doc) => doc.id === docId);
  const currentIndex = documents?.findIndex((doc) => doc.id === docId) ?? -1;
  const previousDocument = documents?.[currentIndex - 1];
  const nextDocument = documents?.[currentIndex + 1];

  const handleShare = async () => {
    if (navigator.share && currentDocument) {
      try {
        await navigator.share({
          title: currentDocument.title,
          url: window.location.href,
        });
      } catch {
        // Fallback to copying URL
        navigator.clipboard.writeText(window.location.href);
      }
    } else {
      // Fallback to copying URL
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (seriesLoading || documentsLoading) return <LoadingSkeleton />;

  if (seriesError) {
    return (
      <ErrorState
        title="Series Not Found"
        message="The series you're looking for doesn't exist or may have been removed."
        serieId={serieId}
      />
    );
  }

  if (documentsError) {
    return (
      <ErrorState
        title="Error Loading Document"
        message="Unable to load the document. Please try again."
        onRetry={() => refetchDocuments()}
        serieId={serieId}
      />
    );
  }

  if (!series) {
    return (
      <ErrorState
        title="Series Unavailable"
        message="This series is currently unavailable. Please try again later."
        serieId={serieId}
      />
    );
  }

  if (!currentDocument) {
    return (
      <ErrorState
        title="Document Not Found"
        message="The document you're looking for doesn't exist or may have been removed."
        serieId={serieId}
      />
    );
  }

  return (
    <div className="min-h-screen bg-scorecard">
      {/* Main Header with Navigation */}
      <header className="bg-fairway text-scorecard shadow-[0_2px_8px_rgba(27,67,50,0.15)] sticky top-0 z-10">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 h-16">
            <Link
              to="/player/series/$serieId/documents"
              params={{ serieId }}
              className="p-2 hover:bg-turf rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <TapScoreLogo size="sm" variant="color" layout="horizontal" />
            <div className="w-px h-6 bg-scorecard/30" />
            <div className="min-w-0 flex-1">
              <p className="text-sm opacity-80 truncate">
                {series.name} • Documents
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Sub-header with Document Title and Actions */}
      <div className="bg-scorecard border-b border-soft-grey shadow-sm sticky top-16 z-9">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold font-display text-charcoal truncate">
                {currentDocument.title}
              </h2>
              <p className="text-sm text-charcoal/70 font-primary mt-1">
                Document {currentIndex + 1} of {documents?.length || 0}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Previous Document */}
              {previousDocument && (
                <Link
                  to="/player/series/$serieId/documents/$documentId"
                  params={{
                    serieId,
                    documentId: previousDocument.id.toString(),
                  }}
                  className="p-2 hover:bg-rough rounded-lg transition-colors text-charcoal"
                  title={`Previous: ${previousDocument.title}`}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Link>
              )}

              {/* Next Document */}
              {nextDocument && (
                <Link
                  to="/player/series/$serieId/documents/$documentId"
                  params={{
                    serieId,
                    documentId: nextDocument.id.toString(),
                  }}
                  className="p-2 hover:bg-rough rounded-lg transition-colors text-charcoal"
                  title={`Next: ${nextDocument.title}`}
                >
                  <ChevronRight className="h-5 w-5" />
                </Link>
              )}

              {/* Share Button */}
              <button
                onClick={handleShare}
                className="p-2 hover:bg-rough rounded-lg transition-colors text-charcoal"
                title="Share document"
              >
                <Share className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <article className="prose prose-gray prose-lg max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {currentDocument.content}
          </ReactMarkdown>
        </article>

        {/* Document Navigation Footer */}
        {(previousDocument || nextDocument) && (
          <div className="mt-12 pt-8 border-t border-soft-grey">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {previousDocument && (
                <Link
                  to="/player/series/$serieId/documents/$documentId"
                  params={{
                    serieId,
                    documentId: previousDocument.id.toString(),
                  }}
                  className="group p-4 rounded-xl border border-soft-grey hover:border-turf hover:shadow-md transition-all duration-200 bg-scorecard"
                >
                  <div className="flex items-center gap-3">
                    <ChevronLeft className="h-5 w-5 text-turf group-hover:text-fairway transition-colors" />
                    <div className="min-w-0 flex-1">
                      <p className="text-body-xs text-charcoal/50 uppercase tracking-wide font-medium mb-1">
                        Previous
                      </p>
                      <h3 className="text-label-md font-semibold text-charcoal group-hover:text-fairway transition-colors truncate">
                        {previousDocument.title}
                      </h3>
                    </div>
                  </div>
                </Link>
              )}

              {nextDocument && (
                <Link
                  to="/player/series/$serieId/documents/$documentId"
                  params={{
                    serieId,
                    documentId: nextDocument.id.toString(),
                  }}
                  className="group p-4 rounded-xl border border-soft-grey hover:border-turf hover:shadow-md transition-all duration-200 bg-scorecard md:col-start-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1 text-right">
                      <p className="text-body-xs text-charcoal/50 uppercase tracking-wide font-medium mb-1">
                        Next
                      </p>
                      <h3 className="text-label-md font-semibold text-charcoal group-hover:text-fairway transition-colors truncate">
                        {nextDocument.title}
                      </h3>
                    </div>
                    <ChevronRight className="h-5 w-5 text-turf group-hover:text-fairway transition-colors" />
                  </div>
                </Link>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

```

# frontend/src/views/player/SeriesDocuments.tsx

```tsx
import { Link, useParams } from "@tanstack/react-router";
import { useSingleSeries, useSeriesDocuments } from "@/api/series";
import {
  ArrowLeft,
  FileText,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Search,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import TapScoreLogo from "@/components/ui/TapScoreLogo";

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-scorecard animate-pulse">
      <div className="bg-fairway h-16" />
      <div className="container mx-auto px-4 py-6 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function ErrorState({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="min-h-screen bg-scorecard flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="w-16 h-16 bg-flag/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="h-8 w-8 text-flag" />
        </div>
        <h1 className="text-display-md font-display font-bold text-charcoal mb-4">
          {title}
        </h1>
        <p className="text-body-lg text-charcoal/70 mb-8">{message}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {onRetry && (
            <Button
              onClick={onRetry}
              className="bg-turf hover:bg-fairway text-scorecard"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
          <Link
            to="/player/series/$serieId"
            params={{ serieId: window.location.pathname.split("/")[3] }}
            className="inline-flex items-center gap-2 px-4 py-2 border border-soft-grey text-charcoal hover:bg-rough/20 hover:border-turf rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Series
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SeriesDocuments() {
  const { serieId } = useParams({ from: "/player/series/$serieId/documents" });
  const [searchQuery, setSearchQuery] = useState("");

  const seriesId = parseInt(serieId);
  const {
    data: series,
    isLoading: seriesLoading,
    error: seriesError,
  } = useSingleSeries(seriesId);

  const {
    data: documents,
    isLoading: documentsLoading,
    error: documentsError,
    refetch: refetchDocuments,
  } = useSeriesDocuments(seriesId);

  // Filter documents based on search query
  const filteredDocuments = documents?.filter(
    (doc) =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (seriesLoading || documentsLoading) return <LoadingSkeleton />;

  if (seriesError) {
    return (
      <ErrorState
        title="Series Not Found"
        message="The series you're looking for doesn't exist or may have been removed."
      />
    );
  }

  if (documentsError) {
    return (
      <ErrorState
        title="Error Loading Documents"
        message="Unable to load documents. Please try again."
        onRetry={() => refetchDocuments()}
      />
    );
  }

  if (!series) {
    return (
      <ErrorState
        title="Series Unavailable"
        message="This series is currently unavailable. Please try again later."
      />
    );
  }

  return (
    <div className="min-h-screen bg-scorecard">
      {/* Main Header with Navigation */}
      <header className="bg-fairway text-scorecard shadow-[0_2px_8px_rgba(27,67,50,0.15)]">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 h-16">
            <Link
              to="/player/series/$serieId"
              params={{ serieId }}
              className="p-2 hover:bg-turf rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <TapScoreLogo size="sm" variant="color" layout="horizontal" />
            <div className="w-px h-6 bg-scorecard/30" />
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold font-display truncate">
                {series.name}
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Sub-header with Page Title and Search */}
      <div className="bg-scorecard border-b border-soft-grey shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div>
              <h2 className="text-xl font-semibold font-display text-charcoal">
                Documents
              </h2>
              <p className="text-sm text-charcoal/70 font-primary mt-1">
                Browse series rules, guides and resources
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-charcoal/60" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-charcoal/50" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-soft-grey rounded-xl bg-scorecard text-charcoal placeholder-charcoal/50 focus:outline-none focus:ring-2 focus:ring-turf focus:border-turf transition-colors"
            />
          </div>
        </div>

        {/* Documents List */}
        {!documents || documents.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-charcoal/30 mx-auto mb-6" />
            <h2 className="text-display-sm font-display font-semibold text-charcoal mb-4">
              No Documents Available
            </h2>
            <p className="text-body-lg text-charcoal/70 mb-8">
              Documents will be added to this series soon.
            </p>
            <Link
              to="/player/series/$serieId"
              params={{ serieId }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-turf hover:bg-fairway text-scorecard rounded-xl transition-colors font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Series Overview
            </Link>
          </div>
        ) : filteredDocuments?.length === 0 ? (
          <div className="text-center py-12">
            <Search className="h-16 w-16 text-charcoal/30 mx-auto mb-6" />
            <h2 className="text-display-sm font-display font-semibold text-charcoal mb-4">
              No Documents Found
            </h2>
            <p className="text-body-lg text-charcoal/70 mb-8">
              No documents match your search query "{searchQuery}".
            </p>
            <Button
              onClick={() => setSearchQuery("")}
              className="bg-turf hover:bg-fairway text-scorecard"
            >
              Clear Search
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-display-sm font-display font-semibold text-charcoal">
                Documents
              </h2>
              <span className="text-body-sm text-charcoal/70">
                {filteredDocuments?.length || 0} document
                {(filteredDocuments?.length || 0) !== 1 ? "s" : ""}
                {searchQuery && ` matching "${searchQuery}"`}
              </span>
            </div>

            <div className="grid gap-4">
              {filteredDocuments?.map((document) => (
                <Link
                  key={document.id}
                  to="/player/series/$serieId/documents/$documentId"
                  params={{ serieId, documentId: document.id.toString() }}
                  className="block p-6 rounded-xl border border-soft-grey hover:border-turf hover:shadow-lg transition-all duration-200 group bg-scorecard"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-rough rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-turf/20 transition-colors">
                      <FileText className="h-6 w-6 text-turf group-hover:text-fairway transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-label-lg font-semibold text-charcoal mb-2 group-hover:text-fairway transition-colors">
                        {document.title}
                      </h3>
                      <p className="text-body-sm text-charcoal/70 line-clamp-2 mb-3">
                        {document.content.substring(0, 150)}
                        {document.content.length > 150 && "..."}
                      </p>
                      <div className="text-body-xs text-charcoal/50">
                        Updated{" "}
                        {new Date(document.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-charcoal/30 flex-shrink-0 group-hover:text-turf transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

```

# frontend/src/views/player/SeriesStandings.tsx

```tsx
import { Link, useParams } from "@tanstack/react-router";
import { useSingleSeries, useSeriesStandings } from "@/api/series";
import {
  ArrowLeft,
  Trophy,
  AlertCircle,
  RefreshCw,
  Share,
  Download,
  Medal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import TapScoreLogo from "@/components/ui/TapScoreLogo";

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-scorecard animate-pulse">
      <div className="bg-fairway h-16" />
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Top 3 cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl" />
          ))}
        </div>
        {/* Table skeleton */}
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

function ErrorState({
  title,
  message,
  onRetry,
  serieId,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
  serieId: string;
}) {
  return (
    <div className="min-h-screen bg-scorecard flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="w-16 h-16 bg-flag/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="h-8 w-8 text-flag" />
        </div>
        <h1 className="text-display-md font-display font-bold text-charcoal mb-4">
          {title}
        </h1>
        <p className="text-body-lg text-charcoal/70 mb-8">{message}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {onRetry && (
            <Button
              onClick={onRetry}
              className="bg-turf hover:bg-fairway text-scorecard"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
          <Link
            to="/player/series/$serieId"
            params={{ serieId }}
            className="inline-flex items-center gap-2 px-4 py-2 border border-soft-grey text-charcoal hover:bg-rough/20 hover:border-turf rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Series
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SeriesStandings() {
  const { serieId } = useParams({ from: "/player/series/$serieId/standings" });

  const seriesId = parseInt(serieId);
  const {
    data: series,
    isLoading: seriesLoading,
    error: seriesError,
  } = useSingleSeries(seriesId);

  const {
    data: standings,
    isLoading: standingsLoading,
    error: standingsError,
    refetch: refetchStandings,
  } = useSeriesStandings(seriesId);

  const handleShare = async () => {
    if (navigator.share && series) {
      try {
        await navigator.share({
          title: `${series.name} Standings`,
          url: window.location.href,
        });
      } catch {
        navigator.clipboard.writeText(window.location.href);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const handleExport = () => {
    if (!standings?.team_standings) return;

    const csvContent = [
      ["Position", "Team", "Points", "Competitions Played"].join(","),
      ...standings.team_standings.map((standing) =>
        [
          standing.position,
          `"${standing.team_name}"`,
          standing.total_points,
          standing.competitions_played,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${series?.name || "series"}-standings.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (seriesLoading || standingsLoading) return <LoadingSkeleton />;

  if (seriesError) {
    return (
      <ErrorState
        title="Series Not Found"
        message="The series you're looking for doesn't exist or may have been removed."
        serieId={serieId}
      />
    );
  }

  if (standingsError) {
    return (
      <ErrorState
        title="Error Loading Standings"
        message="Unable to load team standings. Please try again."
        onRetry={() => refetchStandings()}
        serieId={serieId}
      />
    );
  }

  if (!series) {
    return (
      <ErrorState
        title="Series Unavailable"
        message="This series is currently unavailable. Please try again later."
        serieId={serieId}
      />
    );
  }

  if (!standings?.team_standings?.length) {
    return (
      <div className="min-h-screen bg-scorecard">
        {/* Main Header with Navigation */}
        <header className="bg-fairway text-scorecard shadow-[0_2px_8px_rgba(27,67,50,0.15)]">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-4 h-16">
              <Link
                to="/player/series/$serieId"
                params={{ serieId }}
                className="p-2 hover:bg-turf rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <TapScoreLogo size="sm" variant="color" layout="horizontal" />
              <div className="w-px h-6 bg-scorecard/30" />
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-semibold font-display truncate">
                  {series.name}
                </h1>
              </div>
            </div>
          </div>
        </header>

        {/* Sub-header with Page Title */}
        <div className="bg-scorecard border-b border-soft-grey shadow-sm">
          <div className="container mx-auto px-4">
            <div className="py-4">
              <h2 className="text-xl font-semibold font-display text-charcoal">
                Team Standings
              </h2>
              <p className="text-sm text-charcoal/70 font-primary mt-1">
                Track team performance and rankings
              </p>
            </div>
          </div>
        </div>

        <main className="container mx-auto px-4 py-12">
          <div className="text-center">
            <Trophy className="h-16 w-16 text-charcoal/30 mx-auto mb-6" />
            <h2 className="text-display-sm font-display font-semibold text-charcoal mb-4">
              No Standings Available
            </h2>
            <p className="text-body-lg text-charcoal/70 mb-8">
              Team standings will appear here once competitions begin.
            </p>
            <Link
              to="/player/series/$serieId"
              params={{ serieId }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-turf hover:bg-fairway text-scorecard rounded-xl transition-colors font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Series Overview
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const topThree = standings.team_standings.slice(0, 3);

  return (
    <div className="min-h-screen bg-scorecard">
      {/* Main Header with Navigation */}
      <header className="bg-fairway text-scorecard shadow-[0_2px_8px_rgba(27,67,50,0.15)]">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 h-16">
            <Link
              to="/player/series/$serieId"
              params={{ serieId }}
              className="p-2 hover:bg-turf rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <TapScoreLogo size="sm" variant="color" layout="horizontal" />
            <div className="w-px h-6 bg-scorecard/30" />
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold font-display truncate">
                {series.name}
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Sub-header with Page Title and Actions */}
      <div className="bg-scorecard border-b border-soft-grey shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div>
              <h2 className="text-xl font-semibold font-display text-charcoal">
                Team Standings
              </h2>
              <p className="text-sm text-charcoal/70 font-primary mt-1">
                Track team performance and rankings
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="p-2 hover:bg-rough rounded-lg transition-colors text-charcoal"
                title="Share standings"
              >
                <Share className="h-5 w-5" />
              </button>
              <button
                onClick={handleExport}
                className="p-2 hover:bg-rough rounded-lg transition-colors text-charcoal"
                title="Export to CSV"
              >
                <Download className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Top 3 Summary Cards */}
        {topThree.length > 0 && (
          <section className="mb-8">
            <h2 className="text-display-sm font-display font-semibold text-charcoal mb-6">
              Top Performers
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topThree.map((standing, index) => (
                <div
                  key={standing.team_id}
                  className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                    index === 0
                      ? "bg-gradient-to-br from-coral/10 to-coral/5 border-coral shadow-lg shadow-coral/20"
                      : index === 1
                      ? "bg-gradient-to-br from-soft-grey/20 to-soft-grey/10 border-soft-grey"
                      : "bg-gradient-to-br from-turf/10 to-turf/5 border-turf"
                  }`}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        index === 0
                          ? "bg-coral text-scorecard"
                          : index === 1
                          ? "bg-soft-grey text-charcoal"
                          : "bg-turf text-scorecard"
                      }`}
                    >
                      {index === 0 ? (
                        <Medal className="h-6 w-6" />
                      ) : (
                        <span className="text-lg font-bold">
                          {standing.position}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-label-lg font-semibold text-charcoal truncate">
                        {standing.team_name}
                      </h3>
                      <p className="text-body-sm text-charcoal/70">
                        {standing.competitions_played} competition
                        {standing.competitions_played !== 1 ? "s" : ""} played
                      </p>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-display-lg font-display font-bold text-charcoal">
                      {standing.total_points}
                    </div>
                    <div className="text-body-sm text-charcoal/70 font-medium">
                      points
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Full Standings Table */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-display-sm font-display font-semibold text-charcoal">
              Complete Standings
            </h2>
            <span className="text-body-sm text-charcoal/70">
              {standings.team_standings.length} team
              {standings.team_standings.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {standings.team_standings.map((standing) => (
              <div
                key={standing.team_id}
                className="p-4 rounded-xl border border-soft-grey bg-scorecard"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm ${
                      standing.position === 1
                        ? "bg-coral text-scorecard shadow-lg shadow-coral/30"
                        : standing.position <= 3
                        ? "bg-turf/20 text-turf"
                        : "bg-charcoal/10 text-charcoal"
                    }`}
                  >
                    {standing.position}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-label-md font-semibold text-charcoal truncate">
                      {standing.team_name}
                    </h3>
                    <p className="text-body-sm text-charcoal/70">
                      {standing.competitions_played} competitions played
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-label-lg font-semibold text-charcoal">
                      {standing.total_points}
                    </div>
                    <div className="text-body-sm text-charcoal/70">points</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block bg-scorecard border border-soft-grey rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-fairway to-turf text-scorecard">
                <tr>
                  <th className="text-left py-4 px-6 font-semibold text-sm uppercase tracking-wide">
                    Position
                  </th>
                  <th className="text-left py-4 px-6 font-semibold text-sm uppercase tracking-wide">
                    Team
                  </th>
                  <th className="text-center py-4 px-6 font-semibold text-sm uppercase tracking-wide">
                    Points
                  </th>
                  <th className="text-center py-4 px-6 font-semibold text-sm uppercase tracking-wide">
                    Competitions
                  </th>
                </tr>
              </thead>
              <tbody>
                {standings.team_standings.map((standing, index) => (
                  <tr
                    key={standing.team_id}
                    className={`border-b border-soft-grey/50 transition-colors hover:bg-rough/20 ${
                      index % 2 === 0 ? "bg-scorecard" : "bg-rough/10"
                    }`}
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm ${
                            standing.position === 1
                              ? "bg-coral text-scorecard"
                              : standing.position <= 3
                              ? "bg-turf/20 text-turf"
                              : "bg-charcoal/10 text-charcoal"
                          }`}
                        >
                          {standing.position}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-semibold text-charcoal">
                        {standing.team_name}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="font-semibold text-charcoal">
                        {standing.total_points}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="text-charcoal">
                        {standing.competitions_played}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

```

# frontend/src/views/player/Standings.tsx

```tsx
import { useParticipants } from "../../api/participants";
import { useCompetitions } from "../../api/competitions";
import { Trophy, Medal, Award, TrendingUp } from "lucide-react";

interface StandingEntry {
  participantId: number;
  participantName: string;
  totalScore: number;
  competitionsPlayed: number;
  averageScore: number;
  bestScore: number;
  position: number;
}

export default function PlayerStandings() {
  const { isLoading: participantsLoading } = useParticipants();
  const { data: competitions, isLoading: competitionsLoading } =
    useCompetitions();

  if (participantsLoading || competitionsLoading) {
    return <div>Loading standings...</div>;
  }

  // Mock standings data - in a real app, this would come from the API
  const standings: StandingEntry[] = [
    {
      participantId: 1,
      participantName: "John Smith",
      totalScore: 285,
      competitionsPlayed: 4,
      averageScore: 71.25,
      bestScore: 68,
      position: 1,
    },
    {
      participantId: 2,
      participantName: "Sarah Johnson",
      totalScore: 292,
      competitionsPlayed: 4,
      averageScore: 73.0,
      bestScore: 70,
      position: 2,
    },
    {
      participantId: 3,
      participantName: "Mike Wilson",
      totalScore: 298,
      competitionsPlayed: 4,
      averageScore: 74.5,
      bestScore: 72,
      position: 3,
    },
    {
      participantId: 4,
      participantName: "Emma Davis",
      totalScore: 305,
      competitionsPlayed: 4,
      averageScore: 76.25,
      bestScore: 74,
      position: 4,
    },
    {
      participantId: 5,
      participantName: "Tom Brown",
      totalScore: 312,
      competitionsPlayed: 4,
      averageScore: 78.0,
      bestScore: 75,
      position: 5,
    },
  ];

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-gray-500 font-medium">#{position}</span>;
    }
  };

  const getPositionBg = (position: number) => {
    switch (position) {
      case 1:
        return "bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200";
      case 2:
        return "bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200";
      case 3:
        return "bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200";
      default:
        return "bg-white border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-green-600" />
            General Standings
          </h2>
          <p className="text-gray-600">
            Overall performance across all competitions
          </p>
        </div>
        <div className="text-sm text-gray-500">
          Based on {competitions?.length || 0} competitions
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span className="text-sm font-medium text-gray-600">
              Total Players
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {standings.length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2">
            <Medal className="h-5 w-5 text-blue-500" />
            <span className="text-sm font-medium text-gray-600">Avg Score</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {(
              standings.reduce((sum, s) => sum + s.averageScore, 0) /
              standings.length
            ).toFixed(1)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-green-500" />
            <span className="text-sm font-medium text-gray-600">
              Best Score
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {Math.min(...standings.map((s) => s.bestScore))}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-500" />
            <span className="text-sm font-medium text-gray-600">
              Competitions
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {competitions?.length || 0}
          </div>
        </div>
      </div>

      {/* Standings Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Leaderboard</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {standings.map((entry) => (
            <div
              key={entry.participantId}
              className={`px-6 py-4 ${getPositionBg(
                entry.position
              )} border-l-4`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8">
                    {getPositionIcon(entry.position)}
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">
                      {entry.participantName}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {entry.competitionsPlayed} competitions played
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="grid grid-cols-3 gap-6 text-sm">
                    <div>
                      <div className="text-gray-600">Total Score</div>
                      <div className="font-semibold text-gray-900">
                        {entry.totalScore}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Average</div>
                      <div className="font-semibold text-gray-900">
                        {entry.averageScore.toFixed(1)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Best</div>
                      <div className="font-semibold text-green-600">
                        {entry.bestScore}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

```

# frontend/src/views/player/TeeTimeDetail.tsx

```tsx
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import {
  useTeeTime,
  useUpdateScore,
  type TeeTimeParticipant,
} from "../../api/tee-times";
import { ScoreEntry } from "../../components/score-entry";
import {
  calculateTotalPlayers,
  formatParticipantTypeDisplay,
  isMultiPlayerFormat,
} from "../../utils/playerUtils";

export default function TeeTimeDetail() {
  const { competitionId, teeTimeId } = useParams({ strict: false });
  const { data: teeTime, isLoading } = useTeeTime(
    teeTimeId ? parseInt(teeTimeId) : 0
  );
  const updateScoreMutation = useUpdateScore();

  if (isLoading) return <div className="p-4">Loading tee time...</div>;
  if (!teeTime) return <div className="p-4">Tee time not found</div>;

  const handleScoreUpdate = (
    participantId: string,
    hole: number,
    score: number
  ) => {
    updateScoreMutation.mutate({
      participantId: parseInt(participantId),
      hole,
      shots: score,
    });
    // Note: All score states are now represented as numbers:
    // -1 = gave up, 0 = unreported, 1+ = actual scores
  };

  const handleComplete = () => {
    // You could add a completion message or redirect here
    console.log("Score entry completed!");
  };

  // Calculate total actual players for display
  const totalActualPlayers = calculateTotalPlayers(teeTime.participants);

  // Transform tee time data to match ScoreEntry component's expected format
  const teeTimeGroup = {
    id: teeTime.id.toString(),
    players: teeTime.participants.map((participant: TeeTimeParticipant) => ({
      participantId: participant.id.toString(),
      participantName: participant.team_name,
      participantType: formatParticipantTypeDisplay(participant.position_name),
      isMultiPlayer: isMultiPlayerFormat(participant.position_name),
      scores: participant.score,
    })),
  };

  const course = {
    id: teeTime.id.toString(),
    name: `${teeTime.course_name} ${teeTime.teetime}`,
    holes: teeTime.pars.map((par: number, index: number) => ({
      number: index + 1,
      par,
    })),
  };

  return (
    <div className="h-screen-mobile flex flex-col bg-gray-50">
      {/* Minimal back navigation - only shown when needed */}
      <div className="absolute top-2 left-2 z-10">
        <Link
          to={`/player/competitions/${competitionId}`}
          className="p-2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full shadow-sm transition-all touch-manipulation"
        >
          <ArrowLeft className="h-4 w-4 text-gray-700" />
        </Link>
      </div>

      {/* Player count indicator */}
      {totalActualPlayers > 4 && (
        <div className="absolute top-2 right-2 z-10">
          <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
            ⚠️ {totalActualPlayers}/4 players
          </div>
        </div>
      )}

      {/* Full-screen optimized score entry */}
      <ScoreEntry
        teeTimeGroup={teeTimeGroup}
        course={course}
        onScoreUpdate={handleScoreUpdate}
        onComplete={handleComplete}
      />
    </div>
  );
}

```

# frontend/src/vite-env.d.ts

```ts
/// <reference types="vite/client" />

```

# frontend/tsconfig.app.json

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}

```

# frontend/tsconfig.json

```json
{
  "files": [],
  "references": [
    {
      "path": "./tsconfig.app.json"
    },
    {
      "path": "./tsconfig.node.json"
    }
  ],
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}

```

# frontend/tsconfig.node.json

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["vite.config.ts"]
}

```

# frontend/vite.config.ts

```ts
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Use different base paths for development and production
  const base = mode === "production" ? "/golf-serie/" : "/";

  return {
    base,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        "/api": {
          target: "http://localhost:3010",
          changeOrigin: true,
        },
      },
    },
  };
});

```

# index.ts

```ts
console.log("Hello via Bun!");
```

# package.json

```json
{
  "name": "golf-serie",
  "version": "1.0.0",
  "description": "Golf Series Backend with Hexagonal Architecture",
  "module": "src/index.ts",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "bun run --watch src/index.ts",
    "prod": "bun src/index.ts",
    "build": "bun build src/index.ts --outdir=./dist",
    "test": "bun test --concurrency 1",
    "test:watch": "bun test --watch",
    "migrate": "bun run src/database/migrate.ts",
    "type-check": "tsc --noEmit",
    "lint": "eslint src/**/*.ts",
    "setup": "bun install && bun run src/database/migrate.ts && bun run src/database/seed.ts",
    "start": "bun run src/index.ts"
  },
  "dependencies": {
    "hono": "^4.7.10",
    "uuid": "^9.0.1",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "@types/uuid": "^9.0.7",
    "drizzle-kit": "^0.20.8",
    "typescript": "^5.3.3",
    "bun-types": "latest"
  },
  "engines": {
    "bun": ">=1.0.0"
  }
}

```

# README.md

```md
# Golf Series Backend

A simple backend system for managing golf courses, teams, and competitions.

## Technology Stack

- **Runtime**: Bun.js
- **Language**: TypeScript (strict mode)
- **Database**: SQLite3 using Bun's built-in SQLite library
- **HTTP Server**: Bun's built-in HTTP server
- **Testing**: Bun's built-in test runner

## Prerequisites

- [Bun](https://bun.sh/) installed on your system

## Setup

1. Clone the repository
2. Install dependencies:
   \`\`\`bash
   bun install
   \`\`\`
3. Run database migrations:
   \`\`\`bash
   bun run migrate
   \`\`\`

## Development

Start the development server:
\`\`\`bash
bun run dev
\`\`\`

The server will start on port 3000 by default. You can change this by setting the `PORT` environment variable.

## Testing

Run the test suite:
\`\`\`bash
bun test
\`\`\`

## API Endpoints

### Courses

- `POST /api/courses` - Create a course
- `GET /api/courses` - List all courses
- `GET /api/courses/:id` - Get single course
- `PUT /api/courses/:id` - Update a course

### Teams

- `POST /api/teams` - Create a team
- `GET /api/teams` - List all teams
- `GET /api/teams/:id` - Get single team
- `PUT /api/teams/:id` - Update team name

### Competitions

- `POST /api/competitions` - Create a competition
- `GET /api/competitions` - List all competitions
- `GET /api/competitions/:id` - Get single competition
- `PUT /api/competitions/:id` - Update a competition

## Data Models

### Course
- id (integer, primary key)
- name (text)
- pars (JSON array of 18 numbers)
- created_at, updated_at (datetime)

### Team
- id (integer, primary key)
- name (text, unique)
- created_at, updated_at (datetime)

### Competition
- id (integer, primary key)
- name (text)
- date (text/date)
- course_id (foreign key to Course)
- created_at, updated_at (datetime)

## Validation Rules

### Course
- Name is required and non-empty
- Pars must be array of exactly 18 positive integers (3-6 range)

### Team
- Name is required and non-empty
- Name must be unique

### Competition
- Name is required and non-empty
- Date is required (basic date format)
- course_id must reference existing course
```

# src/api/competitions.ts

```ts
import { CompetitionService } from "../services/competition-service";
import type { CreateCompetitionDto, UpdateCompetitionDto } from "../types";

export function createCompetitionsApi(competitionService: CompetitionService) {
  return {
    async create(req: Request): Promise<Response> {
      try {
        const data = (await req.json()) as CreateCompetitionDto;
        const competition = await competitionService.create(data);
        return new Response(JSON.stringify(competition), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async findAll(): Promise<Response> {
      try {
        const competitions = await competitionService.findAll();
        return new Response(JSON.stringify(competitions), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async findById(req: Request, id: number): Promise<Response> {
      try {
        const competition = await competitionService.findById(id);
        if (!competition) {
          return new Response(
            JSON.stringify({ error: "Competition not found" }),
            {
              status: 404,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
        return new Response(JSON.stringify(competition), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async update(req: Request, id: number): Promise<Response> {
      try {
        const data = (await req.json()) as UpdateCompetitionDto;
        const competition = await competitionService.update(id, data);
        return new Response(JSON.stringify(competition), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async delete(id: number): Promise<Response> {
      try {
        await competitionService.delete(id);
        return new Response(null, { status: 204 });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async getLeaderboard(competitionId: number): Promise<Response> {
      try {
        const leaderboard = await competitionService.getLeaderboard(
          competitionId
        );
        return new Response(JSON.stringify(leaderboard), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
          const status = error.message === "Competition not found" ? 404 : 400;
          return new Response(JSON.stringify({ error: error.message }), {
            status: status,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },
  };
}

```

# src/api/courses.ts

```ts
import { CourseService } from "../services/course-service";
import type { CreateCourseDto, UpdateCourseDto } from "../types";

export function createCoursesApi(courseService: CourseService) {
  return {
    async create(req: Request): Promise<Response> {
      try {
        const data = (await req.json()) as CreateCourseDto;
        const course = await courseService.create(data);
        return new Response(JSON.stringify(course), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async findAll(): Promise<Response> {
      try {
        const courses = await courseService.findAll();
        return new Response(JSON.stringify(courses), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async findById(req: Request, id: number): Promise<Response> {
      try {
        const course = await courseService.findById(id);
        if (!course) {
          return new Response(JSON.stringify({ error: "Course not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify(course), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async update(req: Request, id: number): Promise<Response> {
      try {
        const data = (await req.json()) as UpdateCourseDto;
        const course = await courseService.update(id, data);
        return new Response(JSON.stringify(course), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async updateHoles(req: Request, id: number): Promise<Response> {
      try {
        const pars = (await req.json()) as number[];
        const course = await courseService.updateHoles(id, pars);
        return new Response(JSON.stringify(course), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async delete(id: number): Promise<Response> {
      try {
        await courseService.delete(id);
        return new Response(null, { status: 204 });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },
  };
}

```

# src/api/documents.ts

```ts
import { DocumentService } from "../services/document-service";
import type { CreateDocumentDto, UpdateDocumentDto } from "../types";

export function createDocumentsApi(documentService: DocumentService) {
  return {
    async create(req: Request): Promise<Response> {
      try {
        const data = (await req.json()) as CreateDocumentDto;
        const document = await documentService.create(data);
        return new Response(JSON.stringify(document), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async findAll(): Promise<Response> {
      try {
        const documents = await documentService.findAll();
        return new Response(JSON.stringify(documents), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async findById(req: Request, id: number): Promise<Response> {
      try {
        const document = await documentService.findById(id);
        if (!document) {
          return new Response(JSON.stringify({ error: "Document not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify(document), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async findBySeriesId(seriesId: number): Promise<Response> {
      try {
        const documents = await documentService.findBySeriesId(seriesId);
        return new Response(JSON.stringify(documents), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async findBySeriesIdAndType(
      seriesId: number,
      type: string
    ): Promise<Response> {
      try {
        const documents = await documentService.findBySeriesIdAndType(
          seriesId,
          type
        );
        return new Response(JSON.stringify(documents), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async update(req: Request, id: number): Promise<Response> {
      try {
        const data = (await req.json()) as UpdateDocumentDto;
        const document = await documentService.update(id, data);
        return new Response(JSON.stringify(document), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async delete(id: number): Promise<Response> {
      try {
        await documentService.delete(id);
        return new Response(null, { status: 204 });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async getDocumentTypes(seriesId: number): Promise<Response> {
      try {
        const types = await documentService.getDocumentTypes(seriesId);
        return new Response(JSON.stringify(types), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async createForSeries(req: Request, seriesId: number): Promise<Response> {
      try {
        const data = (await req.json()) as { title: string; content: string };
        const document = await documentService.create({
          title: data.title,
          content: data.content,
          type: "general", // Default type for series documents
          series_id: seriesId,
        });
        return new Response(JSON.stringify(document), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async updateForSeries(
      req: Request,
      seriesId: number,
      documentId: number
    ): Promise<Response> {
      try {
        // First verify the document belongs to the series
        const document = await documentService.findById(documentId);
        if (!document) {
          return new Response(JSON.stringify({ error: "Document not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (document.series_id !== seriesId) {
          return new Response(
            JSON.stringify({
              error: "Document does not belong to this series",
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        const data = (await req.json()) as { title?: string; content?: string };
        const updatedDocument = await documentService.update(documentId, data);
        return new Response(JSON.stringify(updatedDocument), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async deleteForSeries(
      seriesId: number,
      documentId: number
    ): Promise<Response> {
      try {
        // First verify the document belongs to the series
        const document = await documentService.findById(documentId);
        if (!document) {
          return new Response(JSON.stringify({ error: "Document not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (document.series_id !== seriesId) {
          return new Response(
            JSON.stringify({
              error: "Document does not belong to this series",
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        await documentService.delete(documentId);
        return new Response(null, { status: 204 });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },
  };
}

```

# src/api/participants.ts

```ts
import { ParticipantService } from "../services/participant-service";
import type { CreateParticipantDto, UpdateParticipantDto } from "../types";

export function createParticipantsApi(participantService: ParticipantService) {
  return {
    async create(req: Request): Promise<Response> {
      try {
        const data = (await req.json()) as CreateParticipantDto;
        const participant = await participantService.create(data);
        return new Response(JSON.stringify(participant), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async findAll(): Promise<Response> {
      try {
        const participants = await participantService.findAll();
        return new Response(JSON.stringify(participants), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async findById(req: Request, id: number): Promise<Response> {
      try {
        const participant = await participantService.findById(id);
        if (!participant) {
          return new Response(
            JSON.stringify({ error: "Participant not found" }),
            {
              status: 404,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
        return new Response(JSON.stringify(participant), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async update(req: Request, id: number): Promise<Response> {
      try {
        const data = (await req.json()) as UpdateParticipantDto;
        const participant = await participantService.update(id, data);
        return new Response(JSON.stringify(participant), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async delete(id: number): Promise<Response> {
      try {
        console.log("delete! /api/participants/:id", id);
        await participantService.delete(id);
        console.log("delete complete! /api/participants/:id", id);
        return new Response(null, { status: 204 });
      } catch (error) {
        console.log("delete error! /api/participants/:id", id, error);
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async findAllForCompetition(competitionId: number): Promise<Response> {
      try {
        const participants = await participantService.findAllForCompetition(
          competitionId
        );
        return new Response(JSON.stringify(participants), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async updateScore(req: Request, id: number): Promise<Response> {
      try {
        const data = (await req.json()) as { hole: number; shots: number };

        // Allow -1 (gave up) and 0 (unreported/cleared score) as valid values
        if (data.shots === undefined || data.shots === null) {
          return new Response(JSON.stringify({ error: "Shots are required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (!data.hole) {
          return new Response(JSON.stringify({ error: "Hole is required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const participant = await participantService.updateScore(
          id,
          data.hole,
          data.shots
        );
        return new Response(JSON.stringify(participant), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
          // Return 404 for participant not found, 400 for validation errors
          const status = error.message === "Participant not found" ? 404 : 400;
          return new Response(JSON.stringify({ error: error.message }), {
            status: status,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },
  };
}

```

# src/api/series.ts

```ts
import { SeriesService } from "../services/series-service";
import type { CreateSeriesDto, UpdateSeriesDto } from "../types";

export function createSeriesApi(seriesService: SeriesService) {
  return {
    async create(req: Request): Promise<Response> {
      try {
        const data = (await req.json()) as CreateSeriesDto;
        const series = await seriesService.create(data);
        return new Response(JSON.stringify(series), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async findAll(): Promise<Response> {
      try {
        const series = await seriesService.findAll();
        return new Response(JSON.stringify(series), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async findById(req: Request, id: number): Promise<Response> {
      try {
        const series = await seriesService.findById(id);
        if (!series) {
          return new Response(JSON.stringify({ error: "Series not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify(series), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async update(req: Request, id: number): Promise<Response> {
      try {
        const data = (await req.json()) as UpdateSeriesDto;
        const series = await seriesService.update(id, data);
        return new Response(JSON.stringify(series), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async delete(id: number): Promise<Response> {
      try {
        await seriesService.delete(id);
        return new Response(null, { status: 204 });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async getCompetitions(id: number): Promise<Response> {
      try {
        const competitions = await seriesService.getCompetitions(id);
        return new Response(JSON.stringify(competitions), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async getTeams(id: number): Promise<Response> {
      try {
        const teams = await seriesService.getTeams(id);
        return new Response(JSON.stringify(teams), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async getStandings(id: number): Promise<Response> {
      try {
        const standings = await seriesService.getStandings(id);
        return new Response(JSON.stringify(standings), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async findPublic(): Promise<Response> {
      try {
        const series = await seriesService.findPublic();
        return new Response(JSON.stringify(series), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async addTeam(seriesId: number, teamId: number): Promise<Response> {
      try {
        await seriesService.addTeam(seriesId, teamId);
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async removeTeam(seriesId: number, teamId: number): Promise<Response> {
      try {
        await seriesService.removeTeam(seriesId, teamId);
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async getAvailableTeams(seriesId: number): Promise<Response> {
      try {
        const teams = await seriesService.getAvailableTeams(seriesId);
        return new Response(JSON.stringify(teams), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },
  };
}

```

# src/api/teams.ts

```ts
import { TeamService } from "../services/team-service";
import type { CreateTeamDto, UpdateTeamDto } from "../types";

export function createTeamsApi(teamService: TeamService) {
  return {
    async create(req: Request): Promise<Response> {
      try {
        const data = (await req.json()) as CreateTeamDto;
        const team = await teamService.create(data);
        return new Response(JSON.stringify(team), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async findAll(): Promise<Response> {
      try {
        const teams = await teamService.findAll();
        return new Response(JSON.stringify(teams), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async findById(req: Request, id: number): Promise<Response> {
      try {
        const team = await teamService.findById(id);
        if (!team) {
          return new Response(JSON.stringify({ error: "Team not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify(team), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async update(req: Request, id: number): Promise<Response> {
      try {
        const data = (await req.json()) as UpdateTeamDto;
        const team = await teamService.update(id, data);
        return new Response(JSON.stringify(team), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },
  };
}

```

# src/api/tee-times.ts

```ts
import { TeeTimeService } from "../services/tee-time-service";
import type { CreateTeeTimeDto, UpdateTeeTimeDto } from "../types";

export function createTeeTimesApi(teeTimeService: TeeTimeService) {
  return {
    async createForCompetition(
      req: Request,
      competitionId: number
    ): Promise<Response> {
      try {
        const data = (await req.json()) as CreateTeeTimeDto;
        // Override competition_id with the one from the URL
        const teeTime = await teeTimeService.create({
          ...data,
          competition_id: competitionId,
        });
        return new Response(JSON.stringify(teeTime), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async findAllForCompetition(competitionId: number): Promise<Response> {
      try {
        const teeTimes =
          await teeTimeService.findAllForCompetitionWithParticipants(
            competitionId
          );
        return new Response(JSON.stringify(teeTimes), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "Competition not found"
        ) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async findById(req: Request, id: number): Promise<Response> {
      try {
        const teeTime = await teeTimeService.findById(id);
        if (!teeTime) {
          return new Response(JSON.stringify({ error: "Tee time not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify(teeTime), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async findByIdWithParticipants(
      req: Request,
      id: number
    ): Promise<Response> {
      try {
        const teeTime = await teeTimeService.findByIdWithParticipants(id);
        if (!teeTime) {
          return new Response(JSON.stringify({ error: "Tee time not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify(teeTime), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async update(req: Request, id: number): Promise<Response> {
      try {
        const data = (await req.json()) as UpdateTeeTimeDto;
        const teeTime = await teeTimeService.update(id, data);
        return new Response(JSON.stringify(teeTime), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async delete(id: number): Promise<Response> {
      try {
        await teeTimeService.delete(id);
        return new Response(null, { status: 204 });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async updateParticipantsOrder(req: Request, id: number): Promise<Response> {
      try {
        const body = (await req.json()) as { participantIds: number[] };
        const updatedTeeTime = await teeTimeService.updateParticipantsOrder(
          id,
          body.participantIds
        );
        return new Response(JSON.stringify(updatedTeeTime), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === "Tee time not found") {
            return new Response(JSON.stringify({ error: error.message }), {
              status: 404,
              headers: { "Content-Type": "application/json" },
            });
          }
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },
  };
}

```

# src/app.ts

```ts
import { Database } from "bun:sqlite";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createCompetitionsApi } from "./api/competitions";
import { createCoursesApi } from "./api/courses";
import { createDocumentsApi } from "./api/documents";
import { createParticipantsApi } from "./api/participants";
import { createSeriesApi } from "./api/series";
import { createTeamsApi } from "./api/teams";
import { createTeeTimesApi } from "./api/tee-times";
import { CompetitionService } from "./services/competition-service";
import { CourseService } from "./services/course-service";
import { DocumentService } from "./services/document-service";
import { ParticipantService } from "./services/participant-service";
import { SeriesService } from "./services/series-service";
import { TeamService } from "./services/team-service";
import { TeeTimeService } from "./services/tee-time-service";

export function createApp(db: Database): Hono {
  // Initialize services
  const courseService = new CourseService(db);
  const teamService = new TeamService(db);
  const competitionService = new CompetitionService(db);
  const teeTimeService = new TeeTimeService(db);
  const participantService = new ParticipantService(db);
  const seriesService = new SeriesService(db);
  const documentService = new DocumentService(db);

  // Initialize APIs
  const coursesApi = createCoursesApi(courseService);
  const teamsApi = createTeamsApi(teamService);
  const competitionsApi = createCompetitionsApi(competitionService);
  const teeTimesApi = createTeeTimesApi(teeTimeService);
  const participantsApi = createParticipantsApi(participantService);
  const seriesApi = createSeriesApi(seriesService);
  const documentsApi = createDocumentsApi(documentService);

  // Create Hono app
  const app = new Hono();

  // Add CORS middleware
  app.use(
    "*",
    cors({
      origin: "*",
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
    })
  );

  // Add request logging
  app.use("*", async (c, next) => {
    console.log(`${c.req.method} ${c.req.url}`);
    await next();
  });

  // Course routes
  app.post("/api/courses", async (c) => {
    return await coursesApi.create(c.req.raw);
  });

  app.get("/api/courses", async (c) => {
    return await coursesApi.findAll();
  });

  app.get("/api/courses/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await coursesApi.findById(c.req.raw, id);
  });

  app.put("/api/courses/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await coursesApi.update(c.req.raw, id);
  });

  app.delete("/api/courses/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await coursesApi.delete(id);
  });

  app.put("/api/courses/:id/holes", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await coursesApi.updateHoles(c.req.raw, id);
  });

  // Team routes
  app.post("/api/teams", async (c) => {
    return await teamsApi.create(c.req.raw);
  });

  app.get("/api/teams", async (c) => {
    return await teamsApi.findAll();
  });

  app.get("/api/teams/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await teamsApi.findById(c.req.raw, id);
  });

  app.put("/api/teams/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await teamsApi.update(c.req.raw, id);
  });

  // Competition routes
  app.post("/api/competitions", async (c) => {
    return await competitionsApi.create(c.req.raw);
  });

  app.get("/api/competitions", async (c) => {
    return await competitionsApi.findAll();
  });

  app.get("/api/competitions/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await competitionsApi.findById(c.req.raw, id);
  });

  app.put("/api/competitions/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await competitionsApi.update(c.req.raw, id);
  });

  app.delete("/api/competitions/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await competitionsApi.delete(id);
  });

  app.get("/api/competitions/:competitionId/participants", async (c) => {
    const competitionId = parseInt(c.req.param("competitionId"));
    return await participantsApi.findAllForCompetition(competitionId);
  });

  app.get("/api/competitions/:competitionId/leaderboard", async (c) => {
    const competitionId = parseInt(c.req.param("competitionId"));
    return await competitionsApi.getLeaderboard(competitionId);
  });

  // TeeTime routes
  app.post("/api/competitions/:competitionId/tee-times", async (c) => {
    const competitionId = parseInt(c.req.param("competitionId"));
    return await teeTimesApi.createForCompetition(c.req.raw, competitionId);
  });

  app.get("/api/competitions/:competitionId/tee-times", async (c) => {
    const competitionId = parseInt(c.req.param("competitionId"));
    return await teeTimesApi.findAllForCompetition(competitionId);
  });

  app.get("/api/tee-times/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await teeTimesApi.findByIdWithParticipants(c.req.raw, id);
  });

  app.delete("/api/tee-times/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await teeTimesApi.delete(id);
  });

  app.put("/api/tee-times/:id/participants/order", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await teeTimesApi.updateParticipantsOrder(c.req.raw, id);
  });

  // Participant routes
  app.post("/api/participants", async (c) => {
    return await participantsApi.create(c.req.raw);
  });

  app.get("/api/participants", async (c) => {
    return await participantsApi.findAll();
  });

  app.get("/api/participants/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await participantsApi.findById(c.req.raw, id);
  });

  app.put("/api/participants/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await participantsApi.update(c.req.raw, id);
  });

  app.delete("/api/participants/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await participantsApi.delete(id);
  });

  app.put("/api/participants/:id/score", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await participantsApi.updateScore(c.req.raw, id);
  });

  // Series routes
  app.post("/api/series", async (c) => {
    return await seriesApi.create(c.req.raw);
  });

  app.get("/api/series", async (c) => {
    return await seriesApi.findAll();
  });

  app.get("/api/series/public", async (c) => {
    return await seriesApi.findPublic();
  });

  app.get("/api/series/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await seriesApi.findById(c.req.raw, id);
  });

  app.put("/api/series/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await seriesApi.update(c.req.raw, id);
  });

  app.delete("/api/series/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await seriesApi.delete(id);
  });

  app.get("/api/series/:id/competitions", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await seriesApi.getCompetitions(id);
  });

  app.get("/api/series/:id/teams", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await seriesApi.getTeams(id);
  });

  app.get("/api/series/:id/standings", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await seriesApi.getStandings(id);
  });

  app.post("/api/series/:id/teams/:teamId", async (c) => {
    const seriesId = parseInt(c.req.param("id"));
    const teamId = parseInt(c.req.param("teamId"));
    return await seriesApi.addTeam(seriesId, teamId);
  });

  app.delete("/api/series/:id/teams/:teamId", async (c) => {
    const seriesId = parseInt(c.req.param("id"));
    const teamId = parseInt(c.req.param("teamId"));
    return await seriesApi.removeTeam(seriesId, teamId);
  });

  app.get("/api/series/:id/available-teams", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await seriesApi.getAvailableTeams(id);
  });

  // Document routes
  app.post("/api/documents", async (c) => {
    return await documentsApi.create(c.req.raw);
  });

  app.get("/api/documents", async (c) => {
    return await documentsApi.findAll();
  });

  app.get("/api/documents/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await documentsApi.findById(c.req.raw, id);
  });

  app.put("/api/documents/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await documentsApi.update(c.req.raw, id);
  });

  app.delete("/api/documents/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await documentsApi.delete(id);
  });

  app.post("/api/series/:seriesId/documents", async (c) => {
    const seriesId = parseInt(c.req.param("seriesId"));
    return await documentsApi.createForSeries(c.req.raw, seriesId);
  });

  app.get("/api/series/:seriesId/documents", async (c) => {
    const seriesId = parseInt(c.req.param("seriesId"));
    return await documentsApi.findBySeriesId(seriesId);
  });

  app.put("/api/series/:seriesId/documents/:documentId", async (c) => {
    const seriesId = parseInt(c.req.param("seriesId"));
    const documentId = parseInt(c.req.param("documentId"));
    return await documentsApi.updateForSeries(c.req.raw, seriesId, documentId);
  });

  app.delete("/api/series/:seriesId/documents/:documentId", async (c) => {
    const seriesId = parseInt(c.req.param("seriesId"));
    const documentId = parseInt(c.req.param("documentId"));
    return await documentsApi.deleteForSeries(seriesId, documentId);
  });

  app.get("/api/series/:seriesId/documents/types", async (c) => {
    const seriesId = parseInt(c.req.param("seriesId"));
    return await documentsApi.getDocumentTypes(seriesId);
  });

  app.get("/api/series/:seriesId/documents/type/:type", async (c) => {
    const seriesId = parseInt(c.req.param("seriesId"));
    const type = c.req.param("type");
    return await documentsApi.findBySeriesIdAndType(seriesId, type);
  });

  // Static file serving - fallback for frontend
  app.get("*", async (c) => {
    const pathname = new URL(c.req.url).pathname;
    console.log("Serving static file for:", pathname);

    try {
      let filePath = pathname === "/" ? "/index.html" : pathname;
      const fullPath = `frontend_dist${filePath}`;

      const file = Bun.file(fullPath);
      if (file.size > 0 || filePath === "/index.html") {
        const mimeType = filePath.endsWith(".js")
          ? "application/javascript"
          : filePath.endsWith(".css")
          ? "text/css"
          : filePath.endsWith(".html")
          ? "text/html"
          : filePath.endsWith(".png")
          ? "image/png"
          : filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")
          ? "image/jpeg"
          : filePath.endsWith(".svg")
          ? "image/svg+xml"
          : "text/plain";

        return new Response(file, {
          headers: { "Content-Type": mimeType },
        });
      }
    } catch (error) {
      console.log("File not found:", error);
    }

    // For SPA routes, serve index.html
    try {
      const indexFile = Bun.file("frontend_dist/index.html");
      return new Response(indexFile, {
        headers: { "Content-Type": "text/html" },
      });
    } catch (error) {
      return c.text("Not Found", 404);
    }
  });

  return app;
}

```

# src/database/db.ts

```ts
import { Database } from "bun:sqlite";
import { InitialSchemaMigration } from "./migrations/001_initial_schema";
import { AddTeeTimeIdMigration } from "./migrations/002_add_tee_time_id";
import { AddParticipantScoreMigration } from "./migrations/003_add_participant_score";
import { AddSeriesMigration } from "./migrations/004_add_series";
import { AddSeriesFieldsMigration } from "./migrations/005_add_series_fields";
import { SeriesTeamsJunctionMigration } from "./migrations/006_series_teams_junction";
import { AddDocumentsMigration } from "./migrations/007_add_documents";
import { AddLandingDocumentToSeriesMigration } from "./migrations/008_add_landing_document_to_series";

export function createDatabase(dbPath: string = "golf_series.db"): Database {
  const db = new Database(dbPath);

  // Enable foreign keys
  db.run("PRAGMA foreign_keys = ON");

  return db;
}

export async function initializeDatabase(db: Database): Promise<void> {
  // Create migrations table if it doesn't exist
  db.run(`
    CREATE TABLE IF NOT EXISTS migrations (
      version INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Get applied migrations
  const appliedMigrations = db
    .query("SELECT version FROM migrations")
    .all() as { version: number }[];
  const appliedVersions = new Set(appliedMigrations.map((m) => m.version));

  // Define migrations in order
  const migrations = [
    new InitialSchemaMigration(db),
    new AddTeeTimeIdMigration(db),
    new AddParticipantScoreMigration(db),
    new AddSeriesMigration(db),
    new AddSeriesFieldsMigration(db),
    new SeriesTeamsJunctionMigration(db),
    new AddDocumentsMigration(db),
    new AddLandingDocumentToSeriesMigration(db),
  ];

  // Apply pending migrations
  for (const migration of migrations) {
    if (!appliedVersions.has(migration.version)) {
      await migration.up();
      db.run("INSERT INTO migrations (version, description) VALUES (?, ?)", [
        migration.version,
        migration.description,
      ]);
    }
  }
}

export async function createTestDatabase(): Promise<Database> {
  const db = createDatabase(":memory:");
  await initializeDatabase(db);
  return db;
}

```

# src/database/migrate.ts

```ts
import { createDatabase, initializeDatabase } from "./db";

async function migrate() {
  const db = createDatabase();
  await initializeDatabase(db);
  console.log("Database initialized successfully!");
  db.close();
}

migrate().catch(console.error);

```

# src/database/migrations/001_initial_schema.ts

```ts
import { Migration } from "./base";

export class InitialSchemaMigration extends Migration {
  version = 1;
  description = "Initial database schema";

  async up(): Promise<void> {
    // Create courses table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        pars TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create teams table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create competitions table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS competitions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        course_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id)
      )
    `);

    // Create tee_times table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS tee_times (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teetime TEXT NOT NULL,
        competition_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (competition_id) REFERENCES competitions(id)
      )
    `);

    // Create participants table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tee_order INTEGER NOT NULL,
        team_id INTEGER NOT NULL,
        position_name TEXT NOT NULL,
        player_names TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams(id)
      )
    `);
  }

  async down(): Promise<void> {
    await this.execute("DROP TABLE IF EXISTS participants");
    await this.execute("DROP TABLE IF EXISTS tee_times");
    await this.execute("DROP TABLE IF EXISTS competitions");
    await this.execute("DROP TABLE IF EXISTS teams");
    await this.execute("DROP TABLE IF EXISTS courses");
  }
}

```

# src/database/migrations/002_add_tee_time_id.ts

```ts
import { Migration } from "./base";

export class AddTeeTimeIdMigration extends Migration {
  version = 2;
  description = "Add tee_time_id to participants table";

  async up(): Promise<void> {
    const columnExists = await this.columnExists("participants", "tee_time_id");
    if (!columnExists) {
      await this.execute(`
        ALTER TABLE participants 
        ADD COLUMN tee_time_id INTEGER REFERENCES tee_times(id)
      `);
    }
  }

  async down(): Promise<void> {
    // SQLite doesn't support dropping columns, so we need to recreate the table
    // This is a simplified version that would need to be more robust in production
    await this.execute(`
      CREATE TABLE participants_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tee_order INTEGER NOT NULL,
        team_id INTEGER NOT NULL,
        position_name TEXT NOT NULL,
        player_names TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams(id)
      )
    `);

    await this.execute(`
      INSERT INTO participants_new 
      SELECT id, tee_order, team_id, position_name, player_names, created_at, updated_at 
      FROM participants
    `);

    await this.execute("DROP TABLE participants");
    await this.execute("ALTER TABLE participants_new RENAME TO participants");
  }
}

```

# src/database/migrations/003_add_participant_score.ts

```ts
import { Migration } from "./base";

export class AddParticipantScoreMigration extends Migration {
  version = 3;
  description = "Add score field to participants table";

  async up(): Promise<void> {
    const columnExists = await this.columnExists("participants", "score");
    if (!columnExists) {
      await this.execute(`
        ALTER TABLE participants 
        ADD COLUMN score TEXT DEFAULT '[]'
      `);
    }
  }

  async down(): Promise<void> {
    // SQLite doesn't support dropping columns, so we need to recreate the table
    await this.execute(`
      CREATE TABLE participants_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tee_order INTEGER NOT NULL,
        team_id INTEGER NOT NULL,
        tee_time_id INTEGER NOT NULL,
        position_name TEXT NOT NULL,
        player_names TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams(id),
        FOREIGN KEY (tee_time_id) REFERENCES tee_times(id)
      )
    `);

    await this.execute(`
      INSERT INTO participants_new 
      SELECT id, tee_order, team_id, tee_time_id, position_name, player_names, created_at, updated_at 
      FROM participants
    `);

    await this.execute("DROP TABLE participants");
    await this.execute("ALTER TABLE participants_new RENAME TO participants");
  }
}

```

# src/database/migrations/004_add_series.ts

```ts
import { Migration } from "./base";

export class AddSeriesMigration extends Migration {
  version = 4;
  description = "Add series table and optional series relationships";

  async up(): Promise<void> {
    // Create series table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS series (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        banner_image_url TEXT,
        is_public INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add optional series_id column to competitions table
    await this.execute(`
      ALTER TABLE competitions 
      ADD COLUMN series_id INTEGER REFERENCES series(id) ON DELETE SET NULL
    `);

    // Add optional series_id column to teams table
    await this.execute(`
      ALTER TABLE teams 
      ADD COLUMN series_id INTEGER REFERENCES series(id) ON DELETE SET NULL
    `);
  }

  async down(): Promise<void> {
    // Remove series_id from teams table
    await this.execute(`
      CREATE TABLE teams_temp (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.execute(
      `INSERT INTO teams_temp SELECT id, name, created_at, updated_at FROM teams`
    );
    await this.execute(`DROP TABLE teams`);
    await this.execute(`ALTER TABLE teams_temp RENAME TO teams`);

    // Remove series_id from competitions table
    await this.execute(`
      CREATE TABLE competitions_temp (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        course_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id)
      )
    `);
    await this.execute(
      `INSERT INTO competitions_temp SELECT id, name, date, course_id, created_at, updated_at FROM competitions`
    );
    await this.execute(`DROP TABLE competitions`);
    await this.execute(`ALTER TABLE competitions_temp RENAME TO competitions`);

    // Drop series table
    await this.execute("DROP TABLE IF EXISTS series");
  }
}

```

# src/database/migrations/005_add_series_fields.ts

```ts
import { Migration } from "./base";

export class AddSeriesFieldsMigration extends Migration {
  version = 5;
  description = "Add banner_image_url and is_public fields to series table";

  async up(): Promise<void> {
    // Add banner_image_url column if it doesn't exist
    const bannerColumnExists = await this.columnExists("series", "banner_image_url");
    if (!bannerColumnExists) {
      await this.execute(`
        ALTER TABLE series 
        ADD COLUMN banner_image_url TEXT
      `);
    }

    // Add is_public column if it doesn't exist
    const publicColumnExists = await this.columnExists("series", "is_public");
    if (!publicColumnExists) {
      await this.execute(`
        ALTER TABLE series 
        ADD COLUMN is_public INTEGER DEFAULT 1
      `);
    }
  }

  async down(): Promise<void> {
    // SQLite doesn't support dropping columns, so we need to recreate the table
    await this.execute(`
      CREATE TABLE series_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.execute(`
      INSERT INTO series_new (id, name, description, created_at, updated_at)
      SELECT id, name, description, created_at, updated_at 
      FROM series
    `);

    await this.execute("DROP TABLE series");
    await this.execute("ALTER TABLE series_new RENAME TO series");
  }
}

```

# src/database/migrations/006_series_teams_junction.ts

```ts
import { Migration } from "./base";

export class SeriesTeamsJunctionMigration extends Migration {
  version = 6;
  description =
    "Create series_teams junction table for many-to-many relationship";

  async up(): Promise<void> {
    // Create series_teams junction table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS series_teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        series_id INTEGER NOT NULL,
        team_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
        UNIQUE(series_id, team_id)
      )
    `);

    // Migrate existing data from teams.series_id to junction table
    await this.execute(`
      INSERT OR IGNORE INTO series_teams (series_id, team_id)
      SELECT series_id, id
      FROM teams
      WHERE series_id IS NOT NULL
    `);

    // Temporarily disable foreign keys for table restructuring
    await this.execute("PRAGMA foreign_keys = OFF");

    // Remove series_id column from teams table
    await this.execute(`DROP TABLE IF EXISTS teams_new`);
    await this.execute(`
      CREATE TABLE teams_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.execute(`
      INSERT INTO teams_new (id, name, created_at, updated_at)
      SELECT id, name, created_at, updated_at
      FROM teams
    `);

    await this.execute("DROP TABLE teams");
    await this.execute("ALTER TABLE teams_new RENAME TO teams");

    // Re-enable foreign keys
    await this.execute("PRAGMA foreign_keys = ON");
  }

  async down(): Promise<void> {
    // Add series_id back to teams table
    await this.execute(`
      ALTER TABLE teams 
      ADD COLUMN series_id INTEGER REFERENCES series(id) ON DELETE SET NULL
    `);

    // Migrate data back (only first series per team)
    await this.execute(`
      UPDATE teams 
      SET series_id = (
        SELECT series_id 
        FROM series_teams 
        WHERE series_teams.team_id = teams.id 
        LIMIT 1
      )
    `);

    // Drop junction table
    await this.execute("DROP TABLE IF EXISTS series_teams");
  }
}

```

# src/database/migrations/007_add_documents.ts

```ts
import { Migration } from "./base";

export class AddDocumentsMigration extends Migration {
  version = 7;
  description = "Add documents table for series-related documentation";

  async up(): Promise<void> {
    // Create documents table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT NOT NULL,
        series_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE
      )
    `);

    // Create index for series_id for better query performance
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_documents_series_id ON documents(series_id)
    `);

    // Create index for type for filtering by document type
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type)
    `);
  }

  async down(): Promise<void> {
    // Drop indexes
    await this.execute("DROP INDEX IF EXISTS idx_documents_type");
    await this.execute("DROP INDEX IF EXISTS idx_documents_series_id");

    // Drop documents table
    await this.execute("DROP TABLE IF EXISTS documents");
  }
}

```

# src/database/migrations/008_add_landing_document_to_series.ts

```ts
import { Migration } from "./base";

export class AddLandingDocumentToSeriesMigration extends Migration {
  version = 8;
  description = "Add landing_document_id field to series table";

  async up(): Promise<void> {
    // Add landing_document_id column to series table
    await this.execute(`
      ALTER TABLE series 
      ADD COLUMN landing_document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL
    `);

    // Create index for landing_document_id for better query performance
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_series_landing_document_id ON series(landing_document_id)
    `);
  }

  async down(): Promise<void> {
    // Drop index
    await this.execute("DROP INDEX IF EXISTS idx_series_landing_document_id");

    // Remove landing_document_id from series table by recreating without the column
    await this.execute(`
      CREATE TABLE series_temp (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        banner_image_url TEXT,
        is_public INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.execute(`
      INSERT INTO series_temp (id, name, description, banner_image_url, is_public, created_at, updated_at)
      SELECT id, name, description, banner_image_url, is_public, created_at, updated_at FROM series
    `);

    await this.execute(`DROP TABLE series`);
    await this.execute(`ALTER TABLE series_temp RENAME TO series`);
  }
}

```

# src/database/migrations/base.ts

```ts
import { Database } from "bun:sqlite";

export abstract class Migration {
  abstract version: number;
  abstract description: string;

  constructor(protected db: Database) {}

  abstract up(): Promise<void>;
  abstract down(): Promise<void>;

  protected async execute(sql: string): Promise<void> {
    this.db.run(sql);
  }

  protected async columnExists(
    table: string,
    column: string
  ): Promise<boolean> {
    const stmt = this.db.prepare(
      `SELECT name FROM pragma_table_info(?) WHERE name = ?`
    );
    const result = stmt.get(table, column);
    return result !== null;
  }
}

```

# src/index.ts

```ts
import "./server";

console.log("Hello via Bun!");

```

# src/server.ts

```ts
import { createApp } from "./app";
import { createDatabase, initializeDatabase } from "./database/db";

const db = createDatabase();
initializeDatabase(db);
const app = createApp(db);

const server = Bun.serve({
  port: process.env.PORT || 3010,
  fetch: app.fetch,
});

console.log(`Server running on port ${server.port}`);

```

# src/services/competition-service.ts

```ts
import { Database } from "bun:sqlite";
import type {
  Competition,
  CreateCompetitionDto,
  LeaderboardEntry,
  Participant,
  UpdateCompetitionDto,
} from "../types";

function isValidYYYYMMDD(date: string): boolean {
  const parsed = Date.parse(date);
  return !isNaN(parsed) && /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export class CompetitionService {
  constructor(private db: Database) {}

  async create(data: CreateCompetitionDto): Promise<Competition> {
    if (!data.name?.trim()) {
      throw new Error("Competition name is required");
    }

    if (!data.date?.trim()) {
      throw new Error("Competition date is required");
    }

    // Validate YYYY-MM-DD format
    if (!isValidYYYYMMDD(data.date)) {
      throw new Error("Date must be in YYYY-MM-DD format (e.g., 2024-03-21)");
    }

    // Verify course exists
    const courseStmt = this.db.prepare("SELECT id FROM courses WHERE id = ?");
    const course = courseStmt.get(data.course_id);
    if (!course) {
      throw new Error("Course not found");
    }

    // Verify series exists if provided
    if (data.series_id) {
      const seriesStmt = this.db.prepare("SELECT id FROM series WHERE id = ?");
      const series = seriesStmt.get(data.series_id);
      if (!series) {
        throw new Error("Series not found");
      }
    }

    const stmt = this.db.prepare(`
      INSERT INTO competitions (name, date, course_id, series_id)
      VALUES (?, ?, ?, ?)
      RETURNING *
    `);

    return stmt.get(
      data.name,
      data.date,
      data.course_id,
      data.series_id || null
    ) as Competition;
  }

  async findAll(): Promise<
    (Competition & {
      course: { id: number; name: string };
      participant_count: number;
    })[]
  > {
    const stmt = this.db.prepare(`
      SELECT c.*, co.name as course_name,
        (SELECT COUNT(*) 
         FROM participants p 
         JOIN tee_times t ON p.tee_time_id = t.id 
         WHERE t.competition_id = c.id) as participant_count
      FROM competitions c
      JOIN courses co ON c.course_id = co.id
    `);
    return stmt.all().map((row: any) => ({
      ...row,
      course: {
        id: row.course_id,
        name: row.course_name,
      },
      participant_count: row.participant_count,
    }));
  }

  async findById(
    id: number
  ): Promise<(Competition & { course: { id: number; name: string } }) | null> {
    const stmt = this.db.prepare(`
      SELECT c.*, co.name as course_name
      FROM competitions c
      JOIN courses co ON c.course_id = co.id
      WHERE c.id = ?
    `);
    const row = stmt.get(id) as any;

    if (!row) return null;

    return {
      ...row,
      course: {
        id: row.course_id,
        name: row.course_name,
      },
    };
  }

  async update(id: number, data: UpdateCompetitionDto): Promise<Competition> {
    const competition = await this.findById(id);
    if (!competition) {
      throw new Error("Competition not found");
    }

    if (data.name && !data.name.trim()) {
      throw new Error("Competition name cannot be empty");
    }

    if (data.date && !isValidYYYYMMDD(data.date)) {
      throw new Error("Date must be in YYYY-MM-DD format (e.g., 2024-03-21)");
    }

    if (data.course_id) {
      const courseStmt = this.db.prepare("SELECT id FROM courses WHERE id = ?");
      const course = courseStmt.get(data.course_id);
      if (!course) {
        throw new Error("Course not found");
      }
    }

    if (data.series_id !== undefined) {
      if (data.series_id === null) {
        // Allow setting series_id to null
      } else {
        const seriesStmt = this.db.prepare(
          "SELECT id FROM series WHERE id = ?"
        );
        const series = seriesStmt.get(data.series_id);
        if (!series) {
          throw new Error("Series not found");
        }
      }
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.name) {
      updates.push("name = ?");
      values.push(data.name);
    }

    if (data.date) {
      updates.push("date = ?");
      values.push(data.date);
    }

    if (data.course_id) {
      updates.push("course_id = ?");
      values.push(data.course_id);
    }

    if (data.series_id !== undefined) {
      updates.push("series_id = ?");
      values.push(data.series_id);
    }

    if (updates.length === 0) {
      return competition;
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE competitions 
      SET ${updates.join(", ")}
      WHERE id = ?
      RETURNING *
    `);

    return stmt.get(...values) as Competition;
  }

  async delete(id: number): Promise<void> {
    const competition = await this.findById(id);
    if (!competition) {
      throw new Error("Competition not found");
    }

    // Check if competition has any tee times
    const teeTimesStmt = this.db.prepare(
      "SELECT id FROM tee_times WHERE competition_id = ?"
    );
    const teeTimes = teeTimesStmt.all(id);
    if (teeTimes.length > 0) {
      throw new Error("Cannot delete competition that has tee times");
    }

    const stmt = this.db.prepare("DELETE FROM competitions WHERE id = ?");
    stmt.run(id);
  }

  async getLeaderboard(competitionId: number): Promise<LeaderboardEntry[]> {
    // Verify competition exists and get course info
    const competitionStmt = this.db.prepare(`
      SELECT c.*, co.pars
      FROM competitions c
      JOIN courses co ON c.course_id = co.id
      WHERE c.id = ?
    `);
    const competition = competitionStmt.get(competitionId) as
      | (Competition & { pars: string })
      | null;
    if (!competition) {
      throw new Error("Competition not found");
    }
    console.log("competition leaderboard 1");
    // Get all participants for this competition
    const participantsStmt = this.db.prepare(`
      SELECT p.*, tm.name as team_name
      FROM participants p
      JOIN tee_times t ON p.tee_time_id = t.id
      JOIN teams tm ON p.team_id = tm.id
      WHERE t.competition_id = ?
      ORDER BY t.teetime, p.tee_order
    `);
    const participants = participantsStmt.all(competitionId) as (Participant & {
      team_name: string;
    })[];
    // Parse course pars
    const coursePars = JSON.parse(competition.pars);
    if (!coursePars || coursePars.length === 0) {
      throw new Error("Invalid course pars data structure, no pars found");
    }
    const pars = coursePars;
    // Calculate leaderboard entries
    const leaderboard: LeaderboardEntry[] = participants.map((participant) => {
      // Parse the score field
      const score =
        typeof participant.score === "string"
          ? JSON.parse(participant.score)
          : Array.isArray(participant.score)
          ? participant.score
          : [];

      // Count holes played: positive scores and -1 (gave up) count as played
      // 0 means unreported/cleared, so it doesn't count as played
      const holesPlayed = score.filter((s: number) => s > 0 || s === -1).length;

      // Calculate total shots: only count positive scores
      // -1 (gave up) and 0 (unreported) don't count towards total
      const totalShots = score.reduce(
        (sum: number, shots: number) => sum + (shots > 0 ? shots : 0),
        0
      );

      // Calculate relative to par: only count positive scores
      let relativeToPar = 0;
      try {
        for (let i = 0; i < score.length; i++) {
          if (score[i] > 0 && pars[i] !== undefined) {
            relativeToPar += score[i] - pars[i];
          }
          // Note: -1 (gave up) and 0 (unreported) don't contribute to par calculation
        }
      } catch (error) {
        console.error("Error calculating relative to par", error);
        throw error;
      }

      return {
        participant: {
          ...participant,
          score,
        },
        totalShots,
        holesPlayed,
        relativeToPar,
      };
    });
    // Sort by relative to par (ascending)
    return leaderboard.sort((a, b) => a.relativeToPar - b.relativeToPar);
  }
}

```

# src/services/course-service.ts

```ts
import { Database } from "bun:sqlite";
import type { Course, CreateCourseDto, UpdateCourseDto } from "../types";

interface ParsData {
  holes: number[];
  out: number;
  in: number;
  total: number;
}

function calculatePars(pars: number[]): ParsData {
  const holes = pars;
  const out = pars.slice(0, 9).reduce((sum, par) => sum + par, 0);
  const in_ = pars.slice(9).reduce((sum, par) => sum + par, 0);
  const total = out + in_;

  return {
    holes,
    out,
    in: in_,
    total,
  };
}

export class CourseService {
  constructor(private db: Database) {}

  async create(data: CreateCourseDto): Promise<Course> {
    if (!data.name?.trim()) {
      throw new Error("Course name is required");
    }

    const stmt = this.db.prepare(`
      INSERT INTO courses (name, pars)
      VALUES (?, ?)
      RETURNING *
    `);

    const course = stmt.get(data.name, JSON.stringify([])) as Course;
    const pars = JSON.parse(course.pars as unknown as string);
    course.pars = calculatePars(pars);
    return course;
  }

  async findAll(): Promise<Course[]> {
    const stmt = this.db.prepare("SELECT * FROM courses");
    const courses = stmt.all() as Course[];
    return courses.map((course) => ({
      ...course,
      pars: calculatePars(JSON.parse(course.pars as unknown as string)),
    }));
  }

  async findById(id: number): Promise<Course | null> {
    const stmt = this.db.prepare("SELECT * FROM courses WHERE id = ?");
    const course = stmt.get(id) as Course | null;

    if (!course) return null;

    const pars = JSON.parse(course.pars as unknown as string);
    return {
      ...course,
      pars: calculatePars(pars),
    };
  }

  async update(id: number, data: UpdateCourseDto): Promise<Course> {
    const course = await this.findById(id);
    if (!course) {
      throw new Error("Course not found");
    }

    if (data.name && !data.name.trim()) {
      throw new Error("Course name cannot be empty");
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.name) {
      updates.push("name = ?");
      values.push(data.name);
    }

    if (updates.length === 0) {
      return course;
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE courses 
      SET ${updates.join(", ")}
      WHERE id = ?
      RETURNING *
    `);

    const updated = stmt.get(...values) as Course;
    const pars = JSON.parse(updated.pars as unknown as string);
    return {
      ...updated,
      pars: calculatePars(pars),
    };
  }

  async updateHoles(id: number, pars: number[]): Promise<Course> {
    const course = await this.findById(id);
    if (!course) {
      throw new Error("Course not found");
    }

    if (pars.length > 18) {
      throw new Error("Course cannot have more than 18 holes");
    }

    if (!pars.every((par) => Number.isInteger(par) && par >= 3 && par <= 6)) {
      throw new Error("All pars must be integers between 3 and 6");
    }

    const stmt = this.db.prepare(`
      UPDATE courses 
      SET pars = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `);

    const updated = stmt.get(JSON.stringify(pars), id) as Course;
    return {
      ...updated,
      pars: calculatePars(pars),
    };
  }

  async delete(id: number): Promise<void> {
    const course = await this.findById(id);
    if (!course) {
      throw new Error("Course not found");
    }

    // Check if course is used in any competitions
    const competitionsStmt = this.db.prepare(
      "SELECT id FROM competitions WHERE course_id = ?"
    );
    const competitions = competitionsStmt.all(id);
    if (competitions.length > 0) {
      throw new Error("Cannot delete course that is used in competitions");
    }

    const stmt = this.db.prepare("DELETE FROM courses WHERE id = ?");
    stmt.run(id);
  }
}

```

# src/services/document-service.ts

```ts
import { Database } from "bun:sqlite";
import type { CreateDocumentDto, Document, UpdateDocumentDto } from "../types";

export class DocumentService {
  constructor(private db: Database) {}

  async create(data: CreateDocumentDto): Promise<Document> {
    if (!data.title?.trim()) {
      throw new Error("Document title is required");
    }
    if (!data.content?.trim()) {
      throw new Error("Document content is required");
    }
    if (!data.type?.trim()) {
      throw new Error("Document type is required");
    }
    if (!data.series_id) {
      throw new Error("Series ID is required");
    }

    // Verify series exists
    const seriesStmt = this.db.prepare("SELECT id FROM series WHERE id = ?");
    const series = seriesStmt.get(data.series_id);
    if (!series) {
      throw new Error("Series not found");
    }

    try {
      const stmt = this.db.prepare(`
        INSERT INTO documents (title, content, type, series_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, strftime('%Y-%m-%d %H:%M:%S.%f', 'now'), strftime('%Y-%m-%d %H:%M:%S.%f', 'now'))
        RETURNING *
      `);

      const result = stmt.get(
        data.title.trim(),
        data.content.trim(),
        data.type.trim(),
        data.series_id
      ) as Document;

      return result;
    } catch (error) {
      throw error;
    }
  }

  async findAll(): Promise<Document[]> {
    const stmt = this.db.prepare(`
      SELECT id, title, content, type, series_id, created_at, updated_at
      FROM documents
      ORDER BY strftime('%s.%f', created_at) DESC
    `);
    return stmt.all() as Document[];
  }

  async findById(id: number): Promise<Document | null> {
    const stmt = this.db.prepare(`
      SELECT id, title, content, type, series_id, created_at, updated_at
      FROM documents
      WHERE id = ?
    `);
    const result = stmt.get(id) as Document | undefined;
    return result || null;
  }

  async findBySeriesId(seriesId: number): Promise<Document[]> {
    // Verify series exists
    const seriesStmt = this.db.prepare("SELECT id FROM series WHERE id = ?");
    const series = seriesStmt.get(seriesId);
    if (!series) {
      throw new Error("Series not found");
    }

    const stmt = this.db.prepare(`
      SELECT id, title, content, type, series_id, created_at, updated_at
      FROM documents
      WHERE series_id = ?
      ORDER BY type, title
    `);
    return stmt.all(seriesId) as Document[];
  }

  async findBySeriesIdAndType(
    seriesId: number,
    type: string
  ): Promise<Document[]> {
    // Verify series exists
    const seriesStmt = this.db.prepare("SELECT id FROM series WHERE id = ?");
    const series = seriesStmt.get(seriesId);
    if (!series) {
      throw new Error("Series not found");
    }

    const stmt = this.db.prepare(`
      SELECT id, title, content, type, series_id, created_at, updated_at
      FROM documents
      WHERE series_id = ? AND type = ?
      ORDER BY title
    `);
    return stmt.all(seriesId, type.trim()) as Document[];
  }

  async update(id: number, data: UpdateDocumentDto): Promise<Document> {
    const document = await this.findById(id);
    if (!document) {
      throw new Error("Document not found");
    }

    if (data.title !== undefined && !data.title.trim()) {
      throw new Error("Document title cannot be empty");
    }
    if (data.content !== undefined && !data.content.trim()) {
      throw new Error("Document content cannot be empty");
    }
    if (data.type !== undefined && !data.type.trim()) {
      throw new Error("Document type cannot be empty");
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.title !== undefined) {
      updates.push("title = ?");
      values.push(data.title.trim());
    }

    if (data.content !== undefined) {
      updates.push("content = ?");
      values.push(data.content.trim());
    }

    if (data.type !== undefined) {
      updates.push("type = ?");
      values.push(data.type.trim());
    }

    if (updates.length === 0) {
      return document;
    }

    updates.push("updated_at = strftime('%Y-%m-%d %H:%M:%S.%f', 'now')");
    values.push(id);

    try {
      const stmt = this.db.prepare(`
        UPDATE documents
        SET ${updates.join(", ")}
        WHERE id = ?
        RETURNING *
      `);

      const result = stmt.get(...values) as Document;
      return result;
    } catch (error) {
      throw error;
    }
  }

  async delete(id: number): Promise<void> {
    const document = await this.findById(id);
    if (!document) {
      throw new Error("Document not found");
    }

    const stmt = this.db.prepare("DELETE FROM documents WHERE id = ?");
    stmt.run(id);
  }

  async getDocumentTypes(seriesId: number): Promise<string[]> {
    // Verify series exists
    const seriesStmt = this.db.prepare("SELECT id FROM series WHERE id = ?");
    const series = seriesStmt.get(seriesId);
    if (!series) {
      throw new Error("Series not found");
    }

    const stmt = this.db.prepare(`
      SELECT DISTINCT type
      FROM documents
      WHERE series_id = ?
      ORDER BY type
    `);
    const results = stmt.all(seriesId) as { type: string }[];
    return results.map((r) => r.type);
  }
}

```

# src/services/participant-service.ts

```ts
import { Database } from "bun:sqlite";
import type {
  CreateParticipantDto,
  Participant,
  UpdateParticipantDto,
} from "../types";

export class ParticipantService {
  constructor(private db: Database) {}

  async create(data: CreateParticipantDto): Promise<Participant> {
    if (!data.position_name?.trim()) {
      throw new Error("Position name is required");
    }

    if (data.tee_order < 1) {
      throw new Error("Tee order must be greater than 0");
    }

    // Verify team exists
    const teamStmt = this.db.prepare("SELECT id FROM teams WHERE id = ?");
    const team = teamStmt.get(data.team_id);
    if (!team) {
      throw new Error("Team not found");
    }

    // Verify tee time exists
    const teeTimeStmt = this.db.prepare(
      "SELECT id FROM tee_times WHERE id = ?"
    );
    const teeTime = teeTimeStmt.get(data.tee_time_id);
    if (!teeTime) {
      throw new Error("Tee time not found");
    }

    const stmt = this.db.prepare(`
      INSERT INTO participants (tee_order, team_id, tee_time_id, position_name, player_names, score)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING *
    `);

    const participant = stmt.get(
      data.tee_order,
      data.team_id,
      data.tee_time_id,
      data.position_name,
      data.player_names || null,
      JSON.stringify([])
    ) as Participant;

    return {
      ...participant,
      score: JSON.parse(participant.score as unknown as string),
    };
  }

  async findAll(): Promise<Participant[]> {
    const stmt = this.db.prepare("SELECT * FROM participants");
    const participants = stmt.all() as Participant[];
    return participants.map((p) => ({
      ...p,
      score: JSON.parse(p.score as unknown as string),
    }));
  }

  async findById(id: number): Promise<Participant | null> {
    const stmt = this.db.prepare("SELECT * FROM participants WHERE id = ?");
    const participant = stmt.get(id) as Participant | null;
    if (!participant) return null;

    let score: any[] = [];
    try {
      score = participant.score
        ? JSON.parse(participant.score as unknown as string)
        : [];
    } catch (e) {
      score = [];
    }

    return {
      ...participant,
      score,
    };
  }

  async update(id: number, data: UpdateParticipantDto): Promise<Participant> {
    const participant = await this.findById(id);
    if (!participant) {
      throw new Error("Participant not found");
    }

    if (data.position_name && !data.position_name.trim()) {
      throw new Error("Position name cannot be empty");
    }

    if (data.tee_order && data.tee_order < 1) {
      throw new Error("Tee order must be greater than 0");
    }

    if (data.team_id) {
      const teamStmt = this.db.prepare("SELECT id FROM teams WHERE id = ?");
      const team = teamStmt.get(data.team_id);
      if (!team) {
        throw new Error("Team not found");
      }
    }

    if (data.tee_time_id) {
      const teeTimeStmt = this.db.prepare(
        "SELECT id FROM tee_times WHERE id = ?"
      );
      const teeTime = teeTimeStmt.get(data.tee_time_id);
      if (!teeTime) {
        throw new Error("Tee time not found");
      }
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.tee_order) {
      updates.push("tee_order = ?");
      values.push(data.tee_order);
    }

    if (data.team_id) {
      updates.push("team_id = ?");
      values.push(data.team_id);
    }

    if (data.tee_time_id) {
      updates.push("tee_time_id = ?");
      values.push(data.tee_time_id);
    }

    if (data.position_name) {
      updates.push("position_name = ?");
      values.push(data.position_name);
    }

    if (data.player_names !== undefined) {
      updates.push("player_names = ?");
      values.push(data.player_names);
    }

    if (updates.length === 0) {
      return participant;
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE participants 
      SET ${updates.join(", ")}
      WHERE id = ?
      RETURNING *
    `);

    const updated = stmt.get(...values) as Participant;
    return {
      ...updated,
      score: JSON.parse(updated.score as unknown as string),
    };
  }

  async findAllForCompetition(competitionId: number): Promise<Participant[]> {
    // Verify competition exists
    const competitionStmt = this.db.prepare(
      "SELECT id FROM competitions WHERE id = ?"
    );
    const competition = competitionStmt.get(competitionId);
    if (!competition) {
      throw new Error("Competition not found");
    }

    // Join with tee_times to get participants for this competition
    const stmt = this.db.prepare(`
      SELECT p.* 
      FROM participants p
      JOIN tee_times t ON p.tee_time_id = t.id
      WHERE t.competition_id = ?
      ORDER BY t.teetime, p.tee_order
    `);
    const participants = stmt.all(competitionId) as Participant[];
    return participants.map((p) => ({
      ...p,
      score: JSON.parse(p.score as unknown as string),
    }));
  }

  async updateScore(
    id: number,
    hole: number,
    shots: number
  ): Promise<Participant> {
    const participant = await this.findById(id);
    if (!participant) {
      throw new Error("Participant not found");
    }

    // Get the course to validate hole number
    const courseStmt = this.db.prepare(`
      SELECT co.pars
      FROM participants p
      JOIN tee_times t ON p.tee_time_id = t.id
      JOIN competitions c ON t.competition_id = c.id
      JOIN courses co ON c.course_id = co.id
      WHERE p.id = ?
    `);
    const course = courseStmt.get(id) as { pars: string } | null;
    if (!course) {
      throw new Error("Could not find course for participant");
    }

    const pars = JSON.parse(course.pars);
    if (hole < 1 || hole > pars.length) {
      throw new Error(`Hole number must be between 1 and ${pars.length}`);
    }

    // Allow -1 (gave up) and 0 (unreported/cleared score) as special values
    // Regular shots must be positive
    if (shots !== -1 && shots !== 0 && shots < 1) {
      throw new Error(
        "Shots must be greater than 0, or -1 (gave up), or 0 (clear score)"
      );
    }

    // Initialize score array with zeros if null or empty
    let score = participant.score || [];
    if (!Array.isArray(score)) {
      score = new Array(pars.length).fill(0);
    } else {
      for (let i = 0; i < pars.length; i++) {
        if (score[i] === null || score[i] === undefined) {
          score[i] = 0;
        }
      }
    }

    score[hole - 1] = shots;

    const stmt = this.db.prepare(`
      UPDATE participants 
      SET score = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `);

    const stringifiedScore = JSON.stringify(score);
    stmt.run(stringifiedScore, id);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error("Participant not found");
    }
    return updated;
  }

  async delete(id: number): Promise<void> {
    const participant = await this.findById(id);
    if (!participant) {
      throw new Error("Participant not found");
    }

    const stmt = this.db.prepare("DELETE FROM participants WHERE id = ?");
    stmt.run(id);
  }
}

```

# src/services/series-service.ts

```ts
import { Database } from "bun:sqlite";
import type {
  CreateSeriesDto,
  Series,
  SeriesStandings,
  SeriesTeamStanding,
  UpdateSeriesDto,
} from "../types";

export class SeriesService {
  constructor(private db: Database) {}

  async create(data: CreateSeriesDto): Promise<Series> {
    if (!data.name?.trim()) {
      throw new Error("Series name is required");
    }

    try {
      const stmt = this.db.prepare(`
        INSERT INTO series (name, description, banner_image_url, is_public, created_at, updated_at)
        VALUES (?, ?, ?, ?, strftime('%Y-%m-%d %H:%M:%S.%f', 'now'), strftime('%Y-%m-%d %H:%M:%S.%f', 'now'))
        RETURNING *
      `);

      const result = stmt.get(
        data.name,
        data.description || null,
        data.banner_image_url || null,
        data.is_public !== undefined ? (data.is_public ? 1 : 0) : 1
      ) as any;

      // Convert is_public from integer to boolean
      return {
        ...result,
        is_public: Boolean(result.is_public),
      } as Series;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("UNIQUE constraint failed")
      ) {
        throw new Error("Series name must be unique");
      }
      throw error;
    }
  }

  async findAll(): Promise<Series[]> {
    const stmt = this.db.prepare(`
      SELECT id, name, description, banner_image_url, is_public, landing_document_id, created_at, updated_at
      FROM series
      ORDER BY strftime('%s.%f', created_at) DESC
    `);
    const results = stmt.all() as any[];
    return results.map((result) => ({
      ...result,
      is_public: Boolean(result.is_public),
    })) as Series[];
  }

  async findPublic(): Promise<Series[]> {
    const stmt = this.db.prepare(`
      SELECT id, name, description, banner_image_url, is_public, landing_document_id, created_at, updated_at
      FROM series
      WHERE is_public = 1
      ORDER BY strftime('%s.%f', created_at) DESC
    `);
    const results = stmt.all() as any[];
    return results.map((result) => ({
      ...result,
      is_public: Boolean(result.is_public),
    })) as Series[];
  }

  async findById(id: number): Promise<Series | null> {
    const stmt = this.db.prepare(`
      SELECT id, name, description, banner_image_url, is_public, landing_document_id, created_at, updated_at
      FROM series
      WHERE id = ?
    `);
    const result = stmt.get(id) as any;
    if (!result) return null;

    return {
      ...result,
      is_public: Boolean(result.is_public),
    } as Series;
  }

  async update(id: number, data: UpdateSeriesDto): Promise<Series> {
    const series = await this.findById(id);
    if (!series) {
      throw new Error("Series not found");
    }

    if (data.name !== undefined && !data.name.trim()) {
      throw new Error("Series name cannot be empty");
    }

    // Validate landing_document_id if provided
    if (data.landing_document_id !== undefined) {
      if (data.landing_document_id !== null) {
        const documentStmt = this.db.prepare(`
          SELECT id, series_id FROM documents WHERE id = ?
        `);
        const document = documentStmt.get(data.landing_document_id) as any;

        if (!document) {
          throw new Error("Landing document not found");
        }

        if (document.series_id !== id) {
          throw new Error("Landing document must belong to the same series");
        }
      }
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push("name = ?");
      values.push(data.name);
    }

    if (data.description !== undefined) {
      updates.push("description = ?");
      values.push(data.description);
    }

    if (data.banner_image_url !== undefined) {
      updates.push("banner_image_url = ?");
      values.push(data.banner_image_url);
    }

    if (data.is_public !== undefined) {
      updates.push("is_public = ?");
      values.push(data.is_public ? 1 : 0);
    }

    if (data.landing_document_id !== undefined) {
      updates.push("landing_document_id = ?");
      values.push(data.landing_document_id);
    }

    if (updates.length === 0) {
      return series;
    }

    updates.push("updated_at = strftime('%Y-%m-%d %H:%M:%S.%f', 'now')");
    values.push(id);

    try {
      const stmt = this.db.prepare(`
        UPDATE series
        SET ${updates.join(", ")}
        WHERE id = ?
        RETURNING *
      `);

      const result = stmt.get(...values) as any;
      return {
        ...result,
        is_public: Boolean(result.is_public),
      } as Series;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("UNIQUE constraint failed")
      ) {
        throw new Error("Series name must be unique");
      }
      throw error;
    }
  }

  async delete(id: number): Promise<void> {
    const series = await this.findById(id);
    if (!series) {
      throw new Error("Series not found");
    }

    const stmt = this.db.prepare("DELETE FROM series WHERE id = ?");
    stmt.run(id);
  }

  async getCompetitions(id: number): Promise<any[]> {
    const series = await this.findById(id);
    if (!series) {
      throw new Error("Series not found");
    }

    const stmt = this.db.prepare(`
      SELECT c.*, co.name as course_name
      FROM competitions c
      JOIN courses co ON c.course_id = co.id
      WHERE c.series_id = ?
      ORDER BY c.date
    `);

    return stmt.all(id).map((row: any) => ({
      ...row,
      course: {
        id: row.course_id,
        name: row.course_name,
      },
    }));
  }

  async getTeams(id: number): Promise<any[]> {
    const series = await this.findById(id);
    if (!series) {
      throw new Error("Series not found");
    }

    const stmt = this.db.prepare(`
      SELECT t.id, t.name, t.created_at, t.updated_at
      FROM teams t
      JOIN series_teams st ON t.id = st.team_id
      WHERE st.series_id = ?
      ORDER BY t.name
    `);

    return stmt.all(id);
  }

  async addTeam(seriesId: number, teamId: number): Promise<void> {
    // Verify series exists
    const series = await this.findById(seriesId);
    if (!series) {
      throw new Error("Series not found");
    }

    // Verify team exists
    const teamStmt = this.db.prepare("SELECT id FROM teams WHERE id = ?");
    const team = teamStmt.get(teamId);
    if (!team) {
      throw new Error("Team not found");
    }

    try {
      const stmt = this.db.prepare(`
        INSERT INTO series_teams (series_id, team_id)
        VALUES (?, ?)
      `);
      stmt.run(seriesId, teamId);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("UNIQUE constraint failed")
      ) {
        throw new Error("Team is already in this series");
      }
      throw error;
    }
  }

  async removeTeam(seriesId: number, teamId: number): Promise<void> {
    const stmt = this.db.prepare(`
      DELETE FROM series_teams
      WHERE series_id = ? AND team_id = ?
    `);
    const result = stmt.run(seriesId, teamId);

    if (result.changes === 0) {
      throw new Error("Team is not in this series");
    }
  }

  async getAvailableTeams(seriesId: number): Promise<any[]> {
    const stmt = this.db.prepare(`
      SELECT t.id, t.name, t.created_at, t.updated_at
      FROM teams t
      WHERE t.id NOT IN (
        SELECT team_id
        FROM series_teams
        WHERE series_id = ?
      )
      ORDER BY t.name
    `);

    return stmt.all(seriesId);
  }

  async getStandings(id: number): Promise<SeriesStandings> {
    const series = await this.findById(id);
    if (!series) {
      throw new Error("Series not found");
    }

    // Get all competitions in the series
    const competitionsStmt = this.db.prepare(`
      SELECT c.id, c.name, c.date
      FROM competitions c
      WHERE c.series_id = ?
      ORDER BY c.date
    `);
    const competitions = competitionsStmt.all(id) as any[];

    // Get team results for each competition
    const teamStandings: { [teamId: number]: SeriesTeamStanding } = {};

    for (const competition of competitions) {
      // Calculate team results for this competition using the same logic as competition leaderboard
      const teamResults = await this.calculateCompetitionTeamResults(
        competition.id
      );

      for (const teamResult of teamResults) {
        if (!teamStandings[teamResult.team_id]) {
          teamStandings[teamResult.team_id] = {
            team_id: teamResult.team_id,
            team_name: teamResult.team_name,
            total_points: 0,
            competitions_played: 0,
            position: 0,
            competitions: [],
          };
        }

        teamStandings[teamResult.team_id].total_points += teamResult.points;
        teamStandings[teamResult.team_id].competitions_played += 1;
        teamStandings[teamResult.team_id].competitions.push({
          competition_id: competition.id,
          competition_name: competition.name,
          competition_date: competition.date,
          points: teamResult.points,
          position: teamResult.position,
        });
      }
    }

    // Sort teams by total points (descending) and assign positions
    const sortedTeams = Object.values(teamStandings)
      .sort((a, b) => b.total_points - a.total_points)
      .map((team, index) => ({
        ...team,
        position: index + 1,
      }));

    return {
      series,
      team_standings: sortedTeams,
      total_competitions: competitions.length,
    };
  }

  private async calculateCompetitionTeamResults(
    competitionId: number
  ): Promise<any[]> {
    // Get all participants for this competition
    const participantsStmt = this.db.prepare(`
      SELECT p.*, tm.name as team_name, tm.id as team_id
      FROM participants p
      JOIN tee_times t ON p.tee_time_id = t.id
      JOIN teams tm ON p.team_id = tm.id
      WHERE t.competition_id = ?
      ORDER BY t.teetime, p.tee_order
    `);
    const participants = participantsStmt.all(competitionId) as any[];

    // Get course pars for score calculation
    const courseStmt = this.db.prepare(`
      SELECT co.pars
      FROM competitions c
      JOIN courses co ON c.course_id = co.id
      WHERE c.id = ?
    `);
    const courseResult = courseStmt.get(competitionId) as any;
    const coursePars = JSON.parse(courseResult.pars);

    // Calculate individual scores
    const participantScores = participants.map((participant) => {
      const scores = JSON.parse(participant.score || "[]");
      let totalShots = 0;
      let totalPlayedPar = 0;
      let holesPlayed = 0;
      const hasGaveUp = scores.some((score: number) => score === -1);

      if (!hasGaveUp) {
        for (let i = 0; i < Math.min(scores.length, coursePars.length); i++) {
          const score = scores[i];
          const par = coursePars[i];
          if (score && score > 0) {
            totalShots += score;
            totalPlayedPar += par;
            holesPlayed++;
          }
        }
      }

      return {
        participant,
        totalShots: hasGaveUp ? 0 : totalShots,
        relativeToPar: hasGaveUp ? 0 : totalShots - totalPlayedPar,
        holesPlayed: hasGaveUp ? 0 : holesPlayed,
        isValidRound: !hasGaveUp,
      };
    });

    // Group by team and calculate team totals
    const teamGroups: { [teamName: string]: any } = {};

    participantScores.forEach((entry) => {
      const teamName = entry.participant.team_name;
      const teamId = entry.participant.team_id;

      if (!teamGroups[teamName]) {
        teamGroups[teamName] = {
          team_id: teamId,
          team_name: teamName,
          participants: [],
          totalShots: 0,
          relativeToPar: 0,
        };
      }

      teamGroups[teamName].participants.push({
        name: entry.participant.player_names || "",
        position: entry.participant.position_name,
        totalShots: entry.totalShots,
        relativeToPar: entry.relativeToPar,
      });

      teamGroups[teamName].totalShots += entry.totalShots;
      teamGroups[teamName].relativeToPar += entry.relativeToPar;
    });

    // Sort teams by relativeToPar and assign points
    return Object.values(teamGroups)
      .sort((a, b) => a.relativeToPar - b.relativeToPar)
      .map((team, index, array) => {
        const position = index + 1;
        let points = array.length - position + 1; // Base points (last place gets 1 point)

        // Add extra points for top 3 positions
        if (position === 1) points += 2; // First place gets 2 extra points
        if (position === 2) points += 1; // Second place gets 1 extra point

        return {
          ...team,
          position,
          points,
        };
      });
  }
}

```

# src/services/team-service.ts

```ts
import { Database } from "bun:sqlite";
import type { CreateTeamDto, Team, UpdateTeamDto } from "../types";

export class TeamService {
  constructor(private db: Database) {}

  async create(data: CreateTeamDto): Promise<Team> {
    if (!data.name?.trim()) {
      throw new Error("Team name is required");
    }

    try {
      const stmt = this.db.prepare(`
        INSERT INTO teams (name, created_at, updated_at)
        VALUES (?, strftime('%Y-%m-%d %H:%M:%S.%f', 'now'), strftime('%Y-%m-%d %H:%M:%S.%f', 'now'))
        RETURNING *
      `);

      return stmt.get(data.name) as Team;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("UNIQUE constraint failed")
      ) {
        throw new Error("Team name must be unique");
      }
      throw error;
    }
  }

  async findAll(): Promise<Team[]> {
    const stmt = this.db.prepare(
      "SELECT id, name, created_at, updated_at FROM teams"
    );
    return stmt.all() as Team[];
  }

  async findById(id: number): Promise<Team | null> {
    const stmt = this.db.prepare(
      "SELECT id, name, created_at, updated_at FROM teams WHERE id = ?"
    );
    return stmt.get(id) as Team | null;
  }

  async update(id: number, data: UpdateTeamDto): Promise<Team> {
    if (data.name !== undefined && !data.name.trim()) {
      throw new Error("Team name cannot be empty");
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push("name = ?");
      values.push(data.name);
    }

    if (updates.length === 0) {
      const team = await this.findById(id);
      if (!team) {
        throw new Error("Team not found");
      }
      return team;
    }

    updates.push("updated_at = strftime('%Y-%m-%d %H:%M:%S.%f', 'now')");
    values.push(id);

    try {
      const stmt = this.db.prepare(`
        UPDATE teams 
        SET ${updates.join(", ")}
        WHERE id = ?
        RETURNING *
      `);

      const team = stmt.get(...values) as Team | null;
      if (!team) {
        throw new Error("Team not found");
      }

      return team;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("UNIQUE constraint failed")
      ) {
        throw new Error("Team name must be unique");
      }
      throw error;
    }
  }
}

```

# src/services/tee-time-service.ts

```ts
import { Database } from "bun:sqlite";
import type {
  CreateTeeTimeDto,
  Participant,
  TeeTime,
  TeeTimeWithParticipants,
  UpdateTeeTimeDto,
} from "../types";

export class TeeTimeService {
  constructor(private db: Database) {}

  async create(data: CreateTeeTimeDto): Promise<TeeTime> {
    if (!data.teetime?.trim()) {
      throw new Error("Tee time is required");
    }

    // Verify competition exists
    const competitionStmt = this.db.prepare(
      "SELECT id FROM competitions WHERE id = ?"
    );
    const competition = competitionStmt.get(data.competition_id);
    if (!competition) {
      throw new Error("Competition not found");
    }

    const stmt = this.db.prepare(`
      INSERT INTO tee_times (teetime, competition_id)
      VALUES (?, ?)
      RETURNING *
    `);

    return stmt.get(data.teetime, data.competition_id) as TeeTime;
  }

  async findAllForCompetition(competitionId: number): Promise<TeeTime[]> {
    // Verify competition exists
    const competitionStmt = this.db.prepare(
      "SELECT id FROM competitions WHERE id = ?"
    );
    const competition = competitionStmt.get(competitionId);
    if (!competition) {
      throw new Error("Competition not found");
    }

    const stmt = this.db.prepare(
      "SELECT * FROM tee_times WHERE competition_id = ? order by teetime"
    );
    return stmt.all(competitionId) as TeeTime[];
  }

  async findAllForCompetitionWithParticipants(
    competitionId: number
  ): Promise<TeeTimeWithParticipants[]> {
    // Verify competition exists
    const competitionStmt = this.db.prepare(
      "SELECT id FROM competitions WHERE id = ?"
    );
    const competition = competitionStmt.get(competitionId);
    if (!competition) {
      throw new Error("Competition not found");
    }

    // Get all tee times for the competition with course info
    const teeTimesStmt = this.db.prepare(`
      SELECT t.*, co.name as course_name, co.pars
      FROM tee_times t
      JOIN competitions c ON t.competition_id = c.id
      JOIN courses co ON c.course_id = co.id
      WHERE t.competition_id = ?
      ORDER BY t.teetime
    `);
    const teeTimes = teeTimesStmt.all(competitionId) as (TeeTime & {
      course_name: string;
      pars: string;
    })[];

    // Get all participants for each tee time
    const participantsStmt = this.db.prepare(`
      SELECT p.*, t.name as team_name 
      FROM participants p
      LEFT JOIN teams t ON p.team_id = t.id
      WHERE p.tee_time_id = ?
      ORDER BY p.tee_order
    `);

    const teeTimesWithParticipants: TeeTimeWithParticipants[] = teeTimes.map(
      (teeTime) => {
        const participants = participantsStmt.all(
          teeTime.id
        ) as (Participant & { team_name?: string })[];

        // Parse the score field for each participant
        const parsedParticipants = participants.map((p) => ({
          ...p,
          score:
            typeof p.score === "string" ? JSON.parse(p.score) : p.score || [],
        }));

        // Parse course pars
        const pars = JSON.parse(teeTime.pars);

        return {
          ...teeTime,
          course_name: teeTime.course_name,
          pars,
          participants: parsedParticipants,
        };
      }
    );

    return teeTimesWithParticipants;
  }

  async findById(id: number): Promise<TeeTime | null> {
    const stmt = this.db.prepare("SELECT * FROM tee_times WHERE id = ?");
    return stmt.get(id) as TeeTime | null;
  }

  async findByIdWithParticipants(
    id: number
  ): Promise<TeeTimeWithParticipants | null> {
    // Get tee time with course information
    const teeTimeStmt = this.db.prepare(`
      SELECT t.*, co.name as course_name, co.pars
      FROM tee_times t
      JOIN competitions c ON t.competition_id = c.id
      JOIN courses co ON c.course_id = co.id
      WHERE t.id = ?
    `);
    const teeTimeWithCourse = teeTimeStmt.get(id) as
      | (TeeTime & { course_name: string; pars: string })
      | null;
    if (!teeTimeWithCourse) return null;

    // Get all participants for this tee time
    const participantsStmt = this.db.prepare(`
      SELECT p.*, t.name as team_name 
      FROM participants p
      LEFT JOIN teams t ON p.team_id = t.id
      WHERE p.tee_time_id = ?
      ORDER BY p.tee_order
    `);

    const participants = participantsStmt.all(id) as (Participant & {
      team_name?: string;
    })[];

    // Parse the score field for each participant
    const parsedParticipants = participants.map((p) => ({
      ...p,
      score: typeof p.score === "string" ? JSON.parse(p.score) : p.score || [],
    }));

    // Parse course pars
    const pars = JSON.parse(teeTimeWithCourse.pars);

    return {
      ...teeTimeWithCourse,
      course_name: teeTimeWithCourse.course_name,
      pars,
      participants: parsedParticipants,
    };
  }

  async update(id: number, data: UpdateTeeTimeDto): Promise<TeeTime> {
    const teeTime = await this.findById(id);
    if (!teeTime) {
      throw new Error("Tee time not found");
    }

    if (data.teetime && !data.teetime.trim()) {
      throw new Error("Tee time cannot be empty");
    }

    if (data.competition_id) {
      const competitionStmt = this.db.prepare(
        "SELECT id FROM competitions WHERE id = ?"
      );
      const competition = competitionStmt.get(data.competition_id);
      if (!competition) {
        throw new Error("Competition not found");
      }
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.teetime) {
      updates.push("teetime = ?");
      values.push(data.teetime);
    }

    if (data.competition_id) {
      updates.push("competition_id = ?");
      values.push(data.competition_id);
    }

    if (updates.length === 0) {
      return teeTime;
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE tee_times 
      SET ${updates.join(", ")}
      WHERE id = ?
      RETURNING *
    `);

    return stmt.get(...values) as TeeTime;
  }

  async delete(id: number): Promise<void> {
    const teeTime = await this.findById(id);
    if (!teeTime) {
      throw new Error("Tee time not found");
    }

    const stmt = this.db.prepare("DELETE FROM tee_times WHERE id = ?");
    stmt.run(id);
  }

  async updateParticipantsOrder(
    id: number,
    newOrder: number[]
  ): Promise<TeeTimeWithParticipants> {
    const teeTime = await this.findById(id);
    if (!teeTime) {
      throw new Error("Tee time not found");
    }

    // Verify that all participant IDs in newOrder belong to this tee time
    const participantsStmt = this.db.prepare(`
      SELECT id FROM participants WHERE tee_time_id = ?
    `);
    const participants = participantsStmt.all(id) as { id: number }[];
    const participantIds = participants.map((p) => p.id);
    const invalidIds = newOrder.filter((id) => !participantIds.includes(id));
    if (invalidIds.length > 0) {
      throw new Error(`Invalid participant IDs: ${invalidIds.join(", ")}`);
    }

    // Update the tee_order for each participant
    const updateStmt = this.db.prepare(`
      UPDATE participants SET tee_order = ? WHERE id = ?
    `);
    newOrder.forEach((participantId, index) => {
      updateStmt.run(index + 1, participantId);
    });

    // Return the updated tee time with participants
    const updatedTeeTime = await this.findByIdWithParticipants(id);
    if (!updatedTeeTime) {
      throw new Error("Failed to retrieve updated tee time");
    }
    return updatedTeeTime;
  }
}

```

# src/types/index.ts

```ts
export interface ParsData {
  holes: number[];
  out: number;
  in: number;
  total: number;
}

export interface Course {
  id: number;
  name: string;
  pars: ParsData;
  created_at: string;
  updated_at: string;
}

export interface Series {
  id: number;
  name: string;
  description?: string;
  banner_image_url?: string;
  is_public: boolean;
  landing_document_id?: number;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Competition {
  id: number;
  name: string;
  date: string;
  course_id: number;
  series_id?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCourseDto {
  name: string;
}

export interface UpdateCourseDto {
  name?: string;
}

export interface CreateSeriesDto {
  name: string;
  description?: string;
  banner_image_url?: string;
  is_public?: boolean;
}

export interface UpdateSeriesDto {
  name?: string;
  description?: string;
  banner_image_url?: string;
  is_public?: boolean;
  landing_document_id?: number;
}

export interface SeriesTeamStanding {
  team_id: number;
  team_name: string;
  total_points: number;
  competitions_played: number;
  position: number;
  competitions: {
    competition_id: number;
    competition_name: string;
    competition_date: string;
    points: number;
    position: number;
  }[];
}

export interface SeriesStandings {
  series: Series;
  team_standings: SeriesTeamStanding[];
  total_competitions: number;
}

export interface CreateTeamDto {
  name: string;
}

export interface UpdateTeamDto {
  name?: string;
}

export interface CreateCompetitionDto {
  name: string;
  date: string;
  course_id: number;
  series_id?: number;
}

export interface UpdateCompetitionDto {
  name?: string;
  date?: string;
  course_id?: number;
  series_id?: number;
}

export interface TeeTime {
  id: number;
  teetime: string;
  competition_id: number;
  created_at: string;
  updated_at: string;
}

export interface TeeTimeWithParticipants {
  id: number;
  teetime: string;
  competition_id: number;
  created_at: string;
  updated_at: string;
  course_name: string;
  pars: ParsData;
  participants: Participant[];
}

export interface Participant {
  id: number;
  tee_order: number;
  team_id: number;
  tee_time_id: number;
  position_name: string;
  player_names?: string;
  score: number[];
  created_at: string;
  updated_at: string;
}

export interface CreateTeeTimeDto {
  teetime: string;
  competition_id: number;
}

export interface UpdateTeeTimeDto {
  teetime?: string;
  competition_id?: number;
}

export interface CreateParticipantDto {
  tee_order: number;
  team_id: number;
  tee_time_id: number;
  position_name: string;
  player_names?: string;
}

export interface UpdateParticipantDto {
  tee_order?: number;
  team_id?: number;
  tee_time_id?: number;
  position_name?: string;
  player_names?: string;
}

export interface LeaderboardEntry {
  participant: Participant;
  totalShots: number;
  holesPlayed: number;
  relativeToPar: number;
}

export interface Document {
  id: number;
  title: string;
  content: string;
  type: string;
  series_id: number;
  created_at: string;
  updated_at: string;
}

export interface CreateDocumentDto {
  title: string;
  content: string;
  type: string;
  series_id: number;
}

export interface UpdateDocumentDto {
  title?: string;
  content?: string;
  type?: string;
}

export interface CreateSeriesDocumentDto {
  title: string;
  content: string;
}

export interface UpdateSeriesDocumentDto {
  title?: string;
  content?: string;
}

```

# tests/test-helpers.ts

```ts
import { Database } from "bun:sqlite";
import { expect } from "bun:test";
import { createTestDatabase } from "../src/database/db";
import { startTestServer, stopTestServer } from "./test-server";

// Type for the makeRequest function that gets returned
export type MakeRequestFunction = (
  path: string,
  method?: string,
  body?: any
) => Promise<Response>;

export async function setupTestDatabase(): Promise<{
  db: Database;
  makeRequest: MakeRequestFunction;
}> {
  const db = await createTestDatabase();
  const port = await startTestServer(db);

  // Create closure that captures the port
  const makeRequest: MakeRequestFunction = async (
    path: string,
    method: string = "GET",
    body?: any
  ): Promise<Response> => {
    const url = `http://localhost:${port}${path}`;
    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    return fetch(url, options);
  };

  return { db, makeRequest };
}

export async function cleanupTestDatabase(db: Database): Promise<void> {
  await stopTestServer(db);
  // Reduced cleanup delay
  await new Promise((resolve) => setTimeout(resolve, 10));
  db.close();
}

export async function expectJsonResponse(response: Response): Promise<any> {
  expect(response.headers.get("content-type")).toContain("application/json");
  return await response.json();
}

export function expectErrorResponse(response: Response, status: number): void {
  expect(response.status).toBe(status);
  expect(response.headers.get("content-type")).toContain("application/json");
}

```

# tests/test-server.ts

```ts
// test-server.ts
import { Database } from "bun:sqlite";
import { createApp } from "../src/app";

type ServerInfo = {
  server: ReturnType<typeof Bun.serve>;
  port: number;
  refCount: number;
};
const servers = new WeakMap<Database, ServerInfo>();

export async function startTestServer(db: Database): Promise<number> {
  // Re-use the same server if a test in the same file
  // calls setupTestDatabase() more than once.
  const existing = servers.get(db);
  if (existing) {
    existing.refCount++;
    return existing.port;
  }

  // 👇  0 → “please pick any free port for me”
  const server = Bun.serve({
    port: 0,
    fetch: createApp(db).fetch,
  });

  const info: ServerInfo = { server, port: server.port!, refCount: 1 };
  servers.set(db, info);

  // Give the listener a tick to bind.
  await new Promise((r) => setTimeout(r, 5));

  return info.port; // makeRequest() keeps using this
}

export async function stopTestServer(db: Database): Promise<void> {
  const info = servers.get(db);
  if (!info) return;

  info.refCount--;
  if (info.refCount === 0) {
    info.server.stop();
    servers.delete(db);
  }
}

```

# tsconfig.json

```json
{
  "compilerOptions": {
    // Enable latest features
    "lib": ["ESNext", "DOM"],
    "target": "ESNext",
    "module": "ESNext",
    "moduleDetection": "force",
    "jsx": "react-jsx",
    "allowJs": true,

    // Bundler mode
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,

    // Best practices
    "strict": true,
    "skipLibCheck": true,
    "noFallthroughCasesInSwitch": true,

    // Some stricter flags (disabled by default)
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noPropertyAccessFromIndexSignature": false
  }
}

```

