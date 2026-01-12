# PlayerLayout Architecture Refactoring Plan

## Executive Summary

**Current Problem:**
- `PlayerLayout` (router wrapper) provides UI elements we DON'T want (tabs, extra container)
- Routes must opt-OUT via `isDetailView` check
- Routes must then opt-IN by adding `CommonHeader` themselves
- Dead code: navigation tabs are never actually used
- Backwards architecture: wrapper provides things to avoid, not things to use

**Target Architecture:**
- `PlayerLayout` provides `CommonHeader` for ALL player routes
- No tabs, no extra container, no opt-out logic
- Pages render their content directly without adding headers
- Clean, predictable layout inheritance

**Constraints:**
- System must be **fully functional** after each phase
- Visual appearance must be **correct** after each phase
- No "WIP" or "broken" intermediate states
- Each phase can be deployed independently

---

## Phase 0: Preparation & Documentation

**Goal:** Understand current state, create test matrix, establish baseline

### Tasks

#### 0.1 Document Current Route Behavior

Create a test matrix of all player routes:

| Route | Has isDetailView? | Uses PlayerPageLayout? | Uses CommonHeader? | Has Tabs? | Notes |
|-------|-------------------|------------------------|-------------------|-----------|-------|
| `/player` | ✅ Yes | ❌ No | ✅ Yes | ❌ No | Landing/Dashboard |
| `/player/competitions` | ✅ Yes | ✅ Yes | Via PPL | ❌ No | Top-level list |
| `/player/series` | ✅ Yes | ✅ Yes | Via PPL | ❌ No | Top-level list |
| `/player/tours` | ✅ Yes | ✅ Yes | Via PPL | ❌ No | Top-level list |
| `/player/rounds` | ✅ Yes | ❌ No | ✅ Yes | ❌ No | Top-level list |
| `/player/profile` | ✅ Yes | ✅ Yes | Via PPL | ❌ No | User profile |
| `/player/players/:id` | ✅ Yes | ✅ Yes | Via PPL | ❌ No | Public profiles |
| `/player/series/:id` | ✅ Yes | ✅ Yes | Via PPL | ❌ No | Series detail |
| `/player/series/:id/standings` | ✅ Yes | ✅ Yes | Via PPL | ❌ No | Series standings |
| `/player/series/:id/competitions` | ✅ Yes | ✅ Yes | Via PPL | ❌ No | Series competitions |
| `/player/series/:id/documents` | ✅ Yes | ✅ Yes | Via PPL | ❌ No | Series documents |
| `/player/series/:id/documents/:docId` | ✅ Yes | ✅ Yes | Via PPL | ❌ No | Document detail |
| `/player/tours/:id` | ✅ Yes | ✅ Yes | Via PPL | ❌ No | Tour detail |
| `/player/tours/:id/standings` | ✅ Yes | ✅ Yes | Via PPL | ❌ No | Tour standings |
| `/player/tours/:id/competitions` | ✅ Yes | ✅ Yes | Via PPL | ❌ No | Tour competitions |
| `/player/tours/:id/documents` | ✅ Yes | ✅ Yes | Via PPL | ❌ No | Tour documents |
| `/player/tours/:id/documents/:docId` | ✅ Yes | ✅ Yes | Via PPL | ❌ No | Document detail |
| `/player/competitions/:id` | ✅ Yes | ✅ Yes | Via PPL | ❌ No | Competition detail |
| `/player/competitions/:id/tee-times/:teeTimeId` | ✅ Yes | ✅ Yes | Via PPL | ❌ No | Scorecard |

**Key Findings:**
- ALL routes are in `isDetailView` - the wrapper is NEVER used
- The tabs in PlayerLayout are completely dead code
- Every route adds its own header (either via PlayerPageLayout or CommonHeader directly)

#### 0.2 Create Visual Regression Test Checklist

Manual test checklist for each phase:

**Header Tests:**
- [ ] TapScore logo visible and correct size (mobile & desktop)
- [ ] Hamburger menu present and functional
- [ ] Back button present on detail pages
- [ ] Series/Tour context icons present where applicable
- [ ] Header background color: `var(--fairway-green)`
- [ ] Header shadow visible

**Navigation Tests:**
- [ ] Hamburger menu opens and closes
- [ ] All menu items present
- [ ] Menu items navigate correctly
- [ ] Context-specific items show when relevant (Series Info, Tour Info)

**Layout Tests:**
- [ ] No double headers
- [ ] No tabs visible anywhere
- [ ] No double containers/borders
- [ ] Proper spacing and padding
- [ ] Background gradient correct: `from-scorecard to-rough`

**Functionality Tests:**
- [ ] All routes load without errors
- [ ] Navigation works between all routes
- [ ] Browser back button works
- [ ] Deep links work (refresh on any route)

#### 0.3 Capture Reference Screenshots

Take screenshots of key pages:
- Landing page (authenticated)
- Dashboard
- Competitions list
- Series list
- Tours list
- All Rounds
- Series detail
- Tour detail
- Competition detail
- Scorecard

Store in: `docs/frontend/refactoring-screenshots/phase-0-baseline/`

**Deliverables:**
- ✅ Route behavior matrix (above)
- ✅ Visual regression test checklist (above)
- ✅ Baseline screenshots
- ✅ Document current issues

**Success Criteria:**
- Complete understanding of current architecture
- Test checklist ready for all phases
- Baseline established

---

## Phase 1: Simplify PlayerLayout (Remove Dead Code)

**Goal:** Remove unused tabs and container from PlayerLayout since no routes use them

**Status:** Safe - no visual changes since isDetailView always returns true

### Current State Analysis

`PlayerLayout.tsx` has this structure:
```tsx
if (isDetailView) {
  return <Outlet />;  // ALL routes take this path
}

// This code is NEVER executed:
return (
  <div>
    <TapScore Logo />
    <nav>Tabs for Competitions/Series</nav>
    <div>Container with border and padding</div>
    <Outlet />
  </div>
);
```

### Tasks

#### 1.1 Verify All Routes Are in isDetailView

**File:** `frontend/src/views/player/PlayerLayout.tsx`

**Verification:**
```bash
cd frontend
npm run dev
```

Test EVERY route in the matrix above. Confirm NONE show tabs.

Expected: ✅ No tabs visible on any route

#### 1.2 Add Temporary Logging

**File:** `frontend/src/views/player/PlayerLayout.tsx`

Add before the conditional:
```tsx
export default function PlayerLayout() {
  const { location } = useRouterState();

  const isDetailView = /* ... existing logic ... */;

  // Temporary: Log routes that use the wrapper (should be none)
  if (!isDetailView) {
    console.warn('PlayerLayout wrapper used for:', location.pathname);
  }

  // ... rest of component
}
```

#### 1.3 Test and Verify No Wrapper Usage

Run through all routes in test matrix.

