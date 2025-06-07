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

  beforeEach(async () => {
    const setup = await setupTestDatabase();
    db = setup.db;
    makeRequest = setup.makeRequest;
  });

  afterEach(async () => {
    await cleanupTestDatabase(db);
  });

  describe("POST /api/teams", () => {
    test("should create a team", async () => {
      const response = await makeRequest("/api/teams", "POST", {
        name: "Tiger's Team",
      });

      const team = await expectJsonResponse(response);
      expect(response.status).toBe(201);
      expect(team.name).toBe("Tiger's Team");
      expect(team.id).toBeNumber();
      expect(team.created_at).toBeString();
      expect(team.updated_at).toBeString();
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
  });

  describe("GET /api/teams", () => {
    test("should list all teams", async () => {
      // Create teams
      await makeRequest("/api/teams", "POST", {
        name: "Tiger's Team",
      });

      await makeRequest("/api/teams", "POST", {
        name: "Phil's Team",
      });

      const response = await makeRequest("/api/teams");
      const teams = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(Array.isArray(teams)).toBe(true);
      expect(teams.length).toBe(2);
    });

    test("should return empty array when no teams exist", async () => {
      const response = await makeRequest("/api/teams");
      const teams = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(Array.isArray(teams)).toBe(true);
      expect(teams.length).toBe(0);
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
      expect(team.created_at).toBeString();
      expect(team.updated_at).toBeString();
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
      expect(updated.id).toBe(created.id);
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

    test("should return 404 for non-existent team", async () => {
      const response = await makeRequest("/api/teams/999", "PUT", {
        name: "New Name",
      });

      expectErrorResponse(response, 400);
      const error = await response.json();
      expect(error.error).toBe("Team not found");
    });
  });

  describe("Many-to-many relationship with series", () => {
    let seriesId1: number;
    let seriesId2: number;
    let teamId: number;

    beforeEach(async () => {
      // Create test series
      const series1Response = await makeRequest("/api/series", "POST", {
        name: "Summer Series",
        description: "Summer golf competitions",
      });
      const series1 = await expectJsonResponse(series1Response);
      seriesId1 = series1.id;

      const series2Response = await makeRequest("/api/series", "POST", {
        name: "Winter Series",
        description: "Winter golf competitions",
      });
      const series2 = await expectJsonResponse(series2Response);
      seriesId2 = series2.id;

      // Create test team
      const teamResponse = await makeRequest("/api/teams", "POST", {
        name: "Test Team",
      });
      const team = await expectJsonResponse(teamResponse);
      teamId = team.id;
    });

    test("should add team to series", async () => {
      // Add team to first series
      const response = await makeRequest(
        `/api/series/${seriesId1}/teams/${teamId}`,
        "POST"
      );
      expect(response.status).toBe(200);

      // Verify team is in series
      const seriesTeamsResponse = await makeRequest(
        `/api/series/${seriesId1}/teams`
      );
      const seriesTeams = await expectJsonResponse(seriesTeamsResponse);
      expect(seriesTeams).toHaveLength(1);
      expect(seriesTeams[0].id).toBe(teamId);
      expect(seriesTeams[0].name).toBe("Test Team");
    });

    test("should add team to multiple series", async () => {
      // Add team to both series
      await makeRequest(`/api/series/${seriesId1}/teams/${teamId}`, "POST");
      await makeRequest(`/api/series/${seriesId2}/teams/${teamId}`, "POST");

      // Verify team is in both series
      const series1TeamsResponse = await makeRequest(
        `/api/series/${seriesId1}/teams`
      );
      const series1Teams = await expectJsonResponse(series1TeamsResponse);
      expect(series1Teams).toHaveLength(1);
      expect(series1Teams[0].id).toBe(teamId);

      const series2TeamsResponse = await makeRequest(
        `/api/series/${seriesId2}/teams`
      );
      const series2Teams = await expectJsonResponse(series2TeamsResponse);
      expect(series2Teams).toHaveLength(1);
      expect(series2Teams[0].id).toBe(teamId);
    });

    test("should remove team from series", async () => {
      // Add team to series
      await makeRequest(`/api/series/${seriesId1}/teams/${teamId}`, "POST");

      // Remove team from series
      const response = await makeRequest(
        `/api/series/${seriesId1}/teams/${teamId}`,
        "DELETE"
      );
      expect(response.status).toBe(200);

      // Verify team is no longer in series
      const seriesTeamsResponse = await makeRequest(
        `/api/series/${seriesId1}/teams`
      );
      const seriesTeams = await expectJsonResponse(seriesTeamsResponse);
      expect(seriesTeams).toHaveLength(0);
    });

    test("should prevent duplicate team in same series", async () => {
      // Add team to series
      await makeRequest(`/api/series/${seriesId1}/teams/${teamId}`, "POST");

      // Try to add same team again
      const response = await makeRequest(
        `/api/series/${seriesId1}/teams/${teamId}`,
        "POST"
      );
      expectErrorResponse(response, 400);
      const error = await response.json();
      expect(error.error).toBe("Team is already in this series");
    });

    test("should show available teams for series", async () => {
      // Initially all teams should be available
      const availableResponse = await makeRequest(
        `/api/series/${seriesId1}/available-teams`
      );
      const availableTeams = await expectJsonResponse(availableResponse);
      expect(availableTeams).toHaveLength(1);
      expect(availableTeams[0].id).toBe(teamId);

      // Add team to series
      await makeRequest(`/api/series/${seriesId1}/teams/${teamId}`, "POST");

      // Now no teams should be available
      const availableAfterResponse = await makeRequest(
        `/api/series/${seriesId1}/available-teams`
      );
      const availableAfterTeams = await expectJsonResponse(
        availableAfterResponse
      );
      expect(availableAfterTeams).toHaveLength(0);
    });
  });
});
