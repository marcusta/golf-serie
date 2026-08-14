---
name: navigation-guard
description: Validates correct usage of PlayerPageLayout component in TapScore. Ensures detail pages use PlayerPageLayout while top-level list pages do not. Use when implementing new pages or reviewing navigation structure to prevent misuse and maintain consistent UX.
---

# Navigation Structure Validator

Validates correct usage of `PlayerPageLayout` component. Ensures detail pages use it, top-level list pages don't. Use before committing new pages or during code review.

---

## Validation Workflow

Copy this checklist to track progress:

```
Navigation Validation Progress:
- [ ] Step 1: Identify page type (detail vs list)
- [ ] Step 2: Check PlayerPageLayout usage
- [ ] Step 3: Verify isDetailView configuration
- [ ] Step 4: Generate violation report
- [ ] Step 5: Provide fix recommendations
```

---

## Step 1: Identify Page Type

### Detail Pages (SHOULD use PlayerPageLayout)

Detail pages show a single entity with specific context:

**Examples:**
- Series detail page: `/player/series/:seriesId`
- Tour detail page: `/player/tours/:tourId`
- Competition detail page: `/player/competitions/:competitionId`
- Player profile: `/player/players/:playerId`
- User profile: `/player/profile`
- Game setup wizard: `/player/games/new`
- Game play view: `/player/games/:gameId/play`
- Tee time details: `/player/competitions/:competitionId/tee-times/:teeTimeId`
- Document detail: `/player/series/:seriesId/documents/:docId`

**Pattern:** URL includes dynamic ID parameter (`:id`, `:seriesId`, etc.)

### Top-Level List Pages (SHOULD NOT use PlayerPageLayout)

List pages show collections without specific entity context:

**Examples:**
- Landing page: `/player`
- All competitions: `/player/competitions`
- All series: `/player/series`
- All tours: `/player/tours`
- All rounds: `/player/rounds`
- Dashboard views

**Pattern:** URL is static (no dynamic ID parameters)

---

## Step 2: Check PlayerPageLayout Usage

### For New or Modified Pages

**Check file imports:**
```bash
grep -n "PlayerPageLayout" [file_path]
```

**Check component usage:**
```bash
grep -A5 "<PlayerPageLayout" [file_path]
```

### Validate Pattern

**Detail page (✅ Correct):**
```tsx
import { PlayerPageLayout } from "@/components/layout/PlayerPageLayout"

export default function SeriesDetailPage() {
  return (
    <PlayerPageLayout
      title="Series Name"
      seriesId={seriesId}
      showBackButton={true}
    >
      {/* Detail content */}
    </PlayerPageLayout>
  )
}
```

**List page (✅ Correct):**
```tsx
export default function SeriesListPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-scorecard to-rough">
      <div className="container mx-auto px-4 py-8">
        {/* List content */}
      </div>
    </div>
  )
}
```

---

## Step 3: Verify isDetailView Configuration

When adding NEW detail pages, check `PlayerLayout.tsx`:

```bash
cat frontend/src/views/player/PlayerLayout.tsx | grep -A30 "isDetailView"
```

**The `isDetailView` logic must include the new route:**

```tsx
const isDetailView =
  location.pathname.endsWith("/player") ||
  location.pathname.match(/\/player\/series\/\d+/) ||
  location.pathname.match(/\/player\/tours\/\d+/) ||
  location.pathname.match(/\/player\/competitions\/\d+/) ||
  location.pathname.match(/\/player\/games\/\d+\/play/) ||
  // ... add new detail routes here
```

**Why this matters:**
- `PlayerLayout.tsx` is the router wrapper with tabs
- `isDetailView` tells it to hide tabs for detail pages
- If your new detail page is NOT in `isDetailView`, tabs will incorrectly show

**Check if new route is missing:**
1. Look at the new page route (e.g., `/player/documents/:docId`)
2. Check if pattern exists in `isDetailView`
3. If missing, `PlayerLayout.tsx` needs update

---

## Step 4: Generate Violation Report

Create structured report:

```markdown
## Navigation Structure Violations Report

### Total Violations: [count]

---

### Violation 1: Incorrect PlayerPageLayout Usage

**File:** `frontend/src/views/player/CompetitionsPage.tsx`
**Issue:** Top-level list page incorrectly uses PlayerPageLayout
**Severity:** High - Breaks navigation UX

**Current (❌ Wrong):**
```tsx
import { PlayerPageLayout } from "@/components/layout/PlayerPageLayout"