Expected console output: **No warnings** (all routes are detail views)

#### 1.4 Remove Dead Code

**File:** `frontend/src/views/player/PlayerLayout.tsx`

Replace entire component with simplified version:

```tsx
import { Outlet } from "@tanstack/react-router";

/**
 * PlayerLayout - Router wrapper for all /player/* routes
 *
 * Currently renders only <Outlet /> as all player routes provide their own
 * headers and layout. This will be enhanced in future refactoring phases.
 */
export default function PlayerLayout() {
  return <Outlet />;
}
```

**Changes:**
- ❌ Remove `useRouterState` import (unused)
- ❌ Remove `List`, `Trophy` imports (unused)
- ❌ Remove `TapScoreLogo` import (unused)
- ❌ Remove `AuthButtons` import (unused)
- ❌ Remove `playerNavLinks` constant (unused)
- ❌ Remove `isDetailView` logic (all routes are detail views)
- ❌ Remove wrapper JSX with tabs and container (never rendered)
- ✅ Keep `Outlet` only

#### 1.5 Test All Routes

Run through **complete test checklist** from Phase 0.

**Expected Results:**
- ✅ All routes work identically to before
- ✅ No visual changes
- ✅ No console errors
- ✅ All functionality preserved
- ✅ Navigation works
- ✅ Headers still present (from individual pages)
- ✅ No tabs anywhere (same as before)

#### 1.6 Verify Bundle Size Improvement

```bash
npm run build
```

Check bundle size - should be slightly smaller (removed unused imports/code).

**Deliverables:**
- ✅ Simplified PlayerLayout.tsx (18 lines vs 89 lines)
- ✅ Removed ~70 lines of dead code
- ✅ All routes function identically
- ✅ Test checklist passed

**Success Criteria:**
- System fully functional
- Visual appearance unchanged
- Code cleaner and easier to understand
- No console warnings

**Git Commit:**
```
refactor(player-layout): remove unused tabs and wrapper code

All player routes use their own headers via PlayerPageLayout or CommonHeader.
The PlayerLayout wrapper with tabs was never actually rendered. Simplifying
to just render <Outlet /> directly.

Related: player-layout-refactoring-plan.md Phase 1
```

---

## Phase 2: Add CommonHeader to PlayerLayout

**Goal:** Make PlayerLayout provide CommonHeader for all routes

**Status:** Requires careful testing - adds header to layout wrapper

### Strategy

We'll add CommonHeader to PlayerLayout, but it needs to:
1. Show correct props based on current route (back button, title, etc.)
2. Not conflict with headers on pages that provide their own
3. Be flexible enough for all route types

**Problem:** PlayerPageLayout and individual pages already provide headers with specific configurations (titles, back buttons, context icons). We can't just blindly add a header to PlayerLayout.

