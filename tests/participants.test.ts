import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  cleanupTestDatabase,
  expectErrorResponse,
  expectJsonResponse,
  type MakeRequestFunction,
  setupTestDatabase,
} from "./test-helpers";

describe("Participant API", () => {
  let db: Database;
  let makeRequest: MakeRequestFunction;
  let courseId: number;
  let teamId: number;
  let competitionId: number;
  let teeTimeId: number;

  beforeEach(async () => {
    const setup = await setupTestDatabase();
    db = setup.db;
    makeRequest = setup.makeRequest;

    // Create a course
    const courseResponse = await makeRequest("/api/courses", "POST", {
      name: "Test Course",
    });
    const course = await courseResponse.json();
    courseId = course.id;

    // Update course with holes
    await makeRequest(
      `/api/courses/${courseId}/holes`,
      "PUT",
      [4, 5, 4, 3, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 4, 3, 4, 4]
    );

    // Create a team
    const teamResponse = await makeRequest("/api/teams", "POST", {
      name: "Test Team",
    });
    const team = await teamResponse.json();
    teamId = team.id;

    // Create a competition
    const competitionResponse = await makeRequest("/api/competitions", "POST", {
      name: "Test Competition",
      date: "2024-07-15",
      course_id: courseId,
    });
    const competition = await competitionResponse.json();
    competitionId = competition.id;

    // Create a tee time
    const teeTimeResponse = await makeRequest(
      `/api/competitions/${competitionId}/tee-times`,
      "POST",
      {
        teetime: "08:30",
      }
    );
    const teeTime = await teeTimeResponse.json();
    teeTimeId = teeTime.id;
  });

  afterEach(async () => {
    await cleanupTestDatabase(db);
  });

  describe("POST /api/participants", () => {
    test("should create a participant", async () => {
      const participantData = {
        tee_order: 1,
        team_id: teamId,
        tee_time_id: teeTimeId,
        position_name: "Captain",
        player_names: "John Doe",
      };

      const response = await makeRequest(
        "/api/participants",
        "POST",
        participantData
      );
      expect(response.status).toBe(201);

      const participant = await expectJsonResponse(response);
      expect(participant.tee_order).toBe(participantData.tee_order);
      expect(participant.team_id).toBe(participantData.team_id);
      expect(participant.tee_time_id).toBe(participantData.tee_time_id);
      expect(participant.position_name).toBe(participantData.position_name);
      expect(participant.player_names).toBe(participantData.player_names);
      expect(participant.score).toEqual([]);
    });

    test("should create a participant without player_names", async () => {
      const participantData = {
        tee_order: 1,
        team_id: teamId,
        tee_time_id: teeTimeId,
        position_name: "Captain",
      };

      const response = await makeRequest(
        "/api/participants",
        "POST",
        participantData
      );
      expect(response.status).toBe(201);

      const participant = await expectJsonResponse(response);
      expect(participant.player_names).toBeNull();
    });

    test("should validate required fields", async () => {
      const response = await makeRequest("/api/participants", "POST", {
        team_id: teamId,
        tee_time_id: teeTimeId,
        position_name: "Captain",
      });

      expectErrorResponse(response, 400);
    });

    test("should validate team exists", async () => {
      const participantData = {
        tee_order: 1,
        team_id: 999,
        tee_time_id: teeTimeId,
        position_name: "Captain",
      };

      const response = await makeRequest(
        "/api/participants",
        "POST",
        participantData
      );
      expectErrorResponse(response, 400);
    });

    test("should validate tee time exists", async () => {
      const participantData = {
        tee_order: 1,
        team_id: teamId,
        tee_time_id: 999,
        position_name: "Captain",
      };

      const response = await makeRequest(
        "/api/participants",
        "POST",
        participantData
      );
      expectErrorResponse(response, 400);
    });
  });

  describe("GET /api/participants", () => {
    test("should return empty array when no participants exist", async () => {
      const response = await makeRequest("/api/participants");
      expect(response.status).toBe(200);

      const participants = await expectJsonResponse(response);
      expect(participants).toEqual([]);
    });

    test("should list all participants", async () => {
      // Create participants
      await makeRequest("/api/participants", "POST", {
        tee_order: 1,
        team_id: teamId,
        tee_time_id: teeTimeId,
        position_name: "Captain",
        player_names: "John Doe",
      });

      await makeRequest("/api/participants", "POST", {
        tee_order: 2,
        team_id: teamId,
        tee_time_id: teeTimeId,
        position_name: "Player",
        player_names: "Jane Smith",
      });

      const response = await makeRequest("/api/participants");
      expect(response.status).toBe(200);

      const participants = await expectJsonResponse(response);
      expect(participants).toHaveLength(2);
    });
  });

  describe("GET /api/participants/:id", () => {
    test("should get a single participant", async () => {
      const createResponse = await makeRequest("/api/participants", "POST", {
        tee_order: 1,
        team_id: teamId,
        tee_time_id: teeTimeId,
        position_name: "Captain",
        player_names: "John Doe",
      });
      const created = await createResponse.json();

      const response = await makeRequest(`/api/participants/${created.id}`);
      expect(response.status).toBe(200);

      const participant = await expectJsonResponse(response);
      expect(participant.id).toBe(created.id);
      expect(participant.position_name).toBe("Captain");
    });

    test("should return 404 for non-existent participant", async () => {
      const response = await makeRequest("/api/participants/999");
      expectErrorResponse(response, 404);
    });
  });

  describe("PUT /api/participants/:id", () => {
    test("should update a participant", async () => {
      const createResponse = await makeRequest("/api/participants", "POST", {
        tee_order: 1,
        team_id: teamId,
        tee_time_id: teeTimeId,
        position_name: "Captain",
        player_names: "John Doe",
      });
      const created = await createResponse.json();

      const updateData = {
        position_name: "Team Leader",
        player_names: "John D. Smith",
      };

      const response = await makeRequest(
        `/api/participants/${created.id}`,
        "PUT",
        updateData
      );
      expect(response.status).toBe(200);

      const updated = await expectJsonResponse(response);
      expect(updated.position_name).toBe(updateData.position_name);
      expect(updated.player_names).toBe(updateData.player_names);
    });

    test("should return 404 for non-existent participant", async () => {
      const response = await makeRequest("/api/participants/999", "PUT", {
        position_name: "Updated",
      });
      expectErrorResponse(response, 404);
    });
  });

  describe("PUT /api/participants/:id/score", () => {
    test("should update participant score", async () => {
      const createResponse = await makeRequest("/api/participants", "POST", {
        tee_order: 1,
        team_id: teamId,
        tee_time_id: teeTimeId,
        position_name: "Captain",
        player_names: "John Doe",
      });
      const created = await createResponse.json();

      const scoreData = {
        hole: 1,
        shots: 4,
      };

      const response = await makeRequest(
        `/api/participants/${created.id}/score`,
        "PUT",
        scoreData
      );
      expect(response.status).toBe(200);
      const updated = await expectJsonResponse(response);
      expect(updated.score).toEqual([
        4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      ]);
    });

    test("should accept -1 as gave up score", async () => {
      const createResponse = await makeRequest("/api/participants", "POST", {
        tee_order: 1,
        team_id: teamId,
        tee_time_id: teeTimeId,
        position_name: "Captain",
        player_names: "John Doe",
      });
      const created = await createResponse.json();

      const scoreData = {
        hole: 1,
        shots: -1,
      };

      const response = await makeRequest(
        `/api/participants/${created.id}/score`,
        "PUT",
        scoreData
      );
      expect(response.status).toBe(200);
      const updated = await expectJsonResponse(response);
      expect(updated.score).toEqual([
        -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      ]);
    });

    test("should accept 0 as unreported/cleared score", async () => {
      const createResponse = await makeRequest("/api/participants", "POST", {
        tee_order: 1,
        team_id: teamId,
        tee_time_id: teeTimeId,
        position_name: "Captain",
        player_names: "John Doe",
      });
      const created = await createResponse.json();

      // First set a score
      await makeRequest(`/api/participants/${created.id}/score`, "PUT", {
        hole: 1,
        shots: 5,
      });

      // Then clear it with 0
      const scoreData = {
        hole: 1,
        shots: 0,
      };

      const response = await makeRequest(
        `/api/participants/${created.id}/score`,
        "PUT",
        scoreData
      );
      expect(response.status).toBe(200);
      const updated = await expectJsonResponse(response);
      expect(updated.score).toEqual([
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      ]);
    });

    test("should reject negative shots other than -1", async () => {
      const createResponse = await makeRequest("/api/participants", "POST", {
        tee_order: 1,
        team_id: teamId,
        tee_time_id: teeTimeId,
        position_name: "Captain",
        player_names: "John Doe",
      });
      const created = await createResponse.json();

      const scoreData = {
        hole: 1,
        shots: -2,
      };

      const response = await makeRequest(
        `/api/participants/${created.id}/score`,
        "PUT",
        scoreData
      );
      expectErrorResponse(response, 400);
    });

    test("should validate score is an array", async () => {
      const createResponse = await makeRequest("/api/participants", "POST", {
        tee_order: 1,
        team_id: teamId,
        tee_time_id: teeTimeId,
        position_name: "Captain",
      });
      const created = await createResponse.json();

      const response = await makeRequest(
        `/api/participants/${created.id}/score`,
        "PUT",
        {
          score: "invalid",
        }
      );
      expectErrorResponse(response, 400);
    });

    test("should require shots field", async () => {
      const createResponse = await makeRequest("/api/participants", "POST", {
        tee_order: 1,
        team_id: teamId,
        tee_time_id: teeTimeId,
        position_name: "Captain",
      });
      const created = await createResponse.json();

      const response = await makeRequest(
        `/api/participants/${created.id}/score`,
        "PUT",
        {
          hole: 1,
        }
      );
      expectErrorResponse(response, 400);
    });

    test("should return 404 for non-existent participant", async () => {
      const response = await makeRequest("/api/participants/999/score", "PUT", {
        hole: 1,
        shots: 4,
      });
      expectErrorResponse(response, 404);
    });
  });

  describe("DELETE /api/participants/:id", () => {
    test("should delete a participant", async () => {
      const createResponse = await makeRequest("/api/participants", "POST", {
        tee_order: 1,
        team_id: teamId,
        tee_time_id: teeTimeId,
        position_name: "Captain",
      });
      const created = await createResponse.json();

      const response = await makeRequest(
        `/api/participants/${created.id}`,
        "DELETE"
      );
      expect(response.status).toBe(204);

      // Verify it's deleted
      const getResponse = await makeRequest(`/api/participants/${created.id}`);
      expectErrorResponse(getResponse, 404);
    });

    test("should return 404 for non-existent participant", async () => {
      const response = await makeRequest("/api/participants/999", "DELETE");
      expectErrorResponse(response, 404);
    });
  });

  describe("GET /api/competitions/:competitionId/participants", () => {
    test("should get participants for a competition", async () => {
      // Create participants
      await makeRequest("/api/participants", "POST", {
        tee_order: 1,
        team_id: teamId,
        tee_time_id: teeTimeId,
        position_name: "Captain",
        player_names: "John Doe",
      });

      await makeRequest("/api/participants", "POST", {
        tee_order: 2,
        team_id: teamId,
        tee_time_id: teeTimeId,
        position_name: "Player",
        player_names: "Jane Smith",
      });

      console.log("competitionId ", competitionId);

      const response = await makeRequest(
        `/api/competitions/${competitionId}/participants`
      );
      expect(response.status).toBe(200);

      const participants = await expectJsonResponse(response);
      expect(participants).toHaveLength(2);
    });

    test("should return empty array for competition with no participants", async () => {
      const response = await makeRequest(
        `/api/competitions/${competitionId}/participants`
      );
      expect(response.status).toBe(200);

      const participants = await expectJsonResponse(response);
      expect(participants).toEqual([]);
    });
  });
});
