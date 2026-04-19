# Competition Handicap Snapshot Consistency

## Goal

Make live leaderboard and projected Tour standings use the same competition-specific handicap source that finalized calculations should honor.

The authoritative handicap snapshot for a competition entry should be:

- `participants.handicap_index`

When that snapshot is missing, fall back in this order:

1. `tour_enrollments.playing_handicap`
2. `players.handicap`

We do not want to store PH/course handicap. That should still be calculated on the fly from the handicap index plus course/tee data.

## Why

A player's handicap can change during the lifetime of a Tour.

That is fine at the player or Tour enrollment level, but once a competition entry has started and captured its handicap, calculations for that competition should remain tied to that snapshot.

Without this, live leaderboard and projected Tour standings can drift away from the handicap that the competition itself should use.

## Scope

This task is only about choosing the correct handicap source for competition calculations.

It is not about competition-level scoring format. That is a separate task and should remain separate.

## Current State

There is already a snapshot field:

- `participants.handicap_index`

This is captured when the player first enters a real score.

Relevant code paths:

- `src/services/participant-service.ts`
- `src/services/leaderboard.service.ts`
- `src/services/tour.service.ts`
- `src/services/competition-results.service.ts`

There is also Tour-specific handicap override support:

- `tour_enrollments.playing_handicap`

The problem is that live calculations still rely too much on enrollment/player handicap data instead of preferring the participant snapshot when it exists.

## Target Rules

For any live competition-based calculation, use handicap in this order:

1. `participants.handicap_index`
2. `tour_enrollments.playing_handicap`
3. `players.handicap`

This should apply to:

- competition leaderboard calculations
- projected Tour standings
- any other live net/stableford competition scoring path

## Important Design Choice

Only the exact handicap index should be stored.

Do not store:

- PH
- course handicap
- handicap strokes per hole

Those are derived values and are cheap to calculate from:

- handicap index
- course rating
- slope rating
- par / active holes
- course stroke index

## What Needs To Change

### 1. Treat `participants.handicap_index` as the Competition Snapshot

Once present, this should be treated as the authoritative handicap for that participant in that competition.

This is the historical value we want to preserve.

### 2. Update Live Leaderboard Logic

Leaderboard calculations should prefer the participant snapshot before falling back to Tour enrollment or player handicap.

This matters for:

- net stroke play
- net stableford
- PH/course handicap display
- stroke distribution across holes

### 3. Update Projected Tour Standings

Projected standings in active/non-finalized competitions should use competition participant handicap snapshots where available.

That keeps projected points aligned with the competition's historical handicap basis.

### 4. Keep Finalized Standings Model As-Is

Do not redesign standings storage.

The model should remain:

- finalized competitions use stored `competition_results.points`
- live competitions are projected from current competition score data
- `actual_points` = finalized stored points
- `projected_points` = `actual_points + live projected points`

## Non-Goals

- Do not add a new Tour standings totals table
- Do not store PH/course handicap
- Do not redesign result finalization
- Do not combine this with competition-level scoring format changes

## Files To Inspect

Backend:

- `src/services/participant-service.ts`
- `src/services/leaderboard.service.ts`
- `src/services/tour.service.ts`
- `src/services/competition-results.service.ts`
- `src/types/index.ts`

Tests:

- `tests/open-start-handicap-capture.test.ts`
- `tests/leaderboard.service.test.ts`
- `tests/tour-standings.test.ts`
- `tests/competition-results.test.ts`

## Suggested Implementation Steps

1. Inspect current handicap lookup paths in leaderboard and Tour standings
2. Add a small helper for effective competition handicap resolution if useful
3. Update leaderboard calculations to prefer `participants.handicap_index`
4. Update projected Tour standings to prefer `participants.handicap_index`
5. Keep PH/course handicap calculation derived on the fly
6. Add regression tests for handicap changes after competition start

## Acceptance Criteria

- If a participant has `participants.handicap_index`, that value is used for live competition calculations
- Later changes to `tour_enrollments.playing_handicap` do not alter that participant's competition calculations
- Later changes to `players.handicap` do not alter that participant's competition calculations
- If no participant snapshot exists yet, the system falls back to enrollment handicap, then player handicap
- Projected Tour standings and leaderboard agree on the handicap source used

## Test Cases To Add

- Participant snapshot exists, then player handicap changes later
- Participant snapshot exists, then tour enrollment playing handicap changes later
- No participant snapshot yet, system uses Tour enrollment playing handicap
- No participant snapshot and no enrollment override, system uses player handicap
- Net 9-hole case still uses correct hole-by-hole stroke distribution
- Stableford net case still uses the correct snapshot handicap

## Additive / Independence Note

This task should be additive to the competition-level scoring format task.

Why they can be done separately:

- this task changes where handicap comes from
- the scoring format task changes whether a competition uses stroke play or stableford

They may both touch leaderboard and Tour standings services, but they are logically independent.

The expected result is that either task can be implemented first, as long as the second session preserves the first task's behavior.
