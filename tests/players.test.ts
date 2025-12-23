import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
    cleanupTestDatabase,
    expectErrorResponse,
    expectJsonResponse,
    type MakeRequestFunction,
    setupTestDatabase,
} from "./test-helpers";

describe("Players API", () => {
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

  describe("POST /api/players - Create Player (Auth Required)", () => {
    test("should create a player when authenticated", async () => {
      // Register and login
      await makeRequest("/api/auth/register", "POST", {
        email: "admin@test.com",
        password: "password123",
      });
      await makeRequest("/api/auth/login", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      const response = await makeRequest("/api/players", "POST", {
        name: "Tiger Woods",
        handicap: 5.2,
      });

      const player = await expectJsonResponse(response);
      expect(response.status).toBe(201);
      expect(player.name).toBe("Tiger Woods");
      expect(player.handicap).toBe(5.2);
      expect(player.id).toBeNumber();
      expect(player.created_at).toBeString();
    });

    test("should require authentication", async () => {
      const response = await makeRequest("/api/players", "POST", {
        name: "Tiger Woods",
      });

      expectErrorResponse(response, 401);
    });

    test("should validate required name field", async () => {
      await makeRequest("/api/auth/register", "POST", {
        email: "admin@test.com",
        password: "password123",
      });
      await makeRequest("/api/auth/login", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      const response = await makeRequest("/api/players", "POST", {
        handicap: 5.2,
      });

      expectErrorResponse(response, 400);
      const error = await response.json();
      expect(error.error).toBe("Player name is required");
    });

    test("should default handicap to 0 if not provided", async () => {
      await makeRequest("/api/auth/register", "POST", {
        email: "admin@test.com",
        password: "password123",
      });
      await makeRequest("/api/auth/login", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      const response = await makeRequest("/api/players", "POST", {
        name: "Phil Mickelson",
      });

      const player = await expectJsonResponse(response);
      expect(response.status).toBe(201);
      expect(player.handicap).toBe(0);
    });
  });

  describe("GET /api/players - List Players (Public)", () => {
    test("should list all players without authentication", async () => {
      // Create players via authenticated requests
      await makeRequest("/api/auth/register", "POST", {
        email: "admin@test.com",
        password: "password123",
      });
      await makeRequest("/api/auth/login", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      await makeRequest("/api/players", "POST", {
        name: "Tiger Woods",
        handicap: 5.2,
      });

      await makeRequest("/api/players", "POST", {
        name: "Phil Mickelson",
        handicap: 8.1,
      });

      // Logout to test public access
      await makeRequest("/api/auth/logout", "POST");

      const response = await makeRequest("/api/players");
      const players = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(Array.isArray(players)).toBe(true);
      expect(players.length).toBe(2);
      expect(players[0].name).toBe("Phil Mickelson"); // Sorted by name ASC
      expect(players[1].name).toBe("Tiger Woods");
    });

    test("should return empty array when no players exist", async () => {
      const response = await makeRequest("/api/players");
      const players = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(Array.isArray(players)).toBe(true);
      expect(players.length).toBe(0);
    });
  });

  describe("GET /api/players/:id - Get Player (Public)", () => {
    test("should get a single player without authentication", async () => {
      await makeRequest("/api/auth/register", "POST", {
        email: "admin@test.com",
        password: "password123",
      });
      await makeRequest("/api/auth/login", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      const createResponse = await makeRequest("/api/players", "POST", {
        name: "Tiger Woods",
        handicap: 5.2,
      });
      const created = await createResponse.json();

      await makeRequest("/api/auth/logout", "POST");

      const response = await makeRequest(`/api/players/${created.id}`);
      const player = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(player.id).toBe(created.id);
      expect(player.name).toBe("Tiger Woods");
      expect(player.handicap).toBe(5.2);
    });

    test("should return 404 for non-existent player", async () => {
      const response = await makeRequest("/api/players/999");
      expectErrorResponse(response, 404);
    });
  });

  describe("GET /api/players/:id/profile - Get Player Profile (Public)", () => {
    test("should get player profile with stats", async () => {
      await makeRequest("/api/auth/register", "POST", {
        email: "admin@test.com",
        password: "password123",
      });
      await makeRequest("/api/auth/login", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      const createResponse = await makeRequest("/api/players", "POST", {
        name: "Tiger Woods",
        handicap: 5.2,
      });
      const created = await createResponse.json();

      await makeRequest("/api/auth/logout", "POST");

      const response = await makeRequest(`/api/players/${created.id}/profile`);
      const profile = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(profile.id).toBe(created.id);
      expect(profile.name).toBe("Tiger Woods");
      expect(profile.competitions_played).toBe(0);
      expect(profile.total_rounds).toBe(0);
      expect(profile.best_score).toBeNull();
      expect(profile.average_score).toBeNull();
    });

    test("should return 404 for non-existent player profile", async () => {
      const response = await makeRequest("/api/players/999/profile");
      expectErrorResponse(response, 404);
    });
  });

  describe("POST /api/players/register - Self Registration (Auth Required)", () => {
    test("should create new player and link to current user", async () => {
      await makeRequest("/api/auth/register", "POST", {
        email: "player@test.com",
        password: "password123",
      });
      await makeRequest("/api/auth/login", "POST", {
        email: "player@test.com",
        password: "password123",
      });

      const response = await makeRequest("/api/players/register", "POST", {
        name: "Tiger Woods",
        handicap: 5.2,
      });

      const player = await expectJsonResponse(response);
      expect(response.status).toBe(201);
      expect(player.name).toBe("Tiger Woods");
      expect(player.handicap).toBe(5.2);
      expect(player.user_id).toBeNumber();
    });

    test("should link existing player to current user", async () => {
      // Create admin and player
      await makeRequest("/api/auth/register", "POST", {
        email: "admin@test.com",
        password: "password123",
      });
      await makeRequest("/api/auth/login", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      const createResponse = await makeRequest("/api/players", "POST", {
        name: "Tiger Woods",
        handicap: 5.2,
      });
      const created = await createResponse.json();

      await makeRequest("/api/auth/logout", "POST");

      // Register new user and link to existing player
      await makeRequest("/api/auth/register", "POST", {
        email: "tiger@test.com",
        password: "password123",
      });
      await makeRequest("/api/auth/login", "POST", {
        email: "tiger@test.com",
        password: "password123",
      });

      const response = await makeRequest("/api/players/register", "POST", {
        player_id: created.id,
      });

      const player = await expectJsonResponse(response);
      expect(response.status).toBe(201);
      expect(player.id).toBe(created.id);
      expect(player.user_id).toBeNumber();
    });

    test("should prevent user from having multiple player profiles", async () => {
      await makeRequest("/api/auth/register", "POST", {
        email: "player@test.com",
        password: "password123",
      });
      await makeRequest("/api/auth/login", "POST", {
        email: "player@test.com",
        password: "password123",
      });

      await makeRequest("/api/players/register", "POST", {
        name: "Tiger Woods",
      });

      const response = await makeRequest("/api/players/register", "POST", {
        name: "Phil Mickelson",
      });

      expectErrorResponse(response, 400);
      const error = await response.json();
      expect(error.error).toBe("User already has a player profile");
    });

    test("should require authentication", async () => {
      const response = await makeRequest("/api/players/register", "POST", {
        name: "Tiger Woods",
      });

      expectErrorResponse(response, 401);
    });
  });

  describe("PUT /api/players/:id - Update Player (Auth Required)", () => {
    test("should allow player owner to update their profile", async () => {
      await makeRequest("/api/auth/register", "POST", {
        email: "player@test.com",
        password: "password123",
      });
      await makeRequest("/api/auth/login", "POST", {
        email: "player@test.com",
        password: "password123",
      });

      const createResponse = await makeRequest("/api/players/register", "POST", {
        name: "Tiger Woods",
        handicap: 5.2,
      });
      const created = await createResponse.json();

      const response = await makeRequest(`/api/players/${created.id}`, "PUT", {
        name: "Eldrick Woods",
        handicap: 4.8,
      });

      const updated = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(updated.name).toBe("Eldrick Woods");
      expect(updated.handicap).toBe(4.8);
    });

    test("should allow admin to update any player", async () => {
      // Create player
      await makeRequest("/api/auth/register", "POST", {
        email: "player@test.com",
        password: "password123",
      });
      await makeRequest("/api/auth/login", "POST", {
        email: "player@test.com",
        password: "password123",
      });

      const createResponse = await makeRequest("/api/players/register", "POST", {
        name: "Tiger Woods",
      });
      const created = await createResponse.json();

      await makeRequest("/api/auth/logout", "POST");

      // Login as admin (need to manually set role in DB for this test)
      await makeRequest("/api/auth/register", "POST", {
        email: "admin@test.com",
        password: "password123",
      });
      
      // Manually update user role to ADMIN
      db.prepare("UPDATE users SET role = 'ADMIN' WHERE email = 'admin@test.com'").run();

      await makeRequest("/api/auth/login", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      const response = await makeRequest(`/api/players/${created.id}`, "PUT", {
        handicap: 10.0,
      });

      const updated = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(updated.handicap).toBe(10.0);
    });

    test("should prevent non-owner from updating player", async () => {
      // Create player 1
      await makeRequest("/api/auth/register", "POST", {
        email: "player1@test.com",
        password: "password123",
      });
      await makeRequest("/api/auth/login", "POST", {
        email: "player1@test.com",
        password: "password123",
      });

      const createResponse = await makeRequest("/api/players/register", "POST", {
        name: "Tiger Woods",
      });
      const created = await createResponse.json();

      await makeRequest("/api/auth/logout", "POST");

      // Login as player 2
      await makeRequest("/api/auth/register", "POST", {
        email: "player2@test.com",
        password: "password123",
      });
      await makeRequest("/api/auth/login", "POST", {
        email: "player2@test.com",
        password: "password123",
      });

      const response = await makeRequest(`/api/players/${created.id}`, "PUT", {
        handicap: 20.0,
      });

      expectErrorResponse(response, 403);
    });

    test("should require authentication", async () => {
      const response = await makeRequest("/api/players/1", "PUT", {
        handicap: 5.0,
      });

      expectErrorResponse(response, 401);
    });

    test("should return 404 for non-existent player", async () => {
      await makeRequest("/api/auth/register", "POST", {
        email: "admin@test.com",
        password: "password123",
      });
      await makeRequest("/api/auth/login", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      const response = await makeRequest("/api/players/999", "PUT", {
        handicap: 5.0,
      });

      expectErrorResponse(response, 404);
    });
  });

  describe("DELETE /api/players/:id - Delete Player (Admin Only)", () => {
    test("should allow admin to delete player", async () => {
      // Create player
      await makeRequest("/api/auth/register", "POST", {
        email: "player@test.com",
        password: "password123",
      });
      await makeRequest("/api/auth/login", "POST", {
        email: "player@test.com",
        password: "password123",
      });

      const createResponse = await makeRequest("/api/players/register", "POST", {
        name: "Tiger Woods",
      });
      const created = await createResponse.json();

      await makeRequest("/api/auth/logout", "POST");

      // Login as admin
      await makeRequest("/api/auth/register", "POST", {
        email: "admin@test.com",
        password: "password123",
      });
      
      db.prepare("UPDATE users SET role = 'ADMIN' WHERE email = 'admin@test.com'").run();

      await makeRequest("/api/auth/login", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      const response = await makeRequest(`/api/players/${created.id}`, "DELETE");

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);

      // Verify player is deleted
      const getResponse = await makeRequest(`/api/players/${created.id}`);
      expectErrorResponse(getResponse, 404);
    });

    test("should prevent non-admin from deleting player", async () => {
      await makeRequest("/api/auth/register", "POST", {
        email: "player@test.com",
        password: "password123",
      });
      await makeRequest("/api/auth/login", "POST", {
        email: "player@test.com",
        password: "password123",
      });

      const createResponse = await makeRequest("/api/players/register", "POST", {
        name: "Tiger Woods",
      });
      const created = await createResponse.json();

      const response = await makeRequest(`/api/players/${created.id}`, "DELETE");

      expectErrorResponse(response, 403);
    });

    test("should require authentication", async () => {
      const response = await makeRequest("/api/players/1", "DELETE");

      expectErrorResponse(response, 401);
    });
  });

  describe("GET /api/players/me - Get Current User's Player (Auth Required)", () => {
    test("should return player profile for logged in user", async () => {
      await makeRequest("/api/auth/register", "POST", {
        email: "player@test.com",
        password: "password123",
      });
      await makeRequest("/api/auth/login", "POST", {
        email: "player@test.com",
        password: "password123",
      });

      await makeRequest("/api/players/register", "POST", {
        name: "Tiger Woods",
        handicap: 5.2,
      });

      const response = await makeRequest("/api/players/me");
      const player = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(player.name).toBe("Tiger Woods");
      expect(player.user_id).toBeNumber();
    });

    test("should return null if user has no player profile", async () => {
      await makeRequest("/api/auth/register", "POST", {
        email: "player@test.com",
        password: "password123",
      });
      await makeRequest("/api/auth/login", "POST", {
        email: "player@test.com",
        password: "password123",
      });

      const response = await makeRequest("/api/players/me");
      const result = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(result.player).toBeNull();
    });

    test("should require authentication", async () => {
      const response = await makeRequest("/api/players/me");

      expectErrorResponse(response, 401);
    });
  });
});
