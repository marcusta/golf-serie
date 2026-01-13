---
name: e2e-testing
description: Guide E2E testing with Playwright for TapScore frontend. Use when writing or running frontend tests for user flows, navigation, forms, or mobile responsiveness. Ensures tests follow Page Object Model and proper async patterns.
---

# TapScore E2E Testing Skill

This skill guides E2E testing with Playwright. Use when writing or running ANY frontend tests.

---

## Testing Workflow

Copy this checklist and track your progress:

```
E2E Testing Progress:
- [ ] Step 1: Read testing patterns
- [ ] Step 2: Set up test structure
- [ ] Step 3: Write tests with proper selectors
- [ ] Step 4: Run tests and verify
- [ ] Step 5: Test mobile responsiveness
```

---

## Step 1: Read Testing Patterns

**MANDATORY - Read this file before testing:**

```bash
cat docs/testing/FRONTEND_TEST_GUIDE.md
```

**What to extract:**
- Page Object Model patterns
- Playwright test structure
- Selector best practices (data-testid)
- Async handling patterns

---

## Step 2: Set Up Test Structure

### Test File Organization

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to starting point
    await page.goto('/relevant/path');
  });

  test('specific behavior description', async ({ page }) => {
    // Arrange, Act, Assert
  });
});
```

### Use data-testid Selectors

```typescript
// ✅ CORRECT - Stable selector
const button = page.locator('[data-testid="save-button"]');

// ❌ WRONG - Fragile selectors
const button = page.locator('.btn-primary');  // CSS class
const button = page.locator('button:has-text("Save")');  // Text content
```

---

## Step 3: Write Tests with Proper Selectors

### Test User Flows

```typescript
test('completes score entry workflow', async ({ page }) => {
  // Navigate
  await page.goto('/admin/competitions/1');

  // Enter scores for all holes
  for (let hole = 1; hole <= 18; hole++) {
    await page.locator(`[data-testid="score-hole-${hole}"]`).fill('4');
  }

  // Save
  await page.click('[data-testid="save-scores"]');

  // Verify
  await expect(page.locator('[data-testid="success-message"]'))
    .toBeVisible();
});
```

### Test Navigation

```typescript
test('navigates between pages correctly', async ({ page }) => {
  await page.goto('/player');

  // Click tab
  await page.click('[data-testid="nav-tab-competitions"]');

  // Verify URL
  await expect(page).toHaveURL(/\/player\/competitions/);

  // Click detail link
  await page.click('[data-testid="competition-1"]');
  await expect(page).toHaveURL(/\/player\/competitions\/1/);

  // Back button
  await page.click('[data-testid="back-button"]');
  await expect(page).toHaveURL(/\/player\/competitions/);
});
```

### Test Forms

```typescript
test('submits form with validation', async ({ page }) => {
  await page.goto('/admin/competitions');

  await page.click('[data-testid="create-button"]');

  // Fill form
  await page.fill('[data-testid="name-input"]', 'Test Competition');
  await page.fill('[data-testid="date-input"]', '2025-09-15');
  await page.selectOption('[data-testid="course-select"]', '1');

  // Submit
  await page.click('[data-testid="submit-button"]');

  // Verify success
  await expect(page).toHaveURL(/\/admin\/competitions\/\d+/);
});
```

### Async Handling

```typescript
// ✅ CORRECT - Wait for elements
await page.waitForSelector('[data-testid="leaderboard"]');
const entries = await page.locator('[data-testid="entry"]').all();

// ✅ CORRECT - Built-in retry
await expect(page.locator('[data-testid="score"]'))
  .toHaveText('72');

// ❌ WRONG - Hard timeout
await page.waitForTimeout(2000);  // Don't use this
```

---

## Step 4: Run Tests and Verify

### Run Commands

```bash
cd frontend

# Run all tests
npm run test:e2e

# Run with UI (debugging)
npm run test:e2e -- --ui

# Run specific test file
npm run test:e2e -- competitions.spec.ts

# Run in headed mode (see browser)
npm run test:e2e -- --headed
```

### Verify Test Quality

- [ ] Uses `data-testid` selectors (not CSS classes or text)
- [ ] Waits properly (no hard timeouts)
- [ ] Tests user flows (not implementation details)
- [ ] Independent tests (no shared state)
- [ ] Descriptive test names

---

## Step 5: Test Mobile Responsiveness

### Mobile Viewport Tests

```typescript
test.describe('Mobile responsive', () => {
  test.use({ viewport: { width: 375, height: 667 } });  // iPhone SE

  test('mobile navigation works', async ({ page }) => {
    await page.goto('/player');

    // Mobile menu visible
    await expect(page.locator('[data-testid="mobile-menu"]'))
      .toBeVisible();

    // Desktop nav hidden
    await expect(page.locator('[data-testid="desktop-nav"]'))
      .not.toBeVisible();
  });

  test('touch targets meet minimum size', async ({ page }) => {
    await page.goto('/player');

    const button = page.locator('[data-testid="menu-button"]');
    const box = await button.boundingBox();

    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.width).toBeGreaterThanOrEqual(44);
  });
});
```

---

## Key Testing Patterns

### Page Object Model

Extract reusable page interactions:

```typescript
// e2e/pages/CompetitionPage.ts
export class CompetitionPage {
  constructor(private page: Page) {}

  async goto(id: number) {
    await this.page.goto(`/admin/competitions/${id}`);
  }

  async enterScore(hole: number, score: number) {
    await this.page.locator(`[data-testid="score-hole-${hole}"]`)
      .fill(String(score));
  }

  async save() {
    await this.page.click('[data-testid="save-scores"]');
  }
}

// In test
const competitionPage = new CompetitionPage(page);
await competitionPage.goto(1);
await competitionPage.enterScore(1, 4);
await competitionPage.save();
```

### Test Critical Paths

Focus on user workflows:
- Score entry and saving
- Navigation between pages
- Form submission
- Leaderboard display
- Mobile menu interaction

---

## Anti-Patterns to Avoid

1. ❌ Using CSS classes as selectors (fragile)
2. ❌ Using text content as selectors (may change)
3. ❌ Hard-coded timeouts (`waitForTimeout`)
4. ❌ Testing implementation details
5. ❌ Shared state between tests
6. ❌ Skipping mobile testing
7. ❌ Not waiting for async operations

---

## Summary

**E2E testing approach**: Playwright tests focusing on critical user flows with stable selectors, proper async handling, and mobile testing.

**Every test must**:
- Use `data-testid` selectors
- Wait properly (no hard timeouts)
- Test user flows (not implementation)
- Be independent and isolated
- Work on mobile viewports
- Run reliably in CI/CD

For detailed patterns, see `docs/testing/FRONTEND_TEST_GUIDE.md`.
