import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  cleanupTestDatabase,
  expectErrorResponse,
  expectJsonResponse,
  setupTestDatabase,
  type MakeRequestFunction,
} from "./test-helpers";

describe("Competition API", () => {
  let db: Database;
  let makeRequest: MakeRequestFunction;
  let courseId: number;
  let seriesId: number;

  beforeEach(async () => {
    const setup = await setupTestDatabase();
    db = setup.db;
    makeRequest = setup.makeRequest;

    // Create a course for testing
    const createCourseResponse = await makeRequest("/api/courses", "POST", {
      name: "Augusta National",
    });
    const course = await createCourseResponse.json();
    courseId = course.id;

    // Update course with holes
    await makeRequest(
      `/api/courses/${courseId}/holes`,
      "PUT",
      [4, 5, 4, 3, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 4, 3, 4, 4]
    );

    // Create a series for testing
    const createSeriesResponse = await makeRequest("/api/series", "POST", {
      name: "Test Golf Series",
      description: "A test series for competitions",
    });
    const series = await createSeriesResponse.json();
    seriesId = series.id;
  });

  afterEach(async () => {
    await cleanupTestDatabase(db);
  });

  describe("POST /api/competitions", () => {
    test("should create a competition without series", async () => {
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
      expect(competition.series_id).toBeNull();
    });

    test("should create a competition with series", async () => {
      const response = await makeRequest("/api/competitions", "POST", {
        name: "Series Championship",
        date: "2024-04-11",
        course_id: courseId,
        series_id: seriesId,
      });

      const competition = await expectJsonResponse(response);
      expect(response.status).toBe(201);
      expect(competition.name).toBe("Series Championship");
      expect(competition.series_id).toBe(seriesId);
    });

    test("should validate required fields", async () => {
      const response = await makeRequest("/api/competitions", "POST", {
        name: "",
        date: "2024-04-11",
        course_id: courseId,
      });

      expectErrorResponse(response, 400);
      const error = await response.json();
      expect(error.error).toBe("Competition name is required");
    });

    test("should validate date format", async () => {
      const response = await makeRequest("/api/competitions", "POST", {
        name: "Masters 2024",
        date: "invalid-date",
        course_id: courseId,
      });

      expectErrorResponse(response, 400);
      const error = await response.json();
      expect(error.error).toBe(
        "Date must be in YYYY-MM-DD format (e.g., 2024-03-21)"
      );
    });

    test("should validate course exists", async () => {
      const response = await makeRequest("/api/competitions", "POST", {
        name: "Masters 2024",
        date: "2024-04-11",
        course_id: 999,
      });

      expectErrorResponse(response, 400);
      const error = await response.json();
      expect(error.error).toBe("Course not found");
    });

    test("should validate series exists", async () => {
      const response = await makeRequest("/api/competitions", "POST", {
        name: "Invalid Series Competition",
        date: "2024-04-11",
        course_id: courseId,
        series_id: 999,
      });

      expectErrorResponse(response, 400);
      const error = await response.json();
      expect(error.error).toBe("Series not found");
    });
  });

  describe("GET /api/competitions", () => {
    test("should list all competitions", async () => {
      // Create competitions
      await makeRequest("/api/competitions", "POST", {
        name: "Masters 2024",
        date: "2024-04-11",
        course_id: courseId,
      });

      await makeRequest("/api/competitions", "POST", {
        name: "Series Championship",
        date: "2024-05-11",
        course_id: courseId,
        series_id: seriesId,
      });

      const response = await makeRequest("/api/competitions");
      const competitions = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(Array.isArray(competitions)).toBe(true);
      expect(competitions.length).toBe(2);
      expect(competitions[0].course).toBeDefined();
      expect(competitions[0].course.name).toBe("Augusta National");
    });
  });

  describe("GET /api/competitions/:id", () => {
    test("should get a single competition", async () => {
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

    test("should return 404 for non-existent competition", async () => {
      const response = await makeRequest("/api/competitions/999");
      expectErrorResponse(response, 404);
    });
  });

  describe("PUT /api/competitions/:id", () => {
    test("should update a competition", async () => {
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

    test("should update competition series_id", async () => {
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
          series_id: seriesId,
        }
      );

      const updated = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(updated.series_id).toBe(seriesId);
    });

    test("should remove series_id by setting to null", async () => {
      const createResponse = await makeRequest("/api/competitions", "POST", {
        name: "Series Competition",
        date: "2024-04-11",
        course_id: courseId,
        series_id: seriesId,
      });
      const created = await createResponse.json();

      const response = await makeRequest(
        `/api/competitions/${created.id}`,
        "PUT",
        {
          series_id: null,
        }
      );

      const updated = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(updated.series_id).toBeNull();
    });

    test("should validate date format", async () => {
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
      expect(error.error).toBe(
        "Date must be in YYYY-MM-DD format (e.g., 2024-03-21)"
      );
    });

    test("should validate course exists", async () => {
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

    test("should validate series exists", async () => {
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
          series_id: 999,
        }
      );

      expectErrorResponse(response, 400);
      const error = await response.json();
      expect(error.error).toBe("Series not found");
    });
  });

  describe("DELETE /api/competitions/:id", () => {
    test("should delete a competition", async () => {
      const createResponse = await makeRequest("/api/competitions", "POST", {
        name: "To Delete",
        date: "2024-04-11",
        course_id: courseId,
      });
      const created = await createResponse.json();

      const response = await makeRequest(
        `/api/competitions/${created.id}`,
        "DELETE"
      );
      expect(response.status).toBe(204);

      // Verify it's deleted
      const getResponse = await makeRequest(`/api/competitions/${created.id}`);
      expectErrorResponse(getResponse, 404);
    });
  });
});
