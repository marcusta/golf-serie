# SQL Query Patterns Catalog

This catalog documents all major SQL patterns used in the backend. **Before writing new SQL, search this document for similar patterns.**

> **AI Agent Rule**: Before writing ANY SQL query, you MUST:
> 1. Search this catalog for similar patterns
> 2. Grep the codebase: `grep -r "JOIN tablename" src/services/`
> 3. If 70%+ similar pattern exists, reuse or extract to shared utility

---

## Quick Reference

| Pattern | Primary Location | Reuse? |
|---------|------------------|--------|
| Competition + Course | `competition-service.ts:307` | Yes |
| Participant + Player Name | `leaderboard-service.ts:1187` | Use `PARTICIPANT_NAME_COALESCE` |
| Tour Enrollment + Player | `tour-enrollment-service.ts:229` | Yes |
| Tee Time + Course | `tee-time-service.ts:158` | Yes |
| Handicap Lookup | `participant-service.ts:334` | Yes |
| JSON Array Aggregation | `leaderboard-service.ts:1219` | Pattern reference |

---

## 1. Competition + Course JOINs

### Pattern 1A: Basic Competition with Course
**Locations**: `competition-service.ts:307-312`

```sql
SELECT c.*, co.name as course_name
FROM competitions c
JOIN courses co ON c.course_id = co.id
WHERE c.id = ?
```

### Pattern 1B: Competition List with Participant Count
**Locations**: `competition-service.ts:294-303`

```sql
SELECT c.*, co.name as course_name,
  (SELECT COUNT(*)
   FROM participants p
   JOIN tee_times t ON p.tee_time_id = t.id
   WHERE t.competition_id = c.id) as participant_count
FROM competitions c
JOIN courses co ON c.course_id = co.id
```

### Pattern 1C: Competition with Authorization Check
**Locations**: `competition-service.ts:399-426`

```sql
SELECT DISTINCT c.*, co.name as course_name,
  (SELECT COUNT(*) FROM participants p
   JOIN tee_times t ON p.tee_time_id = t.id
   WHERE t.competition_id = c.id) as participant_count
FROM competitions c
JOIN courses co ON c.course_id = co.id
LEFT JOIN competition_admins ca ON c.id = ca.competition_id AND ca.user_id = ?
LEFT JOIN series s ON c.series_id = s.id
LEFT JOIN series_admins sa ON s.id = sa.series_id AND sa.user_id = ?
LEFT JOIN tours t ON c.tour_id = t.id
LEFT JOIN tour_admins ta ON t.id = ta.tour_id AND ta.user_id = ?
WHERE c.owner_id = ? OR ca.user_id IS NOT NULL
  OR s.owner_id = ? OR sa.user_id IS NOT NULL
  OR t.owner_id = ? OR ta.user_id IS NOT NULL
ORDER BY c.date DESC
```

**Note**: This is a complex authorization pattern. If you need user-filtered competition access, use this as reference.

---

## 2. Participant + Player Name Resolution

### IMPORTANT: Use Utility Constants

```typescript
import { PARTICIPANT_NAME_COALESCE, playerNameJoins } from '../utils/player-display';
```

### Pattern 2A: Participant with Full Player Name (3-level fallback)
**Locations**: `leaderboard-service.ts:1187-1203`

```sql
SELECT p.*, tm.name as team_name, t.teetime,
       COALESCE(pp.display_name, pl.name, p.player_names) as player_name
FROM participants p
JOIN tee_times t ON p.tee_time_id = t.id
JOIN teams tm ON p.team_id = tm.id
LEFT JOIN players pl ON p.player_id = pl.id
LEFT JOIN player_profiles pp ON pl.id = pp.player_id
WHERE t.competition_id = ?
ORDER BY t.teetime, p.tee_order
```

**Rule**: Always use 3-level COALESCE for participant contexts:
- `pp.display_name` - User's preferred name
- `pl.name` - Registration name
- `p.player_names` - Fallback for unlinked participants

### Pattern 2B: Player Name (2-level, non-participant context)
**Locations**: `tour-service.ts:210`

```sql
SELECT te.*, COALESCE(pp.display_name, pl.name) as player_name
FROM tour_enrollments te
LEFT JOIN players pl ON te.player_id = pl.id
LEFT JOIN player_profiles pp ON pl.id = pp.player_id
WHERE te.tour_id = ?
```

**Rule**: Use 2-level when there's no `player_names` fallback field available.

---

## 3. Tour Enrollment Queries

### Pattern 3A: Enrollments with Player and Category
**Locations**: `tour-enrollment-service.ts:229-245`

```sql
SELECT
  te.*,
  p.name as player_name,
  tc.name as category_name,
  COALESCE(te.playing_handicap, p.handicap) as handicap
FROM tour_enrollments te
LEFT JOIN players p ON te.player_id = p.id
LEFT JOIN tour_categories tc ON te.category_id = tc.id
WHERE te.tour_id = ?
ORDER BY te.created_at DESC
```

