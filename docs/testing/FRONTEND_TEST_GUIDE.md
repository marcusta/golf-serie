# Frontend Testing Guide

**For Frontend Test Sub-Agent Use Only**

This guide contains all frontend testing patterns and practices. When you receive a frontend testing task, follow these guidelines strictly.

---

## 📋 Table of Contents

- [Testing Commands](#testing-commands)
- [Testing Architecture](#testing-architecture)
- [E2E Testing with Playwright](#e2e-testing-with-playwright)
- [Testing Patterns](#testing-patterns)
- [Mobile Testing](#mobile-testing)
- [Important Constraints](#important-constraints)

---

## Testing Commands

```bash
cd frontend

# E2E tests with Playwright
npm run test:e2e          # Run all E2E tests
npm run test:e2e -- --ui  # Run with Playwright UI
npm run test:e2e -- --headed  # Run with browser visible
npm run test:e2e -- --debug   # Debug mode
```

---

## Testing Architecture

### Test Organization

```
frontend/
├── e2e/                    # E2E tests with Playwright
│   ├── admin/             # Admin interface tests
│   ├── player/            # Player interface tests
│   └── fixtures/          # Test data and helpers
```

### Test Strategy

- **E2E testing with Playwright**: Primary testing approach
- **Focus areas**: Critical user flows, score entry, navigation
- **Mobile-responsive testing**: Test on multiple viewport sizes
- **Real browser testing**: Chrome, Firefox, Safari

---

## E2E Testing with Playwright

### Page Object Pattern

Use Page Object Model for reusable test utilities:

```typescript
// e2e/pages/CompetitionPage.ts
export class CompetitionPage {
  constructor(private page: Page) {}

  async navigateToCompetition(id: number) {
    await this.page.goto(`/admin/competitions/${id}`);
  }

  async enterScore(participantIndex: number, hole: number, score: number) {
    const input = this.page.locator(`[data-testid="score-${participantIndex}-${hole}"]`);
    await input.fill(String(score));
  }

  async getLeaderboard() {
    return this.page.locator('[data-testid="leaderboard-entry"]').all();
  }
}
```

### Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Competition Leaderboard', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Navigate to competition
    await page.goto('/admin/competitions/1');
  });

  test('displays participants sorted by score', async ({ page }) => {
    // Arrange
    const leaderboard = page.locator('[data-testid="leaderboard-entry"]');

    // Act
    await page.waitForSelector('[data-testid="leaderboard-entry"]');

    // Assert
    const entries = await leaderboard.all();
    expect(entries.length).toBeGreaterThan(0);

    // Verify first entry has lowest score
    const firstEntry = entries[0];
    const firstScore = await firstEntry.locator('[data-testid="total-score"]').textContent();
    expect(parseInt(firstScore!)).toBeLessThanOrEqual(100);
  });
});
```

---

## Testing Patterns

### Testing User Flows

**Score Entry Flow**:
```typescript
test('complete score entry workflow', async ({ page }) => {
  // Navigate to competition
  await page.goto('/admin/competitions/1');

  // Find participant row
  const participantRow = page.locator('[data-testid="participant-1"]');

  // Enter scores for all 18 holes
  for (let hole = 1; hole <= 18; hole++) {
    const input = participantRow.locator(`[data-testid="score-hole-${hole}"]`);
    await input.fill('4');  // Par
  }

  // Save scores
  await page.click('[data-testid="save-scores"]');

  // Verify success
  await expect(page.locator('[data-testid="success-message"]'))
    .toBeVisible();
});
```

### Testing Navigation

```typescript
test('player navigation works correctly', async ({ page }) => {
  await page.goto('/player');

  // Test tab navigation
  await page.click('[data-testid="nav-tab-competitions"]');
  await expect(page).toHaveURL(/\/player\/competitions/);

  await page.click('[data-testid="nav-tab-series"]');
  await expect(page).toHaveURL(/\/player\/series/);

  // Test back navigation
  await page.click('[data-testid="series-1"]');
  await expect(page).toHaveURL(/\/player\/series\/1/);

  await page.click('[data-testid="back-button"]');
  await expect(page).toHaveURL(/\/player\/series/);
});
```

### Testing Forms

```typescript
test('creates new competition', async ({ page }) => {
  await page.goto('/admin/competitions');

  // Click create button
  await page.click('[data-testid="create-competition"]');

  // Fill form
  await page.fill('[data-testid="competition-name"]', 'Test Competition');
  await page.fill('[data-testid="competition-date"]', '2025-09-15');
  await page.selectOption('[data-testid="course-select"]', '1');

  // Submit
  await page.click('[data-testid="submit"]');

  // Verify redirect and success
  await expect(page).toHaveURL(/\/admin\/competitions\/\d+/);
  await expect(page.locator('h1')).toContainText('Test Competition');
});
```

### Testing Interactive Elements

```typescript
test('hamburger menu shows correct options', async ({ page }) => {
  await page.goto('/player/series/1');

  // Open menu
  await page.click('[data-testid="hamburger-menu"]');

  // Verify menu items
  await expect(page.locator('[data-testid="menu-standings"]')).toBeVisible();
  await expect(page.locator('[data-testid="menu-competitions"]')).toBeVisible();
  await expect(page.locator('[data-testid="menu-documents"]')).toBeVisible();

  // Click menu item
  await page.click('[data-testid="menu-standings"]');

  // Verify navigation
  await expect(page).toHaveURL(/\/player\/series\/1\/standings/);
});
```

### Testing Data Display

```typescript
test('leaderboard calculates scores correctly', async ({ page }) => {
  await page.goto('/admin/competitions/1');

  // Wait for leaderboard to load
  await page.waitForSelector('[data-testid="leaderboard-entry"]');

  // Get first entry
  const firstEntry = page.locator('[data-testid="leaderboard-entry"]').first();

  // Verify score components
  const totalScore = await firstEntry.locator('[data-testid="total-score"]').textContent();
  const relativeToPar = await firstEntry.locator('[data-testid="relative-to-par"]').textContent();

  expect(parseInt(totalScore!)).toBeGreaterThan(0);
  expect(relativeToPar).toMatch(/[+-]?\d+/);  // +2, -1, E format
});
```

---

## Mobile Testing

### Viewport Testing

```typescript
test.describe('Mobile responsive tests', () => {
  test.use({ viewport: { width: 375, height: 667 } });  // iPhone SE

  test('mobile navigation works', async ({ page }) => {
    await page.goto('/player');

    // Mobile menu should be visible
    await expect(page.locator('[data-testid="mobile-menu-button"]'))
      .toBeVisible();

    // Desktop navigation should be hidden
    await expect(page.locator('[data-testid="desktop-nav"]'))
      .not.toBeVisible();
  });
});
```

### Touch Target Testing

```typescript
test('touch targets meet minimum size', async ({ page }) => {
  test.use({ viewport: { width: 375, height: 667 } });

  await page.goto('/player/series/1');

  // Get all interactive elements
  const buttons = page.locator('button, a[href]');

  // Verify minimum 44px touch targets
  for (const button of await buttons.all()) {
    const box = await button.boundingBox();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
  }
});
```

---

## Important Constraints

### Test Data

- **Use fixtures**: Create test data fixtures for consistent testing
- **Clean state**: Each test should start with a known state
- **Isolation**: Tests should not depend on each other

### Selectors

- **Prefer data-testid**: Use `data-testid` attributes for stable selectors
- **Avoid CSS classes**: Design system classes may change
- **Avoid text content**: Text may change or be internationalized

### Async Handling

- **Wait for elements**: Always use proper waits (`waitForSelector`, `waitForURL`)
- **Avoid hard timeouts**: Use Playwright's built-in retry logic
- **Handle loading states**: Wait for loading spinners to disappear

### CI/CD Considerations

- Tests should run headless
- Tests should be fast (< 30 seconds per test ideally)
- Tests should be reliable (no flaky tests)
- Screenshot on failure for debugging

---

## Best Practices

### Do's

✅ Use data-testid for selectors
✅ Test user flows, not implementation details
✅ Test mobile viewport sizes
✅ Test keyboard navigation
✅ Test error states and edge cases
✅ Keep tests focused and independent
✅ Use Page Object Model for reusability

### Don'ts

❌ Don't rely on CSS classes or IDs
❌ Don't use hard-coded timeouts
❌ Don't test implementation details
❌ Don't create interdependent tests
❌ Don't skip mobile testing
❌ Don't ignore accessibility

---

## Example: Complete Test Suite

```typescript
import { test, expect } from '@playwright/test';

test.describe('Score Entry Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Create test competition with participants
    await page.goto('/admin/competitions/1');
    await page.waitForSelector('[data-testid="participant-row"]');
  });

  test('enters scores for all holes', async ({ page }) => {
    const participantRow = page.locator('[data-testid="participant-1"]');

    // Enter scores
    for (let hole = 1; hole <= 18; hole++) {
      await participantRow
        .locator(`[data-testid="score-hole-${hole}"]`)
        .fill('4');
    }

    // Save
    await page.click('[data-testid="save-scores"]');

    // Verify
    await expect(page.locator('[data-testid="success-toast"]'))
      .toBeVisible();
  });

  test('calculates total score correctly', async ({ page }) => {
    const participantRow = page.locator('[data-testid="participant-1"]');

    // Enter known scores
    const scores = [4, 3, 5, 4, 4, 3, 5, 4, 4,  // Front 9 = 36
                    4, 3, 5, 4, 4, 3, 5, 4, 4]; // Back 9 = 36

    for (let hole = 1; hole <= 18; hole++) {
      await participantRow
        .locator(`[data-testid="score-hole-${hole}"]`)
        .fill(String(scores[hole - 1]));
    }

    await page.click('[data-testid="save-scores"]');

    // Verify total
    const total = await participantRow
      .locator('[data-testid="total-score"]')
      .textContent();

    expect(parseInt(total!)).toBe(72);
  });

  test('locks scorecard after completion', async ({ page }) => {
    // Enter and save scores
    // ... (omitted for brevity)

    // Lock scorecard
    await page.click('[data-testid="lock-scorecard"]');

    // Verify inputs are disabled
    const firstInput = page.locator('[data-testid="score-hole-1"]');
    await expect(firstInput).toBeDisabled();
  });
});
```

---

## Summary

**Frontend testing approach**: E2E testing with Playwright focusing on critical user flows, mobile responsiveness, and real browser testing.

**Every test must**:
- Use stable selectors (data-testid)
- Test user flows, not implementation
- Handle async properly (no hard timeouts)
- Work on mobile viewports
- Be independent and isolated
- Run reliably in CI/CD

Build tests that give confidence in the user experience.
