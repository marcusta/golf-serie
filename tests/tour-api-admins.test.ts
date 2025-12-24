import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  cleanupTestDatabase,
  expectErrorResponse,
  expectJsonResponse,
  type MakeRequestFunction,
  setupTestDatabase,
} from "./test-helpers";

describe("Tours API - Admin Endpoints", () => {
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
    email = "owner@test.com",
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
    const user = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(email) as { id: number };
    return { tour, userId: user.id };
  }

  // Helper to create another user
  async function createUser(email: string, role: "ADMIN" | "PLAYER" = "PLAYER") {
    await makeRequest("/api/auth/register", "POST", {
      email,
      password: "password123",
    });
    if (role === "ADMIN") {
      db.prepare("UPDATE users SET role = 'ADMIN' WHERE email = ?").run(email);
    }
    const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as {
      id: number;
    };
    return { userId: user.id };
  }

  describe("GET /api/tours/:id/admins - List tour admins", () => {
    test("should list tour admins for tour owner", async () => {
      const { tour } = await createAdminAndTour();

      const response = await makeRequest(`/api/tours/${tour.id}/admins`);

      const admins = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(Array.isArray(admins)).toBe(true);
      // Initially empty (owner is not in tour_admins table)
      expect(admins.length).toBe(0);
    });

    test("should list admins with user details", async () => {
      const { tour, userId: ownerId } = await createAdminAndTour();

      // Create another user and add as tour admin
      await makeRequest("/api/auth/logout", "POST");
      const { userId: adminUserId } = await createUser(
        "touradmin@test.com",
        "PLAYER"
      );

      // Login as owner again
      await makeRequest("/api/auth/login", "POST", {
        email: "owner@test.com",
        password: "password123",
      });

      // Add tour admin
      await makeRequest(`/api/tours/${tour.id}/admins`, "POST", {
        userId: adminUserId,
      });

      const response = await makeRequest(`/api/tours/${tour.id}/admins`);

      const admins = await expectJsonResponse(response);
      expect(admins.length).toBe(1);
      expect(admins[0].user_id).toBe(adminUserId);
      expect(admins[0].email).toBe("touradmin@test.com");
    });

    test("should require authentication", async () => {
      const { tour } = await createAdminAndTour();
      await makeRequest("/api/auth/logout", "POST");

      const response = await makeRequest(`/api/tours/${tour.id}/admins`);
      expectErrorResponse(response, 401);
    });

    test("should prevent non-admin from listing tour admins", async () => {
      const { tour } = await createAdminAndTour();
      await makeRequest("/api/auth/logout", "POST");

      await createUser("player@test.com", "PLAYER");
      await makeRequest("/api/auth/login", "POST", {
        email: "player@test.com",
        password: "password123",
      });

      const response = await makeRequest(`/api/tours/${tour.id}/admins`);
      expectErrorResponse(response, 403);
    });

    test("should allow tour admin to list tour admins", async () => {
      const { tour } = await createAdminAndTour();

      // Create tour admin user
      await makeRequest("/api/auth/logout", "POST");
      const { userId: adminUserId } = await createUser(
        "touradmin@test.com",
        "PLAYER"
      );

      // Login as owner and add tour admin
      await makeRequest("/api/auth/login", "POST", {
        email: "owner@test.com",
        password: "password123",
      });
      await makeRequest(`/api/tours/${tour.id}/admins`, "POST", {
        userId: adminUserId,
      });

      // Login as tour admin
      await makeRequest("/api/auth/logout", "POST");
      await makeRequest("/api/auth/login", "POST", {
        email: "touradmin@test.com",
        password: "password123",
      });

      const response = await makeRequest(`/api/tours/${tour.id}/admins`);
      const admins = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(admins.length).toBe(1);
    });
  });

  describe("POST /api/tours/:id/admins - Add tour admin", () => {
    test("should allow tour owner to add tour admin", async () => {
      const { tour } = await createAdminAndTour();

      // Create user to be added as admin
      await makeRequest("/api/auth/logout", "POST");
      const { userId: newAdminId } = await createUser(
        "newadmin@test.com",
        "PLAYER"
      );

      // Login as owner
      await makeRequest("/api/auth/login", "POST", {
        email: "owner@test.com",
        password: "password123",
      });

      const response = await makeRequest(`/api/tours/${tour.id}/admins`, "POST", {
        userId: newAdminId,
      });

      const admin = await expectJsonResponse(response);
      expect(response.status).toBe(201);
      expect(admin.tour_id).toBe(tour.id);
      expect(admin.user_id).toBe(newAdminId);
    });

    test("should allow SUPER_ADMIN to add tour admin", async () => {
      const { tour } = await createAdminAndTour();

      // Create user to be added as admin
      await makeRequest("/api/auth/logout", "POST");
      const { userId: newAdminId } = await createUser(
        "newadmin@test.com",
        "PLAYER"
      );

      // Create super admin
      await createUser("super@test.com", "ADMIN");
      db.prepare("UPDATE users SET role = 'SUPER_ADMIN' WHERE email = ?").run(
        "super@test.com"
      );
      await makeRequest("/api/auth/login", "POST", {
        email: "super@test.com",
        password: "password123",
      });

      const response = await makeRequest(`/api/tours/${tour.id}/admins`, "POST", {
        userId: newAdminId,
      });

      expect(response.status).toBe(201);
    });

    test("should prevent tour admin from adding other admins", async () => {
      const { tour } = await createAdminAndTour();

      // Create and add tour admin
      await makeRequest("/api/auth/logout", "POST");
      const { userId: tourAdminId } = await createUser(
        "touradmin@test.com",
        "PLAYER"
      );

      await makeRequest("/api/auth/login", "POST", {
        email: "owner@test.com",
        password: "password123",
      });
      await makeRequest(`/api/tours/${tour.id}/admins`, "POST", {
        userId: tourAdminId,
      });

      // Create another user
      await makeRequest("/api/auth/logout", "POST");
      const { userId: anotherUserId } = await createUser(
        "another@test.com",
        "PLAYER"
      );

      // Login as tour admin and try to add another admin
      await makeRequest("/api/auth/login", "POST", {
        email: "touradmin@test.com",
        password: "password123",
      });

      const response = await makeRequest(`/api/tours/${tour.id}/admins`, "POST", {
        userId: anotherUserId,
      });

      expectErrorResponse(response, 403);
    });

    test("should require userId", async () => {
      const { tour } = await createAdminAndTour();

      const response = await makeRequest(
        `/api/tours/${tour.id}/admins`,
        "POST",
        {}
      );

      expectErrorResponse(response, 400);
      const error = await response.json();
      expect(error.error).toBe("User ID is required");
    });

    test("should prevent duplicate admin assignments", async () => {
      const { tour } = await createAdminAndTour();

      await makeRequest("/api/auth/logout", "POST");
      const { userId: adminId } = await createUser("admin2@test.com", "PLAYER");

      await makeRequest("/api/auth/login", "POST", {
        email: "owner@test.com",
        password: "password123",
      });

      await makeRequest(`/api/tours/${tour.id}/admins`, "POST", {
        userId: adminId,
      });

      const response = await makeRequest(`/api/tours/${tour.id}/admins`, "POST", {
        userId: adminId,
      });

      expectErrorResponse(response, 400);
      const error = await response.json();
      expect(error.error).toContain("already an admin");
    });

    test("should require authentication", async () => {
      const { tour } = await createAdminAndTour();
      await makeRequest("/api/auth/logout", "POST");

      const response = await makeRequest(`/api/tours/${tour.id}/admins`, "POST", {
        userId: 999,
      });

      expectErrorResponse(response, 401);
    });
  });

  describe("DELETE /api/tours/:id/admins/:userId - Remove tour admin", () => {
    test("should allow tour owner to remove tour admin", async () => {
      const { tour } = await createAdminAndTour();

      // Create and add tour admin
      await makeRequest("/api/auth/logout", "POST");
      const { userId: adminId } = await createUser("touradmin@test.com", "PLAYER");

      await makeRequest("/api/auth/login", "POST", {
        email: "owner@test.com",
        password: "password123",
      });

      await makeRequest(`/api/tours/${tour.id}/admins`, "POST", {
        userId: adminId,
      });

      // Verify admin was added
      let listResponse = await makeRequest(`/api/tours/${tour.id}/admins`);
      let admins = await listResponse.json();
      expect(admins.length).toBe(1);

      // Remove admin
      const response = await makeRequest(
        `/api/tours/${tour.id}/admins/${adminId}`,
        "DELETE"
      );

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);

      // Verify admin was removed
      listResponse = await makeRequest(`/api/tours/${tour.id}/admins`);
      admins = await listResponse.json();
      expect(admins.length).toBe(0);
    });

    test("should prevent tour admin from removing other admins", async () => {
      const { tour } = await createAdminAndTour();

      // Create and add two tour admins
      await makeRequest("/api/auth/logout", "POST");
      const { userId: admin1Id } = await createUser("admin1@test.com", "PLAYER");
      const { userId: admin2Id } = await createUser("admin2@test.com", "PLAYER");

      await makeRequest("/api/auth/login", "POST", {
        email: "owner@test.com",
        password: "password123",
      });

      await makeRequest(`/api/tours/${tour.id}/admins`, "POST", {
        userId: admin1Id,
      });
      await makeRequest(`/api/tours/${tour.id}/admins`, "POST", {
        userId: admin2Id,
      });

      // Login as admin1 and try to remove admin2
      await makeRequest("/api/auth/logout", "POST");
      await makeRequest("/api/auth/login", "POST", {
        email: "admin1@test.com",
        password: "password123",
      });

      const response = await makeRequest(
        `/api/tours/${tour.id}/admins/${admin2Id}`,
        "DELETE"
      );

      expectErrorResponse(response, 403);
    });

    test("should return error for non-existent tour admin", async () => {
      const { tour } = await createAdminAndTour();

      const response = await makeRequest(
        `/api/tours/${tour.id}/admins/999`,
        "DELETE"
      );

      expectErrorResponse(response, 400);
    });

    test("should require authentication", async () => {
      const { tour } = await createAdminAndTour();
      await makeRequest("/api/auth/logout", "POST");

      const response = await makeRequest(
        `/api/tours/${tour.id}/admins/1`,
        "DELETE"
      );

      expectErrorResponse(response, 401);
    });
  });

  describe("GET /api/tours/:id/registration-link - Generate registration link", () => {
    test("should generate registration link for tour admin", async () => {
      const { tour } = await createAdminAndTour();

      const response = await makeRequest(
        `/api/tours/${tour.id}/registration-link?email=player@example.com`
      );

      const result = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(result.email).toBe("player@example.com");
      expect(result.path).toBe("/register?email=player%40example.com");
    });

    test("should normalize email to lowercase", async () => {
      const { tour } = await createAdminAndTour();

      const response = await makeRequest(
        `/api/tours/${tour.id}/registration-link?email=PLAYER@EXAMPLE.COM`
      );

      const result = await expectJsonResponse(response);
      expect(result.email).toBe("player@example.com");
    });

    test("should require email parameter", async () => {
      const { tour } = await createAdminAndTour();

      const response = await makeRequest(
        `/api/tours/${tour.id}/registration-link`
      );

      expectErrorResponse(response, 400);
      const error = await response.json();
      expect(error.error).toBe("Email is required");
    });

    test("should require authentication", async () => {
      const { tour } = await createAdminAndTour();
      await makeRequest("/api/auth/logout", "POST");

      const response = await makeRequest(
        `/api/tours/${tour.id}/registration-link?email=player@example.com`
      );

      expectErrorResponse(response, 401);
    });

    test("should prevent non-admin from generating link", async () => {
      const { tour } = await createAdminAndTour();
      await makeRequest("/api/auth/logout", "POST");

      await createUser("player@test.com", "PLAYER");
      await makeRequest("/api/auth/login", "POST", {
        email: "player@test.com",
        password: "password123",
      });

      const response = await makeRequest(
        `/api/tours/${tour.id}/registration-link?email=another@example.com`
      );

      expectErrorResponse(response, 403);
    });
  });
});
