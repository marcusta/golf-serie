# Competition-Level Scoring Format

## Goal

Allow a Tour to contain competitions with different play formats, while keeping a Tour-level default.

The intended model is:

```ts
const effectiveScoringFormat =
  competition.scoring_format ?? tour.scoring_format ?? "stroke_play";
```

This means:

- `tours.scoring_format` remains useful, but only as the default
- `competitions.scoring_format` becomes the per-competition override
- leaderboard, finalization, and Tour standings should all resolve the effective format per competition

## Why

The current direction is too Tour-centric. Stableford support exists, but the implementation assumes that one Tour has one scoring format.

That is too rigid for the real use case:

- one Tour may have mostly stroke play competitions
- one or more competitions in the same Tour may instead use stableford
- Tour standings should still work because standings are based on points awarded per competition

The Tour should define the default behavior, not force every competition to use the same format.

## Scope

This task is only about how a competition decides whether it is `stroke_play` or `stableford`.

It is not about handicap snapshot consistency. That is a separate task and should remain separate.

## Current State

Stableford support was added with a Tour-level `scoring_format`.

Relevant areas:

- `src/services/leaderboard.service.ts`
- `src/services/competition-results.service.ts`
- `src/services/tour.service.ts`
- `src/api/tours.ts`
- admin/player frontend files that expose `scoring_format`

Today, these paths assume Tour-level format too directly.

## Target Design

### Database

Add nullable `competitions.scoring_format`.

Rules:

- `NULL` on the competition means "use Tour default"
- `tours.scoring_format` continues to exist and acts as the default
- if neither is set for old data, fall back to `"stroke_play"`

## Effective Format Rules

For any competition, the format must be resolved as:

1. `competition.scoring_format`
2. `tour.scoring_format`
3. `"stroke_play"`

This resolution should happen in one small helper if possible, rather than being duplicated across services.

## What Needs To Change

### 1. Schema and Types

- Add nullable `scoring_format` to `competitions`
- Update backend types for `Competition`
- Update request/response DTOs as needed
- Treat `tours.scoring_format` as the Tour default

### 2. Competition Admin/API

- Allow setting an optional scoring format on competitions
- Keep Tour scoring format editable as the default
- In the UI, make it clear that competition format can inherit from the Tour default

Suggested UI wording:

- Tour: "Default scoring format"
- Competition: "Scoring format"
- Competition options:
  - "Use tour default"
  - "Stroke play"
  - "Stableford"

### 3. Leaderboard

Any leaderboard calculation must use the effective format of the competition, not just the Tour format.

This affects:

- sorting logic
- gross vs net stableford handling
- whether `-1`/"picked up" holes are considered valid in stableford mode
- display of stableford-specific values

### 4. Finalization

`finalizeCompetitionResults()` must use the effective competition format.

That means:

- stroke-play competitions finalize with stroke-play logic
- stableford competitions finalize with stableford logic
- two competitions inside the same Tour can finalize differently

### 5. Tour Standings

Tour standings must also resolve scoring format per competition when calculating projected/live rows.

Important:

- standings are still based on awarded points
- each competition decides its own scoring format
- Tour standings should not assume one format for the entire Tour

## Non-Goals

- Do not redesign Tour standings storage
- Do not add a separate totals table
- Do not store PH/course handicap
- Do not merge this task with handicap snapshot consistency

## Files To Inspect

Backend:

- `src/services/leaderboard.service.ts`
- `src/services/competition-results.service.ts`
- `src/services/tour.service.ts`
- `src/types/index.ts`
- competition-related API/service files
- migration registration in `src/database/db.ts`

Frontend:

- `frontend/src/api/competitions.ts`
- `frontend/src/api/tours.ts`
- `frontend/src/components/competition/LeaderboardComponent.tsx`
- admin Tour/Competition settings screens
- player views showing scoring format or scoring output

Tests:

- `tests/leaderboard.service.test.ts`
- `tests/tour-standings.test.ts`
- `tests/competition-results.test.ts`

## Suggested Implementation Steps

1. Add `competitions.scoring_format` as nullable
2. Add a helper to resolve effective competition format
3. Update finalization to use effective competition format
4. Update leaderboard to use effective competition format
5. Update Tour standings to resolve effective format per competition
6. Update admin UI to configure Tour default and competition override
7. Add tests for mixed-format Tours

## Acceptance Criteria

- A Tour can define a default scoring format
- A competition can override that format
- A competition with no explicit format inherits the Tour default
- Two competitions inside the same Tour can use different formats
- Finalized results use the correct format for that competition
- Projected Tour standings use the correct format for each competition
- Existing Tours without competition overrides still work

## Test Cases To Add

- Tour default `stroke_play`, competition override `stableford`
- Tour default `stableford`, competition override `stroke_play`
- Competition with `NULL` format inherits Tour default
- Mixed-format Tour standings across multiple competitions
- Finalized + projected standings together in a mixed-format Tour

## Additive / Independence Note

This task should be additive to the handicap snapshot consistency task.

Why they can be done separately:

- this task changes how a competition decides its play format
- the handicap task changes where live calculations source handicap from

They touch some of the same services, but they solve different concerns.

The expected result is that either task can be implemented first, as long as the later session rebases on the earlier code and preserves behavior.
