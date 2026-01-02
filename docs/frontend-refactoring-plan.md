# Frontend Refactoring Plan

**Created:** 2026-01-02
**Status:** Planning
**Last Updated:** 2026-01-02

## Overview

This plan addresses technical debt and maintainability improvements identified during a code review. The review applied principles from:
- SOLID principles
- "Code Complete" (McConnell)
- "A Philosophy of Software Design" (Ousterhout)
- "Clean Code" (Martin)

Goals:
- Improve maintainability without adding enterprise overhead
- Enhance AI-agent discoverability
- Keep code lightweight and easy to understand

---

## Phase 0: Testing Foundation

**Priority:** Critical (before any refactoring)
**Effort:** Medium
**Status:** In Progress

### Rationale
Refactoring without tests is risky. Before changing code, we need tests that verify current behavior. This ensures refactoring doesn't break functionality.

### Current State
- E2E tests exist via Playwright (`frontend/npm run test:e2e`)
- Unit tests for utilities are sparse or missing
- Component tests are not present

### Testing Strategy

**For utility functions** (`utils/*.ts`):
- Add Vitest unit tests
- Test pure functions with various inputs
- Focus on edge cases (empty arrays, -1 scores, boundary conditions)

**For components** (optional, E2E may suffice):
- Use Vitest + React Testing Library if needed
- Prioritize testing complex logic components
- Skip simple presentational components

**For hooks**:
- Test custom hooks with `@testing-library/react-hooks` patterns
- Focus on hooks with business logic

### Tasks

- [x] **0.1 Set up Vitest for unit testing**
  - Install `vitest` and configure in `vite.config.ts`
  - Create `frontend/src/test/setup.ts` for test configuration
  - Add `npm run test:unit` script

- [x] **0.2 Add tests for scoreCalculations.ts**
  - Test `calculateParticipantScore()` with various score arrays
  - Test `formatToPar()` edge cases
  - Test `calculateTeamResults()` with team grouping
  - Test `isRoundComplete()` logic

- [x] **0.3 Add tests for pointCalculation.ts**
  - Test `convertLeaderboardToTeamInput()` with invalid scores
  - Test `processTeamResults()` sorting and tie-breaking
  - Test `performCountbackTieBreaker()` (tested via processTeamResults)

### Files to Create
```
frontend/
├── vitest.config.ts              # or extend vite.config.ts
├── src/test/
│   └── setup.ts                  # Test setup/globals
└── src/utils/
    ├── scoreCalculations.test.ts
    └── pointCalculation.test.ts
```

### Validation
- [x] `npm run test:unit` passes (80 tests)
- [x] Coverage report shows utils are tested
- [ ] Tests fail when logic is intentionally broken

---

## Pre-Phase Checklist

**Before starting ANY phase, complete these steps:**

1. [ ] Review existing tests for affected files
2. [ ] Add unit tests for any untested utility functions being modified
3. [ ] Run E2E tests to establish baseline: `npm run test:e2e`
4. [ ] Note any flaky or failing tests before changes

This ensures we can verify refactoring didn't break anything.

---

## Phase 1: Type System Cleanup

**Priority:** High
**Effort:** Low
**Status:** Completed (2026-01-02)

### Problem
Duplicate type definitions exist across files, particularly `ParticipantScore` which is defined differently in `scoreCalculations.ts` and `pointCalculation.ts`.

### Tasks

- [x] **1.1 Create shared types directory**
  - Create `frontend/src/types/` directory
  - Create `index.ts` for re-exports

- [x] **1.2 Consolidate participant types**
  - Create `frontend/src/types/participant.ts`
  - Define single `ParticipantScore` interface with optional `score` property
  - Define `ParticipantData` interface (used by scorecard)
  - Define `ParticipantScoreWithScores` in pointCalculation.ts for cases requiring score array
  - Update imports in `scoreCalculations.ts`
  - Update imports in `pointCalculation.ts`

- [x] **1.3 Consolidate scoring types**
  - Create `frontend/src/types/scoring.ts`
  - Move `ScoreStatistics`, `TeamResult`, `TeamResultInput`, `TeamResultWithPoints`
  - Document score value conventions (0 = not reported, -1 = gave up, positive = strokes)
  - Add `TeamParticipantEntry` for shared participant entries in team results

