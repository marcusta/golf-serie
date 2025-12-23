import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
    cleanupTestDatabase,
    expectErrorResponse,
    expectJsonResponse,
    type MakeRequestFunction,
    setupTestDatabase,
} from "./test-helpers";

describe("Point Templates API", () => {
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

  describe("POST /api/point-templates - Create Template (Admin Only)", () => {
    test("should create a point template when admin", async () => {
      await makeRequest("/api/auth/register", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      db.prepare("UPDATE users SET role = 'ADMIN' WHERE email = 'admin@test.com'").run();

      await makeRequest("/api/auth/login", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      const response = await makeRequest("/api/point-templates", "POST", {
        name: "Standard Points",
        points_structure: {
          "1": 100,
          "2": 80,
          "3": 65,
          "default": 10,
        },
      });

      const template = await expectJsonResponse(response);
      expect(response.status).toBe(201);
      expect(template.name).toBe("Standard Points");
      expect(template.id).toBeNumber();
      expect(JSON.parse(template.points_structure)).toEqual({
        "1": 100,
        "2": 80,
        "3": 65,
        "default": 10,
      });
    });

    test("should require admin role", async () => {
      await makeRequest("/api/auth/register", "POST", {
        email: "player@test.com",
        password: "password123",
      });

      await makeRequest("/api/auth/login", "POST", {
        email: "player@test.com",
        password: "password123",
      });

      const response = await makeRequest("/api/point-templates", "POST", {
        name: "Standard Points",
        points_structure: { "1": 100 },
      });

      expectErrorResponse(response, 403);
    });

    test("should require authentication", async () => {
      const response = await makeRequest("/api/point-templates", "POST", {
        name: "Standard Points",
        points_structure: { "1": 100 },
      });

      expectErrorResponse(response, 401);
    });

    test("should validate required name field", async () => {
      await makeRequest("/api/auth/register", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      db.prepare("UPDATE users SET role = 'ADMIN' WHERE email = 'admin@test.com'").run();

      await makeRequest("/api/auth/login", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      const response = await makeRequest("/api/point-templates", "POST", {
        points_structure: { "1": 100 },
      });

      expectErrorResponse(response, 400);
      const error = await response.json();
      expect(error.error).toBe("Template name is required");
    });

    test("should validate required points_structure field", async () => {
      await makeRequest("/api/auth/register", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      db.prepare("UPDATE users SET role = 'ADMIN' WHERE email = 'admin@test.com'").run();

      await makeRequest("/api/auth/login", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      const response = await makeRequest("/api/point-templates", "POST", {
        name: "Standard Points",
      });

      expectErrorResponse(response, 400);
      const error = await response.json();
      expect(error.error).toBe("Points structure is required");
    });
  });

  describe("GET /api/point-templates - List Templates (Public)", () => {
    test("should list all templates without authentication", async () => {
      // Create templates via authenticated requests
      await makeRequest("/api/auth/register", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      db.prepare("UPDATE users SET role = 'ADMIN' WHERE email = 'admin@test.com'").run();

      await makeRequest("/api/auth/login", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      await makeRequest("/api/point-templates", "POST", {
        name: "Standard Points",
        points_structure: { "1": 100, "2": 80 },
      });

      await makeRequest("/api/point-templates", "POST", {
        name: "Major Points",
        points_structure: { "1": 200, "2": 160 },
      });

      // Logout to test public access
      await makeRequest("/api/auth/logout", "POST");

      const response = await makeRequest("/api/point-templates");
      const templates = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBe(2);
      expect(templates[0].name).toBe("Major Points"); // Sorted by name ASC
      expect(templates[1].name).toBe("Standard Points");
    });

    test("should return empty array when no templates exist", async () => {
      const response = await makeRequest("/api/point-templates");
      const templates = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBe(0);
    });
  });

  describe("GET /api/point-templates/:id - Get Template (Public)", () => {
    test("should get a single template without authentication", async () => {
      await makeRequest("/api/auth/register", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      db.prepare("UPDATE users SET role = 'ADMIN' WHERE email = 'admin@test.com'").run();

      await makeRequest("/api/auth/login", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      const createResponse = await makeRequest("/api/point-templates", "POST", {
        name: "Standard Points",
        points_structure: { "1": 100, "2": 80 },
      });
      const created = await createResponse.json();

      await makeRequest("/api/auth/logout", "POST");

      const response = await makeRequest(`/api/point-templates/${created.id}`);
      const template = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(template.id).toBe(created.id);
      expect(template.name).toBe("Standard Points");
    });

    test("should return 404 for non-existent template", async () => {
      const response = await makeRequest("/api/point-templates/999");
      expectErrorResponse(response, 404);
    });
  });

  describe("PUT /api/point-templates/:id - Update Template (Admin Only)", () => {
    test("should allow admin to update template", async () => {
      await makeRequest("/api/auth/register", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      db.prepare("UPDATE users SET role = 'ADMIN' WHERE email = 'admin@test.com'").run();

      await makeRequest("/api/auth/login", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      const createResponse = await makeRequest("/api/point-templates", "POST", {
        name: "Standard Points",
        points_structure: { "1": 100 },
      });
      const created = await createResponse.json();

      const response = await makeRequest(
        `/api/point-templates/${created.id}`,
        "PUT",
        {
          name: "Updated Points",
          points_structure: { "1": 150, "2": 100 },
        }
      );

      const updated = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(updated.name).toBe("Updated Points");
      expect(JSON.parse(updated.points_structure)).toEqual({
        "1": 150,
        "2": 100,
      });
    });

    test("should require admin role", async () => {
      // Create template as admin
      await makeRequest("/api/auth/register", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      db.prepare("UPDATE users SET role = 'ADMIN' WHERE email = 'admin@test.com'").run();

      await makeRequest("/api/auth/login", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      const createResponse = await makeRequest("/api/point-templates", "POST", {
        name: "Standard Points",
        points_structure: { "1": 100 },
      });
      const created = await createResponse.json();

      await makeRequest("/api/auth/logout", "POST");

      // Try to update as player
      await makeRequest("/api/auth/register", "POST", {
        email: "player@test.com",
        password: "password123",
      });

      await makeRequest("/api/auth/login", "POST", {
        email: "player@test.com",
        password: "password123",
      });

      const response = await makeRequest(
        `/api/point-templates/${created.id}`,
        "PUT",
        {
          name: "Hacked Points",
        }
      );

      expectErrorResponse(response, 403);
    });

    test("should require authentication", async () => {
      const response = await makeRequest("/api/point-templates/1", "PUT", {
        name: "Updated Points",
      });

      expectErrorResponse(response, 401);
    });

    test("should return 404 for non-existent template", async () => {
      await makeRequest("/api/auth/register", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      db.prepare("UPDATE users SET role = 'ADMIN' WHERE email = 'admin@test.com'").run();

      await makeRequest("/api/auth/login", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      const response = await makeRequest("/api/point-templates/999", "PUT", {
        name: "Updated Points",
      });

      expectErrorResponse(response, 404);
    });
  });

  describe("DELETE /api/point-templates/:id - Delete Template (Admin Only)", () => {
    test("should allow admin to delete template", async () => {
      await makeRequest("/api/auth/register", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      db.prepare("UPDATE users SET role = 'ADMIN' WHERE email = 'admin@test.com'").run();

      await makeRequest("/api/auth/login", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      const createResponse = await makeRequest("/api/point-templates", "POST", {
        name: "Standard Points",
        points_structure: { "1": 100 },
      });
      const created = await createResponse.json();

      const response = await makeRequest(
        `/api/point-templates/${created.id}`,
        "DELETE"
      );

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);

      // Verify template is deleted
      const getResponse = await makeRequest(`/api/point-templates/${created.id}`);
      expectErrorResponse(getResponse, 404);
    });

    test("should require admin role", async () => {
      // Create template as admin
      await makeRequest("/api/auth/register", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      db.prepare("UPDATE users SET role = 'ADMIN' WHERE email = 'admin@test.com'").run();

      await makeRequest("/api/auth/login", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      const createResponse = await makeRequest("/api/point-templates", "POST", {
        name: "Standard Points",
        points_structure: { "1": 100 },
      });
      const created = await createResponse.json();

      await makeRequest("/api/auth/logout", "POST");

      // Try to delete as player
      await makeRequest("/api/auth/register", "POST", {
        email: "player@test.com",
        password: "password123",
      });

      await makeRequest("/api/auth/login", "POST", {
        email: "player@test.com",
        password: "password123",
      });

      const response = await makeRequest(
        `/api/point-templates/${created.id}`,
        "DELETE"
      );

      expectErrorResponse(response, 403);
    });

    test("should require authentication", async () => {
      const response = await makeRequest("/api/point-templates/1", "DELETE");

      expectErrorResponse(response, 401);
    });

    test("should return 404 for non-existent template", async () => {
      await makeRequest("/api/auth/register", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      db.prepare("UPDATE users SET role = 'ADMIN' WHERE email = 'admin@test.com'").run();

      await makeRequest("/api/auth/login", "POST", {
        email: "admin@test.com",
        password: "password123",
      });

      const response = await makeRequest("/api/point-templates/999", "DELETE");

      expectErrorResponse(response, 404);
    });
  });
});
