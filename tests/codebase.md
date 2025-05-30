# competitions.test.ts

```ts
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

```

# courses.test.ts

```ts
import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  cleanupTestDatabase,
  expectErrorResponse,
  expectJsonResponse,
  setupTestDatabase,
  type MakeRequestFunction,
} from "./test-helpers";

describe("Course API", () => {
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

  describe("POST /api/courses", () => {
    test("should create a course", async () => {
      const response = await makeRequest("/api/courses", "POST", {
        name: "Augusta National",
      });

      const course = await expectJsonResponse(response);
      expect(response.status).toBe(201);
      expect(course.name).toBe("Augusta National");
      expect(course.pars.holes).toEqual([]);
      expect(course.pars.out).toBe(0);
      expect(course.pars.in).toBe(0);
      expect(course.pars.total).toBe(0);
    });

    test("should validate name is required", async () => {
      const response = await makeRequest("/api/courses", "POST", {
        name: "",
      });

      expectErrorResponse(response, 400);
      const error = await response.json();
      expect(error.error).toBe("Course name is required");
    });
  });

  describe("GET /api/courses", () => {
    test("should list all courses", async () => {
      // Create a course first
      await makeRequest("/api/courses", "POST", {
        name: "Augusta National",
      });

      const response = await makeRequest("/api/courses");
      const courses = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(Array.isArray(courses)).toBe(true);
      expect(courses.length).toBe(1);
      expect(courses[0].name).toBe("Augusta National");
    });
  });

  describe("GET /api/courses/:id", () => {
    test("should get a single course", async () => {
      const createResponse = await makeRequest("/api/courses", "POST", {
        name: "Augusta National",
      });
      const created = await createResponse.json();

      const response = await makeRequest(`/api/courses/${created.id}`);
      const course = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(course.id).toBe(created.id);
      expect(course.name).toBe("Augusta National");
    });

    test("should return 404 for non-existent course", async () => {
      const response = await makeRequest("/api/courses/999");
      expectErrorResponse(response, 404);
    });
  });

  describe("PUT /api/courses/:id", () => {
    test("should update a course name", async () => {
      const createResponse = await makeRequest("/api/courses", "POST", {
        name: "Augusta National",
      });
      const created = await createResponse.json();

      const response = await makeRequest(`/api/courses/${created.id}`, "PUT", {
        name: "Augusta National Golf Club",
      });

      const updated = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(updated.name).toBe("Augusta National Golf Club");
    });

    test("should validate name cannot be empty", async () => {
      const createResponse = await makeRequest("/api/courses", "POST", {
        name: "Augusta National",
      });
      const created = await createResponse.json();

      const response = await makeRequest(`/api/courses/${created.id}`, "PUT", {
        name: "   ", // Spaces only
      });

      expectErrorResponse(response, 400);
      const error = await response.json();
      expect(error.error).toBe("Course name cannot be empty");
    });
  });

  describe("PUT /api/courses/:id/holes", () => {
    test("should update course holes", async () => {
      const createResponse = await makeRequest("/api/courses", "POST", {
        name: "Augusta National",
      });
      const created = await createResponse.json();

      const pars = [4, 5, 4, 3, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 4, 3, 4, 4];
      const response = await makeRequest(
        `/api/courses/${created.id}/holes`,
        "PUT",
        pars
      );

      const updated = await expectJsonResponse(response);
      expect(response.status).toBe(200);
      expect(updated.pars.holes).toEqual(pars);
      expect(updated.pars.out).toBe(36); // Front 9 total: 4+5+4+3+4+3+4+5+4 = 36
      expect(updated.pars.in).toBe(35); // Back 9 total: 4+4+3+5+4+4+3+4+4 = 35
      expect(updated.pars.total).toBe(71); // Total
    });

    test("should validate pars cannot exceed 18 holes", async () => {
      const createResponse = await makeRequest("/api/courses", "POST", {
        name: "Augusta National",
      });
      const created = await createResponse.json();

      const response = await makeRequest(
        `/api/courses/${created.id}/holes`,
        "PUT",
        [4, 5, 4, 3, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 4, 3, 4, 4, 4] // 19 holes
      );

      expectErrorResponse(response, 400);
      const error = await response.json();
      expect(error.error).toBe("Course cannot have more than 18 holes");
    });

    test("should validate par values", async () => {
      const createResponse = await makeRequest("/api/courses", "POST", {
        name: "Augusta National",
      });
      const created = await createResponse.json();

      const response = await makeRequest(
        `/api/courses/${created.id}/holes`,
        "PUT",
        [2, 5, 4] // Par 2 is invalid
      );

      expectErrorResponse(response, 400);
      const error = await response.json();
      expect(error.error).toBe("All pars must be integers between 3 and 6");
    });
  });

  describe("DELETE /api/courses/:id", () => {
    test("should delete a course", async () => {
      const createResponse = await makeRequest("/api/courses", "POST", {
        name: "To Delete",
      });
      const created = await createResponse.json();

      const response = await makeRequest(
        `/api/courses/${created.id}`,
        "DELETE"
      );
      expect(response.status).toBe(204);

      // Verify it's deleted
      const getResponse = await makeRequest(`/api/courses/${created.id}`);
      expectErrorResponse(getResponse, 404);
    });

    test("should return 404 for non-existent course", async () => {
      const response = await makeRequest("/api/courses/999", "DELETE");
      expectErrorResponse(response, 404);
    });
  });
});

```