**Solution:** Multi-step migration
1. First, make PlayerLayout *capable* of providing a header (but don't use it yet)
2. Gradually migrate pages to use PlayerLayout's header
3. Remove individual headers once migrated

### Tasks

#### 2.1 Analyze Header Requirements Across Routes

Create a requirements matrix:

| Route Type | Needs Back Button? | Needs Title? | Needs Context Icons? | Needs Custom Actions? |
|------------|-------------------|--------------|----------------------|----------------------|
| Landing (/) | ❌ No | ❌ No | ❌ No | ❌ No |
| Top-level lists | ❌ No | ❌ No | ❌ No | ❌ No |
| Detail pages | ✅ Yes | ✅ Yes | ✅ Sometimes | ✅ Sometimes |
| Scorecard | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes (lock/share) |

**Insight:** Most routes have DIFFERENT header needs. PlayerLayout cannot provide a one-size-fits-all header.

**Decision:** PlayerLayout should provide a DEFAULT header (logo + hamburger) that pages can opt-out of or enhance.

#### 2.2 Create HeaderConfig Type

**File:** `frontend/src/types/layout.ts` (new file)

```typescript
/**
 * Configuration for page headers in player views
 */
export interface HeaderConfig {
  /** Show the header at all (default: true) */
  showHeader?: boolean;

  /** Show back button (default: false for top-level, true for detail) */
  showBackButton?: boolean;

  /** Page title (shown in header bar) */
  title?: string;

  /** Subtitle (shown below title) */
  subtitle?: string;

  /** Series context for navigation */
  seriesContext?: {
    id: number;
    name: string;
  };

  /** Tour context for navigation */
  tourContext?: {
    id: number;
    name: string;
  };

  /** Custom actions (buttons, etc.) */
  customActions?: React.ReactNode;

  /** Custom back handler */
  onBackClick?: () => void;
}
```

#### 2.3 Update PlayerLayout with Header Support

**File:** `frontend/src/views/player/PlayerLayout.tsx`

```tsx
import { Outlet, useMatches } from "@tanstack/react-router";
import { CommonHeader } from "../../components/navigation/CommonHeader";
import type { HeaderConfig } from "../../types/layout";

/**
 * PlayerLayout - Router wrapper for all /player/* routes
 *
 * Provides CommonHeader by default, which can be configured via route context.
 * Pages can customize header via route context or opt-out entirely.
 */
export default function PlayerLayout() {
  const matches = useMatches();

  // Get header config from route context (if provided)
  // This allows individual routes to customize the header
  const currentMatch = matches[matches.length - 1];
  const headerConfig: HeaderConfig = currentMatch?.context?.headerConfig ?? {
    showHeader: true,
    showBackButton: false,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-scorecard to-rough">
      {headerConfig.showHeader && (
        <CommonHeader
          title={headerConfig.title}
          subtitle={headerConfig.subtitle}
          showBackButton={headerConfig.showBackButton ?? false}
          onBackClick={headerConfig.onBackClick}
          seriesId={headerConfig.seriesContext?.id}
          seriesName={headerConfig.seriesContext?.name}
          tourId={headerConfig.tourContext?.id}
          tourName={headerConfig.tourContext?.name}
          customActions={headerConfig.customActions}
        />
      )}
      <Outlet />
    </div>
  );
}
```

**Problem with this approach:** TanStack Router doesn't support route context in v1 the way I described above. Let me reconsider.

**Better approach:** Pages continue to provide their own headers for now, but we document the pattern. Then in Phase 3, we'll use a different mechanism (provider pattern or route-based detection).

Let me revise this phase:

#### 2.2 Add Basic CommonHeader to PlayerLayout (Default Only)

**File:** `frontend/src/views/player/PlayerLayout.tsx`

```tsx
import { Outlet } from "@tanstack/react-router";
import { CommonHeader } from "../../components/navigation/CommonHeader";

/**
 * PlayerLayout - Router wrapper for all /player/* routes
 *
 * Provides a default CommonHeader (logo + hamburger menu) for all routes.
 * Individual pages can override by rendering their own header.
 */
export default function PlayerLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-scorecard to-rough">
      <CommonHeader showBackButton={false} />
      <Outlet />
    </div>
  );
}
```

**Problem:** This will create **double headers** on pages that already have CommonHeader!

**Better approach:** Let's be more strategic. We need to:
1. Identify which pages DON'T have headers yet (none - all have headers)
2. Since all pages have headers, we need to REPLACE them, not add another

**Revised Strategy for Phase 2:**
Instead of adding header to PlayerLayout, let's:
1. Standardize how pages render headers
2. Create a layout component system
3. Then migrate pages to use it

This is getting complex. Let me think about the safest incremental path...

**REVISED PHASE 2 APPROACH:**

Since ALL pages already have headers (either via PlayerPageLayout or CommonHeader directly), we should:
1. Create a pattern for pages to communicate header needs to PlayerLayout
2. Migrate pages one-by-one to use PlayerLayout's header
3. Remove individual headers as we go

But this requires a mechanism to pass header config from page to layout. Options:
- Context API (create PlayerLayoutContext)
- Route matching logic in PlayerLayout
- Custom hook pattern

Let me design with Context API (cleanest):

---

### REVISED Phase 2: Create Header Context System

**Goal:** Create infrastructure for pages to communicate header needs to PlayerLayout

#### 2.1 Create PlayerLayoutContext

**File:** `frontend/src/contexts/PlayerLayoutContext.tsx` (new)

```tsx
import React, { createContext, useContext, useState, useEffect } from "react";

export interface HeaderConfig {
  showHeader?: boolean;
  showBackButton?: boolean;
  title?: string;
  subtitle?: string;
  seriesContext?: { id: number; name: string };
  tourContext?: { id: number; name: string };
  customActions?: React.ReactNode;
  onBackClick?: () => void;
}

interface PlayerLayoutContextValue {
  headerConfig: HeaderConfig;
  setHeaderConfig: (config: HeaderConfig) => void;
}

const PlayerLayoutContext = createContext<PlayerLayoutContextValue | null>(null);

export function PlayerLayoutProvider({ children }: { children: React.ReactNode }) {
  const [headerConfig, setHeaderConfig] = useState<HeaderConfig>({
    showHeader: true,
    showBackButton: false,
  });

  return (
    <PlayerLayoutContext.Provider value={{ headerConfig, setHeaderConfig }}>
      {children}
    </PlayerLayoutContext.Provider>
  );
}

export function usePlayerLayout() {
  const context = useContext(PlayerLayoutContext);
  if (!context) {
    throw new Error("usePlayerLayout must be used within PlayerLayoutProvider");
  }
  return context;
}

/**
 * Hook to configure the player page header from within a page component
 *
 * @example
 * ```tsx
 * function MyPage() {
 *   usePageHeader({
 *     showBackButton: true,
 *     title: "My Page Title",
 *   });
 *   return <div>Page content</div>;
 * }
 * ```
 */
export function usePageHeader(config: HeaderConfig) {
  const { setHeaderConfig } = usePlayerLayout();

  useEffect(() => {
    setHeaderConfig(config);
    // Reset to default on unmount
    return () => setHeaderConfig({ showHeader: true, showBackButton: false });
  }, [setHeaderConfig, JSON.stringify(config)]);
}
```

#### 2.2 Update PlayerLayout to Use Context

**File:** `frontend/src/views/player/PlayerLayout.tsx`

```tsx
import { Outlet } from "@tanstack/react-router";
import { CommonHeader } from "../../components/navigation/CommonHeader";
import { PlayerLayoutProvider, usePlayerLayout } from "../../contexts/PlayerLayoutContext";

function PlayerLayoutContent() {
  const { headerConfig } = usePlayerLayout();

  return (
    <div className="min-h-screen bg-gradient-to-br from-scorecard to-rough">
      {headerConfig.showHeader && (
        <CommonHeader
          title={headerConfig.title}
          subtitle={headerConfig.subtitle}
          showBackButton={headerConfig.showBackButton ?? false}
          onBackClick={headerConfig.onBackClick}
          seriesId={headerConfig.seriesContext?.id}
          seriesName={headerConfig.seriesContext?.name}
          tourId={headerConfig.tourContext?.id}
          tourName={headerConfig.tourContext?.name}
          customActions={headerConfig.customActions}
        />
      )}
      <Outlet />
    </div>
  );
}

export default function PlayerLayout() {
  return (
    <PlayerLayoutProvider>
      <PlayerLayoutContent />
    </PlayerLayoutProvider>
  );
}
```

#### 2.3 Test with No Pages Migrated Yet

At this point:
- PlayerLayout provides a DEFAULT header (logo + hamburger)
- Pages still provide their OWN headers
- Result: **DOUBLE HEADERS** everywhere

**This is expected but broken!** We need to immediately migrate at least one page to fix this.

**Decision:** Don't deploy Phase 2 until Phase 3 is also complete. Combine them into one deployable unit.

Let me restructure phases...

---

## REVISED PHASE STRUCTURE

Let me redesign this to ensure each phase is deployable:

### Phase 1: Remove Dead Code ✅ (Keep as-is)
- Remove unused tabs and wrapper
- Fully functional and deployable

### Phase 2: Create Context Infrastructure (Internal Only)
- Add context system but DON'T use it yet
- Add feature flag or keep unused
- Fully functional (no behavior change)

### Phase 3: Migrate Pages to Use PlayerLayout Header (Incremental)
- Migrate pages one-by-one
- Each migration is tested and deployable
- No double headers at any point

### Phase 4: Deprecate PlayerPageLayout
- Once all pages migrated, deprecate old pattern
- Update documentation

Let me rewrite with this structure:

---

## Phase 2: Create Header Context Infrastructure

**Goal:** Add context system for header management WITHOUT changing any page behavior yet

**Status:** Safe - adds new code but doesn't use it

### Tasks

#### 2.1 Create PlayerLayoutContext

**File:** `frontend/src/contexts/PlayerLayoutContext.tsx` (new)

```tsx
import React, { createContext, useContext, useState, useEffect } from "react";

export interface HeaderConfig {
  /** Whether to show header at all (default: true) */
  showHeader?: boolean;
  /** Show back button (default: false) */
  showBackButton?: boolean;
  /** Page title in header */
  title?: string;
  /** Subtitle below title */
  subtitle?: string;
  /** Series context for navigation icon */
  seriesContext?: { id: number; name: string };
  /** Tour context for navigation icon */
  tourContext?: { id: number; name: string };
  /** Custom action buttons */
  customActions?: React.ReactNode;
  /** Custom back button handler */
  onBackClick?: () => void;
}

interface PlayerLayoutContextValue {
  headerConfig: HeaderConfig;
  setHeaderConfig: (config: HeaderConfig) => void;
  /** Whether page is using PlayerLayout's header (vs its own) */
  usesLayoutHeader: boolean;
  setUsesLayoutHeader: (uses: boolean) => void;
}

const PlayerLayoutContext = createContext<PlayerLayoutContextValue | null>(null);

export function PlayerLayoutProvider({ children }: { children: React.ReactNode }) {
  const [headerConfig, setHeaderConfig] = useState<HeaderConfig>({
    showHeader: true,
    showBackButton: false,
  });
  const [usesLayoutHeader, setUsesLayoutHeader] = useState(false);

  return (
    <PlayerLayoutContext.Provider
      value={{ headerConfig, setHeaderConfig, usesLayoutHeader, setUsesLayoutHeader }}
    >
      {children}
    </PlayerLayoutContext.Provider>
  );
}

export function usePlayerLayout() {
  const context = useContext(PlayerLayoutContext);
  if (!context) {
    // Graceful fallback if used outside provider
    return {
      headerConfig: { showHeader: true, showBackButton: false },
      setHeaderConfig: () => {},
      usesLayoutHeader: false,
      setUsesLayoutHeader: () => {},
    };
  }
  return context;
}

/**
 * Configure the player page header from within a page component.
 * Call this hook to tell PlayerLayout what header to render.
 *
 * @example
 * ```tsx
 * function MyPage() {
 *   usePageHeader({
 *     showBackButton: true,
 *     title: "My Page",
 *   });
 *
 *   return <div>Content without its own header</div>;
 * }
 * ```
 */
export function usePageHeader(config: HeaderConfig) {
  const { setHeaderConfig, setUsesLayoutHeader } = usePlayerLayout();

  useEffect(() => {
    setHeaderConfig(config);
    setUsesLayoutHeader(true);

    // Reset on unmount
    return () => {
      setHeaderConfig({ showHeader: true, showBackButton: false });
      setUsesLayoutHeader(false);
    };
  }, [setHeaderConfig, setUsesLayoutHeader, JSON.stringify(config)]);
}
```

#### 2.2 Update PlayerLayout (Add Context, Don't Use Yet)

**File:** `frontend/src/views/player/PlayerLayout.tsx`

```tsx
import { Outlet } from "@tanstack/react-router";
import { CommonHeader } from "../../components/navigation/CommonHeader";
import { PlayerLayoutProvider, usePlayerLayout } from "../../contexts/PlayerLayoutContext";

/**
 * Inner component that accesses context
 */
function PlayerLayoutContent() {
  const { headerConfig, usesLayoutHeader } = usePlayerLayout();

  return (
    <div className="min-h-screen bg-gradient-to-br from-scorecard to-rough">
      {/* Only render header if page opts in via usePageHeader() */}
      {usesLayoutHeader && headerConfig.showHeader && (
        <CommonHeader
          title={headerConfig.title}
          subtitle={headerConfig.subtitle}
          showBackButton={headerConfig.showBackButton ?? false}
          onBackClick={headerConfig.onBackClick}
          seriesId={headerConfig.seriesContext?.id}
          seriesName={headerConfig.seriesContext?.name}
          tourId={headerConfig.tourContext?.id}
          tourName={headerConfig.tourContext?.name}
          customActions={headerConfig.customActions}
        />
      )}
      <Outlet />
    </div>
  );
}

/**
 * PlayerLayout - Router wrapper for all /player/* routes
 *
 * Provides header management via context. Pages can opt-in to using
 * the layout's header by calling usePageHeader() hook.
 *
 * Pages that don't call usePageHeader() continue to provide their own headers.
 */
export default function PlayerLayout() {
  return (
    <PlayerLayoutProvider>
      <PlayerLayoutContent />
    </PlayerLayoutProvider>
  );
}
```

**Key:** `usesLayoutHeader` flag means PlayerLayout only renders header IF a page explicitly opts in. Since no pages call `usePageHeader()` yet, NO headers are rendered by PlayerLayout. Pages continue using their own headers.

#### 2.3 Add Type Exports

**File:** `frontend/src/contexts/index.ts` (new or update)

```typescript
export {
  PlayerLayoutProvider,
  usePlayerLayout,
  usePageHeader,
  type HeaderConfig
} from './PlayerLayoutContext';
```

#### 2.4 Test Thoroughly

Run through **complete test checklist**.

**Expected Results:**
- ✅ All routes work identically to before
- ✅ All pages still show their own headers
- ✅ NO headers from PlayerLayout (usesLayoutHeader is false everywhere)
- ✅ No visual changes
- ✅ No console errors
- ✅ New context available but unused

#### 2.5 Document the New Pattern

**File:** `docs/frontend/player-layout-usage.md` (new)

```markdown
# PlayerLayout Header Usage

## Current Pattern (Being Phased Out)

Pages currently provide their own headers using either:
- `PlayerPageLayout` component (wraps entire page, provides header)
- `CommonHeader` component (added at top of page)

## New Pattern (Preferred)

Pages should use the `usePageHeader` hook to configure the layout's header:

\`\`\`tsx
import { usePageHeader } from '@/contexts';

export default function MyPage() {
  usePageHeader({
    title: "My Page",
    showBackButton: true,
    seriesContext: seriesId ? { id: seriesId, name: seriesName } : undefined,
  });

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page content - no header needed */}
    </div>
  );
}
\`\`\`

## Migration Status

- [ ] Landing (player/)
- [ ] Competitions list
- [ ] Series list
- [ ] Tours list
- [ ] All Rounds
- [ ] Series detail pages
- [ ] Tour detail pages
- [ ] Competition detail pages
- [ ] Scorecard pages
- [ ] Profile pages

See: `docs/frontend/player-layout-refactoring-plan.md`
```

**Deliverables:**
- ✅ New PlayerLayoutContext with usePageHeader hook
- ✅ Updated PlayerLayout with context support
- ✅ No behavioral changes (context unused)
- ✅ Documentation for new pattern
- ✅ All tests passing

**Success Criteria:**
- System fully functional
- Visual appearance unchanged
- New infrastructure available for Phase 3
- No breaking changes

**Git Commit:**
```
feat(player-layout): add header context infrastructure

Introduces PlayerLayoutContext and usePageHeader hook to allow pages
to configure the layout's header instead of providing their own.

This is infrastructure only - no pages use it yet. Pages continue to
provide their own headers as before.

Next phase will migrate pages incrementally to use the new pattern.

Related: player-layout-refactoring-plan.md Phase 2
```

---

## Phase 3: Migrate Pages to Layout Header (Incremental)

**Goal:** Migrate pages one-by-one to use PlayerLayout's header instead of their own

**Status:** Each page migration is tested and deployed independently

### Strategy

1. Pick one page
2. Remove its header (PlayerPageLayout wrapper or CommonHeader)
3. Add usePageHeader() call with same config
4. Test thoroughly
5. Deploy
6. Repeat for next page

**Order:** Start with simplest pages, progress to complex

### Subphase 3.1: Migrate AllRounds

**Rationale:** Simple page, no back button, no context icons

#### 3.1.1 Update AllRounds Component

**File:** `frontend/src/views/player/AllRounds.tsx`

**Before:**
```tsx
export default function AllRounds() {
  const { data: rounds, isLoading } = useMyRounds();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-scorecard to-rough">
        <CommonHeader showBackButton={false} />
        <div className="container mx-auto px-4 py-8">
          {/* ... */}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-scorecard to-rough">
      <CommonHeader showBackButton={false} />
      <div className="container mx-auto px-4 py-8">
        {/* ... */}
      </div>
    </div>
  );
}
```

**After:**
```tsx
import { usePageHeader } from "@/contexts";

export default function AllRounds() {
  const { data: rounds, isLoading } = useMyRounds();

  // Configure layout header
  usePageHeader({
    showBackButton: false,
    showHeader: true,
  });

  // Remove outer div and CommonHeader - layout provides them
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-turf" />
        </div>
      </div>
    );
  }

  if (!rounds || rounds.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-display-lg text-charcoal mb-2">All Rounds</h1>
          <p className="text-body-lg text-charcoal/70">
            Your complete round history
          </p>
        </div>
        <div className="bg-scorecard rounded-xl text-center py-16 px-4">
          {/* ... */}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="h-6 w-6 text-charcoal" />
          <h1 className="text-display-lg text-charcoal">All Rounds</h1>
          <span className="text-body-sm text-charcoal/60 ml-2">
            ({rounds.length} {rounds.length === 1 ? "round" : "rounds"})
          </span>
        </div>
        <p className="text-body-lg text-charcoal/70">
          Your complete round history
        </p>
      </div>
      <RoundList rounds={rounds} />
    </div>
  );
}
```

**Changes:**
- ✅ Added `usePageHeader()` call
- ❌ Removed `CommonHeader` component
- ❌ Removed outer `min-h-screen bg-gradient` div (layout provides)
- ❌ Removed `CommonHeader` import

#### 3.1.2 Test AllRounds Page

Navigate to `/player/rounds`:

**Visual Checks:**
- [ ] Header present (logo + hamburger)
- [ ] Header background: `var(--fairway-green)`
- [ ] Page background gradient: `from-scorecard to-rough` (from layout)
- [ ] No back button (as configured)
- [ ] No double header
- [ ] Proper spacing
- [ ] Hamburger menu works

**Functional Checks:**
- [ ] Page loads without errors
- [ ] Navigation to/from other pages works
- [ ] Refresh works
- [ ] Browser back button works

#### 3.1.3 Compare with Phase 2 Screenshots

Should look identical to Phase 2 version.

#### 3.1.4 Deploy

**Git Commit:**
```
refactor(all-rounds): migrate to layout header pattern

Removes redundant CommonHeader and uses PlayerLayout's header via
usePageHeader hook. No visual or functional changes.

Migration: 1/19 pages complete

Related: player-layout-refactoring-plan.md Phase 3.1
```

### Subphase 3.2: Migrate Landing/Dashboard

**Rationale:** Simple, no back button, no context

#### 3.2.1 Update Landing Component

**File:** `frontend/src/views/player/Landing.tsx`

**Change:** Same pattern as AllRounds
- Add `usePageHeader({ showBackButton: false })`
- Remove `CommonHeader` components
- Remove outer wrapper divs

**Note:** Landing has conditional rendering (authenticated shows Dashboard). Both paths need updating.

#### 3.2.2 Update Dashboard Component

**File:** `frontend/src/views/player/Dashboard.tsx`

Dashboard is rendered BY Landing, so it doesn't need `usePageHeader` (Landing already called it).

No changes needed.

#### 3.2.3 Test Landing Pages

Test both:
- Landing (unauthenticated)
- Dashboard (authenticated)

Use test checklist from Phase 0.

#### 3.2.4 Deploy

**Git Commit:**
```
refactor(landing): migrate to layout header pattern

Migration: 2/19 pages complete

Related: player-layout-refactoring-plan.md Phase 3.2
```

### Subphase 3.3: Migrate Top-Level List Pages

Migrate these pages (similar to AllRounds):
- Competitions (`player/Competitions.tsx`)
- Series (`player/Series.tsx`)
- Tours (`player/Tours.tsx`)

These currently use `PlayerPageLayout`. Need to:
1. Remove `PlayerPageLayout` wrapper
2. Add `usePageHeader()`
3. Keep page content as-is

#### 3.3.1 Update Competitions

**File:** `frontend/src/views/player/Competitions.tsx`

**Before:**
```tsx
export default function PlayerCompetitions() {
  // ...

  return (
    <PlayerPageLayout title="All Competitions">
      {/* Page content */}
    </PlayerPageLayout>
  );
}
```

**After:**
```tsx
import { usePageHeader } from "@/contexts";

export default function PlayerCompetitions() {
  // ...

  usePageHeader({
    showBackButton: false,
    showHeader: true,
  });

  return (
    <>
      {/* Page content - remove PlayerPageLayout wrapper */}
    </>
  );
}
```

**Wait:** PlayerPageLayout does more than just header - it also provides container structure. Need to check what else it does...

Let me revise - I need to look at what PlayerPageLayout actually provides:

**Check:**
```tsx
// PlayerPageLayout structure (hypothetical - need to verify):
<div className="min-h-screen bg-gradient-to-br from-scorecard to-rough">
  <CommonHeader {...props} />
  <main>{children}</main>
</div>
```

If PlayerPageLayout ONLY provides header + outer div, then we can replace it.
If it provides more structure, we need to preserve that.

Let me note this as a subtask:

#### 3.3.0 Audit PlayerPageLayout

**File:** `frontend/src/components/layout/PlayerPageLayout.tsx`

**Task:** Document exactly what PlayerPageLayout provides:
1. Outer wrapper div with min-height and background?
2. CommonHeader?
3. Any other structure?
4. Any layout-specific styling?

**Decision based on audit:**
- If ONLY header + simple wrapper → Replace entirely with usePageHeader
- If provides complex layout structure → Keep layout parts, replace only header

Document findings and adjust migration plan accordingly.

**Action:** Review PlayerPageLayout source code (need to read it).

Let me add this as a note:

**NOTE:** Before migrating pages that use PlayerPageLayout, we need to audit what it provides beyond the header. This may require creating a new `PageContainer` component to preserve layout structure while separating header concerns.

### Subphase 3.4-3.19: Migrate Remaining Pages

Following same pattern:
- 3.4: Series detail pages (SeriesDetail, SeriesStandings, SeriesCompetitions, SeriesDocuments, SeriesDocumentDetail)
- 3.5: Tour detail pages (TourDetail, TourStandings, TourCompetitions, TourDocuments, TourDocumentDetail)
- 3.6: Competition detail pages (CompetitionDetail)
- 3.7: Scorecard page (CompetitionRound/TeeTimeDetail)
- 3.8: Profile pages (MyProfile, PlayerPublicProfile)

Each subphase:
1. Update component to use usePageHeader
2. Test thoroughly
3. Deploy independently
4. Update migration tracker in docs

**Deliverables:**
- ✅ All 19 pages migrated to use PlayerLayout header
- ✅ Each migration tested and deployed independently
- ✅ No pages provide their own headers anymore
- ✅ Migration tracker shows 19/19 complete

**Success Criteria:**
- System fully functional after EACH subphase
- Visual appearance unchanged
- All pages use consistent header pattern
- No double headers anywhere

**Final Commit:**
```
refactor(player-views): complete layout header migration

All player pages now use PlayerLayout's header via usePageHeader hook.
Removes redundant header code from individual pages.

Migration: 19/19 pages complete

Related: player-layout-refactoring-plan.md Phase 3
```

---

## Phase 4: Deprecate PlayerPageLayout

**Goal:** Remove PlayerPageLayout component since all pages use the new pattern

**Status:** Safe after Phase 3 complete

### Tasks

#### 4.1 Verify No PlayerPageLayout Usage

Search codebase:
```bash
cd frontend
grep -r "PlayerPageLayout" src/
```

Expected: No imports or usage (all migrated in Phase 3).

#### 4.2 Add Deprecation Warning

**File:** `frontend/src/components/layout/PlayerPageLayout.tsx`

Add warning at top:
```tsx
/**
 * @deprecated This component is deprecated.
 * Use usePageHeader() hook instead to configure the layout's header.
 *
 * @see frontend/src/contexts/PlayerLayoutContext.tsx
 * @see docs/frontend/player-layout-usage.md
 */
```

Keep the component for now (in case of rollback needs).

#### 4.3 Update Documentation

**File:** `docs/frontend/player-layout-usage.md`

Update "Migration Status" section:
```markdown
## Migration Status

✅ All pages migrated! (19/19)

- [x] Landing (player/)
- [x] Competitions list
- [x] Series list
- [x] Tours list
- [x] All Rounds
- [x] Series detail pages (5 pages)
- [x] Tour detail pages (5 pages)
- [x] Competition detail pages
- [x] Scorecard pages
- [x] Profile pages (2 pages)

## Old Pattern (Deprecated)

⚠️ Do not use PlayerPageLayout in new code. It is deprecated.
```

#### 4.4 Update Refactoring Plan Status

**File:** `docs/frontend/player-layout-refactoring-plan.md` (this file)

Update status at top:
```markdown
## Status

✅ Phase 1: Complete - Dead code removed
✅ Phase 2: Complete - Context infrastructure added
✅ Phase 3: Complete - All pages migrated (19/19)
✅ Phase 4: Complete - PlayerPageLayout deprecated
🔄 Phase 5: In Progress - Final cleanup
```

**Deliverables:**
- ✅ PlayerPageLayout marked deprecated
- ✅ Documentation updated
- ✅ No active usage of deprecated component
- ✅ Refactoring plan status updated

**Success Criteria:**
- System fully functional
- Clear deprecation warnings for future developers
- Documentation reflects new patterns

**Git Commit:**
```
refactor(player-page-layout): deprecate in favor of usePageHeader

All player pages now use usePageHeader hook. PlayerPageLayout kept
for reference but marked deprecated. Will be removed in future cleanup.

Related: player-layout-refactoring-plan.md Phase 4
```

---

## Phase 5: Final Cleanup and Optimization

**Goal:** Remove deprecated code, optimize bundle, final polish

**Status:** Safe - cleanup only

### Tasks

#### 5.1 Remove PlayerPageLayout Component

**File:** `frontend/src/components/layout/PlayerPageLayout.tsx`

Delete the file entirely.

**Files to update:**
- Remove from `src/components/layout/index.ts` (if barrel export exists)

#### 5.2 Clean Up Unused Imports

Search and remove any lingering `PlayerPageLayout` imports (shouldn't be any, but verify):

```bash
cd frontend
grep -r "from.*PlayerPageLayout" src/
grep -r "import.*PlayerPageLayout" src/
```

#### 5.3 Optimize Bundle

```bash
npm run build
```

Check bundle size - should be smaller (removed redundant header code from many files).

Compare to Phase 0 baseline.

#### 5.4 Run Full Test Suite

```bash
npm run test:e2e
```

Ensure all E2E tests pass.

#### 5.5 Update Architecture Documentation

**File:** `docs/frontend/architecture.md` (create if doesn't exist)

```markdown
# Frontend Architecture

## Layout System

### Player Views (`/player/*`)

All player-facing pages use a consistent layout provided by `PlayerLayout`:

- **Router Wrapper:** `PlayerLayout` (`src/views/player/PlayerLayout.tsx`)
  - Provides outer container with background gradient
  - Provides `CommonHeader` for all pages
  - Manages header configuration via PlayerLayoutContext

- **Page Header Configuration:** `usePageHeader()` hook
  - Pages call this hook to configure the header
  - Supports: title, back button, context icons, custom actions
  - See: `src/contexts/PlayerLayoutContext.tsx`

### Example Usage

\`\`\`tsx
import { usePageHeader } from '@/contexts';

export default function MyPlayerPage() {
  usePageHeader({
    title: "Page Title",
    showBackButton: true,
    seriesContext: { id: seriesId, name: seriesName },
  });

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page content */}
    </div>
  );
}
\`\`\`

### Migration History

- **Before:** Pages used `PlayerPageLayout` wrapper or added `CommonHeader` directly
- **After:** Pages use `usePageHeader()` hook to configure layout's header
- **Completed:** January 2026 (Phase 3 of refactoring plan)
```

