# Rewrite Domain Spec

Unified domain model for a next-generation golf platform. Captures learnings from the current `golf-serie` codebase and addresses the coupling between tour, series, and ad-hoc play by collapsing them into one composition of shared primitives.

---

## 1. Goals and Core Insight

### Problem with current architecture

Tour, series, and ad-hoc play evolved as near-independent mini-applications. Adding a feature to one does not cheaply reach the others. Score entry, leaderboards, finalization, and standings have diverged. Simulator play, self-organised groups, and category-based tee assignment were bolted on.

### Core insight

The scoring primitive is **Round**: a set of players, on a course, on a date, producing scorecards. A Round knows nothing about tours, series, or points.

Two thin context wrappers put a Round in a context:

- **FriendlyRound** — ad-hoc, low-friction, guest-allowed
- **CompetitionRound** — part of a formal Competition, possibly one of many

A **Competition** aggregates one or more CompetitionRounds and sits inside a **Tour** or **Series** (or stands alone).

Model Round once. Scoring engine, score entry UI, leaderboard logic, handicap posting — all target Round. They work for friendly and competition play without conditionals. The coupling problem disappears because features live on the primitive, not on the wrappers.

### The layering

```
Round                              (pure primitive — scorecards live here)
  │
  ├── FriendlyRound                (ad-hoc context)
  │
  └── CompetitionRound             (competition context, 1..N per Competition)
                │
                Competition        (aggregator — format config, finalization, cut rules)
                       │
                       ├── Tour       (individuals + fixed small partnerships)
                       ├── Series     (fixed teams)
                       └── standalone (no wrapper)
```

---

## 2. Primitive Entities

### Club

Organisation owning courses. Players declare a home club and may belong to several. Mostly metadata (name, logo, location).

### Course

Belongs to a club. Has up to 18 holes (with support for 9-hole rounds). Each hole has:

- Number
- Par
- Stroke index (difficulty order)

Course has many **tees**.

### Tee (per course)

- Colour / name
- Per-hole length
- Optional per-tee stroke index override (if the tee reorders hole difficulty)
- Per-gender rating: `(gender) → (course_rating, slope, par, total_length)`

Gender-keyed ratings are required. A single rating per tee cannot model mixed-gender fields correctly.

### Player

Identity and profile:

- Auth credentials, display name, nickname, avatar
- Current handicap index
- Home club, other club memberships
- Role grants (see Authorization)
- Relations to various results/competitions/tours/series/etc and other players (friends)

**Handicap history**: versioned records of the player's index, each with source (manual / calculated / import) and effective date. Not just "latest value" — the history matters for audit and backdated scoring.

### Handicap — three distinct concepts

Never conflate:

| Term | Definition | Lives on |
|------|------------|----------|
| **Handicap index** | WHS number, player-level | `Player` (current) + `handicap_history` |
| **Course handicap** | `index × slope / 113 + (CR − Par)`, per tee + gender | Computed, snapshotted on scorecard |
| **Playing handicap** | course handicap × format allowance (e.g. 95% stroke, 50% foursomes) | Computed, snapshotted on participant |

### Playing Format

Data-driven, not hardcoded. Two orthogonal axes:

- **Scoring mode**: stroke-play, stableford, match-play, skins, custom
- **Team shape**: individual, better-ball, scramble, foursomes / alternate-shot, greensome, custom

Plus:

- Allowance percentage (applied to course handicap → playing handicap)
- Output levels: player, group, field — the format declares which it produces
- Tiebreaker rules

**Implementation**: each format is a strategy with a common interface. Computes leaderboard, points, and per-hole status from scorecards. New format = new strategy. No schema change.

---

## 3. Round (the core)

A Round is **one course, one date, one set of scorecards for the whole field**. It is context-free: it does not know if it is friendly or part of a competition.

### Round fields

