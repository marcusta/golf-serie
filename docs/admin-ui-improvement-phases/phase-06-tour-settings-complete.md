# Phase 6: Complete Tour Settings UI

**Status**: PARTIAL (Point template selection complete, creation pending)
**Goal**: Expose all tour settings that exist in the database but lack UI

## Background

The `tours` table has several columns that were added via migrations but never got UI:
- `enrollment_mode` (closed/request) - Migration 023
- `point_template_id` - Migration 026

These features exist in the backend but admins cannot configure them.

## Current Tour Settings Tab

```
├── Banner Image URL     ✅ Implemented
├── Scoring Mode         ✅ Implemented
└── (missing settings)
```

## Target Tour Settings Tab

```
├── Banner Image URL     (existing)
├── Scoring Mode         (existing)
├── Enrollment Mode      (NEW)
├── Default Point Template (NEW)
└── Visibility           (move here for consistency)
```

## Tasks

### 6.1 Add Enrollment Mode Selector

**File**: `frontend/src/views/admin/TourDetail.tsx` (Settings tab)

```typescript
type EnrollmentMode = 'closed' | 'request';
```

Features:
- [ ] Radio group or toggle for enrollment mode
- [ ] Clear labels:
  - "Closed" - Only admins can add players
  - "Request" - Players can request to join
- [ ] Help text explaining each mode
- [ ] Save to API on settings save

### 6.2 Add Point Template Selector ✅

**File**: `frontend/src/views/admin/TourDetail.tsx` (Settings tab)

Features:
- [x] Dropdown to select from available point templates
- [x] Option to clear (no template)
- [x] Show template preview/summary if selected
- [ ] Link to point template management (see 6.7)

### 6.3 Create/Verify Point Template API Hook ✅

**File**: `frontend/src/api/point-templates.ts`

- [x] Check if `usePointTemplates()` hook exists
- [x] Hook already exists with full CRUD operations
- [x] Templates include name and points_structure

### 6.4 Move Visibility to Settings Tab (Optional)

Currently visibility might be set elsewhere. Consider consolidating:
- [ ] Assess where visibility is currently set
- [ ] If not in Settings tab, add it
- [ ] Remove duplicate if exists elsewhere

### 6.5 Update Tour API for New Settings

**File**: `src/api/tours.ts`

- [ ] Verify PUT /api/tours/:id accepts enrollment_mode
- [ ] Verify PUT /api/tours/:id accepts point_template_id
- [ ] Add validation for valid values

### 6.6 Write/Update Tests

- [ ] Test enrollment_mode update via API
- [ ] Test point_template_id update via API
- [ ] Test invalid values rejected

## Verification

- [ ] Settings tab shows all configuration options
- [ ] Can change enrollment mode and save
- [ ] Can select/clear point template and save
- [ ] Settings persist after page reload
- [ ] API validates enrollment_mode values
- [ ] TypeScript compilation passes

## API Endpoints Used

```
GET /api/tours/:id - Get tour with all settings
PUT /api/tours/:id - Update tour settings
GET /api/point-templates - List available templates
```

## Dependencies

None - can be done in parallel with Phases 3-5

## Files Modified

```
frontend/src/views/admin/TourDetail.tsx (modify)
frontend/src/api/tours.ts (possibly modify)
frontend/src/api/point-templates.ts (possibly create)
src/api/tours.ts (verify/modify)
```

## UI Mockup

```
┌─────────────────────────────────────────────────────────────┐
│ Tour Settings                                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Banner Image                                                │
│ [https://example.com/banner.jpg                       ]     │
│ ┌─────────────────────────────┐                             │
│ │     [Banner Preview]        │                             │
│ └─────────────────────────────┘                             │
│                                                             │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ Scoring Mode                                                │
│ [Gross and Net (Both)                                ▼]     │
│ ℹ️ Determines how scores are calculated and displayed       │
│                                                             │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ Enrollment Mode                                             │
│ ○ Closed - Only admins can add players                      │
│ ● Request - Players can request to join                     │
│ ℹ️ Controls how players are enrolled in the tour            │
│                                                             │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ Default Point Template                                      │
│ [Standard Stableford (1-2-3-4-5)                     ▼]     │
│ ℹ️ Points awarded based on finishing position               │
│                                                             │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ Visibility                                                  │
│ [x] Public - Tour visible to all users                      │
│ [ ] Private - Tour only visible to enrolled players         │
│                                                             │
│                                        [Save Settings]      │
└─────────────────────────────────────────────────────────────┘
```

### 6.7 Tour-Scoped Point Template Management

**Goal**: Allow tour admins to create and manage point templates directly within the tour context

Currently point templates are global. Tour admins should be able to:
1. Create a new point template specifically for their tour
2. Edit/delete templates they created
3. View all available templates for selection

**File**: `frontend/src/components/admin/tour/PointTemplateManager.tsx`

Features:
- [ ] Section in Tour Settings for managing point templates
- [ ] "Create New Template" button opens inline form
- [ ] Template form: Name + Points per position (1st, 2nd, 3rd, etc.)
- [ ] Visual preview of points structure
- [ ] Edit/delete buttons for templates created by this tour
- [ ] Show which templates are in use by other tours (read-only)

**UI**:
```
┌─────────────────────────────────────────────────────────────┐
│ Point Templates                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Active Template: [Standard F1 Style              ▼]         │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ Standard F1 Style                          [Edit] [X] │   │
│ │ 1st: 25pts, 2nd: 18pts, 3rd: 15pts, 4th: 12pts...     │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ [+ Create New Point Template]                               │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ Create Point Template                                 │   │
│ │ Name: [Weekly Tour Standard    ]                      │   │
│ │                                                       │   │
│ │ Position │ Points                                     │   │
│ │    1st   │ [100]                                      │   │
│ │    2nd   │ [75]                                       │   │
│ │    3rd   │ [50]                                       │   │
│ │    4th   │ [25]                                       │   │
│ │    5th   │ [10]                                       │   │
│ │ [+ Add Position]                                      │   │
│ │                                                       │   │
│ │                     [Cancel] [Create Template]        │   │
│ └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Future Enhancements (Out of Scope)

- Enrollment limits (max players)
- Season start/end dates
- Tour archival
- Auto-category assignment rules

## Notes

- Enrollment mode logic already exists in backend
- Point templates table exists but may have limited data
- Consider adding a "View Template" preview
- Settings should save all fields together