#### 5.6 Update CLAUDE.md

**File:** `CLAUDE.md`

Update the "Frontend Navigation Architecture" section to reflect new patterns:

```markdown
## Frontend Navigation Architecture

### Player Layout System

All `/player/*` routes render within `PlayerLayout`, which provides:
- Background gradient container
- CommonHeader with logo and hamburger menu
- Header configuration via PlayerLayoutContext

**Pattern for player pages:**
```tsx
import { usePageHeader } from '@/contexts';

export default function MyPage() {
  // Configure layout's header
  usePageHeader({
    title: "My Page",
    showBackButton: true,
    seriesContext: seriesId ? { id: seriesId, name: seriesName } : undefined,
  });

  // Render page content (header provided by layout)
  return (
    <div className="container mx-auto px-4 py-8">
      {/* content */}
    </div>
  );
}
```

**Do not:**
- ❌ Add CommonHeader directly to pages
- ❌ Use PlayerPageLayout (deprecated)
- ❌ Add outer wrapper divs with min-h-screen or background gradients (layout provides)

**See:**
- `docs/frontend/player-layout-usage.md` - Usage guide
- `docs/frontend/player-layout-refactoring-plan.md` - Migration history
```

#### 5.7 Create Visual Regression Report

Take new screenshots of all key pages (same as Phase 0).