- Course
- Date
- Round type: `full_18 | front_9 | back_9 | custom_holes`
- Venue type: `outdoor | indoor`
- Start list mode: `structured | fixed_slots | open_window`
- Window start / end (for `fixed_slots` or `open_window`)
- Self-organize flag
- Format slots — one or more (see below)
- Status: `not_started | active | complete`

### Format slots on Round

A Round has one or more format slots. A format slot declares:

- Playing format (scoring mode + team shape + allowance)
- Optional scope (e.g. "only players in category A", "only the first four participants")

Single-format round: one slot covering everyone. Multi-format round (series-style): 2 singles slots + 2 alternate-shot slots, each covering different participants.

### Scorecard (per participant per Round)

- Strokes per hole: `int | null (no-result) | 0 (pickup)`
- Snapshots: handicap index, course handicap, playing handicap, tee, course rating, slope at time of play
- Derived via format strategy: gross, net, points, per-hole match-play status
- Manual-entry override: out / in / total without per-hole detail (for importing old results or incomplete entry)

### Participant (per Round)

A **slot in a tee time within a Round**, not a person. One participant can map to multiple players via a `participant_players` junction (supports substitutes, shared scorecards, teams of 2–4).

Carries per-round snapshots:

- Category assignment (if round inherits categories from Competition)
- Tee (derived from category + round)
- Playing handicap (computed and frozen at assignment)
- Flags: `is_locked`, `is_dq`, admin notes, admin modified-by

### Start List (per Round)

First-class concept. The structural plan of who-plays-when-where.

Three modes (property of the Round):

| Mode | Slots | Group formation | Tee/time assignment |
|------|-------|-----------------|---------------------|
| `structured` | Admin-built | Admin | Admin |
| `fixed_slots` | Admin-built | Players self-join a slot | Fixed by slot |
| `open_window` | None | Players create groups | Group picks start time within window |

Status progression per player (non-structured modes):

```
looking_for_group → registered → playing → finished | withdrawn
```

Structured mode skips directly to `registered` on admin assignment.

### Tee Time / Playing Group (per Round)

Slot within a Round's start list.

- Start time
- Start hole (1 or 10 for outdoor shotgun)
- Capacity (typically 2–4 players)
- Optional hitting bay (indoor)
- Contains participants

**Outdoor** slot semantics: tee time + start hole, ~8–12 min apart.
**Indoor** slot semantics: hitting bay × time window, bay occupied for 60–90 min. Overlapping bay bookings, not overlapping tee times.

### Venue and Bay (optional, for indoor)

- **Venue**: named facility (name, location)
- **Bay**: named hitting bay belonging to a venue

Needed if the product supports simulator booking across multiple rounds. Less critical for outdoor.

---

## 4. Context Wrappers

### FriendlyRound

A Round configured for low-friction, ad-hoc play. A FriendlyRound is a 1:1 extension of a Round with friendly-specific metadata.

- `round_id` (FK, 1:1)
- Creator (any player)
- Share token (link-based join)
- Guest players allowed (name + handicap + gender without user account)
- Minimal-auth entry
- Post-to-handicap flag (does this round post to WHS handicap history?)
- Not part of any tour or series

Leaderboard of a FriendlyRound is the Round's leaderboard — same engine, different audience.

A FriendlyRound can be **promoted** to a single-round Competition later if an admin decides to formalise it.

### CompetitionRound

A Round that is part of a formal Competition. 1:1 extension of a Round with competition-specific metadata.

- `round_id` (FK, 1:1)
- `competition_id` (FK)
- `round_number` (1, 2, 3, … within the competition)
- Cut-eligible flag (does this round count for cut calculation?)
- Post-cut flag (is this round played only by participants who made the cut?)

A CompetitionRound **inherits defaults from its Competition**: format slots, category/tee mapping, start list mode. Overrides are allowed per round (e.g. Friday better-ball, Saturday singles).

---

## 5. Competition

