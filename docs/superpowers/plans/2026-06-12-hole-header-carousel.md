# Hole Header Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace step-like header swiping with a cyclic, momentum-driven hole carousel that follows the finger, softly snaps to an active hole, and crossfades the scoring content after settling.

**Architecture:** Add a focused `HoleHeaderCarousel` component and pure carousel math helpers. `ScoreEntry` supplies its ordered active holes, updates the controlled hole only after the snap transition ends, and fades the scoring body during that handoff. Restore `HoleNavigation` to button-only behavior.

**Tech Stack:** React 19, TypeScript, Pointer Events, CSS transforms/transitions, Vitest, Testing Library, Vite

---

### Task 1: Carousel Math

**Files:**
- Create: `frontend/src/components/score-entry/holeCarousel.ts`
- Create: `frontend/src/components/score-entry/holeCarousel.test.ts`

- [ ] Write failing tests proving cyclic index wrapping for 18-hole, front-nine, and back-nine lists, plus momentum projection across multiple holes.
- [ ] Run `cd frontend && npm run test:unit -- src/components/score-entry/holeCarousel.test.ts` and verify RED.
- [ ] Implement `wrapCarouselIndex`, `getHoleAtOffset`, and `calculateCarouselSteps`. Use drag distance plus velocity projection, round to the nearest item-width step, limit travel to four holes per gesture, and preserve direction.
- [ ] Re-run the focused test and verify GREEN.

### Task 2: Animated Header Carousel

**Files:**
- Create: `frontend/src/components/score-entry/HoleHeaderCarousel.tsx`
- Create: `frontend/src/components/score-entry/HoleHeaderCarousel.test.tsx`

- [ ] Write failing interaction tests proving the track follows pointer movement, release applies a soft CSS transition, callbacks wait for `transitionend`, fast gestures can select several holes, cyclic wrapping uses the supplied active-hole list, and vertical gestures are ignored.
- [ ] Run the focused component test and verify RED.
- [ ] Implement a cyclic window of hole labels around the current active-hole index. Track pointer ownership, drag offset, recent velocity, and pointer capture. On release calculate projected steps, animate to the target offset with `cubic-bezier(0.22, 1, 0.36, 1)`, then call `onHoleChange` only after the transform transition settles.
- [ ] Re-run the focused component test and verify GREEN.

### Task 3: Score Entry Integration

**Files:**
- Modify: `frontend/src/components/score-entry/ScoreEntry.tsx`
- Modify: `frontend/src/components/score-entry/ScoreEntry.test.tsx`
- Modify: `frontend/src/components/navigation/HoleNavigation.tsx`
- Delete: `frontend/src/hooks/useHorizontalSwipe.ts`

- [ ] Update the existing failing score-entry tests to target the carousel contract and add checks for `activeHoles={[10..18]}` wrapping from 18 to 10 and from 10 to 18.
- [ ] Replace the static light-green header markup with `HoleHeaderCarousel`.
- [ ] Fade the scoring rows and scorecard action area to zero opacity while the carousel settles; after the hole update, restore opacity with a short transition.
- [ ] Restore `HoleNavigation` to button-only behavior and verify a drag on the footer does not navigate.
- [ ] Run the score-entry, carousel, and footer tests together and verify GREEN.

### Task 4: Verification and Bundle

**Files:**
- Regenerate: `frontend_dist/`

- [ ] Run `cd frontend && npm run test:unit` and require zero failures.
- [ ] Run targeted ESLint on all changed source/test files.
- [ ] Run `cd frontend && npm run deploy` to rebuild `frontend_dist/`.
- [ ] On `http://localhost:5175/player/competitions/167/tee-times/1123` with true touch emulation, verify the header follows the finger, a slow drag softly snaps one hole, a faster/longer swipe advances multiple holes, wrapping works, scoring content crossfades after settling, and footer drags do nothing.
- [ ] Run `git diff --check` and review the final diff for unrelated changes.
- [ ] Commit with `fix(play): add animated hole header carousel`.
