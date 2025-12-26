# Tour System Implementation Plan

> Living document for tracking the implementation of the full Tour feature set.
> Last updated: 2025-12-26 (Phase 15J & 15K completed)

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

---

## UX Audit Findings (2025-12-26)

Comprehensive UX review of open start flows, scoring experience, and scorecard display.

### Finding 1: "Looking for Group" Players Cannot Start Playing (BUG)

**Severity: HIGH**

**Problem:** Players who register as "Looking for Group" (LFG) see only a "Withdraw" button - they cannot start playing solo if no one adds them to a group.

**Root Cause:**
- Backend ALLOWS LFG players to start (service line ~450 accepts both "registered" and "looking_for_group" status)
- Frontend GroupStatusCard.tsx only shows "Start Playing" button when `isRegistered` is true
- The `isRegistered` check (line 88) excludes LFG status

**Impact:** LFG players are stuck in limbo if no one adds them to a group. They must withdraw and re-register as solo.

**Proposed Fix:**
- Show "Start Playing" button for LFG players with clarifying text: "Start playing solo"
- Or add a "Convert to Solo" option for LFG players

---

### Finding 2: No Auto-Navigation After "Start Playing"

**Severity: MEDIUM**

**Problem:** After clicking "Start Playing", the user remains on the competition detail page. They must then click "Continue Playing" to navigate to the scorecard.

**Impact:** Extra friction, unclear if the start action succeeded.

**Proposed Fix:**
- Auto-navigate to scorecard entry view after successful "Start Playing"
- Or show a clear success state with prominent "Go to Scorecard" CTA

---

### Finding 3: Team Terminology Leaks in Tour Scoring UI

**Severity: HIGH**

**Problem:** When entering scores for individual/tour competitions, team-specific terminology appears:
- ScoreEntry shows "Team A P1" instead of player name
- ParticipantsListComponent shows "Player Name, Team A Captain"
- Custom keyboard displays team name as player identifier

**Root Cause:**
- TeeTimeDetail.tsx maps `team_name` → `participantName` without checking if it's a tour competition
- ScoreEntry.tsx doesn't have `isTourCompetition` prop to conditionally render
- ParticipantsListComponent always displays team_name + position_name

**Files Affected:**
- `frontend/src/views/player/TeeTimeDetail.tsx`
- `frontend/src/components/score-entry/ScoreEntry.tsx`
- `frontend/src/components/competition/ParticipantsListComponent.tsx`

**Note:** LeaderboardComponent and ParticipantScorecard ARE correctly filtered for tours.

**Proposed Fix:**
- Pass `isTourCompetition` flag through score entry chain
- Conditionally show player_names or position indicator (not team name) for tours

---

### Finding 4: Score Entry View Missing Net Scoring Context

**Severity: MEDIUM**

**Problem:** When entering scores (via FullScorecardModal), the scorecard does NOT display:
- Stroke Index (SI) values
- Net scores
- Handicap information
- Indication of which holes receive strokes

**Root Cause:**
- FullScorecardModal.tsx does not pass `netScoringData` props to Scorecard component
- Only passes basic: id, name, type, scores, currentHole

**Note:** The Scorecard component itself DOES support net scoring display (fully implemented). It just isn't wired up in the score entry context.

**Files Affected:**
- `frontend/src/components/score-entry/FullScorecardModal.tsx`
- `frontend/src/views/player/CompetitionRound.tsx` (needs to provide net data)

**Proposed Fix:**
- Fetch strokeIndex and handicap data in CompetitionRound
- Pass netScoringData to FullScorecardModal
- Display SI row to help scorers know which holes receive strokes

---

### Finding 5: Registration Flow Friction Points

**Severity: LOW-MEDIUM**

**Issues Identified:**
1. No visual feedback after registration (modal closes, must refetch to see status)
2. Group size limit (4) not mentioned during mode selection
3. No confirmation dialogs for destructive actions (withdraw)
4. Race conditions possible when multiple players form groups simultaneously
5. No handicap-based group matching suggestions

---

### Finding 6: LFG Player Discoverability

**Severity: MEDIUM**

**Problem:** Players waiting as "Looking for Group" have low visibility. Group creators must:
1. Click "Add Players"
2. Manually search through the list
3. Hope they notice the LFG badge

**Proposed Enhancements:**
- Show LFG player count on competition overview
- Highlight LFG section prominently in AddPlayersToGroup
- Consider push notifications when LFG players are available

---

## Proposed New Phases

### Phase 15J: UX Flow Fixes (Critical) - COMPLETE

- [x] 15J.1 **Fix LFG Start Playing Bug**
  - Show "Start Playing Solo" button for looking_for_group status in GroupStatusCard
  - Add clarifying text that they'll start solo instead of waiting for a group
  - File: `frontend/src/components/tour/GroupStatusCard.tsx`

- [x] 15J.2 **Auto-Navigate After Start Playing**
  - After successful start-playing mutation, navigate to scorecard view
  - Modified backend to return tee_time_id from start-playing endpoint
  - Use navigate() in GroupStatusCard after mutation success
  - Files: `GroupStatusCard.tsx`, `tour-competition-registration.service.ts`, `tour-competition-registration.ts`

- [x] 15J.3 **Fix Team Terminology in Score Entry**
  - Added `isTourCompetition` prop to ScoreEntry component
  - Pass from CompetitionRound.tsx based on competition.tour_id
  - Hide team_name display for tour competitions, show player name only
  - Updated CustomKeyboard player name display
  - Files: `TeeTimeDetail.tsx`, `ScoreEntry.tsx`, `CompetitionRound.tsx`

- [x] 15J.4 **Fix Team Terminology in Participants List**
  - Added `isTourCompetition` prop to ParticipantsListComponent
  - Created formatParticipantDisplay helper for conditional rendering
  - For tour: show player name only; for series: show player + team/position
  - Files: `ParticipantsListComponent.tsx`, `CompetitionRound.tsx`

### Phase 15K: Score Entry Net Scoring Display - COMPLETE

- [x] 15K.1 **Wire up net scoring in FullScorecardModal**
  - Added PlayerNetScoringData interface
  - Accept netScoringData Map prop in FullScorecardModal
  - Pass strokeIndex, handicapStrokesPerHole, courseHandicap, handicapIndex to Scorecard
  - Updated player name display to prefer playerNames over participantName
  - File: `frontend/src/components/score-entry/FullScorecardModal.tsx`

- [x] 15K.2 **Provide net scoring data in CompetitionRound**
  - Fetch leaderboard with details using useCompetitionLeaderboardWithDetails
  - Build netScoringData Map from leaderboard entries
  - Pass to both ScoreEntry and FullScorecardModal
  - Only enabled for competitions with net/both scoring mode
  - File: `frontend/src/views/player/CompetitionRound.tsx`

- [x] 15K.3 **Add SI indicator during individual hole entry**
  - Show stroke index (SI) value in ScoreEntry hole header
  - Indicate if current hole receives strokes with coral highlight
  - Display "+N stroke(s)" when player receives handicap strokes
  - File: `frontend/src/components/score-entry/ScoreEntry.tsx`

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
