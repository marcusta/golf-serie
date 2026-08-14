# Best-N Counting Results in Tour Standings — Implementation Plan

## Requirement

A tour may hold ~20 competitions per year, but only each player's **N best results**
(e.g. 10) should count toward the tour standings total.

Confirmed decisions:

- **Per-competition points are unchanged.** A player who earns 2 points in a
  competition keeps those 2 points on that competition — the cap applies only when
  summing the standings total.
- **"Best" = highest competition points.** Tours can mix game formats
  (stroke play / stableford), so ranking a player's own results is done on the
  already-normalized tour points, never on raw scores.
- **Optional field.** If the setting is empty/null, all results count
  (current behavior). Existing tours are unaffected.
- **Visible in UI.** Each competition result in a player's breakdown shows whether
  it currently counts toward the standings total or is dropped.

## Current state (for context)

- Standings are derived on read in `TourService.getFullStandings`
  ([src/services/tour.service.ts:814](../../src/services/tour.service.ts)).
  Hybrid model: stored rows from `competition_results` for finalized competitions
  (`processStoredResults`, `:907`) + live projections for non-finalized ones
  (`processLiveCompetitions`, `:957`).
- Both paths **accumulate incrementally**: each result row immediately does
  `standing.actual_points += points` / `projected_points += points` /
  `total_points += points`. This must change — best-N requires collecting all of a
  player's results first, then summing a subset.
- `actual_points` = finalized results only; `projected_points` = finalized + live;
  `total_points` is a deprecated alias of `projected_points`.
- No best-N concept exists anywhere in schema, services, API, or UI.

## Semantics

- Let `N = tours.counting_competitions` (null → no cap).
- **`projected_points`**: sum of the player's N highest `points` values across
  **all** results (finalized + projected). `total_points` mirrors it.
- **`actual_points`**: sum of the player's N highest `points` values across
  **finalized results only**. (The counted subset can differ from the projected
  one — that is correct and expected.)
- `competitions_played` stays the total number of results (not capped) — it is
  also a tie-breaker in `sortAndRankStandings` and should keep meaning "played".
- Each entry in `standing.competitions[]` gets two new flags:
  - `counts_toward_projected: boolean`
  - `counts_toward_actual: boolean` (always `false` for projected entries)
- Boundary ties (a player's own 10th and 11th result have equal points): the total
  is unaffected regardless of which is flagged; pick deterministically —
  earlier `competition_date` wins the counting slot.

---

## Phase 1 — Backend

### 1.1 Migration
- New migration `NNN_add_tour_counting_competitions.ts` (next free number in
  [src/database/migrations/](../../src/database/migrations/)):
  `ALTER TABLE tours ADD COLUMN counting_competitions INTEGER NULL`.
- Follow the pattern of `026_add_tour_point_template.ts`.

### 1.2 Types
- Add `counting_competitions?: number | null` to `Tour` in
  [src/types/index.ts:465](../../src/types/index.ts).
- Add `counts_toward_projected` / `counts_toward_actual` to the
  `TourPlayerStanding.competitions[]` entry type (`:632-644`).
- Optionally surface `counting_competitions` on `TourStandings` (it is already
  inside `tour`, so no extra field strictly needed — frontend reads `tour`).

### 1.3 API + service update path
- Whitelist `counting_competitions` in the PUT handler field list in
  [src/api/tours.ts:171-181](../../src/api/tours.ts).
- Accept it in `TourService.update` (dynamic `UPDATE tours SET …`,
  [src/services/tour.service.ts:480](../../src/services/tour.service.ts)) and in
  `create` if tours can be created with it.
- Validate: null or integer ≥ 1; reject 0/negative/non-integer with 400.

### 1.4 Standings calculation refactor
In `getFullStandings` and its two processors:

1. Change `processStoredResults` and `processLiveCompetitions` to **only collect**:
   push the competition entry (with `points`, `is_projected`, and an internal
   `is_finalized` marker) and increment `competitions_played`, but stop mutating
   `actual_points` / `projected_points` / `total_points` inline.
2. Add a post-pass `applyCountingLimit(playerStandings, countingCompetitions)`
   that runs before `sortAndRankStandings`:
   - Sort each player's entries by `points` desc, then `competition_date` asc.
   - Flag the top N as `counts_toward_projected`; `projected_points` and
     `total_points` = their sum.
   - Repeat over the finalized-only subset for `counts_toward_actual` /
     `actual_points`.
   - `N = null` → flag everything, sum everything (must be byte-identical to
     today's totals — this is the regression guard).
3. Keep the 2-decimal rounding behavior of tie-split points as-is.

### 1.5 Backend tests
- Unit tests for `applyCountingLimit` (or via `getFullStandings` on a seeded DB):
  - null setting → identical to current behavior.
  - N smaller than results → only N highest sum; flags correct.
  - N larger than results → all count.
  - Mixed finalized + projected: actual vs projected pick different subsets.
  - Boundary tie at the Nth slot → deterministic flagging, correct total.
  - Category filter + best-N combined.
- Update endpoint test: PUT accepts/persists/clears the field, rejects invalid values.
- Read `docs/backend/SQL_PATTERNS.md` before any new SQL (project protocol);
  this feature should need no new query shapes.

---

## Phase 2 — Frontend

### 2.1 API layer
- Add `counting_competitions` to the `Tour` type and the standings competition
  entry flags in [frontend/src/api/tours.ts](../../frontend/src/api/tours.ts)
  (types at `:39-70`), and to the update-tour mutation payload.

### 2.2 Tour settings (admin)
- [frontend/src/views/admin/tour/TourSettingsTab.tsx](../../frontend/src/views/admin/tour/TourSettingsTab.tsx):
  - Extend the zod schema (`:51-54`) with an optional positive-integer field
    (empty string → null).
  - Add a numeric input, label e.g. **"Counting results"** with helper text
    "Number of best results that count toward standings. Leave empty to count
    all." Submit via existing `useUpdateTour` path (`:106-115`).

### 2.3 Standings view (player)
- [frontend/src/views/player/TourStandings.tsx](../../frontend/src/views/player/TourStandings.tsx):
  - In the expanded per-player competition breakdown, style non-counting results
    distinctly (muted/strikethrough points + a "not counted" marker); choose flag
    by the existing actual/projected toggle (`:347-370`).
  - Header/summary note when the cap is active: e.g. **"Best 10 results count"**
    (from `tour.counting_competitions`), so the table is self-explanatory.
  - Totals column already reads `actual_points`/`projected_points` — no change
    beyond the flags.

### 2.4 Frontend tests
- Settings form: set / clear / invalid value.
- Standings rendering: counted vs dropped styling driven by the flags and toggle.

---

## Phase 3 — Verification & release

- [ ] Full backend test suite green.
- [ ] Manual check on dev (`:5175`, test login `mobiletest@example.com`):
      set N=2 on a tour with 3+ finalized results, verify totals and flags in UI
      and via `GET /api/tours/:id/standings`.
- [ ] Regression: a tour **without** the setting shows identical standings before/after.
- [ ] `cd frontend && npm run deploy` — prod serves the committed `frontend_dist/`
      bundle; source changes never go live without this.
- [ ] Migration runs on prod DB (existing migration runner).

## Out of scope / by design

- No recalculation or storage of standings snapshots — standings remain derived
  on read, so changing N later retroactively re-picks the best N (intended).
- `competition_results` rows are untouched; finalize flow unchanged.
- Per-category N values (one N per tour, applied uniformly to all categories).
