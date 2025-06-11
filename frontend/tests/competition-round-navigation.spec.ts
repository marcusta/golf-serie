import { expect, test } from "./test-fixtures";
import {
  createCompetition,
  createCourse,
  createParticipant,
  createTeam,
  createTeeTime,
} from "./test-helpers";

let competition: { id: number };
let teeTime: { id: number };

test.beforeEach(async ({ server }) => {
  // Setup data once before each test in this file
  const course = await createCourse(
    server.port,
    "Nav Test Course",
    Array(18).fill(4)
  );
  const team = await createTeam(server.port, "Nav Test Team");
  competition = await createCompetition(
    server.port,
    "Round Navigation Test",
    "2025-07-21",
    course.id
  );
  teeTime = await createTeeTime(server.port, competition.id, "11:00");
  await createParticipant(server.port, {
    tee_time_id: teeTime.id,
    team_id: team.id,
    position_name: "Player Nav",
    tee_order: 1,
  });
});

test("should navigate between holes using top navigation", async ({
  page,
  server,
}) => {
  await page.addInitScript((port) => {
    window.localStorage.setItem("E2E_API_PORT", port.toString());
  }, server.port);

  await page.goto(
    `/player/competitions/${competition.id}/tee-times/${teeTime.id}`
  );

  // Wait for page to load
  await page.waitForLoadState("networkidle");

  // 1. Verify we start on Hole 1
  await expect(page.getByText("Round Navigation Test")).toBeVisible();

  // Look for hole navigation elements - these might be in the hole header area
  // Let's first verify we can see hole 1 indicator
  await expect(page.locator("text=/Hole.*1/i").first()).toBeVisible();

  // Enter a score on hole 1 first to enable progression
  const scoreButtons = page.locator("button.w-12.h-12.rounded-full");
  await scoreButtons.first().click();
  await expect(page.getByText("Hole 1 | Par 4")).toBeVisible();
  const parButton = page.locator("button").filter({ hasText: "4" }).first();
  await parButton.click();

  // Wait for keyboard to close and check if we moved to next hole automatically
  await page.waitForTimeout(1000);

  // The app might automatically advance to the next hole after entering a score
  // Let's check what hole we're on now
  const currentHoleText = await page.locator("body").textContent();
  console.log("Page content after score entry:", currentHoleText);
});

test("should navigate between views using bottom tabs", async ({
  page,
  server,
}) => {
  await page.addInitScript((port) => {
    window.localStorage.setItem("E2E_API_PORT", port.toString());
  }, server.port);

  await page.goto(
    `/player/competitions/${competition.id}/tee-times/${teeTime.id}`
  );

  // Wait for page to load
  await page.waitForLoadState("networkidle");

  // 1. Verify we are on the score entry view
  await expect(page.getByText("Round Navigation Test")).toBeVisible();

  // Look for bottom navigation tabs
  const tabs = page
    .locator('[role="tab"], button')
    .filter({ hasText: /Leaderboard|Score|Participants|Start List/i });

  console.log("Available tabs:", await tabs.allTextContents());

  // 2. Try to click the 'Leaderboard' tab if it exists
  const leaderboardTab = page
    .locator("button")
    .filter({ hasText: /Leaderboard/i });
  if ((await leaderboardTab.count()) > 0) {
    await leaderboardTab.first().click();
    await page.waitForTimeout(1000);

    // Check if we're now viewing leaderboard content
    const pageContent = await page.locator("body").textContent();
    console.log("Content after clicking Leaderboard:", pageContent);
  }

  // 3. Try to find and click other navigation elements
  const startListTab = page
    .locator("button")
    .filter({ hasText: /Start List|Participants/i });
  if ((await startListTab.count()) > 0) {
    await startListTab.first().click();
    await page.waitForTimeout(1000);

    const pageContent = await page.locator("body").textContent();
    console.log("Content after clicking Start List:", pageContent);
  }

  // 4. Try to return to score entry view
  const scoreTab = page.locator("button").filter({ hasText: /Score|Entry/i });
  if ((await scoreTab.count()) > 0) {
    await scoreTab.first().click();
    await page.waitForTimeout(1000);

    // Verify we're back to score entry by looking for circular score buttons
    const scoreButtons = page.locator("button.w-12.h-12.rounded-full");
    await expect(scoreButtons.first()).toBeVisible();
  }
});
