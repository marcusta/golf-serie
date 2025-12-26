# Phase 15: Open Start - Player Self-Registration & Group Formation

**Status**: IN PROGRESS (2025-12-25)
**Goal**: Enable tour-enrolled players to self-register for open competitions, form playing groups, and enter "play mode"

## Background

For open-start competitions in Tours, players need to:
1. Self-register for an open competition (no admin intervention)
2. Optionally form playing groups with other enrolled players
3. Enter "play mode" to score their round with easy leaderboard access

## Key Design Decisions

**Streamlined Group Formation:**
- One player creates a group and directly adds other enrolled players
- No invite codes visible to users, no accept/decline flow
- Added players simply see "You're in a group" and can join the game
- "Looking for Group" (LFG) status lets players signal availability

**Registration Options:**
| Option | Description |
|--------|-------------|
| Play Solo | Register alone, start immediately |
| Create Group | See enrolled players, tap to add them |
| Looking for Group | Signal availability, appear highlighted to group creators |

**Player Status Flow:**
```
looking_for_group --+
                    +--> registered --> playing --> finished
(join competition) -+         |            |
                              +-- withdrawn +
```

## Database Schema

```sql
CREATE TABLE tour_competition_registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  enrollment_id INTEGER NOT NULL REFERENCES tour_enrollments(id) ON DELETE CASCADE,
  tee_time_id INTEGER REFERENCES tee_times(id) ON DELETE SET NULL,
  participant_id INTEGER REFERENCES participants(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'registered',
    -- 'looking_for_group', 'registered', 'playing', 'finished', 'withdrawn'
  group_created_by INTEGER REFERENCES players(id),
  registered_at TEXT DEFAULT CURRENT_TIMESTAMP,
  started_at TEXT,
  finished_at TEXT,
  UNIQUE(competition_id, player_id)
);
```

## Sub-Phases

### Phase 15A: Database & Core Registration Service - COMPLETE
- [x] Migration 034 for `tour_competition_registrations` table
- [x] TypeScript types for registration
- [x] `TourCompetitionRegistrationService` with 15 methods
- [x] Team handling (creates "Tour {id} Players" team per tour)
- [x] Auto-creates tee_time and participant when registering
- [x] 25 comprehensive tests

### Phase 15B: Group Formation Service - COMPLETE (merged into 15A)
- [x] `addToGroup`, `removeFromGroup`, `leaveGroup` methods
- [x] Move participants between tee_times when groups change
- [x] Validate player can be added (enrolled, not already in group, not playing)

### Phase 15C: Registration API Endpoints - COMPLETE
- [x] Registration endpoints: register, withdraw, my-registration, available-players
- [x] Group management: add, remove, leave, get group
- [x] Play mode: start-playing, active-rounds
- [x] Authorization via enrollment verification
- [x] 30 comprehensive API tests

### Phase 15D: Frontend - Registration Flow - COMPLETE
- [x] React Query hooks for registration
- [x] `JoinCompetitionFlow` component (Solo/Create Group/LFG options)
- [x] `AddPlayersToGroup` component (player list with status badges)
- [x] `GroupStatusCard` component (shows group status and actions)
- [x] Updated TourDetail, TourCompetitions, CompetitionDetail views

### Phase 15E: Frontend - Group Management - COMPLETE (merged into 15D)
- [x] Group management hooks
- [x] Player list status indicators (LFG, Available, In Group, Playing, Finished)
- [x] Group capacity indicator
- [x] Search/filter players by name

### Phase 15F: Frontend - Play Mode & Active Rounds - COMPLETE
- [x] `useActiveRounds()` hook
- [x] `ActiveRoundBanner` component
- [x] Score entry for tour play mode
- [x] Navigation from group status to score entry

### Phase 15G: Competition Groups Overview - PENDING
- [ ] API endpoints for registrations and groups list
- [ ] React Query hooks
- [ ] `CompetitionGroupsView` component
- [ ] Add to admin competition detail view
- [ ] Player-facing "Who's Playing" view

### Phase 15H: Edge Cases & Polish - PENDING
- [ ] Handle competition closing (auto-convert LFG to solo)
- [ ] Handle player withdrawal
- [ ] Max 4 players per group enforcement
- [ ] Cleanup empty tee_times

### Phase 15I: Net Scoring & Handicap Display Fixes - PENDING
- [ ] Scorecard: Show stroke index per hole
- [ ] Scorecard: Display net results per hole
- [ ] Leaderboard: Show handicap information

## Files Created (Phases 15A-15F)

**Backend:**
- `src/database/migrations/034_add_tour_competition_registrations.ts`
- `src/services/tour-competition-registration.service.ts`
- `src/api/tour-competition-registration.ts`
- `tests/tour-competition-registration-service.test.ts`
- `tests/tour-competition-registration-api.test.ts`

**Frontend:**
- `frontend/src/api/tour-registration.ts`
- `frontend/src/components/tour/JoinCompetitionFlow.tsx`
- `frontend/src/components/tour/AddPlayersToGroup.tsx`
- `frontend/src/components/tour/GroupStatusCard.tsx`
- `frontend/src/components/tour/ActiveRoundBanner.tsx`

**Modified:**
- `frontend/src/views/player/TourDetail.tsx`
- `frontend/src/views/player/TourCompetitions.tsx`
- `frontend/src/views/player/CompetitionDetail.tsx`

## Verification
- All 654 backend tests pass
- Frontend TypeScript compilation passes
- Navigation routes correctly point to score entry
