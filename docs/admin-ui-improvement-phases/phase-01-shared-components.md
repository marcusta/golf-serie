# Phase 1: Shared Competition Form Components

**Status**: COMPLETED
**Goal**: Extract reusable form components for competition creation/editing
**Completed**: 2025-12-29

## Background

Currently, `Competitions.tsx` has an inline form for creating/editing competitions. To enable inline competition management in TourDetail and SeriesDetail, we need to extract these form elements into reusable components.

## Tasks

### 1.1 Create CourseSelector Component

**File**: `frontend/src/components/admin/competition/CourseSelector.tsx`

```typescript
interface CourseSelectorProps {
  value: number | null;
  onChange: (courseId: number | null) => void;
  error?: string;
  disabled?: boolean;
  label?: string;
  required?: boolean;
}
```

Features:
- [x] Dropdown with all available courses (using shadcn Select)
- [x] Show course name and par total
- [x] Clear selection option ("No course selected")
- [x] Error state display
- [x] Loading state while fetching courses

### 1.2 Create CompetitionFormFields Component

**File**: `frontend/src/components/admin/competition/CompetitionFormFields.tsx`

```typescript
interface CompetitionFormFieldsProps {
  name: string;
  onNameChange: (name: string) => void;
  date: string;
  onDateChange: (date: string) => void;
  venueType: 'outdoor' | 'indoor';
  onVenueTypeChange: (type: 'outdoor' | 'indoor') => void;
  manualEntryFormat: 'out_in_total' | 'total_only';
  onManualEntryFormatChange: (format: 'out_in_total' | 'total_only') => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}
```

Features:
- [x] Name input with validation
- [x] Date picker (native HTML date input, YYYY-MM-DD format)
- [x] Venue type selector (outdoor/indoor)
- [x] Manual entry format selector
- [x] Form validation feedback (error display)

### 1.3 Create CompetitionSettingsFields Component

**File**: `frontend/src/components/admin/competition/CompetitionSettingsFields.tsx`

```typescript
interface CompetitionSettingsFieldsProps {
  pointsMultiplier: number;
  onPointsMultiplierChange: (value: number) => void;
  startMode: 'scheduled' | 'open';
  onStartModeChange: (mode: 'scheduled' | 'open') => void;
  openPeriodStart?: string;
  openPeriodEnd?: string;
  onOpenPeriodChange?: (start: string, end: string) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}
```

Features:
- [x] Points multiplier input (0.1 - 10, step 0.1)
- [x] Start mode selector with explanation text
- [x] Conditional open period fields (only when start_mode = 'open')
- [x] Datetime pickers for open period

### 1.4 Create CompetitionCard Component

**File**: `frontend/src/components/admin/competition/CompetitionCard.tsx`

```typescript
interface CompetitionCardProps {
  competition: Competition;
  courseName?: string;
  teeName?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  showTeeInfo?: boolean;
  categoryCount?: number;
  children?: React.ReactNode;
}
```

Features:
- [x] Display competition name, date, course
- [x] Show tee box (when showTeeInfo=true and teeName provided)
- [x] Show category count (for tour competitions)
- [x] Edit and delete action buttons (optional)
- [x] Status indicators (upcoming, in progress, completed)
- [x] Points multiplier display (when != 1)
- [x] Participant count display
- [x] Children slot for custom action buttons

### 1.5 Create index exports

**File**: `frontend/src/components/admin/competition/index.ts`

- [x] Export all components
- [x] Export shared types/interfaces (VenueType, ManualEntryFormat, StartMode, CompetitionStatus)

## Verification

- [x] All components render without errors
- [x] TypeScript compilation passes (`npm run build` succeeds)
- [x] Components work in isolation (controlled component pattern)
- [x] Existing Competitions.tsx still functions (no changes made)

## Dependencies

None - this is the foundation phase.

## Files Created

```
frontend/src/components/admin/competition/
├── CourseSelector.tsx
├── CompetitionFormFields.tsx
├── CompetitionSettingsFields.tsx
├── CompetitionCard.tsx
└── index.ts
```

## Implementation Notes

- All components use shadcn/ui primitives (Select, Input)
- Components are controlled (value + onChange pattern) for React Hook Form compatibility
- Error states supported via `errors` prop with field-specific messages
- Disabled state supported on all form components
- Mobile-first responsive design maintained
- Matches existing admin UI styling patterns from Competitions.tsx
