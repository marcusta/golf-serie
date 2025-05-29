import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  cleanupTestDatabase,
  expectErrorResponse,
  expectJsonResponse,
  makeRequest,
  setupTestDatabase,
} from "./test-helpers";

describe("Competition API", () => {
  let db: Database;
  let courseId: number;

  beforeEach(async () => {
    db = await setupTestDatabase();

    // Create a course for testing
    const createCourseResponse = await makeRequest("/api/courses", "POST", {
      name: "Augusta National",
      pars: [4, 5, 4, 3, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 4, 3, 4, 4],
    });
    const course = await createCourseResponse.json();
    courseId = course.id;
  });

  afterEach(async () => {
    await cleanupTestDatabase(db);
  });

  test("POST /api/competitions creates a competition", async () => {
    const response = await makeRequest("/api/competitions", "POST", {
      name: "Masters 2024",
      date: "2024-04-11",
      course_id: courseId,
    });

    const competition = await expectJsonResponse(response);
    expect(response.status).toBe(201);
    expect(competition.name).toBe("Masters 2024");
    expect(competition.date).toBe("2024-04-11");
    expect(competition.course_id).toBe(courseId);
  });

  test("POST /api/competitions validates required fields", async () => {
    const response = await makeRequest("/api/competitions", "POST", {
      name: "",
      date: "2024-04-11",
      course_id: courseId,
    });

    expectErrorResponse(response, 400);
    const error = await response.json();
    expect(error.error).toBe("Competition name is required");
  });

  test("POST /api/competitions validates date format", async () => {
    const response = await makeRequest("/api/competitions", "POST", {
      name: "Masters 2024",
      date: "invalid-date",
      course_id: courseId,
    });

    expectErrorResponse(response, 400);
    const error = await response.json();
    expect(error.error).toBe("Invalid date format");
  });

  test("POST /api/competitions validates course exists", async () => {
    const response = await makeRequest("/api/competitions", "POST", {
      name: "Masters 2024",
      date: "2024-04-11",
      course_id: 999,
    });

    expectErrorResponse(response, 400);
    const error = await response.json();
    expect(error.error).toBe("Course not found");
  });

  test("GET /api/competitions lists all competitions", async () => {
    // Create a competition first
    await makeRequest("/api/competitions", "POST", {
      name: "Masters 2024",
      date: "2024-04-11",
      course_id: courseId,
    });

    const response = await makeRequest("/api/competitions");
    const competitions = await expectJsonResponse(response);
    expect(response.status).toBe(200);
    expect(Array.isArray(competitions)).toBe(true);
    expect(competitions.length).toBe(1);
    expect(competitions[0].name).toBe("Masters 2024");
    expect(competitions[0].course).toBeDefined();
    expect(competitions[0].course.name).toBe("Augusta National");
  });

  test("GET /api/competitions/:id gets a single competition", async () => {
    // Create a competition first
    const createResponse = await makeRequest("/api/competitions", "POST", {
      name: "Masters 2024",
      date: "2024-04-11",
      course_id: courseId,
    });
    const created = await createResponse.json();

    const response = await makeRequest(`/api/competitions/${created.id}`);
    const competition = await expectJsonResponse(response);
    expect(response.status).toBe(200);
    expect(competition.id).toBe(created.id);
    expect(competition.name).toBe("Masters 2024");
    expect(competition.course).toBeDefined();
    expect(competition.course.name).toBe("Augusta National");
  });

  test("GET /api/competitions/:id returns 404 for non-existent competition", async () => {
    const response = await makeRequest("/api/competitions/999");
    expectErrorResponse(response, 404);
  });

  test("PUT /api/competitions/:id updates a competition", async () => {
    // Create a competition first
    const createResponse = await makeRequest("/api/competitions", "POST", {
      name: "Masters 2024",
      date: "2024-04-11",
      course_id: courseId,
    });
    const created = await createResponse.json();

    const response = await makeRequest(
      `/api/competitions/${created.id}`,
      "PUT",
      {
        name: "The Masters 2024",
        date: "2024-04-12",
      }
    );

    const updated = await expectJsonResponse(response);
    expect(response.status).toBe(200);
    expect(updated.name).toBe("The Masters 2024");
    expect(updated.date).toBe("2024-04-12");
  });

  test("PUT /api/competitions/:id validates date format", async () => {
    // Create a competition first
    const createResponse = await makeRequest("/api/competitions", "POST", {
      name: "Masters 2024",
      date: "2024-04-11",
      course_id: courseId,
    });
    const created = await createResponse.json();

    const response = await makeRequest(
      `/api/competitions/${created.id}`,
      "PUT",
      {
        date: "invalid-date",
      }
    );

    expectErrorResponse(response, 400);
    const error = await response.json();
    expect(error.error).toBe("Invalid date format");
  });

  test("PUT /api/competitions/:id validates course exists", async () => {
    // Create a competition first
    const createResponse = await makeRequest("/api/competitions", "POST", {
      name: "Masters 2024",
      date: "2024-04-11",
      course_id: courseId,
    });
    const created = await createResponse.json();

    const response = await makeRequest(
      `/api/competitions/${created.id}`,
      "PUT",
      {
        course_id: 999,
      }
    );

    expectErrorResponse(response, 400);
    const error = await response.json();
    expect(error.error).toBe("Course not found");
  });
});
