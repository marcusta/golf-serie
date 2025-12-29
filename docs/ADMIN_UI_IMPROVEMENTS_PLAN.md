# Admin UI Improvements Plan

> Living document for tracking improvements to the admin interface for Tours, Series, and Competitions.
> Created: 2025-12-29

## Overview

Improve the admin experience by:
- **Inline competition management** in Tour and Series detail views (no navigation away)
- **Tee box selection** when creating/editing competitions
- **Category-specific tee assignment** for tour competitions
- **Missing settings UI** for existing database features
- **Consistent admin patterns** across Tour and Series
- **Reusable components** with context-specific assemblies

## Current Pain Points

1. **Awkward navigation flow**: Creating a competition requires leaving Tour/Series context
2. **Missing tee selection**: Backend supports `tee_id` but no UI to select it
3. **No category-tee mapping**: Tours have categories but can't assign different tees per category
4. **Hidden settings**: `enrollment_mode` and `point_template_id` exist in DB but have no UI
5. **Inconsistent Series UI**: Series lacks Competitions tab and is less feature-rich than Tours

## Phase Summary

| Phase | Description | Status |
|-------|-------------|--------|
| [Phase 1](admin-ui-improvement-phases/phase-01-shared-components.md) | Shared Competition Form Components | COMPLETED |
| [Phase 2](admin-ui-improvement-phases/phase-02-tee-selection.md) | Tee Box Selection in Competitions | COMPLETED |
| [Phase 3](admin-ui-improvement-phases/phase-03-tour-competitions-inline.md) | Tour Inline Competition Management | COMPLETED |
| [Phase 4](admin-ui-improvement-phases/phase-04-category-tee-mapping.md) | Category-to-Tee Mapping for Tours | COMPLETED |
| [Phase 5](admin-ui-improvement-phases/phase-05-series-competitions-inline.md) | Series Inline Competition Management | COMPLETED |
| [Phase 6](admin-ui-improvement-phases/phase-06-tour-settings-complete.md) | Complete Tour Settings UI (incl. Point Templates) | PARTIAL |
| [Phase 7](admin-ui-improvement-phases/phase-07-standalone-competitions.md) | Simplify Standalone Competitions | NOT STARTED |
| [Phase 8](admin-ui-improvement-phases/phase-08-series-enhancements.md) | Series Admin Enhancements | NOT STARTED |

---

## Database Schema Changes

### New Table: competition_category_tees (Phase 4)

```sql
CREATE TABLE competition_category_tees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES tour_categories(id) ON DELETE CASCADE,
  tee_id INTEGER NOT NULL REFERENCES course_tees(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(competition_id, category_id)
);

CREATE INDEX idx_competition_category_tees_competition
  ON competition_category_tees(competition_id);
```

### New Table: series_admins (Phase 8, Optional)

```sql
CREATE TABLE series_admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  series_id INTEGER NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(series_id, user_id)
);
```

---

## Component Architecture

### Shared Components (Phase 1)

```
frontend/src/components/admin/competition/
├── CompetitionFormFields.tsx      # Name, date, venue type, manual entry format
├── CourseSelector.tsx             # Course dropdown with search
├── TeeSelector.tsx                # Single tee dropdown for selected course
├── CompetitionSettingsFields.tsx  # Points multiplier, start mode, etc.
└── CompetitionCard.tsx            # Display card for competition lists
```

### Context-Specific Components

```
frontend/src/components/admin/tour/
├── TourCompetitionModal.tsx       # Full modal with CategoryTeeAssignment
├── TourCompetitionList.tsx        # List for Competitions tab
└── CategoryTeeAssignment.tsx      # Category → Tee mapping grid

frontend/src/components/admin/series/
├── SeriesCompetitionModal.tsx     # Modal with single TeeSelector
└── SeriesCompetitionList.tsx      # List for Competitions tab
```

---

## Target UI Structure

### TourDetail.tsx Tabs

```
├── Competitions      ← ENHANCED: Inline list + modal
│   ├── Competition list with tee/category info visible
│   ├── [+ Add Competition] → Modal (no navigation)
│   │   ├── Basic: Name, Date, Course
│   │   ├── Tee Assignment: Category → Tee grid
│   │   └── Settings: Multiplier, start mode
│   └── [Edit] / [Delete] inline actions
│
├── Enrollments       ← Existing (no changes)
├── Categories        ← Existing (no changes)
├── Admins            ← Existing (no changes)
├── Documents         ← Existing (no changes)
└── Settings          ← ENHANCED
    ├── Banner Image URL (existing)
    ├── Scoring Mode (existing)
    ├── Enrollment Mode (NEW)
    └── Default Point Template (NEW)
```

### SeriesDetail.tsx Tabs

```
├── Competitions      ← NEW TAB
│   ├── Competition list
│   ├── [+ Add Competition] → Modal
│   │   ├── Basic: Name, Date, Course
│   │   ├── Tee Selection: Single dropdown
│   │   └── Settings: Multiplier
│   └── [Edit] / [Delete] inline
│
├── Teams             ← Existing (no changes)
├── Documents         ← Existing (no changes)
├── Admins            ← NEW (optional, Phase 8)
└── Settings          ← Existing (no changes)
```

### Competitions.tsx (Standalone Only)

```
├── Filter: Only show competitions with NO tour_id AND NO series_id
├── Simplified form (existing pattern)
├── Single tee selection (optional)
└── No category complexity
```

---

## Verification Criteria

Each phase includes specific verification steps:

1. **Unit Tests**: Backend service and API tests pass
2. **TypeScript**: Frontend compilation succeeds (`npm run build`)
3. **Manual Testing**: UI works as documented
4. **No Regressions**: Existing functionality unchanged

---

## Implementation Notes

### Key Principles

1. **Reuse over duplication**: Extract shared components first
2. **Progressive enhancement**: Each phase builds on previous
3. **Backward compatible**: Existing data and flows continue to work
4. **Mobile-first**: All new UI must work on mobile

### API Patterns

All new endpoints follow existing patterns:
- `GET /api/tours/:id/competitions` - List tour competitions
- `POST /api/tours/:id/competitions` - Create competition in tour context
- `PUT /api/competitions/:id/category-tees` - Update category-tee mapping

### Component Patterns

- Use shadcn/ui Dialog for modals
- Use React Hook Form for form state
- Use React Query for server state
- Follow existing TourDetail.tsx patterns

---

## Related Documentation

- [Tour Implementation Plan](./TOUR_IMPLEMENTATION_PLAN.md) - Original tour system
- [Frontend Architecture](./frontend-architecture.md) - Component patterns
- [Backend Architecture](./backend-architecture.md) - Service patterns
