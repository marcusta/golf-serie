# Clubs Admin Restructuring

## Overview

Restructure the admin UI to make Clubs a top-level organizational entity. Courses are always owned by a club, and teams can optionally belong to a club.

## Current State

- **Courses**: Top-level admin section, standalone management
- **Teams**: Top-level admin section, no club association
- **Clubs**: Exist in database but no dedicated admin UI (only used for player home club selection)

## Proposed State

- **Clubs**: New top-level admin section
- **Courses**: Managed within Club detail view (every course belongs to a club)
- **Teams**: Remain top-level, but can optionally link to a club

## Data Model Changes

### Teams Table
Add optional club association:
```sql
ALTER TABLE teams ADD COLUMN club_id INTEGER REFERENCES clubs(id) ON DELETE SET NULL;
```

### Clubs Table
No changes needed - already has `id`, `name`, `created_at`, `updated_at`.

## Admin UI Structure

```
Admin Navigation
├── Clubs          ← NEW top-level section
├── Series
├── Competitions
├── Teams          ← Stays top-level (teams without clubs + quick access)
├── Players
└── ...
```

### Clubs List View
- Infinite scroll list (follows Users/Courses pattern)
- Search by club name
- Shows: Club name, course count, team count
- Click to open Club detail

### Club Detail View
Tabbed interface:

**Tab 1: Club Info**
- Club name (editable)
- Save button

**Tab 2: Courses**
- List of courses belonging to this club
- Add new course (inline or dialog)
- Click course row to navigate to Course detail page
- Remove course from club (reassign to different club, not delete)

**Tab 3: Teams** (optional association)
- List of teams belonging to this club
- Link existing team to club
- Unlink team from club
- Click team row to navigate to Team detail page

## Key Principles

1. **Courses always belong to a club** - No orphaned courses
   - When creating a course, club selection is required
   - Migration: Assign existing courses without clubs to a "Default" or "Unassigned" club, or prompt admin to assign

2. **Teams optionally belong to a club** - Flexible association
   - Teams can exist independently (e.g., ad-hoc teams for a single series)
   - Teams can be linked to a club for organizational purposes

3. **Non-destructive** - Existing functionality preserved
   - Direct course editing still available via Course detail page
   - Teams section remains accessible at top level

## Navigation Flow

```
Clubs list → Club detail → Courses tab → Course row → Course detail page
                        → Teams tab → Team row → Team detail page
```

## Migration Considerations

1. **Existing courses without club_id**
   - Option A: Create "Unassigned" club, bulk-assign orphans
   - Option B: Admin prompt to assign clubs before enabling new UI
   - Option C: Allow null temporarily, show warning in UI

2. **UI rollout**
   - Can deploy incrementally - Clubs section can coexist with existing Courses section during transition

## Open Questions

- Should we hide/remove the top-level Courses section entirely, or keep it as a "all courses" quick-access view?
- Club creation workflow - where does it happen? (Clubs list has "Add Club" button)
- Should club deletion cascade to courses, or require reassignment first?

## Future Considerations

- Club admins (users who can manage a specific club's courses/teams)
- Club branding/logo
- Club contact information
- Public club pages

---

*This is a high-level planning document. Detailed implementation plan to be created before development.*
