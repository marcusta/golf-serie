# Frontend Development Guide

**For Frontend Sub-Agent Use Only**

This guide contains all frontend-specific rules, patterns, and conventions. When you receive a frontend task, follow these guidelines strictly.

---

## 📋 Table of Contents

- [Development Commands](#development-commands)
- [Architecture Patterns](#architecture-patterns)
- [CRITICAL: Design System & Visual Guidelines](#critical-design-system--visual-guidelines)
- [Component Library Standards](#component-library-standards)
- [User Feedback & Notifications](#user-feedback--notifications)
- [Navigation Architecture](#navigation-architecture)
- [Testing Strategy](#testing-strategy)
- [Important Constraints](#important-constraints)

---

## Development Commands

```bash
cd frontend

# Development server
npm run dev

# Production build
npm run build           # Build for production
npm run deploy         # Build and copy to ../frontend_dist/

# Testing
npm run test:e2e       # Playwright E2E tests

# Code quality
npm run lint           # ESLint checking
```

---

## Architecture Patterns

### Directory Structure

- **API Layer** (`frontend/src/api/`): React Query hooks for server state management
- **Components** (`frontend/src/components/`): Reusable UI with shadcn/ui + Radix
- **Views** (`frontend/src/views/`): Page-level components (admin/ and player/)
- **Router** (`frontend/src/router.tsx`): TanStack Router with file-based routing

### Key Frontend Patterns

- Custom React Query hooks for each entity (e.g., `useTeams()`, `useCreateTeam()`)
- Mobile-first responsive design with Tailwind CSS
- Dual interface: Admin panel for management, Player view for scorecards
- Real-time updates with automatic cache invalidation
- **Unified Topbar Architecture**: All player views use PlayerPageLayout for consistent navigation

---

## CRITICAL: Design System & Visual Guidelines

### 🚨 MANDATORY READING BEFORE ANY UI WORK

Before creating or modifying ANY UI components, you **MUST** read and follow these design system documents:

#### 1. Visual Design Rules → `docs/visual-design-rules.md`

**Core principles you MUST follow:**

- **One level of 3D effects**: If outer container has shadow, inner elements MUST NOT have shadows
- **Visual hierarchy through roundness**:
  - Outer containers: `rounded-2xl` (16px) - soft, welcoming
  - Inner boxes: `rounded` (4px) - sharp, structured
  - Navigation buttons: `rounded-full` - distinct from content
- **Background contrast creates pop**: Use `bg-soft-grey/30` for containers to make white content boxes stand out naturally
- **Typography-based hierarchy**: Use uppercase bold labels for sections instead of nested colored header boxes
- **Lists use dividers, not individual cards**: Use `divide-y` between items, not separate card borders
- **Left accent bars for grouping**: Use `border-l-4` with color coding instead of full borders
- **Subtle hover states**: Background changes only, not shadows/transforms
- **Button roundness signals purpose**: Pills (`rounded-full`) for navigation/flow, sharp corners (`rounded`) for content actions

**What to actively remove/avoid:**
- ❌ Nested shadows (parent + children both have shadows)
- ❌ Multiple rounded corners without hierarchy
- ❌ Redundant borders (parent + children both bordered)
- ❌ Decorative icon boxes (large rounded squares just holding icons)
- ❌ Metadata pills (use plain inline text instead)
- ❌ Position circles (use plain colored numbers)
- ❌ Shadow + translate hover effects (use background color change)
- ❌ Individual card borders on list items (use `divide-y` on parent)

#### 2. TapScore Style Guide → `docs/STYLE_GUIDE.md`

**Complete design system with:**

- **Brand colors**: fairway, turf, rough, coral, flag, sky, scorecard, charcoal, soft-grey
- **Typography system**: Display headings (DM Sans) and body text (Inter)
- **CRITICAL contrast guidelines**: Maintain WCAG AA ratios (minimum 4.5:1 for text)
- **Tailwind CSS v4 configuration**: Custom colors and gradients setup
- **Component patterns**: Buttons, cards, forms, golf-specific components
- **Mobile-first responsive patterns**: Touch targets minimum 44px

**Approved contrast combinations (use these):**
```css
/* High Contrast (WCAG AAA) */
.bg-scorecard .text-charcoal    /* 16.75:1 ratio */
.bg-fairway .text-scorecard     /* 13.94:1 ratio */
.bg-turf .text-scorecard        /* 9.2:1 ratio */
.bg-coral .text-scorecard       /* 4.9:1 ratio */

/* Medium Contrast (WCAG AA) */
.bg-scorecard .text-turf        /* 4.5:1 ratio */
.bg-rough .text-charcoal        /* 4.2:1 ratio */
```

**Never use these combinations:**
```css
/* ❌ Poor Contrast - NEVER USE */
.bg-scorecard .text-scorecard           /* Poor: 1.05:1 */
.bg-rough .text-scorecard               /* Poor: 1.8:1 */
.bg-fairway .text-charcoal              /* Poor: 1.2:1 */
```

### Container Background Strategy (2024 Design Update)

**New Pattern - Use this for all new components:**

```tsx
// ✅ Recommended: Gray container with white boxes
<div className="bg-soft-grey/30 rounded-2xl shadow-lg p-6">
  <div className="mb-6">
    <h3 className="text-sm font-bold text-charcoal mb-3 uppercase tracking-wide">
      Section Title
    </h3>
    <div className="bg-white rounded overflow-hidden divide-y divide-soft-grey">
      <div className="px-4 py-3 hover:bg-turf/5 transition-colors">Item 1</div>
      <div className="px-4 py-3 hover:bg-turf/5 transition-colors">Item 2</div>
    </div>
  </div>
</div>
```

---

## Component Library Standards

### CRITICAL RULE: Always Use shadcn/ui Components

**Always prefer shadcn/ui components over browser default HTML elements.**

- **Use `<Button>` instead of `<button>`**
- **Use `<Input>` instead of `<input>`**
- **Use `<Select>` instead of `<select>`**
- **Use `<Textarea>` instead of `<textarea>`**
- Check `frontend/src/components/ui/` for available components before creating custom implementations

**If a shadcn component doesn't exist:**
- Install it from shadcn/ui if available: `npx shadcn@latest add <component-name>`
- Only create custom components if shadcn doesn't offer an equivalent
- Follow shadcn's patterns when creating custom components

**Component locations:**
- shadcn components: `frontend/src/components/ui/`
- Custom components: `frontend/src/components/`
- Page-specific components: Within the relevant view file or view subdirectory

**Why:** shadcn/ui provides consistent styling, accessibility, animations, and mobile support across the entire application. Using shadcn components ensures a cohesive user experience and reduces maintenance burden.

---

## User Feedback & Notifications

### CRITICAL RULE: Choose the Appropriate Notification Component

Choose the appropriate shadcn notification component based on user workflow and message priority.

#### When to Use Dialog (Modal)

**Purpose:** Blocks workflow, requires explicit user action before proceeding.

**Use for:**
- Destructive actions needing confirmation (delete game, remove all players, reset data)
- Required decisions before proceeding (choose between mutually exclusive options)
- Critical errors that prevent continuation and need user acknowledgment
- Multi-step forms or complex inputs that need focused attention
- Collecting user input that's required to continue

**Examples:**
- "Delete this game? This action cannot be undone."
- "Choose authentication method before continuing"
- "Critical error: Unable to load game data"

**Installation:** `npx shadcn@latest add dialog`

#### When to Use Alert (Inline)

**Purpose:** Persistent, contextual, non-blocking messages within a specific UI section.

**Use for:**
- Form validation errors that need to stay visible while user fixes them
- Warnings about section-specific issues (missing required fields in current step)
- Informational messages related to specific content area
- State changes that affect a section (read-only mode, locked scorecard, sync status)
- Instructions or tips that should remain visible during task

**Examples:**
- "Please add at least 1 player before continuing" (shown at top of player list)
- "This scorecard is locked and cannot be edited"
- "Your handicap will be calculated after your first round"

**Installation:** `npx shadcn@latest add alert`

#### When to Use Sonner (Toast)

**Purpose:** Temporary, non-blocking, auto-dismissing messages for immediate feedback.

**Use for:**
- Success confirmations (saved, updated, added, removed, created)
- Non-critical validation errors during active workflows (drag-and-drop, quick edits)
- Background process feedback (data syncing, auto-save, loading states)
- Transient errors that don't block the user from continuing
- Quick status updates that don't require user action

**Examples:**
- "Player added successfully"
- "Group limit: maximum 4 players per group" (during drag-and-drop)
- "Changes saved"
- "Failed to update score. Please try again."

**Installation:** `npx shadcn@latest add sonner`
**Setup Required:** Add `<Toaster />` component to root layout (usually in `App.tsx` or main layout)

#### Decision Tree

1. **Does this block the user's workflow or require a decision?**
   - Yes → Use **Dialog**
   - No → Go to step 2

2. **Does this message need to stay visible while the user takes action?**
   - Yes → Use **Alert**
   - No → Go to step 3

3. **Is this immediate feedback for a user action?**
   - Yes → Use **Sonner** (toast)

---

## Navigation Architecture

### Unified Topbar System

**CRITICAL**: Use the correct layout pattern based on page hierarchy to avoid double navigation and containment issues.

#### When to Use PlayerPageLayout

**Use PlayerPageLayout for DETAIL/CONTEXT pages:**
- Series detail pages (SeriesDetail, SeriesStandings, SeriesCompetitions)
- Tour detail pages (TourDetail, TourStandings, TourCompetitions)
- Competition detail pages (CompetitionDetail, TeeTimeDetail)
- Document detail pages (SeriesDocumentDetail, TourDocumentDetail)
- Player profile pages (MyProfile, PlayerPublicProfile)
- Game detail pages (GameSetup, GamePlay)

**DO NOT use PlayerPageLayout for TOP-LEVEL list/index pages:**
- Dashboard
- All Rounds (player/rounds)
- Tours list (player/tours)
- Series list (player/series)
- Competitions list (player/competitions)

#### Pattern for Detail Pages (WITH PlayerPageLayout)

```tsx
export default function MyDetailView() {
  return (
    <PlayerPageLayout
      title="Page Title"
      seriesId={seriesId}           // When available
      seriesName={seriesName}       // When available
      onBackClick={customHandler}   // When needed
      customActions={<Actions />}   // When needed
    >
      {/* Page content */}
    </PlayerPageLayout>
  );
}
```

#### Pattern for Top-Level Pages (WITHOUT PlayerPageLayout)

```tsx
export default function MyTopLevelView() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-scorecard to-rough">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-display-lg text-charcoal mb-2">Page Title</h1>
          <p className="text-body-lg text-charcoal/70">Description</p>
        </div>
        {/* Page content */}
      </div>
    </div>
  );
}
```

**Why this matters:**
- PlayerLayout (parent router wrapper) already provides navigation tabs and outer container
- PlayerPageLayout adds its own header bar with back button and menu
- Using PlayerPageLayout on top-level pages creates double navigation (both tab bar AND header bar)
- This causes visual clutter and breaks the design hierarchy

#### ⚠️ CRITICAL: Update PlayerLayout.tsx When Adding New Detail Pages

**ALWAYS DO THIS** when creating a new player view that uses PlayerPageLayout:

1. **Add the route pattern to `frontend/src/views/player/PlayerLayout.tsx`**
2. **Update the `isDetailView` condition** to include your new route

**Example** - Adding a new game setup route:
```tsx
// In PlayerLayout.tsx, line ~14-28
const isDetailView =
  location.pathname.endsWith("/player") ||
  // ... existing patterns ...
  location.pathname.match(/\/player\/games\/new/) || // ADD THIS
  location.pathname.match(/\/player\/games\/\d+\/play/) || // ADD THIS
  // ... rest of patterns ...
```

**Why:** If you forget this step, your page will have:
- ❌ Both "Competitions/Series" tabs AND PlayerPageLayout header (double navigation)
- ❌ Extra container wrapping causing layout issues
- ❌ Confusing user experience

**Key Components**:
- **PlayerPageLayout**: Main wrapper for detail pages (`src/components/layout/PlayerPageLayout.tsx`)
- **PlayerLayout**: Parent router wrapper with tabs (`src/views/player/PlayerLayout.tsx`) ← Update the `isDetailView` here!
- **CommonHeader**: Header with automatic HamburgerMenu (`src/components/navigation/CommonHeader.tsx`)
- **HamburgerMenu**: Context-aware navigation (`src/components/navigation/HamburgerMenu.tsx`)

---

## Testing Strategy

- Playwright for E2E testing
- Tests cover score entry, navigation, and critical user flows
- Mobile-responsive testing included

---

## Important Constraints

- Never modify `frontend/` directory files unless explicitly requested
- **ALL player views MUST use PlayerPageLayout** - never use CommonHeader directly
- Mobile-first design principles must be maintained
- Follow TapScore design system (see `docs/STYLE_GUIDE.md` and `docs/visual-design-rules.md`)
- Maintain WCAG AA contrast ratios (minimum 4.5:1 for text)
- Never use emojis unless the user explicitly requests it

---

## Feature Area Documentation

When working with specific frontend features, consult these detailed guides:

- **Visual Design Rules** → `docs/visual-design-rules.md` - **MANDATORY** core design principles
- **TapScore Style Guide** → `docs/STYLE_GUIDE.md` - **MANDATORY** complete design system
- **Frontend Topbar Architecture** → `docs/frontend/frontend-topbar-architecture.md` (if exists) - Detailed navigation patterns
- **Admin UI Patterns** → `docs/frontend/admin-ui.md` (if exists) - Admin interface patterns
- **Player UI Patterns** → `docs/frontend/player-ui.md` (if exists) - Player interface patterns

---

## Design System Checklist

Before completing ANY frontend task, verify:

- [ ] Read `docs/visual-design-rules.md` and followed all principles
- [ ] Read `docs/STYLE_GUIDE.md` and used correct brand colors
- [ ] Only ONE level has shadows (usually the outer container)
- [ ] Corner roundness creates hierarchy (outer soft `rounded-2xl`, inner sharp `rounded`)
- [ ] Background contrast makes white boxes pop (gray background `bg-soft-grey/30`)
- [ ] Lists use `divide-y` instead of individual card borders
- [ ] No nested borders (container + items both bordered)
- [ ] Typography creates structure (uppercase bold labels)
- [ ] Section headers outside boxes, not inside colored header boxes
- [ ] Metadata is inline text, not pills
- [ ] Position numbers are plain text, not circles
- [ ] Hover states use background color, not shadow/transform
- [ ] Left accents used for color coding
- [ ] Navigation buttons use `rounded-full`, action buttons use `rounded`
- [ ] Badges use solid colors, not transparent
- [ ] All text meets WCAG AA contrast (4.5:1 minimum)
- [ ] Touch targets are minimum 44px for mobile
- [ ] Used shadcn/ui components instead of raw HTML elements
- [ ] Chose correct notification pattern (Dialog/Alert/Toast)
- [ ] Used PlayerPageLayout correctly (detail pages only, not top-level lists)
- [ ] Updated `PlayerLayout.tsx` `isDetailView` if added new detail page
