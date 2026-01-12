// frontend/tests/round-list.spec.ts
import { expect, test } from "./test-fixtures";
import {
  createCompetition,
  createCourse,
  createParticipant,
  createTeam,
  createTeeTime,
  createUser,
  loginUser,
  createPlayerProfile,
} from "./test-helpers";

test("should display rounds consistently across dashboard, profile, and all rounds page", async ({
  page,
  server,
}) => {
  // STEP 1: Setup test data
  let userId: number;
  let authCookie: string;

  await test.step("Setup test data via API", async () => {
    // Create user and login
    const user = await createUser(server.port, "test@example.com", "password123", "Test User");
    userId = user.id;

    const loginResponse = await loginUser(server.port, "test@example.com", "password123");
    authCookie = loginResponse.cookie;

    // Create player profile
    await createPlayerProfile(server.port, authCookie, {
      display_name: "Test Player",
      bio: "Test bio",
    });

    // Create course
    const course = await createCourse(
      server.port,
      "Test Golf Course",
      Array(18).fill(4)
    );

    // Create multiple competitions with scores to test the round list
    const team = await createTeam(server.port, "Test Team");

    for (let i = 0; i < 8; i++) {
      const competition = await createCompetition(
        server.port,
        `Competition ${i + 1}`,
        `2024-01-${String(10 + i).padStart(2, '0')}`,
        course.id
      );

      const teeTime = await createTeeTime(server.port, competition.id, "10:00");

      const participant = await createParticipant(server.port, {
        tee_time_id: teeTime.id,
        team_id: team.id,
        position_name: "Player 1",
        tee_order: 1,
        player_id: userId,
      });

      // Add scores to the participant
      const scores = Array(18).fill(4 + i); // Vary scores for each round
      await fetch(`http://localhost:${server.port}/api/participants/${participant.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: scores }),
      });
    }
  });

  // STEP 2: Set auth cookie and navigate to dashboard
  await test.step("Navigate to dashboard with authentication", async () => {
    await page.context().addCookies([
      {
        name: "auth_token",
        value: authCookie,
        domain: "localhost",
        path: "/",
      },
    ]);

    await page.goto(`http://localhost:${server.port}/player`);
    await page.waitForLoadState("networkidle");
  });

  // STEP 3: Verify dashboard shows recent rounds
  await test.step("Verify dashboard displays recent rounds", async () => {
    // Check for Recent Results section
    await expect(page.getByText("Recent Results")).toBeVisible();

    // Should show View All link
    await expect(page.getByRole("link", { name: /View All/i })).toBeVisible();

    // Should show round items (at most 5)
    const roundItems = page.locator('div:has-text("Competition") >> a[href*="/player/competitions/"]');
    const count = await roundItems.count();
    expect(count).toBeLessThanOrEqual(5);
    expect(count).toBeGreaterThan(0);

    // Verify round display format
    const firstRound = roundItems.first();
    await expect(firstRound).toBeVisible();

    // Should show competition name, course, date, scores
    await expect(firstRound.locator('text=/Competition/')).toBeVisible();
    await expect(firstRound.locator('text=/Test Golf Course/')).toBeVisible();
    await expect(firstRound.locator('text=/Gross:/')).toBeVisible();
  });

  // STEP 4: Navigate to profile
  await test.step("Navigate to profile page", async () => {
    await page.getByRole("link", { name: /My Profile/i }).click();
    await page.waitForLoadState("networkidle");
  });

  // STEP 5: Verify profile shows same round design
  await test.step("Verify profile displays recent rounds with same design", async () => {
    // Check for Recent Rounds section
    await expect(page.getByText("Recent Rounds")).toBeVisible();

    // Should show View All link
    await expect(page.getByRole("link", { name: /View All/i })).toBeVisible();

    // Should show round items
    const roundItems = page.locator('div:has-text("Competition") >> a[href*="/player/competitions/"]');
    const count = await roundItems.count();
    expect(count).toBeLessThanOrEqual(5);
    expect(count).toBeGreaterThan(0);

    // Verify same format as dashboard
    const firstRound = roundItems.first();
    await expect(firstRound.locator('text=/Gross:/')).toBeVisible();
  });

  // STEP 6: Click View All and verify all rounds page
  await test.step("Navigate to All Rounds page", async () => {
    await page.getByRole("link", { name: /View All/i }).click();
    await page.waitForLoadState("networkidle");

    // Verify we're on the all rounds page
    await expect(page).toHaveURL(/\/player\/rounds/);
    await expect(page.getByText("All Rounds")).toBeVisible();

    // Should show count
    await expect(page.getByText(/8 rounds/i)).toBeVisible();

    // Should show all 8 rounds (not just 5)
    const roundItems = page.locator('a[href*="/player/competitions/"]');
    const count = await roundItems.count();
    expect(count).toBe(8);

    // Verify same design/format
    const firstRound = roundItems.first();
    await expect(firstRound.locator('text=/Competition/')).toBeVisible();
    await expect(firstRound.locator('text=/Gross:/')).toBeVisible();
  });

  // STEP 7: Verify clicking a round navigates correctly
  await test.step("Verify round links work", async () => {
    const firstRound = page.locator('a[href*="/player/competitions/"]').first();
    await firstRound.click();
    await page.waitForLoadState("networkidle");

    // Should navigate to competition detail
    await expect(page).toHaveURL(/\/player\/competitions\/\d+/);
  });
});

test("should show empty state when no rounds exist", async ({
  page,
  server,
}) => {
  await test.step("Setup user without rounds", async () => {
    // Create user and login
    const user = await createUser(server.port, "noround@example.com", "password123", "No Rounds User");

    const loginResponse = await loginUser(server.port, "noround@example.com", "password123");
    const authCookie = loginResponse.cookie;

    // Create player profile
    await createPlayerProfile(server.port, authCookie, {
      display_name: "No Rounds Player",
    });

    await page.context().addCookies([
      {
        name: "auth_token",
        value: authCookie,
        domain: "localhost",
        path: "/",
      },
    ]);
  });

  await test.step("Verify empty state on all rounds page", async () => {
    await page.goto(`http://localhost:${server.port}/player/rounds`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("No Rounds Yet")).toBeVisible();
    await expect(page.getByText(/haven't played any competitions yet/i)).toBeVisible();
  });
});
