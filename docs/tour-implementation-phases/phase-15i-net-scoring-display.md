# Phase 15I: Net Scoring & Handicap Display Fixes

**Status**: COMPLETE
**Completed**: 2025-12-26

## Overview

Phase 15I enhances the scorecard and leaderboard views to properly display net scoring information for tour competitions with handicap support.

## Features Implemented

### 15I.1: Stroke Index Display in Scorecard

- Added SI (Stroke Index) row to both Front Nine and Back Nine sections
- SI values are highlighted in coral when the player receives strokes on that hole
- Displayed only when net scoring data is available (tour competitions with tee settings)

### 15I.2: Net Results Per Hole in Scorecard

- Added Net row below Score row for both Front Nine and Back Nine
- Net scores are calculated per hole: Gross - Strokes received
- Visual decorations (birdie/bogey circles) applied to net scores
- Coral dot indicator on holes where strokes are received
- Net totals section added at bottom of scorecard
- Player header displays handicap info: "HCP 15.4" and "PH 14"

### 15I.3: Handicap Information in Leaderboard

- Added handicap display below player names in leaderboard
- Shows handicap index: "HCP 12.4"
- Shows play handicap (course handicap): "PH 14" in coral badge
- Only displayed when scoring mode includes 'net' (net or both)
- Implemented for both mobile card view and desktop table view

## Files Modified

### Frontend Components

1. **`frontend/src/components/scorecard/Scorecard.tsx`**
   - Added props: `strokeIndex`, `handicapStrokesPerHole`, `courseHandicap`, `handicapIndex`
   - Added `showNetScoring` flag to conditionally render net scoring elements
   - Extended `getPlayerTotals()` to calculate net totals
   - Added player header handicap info display
   - Added SI row for front/back nine
   - Added Net row for front/back nine with stroke indicator dots
   - Added Net totals section

2. **`frontend/src/components/scorecard/ParticipantScorecard.tsx`**
   - Added `NetScoringData` interface
   - Added `netScoringData` prop to pass handicap data to Scorecard

3. **`frontend/src/components/scorecard/index.ts`**
   - Exported `NetScoringData` type

4. **`frontend/src/components/competition/LeaderboardComponent.tsx`**
   - Added handicap display in player info section (mobile view)
   - Added handicap display in player info section (desktop table view)
   - Shows HCP and PH only when `showNetScores` is true

5. **`frontend/src/views/player/CompetitionDetail.tsx`**
   - Added import for `NetScoringData` type
   - Added `netScoringData` extraction from leaderboard response
   - Passed `netScoringData` to `ParticipantScorecard`

## Data Flow

```
CompetitionDetail
  ├── useCompetitionLeaderboardWithDetails() → LeaderboardResponse
  │     ├── entries[].handicapStrokesPerHole
  │     ├── entries[].courseHandicap
  │     ├── entries[].participant.handicap_index
  │     └── tee.strokeIndex
  │
  ├── extracts netScoringData for selected participant
  │
  └── ParticipantScorecard(netScoringData)
        └── Scorecard(strokeIndex, handicapStrokesPerHole, courseHandicap, handicapIndex)
              ├── SI row (highlighted holes receiving strokes)
              ├── Net row (with stroke indicator dots)
              └── Net totals section
```

## Visual Design

### Scorecard Net Scoring Elements

- **SI Row**: Light background, coral text for holes receiving strokes
- **Net Row**: Light coral background (`bg-coral/5`)
- **Stroke Indicator**: Small coral dot (`w-1.5 h-1.5 bg-coral rounded-full`) in top-right of cell
- **Net Totals**: Coral background with coral text
- **Header Badges**:
  - HCP badge: Subtle background (`bg-scorecard/20`)
  - PH badge: Coral accent (`bg-coral/30`)

### Leaderboard Handicap Display

- Text: "HCP 12.4" in turf color
- Badge: "PH 14" in coral background (`bg-coral/20 text-coral`)

## Testing Verification

To verify the implementation:

1. Navigate to a tour competition with:
   - Scoring mode set to 'net' or 'both'
   - A tee assigned with stroke index configured
   - Players with handicap indices set

2. Check the leaderboard:
   - HCP and PH should appear below player names
   - Only visible when scoring mode includes net

3. Click on a player to view their scorecard:
   - SI row should show stroke index values
   - Holes receiving strokes should be highlighted
   - Net row should show calculated net scores
   - Coral dots should appear on holes receiving strokes
   - Net totals should appear at bottom

## Notes

- Net scoring data is only available for tour competitions with properly configured tees
- The implementation reuses the existing `renderScoreDecoration()` function for consistent styling
- Handicap data flows from the leaderboard API response which already calculates strokes per hole