- [x] **1.4 Add explicit return types to composite hooks**
  - Added `UseCompetitionDataResult` return type to `useCompetitionData`
  - Added `UseCompetitionSyncResult` return type to `useCompetitionSync`
  - Fixed missing type parameter in `useTeeTime` (`useQuery<TeeTime>`)
  - Note: Simple API hooks rely on TypeScript inference from `useQuery<T>()` generics, which is correct and maintainable

### Files Created
```
frontend/src/types/
├── index.ts              # Barrel exports
├── participant.ts        # ParticipantScore, ParticipantData, PlayerForRoundCheck
└── scoring.ts            # ScoreStatistics, TeamResult, TeamResultInput, TeamResultWithPoints
```

### Validation
- [x] TypeScript compilation passes
- [x] No duplicate type definitions in `utils/`
- [x] All imports updated
- [x] Build succeeds

---

## Phase 2: Component Barrel Exports

**Priority:** High
**Effort:** Low
**Status:** Completed (2026-01-02)

### Problem
AI agents (and developers) must scan individual files to discover available components in a domain.

### Tasks

- [x] **2.1 Add barrel export for competition components**
  - `frontend/src/components/competition/index.ts` (existed, added `SeriesLinkBanner`)
  - Exports: `LeaderboardComponent`, `TeamResultComponent`, `ParticipantsListComponent`, `WhosPlayingComponent`, `SeriesLinkBanner`, `CompetitionInfoBar`, `EditPlayerNameModal`

- [x] **2.2 Add barrel export for score-entry components**
  - `frontend/src/components/score-entry/index.ts` (already existed)
  - Exports: `ScoreEntry`, `ScoreInputModal`, `CustomKeyboard`, `FullScorecardModal`, `ScoreEntryDemo`, `useNativeKeyboard`

- [x] **2.3 Add barrel export for navigation components**
  - `frontend/src/components/navigation/index.ts` (existed, added `CommonHeader`)
  - Exports: `CommonHeader`, `HamburgerMenu`, `HoleNavigation`, `BottomTabNavigation`

- [x] **2.4 Add barrel export for tour components**
  - `frontend/src/components/tour/index.ts` (already existed)
  - Exports: `JoinCompetitionFlow`, `GroupStatusCard`, `ActiveRoundBanner`, `AddPlayersToGroup`

- [x] **2.5 Add barrel export for series components**
  - `frontend/src/components/series/index.ts` (already existed)
  - Exports: `RecentActivity`, `TodayCompetitionBanner`, `UpcomingCompetitions`

- [x] **2.6 Add barrel export for admin components**
  - Created `frontend/src/components/admin/index.ts`
  - Exports: `AdminDQDialog`, `AdminEditScoreDialog`, plus re-exports from `./competition`, `./series`, `./tour`

- [x] **2.7 Update imports in views** (Deferred)
  - Current direct imports work correctly and allow tree-shaking
  - Barrel exports available for discoverability without requiring migration

### Validation
- [x] All exports work correctly
- [x] No circular dependency issues
- [x] TypeScript compilation passes

---

## Phase 3: Styling Constants

**Priority:** Medium
**Effort:** Low
**Status:** Not Started

### Problem
Position styling (gold/silver/bronze) is duplicated in `LeaderboardComponent.tsx` and `scoreCalculations.ts`.

### Tasks

- [ ] **3.1 Create styling constants file**
  - Create `frontend/src/constants/styling.ts`
  - Define `POSITION_STYLES` constant
  - Create `getPositionStyle()` helper function

- [ ] **3.2 Update LeaderboardComponent**
  - Import and use `getPositionStyle()`
  - Remove duplicate `getPositionStyling()` and `getRowBackground()`

- [ ] **3.3 Update scoreCalculations**
  - Import and use shared `getPositionColor()`
  - Remove duplicate definition

### Implementation

```typescript
// frontend/src/constants/styling.ts
export const POSITION_STYLES = {
  1: {
    border: "border-yellow-400",
    text: "text-yellow-400",
    bg: "bg-yellow-50",
    hoverBg: "hover:bg-yellow-100",
  },
  2: {
    border: "border-gray-400",
    text: "text-gray-400",
    bg: "bg-gray-50",
    hoverBg: "hover:bg-gray-100",
  },
  3: {
    border: "border-orange-400",
    text: "text-orange-400",
    bg: "bg-orange-50",
    hoverBg: "hover:bg-orange-100",
  },
  default: {
    border: "border-gray-300",
    text: "text-gray-500",
    bg: "bg-scorecard",
    hoverBg: "hover:bg-gray-50",
  },
} as const;

export type PositionStyle = typeof POSITION_STYLES[keyof typeof POSITION_STYLES];

export function getPositionStyle(position: number): PositionStyle {
  return POSITION_STYLES[position as 1 | 2 | 3] ?? POSITION_STYLES.default;
}
```

