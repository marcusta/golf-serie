import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
    cleanupTestDatabase,
    expectErrorResponse,
    expectJsonResponse,
    type MakeRequestFunction,
    setupTestDatabase,
} from "./test-helpers";

describe("Tours API", () => {
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

  describe("POST /api/tours - Create Tour (Organizer Only)", () => {
    test("should create a tour when organizer", async () => {
      await makeRequest("/api/auth/register", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      db.prepare("UPDATE users SET role = 'ORGANIZER' WHERE email = 'admin@test.com'").run();

      await makeRequest("/api/auth/login", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      const response = await makeRequest("/api/tours", "POST", {
        name: "PGA Tour 2024",
        description: "Professional golf tour",
      });

      const tour = await expectJsonResponse(response);
      expect(response.status).toBe(201);
      expect(tour.name).toBe("PGA Tour 2024");
      expect(tour.description).toBe("Professional golf tour");
      expect(tour.id).toBeNumber();
      expect(tour.owner_id).toBeNumber();
    });

    test("should require organizer role (player cannot create)", async () => {
      await makeRequest("/api/auth/register", "POST", {
        email: "player@test.com",
        password: "password123",
      });

      await makeRequest("/api/auth/login", "POST", {
        email: "player@test.com",
        password: "password123",
      });

      const response = await makeRequest("/api/tours", "POST", {
        name: "PGA Tour 2024",
      });

      expectErrorResponse(response, 403);
    });

    test("should not allow admin role to create (only organizer)", async () => {
      await makeRequest("/api/auth/register", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      // Use ADMIN role - ADMINs cannot create tours
      db.prepare("UPDATE users SET role = 'ADMIN' WHERE email = 'admin@test.com'").run();

      await makeRequest("/api/auth/login", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      const response = await makeRequest("/api/tours", "POST", {
        name: "PGA Tour 2024",
      });

      expectErrorResponse(response, 403);
    });

    test("should require authentication", async () => {
      const response = await makeRequest("/api/tours", "POST", {
        name: "PGA Tour 2024",
      });

      expectErrorResponse(response, 401);
    });

    test("should validate required name field", async () => {
      await makeRequest("/api/auth/register", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      db.prepare("UPDATE users SET role = 'ORGANIZER' WHERE email = 'admin@test.com'").run();

      await makeRequest("/api/auth/login", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      const response = await makeRequest("/api/tours", "POST", {
        description: "Missing name",
      });

      expectErrorResponse(response, 400);
      const error = await response.json();
      expect(error.error).toBe("Tour name is required");
    });
  });

  describe("GET /api/tours - List Tours", () => {
    test("should list public tours without authentication", async () => {
      await makeRequest("/api/auth/register", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      db.prepare("UPDATE users SET role = 'ORGANIZER' WHERE email = 'admin@test.com'").run();

      await makeRequest("/api/auth/login", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      await makeRequest("/api/tours", "POST", {
        name: "PGA Tour 2024",
      });

      await makeRequest("/api/tours", "POST", {
        name: "European Tour 2024",
      });

      // Make tours public for unauthenticated access
      db.prepare("UPDATE tours SET visibility = 'public'").run();

      await makeRequest("/api/auth/logout", "POST");

      const response = await makeRequest("/api/tours");
      const tours = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(Array.isArray(tours)).toBe(true);
      expect(tours.length).toBe(2);
    });

    test("should not list private tours without authentication", async () => {
      await makeRequest("/api/auth/register", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      db.prepare("UPDATE users SET role = 'ORGANIZER' WHERE email = 'admin@test.com'").run();

      await makeRequest("/api/auth/login", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      await makeRequest("/api/tours", "POST", {
        name: "Private Tour",
      });

      // Tour is private by default
      await makeRequest("/api/auth/logout", "POST");

      const response = await makeRequest("/api/tours");
      const tours = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(Array.isArray(tours)).toBe(true);
      expect(tours.length).toBe(0);
    });

    test("should return empty array when no tours exist", async () => {
      const response = await makeRequest("/api/tours");
      const tours = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(Array.isArray(tours)).toBe(true);
      expect(tours.length).toBe(0);
    });
  });

  describe("GET /api/tours/:id - Get Tour", () => {
    test("should get a public tour without authentication", async () => {
      await makeRequest("/api/auth/register", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      db.prepare("UPDATE users SET role = 'ORGANIZER' WHERE email = 'admin@test.com'").run();

      await makeRequest("/api/auth/login", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      const createResponse = await makeRequest("/api/tours", "POST", {
        name: "PGA Tour 2024",
      });
      const created = await createResponse.json();

      // Make tour public
      db.prepare("UPDATE tours SET visibility = 'public' WHERE id = ?").run(created.id);

      await makeRequest("/api/auth/logout", "POST");

      const response = await makeRequest(`/api/tours/${created.id}`);
      const tour = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(tour.id).toBe(created.id);
      expect(tour.name).toBe("PGA Tour 2024");
    });

    test("should return 404 for private tour without authentication", async () => {
      await makeRequest("/api/auth/register", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      db.prepare("UPDATE users SET role = 'ORGANIZER' WHERE email = 'admin@test.com'").run();

      await makeRequest("/api/auth/login", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      const createResponse = await makeRequest("/api/tours", "POST", {
        name: "Private Tour",
      });
      const created = await createResponse.json();

      // Tour is private by default
      await makeRequest("/api/auth/logout", "POST");

      const response = await makeRequest(`/api/tours/${created.id}`);
      expectErrorResponse(response, 404);
    });

    test("should return 404 for non-existent tour", async () => {
      const response = await makeRequest("/api/tours/999");
      expectErrorResponse(response, 404);
    });
  });

  describe("GET /api/tours/:id/competitions - Get Tour Competitions (Public)", () => {
    test("should return empty array for tour with no competitions", async () => {
      await makeRequest("/api/auth/register", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      db.prepare("UPDATE users SET role = 'ORGANIZER' WHERE email = 'admin@test.com'").run();

      await makeRequest("/api/auth/login", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      const createResponse = await makeRequest("/api/tours", "POST", {
        name: "PGA Tour 2024",
      });
      const created = await createResponse.json();

      const response = await makeRequest(`/api/tours/${created.id}/competitions`);
      const competitions = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(Array.isArray(competitions)).toBe(true);
      expect(competitions.length).toBe(0);
    });
  });

  describe("GET /api/tours/:id/standings - Get Tour Standings (Public)", () => {
    test("should return standings object with empty player_standings for tour with no participants", async () => {
      await makeRequest("/api/auth/register", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      db.prepare("UPDATE users SET role = 'ORGANIZER' WHERE email = 'admin@test.com'").run();

      await makeRequest("/api/auth/login", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      const createResponse = await makeRequest("/api/tours", "POST", {
        name: "PGA Tour 2024",
      });
      const created = await createResponse.json();

      const response = await makeRequest(`/api/tours/${created.id}/standings`);
      const standings = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(standings).toHaveProperty("tour");
      expect(standings).toHaveProperty("player_standings");
      expect(standings).toHaveProperty("total_competitions");
      expect(Array.isArray(standings.player_standings)).toBe(true);
      expect(standings.player_standings.length).toBe(0);
      expect(standings.total_competitions).toBe(0);
    });

    test("should return simple array format with format=simple query param", async () => {
      await makeRequest("/api/auth/register", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      db.prepare("UPDATE users SET role = 'ORGANIZER' WHERE email = 'admin@test.com'").run();

      await makeRequest("/api/auth/login", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      const createResponse = await makeRequest("/api/tours", "POST", {
        name: "PGA Tour 2024",
      });
      const created = await createResponse.json();

      const response = await makeRequest(`/api/tours/${created.id}/standings?format=simple`);
      const standings = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(Array.isArray(standings)).toBe(true);
      expect(standings.length).toBe(0);
    });
  });

  describe("PUT /api/tours/:id - Update Tour (Admin/Owner Only)", () => {
    test("should allow owner to update their tour", async () => {
      await makeRequest("/api/auth/register", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      db.prepare("UPDATE users SET role = 'ORGANIZER' WHERE email = 'admin@test.com'").run();

      await makeRequest("/api/auth/login", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      const createResponse = await makeRequest("/api/tours", "POST", {
        name: "PGA Tour 2024",
      });
      const created = await createResponse.json();

      const response = await makeRequest(`/api/tours/${created.id}`, "PUT", {
        name: "PGA Tour 2025",
        description: "Updated tour",
      });

      const updated = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(updated.name).toBe("PGA Tour 2025");
      expect(updated.description).toBe("Updated tour");
    });

    test("should prevent non-owner from updating tour", async () => {
      // Create tour as admin1
      await makeRequest("/api/auth/register", "POST", {
        email: "admin1@test.com",
        password: "password123",
      });

      db.prepare("UPDATE users SET role = 'ORGANIZER' WHERE email = 'admin1@test.com'").run();

      await makeRequest("/api/auth/login", "POST", {
        email: "admin1@test.com",
        password: "password123",
      });

      const createResponse = await makeRequest("/api/tours", "POST", {
        name: "PGA Tour 2024",
      });
      const created = await createResponse.json();

      await makeRequest("/api/auth/logout", "POST");

      // Try to update as admin2
      await makeRequest("/api/auth/register", "POST", {
        email: "admin2@test.com",
        password: "password123",
      });

      db.prepare("UPDATE users SET role = 'ORGANIZER' WHERE email = 'admin2@test.com'").run();

      await makeRequest("/api/auth/login", "POST", {
        email: "admin2@test.com",
        password: "password123",
      });

      const response = await makeRequest(`/api/tours/${created.id}`, "PUT", {
        name: "Hacked Tour",
      });

      expectErrorResponse(response, 403);
    });

    test("should require authentication", async () => {
      const response = await makeRequest("/api/tours/1", "PUT", {
        name: "Updated Tour",
      });

      expectErrorResponse(response, 401);
    });

    test("should set default course and tee and return tee color", async () => {
      await makeRequest("/api/auth/register", "POST", {
        email: "admin@test.com",
        password: "password123",
      });
      db.prepare("UPDATE users SET role = 'ORGANIZER' WHERE email = 'admin@test.com'").run();
      await makeRequest("/api/auth/login", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      const createResponse = await makeRequest("/api/tours", "POST", {
        name: "Club Tour",
      });
      const created = await createResponse.json();

      db.prepare("INSERT INTO courses (name, pars) VALUES (?, ?)").run(
        "Home Club",
        "[]"
      );
      const course = db
        .prepare("SELECT id FROM courses WHERE name = ?")
        .get("Home Club") as { id: number };
      db.prepare(
        "INSERT INTO course_tees (course_id, name, color, course_rating, slope_rating) VALUES (?, ?, ?, ?, ?)"
      ).run(course.id, "Yellow", "yellow", 72.1, 125);
      const tee = db
        .prepare("SELECT id FROM course_tees WHERE course_id = ? AND name = ?")
        .get(course.id, "Yellow") as { id: number };

      const response = await makeRequest(`/api/tours/${created.id}`, "PUT", {
        default_course_id: course.id,
        default_tee_id: tee.id,
      });

      const updated = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(updated.default_course_id).toBe(course.id);
      expect(updated.default_tee_id).toBe(tee.id);
      expect(updated.default_tee_color).toBe("yellow");

      const getResponse = await makeRequest(`/api/tours/${created.id}`);
      const fetched = await expectJsonResponse(getResponse);
      expect(fetched.default_tee_color).toBe("yellow");
    });

    test("should reject a tee that does not belong to the default course", async () => {
      await makeRequest("/api/auth/register", "POST", {
        email: "admin@test.com",
        password: "password123",
      });
      db.prepare("UPDATE users SET role = 'ORGANIZER' WHERE email = 'admin@test.com'").run();
      await makeRequest("/api/auth/login", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      const createResponse = await makeRequest("/api/tours", "POST", {
        name: "Club Tour",
      });
      const created = await createResponse.json();

      db.prepare("INSERT INTO courses (name, pars) VALUES (?, ?)").run(
        "Home Club",
        "[]"
      );
      db.prepare("INSERT INTO courses (name, pars) VALUES (?, ?)").run(
        "Away Club",
        "[]"
      );
      const home = db
        .prepare("SELECT id FROM courses WHERE name = ?")
        .get("Home Club") as { id: number };
      const away = db
        .prepare("SELECT id FROM courses WHERE name = ?")
        .get("Away Club") as { id: number };
      db.prepare(
        "INSERT INTO course_tees (course_id, name, color, course_rating, slope_rating) VALUES (?, ?, ?, ?, ?)"
      ).run(away.id, "Yellow", "yellow", 71.4, 120);
      const awayTee = db
        .prepare("SELECT id FROM course_tees WHERE course_id = ?")
        .get(away.id) as { id: number };

      const response = await makeRequest(`/api/tours/${created.id}`, "PUT", {
        default_course_id: home.id,
        default_tee_id: awayTee.id,
      });

      expectErrorResponse(response, 400);
      const body = await response.json();
      expect(body.error).toBe("Tee must belong to the tour's default course");
    });

    test("should accept, persist, and clear counting_competitions", async () => {
      await makeRequest("/api/auth/register", "POST", {
        email: "admin@test.com",
        password: "password123",
      });
      db.prepare("UPDATE users SET role = 'ORGANIZER' WHERE email = 'admin@test.com'").run();
      await makeRequest("/api/auth/login", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      const createResponse = await makeRequest("/api/tours", "POST", {
        name: "Counting Tour",
      });
      const created = await createResponse.json();

      const setResponse = await makeRequest(`/api/tours/${created.id}`, "PUT", {
        counting_competitions: 10,
      });
      const updated = await expectJsonResponse(setResponse);
      expect(setResponse.status).toBe(200);
      expect(updated.counting_competitions).toBe(10);

      const clearResponse = await makeRequest(`/api/tours/${created.id}`, "PUT", {
        counting_competitions: null,
      });
      const cleared = await expectJsonResponse(clearResponse);
      expect(clearResponse.status).toBe(200);
      expect(cleared.counting_competitions).toBeNull();
    });

    test("should reject invalid counting_competitions values", async () => {
      await makeRequest("/api/auth/register", "POST", {
        email: "admin@test.com",
        password: "password123",
      });
      db.prepare("UPDATE users SET role = 'ORGANIZER' WHERE email = 'admin@test.com'").run();
      await makeRequest("/api/auth/login", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      const createResponse = await makeRequest("/api/tours", "POST", {
        name: "Counting Tour",
      });
      const created = await createResponse.json();

      for (const invalidValue of [0, -1, 1.5]) {
        const response = await makeRequest(`/api/tours/${created.id}`, "PUT", {
          counting_competitions: invalidValue,
        });
        expectErrorResponse(response, 400);
      }
    });
  });

  describe("DELETE /api/tours/:id - Delete Tour (Admin/Owner Only)", () => {
    test("should allow owner to delete their tour", async () => {
      await makeRequest("/api/auth/register", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      db.prepare("UPDATE users SET role = 'ORGANIZER' WHERE email = 'admin@test.com'").run();

      await makeRequest("/api/auth/login", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      const createResponse = await makeRequest("/api/tours", "POST", {
        name: "PGA Tour 2024",
      });
      const created = await createResponse.json();

      const response = await makeRequest(`/api/tours/${created.id}`, "DELETE");

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);

      // Verify tour is deleted
      const getResponse = await makeRequest(`/api/tours/${created.id}`);
      expectErrorResponse(getResponse, 404);
    });

    test("should prevent non-owner from deleting tour", async () => {
      // Create tour as admin1
      await makeRequest("/api/auth/register", "POST", {
        email: "admin1@test.com",
        password: "password123",
      });

      db.prepare("UPDATE users SET role = 'ORGANIZER' WHERE email = 'admin1@test.com'").run();

      await makeRequest("/api/auth/login", "POST", {
        email: "admin1@test.com",
        password: "password123",
      });

      const createResponse = await makeRequest("/api/tours", "POST", {
        name: "PGA Tour 2024",
      });
      const created = await createResponse.json();

      await makeRequest("/api/auth/logout", "POST");

      // Try to delete as admin2
      await makeRequest("/api/auth/register", "POST", {
        email: "admin2@test.com",
        password: "password123",
      });

      db.prepare("UPDATE users SET role = 'ORGANIZER' WHERE email = 'admin2@test.com'").run();

      await makeRequest("/api/auth/login", "POST", {
        email: "admin2@test.com",
        password: "password123",
      });

      const response = await makeRequest(`/api/tours/${created.id}`, "DELETE");

      expectErrorResponse(response, 403);
    });

    test("should require authentication", async () => {
      const response = await makeRequest("/api/tours/1", "DELETE");

      expectErrorResponse(response, 401);
    });
  });
});
