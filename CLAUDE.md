# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 🎯 Sub-Agent Workflow

This project uses **specialized sub-agents** for implementation tasks to improve context efficiency and focus.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│   You (Main Coordinator)                                    │
│   - Discuss requirements with user                          │
│   - Break down tasks into implementation/testing/review     │
│   - Spawn specialized sub-agents                            │
│   - Coordinate workflow: Implement → Test → Review → Commit │
│   - Report results                                          │
└─────────────────────────────────────────────────────────────┘
                           │
      ┌────────────────────┼────────────────────┐
      │                    │                    │
      ▼                    ▼                    ▼
┌──────────┐         ┌──────────┐        ┌──────────┐
│ IMPLEMENT│         │   TEST   │        │  REVIEW  │
└──────────┘         └──────────┘        └──────────┘
      │                    │                    │
  ├───┴───┐            ├───┴───┐               │
  ▼       ▼            ▼       ▼               ▼
┌────┐  ┌────┐     ┌────┐  ┌────┐         ┌────┐
│Back│  │Front│    │Back│  │Front│        │Code│
│end │  │end  │    │Test│  │Test │        │Rev │
│    │  │     │    │    │  │     │        │iew │
└────┘  └────┘     └────┘  └────┘         └────┘
Skills: Skills:    Skills: Skills:        Skills:
- service - frontend - service - e2e      - code-
  -audit    -design   -testing -testing     review
- sql-   - component
  -security  -check
- complexity - contrast
  -check     -validator
           - navigation
             -guard
