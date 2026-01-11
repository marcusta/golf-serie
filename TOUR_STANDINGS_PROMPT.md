# Tour Standings: Add Projected Points Feature

## Context

We recently fixed competition leaderboards to show **projected points** for both Gross and Net scoring modes. The same logic now needs to be applied to the **Tour Standings** page.

### What Was Recently Fixed

**File:** `src/services/leaderboard.service.ts`

The `addProjectedPointsToLeaderboard()` method was enhanced to calculate both:
- Gross positions/points (`position`, `points`)
- Net positions/points (`netPosition`, `netPoints`)

This fix ensures that when viewing a competition leaderboard in Net mode, players see their projected points based on their net scores.

---

## Requirement

The Tour Standings page should show **two views** or **two column that can be sorted on either** :

1. **Actual Standings** - Points from finalized competitions only
2. **Projected Standings** - Points including ongoing/unfinalized competitions with projected points

### Key Requirements

- **Both Gross and Net**: Just like competition leaderboards, support both scoring modes
- **All Categories**: Apply to all tour categories (Mens, Ladies, etc.)
- **Toggle/Tab**: Add UI to switch between "Actual" and "Projected" views
- **Visual Indication**: Clearly show which competitions are finalized vs projected
- **Mobile-First**: Maintain responsive design

---

## Current Implementation

### Backend

**File:** `src/services/tour-standings.service.ts` (likely)

Current flow:
1. `getTourStandings()` fetches standings for a tour
2. Aggregates points across all competitions
3. Returns sorted standings by total points

**What needs to change:**
- Add logic to include projected points from unfinalized competitions
- Calculate separate standings for:
  - `actual_gross_points` (finalized only)
  - `projected_gross_points` (finalized + projected)
  - `actual_net_points` (finalized only)
  - `projected_net_points` (finalized + projected)

### Frontend

**File:** `frontend/src/views/player/TourStandings.tsx`

Current UI shows:
- Category selector dropdown
- Top 3 podium cards
- Standings table with columns: Position, Player, Points, Competitions breakdown

**What needs to change:**
- Add toggle/tabs: "Actual Standings" vs "Projected Standings"
- When "Projected" is selected:
  - Show projected points in standings
  - Visually indicate which competitions are projected (grayed out or with asterisk)
  - Maybe show breakdown like: "80 pts (60 actual + 20 projected)"

---

## Implementation Plan

### Phase 1: Backend - Calculate Projected Standings

1. **Modify `getTourStandings()` in `tour-standings.service.ts`**:
   - For each competition in the tour:
     - Check if finalized (`competition_results` table has entries)
     - If finalized: Use stored points
     - If not finalized: Call leaderboard service to get projected points
   - Sum up both actual and projected points per player
   - Return enhanced response with both values

2. **Update TypeScript types** (`src/types/index.ts`):
```typescript
export interface TourStandingsEntry {
  player_id: number;
  player_name: string;
  category_id?: number;
  category_name?: string;

  // Gross standings
  gross_points_actual: number;
  gross_points_projected: number;
  gross_position_actual: number;
  gross_position_projected: number;

  // Net standings
  net_points_actual?: number;
  net_points_projected?: number;
  net_position_actual?: number;
  net_position_projected?: number;

  // Competition breakdown (existing)
  competitions: TourPlayerCompetition[];
}
```

3. **API response** should include:
   - `entries: TourStandingsEntry[]`
   - `scoringMode: "gross" | "net" | "both"`
   - `hasProjectedData: boolean` (true if any competition is unfinalized)

### Phase 2: Frontend - Display Projected Standings

1. **Add toggle UI** in `TourStandings.tsx`:
```tsx
// Similar to Gross/Net toggle
<div className="flex gap-2">
  <Button
    variant={viewMode === "actual" ? "default" : "outline"}
    onClick={() => setViewMode("actual")}
  >
    Actual
  </Button>
  <Button
    variant={viewMode === "projected" ? "default" : "outline"}
    onClick={() => setViewMode("projected")}
  >
    Projected
  </Button>
</div>
```

2. **Update standings table**:
   - Display points based on `viewMode`:
     - `actual`: Use `gross_points_actual` / `net_points_actual`
     - `projected`: Use `gross_points_projected` / `net_points_projected`
   - Add visual indicator for projected competitions in breakdown
   - Consider showing delta: "80 pts (+20 projected)"

3. **Top 3 podium cards**:
   - Update to show projected standings when in projected mode
   - Add small badge/indicator: "Actual" vs "Projected"

### Phase 3: Mobile & Responsive

- Ensure toggle works well on mobile
- Competition breakdown might need collapsible sections
- Test on various screen sizes