An aggregator of one or more CompetitionRounds, plus competition-wide configuration and finalization state.

### Competition fields

- 1..N CompetitionRounds
- Default format slot config (inherited by each round unless overridden)
- Default start list mode (same)
- Categories with per-competition tee assignment
- Point template (required if inside a Tour or Series; optional for standalone)
- Cut rules (see below)
- Lifecycle: `draft → setup → active → finalized` with `is_results_final` and `results_finalized_at`
- Belongs to: Tour, Series, or standalone
- Admins (per-competition grant)

Single-round competitions have one CompetitionRound; UI can collapse the layer visually when `round_count == 1`.

### Cut

Between rounds, a cut can trim the field.

```
cut_rule (per competition):
  - after_round: int            (e.g. 2 = cut after round 2)
  - cut_type: top_n | top_percent | within_strokes | custom
  - cut_value: int
```

Participant snapshots `cut_after_round` flag once the cut is applied. Cut participants do not play further CompetitionRounds.

### Competition Result

Finalization snapshot. Immutable once written.

- Per participant per scoring type (`gross | net`)
- Position, points, totals, tiebreakers
- Aggregated across all CompetitionRounds
- Separate rows for gross and net allows publishing both leaderboards independently

### Point Template

Reusable scoring table (position → points). Can be tour-scoped or global. Referenced by competition — do not hardcode.

Example:

```
1st → 10, 2nd → 8, 3rd → 6, 4th → 5, 5th → 4, ...
```

Also need a behaviour assigned if multiple participants share a common score (and we need to be able to add new behaviours). This behaviour is responsible for calculating tie breakers on same scores and assigning points (could be that multiple players on same result should have the same points assigned based on calculation or each gets distinct points).

### Category (per tour, inherited by competition)

Player classification, e.g. "Men 0–5 HCP", "Women", "Seniors". Has a `competition_category_tees` mapping per competition: "this competition: Category A plays white, Category B plays red."

### Enrollment (per tour)

Membership record.

- Optional `player_id` (enrollments by email-only for invited guests are valid)
- Lifecycle: `pending → requested → active` (or `rejected`)
- Category assignment
- Playing handicap snapshot at enrollment

---

## 6. Organisational Wrappers

All wrap `Competition`. Each is a way to group competitions plus standings.

### Tour

Individuals or fixed small partnerships (the partnership is the "participant" across competitions). Characteristics:

- Player-level standings
- Point template
- Categories
- Documents (rules, schedule, announcements)
- Admins (per-tour grant)
- Enrollments with lifecycle

**Standings dimensions**:
- Gross and net (independent rankings)
- **Projected** (includes live / non-finalized competitions) vs **official** (only finalized)

### Series

Fixed teams (Ryder-Cup shape, league-shape).

- Many teams via junction (team-to-series is many-to-many)
- Team-level standings
- Each competition can have multiple format slots, results aggregate across them
- Team lineup per format slot per round is editable (the free-form goal — data-driven, not hardcoded)

"League" is not a separate concept — series already covers it. Keep "series" naming.

### Standalone Competition

A competition that belongs to neither tour nor series. Same everything else. No standings follow-on.

### Free-form Event

User's red-vs-blue use case. A series with:

- 2 (or N) teams
- Multiple competitions with arbitrary format-slot mixes
- Editable team lineup per format slot per round

No code changes required if the format strategy system is pluggable and team lineups are editable data.

---

## 7. Documents and Content

### Document

Markdown / rich content. Scoped to tour or series.

- Type (rules, schedule, announcement, custom)
- One designated as landing (home-page content for the tour/series)
- Versioned

### Media (future consideration)

Photos / video per round. Not currently modelled. Worth a placeholder in the schema.

---

## 8. Authorization

Granular, scoped to entity. Not just global admin/player.