### Validation
- [ ] Visual appearance unchanged
- [ ] All position highlighting works correctly

---

## Phase 4: Error Boundaries

**Priority:** Medium
**Effort:** Low
**Status:** Not Started

### Problem
API errors can crash entire views. No graceful error handling at component level.

### Tasks

- [ ] **4.1 Install react-error-boundary**
  - `npm install react-error-boundary`

- [ ] **4.2 Create ErrorFallback component**
  - Create `frontend/src/components/ui/ErrorFallback.tsx`
  - Golf-themed error message
  - "Try again" button with reset functionality

- [ ] **4.3 Add ErrorBoundary to PlayerPageLayout**
  - Wrap children in ErrorBoundary
  - Use ErrorFallback component

- [ ] **4.4 Add ErrorBoundary to AdminLayout**
  - Same pattern as PlayerPageLayout

### Implementation

```typescript
// frontend/src/components/ui/ErrorFallback.tsx
import { FallbackProps } from "react-error-boundary";

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="text-4xl mb-4">⛳</div>
      <h2 className="text-xl font-semibold text-charcoal mb-2">
        Something went wrong
      </h2>
      <p className="text-sm text-charcoal/70 mb-4 max-w-md">
        {error.message || "An unexpected error occurred"}
      </p>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-turf text-scorecard rounded-lg hover:bg-fairway transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
```

### Validation
- [ ] Errors are caught and displayed gracefully
- [ ] Reset button works
- [ ] No console errors about uncaught exceptions

---

## Phase 5: LeaderboardComponent Split

**Priority:** High
**Effort:** Medium
**Status:** Not Started

### Problem
`LeaderboardComponent.tsx` is 736 lines with mobile AND desktop rendering, complex sorting, and multiple filter states.

### Tasks

- [ ] **5.1 Extract sorting logic**
  - Create `frontend/src/hooks/useLeaderboardSort.ts`
  - Move sorting logic from lines 92-153
  - Return `sortedLeaderboard` and `filteredLeaderboard`

- [ ] **5.2 Extract mobile view**
  - Create `frontend/src/components/competition/LeaderboardMobile.tsx`
  - Move mobile card view (lines 336-486)
  - Props: `entries`, `onParticipantClick`, `showNetScores`, `isTourCompetition`, etc.

- [ ] **5.3 Extract desktop view**
  - Create `frontend/src/components/competition/LeaderboardDesktop.tsx`
  - Move desktop table view (lines 488-719)
  - Same props as mobile

- [ ] **5.4 Extract filter controls**
  - Create `frontend/src/components/competition/LeaderboardFilters.tsx`
  - Move filter UI (lines 236-323)
  - Props: filter state setters, categories, scoringMode

- [ ] **5.5 Simplify LeaderboardComponent**
  - Import and compose extracted components
  - Should be ~100 lines orchestrating the pieces

### Target Structure
```
components/competition/
├── LeaderboardComponent.tsx    # ~100 lines, orchestration
├── LeaderboardMobile.tsx       # ~150 lines
├── LeaderboardDesktop.tsx      # ~200 lines
├── LeaderboardFilters.tsx      # ~100 lines
└── leaderboard/
    └── useLeaderboardSort.ts   # ~80 lines
```

### Validation
- [ ] Visual appearance unchanged
- [ ] Filtering works correctly
- [ ] Sorting works correctly
- [ ] Mobile/desktop responsive behavior unchanged
- [ ] Click handlers work

---

## Phase 6: CompetitionDetail Split

**Priority:** High
**Effort:** Medium
**Status:** Not Started

### Problem
`CompetitionDetail.tsx` is 549 lines handling multiple concerns: data fetching, tabs, modals, registration.

### Tasks

- [ ] **6.1 Extract competition header**
  - Create `frontend/src/components/competition/CompetitionHeader.tsx`
  - Move title, date, course info, participant count
  - Lines ~294-336

