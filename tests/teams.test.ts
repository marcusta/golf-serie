import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  cleanupTestDatabase,
  expectErrorResponse,
  expectJsonResponse,
  makeRequest,
  setupTestDatabase,
} from "./test-helpers";

describe("Team API", () => {
  let db: Database;

  beforeEach(async () => {
    db = await setupTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestDatabase(db);
  });

  test("POST /api/teams creates a team", async () => {
    const response = await makeRequest("/api/teams", "POST", {
      name: "Tiger's Team",
    });

    const team = await expectJsonResponse(response);
    expect(response.status).toBe(201);
    expect(team.name).toBe("Tiger's Team");
  });

  test("POST /api/teams validates name", async () => {
    const response = await makeRequest("/api/teams", "POST", {
      name: "",
    });

    expectErrorResponse(response, 400);
    const error = await response.json();
    expect(error.error).toBe("Team name is required");
  });

  test("POST /api/teams enforces unique names", async () => {
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

  test("GET /api/teams lists all teams", async () => {
    // Create a team first
    await makeRequest("/api/teams", "POST", {
      name: "Tiger's Team",
    });

    const response = await makeRequest("/api/teams");
    const teams = await expectJsonResponse(response);
    expect(response.status).toBe(200);
    expect(Array.isArray(teams)).toBe(true);
    expect(teams.length).toBe(1);
    expect(teams[0].name).toBe("Tiger's Team");
  });

  test("GET /api/teams/:id gets a single team", async () => {
    // Create a team first
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

  test("GET /api/teams/:id returns 404 for non-existent team", async () => {
    const response = await makeRequest("/api/teams/999");
    expectErrorResponse(response, 404);
  });

  test("PUT /api/teams/:id updates a team", async () => {
    // Create a team first
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

  test("PUT /api/teams/:id validates name", async () => {
    // Create a team first
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

  test("PUT /api/teams/:id enforces unique names", async () => {
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
});