# participants.test.ts

```ts
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

```

# series.test.ts

```ts
import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  cleanupTestDatabase,
  expectErrorResponse,
  expectJsonResponse,
  type MakeRequestFunction,
  setupTestDatabase,
} from "./test-helpers";

describe("Series API", () => {
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

  describe("POST /api/series", () => {
    test("should create a new series with name and description", async () => {
      const seriesData = {
        name: "Summer Golf Series",
        description: "A competitive summer golf series",
      };

      const response = await makeRequest("/api/series", "POST", seriesData);
      expect(response.status).toBe(201);

      const series = await expectJsonResponse(response);
      expect(series.id).toBeTypeOf("number");
      expect(series.name).toBe(seriesData.name);
      expect(series.description).toBe(seriesData.description);
      expect(series.created_at).toBeTypeOf("string");
      expect(series.updated_at).toBeTypeOf("string");
    });

    test("should create a series with only name (description optional)", async () => {
      const seriesData = {
        name: "Winter Championship",
      };

      const response = await makeRequest("/api/series", "POST", seriesData);
      expect(response.status).toBe(201);

      const series = await expectJsonResponse(response);
      expect(series.name).toBe(seriesData.name);
      expect(series.description).toBeNull();
    });

    test("should return 400 when name is missing", async () => {
      const response = await makeRequest("/api/series", "POST", {});
      expectErrorResponse(response, 400);

      const error = await expectJsonResponse(response);
      expect(error.error).toBe("Series name is required");
    });

    test("should return 400 when name is empty", async () => {
      const response = await makeRequest("/api/series", "POST", {
        name: "   ",
      });
      expectErrorResponse(response, 400);

      const error = await expectJsonResponse(response);
      expect(error.error).toBe("Series name is required");
    });

    test("should return 400 when series name already exists", async () => {
      const seriesData = { name: "Duplicate Series" };

      // Create first series
      await makeRequest("/api/series", "POST", seriesData);

      // Try to create duplicate
      const response = await makeRequest("/api/series", "POST", seriesData);
      expectErrorResponse(response, 400);

      const error = await expectJsonResponse(response);
      expect(error.error).toBe("Series name must be unique");
    });
  });

  describe("GET /api/series", () => {
    test("should return empty array when no series exist", async () => {
      const response = await makeRequest("/api/series");
      expect(response.status).toBe(200);

      const series = await expectJsonResponse(response);
      expect(series).toEqual([]);
    });

    test("should return all series created", async () => {
      // Create multiple series with small delays
      await makeRequest("/api/series", "POST", {
        name: "Series A",
        description: "First series",
      });
      await new Promise((resolve) => setTimeout(resolve, 100));
      await makeRequest("/api/series", "POST", {
        name: "Series B",
        description: "Second series",
      });
      await new Promise((resolve) => setTimeout(resolve, 100));
      await makeRequest("/api/series", "POST", { name: "Series C" });

      const response = await makeRequest("/api/series");
      expect(response.status).toBe(200);

      const series = await expectJsonResponse(response);
      expect(series).toHaveLength(3);
    });
  });

  describe("GET /api/series/:id", () => {
    test("should return series by id", async () => {
      const seriesData = {
        name: "Test Series",
        description: "Test description",
      };
      const createResponse = await makeRequest(
        "/api/series",
        "POST",
        seriesData
      );
      const createdSeries = await expectJsonResponse(createResponse);

      const response = await makeRequest(`/api/series/${createdSeries.id}`);
      expect(response.status).toBe(200);

      const series = await expectJsonResponse(response);
      expect(series.id).toBe(createdSeries.id);
      expect(series.name).toBe(seriesData.name);
      expect(series.description).toBe(seriesData.description);
    });

    test("should return 404 when series not found", async () => {
      const response = await makeRequest("/api/series/999");
      expectErrorResponse(response, 404);

      const error = await expectJsonResponse(response);
      expect(error.error).toBe("Series not found");
    });
  });

  describe("PUT /api/series/:id", () => {
    test("should update series name and description", async () => {
      const createResponse = await makeRequest("/api/series", "POST", {
        name: "Original Series",
        description: "Original description",
      });
      const createdSeries = await expectJsonResponse(createResponse);

      const updateData = {
        name: "Updated Series",
        description: "Updated description",
      };

      const response = await makeRequest(
        `/api/series/${createdSeries.id}`,
        "PUT",
        updateData
      );
      expect(response.status).toBe(200);

      // Add a small delay to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 100));

      const series = await expectJsonResponse(response);
      expect(series.name).toBe(updateData.name);
      expect(series.description).toBe(updateData.description);
      expect(series.updated_at).not.toBe(createdSeries.updated_at);
    });

    test("should update only name", async () => {
      const createResponse = await makeRequest("/api/series", "POST", {
        name: "Original Series",
        description: "Original description",
      });
      const createdSeries = await expectJsonResponse(createResponse);

      const response = await makeRequest(
        `/api/series/${createdSeries.id}`,
        "PUT",
        {
          name: "Updated Name Only",
        }
      );
      expect(response.status).toBe(200);

      const series = await expectJsonResponse(response);
      expect(series.name).toBe("Updated Name Only");
      expect(series.description).toBe("Original description");
    });

    test("should update description to null", async () => {
      const createResponse = await makeRequest("/api/series", "POST", {
        name: "Test Series",
        description: "Original description",
      });
      const createdSeries = await expectJsonResponse(createResponse);

      const response = await makeRequest(
        `/api/series/${createdSeries.id}`,
        "PUT",
        {
          description: null,
        }
      );
      expect(response.status).toBe(200);

      const series = await expectJsonResponse(response);
      expect(series.description).toBeNull();
    });

    test("should return 400 when name is empty", async () => {
      const createResponse = await makeRequest("/api/series", "POST", {
        name: "Test Series",
      });
      const createdSeries = await expectJsonResponse(createResponse);

      const response = await makeRequest(
        `/api/series/${createdSeries.id}`,
        "PUT",
        { name: "   " }
      );
      expectErrorResponse(response, 400);

      const error = await expectJsonResponse(response);
      expect(error.error).toBe("Series name cannot be empty");
    });

    test("should return 400 when updating to duplicate name", async () => {
      await makeRequest("/api/series", "POST", { name: "Existing Series" });
      const createResponse = await makeRequest("/api/series", "POST", {
        name: "Test Series",
      });
      const createdSeries = await expectJsonResponse(createResponse);

      const response = await makeRequest(
        `/api/series/${createdSeries.id}`,
        "PUT",
        {
          name: "Existing Series",
        }
      );
      expectErrorResponse(response, 400);

      const error = await expectJsonResponse(response);
      expect(error.error).toBe("Series name must be unique");
    });

    test("should return 400 when series not found", async () => {
      const response = await makeRequest("/api/series/999", "PUT", {
        name: "Updated",
      });
      expectErrorResponse(response, 400);

      const error = await expectJsonResponse(response);
      expect(error.error).toBe("Series not found");
    });
  });

  describe("DELETE /api/series/:id", () => {
    test("should delete series", async () => {
      const createResponse = await makeRequest("/api/series", "POST", {
        name: "To Delete",
      });
      const createdSeries = await expectJsonResponse(createResponse);

      const response = await makeRequest(
        `/api/series/${createdSeries.id}`,
        "DELETE"
      );
      expect(response.status).toBe(204);

      // Verify it's deleted
      const getResponse = await makeRequest(`/api/series/${createdSeries.id}`);
      expectErrorResponse(getResponse, 404);
    });

    test("should return 404 when series not found", async () => {
      const response = await makeRequest("/api/series/999", "DELETE");
      expectErrorResponse(response, 404);

      const error = await expectJsonResponse(response);
      expect(error.error).toBe("Series not found");
    });
  });

  describe("GET /api/series/:id/competitions", () => {
    test("should return empty array when series has no competitions", async () => {
      const createResponse = await makeRequest("/api/series", "POST", {
        name: "Test Series",
      });
      const series = await expectJsonResponse(createResponse);

      const response = await makeRequest(
        `/api/series/${series.id}/competitions`
      );
      expect(response.status).toBe(200);

      const competitions = await expectJsonResponse(response);
      expect(competitions).toEqual([]);
    });

    test("should return 400 when series not found", async () => {
      const response = await makeRequest("/api/series/999/competitions");
      expectErrorResponse(response, 400);

      const error = await expectJsonResponse(response);
      expect(error.error).toBe("Series not found");
    });
  });

  describe("GET /api/series/:id/teams", () => {
    test("should return empty array when series has no teams", async () => {
      const createResponse = await makeRequest("/api/series", "POST", {
        name: "Test Series",
      });
      const series = await expectJsonResponse(createResponse);

      const response = await makeRequest(`/api/series/${series.id}/teams`);
      expect(response.status).toBe(200);

      const teams = await expectJsonResponse(response);
      expect(teams).toEqual([]);
    });

    test("should return 400 when series not found", async () => {
      const response = await makeRequest("/api/series/999/teams");
      expectErrorResponse(response, 400);

      const error = await expectJsonResponse(response);
      expect(error.error).toBe("Series not found");
    });
  });
});

```