### Pattern 3B: Enrollment by Status
**Locations**: `tour-enrollment-service.ts:248-267`

Same as 3A but with `AND te.status = ?`

### Pattern 3C: Enrollment Existence Check
**Locations**: `tour-enrollment-service.ts:114-124`

```sql
SELECT 1 FROM tour_enrollments te
JOIN players p ON te.player_id = p.id
WHERE te.tour_id = ? AND p.user_id = ? AND te.status = 'active'
LIMIT 1
```

**Note**: Use `SELECT 1 ... LIMIT 1` for boolean existence checks.

---

## 4. Tee Time Queries

### Pattern 4A: Tee Times with Course Info
**Locations**: `tee-time-service.ts:158-167`

```sql
SELECT t.*, co.name as course_name, co.pars
FROM tee_times t
JOIN competitions c ON t.competition_id = c.id
JOIN courses co ON c.course_id = co.id
WHERE t.competition_id = ?
ORDER BY t.teetime
```

### Pattern 4B: Participants for Tee Time
**Locations**: `tee-time-service.ts:186-194`

```sql
SELECT p.*, t.name as team_name, p.player_id, p.is_dq
FROM participants p
LEFT JOIN teams t ON p.team_id = t.id
WHERE p.tee_time_id = ?
ORDER BY p.tee_order
```

---

## 5. Handicap Lookup

### Pattern 5A: Player Handicap from Tour Enrollment
**Locations**: `participant-service.ts:334-341`, `leaderboard-service.ts:1177-1184`

```sql
SELECT COALESCE(te.playing_handicap, pl.handicap_index) as handicap_index
FROM tour_enrollments te
LEFT JOIN players pl ON te.player_id = pl.id
WHERE te.tour_id = ? AND te.player_id = ?
```

**Rule**: Tour-specific `playing_handicap` takes precedence over player's default handicap.

### Pattern 5B: Bulk Handicap Map
**Locations**: `leaderboard-service.ts:1177-1184`

```sql
SELECT te.player_id, COALESCE(te.playing_handicap, p.handicap) as handicap_index
FROM tour_enrollments te
JOIN players p ON te.player_id = p.id
WHERE te.tour_id = ? AND te.player_id IS NOT NULL AND te.status = 'active'
```

Used to build `Map<player_id, handicap>` for leaderboard calculations.

---

## 6. Aggregation Patterns

### Pattern 6A: JSON Array Aggregation (Tee Ratings)
**Locations**: `leaderboard-service.ts:1219-1235`

```sql
SELECT
  cct.category_id,
  cct.tee_id,
  ct.name as tee_name,
  (SELECT json_group_array(
    json_object('gender', ctr.gender, 'course_rating', ctr.course_rating, 'slope_rating', ctr.slope_rating)
  ) FROM course_tee_ratings ctr WHERE ctr.tee_id = ct.id) as ratings_json
FROM competition_category_tees cct
JOIN course_tees ct ON cct.tee_id = ct.id
WHERE cct.competition_id = ?
```

**Note**: SQLite-specific. Use `json_group_array()` for nested arrays.

### Pattern 6B: Score Calculation from JSON Array
**Locations**: `player-profile-service.ts:186-220`

```sql
SELECT
  SUM(value) as total
FROM json_each(p.score)
WHERE value > 0
```

Used inside CASE expressions for score aggregation.

### Pattern 6C: Distinct Count
**Locations**: `leaderboard-service.ts:1259-1265`

```sql
SELECT COUNT(DISTINCT p.team_id) as count
FROM participants p
JOIN tee_times t ON p.tee_time_id = t.id
WHERE t.competition_id = ?
```

---

## 7. Common Techniques

### Existence Check (Boolean)
```sql
SELECT 1 FROM table WHERE condition LIMIT 1
```
Returns `undefined` if not found, row if found.

### Optional Relationships (LEFT JOIN)
```sql
LEFT JOIN players pl ON p.player_id = pl.id  -- player_id can be NULL
LEFT JOIN player_profiles pp ON pl.id = pp.player_id  -- profile is optional
```

### Required Relationships (INNER JOIN)
```sql
JOIN tee_times t ON p.tee_time_id = t.id  -- participant must have tee_time
JOIN teams tm ON p.team_id = tm.id  -- participant must have team
```

### Fallback Values (COALESCE)
```sql
COALESCE(preferred_value, fallback_value, default_value)
```

### Scalar Subquery (Inline Count)
```sql
(SELECT COUNT(*) FROM participants p
 JOIN tee_times t ON p.tee_time_id = t.id
 WHERE t.competition_id = c.id) as participant_count
```

---

## Adding New Patterns

When you create a genuinely new SQL pattern:

1. Add it to this document with:
   - Pattern name and purpose
   - File location(s)
   - The SQL code
   - Any important notes

2. Consider extraction:
   - If used 2+ times → extract to utility or query fragment
   - If complex JOIN chain → document the relationship hierarchy

---

*Last updated: 2025-01-18*
