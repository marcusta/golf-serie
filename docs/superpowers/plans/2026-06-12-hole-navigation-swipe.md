# Hole Navigation Swipe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let players swipe the shared orange hole navigation bar left or right to move between available holes in every play mode that uses it.

**Architecture:** Add pointer gesture recognition inside the existing shared `HoleNavigation` component, delegating successful gestures to its existing navigation callbacks and boundary flags. Add focused Vitest component tests that exercise the public pointer interaction, then rebuild the committed production frontend bundle and verify the supplied route at a mobile viewport.

**Tech Stack:** React 19, TypeScript, Pointer Events, Vitest, Testing Library, Vite, Playwright/in-app Browser

---

## File Structure

- Create `frontend/src/components/navigation/HoleNavigation.test.tsx`: component-level pointer gesture regression tests.
- Modify `frontend/src/components/navigation/HoleNavigation.tsx`: track pointer start coordinates and translate qualified horizontal swipes into existing previous/next callbacks.
- Regenerate `frontend_dist/`: committed production bundle served by the backend.

### Task 1: Add Swipe Gesture Tests

**Files:**
- Create: `frontend/src/components/navigation/HoleNavigation.test.tsx`
- Test: `frontend/src/components/navigation/HoleNavigation.test.tsx`

- [ ] **Step 1: Write the failing component tests**

Create tests using `render`, `fireEvent`, and `vi.fn()` with a shared renderer. Select the navigation surface by `data-testid="hole-navigation"` and cover left, right, short, vertical, and disabled-boundary gestures:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { HoleNavigation } from "./HoleNavigation";

function renderNavigation(overrides: Partial<ComponentProps<typeof HoleNavigation>> = {}) {
  const onPrevious = vi.fn();
  const onNext = vi.fn();

  render(
    <HoleNavigation
      currentHole={5}
      holePar={4}
      onPrevious={onPrevious}
      onNext={onNext}
      canGoPrevious
      canGoNext
      {...overrides}
    />
  );

  return {
    navigation: screen.getByTestId("hole-navigation"),
    onPrevious,
    onNext,
  };
}

function swipe(element: HTMLElement, start: [number, number], end: [number, number]) {
  fireEvent.pointerDown(element, { clientX: start[0], clientY: start[1] });
  fireEvent.pointerUp(element, { clientX: end[0], clientY: end[1] });
}

