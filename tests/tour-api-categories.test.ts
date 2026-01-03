import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  cleanupTestDatabase,
  expectJsonResponse,
  type MakeRequestFunction,
  setupTestDatabase,
} from "./test-helpers";

describe("Tour Categories API", () => {
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

  // Helper to create an organizer user and tour (ORGANIZER can create tours)
  async function createOrganizerAndTour(
    email = "owner@test.com",
    tourName = "Test Tour"
  ) {
    await makeRequest("/api/auth/register", "POST", {
      email,
      password: "password123",
    });
    db.prepare("UPDATE users SET role = 'ORGANIZER' WHERE email = ?").run(email);
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

  // Helper to login as a user
  async function loginAs(email: string) {
    await makeRequest("/api/auth/login", "POST", {
      email,
      password: "password123",
    });
  }

  describe("GET /api/tours/:id/categories", () => {
    test("should list categories for public tour", async () => {
      const { tour } = await createOrganizerAndTour();
      db.prepare(
        "INSERT INTO tour_categories (tour_id, name, sort_order) VALUES (?, ?, ?)"
      ).run(tour.id, "Men", 0);
      db.prepare(
        "INSERT INTO tour_categories (tour_id, name, sort_order) VALUES (?, ?, ?)"
      ).run(tour.id, "Women", 1);

      const response = await makeRequest(`/api/tours/${tour.id}/categories`);

      expect(response.status).toBe(200);
      const categories = await response.json();
      expect(categories).toHaveLength(2);
      expect(categories[0].name).toBe("Men");
      expect(categories[1].name).toBe("Women");
    });

    test("should return 404 for private tour when not logged in", async () => {
      const { tour } = await createOrganizerAndTour();
      // Update tour to private
      db.prepare("UPDATE tours SET visibility = 'private' WHERE id = ?").run(tour.id);
      // Log out
      await makeRequest("/api/auth/logout", "POST");

      const response = await makeRequest(`/api/tours/${tour.id}/categories`);

      expect(response.status).toBe(404);
    });
  });

  describe("POST /api/tours/:id/categories", () => {
    test("should create category as tour owner", async () => {
      const { tour } = await createOrganizerAndTour();

      const response = await makeRequest(`/api/tours/${tour.id}/categories`, "POST", {
        name: "Men",
        description: "Male players",
      });

      expect(response.status).toBe(201);
      const category = await response.json();
      expect(category.name).toBe("Men");
      expect(category.description).toBe("Male players");
    });

    test("should return 403 for non-admin", async () => {
      const { tour } = await createOrganizerAndTour();
      const { userId: playerId } = await createUser("player@test.com", "PLAYER");
      await loginAs("player@test.com");

      const response = await makeRequest(`/api/tours/${tour.id}/categories`, "POST", {
        name: "Men",
      });

      expect(response.status).toBe(403);
    });

    test("should return 400 without name", async () => {
      const { tour } = await createOrganizerAndTour();

      const response = await makeRequest(`/api/tours/${tour.id}/categories`, "POST", {
        description: "No name",
      });

      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error.error).toBe("Category name is required");
    });

    test("should return 400 for duplicate category name", async () => {
      const { tour } = await createOrganizerAndTour();
      await makeRequest(`/api/tours/${tour.id}/categories`, "POST", { name: "Men" });

      const response = await makeRequest(`/api/tours/${tour.id}/categories`, "POST", {
        name: "Men",
      });

      expect(response.status).toBe(400);
    });
  });

  describe("PUT /api/tours/:id/categories/:categoryId", () => {
    test("should update category", async () => {
      const { tour } = await createOrganizerAndTour();
      const createResponse = await makeRequest(`/api/tours/${tour.id}/categories`, "POST", {
        name: "Men",
      });
      const category = await createResponse.json();

      const response = await makeRequest(
        `/api/tours/${tour.id}/categories/${category.id}`,
        "PUT",
        { name: "Male", description: "Updated" }
      );

      expect(response.status).toBe(200);
      const updated = await response.json();
      expect(updated.name).toBe("Male");
      expect(updated.description).toBe("Updated");
    });

    test("should return 404 for category from different tour", async () => {
      const { tour: tour1 } = await createOrganizerAndTour("owner1@test.com", "Tour 1");
      await createOrganizerAndTour("owner2@test.com", "Tour 2");
      const tour2 = db.prepare("SELECT id FROM tours WHERE name = 'Tour 2'").get() as { id: number };

      // Create category in tour2
      db.prepare("INSERT INTO tour_categories (tour_id, name) VALUES (?, ?)").run(tour2.id, "Men");
      const category = db.prepare("SELECT id FROM tour_categories WHERE tour_id = ?").get(tour2.id) as { id: number };

      // Try to update category in tour1 (wrong tour)
      await loginAs("owner1@test.com");
      const response = await makeRequest(
        `/api/tours/${tour1.id}/categories/${category.id}`,
        "PUT",
        { name: "Updated" }
      );

      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /api/tours/:id/categories/:categoryId", () => {
    test("should delete category", async () => {
      const { tour } = await createOrganizerAndTour();
      const createResponse = await makeRequest(`/api/tours/${tour.id}/categories`, "POST", {
        name: "Men",
      });
      const category = await createResponse.json();

      const response = await makeRequest(
        `/api/tours/${tour.id}/categories/${category.id}`,
        "DELETE"
      );

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);

      const deleted = db.prepare("SELECT * FROM tour_categories WHERE id = ?").get(category.id);
      expect(deleted).toBeNull();
    });
  });

  describe("PUT /api/tours/:id/categories/reorder", () => {
    test("should reorder categories", async () => {
      const { tour } = await createOrganizerAndTour();

      const cat1Resp = await makeRequest(`/api/tours/${tour.id}/categories`, "POST", { name: "Men" });
      const cat1 = await cat1Resp.json();
      const cat2Resp = await makeRequest(`/api/tours/${tour.id}/categories`, "POST", { name: "Women" });
      const cat2 = await cat2Resp.json();
      const cat3Resp = await makeRequest(`/api/tours/${tour.id}/categories`, "POST", { name: "Seniors" });
      const cat3 = await cat3Resp.json();

      // Reverse the order
      const response = await makeRequest(
        `/api/tours/${tour.id}/categories/reorder`,
        "PUT",
        { categoryIds: [cat3.id, cat2.id, cat1.id] }
      );

      expect(response.status).toBe(200);

      const reordered = db
        .prepare("SELECT name FROM tour_categories WHERE tour_id = ? ORDER BY sort_order")
        .all(tour.id) as { name: string }[];
      expect(reordered[0].name).toBe("Seniors");
      expect(reordered[1].name).toBe("Women");
      expect(reordered[2].name).toBe("Men");
    });

    test("should return 400 without categoryIds array", async () => {
      const { tour } = await createOrganizerAndTour();

      const response = await makeRequest(
        `/api/tours/${tour.id}/categories/reorder`,
        "PUT",
        { }
      );

      expect(response.status).toBe(400);
    });
  });

  describe("PUT /api/tours/:id/enrollments/:enrollmentId/category", () => {
    test("should assign category to enrollment", async () => {
      const { tour } = await createOrganizerAndTour();

      // Create category
      const catResp = await makeRequest(`/api/tours/${tour.id}/categories`, "POST", { name: "Men" });
      const category = await catResp.json();

      // Create enrollment
      const enrollResp = await makeRequest(`/api/tours/${tour.id}/enrollments`, "POST", {
        email: "player@test.com",
      });
      const enrollment = await enrollResp.json();

      const response = await makeRequest(
        `/api/tours/${tour.id}/enrollments/${enrollment.id}/category`,
        "PUT",
        { categoryId: category.id }
      );

      expect(response.status).toBe(200);

      const updated = db
        .prepare("SELECT category_id FROM tour_enrollments WHERE id = ?")
        .get(enrollment.id) as { category_id: number };
      expect(updated.category_id).toBe(category.id);
    });

    test("should clear category when categoryId is null", async () => {
      const { tour } = await createOrganizerAndTour();

      // Create category
      const catResp = await makeRequest(`/api/tours/${tour.id}/categories`, "POST", { name: "Men" });
      const category = await catResp.json();

      // Create enrollment with category
      const enrollResp = await makeRequest(`/api/tours/${tour.id}/enrollments`, "POST", {
        email: "player@test.com",
      });
      const enrollment = await enrollResp.json();
      db.prepare("UPDATE tour_enrollments SET category_id = ? WHERE id = ?").run(category.id, enrollment.id);

      const response = await makeRequest(
        `/api/tours/${tour.id}/enrollments/${enrollment.id}/category`,
        "PUT",
        { categoryId: null }
      );

      expect(response.status).toBe(200);

      const updated = db
        .prepare("SELECT category_id FROM tour_enrollments WHERE id = ?")
        .get(enrollment.id) as { category_id: number | null };
      expect(updated.category_id).toBeNull();
    });

    test("should return 404 for enrollment from different tour", async () => {
      const { tour: tour1 } = await createOrganizerAndTour("owner1@test.com", "Tour 1");
      await makeRequest("/api/auth/logout", "POST");
      const { tour: tour2 } = await createOrganizerAndTour("owner2@test.com", "Tour 2");

      // Create enrollment in tour2
      const enrollResp = await makeRequest(`/api/tours/${tour2.id}/enrollments`, "POST", {
        email: "player@test.com",
      });
      const enrollment = await enrollResp.json();

      // Try to update enrollment from tour1 (wrong tour)
      await loginAs("owner1@test.com");
      const response = await makeRequest(
        `/api/tours/${tour1.id}/enrollments/${enrollment.id}/category`,
        "PUT",
        { categoryId: null }
      );

      expect(response.status).toBe(404);
    });
  });

  describe("PUT /api/tours/:id/enrollments/bulk-category", () => {
    test("should bulk assign category", async () => {
      const { tour } = await createOrganizerAndTour();

      // Create category
      const catResp = await makeRequest(`/api/tours/${tour.id}/categories`, "POST", { name: "Men" });
      const category = await catResp.json();

      // Create enrollments
      const e1Resp = await makeRequest(`/api/tours/${tour.id}/enrollments`, "POST", { email: "player1@test.com" });
      const e2Resp = await makeRequest(`/api/tours/${tour.id}/enrollments`, "POST", { email: "player2@test.com" });
      const e1 = await e1Resp.json();
      const e2 = await e2Resp.json();

      const response = await makeRequest(
        `/api/tours/${tour.id}/enrollments/bulk-category`,
        "PUT",
        { enrollmentIds: [e1.id, e2.id], categoryId: category.id }
      );

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.updated).toBe(2);

      const enrollments = db
        .prepare("SELECT category_id FROM tour_enrollments WHERE id IN (?, ?)")
        .all(e1.id, e2.id) as { category_id: number }[];
      expect(enrollments.every(e => e.category_id === category.id)).toBe(true);
    });

    test("should return 400 without enrollmentIds array", async () => {
      const { tour } = await createOrganizerAndTour();

      const response = await makeRequest(
        `/api/tours/${tour.id}/enrollments/bulk-category`,
        "PUT",
        { categoryId: null }
      );

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/tours/:id/standings with category filter", () => {
    test("should include categories in standings response", async () => {
      const { tour } = await createOrganizerAndTour();

      // Create categories
      await makeRequest(`/api/tours/${tour.id}/categories`, "POST", { name: "Men" });
      await makeRequest(`/api/tours/${tour.id}/categories`, "POST", { name: "Women" });

      const response = await makeRequest(`/api/tours/${tour.id}/standings`);

      expect(response.status).toBe(200);
      const standings = await response.json();
      expect(standings.categories).toHaveLength(2);
      expect(standings.selected_category_id).toBeUndefined();
    });

    test("should filter standings by category", async () => {
      const { tour } = await createOrganizerAndTour();

      // Create categories
      const catResp = await makeRequest(`/api/tours/${tour.id}/categories`, "POST", { name: "Men" });
      const category = await catResp.json();

      const response = await makeRequest(`/api/tours/${tour.id}/standings?category=${category.id}`);

      expect(response.status).toBe(200);
      const standings = await response.json();
      expect(standings.selected_category_id).toBe(category.id);
    });

    test("should return 500 for invalid category", async () => {
      const { tour } = await createOrganizerAndTour();

      const response = await makeRequest(`/api/tours/${tour.id}/standings?category=999`);

      expect(response.status).toBe(500);
    });
  });
});
