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
      expect(competitions[0].participant_count).toBeDefined();
      expect(typeof competitions[0].participant_count).toBe("number");
      expect(competitions[0].participant_count).toBe(0); // Initially no participants
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

  describe("GET /api/competitions/:id/leaderboard", () => {
    test("should calculate leaderboard with mixed scores including -1 and 0", async () => {
      // Create competition
      const competitionResponse = await makeRequest(
        "/api/competitions",
        "POST",
        {
          name: "Test Tournament",
          date: "2024-04-11",
          course_id: courseId,
        }
      );
      const competition = await competitionResponse.json();

      // Create tee time
      const teeTimeResponse = await makeRequest(
        `/api/competitions/${competition.id}/tee-times`,
        "POST",
        { teetime: "08:00" }
      );
      const teeTime = await teeTimeResponse.json();

      // Create teams
      const team1Response = await makeRequest("/api/teams", "POST", {
        name: "Team Alpha",
      });
      const team1 = await team1Response.json();

      const team2Response = await makeRequest("/api/teams", "POST", {
        name: "Team Beta",
      });
      const team2 = await team2Response.json();

      // Create participants
      const participant1Response = await makeRequest(
        "/api/participants",
        "POST",
        {
          tee_order: 1,
          team_id: team1.id,
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
          team_id: team2.id,
          tee_time_id: teeTime.id,
          position_name: "Captain",
          player_names: "Jane Smith",
        }
      );
      const participant2 = await participant2Response.json();

      // Set scores for participant 1: normal scores with one gave up (-1) and one unreported (0)
      // Holes 1-3: 4, -1, 0 (4 strokes, gave up, unreported)
      await makeRequest(`/api/participants/${participant1.id}/score`, "PUT", {
        hole: 1,
        shots: 4,
      });
      await makeRequest(`/api/participants/${participant1.id}/score`, "PUT", {
        hole: 2,
        shots: -1, // gave up
      });
      await makeRequest(`/api/participants/${participant1.id}/score`, "PUT", {
        hole: 3,
        shots: 0, // unreported/cleared
      });

      // Set scores for participant 2: all normal scores
      // Holes 1-3: 5, 6, 4
      await makeRequest(`/api/participants/${participant2.id}/score`, "PUT", {
        hole: 1,
        shots: 5,
      });
      await makeRequest(`/api/participants/${participant2.id}/score`, "PUT", {
        hole: 2,
        shots: 6,
      });
      await makeRequest(`/api/participants/${participant2.id}/score`, "PUT", {
        hole: 3,
        shots: 4,
      });

      // Get leaderboard
      const leaderboardResponse = await makeRequest(
        `/api/competitions/${competition.id}/leaderboard`
      );
      const leaderboard = await expectJsonResponse(leaderboardResponse);

      expect(leaderboard).toHaveLength(2);

      // Find participants in leaderboard
      const p1Entry = leaderboard.find(
        (entry: any) => entry.participant.id === participant1.id
      );
      const p2Entry = leaderboard.find(
        (entry: any) => entry.participant.id === participant2.id
      );

      expect(p1Entry).toBeDefined();
      expect(p2Entry).toBeDefined();

      // Participant 1: 4 shots total (only positive scores count)
      // 2 holes played (4 and -1, but not 0)
      // Relative to par: hole 1 = 4-4=0 (hole 2 and 3 don't count)
      expect(p1Entry.totalShots).toBe(4);
      expect(p1Entry.holesPlayed).toBe(2); // holes 1 and 2 (-1 counts as played)
      expect(p1Entry.relativeToPar).toBe(0); // 4-4=0 for hole 1 only

      // Participant 2: 15 shots total (5+6+4)
      // 3 holes played
      // Relative to par: (5-4)+(6-5)+(4-4) = 1+1+0 = 2
      expect(p2Entry.totalShots).toBe(15);
      expect(p2Entry.holesPlayed).toBe(3);
      expect(p2Entry.relativeToPar).toBe(2);

      // Participant 1 should be ranked higher (lower relative to par)
      expect(leaderboard[0].participant.id).toBe(participant1.id);
      expect(leaderboard[1].participant.id).toBe(participant2.id);
    });

    test("should handle participant with all unreported scores (0)", async () => {
      // Create competition
      const competitionResponse = await makeRequest(
        "/api/competitions",
        "POST",
        {
          name: "Test Tournament",
          date: "2024-04-11",
          course_id: courseId,
        }
      );
      const competition = await competitionResponse.json();

      // Create tee time
      const teeTimeResponse = await makeRequest(
        `/api/competitions/${competition.id}/tee-times`,
        "POST",
        { teetime: "08:00" }
      );
      const teeTime = await teeTimeResponse.json();

      // Create team
      const teamResponse = await makeRequest("/api/teams", "POST", {
        name: "Team Test",
      });
      const team = await teamResponse.json();

      // Create participant
      const participantResponse = await makeRequest(
        "/api/participants",
        "POST",
        {
          tee_order: 1,
          team_id: team.id,
          tee_time_id: teeTime.id,
          position_name: "Captain",
          player_names: "Test Player",
        }
      );
      const participant = await participantResponse.json();

      // Get leaderboard (participant has default empty scores)
      const leaderboardResponse = await makeRequest(
        `/api/competitions/${competition.id}/leaderboard`
      );
      const leaderboard = await expectJsonResponse(leaderboardResponse);

      expect(leaderboard).toHaveLength(1);
      const entry = leaderboard[0];

      // No scores reported should result in 0s across the board
      expect(entry.totalShots).toBe(0);
      expect(entry.holesPlayed).toBe(0);
      expect(entry.relativeToPar).toBe(0);
    });

    test("should handle participant with all gave up scores (-1)", async () => {
      // Create competition
      const competitionResponse = await makeRequest(
        "/api/competitions",
        "POST",
        {
          name: "Test Tournament",
          date: "2024-04-11",
          course_id: courseId,
        }
      );
      const competition = await competitionResponse.json();

      // Create tee time
      const teeTimeResponse = await makeRequest(
        `/api/competitions/${competition.id}/tee-times`,
        "POST",
        { teetime: "08:00" }
      );
      const teeTime = await teeTimeResponse.json();

      // Create team
      const teamResponse = await makeRequest("/api/teams", "POST", {
        name: "Team Test",
      });
      const team = await teamResponse.json();

      // Create participant
      const participantResponse = await makeRequest(
        "/api/participants",
        "POST",
        {
          tee_order: 1,
          team_id: team.id,
          tee_time_id: teeTime.id,
          position_name: "Captain",
          player_names: "Test Player",
        }
      );
      const participant = await participantResponse.json();

      // Set all scores to -1 (gave up on first 3 holes)
      await makeRequest(`/api/participants/${participant.id}/score`, "PUT", {
        hole: 1,
        shots: -1,
      });
      await makeRequest(`/api/participants/${participant.id}/score`, "PUT", {
        hole: 2,
        shots: -1,
      });
      await makeRequest(`/api/participants/${participant.id}/score`, "PUT", {
        hole: 3,
        shots: -1,
      });

      // Get leaderboard
      const leaderboardResponse = await makeRequest(
        `/api/competitions/${competition.id}/leaderboard`
      );
      const leaderboard = await expectJsonResponse(leaderboardResponse);

      expect(leaderboard).toHaveLength(1);
      const entry = leaderboard[0];

      // All gave up: 0 total shots, 3 holes played, 0 relative to par
      expect(entry.totalShots).toBe(0);
      expect(entry.holesPlayed).toBe(3);
      expect(entry.relativeToPar).toBe(0);
    });

    test("should return 404 for non-existent competition leaderboard", async () => {
      const response = await makeRequest("/api/competitions/999/leaderboard");
      expectErrorResponse(response, 404);
    });
  });
});