# teams.test.ts

```ts
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

```

# tee-times.test.ts

```ts
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

```

# test-helpers.ts

```ts
import { Database } from "bun:sqlite";
import { expect } from "bun:test";
import { createTestDatabase } from "../src/database/db";
import { startTestServer, stopTestServer } from "./test-server";

// Type for the makeRequest function that gets returned
export type MakeRequestFunction = (
  path: string,
  method?: string,
  body?: any
) => Promise<Response>;

export async function setupTestDatabase(): Promise<{
  db: Database;
  makeRequest: MakeRequestFunction;
}> {
  const db = await createTestDatabase();
  const port = await startTestServer(db);

  // Create closure that captures the port
  const makeRequest: MakeRequestFunction = async (
    path: string,
    method: string = "GET",
    body?: any
  ): Promise<Response> => {
    const url = `http://localhost:${port}${path}`;
    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    return fetch(url, options);
  };

  return { db, makeRequest };
}

export async function cleanupTestDatabase(db: Database): Promise<void> {
  await stopTestServer(db);
  // Reduced cleanup delay
  await new Promise((resolve) => setTimeout(resolve, 10));
  db.close();
}

export async function expectJsonResponse(response: Response): Promise<any> {
  expect(response.headers.get("content-type")).toContain("application/json");
  return await response.json();
}