- [ ] **6.2 Extract registration section**
  - Create `frontend/src/components/competition/RegistrationSection.tsx`
  - Move open-start tour competition registration UI
  - Lines ~338-393

- [ ] **6.3 Extract tab logic to hook**
  - Create `frontend/src/hooks/useCompetitionTabs.ts`
  - Move tab state, hash handling, useEffects
  - Return: `activeTab`, `setActiveTab`, `handleTabChange`

- [ ] **6.4 Extract net scoring data logic**
  - Move IIFE at lines 174-186 to `useNetScoringData` hook
  - Clean up inline computation

- [ ] **6.5 Simplify CompetitionDetail**
  - Import and compose extracted components
  - Target: ~200-250 lines

### Target Structure
```
components/competition/
├── CompetitionHeader.tsx       # Title, date, info bar
├── RegistrationSection.tsx     # Open-start join flow
└── ...

hooks/
├── useCompetitionTabs.ts       # Tab state + hash sync
├── useNetScoringData.ts        # Net scoring calculation
└── ...
```

### Validation
- [ ] All tabs work correctly
- [ ] Hash-based navigation works
- [ ] Registration flow works
- [ ] Scorecard modal works
- [ ] Back navigation works

---

## Phase 7: Documentation Updates

**Priority:** Low
**Effort:** Low
**Status:** Not Started

### Tasks

- [ ] **7.1 Update CLAUDE.md**
  - Add note about `types/` directory
  - Add note about barrel exports pattern
  - Document error boundary usage

- [ ] **7.2 Add JSDoc to score conventions**
  - Document in `types/scoring.ts`:
    - `0` = not reported (hole not yet played)
    - `-1` = gave up (disqualified from this round)
    - positive = actual strokes

- [ ] **7.3 Document hook return types**
  - Ensure all composite hooks have documented return types

---

## Progress Tracking

### Session Log

| Date | Session | Phases Completed | Notes |
|------|---------|------------------|-------|
| 2026-01-02 | 1 | - | Initial plan created |
| 2026-01-02 | 2 | Phase 1 | Type system cleanup - created types/ directory, consolidated ParticipantScore and scoring types |
| 2026-01-02 | 3 | Phase 0 (0.1-0.3) | Testing foundation - Vitest setup, 80 unit tests for scoreCalculations.ts and pointCalculation.ts |
| 2026-01-02 | 4 | Phase 1 (1.4) | Hook return types - added explicit return types to composite hooks (useCompetitionData, useCompetitionSync) |
| 2026-01-02 | 5 | Phase 2 | Barrel exports - completed missing exports (SeriesLinkBanner, CommonHeader), created admin/index.ts |

### Phase Status Summary

| Phase | Description | Status | Completion |
|-------|-------------|--------|------------|
| 0 | Testing Foundation | In Progress | 75% |
| 1 | Type System Cleanup | Completed | 100% |
| 2 | Component Barrel Exports | Completed | 100% |
| 3 | Styling Constants | Not Started | 0% |
| 4 | Error Boundaries | Not Started | 0% |
| 5 | LeaderboardComponent Split | Not Started | 0% |
| 6 | CompetitionDetail Split | Not Started | 0% |
| 7 | Documentation Updates | Not Started | 0% |

---

## Dependencies

```
Phase 0 (Testing) ──> ALL OTHER PHASES (must complete first)
         │
         ▼
Phase 1 (Types) ──┬──> Phase 5 (Leaderboard Split)
                  │
                  └──> Phase 6 (CompetitionDetail Split)

Phase 2 (Barrel Exports) ──> Phase 7 (Documentation)

Phase 3 (Styling) ──> Phase 5 (Leaderboard Split)

Phase 4 (Error Boundaries) ──> Independent
```

**Recommended Order:** 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7

Phase 0 is a hard prerequisite - tests must exist before refactoring.

---

## Guiding Principles

1. **Test before refactor** - Add tests for affected code before changing it
2. **No enterprise overhead** - Don't add abstractions that aren't needed
3. **Preserve simplicity** - If in doubt, keep it simple
4. **Incremental progress** - Each phase should leave code working
5. **Verify after each change** - Run tests + visual check after modifications
6. **AI-friendly** - Predictable naming, explicit types, barrel exports