```

**Complete Development Pipeline**: Plan → Implement → Test → Review → Commit

### When to Use Each Sub-Agent

#### 🔧 Backend Sub-Agent (`subagent_type: "general-purpose"`)

**Use for:**
- API endpoint implementation (new routes, handlers)
- Service layer logic (business rules, calculations)
- Database schema changes (migrations)
- SQL query optimization
- Authentication/authorization changes
- Backend testing

**Reads:**
- `docs/backend/BACKEND_GUIDE.md` - All backend-specific rules
- `docs/backend/SQL_PATTERNS.md` - **MUST READ before writing SQL**
- `CLAUDE.md` (this file) - General domain knowledge

**SQL Query Protocol (MANDATORY):**
Before writing ANY SQL query, you MUST:
1. Read `docs/backend/SQL_PATTERNS.md` to check for existing patterns
2. Search codebase: `grep -r "JOIN tablename" src/services/`
3. If 70%+ similar pattern exists → reuse or extract to utility
4. If genuinely new → add pattern to SQL_PATTERNS.md

**Example task:**
```
"Implement a new API endpoint for player handicap calculation.
Read docs/backend/BACKEND_GUIDE.md for backend patterns.
IMPORTANT: Check docs/backend/SQL_PATTERNS.md before writing any SQL queries."
```

#### 🎨 Frontend Sub-Agent (`subagent_type: "general-purpose"`)

**Use for:**
- React component implementation
- UI/UX changes and new pages
- shadcn/ui component integration
- Design system implementation
- Navigation and routing changes
- Frontend testing

**Reads:**
- `docs/frontend/FRONTEND_GUIDE.md` - All frontend-specific rules
- `docs/visual-design-rules.md` - **MANDATORY** design principles
- `docs/STYLE_GUIDE.md` - **MANDATORY** design system
- `CLAUDE.md` (this file) - General domain knowledge

**Skills loaded:**
- `frontend-design` - Design system enforcement and visual hierarchy
- `component-check` - Validates shadcn/ui component usage
- `contrast-validator` - WCAG AA contrast ratio validation
- `navigation-guard` - PlayerPageLayout usage validation

**Example task:**
```
"Create a new player profile page following the design system.
CRITICAL: Read docs/visual-design-rules.md and docs/STYLE_GUIDE.md
before implementing any UI. Read docs/frontend/FRONTEND_GUIDE.md
for frontend patterns."
```

#### 🧪 Backend Test Sub-Agent (`subagent_type: "general-purpose"`)

**Use for:**
- Writing service layer tests
- Writing API endpoint tests
- Testing database operations
- Testing business logic calculations
- Testing transactions

**Reads:**
- `docs/testing/BACKEND_TEST_GUIDE.md` - Backend testing patterns
- `CLAUDE.md` (this file) - General domain knowledge

**Skills loaded:**
- `service-testing` - In-memory database testing, CRUD coverage

**Example task:**
```
"Write comprehensive tests for the CompetitionService.
Read docs/testing/BACKEND_TEST_GUIDE.md for testing patterns."
```

#### 🎭 Frontend Test Sub-Agent (`subagent_type: "general-purpose"`)

**Use for:**
- Writing E2E tests with Playwright
- Testing user flows
- Testing navigation
- Testing forms and interactions
- Mobile responsive testing

**Reads:**
- `docs/testing/FRONTEND_TEST_GUIDE.md` - E2E testing patterns
- `CLAUDE.md` (this file) - General domain knowledge

**Skills loaded:**
- `e2e-testing` - Playwright patterns, data-testid selectors

**Example task:**
```
"Write E2E tests for the score entry workflow.
Read docs/testing/FRONTEND_TEST_GUIDE.md for Playwright patterns."
```

#### 🔍 Code Review Sub-Agent (`subagent_type: "general-purpose"`)

**Use for:**
- Reviewing code before commit
- Detecting code smells
- Finding DRY violations
- Checking architecture compliance
- Security review

**Reads:**
- `docs/CODE_REVIEW_GUIDE.md` - Review checklist and patterns
- `CLAUDE.md` (this file) - General domain knowledge

**Skills loaded:**
- `code-review-checklist` - Systematic review process

**Example task:**
```
"Review the changes in the CompetitionService for code quality,
security, and architecture compliance. Generate a review report.
Read docs/CODE_REVIEW_GUIDE.md for review checklist."
```

#### 🔬 Explore Sub-Agent (`subagent_type: "Explore"`)

**Use for:**
- Codebase exploration and research
- Finding files and understanding structure
- Answering questions about architecture
- Investigation tasks (not implementation)

**Example task:**
```
"Explore the codebase to understand how player handicaps are calculated
and where the calculation logic is located."
```

### Coordination Workflow

**Complete Feature Development Pipeline:**

1. **You discuss requirements** with the user
2. **You break down the task** into frontend/backend components
3. **Implementation Phase:**
   - Spawn **Backend Sub-Agent** for API/service implementation
   - Spawn **Frontend Sub-Agent** for UI implementation (can run in parallel)
4. **Testing Phase** (automatic for non-trivial changes):
   - Spawn **Backend Test Sub-Agent** after backend implementation
   - Spawn **Frontend Test Sub-Agent** after frontend implementation
   - Run tests and verify all pass
5. **Review Phase** (automatic before commit):
   - Spawn **Code Review Sub-Agent** to analyze all changes
   - Review detects code smells, DRY violations, security issues
   - Generate review report with specific fixes
6. **You coordinate results** and report back to the user with:
   - Implementation summary
   - Test results (pass/fail counts)
   - Review findings (issues + recommendations)

**When to Skip Testing/Review:**
- **Trivial changes**: Documentation updates, comment changes
- **User requests**: "Skip tests for now" or "Quick fix, no review needed"
- **Iteration**: During rapid prototyping (but catch up before commit)

**Benefits:**
- ✅ Sub-agents load only relevant rules (better context management)
- ✅ Focused execution on narrower scopes
- ✅ Parallel work on independent frontend/backend changes
- ✅ Clear separation of concerns
- ✅ Automated testing and review (quality gates)
- ✅ User maintains control through coordination layer

---

## 📚 Domain Model

### Core Entities

**Series**: Tournament series with multiple competitions
- Multi-event championships spanning multiple dates
- Can contain multiple tours
- Has standings, documents, and enrollments

**Tours**: Sub-competitions within a series
- Groups related competitions together
- Has its own standings and leaderboard
- Players enroll in tours to participate

**Competitions**: Individual golf events
- Linked to specific golf courses and dates
- Can be part of a series/tour or standalone
- Contains tee times and participants
- Produces leaderboards and results

**Courses**: Golf courses with 18-hole configuration
- 18 holes with par values (3-6 per hole)
- Multiple tees with different ratings
- Gender-specific course ratings and slope ratings

**Tee Times**: Scheduled start times for groups
- Groups of players starting at specific times
- Typically 1-4 players per tee time

**Participants**: Individual players or teams in competitions
- Assigned to tee times
- Have scores (18-element arrays, one per hole)
- Can be locked to prevent further edits

**Players**: User accounts with profiles
- Authentication and authorization
- Display names and handicap indices
- Profile data and statistics

**Documents**: Markdown content for series information
- Rules, schedules, announcements
- Versioned and editable

### Key Business Rules

- Courses must have exactly 18 holes with pars between 3-6
- Participants have scores as 18-element arrays (one per hole)
- Team names must be unique
- Competition dates must be in YYYY-MM-DD format
- Foreign key constraints are enforced throughout
- Display names take precedence over system names
- Handicap calculations follow World Handicap System (WHS)

---

## 🗄️ Database Management

### Technology
- **SQLite** database: `golf_series.db` (local), production on Coolify VPS
- **Custom migration system** extending base `Migration` class
- **Prepared statements** for all queries (security requirement)

### Key Commands

```bash
# Local development database
bun run migrate         # Apply pending migrations to local db
bun run db:migrate      # Run migration script on local dev db
bun run db:health       # Health check on local dev db

