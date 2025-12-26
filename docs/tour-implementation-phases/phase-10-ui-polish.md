# Phase 10: UI Polish & Bug Fixes

**Status**: COMPLETE (2025-12-24)
**Goal**: Fix Series/Team leakage in Tour UI and improve UX

## Bug Fixes

### 10.1 Competition Leaderboard - Series/Team Leakage
**Problem**: When viewing a Tour competition, the leaderboard shows:
- "Team Result" tab (should be hidden for Tours)
- "Player/Team" column header (should be just "Player")
- "Individual Players Individual" under player names (team_name + position_name leaking)

**Changes:**
- [x] 10.1.1 Add `tour_id` to frontend Competition type (already in backend)
- [x] 10.1.2 Hide "Team Result" tab when `competition.tour_id` is set
- [x] 10.1.3 Change column header from "Player/Team" to "Player" for Tour competitions
- [x] 10.1.4 Hide team_name display under player name for Tour competitions

### 10.2 Scorecard Modal - Team/Position Leakage
**Problem**: Scorecard shows "Individual Players, Individual" instead of clean player display

**Changes:**
- [x] 10.2.1 Pass `isTourCompetition` flag to scorecard components
- [x] 10.2.2 When tour competition, don't show team_name/position_name
- [x] 10.2.3 Only show player name in scorecard header for Tour participants

### 10.3 Current Round Quick Access
**Problem**: No easy way to quickly access the currently open round from Tour detail page

**Changes:**
- [x] 10.3.1 Add "Play Now" card/button on TourDetail when a round is currently open
- [x] 10.3.2 Highlight current open round in competitions list with visual indicator
- [x] 10.3.3 Show "Open until [date]" badge on current competition
- [x] 10.3.4 Add "Current Round" filter/jump button in TourCompetitions

## Deferred Edge Cases
- [ ] 10.4 Handle player deletion (what happens to enrollments?)
- [ ] 10.5 Handle tour deletion (cascade enrollments)
- [ ] 10.6 Add email validation in enrollment
- [ ] 10.7 Add pagination for large enrollment lists
- [ ] 10.8 E2E tests for critical flows

## Implementation Notes

**Files modified:**
- `frontend/src/api/competitions.ts` - Added `tour_id` to Competition interface
- `frontend/src/api/tours.ts` - Updated TourCompetition interface with open mode fields (start_mode, open_start, open_end)
- `frontend/src/views/player/CompetitionDetail.tsx` - Hide Team Result tab for Tour competitions, pass isTourCompetition to LeaderboardComponent and ParticipantScorecard
- `frontend/src/components/competition/LeaderboardComponent.tsx` - Added isTourCompetition prop, conditional column header "Player" vs "Player/Team", hide team/position info for Tour competitions
- `frontend/src/components/scorecard/ParticipantScorecard.tsx` - Added isTourCompetition prop, conditionally hide type info in scorecard
- `frontend/src/views/player/TourDetail.tsx` - Added "Play Now" card with LIVE indicator for currently open rounds
- `frontend/src/views/player/TourCompetitions.tsx` - Added "Open Now" filter button, highlight open competitions with coral border/ring, LIVE badge, and "Open until" date display

**Verification:**
- Frontend TypeScript compilation passes
- All lint errors are pre-existing (not related to Phase 10 changes)
- No new regressions introduced
