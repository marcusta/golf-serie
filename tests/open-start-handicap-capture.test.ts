import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  cleanupTestDatabase,
  expectJsonResponse,
  type MakeRequestFunction,
  setupTestDatabase,
} from "./test-helpers";

/**
 * Integration test for the complete open-start competition flow:
 * 1. Player registers for open-start competition
 * 2. Player enters first score -> handicap_index is captured
 * 3. Player completes round
 * 4. Competition is finalized
 * 5. Both gross and net results are stored correctly
 */
describe("Open-Start Competition - Handicap Capture and Net Scoring", () => {
  let db: Database;
  let makeRequest: MakeRequestFunction;

  beforeEach(async () => {
    const setup = await setupTestDatabase();
    db = setup.db;
    makeRequest = setup.makeRequest;
  });

  afterEach(async () => {
    await cleanupTestDatabase(db);
  });

  // ============================================================================
  // Test Helpers
  // ============================================================================

  async function createOrganizerUser(email = "organizer@test.com") {
    await makeRequest("/api/auth/register", "POST", {
      email,
      password: "password123",
    });
    db.prepare("UPDATE users SET role = 'ORGANIZER' WHERE email = ?").run(email);
    await makeRequest("/api/auth/login", "POST", {
      email,
      password: "password123",
    });
    const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: number };
    return { userId: user.id, email };
  }

  async function createPlayerUser(email: string) {
    await makeRequest("/api/auth/register", "POST", {
      email,
      password: "password123",
    });
    const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: number };
    return { userId: user.id, email };
  }

  async function loginAs(email: string) {
    await makeRequest("/api/auth/login", "POST", {
      email,
      password: "password123",
    });
  }

  function createCourseWithTee(name: string, pars: number[]) {
    // Create stroke index (holes ranked by difficulty)
    const strokeIndex = [1, 3, 5, 7, 9, 11, 13, 15, 17, 2, 4, 6, 8, 10, 12, 14, 16, 18];

    // Create course with stroke_index (stroke_index is now a course property)
    const course = db.prepare(`
      INSERT INTO courses (name, pars, stroke_index)
      VALUES (?, ?, ?)
      RETURNING id
    `).get(name, JSON.stringify(pars), JSON.stringify(strokeIndex)) as { id: number };

    // Create tee with ratings (stroke_index on tee is now ignored)
    const tee = db.prepare(`
      INSERT INTO course_tees (course_id, name, course_rating, slope_rating)
      VALUES (?, 'White', 72.0, 113)
      RETURNING id
    `).get(course.id) as { id: number };

    return { courseId: course.id, teeId: tee.id, pars };
  }

  async function createTourWithScoringMode(
    adminUserId: number,
    name: string,
    scoringMode: "gross" | "net" | "both"
  ) {
    const tour = db.prepare(`
      INSERT INTO tours (name, owner_id, enrollment_mode, visibility, scoring_mode)
      VALUES (?, ?, 'open', 'public', ?)
      RETURNING *
    `).get(name, adminUserId, scoringMode) as { id: number };
    return tour;
  }

  function createOpenStartCompetition(
    name: string,
    courseId: number,
    tourId: number,
    teeId: number
  ) {
    const now = new Date();
    const openStart = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(); // Yesterday
    const openEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // Next week

    const competition = db.prepare(`
      INSERT INTO competitions (name, date, course_id, tour_id, tee_id, start_mode, open_start, open_end)
      VALUES (?, ?, ?, ?, ?, 'open', ?, ?)
      RETURNING *
    `).get(name, now.toISOString().split("T")[0], courseId, tourId, teeId, openStart, openEnd) as {
      id: number;
    };

    return competition;
  }

  async function createPlayerWithHandicap(
    userId: number,
    name: string,
    handicap: number
  ) {
    const player = db.prepare(`
      INSERT INTO players (name, handicap, user_id, created_by)
      VALUES (?, ?, ?, ?)
      RETURNING id
    `).get(name, handicap, userId, userId) as { id: number };
    return player;
  }

  function enrollPlayerInTour(tourId: number, playerId: number, email: string) {
    db.prepare(`
      INSERT INTO tour_enrollments (tour_id, player_id, email, status)
      VALUES (?, ?, ?, 'active')
    `).run(tourId, playerId, email);
  }

  function getParticipant(participantId: number) {
    return db.prepare("SELECT * FROM participants WHERE id = ?").get(participantId) as {
      id: number;
      handicap_index: number | null;
      score: string;
      is_locked: number;
    } | null;
  }

  function getCompetitionResults(competitionId: number, scoringType: "gross" | "net") {
    return db.prepare(`
      SELECT * FROM competition_results
      WHERE competition_id = ? AND scoring_type = ?
    `).all(competitionId, scoringType) as Array<{
      id: number;
      participant_id: number;
      position: number;
      points: number;
      scoring_type: string;
    }>;
  }

  // ============================================================================
  // Tests
  // ============================================================================

  test("complete flow: register, enter scores, handicap captured, finalize, net results", async () => {
    // 1. Setup: Create admin, tour with scoring_mode='both', course, competition
    const admin = await createOrganizerUser("admin@test.com");
    const tour = await createTourWithScoringMode(admin.userId, "Net Test Tour", "both");

    const pars = [4, 4, 3, 5, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 3, 4, 5, 4]; // Par 72
    const { courseId, teeId } = createCourseWithTee("Test Course", pars);

    const competition = createOpenStartCompetition(
      "Round 1",
      courseId,
      tour.id,
      teeId
    );

    // 2. Create player user with handicap 15
    const playerUser = await createPlayerUser("player@test.com");
    const player = await createPlayerWithHandicap(playerUser.userId, "Test Player", 15.0);
    enrollPlayerInTour(tour.id, player.id, playerUser.email);

    // 3. Player logs in and registers for competition
    await loginAs(playerUser.email);

    const registerResponse = await makeRequest(
      `/api/competitions/${competition.id}/register`,
      "POST",
      { mode: "solo" }
    );
    expect(registerResponse.status).toBe(201);
    const registration = await registerResponse.json();
    expect(registration.registration).toBeDefined();
    expect(registration.registration.participant_id).toBeDefined();

    const participantId = registration.registration.participant_id;

    // 4. Verify handicap_index is NOT set yet (should be captured on first score entry)
    let participant = getParticipant(participantId);
    expect(participant).toBeDefined();
    expect(participant!.handicap_index).toBeNull();

    // 5. Player enters first score (hole 1)
    const scoreResponse = await makeRequest(
      `/api/participants/${participantId}/score`,
      "PUT",
      { hole: 1, shots: 5 }
    );
    expect(scoreResponse.status).toBe(200);

    // 6. Verify handicap_index IS NOW SET (captured on first score entry)
    participant = getParticipant(participantId);
    expect(participant).toBeDefined();
    expect(participant!.handicap_index).toBe(15.0);

    // 7. Complete the round (enter remaining 17 holes)
    // Score: all 5s = 90 gross, handicap 15 = 75 net
    for (let hole = 2; hole <= 18; hole++) {
      const resp = await makeRequest(
        `/api/participants/${participantId}/score`,
        "PUT",
        { hole, shots: 5 }
      );
      expect(resp.status).toBe(200);
    }

    // 8. Verify scores are complete
    participant = getParticipant(participantId);
    const scores = JSON.parse(participant!.score);
    expect(scores.length).toBe(18);
    expect(scores.every((s: number) => s === 5)).toBe(true);

    // 9. Lock the score (finish playing)
    await loginAs(admin.email); // Admin can lock
    const lockResponse = await makeRequest(
      `/api/participants/${participantId}/lock`,
      "POST"
    );
    expect(lockResponse.status).toBe(200);

    // 10. Finalize competition results
    const finalizeResponse = await makeRequest(
      `/api/competitions/${competition.id}/finalize`,
      "POST"
    );
    expect(finalizeResponse.status).toBe(200);

    // 11. Verify GROSS results exist
    const grossResults = getCompetitionResults(competition.id, "gross");
    expect(grossResults.length).toBe(1);
    expect(grossResults[0].participant_id).toBe(participantId);
    expect(grossResults[0].position).toBe(1);

    // 12. Verify NET results exist
    const netResults = getCompetitionResults(competition.id, "net");
    expect(netResults.length).toBe(1);
    expect(netResults[0].participant_id).toBe(participantId);
    expect(netResults[0].position).toBe(1);

    // 13. Verify leaderboard returns both gross and net points
    const leaderboardResponse = await makeRequest(
      `/api/competitions/${competition.id}/leaderboard/details`
    );
    expect(leaderboardResponse.status).toBe(200);
    const leaderboard = await leaderboardResponse.json();

    expect(leaderboard.entries.length).toBe(1);
    const entry = leaderboard.entries[0];

    // Gross: position 1, has points
    expect(entry.position).toBe(1);
    expect(entry.points).toBeGreaterThan(0);

    // Net: position 1, has net points
    expect(entry.netPosition).toBe(1);
    expect(entry.netPoints).toBeGreaterThan(0);
  });

  test("handicap is captured from tour enrollment playing_handicap if set", async () => {
    // Setup
    const admin = await createOrganizerUser("admin@test.com");
    const tour = await createTourWithScoringMode(admin.userId, "Test Tour", "both");

    const pars = [4, 4, 3, 5, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 3, 4, 5, 4];
    const { courseId, teeId } = createCourseWithTee("Test Course", pars);

    const competition = createOpenStartCompetition("Round 1", courseId, tour.id, teeId);

    // Create player with base handicap 15
    const playerUser = await createPlayerUser("player@test.com");
    const player = await createPlayerWithHandicap(playerUser.userId, "Test Player", 15.0);

    // Enroll with playing_handicap = 12 (tour-specific handicap)
    db.prepare(`
      INSERT INTO tour_enrollments (tour_id, player_id, email, status, playing_handicap)
      VALUES (?, ?, ?, 'active', 12.0)
    `).run(tour.id, player.id, playerUser.email);

    // Register
    await loginAs(playerUser.email);
    const registerResponse = await makeRequest(
      `/api/competitions/${competition.id}/register`,
      "POST",
      { mode: "solo" }
    );
    const registration = await registerResponse.json();
    const participantId = registration.registration.participant_id;

    // Enter first score
    await makeRequest(`/api/participants/${participantId}/score`, "PUT", { hole: 1, shots: 5 });

    // Verify playing_handicap (12) was captured, not base handicap (15)
    const participant = getParticipant(participantId);
    expect(participant!.handicap_index).toBe(12.0);
  });

  test("gross-only tour does not store net results", async () => {
    // Setup with gross-only tour
    const admin = await createOrganizerUser("admin@test.com");
    const tour = await createTourWithScoringMode(admin.userId, "Gross Only Tour", "gross");

    const pars = [4, 4, 3, 5, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 3, 4, 5, 4];
    const { courseId, teeId } = createCourseWithTee("Test Course", pars);

    const competition = createOpenStartCompetition("Round 1", courseId, tour.id, teeId);

    // Create and enroll player
    const playerUser = await createPlayerUser("player@test.com");
    const player = await createPlayerWithHandicap(playerUser.userId, "Test Player", 15.0);
    enrollPlayerInTour(tour.id, player.id, playerUser.email);

    // Register and complete round
    await loginAs(playerUser.email);
    const registerResponse = await makeRequest(
      `/api/competitions/${competition.id}/register`,
      "POST",
      { mode: "solo" }
    );
    const registration = await registerResponse.json();
    const participantId = registration.registration.participant_id;

    // Enter all scores
    for (let hole = 1; hole <= 18; hole++) {
      await makeRequest(`/api/participants/${participantId}/score`, "PUT", { hole, shots: 4 });
    }

    // Lock and finalize
    await loginAs(admin.email);
    await makeRequest(`/api/participants/${participantId}/lock`, "POST");
    await makeRequest(`/api/competitions/${competition.id}/finalize`, "POST");

    // Verify only gross results exist
    const grossResults = getCompetitionResults(competition.id, "gross");
    const netResults = getCompetitionResults(competition.id, "net");

    expect(grossResults.length).toBe(1);
    expect(netResults.length).toBe(0); // No net results for gross-only tour
  });

  test("net rankings differ from gross rankings based on handicap", async () => {
    // Setup
    const admin = await createOrganizerUser("admin@test.com");
    const tour = await createTourWithScoringMode(admin.userId, "Test Tour", "both");

    const pars = [4, 4, 3, 5, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 3, 4, 5, 4]; // Par 72
    const { courseId, teeId } = createCourseWithTee("Test Course", pars);

    const competition = createOpenStartCompetition("Round 1", courseId, tour.id, teeId);

    // Player 1: Scratch golfer (handicap 0), will shoot 72 (even par)
    const player1User = await createPlayerUser("scratch@test.com");
    const player1 = await createPlayerWithHandicap(player1User.userId, "Scratch Golfer", 0);
    enrollPlayerInTour(tour.id, player1.id, player1User.email);

    // Player 2: High handicapper (handicap 20), will shoot 85 (+13 gross, but -7 net)
    const player2User = await createPlayerUser("highhcp@test.com");
    const player2 = await createPlayerWithHandicap(player2User.userId, "High Handicapper", 20);
    enrollPlayerInTour(tour.id, player2.id, player2User.email);

    // Player 1 registers and completes round with even par (all 4s on par 4s, etc)
    await loginAs(player1User.email);
    let resp = await makeRequest(`/api/competitions/${competition.id}/register`, "POST", { mode: "solo" });
    const reg1 = await resp.json();
    const participant1Id = reg1.registration.participant_id;

    for (let hole = 0; hole < 18; hole++) {
      await makeRequest(`/api/participants/${participant1Id}/score`, "PUT", {
        hole: hole + 1,
        shots: pars[hole], // Shoot par on every hole = 72
      });
    }

    // Player 2 registers and completes round with +13 gross (85)
    await loginAs(player2User.email);
    resp = await makeRequest(`/api/competitions/${competition.id}/register`, "POST", { mode: "solo" });
    const reg2 = await resp.json();
    const participant2Id = reg2.registration.participant_id;

    for (let hole = 0; hole < 18; hole++) {
      // Shoot about +13 over par: mostly bogeys with some doubles
      const shots = pars[hole] + (hole < 13 ? 1 : 0); // First 13 holes +1, rest par
      await makeRequest(`/api/participants/${participant2Id}/score`, "PUT", {
        hole: hole + 1,
        shots,
      });
    }

    // Lock and finalize
    await loginAs(admin.email);
    await makeRequest(`/api/participants/${participant1Id}/lock`, "POST");
    await makeRequest(`/api/participants/${participant2Id}/lock`, "POST");
    await makeRequest(`/api/competitions/${competition.id}/finalize`, "POST");

    // Check results
    const grossResults = getCompetitionResults(competition.id, "gross");
    const netResults = getCompetitionResults(competition.id, "net");

    // Gross: Scratch golfer wins (72 < 85)
    const grossP1 = grossResults.find(r => r.participant_id === participant1Id);
    const grossP2 = grossResults.find(r => r.participant_id === participant2Id);
    expect(grossP1!.position).toBe(1);
    expect(grossP2!.position).toBe(2);

    // Net: High handicapper wins (85-20=65 < 72-0=72)
    const netP1 = netResults.find(r => r.participant_id === participant1Id);
    const netP2 = netResults.find(r => r.participant_id === participant2Id);
    expect(netP2!.position).toBe(1); // High handicapper wins net
    expect(netP1!.position).toBe(2); // Scratch golfer is 2nd in net

    // Verify leaderboard shows different points for gross vs net
    const leaderboardResp = await makeRequest(`/api/competitions/${competition.id}/leaderboard/details`);
    const leaderboard = await leaderboardResp.json();

    const entry1 = leaderboard.entries.find((e: any) => e.participant.id === participant1Id);
    const entry2 = leaderboard.entries.find((e: any) => e.participant.id === participant2Id);

    // Scratch golfer: 1st gross points, 2nd net points
    expect(entry1.position).toBe(1);
    expect(entry1.netPosition).toBe(2);
    expect(entry1.points).toBeGreaterThan(entry1.netPoints);

    // High handicapper: 2nd gross points, 1st net points
    expect(entry2.position).toBe(2);
    expect(entry2.netPosition).toBe(1);
    expect(entry2.netPoints).toBeGreaterThan(entry2.points);
  });
});