---

## Technical Details

### Reusing Competition Leaderboard Logic

The competition leaderboard already calculates projected points via:
```typescript
// src/services/leaderboard.service.ts
private addProjectedPointsToLeaderboard(
  sortedEntries: LeaderboardEntry[],
  pointTemplate: PointTemplateRow | null,
  pointsMultiplier: number
): LeaderboardEntry[]
```

For tour standings, you can:
1. Call `getCompetitionLeaderboard()` for each unfinalized competition
2. Extract `points` and `netPoints` from the returned entries
3. Sum them up per player across all competitions

### Database Schema Reference

**`competition_results` table**: Stores finalized competition results
- If this table has rows for a competition, it's finalized
- Points come from `points` and `net_points` columns

**`competitions` table**:
- Check `is_finalized` flag (if exists)
- Or check if `competition_results` exist

### Categories

Each category should have its own actual/projected standings. Make sure:
- Category filter still works
- Points are calculated separately per category
- Net scoring respects category handicap settings

---

## UI/UX Guidelines

### Visual Design

Follow the TapScore design system (`docs/STYLE_GUIDE.md` and `docs/visual-design-rules.md`):
- Use turf (green) for actual/finalized data
- Use turf/70 opacity for projected data
- Clean, one-level containment
- No nested borders

### Button/Toggle Pattern

For Actual vs Projected toggle, use the same pattern as Gross/Net:
```tsx
<div className="inline-flex rounded-lg bg-rough/30 p-1">
  <button className={actualSelected ? "bg-turf text-scorecard" : "text-charcoal"}>
    Actual
  </button>
  <button className={projectedSelected ? "bg-turf text-scorecard" : "text-charcoal"}>
    Projected
  </button>
</div>
```

### Competition Breakdown

Show which competitions contributed:
```
Competition Name           Gross    Net
─────────────────────────────────────────
Round 1 (finalized)         100      80
Round 2 (projected)*         80*     60*
Round 3 (not played)          -       -
─────────────────────────────────────────
Total                       180     140
```

* Asterisk or lighter color for projected values

---

## Testing Checklist

- [ ] Backend returns both actual and projected points
- [ ] Frontend toggles between actual and projected views
- [ ] Gross standings show correct projected values
- [ ] Net standings show correct projected values
- [ ] All categories show correct standings
- [ ] Competition breakdown visually indicates finalized vs projected
- [ ] Top 3 podium updates when switching views
- [ ] Mobile responsive design works
- [ ] Works when no unfinalized competitions exist
- [ ] Works when all competitions are unfinalized

---

## Files to Modify

### Backend
- `src/services/tour-standings.service.ts` - Main logic
- `src/api/tour-standings.ts` - API endpoint (if needed)
- `src/types/index.ts` - Type definitions

### Frontend
- `frontend/src/views/player/TourStandings.tsx` - Main component
- `frontend/src/api/tours.ts` - API hooks (if response shape changes)

---

## Example API Response

```json
{
  "entries": [
    {
      "player_id": 1,
      "player_name": "Marcus Andersson",
      "category_name": "Mens",
      "gross_points_actual": 100,
      "gross_points_projected": 180,
      "gross_position_actual": 1,
      "gross_position_projected": 1,
      "net_points_actual": 80,
      "net_points_projected": 140,
      "net_position_actual": 2,
      "net_position_projected": 1,
      "competitions": [
        {
          "competition_id": 1,
          "competition_name": "Round 1",
          "is_finalized": true,
          "gross_points": 100,
          "net_points": 80,
          "gross_position": 1,
          "net_position": 2
        },
        {
          "competition_id": 2,
          "competition_name": "Round 2",
          "is_finalized": false,
          "gross_points": 80,
          "net_points": 60,
          "gross_position": 2,
          "net_position": 1,
          "is_projected": true
        }
      ]
    }
  ],
  "scoringMode": "both",
  "hasProjectedData": true
}
```

---

## Notes

- The recent fix to `addProjectedPointsToLeaderboard()` provides a solid foundation
- Projected standings are already calculated correctly at the competition level
- This task is primarily about aggregating and displaying that data at the tour level
- Keep the UI clean and intuitive - users should immediately understand actual vs projected
- Consider adding tooltips or help text explaining projected standings

---

## Success Criteria

✅ Tour standings page has "Actual" and "Projected" toggle
✅ Projected view shows points from unfinalized competitions
✅ Both Gross and Net modes work correctly
✅ All categories display correct standings
✅ Visual design follows TapScore guidelines
✅ Mobile responsive
✅ No performance issues when calculating projected standings
