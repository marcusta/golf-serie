# Tour System Implementation Plan

> Living document for tracking the implementation of the full Tour feature set.
> Last updated: 2025-12-26 (Phase 15I complete)

## Overview

Transform the existing basic Tour infrastructure into a full-featured individual competition system with:
- Player enrollment with multiple states (pending, requested, active)
- Configurable enrollment modes (closed, request-based)
- Configurable visibility (private, public)
- Multi-level admin system
- Auto-enrollment on registration for pre-enrolled emails
- Handicap support (gross, net, or both scoring modes)
- Player categories/classes with separate standings
- Open start competitions with player self-registration and group formation

## Phase Archive

Detailed implementation notes for completed phases are archived in `docs/tour-implementation-phases/`:

| Phase | Description | Status |
|-------|-------------|--------|
| [Phase 1](tour-implementation-phases/phase-01-database-schema.md) | Database Schema & Core Types | COMPLETE |
| [Phase 2](tour-implementation-phases/phase-02-enrollment-service.md) | Tour Enrollment Service | COMPLETE |
| [Phase 3](tour-implementation-phases/phase-03-admin-service.md) | Tour Admin Service | COMPLETE |
| [Phase 4](tour-implementation-phases/phase-04-api-endpoints.md) | Tour API Endpoints | COMPLETE |
| [Phase 5](tour-implementation-phases/phase-05-auto-enrollment.md) | Auto-Enrollment on Registration | COMPLETE |
| [Phase 6](tour-implementation-phases/phase-06-frontend-admin.md) | Frontend - Admin Tour Management | COMPLETE |
| [Phase 7](tour-implementation-phases/phase-07-registration-flow.md) | Frontend - Registration Flow | COMPLETE |
| [Phase 8](tour-implementation-phases/phase-08-player-views-documents.md) | Player Tour Views, Documents & Hero Images | COMPLETE |
| [Phase 9](tour-implementation-phases/phase-09-standings-points.md) | Tour Standings & Points | COMPLETE |
| [Phase 10](tour-implementation-phases/phase-10-ui-polish.md) | UI Polish & Bug Fixes | COMPLETE |
| [Phase 11](tour-implementation-phases/phase-11-handicap-support.md) | Handicap Support | PARTIAL |
| [Phase 12](tour-implementation-phases/phase-12-player-categories.md) | Player Categories/Classes | COMPLETE |
| [Phase 13](tour-implementation-phases/phase-13-gender-specific-ratings.md) | Tee Box Gender-Specific Ratings | COMPLETE |
| [Phase 14](tour-implementation-phases/phase-14-categories-net-scores.md) | Fix Categories & Net Scores Display | COMPLETE |
| [Phase 15](tour-implementation-phases/phase-15-open-start.md) | Open Start - Self-Registration & Groups | IN PROGRESS |

---

## Database Schema Summary

### Core Tables
- `tours` - Tour settings including enrollment_mode, visibility, scoring_mode
- `tour_enrollments` - Player enrollments with status and category
- `tour_admins` - Tour-level admin assignments
- `tour_categories` - Player categories/classes per tour
- `tour_documents` - Markdown documents for tours
- `tour_competition_registrations` - Open start registration tracking

### Related Tables
- `course_tees` - Tee boxes with CR/SR per course
- `course_tee_ratings` - Gender-specific ratings per tee box

---

## Remaining Implementation Phases

### Phase 15G: Competition Groups Overview (API + Frontend) - COMPLETE
- [x] 15G.1 Add API endpoints:
  - `GET /api/competitions/:id/registrations` - List all registrations with player details
  - `GET /api/competitions/:id/groups` - List all groups with members, grouped by tee_time
- [x] 15G.2 Add React Query hooks:
  - `useCompetitionRegistrations(competitionId)`
  - `useCompetitionGroups(competitionId)`
- [x] 15G.3 Create `CompetitionGroupsView` component:
  - Shows all groups playing/registered for a competition
  - Status indicators: Registered, On Course, Finished
  - Group members with handicaps
  - Current hole/score for active groups (if available)
- [x] 15G.4 Add to admin competition detail view
  - Added `/admin/competitions/:id/groups` route
  - Added Users icon link in admin competitions list for open-start competitions
- [x] 15G.5 Add player-facing "Who's Playing" view
  - Added "Who's Playing" tab in competition detail view for open-start tour competitions
  - Shows groups with status, members, handicaps, and scores

### Phase 15H: Edge Cases & Polish
- [ ] 15H.1 Handle competition closing:
  - Auto-convert LFG players to solo registration
  - Block new registrations after close
- [ ] 15H.2 Handle player withdrawal:
  - Remove from group, reassign if needed
  - Mark scores appropriately
