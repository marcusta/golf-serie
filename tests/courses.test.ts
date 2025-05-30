import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  cleanupTestDatabase,
  expectErrorResponse,
  expectJsonResponse,
  setupTestDatabase,
  type MakeRequestFunction,
} from "./test-helpers";

describe("Course API", () => {
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

  describe("POST /api/courses", () => {
    test("should create a course", async () => {
      const response = await makeRequest("/api/courses", "POST", {
        name: "Augusta National",
      });

      const course = await expectJsonResponse(response);
      expect(response.status).toBe(201);
      expect(course.name).toBe("Augusta National");
      expect(course.pars.holes).toEqual([]);
      expect(course.pars.out).toBe(0);
      expect(course.pars.in).toBe(0);
      expect(course.pars.total).toBe(0);
    });

    test("should validate name is required", async () => {
      const response = await makeRequest("/api/courses", "POST", {
        name: "",
      });

      expectErrorResponse(response, 400);
      const error = await response.json();
      expect(error.error).toBe("Course name is required");
    });
  });

  describe("GET /api/courses", () => {
    test("should list all courses", async () => {
      // Create a course first
      await makeRequest("/api/courses", "POST", {
        name: "Augusta National",
      });

      const response = await makeRequest("/api/courses");
      const courses = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(Array.isArray(courses)).toBe(true);
      expect(courses.length).toBe(1);
      expect(courses[0].name).toBe("Augusta National");
    });
  });

  describe("GET /api/courses/:id", () => {
    test("should get a single course", async () => {
      const createResponse = await makeRequest("/api/courses", "POST", {
        name: "Augusta National",
      });
      const created = await createResponse.json();

      const response = await makeRequest(`/api/courses/${created.id}`);
      const course = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(course.id).toBe(created.id);
      expect(course.name).toBe("Augusta National");
    });

    test("should return 404 for non-existent course", async () => {
      const response = await makeRequest("/api/courses/999");
      expectErrorResponse(response, 404);
    });
  });

  describe("PUT /api/courses/:id", () => {
    test("should update a course name", async () => {
      const createResponse = await makeRequest("/api/courses", "POST", {
        name: "Augusta National",
      });
      const created = await createResponse.json();

      const response = await makeRequest(`/api/courses/${created.id}`, "PUT", {
        name: "Augusta National Golf Club",
      });

      const updated = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(updated.name).toBe("Augusta National Golf Club");
    });

    test("should validate name cannot be empty", async () => {
      const createResponse = await makeRequest("/api/courses", "POST", {
        name: "Augusta National",
      });
      const created = await createResponse.json();

      const response = await makeRequest(`/api/courses/${created.id}`, "PUT", {
        name: "   ", // Spaces only
      });

      expectErrorResponse(response, 400);
      const error = await response.json();
      expect(error.error).toBe("Course name cannot be empty");
    });
  });

  describe("PUT /api/courses/:id/holes", () => {
    test("should update course holes", async () => {
      const createResponse = await makeRequest("/api/courses", "POST", {
        name: "Augusta National",
      });
      const created = await createResponse.json();

      const pars = [4, 5, 4, 3, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 4, 3, 4, 4];
      const response = await makeRequest(
        `/api/courses/${created.id}/holes`,
        "PUT",
        pars
      );

      const updated = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(updated.pars.holes).toEqual(pars);
      expect(updated.pars.out).toBe(36); // Front 9 total: 4+5+4+3+4+3+4+5+4 = 36
      expect(updated.pars.in).toBe(35); // Back 9 total: 4+4+3+5+4+4+3+4+4 = 35
      expect(updated.pars.total).toBe(71); // Total
    });

    test("should validate pars cannot exceed 18 holes", async () => {
      const createResponse = await makeRequest("/api/courses", "POST", {
        name: "Augusta National",
      });
      const created = await createResponse.json();

      const response = await makeRequest(
        `/api/courses/${created.id}/holes`,
        "PUT",
        [4, 5, 4, 3, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 4, 3, 4, 4, 4] // 19 holes
      );

      expectErrorResponse(response, 400);
      const error = await response.json();
      expect(error.error).toBe("Course cannot have more than 18 holes");
    });

    test("should validate par values", async () => {
      const createResponse = await makeRequest("/api/courses", "POST", {
        name: "Augusta National",
      });
      const created = await createResponse.json();

      const response = await makeRequest(
        `/api/courses/${created.id}/holes`,
        "PUT",
        [2, 5, 4] // Par 2 is invalid
      );

      expectErrorResponse(response, 400);
      const error = await response.json();
      expect(error.error).toBe("All pars must be integers between 3 and 6");
    });
  });

  describe("DELETE /api/courses/:id", () => {
    test("should delete a course", async () => {
      const createResponse = await makeRequest("/api/courses", "POST", {
        name: "To Delete",
      });
      const created = await createResponse.json();

      const response = await makeRequest(
        `/api/courses/${created.id}`,
        "DELETE"
      );
      expect(response.status).toBe(204);

      // Verify it's deleted
      const getResponse = await makeRequest(`/api/courses/${created.id}`);
      expectErrorResponse(getResponse, 404);
    });

    test("should return 404 for non-existent course", async () => {
      const response = await makeRequest("/api/courses/999", "DELETE");
      expectErrorResponse(response, 404);
    });
  });
});
