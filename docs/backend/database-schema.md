# Database Schema Reference

Complete reference for the golf-serie SQLite database schema. This document describes all tables, their relationships, and purpose.

---

## Overview

- **Database**: SQLite (`golf_series.db` at repository root)
- **Library**: `bun:sqlite` (Bun's built-in SQLite)
- **Migrations**: 43 migrations in `src/database/migrations/`
- **Foreign Keys**: Enabled (`PRAGMA foreign_keys = ON`)

---

## Entity Relationship Diagram (Conceptual)

```
users ──→ players ──→ player_profiles
  │         │            │
  │         │            └──→ handicap_history
  │         │
  │         ├──→ tour_enrollments ──→ tours
  │         │                          │
  │         └──→ tour_competition_registrations
  │                      │
  │                      └──→ participants
  │
  ├──→ sessions (auth)
  │
  ├──→ tour_admins ──→ tours
  ├──→ series_admins ──→ series
  └──→ competition_admins ──→ competitions

tours ──→ competitions ──→ tee_times ──→ participants
  │                           │
  │                           └──→ teams
  │
  ├──→ tour_categories
  ├──→ tour_documents
  └──→ point_templates

series ──→ competitions
  │
  ├──→ series_teams ──→ teams
  └──→ documents

courses ──→ course_tees ──→ course_tee_ratings
```

---

## Core Tables

### users

Authentication and user management.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | User ID |
| email | TEXT | NOT NULL, UNIQUE | Email address |
| password_hash | TEXT | NOT NULL | Hashed password |
| role | TEXT | NOT NULL | Role: SUPER_ADMIN, ORGANIZER, ADMIN, PLAYER |
| created_at | INTEGER | DEFAULT (unixepoch()) | Unix timestamp |

**Relationships**:
- `1:1` with players (via user_id)
- `1:N` with sessions
- `1:N` with tour_admins, series_admins, competition_admins

**Business Rules**:
- Email must be unique across all users
- Role determines system-wide permissions
- Passwords are hashed before storage

---

### players

Golf player profiles linked to user accounts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Player ID |
| user_id | INTEGER | FOREIGN KEY → users(id) | Linked user account |
| name | TEXT | NOT NULL | Player display name |
| handicap | REAL | | Current handicap index (WHS) |
| created_at | INTEGER | DEFAULT (unixepoch()) | Unix timestamp |

**Relationships**:
- `N:1` with users (via user_id)
- `1:1` with player_profiles (via player_id)
- `1:N` with handicap_history
- `1:N` with tour_enrollments
- `1:N` with participants

**Business Rules**:
- Handicap index follows WHS standards (-10 to +54)
- Name is separate from user email for display purposes

---

### player_profiles

Extended player profile information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| player_id | INTEGER | PRIMARY KEY, FOREIGN KEY → players(id) | Player ID |
| display_name | TEXT | | Preferred display name |
| bio | TEXT | | Player biography |
| avatar_url | TEXT | | Avatar image URL |
| home_course_id | INTEGER | FOREIGN KEY → courses(id) | Home course |
| visibility | TEXT | DEFAULT 'public' | Profile visibility (public/private) |
| created_at | INTEGER | DEFAULT (unixepoch()) | Unix timestamp |
| updated_at | INTEGER | DEFAULT (unixepoch()) | Unix timestamp |

**Relationships**:
- `1:1` with players (via player_id)
- `N:1` with courses (via home_course_id)

**Business Rules**:
- Optional extended profile data
- Visibility controls who can see profile details

---

### handicap_history

Audit trail of handicap index changes over time.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | History entry ID |
| player_id | INTEGER | NOT NULL, FOREIGN KEY → players(id) | Player ID |
| handicap_index | REAL | NOT NULL | Handicap index value |
| effective_date | TEXT | NOT NULL | Date in YYYY-MM-DD format |
| source | TEXT | | Source of handicap (manual, import, etc.) |
| notes | TEXT | | Optional notes |
| created_at | INTEGER | DEFAULT (unixepoch()) | Unix timestamp |

**Relationships**:
- `N:1` with players (via player_id)

**Business Rules**:
- Tracks historical handicap changes
- Effective date determines when handicap was valid
- Used for auditing and historical leaderboards

---

## Golf Infrastructure

### courses

Golf courses with 18-hole par configuration.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Course ID |
| name | TEXT | NOT NULL | Course name |
| pars | TEXT | NOT NULL | JSON array of 18 pars (3-6 each) |
| stroke_index | TEXT | | JSON array of 1-18 (hole difficulty order) |
| created_at | INTEGER | DEFAULT (unixepoch()) | Unix timestamp |

**Relationships**:
- `1:N` with course_tees
- `1:N` with competitions

**Data Format**:
```json
{
  "pars": "[4,5,3,4,4,3,5,4,4,4,3,5,4,4,3,4,5,4]",
  "stroke_index": "[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18]"
}
```

**Business Rules**:
- Must have exactly 18 pars
- Each par must be 3-6
- Stroke index indicates difficulty (1=hardest, 18=easiest)

---

### course_tees

Multiple tee boxes per course (e.g., red, white, blue).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Tee ID |
| course_id | INTEGER | NOT NULL, FOREIGN KEY → courses(id) | Course ID |
| name | TEXT | NOT NULL | Tee name (e.g., "Blue", "White") |
| tee_color | TEXT | | Hex color code for UI display |
| created_at | INTEGER | DEFAULT (unixepoch()) | Unix timestamp |

**Relationships**:
- `N:1` with courses (via course_id)
- `1:N` with course_tee_ratings

**Business Rules**:
- Multiple tee boxes allowed per course
- Each tee can have different ratings for men/women

---

### course_tee_ratings

Gender-specific course and slope ratings for WHS calculations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Rating ID |
| course_tee_id | INTEGER | NOT NULL, FOREIGN KEY → course_tees(id) | Tee ID |
| gender | TEXT | NOT NULL | 'male' or 'female' |
| course_rating | REAL | NOT NULL | Course rating (50-90) |
| slope_rating | INTEGER | NOT NULL | Slope rating (55-155) |
| created_at | INTEGER | DEFAULT (unixepoch()) | Unix timestamp |

**Relationships**:
- `N:1` with course_tees (via course_tee_id)

**Business Rules**:
- Course rating: 50.0 to 90.0
- Slope rating: 55 to 155 (113 is standard)
- Used for net score calculations (WHS)
- One rating per gender per tee

---

## Tournament Organization

### tours

Championship-level multi-competition tournament series.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Tour ID |
| name | TEXT | NOT NULL | Tour name |
| description | TEXT | | Tour description |
| owner_id | INTEGER | NOT NULL, FOREIGN KEY → users(id) | Owner user ID |
| enrollment_mode | TEXT | DEFAULT 'manual' | Enrollment mode (manual/auto) |
| visibility | TEXT | DEFAULT 'private' | Visibility (public/private) |
| scoring_mode | TEXT | DEFAULT 'gross' | Scoring mode (gross/net/both) |
| banner_image_url | TEXT | | Banner image URL |
| landing_document_id | INTEGER | FOREIGN KEY → tour_documents(id) | Landing page document |
| point_template_id | INTEGER | FOREIGN KEY → point_templates(id) | Default point template |
| created_at | INTEGER | DEFAULT (unixepoch()) | Unix timestamp |
| updated_at | INTEGER | DEFAULT (unixepoch()) | Unix timestamp |

**Relationships**:
- `N:1` with users (via owner_id)
- `1:N` with competitions
- `1:N` with tour_enrollments
- `1:N` with tour_categories
- `1:N` with tour_documents
- `1:N` with tour_admins

**Business Rules**:
- Owner has full control
- Enrollment mode determines how players join
- Scoring mode affects leaderboard calculations

---

### tour_enrollments

Player membership in tours.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Enrollment ID |
| tour_id | INTEGER | NOT NULL, FOREIGN KEY → tours(id) | Tour ID |
| player_id | INTEGER | NOT NULL, FOREIGN KEY → players(id) | Player ID |
| email | TEXT | NOT NULL | Player email (cached) |
| status | TEXT | DEFAULT 'pending' | Status (pending/active) |
| playing_handicap | REAL | | Playing handicap override |
| category_id | INTEGER | FOREIGN KEY → tour_categories(id) | Player category |
| enrolled_at | INTEGER | DEFAULT (unixepoch()) | Unix timestamp |

**Relationships**:
- `N:1` with tours (via tour_id)
- `N:1` with players (via player_id)
- `N:1` with tour_categories (via category_id)

**Constraints**:
- UNIQUE(tour_id, email) - one enrollment per email per tour

**Business Rules**:
- Status 'pending' requires approval, 'active' can compete
- Playing handicap overrides player.handicap if set

---

### tour_categories

Player classifications within tours (e.g., Pro, Amateur, Senior).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Category ID |
| tour_id | INTEGER | NOT NULL, FOREIGN KEY → tours(id) | Tour ID |
| name | TEXT | NOT NULL | Category name |
| description | TEXT | | Category description |
| sort_order | INTEGER | DEFAULT 0 | Display order |
| created_at | INTEGER | DEFAULT (unixepoch()) | Unix timestamp |

**Relationships**:
- `N:1` with tours (via tour_id)
- `1:N` with tour_enrollments
- `1:N` with competition_category_tees

**Business Rules**:
- Used to group players by skill/age/gender
- Maps to specific tees via competition_category_tees

---

### series

Multi-competition series (legacy, simpler than tours).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Series ID |
| name | TEXT | NOT NULL | Series name |
| description | TEXT | | Series description |
| banner_image_url | TEXT | | Banner image URL |
| is_public | INTEGER | DEFAULT 0 | Public visibility (0/1) |
| owner_id | INTEGER | FOREIGN KEY → users(id) | Owner user ID |
| landing_document_id | INTEGER | FOREIGN KEY → documents(id) | Landing page document |
| created_at | INTEGER | DEFAULT (unixepoch()) | Unix timestamp |

**Relationships**:
- `N:1` with users (via owner_id)
- `1:N` with competitions
- `1:N` with series_teams
- `1:N` with series_admins
- `1:N` with documents

**Business Rules**:
- Team-based competition structure
- Simpler than tours (no enrollment system)

---

### competitions

Individual golf events/competitions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Competition ID |
| name | TEXT | NOT NULL | Competition name |
| date | TEXT | NOT NULL | Date in YYYY-MM-DD |
| course_id | INTEGER | NOT NULL, FOREIGN KEY → courses(id) | Course ID |
| series_id | INTEGER | FOREIGN KEY → series(id) | Series ID (optional) |
| tour_id | INTEGER | FOREIGN KEY → tours(id) | Tour ID (optional) |
| tee_id | INTEGER | FOREIGN KEY → course_tees(id) | Default tee |
| owner_id | INTEGER | FOREIGN KEY → users(id) | Owner user ID |
| manual_entry_format | TEXT | DEFAULT 'hole_by_hole' | Score entry format |
| points_multiplier | REAL | DEFAULT 1.0 | Points multiplier |
| venue_type | TEXT | DEFAULT 'outdoor' | Venue (outdoor/indoor) |
| start_mode | TEXT | DEFAULT 'scheduled' | Start mode (scheduled/open) |
| open_start | TEXT | | Open start timestamp (ISO) |
| open_end | TEXT | | Open end timestamp (ISO) |
| is_results_final | INTEGER | DEFAULT 0 | Results finalized (0/1) |
| created_at | INTEGER | DEFAULT (unixepoch()) | Unix timestamp |

**Relationships**:
- `N:1` with courses (via course_id)
- `N:1` with series (via series_id, optional)
- `N:1` with tours (via tour_id, optional)
- `N:1` with course_tees (via tee_id)
- `N:1` with users (via owner_id)
- `1:N` with tee_times
- `1:N` with competition_category_tees
- `1:N` with competition_results
- `1:N` with competition_admins

**Business Rules**:
- Can be standalone, part of series, or part of tour
- Start mode 'open' allows self-registration
- Results finalized = scores locked, results snapshot created

---

### tee_times

Scheduled groups within a competition.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Tee time ID |
| competition_id | INTEGER | NOT NULL, FOREIGN KEY → competitions(id) | Competition ID |
| teetime | TEXT | NOT NULL | Time string (HH:MM) |
| start_hole | INTEGER | DEFAULT 1 | Starting hole (1 or 10) |
| created_at | INTEGER | DEFAULT (unixepoch()) | Unix timestamp |

**Relationships**:
- `N:1` with competitions (via competition_id)
- `1:N` with participants

**Business Rules**:
- Groups players into tee time slots
- Start hole allows shotgun starts (groups starting on different holes)

---

### participants

Individual player/team participation in tee times.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Participant ID |
| tee_time_id | INTEGER | NOT NULL, FOREIGN KEY → tee_times(id) | Tee time ID |
| team_id | INTEGER | FOREIGN KEY → teams(id) | Team ID (for series) |
| player_id | INTEGER | FOREIGN KEY → players(id) | Player ID (for tours) |
| position_name | TEXT | | Position in team (e.g., "A", "B") |
| score | TEXT | DEFAULT '[]' | JSON array of 18 scores |
| manual_score_total | INTEGER | | Manual total score (override) |
| is_locked | INTEGER | DEFAULT 0 | Score locked (0/1) |
| is_dq | INTEGER | DEFAULT 0 | Disqualified (0/1) |
| handicap_snapshot | REAL | | Handicap at registration |
| last_scored_at | INTEGER | | Last score entry timestamp |
| created_at | INTEGER | DEFAULT (unixepoch()) | Unix timestamp |

**Relationships**:
- `N:1` with tee_times (via tee_time_id)
- `N:1` with teams (via team_id, optional)
- `N:1` with players (via player_id, optional)

**Data Format**:
```json
{
  "score": "[4,5,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]"
}
```
(0 = unreported hole)

**Business Rules**:
- Either team_id or player_id must be set
- Score array has 18 elements (one per hole)
- is_locked prevents further score changes
- Handicap snapshot preserves handicap at time of play

---

## Scoring & Results

### competition_results

Finalized results snapshot after competition completion.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Result ID |
| competition_id | INTEGER | NOT NULL, FOREIGN KEY → competitions(id) | Competition ID |
| participant_id | INTEGER | NOT NULL, FOREIGN KEY → participants(id) | Participant ID |
| player_id | INTEGER | FOREIGN KEY → players(id) | Player ID |
| position | INTEGER | NOT NULL | Final position (1, 2, 3...) |
| points | REAL | DEFAULT 0 | Points awarded |
| gross_score | INTEGER | | Gross total score |
| net_score | INTEGER | | Net total score (WHS adjusted) |
| relative_to_par | INTEGER | | Relative to par |
| scoring_type | TEXT | NOT NULL | Scoring type (gross/net) |
| calculated_at | INTEGER | DEFAULT (unixepoch()) | Calculation timestamp |

**Relationships**:
- `N:1` with competitions (via competition_id)
- `N:1` with participants (via participant_id)
- `N:1` with players (via player_id)

**Business Rules**:
- Snapshot created when competition is finalized
- Points calculated from point_template
- Preserves results even if scores change later

---

### point_templates

Position-to-points mapping for tour standings.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Template ID |
| name | TEXT | NOT NULL | Template name |
| points_structure | TEXT | NOT NULL | JSON position→points map |
| tour_id | INTEGER | FOREIGN KEY → tours(id) | Tour scope (NULL = global) |
| created_at | INTEGER | DEFAULT (unixepoch()) | Unix timestamp |

**Data Format**:
```json
{
  "points_structure": "{\"1\":25,\"2\":18,\"3\":15,\"4\":12,\"5\":10}"
}
```

**Relationships**:
- `N:1` with tours (via tour_id, optional)
- `1:N` with tours (as default point_template_id)

**Business Rules**:
- Maps finishing position to points awarded
- Tour-scoped templates only visible to that tour

---

## Admin & Authorization

### tour_admins

Admin permissions for tours.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Admin entry ID |
| tour_id | INTEGER | NOT NULL, FOREIGN KEY → tours(id) | Tour ID |
| user_id | INTEGER | NOT NULL, FOREIGN KEY → users(id) | User ID |
| created_at | INTEGER | DEFAULT (unixepoch()) | Unix timestamp |

**Relationships**:
- `N:1` with tours (via tour_id)
- `N:1` with users (via user_id)

**Constraints**:
- UNIQUE(tour_id, user_id) - one admin role per user per tour

---

### series_admins

Admin permissions for series.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Admin entry ID |
| series_id | INTEGER | NOT NULL, FOREIGN KEY → series(id) | Series ID |
| user_id | INTEGER | NOT NULL, FOREIGN KEY → users(id) | User ID |
| created_at | INTEGER | DEFAULT (unixepoch()) | Unix timestamp |

**Relationships**:
- `N:1` with series (via series_id)
- `N:1` with users (via user_id)

**Constraints**:
- UNIQUE(series_id, user_id)

---

### competition_admins

Admin permissions for competitions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Admin entry ID |
| competition_id | INTEGER | NOT NULL, FOREIGN KEY → competitions(id) | Competition ID |
| user_id | INTEGER | NOT NULL, FOREIGN KEY → users(id) | User ID |
| created_at | INTEGER | DEFAULT (unixepoch()) | Unix timestamp |

**Relationships**:
- `N:1` with competitions (via competition_id)
- `N:1` with users (via user_id)

**Constraints**:
- UNIQUE(competition_id, user_id)

---

## Supporting Tables

### teams

Teams for series competitions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Team ID |
| name | TEXT | NOT NULL, UNIQUE | Team name |
| created_at | INTEGER | DEFAULT (unixepoch()) | Unix timestamp |

**Relationships**:
- `1:N` with participants
- `1:N` with series_teams

**Business Rules**:
- Team names must be unique across system
- Used in series competitions

---

### series_teams

Junction table linking series to teams.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| series_id | INTEGER | PRIMARY KEY, FOREIGN KEY → series(id) | Series ID |
| team_id | INTEGER | PRIMARY KEY, FOREIGN KEY → teams(id) | Team ID |

**Relationships**:
- `N:M` junction between series and teams

**Constraints**:
- Composite PRIMARY KEY (series_id, team_id)

---

### documents

Markdown documentation for series.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Document ID |
| title | TEXT | NOT NULL | Document title |
| content | TEXT | NOT NULL | Markdown content |
| type | TEXT | | Document type/category |
| series_id | INTEGER | NOT NULL, FOREIGN KEY → series(id) | Series ID |
| created_at | INTEGER | DEFAULT (unixepoch()) | Unix timestamp |
| updated_at | INTEGER | DEFAULT (unixepoch()) | Unix timestamp |

**Relationships**:
- `N:1` with series (via series_id)

---

### tour_documents

Markdown documentation for tours.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Document ID |
| title | TEXT | NOT NULL | Document title |
| content | TEXT | NOT NULL | Markdown content |
| type | TEXT | | Document type/category |
| tour_id | INTEGER | NOT NULL, FOREIGN KEY → tours(id) | Tour ID |
| created_at | INTEGER | DEFAULT (unixepoch()) | Unix timestamp |
| updated_at | INTEGER | DEFAULT (unixepoch()) | Unix timestamp |

**Relationships**:
- `N:1` with tours (via tour_id)

---

### tour_competition_registrations

Self-registration for open-start competitions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Registration ID |
| competition_id | INTEGER | NOT NULL, FOREIGN KEY → competitions(id) | Competition ID |
| player_id | INTEGER | NOT NULL, FOREIGN KEY → players(id) | Player ID |
| enrollment_id | INTEGER | NOT NULL, FOREIGN KEY → tour_enrollments(id) | Enrollment ID |
| tee_time_id | INTEGER | FOREIGN KEY → tee_times(id) | Assigned tee time |
| participant_id | INTEGER | FOREIGN KEY → participants(id) | Created participant |
| status | TEXT | DEFAULT 'looking_for_group' | Registration status |
| group_created_by | INTEGER | FOREIGN KEY → players(id) | Group creator |
| registered_at | INTEGER | DEFAULT (unixepoch()) | Registration timestamp |
| started_at | INTEGER | | Start timestamp |
| finished_at | INTEGER | | Finish timestamp |

**Status Values**:
- `looking_for_group` - Waiting to be added to group
- `registered` - In a group, not started
- `playing` - Currently playing
- `finished` - Completed round
- `withdrawn` - Withdrawn from competition

**Relationships**:
- `N:1` with competitions (via competition_id)
- `N:1` with players (via player_id)
- `N:1` with tour_enrollments (via enrollment_id)
- `N:1` with tee_times (via tee_time_id)
- `N:1` with participants (via participant_id)

---

### competition_category_tees

Maps tour categories to specific tees for a competition.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Mapping ID |
| competition_id | INTEGER | NOT NULL, FOREIGN KEY → competitions(id) | Competition ID |
| category_id | INTEGER | NOT NULL, FOREIGN KEY → tour_categories(id) | Category ID |
| tee_id | INTEGER | NOT NULL, FOREIGN KEY → course_tees(id) | Tee ID |

**Relationships**:
- `N:1` with competitions (via competition_id)
- `N:1` with tour_categories (via category_id)
- `N:1` with course_tees (via tee_id)

**Constraints**:
- UNIQUE(competition_id, category_id) - one tee per category per competition

**Business Rules**:
- Determines which tee box each category plays from
- Example: Pros play from Blue, Amateurs from White

---

### sessions

Authentication sessions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID session ID |
| user_id | INTEGER | NOT NULL, FOREIGN KEY → users(id) | User ID |
| expires_at | INTEGER | NOT NULL | Expiry unix timestamp |

**Relationships**:
- `N:1` with users (via user_id)

**Business Rules**:
- Session expires after 7 days (SESSION_EXPIRY_MS)
- Cookie-based session management

---

### migrations

Migration version tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| version | INTEGER | PRIMARY KEY | Migration version number |
| description | TEXT | | Migration description |
| applied_at | INTEGER | DEFAULT (unixepoch()) | Applied timestamp |

**Purpose**: Tracks which migrations have been applied to prevent re-running.

---

## Common Patterns

### Timestamps

All tables use Unix epoch timestamps (seconds since 1970-01-01):
- `created_at` - Creation time
- `updated_at` - Last update time
- `expires_at` - Expiration time

### Boolean Fields

SQLite doesn't have a native boolean type. We use INTEGER:
- `0` = false
- `1` = true

Examples: `is_locked`, `is_public`, `is_results_final`, `is_dq`

### JSON Fields

Complex data stored as JSON strings:
- `pars` - Array of 18 numbers
- `stroke_index` - Array of 18 numbers
- `score` - Array of 18 numbers
- `points_structure` - Object mapping positions to points

**Important**: Always use defensive JSON parsing (see `src/utils/parsing.ts`)

### Foreign Key Cascades

Most foreign keys use default behavior (prevent deletion of referenced rows). Some exceptions:
- Deleting a user should cascade to sessions (auto-logout)
- Orphaned records generally prevented by constraints

---

## Indexing Strategy

Current indexes (implicit and explicit):
- PRIMARY KEY columns are automatically indexed
- FOREIGN KEY columns benefit from indexes for joins
- UNIQUE constraints create indexes (e.g., teams.name, users.email)

**Performance Considerations**:
- Most queries use primary or foreign key lookups (fast)
- Leaderboard generation involves joins but typically < 1000 rows
- No full-text search indexes currently

---

## Migration History

Notable migrations:
- **001**: Initial schema (courses, teams, competitions, tee_times, participants)
- **015**: Users and sessions (authentication)
- **016**: Players (separate from users)
- **017**: Tours and point templates
- **021**: Tour enrollments
- **028**: Course tees (multiple tee boxes)
- **031**: Tour categories
- **034**: Tour competition registrations (self-service)
- **036**: Player profiles and handicap history
- **039**: Competition results (finalized snapshots)
- **041**: Series admins
- **042**: Competition ownership
- **043**: Tour-scoped point templates

See `src/database/migrations/` for complete history.

---

## Related Documentation

- **Authorization** → `authorization.md` - Role-based access, admin tables, permissions
- **Handicap System** → `handicap-system.md` - WHS calculations, course ratings
- **Tours & Enrollments** → `tours-and-enrollments.md` - Tour management details
- **Competitions & Results** → `competitions-and-results.md` - Competition lifecycle
