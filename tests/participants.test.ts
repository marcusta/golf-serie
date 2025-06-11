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

  describe("POST /api/participants/:id/lock", () => {
    test("should lock a participant scorecard", async () => {
      const createResponse = await makeRequest("/api/participants", "POST", {
        tee_order: 1,
        team_id: teamId,
        tee_time_id: teeTimeId,
        position_name: "Captain",
        player_names: "John Doe",
      });
      const created = await createResponse.json();

      const response = await makeRequest(
        `/api/participants/${created.id}/lock`,
        "POST"
      );
      expect(response.status).toBe(200);

      const participant = await expectJsonResponse(response);
      expect(participant.is_locked).toBe(true);
      expect(participant.locked_at).toBeDefined();
      expect(typeof participant.locked_at).toBe("string");
    });

    test("should return 404 for non-existent participant", async () => {
      const response = await makeRequest("/api/participants/999/lock", "POST");
      expectErrorResponse(response, 404);
    });
  });

  describe("POST /api/participants/:id/unlock", () => {
    test("should unlock a participant scorecard", async () => {
      const createResponse = await makeRequest("/api/participants", "POST", {
        tee_order: 1,
        team_id: teamId,
        tee_time_id: teeTimeId,
        position_name: "Captain",
        player_names: "John Doe",
      });
      const created = await createResponse.json();

      // First lock the participant
      await makeRequest(`/api/participants/${created.id}/lock`, "POST");

      // Then unlock it
      const response = await makeRequest(
        `/api/participants/${created.id}/unlock`,
        "POST"
      );
      expect(response.status).toBe(200);

      const participant = await expectJsonResponse(response);
      expect(participant.is_locked).toBe(false);
      expect(participant.locked_at).toBeNull();
    });

    test("should return 404 for non-existent participant", async () => {
      const response = await makeRequest(
        "/api/participants/999/unlock",
        "POST"
      );
      expectErrorResponse(response, 404);
    });
  });

  describe("PUT /api/participants/:id/score (with lock)", () => {
    test("should prevent score updates when participant is locked", async () => {
      const createResponse = await makeRequest("/api/participants", "POST", {
        tee_order: 1,
        team_id: teamId,
        tee_time_id: teeTimeId,
        position_name: "Captain",
        player_names: "John Doe",
      });
      const created = await createResponse.json();

      // Lock the participant
      await makeRequest(`/api/participants/${created.id}/lock`, "POST");

      // Try to update score - should fail
      const scoreData = {
        hole: 1,
        shots: 4,
      };

      const response = await makeRequest(
        `/api/participants/${created.id}/score`,
        "PUT",
        scoreData
      );
      expectErrorResponse(response, 400);

      const errorResponse = await response.json();
      expect(errorResponse.error).toBe(
        "Scorecard is locked and cannot be modified."
      );
    });

    test("should allow score updates when participant is unlocked", async () => {
      const createResponse = await makeRequest("/api/participants", "POST", {
        tee_order: 1,
        team_id: teamId,
        tee_time_id: teeTimeId,
        position_name: "Captain",
        player_names: "John Doe",
      });
      const created = await createResponse.json();

      // Lock the participant
      await makeRequest(`/api/participants/${created.id}/lock`, "POST");

      // Unlock the participant
      await makeRequest(`/api/participants/${created.id}/unlock`, "POST");

      // Now score update should work
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
      expect(updated.score[0]).toBe(4);
    });
  });

  describe("Participant fields validation", () => {
    test("should include lock status in participant responses", async () => {
      const createResponse = await makeRequest("/api/participants", "POST", {
        tee_order: 1,
        team_id: teamId,
        tee_time_id: teeTimeId,
        position_name: "Captain",
        player_names: "John Doe",
      });
      expect(createResponse.status).toBe(201);

      const participant = await expectJsonResponse(createResponse);
      expect(participant.is_locked).toBe(false);
      expect(participant.locked_at).toBeNull();
      expect(participant.hasOwnProperty("is_locked")).toBe(true);
      expect(participant.hasOwnProperty("locked_at")).toBe(true);
    });

    test("should include lock status when getting by ID", async () => {
      const createResponse = await makeRequest("/api/participants", "POST", {
        tee_order: 1,
        team_id: teamId,
        tee_time_id: teeTimeId,
        position_name: "Captain",
      });
      const created = await createResponse.json();

      const response = await makeRequest(`/api/participants/${created.id}`);
      const participant = await expectJsonResponse(response);
      expect(participant.is_locked).toBe(false);
      expect(participant.locked_at).toBeNull();
    });

    test("should include lock status in list responses", async () => {
      await makeRequest("/api/participants", "POST", {
        tee_order: 1,
        team_id: teamId,
        tee_time_id: teeTimeId,
        position_name: "Captain",
      });

      const response = await makeRequest("/api/participants");
      const participants = await expectJsonResponse(response);
      expect(participants).toHaveLength(1);
      expect(participants[0].is_locked).toBe(false);
      expect(participants[0].locked_at).toBeNull();
    });
  });

  describe("PUT /api/participants/:id/manual-score", () => {
    test("should update manual scores for a participant", async () => {
      const createResponse = await makeRequest("/api/participants", "POST", {
        tee_order: 1,
        team_id: teamId,
        tee_time_id: teeTimeId,
        position_name: "Captain",
        player_names: "John Doe",
      });
      const created = await createResponse.json();

      const manualScoreData = {
        out: 40,
        in: 41,
        total: 81,
      };

      const response = await makeRequest(
        `/api/participants/${created.id}/manual-score`,
        "PUT",
        manualScoreData
      );
      expect(response.status).toBe(200);

      const participant = await expectJsonResponse(response);
      expect(participant.manual_score_out).toBe(40);
      expect(participant.manual_score_in).toBe(41);
      expect(participant.manual_score_total).toBe(81);
    });

    test("should validate required fields", async () => {
      const createResponse = await makeRequest("/api/participants", "POST", {
        tee_order: 1,
        team_id: teamId,
        tee_time_id: teeTimeId,
        position_name: "Captain",
      });
      const created = await createResponse.json();

      const response = await makeRequest(
        `/api/participants/${created.id}/manual-score`,
        "PUT",
        {
          out: 40,
          in: 41,
          // total missing
        }
      );
      expectErrorResponse(response, 400);
    });

    test("should validate non-negative integers", async () => {
      const createResponse = await makeRequest("/api/participants", "POST", {
        tee_order: 1,
        team_id: teamId,
        tee_time_id: teeTimeId,
        position_name: "Captain",
      });
      const created = await createResponse.json();

      const response = await makeRequest(
        `/api/participants/${created.id}/manual-score`,
        "PUT",
        {
          out: -5,
          in: 41,
          total: 81,
        }
      );
      expectErrorResponse(response, 400);

      const errorResponse = await response.json();
      expect(errorResponse.error).toBe(
        "Out score must be a non-negative integer or null to clear"
      );
    });

    test("should validate that scores are integers", async () => {
      const createResponse = await makeRequest("/api/participants", "POST", {
        tee_order: 1,
        team_id: teamId,
        tee_time_id: teeTimeId,
        position_name: "Captain",
      });
      const created = await createResponse.json();

      const response = await makeRequest(
        `/api/participants/${created.id}/manual-score`,
        "PUT",
        {
          out: 40.5,
          in: 41,
          total: 81,
        }
      );
      expectErrorResponse(response, 400);
    });

    test("should return 404 for non-existent participant", async () => {
      const response = await makeRequest(
        "/api/participants/999/manual-score",
        "PUT",
        {
          out: 40,
          in: 41,
          total: 81,
        }
      );
      expectErrorResponse(response, 404);
    });

    test("should update existing manual scores", async () => {
      const createResponse = await makeRequest("/api/participants", "POST", {
        tee_order: 1,
        team_id: teamId,
        tee_time_id: teeTimeId,
        position_name: "Captain",
      });
      const created = await createResponse.json();

      // Set initial manual scores
      await makeRequest(`/api/participants/${created.id}/manual-score`, "PUT", {
        out: 40,
        in: 41,
        total: 81,
      });

      // Update with new scores
      const response = await makeRequest(
        `/api/participants/${created.id}/manual-score`,
        "PUT",
        {
          out: 38,
          in: 39,
          total: 77,
        }
      );
      expect(response.status).toBe(200);

      const participant = await expectJsonResponse(response);
      expect(participant.manual_score_out).toBe(38);
      expect(participant.manual_score_in).toBe(39);
      expect(participant.manual_score_total).toBe(77);
    });

    test("should include manual scores in participant responses", async () => {
      const createResponse = await makeRequest("/api/participants", "POST", {
        tee_order: 1,
        team_id: teamId,
        tee_time_id: teeTimeId,
        position_name: "Captain",
      });
      const created = await createResponse.json();

      // Set manual scores
      await makeRequest(`/api/participants/${created.id}/manual-score`, "PUT", {
        out: 40,
        in: 41,
        total: 81,
      });

      // Check GET by ID includes manual scores
      const getResponse = await makeRequest(`/api/participants/${created.id}`);
      const participant = await expectJsonResponse(getResponse);
      expect(participant.manual_score_out).toBe(40);
      expect(participant.manual_score_in).toBe(41);
      expect(participant.manual_score_total).toBe(81);
    });

    test("should include team name in manual score response", async () => {
      const createResponse = await makeRequest("/api/participants", "POST", {
        tee_order: 1,
        team_id: teamId,
        tee_time_id: teeTimeId,
        position_name: "Captain",
      });
      const created = await createResponse.json();

      // Set manual scores
      const updateResponse = await makeRequest(
        `/api/participants/${created.id}/manual-score`,
        "PUT",
        {
          out: 40,
          in: 41,
          total: 81,
        }
      );
      const updated = await expectJsonResponse(updateResponse);

      // Verify team name is included
      expect(updated.team_name).toBe("Test Team");
    });

    test("should update manual scores with only total (for total_only mode)", async () => {
      const courseResponse = await makeRequest("/api/courses", "POST", {
        name: "Test Course",
        description: "Test course for total only",
      });
      const course = await expectJsonResponse(courseResponse);

      await makeRequest(`/api/courses/${course.id}/holes`, "PUT", {
        holes: [{ number: 1, par: 4 }],
      });

      const teamResponse = await makeRequest("/api/teams", "POST", {
        name: "Test Team Total Only",
      });
      const team = await expectJsonResponse(teamResponse);

      const competitionResponse = await makeRequest(
        "/api/competitions",
        "POST",
        {
          name: "Test Competition Total Only",
          date: "2024-01-15",
          course_id: course.id,
        }
      );
      const competition = await expectJsonResponse(competitionResponse);

      const teeTimeResponse = await makeRequest(
        `/api/competitions/${competition.id}/tee-times`,
        "POST",
        {
          teetime: "10:00",
        }
      );
      const teeTime = await expectJsonResponse(teeTimeResponse);

      const participantResponse = await makeRequest(
        "/api/participants",
        "POST",
        {
          tee_order: 1,
          team_id: team.id,
          tee_time_id: teeTime.id,
          position_name: "Total Test Player",
        }
      );
      const participant = await expectJsonResponse(participantResponse);

      // Update with total only
      const updateResponse = await makeRequest(
        `/api/participants/${participant.id}/manual-score`,
        "PUT",
        {
          total: 85,
        }
      );
      expect(updateResponse.status).toBe(200);

      const updated = await expectJsonResponse(updateResponse);
      expect(updated.manual_score_total).toBe(85);
      expect(updated.manual_score_out).toBeNull();
      expect(updated.manual_score_in).toBeNull();
    });

    test("should clear manual scores when set to null", async () => {
      const courseResponse = await makeRequest("/api/courses", "POST", {
        name: "Test Course Clear",
        description: "Test course for clearing scores",
      });
      const course = await expectJsonResponse(courseResponse);

      await makeRequest(`/api/courses/${course.id}/holes`, "PUT", {
        holes: [{ number: 1, par: 4 }],
      });

      const teamResponse = await makeRequest("/api/teams", "POST", {
        name: "Test Team Clear",
      });
      const team = await expectJsonResponse(teamResponse);

      const competitionResponse = await makeRequest(
        "/api/competitions",
        "POST",
        {
          name: "Test Competition Clear",
          date: "2024-01-15",
          course_id: course.id,
        }
      );
      const competition = await expectJsonResponse(competitionResponse);

      const teeTimeResponse = await makeRequest(
        `/api/competitions/${competition.id}/tee-times`,
        "POST",
        {
          teetime: "10:00",
        }
      );
      const teeTime = await expectJsonResponse(teeTimeResponse);

      const participantResponse = await makeRequest(
        "/api/participants",
        "POST",
        {
          tee_order: 1,
          team_id: team.id,
          tee_time_id: teeTime.id,
          position_name: "Clear Test Player",
        }
      );
      expect(participantResponse.status).toBe(201);
      const participant = await expectJsonResponse(participantResponse);

      // First, set some manual scores
      const setResponse = await makeRequest(
        `/api/participants/${participant.id}/manual-score`,
        "PUT",
        {
          out: 40,
          in: 45,
          total: 85,
        }
      );
      expect(setResponse.status).toBe(200);

      // Then clear them
      const clearResponse = await makeRequest(
        `/api/participants/${participant.id}/manual-score`,
        "PUT",
        {
          out: null,
          in: null,
          total: null,
        }
      );
      expect(clearResponse.status).toBe(200);

      const cleared = await expectJsonResponse(clearResponse);
      expect(cleared.manual_score_out).toBeNull();
      expect(cleared.manual_score_in).toBeNull();
      expect(cleared.manual_score_total).toBeNull();
    });
  });
});