- [ ] 15H.3 Group creator leaves:
  - Group persists, no special handling needed
- [ ] 15H.4 Max 4 players per group enforcement
- [ ] 15H.5 Cleanup empty tee_times when groups merge/leave
- [ ] 15H.6 Real-time updates (optional: WebSocket or polling)

### Phase 15I: Net Scoring & Handicap Display Fixes - COMPLETE
- [x] 15I.1 Scorecard view: Show stroke index per hole
  - Display SI value for each hole in scorecard (SI row added)
  - Indicate which holes receive strokes based on player's play handicap (highlighted in coral)
- [x] 15I.2 Scorecard view: Display net results per hole
  - Show net score alongside gross score (Net row added)
  - Visual indicator for holes where strokes are received (coral dot)
  - Net totals shown in totals section with "to par" display
  - Handicap info displayed in player header (HCP index + PH)
- [x] 15I.3 Leaderboard: Show handicap information in Net scoring mode
  - Display player's exact handicap (e.g., "HCP 12.4")
  - Display play handicap used for the round (e.g., "PH 14")
  - Only show when competition scoring_mode includes 'net'
  - Added to both mobile and desktop views

---

### Phase 16: Future Enhancements (Backlog)

#### Potential Features
- [ ] Email notifications for enrollment status changes
- [ ] Maximum enrollment limit per tour
- [ ] Waitlist when tour is full
- [ ] Player transfer between tours
- [ ] Season/year rollover for recurring tours
- [ ] Auto-category assignment based on handicap/age/gender rules
- [ ] Handicap index calculation and tracking
- [ ] World Handicap System (WHS) integration
- [ ] Multiple rounds per competition (36-hole events)
- [ ] Cut line after round 1 for multi-round events
- [ ] Real-time group updates via WebSocket

---

## UI Mockups

### Join Competition Flow
```
┌────────────────────────────────────┐
│ Join Round 5                       │
│ Landeryd GK • Open until 18:00     │
│                                    │
│ How do you want to play?           │
│                                    │
│ ┌────────────────────────────────┐ │
│ │ Play Solo                      │ │
│ │    Start your round now        │ │
│ └────────────────────────────────┘ │
│                                    │
│ ┌────────────────────────────────┐ │
│ │ Play with Others               │ │
│ │    Add players to your group   │ │
│ └────────────────────────────────┘ │
│                                    │
│ ┌────────────────────────────────┐ │
│ │ Looking for Group              │ │
│ │    Let others add you          │ │
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

### Add Players to Group
```
┌────────────────────────────────────┐
│ ← Back           Your Group (1/4)  │
├────────────────────────────────────┤
│ Search players...                  │
├────────────────────────────────────┤
│ Looking for Group                  │
│ ┌────────────────────────────────┐ │
│ │ Johan S.    HCP 12.1   [+]     │ │
│ │ Maria L.    HCP 18.3   [+]     │ │
│ └────────────────────────────────┘ │
│                                    │
│ Other Enrolled Players             │
│ ┌────────────────────────────────┐ │
│ │ Erik B.     HCP 8.2    [+]     │ │
│ │ Anna K.     In a group         │ │
│ │ Peter M.    Playing            │ │
│ └────────────────────────────────┘ │
├────────────────────────────────────┤
│ Your Group:                        │
│ You (Marcus T.) • HCP 15.4         │
│                                    │
│ [Continue Solo]    [Start Round]   │
└────────────────────────────────────┘
```

### Active Round Banner
```
┌────────────────────────────────────┐
│  LIVE                              │
│  Round 5 • Hole 12 • +2            │
│  With: Johan S., Maria L.          │
│                                    │
│  [Continue Playing]                │
└────────────────────────────────────┘
```

---

## API Reference (Phase 15)

### Registration Endpoints
```
POST   /api/competitions/:id/register        - Register for competition
DELETE /api/competitions/:id/register        - Withdraw from competition
GET    /api/competitions/:id/my-registration - Get my registration status
GET    /api/competitions/:id/available-players - List players for group formation
```

### Group Management Endpoints
```
POST /api/competitions/:id/group/add    - Add player(s) to my group
POST /api/competitions/:id/group/remove - Remove player from my group
POST /api/competitions/:id/group/leave  - Leave current group
GET  /api/competitions/:id/group        - Get my current group members
```

### Play Mode Endpoints
```
POST /api/competitions/:id/start-playing - Mark as playing
GET  /api/player/active-rounds           - Get all active rounds across tours
```

### Pending Group Overview Endpoints (Phase 15G)
```
GET /api/competitions/:id/registrations - List all registrations with player details
GET /api/competitions/:id/groups        - List all groups with members
```