describe("HoleNavigation swipe gestures", () => {
  it("moves to the next hole after a left swipe", () => {
    const { navigation, onNext, onPrevious } = renderNavigation();
    swipe(navigation, [150, 20], [80, 24]);
    expect(onNext).toHaveBeenCalledOnce();
    expect(onPrevious).not.toHaveBeenCalled();
  });

  it("moves to the previous hole after a right swipe", () => {
    const { navigation, onNext, onPrevious } = renderNavigation();
    swipe(navigation, [80, 20], [150, 24]);
    expect(onPrevious).toHaveBeenCalledOnce();
    expect(onNext).not.toHaveBeenCalled();
  });

  it("ignores horizontal gestures shorter than 50 pixels", () => {
    const { navigation, onNext, onPrevious } = renderNavigation();
    swipe(navigation, [100, 20], [60, 20]);
    expect(onNext).not.toHaveBeenCalled();
    expect(onPrevious).not.toHaveBeenCalled();
  });

  it("ignores gestures whose vertical movement exceeds horizontal movement", () => {
    const { navigation, onNext, onPrevious } = renderNavigation();
    swipe(navigation, [120, 20], [60, 100]);
    expect(onNext).not.toHaveBeenCalled();
    expect(onPrevious).not.toHaveBeenCalled();
  });

  it("does not navigate before the first available hole", () => {
    const { navigation, onPrevious } = renderNavigation({ canGoPrevious: false });
    swipe(navigation, [80, 20], [150, 20]);
    expect(onPrevious).not.toHaveBeenCalled();
  });

  it("does not navigate after the last available hole", () => {
    const { navigation, onNext } = renderNavigation({ canGoNext: false });
    swipe(navigation, [150, 20], [80, 20]);
    expect(onNext).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the focused test to verify RED**

Run:

```bash
cd frontend && npm run test:unit -- src/components/navigation/HoleNavigation.test.tsx
```

Expected: FAIL because `data-testid="hole-navigation"` and swipe behavior do not exist yet.

### Task 2: Implement Shared Swipe Navigation

**Files:**
- Modify: `frontend/src/components/navigation/HoleNavigation.tsx`
- Test: `frontend/src/components/navigation/HoleNavigation.test.tsx`

- [ ] **Step 1: Add pointer tracking and swipe qualification**

Import `useRef`, define a 50-pixel threshold, record the pointer-down coordinates, and handle pointer-up on the outer navigation bar:

```tsx
import { useRef } from "react";

const SWIPE_THRESHOLD_PX = 50;

const pointerStart = useRef<{ x: number; y: number } | null>(null);

const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
  pointerStart.current = { x: event.clientX, y: event.clientY };
};

const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
  const start = pointerStart.current;
  pointerStart.current = null;
  if (!start) return;

  const deltaX = event.clientX - start.x;
  const deltaY = event.clientY - start.y;
  if (
    Math.abs(deltaX) < SWIPE_THRESHOLD_PX ||
    Math.abs(deltaX) <= Math.abs(deltaY)
  ) {
    return;
  }

  if (deltaX < 0 && canGoNext) onNext();
  if (deltaX > 0 && canGoPrevious) onPrevious();
};
```

Attach the handlers and test id to the component's outer `div`, and add `touch-pan-y` so vertical scrolling remains available while horizontal movement is handled by the component:

```tsx
<div
  data-testid="hole-navigation"
  onPointerDown={handlePointerDown}
  onPointerUp={handlePointerUp}
  className={cn(
    "bg-coral text-charcoal px-4 py-2 touch-pan-y",
    "shadow-lg border-t border-coral/20",
    className
  )}
>
```

- [ ] **Step 2: Run the focused test to verify GREEN**

Run:

```bash
cd frontend && npm run test:unit -- src/components/navigation/HoleNavigation.test.tsx
```

Expected: 6 tests pass.

- [ ] **Step 3: Run all frontend unit tests**

Run:

```bash
cd frontend && npm run test:unit
```

Expected: all unit tests pass with zero failures.

- [ ] **Step 4: Run frontend lint**

Run:

```bash
cd frontend && npm run lint
```

Expected: exit code 0 with no new lint errors.

### Task 3: Build and Verify the Production Frontend

**Files:**
- Regenerate: `frontend_dist/`

- [ ] **Step 1: Rebuild the committed frontend bundle**

Run:

```bash
cd frontend && npm run deploy
```

Expected: TypeScript and Vite build succeed, and `frontend_dist/` contains the regenerated assets.

- [ ] **Step 2: Verify the supplied route at mobile size**

Open `http://localhost:5175/player/competitions/167/tee-times/1123` at a mobile-sized viewport. On the score tab, swipe left across the orange hole bar and confirm the displayed hole increases by one. Swipe right and confirm it returns to the prior hole. At the first available hole, confirm a right swipe does not change the hole. Confirm the arrow buttons still navigate normally.

- [ ] **Step 3: Inspect the final diff**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; only the component, its test, this plan, and generated `frontend_dist/` assets are changed by this feature.

- [ ] **Step 4: Commit the implementation**

```bash
git add frontend/src/components/navigation/HoleNavigation.tsx \
  frontend/src/components/navigation/HoleNavigation.test.tsx \
  frontend_dist \
  docs/superpowers/plans/2026-06-12-hole-navigation-swipe.md
git commit -m "feat(play): add swipe hole navigation"
```