| Role | Scope | Grants |
|------|-------|--------|
| `SUPER_ADMIN` | Global | Everything |
| `series_admin` | Per series | Manage teams, competitions, finalize results |
| `tour_admin` | Per tour | Enrollments, categories, competitions, finalize |
| `competition_admin` | Per competition | Score correction, finalize |
| `friendly_round_owner` | Per friendly round | Manage scorecards, invite guests |
| `player` | Self | Play, view, enroll |

Plus an `owner_id` on competitions and friendly rounds for the creator.

Role grants are records in a junction table, not fields on user. A player can be `tour_admin` of tour A and a regular player in tour B.

---

## 9. Snapshotting (critical cross-cutting concern)

Things that must be snapshotted at time of play, not looked up later:

- Player handicap index → `participant.handicap_index_snapshot`
- Course handicap → `participant.course_handicap_snapshot`
- Playing handicap → `participant.playing_handicap_snapshot`
- Tee assignment → `participant.tee_id_snapshot`
- Course rating, slope → `scorecard` (for net calc replay)
- Category → `participant.category_snapshot`

Reason: handicap indices change, tees get re-rated, categories get edited. Retroactive recalculation breaks finalized rounds. This is the root cause of several bugs in the current codebase.

Finalization snapshot: `competition_results` table. Written on `is_results_final = true`, immutable thereafter.

---

## 10. Four Distinct Computed Views

Easy to confuse, must be kept separate:

| View | Scope | Source | Mutability |
|------|-------|--------|------------|
| **Round leaderboard** | Per Round | Live, computed from scorecards | Updates in real-time |
| **Competition leaderboard** | Per Competition | Aggregated across its CompetitionRounds | Live |
| **Results** | Per Competition | Finalization snapshot | Immutable once finalized |
| **Standings** | Per Tour / Series | Aggregated across Competitions | Live for projected, frozen for official |

Each has its own query path. They share the Round primitive but serve different audiences.

---

## 11. Mobile-first Data Architecture

Round data must work for many concurrent users on phones, on flaky golf-course WiFi and cellular, with minimal battery drain and bandwidth. The schema and sync model are designed around this from day one.

### Event-log scorecard

Scorecards are **append-only score events** plus a materialised view. The per-hole strokes array is derived, not source of truth.

```
score_event (append-only)
  id, round_id, participant_id, hole, strokes | null,
  event_type: score_entered | score_cleared | score_confirmed | manual_override,
  recorded_by (player_id),
  recorded_at (server timestamp),
  client_event_id (UNIQUE per round — idempotency key)

scorecard (materialised view, rebuilt from latest event per hole)
  participant_id, round_id, hole → strokes, recorded_by, recorded_at
```

Benefits:

- Tiny payloads (~40 bytes per score entry)
- Idempotent writes — client retries safely with `client_event_id`
- Conflict-safe (last-writer-wins per hole, or propose/confirm if stricter semantics needed)
- Audit trail built-in — every score change has who and when
- Replay is trivial: "send me your event log for round X" reproduces exact state

### Versioned state cursor

Every Round has a monotonic event counter.

```
round:
  latest_event_id          (denormalised for cursor efficiency)
  scorecard_version        (bumped on every event — optional)
```

All reads and subscriptions use the cursor:

- Initial load: client receives snapshot + `cursor`
- Live updates: server pushes events where `event_id > cursor`
- Reconnect: client sends `last_seen_cursor`, server fills the gap
- No "am I up to date?" ambiguity

### Push transport, not poll

| Channel | Use when |
|---------|----------|
| WebSocket | Primary — push score events and leaderboard deltas |
| Server-Sent Events | Fallback when WS blocked (corporate firewalls, some club networks) |
| Long-poll with cursor | Last resort for very degraded connectivity |
| Full-refresh polling | **Never** — battery and bandwidth killer |

Heartbeat interval 30–60 s, not aggressive. Disconnect when app backgrounded; reconnect on foreground with cursor.

### Subscription granularity

Partition subscriptions by Round to keep payloads targeted.