export default function CompetitionsPage() {
  return (
    <PlayerPageLayout title="All Competitions">
      <CompetitionsList />
    </PlayerPageLayout>
  )
}
```

**Fix (✅ Correct):**
```tsx
export default function CompetitionsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-scorecard to-rough">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-display-lg text-fairway mb-6">All Competitions</h1>
        <CompetitionsList />
      </div>
    </div>
  )
}
```

**Explanation:** `/player/competitions` is a top-level list page, not a detail page. It should use plain layout, not PlayerPageLayout.

---

### Violation 2: Missing PlayerPageLayout on Detail Page

**File:** `frontend/src/views/player/TourDetailPage.tsx`
**Issue:** Detail page missing PlayerPageLayout
**Severity:** Medium - Inconsistent navigation

**Current (❌ Wrong):**
```tsx
export default function TourDetailPage() {
  return (
    <div className="container mx-auto">
      <h1>{tour.name}</h1>
      <TourDetails tour={tour} />
    </div>
  )
}
```

**Fix (✅ Correct):**
```tsx
import { PlayerPageLayout } from "@/components/layout/PlayerPageLayout"

export default function TourDetailPage() {
  return (
    <PlayerPageLayout
      title={tour.name}
      seriesId={tour.series_id}
      tourId={tour.id}
      showBackButton={true}
    >
      <TourDetails tour={tour} />
    </PlayerPageLayout>
  )
}
```

**Explanation:** `/player/tours/:tourId` shows a single tour, so it's a detail page requiring PlayerPageLayout.

---

### Violation 3: Missing isDetailView Configuration

**File:** `frontend/src/views/player/PlayerLayout.tsx`
**Issue:** New detail route not in isDetailView
**Severity:** High - Tabs show on detail pages

**Current (❌ Missing):**
```tsx
const isDetailView =
  location.pathname.match(/\/player\/series\/\d+/) ||
  location.pathname.match(/\/player\/tours\/\d+/) ||
  // New route missing
```

**Fix (✅ Add pattern):**
```tsx
const isDetailView =
  location.pathname.match(/\/player\/series\/\d+/) ||
  location.pathname.match(/\/player\/tours\/\d+/) ||
  location.pathname.match(/\/player\/documents\/\d+/) || // Added
```

**Explanation:** New document detail page needs pattern in isDetailView to hide tabs.

---

### Summary

- **Total Issues:** [count]
- **High Severity:** [count]
- **Medium Severity:** [count]

**Action Required:** Fix violations to maintain consistent navigation UX.

**Approval needed:** Should I apply these fixes now?
```

---

## Common Violation Patterns

### Pattern 1: List Page Using PlayerPageLayout

**Wrong:**
```tsx
// ❌ Bad: List page with PlayerPageLayout
export default function AllSeriesPage() {
  return (
    <PlayerPageLayout title="All Series">
      <SeriesList />
    </PlayerPageLayout>
  )
}
```

**Correct:**
```tsx
// ✅ Good: List page with plain layout
export default function AllSeriesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-scorecard to-rough">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-display-lg text-fairway mb-6">All Series</h1>
        <SeriesList />
      </div>
    </div>
  )
}
```

### Pattern 2: Detail Page Without PlayerPageLayout

**Wrong:**
```tsx
// ❌ Bad: Detail page without PlayerPageLayout
export default function CompetitionDetailPage() {
  return (
    <div>
      <h1>{competition.name}</h1>
      <CompetitionDetails />
    </div>
  )
}
```

**Correct:**
```tsx
// ✅ Good: Detail page with PlayerPageLayout
import { PlayerPageLayout } from "@/components/layout/PlayerPageLayout"

export default function CompetitionDetailPage() {
  const { competitionId } = useParams()
  const { data: competition } = useCompetition(competitionId)

  return (
    <PlayerPageLayout
      title={competition.name}
      seriesId={competition.series_id}
      showBackButton={true}
    >
      <CompetitionDetails />
    </PlayerPageLayout>
  )
}
```

### Pattern 3: New Route Not in isDetailView

When adding `/player/statistics/:playerId`:

**Wrong (isDetailView unchanged):**
```tsx
// ❌ PlayerLayout.tsx unchanged - tabs will show on stats page
const isDetailView =
  location.pathname.match(/\/player\/series\/\d+/) ||
  location.pathname.match(/\/player\/tours\/\d+/)
  // Missing statistics route
```

