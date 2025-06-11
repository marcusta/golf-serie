import { expect, test } from "./test-fixtures";
import {
  createCompetition,
  createCourse,
  createParticipant,
  createTeam,
  createTeeTime,
} from "./test-helpers";

let competition: { id: number };

test.beforeEach(async ({ server }) => {
  // Setup data once before each test in this file
  const course = await createCourse(
    server.port,
    "Detail Page Course",
    Array(18).fill(4)
  );
  const team = await createTeam(server.port, "Detail Page Team");
  competition = await createCompetition(
    server.port,
    "Competition Detail Page Test",
    "2025-07-20",
    course.id
  );
  const teeTime = await createTeeTime(server.port, competition.id, "09:00");
  await createParticipant(server.port, {
    tee_time_id: teeTime.id,
    team_id: team.id,
    position_name: "Player 1",
    tee_order: 1,
  });
});

test("should load competition details and allow tab navigation", async ({
  page,
  server,
}) => {
  // Configure frontend to use isolated backend
  await page.addInitScript((port) => {
    window.localStorage.setItem("E2E_API_PORT", port.toString());
  }, server.port);

  // Navigate to the competition detail page
  await page.goto(`/player/competitions/${competition.id}`);

  // Wait for page to load
  await page.waitForLoadState("networkidle");

  // 1. Verify the main page content is visible
  await expect(
    page.getByRole("heading", { name: "Competition Detail Page Test" })
  ).toBeVisible();
  await expect(page.getByText("Start List")).toBeVisible();

  // 2. Click on the Leaderboard tab and verify its content appears
  await page.getByRole("button", { name: "Leaderboard" }).click();
  await expect(
    page.getByRole("heading", { name: "Leaderboard" })
  ).toBeVisible();

  // 3. Click on the Team Result tab and verify its content appears
  await page.getByRole("button", { name: "Team Result" }).click();
  await expect(
    page.getByRole("heading", { name: "Team Results" })
  ).toBeVisible();

  // 4. Go back to the Start List and verify it works
  await page.getByRole("button", { name: "Start List" }).click();
  await expect(page.getByText("09:00")).toBeVisible();
});
