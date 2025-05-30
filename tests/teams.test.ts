import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  cleanupTestDatabase,
  expectErrorResponse,
  expectJsonResponse,
  type MakeRequestFunction,
  setupTestDatabase,
} from "./test-helpers";

describe("Team API", () => {
  let db: Database;
  let makeRequest: MakeRequestFunction;
  let seriesId: number;

  beforeEach(async () => {
    const setup = await setupTestDatabase();
    db = setup.db;
    makeRequest = setup.makeRequest;

    // Create a series for testing
    const createSeriesResponse = await makeRequest("/api/series", "POST", {
      name: "Test Golf Series",
      description: "A test series for teams",
    });
    const series = await createSeriesResponse.json();
    seriesId = series.id;
  });

  afterEach(async () => {
    await cleanupTestDatabase(db);
  });

  describe("POST /api/teams", () => {
    test("should create a team without series", async () => {
      const response = await makeRequest("/api/teams", "POST", {
        name: "Tiger's Team",
      });

      const team = await expectJsonResponse(response);
      expect(response.status).toBe(201);
      expect(team.name).toBe("Tiger's Team");
      expect(team.series_id).toBeNull();
    });

    test("should create a team with series", async () => {
      const response = await makeRequest("/api/teams", "POST", {
        name: "Series Team",
        series_id: seriesId,
      });

      const team = await expectJsonResponse(response);
      expect(response.status).toBe(201);
      expect(team.name).toBe("Series Team");
      expect(team.series_id).toBe(seriesId);
    });

    test("should validate name", async () => {
      const response = await makeRequest("/api/teams", "POST", {
        name: "",
      });

      expectErrorResponse(response, 400);
      const error = await response.json();
      expect(error.error).toBe("Team name is required");
    });

    test("should enforce unique names", async () => {
      // Create first team
      await makeRequest("/api/teams", "POST", {
        name: "Tiger's Team",
      });

      // Try to create team with same name
      const response = await makeRequest("/api/teams", "POST", {
        name: "Tiger's Team",
      });

      expectErrorResponse(response, 400);
      const error = await response.json();
      expect(error.error).toBe("Team name must be unique");
    });

    test("should validate series exists", async () => {
      const response = await makeRequest("/api/teams", "POST", {
        name: "Invalid Series Team",
        series_id: 999,
      });

      expectErrorResponse(response, 400);
      const error = await response.json();
      expect(error.error).toBe("Series not found");
    });
  });

  describe("GET /api/teams", () => {
    test("should list all teams", async () => {
      // Create teams
      await makeRequest("/api/teams", "POST", {
        name: "Tiger's Team",
      });

      await makeRequest("/api/teams", "POST", {
        name: "Series Team",
        series_id: seriesId,
      });

      const response = await makeRequest("/api/teams");
      const teams = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(Array.isArray(teams)).toBe(true);
      expect(teams.length).toBe(2);
    });
  });

  describe("GET /api/teams/:id", () => {
    test("should get a single team", async () => {
      const createResponse = await makeRequest("/api/teams", "POST", {
        name: "Tiger's Team",
      });
      const created = await createResponse.json();

      const response = await makeRequest(`/api/teams/${created.id}`);
      const team = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(team.id).toBe(created.id);
      expect(team.name).toBe("Tiger's Team");
    });

    test("should return 404 for non-existent team", async () => {
      const response = await makeRequest("/api/teams/999");
      expectErrorResponse(response, 404);
    });
  });

  describe("PUT /api/teams/:id", () => {
    test("should update a team name", async () => {
      const createResponse = await makeRequest("/api/teams", "POST", {
        name: "Tiger's Team",
      });
      const created = await createResponse.json();

      const response = await makeRequest(`/api/teams/${created.id}`, "PUT", {
        name: "Tiger's Golf Team",
      });

      const updated = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(updated.name).toBe("Tiger's Golf Team");
    });

    test("should update team series_id", async () => {
      const createResponse = await makeRequest("/api/teams", "POST", {
        name: "Tiger's Team",
      });
      const created = await createResponse.json();

      const response = await makeRequest(`/api/teams/${created.id}`, "PUT", {
        series_id: seriesId,
      });

      const updated = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(updated.series_id).toBe(seriesId);
    });

    test("should remove series_id by setting to null", async () => {
      const createResponse = await makeRequest("/api/teams", "POST", {
        name: "Series Team",
        series_id: seriesId,
      });
      const created = await createResponse.json();

      const response = await makeRequest(`/api/teams/${created.id}`, "PUT", {
        series_id: null,
      });

      const updated = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(updated.series_id).toBeNull();
    });

    test("should validate name", async () => {
      const createResponse = await makeRequest("/api/teams", "POST", {
        name: "Tiger's Team",
      });
      const created = await createResponse.json();

      const response = await makeRequest(`/api/teams/${created.id}`, "PUT", {
        name: "",
      });

      expectErrorResponse(response, 400);
      const error = await response.json();
      expect(error.error).toBe("Team name cannot be empty");
    });

    test("should enforce unique names", async () => {
      // Create two teams
      await makeRequest("/api/teams", "POST", {
        name: "Team A",
      });
      const createResponse = await makeRequest("/api/teams", "POST", {
        name: "Team B",
      });
      const created = await createResponse.json();

      // Try to update Team B to have Team A's name
      const response = await makeRequest(`/api/teams/${created.id}`, "PUT", {
        name: "Team A",
      });

      expectErrorResponse(response, 400);
      const error = await response.json();
      expect(error.error).toBe("Team name must be unique");
    });

    test("should validate series exists", async () => {
      const createResponse = await makeRequest("/api/teams", "POST", {
        name: "Tiger's Team",
      });
      const created = await createResponse.json();

      const response = await makeRequest(`/api/teams/${created.id}`, "PUT", {
        series_id: 999,
      });

      expectErrorResponse(response, 400);
      const error = await response.json();
      expect(error.error).toBe("Series not found");
    });
  });
});