**Correct (isDetailView updated):**
```tsx
// ✅ Add new route pattern
const isDetailView =
  location.pathname.match(/\/player\/series\/\d+/) ||
  location.pathname.match(/\/player\/tours\/\d+/) ||
  location.pathname.match(/\/player\/statistics\/\d+/) // Added
```

---

## PlayerPageLayout Props Reference

When using PlayerPageLayout, provide appropriate props:

```tsx
<PlayerPageLayout
  title="Page Title"              // Required: Page heading
  subtitle="Optional subtitle"    // Optional: Secondary text
  showBackButton={true}            // Optional: Show back button (default: true)
  seriesId={seriesId}             // Optional: For breadcrumb context
  seriesName="Series Name"         // Optional: Override series display name
  tourId={tourId}                 // Optional: For breadcrumb context
  tourName="Tour Name"             // Optional: Override tour display name
  showHamburgerMenu={true}         // Optional: Show hamburger menu (default: true)
  customActions={<Button>...</Button>} // Optional: Custom header actions
>
  {children}
</PlayerPageLayout>
```

**Best practices:**
- Always provide `title`
- Include `seriesId` if page is part of a series
- Include `tourId` if page is part of a tour
- Use `customActions` for page-specific buttons (Edit, Delete, etc.)

---

## Validation Scripts

### Check All Pages for PlayerPageLayout Usage

```bash
# Find all pages using PlayerPageLayout
echo "=== Pages using PlayerPageLayout ==="
grep -r "PlayerPageLayout" frontend/src/views/player/*.tsx --include="*.tsx" -l

# Check each usage
for file in $(grep -r "PlayerPageLayout" frontend/src/views/player/*.tsx --include="*.tsx" -l); do
  echo ""
  echo "=== $file ==="
  basename=$(basename "$file" .tsx)

  # Determine if this should be a detail page based on filename
  if [[ $basename == *"Detail"* ]] || [[ $basename == *"Profile"* ]]; then
    echo "✅ Likely correct (detail page)"
  else
    echo "⚠️  Review needed (might be list page)"
    echo "Route: Check router.tsx for this component"
  fi
done
```

### Check isDetailView Completeness

```bash
# Show current isDetailView patterns
echo "=== Current isDetailView patterns ==="
grep -A30 "isDetailView" frontend/src/views/player/PlayerLayout.tsx

echo ""
echo "=== All detail page routes ==="
# Find routes with parameters (likely detail pages)
grep -r "path.*:.*id" frontend/src/router.tsx
```

---

## Feedback Loop

After generating report:

1. **Review violations** with user
2. **Classify severity:**
   - High: List page with PlayerPageLayout OR detail page missing isDetailView
   - Medium: Detail page without PlayerPageLayout
3. **Ask:** Should I fix these violations now?
4. **If yes:** Apply fixes in order:
   - Fix PlayerPageLayout usage first
   - Then update isDetailView in PlayerLayout.tsx
5. **Re-validate:** Check all pages again
6. **Confirm:** Navigation structure consistent

---

## Decision Tree

Use this to determine correct layout:

```
Is the page showing a SINGLE entity (series, tour, competition, player)?
├─ YES → Use PlayerPageLayout
│   └─ Add route to isDetailView in PlayerLayout.tsx
└─ NO → Is it a LIST or COLLECTION?
    └─ YES → DO NOT use PlayerPageLayout
        └─ Use plain layout with gradient background
```

**Examples:**
- `/player/series/:id` → YES (single series) → Use PlayerPageLayout ✅
- `/player/series` → NO (list of series) → Plain layout ✅
- `/player/tours/:tourId/standings` → YES (single tour standings) → Use PlayerPageLayout ✅
- `/player/profile` → YES (user's profile) → Use PlayerPageLayout ✅
- `/player/competitions` → NO (list) → Plain layout ✅

---

## Key Constraints

- **PlayerPageLayout for detail pages ONLY** (single entity context)
- **Plain layout for list pages** (collections, dashboards)
- **Always update isDetailView** when adding new detail routes
- **Consistent back button behavior** on detail pages
- **Hamburger menu context** must match page context (series/tour breadcrumbs)

---

## Summary

Navigation validation ensures consistent UX, correct tab visibility, and proper breadcrumbs. Run when adding pages, modifying layouts, or before commit.