| Subscription | Receives |
|--------------|----------|
| Round leaderboard | Aggregated position/total deltas for all groups in the Round |
| Playing group | Raw score events for your tee time (detailed marker UX) |
| Competition leaderboard | Aggregated deltas across all CompetitionRounds in the Competition |

A phone on the leaderboard view only subscribes to the leaderboard channel (lightweight). A phone actively entering scores subscribes to the group channel too.

### Offline-first

Golf courses have dead zones. Design for it.

- Client maintains a **local queue** of pending score events.
- Score entry is **optimistic** — UI updates immediately, queue entry created.
- On reconnect: flush queue with idempotency keys; server applies in order and dedupes.
- Conflict resolution is per `(participant, hole)` — last-writer-wins by `recorded_at`, or propose/confirm UI for stricter cases.
- Disconnected clients can **recompute their own leaderboard locally** from the event log — stale for other groups, correct for their own.

### Pre-compute on server, not on client

Rule: if a view requires multiple joins, pre-compute and push deltas. Mobile CPU and battery are worse than server CPU.

| Data | How it reaches the phone |
|------|--------------------------|
| Score events | Pushed from server (authoritative, tiny) |
| Scorecard state | Snapshot on load, events after |
| Round leaderboard delta | Pre-computed on server, pushed |
| Competition leaderboard delta | Pre-computed on server, pushed |
| Standings | Request/reply — rarely changes live, not streamed |

### Coalescing and backpressure

If four players in a group finish hole 7 within two seconds, coalesce into a single leaderboard delta before pushing. Do not emit four separate updates. Sliding window on the server: e.g. 500 ms debounce per Round leaderboard channel.

### Battery and bandwidth specifics

- Score events are tiny; no compression needed
- `Content-Encoding: gzip` on initial snapshot only
- Avoid avatar fetches on leaderboard view — use initials or CDN-cached thumbnails with aggressive cache headers
- Do not keep radio hot in background; rely on push (APNs/FCM) for critical notifications, not WebSocket keep-alive

### Authentication on mobile

- Long-lived session tokens, silent refresh on foreground-return
- FriendlyRound share tokens: guest stays authenticated for the life of the round without a password flow
- Token refresh must be resilient to offline: cached token valid until expiry even with no network

### Schema implications summary

Additions to Round:

- `score_event` table (append-only, primary source of truth for scores)
- `scorecard` as materialised view (triggered rebuild on insert) — for fast reads
- `round.latest_event_id` and optional `round.scorecard_version` — cursor support
- `client_event_id` uniqueness constraint per round — idempotency

The existing `participants.score[18]` array (if carried over from the current codebase) becomes derived, not source of truth.

### Trade-offs

- Slightly more storage (events are tiny, volume manageable — ~72 per player per round)
- Materialised view adds trigger complexity on the backend
- Offline sync adds real client complexity — unavoidable if the UX bar is "works on the course"
- Worth it for real-time leaderboards, audit for free, replayability, and battery-friendly mobile

---

## 12. Audit

Admin actions on scores and finalization require who/when records:

- `admin_modified_by`, `admin_modified_at`, `admin_notes` on participant
- Finalization event log (who finalized, when, with what values)
- Cut event log (who applied the cut, when, which participants were cut)
- Handicap history (source, effective date, who entered)

Not optional for a production system.

---

## 13. Manual and Import Flows

The current codebase has `manual_score_out`, `manual_score_in`, `manual_score_total`, and `manual_entry_format`. Keep this as a first-class capability:

- Admin can enter 9+9+total without per-hole detail
- Used for importing historical results and for admin correction
- Format strategy handles missing per-hole data gracefully

---

## 14. Surprising / Non-obvious Rules (collected from codebase)