export function expectErrorResponse(response: Response, status: number): void {
  expect(response.status).toBe(status);
  expect(response.headers.get("content-type")).toContain("application/json");
}

```

# test-server.ts

```ts
import { Database } from "bun:sqlite";
import { createApp } from "../src/app";

// Map to track servers by database instance to avoid conflicts
const serverMap = new Map<
  Database,
  { server: any; port: number; refCount: number }
>();

// Helper to get a random available port
function getRandomTestPort(): number {
  return Math.floor(Math.random() * 1000) + 3200; // 3200 to 4199
}

// Check if port is available
async function isPortAvailable(port: number): Promise<boolean> {
  try {
    const server = Bun.serve({
      port,
      fetch: () => new Response("test"),
    });
    server.stop();
    return true;
  } catch {
    return false;
  }
}

// Get an available port
async function getAvailablePort(): Promise<number> {
  let attempts = 0;
  const maxAttempts = 20;

  while (attempts < maxAttempts) {
    const port = getRandomTestPort();
    if (await isPortAvailable(port)) {
      return port;
    }
    attempts++;
    // Small delay to avoid rapid port checking
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  throw new Error("Could not find available port after multiple attempts");
}

export async function startTestServer(db: Database): Promise<number> {
  // Check if server already exists for this database
  if (serverMap.has(db)) {
    const serverInfo = serverMap.get(db)!;
    serverInfo.refCount++;
    return serverInfo.port;
  }

  // Get available port
  const port = await getAvailablePort();

  // Create app and server
  const app = createApp(db);
  const server = Bun.serve({
    port,
    fetch: app.fetch,
  });

  // Store server info
  serverMap.set(db, { server, port, refCount: 1 });

  // Wait for server to be ready (much shorter delay)
  await new Promise((resolve) => setTimeout(resolve, 50));

  return port;
}

export async function stopTestServer(db: Database): Promise<void> {
  const serverInfo = serverMap.get(db);
  if (!serverInfo) return;

  serverInfo.refCount--;

  // Only stop server when no more references
  if (serverInfo.refCount <= 0) {
    serverInfo.server.stop();
    serverMap.delete(db);
    // Small delay to ensure cleanup
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

export function getTestPort(db: Database): number {
  const serverInfo = serverMap.get(db);
  if (!serverInfo) {
    throw new Error("Test server not started for this database");
  }
  return serverInfo.port;
}

```