Store in: `docs/frontend/refactoring-screenshots/phase-5-final/`

Create comparison document:

**File:** `docs/frontend/refactoring-visual-diff-report.md`

```markdown
# Player Layout Refactoring - Visual Regression Report

## Summary

No visual changes - all pages look identical to baseline.

## Screenshots

### Landing Page
- Before: [phase-0-baseline/landing.png]
- After: [phase-5-final/landing.png]
- Status: ✅ Identical

### Competitions List
- Before: [phase-0-baseline/competitions.png]
- After: [phase-5-final/competitions.png]
- Status: ✅ Identical

[... continue for all key pages ...]

## Conclusion

✅ All pages render identically to baseline
✅ No visual regressions detected
✅ Layout system successfully refactored with zero visual changes
```

#### 5.8 Measure Performance Impact

Compare metrics:

| Metric | Phase 0 (Baseline) | Phase 5 (Final) | Change |
|--------|-------------------|-----------------|--------|
| Bundle size (main.js) | X KB | Y KB | -Z KB |
| First Contentful Paint | X ms | Y ms | ±Z ms |
| Time to Interactive | X ms | Y ms | ±Z ms |
| Lighthouse Score | X | Y | ±Z |

Document in: `docs/frontend/refactoring-performance-report.md`

**Deliverables:**
- ✅ PlayerPageLayout removed
- ✅ Bundle size optimized
- ✅ All tests passing
- ✅ Architecture documentation updated
- ✅ CLAUDE.md updated
- ✅ Visual regression report (no changes)
- ✅ Performance report

