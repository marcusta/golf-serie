import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  cleanupTestDatabase,
  expectErrorResponse,
  expectJsonResponse,
  makeRequest,
  setupTestDatabase,
} from "./test-helpers";

describe("Course API", () => {
  let db: Database;

  beforeEach(async () => {
    db = await setupTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestDatabase(db);
  });

  test("POST /api/courses creates a course", async () => {
    const response = await makeRequest("/api/courses", "POST", {
      name: "Augusta National",
      pars: [4, 5, 4, 3, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 4, 3, 4, 4],
    });

    const course = await expectJsonResponse(response);
    expect(response.status).toBe(201);
    expect(course.name).toBe("Augusta National");
    expect(course.pars).toHaveLength(18);
    expect(course.pars).toEqual([
      4, 5, 4, 3, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 4, 3, 4, 4,
    ]);
  });

  test("POST /api/courses validates pars", async () => {
    const response = await makeRequest("/api/courses", "POST", {
      name: "Invalid Course",
      pars: [4, 5, 4], // Too few pars
    });

    expectErrorResponse(response, 400);
    const error = await response.json();
    expect(error.error).toBe("Course must have exactly 18 pars");
  });

  test("GET /api/courses lists all courses", async () => {
    // Create a course first
    await makeRequest("/api/courses", "POST", {
      name: "Augusta National",
      pars: [4, 5, 4, 3, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 4, 3, 4, 4],
    });

    const response = await makeRequest("/api/courses");
    const courses = await expectJsonResponse(response);
    expect(response.status).toBe(200);
    expect(Array.isArray(courses)).toBe(true);
    expect(courses.length).toBe(1);
    expect(courses[0].name).toBe("Augusta National");
  });

  test("GET /api/courses/:id gets a single course", async () => {
    // Create a course first
    const createResponse = await makeRequest("/api/courses", "POST", {
      name: "Augusta National",
      pars: [4, 5, 4, 3, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 4, 3, 4, 4],
    });
    const created = await createResponse.json();

    const response = await makeRequest(`/api/courses/${created.id}`);
    const course = await expectJsonResponse(response);
    expect(response.status).toBe(200);
    expect(course.id).toBe(created.id);
    expect(course.name).toBe("Augusta National");
  });

  test("GET /api/courses/:id returns 404 for non-existent course", async () => {
    const response = await makeRequest("/api/courses/999");
    expectErrorResponse(response, 404);
  });

  test("PUT /api/courses/:id updates a course", async () => {
    // Create a course first
    const createResponse = await makeRequest("/api/courses", "POST", {
      name: "Augusta National",
      pars: [4, 5, 4, 3, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 4, 3, 4, 4],
    });
    const created = await createResponse.json();

    const response = await makeRequest(`/api/courses/${created.id}`, "PUT", {
      name: "Augusta National Golf Club",
      pars: [4, 4, 4, 3, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 4, 3, 4, 4],
    });

    const updated = await expectJsonResponse(response);
    expect(response.status).toBe(200);
    expect(updated.name).toBe("Augusta National Golf Club");
    expect(updated.pars).toEqual([
      4, 4, 4, 3, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 4, 3, 4, 4,
    ]);
  });

  test("PUT /api/courses/:id validates pars", async () => {
    // Create a course first
    const createResponse = await makeRequest("/api/courses", "POST", {
      name: "Augusta National",
      pars: [4, 5, 4, 3, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 4, 3, 4, 4],
    });
    const created = await createResponse.json();

    const response = await makeRequest(`/api/courses/${created.id}`, "PUT", {
      pars: [4, 5, 4], // Too few pars
    });

    expectErrorResponse(response, 400);
    const error = await response.json();
    expect(error.error).toBe("Course must have exactly 18 pars");
  });
});
