import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  cleanupTestDatabase,
  expectErrorResponse,
  expectJsonResponse,
  type MakeRequestFunction,
  setupTestDatabase,
} from "./test-helpers";

describe("Tours API - Enrollment Endpoints", () => {
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

  // Helper to create an admin user and tour
  async function createAdminAndTour(
    email = "admin@test.com",
    tourName = "Test Tour"
  ) {
    await makeRequest("/api/auth/register", "POST", {
      email,
      password: "password123",
    });
    db.prepare("UPDATE users SET role = 'ADMIN' WHERE email = ?").run(email);
    await makeRequest("/api/auth/login", "POST", {
      email,
      password: "password123",
    });
    const tourResponse = await makeRequest("/api/tours", "POST", {
      name: tourName,
    });
    const tour = await tourResponse.json();
    return { tour };
  }

  describe("POST /api/tours/:id/enrollments - Add pending enrollment", () => {
    test("should allow tour owner to add pending enrollment", async () => {
      const { tour } = await createAdminAndTour();

      const response = await makeRequest(
        `/api/tours/${tour.id}/enrollments`,
        "POST",
        {
          email: "player@example.com",
        }
      );

      const enrollment = await expectJsonResponse(response);
      expect(response.status).toBe(201);
      expect(enrollment.email).toBe("player@example.com");
      expect(enrollment.status).toBe("pending");
      expect(enrollment.tour_id).toBe(tour.id);
    });

    test("should normalize email to lowercase", async () => {
      const { tour } = await createAdminAndTour();

      const response = await makeRequest(
        `/api/tours/${tour.id}/enrollments`,
        "POST",
        {
          email: "PLAYER@EXAMPLE.COM",
        }
      );

      const enrollment = await expectJsonResponse(response);
      expect(enrollment.email).toBe("player@example.com");
    });

    test("should require authentication", async () => {
      const { tour } = await createAdminAndTour();
      await makeRequest("/api/auth/logout", "POST");

      const response = await makeRequest(
        `/api/tours/${tour.id}/enrollments`,
        "POST",
        {
          email: "player@example.com",
        }
      );

      expectErrorResponse(response, 401);
    });

    test("should prevent non-admin from adding enrollment", async () => {
      const { tour } = await createAdminAndTour();
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

      const response = await makeRequest(
        `/api/tours/${tour.id}/enrollments`,
        "POST",
        {
          email: "another@example.com",
        }
      );

      expectErrorResponse(response, 403);
    });

    test("should require email field", async () => {
      const { tour } = await createAdminAndTour();

      const response = await makeRequest(
        `/api/tours/${tour.id}/enrollments`,
        "POST",
        {}
      );

      expectErrorResponse(response, 400);
      const error = await response.json();
      expect(error.error).toBe("Email is required");
    });

    test("should prevent duplicate enrollments", async () => {
      const { tour } = await createAdminAndTour();

      await makeRequest(`/api/tours/${tour.id}/enrollments`, "POST", {
        email: "player@example.com",
      });

      const response = await makeRequest(
        `/api/tours/${tour.id}/enrollments`,
        "POST",
        {
          email: "player@example.com",
        }
      );

      expectErrorResponse(response, 400);
      const error = await response.json();
      expect(error.error).toContain("already enrolled");
    });
  });

  describe("GET /api/tours/:id/enrollments - List enrollments", () => {
    test("should list all enrollments for tour owner", async () => {
      const { tour } = await createAdminAndTour();

      await makeRequest(`/api/tours/${tour.id}/enrollments`, "POST", {
        email: "player1@example.com",
      });
      await makeRequest(`/api/tours/${tour.id}/enrollments`, "POST", {
        email: "player2@example.com",
      });

      const response = await makeRequest(`/api/tours/${tour.id}/enrollments`);

      const enrollments = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(Array.isArray(enrollments)).toBe(true);
      expect(enrollments.length).toBe(2);
    });

    test("should filter enrollments by status", async () => {
      const { tour } = await createAdminAndTour();

      await makeRequest(`/api/tours/${tour.id}/enrollments`, "POST", {
        email: "player1@example.com",
      });

      // Change one to active directly in DB for testing
      db.prepare(
        "UPDATE tour_enrollments SET status = 'active' WHERE email = ?"
      ).run("player1@example.com");

      await makeRequest(`/api/tours/${tour.id}/enrollments`, "POST", {
        email: "player2@example.com",
      });

      const pendingResponse = await makeRequest(
        `/api/tours/${tour.id}/enrollments?status=pending`
      );
      const pendingEnrollments = await pendingResponse.json();
      expect(pendingEnrollments.length).toBe(1);
      expect(pendingEnrollments[0].email).toBe("player2@example.com");

      const activeResponse = await makeRequest(
        `/api/tours/${tour.id}/enrollments?status=active`
      );
      const activeEnrollments = await activeResponse.json();
      expect(activeEnrollments.length).toBe(1);
      expect(activeEnrollments[0].email).toBe("player1@example.com");
    });

    test("should require authentication", async () => {
      const { tour } = await createAdminAndTour();
      await makeRequest("/api/auth/logout", "POST");

      const response = await makeRequest(`/api/tours/${tour.id}/enrollments`);
      expectErrorResponse(response, 401);
    });

    test("should prevent non-admin from listing enrollments", async () => {
      const { tour } = await createAdminAndTour();
      await makeRequest("/api/auth/logout", "POST");

      await makeRequest("/api/auth/register", "POST", {
        email: "player@test.com",
        password: "password123",
      });
      await makeRequest("/api/auth/login", "POST", {
        email: "player@test.com",
        password: "password123",
      });

      const response = await makeRequest(`/api/tours/${tour.id}/enrollments`);
      expectErrorResponse(response, 403);
    });
  });

  describe("POST /api/tours/:id/enrollments/request - Player request to join", () => {
    test("should allow player to request enrollment for request-mode tour", async () => {
      const { tour } = await createAdminAndTour();

      // Update tour to request mode
      db.prepare("UPDATE tours SET enrollment_mode = 'request' WHERE id = ?").run(
        tour.id
      );

      await makeRequest("/api/auth/logout", "POST");

      // Create player with user account
      await makeRequest("/api/auth/register", "POST", {
        email: "player@test.com",
        password: "password123",
      });
      await makeRequest("/api/auth/login", "POST", {
        email: "player@test.com",
        password: "password123",
      });

      // Create player profile linked to user
      const user = db
        .prepare("SELECT id FROM users WHERE email = ?")
        .get("player@test.com") as { id: number };
      const playerResult = db
        .prepare(
          "INSERT INTO players (name, handicap, user_id, created_by) VALUES (?, ?, ?, ?) RETURNING id"
        )
        .get("Test Player", 18, user.id, user.id) as { id: number };

      const response = await makeRequest(
        `/api/tours/${tour.id}/enrollments/request`,
        "POST",
        {
          playerId: playerResult.id,
        }
      );

      const enrollment = await expectJsonResponse(response);
      expect(response.status).toBe(201);
      expect(enrollment.status).toBe("requested");
      expect(enrollment.player_id).toBe(playerResult.id);
    });

    test("should reject request for closed-mode tour", async () => {
      const { tour } = await createAdminAndTour();

      // Tour is closed by default
      await makeRequest("/api/auth/logout", "POST");

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
      const playerResult = db
        .prepare(
          "INSERT INTO players (name, handicap, user_id, created_by) VALUES (?, ?, ?, ?) RETURNING id"
        )
        .get("Test Player", 18, user.id, user.id) as { id: number };

      const response = await makeRequest(
        `/api/tours/${tour.id}/enrollments/request`,
        "POST",
        {
          playerId: playerResult.id,
        }
      );

      expectErrorResponse(response, 400);
      const error = await response.json();
      expect(error.error).toContain("does not accept enrollment requests");
    });

    test("should require playerId", async () => {
      const { tour } = await createAdminAndTour();
      db.prepare("UPDATE tours SET enrollment_mode = 'request' WHERE id = ?").run(
        tour.id
      );

      const response = await makeRequest(
        `/api/tours/${tour.id}/enrollments/request`,
        "POST",
        {}
      );

      expectErrorResponse(response, 400);
      const error = await response.json();
      expect(error.error).toBe("Player ID is required");
    });
  });

  describe("PUT /api/tours/:id/enrollments/:enrollmentId/approve - Approve enrollment", () => {
    test("should allow admin to approve requested enrollment", async () => {
      const { tour } = await createAdminAndTour();

      // Create a requested enrollment directly in DB
      db.prepare("UPDATE tours SET enrollment_mode = 'request' WHERE id = ?").run(
        tour.id
      );

      const user = db
        .prepare("SELECT id FROM users WHERE email = ?")
        .get("admin@test.com") as { id: number };
      const playerResult = db
        .prepare(
          "INSERT INTO players (name, handicap, user_id, created_by) VALUES (?, ?, ?, ?) RETURNING id"
        )
        .get("Test Player", 18, user.id, user.id) as { id: number };

      const enrollmentResult = db
        .prepare(
          "INSERT INTO tour_enrollments (tour_id, player_id, email, status) VALUES (?, ?, ?, 'requested') RETURNING id"
        )
        .get(tour.id, playerResult.id, "player@test.com") as { id: number };

      const response = await makeRequest(
        `/api/tours/${tour.id}/enrollments/${enrollmentResult.id}/approve`,
        "PUT"
      );

      const enrollment = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(enrollment.status).toBe("active");
    });

    test("should return 404 for non-existent enrollment", async () => {
      const { tour } = await createAdminAndTour();

      const response = await makeRequest(
        `/api/tours/${tour.id}/enrollments/999/approve`,
        "PUT"
      );

      expectErrorResponse(response, 404);
    });

    test("should return 404 for enrollment from different tour", async () => {
      const { tour: tour1 } = await createAdminAndTour("admin@test.com", "Tour 1");

      // Create enrollment in tour1
      const enrollmentResult = db
        .prepare(
          "INSERT INTO tour_enrollments (tour_id, email, status) VALUES (?, ?, 'requested') RETURNING id"
        )
        .get(tour1.id, "player@test.com") as { id: number };

      // Create tour2
      const tour2Response = await makeRequest("/api/tours", "POST", {
        name: "Tour 2",
      });
      const tour2 = await tour2Response.json();

      // Try to approve enrollment from tour1 via tour2
      const response = await makeRequest(
        `/api/tours/${tour2.id}/enrollments/${enrollmentResult.id}/approve`,
        "PUT"
      );

      expectErrorResponse(response, 404);
    });
  });

  describe("DELETE /api/tours/:id/enrollments/:enrollmentId - Remove enrollment", () => {
    test("should allow admin to remove enrollment", async () => {
      const { tour } = await createAdminAndTour();

      const createResponse = await makeRequest(
        `/api/tours/${tour.id}/enrollments`,
        "POST",
        {
          email: "player@example.com",
        }
      );
      const enrollment = await createResponse.json();

      const response = await makeRequest(
        `/api/tours/${tour.id}/enrollments/${enrollment.id}`,
        "DELETE"
      );

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);

      // Verify enrollment is deleted
      const listResponse = await makeRequest(`/api/tours/${tour.id}/enrollments`);
      const enrollments = await listResponse.json();
      expect(enrollments.length).toBe(0);
    });

    test("should require authentication", async () => {
      const { tour } = await createAdminAndTour();

      const createResponse = await makeRequest(
        `/api/tours/${tour.id}/enrollments`,
        "POST",
        {
          email: "player@example.com",
        }
      );
      const enrollment = await createResponse.json();

      await makeRequest("/api/auth/logout", "POST");

      const response = await makeRequest(
        `/api/tours/${tour.id}/enrollments/${enrollment.id}`,
        "DELETE"
      );

      expectErrorResponse(response, 401);
    });

    test("should return error for non-existent enrollment", async () => {
      const { tour } = await createAdminAndTour();

      const response = await makeRequest(
        `/api/tours/${tour.id}/enrollments/999`,
        "DELETE"
      );

      expectErrorResponse(response, 400);
    });
  });
});
