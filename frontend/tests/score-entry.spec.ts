// frontend/tests/score-entry.spec.ts
import { expect, test } from "./test-fixtures";
import {
  createCompetition,
  createCourse,
  createParticipant,
  createTeam,
  createTeeTime,
} from "./test-helpers";

test("should allow entering a score for a player using an isolated backend", async ({
  page,
  server, // Use the new server fixture
}) => {
  let competition: {
    id: number;
    name: string;
    date: string;
    course_id: number;
  };
  let teeTime: { id: number; competition_id: number; teetime: string };

  // STEP 1: SETUP TEST DATA
  await test.step("Setup test data via API", async () => {
    const course = await createCourse(
      server.port,
      "E2E Test Course",
      Array(18).fill(4)
    );
    const team1 = await createTeam(server.port, "Team Alpha");
    const team2 = await createTeam(server.port, "Team Bravo");
    competition = await createCompetition(
      server.port,
      "E2E Main Competition",
      "2025-07-15",
      course.id
    );
    teeTime = await createTeeTime(server.port, competition.id, "10:00");

    await createParticipant(server.port, {
      tee_time_id: teeTime.id,
      team_id: team1.id,
      position_name: "Player 1",
      tee_order: 1,
    });
    await createParticipant(server.port, {
      tee_time_id: teeTime.id,
      team_id: team2.id,
      position_name: "Player 2",
      tee_order: 2,
    });
  });

  // STEP 2: TEST UI INTERACTIONS
  await test.step("Perform score entry in the UI", async () => {
    // Configure frontend to use isolated backend
    await page.addInitScript((port) => {
      window.localStorage.setItem("E2E_API_PORT", port.toString());
    }, server.port);

    // Navigate to the score entry page
    await page.goto(
      `/player/competitions/${competition.id}/tee-times/${teeTime.id}`
    );

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Wait for the competition title to appear (confirms page loaded)
    await expect(page.getByText("E2E Main Competition")).toBeVisible();

    // Look for circular score buttons - they are rounded buttons with specific classes
    const scoreButtons = page.locator("button.w-12.h-12.rounded-full");
    await expect(scoreButtons.first()).toBeVisible();

    console.log("Circular score buttons found:", await scoreButtons.count());

    // Verify the first score button shows "0" initially
    await expect(scoreButtons.first()).toContainText("0");

    // Click the first score button (should open the custom keyboard)
    await scoreButtons.first().click();

    // Wait for the custom keyboard to appear - look for the hole information header
    // The keyboard header should show "Hole 1 | Par 4"
    await expect(page.getByText("Hole 1 | Par 4")).toBeVisible();

    // Take a screenshot to see the keyboard
    await page.screenshot({
      path: "test-results/keyboard-visible.png",
      fullPage: true,
    });

    // Look for the "4" button on the custom keyboard
    // It should be a button with "4" text and "PAR" label underneath
    const parButton = page.locator("button").filter({ hasText: "4" }).first();
    await expect(parButton).toBeVisible();

    // Click the "4" button
    await parButton.click();

    // Verify the score was updated - the first score button should now show "4"
    await expect(scoreButtons.first()).toContainText("4");

    // Take a final screenshot to confirm score is updated
    await page.screenshot({
      path: "test-results/score-updated.png",
      fullPage: true,
    });

    console.log("Test completed successfully!");
  });
});