1. **Projected vs actual standings** — tours compute two rankings: live (includes non-finalized competitions) and official (only finalized). Display both.
2. **Gender in handicap calculation** — non-negotiable. Course tees have gender-specific ratings. Playing handicap differs by gender.
3. **Participant vs player distinction** — participant is a slot, player is a person. Many-to-many via junction.
4. **Stroke index can override per tee** — most courses share one stroke index, but some tees reorder hole difficulty. Schema must allow override.
5. **Enrollment without player link** — invited guests can be enrolled by email+name, player account created later.
6. **Scoring type dimension on results** — results row is keyed by `(participant, scoring_type)`, so gross and net have separate position and points.
7. **No-result vs pickup** — `null` means did not play the hole, `0` means picked up (penalty in stableford, max in net). Different semantics.
8. **Round is context-free** — a CompetitionRound and a FriendlyRound share the same Round engine. Same scoring code, same leaderboard code, same start-list code.
9. **Handicap posting** — any Round can post to WHS handicap history, regardless of whether it is friendly or competitive. Decided per-round via a flag.

---

## 15. What This Buys Us

Adding a new playing format:

1. Implement a new format strategy (one file).
2. Register it.

It shows up in:

- Score entry (strategy declares what inputs it needs)
- Round leaderboard (strategy computes ranking)
- Competition leaderboard (aggregates across CompetitionRounds)
- Standings (tour/series aggregate generic results)
- Friendly and competitive play — all of them

Same for start-list modes: new mode enum + one strategy for slot/group semantics. Works everywhere because start lists live on Round.

Same for organisational wrappers: they are thin aggregation layers over competitions. Adding a new wrapper type is rare and well-scoped.

Multi-round competitions, cuts, mixed-format series rounds, ad-hoc self-organising weekend games, indoor simulator leagues — all compositions of the same primitive, not separate features.

The coupling problem disappears because features live on the Round primitive, not on the wrappers.

---

## 16. Open Questions

To resolve before or during implementation:

1. **Venue / Bay** as first-class entities or strings on round? Depends on whether simulator booking (across rounds and competitions) becomes a use case.
2. **Media** (photos / video) — placeholder now, or defer entirely?
3. **Handicap calculation engine** — reuse existing WHS implementation or wrap a library? Current codebase has one worth porting.
4. **Real-time updates** — push (websockets) or poll? Affects leaderboard architecture.
5. **Offline score entry** — expected for outdoor play on poor cell coverage. Design-in from day one or defer?
6. **Notifications** — in-app, email, push? Not modelled here; out of scope for the core domain but needs a touchpoint.
7. **Team composition for free-form events** — data model for "who plays in this format slot of this round" within a series. Sketch needed.
8. **FriendlyRound → Competition promotion** — supported operation, or out of scope? If supported: does the Round keep its ID and gain a CompetitionRound wrapper, or is it copied?
9. **FriendlyRound inside a Tour** — allowed? Probably not (tours are competitive), but some products let social rounds count toward loose standings. Decide.
10. **Schema choice** — 1:1 extension tables (FriendlyRound, CompetitionRound) vs single Round table with discriminator + nullable columns. Preference: extension tables for decoupling at schema level.

---

## 17. Naming Decisions

- **Round** is the core primitive. Context-free. All scoring logic targets Round.
- **FriendlyRound** wraps a Round for ad-hoc / casual play.
- **CompetitionRound** wraps a Round for formal competition play. One Competition has 1..N CompetitionRounds.
- **Competition** aggregates CompetitionRounds plus competition-wide config (format defaults, categories, point template, finalization, cut rules).
- **Tour** (individuals + fixed small partnerships) and **Series** (fixed teams) wrap Competition. Both keep their names — they are distinct shapes.
- **Do not introduce** "league" as a separate concept — it collapses into series.
- An individual player's 18 holes of play are represented by their **scorecard** within a Round, not called a "round" at that level to avoid ambiguity.
- Match-play brackets use **stage** for sub-phases, not "round", to avoid clashing with the Round entity.

---

*End of spec.*