# Production database workflow (local testing)
bun run db:setup-prod   # Fetch production db to deploy-tmp/db.sqlite
bun run db:migrate:prod # Run migrations on prod db copy
bun run db:health:prod  # Check prod db copy health
bun run dev:prod        # Run dev server with prod db copy
```

### Migration Guidelines

- Migrations are one-way (no rollback implemented)
- Use `columnExists()` helper for conditional schema changes
- Test migrations on production database copy before deploying
- Always use prepared statements in queries

---

## 🚀 Deployment

### Backend
- Built with **Bun.js runtime**
- Serves both API and static frontend files
- Database: SQLite file on VPS
- Environment variables: `PORT`, `DATABASE_PATH`

### Frontend
- Built as **static files** copied to `frontend_dist/`
- Supports deployment under subpaths
- Dynamic API base URL detection for dev/prod

### Production Environment
- Hosted on **Coolify VPS**
- Automatic deployments from main branch
- Health checks via `/health` endpoint

---

## 📝 Git Commit Guidelines

Use conventional commit format:

```bash
type(scope): description

# Types
feat     # New feature
fix      # Bug fix
refactor # Code restructuring
docs     # Documentation changes
test     # Test changes
chore    # Build, deps, configs
```

**Important:**
- Write clear, descriptive commit messages
- Use bullet points for multiple changes
- **NEVER include `Co-Authored-By` lines** in commit messages
- Stage only relevant files (exclude `.claude/settings.local.json`)

**Examples:**
```bash
feat(player-profile): add handicap history display
fix(leaderboard): correct net score calculation for 9-hole rounds
refactor(services): extract player display name logic to utility
docs(backend): update service layer organization guidelines
```

---

## 📖 Documentation Structure

This project uses a **three-tier documentation structure**:

### Tier 1: General Coordination (This File)
- **`CLAUDE.md`** - Sub-agent workflow, domain model, general guidelines
- Read by: Main coordinator + all sub-agents

### Tier 2: Specialized Implementation Guides
- **`docs/backend/BACKEND_GUIDE.md`** - All backend patterns and rules
  - Read by: Backend sub-agent
- **`docs/frontend/FRONTEND_GUIDE.md`** - All frontend patterns and rules
  - Read by: Frontend sub-agent

### Tier 3: Feature-Specific Documentation
- **Backend Features** (`docs/backend/`)
  - `database-schema.md` - Schema reference
  - `authorization.md` - Auth and roles
  - And other backend domain guides
- **Frontend Features** (`docs/frontend/`)
  - Feature-specific UI patterns and guides
- **Design System** (`docs/`)
  - `visual-design-rules.md` - **MANDATORY** for all frontend work
  - `STYLE_GUIDE.md` - **MANDATORY** design system

---

## 🎯 Quick Reference for Main Coordinator

### Before Spawning Implementation Sub-Agents

**Backend Sub-Agent:**
1. ✅ Confirm task requires backend implementation
2. ✅ Break down into specific, actionable steps
3. ✅ Instruct to read `docs/backend/BACKEND_GUIDE.md`
4. ✅ **If writing SQL:** Instruct to read `docs/backend/SQL_PATTERNS.md` and search for similar patterns first
5. ✅ Mention relevant feature docs if applicable

**Frontend Sub-Agent:**
1. ✅ Confirm task requires frontend implementation
2. ✅ Break down into specific, actionable steps
3. ✅ **CRITICAL:** Instruct to read `docs/visual-design-rules.md` and `docs/STYLE_GUIDE.md`
4. ✅ Instruct to read `docs/frontend/FRONTEND_GUIDE.md`
5. ✅ Mention relevant feature docs if applicable

### Before Spawning Testing Sub-Agents

**Backend Test Sub-Agent:**
1. ✅ Backend implementation completed
2. ✅ Instruct to read `docs/testing/BACKEND_TEST_GUIDE.md`
3. ✅ Specify what to test (service, API, business logic)

**Frontend Test Sub-Agent:**
1. ✅ Frontend implementation completed
2. ✅ Instruct to read `docs/testing/FRONTEND_TEST_GUIDE.md`
3. ✅ Specify user flows to test

### Before Spawning Code Review Sub-Agent

1. ✅ Implementation and tests completed
2. ✅ Instruct to read `docs/CODE_REVIEW_GUIDE.md`
3. ✅ Request comprehensive review report
4. ✅ Specify files/changes to review

### Full-Stack Features

When a feature spans both frontend and backend:

1. **Discuss** requirements with user
2. **Break** into independent frontend + backend tasks
3. **Implement**: Spawn both implementation sub-agents in parallel
4. **Test**: Spawn both testing sub-agents in parallel (after implementation)
5. **Review**: Spawn code review sub-agent (after tests pass)
6. **Report**: Coordinate results and report back with summary

**Example complete workflow:**
```
User: "Add player statistics page with API endpoint"
  ↓