**Success Criteria:**
- System fully functional
- No visual regressions
- Documentation complete and accurate
- Code cleaner and more maintainable
- Bundle size reduced
- Performance maintained or improved

**Final Commit:**
```
refactor(player-layout): complete cleanup and documentation

Removes deprecated PlayerPageLayout component and updates all
documentation to reflect new architecture patterns.

Refactoring complete:
- Removed 200+ lines of redundant header code across 19 pages
- Reduced bundle size by ~X KB
- Improved maintainability with single source of header logic
- Zero visual or functional regressions

Related: player-layout-refactoring-plan.md Phase 5
```

---

## Phase 6: Verification and Sign-Off

**Goal:** Final verification and project closure

### Tasks

#### 6.1 Complete Test Checklist

Run through **complete test checklist** from Phase 0 one final time.

Document results:

**File:** `docs/frontend/refactoring-final-test-report.md`

```markdown
# Player Layout Refactoring - Final Test Report

## Test Date
[Date]

## Environment
- Browser: Chrome X, Firefox X, Safari X
- Screen sizes: Mobile (375px), Tablet (768px), Desktop (1920px)

## Header Tests
- [x] TapScore logo visible and correct size (mobile & desktop)
- [x] Hamburger menu present and functional
- [x] Back button present on detail pages
- [x] Series/Tour context icons present where applicable
- [x] Header background color: var(--fairway-green)
- [x] Header shadow visible

## Navigation Tests
- [x] Hamburger menu opens and closes
- [x] All menu items present
- [x] Menu items navigate correctly
- [x] Context-specific items show when relevant

## Layout Tests
- [x] No double headers anywhere
- [x] No tabs visible on any page
- [x] No double containers/borders
- [x] Proper spacing and padding
- [x] Background gradient correct: from-scorecard to-rough

## Functionality Tests
- [x] All 19 routes load without errors
- [x] Navigation works between all routes
- [x] Browser back button works
- [x] Deep links work (refresh on any route)

## Cross-Browser Tests
- [x] Chrome - All tests pass
- [x] Firefox - All tests pass
- [x] Safari - All tests pass

## Mobile Tests
- [x] All pages responsive
- [x] Touch targets adequate (44px min)
- [x] No horizontal scroll
- [x] Header adapts to mobile correctly

## Performance Tests
- [x] No console errors
- [x] No console warnings
- [x] Bundle size reduced (see performance report)
- [x] Load times maintained

## Conclusion

✅ All tests passed
✅ No regressions detected
✅ Ready for production
```

