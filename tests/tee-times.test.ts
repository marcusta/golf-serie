import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  cleanupTestDatabase,
  expectErrorResponse,
  expectJsonResponse,
  type MakeRequestFunction,
  setupTestDatabase,
} from "./test-helpers";

describe("TeeTime API", () => {
  let db: Database;
  let makeRequest: MakeRequestFunction;
  let courseId: number;
  let competitionId: number;

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

    // Create a competition
    const competitionResponse = await makeRequest("/api/competitions", "POST", {
      name: "Test Competition",
      date: "2024-07-15",
      course_id: courseId,
    });
    const competition = await competitionResponse.json();
    competitionId = competition.id;
  });

  afterEach(async () => {
    await cleanupTestDatabase(db);
  });

  describe("POST /api/competitions/:competitionId/tee-times", () => {
    test("should create a tee time", async () => {
      const teeTimeData = {
        teetime: "08:30",
      };

      const response = await makeRequest(
        `/api/competitions/${competitionId}/tee-times`,
        "POST",
        teeTimeData
      );
      expect(response.status).toBe(201);

      const teeTime = await expectJsonResponse(response);
      expect(teeTime.teetime).toBe(teeTimeData.teetime);
      expect(teeTime.competition_id).toBe(competitionId);
      expect(teeTime.id).toBeTypeOf("number");
    });

    test("should validate required fields", async () => {
      const response = await makeRequest(
        `/api/competitions/${competitionId}/tee-times`,
        "POST",
        {}
      );

      expectErrorResponse(response, 400);
    });

    test("should validate competition exists", async () => {
      const response = await makeRequest(
        "/api/competitions/999/tee-times",
        "POST",
        {
          teetime: "08:30",
        }
      );

      expectErrorResponse(response, 400);
    });
  });

  describe("GET /api/competitions/:competitionId/tee-times", () => {
    test("should return empty array when no tee times exist", async () => {
      const response = await makeRequest(
        `/api/competitions/${competitionId}/tee-times`
      );
      expect(response.status).toBe(200);

      const teeTimes = await expectJsonResponse(response);
      expect(teeTimes).toEqual([]);
    });

    test("should list all tee times for a competition", async () => {
      // Create tee times
      await makeRequest(
        `/api/competitions/${competitionId}/tee-times`,
        "POST",
        {
          teetime: "08:30",
        }
      );

      await makeRequest(
        `/api/competitions/${competitionId}/tee-times`,
        "POST",
        {
          teetime: "08:45",
        }
      );

      const response = await makeRequest(
        `/api/competitions/${competitionId}/tee-times`
      );
      expect(response.status).toBe(200);

      const teeTimes = await expectJsonResponse(response);
      expect(teeTimes).toHaveLength(2);
      expect(teeTimes[0].teetime).toBe("08:30");
      expect(teeTimes[1].teetime).toBe("08:45");
    });

    test("should return 404 for non-existent competition", async () => {
      const response = await makeRequest("/api/competitions/999/tee-times");
      expectErrorResponse(response, 404);
    });
  });

  describe("GET /api/tee-times/:id", () => {
    test("should get a single tee time with participants", async () => {
      const createResponse = await makeRequest(
        `/api/competitions/${competitionId}/tee-times`,
        "POST",
        { teetime: "08:30" }
      );
      const created = await createResponse.json();

      const response = await makeRequest(`/api/tee-times/${created.id}`);
      expect(response.status).toBe(200);

      const teeTime = await expectJsonResponse(response);
      expect(teeTime.id).toBe(created.id);
      expect(teeTime.teetime).toBe("08:30");
      expect(teeTime.participants).toEqual([]);
      expect(teeTime.course_name).toBe("Test Course");
      expect(teeTime.pars).toBeDefined();
    });

    test("should return 404 for non-existent tee time", async () => {
      const response = await makeRequest("/api/tee-times/999");
      expectErrorResponse(response, 404);
    });
  });

  describe("DELETE /api/tee-times/:id", () => {
    test("should delete a tee time", async () => {
      const createResponse = await makeRequest(
        `/api/competitions/${competitionId}/tee-times`,
        "POST",
        { teetime: "08:30" }
      );
      const created = await createResponse.json();

      const response = await makeRequest(
        `/api/tee-times/${created.id}`,
        "DELETE"
      );
      expect(response.status).toBe(204);

      // Verify it's deleted
      const getResponse = await makeRequest(`/api/tee-times/${created.id}`);
      expectErrorResponse(getResponse, 404);
    });

    test("should return 404 for non-existent tee time", async () => {
      const response = await makeRequest("/api/tee-times/999", "DELETE");
      expectErrorResponse(response, 404);
    });
  });

  describe("PUT /api/tee-times/:id/participants/order", () => {
    test("should update participants order", async () => {
      // Create tee time
      const teeTimeResponse = await makeRequest(
        `/api/competitions/${competitionId}/tee-times`,
        "POST",
        { teetime: "08:30" }
      );
      const teeTime = await teeTimeResponse.json();

      // Create team
      const teamResponse = await makeRequest("/api/teams", "POST", {
        name: "Test Team",
      });
      const team = await teamResponse.json();

      // Create participants
      const participant1Response = await makeRequest(
        "/api/participants",
        "POST",
        {
          tee_order: 1,
          team_id: team.id,
          tee_time_id: teeTime.id,
          position_name: "Captain",
          player_names: "John Doe",
        }
      );
      const participant1 = await participant1Response.json();

      const participant2Response = await makeRequest(
        "/api/participants",
        "POST",
        {
          tee_order: 2,
          team_id: team.id,
          tee_time_id: teeTime.id,
          position_name: "Player",
          player_names: "Jane Smith",
        }
      );
      const participant2 = await participant2Response.json();

      // Update order
      const orderData = {
        participantIds: [participant2.id, participant1.id], // Reverse order
      };

      const response = await makeRequest(
        `/api/tee-times/${teeTime.id}/participants/order`,
        "PUT",
        orderData
      );
      expect(response.status).toBe(200);

      // Verify order was updated
      const updatedTeeTime = await makeRequest(`/api/tee-times/${teeTime.id}`);
      const teeTimeData = await updatedTeeTime.json();
      expect(teeTimeData.participants[0].id).toBe(participant2.id);
      expect(teeTimeData.participants[0].tee_order).toBe(1);
      expect(teeTimeData.participants[1].id).toBe(participant1.id);
      expect(teeTimeData.participants[1].tee_order).toBe(2);
    });

    test("should return 404 for non-existent tee time", async () => {
      const response = await makeRequest(
        "/api/tee-times/999/participants/order",
        "PUT",
        {
          participantIds: [1, 2],
        }
      );
      expectErrorResponse(response, 404);
    });

    test("should validate participantIds array", async () => {
      const teeTimeResponse = await makeRequest(
        `/api/competitions/${competitionId}/tee-times`,
        "POST",
        { teetime: "08:30" }
      );
      const teeTime = await teeTimeResponse.json();

      const response = await makeRequest(
        `/api/tee-times/${teeTime.id}/participants/order`,
        "PUT",
        { participantIds: "invalid" }
      );
      expectErrorResponse(response, 400);
    });
  });
});
