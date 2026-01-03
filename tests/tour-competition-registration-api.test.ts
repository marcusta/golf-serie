import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  cleanupTestDatabase,
  expectErrorResponse,
  expectJsonResponse,
  type MakeRequestFunction,
  setupTestDatabase,
} from "./test-helpers";

describe("Tour Competition Registration API", () => {
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

  // Helper to create course with default pars
  function createCourse(name: string): { id: number } {
    const pars = JSON.stringify([4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4]);
    db.prepare("INSERT INTO courses (name, pars) VALUES (?, ?)").run(name, pars);
    return db.prepare("SELECT id FROM courses WHERE name = ?").get(name) as { id: number };
  }

  // Helper to create an open-start competition
  function createOpenCompetition(
    name: string,
    tourId: number,
    courseId: number
  ): { id: number } {
    const now = new Date();
    const openStart = new Date(now.getTime() - 1000 * 60 * 60).toISOString(); // 1 hour ago
    const openEnd = new Date(now.getTime() + 1000 * 60 * 60 * 24).toISOString(); // 24 hours from now

    db.prepare(
      `INSERT INTO competitions (name, date, course_id, tour_id, start_mode, open_start, open_end)
       VALUES (?, ?, ?, ?, 'open', ?, ?)`
    ).run(name, "2025-12-25", courseId, tourId, openStart, openEnd);
    return db.prepare("SELECT id FROM competitions WHERE name = ?").get(name) as { id: number };
  }

  // Helper to setup organizer, tour, enrollment and player
  async function setupTourWithEnrolledPlayer() {
    // Create organizer and tour
    await makeRequest("/api/auth/register", "POST", {
      email: "organizer@test.com",
      password: "password123",
    });
    db.prepare("UPDATE users SET role = 'ORGANIZER' WHERE email = ?").run("organizer@test.com");
    await makeRequest("/api/auth/login", "POST", {
      email: "organizer@test.com",
      password: "password123",
    });

    const tourResponse = await makeRequest("/api/tours", "POST", {
      name: "Test Tour",
    });
    const tour = await tourResponse.json();

    const course = createCourse("Test Course");
    const competition = createOpenCompetition("Round 1", tour.id, course.id);

    // Logout admin
    await makeRequest("/api/auth/logout", "POST");

    // Create player user
    await makeRequest("/api/auth/register", "POST", {
      email: "player@test.com",
      password: "password123",
    });
    await makeRequest("/api/auth/login", "POST", {
      email: "player@test.com",
      password: "password123",
    });

    const user = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get("player@test.com") as { id: number };

    // Create player linked to user
    db.prepare(
      "INSERT INTO players (name, handicap, user_id, created_by) VALUES (?, ?, ?, ?)"
    ).run("Test Player", 15, user.id, user.id);
    const player = db
      .prepare("SELECT id FROM players WHERE user_id = ?")
      .get(user.id) as { id: number };

    // Create active enrollment
    db.prepare(
      "INSERT INTO tour_enrollments (tour_id, email, status, player_id) VALUES (?, ?, 'active', ?)"
    ).run(tour.id, "player@test.com", player.id);

    return { tour, competition, player, course, user };
  }

  describe("POST /api/competitions/:id/register", () => {
    test("should allow enrolled player to register in solo mode", async () => {
      const { competition } = await setupTourWithEnrolledPlayer();

      const response = await makeRequest(
        `/api/competitions/${competition.id}/register`,
        "POST",
        { mode: "solo" }
      );

      const result = await expectJsonResponse(response);
      expect(response.status).toBe(201);
      expect(result.registration).toBeDefined();
      expect(result.registration.status).toBe("registered");
      expect(result.group).toBeDefined();
      expect(result.group.players.length).toBe(1);
    });

    test("should allow enrolled player to register in looking_for_group mode", async () => {
      const { competition } = await setupTourWithEnrolledPlayer();

      const response = await makeRequest(
        `/api/competitions/${competition.id}/register`,
        "POST",
        { mode: "looking_for_group" }
      );

      const result = await expectJsonResponse(response);
      expect(response.status).toBe(201);
      expect(result.registration.status).toBe("looking_for_group");
      expect(result.group).toBeUndefined(); // No group for LFG mode
    });

    test("should allow enrolled player to register in create_group mode", async () => {
      const { competition } = await setupTourWithEnrolledPlayer();

      const response = await makeRequest(
        `/api/competitions/${competition.id}/register`,
        "POST",
        { mode: "create_group" }
      );

      const result = await expectJsonResponse(response);
      expect(response.status).toBe(201);
      expect(result.registration.status).toBe("registered");
      expect(result.registration.group_created_by).toBeDefined();
    });

    test("should require authentication", async () => {
      const { competition } = await setupTourWithEnrolledPlayer();
      await makeRequest("/api/auth/logout", "POST");

      const response = await makeRequest(
        `/api/competitions/${competition.id}/register`,
        "POST",
        { mode: "solo" }
      );

      expectErrorResponse(response, 401);
    });

    test("should reject user without player profile", async () => {
      // Setup with admin only - no player profile
      await makeRequest("/api/auth/register", "POST", {
        email: "noplayer@test.com",
        password: "password123",
      });
      await makeRequest("/api/auth/login", "POST", {
        email: "noplayer@test.com",
        password: "password123",
      });

      const response = await makeRequest(
        "/api/competitions/1/register",
        "POST",
        { mode: "solo" }
      );

      expectErrorResponse(response, 400);
      const error = await response.json();
      expect(error.error).toContain("player profile");
    });

    test("should reject invalid mode", async () => {
      const { competition } = await setupTourWithEnrolledPlayer();

      const response = await makeRequest(
        `/api/competitions/${competition.id}/register`,
        "POST",
        { mode: "invalid_mode" }
      );

      expectErrorResponse(response, 400);
    });

    test("should reject non-enrolled player", async () => {
      const { competition } = await setupTourWithEnrolledPlayer();
      await makeRequest("/api/auth/logout", "POST");

      // Create another user with player but not enrolled
      await makeRequest("/api/auth/register", "POST", {
        email: "notenrolled@test.com",
        password: "password123",
      });
      await makeRequest("/api/auth/login", "POST", {
        email: "notenrolled@test.com",
        password: "password123",
      });
      const user = db
        .prepare("SELECT id FROM users WHERE email = ?")
        .get("notenrolled@test.com") as { id: number };
      db.prepare(
        "INSERT INTO players (name, handicap, user_id, created_by) VALUES (?, ?, ?, ?)"
      ).run("Not Enrolled", 20, user.id, user.id);

      const response = await makeRequest(
        `/api/competitions/${competition.id}/register`,
        "POST",
        { mode: "solo" }
      );

      expectErrorResponse(response, 400);
      const error = await response.json();
      expect(error.error).toContain("not enrolled");
    });

    test("should reject duplicate registration", async () => {
      const { competition } = await setupTourWithEnrolledPlayer();

      // First registration
      await makeRequest(
        `/api/competitions/${competition.id}/register`,
        "POST",
        { mode: "solo" }
      );

      // Second registration
      const response = await makeRequest(
        `/api/competitions/${competition.id}/register`,
        "POST",
        { mode: "solo" }
      );

      expectErrorResponse(response, 400);
      const error = await response.json();
      expect(error.error).toContain("already registered");
    });
  });

  describe("DELETE /api/competitions/:id/register", () => {
    test("should allow player to withdraw", async () => {
      const { competition } = await setupTourWithEnrolledPlayer();

      // Register first
      await makeRequest(
        `/api/competitions/${competition.id}/register`,
        "POST",
        { mode: "solo" }
      );

      // Withdraw
      const response = await makeRequest(
        `/api/competitions/${competition.id}/register`,
        "DELETE"
      );

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);
    });

    test("should require authentication", async () => {
      const { competition } = await setupTourWithEnrolledPlayer();
      await makeRequest(
        `/api/competitions/${competition.id}/register`,
        "POST",
        { mode: "solo" }
      );
      await makeRequest("/api/auth/logout", "POST");

      const response = await makeRequest(
        `/api/competitions/${competition.id}/register`,
        "DELETE"
      );

      expectErrorResponse(response, 401);
    });

    test("should return 404 for non-existent registration", async () => {
      const { competition } = await setupTourWithEnrolledPlayer();

      const response = await makeRequest(
        `/api/competitions/${competition.id}/register`,
        "DELETE"
      );

      expectErrorResponse(response, 404);
    });
  });

  describe("GET /api/competitions/:id/my-registration", () => {
    test("should return registration when registered", async () => {
      const { competition } = await setupTourWithEnrolledPlayer();

      await makeRequest(
        `/api/competitions/${competition.id}/register`,
        "POST",
        { mode: "solo" }
      );

      const response = await makeRequest(
        `/api/competitions/${competition.id}/my-registration`
      );

      const result = await expectJsonResponse(response);
      expect(result.registered).toBe(true);
      expect(result.registration).toBeDefined();
      expect(result.group).toBeDefined();
    });

    test("should return not registered when not registered", async () => {
      const { competition } = await setupTourWithEnrolledPlayer();

      const response = await makeRequest(
        `/api/competitions/${competition.id}/my-registration`
      );

      const result = await expectJsonResponse(response);
      expect(result.registered).toBe(false);
      expect(result.registration).toBeNull();
    });

    test("should require authentication", async () => {
      const { competition } = await setupTourWithEnrolledPlayer();
      await makeRequest("/api/auth/logout", "POST");

      const response = await makeRequest(
        `/api/competitions/${competition.id}/my-registration`
      );

      expectErrorResponse(response, 401);
    });
  });

  describe("GET /api/competitions/:id/available-players", () => {
    test("should list enrolled players with their status", async () => {
      const { competition, tour, player } = await setupTourWithEnrolledPlayer();

      // Add another enrolled player directly
      db.prepare(
        "INSERT INTO players (name, handicap) VALUES (?, ?)"
      ).run("Other Player", 12);
      const otherPlayer = db
        .prepare("SELECT id FROM players WHERE name = ?")
        .get("Other Player") as { id: number };
      db.prepare(
        "INSERT INTO tour_enrollments (tour_id, email, status, player_id) VALUES (?, ?, 'active', ?)"
      ).run(tour.id, "other@test.com", otherPlayer.id);

      const response = await makeRequest(
        `/api/competitions/${competition.id}/available-players`
      );

      const players = await expectJsonResponse(response);
      expect(Array.isArray(players)).toBe(true);
      expect(players.length).toBe(2);
      // Both should be available since neither has registered
      expect(players.every((p: any) => p.status === "available")).toBe(true);
    });

    test("should show registered player status", async () => {
      const { competition, player } = await setupTourWithEnrolledPlayer();

      // Register the player
      await makeRequest(
        `/api/competitions/${competition.id}/register`,
        "POST",
        { mode: "looking_for_group" }
      );

      const response = await makeRequest(
        `/api/competitions/${competition.id}/available-players`
      );

      const players = await expectJsonResponse(response);
      const registeredPlayer = players.find((p: any) => p.player_id === player.id);
      expect(registeredPlayer.status).toBe("looking_for_group");
    });

    test("should require authentication", async () => {
      const { competition } = await setupTourWithEnrolledPlayer();
      await makeRequest("/api/auth/logout", "POST");

      const response = await makeRequest(
        `/api/competitions/${competition.id}/available-players`
      );

      expectErrorResponse(response, 401);
    });
  });

  describe("POST /api/competitions/:id/group/add", () => {
    test("should add another player to group", async () => {
      const { competition, tour } = await setupTourWithEnrolledPlayer();

      // Add another enrolled player
      db.prepare(
        "INSERT INTO players (name, handicap) VALUES (?, ?)"
      ).run("Other Player", 12);
      const otherPlayer = db
        .prepare("SELECT id FROM players WHERE name = ?")
        .get("Other Player") as { id: number };
      db.prepare(
        "INSERT INTO tour_enrollments (tour_id, email, status, player_id) VALUES (?, ?, 'active', ?)"
      ).run(tour.id, "other@test.com", otherPlayer.id);

      // Register first
      await makeRequest(
        `/api/competitions/${competition.id}/register`,
        "POST",
        { mode: "create_group" }
      );

      // Add other player to group
      const response = await makeRequest(
        `/api/competitions/${competition.id}/group/add`,
        "POST",
        { playerIds: [otherPlayer.id] }
      );

      const group = await expectJsonResponse(response);
      expect(group.players.length).toBe(2);
    });

    test("should reject when not registered", async () => {
      const { competition } = await setupTourWithEnrolledPlayer();

      const response = await makeRequest(
        `/api/competitions/${competition.id}/group/add`,
        "POST",
        { playerIds: [999] }
      );

      expectErrorResponse(response, 400);
    });

    test("should reject exceeding max group size", async () => {
      const { competition, tour } = await setupTourWithEnrolledPlayer();

      // Register
      await makeRequest(
        `/api/competitions/${competition.id}/register`,
        "POST",
        { mode: "create_group" }
      );

      // Try to add 5 more players (would exceed 4 max)
      const playerIds: number[] = [];
      for (let i = 0; i < 5; i++) {
        db.prepare(
          "INSERT INTO players (name, handicap) VALUES (?, ?)"
        ).run(`Player ${i}`, 10 + i);
        const p = db
          .prepare("SELECT id FROM players WHERE name = ?")
          .get(`Player ${i}`) as { id: number };
        db.prepare(
          "INSERT INTO tour_enrollments (tour_id, email, status, player_id) VALUES (?, ?, 'active', ?)"
        ).run(tour.id, `player${i}@test.com`, p.id);
        playerIds.push(p.id);
      }

      const response = await makeRequest(
        `/api/competitions/${competition.id}/group/add`,
        "POST",
        { playerIds }
      );

      expectErrorResponse(response, 400);
      const error = await response.json();
      expect(error.error).toContain("exceed");
    });
  });

  describe("POST /api/competitions/:id/group/remove", () => {
    test("should remove player from group", async () => {
      const { competition, tour } = await setupTourWithEnrolledPlayer();

      // Add another enrolled player
      db.prepare(
        "INSERT INTO players (name, handicap) VALUES (?, ?)"
      ).run("Other Player", 12);
      const otherPlayer = db
        .prepare("SELECT id FROM players WHERE name = ?")
        .get("Other Player") as { id: number };
      db.prepare(
        "INSERT INTO tour_enrollments (tour_id, email, status, player_id) VALUES (?, ?, 'active', ?)"
      ).run(tour.id, "other@test.com", otherPlayer.id);

      // Register and add other player
      await makeRequest(
        `/api/competitions/${competition.id}/register`,
        "POST",
        { mode: "create_group" }
      );
      await makeRequest(
        `/api/competitions/${competition.id}/group/add`,
        "POST",
        { playerIds: [otherPlayer.id] }
      );

      // Remove other player
      const response = await makeRequest(
        `/api/competitions/${competition.id}/group/remove`,
        "POST",
        { playerId: otherPlayer.id }
      );

      const group = await expectJsonResponse(response);
      expect(group.players.length).toBe(1);
    });

    test("should reject removing self (use leave instead)", async () => {
      const { competition, player } = await setupTourWithEnrolledPlayer();

      await makeRequest(
        `/api/competitions/${competition.id}/register`,
        "POST",
        { mode: "solo" }
      );

      const response = await makeRequest(
        `/api/competitions/${competition.id}/group/remove`,
        "POST",
        { playerId: player.id }
      );

      expectErrorResponse(response, 400);
      const error = await response.json();
      expect(error.error).toContain("leaveGroup");
    });
  });

  describe("POST /api/competitions/:id/group/leave", () => {
    test("should allow player to leave group", async () => {
      const { competition, tour } = await setupTourWithEnrolledPlayer();

      // Add another enrolled player
      db.prepare(
        "INSERT INTO players (name, handicap) VALUES (?, ?)"
      ).run("Other Player", 12);
      const otherPlayer = db
        .prepare("SELECT id FROM players WHERE name = ?")
        .get("Other Player") as { id: number };
      db.prepare(
        "INSERT INTO tour_enrollments (tour_id, email, status, player_id) VALUES (?, ?, 'active', ?)"
      ).run(tour.id, "other@test.com", otherPlayer.id);

      // Register
      await makeRequest(
        `/api/competitions/${competition.id}/register`,
        "POST",
        { mode: "create_group" }
      );

      // Add other player
      await makeRequest(
        `/api/competitions/${competition.id}/group/add`,
        "POST",
        { playerIds: [otherPlayer.id] }
      );

      // Leave group
      const response = await makeRequest(
        `/api/competitions/${competition.id}/group/leave`,
        "POST"
      );

      const group = await expectJsonResponse(response);
      expect(group.players.length).toBe(1); // Solo now
    });
  });

  describe("GET /api/competitions/:id/group", () => {
    test("should return current group", async () => {
      const { competition } = await setupTourWithEnrolledPlayer();

      await makeRequest(
        `/api/competitions/${competition.id}/register`,
        "POST",
        { mode: "solo" }
      );

      const response = await makeRequest(
        `/api/competitions/${competition.id}/group`
      );

      const group = await expectJsonResponse(response);
      expect(group.tee_time_id).toBeDefined();
      expect(group.players).toBeDefined();
      expect(group.max_players).toBe(4);
    });

    test("should return 404 when not registered", async () => {
      const { competition } = await setupTourWithEnrolledPlayer();

      const response = await makeRequest(
        `/api/competitions/${competition.id}/group`
      );

      expectErrorResponse(response, 404);
    });
  });

  describe("POST /api/competitions/:id/start-playing", () => {
    test("should mark player as playing", async () => {
      const { competition } = await setupTourWithEnrolledPlayer();

      await makeRequest(
        `/api/competitions/${competition.id}/register`,
        "POST",
        { mode: "solo" }
      );

      const response = await makeRequest(
        `/api/competitions/${competition.id}/start-playing`,
        "POST"
      );

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);

      // Verify status changed
      const regResponse = await makeRequest(
        `/api/competitions/${competition.id}/my-registration`
      );
      const reg = await regResponse.json();
      expect(reg.registration.status).toBe("playing");
    });

    test("should reject when not registered", async () => {
      const { competition } = await setupTourWithEnrolledPlayer();

      const response = await makeRequest(
        `/api/competitions/${competition.id}/start-playing`,
        "POST"
      );

      expectErrorResponse(response, 400);
    });
  });

  describe("GET /api/player/active-rounds", () => {
    test("should return active rounds for player", async () => {
      const { competition } = await setupTourWithEnrolledPlayer();

      await makeRequest(
        `/api/competitions/${competition.id}/register`,
        "POST",
        { mode: "solo" }
      );

      const response = await makeRequest("/api/player/active-rounds");

      const rounds = await expectJsonResponse(response);
      expect(Array.isArray(rounds)).toBe(true);
      expect(rounds.length).toBe(1);
      expect(rounds[0].competition_id).toBe(competition.id);
    });

    test("should return empty array when no active rounds", async () => {
      await setupTourWithEnrolledPlayer();

      const response = await makeRequest("/api/player/active-rounds");

      const rounds = await expectJsonResponse(response);
      expect(Array.isArray(rounds)).toBe(true);
      expect(rounds.length).toBe(0);
    });

    test("should require authentication", async () => {
      await setupTourWithEnrolledPlayer();
      await makeRequest("/api/auth/logout", "POST");

      const response = await makeRequest("/api/player/active-rounds");

      expectErrorResponse(response, 401);
    });
  });
});
