# .cursor/rules/frontend-rules.mdc

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

# .cursor/rules/product-description.mdc

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

# .cursor/rules/series-detail-design.mdc

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

# .cursor/rules/stylguide.mdc

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

# .gitignore

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

# components.json

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

# eslint.config.js

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

# index.html

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

# package.json

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

# public/tapscore_horizontal.png

This is a binary file of the type: Image

# public/tapscore_logo.png

This is a binary file of the type: Image

# public/vite.svg

This is a file of the type: SVG Image

# src/App.css

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

# src/App.tsx

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

# src/components/competition/CompetitionInfoBar.tsx

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
      ? "bg-rough bg-opacity-30 rounded-xl p-4 border border-soft-grey"
      : "bg-rough bg-opacity-30 border-t border-soft-grey px-4 py-2 flex-shrink-0";

  return (
    <div className={baseClass}>
      <div className="flex items-center justify-center gap-4 md:gap-8 text-xs text-charcoal font-primary">
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3 text-turf" />
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
        <div className="flex items-center gap-1">
          <MapPin className="h-3 w-3 text-turf" />
          <span className="truncate">{courseName || "Loading..."}</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3 text-turf" />
          <span>{totalParticipants} participants</span>
        </div>
      </div>
    </div>
  );
}

```

# src/components/competition/index.ts

```ts
export { CompetitionInfoBar } from "./CompetitionInfoBar";
export { LeaderboardComponent } from "./LeaderboardComponent";
export { ParticipantsListComponent } from "./ParticipantsListComponent";
export { TeamResultComponent } from "./TeamResultComponent";

