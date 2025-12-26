# Phase 14: Fix Categories & Net Scores Display

**Status**: COMPLETE (2025-12-25)
**Goal**: Debug and fix missing category and net score display in leaderboards/standings

## Background
Phase 11 added `scoring_mode` and Phase 12 added player categories. However, when viewing a tour with these features:
- Category filter tabs may not be showing in standings
- Net scores are not displayed in leaderboards
- Competition results don't show both gross and net rankings

## Completed Tasks

### Backend Investigation
- [x] 14.1 Verify standings API returns categories correctly
- [x] 14.2 Verify category filtering in getFullStandings() works
- [x] 14.3 Add net score calculation to competition leaderboard API
- [x] 14.4 Ensure competition has tee_id linked for handicap calculation

### Frontend - Standings
- [x] 14.5 Debug category tabs (verified working correctly)
- [x] 14.6 Add category name display on player standing cards

### Frontend - Leaderboard
- [x] 14.8 Add Net column to LeaderboardComponent when applicable
- [x] 14.9 Show tee box info (name, CR, SR) on competition detail
- [x] 14.10 Add toggle between Gross/Net ranking when mode is 'both'

## Deferred Tasks
- [ ] 14.7 Show gross and net points when scoring_mode is 'both' (requires backend changes)
- [ ] 14.11 Display handicap strokes per hole in scorecard
- [ ] 14.12 Show net score per hole alongside gross
- [ ] 14.13 Display player's course handicap for the competition

## Implementation Notes

**Backend changes:**
- `src/types/index.ts` - Extended `LeaderboardEntry` with net score fields, added `LeaderboardResponse`
- `src/services/competition-service.ts` - New `getLeaderboardWithDetails()` method:
  - Fetches tour scoring mode for tour competitions
  - Fetches tee box info when competition has tee_id
  - Calculates course handicap using WHS formula
  - Distributes handicap strokes per hole based on stroke index
  - Calculates net scores for finished players
- `src/api/competitions.ts` - New `getLeaderboardWithDetails()` handler
- `src/app.ts` - New route `GET /api/competitions/:id/leaderboard/details`

**Frontend changes:**
- `frontend/src/api/competitions.ts` - Extended types, new `useCompetitionLeaderboardWithDetails()` hook
- `frontend/src/components/competition/LeaderboardComponent.tsx`:
  - Tee info header with color indicator, name, CR, SR
  - Gross/Net toggle when scoring_mode is 'both'
  - Sorts by net score when in 'net' or 'both' mode
  - Net score column in both mobile and desktop views
- `frontend/src/views/player/CompetitionDetail.tsx`:
  - Uses new `useCompetitionLeaderboardWithDetails()` hook
  - Passes scoringMode and teeInfo to LeaderboardComponent
- `frontend/src/views/player/TourStandings.tsx`:
  - Category badge next to player name when viewing "All Players"

**Tests created:**
- `tests/competition-leaderboard-net-scores.test.ts` - 7 tests covering:
  - Basic leaderboard for non-tour competition
  - Scoring mode for gross-only tour
  - Net score calculation for net mode tour
  - Tee info included in response
  - Both scoring mode with net scores
  - No net calculation for players without handicap
  - Net scores only for finished (locked) players

**Verification:**
- All 7 new tests pass
- Frontend builds successfully
- No TypeScript errors