#### 6.2 Update Refactoring Plan Status

**File:** `docs/frontend/player-layout-refactoring-plan.md` (this file)

Update status section at top:

```markdown
## Status

✅ **COMPLETE** - All phases finished successfully

- ✅ Phase 1: Remove dead code
- ✅ Phase 2: Create context infrastructure
- ✅ Phase 3: Migrate all pages (19/19)
- ✅ Phase 4: Deprecate old patterns
- ✅ Phase 5: Final cleanup
- ✅ Phase 6: Verification and sign-off

**Completion Date:** [Date]
**Total Duration:** X weeks
**Pages Migrated:** 19
**Code Removed:** ~200 lines
**Bundle Size Reduction:** ~X KB
```

#### 6.3 Create Summary Document

**File:** `docs/frontend/player-layout-refactoring-summary.md`

```markdown
# Player Layout Refactoring - Summary

## Objective

Refactor PlayerLayout architecture to be more intuitive and maintainable.

## Problem

- PlayerLayout provided unwanted UI (tabs, containers)
- Pages had to opt-OUT via isDetailView, then add own headers
- Backwards architecture: wrapper provided things to avoid
- 19 pages with redundant header code
- ~200 lines of duplicated header logic

## Solution

- Removed dead code (unused tabs and wrapper)
- Created PlayerLayoutContext for header management
- Migrated all pages to use usePageHeader() hook
- Single source of header logic in PlayerLayout
- Clean, predictable layout inheritance

## Results

### Code Quality
- ✅ Removed 200+ lines of redundant code
- ✅ Single source of truth for headers
- ✅ Consistent pattern across all pages
- ✅ Easier to maintain and extend

### Performance
- ✅ Bundle size reduced by ~X KB
- ✅ No performance regressions
- ✅ Maintained fast load times

### Quality Assurance
- ✅ Zero visual regressions
- ✅ Zero functional regressions
- ✅ All tests passing
- ✅ Cross-browser compatible

### Process
- ✅ Incremental migration (19 deployments)
- ✅ System functional after every phase
- ✅ No downtime or broken states

## Migration Details

| Phase | Duration | Pages Affected | Status |
|-------|----------|----------------|--------|
| Phase 1: Remove dead code | 1 day | 0 (cleanup) | ✅ Complete |
| Phase 2: Add infrastructure | 2 days | 0 (new code) | ✅ Complete |
| Phase 3: Migrate pages | 2 weeks | 19 pages | ✅ Complete |
| Phase 4: Deprecate old code | 1 day | 1 component | ✅ Complete |
| Phase 5: Final cleanup | 2 days | Documentation | ✅ Complete |
| Phase 6: Verification | 1 day | All pages | ✅ Complete |

**Total Duration:** X weeks

## Architecture Changes

### Before
```
PlayerLayout (provides tabs + container)
  ↓
  isDetailView check (opt-out)
  ↓
  Page adds own CommonHeader
  Page renders content