```

# src/components/competition/LeaderboardComponent.tsx

```tsx
import {
  formatToPar,
  getToParColor,
  getPositionColor,
} from "../../utils/scoreCalculations";

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
        <div className="bg-scorecard rounded-xl border border-soft-grey overflow-hidden shadow-sm">
          <div className="divide-y divide-soft-grey">
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
              .map((entry, index) => (
                <button
                  key={entry.participant.id}
                  onClick={() => onParticipantClick(entry.participant.id)}
                  className={`w-full text-left px-4 md:px-6 py-3 md:py-4 ${getPositionColor(
                    index + 1
                  )} border-l-4 hover:bg-rough hover:bg-opacity-20 transition-colors cursor-pointer`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                      <div className="flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full bg-scorecard border-2 border-turf flex-shrink-0">
                        <span className="text-xs md:text-sm font-bold text-fairway font-display">
                          {index + 1}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm md:text-lg font-medium text-fairway truncate font-display">
                          {entry.participant.team_name}{" "}
                          {entry.participant.position_name}
                        </h4>
                        <p className="text-xs md:text-sm text-turf font-primary">
                          Thru {entry.holesPlayed} holes
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-3 md:gap-6">
                        <div>
                          <div className="text-xs text-turf font-primary">
                            Score
                          </div>
                          <div className="text-lg md:text-xl font-bold text-charcoal font-display">
                            {entry.totalShots}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-turf font-primary">
                            To Par
                          </div>
                          <div
                            className={`text-lg md:text-xl font-bold font-display ${getToParColor(
                              entry.relativeToPar
                            )}`}
                          >
                            {formatToPar(entry.relativeToPar)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
          </div>
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

# src/components/competition/ParticipantsListComponent.tsx

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

# src/components/competition/TeamResultComponent.tsx

```tsx
import {
  formatToPar,
  getToParColor,
  getPositionColor,
} from "../../utils/scoreCalculations";

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
        <div className="bg-scorecard rounded-xl border border-soft-grey overflow-hidden shadow-sm">
          <div className="divide-y divide-soft-grey">
            {teamResults.map((team) => (
              <div
                key={team.teamName}
                className={`px-4 md:px-6 py-3 md:py-4 ${getPositionColor(
                  team.position
                )} border-l-4`}
              >
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                    <div className="flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full bg-scorecard border-2 border-turf flex-shrink-0">
                      <span className="text-xs md:text-sm font-bold text-fairway font-display">
                        {team.position}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm md:text-lg font-medium text-fairway truncate font-display">
                        {team.teamName}
                      </h4>
                      <p className="text-xs md:text-sm text-turf font-primary">
                        {team.participants.length} players
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-2 md:gap-6">
                      <div>
                        <div className="text-xs text-turf font-primary">
                          Total
                        </div>
                        <div className="text-sm md:text-xl font-bold text-charcoal font-display">
                          {team.totalShots}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-turf font-primary">
                          To Par
                        </div>
                        <div
                          className={`text-sm md:text-xl font-bold font-display ${getToParColor(
                            team.relativeToPar
                          )}`}
                        >
                          {formatToPar(team.relativeToPar)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-turf font-primary">
                          Points
                        </div>
                        <div className="text-sm md:text-xl font-bold text-turf font-display">
                          {team.points}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 md:gap-4 mt-2 md:mt-4">
                  <div>
                    <h5 className="text-xs md:text-sm font-medium text-fairway mb-1 md:mb-2 font-primary">
                      Player Scores
                    </h5>
                    <div className="space-y-1 md:space-y-2">
                      {team.participants.map((participant) => (
                        <div
                          key={participant.name}
                          className="flex items-center justify-between text-xs md:text-sm"
                        >
                          <span className="text-turf truncate flex-1 mr-2 font-primary">
                            {participant.name} ({participant.position})
                          </span>
                          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
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
              </div>
            ))}
          </div>
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

# src/components/MarkdownEditor.tsx

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

# src/components/navigation/BottomTabNavigation.tsx

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

# src/components/navigation/HamburgerMenu.tsx

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

# src/components/navigation/HoleNavigation.tsx

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
        "bg-yellow-400 text-gray-900 px-4 py-3 flex items-center justify-between",
        "shadow-lg border-t border-yellow-500",
        className
      )}
    >
      <button
        onClick={onPrevious}
        disabled={!canGoPrevious}
        className={cn(
          "p-2 rounded-lg transition-all duration-200 touch-manipulation",
          canGoPrevious
            ? "hover:bg-yellow-300 active:bg-yellow-500"
            : "opacity-50 cursor-not-allowed"
        )}
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-6 text-center">
        <div className="flex flex-col">
          <span className="text-xs font-medium opacity-80">Par</span>
          <span className="text-lg font-bold">{holePar}</span>
        </div>

        <div className="flex flex-col">
          <span className="text-xs font-medium opacity-80">Hole</span>
          <span className="text-xl font-bold">{currentHole}</span>
        </div>

        {holeHcp !== undefined && (
          <div className="flex flex-col">
            <span className="text-xs font-medium opacity-80">HCP</span>
            <span className="text-lg font-bold">{holeHcp}</span>
          </div>
        )}
      </div>

      <button
        onClick={onNext}
        disabled={!canGoNext}
        className={cn(
          "p-2 rounded-lg transition-all duration-200 touch-manipulation",
          canGoNext
            ? "hover:bg-yellow-300 active:bg-yellow-500"
            : "opacity-50 cursor-not-allowed"
        )}
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}

```

# src/components/navigation/index.ts

```ts
export { BottomTabNavigation } from "./BottomTabNavigation";
export { HamburgerMenu } from "./HamburgerMenu";
export { HoleNavigation } from "./HoleNavigation";

```

# src/components/series/recent-activity.tsx

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

# src/index.css

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

# src/lib/utils.ts

```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

```

# src/main.tsx

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

# src/router.tsx

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

// Default redirect to player standings
const indexRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <Navigate to="/player/competitions" replace />,
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

# src/views/player/Competitions.tsx

```tsx
import { Link } from "@tanstack/react-router";
import { useCompetitions } from "../../api/competitions";
import { useCourses } from "../../api/courses";
import { Calendar, Users, ChevronRight } from "lucide-react";

export default function PlayerCompetitions() {
  const { data: competitions, isLoading, error } = useCompetitions();
  const { data: courses } = useCourses();

  if (isLoading)
    return (
      <div className="text-charcoal font-primary">Loading competitions...</div>
    );
  if (error)
    return (
      <div className="text-flag font-primary">Error loading competitions</div>
    );

  const getCourse = (courseId: number) => {
    return courses?.find((course) => course.id === courseId);
  };

  const getCompetitionStatus = (date: string) => {
    const competitionDate = new Date(date);
    const today = new Date();
    const diffTime = competitionDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        status: "completed",
        label: "Completed",
        color: "text-charcoal bg-soft-grey bg-opacity-30",
      };
    } else if (diffDays === 0) {
      return {
        status: "today",
        label: "Today",
        color: "text-scorecard bg-turf",
      };
    } else if (diffDays <= 7) {
      return {
        status: "upcoming",
        label: `In ${diffDays} days`,
        color: "text-scorecard bg-coral",
      };
    } else {
      return {
        status: "future",
        label: "Upcoming",
        color: "text-fairway bg-rough bg-opacity-50",
      };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-fairway font-display">
            Competitions
          </h2>
          <p className="text-turf font-primary">
            Browse and join golf competitions
          </p>
        </div>
        <div className="text-sm text-turf font-primary">
          {competitions?.length || 0} competitions available
        </div>
      </div>

      <div className="grid gap-4">
        {competitions?.map((competition) => {
          const course = getCourse(competition.course_id);
          const status = getCompetitionStatus(competition.date);

          return (
            <Link
              key={competition.id}
              to={`/player/competitions/${competition.id}`}
              className="block bg-scorecard rounded-xl border border-soft-grey hover:border-turf hover:shadow-md hover:bg-rough hover:bg-opacity-10 transition-all duration-200"
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-fairway font-display">
                        {competition.name}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium font-primary ${status.color}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-6 text-sm text-turf font-primary">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(competition.date).toLocaleDateString(
                          "en-US",
                          {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {competition.participant_count} participants
                      </div>
                    </div>

                    {course && (
                      <div className="mt-3 text-sm text-charcoal font-primary">
                        <span className="font-medium">Course:</span>{" "}
                        {course.name}
                        {course.pars && (
                          <span className="ml-2">Par {course.pars.total}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center">
                    <ChevronRight className="h-5 w-5 text-turf" />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {(!competitions || competitions.length === 0) && (
        <div className="text-center py-12">
          <div className="text-turf mb-4">
            <Calendar className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-fairway mb-2 font-display">
            No competitions available
          </h3>
          <p className="text-turf font-primary">
            Check back later for upcoming golf competitions.
          </p>
        </div>
      )}
    </div>
  );
}

```

# src/views/player/PlayerLayout.tsx

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

  // Hide navigation for detailed views (they have their own navigation)
  const isDetailView =
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

# src/views/player/Series.tsx

```tsx
import { Link } from "@tanstack/react-router";
import { usePublicSeries } from "../../api/series";
import { ChevronRight, Trophy } from "lucide-react";

export default function PlayerSeries() {
  const { data: series, isLoading, error } = usePublicSeries();

  if (isLoading)
    return <div className="text-charcoal font-primary">Loading series...</div>;
  if (error)
    return <div className="text-flag font-primary">Error loading series</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-fairway font-display">
            Series
          </h2>
          <p className="text-turf font-primary">
            Browse and follow golf series
          </p>
        </div>
        <div className="text-sm text-turf font-primary">
          {series?.length || 0} series available
        </div>
      </div>

      <div className="grid gap-4">
        {series?.map((serie) => {
          return (
            <Link
              key={serie.id}
              to={`/player/series/${serie.id}`}
              className="block bg-scorecard rounded-xl border border-soft-grey hover:border-turf hover:shadow-md hover:bg-rough hover:bg-opacity-10 transition-all duration-200"
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Trophy className="h-6 w-6 text-turf" />
                      <h3 className="text-xl font-semibold text-fairway font-display">
                        {serie.name}
                      </h3>
                    </div>

                    {serie.description && (
                      <p className="text-sm text-charcoal mb-3 max-h-10 overflow-hidden font-primary">
                        {serie.description.length > 100
                          ? serie.description.substring(0, 100) + "..."
                          : serie.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-turf font-primary">
                      <span>Series #{serie.id}</span>
                      <span>
                        Created{" "}
                        {new Date(serie.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <ChevronRight className="h-5 w-5 text-turf" />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {(!series || series.length === 0) && (
        <div className="text-center py-12">
          <div className="text-turf mb-4">
            <Trophy className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-fairway mb-2 font-display">
            No series available
          </h3>
          <p className="text-turf font-primary">
            Check back later for upcoming golf series.
          </p>
        </div>
      )}
    </div>
  );
}

```

# src/views/player/SeriesCompetitions.tsx

```tsx
import { Link, useParams } from "@tanstack/react-router";
import { useSingleSeries, useSeriesCompetitions } from "@/api/series";
import { useCourses } from "@/api/courses";
import {
  ArrowLeft,
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
import TapScoreLogo from "@/components/ui/TapScoreLogo";

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
        serieId={serieId}
      />
    );
  }

  if (competitionsError) {
    return (
      <ErrorState
        title="Error Loading Competitions"
        message="Unable to load competitions. Please try again."
        onRetry={() => refetchCompetitions()}
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

  if (!competitions || competitions.length === 0) {
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

# src/views/player/SeriesDetail.tsx

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
  ArrowLeft,
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
import TapScoreLogo from "@/components/ui/TapScoreLogo";
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
              <ArrowLeft className="h-4 w-4 mr-2" />
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
  const handleBackNavigation = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!e.currentTarget.hasAttribute("data-navigating")) {
      e.currentTarget.setAttribute("data-navigating", "true");
      window.history.back();
      setTimeout(() => {
        e.currentTarget.removeAttribute("data-navigating");
      }, 500);
    }
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
      {/* TapScore Header Navigation */}
      <header className="sticky top-0 z-50 bg-fairway border-b-2 border-turf shadow-lg shadow-fairway/20">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackNavigation}
                className="flex items-center gap-2 text-scorecard hover:text-rough transition-colors p-2 -ml-2 rounded-lg hover:bg-turf/20 active:bg-turf/30"
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="text-label-md font-medium">Back</span>
              </button>
              <TapScoreLogo size="md" variant="color" layout="horizontal" />
            </div>
          </div>
        </div>
      </header>

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

# src/views/player/SeriesDocumentDetail.tsx

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

# src/views/player/SeriesDocuments.tsx

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

# src/views/player/SeriesStandings.tsx

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

# src/views/player/Standings.tsx

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

# src/vite-env.d.ts

```ts
/// <reference types="vite/client" />

```

# tsconfig.app.json

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

# tsconfig.json

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

# tsconfig.node.json

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

# vite.config.ts

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

