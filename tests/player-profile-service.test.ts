import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  cleanupTestDatabase,
  expectErrorResponse,
  expectJsonResponse,
  type MakeRequestFunction,
  setupTestDatabase,
} from "./test-helpers";

describe("Player Profile Service", () => {
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

  // Helper to create an authenticated user with a player profile
  // Note: Registration now automatically creates a player profile, so we:
  // 1. Register with profile data (name, handicap)
  // 2. Get the player ID from the "me" endpoint
  async function createAuthenticatedPlayer(
    email: string,
    playerName: string,
    handicap = 10
  ): Promise<{ playerId: number; userId: number }> {
    // Register with profile data - this automatically creates the player
    await makeRequest("/api/auth/register", "POST", {
      email,
      password: "password123",
      display_name: playerName,
      handicap,
    });
    await makeRequest("/api/auth/login", "POST", {
      email,
      password: "password123",
    });

    // Get user and player info from session
    const meRes = await makeRequest("/api/auth/me");
    const me = await meRes.json();

    // Get the automatically created player
    const playerRes = await makeRequest("/api/players/me");
    const player = await playerRes.json();

    return { playerId: player.id, userId: me.id };
  }

  // Helper to create a course
  async function createCourse(name: string): Promise<number> {
    const res = await makeRequest("/api/courses", "POST", { name });
    const course = await res.json();
    return course.id;
  }

  // Helper to create a club
  async function createClub(name: string): Promise<number> {
    const res = await makeRequest("/api/clubs", "POST", { name });
    const club = await res.json();
    return club.id;
  }

  // Helper to create a tour
  async function createTour(name: string): Promise<number> {
    const res = await makeRequest("/api/tours", "POST", {
      name,
      description: "Test tour",
      scoring_mode: "gross",
      enrollment_mode: "admin_only",
    });
    const tour = await res.json();
    return tour.id;
  }

  describe("GET /api/players/me/profile - Own Full Profile", () => {
    test("should return full profile for authenticated user with player", async () => {
      const { playerId } = await createAuthenticatedPlayer(
        "player@test.com",
        "Tiger Woods",
        5.2
      );

      const response = await makeRequest("/api/players/me/profile");
      expect(response.status).toBe(200);

      const profile = await response.json();
      expect(profile.id).toBe(playerId);
      expect(profile.name).toBe("Tiger Woods");
      expect(profile.handicap).toBe(5.2);
      expect(profile.visibility).toBe("public");
      expect(profile.competitions_played).toBe(0);
      expect(profile.total_rounds).toBe(0);
      expect(profile.handicap_history).toBeArray();
    });

    test("should return profile for user registered without explicit player data", async () => {
      // Registration now automatically creates a player profile
      await makeRequest("/api/auth/register", "POST", {
        email: "noPlayer@test.com",
        password: "password123",
      });
      await makeRequest("/api/auth/login", "POST", {
        email: "noPlayer@test.com",
        password: "password123",
      });

      const response = await makeRequest("/api/players/me/profile");
      expect(response.status).toBe(200);

      const profile = await response.json();
      // User should have an auto-created player with name derived from email
      // The name is extracted from the email (part before @) and preserves original casing
      expect(profile.name).toBe("noPlayer");
      expect(profile.visibility).toBe("public");
    });

    test("should require authentication", async () => {
      const response = await makeRequest("/api/players/me/profile");
      expectErrorResponse(response, 401);
    });
  });

  describe("PUT /api/players/me/profile - Update Own Profile", () => {
    test("should update profile display name and bio", async () => {
      await createAuthenticatedPlayer("player@test.com", "Tiger Woods");

      const response = await makeRequest("/api/players/me/profile", "PUT", {
        display_name: "The Tiger",
        bio: "Professional golfer",
      });

      expect(response.status).toBe(200);
      const profile = await response.json();
      expect(profile.display_name).toBe("The Tiger");
      expect(profile.bio).toBe("Professional golfer");
    });

    test("should update profile visibility", async () => {
      await createAuthenticatedPlayer("player@test.com", "Tiger Woods");

      const response = await makeRequest("/api/players/me/profile", "PUT", {
        visibility: "private",
      });

      expect(response.status).toBe(200);
      const profile = await response.json();
      expect(profile.visibility).toBe("private");
    });

    test("should update home club", async () => {
      await createAuthenticatedPlayer("player@test.com", "Tiger Woods");
      const clubId = await createClub("Augusta National Golf Club");

      const response = await makeRequest("/api/players/me/profile", "PUT", {
        home_club_id: clubId,
      });

      expect(response.status).toBe(200);
      const profile = await response.json();
      expect(profile.home_club_id).toBe(clubId);
    });

    test("should reject invalid visibility setting", async () => {
      await createAuthenticatedPlayer("player@test.com", "Tiger Woods");

      const response = await makeRequest("/api/players/me/profile", "PUT", {
        visibility: "invalid",
      });

      expectErrorResponse(response, 400);
    });

    test("should reject non-existent home club", async () => {
      await createAuthenticatedPlayer("player@test.com", "Tiger Woods");

      const response = await makeRequest("/api/players/me/profile", "PUT", {
        home_club_id: 99999,
      });

      expectErrorResponse(response, 400);
    });

    test("should require authentication", async () => {
      const response = await makeRequest("/api/players/me/profile", "PUT", {
        bio: "Test",
      });
      expectErrorResponse(response, 401);
    });
  });

  describe("GET /api/players/me/handicap - Handicap with History", () => {
    test("should return current handicap with empty history", async () => {
      await createAuthenticatedPlayer("player@test.com", "Tiger Woods", 5.2);

      const response = await makeRequest("/api/players/me/handicap");
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.current).toBe(5.2);
      expect(data.history).toBeArray();
    });

    test("should return handicap for user registered without explicit handicap", async () => {
      // Registration now automatically creates a player with default handicap 0
      await makeRequest("/api/auth/register", "POST", {
        email: "noPlayer@test.com",
        password: "password123",
      });
      await makeRequest("/api/auth/login", "POST", {
        email: "noPlayer@test.com",
        password: "password123",
      });

      const response = await makeRequest("/api/players/me/handicap");
      expect(response.status).toBe(200);

      const data = await response.json();
      // Default handicap for auto-created players is undefined (null)
      expect(data.current).toBe(0);
      expect(data.history).toBeArray();
    });

    test("should require authentication", async () => {
      const response = await makeRequest("/api/players/me/handicap");
      expectErrorResponse(response, 401);
    });
  });

  describe("POST /api/players/me/handicap - Record New Handicap", () => {
    test("should record new handicap and update player", async () => {
      await createAuthenticatedPlayer("player@test.com", "Tiger Woods", 10.0);

      const response = await makeRequest("/api/players/me/handicap", "POST", {
        handicap_index: 8.5,
        effective_date: "2024-01-15",
        notes: "Improved after lessons",
      });

      expect(response.status).toBe(201);
      const entry = await response.json();
      expect(entry.handicap_index).toBe(8.5);
      expect(entry.effective_date).toBe("2024-01-15");
      expect(entry.source).toBe("manual");
      expect(entry.notes).toBe("Improved after lessons");

      // Verify player handicap was updated
      const handicapRes = await makeRequest("/api/players/me/handicap");
      const handicapData = await handicapRes.json();
      expect(handicapData.current).toBe(8.5);
      expect(handicapData.history.length).toBeGreaterThan(0);
    });

    test("should use today's date if effective_date not provided", async () => {
      await createAuthenticatedPlayer("player@test.com", "Tiger Woods", 10.0);

      const response = await makeRequest("/api/players/me/handicap", "POST", {
        handicap_index: 9.0,
      });

      expect(response.status).toBe(201);
      const entry = await response.json();
      expect(entry.effective_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test("should reject handicap index below -10", async () => {
      await createAuthenticatedPlayer("player@test.com", "Tiger Woods", 10.0);

      const response = await makeRequest("/api/players/me/handicap", "POST", {
        handicap_index: -11,
      });

      expectErrorResponse(response, 400);
    });

    test("should reject handicap index above 54", async () => {
      await createAuthenticatedPlayer("player@test.com", "Tiger Woods", 10.0);

      const response = await makeRequest("/api/players/me/handicap", "POST", {
        handicap_index: 55,
      });

      expectErrorResponse(response, 400);
    });

    test("should require handicap_index field", async () => {
      await createAuthenticatedPlayer("player@test.com", "Tiger Woods", 10.0);

      const response = await makeRequest("/api/players/me/handicap", "POST", {
        notes: "Missing index",
      });

      expectErrorResponse(response, 400);
    });

    test("should require authentication", async () => {
      const response = await makeRequest("/api/players/me/handicap", "POST", {
        handicap_index: 10,
      });
      expectErrorResponse(response, 401);
    });
  });

  describe("GET /api/players/me/rounds - Round History (Own)", () => {
    test("should return empty array for player with no rounds", async () => {
      await createAuthenticatedPlayer("player@test.com", "Tiger Woods");

      const response = await makeRequest("/api/players/me/rounds");
      expect(response.status).toBe(200);

      const rounds = await response.json();
      expect(rounds).toBeArray();
      expect(rounds.length).toBe(0);
    });

    test("should return empty rounds for user registered without explicit player data", async () => {
      // Registration now automatically creates a player
      await makeRequest("/api/auth/register", "POST", {
        email: "noPlayer@test.com",
        password: "password123",
      });
      await makeRequest("/api/auth/login", "POST", {
        email: "noPlayer@test.com",
        password: "password123",
      });

      const response = await makeRequest("/api/players/me/rounds");
      expect(response.status).toBe(200);

      const rounds = await response.json();
      expect(rounds).toBeArray();
      expect(rounds.length).toBe(0);
    });

    test("should require authentication", async () => {
      const response = await makeRequest("/api/players/me/rounds");
      expectErrorResponse(response, 401);
    });
  });

  describe("GET /api/players/:id/rounds - Round History (Public)", () => {
    test("should return rounds for any player", async () => {
      const { playerId } = await createAuthenticatedPlayer(
        "player@test.com",
        "Tiger Woods"
      );

      // Logout and access public endpoint
      await makeRequest("/api/auth/logout", "POST");

      const response = await makeRequest(`/api/players/${playerId}/rounds`);
      expect(response.status).toBe(200);

      const rounds = await response.json();
      expect(rounds).toBeArray();
    });

    test("should return 404 for non-existent player", async () => {
      const response = await makeRequest("/api/players/99999/rounds");
      expectErrorResponse(response, 404);
    });
  });

  describe("GET /api/players/me/tours-and-series - Tours and Series (Own)", () => {
    test("should return empty tours and series for new player", async () => {
      await createAuthenticatedPlayer("player@test.com", "Tiger Woods");

      const response = await makeRequest("/api/players/me/tours-and-series");
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.tours).toBeArray();
      expect(data.series).toBeArray();
      expect(data.tours.length).toBe(0);
      expect(data.series.length).toBe(0);
    });

    test("should return empty for user without player profile", async () => {
      await makeRequest("/api/auth/register", "POST", {
        email: "noPlayer@test.com",
        password: "password123",
      });
      await makeRequest("/api/auth/login", "POST", {
        email: "noPlayer@test.com",
        password: "password123",
      });

      const response = await makeRequest("/api/players/me/tours-and-series");
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.tours).toBeArray();
      expect(data.series).toBeArray();
    });

    test("should require authentication", async () => {
      const response = await makeRequest("/api/players/me/tours-and-series");
      expectErrorResponse(response, 401);
    });
  });

  describe("GET /api/players/:id/tours-and-series - Tours and Series (Public)", () => {
    test("should return tours and series for any player", async () => {
      const { playerId } = await createAuthenticatedPlayer(
        "player@test.com",
        "Tiger Woods"
      );

      // Logout and access public endpoint
      await makeRequest("/api/auth/logout", "POST");

      const response = await makeRequest(
        `/api/players/${playerId}/tours-and-series`
      );
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.tours).toBeArray();
      expect(data.series).toBeArray();
    });

    test("should return 404 for non-existent player", async () => {
      const response = await makeRequest("/api/players/99999/tours-and-series");
      expectErrorResponse(response, 404);
    });
  });

  describe("GET /api/players/:id/full - Full Profile (Public with Visibility)", () => {
    test("should return public profile for any viewer", async () => {
      const { playerId } = await createAuthenticatedPlayer(
        "player@test.com",
        "Tiger Woods",
        5.2
      );

      // Make profile public explicitly
      await makeRequest("/api/players/me/profile", "PUT", {
        visibility: "public",
        display_name: "The Tiger",
      });

      // Logout and access as anonymous
      await makeRequest("/api/auth/logout", "POST");

      const response = await makeRequest(`/api/players/${playerId}/full`);
      expect(response.status).toBe(200);

      const profile = await response.json();
      expect(profile.name).toBe("Tiger Woods");
      expect(profile.display_name).toBe("The Tiger");
    });

    test("should hide private profile from other users", async () => {
      const { playerId } = await createAuthenticatedPlayer(
        "player1@test.com",
        "Tiger Woods"
      );

      // Make profile private
      await makeRequest("/api/players/me/profile", "PUT", {
        visibility: "private",
      });

      // Logout and login as different user
      await makeRequest("/api/auth/logout", "POST");
      await makeRequest("/api/auth/register", "POST", {
        email: "player2@test.com",
        password: "password123",
      });
      await makeRequest("/api/auth/login", "POST", {
        email: "player2@test.com",
        password: "password123",
      });

      const response = await makeRequest(`/api/players/${playerId}/full`);
      expectErrorResponse(response, 404);
    });

    test("should allow owner to view own private profile", async () => {
      const { playerId } = await createAuthenticatedPlayer(
        "player@test.com",
        "Tiger Woods"
      );

      // Make profile private
      await makeRequest("/api/players/me/profile", "PUT", {
        visibility: "private",
      });

      // Owner should still see it
      const response = await makeRequest(`/api/players/${playerId}/full`);
      expect(response.status).toBe(200);
    });

    test("should return 404 for non-existent player", async () => {
      const response = await makeRequest("/api/players/99999/full");
      expectErrorResponse(response, 404);
    });
  });

  describe("GET /api/players/is-friend/:targetPlayerId - Friend Check", () => {
    test("should return false for players not in common tour", async () => {
      // Create first player
      const { playerId: player1Id } = await createAuthenticatedPlayer(
        "player1@test.com",
        "Tiger Woods"
      );

      // Logout and create second player
      await makeRequest("/api/auth/logout", "POST");
      const { playerId: player2Id } = await createAuthenticatedPlayer(
        "player2@test.com",
        "Phil Mickelson"
      );

      const response = await makeRequest(
        `/api/players/is-friend/${player1Id}`
      );
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.isFriend).toBe(false);
      expect(data.commonTours).toBeArray();
      expect(data.commonTours.length).toBe(0);
    });

    test("should return isFriend: false if viewer has no player profile", async () => {
      // Create target player
      const { playerId: targetId } = await createAuthenticatedPlayer(
        "player@test.com",
        "Tiger Woods"
      );

      // Logout and login as user without player profile
      await makeRequest("/api/auth/logout", "POST");
      await makeRequest("/api/auth/register", "POST", {
        email: "noPlayer@test.com",
        password: "password123",
      });
      await makeRequest("/api/auth/login", "POST", {
        email: "noPlayer@test.com",
        password: "password123",
      });

      const response = await makeRequest(`/api/players/is-friend/${targetId}`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.isFriend).toBe(false);
    });

    test("should require authentication", async () => {
      const response = await makeRequest("/api/players/is-friend/1");
      expectErrorResponse(response, 401);
    });
  });

  describe("Player Tour Enrollment Integration", () => {
    test("should show tour in player tours-and-series after enrollment", async () => {
      // Create organizer and set up tour
      await makeRequest("/api/auth/register", "POST", {
        email: "organizer@test.com",
        password: "password123",
      });
      db.prepare(
        "UPDATE users SET role = 'ORGANIZER' WHERE email = 'organizer@test.com'"
      ).run();
      await makeRequest("/api/auth/login", "POST", {
        email: "organizer@test.com",
        password: "password123",
      });

      const tourId = await createTour("Summer Championship");

      // Logout and create player
      await makeRequest("/api/auth/logout", "POST");
      const { playerId } = await createAuthenticatedPlayer(
        "player@test.com",
        "Tiger Woods"
      );

      // Login as organizer to enroll player
      await makeRequest("/api/auth/logout", "POST");
      await makeRequest("/api/auth/login", "POST", {
        email: "organizer@test.com",
        password: "password123",
      });

      // Enroll player in tour
      await makeRequest(`/api/tours/${tourId}/enrollments`, "POST", {
        email: "player@test.com",
      });

      // Login as player and check tours
      await makeRequest("/api/auth/logout", "POST");
      await makeRequest("/api/auth/login", "POST", {
        email: "player@test.com",
        password: "password123",
      });

      const response = await makeRequest("/api/players/me/tours-and-series");
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.tours.length).toBe(1);
      expect(data.tours[0].tour_name).toBe("Summer Championship");
    });
  });

  describe("Friends via Common Tour", () => {
    test("should detect friendship when both players enrolled in same tour", async () => {
      // Create organizer
      await makeRequest("/api/auth/register", "POST", {
        email: "organizer@test.com",
        password: "password123",
      });
      db.prepare(
        "UPDATE users SET role = 'ORGANIZER' WHERE email = 'organizer@test.com'"
      ).run();
      await makeRequest("/api/auth/login", "POST", {
        email: "organizer@test.com",
        password: "password123",
      });

      const tourId = await createTour("Summer Championship");

      // Create first player
      await makeRequest("/api/auth/logout", "POST");
      const { playerId: player1Id } = await createAuthenticatedPlayer(
        "player1@test.com",
        "Tiger Woods"
      );

      // Create second player
      await makeRequest("/api/auth/logout", "POST");
      const { playerId: player2Id } = await createAuthenticatedPlayer(
        "player2@test.com",
        "Phil Mickelson"
      );

      // Organizer enrolls both players
      await makeRequest("/api/auth/logout", "POST");
      await makeRequest("/api/auth/login", "POST", {
        email: "organizer@test.com",
        password: "password123",
      });

      await makeRequest(`/api/tours/${tourId}/enrollments`, "POST", {
        email: "player1@test.com",
      });
      await makeRequest(`/api/tours/${tourId}/enrollments`, "POST", {
        email: "player2@test.com",
      });

      // Login as player2 and check friendship with player1
      await makeRequest("/api/auth/logout", "POST");
      await makeRequest("/api/auth/login", "POST", {
        email: "player2@test.com",
        password: "password123",
      });

      const response = await makeRequest(
        `/api/players/is-friend/${player1Id}`
      );
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.isFriend).toBe(true);
      expect(data.commonTours.length).toBe(1);
      expect(data.commonTours[0].name).toBe("Summer Championship");
    });
  });
});