```

### After
```
PlayerLayout (provides CommonHeader)
  ↓
  Page calls usePageHeader(config)
  Page renders content
```

## Key Learnings

1. **Incremental migration is crucial** - System remained functional throughout
2. **Context API works well for layout needs** - Clean separation of concerns
3. **Dead code accumulates quickly** - Regular cleanup prevents this
4. **Good documentation enables safe refactoring** - Test checklist was invaluable
5. **Visual regression testing catches issues early** - Screenshot comparisons helped

## Recommendations

1. **Establish pattern early** - Document preferred patterns upfront
2. **Prevent dead code** - Remove unused code immediately
3. **Test incrementally** - Don't batch migrations
4. **Document as you go** - Keep docs in sync with code
5. **Measure impact** - Track bundle size, performance, maintainability

## Future Work

- [ ] Apply same pattern to admin layout (if needed)
- [ ] Extract CommonHeader config types to shared location
- [ ] Add automated visual regression tests
- [ ] Document pattern for new developers

## References

- [Detailed Plan](./player-layout-refactoring-plan.md)
- [Usage Guide](./player-layout-usage.md)
- [Visual Regression Report](./refactoring-visual-diff-report.md)
- [Performance Report](./refactoring-performance-report.md)
- [Final Test Report](./refactoring-final-test-report.md)
```

#### 6.4 Team Review

Present summary to team:
- Walk through before/after architecture
- Demo the new pattern
- Answer questions
- Get sign-off

#### 6.5 Update Project Status

Mark refactoring as complete in project tracking system.

**Deliverables:**
- ✅ Final test report (all tests passing)
- ✅ Refactoring summary document
- ✅ Team review completed
- ✅ Project status updated
- ✅ Knowledge transfer complete

**Success Criteria:**
- All verification tests passed
- Documentation complete
- Team understands new patterns
- Ready for future development

---

## Rollback Plan

If issues arise during any phase:

### Phase 1 Rollback
- Restore PlayerLayout.tsx from git
- Redeploy

### Phase 2 Rollback
- Remove context files
- Restore PlayerLayout.tsx
- Redeploy

### Phase 3 Rollback (Individual Pages)
- If page X has issues after migration
- Restore page X from git (before its migration commit)
- Keep other migrated pages
- Fix issue, remigrate page X later

### Phase 4-5 Rollback
- Unlikely to need (no code changes to pages)
- If needed, restore deprecated component from git

### Complete Rollback
- If major issues discovered
- Revert all commits back to Phase 0 baseline
- System will be in known-good state
- Investigate issue, plan remediation

---

## Appendix A: File Checklist

Files created/modified during refactoring:

### Created
- [ ] `docs/frontend/player-layout-refactoring-plan.md` (this file)
- [ ] `docs/frontend/player-layout-usage.md`
- [ ] `docs/frontend/refactoring-visual-diff-report.md`
- [ ] `docs/frontend/refactoring-performance-report.md`
- [ ] `docs/frontend/refactoring-final-test-report.md`
- [ ] `docs/frontend/player-layout-refactoring-summary.md`
- [ ] `frontend/src/contexts/PlayerLayoutContext.tsx`
- [ ] `frontend/src/contexts/index.ts`

### Modified
- [ ] `frontend/src/views/player/PlayerLayout.tsx`
- [ ] `frontend/src/views/player/Landing.tsx`
- [ ] `frontend/src/views/player/AllRounds.tsx`
- [ ] `frontend/src/views/player/Competitions.tsx`
- [ ] `frontend/src/views/player/Series.tsx`
- [ ] `frontend/src/views/player/Tours.tsx`
- [ ] `frontend/src/views/player/SeriesDetail.tsx`
- [ ] `frontend/src/views/player/SeriesStandings.tsx`
- [ ] `frontend/src/views/player/SeriesCompetitions.tsx`
- [ ] `frontend/src/views/player/SeriesDocuments.tsx`
- [ ] `frontend/src/views/player/SeriesDocumentDetail.tsx`
- [ ] `frontend/src/views/player/TourDetail.tsx`
- [ ] `frontend/src/views/player/TourStandings.tsx`
- [ ] `frontend/src/views/player/TourCompetitions.tsx`
- [ ] `frontend/src/views/player/TourDocuments.tsx`
- [ ] `frontend/src/views/player/TourDocumentDetail.tsx`
- [ ] `frontend/src/views/player/CompetitionDetail.tsx`
- [ ] `frontend/src/views/player/CompetitionRound.tsx`
- [ ] `frontend/src/views/player/MyProfile.tsx`
- [ ] `frontend/src/views/player/PlayerPublicProfile.tsx`
- [ ] `CLAUDE.md`

### Deleted
- [ ] `frontend/src/components/layout/PlayerPageLayout.tsx`

---

## Appendix B: Git Commit History

All commits during refactoring:

1. `refactor(player-layout): remove unused tabs and wrapper code` (Phase 1)
2. `feat(player-layout): add header context infrastructure` (Phase 2)
3. `refactor(all-rounds): migrate to layout header pattern` (Phase 3.1)
4. `refactor(landing): migrate to layout header pattern` (Phase 3.2)
5. `refactor(competitions): migrate to layout header pattern` (Phase 3.3)
6. ... (one commit per page migration)
7. `refactor(player-page-layout): deprecate in favor of usePageHeader` (Phase 4)
8. `refactor(player-layout): complete cleanup and documentation` (Phase 5)

Total: ~25 commits

---

## Appendix C: Testing Commands

Quick reference for testing during refactoring:

```bash
# Start dev server
cd frontend
npm run dev

# Build production bundle
npm run build

# Run E2E tests
npm run test:e2e

# Run linter
npm run lint

# Type check
npm run type-check

# Bundle size analysis
npm run build
ls -lh dist/assets/*.js
```

---

## Appendix D: Success Metrics

Metrics to track throughout refactoring:

| Metric | Phase 0 | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 |
|--------|---------|---------|---------|---------|---------|---------|
| Lines of code | - | - | - | - | - | - |
| Bundle size (KB) | - | - | - | - | - | - |
| # of files with headers | 19 | 19 | 19 | → 1 | 1 | 1 |
| # of visual regressions | 0 | 0 | 0 | 0 | 0 | 0 |
| # of failing tests | 0 | 0 | 0 | 0 | 0 | 0 |
| Build time (s) | - | - | - | - | - | - |

Fill in during execution.

---

**Document Status:** ✅ Complete and ready for execution

**Next Step:** Begin Phase 1 - Remove Dead Code

**Questions/Concerns:** Open GitHub issue or discuss with team