You: Spawn Backend + Frontend sub-agents in parallel
  ↓
Backend implements API, Frontend implements UI
  ↓
You: Spawn Backend Test + Frontend Test sub-agents
  ↓
Tests written and run
  ↓
You: Spawn Code Review sub-agent
  ↓
Review report generated
  ↓
You: Report to user:
  - Implementation: ✅ API endpoint and UI page created
  - Tests: ✅ 8/8 passing (5 backend, 3 frontend)
  - Review: ⚠️ 2 suggestions (see report)
```

---

## ⚠️ Important Constraints

### Backend
- Database migrations are one-way (no rollback)
- Always use prepared statements (security)
- Maintain existing API contracts
- Backend serves as both API and static file server

### Frontend
- Mobile-first design mandatory
- Follow TapScore design system strictly
- Maintain WCAG AA contrast ratios (4.5:1 minimum)
- Use shadcn/ui components over raw HTML
- PlayerPageLayout for detail pages only, not top-level lists

### General
- Never use emojis unless explicitly requested
- Keep responses concise and focused
- Prioritize technical accuracy over validation
- Always test changes before marking complete

---

## 🔗 Key Documentation Links

### For Backend Sub-Agents
- **Backend Guide**: `docs/backend/BACKEND_GUIDE.md`
- **SQL Patterns Catalog**: `docs/backend/SQL_PATTERNS.md` ⚠️ **READ BEFORE WRITING SQL**
- **Database Schema**: `docs/backend/database-schema.md`
- **Authorization**: `docs/backend/authorization.md`

### For Frontend Sub-Agents
- **Frontend Guide**: `docs/frontend/FRONTEND_GUIDE.md`
- **Visual Design Rules**: `docs/visual-design-rules.md` ⚠️ **MANDATORY**
- **TapScore Style Guide**: `docs/STYLE_GUIDE.md` ⚠️ **MANDATORY**

---

*This file focuses on coordination and general system knowledge. Implementation details are in the specialized guides.*
