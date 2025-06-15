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
      const createResponse = await makeRequest("/api/competitions", "POST", {
        name: "Championship",
        date: "2024-06-01",
        course_id: courseId,
        series_id: seriesId,
      });

      const competition = await expectJsonResponse(createResponse);
      expect(competition.name).toBe("Championship");
      expect(competition.series_id).toBe(seriesId);
      expect(competition.manual_entry_format).toBe("out_in_total"); // Default value
    });

    test("should create a competition with manual_entry_format", async () => {
      const createResponse = await makeRequest("/api/competitions", "POST", {
        name: "Total Only Competition",
        date: "2024-06-01",
        course_id: courseId,
        series_id: seriesId,
        manual_entry_format: "total_only",
      });

      const competition = await expectJsonResponse(createResponse);
      expect(competition.name).toBe("Total Only Competition");
      expect(competition.manual_entry_format).toBe("total_only");
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

    test("should calculate leaderboard with manual scores", async () => {
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
        name: "Manual Score Team",
      });
      const team1 = await team1Response.json();

      const team2Response = await makeRequest("/api/teams", "POST", {
        name: "Regular Score Team",
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
          player_names: "Manual Score Player",
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
          player_names: "Regular Score Player",
        }
      );
      const participant2 = await participant2Response.json();

      // Set manual scores for participant 1 (total of 75, which should be 3 under par for 18 holes)
      await makeRequest(
        `/api/participants/${participant1.id}/manual-score`,
        "PUT",
        {
          out: 37,
          in: 38,
          total: 75,
        }
      );

      // Set regular hole-by-hole scores for participant 2 (worse performance)
      // Set scores for first 3 holes: 5, 6, 5 = 16 total, +3 relative to par
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
        shots: 5,
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

      // Participant 1 (manual scores): 75 total shots, 18 holes played, +4 relative to par (75 - 71 = +4)
      expect(p1Entry.totalShots).toBe(75);
      expect(p1Entry.holesPlayed).toBe(18);
      expect(p1Entry.relativeToPar).toBe(4); // 75 - 71 = +4

      // Participant 2 (hole-by-hole): 16 shots for 3 holes, +3 relative to par
      expect(p2Entry.totalShots).toBe(16);
      expect(p2Entry.holesPlayed).toBe(3);
      expect(p2Entry.relativeToPar).toBe(3); // (5-4)+(6-5)+(5-4) = 1+1+1 = 3

      // Participant 2 should be ranked higher (lower relative to par: +3 vs +4)
      expect(leaderboard[0].participant.id).toBe(participant2.id);
      expect(leaderboard[1].participant.id).toBe(participant1.id);
    });

    test("should prioritize manual scores over hole-by-hole scores when both exist", async () => {
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
        name: "Test Team",
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

      // Set hole-by-hole scores first (bad scores)
      await makeRequest(`/api/participants/${participant.id}/score`, "PUT", {
        hole: 1,
        shots: 8,
      });
      await makeRequest(`/api/participants/${participant.id}/score`, "PUT", {
        hole: 2,
        shots: 9,
      });

      // Then set manual scores (good scores)
      await makeRequest(
        `/api/participants/${participant.id}/manual-score`,
        "PUT",
        {
          out: 35,
          in: 36,
          total: 71,
        }
      );

      // Get leaderboard
      const leaderboardResponse = await makeRequest(
        `/api/competitions/${competition.id}/leaderboard`
      );
      const leaderboard = await expectJsonResponse(leaderboardResponse);

      expect(leaderboard).toHaveLength(1);
      const entry = leaderboard[0];

      // Should use manual scores (71 total), not hole-by-hole scores (8+9=17)
      expect(entry.totalShots).toBe(71);
      expect(entry.holesPlayed).toBe(18);
      expect(entry.relativeToPar).toBe(0); // 71 - 71 = 0
    });

    test("should handle three-level tie-breaker in team standings", async () => {
      // Setup: Create a complex scenario to test all three tie-breaker levels through series standings

      // Create series first
      const seriesResponse = await makeRequest("/api/series", "POST", {
        name: "Tie-Breaker Test Series",
        description: "Testing tie-breaker scenarios",
      });
      const series = await expectJsonResponse(seriesResponse);

      // Create competition within the series
      const competitionResponse = await makeRequest(
        "/api/competitions",
        "POST",
        {
          name: "Tie-Breaker Competition",
          date: "2024-01-15",
          course_id: courseId,
          series_id: series.id,
        }
      );
      const competition = await expectJsonResponse(competitionResponse);

      // Create tee time
      const teeTimeResponse = await makeRequest(
        `/api/competitions/${competition.id}/tee-times`,
        "POST",
        { teetime: "09:00" }
      );
      const teeTime = await expectJsonResponse(teeTimeResponse);

      // Create teams with identical relativeToPar and totalShots, but different lowest individual scores
      const teamAResponse = await makeRequest("/api/teams", "POST", {
        name: "Team A",
      });
      const teamA = await expectJsonResponse(teamAResponse);

      const teamBResponse = await makeRequest("/api/teams", "POST", {
        name: "Team B",
      });
      const teamB = await expectJsonResponse(teamBResponse);

      const teamCResponse = await makeRequest("/api/teams", "POST", {
        name: "Team C",
      });
      const teamC = await expectJsonResponse(teamCResponse);

      // Add teams to series
      await makeRequest(`/api/series/${series.id}/teams`, "POST", {
        team_id: teamA.id,
      });
      await makeRequest(`/api/series/${series.id}/teams`, "POST", {
        team_id: teamB.id,
      });
      await makeRequest(`/api/series/${series.id}/teams`, "POST", {
        team_id: teamC.id,
      });

      // Team A participants: manual scores 70 and 74 (total 144, +2 relative to par)
      const participantA1Response = await makeRequest(
        "/api/participants",
        "POST",
        {
          tee_order: 1,
          tee_time_id: teeTime.id,
          team_id: teamA.id,
          player_names: "Player A1",
          position_name: "Captain",
        }
      );
      const participantA1 = await expectJsonResponse(participantA1Response);

      await makeRequest(
        `/api/participants/${participantA1.id}/manual-score`,
        "PUT",
        {
          total: 70, // 1 under par (individual)
        }
      );

      const participantA2Response = await makeRequest(
        "/api/participants",
        "POST",
        {
          tee_order: 2,
          tee_time_id: teeTime.id,
          team_id: teamA.id,
          player_names: "Player A2",
          position_name: "Player",
        }
      );
      const participantA2 = await expectJsonResponse(participantA2Response);

      await makeRequest(
        `/api/participants/${participantA2.id}/manual-score`,
        "PUT",
        {
          total: 74, // 3 over par (individual)
        }
      );

      // Team B participants: manual scores 69 and 75 (total 144, +2 relative to par)
      const participantB1Response = await makeRequest(
        "/api/participants",
        "POST",
        {
          tee_order: 1,
          tee_time_id: teeTime.id,
          team_id: teamB.id,
          player_names: "Player B1",
          position_name: "Captain",
        }
      );
      const participantB1 = await expectJsonResponse(participantB1Response);

      await makeRequest(
        `/api/participants/${participantB1.id}/manual-score`,
        "PUT",
        {
          total: 69, // 2 under par (individual) - LOWEST INDIVIDUAL SCORE
        }
      );

      const participantB2Response = await makeRequest(
        "/api/participants",
        "POST",
        {
          tee_order: 2,
          tee_time_id: teeTime.id,
          team_id: teamB.id,
          player_names: "Player B2",
          position_name: "Player",
        }
      );
      const participantB2 = await expectJsonResponse(participantB2Response);

      await makeRequest(
        `/api/participants/${participantB2.id}/manual-score`,
        "PUT",
        {
          total: 75, // 4 over par (individual)
        }
      );

      // Team C participants: manual scores 71 and 71 (total 142, 0 relative to par) - should win on primary tie-breaker
      const participantC1Response = await makeRequest(
        "/api/participants",
        "POST",
        {
          tee_order: 1,
          tee_time_id: teeTime.id,
          team_id: teamC.id,
          player_names: "Player C1",
          position_name: "Captain",
        }
      );
      const participantC1 = await expectJsonResponse(participantC1Response);

      await makeRequest(
        `/api/participants/${participantC1.id}/manual-score`,
        "PUT",
        {
          total: 71, // even par (individual)
        }
      );

      const participantC2Response = await makeRequest(
        "/api/participants",
        "POST",
        {
          tee_order: 2,
          tee_time_id: teeTime.id,
          team_id: teamC.id,
          player_names: "Player C2",
          position_name: "Player",
        }
      );
      const participantC2 = await expectJsonResponse(participantC2Response);

      await makeRequest(
        `/api/participants/${participantC2.id}/manual-score`,
        "PUT",
        {
          total: 71, // even par (individual)
        }
      );

      // Get series standings to verify tie-breaker logic
      const standingsResponse = await makeRequest(
        `/api/series/${series.id}/standings`
      );
      const standings = await expectJsonResponse(standingsResponse);

      // Find the competition result within the team standings
      const teamCStanding = standings.team_standings.find(
        (team: any) => team.team_name === "Team C"
      );
      const teamBStanding = standings.team_standings.find(
        (team: any) => team.team_name === "Team B"
      );
      const teamAStanding = standings.team_standings.find(
        (team: any) => team.team_name === "Team A"
      );

      expect(teamCStanding).toBeDefined();
      expect(teamBStanding).toBeDefined();
      expect(teamAStanding).toBeDefined();

      // Team C should be 1st (best relativeToPar in the competition)
      expect(teamCStanding.position).toBe(1);

      // Team B should be 2nd (tie-breaker: better individual score 69 vs 70)
      expect(teamBStanding.position).toBe(2);

      // Team A should be 3rd (tie-breaker: worse individual score 70 vs 69)
      expect(teamAStanding.position).toBe(3);

      // Verify the competition results exist in their standings
      expect(teamCStanding.competitions).toHaveLength(1);
      expect(teamBStanding.competitions).toHaveLength(1);
      expect(teamAStanding.competitions).toHaveLength(1);

      expect(teamCStanding.competitions[0].competition_name).toBe(
        "Tie-Breaker Competition"
      );
      expect(teamBStanding.competitions[0].competition_name).toBe(
        "Tie-Breaker Competition"
      );
      expect(teamAStanding.competitions[0].competition_name).toBe(
        "Tie-Breaker Competition"
      );
    });
  });

  describe("GET /api/competitions/:id/team-leaderboard", () => {
    test("should return team leaderboard with proper sorting and points", async () => {
      // Create a series first
      const seriesResponse = await makeRequest("/api/series", "POST", {
        name: "Test Series",
        description: "A test series for team leaderboard",
        is_public: true,
      });
      const series = await expectJsonResponse(seriesResponse);

      // Create a course
      const courseResponse = await makeRequest("/api/courses", "POST", {
        name: "Test Course",
      });
      const course = await expectJsonResponse(courseResponse);

      // Set course pars (standard 18-hole course with par 71)
      await makeRequest(
        `/api/courses/${course.id}/holes`,
        "PUT",
        [4, 5, 4, 3, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 4, 3, 4, 4]
      );

      // Create a competition in the series
      const competitionResponse = await makeRequest(
        "/api/competitions",
        "POST",
        {
          name: "Team Leaderboard Test",
          date: "2024-12-31",
          course_id: course.id,
          series_id: series.id,
        }
      );
      const competition = await expectJsonResponse(competitionResponse);

      // Create teams
      const teamAResponse = await makeRequest("/api/teams", "POST", {
        name: "Team Alpha",
      });
      const teamA = await expectJsonResponse(teamAResponse);

      const teamBResponse = await makeRequest("/api/teams", "POST", {
        name: "Team Beta",
      });
      const teamB = await expectJsonResponse(teamBResponse);

      const teamCResponse = await makeRequest("/api/teams", "POST", {
        name: "Team Gamma",
      });
      const teamC = await expectJsonResponse(teamCResponse);

      // Add teams to series
      await makeRequest(`/api/series/${series.id}/teams/${teamA.id}`, "POST");
      await makeRequest(`/api/series/${series.id}/teams/${teamB.id}`, "POST");
      await makeRequest(`/api/series/${series.id}/teams/${teamC.id}`, "POST");

      // Create tee time
      const teeTimeResponse = await makeRequest(
        `/api/competitions/${competition.id}/tee-times`,
        "POST",
        {
          teetime: "09:00",
        }
      );
      const teeTime = await expectJsonResponse(teeTimeResponse);

      // Add participants for Team Alpha (will be 3rd place)
      const participantA1Response = await makeRequest(
        "/api/participants",
        "POST",
        {
          tee_order: 1,
          tee_time_id: teeTime.id,
          team_id: teamA.id,
          player_names: "Alice Alpha",
          position_name: "Captain",
        }
      );
      const participantA1 = await expectJsonResponse(participantA1Response);

      await makeRequest(
        `/api/participants/${participantA1.id}/manual-score`,
        "PUT",
        {
          total: 75, // +4 to par
        }
      );

      const participantA2Response = await makeRequest(
        "/api/participants",
        "POST",
        {
          tee_order: 2,
          tee_time_id: teeTime.id,
          team_id: teamA.id,
          player_names: "Alex Alpha",
          position_name: "Player",
        }
      );
      const participantA2 = await expectJsonResponse(participantA2Response);

      await makeRequest(
        `/api/participants/${participantA2.id}/manual-score`,
        "PUT",
        {
          total: 73, // +2 to par
        }
      );

      // Add participants for Team Beta (will be 1st place)
      const participantB1Response = await makeRequest(
        "/api/participants",
        "POST",
        {
          tee_order: 1,
          tee_time_id: teeTime.id,
          team_id: teamB.id,
          player_names: "Bob Beta",
          position_name: "Captain",
        }
      );
      const participantB1 = await expectJsonResponse(participantB1Response);

      await makeRequest(
        `/api/participants/${participantB1.id}/manual-score`,
        "PUT",
        {
          total: 69, // -2 to par
        }
      );

      const participantB2Response = await makeRequest(
        "/api/participants",
        "POST",
        {
          tee_order: 2,
          tee_time_id: teeTime.id,
          team_id: teamB.id,
          player_names: "Betty Beta",
          position_name: "Player",
        }
      );
      const participantB2 = await expectJsonResponse(participantB2Response);

      await makeRequest(
        `/api/participants/${participantB2.id}/manual-score`,
        "PUT",
        {
          total: 70, // -1 to par
        }
      );

      // Add participants for Team Gamma (will be 2nd place)
      const participantC1Response = await makeRequest(
        "/api/participants",
        "POST",
        {
          tee_order: 1,
          tee_time_id: teeTime.id,
          team_id: teamC.id,
          player_names: "Carol Gamma",
          position_name: "Captain",
        }
      );
      const participantC1 = await expectJsonResponse(participantC1Response);

      await makeRequest(
        `/api/participants/${participantC1.id}/manual-score`,
        "PUT",
        {
          total: 71, // even par
        }
      );

      const participantC2Response = await makeRequest(
        "/api/participants",
        "POST",
        {
          tee_order: 2,
          tee_time_id: teeTime.id,
          team_id: teamC.id,
          player_names: "Charlie Gamma",
          position_name: "Player",
        }
      );
      const participantC2 = await expectJsonResponse(participantC2Response);

      await makeRequest(
        `/api/participants/${participantC2.id}/manual-score`,
        "PUT",
        {
          total: 71, // even par
        }
      );

      // Lock all participants to mark them as finished
      await makeRequest(`/api/participants/${participantA1.id}/lock`, "POST");
      await makeRequest(`/api/participants/${participantA2.id}/lock`, "POST");
      await makeRequest(`/api/participants/${participantB1.id}/lock`, "POST");
      await makeRequest(`/api/participants/${participantB2.id}/lock`, "POST");
      await makeRequest(`/api/participants/${participantC1.id}/lock`, "POST");
      await makeRequest(`/api/participants/${participantC2.id}/lock`, "POST");

      // Get team leaderboard
      const teamLeaderboardResponse = await makeRequest(
        `/api/competitions/${competition.id}/team-leaderboard`
      );
      const teamLeaderboard = await expectJsonResponse(teamLeaderboardResponse);

      // Verify the response structure
      expect(Array.isArray(teamLeaderboard)).toBe(true);
      expect(teamLeaderboard).toHaveLength(3);

      // Verify sorting (Team Beta should be 1st with lowest relative score)
      expect(teamLeaderboard[0].teamName).toBe("Team Beta");
      expect(teamLeaderboard[0].totalRelativeScore).toBe(-3); // -2 + -1
      expect(teamLeaderboard[0].totalShots).toBe(139); // 69 + 70
      expect(teamLeaderboard[0].status).toBe("FINISHED");
      expect(teamLeaderboard[0].displayProgress).toBe("F");
      expect(teamLeaderboard[0].teamPoints).toBe(5); // numberOfTeams (3) + 2

      expect(teamLeaderboard[1].teamName).toBe("Team Gamma");
      expect(teamLeaderboard[1].totalRelativeScore).toBe(0); // 0 + 0
      expect(teamLeaderboard[1].totalShots).toBe(142); // 71 + 71
      expect(teamLeaderboard[1].status).toBe("FINISHED");
      expect(teamLeaderboard[1].displayProgress).toBe("F");
      expect(teamLeaderboard[1].teamPoints).toBe(3); // numberOfTeams (3)

      expect(teamLeaderboard[2].teamName).toBe("Team Alpha");
      expect(teamLeaderboard[2].totalRelativeScore).toBe(6); // +4 + +2
      expect(teamLeaderboard[2].totalShots).toBe(148); // 75 + 73
      expect(teamLeaderboard[2].status).toBe("FINISHED");
      expect(teamLeaderboard[2].displayProgress).toBe("F");
      expect(teamLeaderboard[2].teamPoints).toBe(1); // numberOfTeams (3) - (3 - 1)

      // Verify all teams have start time and team ID
      teamLeaderboard.forEach((team: any) => {
        expect(team.teamId).toBeDefined();
        expect(team.startTime).toBe("09:00");
      });
    });

    test("should handle tie-breaker using individual scores", async () => {
      // Create a series
      const seriesResponse = await makeRequest("/api/series", "POST", {
        name: "Tie-Breaker Series",
        description: "Testing tie-breaker logic",
        is_public: true,
      });
      const series = await expectJsonResponse(seriesResponse);

      // Create a course
      const courseResponse = await makeRequest("/api/courses", "POST", {
        name: "Tie-Breaker Course",
      });
      const course = await expectJsonResponse(courseResponse);

      // Set course pars (standard 18-hole course with par 71)
      await makeRequest(
        `/api/courses/${course.id}/holes`,
        "PUT",
        [4, 5, 4, 3, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 4, 3, 4, 4]
      );

      // Create a competition
      const competitionResponse = await makeRequest(
        "/api/competitions",
        "POST",
        {
          name: "Tie-Breaker Test",
          date: "2024-12-31",
          course_id: course.id,
          series_id: series.id,
        }
      );
      const competition = await expectJsonResponse(competitionResponse);

      // Create teams
      const teamXResponse = await makeRequest("/api/teams", "POST", {
        name: "Team X",
      });
      const teamX = await expectJsonResponse(teamXResponse);

      const teamYResponse = await makeRequest("/api/teams", "POST", {
        name: "Team Y",
      });
      const teamY = await expectJsonResponse(teamYResponse);

      // Add teams to series
      await makeRequest(`/api/series/${series.id}/teams/${teamX.id}`, "POST");
      await makeRequest(`/api/series/${series.id}/teams/${teamY.id}`, "POST");

      // Create tee time
      const teeTimeResponse = await makeRequest(
        `/api/competitions/${competition.id}/tee-times`,
        "POST",
        {
          teetime: "10:30",
        }
      );
      const teeTime = await expectJsonResponse(teeTimeResponse);

      // Team X: Same total relative score but better individual score
      const participantX1Response = await makeRequest(
        "/api/participants",
        "POST",
        {
          tee_order: 1,
          tee_time_id: teeTime.id,
          team_id: teamX.id,
          player_names: "X Player 1",
          position_name: "Captain",
        }
      );
      const participantX1 = await expectJsonResponse(participantX1Response);

      await makeRequest(
        `/api/participants/${participantX1.id}/manual-score`,
        "PUT",
        {
          total: 68, // -3 to par (best individual score)
        }
      );

      const participantX2Response = await makeRequest(
        "/api/participants",
        "POST",
        {
          tee_order: 2,
          tee_time_id: teeTime.id,
          team_id: teamX.id,
          player_names: "X Player 2",
          position_name: "Player",
        }
      );
      const participantX2 = await expectJsonResponse(participantX2Response);

      await makeRequest(
        `/api/participants/${participantX2.id}/manual-score`,
        "PUT",
        {
          total: 74, // +3 to par
        }
      );

      // Team Y: Same total relative score but worse individual score
      const participantY1Response = await makeRequest(
        "/api/participants",
        "POST",
        {
          tee_order: 1,
          tee_time_id: teeTime.id,
          team_id: teamY.id,
          player_names: "Y Player 1",
          position_name: "Captain",
        }
      );
      const participantY1 = await expectJsonResponse(participantY1Response);

      await makeRequest(
        `/api/participants/${participantY1.id}/manual-score`,
        "PUT",
        {
          total: 70, // -1 to par
        }
      );

      const participantY2Response = await makeRequest(
        "/api/participants",
        "POST",
        {
          tee_order: 2,
          tee_time_id: teeTime.id,
          team_id: teamY.id,
          player_names: "Y Player 2",
          position_name: "Player",
        }
      );
      const participantY2 = await expectJsonResponse(participantY2Response);

      await makeRequest(
        `/api/participants/${participantY2.id}/manual-score`,
        "PUT",
        {
          total: 72, // +1 to par
        }
      );

      // Lock all participants
      await makeRequest(`/api/participants/${participantX1.id}/lock`, "POST");
      await makeRequest(`/api/participants/${participantX2.id}/lock`, "POST");
      await makeRequest(`/api/participants/${participantY1.id}/lock`, "POST");
      await makeRequest(`/api/participants/${participantY2.id}/lock`, "POST");

      // Get team leaderboard
      const teamLeaderboardResponse = await makeRequest(
        `/api/competitions/${competition.id}/team-leaderboard`
      );
      const teamLeaderboard = await expectJsonResponse(teamLeaderboardResponse);

      // Both teams have same total relative score (0), Team X wins tie-breaker
      expect(teamLeaderboard).toHaveLength(2);

      // Team X should be first (tie-breaker: better individual score -3 vs -1)
      expect(teamLeaderboard[0].teamName).toBe("Team X");
      expect(teamLeaderboard[0].totalRelativeScore).toBe(0); // -3 + 3
      expect(teamLeaderboard[0].teamPoints).toBe(4); // numberOfTeams (2) + 2

      // Team Y should be second (tie-breaker: worse individual score -1 vs -3)
      expect(teamLeaderboard[1].teamName).toBe("Team Y");
      expect(teamLeaderboard[1].totalRelativeScore).toBe(0); // -1 + 1
      expect(teamLeaderboard[1].teamPoints).toBe(2); // numberOfTeams (2)
    });

    test("should return 404 for non-existent competition", async () => {
      const response = await makeRequest(
        "/api/competitions/999/team-leaderboard"
      );
      expect(response.status).toBe(404);
    });

    test("should handle competitions not in a series", async () => {
      // Create a course
      const courseResponse = await makeRequest("/api/courses", "POST", {
        name: "Standalone Course",
      });
      const course = await expectJsonResponse(courseResponse);

      // Set course pars (standard 18-hole course with par 71)
      await makeRequest(
        `/api/courses/${course.id}/holes`,
        "PUT",
        [4, 5, 4, 3, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 4, 3, 4, 4]
      );

      // Create a competition without a series
      const competitionResponse = await makeRequest(
        "/api/competitions",
        "POST",
        {
          name: "Standalone Competition",
          date: "2024-12-31",
          course_id: course.id,
          // No series_id
        }
      );
      const competition = await expectJsonResponse(competitionResponse);

      // Get team leaderboard (should work but with no points calculation)
      const teamLeaderboardResponse = await makeRequest(
        `/api/competitions/${competition.id}/team-leaderboard`
      );
      const teamLeaderboard = await expectJsonResponse(teamLeaderboardResponse);

      // Should return empty array since no participants
      expect(Array.isArray(teamLeaderboard)).toBe(true);
      expect(teamLeaderboard).toHaveLength(0);
    });
  });
});
