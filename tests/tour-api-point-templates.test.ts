import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  cleanupTestDatabase,
  expectErrorResponse,
  expectJsonResponse,
  type MakeRequestFunction,
  setupTestDatabase,
} from "./test-helpers";

describe("Tour Point Templates API", () => {
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

  describe("GET /api/tours/:id/point-templates", () => {
    test("should list point templates for a tour", async () => {
      const { tour } = await createOrganizerAndTour();

      // Create point templates for this tour
      await makeRequest(`/api/tours/${tour.id}/point-templates`, "POST", {
        name: "Standard Points",
        points_structure: { "1": 100, "2": 80, "default": 10 },
      });
      await makeRequest(`/api/tours/${tour.id}/point-templates`, "POST", {
        name: "Major Points",
        points_structure: { "1": 200, "2": 160, "default": 20 },
      });

      const response = await makeRequest(`/api/tours/${tour.id}/point-templates`);

      expect(response.status).toBe(200);
      const templates = await response.json();
      expect(templates).toHaveLength(2);
      expect(templates.map((t: { name: string }) => t.name).sort()).toEqual([
        "Major Points",
        "Standard Points",
      ]);
    });

    test("should return empty array when no templates exist", async () => {
      const { tour } = await createOrganizerAndTour();

      const response = await makeRequest(`/api/tours/${tour.id}/point-templates`);

      expect(response.status).toBe(200);
      const templates = await response.json();
      expect(templates).toHaveLength(0);
    });

    test("should not include templates from other tours", async () => {
      const { tour: tour1 } = await createOrganizerAndTour("owner1@test.com", "Tour 1");
      await makeRequest(`/api/tours/${tour1.id}/point-templates`, "POST", {
        name: "Tour 1 Points",
        points_structure: { "1": 100 },
      });

      await makeRequest("/api/auth/logout", "POST");
      const { tour: tour2 } = await createOrganizerAndTour("owner2@test.com", "Tour 2");
      await makeRequest(`/api/tours/${tour2.id}/point-templates`, "POST", {
        name: "Tour 2 Points",
        points_structure: { "1": 200 },
      });

      // Check tour 1 templates
      await loginAs("owner1@test.com");
      const response1 = await makeRequest(`/api/tours/${tour1.id}/point-templates`);
      const templates1 = await response1.json();
      expect(templates1).toHaveLength(1);
      expect(templates1[0].name).toBe("Tour 1 Points");

      // Check tour 2 templates
      await loginAs("owner2@test.com");
      const response2 = await makeRequest(`/api/tours/${tour2.id}/point-templates`);
      const templates2 = await response2.json();
      expect(templates2).toHaveLength(1);
      expect(templates2[0].name).toBe("Tour 2 Points");
    });
  });

  describe("POST /api/tours/:id/point-templates", () => {
    test("should create point template as tour owner", async () => {
      const { tour } = await createOrganizerAndTour();

      const response = await makeRequest(`/api/tours/${tour.id}/point-templates`, "POST", {
        name: "Standard Points",
        points_structure: { "1": 100, "2": 80, "3": 65, "default": 10 },
      });

      expect(response.status).toBe(201);
      const template = await response.json();
      expect(template.name).toBe("Standard Points");
      expect(template.tour_id).toBe(tour.id);
      expect(JSON.parse(template.points_structure)).toEqual({
        "1": 100,
        "2": 80,
        "3": 65,
        "default": 10,
      });
    });

    test("should create point template as tour admin (not owner)", async () => {
      const { tour } = await createOrganizerAndTour("owner@test.com", "Test Tour");
      const { userId: adminId } = await createUser("admin@test.com", "ADMIN");

      // Re-login as owner (createUser auto-logs in the new user)
      await loginAs("owner@test.com");

      // Add admin to tour
      await makeRequest(`/api/tours/${tour.id}/admins`, "POST", { userId: adminId });

      // Login as the tour admin
      await loginAs("admin@test.com");

      const response = await makeRequest(`/api/tours/${tour.id}/point-templates`, "POST", {
        name: "Admin Created Points",
        points_structure: { "1": 100 },
      });

      expect(response.status).toBe(201);
      const template = await response.json();
      expect(template.name).toBe("Admin Created Points");
    });

    test("should return 403 for non-admin user", async () => {
      const { tour } = await createOrganizerAndTour();
      await createUser("player@test.com", "PLAYER");
      await loginAs("player@test.com");

      const response = await makeRequest(`/api/tours/${tour.id}/point-templates`, "POST", {
        name: "Hacked Points",
        points_structure: { "1": 100 },
      });

      expectErrorResponse(response, 403);
    });

    test("should return 401 when not authenticated", async () => {
      const { tour } = await createOrganizerAndTour();
      await makeRequest("/api/auth/logout", "POST");

      const response = await makeRequest(`/api/tours/${tour.id}/point-templates`, "POST", {
        name: "Unauthorized Points",
        points_structure: { "1": 100 },
      });

      expectErrorResponse(response, 401);
    });

    test("should return 400 when name is missing", async () => {
      const { tour } = await createOrganizerAndTour();

      const response = await makeRequest(`/api/tours/${tour.id}/point-templates`, "POST", {
        points_structure: { "1": 100 },
      });

      expectErrorResponse(response, 400);
      const error = await response.json();
      expect(error.error).toBe("Template name is required");
    });

    test("should return 400 when points_structure is missing", async () => {
      const { tour } = await createOrganizerAndTour();

      const response = await makeRequest(`/api/tours/${tour.id}/point-templates`, "POST", {
        name: "Missing Structure",
      });

      expectErrorResponse(response, 400);
      const error = await response.json();
      expect(error.error).toBe("Points structure is required");
    });
  });

  describe("PUT /api/tours/:id/point-templates/:templateId", () => {
    test("should update point template as tour owner", async () => {
      const { tour } = await createOrganizerAndTour();

      const createResponse = await makeRequest(`/api/tours/${tour.id}/point-templates`, "POST", {
        name: "Original Name",
        points_structure: { "1": 100 },
      });
      const template = await createResponse.json();

      const response = await makeRequest(
        `/api/tours/${tour.id}/point-templates/${template.id}`,
        "PUT",
        {
          name: "Updated Name",
          points_structure: { "1": 150, "2": 100 },
        }
      );

      expect(response.status).toBe(200);
      const updated = await response.json();
      expect(updated.name).toBe("Updated Name");
      expect(JSON.parse(updated.points_structure)).toEqual({ "1": 150, "2": 100 });
    });

    test("should return 403 for non-admin user", async () => {
      const { tour } = await createOrganizerAndTour();

      const createResponse = await makeRequest(`/api/tours/${tour.id}/point-templates`, "POST", {
        name: "Template",
        points_structure: { "1": 100 },
      });
      const template = await createResponse.json();

      await createUser("player@test.com", "PLAYER");
      await loginAs("player@test.com");

      const response = await makeRequest(
        `/api/tours/${tour.id}/point-templates/${template.id}`,
        "PUT",
        { name: "Hacked" }
      );

      expectErrorResponse(response, 403);
    });

    test("should return 404 for template from different tour", async () => {
      const { tour: tour1 } = await createOrganizerAndTour("owner1@test.com", "Tour 1");
      const createResponse = await makeRequest(`/api/tours/${tour1.id}/point-templates`, "POST", {
        name: "Tour 1 Template",
        points_structure: { "1": 100 },
      });
      const template = await createResponse.json();

      await makeRequest("/api/auth/logout", "POST");
      const { tour: tour2 } = await createOrganizerAndTour("owner2@test.com", "Tour 2");

      // Try to update tour1's template via tour2's endpoint
      const response = await makeRequest(
        `/api/tours/${tour2.id}/point-templates/${template.id}`,
        "PUT",
        { name: "Hacked" }
      );

      expectErrorResponse(response, 404);
    });

    test("should return 404 for non-existent template", async () => {
      const { tour } = await createOrganizerAndTour();

      const response = await makeRequest(
        `/api/tours/${tour.id}/point-templates/999`,
        "PUT",
        { name: "Updated" }
      );

      expectErrorResponse(response, 404);
    });
  });

  describe("DELETE /api/tours/:id/point-templates/:templateId", () => {
    test("should delete point template as tour owner", async () => {
      const { tour } = await createOrganizerAndTour();

      const createResponse = await makeRequest(`/api/tours/${tour.id}/point-templates`, "POST", {
        name: "To Delete",
        points_structure: { "1": 100 },
      });
      const template = await createResponse.json();

      const response = await makeRequest(
        `/api/tours/${tour.id}/point-templates/${template.id}`,
        "DELETE"
      );

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);

      // Verify template is deleted
      const listResponse = await makeRequest(`/api/tours/${tour.id}/point-templates`);
      const templates = await listResponse.json();
      expect(templates).toHaveLength(0);
    });

    test("should return 403 for non-admin user", async () => {
      const { tour } = await createOrganizerAndTour();

      const createResponse = await makeRequest(`/api/tours/${tour.id}/point-templates`, "POST", {
        name: "Template",
        points_structure: { "1": 100 },
      });
      const template = await createResponse.json();

      await createUser("player@test.com", "PLAYER");
      await loginAs("player@test.com");

      const response = await makeRequest(
        `/api/tours/${tour.id}/point-templates/${template.id}`,
        "DELETE"
      );

      expectErrorResponse(response, 403);
    });

    test("should return 404 for template from different tour", async () => {
      const { tour: tour1 } = await createOrganizerAndTour("owner1@test.com", "Tour 1");
      const createResponse = await makeRequest(`/api/tours/${tour1.id}/point-templates`, "POST", {
        name: "Tour 1 Template",
        points_structure: { "1": 100 },
      });
      const template = await createResponse.json();

      await makeRequest("/api/auth/logout", "POST");
      const { tour: tour2 } = await createOrganizerAndTour("owner2@test.com", "Tour 2");

      // Try to delete tour1's template via tour2's endpoint
      const response = await makeRequest(
        `/api/tours/${tour2.id}/point-templates/${template.id}`,
        "DELETE"
      );

      expectErrorResponse(response, 404);
    });

    test("should return 404 for non-existent template", async () => {
      const { tour } = await createOrganizerAndTour();

      const response = await makeRequest(
        `/api/tours/${tour.id}/point-templates/999`,
        "DELETE"
      );

      expectErrorResponse(response, 404);
    });
  });

  describe("Tour-scoped vs Global templates", () => {
    test("tour templates should have tour_id set", async () => {
      const { tour } = await createOrganizerAndTour();

      const response = await makeRequest(`/api/tours/${tour.id}/point-templates`, "POST", {
        name: "Tour Scoped",
        points_structure: { "1": 100 },
      });

      const template = await response.json();
      expect(template.tour_id).toBe(tour.id);
    });

    test("global templates should have null tour_id", async () => {
      await makeRequest("/api/auth/register", "POST", {
        email: "admin@test.com",
        password: "password123",
      });
      db.prepare("UPDATE users SET role = 'ADMIN' WHERE email = 'admin@test.com'").run();
      await makeRequest("/api/auth/login", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      // Create global template via old API
      const response = await makeRequest("/api/point-templates", "POST", {
        name: "Global Template",
        points_structure: { "1": 100 },
      });

      const template = await response.json();
      expect(template.tour_id).toBeNull();
    });

    test("tour endpoint should not return global templates", async () => {
      // Create SUPER_ADMIN who can create both global templates and tours
      await makeRequest("/api/auth/register", "POST", {
        email: "superadmin@test.com",
        password: "password123",
      });
      db.prepare("UPDATE users SET role = 'SUPER_ADMIN' WHERE email = 'superadmin@test.com'").run();
      await makeRequest("/api/auth/login", "POST", {
        email: "superadmin@test.com",
        password: "password123",
      });

      await makeRequest("/api/point-templates", "POST", {
        name: "Global Template",
        points_structure: { "1": 100 },
      });

      // Create tour with its own template
      const tourResponse = await makeRequest("/api/tours", "POST", { name: "Test Tour" });
      const tour = await tourResponse.json();

      await makeRequest(`/api/tours/${tour.id}/point-templates`, "POST", {
        name: "Tour Template",
        points_structure: { "1": 200 },
      });

      // Tour endpoint should only return tour-scoped template
      const response = await makeRequest(`/api/tours/${tour.id}/point-templates`);
      const templates = await response.json();

      expect(templates).toHaveLength(1);
      expect(templates[0].name).toBe("Tour Template");
      expect(templates[0].tour_id).toBe(tour.id);
    });
  });
});
